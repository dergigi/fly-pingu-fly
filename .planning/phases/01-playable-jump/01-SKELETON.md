# Walking Skeleton — Fly Pingu Fly

**Phase:** 1
**Generated:** 2026-07-27

## Capability Proven End-to-End

A child can press once in a rendered browser scene, send that timestamped action through a deterministic fixed-step jump simulation, and watch the penguin complete the path from ramp to rest in a production build.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Phaser 4.2.1 with plain TypeScript | Phaser supplies browser rendering, normalized pointer input, keyboard input, and camera APIs without a second UI framework. |
| Game authority | Pure TypeScript `stepJump` state machine | Scored motion remains deterministic and independent of Phaser rendering, viewport dimensions, and refresh rate. |
| Update model | Fixed `1 / 120` second simulation steps inside `PlayScene.update` | One bounded accumulator converts variable render deltas into repeatable world-state updates without adding another animation loop. |
| Input boundary | One timestamped semantic press latch | Tap, click, Space, and Enter share one path while the attempt consumes at most one action. |
| Rendering | Read-only Phaser scene driven by simulation snapshots | Art, pose, and camera changes cannot mutate gameplay outcomes. |
| Character anchoring | Per-frame crop and snow-contact offsets in a typed manifest | The selected sheet can change poses without moving the simulation contact point. |
| Build | Asset-readiness `prebuild` gate, then Vite production bundle with local `npm run preview` | The three committed art files must exist at exact paths, expose parseable PNG/WebP metadata, and retain the expected 640x240 penguin-sheet dimensions before Vite starts; the static browser game then needs no server runtime or deployment account. |
| Data layer | Not applicable | Phase 1 has no persistence, database, or server data. |
| Backend/API | Not applicable | The game is client-only and integrates no external API. |
| Authentication | Not applicable | The product has no accounts or protected routes. |
| Directory layout | `src/game/` pure rules, `src/scenes/` Phaser adapters, `scripts/` build checks, `public/assets/sprites/` static art | The boundary keeps deterministic rules testable, browser concerns localized, and asset validation outside runtime gameplay. |

## Stack Touched in Phase 1

- [ ] Project scaffold: exact package versions, TypeScript config, Vite scripts, Vitest runner
- [ ] Browser entry: one `index.html` route and one Phaser game instance
- [ ] Input: one real pointer/keyboard action through the timestamped latch
- [ ] Simulation: one deterministic ramp, takeoff, flight, landing, slide, and rest path
- [ ] UI: one rendered snow scene synchronized from simulation snapshots
- [ ] Character art: `sprite_penguin.png` integrated through a contact-offset manifest
- [ ] Production run: `npm run build && npm run preview`, with `prebuild` rejecting missing or invalid required art before Vite
- [x] Database: not applicable to this static browser game
- [x] Backend/API: not applicable to this static browser game
- [x] Authentication: not applicable to this static browser game

## Ready Asset Contract

- `public/assets/sprites/sprite_penguin.png` is the committed 640x240 RGBA sheet from the approved *Where's My Egg?* source. Plan 01-03 inspects its visible pose bounds and records stable contact anchors.
- `public/assets/sprites/winter-forest.webp` and `public/assets/sprites/snow-pile.webp` are committed and form the complete lean raster scenery set for this phase.
- `prebuild` verifies the three exact paths, non-empty payloads, PNG/WebP signatures, parseable image metadata, and the penguin sheet's expected dimensions before bundling.
- `snowball-penguin.webp` is not an allowed fallback.
- Package installation waits for the blocking legitimacy review recorded in `01-01-PLAN.md`.

## Out of Scope (Deferred to Later Slices)

- First-attempt visual guidance, full resize/orientation/suspension handling, and browser gesture prevention belong to Phase 2.
- Results, distance and airtime display, local records, best-distance flag, celebration, and retry belong to Phase 3.
- Accounts, backend services, multiple ramps, in-air controls, landing controls, random wind, timing meters, audio, and harsh crash states remain outside the product scope.

## Subsequent Slice Plan

- Phase 2: make the existing jump understandable and robust across desktop and mobile browsers.
- Phase 3: add results, device-local records, and the immediate retry loop without changing simulation authority.
