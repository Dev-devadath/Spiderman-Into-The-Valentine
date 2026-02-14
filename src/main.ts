import Phaser from 'phaser';
import { GAME_CONFIG } from './config';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  ...GAME_CONFIG,
  scene: [GameScene],
};

new Phaser.Game(config);
