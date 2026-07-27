import Phaser from "phaser";

import { MenuScene } from "./scenes/MenuScene";
import { PlayScene } from "./scenes/PlayScene";
import "./style.css";

const viewportWidth = () => Math.max(1, window.innerWidth);
const viewportHeight = () => Math.max(1, window.innerHeight);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: viewportWidth(),
  height: viewportHeight(),
  backgroundColor: "#0b1026",
  scene: [MenuScene, PlayScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: viewportWidth(),
    height: viewportHeight(),
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
});
