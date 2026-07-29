---
phase: 260729-c5q-idle-penguin-respawns-at-top-after-5s-st
plan: 01
subsystem: gameplay
tags: [idle-respawn, free-roam, phaser-graphics, vitest, play-scene]

requires:
  - phase: 01-playable-jump
    provides: PlayScene free-roam after landing/crash-stop and resetRun to ramp start

provides:
  - Pure idleRespawn timer with 5000ms timeout and 2000ms warn progress
  - PlayScene free-roam stillness → resetRun path
  - Language-free Graphics countdown ring above the penguin

affects:
  - play-scene-free-roam
  - kid-retry-loop

tech-stack:
  added: []
  patterns:
    - Pure TS idle timer stepped from PlayScene free-roam; Phaser Graphics only in the scene
    - Single reused Graphics object cleared when warnProgress is 0

key-files:
  created:
    - src/game/idleRespawn.ts
    - src/game/idleRespawn.test.ts
  modified:
    - src/scenes/PlayScene.ts

key-decisions:
  - "Stillness uses freeRoamDefaults.stopSpeed (12) as speedEpsilon and 0.5 world units for positionEpsilon"
  - "Respawn is existing resetRun(); MenuScene free-roam stays untouched"
  - "Warn UI is a warm pie+stroke ring over a soft track, no Text/digits/emoji"

patterns-established:
  - "Idle/respawn rules live in src/game/*; PlayScene only samples and draws"
  - "Pause freezes idle because update returns before updateFreeRoam"

requirements-completed: [QUICK-IDLE-RESPAWN]

coverage:
  - id: D1
    description: Grounded stillness accumulates to 5000ms then shouldRespawn; motion/air/ineligible resets
    requirement: QUICK-IDLE-RESPAWN
    verification:
      - kind: unit
        ref: src/game/idleRespawn.test.ts#accumulates idleMs while grounded and still
        status: pass
      - kind: unit
        ref: src/game/idleRespawn.test.ts#shouldRespawn when idleMs reaches timeout
        status: pass
    human_judgment: false
  - id: D2
    description: warnProgress is 0 until the final 2000ms, then rises 0→1
    requirement: QUICK-IDLE-RESPAWN
    verification:
      - kind: unit
        ref: src/game/idleRespawn.test.ts#warnProgress rises only in the final warn window
        status: pass
    human_judgment: false
  - id: D3
    description: PlayScene free-roam wires idle timer to resetRun and draws a Graphics ring
    requirement: QUICK-IDLE-RESPAWN
    verification:
      - kind: unit
        ref: "npm test -- src/game/idleRespawn.test.ts"
        status: pass
      - kind: other
        ref: "npm test (full suite, 155 tests)"
        status: pass
    human_judgment: true
    rationale: Ring placement, contrast on snow, and pause-freeze feel need a quick in-game glance

duration: 2min
completed: 2026-07-29
status: complete
---

# Phase 260729-c5q: Idle Penguin Respawns After 5s Stillness Summary

**PlayScene free-roam stillness for 5s calls `resetRun()`, with a language-free Graphics countdown ring in the last 2s.**

## Performance

- **Duration:** 2min
- **Started:** 2026-07-29T06:48:35Z
- **Completed:** 2026-07-29T06:50:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Pure `idleRespawn` module with centralized 5000/2000/epsilon constants and Vitest coverage
- PlayScene free-roam samples stillness each frame and respawns via `resetRun()`
- Kid-readable warm pie countdown ring follows the still penguin; clears on motion or reset
- MenuScene left unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): End-to-end idle stillness tests** - `c0bad27` (test)
2. **Task 1 (GREEN): idleRespawn + PlayScene wiring** - `d03686d` (feat)
3. **Task 2: Kid-readable warn ring polish** - `26fc9a4` (feat)

**Plan metadata:** skipped (orchestrator commits docs)

## Files Created/Modified

- `src/game/idleRespawn.ts` - Pure idle timer state, step, warn progress, defaults
- `src/game/idleRespawn.test.ts` - Still accumulate, resets, warn window, timeout, non-positive dt
- `src/scenes/PlayScene.ts` - Free-roam idle sampling, resetRun on timeout, Graphics ring

## Decisions Made

- Aligned `speedEpsilon` with `freeRoamDefaults.stopSpeed` so stop and idle agree
- Single Graphics object created in `create()`, cleared when inactive (threat T-260729-c5q-02)
- Ring placed from ready-pose contact height plus radius padding above the head

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Manual smoke notes (executor)

Automated path verified via Vitest. Recommended human glance:

1. Land, stand still → ring appears in last ~2s → respawn at ramp top
2. Move or jump before 5s → timer/ring clear, no respawn
3. Pause during idle → timer does not advance

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Idle retry loop is in for PlayScene free-roam. No blockers for further play polish.

## Self-Check: PASSED

- FOUND: `src/game/idleRespawn.ts`, `src/game/idleRespawn.test.ts`, `src/scenes/PlayScene.ts`
- FOUND: commits `c0bad27`, `d03686d`, `26fc9a4`
- No stub/TODO markers in touched sources
- MenuScene diff empty

---
*Phase: 260729-c5q-idle-penguin-respawns-at-top-after-5s-st*
*Completed: 2026-07-29*
