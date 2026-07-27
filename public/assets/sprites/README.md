# Selected game art

## Player character

`sprite_penguin.png` is the approved 640x240 RGBA character sheet from
*Where's My Egg?*:

https://www.spriters-resource.com/mobile/wheresmyegg/asset/213843/

The user stated that they have permission to reuse this sheet. The game uses
explicit crops from this file for every penguin pose. `snowball-penguin.webp`
is not the selected character and must not be used as a substitute.

## Snow scenery

- `winter-forest.webp` is the distant forest mass behind the ramp and landing hill.
- `pine-tree-snow-heavy.webp` and `snow-packed.webp` dress the near treeline
  and snow banks only on the flat runout at the end.
- Rock and geyser rubble (`snow-covered-rock-cluster.webp`,
  `snow-covered-geyser.webp`) fills the cliff gap between takeoff and landing.
- `snow-ice-crystal.png` and `snow-fall-flakes.webp` drive the light snowfall.
- `cloud-solid.webp` and `cloud-thin.webp` drift gently across the sky.
- `snow-covered-fallen-log.webp` is the start platform at the top of the ramp.
- The runout is a little snow village: `snow-village.webp`,
  `snow-walled-storage.webp`, `wood-pile-snow-capped.webp`,
  `snow-covered-rock-cluster.webp`, `snow-covered-hot-spring.webp`,
  `ice-watchtower-spire.webp`, plus `snow-pile.webp`,
  `igloo-snow-block-dome.webp`, `snowman-carrot-nose-coal.webp`, and
  `lantern-post-snow-capped.webp`.
- `village-flag.png` marks the far end of the landing hill before the runout.

All other raster scenery in this directory remains unused. Fantasy crystal
trees, autumn maples, and decorated holiday trees stay out of the first level.

The production prebuild validates the selected paths, their image containers,
and the penguin sheet dimensions before Vite starts.
