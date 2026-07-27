# Phase 1: Playable Jump - Research

**Researched:** 2026-07-27
**Domain:** Deterministic one-button Phaser ski-jump
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Takeoff Timing
- **D-01:** Use a broad sweet zone around the ramp lip so young children regularly produce satisfying jumps while timing still affects distance.
- **D-02:** A press well before the sweet zone is accepted immediately as an early, weaker takeoff. Do not buffer or ignore the input.
- **D-03:** If the player never presses, the penguin makes a small natural hop from the ramp edge and completes a short safe flight.
- **D-04:** Launch quality follows a smooth curve that peaks at the ramp lip. Both early and late presses produce progressively shorter jumps rather than binary success or failure.

### Asset Organization
- **D-05:** User-provided sprite files belong in `public/assets/sprites/`, where they can be loaded directly by the browser game.
- **D-06:** The first level is a snow level.
- **D-07:** Use the penguin from the linked *Where's My Egg?* sprite sheet as the player character. Do not substitute `snowball-penguin.webp`.
- **D-08:** Keep the scene simple by using only a small curated subset of the supplied snow assets. Leave unrelated fantasy, animal, and vegetation sprites unused.

### Claude's Discretion
- Exact timing-window width, curve coefficients, launch speed, launch angle, gravity, and slide friction should be tuned during implementation while preserving D-01 through D-04.
- Flight feel, camera easing, sprite-state selection, and landing animation details may use the simplest approach that satisfies the roadmap success criteria.
- Choose the smallest useful combination of snow scenery. Prefer `winter-forest.webp`, `pine-tree-snow-heavy.webp`, `snow-covered-rock-cluster.webp`, and `snow-pile.webp` before adding more.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JUMP-01 | The penguin automatically accelerates down the same ski ramp at the start of every attempt. | Parametric ramp path, fixed initial state, and fixed-step runner. [VERIFIED: repository requirements and MDN game-loop docs] |
| JUMP-02 | The penguin's takeoff position determines launch quality through a forgiving, continuous timing curve. | Asymmetric normalized position plus smoothstep quality curve. [VERIFIED: repository context; formula is an implementation recommendation] |
| JUMP-03 | A missed takeoff input produces a safe weak jump rather than a crash or blocked attempt. | Automatic minimum-quality launch at the late boundary. [VERIFIED: repository context] |
| JUMP-04 | The penguin follows a deterministic flight path independent of display size and refresh rate. | Pure fixed-step simulation in world units, separated from Phaser rendering and scale. [CITED: https://developer.mozilla.org/en-US/docs/Games/Anatomy] |
| JUMP-05 | The penguin lands safely, slides to a stop, and completes the attempt without another player input. | First-contact interpolation, tangent-aligned landing, and clamped slide deceleration. [CITED: https://docs.unity3d.com/6000.1/Documentation/Manual/sweep-based-ccd.html] |
| INPT-01 | The player can trigger the single takeoff action with a screen tap, mouse click, or keyboard press. | One scene-level Phaser `pointerdown` path plus Space and Enter keys. [CITED: https://docs.phaser.io/phaser/concepts/input] |
| INPT-02 | The game consumes at most one takeoff action per attempt and ignores repeats or additional touches. | One pending timestamped command and an attempt-owned `takeoffConsumed` guard. [CITED: https://docs.phaser.io/phaser/concepts/input] |
| INPT-03 | The game immediately acknowledges an accepted takeoff input through the penguin's pose and motion. | Accepted command changes phase/pose at the next simulation tick and next render. [VERIFIED: repository requirements] |
| PRES-01 | The game displays a bright snowy side-scrolling scene with a visible ramp edge and takeoff zone. | Drawn snow terrain plus two curated existing snow assets. [VERIFIED: repository asset inspection] |
| PRES-02 | The camera keeps the penguin, upcoming ramp edge, flight, and landing area readable during their relevant phases. | Phase-derived camera target with lead, bounds, and lerp. [CITED: https://docs.phaser.io/phaser/concepts/cameras] |
| PRES-03 | The penguin uses the provided sprite art with stable animation alignment and a consistent ground-contact point. | Render every frame around a fixed contact point using a frame manifest. Final verification is blocked because the selected file is absent. [VERIFIED: repository asset inspection] |
</phase_requirements>

## Summary

Build this phase as one Phaser `PlayScene` around a browser-free TypeScript simulation. The simulation owns ramp progress, one-shot takeoff, ballistic flight, first terrain contact, landing slide, and the terminal `resting` state. Phaser owns loading, input events, sprites, scenery, and camera movement. Display size and Phaser's variable render delta must never enter gameplay formulas. [VERIFIED: repository architecture research; CITED: https://developer.mozilla.org/en-US/docs/Games/Anatomy]

Use a fixed-step accumulator inside `PlayScene.update`, not a second `requestAnimationFrame` loop. Queue one timestamped semantic press, consume it at the corresponding simulation step, and derive launch quality from world-space position. The broad early and short late ranges should map through one smooth continuous curve with its maximum at the lip. If no command arrives by the late boundary, launch automatically at minimum quality. [VERIFIED: repository context and requirements; CITED: https://docs.phaser.io/phaser/concepts/scenes]

The selected character prerequisite is unresolved. `public/assets/sprites/sprite_penguin.png` does not exist. `snowball-penguin.webp` must not be used. Core work and a temporary geometric development marker may proceed, but Phase 1 cannot satisfy `PRES-03` until the chosen file arrives and its frame rectangles/contact offsets are documented. [VERIFIED: repository asset inspection and D-07]

**Primary recommendation:** Implement and test one pure `stepJump` state machine first, then bind it to one lean Phaser scene with a timestamped input latch, a phase-aware camera target, and a contact-anchored sprite renderer. [VERIFIED: repository architecture research]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Jump rules and terrain contact | Browser / Client pure core | — | One local deterministic state machine owns all gameplay outcomes. [VERIFIED: project constraints] |
| Input collection | Browser / Client Phaser adapter | Pure core gate | Phaser normalizes pointer input; the core decides whether the one command is still valid. [CITED: https://docs.phaser.io/phaser/concepts/input] |
| Rendering and animation | Browser / Client Phaser scene | CDN / Static assets | The scene reads simulation snapshots and loads root-relative public assets. [CITED: https://vite.dev/guide/assets] |
| Camera framing | Browser / Client Phaser camera | Pure derived target | Camera state changes presentation only. [CITED: https://docs.phaser.io/phaser/concepts/cameras] |
| Asset delivery | CDN / Static | Browser / Client loader | Vite copies `public` files unchanged and serves them from root paths. [CITED: https://vite.dev/guide/assets] |
| Persistence | — | — | Results and records are outside Phase 1. [VERIFIED: ROADMAP.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `phaser` [WARNING: flagged as suspicious because this release is under 30 days old; verify before installing.] | `4.2.1` | Scene, renderer, assets, input, camera, scale | The requested game framework provides all browser-facing game systems needed here. [CITED: https://docs.phaser.io/] |
| TypeScript [WARNING: flagged as suspicious because this release is under 30 days old; verify before installing.] | `7.0.2` | Pure simulation and typed scene boundary | The repository selected TypeScript and no application scaffold exists yet. [VERIFIED: npm registry and repository inspection] |
| Vite [WARNING: flagged as suspicious because this release is under 30 days old; verify before installing.] | `8.1.5` | Development server and production build | Public sprite paths and a plain TypeScript entry point need no UI framework. [CITED: https://vite.dev/guide/assets] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest [WARNING: flagged as suspicious because this release is under 30 days old; verify before installing.] | `4.1.10` | Browser-free core tests | Test curve, state transitions, deterministic traces, terrain contact, slide stop, and input gating. [CITED: https://vitest.dev/guide/] |
| Browser APIs | built-in | High-resolution event timestamps | Store press time against the same monotonic timeline used by the scene loop. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure explicit kinematics | Phaser Arcade Physics | Arcade Physics is useful for general bodies, but it would make one known ramp and landing surface harder to test as exact game rules. Keep it out of scored motion in this phase. [VERIFIED: repository architecture research] |
| One `PlayScene` | Boot/Play/Results scene set | Results do not exist in Phase 1. Add another scene only if asset preload needs a visible loading state. [VERIFIED: phase boundary] |

**Installation:**

```bash
npm install phaser@4.2.1
npm install -D vite@8.1.5 typescript@7.0.2 vitest@4.1.10
```

Versions and publish metadata were checked with `npm view` on 2026-07-27. No package exposes a `postinstall` script. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Current release age | Weekly downloads | Source Repo | Verdict | Disposition |
|---------|----------|---------------------|------------------|-------------|---------|-------------|
| `phaser` | npm | 18 days | 264,650 | `github.com/phaserjs/phaser` | SUS: too-new | Flagged. Planner must add `checkpoint:human-verify` before install. [VERIFIED: package-legitimacy seam] |
| `vite` | npm | 11 days | 156,881,865 | `github.com/vitejs/vite` | SUS: too-new | Flagged. Planner must add `checkpoint:human-verify` before install. [VERIFIED: package-legitimacy seam] |
| `typescript` | npm | 19 days | 244,837,253 | `github.com/microsoft/TypeScript` | SUS: too-new | Flagged. Planner must add `checkpoint:human-verify` before install. [VERIFIED: package-legitimacy seam] |
| `vitest` | npm | 21 days | 82,309,790 | `github.com/vitest-dev/vitest` | SUS: too-new | Flagged. Planner must add `checkpoint:human-verify` before install. [VERIFIED: package-legitimacy seam] |

**Packages removed due to SLOP verdict:** none. [VERIFIED: package-legitimacy seam]

**Packages flagged as suspicious [SUS]:** `phaser`, `vite`, `typescript`, and `vitest`. All were flagged only because the current releases are less than 30 days old; registry metadata also shows established official repositories, substantial usage, and no postinstall scripts. The required human checkpoint still applies. [VERIFIED: package-legitimacy seam and npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
pointerdown / Space / Enter
             |
             v
 timestamped one-command latch
             |
 Phaser Scene.update(time, delta)
             |
             v
 bounded fixed-step accumulator
             |
             v
 stepJump(state, command, fixedDt, config)
      |             |               |
      |             |               +--> resting terminal state
      |             +--> terrain crossing --> landing slide
      +--> render snapshot
                |
        +-------+--------+
        v                v
 contact-anchored    phase-derived camera target
 penguin sprite          |
        |                v
        +----------> Phaser camera
```

The input adapter, simulation, renderer, and camera flow in one direction. Rendering never mutates jump state. [VERIFIED: repository architecture research]

### Recommended Project Structure

```text
src/
├── main.ts
├── style.css
├── game/
│   ├── config.ts
│   ├── jump.ts
│   ├── terrain.ts
│   ├── takeoff.ts
│   ├── inputLatch.ts
│   └── *.test.ts
└── scenes/
    └── PlayScene.ts
```

Keep the split this small. `jump.ts` can contain the state union, initial-state factory, and transition function until size proves a further extraction useful. [VERIFIED: project DRY constraint]

### Pattern 1: Pure Fixed-Step State Machine

**What:** Advance one discriminated state with fixed `dt`, immutable config, and at most one semantic command. [CITED: https://developer.mozilla.org/en-US/docs/Games/Anatomy]

**When to use:** Every ramp, flight, contact, slide, and rest update. [VERIFIED: phase requirements]

```typescript
// Source: project architecture derived from MDN's fixed-update pattern.
type JumpPhase = "ramp" | "flight" | "slide" | "resting";
type PressCommand = { pressedAtMs: number } | null;

function stepJump(
  state: JumpState,
  command: PressCommand,
  dt: number,
  config: JumpConfig,
): JumpState;
```

`PlayScene.update` should accumulate Phaser's variable `delta`, call `stepJump` with a fixed `1 / 120` second step, cap catch-up work, and discard a long suspension gap. A 120 Hz simulation is a tuning recommendation for this single-actor game, not a requirement; keep it as one config constant. [ASSUMED]

### Pattern 2: Position-Based Smooth Takeoff

**What:** Normalize early and late distances separately, then use the same smoothstep falloff on either side of the lip. This keeps the peak continuous while allowing a broad early range and a shorter late range. [VERIFIED: D-01 through D-04; formula is an implementation recommendation]

```typescript
// Source: implementation recommendation from locked takeoff decisions.
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

function takeoffQuality(x: number, config: TakeoffConfig): number {
  const span = x <= config.lipX ? config.earlySpan : config.lateSpan;
  const offset = Math.abs(x - config.lipX);
  const normalized = clamp01(offset / span);
  return config.minimumQuality +
    (1 - config.minimumQuality) * (1 - smoothstep(normalized));
}
```

Accept the first command immediately anywhere in the ramp phase, including well before the sweet zone. Keep a short modeled late-contact segment after `lipX`; if no command arrives by its end, call the same launch function with `minimumQuality`. This gives press and no-press paths one launch implementation. [VERIFIED: D-02 and D-03; late-contact geometry is an implementation recommendation]

Launch quality should interpolate tuned launch speed and upward component, while the ramp tangent supplies the forward direction. Keep all coefficients in `config.ts`, and assert only invariants until playtesting locks exact values. [ASSUMED]

### Pattern 3: Parametric Terrain and First Contact

**What:** Represent the ramp as distance-along-path samples and landing terrain as a small height/slope query. [VERIFIED: repository architecture research]

```typescript
// Source: implementation recommendation informed by sweep-based CCD.
type SurfaceSample = { y: number; slope: number };

function sampleLanding(x: number, config: TerrainConfig): SurfaceSample;

function crossingFraction(previousGap: number, nextGap: number): number {
  return Math.max(0, Math.min(1, -previousGap / (nextGap - previousGap)));
}
```

During flight, only test contact while descending. If the contact point moves from above the surface to on/below it during one fixed step, interpolate the crossing fraction, clamp position and airtime to first contact, align motion to the terrain tangent, and enter `slide`. [CITED: https://docs.unity3d.com/6000.1/Documentation/Manual/sweep-based-ccd.html]

During slide, reduce scalar along-surface speed by fixed deceleration and clamp at zero. Never let friction reverse velocity. Enter `resting` exactly once at the stop threshold. [VERIFIED: JUMP-05; formula is an implementation recommendation]

### Pattern 4: One-Shot Input Gate

**What:** Register one scene-level `pointerdown` listener and keyboard keys with repeat emission disabled. Both call one `tryQueuePress(timestamp)` function. [CITED: https://docs.phaser.io/phaser/concepts/input]

```typescript
// Source: Phaser input docs plus project one-shot rule.
function tryQueuePress(pressedAtMs: number): void {
  if (takeoffConsumed || pendingPress) return;
  pendingPress = { pressedAtMs };
}
```

Set `takeoffConsumed` when the command is accepted, not when pointer/key release occurs. Ignore later pointer IDs and key events for the attempt. Phase 2 owns gesture suppression and full cross-device browser polish, so this phase only needs functional tap/click/keyboard parity. [VERIFIED: INPT-01, INPT-02, and ROADMAP.md]

### Pattern 5: Read-Only Phaser Presentation

**What:** Keep one Phaser sprite and one camera-target object synchronized from the latest simulation snapshot. [CITED: https://docs.phaser.io/phaser/concepts/cameras]

For ramp and slide, set rotation from the sampled surface tangent. For flight, derive rotation from `atan2(vy, vx)` with a visual clamp. Animation/frame changes acknowledge takeoff but do not alter collision. [ASSUMED]

Use camera bounds plus a target that changes by phase:

- ramp: frame the penguin behind center while keeping the lip and visible takeoff zone ahead;
- flight: lead horizontally and ease vertical tracking so the landing area appears before contact;
- slide: settle toward the landing slope and stop moving when the penguin rests. [VERIFIED: PRES-02; CITED: https://docs.phaser.io/phaser/concepts/cameras]

### Sprite Contact Anchor

Treat simulation `(x, y)` as the snow-contact point, not the visual center. Render each selected frame with a manifest entry containing its crop rectangle and contact offset. A plain `setOrigin(0.5, 1)` is sufficient only if received frames have normalized bounds and the feet share a baseline. [CITED: https://docs.phaser.io/phaser/concepts/gameobjects/sprite]

The actual sheet layout, frame dimensions, and foot offsets cannot be researched until `sprite_penguin.png` exists. The planner must schedule asset receipt/inspection before animation tasks and block final `PRES-03` verification on it. [VERIFIED: repository asset inspection]

### Snow Scene Composition

Draw the sky, ramp, takeoff stripe, and landing surface with Phaser geometry, then use only:

- `winter-forest.webp` as a sparse background cluster;
- `snow-pile.webp` as one foreground accent. [VERIFIED: repository asset inspection and D-08]

Both are 256 × 256 WebP payloads. `pine-tree-snow-heavy.webp` and `snow-covered-rock-cluster.webp` are also 256 × 256 but contain PNG payloads despite their `.webp` names. Do not depend on those mismatched files until they are normalized or renamed. [VERIFIED: `sips` repository asset inspection]

### Anti-Patterns to Avoid

- **Arcade Physics as game authority:** collision solver state would duplicate the pure state machine and make exact trace tests harder. [VERIFIED: repository architecture research]
- **Per-render-frame movement:** refresh rate would change outcomes. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame]
- **Separate touch, mouse, and click handlers:** Phaser already unifies mouse and touch pointer events. [CITED: https://docs.phaser.io/phaser/concepts/input]
- **Boolean phase flags:** use one discriminated phase so flight, slide, and rest cannot overlap. [VERIFIED: repository architecture research]
- **Sprite bounds as terrain collision:** transparent padding and changing frames would change gameplay. [VERIFIED: repository asset risk research]
- **Camera position in physics:** camera easing and viewport changes are presentation only. [VERIFIED: JUMP-04 and PRES-02]
- **Results, records, retry, tutorial, audio, or extra levels:** all are outside this phase. [VERIFIED: ROADMAP.md and user scope]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser renderer and asset lifecycle | Custom Canvas engine | Phaser scene/loader/game objects | Phaser already provides the requested browser game shell. [CITED: https://docs.phaser.io/] |
| Mouse/touch normalization | Parallel DOM touch and mouse listeners | Phaser pointer events | One pointer API emits for both sources. [CITED: https://docs.phaser.io/phaser/concepts/input] |
| Camera transform | Custom world-to-canvas camera | Phaser camera bounds/follow/lerp | Built-in camera APIs cover the phase's framing needs. [CITED: https://docs.phaser.io/phaser/concepts/cameras] |
| General collision engine | Polygon bodies and a contact solver | Two terrain query functions and first-crossing interpolation | The world has one actor and known static surfaces. [VERIFIED: phase scope; CITED: sweep-based CCD docs] |
| Animation event bus | Generic publish/subscribe layer | Phase-to-frame mapping in `PlayScene` | One actor and one scene need direct control flow. [VERIFIED: project scope] |

**Key insight:** Phaser should remove browser/rendering work, while the small pure core should remove outcome ambiguity. [VERIFIED: repository architecture research]

## Common Pitfalls

### Pitfall 1: Input Is Latched but Still Frame-Quantized

**What goes wrong:** The same wall-clock press is applied at different penguin positions under different render cadences. [VERIFIED: deterministic timing analysis]

**Why it happens:** A boolean is consumed on the first update after the event without retaining its timestamp. [VERIFIED: deterministic timing analysis]

**How to avoid:** Queue the event timestamp and process it against the fixed simulation timeline. Add render-cadence equivalence tests. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame]

**Warning signs:** 30 Hz and 144 Hz scripted runs return different launch qualities. [VERIFIED: JUMP-04]

### Pitfall 2: The No-Press Path Falls Off the Geometry

**What goes wrong:** Missing input enters flight accidentally with stale ramp velocity or collides immediately. [VERIFIED: repository architecture risk]

**Why it happens:** Automatic takeoff is treated as an edge case instead of the same launch transition. [VERIFIED: D-03]

**How to avoid:** At the explicit late boundary, call the shared launch function with minimum quality and a safe minimum upward component. [VERIFIED: D-03; exact component is tunable]

**Warning signs:** no-input tests never reach `resting`, or airtime is zero. [VERIFIED: JUMP-03 and JUMP-05]

### Pitfall 3: Discrete Landing Tunnels or Scores Slide Distance

**What goes wrong:** The penguin penetrates the slope, contacts one tick late, or uses the slide endpoint as landing. [CITED: https://docs.unity3d.com/6000.1/Documentation/Manual/sweep-based-ccd.html]

**How to avoid:** Detect the above-to-below sign crossing, interpolate first contact, and store landing facts before slide begins. [CITED: sweep-based CCD docs]

### Pitfall 4: Camera Follow Hides the Decision

**What goes wrong:** Center-follow leaves too little room ahead and the lip exits view. [VERIFIED: PRES-02]

**How to avoid:** Follow a phase-derived proxy target with horizontal lead, bounded lerp, and camera bounds. [CITED: https://docs.phaser.io/phaser/concepts/cameras]

### Pitfall 5: Art Integration Retunes Physics

**What goes wrong:** Transparent padding or varying frame baselines shift apparent terrain contact. [VERIFIED: repository sprite risk research]

**How to avoid:** Keep one simulation contact point and correct each visual frame with manifest offsets. Do not derive collision from sprite dimensions. [CITED: https://docs.phaser.io/phaser/concepts/gameobjects/sprite]

### Pitfall 6: Missing Character Asset Is Hidden by a Substitute

**What goes wrong:** The phase appears complete with `snowball-penguin.webp`, violating D-07 and leaving the real sheet integration untested. [VERIFIED: repository context]

**How to avoid:** Permit a temporary geometric marker only for development. Add an explicit asset prerequisite and fail final `PRES-03` verification while `sprite_penguin.png` is absent. [VERIFIED: repository asset inspection]

## Testing Strategy

Vitest's default Node environment is enough for pure simulation tests; no DOM emulator is required. [CITED: https://vitest.dev/config/environment]

Create focused tests for:

1. identical initial state and ramp progress for every run;
2. first command accepted immediately, second command ignored;
3. key-repeat equivalent commands ignored;
4. quality peaks at the lip, remains continuous, and decreases monotonically with normalized distance on both sides;
5. early, ideal, late, and no-input traces all reach `resting`;
6. no-input trace uses minimum quality and remains airborne for a positive interval;
7. contact only occurs while descending and clamps to first terrain crossing;
8. slide speed never reverses and reaches zero once;
9. the same timestamped command trace produces the same takeoff velocity, landing point, and rest state under synthetic 30, 60, 120, and 144 Hz render schedules;
10. viewport dimensions and camera settings do not occur in simulation config or change trace output. [VERIFIED: phase requirements and MDN timing docs]

Use `npm test -- --run` or define `"test": "vitest run"` for one-shot verification. [CITED: https://vitest.dev/guide/]

`workflow.nyquist_validation` is explicitly `false`, so no formal Validation Architecture or Wave 0 test-map contract is required. Tests remain part of implementation because deterministic behavior is a Phase 1 requirement. [VERIFIED: .planning/config.json and JUMP-04]

## Code Examples

### Bounded Accumulator Inside Phaser

```typescript
// Source: MDN game-loop model adapted to Phaser Scene.update.
private accumulator = 0;
private simulationTimeMs = 0;

update(_time: number, deltaMs: number): void {
  const frameSeconds = Math.min(deltaMs / 1000, 0.1);
  this.accumulator += frameSeconds;

  let steps = 0;
  while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS) {
    this.simulationTimeMs += FIXED_STEP * 1000;
    const command = this.inputLatch.consumeThrough(this.simulationTimeMs);
    this.jumpState = stepJump(this.jumpState, command, FIXED_STEP, jumpConfig);
    this.accumulator -= FIXED_STEP;
    steps += 1;
  }

  this.renderSnapshot(this.jumpState);
}
```

Reset or discard the accumulator after a long suspension instead of simulating hidden time. Phase 2 will own full tab-resume behavior. [CITED: https://developer.mozilla.org/en-US/docs/Games/Anatomy; VERIFIED: ROADMAP.md]

### Phaser Input Binding

```typescript
// Source: https://docs.phaser.io/phaser/concepts/input
this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
  this.inputLatch.tryQueuePress(pointer.downTime);
});

const keys = this.input.keyboard?.addKeys(
  "SPACE,ENTER",
  true,
  false,
) as Record<string, Phaser.Input.Keyboard.Key>;

Object.values(keys).forEach((key) => {
  key.on("down", (event: KeyboardEvent) => {
    if (!event.repeat) this.inputLatch.tryQueuePress(event.timeStamp);
  });
});
```

Confirm the exact Phaser 4 TypeScript signatures during implementation because the fetched concepts page shows the API shape but not all current type overloads. [CITED: https://docs.phaser.io/phaser/concepts/input]

### Public Asset Paths

```typescript
// Source: https://vite.dev/guide/assets
this.load.image("winter-forest", "/assets/sprites/winter-forest.webp");
this.load.image("snow-pile", "/assets/sprites/snow-pile.webp");
this.load.spritesheet("penguin", "/assets/sprites/sprite_penguin.png", {
  frameWidth: RECEIVED_FRAME_WIDTH,
  frameHeight: RECEIVED_FRAME_HEIGHT,
});
```

Do not fill in frame dimensions until the selected asset is present and inspected. [VERIFIED: repository asset inspection]

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Per-frame pixel increments | Timestamped rendering plus fixed authoritative updates | Gameplay no longer speeds up on high-refresh displays. [CITED: MDN `requestAnimationFrame`] |
| Separate mouse and touch handlers | Unified Phaser pointer events | One physical action follows one adapter path. [CITED: Phaser input docs] |
| Centered sprite collision | Explicit world contact point plus frame offsets | Animation frames cannot move gameplay geometry. [CITED: Phaser sprite origin docs] |
| General rigid-body contact | First time-of-impact against known static terrain | Landing is small, deterministic, and testable. [CITED: sweep-based CCD docs] |

**Deprecated/outdated for this phase:**

- Phaser 2's `anchor` property is replaced by origin APIs in current Phaser documentation. [CITED: https://docs.phaser.io/phaser/getting-started/making-your-first-phaser-game]
- A second handwritten `requestAnimationFrame` loop should not run beside Phaser's scene loop. [VERIFIED: Phaser scene lifecycle and repository stack research]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A `1 / 120` second fixed step is the best initial setting for this single-actor jump. | Architecture Pattern 1 | May be unnecessary or require retuning; keep it configurable. |
| A2 | Launch speed/upward component interpolation from one quality scalar will produce a satisfying curve. | Architecture Pattern 2 | Playtesting may need separate speed and angle curves. |
| A3 | Velocity-derived visual rotation with clamping will read well for the received art. | Pattern 5 | Sheet poses may make fixed phase poses clearer. |

All three assumptions concern game feel. They do not change the recommended state/input/render boundaries. [VERIFIED: architecture analysis]

## Open Questions

1. **What is the actual penguin sheet layout?**
   - What we know: the required path is `public/assets/sprites/sprite_penguin.png`, and `snowball-penguin.webp` is forbidden. [VERIFIED: D-05 and D-07]
   - What's unclear: frame size, frame count, transparent bounds, intended poses, and contact offsets because the file is absent. [VERIFIED: repository inspection]
   - Recommendation: make asset receipt and frame-manifest inspection a blocking prerequisite for sprite integration and final `PRES-03` verification. [VERIFIED: implementation dependency analysis]

2. **How wide should early and late spans be?**
   - What we know: early must be broad, late must exist, both are continuous, and no input auto-launches weakly. [VERIFIED: D-01 through D-04]
   - What's unclear: tuned world distances and minimum quality. [VERIFIED: Claude's discretion]
   - Recommendation: begin with config values and invariant tests, then tune in-browser without rewriting formulas. [ASSUMED]

3. **Should the optional PNG-payload `.webp` assets be normalized?**
   - What we know: the pine tree and rock cluster extensions do not match their detected payload format. [VERIFIED: repository asset inspection]
   - What's unclear: whether the deployment server/browser combination will tolerate that mismatch consistently. [ASSUMED]
   - Recommendation: omit them from the smallest scene or normalize them in a separate asset step before use. [VERIFIED: scope minimization]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Vite, TypeScript, Vitest | ✓ | `26.5.0` | Pin the project-supported major in `engines`; current binary satisfies Vite and Vitest engine ranges. [VERIFIED: local command and npm metadata] |
| npm | Dependency install/scripts | ✓ | `11.17.0` | — [VERIFIED: local command] |
| Phaser package | Runtime | ✗ not installed | target `4.2.1` | Human-verify flagged package, then install. [VERIFIED: repository and package audit] |
| Existing snow art | Scene | ✓ | two selected 256 × 256 WebP files | Draw terrain with Phaser graphics. [VERIFIED: repository asset inspection] |
| `sprite_penguin.png` | `PRES-03` | ✗ | — | No final fallback. A geometric marker may support development only; do not use `snowball-penguin.webp`. [VERIFIED: repository context and inspection] |

**Missing dependencies with no fallback:**

- `public/assets/sprites/sprite_penguin.png` blocks final character integration and `PRES-03`. [VERIFIED: repository inspection]

**Missing dependencies with fallback:**

- Runtime/dev npm packages are not installed; the scaffold plan should install them after the required legitimacy checkpoint. [VERIFIED: repository inspection]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No accounts or remote identity in this client-only phase. [VERIFIED: project scope] |
| V3 Session Management | no | No sessions. [VERIFIED: project scope] |
| V4 Access Control | no | No protected resources or roles. [VERIFIED: project scope] |
| V5 Input Validation | yes | Whitelist Space/Enter and primary pointer action; reject duplicate commands; require finite config/timestamps at boundaries. [VERIFIED: INPT-01/02 and ASVS applicability analysis] |
| V6 Cryptography | no | No secrets, tokens, or protected data. [VERIFIED: phase scope] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Untrusted or malformed package release | Tampering | Commit lockfile, use exact versions, inspect official repository metadata, and honor the package-legitimacy checkpoint. [VERIFIED: package audit] |
| Third-party art lacks adequate publication rights | Repudiation / legal provenance risk | Preserve the user's permission record and source provenance before release; do not infer rights from host availability. [VERIFIED: project state and context] |
| Event flood or multi-touch changes state repeatedly | Denial of service / integrity | One-command attempt guard and one active pointer path. [VERIFIED: INPT-02] |

No user text, network data, storage payload, authentication, session, or cryptographic surface is introduced in Phase 1. [VERIFIED: phase boundary]

## Sources

### Primary (HIGH confidence)

- Repository `01-CONTEXT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `PROJECT.md`, and committed asset inspection. [VERIFIED: repository]
- npm registry metadata for exact versions, engines, repositories, downloads, publish dates, and postinstall scripts. [VERIFIED: npm registry]
- GSD package-legitimacy seam verdicts. [VERIFIED: package-legitimacy seam]

### Secondary (MEDIUM confidence)

- [Phaser Input](https://docs.phaser.io/phaser/concepts/input) - unified pointers, keyboard keys, repeat configuration.
- [Phaser Cameras](https://docs.phaser.io/phaser/concepts/cameras) - bounds, follow, lerp, deadzone, world view.
- [Phaser Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager) - fixed game size and `FIT`.
- [Phaser Sprite](https://docs.phaser.io/phaser/concepts/gameobjects/sprite) - sprite loading, frame animation, origins.
- [Vite Static Asset Handling](https://vite.dev/guide/assets) - public directory root paths and unchanged copying.
- [Vitest Getting Started](https://vitest.dev/guide/) and [environment config](https://vitest.dev/config/environment) - Node tests and one-shot runs.
- [MDN Anatomy of a Video Game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) and [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - fixed updates, variable rendering, refresh behavior, suspension.
- [Unity Sweep-based CCD](https://docs.unity3d.com/6000.1/Documentation/Manual/sweep-based-ccd.html) - first time-of-impact and motion clamping.

### Tertiary (LOW confidence)

- Exact gameplay tuning values and visual pose choices remain assumptions until the playable prototype and selected sprite are available. [ASSUMED]

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM. Official docs and registry metadata agree, but the package gate flags each very recent release for human verification.
- Architecture: HIGH. It follows the locked deterministic, one-action, one-ramp constraints and established fixed-step boundaries.
- Pitfalls: MEDIUM. Timing and collision risks are documented; final camera feel and sprite alignment need the missing asset and browser testing.
- Asset readiness: HIGH. Repository inspection directly confirms the selected file is missing and the two optional extension/payload mismatches.

**Research date:** 2026-07-27
**Valid until:** 2026-08-03 for package versions; architecture remains valid unless phase decisions change.
