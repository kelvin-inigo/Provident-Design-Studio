// casv-convert — turns a video Chrome cannot play (ProRes, PNG or Animation .mov, often with a
// transparent background) into HEVC with alpha in a .mov, which Chrome on a Mac plays and draws
// with its transparency. Built on AVFoundation only (no ffmpeg). The picture is scaled to fit
// `maxSide` (even sizes) and keeps its alpha; sound, if any, becomes AAC.
//
//   casv-convert <source> <output.mov> [maxSide=2160]
//
// Compiled on first use by tools/video-dev/serve.py into _work/bin/. Exit 0 on success; on failure
// one line on stderr says why (the studio shows it).
import AVFoundation
import CoreImage
import VideoToolbox
import ImageIO

func fail(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }

let a = CommandLine.arguments
guard a.count >= 3 else { fail("usage: casv-convert <source> <output.mov> [maxSide]") }
let src = URL(fileURLWithPath: a[1]), dst = URL(fileURLWithPath: a[2])
let maxSide = a.count > 3 ? max(64, Double(a[3]) ?? 2160) : 2160
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
let sem = DispatchSemaphore(value: 0)
var vTrack: AVAssetTrack?, aTrack: AVAssetTrack?, natural = CGSize.zero, xf = CGAffineTransform.identity, fps: Float = 30, codec = "", depth = 32
Task {
  do {
    vTrack = try await asset.loadTracks(withMediaType: .video).first
    aTrack = try await asset.loadTracks(withMediaType: .audio).first
    if let t = vTrack {
      natural = try await t.load(.naturalSize); xf = try await t.load(.preferredTransform); fps = try await t.load(.nominalFrameRate)
      if let fd = try await t.load(.formatDescriptions).first {
        let st = CMFormatDescriptionGetMediaSubType(fd)
        codec = String(bytes: [UInt8(st >> 24 & 255), UInt8(st >> 16 & 255), UInt8(st >> 8 & 255), UInt8(st & 255)], encoding: .ascii) ?? ""
        if let d = CMFormatDescriptionGetExtension(fd, extensionKey: kCMFormatDescriptionExtension_Depth) as? Int { depth = d }
      }
    }
  } catch { }
  sem.signal()
}
sem.wait()
guard let vt = vTrack else { fail("there is no picture in this file that macOS can read") }

let oriented = CGRect(origin: .zero, size: natural).applying(xf)
let w0 = abs(oriented.width), h0 = abs(oriented.height)
guard w0 > 0, h0 > 0 else { fail("the picture has no size") }
let sc = min(1, maxSide / max(w0, h0))
let W = max(2, Int((w0 * sc / 2).rounded()) * 2), H = max(2, Int((h0 * sc / 2).rounded()) * 2)

let reader: AVAssetReader
do { reader = try AVAssetReader(asset: asset) } catch { fail("macOS cannot read this file (\(error.localizedDescription))") }
// After Effects' classic transparent exports, QuickTime Animation ('rle ') and PNG ('png '), have
// had no decoder in macOS since Catalina: their samples are read as they are and decoded here.
let own = codec == "rle " || codec == "png "
let NW = Int(natural.width), NH = Int(natural.height)
if own && codec == "rle " && depth != 32 && depth != 24 { fail("this Animation file is \(depth)-bit; export it as Millions of Colors+ (32-bit) or ProRes 4444") }
let vOut = AVAssetReaderTrackOutput(track: vt, outputSettings: own ? nil : [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
vOut.alwaysCopiesSampleData = false
guard reader.canAdd(vOut) else { fail("macOS cannot decode this file's picture") }
reader.add(vOut)
var aOut: AVAssetReaderTrackOutput?
if let at = aTrack {
  let o = AVAssetReaderTrackOutput(track: at, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
  if reader.canAdd(o) { reader.add(o); aOut = o }
}

let writer: AVAssetWriter
do { writer = try AVAssetWriter(outputURL: dst, fileType: .mov) } catch { fail("cannot write the converted file") }
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.hevcWithAlpha, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoQualityKey: 0.82, kVTCompressionPropertyKey_TargetQualityForAlpha as String: 0.9]])
vIn.expectsMediaDataInRealTime = false
let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
guard writer.canAdd(vIn) else { fail("this Mac cannot encode HEVC with transparency") }
writer.add(vIn)
var aIn: AVAssetWriterInput?
if aOut != nil {
  let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 48000, AVEncoderBitRateKey: 192000])
  i.expectsMediaDataInRealTime = false
  if writer.canAdd(i) { writer.add(i); aIn = i }
}

let codecName = ["ap4h": "ProRes 4444", "ap4x": "ProRes 4444 XQ", "apch": "ProRes 422 HQ", "apcn": "ProRes 422", "apcs": "ProRes 422 LT", "apco": "ProRes 422 Proxy", "aprn": "ProRes RAW", "Hap1": "HAP", "Hap5": "HAP Alpha", "HapY": "HAP Q", "CFHD": "CineForm", "dnxh": "DNxHD/HR", "AVdh": "DNxHD", "rle ": "Animation", "png ": "PNG"][codec] ?? ("'" + codec + "'")
guard reader.startReading() else { fail("macOS cannot decode this file's picture (\(codecName) codec). Export it as ProRes 4444 with RGB + Alpha, or a WebM") }
guard writer.startWriting() else { fail("could not start the converted file (\(writer.error?.localizedDescription ?? "unknown"))") }
writer.startSession(atSourceTime: .zero)

// ── decoding the two old codecs ourselves ──
var argb = [UInt8](repeating: 0, count: max(1, NW * NH * 4))   // Animation keeps the last frame: each sample changes only some rows
func rleFrame(_ d: [UInt8]) {
  if d.count < 8 { return }                                    // an empty sample: nothing changed
  var p = 4
  func u8() -> Int { if p < d.count { p += 1; return Int(d[p - 1]) }; return -1 }
  func be16() -> Int { let a = u8(), b = u8(); return a < 0 || b < 0 ? -1 : (a << 8) | b }
  let header = be16(); var start = 0, lines = NH
  if header & 0x0008 != 0 { start = be16(); p += 2; lines = be16(); p += 2 }
  var row = start
  while lines > 0 && row < NH && p < d.count {
    lines -= 1
    var x = u8() - 1
    while p < d.count {
      let c = Int(Int8(bitPattern: UInt8(truncatingIfNeeded: u8())))
      if c == -1 { break }
      if c == 0 { x += u8() - 1; continue }
      func px() -> (Int, Int, Int, Int) { depth == 32 ? (u8(), u8(), u8(), u8()) : (255, u8(), u8(), u8()) }
      if c < -1 { let v = px(); for _ in 0..<(-c) { if x >= 0 && x < NW { let o = (row * NW + x) * 4; argb[o] = UInt8(max(0, v.0)); argb[o + 1] = UInt8(max(0, v.1)); argb[o + 2] = UInt8(max(0, v.2)); argb[o + 3] = UInt8(max(0, v.3)) }; x += 1 } }
      else { for _ in 0..<c { let v = px(); if x >= 0 && x < NW { let o = (row * NW + x) * 4; argb[o] = UInt8(max(0, v.0)); argb[o + 1] = UInt8(max(0, v.1)); argb[o + 2] = UInt8(max(0, v.2)); argb[o + 3] = UInt8(max(0, v.3)) }; x += 1 } }
    }
    row += 1
  }
}
func ownFrame(_ sb: CMSampleBuffer) -> CVPixelBuffer? {
  var pb: CVPixelBuffer?
  guard CVPixelBufferCreate(nil, NW, NH, kCVPixelFormatType_32BGRA, [kCVPixelBufferCGBitmapContextCompatibilityKey as String: true] as CFDictionary, &pb) == kCVReturnSuccess, let b = pb else { return nil }
  var bytes = [UInt8]()
  if let bb = CMSampleBufferGetDataBuffer(sb) { let n = CMBlockBufferGetDataLength(bb); bytes = [UInt8](repeating: 0, count: n); _ = bytes.withUnsafeMutableBytes { CMBlockBufferCopyDataBytes(bb, atOffset: 0, dataLength: n, destination: $0.baseAddress!) } }
  CVPixelBufferLockBaseAddress(b, []); defer { CVPixelBufferUnlockBaseAddress(b, []) }
  guard let base = CVPixelBufferGetBaseAddress(b) else { return nil }
  let bpr = CVPixelBufferGetBytesPerRow(b)
  if codec == "png " {
    guard let src = CGImageSourceCreateWithData(Data(bytes) as CFData, nil), let im = CGImageSourceCreateImageAtIndex(src, 0, nil),
          let cg = CGContext(data: base, width: NW, height: NH, bitsPerComponent: 8, bytesPerRow: bpr, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) else { return nil }
    cg.clear(CGRect(x: 0, y: 0, width: NW, height: NH)); cg.draw(im, in: CGRect(x: 0, y: 0, width: NW, height: NH))
  } else {
    rleFrame(bytes)
    let o8 = base.assumingMemoryBound(to: UInt8.self)
    for y in 0..<NH { for x in 0..<NW {
      let i = (y * NW + x) * 4, a = Int(argb[i]), q = y * bpr + x * 4
      o8[q] = UInt8(Int(argb[i + 3]) * a / 255); o8[q + 1] = UInt8(Int(argb[i + 2]) * a / 255); o8[q + 2] = UInt8(Int(argb[i + 1]) * a / 255); o8[q + 3] = UInt8(a)
    } }
  }
  return b
}

// the picture: oriented, scaled, alpha kept (CIContext renders premultiplied BGRA)
let ci = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
let toFit = CGAffineTransform(scaleX: CGFloat(W) / w0, y: CGFloat(H) / h0)
let group = DispatchGroup()
group.enter()
var vDone = false, checked = false, seeThrough = false
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "v")) {
  while vIn.isReadyForMoreMediaData && !vDone {
    guard let sb = vOut.copyNextSampleBuffer() else { vDone = true; vIn.markAsFinished(); group.leave(); return }
    if own && CMSampleBufferGetNumSamples(sb) == 0 { continue }
    guard let px = own ? ownFrame(sb) : CMSampleBufferGetImageBuffer(sb) else { continue }
    let t = CMSampleBufferGetPresentationTimeStamp(sb)
    if !checked {                       // does the file itself carry transparency? (any alpha under 250 in the first frame)
      checked = true
      CVPixelBufferLockBaseAddress(px, .readOnly)
      if let base = CVPixelBufferGetBaseAddress(px) {
        let bpr = CVPixelBufferGetBytesPerRow(px), pw = CVPixelBufferGetWidth(px), ph = CVPixelBufferGetHeight(px), p8 = base.assumingMemoryBound(to: UInt8.self)
        var y = 0
        while y < ph && !seeThrough { var x = 0; while x < pw { if p8[y * bpr + x * 4 + 3] < 250 { seeThrough = true; break }; x += 7 }; y += 7 }
      }
      CVPixelBufferUnlockBaseAddress(px, .readOnly)
    }
    var img = CIImage(cvPixelBuffer: px)
    if !xf.isIdentity { img = img.transformed(by: xf); img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY)) }
    img = img.transformed(by: toFit)
    var outPx: CVPixelBuffer?
    guard let pool = ad.pixelBufferPool, CVPixelBufferPoolCreatePixelBuffer(nil, pool, &outPx) == kCVReturnSuccess, let ob = outPx else { continue }
    ci.render(img, to: ob, bounds: CGRect(x: 0, y: 0, width: W, height: H), colorSpace: nil)
    ad.append(ob, withPresentationTime: t)
  }
}
if let ai = aIn, let ao = aOut {
  group.enter()
  var aDone = false
  ai.requestMediaDataWhenReady(on: DispatchQueue(label: "a")) {
    while ai.isReadyForMoreMediaData && !aDone {
      guard let sb = ao.copyNextSampleBuffer() else { aDone = true; ai.markAsFinished(); group.leave(); return }
      ai.append(sb)
    }
  }
}
group.wait()
if reader.status == .failed { writer.cancelWriting(); fail("macOS stopped reading this file (\(reader.error?.localizedDescription ?? "unknown"))") }
let fin = DispatchSemaphore(value: 0)
writer.finishWriting { fin.signal() }
fin.wait()
if writer.status != .completed { fail("the converted file could not be finished (\(writer.error?.localizedDescription ?? "unknown"))") }
print("\(W)x\(H) \(fps)fps " + (seeThrough ? "alpha" : "opaque"))
