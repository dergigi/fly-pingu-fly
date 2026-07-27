# Phase 1: Playable Jump - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 19
**Analogs found:** 0 / 19

This is a greenfield application. There is no `src/`, package scaffold, test suite, or application config to copy. The patterns below come from `01-RESEARCH.md`.

## File Classification

| New/Modified File | Role | Data Flow | Pattern Source | Match Quality |
|---|---|---|---|---|
| `package.json` | config | batch | `01-RESEARCH.md` lines 74-103 | no analog |
| `package-lock.json` | config | batch | npm-generated from exact dependencies | no analog |
| `tsconfig.json` | config | transform | Standard Vite TypeScript scaffold | no analog |
| `index.html` | component | request-response | Standard Vite application shell | no analog |
| `src/main.ts` | controller | event-driven | Research responsibility map, lines 62-71 | no analog |
| `src/style.css` | config | transform | Fixed logical canvas with viewport fitting | no analog |
| `src/game/config.ts` | config | transform | Research lines 184-211 | no analog |
| `src/game/jump.ts` | model | event-driven | Research lines 170-188 | no analog |
| `src/game/terrain.ts` | utility | transform | Research lines 213-230 | no analog |
| `src/game/takeoff.ts` | utility | transform | Research lines 190-211 | no analog |
| `src/game/inputLatch.ts` | store | event-driven | Research lines 232-243 | no analog |
| `src/scenes/PlayScene.ts` | controller | event-driven | Research lines 364-407 | no analog |
| `src/game/jump.test.ts` | test | batch | Research lines 341-358 | no analog |
| `src/game/terrain.test.ts` | test | batch | Research lines 341-358 | no analog |
| `src/game/takeoff.test.ts` | test | batch | Research lines 341-358 | no analog |
| `src/game/inputLatch.test.ts` | test | batch | Research lines 341-358 | no analog |
| `public/assets/sprites/sprite_penguin.png` | asset | file-I/O | Context D-05/D-07; research lines 258-263 | no analog |
| `public/assets/sprites/winter-forest.webp` | asset | file-I/O | Research lines 264-270 | no analog |
| `public/assets/sprites/snow-pile.webp` | asset | file-I/O | Research lines 264-270 | no analog |

## Pattern Assignments

### Scaffold and entry files

**Applies to:** `package.json`, `package-lock.json`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/style.css`

No repository analog exists. Use the exact package set from research: Phaser `4.2.1`, Vite `8.1.5`, TypeScript `7.0.2`, and Vitest `4.1.10`. Keep a plain TypeScript entry point with one Phaser game instance. Use a fixed logical game size and let Phaser/CSS fit the canvas to the viewport. The planner must preserve the package legitimacy checkpoint recorded in research before installation.

### `src/game/jump.ts` (model, event-driven)

**Source:** `01-RESEARCH.md`, lines 170-188

```typescript
type JumpPhase = "ramp" | "flight" | "slide" | "resting";
type PressCommand = { pressedAtMs: number } | null;

function stepJump(
  state: JumpState,
  command: PressCommand,
  dt: number,
  config: JumpConfig,
): JumpState;
```

Keep the state machine browser-free. One discriminated phase owns ramp motion, launch, flight, slide, and rest. `stepJump` receives fixed `dt`; rendering and viewport values never enter gameplay state.

### `src/game/takeoff.ts` (utility, transform)

**Source:** `01-RESEARCH.md`, lines 190-207

```typescript
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

function takeoffQuality(x: number, config: TakeoffConfig): number {
  const span = x <= config.lipX ? config.earlySpan : config.lateSpan;
  const normalized = clamp01(Math.abs(x - config.lipX) / span);
  return config.minimumQuality +
    (1 - config.minimumQuality) * (1 - smoothstep(normalized));
}
```

Use one launch transition for early, ideal, late, and automatic no-input takeoff. Keep all tuning values in `config.ts`.

### `src/game/terrain.ts` (utility, transform)

**Source:** `01-RESEARCH.md`, lines 213-230

```typescript
type SurfaceSample = { y: number; slope: number };

function sampleLanding(x: number, config: TerrainConfig): SurfaceSample;

function crossingFraction(previousGap: number, nextGap: number): number {
  return Math.max(0, Math.min(1, -previousGap / (nextGap - previousGap)));
}
```

Detect contact only while descending, interpolate the first crossing, then clamp slide deceleration at zero so velocity never reverses.

### `src/game/inputLatch.ts` (store, event-driven)

**Source:** `01-RESEARCH.md`, lines 232-243

```typescript
function tryQueuePress(pressedAtMs: number): void {
  if (takeoffConsumed || pendingPress) return;
  pendingPress = { pressedAtMs };
}
```

Store one timestamped semantic command. Pointer, Space, and Enter all call this same gate. Mark the action consumed when simulation accepts it.

### `src/scenes/PlayScene.ts` (controller, event-driven)

**Source:** `01-RESEARCH.md`, lines 364-407

```typescript
update(_time: number, deltaMs: number): void {
  const frameSeconds = Math.min(deltaMs / 1000, 0.1);
  this.accumulator += frameSeconds;

  while (this.accumulator >= FIXED_STEP) {
    this.simulationTimeMs += FIXED_STEP * 1000;
    const command = this.inputLatch.consumeThrough(this.simulationTimeMs);
    this.jumpState = stepJump(
      this.jumpState,
      command,
      FIXED_STEP,
      jumpConfig,
    );
    this.accumulator -= FIXED_STEP;
  }

  this.renderSnapshot(this.jumpState);
}
```

The scene adapts Phaser input and variable render timing to the pure core. Rendering, sprite pose, scenery, and camera read the latest snapshot without mutating simulation state. Cap catch-up steps as specified in research.

### `src/game/*.test.ts` (test, batch)

**Source:** `01-RESEARCH.md`, lines 341-358

Use Vitest in its Node environment. Cover curve continuity and monotonicity, one-shot command consumption, early/ideal/late/no-input traces reaching `resting`, first terrain contact, non-reversing slide friction, and identical outcomes under synthetic 30/60/120/144 Hz render schedules.

### Sprite assets (asset, file-I/O)

**Source:** Context D-05 through D-08; `01-RESEARCH.md`, lines 258-270

Load public assets using root-relative paths:

```typescript
this.load.image("winter-forest", "/assets/sprites/winter-forest.webp");
this.load.image("snow-pile", "/assets/sprites/snow-pile.webp");
this.load.image("penguin-sheet", "/assets/sprites/sprite_penguin.png");

const texture = this.textures.get("penguin-sheet");
texture.add("ramp", 0, rampCrop.x, rampCrop.y, rampCrop.width, rampCrop.height);
```

The committed penguin source sheet is a 640x240 RGBA PNG with irregularly spaced visible poses. Inspect it directly, register explicit named texture frames from crop rectangles, and record each chosen pose's stable snow-contact offset before integration. Never substitute `snowball-penguin.webp`. Use only `winter-forest.webp` and one `snow-pile.webp` accent from the raster scenery.

## Shared Patterns

### One-way state flow

`input event -> timestamped latch -> fixed-step simulation -> render snapshot -> sprite/camera`

Phaser owns browser-facing concerns. Pure TypeScript owns all gameplay outcomes.

### Validation and error handling

There is no server or shared error abstraction. Validate finite config values and timestamps at module boundaries. Reject duplicate input through the one-shot gate. A tested `prebuild` checker must validate the three exact committed asset paths, non-empty payloads, PNG/WebP signatures, parseable image metadata, and the penguin sheet's expected 640x240 dimensions before Vite starts.

### Asset contact point

Simulation `(x, y)` represents snow contact. Visual frames use per-frame contact offsets, so transparent padding and pose changes cannot alter terrain collision.

## No Analog Found

All application files are new, so there is no implementation analog to copy. The three required art inputs are existing committed files: the approved 640x240 RGBA `sprite_penguin.png` sheet and the selected `winter-forest.webp` and `snow-pile.webp` scenery. Plan 01-03 consumes and validates them in place; it does not copy or replace them.

## Metadata

**Analog search scope:** repository root, `src/`, root config files, `.cursor/rules/`, and `public/`
**Files scanned:** no application files; committed sprite assets inspected
**Pattern source:** `.planning/phases/01-playable-jump/01-RESEARCH.md`
**Pattern extraction date:** 2026-07-27
