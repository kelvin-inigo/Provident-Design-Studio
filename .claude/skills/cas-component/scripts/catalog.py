#!/usr/bin/env python3
"""Print CAS's existing design components and their styles, read live off the studio file.

The component you build from a screenshot should reuse these treatments, so the catalogue is
read from the same VOPT / VDESC tables the studio's rail and style tiles read — it cannot go
stale the way a copied list would.
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
CAS = os.path.join(ROOT, "Provident Campaign Studio.dc.html")


def block(src, name):
    i = src.find("  static " + name + " = {")
    if i < 0:
        sys.exit(f"Could not find {name} in {CAS}")
    depth, j = 0, src.index("{", i)
    for k in range(j, len(src)):
        if src[k] == "{":
            depth += 1
        elif src[k] == "}":
            depth -= 1
            if depth == 0:
                return src[j:k + 1]
    sys.exit(f"Unbalanced {name}")


def to_json(js):
    js = re.sub(r"//[^\n]*", "", js)                       # line comments
    js = re.sub(r"([{,]\s*)([A-Za-z_]\w*)\s*:", r'\1"\2":', js)  # bare keys
    js = re.sub(r"'((?:[^'\\]|\\.)*)'", lambda m: json.dumps(m.group(1)), js)
    js = re.sub(r",(\s*[}\]])", r"\1", js)
    return json.loads(js)


def main():
    src = open(CAS, encoding="utf-8").read()
    vopt, vdesc = to_json(block(src, "VOPT")), to_json(block(src, "VDESC"))
    names = {"eyebrow": "Eyebrow (small tracked-caps label)", "hero": "Headline", "hook": "Hook line",
             "body": "Body line", "list": "Bullet list", "tags": "Tag chips", "spec": "Key facts (label + figure)",
             "steps": "Process steps", "price": "Price block", "cta": "Button", "divider": "Divider"}
    for t, label in names.items():
        styles = "; ".join(f"{l} — {vdesc.get(t, {}).get(k, '')}" for k, l in vopt.get(t, []))
        print(f"- {label}: {styles}")


if __name__ == "__main__":
    main()
