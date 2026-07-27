# Roadmap: Fly Pingu Fly

## Overview

Fly Pingu Fly reaches its MVP through three playable vertical slices: first the complete one-button jump, then a child-readable browser experience across desktop and mobile, and finally the results, records, and instant-retry loop that makes repeated jumps rewarding.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions

- [ ] **Phase 1: Playable Jump** - A child can complete a deterministic one-button ski jump from ramp to rest.
- [ ] **Phase 2: Child-Ready Browser Play** - The jump is understandable and reliable across desktop and mobile browsers.
- [ ] **Phase 3: Results and Replay Loop** - Every jump ends with clear results, local records, and an immediate retry.

## Phase Details

### Phase 1: Playable Jump

**Goal:** A child can complete a full ski jump from automatic ramp descent through landing and slide using one well-timed action.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** JUMP-01, JUMP-02, JUMP-03, JUMP-04, JUMP-05, INPT-01, INPT-02, INPT-03, PRES-01, PRES-02, PRES-03
**Success Criteria** (what must be TRUE):

  1. The penguin automatically accelerates down the same bright snowy ramp, with the ramp edge and takeoff zone visible before the decision point.
  2. A tap, click, or keyboard press is accepted once, immediately changes the penguin's pose and motion, and produces a forgiving timing-dependent launch; no press still produces a safe weak jump.
  3. The same accepted takeoff produces the same flight regardless of display size or refresh rate, while the camera keeps the relevant ramp, flight, and landing area readable.
  4. The provided penguin sprite stays visually aligned with the terrain through descent, takeoff, flight, safe landing, and the final slide to rest.

**Plans:** 3 plans
Plans:
**Wave 1**

- [ ] 01-01-PLAN.md — Establish the audited browser-game walking skeleton and production tracer.

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — Complete deterministic takeoff, landing, and one-shot input rules.

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03-PLAN.md — Integrate approved character art and finish readable snow presentation.

**UI hint:** yes

### Phase 2: Child-Ready Browser Play

**Goal:** A young child can understand and play the jump without reading, on either a desktop or mobile browser.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** INPT-04, PRES-04, BRWS-01, BRWS-02, BRWS-03, BRWS-04
**Success Criteria** (what must be TRUE):

  1. The first attempt visually shows when and how to press, without instructions that the player must read.
  2. The complete game fits desktop and mobile viewports while preserving one fixed logical world and consistent jump outcomes.
  3. Resize, orientation changes, tab suspension, and resume do not corrupt or materially change the active attempt.
  4. Touching the game surface triggers the game without unwanted browser gestures, and every interactive target is large enough for a young child.
  5. Instructions and gameplay states remain understandable through motion, shape, icons, and layout without relying on audio or color alone.

**Plans:** TBD
**UI hint:** yes

### Phase 3: Results and Replay Loop

**Goal:** A child can see how far each jump went, recognize a personal best, and immediately try again.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** RSLT-01, RSLT-02, RSLT-03, RSLT-04, RSLT-05, RSLT-06
**Success Criteria** (what must be TRUE):

  1. After the penguin finishes sliding, the result presents jump distance as the main value and airtime as the secondary value.
  2. Best distance and airtime survive refreshes on the current device, while unavailable or invalid storage still allows complete play and in-session records.
  3. The best distance is visible as an in-world flag, and beating a personal best triggers a brief visual celebration.
  4. Once results appear, the player can begin a clean new attempt with one large retry control or the same keyboard action.

**Plans:** TBD
**UI hint:** yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Playable Jump | 0/3 | Planned | - |
| 2. Child-Ready Browser Play | 0/TBD | Not started | - |
| 3. Results and Replay Loop | 0/TBD | Not started | - |
