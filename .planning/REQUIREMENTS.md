# Requirements: Fly Pingu Fly

**Defined:** 2026-07-27
**Core Value:** A young child can immediately understand the one-button takeoff and enjoy trying to beat their longest jump.

## v1 Requirements

### Jump

- [x] **JUMP-01**: The penguin automatically accelerates down the same ski ramp at the start of every attempt.
- [x] **JUMP-02**: The penguin's takeoff position determines launch quality through a forgiving, continuous timing curve.
- [x] **JUMP-03**: A missed takeoff input produces a safe weak jump rather than a crash or blocked attempt.
- [x] **JUMP-04**: The penguin follows a deterministic flight path independent of display size and refresh rate.
- [x] **JUMP-05**: The penguin lands safely, slides to a stop, and completes the attempt without another player input.

### Input

- [x] **INPT-01**: The player can trigger the single takeoff action with a screen tap, mouse click, or keyboard press.
- [x] **INPT-02**: The game consumes at most one takeoff action per attempt and ignores repeats or additional touches.
- [x] **INPT-03**: The game immediately acknowledges an accepted takeoff input through the penguin's pose and motion.
- [ ] **INPT-04**: The first attempt visually demonstrates when and how to press without requiring the player to read.

### Presentation

- [x] **PRES-01**: The game displays a bright snowy side-scrolling scene with a visible ramp edge and takeoff zone.
- [x] **PRES-02**: The camera keeps the penguin, upcoming ramp edge, flight, and landing area readable during their relevant phases.
- [ ] **PRES-03**: The penguin uses the provided sprite art with stable animation alignment and a consistent ground-contact point.
- [ ] **PRES-04**: The game communicates all instructions, outcomes, and records visually without relying on audio or color alone.

### Results

- [ ] **RSLT-01**: After the landing slide ends, the result clearly shows the current jump distance as the primary value and airtime as the secondary value.
- [ ] **RSLT-02**: The game saves the best distance and best airtime on the current device without requiring an account.
- [ ] **RSLT-03**: Invalid or unavailable browser storage does not prevent the player from completing jumps or viewing in-session records.
- [ ] **RSLT-04**: The saved best distance appears as a visible flag in the game world.
- [ ] **RSLT-05**: A new personal best receives a brief visual celebration.
- [ ] **RSLT-06**: After results appear, the player can start another attempt with one large retry control or the same keyboard action.

### Browser

- [ ] **BRWS-01**: The game fits desktop and mobile browser viewports while preserving one fixed logical game world.
- [ ] **BRWS-02**: Gameplay remains consistent after resize, orientation change, tab suspension, and resume.
- [ ] **BRWS-03**: Touch play prevents browser gestures on the game surface without blocking the game input.
- [ ] **BRWS-04**: Interactive targets are large enough for children ages 4–7 and require almost no reading.

## v2 Requirements

### Guidance

- **GUID-01**: The game can show where an early, ideal, or late takeoff occurred if observation shows timing is unclear.
- **GUID-02**: The game can provide a short visual practice hint after repeated mistimed attempts.
- **GUID-03**: The game can show near-best feedback when a jump almost reaches the saved record.

### Accessibility

- **ACCS-01**: The player can reduce non-essential motion if target-audience testing shows a need.
- **ACCS-02**: The player can select an alternate high-contrast presentation if testing shows a need.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Accounts and cloud saves | Local play should require no setup or personal data |
| Online leaderboards | Adds identity, privacy, moderation, and networking work |
| Advertising and purchases | Conflicts with the simple child-friendly experience |
| Levels and multiple ramps | One polished ramp is sufficient to validate the core loop |
| Unlockable cosmetics and reward economies | Distracts from timing mastery |
| In-air or landing controls | Breaks the one-button promise |
| Random wind or changing physics | Makes cause and effect harder for young children to learn |
| Timing meter | The physical ramp edge is the timing cue |
| Harsh crashes, lives, or game-over screens | Adds frustration and delays retry |
| Audio | Explicitly excluded from v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| JUMP-01 | Phase 1 | Complete |
| JUMP-02 | Phase 1 | Complete |
| JUMP-03 | Phase 1 | Complete |
| JUMP-04 | Phase 1 | Complete |
| JUMP-05 | Phase 1 | Complete |
| INPT-01 | Phase 1 | Complete |
| INPT-02 | Phase 1 | Complete |
| INPT-03 | Phase 1 | Complete |
| INPT-04 | Phase 2 | Pending |
| PRES-01 | Phase 1 | Complete |
| PRES-02 | Phase 1 | Complete |
| PRES-03 | Phase 1 | Pending |
| PRES-04 | Phase 2 | Pending |
| RSLT-01 | Phase 3 | Pending |
| RSLT-02 | Phase 3 | Pending |
| RSLT-03 | Phase 3 | Pending |
| RSLT-04 | Phase 3 | Pending |
| RSLT-05 | Phase 3 | Pending |
| RSLT-06 | Phase 3 | Pending |
| BRWS-01 | Phase 2 | Pending |
| BRWS-02 | Phase 2 | Pending |
| BRWS-03 | Phase 2 | Pending |
| BRWS-04 | Phase 2 | Pending |

**Coverage:**

- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-07-27*
*Last updated: 2026-07-27 after roadmap creation*
