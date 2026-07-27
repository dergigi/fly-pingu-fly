# Phase 1: Playable Jump - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 01-playable-jump
**Areas discussed:** Takeoff timing, asset organization

---

## Takeoff Window

| Option | Description | Selected |
|--------|-------------|----------|
| Broad sweet zone | Easy to get a satisfying jump, with timing affecting distance | ✓ |
| Medium zone | Clear difference between poor and great timing | |
| Tight zone | Precise timing matters strongly | |
| Claude decides | Tune during playtesting | |

**User's choice:** Broad sweet zone.
**Notes:** The game should remain approachable for children ages 4–7.

---

## Early Input

| Option | Description | Selected |
|--------|-------------|----------|
| Weak early takeoff | Accept the press and show an immediate weaker jump | ✓ |
| Buffered press | Store the press and launch at the valid zone | |
| Ignore input | Allow another press closer to the edge | |
| Claude decides | Tune during playtesting | |

**User's choice:** Accept an early press as a weaker takeoff.
**Notes:** Every accepted input should have an immediate visible effect.

---

## No Input

| Option | Description | Selected |
|--------|-------------|----------|
| Small natural hop | Leave the edge with a short safe flight | ✓ |
| Drop from edge | Fall directly toward the landing slope | |
| Weak auto-takeoff | Perform a more obvious automatic jump | |
| Claude decides | Tune during playtesting | |

**User's choice:** A small natural hop followed by a short safe flight.
**Notes:** No-input attempts should still complete safely.

---

## Timing Curve

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth lip peak | Early and late presses both produce shorter jumps | ✓ |
| Later is better | Quality rises until a final cutoff | |
| Wide plateau | Most valid presses produce nearly identical jumps | |
| Claude decides | Tune during playtesting | |

**User's choice:** A smooth peak at the ramp lip.
**Notes:** Timing should change the result continuously rather than produce binary success or failure.

---

## Asset Organization

| Option | Description | Selected |
|--------|-------------|----------|
| `public/assets/sprites/` | Dedicated folder for user-provided game sprites | ✓ |

**User's choice:** Create a folder where game assets can be dropped.
**Notes:** The folder was created and opened in Finder.

---

## Claude's Discretion

- Exact physics values, timing-window width, camera easing, and animation details.

## Deferred Ideas

None.
