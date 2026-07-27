# Architecture Research

**Domain:** Small single-screen 2D side-scrolling browser game
**Researched:** 2026-07-27
**Confidence:** MEDIUM

## Recommended Architecture

Use a small functional core with browser adapters around it. One `GameState` value owns the complete run. A pure `stepGame` function advances that state at a fixed timestep. Rendering only reads state, while input, animation scheduling, asset loading, and local storage stay behind thin adapters.

This provides deterministic tests without introducing an entity-component system, event bus, scene framework, backend, or general physics engine.

### System Overview

```text
┌──────────────────────── Browser shell ─────────────────────────┐
│                                                               │
│  Keyboard + pointer ──> Input latch                            │
│                              │                                │
│  requestAnimationFrame ──> Fixed-step loop                    │
│                              │                                │
│                              v                                │
│                    ┌───────────────────┐                       │
│                    │ Pure game core    │                       │
│                    │ stepGame(state)   │                       │
│                    └─────────┬─────────┘                       │
│                              │ state snapshot                  │
│                    ┌─────────┴─────────┐                       │
│                    v                   v                       │
│              Canvas renderer     Effect handler               │
│                                  └──> records adapter          │
└───────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Owns | Must Not Own |
|-----------|------|--------------|
| `GameState` | Current phase, penguin motion, timing, landing position, score, camera progress | DOM nodes, canvas context, storage handles |
| `stepGame` | Phase transitions and deterministic simulation for one fixed step | Wall-clock reads, rendering, storage writes |
| `gameConfig` | Ramp geometry, gravity, acceleration, launch tuning, friction, thresholds | Mutable run state |
| `inputAdapter` | Keyboard and primary-pointer listeners mapped to one `press` command | Takeoff rules or phase changes |
| `gameLoop` | `requestAnimationFrame`, elapsed-time clamp, fixed-step accumulator, input consumption | Gameplay formulas |
| `renderer` | Canvas drawing from a read-only state snapshot and loaded assets | Simulation mutations |
| `camera` | A derived viewport position used by the renderer | Independent state unless smoothing proves necessary |
| `score` | Pure distance and airtime calculation from run facts | Persistence or presentation |
| `recordsAdapter` | Parse, validate, compare, and persist best local records | Deciding the current run result |
| `effectHandler` | Executes rare browser side effects emitted by the core | Hidden game-state mutation |

## State Model

Keep one discriminated union rather than several booleans such as `isFlying`, `hasLanded`, and `showResults`. The phase determines which fields and transitions are valid.

```typescript
type GamePhase =
  | { kind: "rampRun"; elapsed: number }
  | { kind: "flight"; takeoffX: number; airtime: number }
  | { kind: "landingSlide"; landingX: number; slideTime: number }
  | { kind: "results"; result: JumpResult };

type GameState = {
  phase: GamePhase;
  penguin: { x: number; y: number; vx: number; vy: number };
};
```

### State Transitions

```text
createGame()
    │
    v
rampRun
    │ accepted press at current ramp position
    │ or explicit fallback rule at ramp end
    v
flight
    │ first downward terrain contact
    v
landingSlide
    │ horizontal speed reaches stop threshold
    v
results
    │ retry press
    └──────────────────────────────> fresh rampRun
```

Transition rules belong in the core:

- `rampRun -> flight`: consume at most one press. Derive launch velocity from current ramp position and speed.
- `flight -> landingSlide`: detect the first crossing of the landing surface while descending. Clamp to the contact point so distance is stable.
- `landingSlide -> results`: apply friction until speed reaches a configured stop threshold. Finalize score once.
- `results -> rampRun`: create a fresh run while preserving only records outside `GameState`.

The product decision for a missed takeoff is still open. Encode it as one explicit transition rule, such as a late automatic launch or failed jump, rather than letting the penguin leave the modeled terrain accidentally.

## Recommended Project Structure

```text
src/
├── game/
│   ├── types.ts          # GameState, GamePhase, commands, results
│   ├── config.ts         # Tunable constants and world geometry
│   ├── createGame.ts     # Initial state factory
│   ├── stepGame.ts       # Pure simulation and phase transitions
│   ├── terrain.ts        # Ramp and landing-surface queries
│   ├── score.ts          # Pure result calculation
│   └── camera.ts         # Pure viewport derivation
├── platform/
│   ├── input.ts          # Keyboard and Pointer Events adapter
│   ├── loop.ts           # Animation frame and fixed-step accumulator
│   ├── records.ts        # localStorage adapter with safe fallback
│   └── assets.ts         # Sprite loading
├── render/
│   └── renderGame.ts     # Canvas drawing, no game-state writes
├── main.ts               # Composition root
└── game/
    └── *.test.ts         # Tests colocated with pure game modules
```

### Structure Rationale

- **`game/`:** Browser-free rules can be run in unit tests with plain values.
- **`platform/`:** All nondeterministic browser APIs are visible and replaceable.
- **`render/`:** Drawing is kept separate from simulation without creating a large scene abstraction.
- **`main.ts`:** The only composition point wires assets, input, loop, storage, core, and renderer.

Do not split each phase into a class. The phases share one small state and one ordered update path. Extract a phase helper only when `stepGame` becomes hard to scan.

## Architectural Patterns

### Pure State Transition

**What:** Advance the complete state using explicit inputs, fixed `dt`, and immutable configuration.

```typescript
type StepResult = {
  state: GameState;
  effects: GameEffect[];
};

function stepGame(
  state: GameState,
  input: GameInput,
  dt: number,
  config: GameConfig,
): StepResult;
```

**Why:** A test can place the penguin one step before takeoff, landing, or stopping and assert the exact next state. No canvas, timer, event dispatch, or storage mock is needed.

**Trade-off:** Returning a new state is easy to reason about. If allocation ever appears in profiling, mutate a private simulation snapshot while preserving the same explicit API. Do not optimize this preemptively.

### Fixed-Step Simulation, Variable Rendering

**What:** `requestAnimationFrame` schedules display work. The loop accumulates elapsed time and advances the game in bounded fixed increments, such as `1 / 60` second.

```typescript
const STEP = 1 / 60;
const MAX_FRAME = 0.1;
let accumulator = 0;

function frame(now: number) {
  accumulator += Math.min((now - previousNow) / 1000, MAX_FRAME);
  previousNow = now;

  while (accumulator >= STEP) {
    const result = stepGame(state, input.consume(), STEP, config);
    state = result.state;
    handleEffects(result.effects);
    accumulator -= STEP;
  }

  renderGame(context, state, assets, viewport);
  requestAnimationFrame(frame);
}
```

Cap both elapsed time and steps per frame. Browsers commonly pause animation callbacks in hidden tabs, so an uncapped catch-up can skip the readable jump sequence or stall the page when play resumes.

Interpolation is optional. Start by rendering the latest state. Add interpolation only if visible judder appears.

### Input Latch

**What:** Convert keyboard and primary `pointerdown` events into one pending semantic command.

```typescript
type GameInput = { press: boolean };

function consume(): GameInput {
  const input = { press: pendingPress };
  pendingPress = false;
  return input;
}
```

The pending flag prevents a short tap between two simulation ticks from being missed. Suppress key repeat, ignore non-primary pointers, and use `touch-action` on the game surface so browser gestures do not compete with play.

### Effects at Transition Boundaries

**What:** The core may return a small effect when entering `results`, such as `{ type: "saveRecord"; result }`.

**Why:** Record writes happen once and remain outside deterministic simulation. Do not create a general event bus. A short union and a switch in `main.ts` are enough.

## Data Flow

### Runtime Flow

```text
DOM keydown / pointerdown
        │
        v
pending one-shot press
        │
requestAnimationFrame timestamp
        │
        v
fixed-step accumulator
        │ consumes press once
        v
stepGame(previous state, input, fixed dt, config)
        │
        ├──> next GameState ──> derive camera ──> render canvas
        │
        └──> saveRecord effect ──> records adapter ──> localStorage
```

### Result and Record Flow

1. `flight` accumulates simulated airtime and records exact takeoff and landing positions.
2. Landing distance becomes fixed at the `flight -> landingSlide` transition.
3. `scoreJump` creates `{ distance, airtime }` from those run facts.
4. Entering `results` emits one save effect.
5. `recordsAdapter` compares the result with validated stored values and writes only improvements.
6. The renderer receives current result and best records as presentation data.

Do not calculate displayed distance from camera position, sprite pixels, or slide endpoint. The score must use world-space takeoff and first-contact positions.

## Terrain and Collision Boundary

For one fixed ramp and one landing slope, represent terrain with small query functions:

```typescript
type SurfaceSample = { y: number; slope: number };

function sampleRamp(x: number, config: GameConfig): SurfaceSample;
function sampleLanding(x: number, config: GameConfig): SurfaceSample;
```

During ramp run, constrain the penguin to `sampleRamp(x)`. During flight, compare its next downward position with `sampleLanding(x)` and solve or interpolate the crossing within the current fixed step. This is simpler and easier to tune than general rigid-body collision.

## Testing Seams

| Test Level | Target | High-value Cases |
|------------|--------|------------------|
| Unit | `stepGame` | Early, ideal, and late press; one press consumed once; no press fallback |
| Unit | Flight and terrain queries | Frame-rate-independent trajectory; first downward crossing; no false contact while rising |
| Unit | Landing slide | Friction never reverses velocity; stop threshold transitions exactly once |
| Unit | `scoreJump` | Distance uses takeoff to first contact; airtime uses simulated time; rounding only at display boundary |
| Unit | `recordsAdapter` helpers | Empty, malformed, old-version, lower, and new-best records |
| Integration | Loop with fake clock and fake input | Long frame clamped; bounded catch-up; tap between frames is consumed |
| Integration | Storage adapter with fake `Storage` | `getItem`, parse, quota/security failures never prevent play |
| Visual/manual | Renderer | Desktop/mobile sizes, readable camera framing, sprite alignment, result clarity |

Keep core tests independent of actual `requestAnimationFrame` and Canvas. Test renderer math separately only where it affects visible alignment. Pixel-perfect screenshot tests are unnecessary for the first version.

## Camera and Rendering

Use one world coordinate system for physics and scoring. The renderer converts world coordinates to screen coordinates:

```text
screenX = worldX - cameraX
screenY = worldY - cameraY
```

Derive `cameraX` from the penguin and phase, with configured lead space so the child can see the ramp edge and landing ahead. Clamp it to world bounds. Keep HUD and retry controls in screen space.

The renderer should perform these ordered passes:

1. Clear and draw sky/background.
2. Draw ramp and snow terrain.
3. Draw penguin sprite using state and phase.
4. Draw foreground accents if needed.
5. Draw result and retry overlay in screen space.

Rendering may choose sprite frame, flip direction, and interpolate visual position. It must not change velocity, phase, score, or collision coordinates.

## Local Records Boundary

Persist one small versioned object:

```typescript
type StoredRecordsV1 = {
  version: 1;
  bestDistance: number;
  bestAirtime: number;
};
```

Storage reads and writes can fail or return malformed strings. Catch access and parse failures, validate finite non-negative values, and fall back to empty records. Play must remain available when persistence is blocked or private browsing clears data.

## Suggested Implementation Order

1. **Model and constants**
   - Define world coordinates, phases, config, initial state, commands, and result types.
   - Resolve the missed-takeoff product rule before implementing transitions.
2. **Pure ramp and takeoff**
   - Implement ramp sampling, acceleration, press acceptance, and launch velocity.
   - Add timing-position tests before tuning presentation.
3. **Pure flight and landing contact**
   - Implement fixed-step ballistic motion and landing-surface crossing.
   - Test exact first contact and airtime.
4. **Pure landing slide and scoring**
   - Implement slope/friction motion, stop transition, and pure score calculation.
   - At this point the full jump can run in tests with no browser.
5. **Browser loop and unified input**
   - Add the fixed-step accumulator, elapsed-time clamp, input latch, keyboard, and pointer adapters.
6. **Basic renderer and camera**
   - Draw temporary geometry first. Verify the complete run visually before integrating final sprites.
7. **Assets and presentation**
   - Add sprite loading, phase animation, responsive canvas sizing, result overlay, and large retry target.
8. **Local records**
   - Add validated storage and the result-transition save effect after scoring semantics are stable.
9. **Tuning and device checks**
   - Tune through `gameConfig`, then test different refresh rates, viewport sizes, touch input, tab resume, and instant retry.

This order proves the jump outcome before visual polish and keeps every later layer dependent on a tested core.

## Scaling Considerations

| Scale | Architecture Adjustment |
|-------|-------------------------|
| Current single game | Keep one state machine, one loop, one canvas, and local storage |
| More ramps or modes | Add level data and a small top-level screen state; retain the same simulation API |
| Many dynamic entities | Consider a lightweight entity model only after repeated update/render patterns emerge |
| Online records | Add a network records adapter without moving simulation or rendering responsibilities |

User count does not materially change this client-only architecture. Content and feature count are the relevant scaling pressures.

## Anti-Patterns

### Phase Booleans

**What people do:** Track `isFlying`, `isLanded`, `isSliding`, and `showResults` separately.
**Why it fails:** Contradictory combinations become possible and transition side effects run more than once.
**Do this instead:** Use one discriminated `GamePhase`.

### Frame-Coupled Physics

**What people do:** Add a fixed number of pixels on every rendered frame.
**Why it fails:** Takeoff, distance, and airtime change with display refresh rate and background-tab gaps.
**Do this instead:** Advance simulation with bounded fixed steps.

### Gameplay in the Renderer

**What people do:** Detect landing from drawn sprite coordinates or update velocity while drawing.
**Why it fails:** Tests require Canvas and cosmetic changes alter scores.
**Do this instead:** Render a read-only world snapshot.

### General Physics Engine for One Surface

**What people do:** Introduce bodies, fixtures, contacts, and solver tuning for a penguin following two known surfaces.
**Why it fails:** The engine adds integration and tuning complexity without supporting a v1 requirement.
**Do this instead:** Use explicit ramp and landing-surface queries plus simple kinematics.

### Global Event Bus

**What people do:** Publish every phase change, score, retry, and record event through a generic bus.
**Why it fails:** Control flow becomes indirect in a game with one actor and one loop.
**Do this instead:** Return explicit next state and a tiny effect list.

### Storage Inside Scoring

**What people do:** Read and write `localStorage` while calculating a result.
**Why it fails:** Pure scoring becomes browser-dependent and storage failure can break the run.
**Do this instead:** Score first, then persist through an adapter.

## Open Decisions

- Define what happens when the player never presses before the ramp ends.
- Choose the world-unit scale and initial tuning values through playtesting.
- Decide whether visual interpolation is needed after testing on 60 Hz and high-refresh devices.
- Confirm sprite sheet frame layout and collision anchor after the provided asset is prepared.

None of these decisions requires changing the proposed component boundaries.

## Sources

- [MDN: `Window.requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), fetched 2026-07-27. Direct official documentation; research seam confidence: LOW because the generic `webfetch` provider is conservatively classified.
- [MDN: `Window.localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), fetched 2026-07-27. Direct official documentation; research seam confidence: LOW.
- [MDN: Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), fetched 2026-07-27. Direct official documentation; research seam confidence: LOW.
- [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html), accessed 2026-07-27 and cross-checked against MDN timing behavior. Research seam confidence: MEDIUM.

---
*Architecture research for: Fly Pingu Fly*
*Researched: 2026-07-27*
