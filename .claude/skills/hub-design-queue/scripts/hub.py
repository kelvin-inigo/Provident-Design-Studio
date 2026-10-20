#!/usr/bin/env python3
"""The Content Hub's design queue, from this Mac. Standard library only (Python 3.9).

  hub.py jobs [--all]                 what is waiting (or everything, delivered too)
  hub.py job <card_id>                one job as JSON
  hub.py claim <card_id> [--out DIR]  claim it, write the OPS draft and download the brief
  hub.py deliver <card_id> <session.smpstudio.json> <image or folder> ...
                                      send the finished pages back to the post
  hub.py status <card_id>             the job's state and the post's status

The hub:   $PROVIDENT_HUB, default http://192.168.50.30:8090 (office network)
The token: $HUB_IMPORT_TOKEN, else the first line of ~/.config/provident/hub-token
           (chmod 600). NEVER put it in this repository — it is public.
"""
import json
import mimetypes
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import uuid

HUB = os.environ.get("PROVIDENT_HUB", "http://192.168.50.30:8090").rstrip("/")
TOKEN_FILE = os.path.expanduser("~/.config/provident/hub-token")
SOURCE = "Design Studio (Claude)"
OUT = os.path.expanduser(os.environ.get("PROVIDENT_STUDIO_OUT", "~/Documents/Provident Studio"))
IMG = (".jpg", ".jpeg", ".png", ".webp", ".gif")
MAX_BYTES = 240 * 1024 * 1024   # the hub takes 250 MB and 50 images
MAX_IMAGES = 50


def die(msg, code=1):
    print("hub: " + msg, file=sys.stderr)
    sys.exit(code)


def token():
    t = os.environ.get("HUB_IMPORT_TOKEN", "").strip()
    if not t and os.path.exists(TOKEN_FILE):
        t = open(TOKEN_FILE, encoding="utf-8").read().strip().splitlines()[0].strip()
    if not t:
        die("No hub token. Set HUB_IMPORT_TOKEN, or put it in %s (chmod 600). "
            "Ask whoever runs the hub for HUB_IMPORT_TOKEN." % TOKEN_FILE)
    return t


def call(method, path, body=None, headers=None, timeout=60):
    h = {"Authorization": "Bearer " + token(), "X-Source": SOURCE}
    h.update(headers or {})
    req = urllib.request.Request(HUB + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw, code = r.read(), r.status
    except urllib.error.HTTPError as e:
        raw, code = e.read(), e.code
    except (urllib.error.URLError, OSError) as e:
        die("Could not reach the hub at %s (%s). Are you on the office network?" % (HUB, e))
    try:
        data = json.loads(raw or b"{}")
    except ValueError:
        data = {"raw": raw[:300].decode("utf-8", "replace")}
    if code >= 400:
        die("HTTP %d from %s %s: %s" % (code, method, path, data.get("error") or data))
    return code, data


def fetch(url):
    """A brief image: an absolute hub URL (needs the token) or a path on the hub."""
    if url.startswith("/"):
        url = HUB + url
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token()})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


# ── copy → OPS carousel pages ──────────────────────────────────────────────────────────
# The hub's own draft (design.py studio_draft) puts every middle slide's whole text in
# ctext.title with an empty (required) body, and the last slide in ccta.big with a fixed
# "Link in bio" button — so a CTA slide reading "Read the guide: link in bio" printed the
# call twice and left the required lead line empty. This splits each slide where the copy
# itself breaks, and leaves what it cannot fill EMPTY, for Claude to write (never invent).

EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️‍]")


def clean(t):
    t = EMOJI.sub("", unicodedata.normalize("NFC", str(t or "")))
    return re.sub(r"\s+", " ", t).strip(" \t-–—")


def split(t):
    """(head, rest) at the copy's own first break: a colon, a dash, or a sentence end."""
    for pat in (r":\s+", r"\s[—–-]\s", r"(?<=[.!?])\s+"):
        m = re.search(pat, t)
        if m and 3 <= m.start() and m.end() < len(t):
            return t[:m.start()].rstrip(" .") if pat != r"(?<=[.!?])\s+" else t[:m.start()], t[m.end():]
    return t, ""


def cap(s):
    return s[:1].upper() + s[1:] if s else s


def pages(copy, card_id):
    slides = [clean(s) for s in (copy.get("slides") or []) if clean(s)] or [clean(copy.get("title"))]
    out = []
    n = len(slides)
    for i, text in enumerate(slides):
        sid = "hub%s-%d" % (card_id, i + 1)
        if i == 0:
            head, rest = split(text) if len(text) > 70 else (text, "")
            out.append({"id": sid, "kind": "cfront", "f": {"headline": head, "sub": rest}})
        elif i == n - 1 and n > 2:
            big, button = text, ""
            m = re.search(r"(?:[:—–-]\s*|\.\s+)?((?:visit |see |read |find |tap |check )?(?:the )?link in (?:bio|our bio)[^.]*)\.?$", text, re.I)
            if m and m.start() > 0:
                big, button = text[:m.start()].rstrip(" :—–-."), cap(m.group(1).strip())
            out.append({"id": sid, "kind": "ccta", "f": {"small": "", "big": big, "button": button or "Link in bio"}})
        else:
            title, body = split(text)
            out.append({"id": sid, "kind": "ctext", "f": {"eyebrow": "", "title": title, "body": body}})
    return out


def draft(job):
    """The job's own studio draft, with its post id inside `state` and the pages remapped."""
    doc = json.loads(json.dumps(job.get("studio") or {}))
    st = doc.setdefault("state", {})
    doc["app"], doc["v"] = "provident-smp-studio", 3
    st["hubCardId"] = job["card_id"]
    st.setdefault("tpl", "carousel")
    if job.get("copy", {}).get("slides") or not st.get("slides"):
        st["slides"] = pages(job.get("copy") or {}, job["card_id"])
    st.setdefault("customName", clean(job.get("copy", {}).get("title"))[:80])
    st["screen"] = "editor"
    doc.setdefault("images", {})
    return doc


def slug(t):
    t = re.sub(r"[^\w\- ]+", "", clean(t)).strip()
    return re.sub(r"\s+", " ", t)[:60].strip() or "hub-post"


# ── commands ───────────────────────────────────────────────────────────────────────────
def c_jobs(args):
    _, d = call("GET", "/api/design/jobs" + ("?all=1" if "--all" in args else ""))
    jobs = d.get("jobs") or []
    if not jobs:
        print("The design queue is empty.")
        return
    for j in jobs:
        c = j.get("copy") or {}
        b = j.get("brief") or {}
        print("%s  [%s]  %s · %s · %s" % (j["card_id"], j.get("state"), j.get("site") or "-", j.get("format") or "-",
                                         ", ".join(j.get("platforms") or []) or "-"))
        print("    %s" % (c.get("title") or "(no title)"))
        print("    %d slide(s) · caption %s · brief: %d image(s)%s%s" % (
            len(c.get("slides") or []), "yes" if c.get("caption") else "no", len(b.get("images") or []),
            " · text" if b.get("text") else "", " · %d link(s)" % len(b["links"]) if b.get("links") else ""))
        if j.get("claimed_by"):
            print("    claimed by %s at %s" % (j["claimed_by"], j.get("claimed_at")))


def c_job(args):
    _, d = call("GET", "/api/design/jobs/%s" % need_id(args))
    print(json.dumps(d, ensure_ascii=False, indent=2))


def c_claim(args):
    cid = need_id(args)
    out = OUT
    if "--out" in args:
        out = os.path.expanduser(args[args.index("--out") + 1])
    _, job = call("POST", "/api/design/jobs/%s/claim" % cid)
    folder = os.path.join(out, "Hub %s - %s" % (cid, slug((job.get("copy") or {}).get("title"))))
    os.makedirs(os.path.join(folder, "brief"), exist_ok=True)
    session = os.path.join(folder, slug((job.get("copy") or {}).get("title")) + ".smpstudio.json")
    with open(session, "w", encoding="utf-8") as f:
        json.dump(draft(job), f, ensure_ascii=False, indent=1)
    with open(os.path.join(folder, "job.json"), "w", encoding="utf-8") as f:
        json.dump(job, f, ensure_ascii=False, indent=2)
    got = []
    for im in (job.get("brief") or {}).get("images") or []:
        name = re.sub(r"[^\w.\-]+", "_", im.get("name") or "image")
        try:
            data = fetch(im["url"])
        except Exception as e:  # one missing image should not stop the job
            print("  could not download %s: %s" % (im.get("name"), e), file=sys.stderr)
            continue
        p = os.path.join(folder, "brief", name)
        open(p, "wb").write(data)
        got.append(p)
    b = job.get("brief") or {}
    print(json.dumps({"card_id": job["card_id"], "state": job.get("state"), "folder": folder,
                      "session": session, "brief_images": got, "brief_text": b.get("text", ""),
                      "brief_links": b.get("links", []), "copy": job.get("copy"),
                      "pages": [{"kind": s["kind"], "fields": s["f"]} for s in draft(job)["state"]["slides"]]},
                     ensure_ascii=False, indent=2))


def c_deliver(args):
    if len(args) < 3:
        die("deliver <card_id> <session.smpstudio.json> <image or folder> ...")
    cid = need_id(args)
    session = os.path.expanduser(args[1])
    doc = json.load(open(session, encoding="utf-8"))
    st = doc.get("state") or {}
    if str(st.get("hubCardId") or doc.get("hubCardId") or cid) != str(cid):
        die("%s belongs to hub post %s, not %s." % (session, st.get("hubCardId") or doc.get("hubCardId"), cid))
    st["hubCardId"] = int(cid)
    files = []
    for a in args[2:]:
        a = os.path.expanduser(a)
        if os.path.isdir(a):
            files += sorted(os.path.join(a, n) for n in os.listdir(a) if n.lower().endswith(IMG))
        elif a.lower().endswith(IMG):
            files.append(a)
    if not files:
        die("No images to send (jpg, png, webp, gif).")
    if len(files) > MAX_IMAGES:
        die("%d images; the hub takes %d." % (len(files), MAX_IMAGES))
    content = json.dumps(doc, ensure_ascii=False).encode("utf-8")
    b = "----provident" + uuid.uuid4().hex
    parts = []

    def part(field, name, ctype, data):
        parts.append(("--%s\r\nContent-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n"
                      "Content-Type: %s\r\n\r\n" % (b, field, name.replace('"', ""), ctype)).encode() + data + b"\r\n")

    part("content", os.path.basename(session), "application/json", content)
    for p in files:
        part("images", os.path.basename(p), mimetypes.guess_type(p)[0] or "application/octet-stream", open(p, "rb").read())
    body = b"".join(parts) + ("--%s--\r\n" % b).encode()
    if len(body) > MAX_BYTES:
        die("%.1f MB; the hub takes 250 MB. Export JPG instead of PNG." % (len(body) / 1e6))
    code, d = call("POST", "/api/imports", body, {"Content-Type": "multipart/form-data; boundary=" + b,
                                                   "X-Card-Id": str(cid)}, timeout=300)
    print(json.dumps({"http": code, "import_id": d.get("id"), "card_id": d.get("card_id"),
                      "images": len(files), "mb": round(len(body) / 1e6, 1), "url": d.get("url")}, indent=2))
    if str(d.get("card_id")) != str(cid):
        die("The hub stored the delivery but did not attach it to post %s." % cid, 2)
    time.sleep(.3)
    c_status([cid])


def c_status(args):
    cid = need_id(args)
    _, j = call("GET", "/api/design/jobs/%s" % cid)
    status = "?"
    try:
        with urllib.request.urlopen(HUB + "/api/items", timeout=30) as r:
            status = next((c.get("status") for c in json.load(r) if str(c.get("id")) == str(cid)), "?")
    except Exception:
        pass
    print(json.dumps({"card_id": j["card_id"], "design": j.get("state"), "status": status,
                      "delivered_at": j.get("delivered_at"), "pages": j.get("assets")}, indent=2))


def need_id(args):
    if not args or not re.fullmatch(r"\d{1,20}", args[0]):
        die("Give the post's card id (a number), e.g. hub.py claim 179215212295253")
    return args[0]


CMDS = {"jobs": c_jobs, "job": c_job, "claim": c_claim, "deliver": c_deliver, "status": c_status}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CMDS:
        print(__doc__)
        sys.exit(0 if len(sys.argv) < 2 else 1)
    CMDS[sys.argv[1]](sys.argv[2:])
