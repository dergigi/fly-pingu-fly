# Phase 1: Playable Jump - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers one complete playable jump: the penguin automatically descends a snowy ramp, accepts one takeoff action, follows a deterministic flight, lands safely, and slides to rest. Results, records, retry UI, cross-device polish, and first-attempt guidance remain in later phases.

</domain>

<decisions>
## Implementation Decisions

### Takeoff Timing
- **D-01:** Use a broad sweet zone around the ramp lip so young children regularly produce satisfying jumps while timing still affects distance.
- **D-02:** A press well before the sweet zone is accepted immediately as an early, weaker takeoff. Do not buffer or ignore the input.
- **D-03:** If the player never presses, the penguin makes a small natural hop from the ramp edge and completes a short safe flight.
- **D-04:** Launch quality follows a smooth curve that peaks at the ramp lip. Both early and late presses produce progressively shorter jumps rather than binary success or failure.

### Asset Organization
- **D-05:** User-provided sprite files belong in `public/assets/sprites/`, where they can be loaded directly by the browser game.

### Claude's Discretion
- Exact timing-window width, curve coefficients, launch speed, launch angle, gravity, and slide friction should be tuned during implementation while preserving D-01 through D-04.
- Flight feel, camera easing, sprite-state selection, and landing animation details may use the simplest approach that satisfies the roadmap success criteria.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` — Defines the one-button child-friendly game, platform, art source, and v1 boundaries.
- `.planning/REQUIREMENTS.md` — Defines Phase 1 jump, input, and presentation requirements.
- `.planning/ROADMAP.md` — Defines the Phase 1 goal, requirement mapping, and observable success criteria.
- `.planning/research/SUMMARY.md` — Defines the recommended stack, deterministic simulation approach, child-facing design guidance, and known risks.

No external specifications or ADRs apply to this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/assets/sprites/`: Drop-in location for the user's penguin and environment sprite files.

### Established Patterns
- No application code exists yet. Phase 1 establishes the project structure and initial game patterns.

### Integration Points
- The game scaffold should load source art from `public/assets/sprites/`.
- The deterministic jump core should remain independent of rendering and viewport dimensions so later browser and UI phases can build on it.

</code_context>

<specifics>
## Specific Ideas

- The takeoff should feel forgiving rather than precise or punitive.
- Every takeoff outcome should remain visibly safe and complete, including very early input and no input.
- The ideal press is physically tied to the ramp lip, not a separate timing meter.
- The provided sprites come from https://www.spriters-resource.com/mobile/wheresmyegg/asset/213843/ and are used with the user's stated reuse permission.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 01-playable-jump*
*Context gathered: 2026-07-27*
