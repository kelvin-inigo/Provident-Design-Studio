#!/usr/bin/env python3
"""CAS -> Meta: validate a Campaign Ads Studio export and prepare a PAUSED upload.

CAS writes `<name>_Meta upload.json` beside its images once a project carries Meta ad text
(the Publish tab -> "Meta ad text"). This script reads that manifest, checks the copy and every
image against Meta's limits, and writes into `<export>/Meta upload/`:

  plan.json              everything that would be sent, per ad, with the check results
  <folder>.commands.sh   the exact official Ads CLI commands (`meta ads creative create`,
                         `meta ads ad create`), every one PAUSED

and records a dry-run artifact through the kit's own guard (kit/scripts/meta-kit.sh create-ad
--dry-run), which refuses any status other than PAUSED.

IT NEVER UPLOADS. The generated commands refuse to run unless META_KIT_MODE=live-approved and
META_KIT_APPROVAL_ID are set — the kit's own approval convention — so a live call is always a
deliberate, separate step taken by a person.

Usage:
  python3 tools/meta-ads/cas-to-meta.py <export folder | manifest.json>
  python3 tools/meta-ads/cas-to-meta.py <...> --page-id 123 --adset-id 456

Page and ad set IDs fall back to META_PAGE_ID / META_ADSET_ID in the environment or in
tools/meta-ads/kit/.env; without them the commands carry PAGE_ID / ADSET_ID placeholders.
Standard library only (Python 3.9+).
"""
import argparse
import json
import os
import re
import shlex
import struct
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIT = HERE / "kit"

LIM = {"body": 125, "body_max": 500, "head": 40, "desc": 30, "n": 5, "mb": 30}
# The official Ads CLI's own --call-to-action choices (meta-ads 1.2.0).
CTAS = {"APPLY_NOW", "BOOK_TRAVEL", "BUY_NOW", "CONTACT_US", "DOWNLOAD", "GET_OFFER", "GET_QUOTE",
        "LEARN_MORE", "NO_BUTTON", "OPEN_LINK", "SHOP_NOW", "SIGN_UP", "SUBSCRIBE", "WATCH_MORE"}
# Meta placements CAS produces. Eventbrite banners (bn, bs) are not Meta assets and are skipped.
META_SIZES = {"sq": "feed 1:1", "st": "story / reels 9:16", "ls": "16:9"}
RATIOS = {"1:1": 1.0, "4:5": 0.8, "9:16": 9 / 16, "16:9": 16 / 9, "1.91:1": 1.91}


def env_file_value(key):
    p = KIT / ".env"
    if not p.is_file():
        return ""
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.match(r"\s*%s\s*=\s*(.*)\s*$" % re.escape(key), line)
        if m:
            return m.group(1).strip().strip('"').strip("'")
    return ""


def find_manifest(target):
    t = Path(target).expanduser().resolve()
    if t.is_file():
        return t
    if not t.is_dir():
        sys.exit("Not found: %s" % t)
    found = sorted(t.glob("*_Meta upload.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not found:
        sys.exit("No *_Meta upload.json in %s.\nWrite the Meta ad text in CAS (Publish tab -> Meta ad text), then export JPEG or PNG into this folder." % t)
    return found[0]


def image_info(path):
    """(kind, width, height) from the file header — PNG IHDR or the JPEG SOF marker."""
    with open(path, "rb") as f:
        head = f.read(32)
        if head[:8] == b"\x89PNG\r\n\x1a\n":
            w, h = struct.unpack(">II", head[16:24])
            return "png", w, h
        if head[:2] == b"\xff\xd8":
            f.seek(2)
            while True:
                b = f.read(1)
                while b and b != b"\xff":
                    b = f.read(1)
                while b == b"\xff":
                    b = f.read(1)
                if not b:
                    break
                marker = b[0]
                if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                    continue
                seg = f.read(2)
                if len(seg) < 2:
                    break
                n = struct.unpack(">H", seg)[0]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    data = f.read(5)
                    h, w = struct.unpack(">HH", data[1:5])
                    return "jpeg", w, h
                f.seek(n - 2, 1)
        if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
            return "webp", 0, 0
    return "unknown", 0, 0


def ratio_name(w, h):
    if not w or not h:
        return None
    r = w / h
    for name, v in RATIOS.items():
        if abs(r - v) / v < 0.02:
            return name
    return None


def check_copy(man):
    errs, warns = [], []
    copy = man.get("copy") or {}
    bodies, titles, descs = copy.get("bodies") or [], copy.get("titles") or [], copy.get("descriptions") or []

    def dupes(arr, word):
        seen = {}
        for i, t in enumerate(arr):
            k = re.sub(r"\s+", " ", t.strip().lower())
            if k in seen:
                errs.append("%s %d repeats %s %d" % (word, i + 1, word.lower(), seen[k]))
            seen.setdefault(k, i + 1)

    if not bodies:
        errs.append("No primary text")
    if not titles:
        errs.append("No headline")
    for word, arr in (("Primary text", bodies), ("Headline", titles), ("Description", descs)):
        if len(arr) > LIM["n"]:
            errs.append("%s: %d given, Meta takes 5" % (word, len(arr)))
    for i, t in enumerate(bodies):
        n = len(t)
        if n > LIM["body_max"]:
            errs.append("Primary text %d is %d characters (max %d)" % (i + 1, n, LIM["body_max"]))
        elif n > LIM["body"]:
            warns.append("Primary text %d is %d characters — Meta shows the first %d, then See more" % (i + 1, n, LIM["body"]))
    for i, t in enumerate(titles):
        if len(t) > LIM["head"]:
            errs.append("Headline %d is %d characters (max %d)" % (i + 1, len(t), LIM["head"]))
    for i, t in enumerate(descs):
        if len(t) > LIM["desc"]:
            errs.append("Description %d is %d characters (max %d)" % (i + 1, len(t), LIM["desc"]))
    dupes(bodies, "Primary text")
    dupes(titles, "Headline")
    dupes(descs, "Description")
    link = (man.get("link") or "").strip()
    if not re.match(r"^https://[^\s/]+\.[^\s]+$", link, re.I):
        errs.append("Destination link must be an https:// URL (got %r)" % link)
    if man.get("cta") not in CTAS:
        errs.append("Button %r is not one of Meta's call-to-action types" % man.get("cta"))
    return errs, warns


def check_images(root, ad):
    errs, warns, ok = [], [], []
    for im in ad.get("images") or []:
        if im.get("size") not in META_SIZES:
            continue
        p = (root / im["file"]).resolve()
        if root not in p.parents:
            errs.append("%s points outside the export folder" % im["file"])
            continue
        if not p.is_file():
            errs.append("Missing image: %s (export again into this folder)" % im["file"])
            continue
        kind, w, h = image_info(p)
        mb = p.stat().st_size / 1048576
        if kind not in ("jpeg", "png"):
            errs.append("%s is %s — Meta wants JPEG or PNG" % (p.name, kind))
            continue
        if mb > LIM["mb"]:
            errs.append("%s is %.1f MB (max %d)" % (p.name, mb, LIM["mb"]))
        if min(w, h) < 600:
            errs.append("%s is %dx%d — under Meta's 600px minimum" % (p.name, w, h))
        r = ratio_name(w, h)
        if not r:
            warns.append("%s is %dx%d, not a standard Meta ratio" % (p.name, w, h))
        ok.append({"file": str(p), "rel": im["file"], "placement": META_SIZES[im["size"]], "w": w, "h": h, "ratio": r, "mb": round(mb, 2)})
    if not ok and not errs:
        errs.append("No Meta-sized images for %s" % ad.get("name"))
    return errs, warns, ok


def commands_for(ad, imgs, man, page_id, adset_id):
    q = shlex.quote
    copy = man["copy"]
    bodies, titles, descs = copy.get("bodies") or [], copy.get("titles") or [], copy.get("descriptions") or []
    dco = len(imgs) > 1 or len(bodies) > 1 or len(titles) > 1 or len(descs) > 1
    name = ad["name"]
    c = ["meta", "--no-input", "-o", "json", "ads", "creative", "create", "--name", name, "--page-id", page_id,
         "--link-url", man["link"], "--status", "PAUSED"]
    if dco:
        for im in imgs:
            c += ["--images", im["file"]]
        for t in titles:
            c += ["--titles", t]
        for t in bodies:
            c += ["--bodies", t]
        for t in descs:
            c += ["--descriptions", t]
        c += ["--call-to-actions", man["cta"]]
    else:
        c += ["--image", imgs[0]["file"], "--body", bodies[0], "--title", titles[0], "--call-to-action", man["cta"]]
        if descs:
            c += ["--description", descs[0]]
    creative = " ".join(q(x) for x in c)
    ad_cmd = "meta --no-input -o json ads ad create --adset-id %s --name %s --creative-id \"$CREATIVE_ID\" --status PAUSED" % (q(adset_id), q(name))
    return dco, creative, ad_cmd


SCRIPT_HEAD = """#!/usr/bin/env bash
# Generated by tools/meta-ads/cas-to-meta.py — creates ONE PAUSED creative and ONE PAUSED ad.
# Nothing goes live: the ad is created PAUSED, and activating it is done in Ads Manager.
# Refuses to run without the kit's approval convention, so it can never fire by accident:
#   META_KIT_MODE=live-approved META_KIT_APPROVAL_ID=<who approved, when> bash "<this file>"
set -euo pipefail
if [[ "${META_KIT_MODE:-}" != "live-approved" || -z "${META_KIT_APPROVAL_ID:-}" ]]; then
  echo "Blocked: set META_KIT_MODE=live-approved and META_KIT_APPROVAL_ID after the ad has been approved." >&2
  exit 1
fi
KIT_ENV=%(env)s
if [[ -f "$KIT_ENV" ]]; then set -a; source "$KIT_ENV"; set +a; fi
: "${ACCESS_TOKEN:?ACCESS_TOKEN is not set (tools/meta-ads/kit/.env)}"
: "${AD_ACCOUNT_ID:?AD_ACCOUNT_ID is not set (tools/meta-ads/kit/.env)}"
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("target", help="the CAS export folder, or its *_Meta upload.json")
    ap.add_argument("--page-id", default=os.environ.get("META_PAGE_ID") or env_file_value("META_PAGE_ID"))
    ap.add_argument("--adset-id", default=os.environ.get("META_ADSET_ID") or env_file_value("META_ADSET_ID"))
    ap.add_argument("--no-kit", action="store_true", help="skip the kit's own dry-run artifact")
    a = ap.parse_args()

    mpath = find_manifest(a.target)
    root = mpath.parent.resolve()
    man = json.loads(mpath.read_text(encoding="utf-8"))
    if man.get("provident") != "cas-meta-upload":
        sys.exit("%s is not a CAS Meta upload manifest." % mpath.name)

    page_id = a.page_id or "PAGE_ID"
    adset_id = a.adset_id or "ADSET_ID"
    errs, warns = check_copy(man)
    out_dir = root / "Meta upload"
    out_dir.mkdir(exist_ok=True)
    plan = {"manifest": mpath.name, "campaign": man.get("campaign"), "link": man.get("link"), "cta": man.get("cta"),
            "copy": man.get("copy"), "page_id": page_id, "adset_id": adset_id, "ads": []}

    print("CAS -> Meta · %s" % man.get("campaign"))
    print("Manifest: %s" % mpath)
    for ad in man.get("ads") or []:
        e2, w2, imgs = check_images(root, ad)
        entry = {"name": ad["name"], "folder": ad.get("folder"), "format": ad.get("format"), "images": imgs, "errors": e2, "warnings": w2}
        if ad.get("format") == "carousel":
            entry["note"] = ("A carousel creative needs uploaded image hashes and a child_attachments object_story_spec; "
                             "this bridge validates the cards but does not script it. Use the kit's ad-upload skill.")
        elif imgs and not e2 and not errs:
            dco, creative, ad_cmd = commands_for(ad, imgs, man, page_id, adset_id)
            entry["dynamic_creative"] = dco
            if dco:
                entry["note"] = "Several images or texts: a Dynamic Creative. It only runs in an ad set created with --dynamic-creative."
            script = out_dir / ("%s.commands.sh" % re.sub(r"[^\w\- ]", "", ad.get("folder") or ad["name"]).strip())
            body = SCRIPT_HEAD % {"env": shlex.quote(str(KIT / ".env"))}
            body += 'cd %s\n' % shlex.quote(str(root))
            body += "CREATIVE_ID=$(%s | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"id\"])')\n" % creative
            body += 'echo "Creative $CREATIVE_ID (PAUSED)"\n'
            body += ad_cmd + "\n"
            body += 'echo "Ad created PAUSED — review it in Ads Manager before activating."\n'
            script.write_text(body, encoding="utf-8")
            os.chmod(script, 0o755)
            entry["commands"] = script.name
        plan["ads"].append(entry)
        errs += ["%s: %s" % (ad["name"], x) for x in e2]
        warns += ["%s: %s" % (ad["name"], x) for x in w2]
        print("\n  %s · %d image%s" % (ad["name"], len(imgs), "" if len(imgs) == 1 else "s"))
        for im in imgs:
            print("    %-22s %5d x %-5d %-7s %.2f MB  %s" % (im["placement"], im["w"], im["h"], im["ratio"] or "?", im["mb"], im["rel"]))
        if entry.get("note"):
            print("    note: " + entry["note"])

    plan["ok"] = not errs
    plan["errors"], plan["warnings"] = errs, warns
    (out_dir / "plan.json").write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")

    if not a.no_kit and (KIT / "scripts" / "meta-kit.sh").is_file():
        try:
            r = subprocess.run([str(KIT / "scripts" / "meta-kit.sh"), "create-ad", "--payload", str(out_dir / "plan.json"),
                                "--status", "PAUSED", "--dry-run"], capture_output=True, text=True, timeout=60, cwd=str(KIT))
            art = re.search(r"Dry-run artifact: (.+)", r.stdout)
            if art:
                print("\nKit dry-run artifact: %s" % (KIT / art.group(1).strip()))
        except Exception as ex:  # the kit's artifact is a record, never a gate
            print("\n(kit dry-run skipped: %s)" % ex)

    print("\nCopy: %d primary text, %d headline, %d description · %s · %s" % (
        len(man["copy"].get("bodies") or []), len(man["copy"].get("titles") or []),
        len(man["copy"].get("descriptions") or []), man.get("cta"), man.get("link")))
    for w in warns:
        print("  warn  " + w)
    for e in errs:
        print("  FIX   " + e)
    if "PAGE_ID" in (page_id, adset_id) or "ADSET_ID" in (page_id, adset_id):
        print("  note  No page / ad set ID yet: pass --page-id and --adset-id, or set META_PAGE_ID and META_ADSET_ID in tools/meta-ads/kit/.env")
    print("\n%s -> %s" % ("Ready (PAUSED, not uploaded)" if not errs else "Not ready", out_dir))
    return 0 if not errs else 1


if __name__ == "__main__":
    sys.exit(main())
