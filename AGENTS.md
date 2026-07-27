<!-- gsd-project-start source:PROJECT.md -->

## Project

**Fly Pingu Fly**

Fly Pingu Fly is a simple old-school 2D side-scrolling ski-jump game for children ages 4–7. A penguin automatically slides down a large snowy ramp, and the player presses once at the ramp edge to launch it into the air before watching it fly, land, and slide to a stop.

**Core Value:** A young child can immediately understand the one-button takeoff and enjoy trying to beat their longest jump.

### Constraints

- **Platform**: Web browser on desktop and mobile — the same game should support keyboard and touch input.
- **Audience**: Children ages 4–7 — interaction must require almost no reading and use large, obvious controls.
- **Controls**: One-button timing only — no in-air pose or landing controls.
- **Persistence**: Device-local storage — records survive browser refreshes without an account.
- **Art**: Use the provided penguin sprite assets — reuse depends on the user's stated permission.
- **Audio**: No sound or music in v1 — keep the initial scope lean.

<!-- gsd-project-end -->

<!-- gsd-stack-start source:research/STACK.md -->

## Technology Stack

## Recommendation

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Phaser | `4.2.1` | Rendering, sprites, animation, camera, keyboard/touch input, and lightweight physics | Current stable release. Its unified pointer API handles mouse and touch, `FIT` scaling preserves a fixed game world across screen sizes, and built-in Arcade Physics is explicitly intended for simple retro-style games. |
| TypeScript | `7.0.2` | Game code and typed state | Current stable release. Types make scene state, jump calculations, and record serialization safer without adding runtime code. |
| Vite | `8.1.5` | Local development and production bundling | Current stable release. It supports a plain TypeScript app with fast startup and no framework layer. |
| Browser Web Storage | `localStorage` | Best distance and airtime records | Native, persistent across normal browser sessions, and sufficient for two small values. No database or storage package is justified. |

### Phaser Systems to Use

| System | Version | Purpose | When to Use |
|--------|---------|---------|-------------|
| Arcade Physics | Built into Phaser `4.2.1` | Gravity, acceleration, velocity, simple landing collision | Use for the penguin's ramp, flight, landing, and slide. Keep bodies rectangular or circular. |
| Input Plugin | Built into Phaser `4.2.1` | Keyboard and pointer events | Map `Space`/`Enter` and one scene-level `pointerdown` event to the same takeoff action. Phaser normalizes mouse and touch pointers. |
| Scale Manager | Built into Phaser `4.2.1` | Responsive canvas sizing | Use a fixed logical resolution with `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH`. Let CSS size the parent to the viewport. |
| Camera | Built into Phaser `4.2.1` | Side-scrolling presentation | Follow or lerp toward the penguin inside one game scene. No camera plugin is needed. |
| `Phaser.AUTO` renderer | Built into Phaser `4.2.1` | WebGL rendering with Canvas fallback | Use as the renderer setting for broad desktop and mobile browser coverage. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Node.js | `24.18.0` LTS | Development runtime | Current LTS and compatible with Vite 8. Pin the major line in `.nvmrc` or `engines`. |
| Vitest | `4.1.10` | Unit tests for deterministic rules | Add tests for takeoff timing, distance/airtime calculation, state transitions, and record serialization. Do not test Phaser rendering internals. |
| npm | Bundled with Node 24 | Dependency management | Commit `package-lock.json`; avoid adding another package manager for this project. |

## Installation

# Runtime dependency

# Development dependencies

## Recommended Configuration

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Phaser 4 | PixiJS 8 | Choose PixiJS only if the team wants to write input orchestration, scene flow, collisions, physics, and camera behavior itself. It is primarily a renderer, so it creates more work here. |
| Phaser 4 | Vanilla Canvas 2D | Choose raw Canvas only for a tiny prototype with no asset pipeline, camera, collision system, or mobile scaling requirements. The production game already needs those systems. |
| Arcade Physics | Matter Physics | Choose Matter only if playtesting proves that rotating rigid bodies, polygon collisions, constraints, or physically simulated ramp contact are central to the game. |
| TypeScript | JavaScript | Choose JavaScript only for a disposable prototype. The small setup cost of TypeScript is worthwhile for physics state and record schemas. |
| `localStorage` | IndexedDB | Choose IndexedDB only if future scope adds substantial structured data, replays, or many profiles. |
| Plain Phaser scenes | React UI around Phaser | Choose React only if the product grows into a content-heavy shell with account flows, complex menus, or server-backed screens. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React, Vue, or Svelte | The v1 interface is one canvas and an instant retry loop. A component framework adds a second lifecycle and state boundary without solving a requirement. | Phaser scenes and a small amount of HTML/CSS |
| Matter.js / Phaser Matter Physics | Full rigid-body simulation is heavier and harder to tune deterministically. The game needs a predictable jump arc and simple landing, not realistic body dynamics. | Phaser Arcade Physics plus explicit game rules |
| Separate input libraries | Phaser already unifies mouse, touch, keyboard, and pointer hit testing. Multiple input layers risk duplicate events. | Phaser Input Plugin |
| A state-management package | The state machine is small: ready, sliding, airborne, landed, results. A library obscures this simple flow. | A typed enum/union and scene-owned state |
| A database, backend, or cloud SDK | Device-local records are an explicit constraint. A backend adds privacy, deployment, and account concerns. | `localStorage` |
| PWA/service-worker tooling in v1 | Offline installation is not required and cache invalidation adds release risk. | Normal static hosting with browser caching |
| DOM-based sprite animation | Moving many positioned elements causes unnecessary layout work and complicates camera movement. | Phaser canvas rendering |
| Hand-written `requestAnimationFrame` loop | Phaser already owns its timestep and render loop. A second loop causes timing and synchronization bugs. | Phaser scene `update` and Arcade Physics |
| Phaser Launcher as a project dependency | It is optional authoring software, not required to build or run the game. | Vite scripts in the repository |

## Stack Patterns by Variant

- Use one Phaser game instance and a small scene set such as `Boot`, `Play`, and `Results`.
- Keep jump scoring, record comparison, and state transitions in pure TypeScript functions.
- Keep visual objects and Phaser APIs inside scenes.
- Use a fixed logical world and scale the canvas, never physics constants, to fit screens.
- First retain Arcade Physics and model the ramp phase explicitly with position and velocity along a curve.
- Move to Matter Physics only if the visible result cannot be achieved predictably with that simpler model.
- Keep `localStorage` while data remains a tiny JSON object.
- Reconsider IndexedDB only for replays, large histories, or multiple local profiles.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vite@8.1.5` | Node `^20.19.0` or `>=22.12.0` | Node `24.18.0` LTS satisfies the requirement. |
| `vitest@4.1.10` | Vite `^6`, `^7`, or `^8`; Node `^20`, `^22`, or `>=24` | Compatible with the recommended Vite and Node versions. |
| `typescript@7.0.2` | Node `>=16.20.0` | Compatible with Node 24. |
| `phaser@4.2.1` | Modern browsers; no npm peer dependency | Use `Phaser.AUTO` so WebGL can fall back to Canvas. Test current Safari iOS, Chrome Android, Chrome/Edge desktop, and Firefox desktop before release. |

## Confidence Assessment

| Decision | Confidence | Basis |
|----------|------------|-------|
| Phaser `4.2.1` as the game framework | MEDIUM | Version cross-checked against npm and Phaser's official release archive; capabilities checked in official Phaser docs. |
| Vite `8.1.5`, TypeScript `7.0.2`, Vitest `4.1.10` | MEDIUM | Versions cross-checked against npm and official project pages; compatibility checked against package metadata and official docs. |
| Arcade Physics and built-in input/scaling | MEDIUM | Official Phaser documentation directly describes these use cases. Final game feel still requires device playtesting. |
| `localStorage` for records | MEDIUM | MDN confirms persistence semantics. Restricted/private contexts and storage failures still require graceful handling. |

## Sources

- [Phaser 4.2.1 release](https://www.phaser.io/download/release/v4.2.1) — release date, npm version, and distribution
- [Phaser Input](https://docs.phaser.io/phaser/concepts/input) — unified mouse, touch, pointer, and keyboard input
- [Phaser Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade) — lightweight physics scope and limitations
- [Phaser Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager) — `FIT` and `CENTER_BOTH`
- [Phaser first game guide](https://docs.phaser.io/phaser/getting-started/making-your-first-phaser-game) — `Phaser.AUTO` and Arcade Physics for mobile
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) — Node requirements
- [Vite 8.1 announcement](https://vite.dev/blog/announcing-vite8-1) — current release line
- [TypeScript download](https://www.typescriptlang.org/download/) — current TypeScript line
- [Vitest getting started](https://vitest.dev/guide/) — Vite and Node compatibility
- [Vitest 4.1 announcement](https://vitest.dev/blog/vitest-4-1) — Vite 8 support
- [Node.js releases](https://nodejs.org/en/about/previous-releases/) — Node 24 LTS status
- [MDN `localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — persistence and browser behavior
- npm registry package metadata for exact package versions and engine/peer ranges

<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- gsd-architecture-end -->

<!-- gsd-skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.cursor/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- gsd-skills-end -->

<!-- gsd-workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->

<!-- gsd-profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- gsd-profile-end -->
