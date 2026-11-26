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

func fail(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }

let a = CommandLine.arguments
guard a.count >= 3 else { fail("usage: casv-convert <source> <output.mov> [maxSide]") }
let src = URL(fileURLWithPath: a[1]), dst = URL(fileURLWithPath: a[2])
let maxSide = a.count > 3 ? max(64, Double(a[3]) ?? 2160) : 2160
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
let sem = DispatchSemaphore(value: 0)
var vTrack: AVAssetTrack?, aTrack: AVAssetTrack?, natural = CGSize.zero, xf = CGAffineTransform.identity, fps: Float = 30
Task {
  do {
    vTrack = try await asset.loadTracks(withMediaType: .video).first
    aTrack = try await asset.loadTracks(withMediaType: .audio).first
    if let t = vTrack { natural = try await t.load(.naturalSize); xf = try await t.load(.preferredTransform); fps = try await t.load(.nominalFrameRate) }
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
let vOut = AVAssetReaderTrackOutput(track: vt, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
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

guard reader.startReading() else { fail("macOS could not start reading this file (\(reader.error?.localizedDescription ?? "unknown"))") }
guard writer.startWriting() else { fail("could not start the converted file (\(writer.error?.localizedDescription ?? "unknown"))") }
writer.startSession(atSourceTime: .zero)

// the picture: oriented, scaled, alpha kept (CIContext renders premultiplied BGRA)
let ci = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
let toFit = CGAffineTransform(scaleX: CGFloat(W) / w0, y: CGFloat(H) / h0)
let group = DispatchGroup()
group.enter()
var vDone = false, checked = false, seeThrough = false
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "v")) {
  while vIn.isReadyForMoreMediaData && !vDone {
    guard let sb = vOut.copyNextSampleBuffer(), let px = CMSampleBufferGetImageBuffer(sb) else {
      vDone = true; vIn.markAsFinished(); group.leave(); return
    }
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
