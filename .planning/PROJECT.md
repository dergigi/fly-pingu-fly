# Fly Pingu Fly

## What This Is

Fly Pingu Fly is a simple old-school 2D side-scrolling ski-jump game for children ages 4–7. A penguin automatically slides down a large snowy ramp, and the player presses once at the ramp edge to launch it into the air before watching it fly, land, and slide to a stop.

## Core Value

A young child can immediately understand the one-button takeoff and enjoy trying to beat their longest jump.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] The penguin automatically accelerates down a large ski ramp.
- [ ] The player can trigger takeoff with one keyboard press or screen tap.
- [ ] Takeoff timing and speed determine the resulting flight.
- [ ] The camera presents the jump as a readable 2D side-scrolling sequence.
- [ ] The penguin lands, slides to a stop, and receives a clear result.
- [ ] Each result reports jump distance and airtime.
- [ ] The game keeps the best distance and airtime on the current device.
- [ ] The player can retry immediately without navigating menus.
- [ ] The presentation uses large controls, minimal text, and a bright snowy setting.

### Out of Scope

- Accounts and cloud saves — local play should require no setup.
- Online leaderboards — v1 records belong only to the current device.
- Advertising and purchases — unsuitable for the intended simple child-friendly experience.
- Levels and multiple ramps — v1 focuses on making one jump loop satisfying.
- Unlockable cosmetics and reward systems — unnecessary for validating the core jump.
- Audio — explicitly excluded from v1.

## Context

- The game is inspired by old-school 2D side-scrolling ski-jump games.
- The intended loop is a series of quick jumps with instant retries.
- Takeoff is judged by the penguin's position at the ramp edge rather than a separate timing meter.
- After flight, the penguin lands and visibly slides to a stop before results appear.
- Penguin sprites are available from the linked *Where's My Egg?* sprite resource, and the user states they have permission to reuse them.
- Sprite source: https://www.spriters-resource.com/mobile/wheresmyegg/asset/213843/

## Constraints

- **Platform**: Web browser on desktop and mobile — the same game should support keyboard and touch input.
- **Audience**: Children ages 4–7 — interaction must require almost no reading and use large, obvious controls.
- **Controls**: One-button timing only — no in-air pose or landing controls.
- **Persistence**: Device-local storage — records survive browser refreshes without an account.
- **Art**: Use the provided penguin sprite assets — reuse depends on the user's stated permission.
- **Audio**: No sound or music in v1 — keep the initial scope lean.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build for the web first | Makes the game easy to play on desktop and mobile | — Pending |
| Use one position-timed input | Keeps the game understandable for young children while retaining skill | — Pending |
| Use one ramp with instant retries | Concentrates effort on a satisfying core loop | — Pending |
| Store records locally | Avoids accounts and backend complexity | — Pending |
| Show landing and slide before results | Makes each jump feel physical and complete | — Pending |
| Exclude audio from v1 | Keeps the first release focused | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-27 after initialization*
