---
phase: 01-playable-jump
plan: 03
subsystem: game
tags: [phaser, sprites, terrain, camera, asset-validation]

requires:
  - phase: 01-playable-jump
    provides: Deterministic jump rules and one-shot input
provides:
  - Rounded authoritative ski-jump ramp with an exact visible takeoff lip
  - Contact-anchored approved penguin poses for every jump phase
  - Build-blocking validation for the committed art contract
  - Curated snow scenery and phase-aware camera framing
affects: [playable-jump, browser-presentation, phase-02]

tech-stack:
  added: []
  patterns:
    - Shared sampled geometry for simulation and rendering
    - Frame-specific contact pivots around one simulation point
    - Build-time validation of committed binary assets

key-files:
  created:
    - scripts/check-assets.mjs
    - scripts/check-assets.test.ts
    - src/game/penguinFrames.ts
    - src/game/penguinFrames.test.ts
  modified:
    - package.json
    - public/assets/sprites/README.md
    - src/game/config.ts
    - src/game/jump.ts
    - src/game/takeoff.test.ts
    - src/game/terrain.ts
    - src/game/terrain.test.ts
    - src/scenes/PlayScene.ts

key-decisions:
  - "Use one Hermite downhill curve followed by a short tangent takeoff section ending at lipX."
  - "Treat simulation coordinates as the contact pivot for every penguin crop."
  - "Load only the approved penguin sheet, winter forest, and snow pile."

patterns-established:
  - "Terrain alignment: sampleRamp and sampleRampCurve share the same authoritative geometry."
  - "Sprite alignment: frame contact offsets become the sprite origin and rotation pivot."

requirements-completed:
  - INPT-03
  - PRES-01
  - PRES-02
  - PRES-03

coverage:
  - id: D1
    description: "Required art paths, signatures, containers, and penguin dimensions block invalid production builds."
    requirement: PRES-03
    verification:
      - kind: integration
        ref: "scripts/check-assets.test.ts and npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "The rounded ramp query and rendered path meet continuously at a distinct lipX takeoff point."
    requirement: PRES-01
    verification:
      - kind: unit
        ref: "src/game/terrain.test.ts#terrain sampling"
        status: pass
    human_judgment: false
  - id: D3
    description: "Approved sprite crops select takeoff immediately and preserve one snow-contact point through every phase."
    requirement: INPT-03
    verification:
      - kind: unit
        ref: "src/game/penguinFrames.test.ts#penguin frame manifest"
        status: pass
    human_judgment: false
  - id: D4
    description: "The restrained snow scene and camera keep the lip, flight, landing, and rest readable."
    requirement: PRES-02
    verification:
      - kind: integration
        ref: "npm run build and local route smoke test"
        status: pass
    human_judgment: true
    rationale: "Final pose readability, crop choice, and camera feel still require browser playtesting."

duration: 4min
completed: 2026-07-27
status: complete
---

# Phase 1 Plan 3: Approved Snow Presentation Summary

**Rounded shared ski-jump geometry, contact-anchored approved penguin poses, and build-verified snow art**

## Performance

- **Duration:** 4 min continuation
- **Started:** 2026-07-27T18:51:08Z
- **Completed:** 2026-07-27T18:55:05Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Replaced the straight angular slope with a smooth rounded downhill profile, a clear takeoff section, and a distinct lip at the authoritative `lipX`.
- Integrated six inspected poses from `sprite_penguin.png` around stable contact pivots without changing deterministic simulation outcomes.
- Added sparse approved snow scenery, phase-aware camera framing, and a prebuild gate for all required art.

## Task Commits

1. **Task 1 RED: Add failing asset readiness tests** - `da0a785` (test)
2. **Task 1 GREEN: Enforce required art readiness** - `f5cc93d` (feat)
3. **Task 2 RED: Define ramp and sprite presentation contracts** - `fa4d67f` (test)
4. **Task 2 GREEN: Finish rounded ski jump presentation** - `9cfc167` (feat)

## Files Created/Modified

- `scripts/check-assets.mjs` - Validates exact required paths, signatures, image containers, and sheet dimensions.
- `scripts/check-assets.test.ts` - Covers ready, missing, empty, malformed, truncated, and wrongly sized art.
- `src/game/config.ts` - Defines rounded ramp, takeoff section, and lip geometry.
- `src/game/terrain.ts` - Samples the shared Hermite ramp and render curve.
- `src/game/penguinFrames.ts` - Records explicit crops, contact offsets, and phase mappings.
- `src/scenes/PlayScene.ts` - Renders approved art, shared terrain, contact pivots, and phase-aware camera targets.

## Decisions Made

- Used a cubic Hermite profile to round the downhill while matching the shallow takeoff tangent continuously.
- Ended no-input ramp contact at `lipX`, keeping the visible edge and simulation takeoff point aligned.
- Used each frame's contact pixel as the sprite origin so terrain rotation cannot shift the apparent contact point.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced the straight ramp after tracer feedback**
- **Found during:** Task 2 human tracer checkpoint
- **Issue:** The straight angular slope did not read or feel like a ski-jump ramp and lacked a proper jump-off point.
- **Fix:** Added rounded shared geometry, a continuous takeoff section, and a distinct edge at `lipX`; updated simulation contact and rendering together.
- **Files modified:** `src/game/config.ts`, `src/game/jump.ts`, `src/game/terrain.ts`, `src/game/terrain.test.ts`, `src/scenes/PlayScene.ts`
- **Verification:** Curve continuity, lip tangent, rendered-query alignment, full deterministic traces, typecheck, build, lints, and route smoke checks passed.
- **Committed in:** `fa4d67f`, `9cfc167`

---

**Total deviations:** 1 auto-fixed bug
**Impact on plan:** The correction preserves the fixed-step simulation boundary and adds no new UI or gameplay controls.

## Issues Encountered

- Vite repeated the existing Phaser bundle-size warning. The production build completed successfully.
- Port 5173 was occupied during route smoke testing, so the verified dev server used port 5174.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The complete jump now has tested simulation, input, terrain, character, art-readiness, and presentation contracts.
- Browser UAT should still confirm the final crop choices, camera feel, and contact appearance across early, ideal, late, and no-input runs.

## Self-Check: PASSED

- All 12 implementation and test files listed for this plan exist.
- Commits `da0a785`, `f5cc93d`, `fa4d67f`, and `9cfc167` exist.
- All 81 tests, typecheck, production build, lints, and route smoke checks passed.

---
*Phase: 01-playable-jump*
*Completed: 2026-07-27*
