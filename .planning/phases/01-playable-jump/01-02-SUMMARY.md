---
phase: 01-playable-jump
plan: 02
subsystem: game
tags: [typescript, vitest, deterministic-simulation, input]

requires:
  - phase: 01-playable-jump
    provides: Deterministic fixed-step Phaser walking skeleton
provides:
  - Continuous asymmetric takeoff quality around the ramp lip
  - Exhaustive runtime validation for numeric jump configuration
  - First-contact terrain interpolation and monotonic landing slide
  - One-shot timestamped browser input latch
affects: [01-03, playable-jump, browser-input, presentation]

tech-stack:
  added: []
  patterns:
    - Pure terrain and takeoff helpers
    - Compile-time exhaustive config invariant matrix
    - Sealed one-command input latch

key-files:
  created:
    - src/game/takeoff.ts
    - src/game/takeoff.test.ts
    - src/game/terrain.ts
    - src/game/terrain.test.ts
    - src/game/inputLatch.ts
    - src/game/inputLatch.test.ts
  modified:
    - src/game/config.ts
    - src/game/jump.ts
    - src/game/jump.test.ts
    - src/scenes/PlayScene.ts

key-decisions:
  - "Use separate smoothstep spans before and after the ramp lip while sharing one launch mapping."
  - "Clamp flight to the interpolated first descending terrain contact before sliding."
  - "Seal one InputLatch after command consumption or automatic takeoff."

patterns-established:
  - "Numeric boundary validation runs before public simulation arithmetic."
  - "Browser events become one timestamped PressCommand before entering the pure core."

requirements-completed:
  - JUMP-01
  - JUMP-02
  - JUMP-03
  - JUMP-04
  - JUMP-05
  - INPT-01
  - INPT-02
  - INPT-03

coverage:
  - id: D1
    description: "Takeoff quality peaks continuously at the lip and falls smoothly across broad early and short late spans."
    requirement: JUMP-02
    verification:
      - kind: unit
        ref: "src/game/takeoff.test.ts#takeoff quality"
        status: pass
    human_judgment: false
  - id: D2
    description: "Early, ideal, late, and no-input traces land at first contact, slide without reversing, and rest once."
    requirement: JUMP-05
    verification:
      - kind: unit
        ref: "src/game/jump.test.ts#jump tracer"
        status: pass
      - kind: unit
        ref: "src/game/terrain.test.ts#terrain sampling"
        status: pass
    human_judgment: false
  - id: D3
    description: "One finite timestamp is accepted and duplicate, repeated, or later commands are rejected."
    requirement: INPT-02
    verification:
      - kind: unit
        ref: "src/game/inputLatch.test.ts#InputLatch"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pointer, mouse, touch, Space, and Enter share the same one-shot scene input path."
    requirement: INPT-01
    verification:
      - kind: integration
        ref: "npm run typecheck && npm run build"
        status: pass
    human_judgment: true
    rationale: "Physical pointer and keyboard parity remains part of end-of-phase browser UAT."
  - id: D5
    description: "Every numeric JumpConfig field rejects malformed values before simulation."
    requirement: JUMP-04
    verification:
      - kind: unit
        ref: "src/game/takeoff.test.ts#jump config validation"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-27
status: complete
---

# Phase 1 Plan 2: Deterministic Jump Rules Summary

**Continuous forgiving takeoff, first-contact landing, monotonic slide, and one-shot browser input backed by 65 deterministic tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-27T17:55:56Z
- **Completed:** 2026-07-27T18:01:38Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Encoded D-01 through D-04 with asymmetric smoothstep quality and one shared launch transition.
- Added exhaustive numeric config validation before simulation arithmetic.
- Completed first-contact landing, non-reversing slide termination, and one-shot input parity across render schedules.

## Task Commits

1. **Task 1 RED: Add failing takeoff rule tests** - `6f61ff6` (test)
2. **Task 1 GREEN: Implement continuous takeoff rules** - `af93dcb` (feat)
3. **Task 2 RED: Add failing landing and input tests** - `519c870` (test)
4. **Task 2 GREEN: Complete deterministic landing and input** - `0f2079b` (feat)

## Files Created/Modified

- `src/game/config.ts` - Central config types and runtime invariant validation.
- `src/game/takeoff.ts` - Continuous quality curve and shared launch mapping.
- `src/game/takeoff.test.ts` - Curve, launch, and exhaustive malformed-config coverage.
- `src/game/terrain.ts` - Ramp, landing, and crossing interpolation helpers.
- `src/game/terrain.test.ts` - Terrain sampling and first-contact tests.
- `src/game/inputLatch.ts` - Finite timestamp queue with one-shot sealing.
- `src/game/inputLatch.test.ts` - Invalid, duplicate, repeat, and later-command tests.
- `src/game/jump.ts` - Authoritative ramp, flight, landing, slide, and rest transitions.
- `src/game/jump.test.ts` - Launch-class, cadence, presentation, and termination trace matrix.
- `src/scenes/PlayScene.ts` - Read-only renderer using the shared InputLatch.

## Decisions Made

- Kept takeoff and terrain calculations pure so Phaser remains a read-only adapter.
- Used separate 180-unit early and 60-unit late spans around one continuous peak.
- Sealed the browser input latch when takeoff occurs, including the automatic no-input path.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vite repeated its existing large Phaser bundle warning. The production build completed successfully.
- Physical tap, click, Space, Enter, repeated-input, and no-input checks remain queued for end-of-phase browser UAT.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-03 can map approved sprite poses onto stable simulation contact points without changing jump outcomes.
- End-of-phase browser UAT still needs to confirm physical input parity and game feel.

## Self-Check: PASSED

- All planned implementation files exist.
- Commits `6f61ff6`, `af93dcb`, `519c870`, and `0f2079b` exist.
- All 65 tests, typecheck, production build, and lint diagnostics passed.

---
*Phase: 01-playable-jump*
*Completed: 2026-07-27*
