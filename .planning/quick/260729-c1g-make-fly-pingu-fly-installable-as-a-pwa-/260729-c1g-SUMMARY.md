---
phase: 260729-c1g-make-fly-pingu-fly-installable-as-a-pwa
plan: 01
subsystem: infra
tags: [pwa, vite-plugin-pwa, workbox, service-worker, manifest]

requires:
  - phase: 01-playable-jump
    provides: Vite Phaser game shell with public sprite assets

provides:
  - Production PWA manifest and auto-updating service worker
  - Penguin-branded 192/512 install icons on sky #8ed8f8
  - NetworkFirst runtime caching for navigations and /assets/

affects:
  - vercel-static-deploy
  - offline-installability

tech-stack:
  added: [vite-plugin-pwa@1.3.0]
  patterns:
    - VitePWA generateSW with registerSW in main.ts (injectRegister null)
    - Lean precache + NetworkFirst runtime cache with expiration

key-files:
  created:
    - vite.config.ts
    - src/vite-env.d.ts
    - scripts/generate-pwa-icons.mjs
    - public/pwa-192x192.png
    - public/pwa-512x512.png
  modified:
    - package.json
    - package-lock.json
    - src/main.ts
    - index.html

key-decisions:
  - "Use vite-plugin-pwa 1.3.0 generateSW with registerType autoUpdate"
  - "Derive install icons from PENGUIN_FRAMES.ready via ImageMagick on #8ed8f8"
  - "Precache app shell only; NetworkFirst /assets/ with 7-day expiration"

patterns-established:
  - "PWA registration lives in src/main.ts via virtual:pwa-register"
  - "Regenerate icons with node scripts/generate-pwa-icons.mjs when ready frame changes"

requirements-completed: [QUICK-PWA]

coverage:
  - id: D1
    description: Production build emits web app manifest and service worker under dist
    requirement: QUICK-PWA
    verification:
      - kind: other
        ref: "npm run build && test -f dist/manifest.webmanifest && test -f dist/sw.js"
        status: pass
    human_judgment: false
  - id: D2
    description: Manifest declares Fly Pingu Fly, standalone, #8ed8f8, and 192/512 icons
    requirement: QUICK-PWA
    verification:
      - kind: other
        ref: "node -e manifest.webmanifest display/theme_color/icons checks"
        status: pass
    human_judgment: false
  - id: D3
    description: Service worker uses NetworkFirst runtime caching and outdated-cache cleanup
    requirement: QUICK-PWA
    verification:
      - kind: other
        ref: "node -e dist/sw.js NetworkFirst + cleanupOutdatedCaches checks"
        status: pass
    human_judgment: false
  - id: D4
    description: Install icons from ready pose on sky #8ed8f8
    requirement: QUICK-PWA
    verification:
      - kind: other
        ref: "node scripts/generate-pwa-icons.mjs && test -f dist/pwa-192x192.png"
        status: pass
    human_judgment: true
    rationale: Visual brand check of cropped penguin on sky background needs a human glance on install UI

duration: 5min
completed: 2026-07-29
status: complete
---

# Phase 260729-c1g: Make Fly Pingu Fly Installable as a PWA Summary

**vite-plugin-pwa installable shell with penguin icons and NetworkFirst Workbox caching for Vercel static deploys**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-29T06:42:30Z
- **Completed:** 2026-07-29T06:44:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Added `vite-plugin-pwa@1.3.0` with generateSW, standalone manifest, and autoUpdate registration from `main.ts`
- Generated 192/512 PNG install icons from the ready penguin frame on `#8ed8f8`
- Configured lean precache plus NetworkFirst runtime caches for navigations and `/assets/` with expiration and outdated-cache cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end installable PWA shell** - `1e94fb1` (feat)
2. **Task 2: NetworkFirst cache policy for Phaser deploy** - `17e62f6` (feat)

**Plan metadata:** skipped (orchestrator commits docs for quick tasks)

## Files Created/Modified
- `vite.config.ts` - VitePWA plugin, manifest, Workbox NetworkFirst rules
- `src/vite-env.d.ts` - Vite and vite-plugin-pwa client types
- `src/main.ts` - `registerSW({ immediate: true })` before Phaser.Game
- `index.html` - apple-touch-icon link; existing theme-color kept
- `scripts/generate-pwa-icons.mjs` - crops ready frame onto sky canvas
- `public/pwa-192x192.png` / `public/pwa-512x512.png` - install icons
- `package.json` / `package-lock.json` - vite-plugin-pwa dependency

## Decisions Made
- Prefer ImageMagick `magick` for icon compositing (sips cannot pad with solid brand color alone)
- Include a maskable 512 icon because generated art has center safe padding (~55% scale)
- Raise `maximumFileSizeToCacheInBytes` to 3 MiB for the Phaser bundle only; sprites stay off precache

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Vercel static hosting of `dist/` is enough.

## Next Phase Readiness
- Production build is installable; confirm install prompt / home-screen icon on a real device after Vercel deploy
- Existing unit tests still pass (146)

## Self-Check: PASSED

- FOUND: vite.config.ts, src/vite-env.d.ts, src/main.ts, public/pwa-192x192.png, public/pwa-512x512.png, scripts/generate-pwa-icons.mjs
- FOUND commits: 1e94fb1, 17e62f6

---
*Phase: 260729-c1g-make-fly-pingu-fly-installable-as-a-pwa*
*Completed: 2026-07-29*
