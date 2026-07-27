---
phase: 01-playable-jump
reviewed: 2026-07-27T19:01:13Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - package.json
  - tsconfig.json
  - index.html
  - src/main.ts
  - src/style.css
  - src/scenes/PlayScene.ts
  - src/game/config.ts
  - src/game/jump.ts
  - src/game/jump.test.ts
  - src/game/takeoff.ts
  - src/game/takeoff.test.ts
  - src/game/terrain.ts
  - src/game/terrain.test.ts
  - src/game/inputLatch.ts
  - src/game/inputLatch.test.ts
  - src/game/penguinFrames.ts
  - src/game/penguinFrames.test.ts
  - scripts/check-assets.mjs
  - scripts/check-assets.test.ts
findings:
  critical: 2
  warning: 3
  info: 0
  total: 5
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-07-27T19:01:13Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

The simulation reaches `resting` in unit tests, but the production scene cannot show that completion: every tested launch slides beyond the drawn world and below the fixed camera. Input timestamps also diverge from the capped simulation clock after a pause or dropped frame, causing valid presses to be ignored. Three additional warnings cover inconsistent ramp velocity, incomplete terrain validation, and asset checks that accept structurally incomplete images.

The test suite, typecheck, and production build pass. They do not exercise the two production failures above.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Every attempt leaves the visible world before coming to rest

**Classification:** BLOCKER

**Files:** `/Users/gigi/Development/vibe/fly-pingu-fly/src/scenes/PlayScene.ts:22-23,153-163,230-244`; `/Users/gigi/Development/vibe/fly-pingu-fly/src/game/config.ts:55-63`

**Issue:** The world is fixed at `2200x720`, the camera only scrolls horizontally, and its horizontal target is clamped to that world. With the committed launch and friction values, traced attempts contact the landing around x=1048 to x=1552 but do not stop until x=3162 to x=4255. The landing surface itself reaches y=725.2 at x=2200, already below the 720-pixel world, and continues downward afterward. The penguin therefore exits both the terrain drawing and camera view well before `resting`, contradicting the requirement that a child can watch the landing and slide to a stop.

**Fix:** Tune the launch, slope, and slide deceleration so the longest jump stops inside the intended scene, or size the world from the maximum simulated stopping point and add vertical camera tracking. Draw landing terrain through the same reachable bounds. Add an integration assertion for every launch case that contact and rest remain inside the camera-followable world.

### CR-02: A pause or discarded frame time makes a valid press arrive too late

**Classification:** BLOCKER

**Files:** `/Users/gigi/Development/vibe/fly-pingu-fly/src/scenes/PlayScene.ts:60-90,96-117`; `/Users/gigi/Development/vibe/fly-pingu-fly/src/game/inputLatch.ts:20-34`; `/Users/gigi/Development/vibe/fly-pingu-fly/src/game/jump.test.ts:40-89`

**Issue:** Pointer and keyboard commands use DOM event timestamps, while `simulationTimeMs` advances only by executed fixed steps. `MAX_FRAME_DELTA` and `MAX_CATCH_UP_STEPS` intentionally discard elapsed wall time. Phaser also resets its frame delta after a tab or app pause while DOM timestamps continue advancing. The clocks then remain separated by the discarded duration. A press after returning to the game stays pending until simulated time catches up, but the penguin reaches the lip and `seal()` deletes the command first. This is especially likely after a mobile interruption and makes the one control appear broken. The cadence tests use an uncapped accumulator and cannot reproduce the production path.

**Fix:** Put queued input on the simulation timeline at capture time, or treat the first press as an immediately pending one-shot action consumed on the next fixed step. Do not compare an uncapped DOM clock directly with a simulation clock that drops time. Extract the production accumulator policy into a testable runner and cover long frames, visibility pauses, and a press immediately after resume.

## Warnings

### WR-01: Ramp displacement disagrees with the stored velocity

**Classification:** WARNING

**File:** `/Users/gigi/Development/vibe/fly-pingu-fly/src/game/jump.ts:71-82`

**Issue:** Ramp x advances by `speed * dt`, but `vx` is stored as `speed / hypot(1, slope)`. On a sloped section, `(next.x - state.x) / dt` therefore does not equal `next.vx`; the rendered contact moves faster horizontally than the authoritative velocity says it does. `vy` is likewise not the derivative of the sampled y motion. Current launch code overwrites both components, which hides the inconsistency, but the state is not physically coherent and will break consumers that use ramp velocity.

**Fix:** If `speed` is path speed, advance x by `(speed / tangentLength) * dt` and sample y there. If it is horizontal progress speed, set `vx = speed` and `vy = speed * slope`, and rename the field to make that contract explicit.

### WR-02: Terrain validation allows a non-finite lip

**Classification:** WARNING

**Files:** `/Users/gigi/Development/vibe/fly-pingu-fly/src/game/config.ts:101-121`; `/Users/gigi/Development/vibe/fly-pingu-fly/src/game/terrain.ts:26-40`

**Issue:** `assertValidTerrainConfig` validates every terrain coordinate except `lipX`. Passing a `TerrainConfig` with `lipX: NaN` to exported terrain helpers passes validation because both ordering comparisons are false, then `sampleRamp` returns NaN geometry. `JumpConfig` happens to catch this through the separate takeoff validator, but the terrain API's own boundary is incomplete.

**Fix:** Include `lipX` in the finite-field loop before checking `startX < takeoffStartX < lipX`. Add direct malformed-`TerrainConfig` tests for `sampleRamp` and `sampleRampCurve`.

### WR-03: Asset readiness accepts containers with no decodable image payload

**Classification:** WARNING

**File:** `/Users/gigi/Development/vibe/fly-pingu-fly/scripts/check-assets.mjs:24-69,77-140`

**Issue:** PNG readiness only requires a valid `IHDR`, valid chunk CRCs, and `IEND`; it never requires `IDAT` image data or validates critical chunk ordering. WebP readiness accepts dimensions from a `VP8X` header without requiring a `VP8 `, `VP8L`, or animation payload. Structurally incomplete files can therefore pass `prebuild` and still render as missing art in the browser.

**Fix:** Require a valid image payload and legal critical-chunk structure for each format, or use a decoder that verifies the files can actually be decoded. Add fixtures containing only PNG `IHDR`/`IEND` and WebP `VP8X` headers and assert that both fail.

---

_Reviewed: 2026-07-27T19:01:13Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
