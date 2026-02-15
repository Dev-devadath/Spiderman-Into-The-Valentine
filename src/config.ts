import type { Types } from 'phaser';

export const GAME_CONFIG: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2d1b4e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 550 },
      debug: false,
    },
  },
  scene: [],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
