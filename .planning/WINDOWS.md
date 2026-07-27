---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 1
total_count: 2
last_updated: 2026-07-27T18:56:26.772Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | src/scenes/PlayScene.ts |  | End-of-phase physical input parity and game-feel browser UAT remains pending | open |  | 2026-07-27T18:02:15.102Z |  |
| 2 | 01 | deviation | src/game/terrain.ts |  | Replaced the straight ramp with rounded shared geometry after tracer feedback | fixed |  | 2026-07-27T18:56:05.323Z | 2026-07-27T18:56:26.772Z |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/scenes/PlayScene.ts",
    "line": null,
    "description": "End-of-phase physical input parity and game-feel browser UAT remains pending",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-27T18:02:15.102Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "01",
    "file": "src/game/terrain.ts",
    "line": null,
    "description": "Replaced the straight ramp with rounded shared geometry after tracer feedback",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-07-27T18:56:05.323Z",
    "resolved_at": "2026-07-27T18:56:26.772Z"
  }
]
````
