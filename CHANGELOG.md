# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Installable PWA shell (web app manifest, penguin icons, auto-updating service worker) for static hosting such as Vercel
- Idle free-roam respawn after 5 seconds of stillness, with a language-free countdown ring above the penguin
- Candy lollipop tree on the far left of the start menu as a natural roam blocker
- One-thumb mobile gestures: swipe up to jump, swipe down and hold to crouch, swipe sideways to turn

### Changed

- Mobile crouch no longer uses a two-finger hold; vertical swipe-and-hold is the touch crouch control
- Idle countdown ring is smaller, blue, and sits higher above the penguin’s head

### Fixed

- Menu candy tree size and position tuning so it reads as scenery rather than a wall

## [0.0.4] - 2026-07-28

### Added

- Shared free-roam hop-and-slide physics used on the menu and after a scored landing
- Ice watchtower as the runout stop at the end of the slide
- Crouch on the menu and landing hill for longer slides and hops
- Short README and MIT license

### Changed

- Ramp takeoff section uses a constant-slope table into the lip
- Displayed jump distances use a clearer meters scale

### Fixed

- Free-roam slides stay stuck to the slope instead of popping airborne
- Watchtower and nearby pines sit on the snowline at the runout

### Removed

- Landing-hill crouch acceleration that rebuilt speed too aggressively

## [0.0.3] - 2026-07-28

### Added

- 8-bit arcade main menu with winter-forest backdrop
- Start the run by sliding the penguin to the village flag
- Top-10 distance leaderboard on the main menu
- Pause menu (ESC) with control hints
- Package version and game credit links on the menu

### Fixed

- Menu penguin, prompt, and UI stay planted on the snow and pinned to the camera
- Title stays on one line; start prompt copy is clearer for kids

## [0.0.2] - 2026-07-28

### Added

- Runout village scenery (houses, pines, snowman, takeoff flag at the lip)
- Parallax snowfall using the in-game flake sprites
- Jump distances shown in meters

### Changed

- Gap mountain and village layout tuned for readable jumps and less sprite overlap

### Fixed

- Remove airtime from the HUD
- Remove hot spring, igloo, and lantern clutter from the runout village

## [0.0.1] - 2026-07-27

### Added

- Playable one-button ski jump: ramp, timed takeoff, flight, landing, and slide
- Crouch (Down) for faster inrun and in-air glide control
- Top-10 distance leaderboard in `localStorage`
- Retry with R; crash poses when colliding with the knoll
- Starting log, knoll landing hill, and flattened runout with snow village scenery

### Fixed

- Takeoff only near the jump lip; crouch takeoff no longer sticks at the lip
- Distance recorded on landing contact
- Penguin seating and scale on the starting log

[Unreleased]: https://github.com/dergigi/fly-pingu-fly/compare/v0.0.4...HEAD
[0.0.4]: https://github.com/dergigi/fly-pingu-fly/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/dergigi/fly-pingu-fly/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/dergigi/fly-pingu-fly/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/dergigi/fly-pingu-fly/releases/tag/v0.0.1
