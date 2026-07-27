# Feature Research

**Domain:** One-button browser distance game for children ages 4-7
**Researched:** 2026-07-27
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features required to make the jump understandable and worth repeating.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Automatic downhill run | Removes setup and makes the player's single job obvious | MEDIUM | Begin each attempt without a start menu. Keep acceleration and camera motion consistent. |
| One input across devices | Children should be able to tap anywhere or press one obvious key | LOW | Accept a screen tap, click, Space, and a broad set of safe keyboard keys. Ignore repeat input after takeoff. |
| Visual first-attempt prompt | Many children in this age range cannot read instructions | LOW | Show a pulsing hand/tap or key symbol near the ramp edge. Demonstrate the action through animation, not a paragraph. |
| Clear switch from watching to acting | The child must know when their input matters | MEDIUM | Use the approaching ramp edge, a high-contrast takeoff zone, penguin anticipation pose, and camera framing. Audio is excluded, so visuals must carry the cue. |
| Immediate input acknowledgement | A tap that appears ignored makes the game feel broken | LOW | Change the penguin pose and launch motion in the same rendered response to the input. |
| Legible timing consequence | Replay only teaches skill if early, well-timed, and late presses produce understandable outcomes | HIGH | Position at takeoff should deterministically influence launch speed or angle. Keep the effect noticeable without making imperfect jumps feel like failures. |
| Readable flight | Watching distance accumulate is the payoff | MEDIUM | Keep the penguin large enough to track, use stable side-scrolling, and provide ground markers that communicate movement. |
| Complete landing and slide | The attempt needs a physical ending before numbers appear | MEDIUM | Show contact, a forgiving landing animation, and slide to rest. Avoid crash imagery or a binary win/fail state. |
| Simple result | The child and nearby adult need a clear answer to "how far?" | LOW | Make distance the largest number, pair it with a ruler/flag icon, and show airtime second. Do not require reading labels to identify the main result. |
| Device-local best | A personal target creates replay value without accounts or social comparison | LOW | Save best distance and airtime locally. Clearly distinguish "this jump" from "best" with icons, placement, and more than color alone. |
| Immediate large retry action | The loop depends on another attempt requiring no navigation | LOW | Present one dominant replay button after the slide stops. Support tap and the same keyboard input. Target at least 48 CSS px, preferably larger for young children. |
| Responsive, forgiving input | Developing motor skills and device differences should not cause accidental failure | MEDIUM | Use a generous valid takeoff window, large targets, no double-tap, no multi-touch gesture, and no precision pointer requirement. |
| Predictable attempt conditions | Children need to connect timing to outcome | LOW | Keep ramp, wind, speed rules, and physics stable in v1. Variation should come from the player's takeoff timing. |

### Differentiators (Competitive Advantage)

Useful additions that deepen the same one-button loop instead of adding systems around it.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Takeoff-zone feedback | Makes improvement visible without a timing meter or written coaching | MEDIUM | Briefly mark where takeoff occurred relative to the ramp lip. Use spatial feedback such as early, center, and late bands, plus penguin expression or pose. |
| Best-distance flag in the world | Turns an abstract record into a concrete target the child can see approaching | LOW | Place a bright flag at the saved best landing distance. Update it only after the attempt ends. |
| Personal-best celebration | Makes genuine improvement feel special without coins, streaks, or reward pressure | LOW | Use a short visual burst, larger best icon, and happy penguin animation. Keep it brief so retry remains immediate. |
| Near-best feedback | Encourages one more attempt when the child nearly reaches their record | LOW | Show the old best flag nearby during the final slide. Avoid discouraging text such as "you lost." |
| One-screen visual practice hint | Helps a stuck child discover better timing without a tutorial flow | MEDIUM | After several very early or late takeoffs, replay a short ghosted example at the ramp edge. Never pause the game to force instruction. |
| Shared spectator readability | Lets a parent or sibling understand and celebrate the attempt from a distance | LOW | Use large distance digits, visible best flag, clear penguin reactions, and a short result sequence. No profile or multiplayer system is needed. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-air or landing controls | Adds apparent skill depth | Breaks the one-button promise and raises coordination demands for ages 4-7 | Let takeoff timing determine a complete, watchable flight and forgiving landing |
| Separate timing meter | Makes the optimal moment explicit | Diverts attention from the penguin and contradicts the declared position-at-ramp-edge mechanic | Highlight the physical takeoff zone and show where the press occurred afterward |
| Harsh crashes, lives, or game-over screens | Creates dramatic failure and stakes | Can turn experimentation into frustration and slows retry | Use safe comic landings, descriptive feedback, and immediate replay |
| Random wind or changing physics | Adds variety | Obscures cause and effect, so children cannot learn from repetition | Keep conditions deterministic and derive variation from timing |
| Levels and multiple ramps | Extends content | Expands art, tuning, navigation, and progression before the core loop is validated | Polish one ramp with a visible personal-best target |
| Coins, unlocks, streaks, and cosmetics | Supplies extrinsic retention hooks | Distracts from mastery, adds economy design, and is explicitly excluded from v1 | Celebrate personal improvement with animation and an in-world best flag |
| Online leaderboards | Adds competition | Requires identity, moderation, networking, privacy work, and social comparison | Store private best distance and airtime on the current device |
| Accounts and cloud saves | Preserves progress across devices | Adds setup, data collection, and child privacy obligations | Use anonymous device-local records |
| Ads and purchases | Monetizes play | Interrupts the loop, creates accidental-tap and parental-consent risks, and is explicitly excluded | Keep v1 self-contained and commercial-free |
| Audio instructions, music, or sound rewards | Common way to cue non-readers | Audio is explicitly excluded from v1 and may be unavailable or muted | Use motion, contrast, pose changes, icons, and spatial cues |
| Dense tutorial or text coaching | Explains every rule | Pre-readers skip it and it delays the first attempt | Demonstrate one tap visually during the automatic run |
| Daily rewards, timers, or forced streaks | Drives repeat visits | Creates pressure and manipulative retention unrelated to the core value | Make each short session satisfying through fast retries and personal bests |
| Sharing and external links in child-facing UI | Lets families publish results | Adds navigation, privacy, and parental-gate requirements | Keep results on-device; any future parent material belongs behind an adult gate |

## Feature Dependencies

```text
Automatic downhill run
    └──requires──> Deterministic ramp physics
                       └──enables──> Position-timed takeoff
                                          └──requires──> Unified tap/keyboard input

Visual first-attempt prompt ──enhances──> Position-timed takeoff
Immediate input acknowledgement ──makes-readable──> Timing consequence
Timing consequence ──drives──> Readable flight ──requires──> Landing and slide
Landing and slide ──precedes──> Result display ──precedes──> Immediate retry

Result display ──provides-data-to──> Device-local best
Device-local best ──enables──> Best-distance flag
Device-local best ──enables──> Personal-best and near-best feedback

One-button control ──conflicts──> In-air controls
Deterministic learning loop ──conflicts──> Random wind or changing physics
Child-safe local play ──conflicts──> Accounts, online leaderboards, ads, and purchases
Audio-free v1 ──requires──> Visual-only instructions and feedback
```

### Dependency Notes

- **Position-timed takeoff requires deterministic ramp physics and unified input:** the same visible press point must produce comparable outcomes on touch and keyboard.
- **Immediate acknowledgement makes timing consequences readable:** pose and motion changes connect the child's action to the jump before the eventual distance result.
- **Landing and slide precede results:** delaying the overlay preserves the physical cause-and-effect sequence declared in the project.
- **Local best enables the strongest low-cost differentiators:** the in-world flag, best celebration, and near-best feedback all use the same stored value.
- **Audio-free v1 raises the importance of visual redundancy:** motion, shape, placement, and iconography must communicate state without sound or color alone.
- **One-button control conflicts with common ski-jump genre controls:** balance, posture, and landing inputs should not enter v1.

## MVP Definition

### Launch With (v1)

- [ ] Automatic, deterministic downhill run on one ramp
- [ ] One takeoff input through tap, click, or keyboard
- [ ] Visual first-attempt cue and highlighted physical takeoff zone
- [ ] Immediate launch acknowledgement and visibly different timing outcomes
- [ ] Readable side-scrolling flight, forgiving landing, and slide to rest
- [ ] Clear distance and airtime result with minimal text
- [ ] Device-local best distance and airtime
- [ ] One large instant-retry action
- [ ] Responsive layout and child-sized interaction targets
- [ ] In-world best-distance flag, if it can reuse the stored record without delaying the core loop

### Add After Validation (v1.x)

- [ ] Takeoff-zone result marker, if playtests show children cannot connect press timing to distance
- [ ] Near-best feedback, if children understand the best flag but need a clearer reason to retry
- [ ] Adaptive visual practice hint, if repeated early or late presses persist after the first-attempt cue
- [ ] Expanded accessibility options for reduced motion or contrast, based on observed needs

### Future Consideration (v2+)

- [ ] Parent-facing explanation behind an adult gate, only if adults need help understanding local records or controls
- [ ] Additional local challenge variants, only after the single-ramp timing loop validates and without adding in-air controls
- [ ] Optional audio, only if the explicit scope decision changes and visual-only play remains fully supported

Accounts, ads, purchases, levels, online leaderboards, and unlockable cosmetics remain excluded rather than deferred roadmap items.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Automatic run and deterministic physics | HIGH | MEDIUM | P1 |
| Unified one-button input | HIGH | LOW | P1 |
| Visual prompt and takeoff-zone cue | HIGH | LOW | P1 |
| Immediate input acknowledgement | HIGH | LOW | P1 |
| Timing-dependent flight | HIGH | HIGH | P1 |
| Landing and slide sequence | HIGH | MEDIUM | P1 |
| Distance and airtime result | HIGH | LOW | P1 |
| Local personal best | HIGH | LOW | P1 |
| Instant retry | HIGH | LOW | P1 |
| Responsive child-sized controls | HIGH | MEDIUM | P1 |
| In-world best-distance flag | HIGH | LOW | P1 |
| Takeoff-zone result marker | MEDIUM | MEDIUM | P2 |
| Near-best feedback | MEDIUM | LOW | P2 |
| Adaptive practice hint | MEDIUM | MEDIUM | P2 |
| Parent-facing explanation | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have after observed need
- P3: Future consideration

## Competitor Feature Analysis

| Feature | Typical one-button distance game | Typical ski-jump game | Fly Pingu Fly approach |
|---------|----------------------------------|-----------------------|-------------------------|
| Core input | One timed press, often repeated across retries | Takeoff plus balance and landing controls | Exactly one takeoff press; flight and landing are watched |
| Skill feedback | Score changes, sometimes with vague cause | Timing, posture, wind, distance, and style all affect score | Show the physical takeoff point and keep all other conditions stable |
| Result | Single score or distance | Distance plus style points, medals, or rank | Distance first, airtime second, both paired with icons |
| Replay hook | High score and immediate restart | Career, hills, upgrades, records, and tournaments | Local personal best, visible best flag, and immediate retry |
| Failure | Crash, game over, or lost life | Failed landing or low judge score | Forgiving landing and non-punitive personal comparison |
| Progression | Currency, unlocks, daily rewards | Multiple hills, equipment, and leagues | No progression system in v1; mastery comes from takeoff timing |

## Sources

- [Google for Developers, Designing engaging apps](https://developers.google.com/building-for-kids/designing-engaging-apps) (official guidance; accessed 2026-07-27)
- [Nielsen Norman Group, Design for Kids Based on Their Stage of Physical Development](https://www.nngroup.com/articles/children-ux-physical-development/) (user-research guidance; accessed 2026-07-27)
- [Nielsen Norman Group, Designing for Kids: Cognitive Considerations](https://www.nngroup.com/articles/kids-cognition/) (user-research guidance; accessed 2026-07-27)
- [Nielsen Norman Group, Children's UX: Usability Issues in Designing for Young People](https://www.nngroup.com/articles/childrens-websites-usability-issues/) (user-research synthesis; accessed 2026-07-27)
- [web.dev, Accessible tap targets](https://web.dev/articles/accessible-tap-targets) (official web platform guidance; accessed 2026-07-27)
- [Apple Developer, Design safe and age-appropriate experiences](https://developer.apple.com/kids/) (official child-safety guidance; accessed 2026-07-27)
- [Apple App Review Guidelines, Kids Category](https://developer.apple.com/app-store/review/guidelines/) (official platform policy; accessed 2026-07-27)
- [US Federal Trade Commission, Complying with COPPA: Frequently Asked Questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) (official regulatory guidance; accessed 2026-07-27)
- [Muis et al., The effects of technology-mediated immediate feedback on kindergarten students](https://ranellucci.wordpress.com/wp-content/uploads/2016/02/muis_2015.pdf) (peer-reviewed research; 2015)
- Comparable browser ski-jump listings were reviewed only for recurring genre patterns. Their marketing claims were not treated as authoritative evidence.

---
*Feature research for: Fly Pingu Fly*
*Researched: 2026-07-27*
