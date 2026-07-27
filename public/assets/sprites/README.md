# Selected game art

## Player character

`sprite_penguin.png` is the approved 640x240 RGBA character sheet from
*Where's My Egg?*:

https://www.spriters-resource.com/mobile/wheresmyegg/asset/213843/

The user stated that they have permission to reuse this sheet. The game uses
explicit crops from this file for every penguin pose. `snowball-penguin.webp`
is not the selected character and must not be used as a substitute.

## Snow scenery

- `winter-forest.webp` supplies the sparse background forest.
- `snow-pile.webp` supplies one foreground snow accent.

All other raster scenery in this directory remains unused. The first level
keeps its scene lean and does not load unrelated fantasy, animal, vegetation,
pine-tree, or rock-cluster art.

The production prebuild validates the exact three selected paths, their image
containers, and the penguin sheet dimensions before Vite starts.
