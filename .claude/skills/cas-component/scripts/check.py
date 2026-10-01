#!/usr/bin/env python3
"""Check a CAS component spec, save it, and put it on the clipboard for ⌘V in the studio.

    python3 check.py <spec.json>

The studio's own gate (CampaignStudio.custSan) silently DROPS anything it cannot use. This
checker is the strict twin: it REPORTS the same problems so they are fixed before the paste,
because a dropped node is a component that quietly looks wrong.

On success it
  * writes custom-components/<slug>.json (git-ignored: ad copy stays on this computer), and
  * copies {"provident": "cas-component", "spec": {...}} to the macOS clipboard.
"""
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
OUT = os.path.join(ROOT, "custom-components")

ROLES = {"eyebrow", "body", "hook", "headline", "hero", "stat", "cta"}
INK = {"auto", "ink", "soft", "mute", "brass"}
FILL = {"glass", "solid", "label", "brass", "tint", None}
STROKE = {"rule", "chip", "strong", "brass", None}
ALIGN = {"auto", "start", "center", "end"}
JUSTIFY = {"start", "center", "end", "between"}
ICON_MAX, FIELD_MAX, NODE_MAX = 6, 8, 40

errors, warns = [], []


def num(v, lo, hi, where):
    if not isinstance(v, (int, float)) or isinstance(v, bool):
        errors.append(f"{where}: expected a number, got {v!r}")
        return
    if v < lo or v > hi:
        warns.append(f"{where}: {v} is outside {lo}..{hi} and will be clamped")


def node(n, keys, where, depth, count):
    count[0] += 1
    if depth > 7:
        errors.append(f"{where}: nested deeper than 7")
        return
    if not isinstance(n, dict):
        errors.append(f"{where}: not an object")
        return
    t = n.get("t")
    if n.get("ink", "auto") not in INK:
        errors.append(f"{where}: ink {n.get('ink')!r} is not one of {sorted(INK)}")
    if t == "text":
        if n.get("field") not in keys:
            errors.append(f"{where}: field {n.get('field')!r} is not declared in fields")
        if n.get("role") not in ROLES:
            errors.append(f"{where}: role {n.get('role')!r} is not one of {sorted(ROLES)}")
        if "lines" in n:
            num(n["lines"], 1, 6, where + ".lines")
    elif t == "icon":
        num(n.get("slot", 0), 0, ICON_MAX - 1, where + ".slot")
        num(n.get("size", 1.4), .5, 5, where + ".size")
    elif t == "dot":
        num(n.get("size", .4), .15, 2, where + ".size")
    elif t == "rule":
        if n.get("len") != "fill":
            num(n.get("len", 3), .5, 30, where + ".len")
        num(n.get("weight", 1), 1, 4, where + ".weight")
    elif t == "vrule":
        num(n.get("weight", 1), 1, 4, where + ".weight")
    elif t == "stack":
        if n.get("dir", "col") not in ("col", "row"):
            errors.append(f"{where}: dir must be col or row")
        if n.get("align", "auto") not in ALIGN:
            errors.append(f"{where}: align {n.get('align')!r}")
        if n.get("justify", "start") not in JUSTIFY:
            errors.append(f"{where}: justify {n.get('justify')!r}")
        if n.get("fill") not in FILL:
            errors.append(f"{where}: fill {n.get('fill')!r} is not one of glass/solid/label/brass/tint/null")
        if n.get("stroke") not in STROKE:
            errors.append(f"{where}: stroke {n.get('stroke')!r} is not one of rule/chip/strong/brass/null")
        num(n.get("gap", 0), 0, 8, where + ".gap")
        pad = n.get("pad", [0, 0, 0, 0])
        if isinstance(pad, list):
            if len(pad) != 4:
                errors.append(f"{where}.pad: give four numbers [top, right, bottom, left]")
            for i, p in enumerate(pad):
                num(p, 0, 8, f"{where}.pad[{i}]")
        else:
            num(pad, 0, 8, where + ".pad")
        if n.get("r", 0) != "pill":
            num(n.get("r", 0), 0, 4, where + ".r")
        kids = n.get("kids", [])
        if not isinstance(kids, list) or (not kids and not n.get("fill") and not n.get("stroke")):
            errors.append(f"{where}: a stack needs kids (or a fill/stroke)")
            kids = kids if isinstance(kids, list) else []
        for i, k in enumerate(kids):
            node(k, keys, f"{where}.kids[{i}]", depth + 1, count)
    else:
        errors.append(f"{where}: unknown node type {t!r} (stack, text, icon, dot, rule, vrule)")


def slots(n, out):
    if isinstance(n, dict):
        if n.get("t") == "icon":
            out.add(n.get("slot", 0))
        for k in n.get("kids", []) or []:
            slots(k, out)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    try:
        spec = json.load(open(sys.argv[1], encoding="utf-8"))
    except Exception as e:
        sys.exit(f"Not valid JSON: {e}")
    if "spec" in spec and spec.get("provident") == "cas-component":
        spec = spec["spec"]
    if not str(spec.get("name", "")).strip():
        errors.append("name: missing")
    fields = spec.get("fields") or []
    keys = set()
    if not fields:
        errors.append("fields: at least one")
    if len(fields) > FIELD_MAX:
        errors.append(f"fields: {len(fields)} — at most {FIELD_MAX}")
    for i, f in enumerate(fields):
        k = str(f.get("key", ""))
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,23}", k):
            errors.append(f"fields[{i}].key {k!r}: lower snake_case, starting with a letter")
        if k in keys:
            errors.append(f"fields[{i}].key {k!r}: duplicate")
        keys.add(k)
        if f.get("kind", "line") not in ("line", "area"):
            errors.append(f"fields[{i}].kind: line or area")
        if not str(f.get("label", "")).strip():
            errors.append(f"fields[{i}].label: missing")
    variants = spec.get("variants") or []
    if not 2 <= len(variants) <= 4:
        errors.append(f"variants: {len(variants)} — give 2 to 4")
    used, vkeys = set(), set()
    for i, v in enumerate(variants):
        vk = str(v.get("key", ""))
        if not re.fullmatch(r"[a-z0-9]{1,20}", vk) or vk in vkeys:
            errors.append(f"variants[{i}].key {vk!r}: short, lowercase letters/digits, unique")
        vkeys.add(vk)
        if not str(v.get("label", "")).strip():
            errors.append(f"variants[{i}].label: missing")
        count = [0]
        node(v.get("root"), keys, f"variants[{i}].root", 0, count)
        if count[0] > NODE_MAX:
            errors.append(f"variants[{i}]: {count[0]} nodes — keep it under {NODE_MAX}")

        def fieldsOf(n, out):
            if isinstance(n, dict):
                if n.get("t") == "text":
                    out.add(n.get("field"))
                for k in n.get("kids", []) or []:
                    fieldsOf(k, out)
        fo = set()
        fieldsOf(v.get("root"), fo)
        used |= fo
        missing = keys - fo
        if missing:
            warns.append(f"variants[{i}] ({v.get('label')}) does not show: {', '.join(sorted(missing))}")
    unused = keys - used
    if unused:
        errors.append(f"fields never drawn by any variant: {', '.join(sorted(unused))}")
    s = set()
    for v in variants:
        slots(v.get("root"), s)
    hints = spec.get("iconHints") or []
    for sl in sorted(s):
        h = hints[sl] if isinstance(sl, int) and sl < len(hints) else ""
        if not h:
            warns.append(f"icon slot {sl} has no iconHints entry — it will arrive empty")

    for w in warns:
        print("warn  ", w)
    if errors:
        for e in errors:
            print("ERROR ", e)
        sys.exit(f"\n{len(errors)} problem(s) — fix them and run the check again.")

    spec.setdefault("id", "c" + format(int(time.time() * 1000), "x"))
    wrapped = {"provident": "cas-component", "spec": spec}
    text = json.dumps(wrapped, ensure_ascii=False)
    os.makedirs(OUT, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", spec["name"].lower()).strip("-") or "component"
    path = os.path.join(OUT, slug + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(wrapped, f, ensure_ascii=False, indent=2)
    try:
        subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True)
        clip = "copied to the clipboard"
    except Exception:
        clip = "NOT copied (no pbcopy) — open the file and copy its contents"
    print(f"\nOK  \"{spec['name']}\" — {len(fields)} fields, {len(variants)} styles, {len(s)} icon slots")
    print(f"    saved {os.path.relpath(path, ROOT)} · {clip}")


if __name__ == "__main__":
    main()
