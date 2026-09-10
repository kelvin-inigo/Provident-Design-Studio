# How this got here

Installed **by hand**, not by `npx impeccable install` — this machine has no Node, npm,
bun or Homebrew, and no `claude` CLI on PATH, so neither the CLI installer nor
`/plugin marketplace add pbakaus/impeccable` could run.

| | |
|---|---|
| source | https://github.com/pbakaus/impeccable |
| commit | `5a7e2837d2036b2ea8386031c2cd9a539b0dab13` (2026-09-03) |
| version | 4.1.3 |
| licence | Apache 2.0 — see LICENSE and NOTICE.md beside this file |

Copied: `.claude/skills/impeccable/`, `.claude/agents/impeccable-*.md`, and the two
hooks in `.claude/settings.json`. `.claude/settings.local.json` was not touched.

## To update

There is no npm or submodule link to pull from, so an update is the same manual copy:

```bash
git clone --depth 1 https://github.com/pbakaus/impeccable /tmp/impeccable && cp -a /tmp/impeccable/.claude/skills/impeccable/. "/Users/rizi/Documents/Provident Design Studio/.claude/skills/impeccable/" && cp -a /tmp/impeccable/.claude/agents/. "/Users/rizi/Documents/Provident Design Studio/.claude/agents/"
```

Once Node 22+ is on PATH, `npx impeccable update` takes over and this file can go.

## What is dormant until Node 22 is installed

114 of the 165 files here are `.mjs`. Everything executable needs Node **22 or newer**:
the 61 deterministic detector rules (`scripts/detect.mjs`), live browser iteration,
`palette`, `font-match`, `comp-diff`, `doctor`, and both hooks. The hooks are written to
detect this themselves and no-op with one message rather than erroring.

What works with no Node at all is the prose: SKILL.md and the 40 reference documents,
which is what actually shapes how the agent approaches a design task, plus all 23
`/impeccable <mode>` modes and the four subagents.
