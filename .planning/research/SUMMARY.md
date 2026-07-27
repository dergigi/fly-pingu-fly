# Project Research Summary

**Project:** Fly Pingu Fly
**Domain:** One-button 2D browser ski-jump game for children ages 4-7
**Researched:** 2026-07-27
**Confidence:** MEDIUM

## Executive Summary

Fly Pingu Fly should be built as a short, deterministic mastery loop: the penguin runs automatically, one forgiving press determines takeoff, and the player watches a readable flight, landing, slide, and result before retrying. For children ages 4-7, the essential design work is not feature breadth. It is making cause and effect obvious without text or audio through stable physics, a visible ramp lip, immediate input feedback, clear camera framing, large controls, and non-punitive outcomes.

Use Phaser 4 with plain TypeScript and Vite as the browser shell for rendering, assets, input, scaling, and camera support. Keep the scored jump as a pure TypeScript state machine advanced at a bounded fixed timestep. This resolves the main tension in the research: Phaser is useful infrastructure, but its scene state and general collision behavior should not become the authority for takeoff, airtime, landing distance, or records. Those rules need deterministic tests and world-space calculations. Store the two records in a guarded, versioned `localStorage` adapter and let play continue with in-memory values if storage fails.

The largest release risks are unfair timing, frame- or viewport-dependent outcomes, unreadable camera behavior, duplicate touch actions, weak visual communication, and uncertain sprite rights. Address rights before sprite-dependent work, prove the jump in a browser-free simulation before polishing it, then validate the complete loop on real devices and with children in the intended age range. One polished ramp with instant retry is the release. Levels, accounts, leaderboards, economies, audio, and in-air controls should remain out of scope.

## Key Findings

### Recommended Stack

The detailed recommendation is in [STACK.md](STACK.md). Keep dependencies lean and use Phaser where it removes browser and rendering work. Preserve a functional game core so refresh rate, scene presentation, and storage cannot alter results.

**Core technologies:**
- Phaser `4.2.1`: rendering, sprites, asset loading, unified pointer/keyboard input, scaling, and camera support.
- TypeScript `7.0.2`: typed phases, configuration, scoring, effects, and record schemas with no runtime layer.
- Vite `8.1.5`: a small plain-TypeScript development and production build.
- Vitest `4.1.10`: deterministic tests for phase transitions, timing curves, collisions, scoring, and persistence helpers.
- Node.js `24.18.0` LTS and npm: compatible build runtime with a committed lockfile.
- Browser `localStorage`: sufficient for best distance and airtime when wrapped in validation and failure handling.

Use one fixed logical world, `Phaser.Scale.FIT`, and `Phaser.AUTO`. Do not add React, a state library, a backend, a second input library, PWA tooling, or Matter Physics. Phaser Arcade Physics may support non-critical motion or remain unused, but explicit terrain queries and pure kinematics should own the scored jump unless playtesting proves they cannot produce the required feel.

### Expected Features

The feature analysis in [FEATURES.md](FEATURES.md) points to one complete, understandable loop rather than a broad game system.

**Must have (table stakes):**
- Automatic, repeatable downhill run on one ramp.
- One semantic action mapped to tap, click, and keyboard.
- Visual first-attempt cue, highlighted takeoff zone, and immediate acknowledgement.
- Continuous, legible timing consequences with a forgiving valid window.
- Readable side-scrolling flight followed by a safe landing and visible slide to rest.
- Distance-first result with airtime second, communicated with large numbers and icons.
- Device-local best distance and airtime.
- One large instant-retry action with a release gate.
- Responsive presentation with large targets and stable gameplay across devices.
- In-world best-distance flag, provided it reuses the record system without delaying the core loop.

**Should have after observed need:**
- Takeoff-position feedback showing early, central, or late timing spatially.
- Brief personal-best and near-best visual feedback.
- A short visual practice hint after repeated mistimed attempts.
- Reduced-motion or contrast options guided by testing.

**Defer or exclude:**
- Additional local challenges or parent-facing guidance belong in v2+ only after the single-ramp loop validates.
- Accounts, cloud saves, leaderboards, ads, purchases, levels, unlocks, streaks, and cosmetics are excluded.
- In-air controls, timing meters, random wind, harsh crashes, and dense tutorials conflict with the core design.
- Audio remains excluded from v1.

### Architecture Approach

Use Phaser as a thin platform and presentation layer around one browser-free `GameState`. A pure `stepGame(state, input, dt, config)` function owns ramp motion, takeoff, flight, first terrain contact, landing slide, scoring facts, and phase transitions. Phaser scenes adapt input, schedule fixed updates, render snapshots, move the camera, and execute explicit effects such as saving a record. This keeps the architecture in [ARCHITECTURE.md](ARCHITECTURE.md) testable while retaining the practical stack from [STACK.md](STACK.md).

**Major components:**
1. `GameState` and discriminated `GamePhase` — the complete valid state of one attempt.
2. `stepGame` and terrain queries — deterministic phase transitions, motion, and first-contact detection.
3. `gameConfig` — all ramp geometry, launch curve, gravity, friction, buffers, and thresholds.
4. Input adapter and latch — one pending command from primary pointer or accepted keyboard input.
5. Phaser scene loop — bounded fixed-step updates, rendering, assets, and lifecycle handling.
6. Camera derivation and renderer — phase-aware viewport and read-only presentation.
7. Scoring and records adapter — pure world-space results plus validated, failure-safe persistence.
8. Explicit effect handler — one-time side effects at transition boundaries without a general event bus.

Key patterns are a single discriminated phase union, fixed-step simulation with bounded catch-up, world coordinates independent of viewport pixels, one-shot input consumption, read-only rendering, and storage outside scoring. Resolve the no-press-at-ramp-end rule before implementing transitions.

### Critical Pitfalls

The full risk analysis is in [PITFALLS.md](PITFALLS.md).

1. **Frame- or viewport-dependent physics** — use seconds and world units, a bounded fixed timestep, visibility reset, and scripted equivalence tests across refresh rates and viewport sizes.
2. **Random-feeling takeoff** — latch and consume one action, buffer around a visible zone, derive quality continuously from position, align the contact pivot, and acknowledge acceptance immediately.
3. **Camera hides the decision or outcome** — use phase-aware framing, look-ahead, stable scale, eased transitions, and keep the lip and landing terrain visible before they matter.
4. **One press becomes zero or two actions** — centralize pointer and keyboard input, ignore repeats and non-primary pointers, handle cancellation, prevent play-surface gestures, and gate retry until release.
5. **Sprite rights or alignment block release** — preserve adequate rightsholder permission and provenance or replace the art; use a frame manifest and stable contact pivot before final tuning.
6. **Records break startup or results** — validate a versioned payload, bound values, catch every operation, and fall back to memory.
7. **Adult-readable feedback fails for children** — communicate with motion, shape, icons, scale, and large targets; treat no-explanation target-age observation as a release gate.

## Implications for Roadmap

Based on the combined research, use seven focused phases. Phase 0 is a release gate and can run alongside non-sprite simulation setup, but it must finish before final sprite integration.

### Phase 0: Asset Rights and Sprite Specification
**Rationale:** Art provenance is the only known issue that can block publication after the game appears finished.
**Delivers:** Written rights/provenance record or replacement-art decision, extracted frame manifest, normalized bounds, and a stable foot/contact pivot.
**Addresses:** Bright penguin presentation and reusable phase animations.
**Avoids:** Late legal blockage, frame wobble, atlas bleeding, and physics retuning after art replacement.

### Phase 1: Deterministic Jump Core
**Rationale:** Every input, camera, result, and record feature depends on a stable definition of the jump.
**Delivers:** Typed phases and config, ramp and landing queries, automatic run, takeoff curve, flight, first contact, landing slide, scoring, and the explicit no-press rule, all tested without a browser.
**Addresses:** Automatic run, predictable conditions, timing-dependent flight, complete landing, distance, and airtime.
**Avoids:** Frame-coupled physics, viewport-dependent outcomes, accidental terrain exits, and scores derived from pixels or slide distance.

### Phase 2: One-Button Takeoff
**Rationale:** The core skill must be fair and equivalent across touch and keyboard before presentation tuning can be trusted.
**Delivers:** One input latch, pointer and keyboard mappings, repeat/multi-touch guards, release gating, a visible forgiving takeoff zone, and immediate accepted-input state.
**Addresses:** Unified one-button input, first-attempt cue, immediate acknowledgement, and legible timing consequence.
**Avoids:** Missed taps, duplicate actions, browser gestures, exact-frame difficulty, and input leakage into retry.

### Phase 3: Jump Presentation and Camera
**Rationale:** Once outcomes are stable, visual work can explain the action without changing gameplay.
**Delivers:** Phaser scene composition, sprite animation, terrain and background, phase-aware camera, readable flight, landing, slide, and temporary HUD.
**Addresses:** Clear switch from watching to acting, readable flight, safe physical ending, and spectator readability.
**Avoids:** Hidden ramp lip, late landing reveal, camera snaps, sprite pivot drift, and gameplay mutations in rendering.

### Phase 4: Responsive Browser Shell
**Rationale:** Desktop and mobile parity depends on separating the logical world from CSS size, device pixels, browser chrome, and orientation.
**Delivers:** Fixed logical resolution, fit/letterbox behavior, DPR-aware rendering, safe-area layout, orientation and resize handling, and tab-resume behavior.
**Addresses:** Responsive layout, large targets, stable cross-device input, and full-viewport play.
**Avoids:** Changed physics on resize, blurry sprites, clipped controls, transform accumulation, and unbounded catch-up.

### Phase 5: Results, Records, and Retry
**Rationale:** Persistence and replay should be added after score semantics and the complete physical sequence are stable.
**Delivers:** Post-slide result reveal, distance and airtime hierarchy, versioned guarded local records, in-memory fallback, best-distance flag, personal-best feedback, and instant retry.
**Addresses:** Simple result, device-local best, immediate retry, in-world record target, and brief celebration.
**Avoids:** Early result overlays, corrupt storage failures, color- or text-only feedback, unclear current-versus-best values, and held-input restarts.

### Phase 6: Tuning and Target-Age Validation
**Rationale:** Literature and adult testing cannot establish fair timing, readable pacing, or independent comprehension for ages 4-7.
**Delivers:** Tuned takeoff buffer and launch curve, camera lead and pacing, cross-browser/device verification, reduced-motion checks, and observed no-explanation play sessions with recorded behavioral findings.
**Addresses:** Forgiving input, understandable cause and effect, independent retry, and optional P2 feedback only where evidence supports it.
**Avoids:** Adult-biased validation, unexplained repeated tapping, unreadable results, excessive particles, and speculative feature additions.

### Phase Ordering Rationale

- Resolve release-blocking rights early while the simulation remains art-independent.
- Build and test the complete causal chain before adding browser and visual layers.
- Integrate input before camera tuning so the displayed action matches accepted simulation timing.
- Add responsive behavior after world and camera rules exist, without rebuilding gameplay from viewport dimensions.
- Add records after scoring is fixed, then validate the whole replay loop with the actual audience.
- Promote P2 coaching or near-best features only in response to observed problems.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 0:** Project-specific permission scope and grantor authority remain unverified; legal certainty cannot be inferred from general sprite-host terms.
- **Phase 2:** The input buffer, late boundary, and continuous launch-quality curve are game-specific and need prototype measurement.
- **Phase 3:** Camera dead zones, look-ahead, sprite-sheet layout, and anchor details require asset inspection and captured-run testing.
- **Phase 6:** Target-age observation protocol and accessibility choices need concrete validation criteria.

Phases with standard patterns where additional research is unlikely to help:
- **Phase 1:** Fixed-step state machines, terrain queries, and pure scoring have established implementation patterns; spend effort on tests and tuning.
- **Phase 4:** Phaser scaling, pointer behavior, DPR handling, and browser lifecycle behavior are documented; use a device matrix.
- **Phase 5:** Versioned `localStorage`, validation, failure fallback, and result-state gating are standard browser patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Versions and compatibility were checked against official docs and package metadata, but Phaser 4 is relatively current and game feel still needs device testing. |
| Features | MEDIUM | Child-UX guidance and genre patterns support the scope; direct observation of ages 4-7 is still required. |
| Architecture | MEDIUM | Fixed-step functional-core patterns are established, but the research differed on Phaser Arcade Physics versus explicit kinematics; this summary recommends explicit scored simulation inside a Phaser shell. |
| Pitfalls | MEDIUM | Browser risks are well documented and cross-supported; timing, camera, sprite rights, and child comprehension remain project-specific. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Sprite permission:** Verify the actual grant, authority, allowed modifications, distribution model, attribution, and commercial scope before publication.
- **No-press behavior:** Decide whether the ramp end triggers a weak automatic launch or another gentle outcome before coding phase transitions.
- **Game feel:** Tune takeoff buffer, launch curve, gravity, friction, camera lead, and result pacing with instrumented prototypes.
- **Asset geometry:** Inspect the supplied sheet before locking frame crops, logical resolution, collision anchor, and visual scale.
- **Target-age comprehension:** Observe children ages 4-7 without coaching; repeated tapping, requests for explanation, or failure to retry are defects.
- **Browser support:** Confirm current iOS Safari, Android Chrome, desktop Chrome/Edge, and Firefox behavior across refresh rates, orientation changes, high DPR, blocked storage, and tab resume.
- **Reduced motion and contrast:** Define the minimum v1 behavior during visual testing because audio cannot provide redundant feedback.

## Sources

### Primary
- [Phaser 4.2.1 release](https://www.phaser.io/download/release/v4.2.1) and [Phaser documentation](https://docs.phaser.io/) — framework version, input, scaling, rendering, camera, and Arcade Physics capabilities.
- [Vite documentation](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), [Vitest](https://vitest.dev/), and [Node.js releases](https://nodejs.org/en/about/previous-releases/) — tool versions and compatibility.
- [MDN game loop](https://developer.mozilla.org/en-US/docs/Games/Anatomy), [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas), and [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API) — browser timing, input, rendering, and persistence behavior.
- [Google guidance for engaging children's apps](https://developers.google.com/building-for-kids/designing-engaging-apps), [Apple child-safety guidance](https://developer.apple.com/kids/), and [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) — child-facing design and privacy constraints.

### Secondary
- [Nielsen Norman Group child UX research](https://www.nngroup.com/articles/childrens-websites-usability-issues/) — physical and cognitive considerations for young users.
- [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html) — fixed-step loop structure.
- Muis et al., technology-mediated immediate feedback for kindergarten students — value of immediate feedback.
- Preschool usability and child-interface studies listed in [PITFALLS.md](PITFALLS.md) — supporting evidence for large targets and visual feedback.

### Project-Specific, Unresolved
- [The Spriters Resource terms](https://www.spriters-resource.com/page/tou/) and the supplied [Where's My Egg? sprite resource](https://www.spriters-resource.com/mobile/wheresmyegg/asset/213843/) — source provenance and host restrictions only; they do not establish the project's reuse rights.

---
*Research completed: 2026-07-27*
*Ready for roadmap: yes*
