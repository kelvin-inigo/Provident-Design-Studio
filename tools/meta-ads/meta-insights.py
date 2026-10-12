#!/usr/bin/env python3
"""Meta insights -> CAS Ad sets: pull each uploaded ad's analytics into the source folder.

CAS's Ad sets window shows every exported variant as an Ad-Library-style card. Its
"See ad details" view reads `<name>_Meta insights.json`, which THIS script writes beside each
`<name>_Meta upload.json` it finds under the folder you give it. The ads are matched by NAME:
cas-to-meta.py names every ad `<name> – Variant X`, so an ad created from a CAS export finds
its way back to its card.

Read-only. It runs the official Ads CLI (`meta`, installed by install.sh) with the account in
tools/meta-ads/kit/.env:

  meta ads ad list        id, name, effective_status, created_time
  meta ads insights get   per ad, last 30 days: spend, impressions, reach, frequency,
                          clicks, ctr, cpc — and the last 7 days daily, for the CTR trend

Each ad also carries the kit's own verdict (winner / bleeder / fatigued / running) from the
thresholds in kit/ad-config.json — the same rules `./run.sh winners | bleeders | fatigue` use.

In mock mode (META_KIT_MODE unset or `mock`, the kit's default) it writes the kit's SAMPLE
data onto your ad names instead, marked `"mode": "sample"`, so the window can be checked
before a token exists. CAS labels it Sample data.

Usage:
  python3 tools/meta-ads/meta-insights.py "<source folder>"
  python3 tools/meta-ads/meta-insights.py "<source folder>" --preset last_7d

Standard library only (Python 3.9+). Never writes to Meta.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIT = HERE / "kit"
FIELDS = "spend,impressions,reach,frequency,clicks,ctr,cpc"


def load_env():
    env = dict(os.environ)
    f = KIT / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            if v and k.strip() not in os.environ:
                env[k.strip()] = v
    # the kit accepts its legacy names; the official CLI reads these two
    env.setdefault("ACCESS_TOKEN", env.get("META_SYSTEM_USER_ACCESS_TOKEN", ""))
    env.setdefault("AD_ACCOUNT_ID", env.get("META_AD_ACCOUNT", ""))
    return env


def benchmarks():
    b = {"min_ctr": 1.0, "max_frequency": 3.5, "max_cpc": 2.5, "fatigue_drop_pct": 20, "bleeder_min_spend": 50}
    try:
        cfg = json.loads((KIT / "ad-config.json").read_text())
        bm, al = cfg.get("benchmarks", {}), cfg.get("alerts", {})
        b["min_ctr"] = float(al.get("bleeder_ctr_threshold", bm.get("min_ctr", b["min_ctr"])))
        b["max_frequency"] = float(al.get("bleeder_frequency_threshold", bm.get("max_frequency", b["max_frequency"])))
        b["max_cpc"] = float(bm.get("max_cpc", b["max_cpc"]))
        b["fatigue_drop_pct"] = float(al.get("fatigue_ctr_drop_pct", b["fatigue_drop_pct"]))
    except Exception:
        pass
    return b


def num(v):
    try:
        return float(v)
    except Exception:
        return None


def verdict(ad, b):
    """The kit's rules, applied to one ad (scripts/meta-kit.sh report_*)."""
    ctr, freq, cpc, spend = num(ad.get("ctr")), num(ad.get("frequency")), num(ad.get("cpc")), num(ad.get("spend")) or 0
    daily = [d for d in ad.get("daily", []) if num(d.get("ctr")) is not None]
    if len(daily) >= 3 and num(daily[0]["ctr"]):
        drop = (num(daily[0]["ctr"]) - num(daily[-1]["ctr"])) / num(daily[0]["ctr"]) * 100
        if drop >= b["fatigue_drop_pct"]:
            return {"key": "fatigued", "label": "Fatigued", "why": "CTR down %d%% over the week" % round(drop)}
    if spend >= b["bleeder_min_spend"] and ((ctr is not None and ctr < b["min_ctr"]) or (freq is not None and freq > b["max_frequency"])):
        why = "CTR %.2f%% under %.1f%%" % (ctr, b["min_ctr"]) if ctr is not None and ctr < b["min_ctr"] else "frequency %.1f over %.1f" % (freq, b["max_frequency"])
        return {"key": "bleeder", "label": "Bleeding", "why": why}
    if ctr is not None and ctr >= b["min_ctr"] and (cpc is None or cpc <= b["max_cpc"]):
        return {"key": "winner", "label": "Winning", "why": "CTR %.2f%% at %s CPC" % (ctr, ("%.2f" % cpc) if cpc is not None else "—")}
    return {"key": "running", "label": "Running", "why": "inside the account's benchmarks"}


def cli(env, *args):
    exe = shutil.which("meta", path=env.get("PATH", "") + os.pathsep + str(Path.home() / ".local/bin"))
    if not exe:
        sys.exit("The Meta Ads CLI is not installed — run: bash tools/meta-ads/install.sh")
    r = subprocess.run([exe, "--no-input", "-o", "json"] + list(args), env=env, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout).strip()[:400])
    out = json.loads(r.stdout or "null")
    return out.get("data", out) if isinstance(out, dict) else (out or [])


def manifests(root):
    for p in sorted(root.rglob("*_Meta upload.json")):
        if any(part.lower() in ("meta upload", "assets") for part in p.relative_to(root).parts[:-1]):
            continue
        try:
            m = json.loads(p.read_text())
        except Exception:
            continue
        if m.get("provident") == "cas-meta-upload":
            yield p, m


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("folder")
    ap.add_argument("--preset", default="last_30d")
    a = ap.parse_args()
    root = Path(a.folder).expanduser().resolve()
    if not root.is_dir():
        sys.exit("Not a folder: %s" % root)
    env, b = load_env(), benchmarks()
    mode = (env.get("META_KIT_MODE") or "mock").lower()
    live = mode.startswith("live")
    if live and not (env.get("ACCESS_TOKEN") and env.get("AD_ACCOUNT_ID")):
        sys.exit("META_KIT_MODE is live but ACCESS_TOKEN / AD_ACCOUNT_ID are not set in tools/meta-ads/kit/.env")

    found = list(manifests(root))
    if not found:
        sys.exit("No <name>_Meta upload.json under %s — export JPEG or PNG from CAS with Meta ad text written." % root)

    listing, currency = {}, "AED"
    sample = None
    if live:
        for ad in cli(env, "ads", "ad", "list", "--fields", "id,name,effective_status,created_time", "--limit", "500"):
            listing[ad.get("name", "")] = ad
        try:
            acc = cli(env, "ads", "account", "get", "--fields", "currency")
            currency = (acc[0] if isinstance(acc, list) and acc else acc or {}).get("currency", currency)
        except Exception:
            pass
    else:
        sample = json.loads((KIT / "scripts/fixtures/insights.last_7d.json").read_text())
        currency = sample.get("account_summary", {}).get("currency", "USD")

    wrote = 0
    for mpath, man in found:
        ads = []
        for i, ad in enumerate(man.get("ads", [])):
            row = {"name": ad["name"], "folder": ad.get("folder"), "format": ad.get("format")}
            if live:
                hit = listing.get(ad["name"])
                if not hit:
                    row["status"] = "NOT_UPLOADED"
                    ads.append(row)
                    continue
                row.update(ad_id=hit.get("id"), status=hit.get("effective_status"), created=hit.get("created_time"))
                try:
                    tot = cli(env, "ads", "insights", "get", "--ad-id", hit["id"], "--date-preset", a.preset, "--fields", FIELDS)
                    if tot:
                        row.update({k: tot[0].get(k) for k in FIELDS.split(",")})
                    daily = cli(env, "ads", "insights", "get", "--ad-id", hit["id"], "--date-preset", "last_7d",
                                "--time-increment", "daily", "--fields", "impressions,clicks,ctr,spend")
                    row["daily"] = [{"date": d.get("date_start"), "ctr": d.get("ctr"), "impressions": d.get("impressions"),
                                     "spend": d.get("spend")} for d in daily]
                except RuntimeError as e:
                    row["error"] = str(e)
            else:
                src = sample["ad_insights"][i % len(sample["ad_insights"])]
                row.update({k: src.get(k) for k in FIELDS.split(",") if k in src})
                row["reach"] = str(round(int(src["impressions"]) / float(src.get("frequency") or 1)))
                row.update(ad_id="SAMPLE-" + src["ad_id"], status="ACTIVE",
                           created=min(d["date_start"] for d in sample["ad_daily"] if d["ad_id"] == src["ad_id"]))
                row["daily"] = [{"date": d["date_start"], "ctr": d["ctr"]} for d in sample["ad_daily"] if d["ad_id"] == src["ad_id"]]
            row["verdict"] = verdict(row, b) if row.get("impressions") else None
            ads.append(row)
        out = {"provident": "cas-meta-insights", "version": 1, "mode": "live" if live else "sample",
               "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "range": a.preset,
               "currency": currency, "benchmarks": b, "campaign": man.get("campaign"), "ads": ads}
        dest = mpath.with_name(mpath.name.replace("_Meta upload.json", "_Meta insights.json"))
        dest.write_text(json.dumps(out, indent=2) + "\n")
        wrote += 1
        print("%s  %s · %d ad%s%s" % ("✓", dest.relative_to(root), len(ads), "" if len(ads) == 1 else "s",
                                      "" if live else " · SAMPLE DATA (mock mode)"))
    print("\nWrote %d insights file%s. In CAS: Ad sets → Refresh." % (wrote, "" if wrote == 1 else "s"))


if __name__ == "__main__":
    main()
