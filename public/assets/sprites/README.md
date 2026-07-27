# Selected game art

## Player character

`sprite_penguin.png` is the approved 640x240 RGBA character sheet from
*Where's My Egg?*:

https://www.spriters-resource.com/mobile/wheresmyegg/asset/213843/

The user stated that they have permission to reuse this sheet. The game uses
explicit crops from this file for every penguin pose. `snowball-penguin.webp`
is not the selected character and must not be used as a substitute.

## Snow scenery

- `winter-forest.webp` supplies the distant forest clusters behind the inrun.
- `pine-tree-snow-heavy.webp`, `birch-tree-white.webp`, `dead-tree.webp`,
  `twisted-dead-tree.webp`, and `snow-covered-tree-stump.webp` fill out the
  treeline behind the ramp.
- `snow-covered-fallen-log.webp` is the start platform at the top of the ramp.
- `snow-pile.webp`, `snow-village.webp`, `igloo-snow-block-dome.webp`,
  `snowman-carrot-nose-coal.webp`, and `lantern-post-snow-capped.webp`
  dress the nearly flat runout after the landing hill.

All other raster scenery in this directory remains unused. Fantasy crystal
trees, autumn maples, and decorated holiday trees stay out of the first level.

The production prebuild validates the selected paths, their image containers,
and the penguin sheet dimensions before Vite starts.
