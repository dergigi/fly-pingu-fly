# Pitfalls Research

**Domain:** One-button 2D browser ski-jump game for children ages 4–7  
**Researched:** 2026-07-27  
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Physics Depends on Render Frames

**What goes wrong:**  
The penguin accelerates, launches, flies, or slides a different distance on 60 Hz, 120 Hz, and throttled devices. A resumed background tab can advance the simulation by seconds, tunnel through the ramp, or end the jump immediately.

**Why it happens:**  
Velocity and position are updated once per rendered frame, or raw elapsed time is accepted without a maximum. `requestAnimationFrame()` follows the display refresh rate and is usually paused in hidden tabs.

**How to avoid:**  
Keep simulation units in seconds and world units. Run physics at a fixed step, such as 1/60 second, using the callback timestamp and an accumulator. Limit elapsed time and catch-up steps, reset the accumulator on `visibilitychange`, and interpolate only visual state. Keep record calculations tied to simulation state, not screen pixels.

**Warning signs:**  
- A 120 Hz display produces a shorter or faster jump than a 60 Hz display.
- DevTools CPU throttling changes the result of the same scripted takeoff.
- Returning to a hidden tab teleports the penguin.
- Collision failures appear only during frame drops.

**Phase to address:**  
Phase 1, deterministic jump simulation. Add cross-refresh-rate and long-frame tests before tuning the jump.

---

### Pitfall 2: Takeoff Feels Random or Unfair

**What goes wrong:**  
Children press at what looks like the ramp edge but receive inconsistent launches. A tap near the edge can be ignored, applied late, or scored against a position that was never shown. Exact-frame timing makes the game too harsh for the audience.

**Why it happens:**  
Input is sampled only during a physics update, the visible sprite does not match the collision anchor, or the valid takeoff window is a single point. Camera motion and render interpolation can also make the displayed edge differ from the simulation edge.

**How to avoid:**  
Timestamp the action and consume it once in the simulation. Define a visible takeoff zone around the lip, with a short input buffer before entry and a forgiving late boundary. Derive launch quality continuously from position rather than using success/failure cliffs. Mark the ramp lip visually, align the penguin’s foot/contact anchor with physics, and flash or squash the penguin on accepted input. Lock all thresholds before final difficulty tuning.

**Warning signs:**  
- Testers say “I pressed it” after an unchanged run.
- Frame-by-frame capture shows the action before the lip but the simulation rejects it.
- One-frame changes produce extreme distance differences.
- Adults learn the timing, but children resort to rapid tapping.

**Phase to address:**  
Phase 2, takeoff control and tuning. Validate with recorded input traces and short observational sessions with children.

---

### Pitfall 3: The Camera Hides the Skill and Outcome

**What goes wrong:**  
The ramp lip leaves the screen before the press, the penguin approaches the edge too quickly to judge, or the camera centers so tightly that direction and speed are unreadable. During flight, the landing area appears too late. Camera snaps make a good jump feel broken.

**Why it happens:**  
The camera blindly follows the penguin’s center with no look-ahead, dead zone, phase-specific framing, or stable scale. Responsive resizing may also alter the visible world during a run.

**How to avoid:**  
Use explicit camera modes for ramp, flight, landing, and slide. Keep the penguin behind center while moving right, reserve space ahead, and keep the ramp lip visible through takeoff. Ease transitions over time, cap camera acceleration, preserve horizon/ground context, and reveal the landing slope before contact. Resize the viewport without changing world coordinates or camera rules.

**Warning signs:**  
- The lip is off-screen when players are expected to act.
- The penguin or landing point sits within a small margin of the screen edge.
- The camera reverses, snaps, or changes zoom at takeoff.
- Players watch the screen edge instead of the penguin.

**Phase to address:**  
Phase 3, camera and complete jump presentation. Test portrait, landscape, narrow desktop, and low-frame-rate captures.

---

### Pitfall 4: One Physical Press Becomes Zero or Two Game Actions

**What goes wrong:**  
A tap scrolls or zooms the page, is canceled by the browser, or fires both pointer and compatibility mouse/click handlers. Key auto-repeat or two fingers can launch and immediately retry. Input outside the active play state can leak into the next run.

**Why it happens:**  
Separate touch, mouse, click, and keyboard paths mutate game state directly. The game surface lacks an intentional `touch-action` policy, and input is not debounced by pointer identity, key repeat, or game state.

**How to avoid:**  
Route `pointerdown` and accepted keyboard keys into one `attemptAction()` command. Use `touch-action` on the game surface, prevent browser defaults only where needed, and handle `pointercancel`. Ignore `event.repeat`, non-primary pointers, and duplicate actions in the same state. Use a release gate or short lockout before retry becomes active. Keep native browser zoom available outside the play surface.

**Warning signs:**  
- One tap logs two commands.
- A diagonal finger movement causes `pointercancel`.
- Holding Space repeatedly restarts runs.
- The page bounces or text selects during play.
- Multi-touch skips the result state.

**Phase to address:**  
Phase 2, unified one-button input. Verify on iOS Safari, Android Chrome, mouse, keyboard, and a touch-enabled laptop.

---

### Pitfall 5: Responsive Canvas Changes Gameplay or Looks Blurry

**What goes wrong:**  
Physics, hit zones, or jump distance change with window size. Retina displays blur the sprites, orientation changes stretch the scene, and mobile browser chrome clips the result or retry control. Repeated resizing can compound the canvas transform.

**Why it happens:**  
CSS size, canvas backing-store size, device pixels, and world coordinates are treated as the same system. Width and height attributes are changed without restoring the render transform, or gameplay geometry is rebuilt from viewport pixels.

**How to avoid:**  
Choose a fixed logical world and reference aspect ratio. Fit it into the available container with letterboxing or controlled crop, then map world to CSS pixels. Set backing dimensions from displayed size and `devicePixelRatio`, reset the context transform before applying scale, and observe the container with `ResizeObserver`. Recompute rendering and UI layout on resize, never active-run physics. Cap DPR if memory or fill rate becomes a problem.

**Warning signs:**  
- The same input trace earns different distances at different viewport sizes.
- Sprites blur on Retina or become unevenly stretched.
- Rotation moves the ramp lip relative to the penguin.
- Canvas width/height assignments occur in the game update loop.
- Controls disappear behind browser UI or safe-area insets.

**Phase to address:**  
Phase 1 for coordinate-system decisions; Phase 4 for responsive rendering and device coverage.

---

### Pitfall 6: Sprite Rights or Sheet Assumptions Block Release

**What goes wrong:**  
The game reaches publication with no durable proof that the supplied *Where’s My Egg?* sprites may be used in the intended release. The Spriters Resource terms prohibit commercial use and only allow site content “where legally permitted”; permission from a ripper or host does not necessarily cover the original game copyright. Separately, irregular sheet cells, transparent padding, pivots, or filtering can make the penguin wobble, bleed neighboring frames, or look inconsistent.

**Why it happens:**  
“Available online” and “permission stated in chat” are mistaken for a complete license record. Art integration is postponed until after physics and animation anchors have been tuned against placeholders.

**How to avoid:**  
Before public release, preserve written permission identifying the rightsholder or authorized licensor, exact files, modification rights, distribution channels, attribution, territory/duration if relevant, and whether commercial or ad-supported use is allowed. Record source URL and sheet metadata in the repository. If this cannot be established, replace the art with original or clearly licensed sprites. During integration, extract frames into a manifest, normalize transparent bounds, define a stable foot/contact pivot, use nearest-neighbor scaling for pixel art, and add atlas gutters or extruded edges.

**Warning signs:**  
- Permission cannot be produced outside the planning conversation.
- The permission giver’s authority over the original art is unclear.
- No license or attribution file names the source and scope.
- Animation frames have different canvas sizes or foot positions.
- Colored seams appear when the camera scales or moves.

**Phase to address:**  
Phase 0, asset-rights gate, before sprite-dependent implementation; Phase 3, sprite integration tests. Publication is blocked until the rights record is adequate or replacement art is ready.

---

### Pitfall 7: Local Records Silently Disappear or Poison the Game

**What goes wrong:**  
Best distance and airtime vanish in private mode, after a host/origin change, or when storage is blocked. A malformed, stale, or manually edited value displays `NaN`, an absurd record, or prevents startup. A failed write can stop the result sequence.

**Why it happens:**  
Code assumes that the presence of `window.localStorage` means reads and writes cannot fail. Raw values lack schema versioning, parsing checks, and sensible bounds.

**How to avoid:**  
Wrap storage acquisition, reads, parsing, and writes. Test availability with a temporary write. Store one versioned JSON object, validate finite non-negative numbers against plausible limits, and fall back to in-memory records if persistence fails. Never block play or retry on a storage exception. Keep storage keys stable across deployments on the same origin and describe records as “on this device/browser,” not permanent.

**Warning signs:**  
- The game fails from a `SecurityError` or `QuotaExceededError`.
- A bad DevTools value breaks the result screen.
- Records differ between preview and production hosts without explanation.
- Private browsing appears to save until all private tabs close.

**Phase to address:**  
Phase 5, results and persistence, with blocked-storage, malformed-data, private-mode, and origin-change tests.

---

### Pitfall 8: Feedback Is Clear to Adults but Not Young Children

**What goes wrong:**  
Players cannot tell whether their tap registered, whether they beat a record, or how to retry. Text-heavy results and subtle color changes are missed. Delayed results can feel like the game froze, while showing them before the landing slide removes the physical payoff.

**Why it happens:**  
The interface relies on reading, adult-sized targets, color alone, or delayed state changes. Adult testers explain the game or interpret silent moments for the child. Audio is excluded from v1, so weak visual feedback has no second channel.

**How to avoid:**  
Make every accepted action produce immediate visible motion or highlight. Use large targets, a persistent visual action cue before takeoff, distinct silhouette/scale/motion changes, and a short result reveal only after the penguin stops. Show new records with an obvious badge, burst, or crown plus the number. Make retry a large animated control and accept the same one-button action after a clear release gate. Test through observation: repeated taps, looking away, asking for help, or handing back the device are failures even if the child says they liked it.

**Warning signs:**  
- Children tap repeatedly after a valid takeoff.
- They wait on the result screen without retrying.
- A parent must read or explain labels.
- New-record and normal-result screens look nearly identical.
- Adults report success while children abandon the loop.

**Phase to address:**  
Phase 5, results and instant retry; observational UAT in Phase 6. Visual feedback is a release criterion because v1 has no audio.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Per-frame constants for motion | Quick prototype | Hardware-dependent gameplay and invalid records | Never beyond a throwaway spike |
| Camera coordinates reused as world coordinates | Less transform code | Resize-dependent physics and fragile collisions | Never |
| Separate touch, click, and key handlers | Easy device demos | Duplicate actions and inconsistent state guards | Never |
| Exact-point takeoff test | Simple condition | Unfair timing and device latency sensitivity | Only to visualize the lip during a spike |
| Hard-coded sprite crop rectangles throughout code | Fast first animation | Painful art replacement and pivot drift | Never; centralize in a manifest |
| Bare `localStorage` calls | Few lines | Startup/result failures in blocked storage | Never |
| Adult-only playtesting | Easy scheduling | Misses target-age comprehension and motor issues | Prototype only, not release validation |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Browser animation loop | Treat every callback as one equal physics step | Fixed simulation step, bounded catch-up, visibility reset |
| Pointer Events | Also listen to `touchstart`, `mousedown`, and `click` for the same action | One pointer path plus keyboard, deduplicated through one command |
| Canvas and CSS | Set CSS dimensions only, or scale from already-scaled context state | Separate logical world, CSS size, and DPR-aware backing store |
| Sprite sheet | Assume a uniform grid and frame-centered pivot | Manifest per frame, normalized bounds, stable contact pivot |
| Spriters Resource asset | Treat host availability as a commercial license | Preserve rightsholder permission and scope or replace the art |
| `localStorage` | Assume API presence guarantees persistence | Test write, validate schema, catch every operation, in-memory fallback |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded fixed-step catch-up | Freeze after tab restore, then teleport | Cap elapsed delta and update count; reset after visibility change | Any long frame or hidden-tab resume |
| Full-DPR canvas on large mobile/desktop screens | Hot device, dropped frames, excess memory | Cap effective DPR and fit a modest logical resolution | High-DPR screens, especially 3× phones |
| Per-frame canvas resize | Flicker, allocations, transform resets | Resize only when observed display size changes | Immediately on most devices |
| Runtime sprite cropping/scaling every frame | Jank during flight and inconsistent edges | Precompute source rectangles and cache transformed/static art | Low-end mobile hardware |
| Excess particles for “good job” feedback | Takeoff or results stutter | Small bounded pool and reduced-motion fallback | Older phones and repeated rapid retries |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating stored records as trusted numbers | Corrupt values can break UI or calculations | Parse a versioned object; require finite, bounded, non-negative values |
| Shipping third-party sprites without documented rights | Takedown or forced art rewrite | Rights gate, provenance record, attribution, replacement plan |
| Adding analytics later without revisiting child privacy | Collection can conflict with a child-directed product’s obligations | Keep v1 offline and analytics-free; require separate privacy/legal review before adding telemetry |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Ramp lip blends into snow | Takeoff timing becomes guesswork | Strong contrast, marker, and stable on-screen lead-in |
| Harsh success/failure threshold | Near-identical taps feel random | Continuous launch quality with a forgiving window |
| Camera centers the penguin | No view of what is ahead | Horizontal dead zone and phase-specific look-ahead |
| Feedback uses text or color alone | Pre-readers miss state changes | Shape, motion, scale, and icon cues with optional text |
| Retry activates before finger/key release | One press skips results or starts another run | Release gate and short, visible transition |
| Result appears at touchdown | Landing and slide feel cut off | Wait for visible stop, then reveal result promptly |
| Tiny corner button | Poor motor accuracy causes missed retries | Large central/bottom action target with generous hit area |

## "Looks Done But Isn't" Checklist

- [ ] **Physics:** A recorded input trace yields equivalent results at 30, 60, 120, and 144 Hz and after a simulated long frame.
- [ ] **Takeoff:** The accepted input has immediate visual acknowledgement and a documented forgiving zone.
- [ ] **Camera:** The lip is visible before takeoff and landing terrain is visible before contact at every supported aspect ratio.
- [ ] **Input:** One tap equals one action; scrolling, multi-touch, key repeat, `pointercancel`, and held input do not skip states.
- [ ] **Canvas:** CSS size, backing resolution, DPR changes, orientation changes, and safe areas are tested without changing world physics.
- [ ] **Sprites:** Rights evidence and attribution are stored; frame bounds, pivots, filtering, and atlas bleed are verified in motion.
- [ ] **Records:** Blocked storage, private mode, malformed JSON, invalid numbers, and host changes degrade safely.
- [ ] **Young-player feedback:** Children can take off, understand the outcome, and retry without adult explanation.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Frame-dependent physics after content tuning | HIGH | Separate simulation/render loops, replace per-frame constants, invalidate and retune thresholds |
| Unreadable camera | MEDIUM | Add phase modes, dead zones, look-ahead, and transition easing; rerun aspect-ratio tests |
| Duplicate touch actions | LOW | Centralize command handling, remove compatibility listeners, add state/release guards |
| Viewport-dependent world | HIGH | Introduce logical coordinates and a render transform; rewrite collision/input mappings |
| Inadequate sprite rights | HIGH | Pause publication, obtain adequate written permission or replace and retune all sprite pivots |
| Corrupt local record | LOW | Validate/migrate payload, discard invalid values, preserve play with in-memory fallback |
| Child cannot understand feedback | MEDIUM | Replace text dependence with immediate animation/icons, enlarge targets, repeat observational testing |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Unclear sprite rights | Phase 0: Asset-rights gate | Written scope/provenance exists or replacement art is selected |
| Frame-dependent physics | Phase 1: Deterministic simulation | Same scripted input across refresh rates and long-frame cases |
| Viewport-dependent physics | Phase 1: Deterministic simulation | World result remains unchanged across canvas sizes |
| Unfair takeoff timing | Phase 2: One-button control | Buffered zone tests plus target-age observation |
| Duplicate/canceled input | Phase 2: One-button control | Cross-device event log shows one command per physical press |
| Unreadable camera | Phase 3: Jump presentation | Lip and landing visibility assertions plus captured runs |
| Sprite jitter/bleeding | Phase 3: Jump presentation | Stable contact pivot and pixel inspection at supported scales |
| Blurry/clipped responsive canvas | Phase 4: Responsive shell | Device/aspect/DPR/orientation matrix passes |
| Fragile local records | Phase 5: Results and persistence | Storage failure and corrupt-payload tests pass |
| Weak child feedback and retry | Phase 5: Results and persistence | No-explanation completion of repeated jump loop |
| Adult-biased validation | Phase 6: Target-age UAT | Observe children ages 4–7 in short sessions and log behavioral failures |

## Sources

- [MDN: Anatomy of a video game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) — fixed-step loop and catch-up behavior. MEDIUM confidence through verified web search.
- [MDN: `requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — refresh-rate variation and background pausing. MEDIUM confidence through verified web search.
- [MDN: Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) — unified input, capture, cancellation, and `touch-action`. MEDIUM confidence through verified web search.
- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — DPR-aware backing-store scaling. MEDIUM confidence through verified web search.
- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) — layout versus visible mobile viewport. MEDIUM confidence through verified web search.
- [MDN: Using the Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API) — feature detection and storage exceptions. MEDIUM confidence through verified web search.
- [MDN: `localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — origin scope, private browsing, and `SecurityError`. MEDIUM confidence through verified web search.
- [The Spriters Resource: Terms of Use](https://www.spriters-resource.com/page/tou/) — restrictions on site content and commercial works. MEDIUM confidence; project-specific permission scope remains unverified.
- [Exploring the Usability and Interaction Experience of the Artsteps Virtual Exhibition Platform by Preschool Children](https://www.mdpi.com/2079-9292/14/13/2690) — preschool interaction observations and immediate visual feedback. MEDIUM confidence; not game-specific.
- [Designing graphics and user interfaces for language learning games for children aged 4–6](https://www.theseus.fi/bitstream/handle/10024/130143/Rasanen_Laura.pdf?sequence=2) — pre-reader, touch, and immediate-feedback considerations. LOW-to-MEDIUM confidence as a secondary thesis source.

## Research Gaps

- The effective takeoff buffer, launch-quality curve, camera dead zone, and result pacing are game-specific. They require instrumented prototype testing rather than literature alone.
- The user states that sprite reuse permission exists, but the permission text, grantor authority, and allowed release model were not available for verification.
- Child usability evidence supports immediate visual feedback and low-complexity interaction, but only direct observation of the intended age range can validate this game.

---
*Pitfalls research for: Fly Pingu Fly*  
*Researched: 2026-07-27*
