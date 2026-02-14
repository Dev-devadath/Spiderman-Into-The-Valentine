import Phaser from 'phaser';
import { Player } from '../entities/Player';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.physics.world.setBounds(0, 0, 1600, 600);
    this.generatePlayerTexture();
    this.createBackground();
    this.createPlatforms();
    this.createPlayer();
    this.setupCollisions();
    this.setupCamera();
    this.addControlsHint();
  }

  private generatePlayerTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(0, 0, 32, 48);
    graphics.generateTexture('player_temp', 32, 48);
    graphics.destroy();
  }

  private createBackground(): void {
    this.add.rectangle(400, 300, 800, 600, 0x87ceeb).setScrollFactor(0);
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    const createPlatform = (x: number, y: number, width: number, height: number = 20) => {
      const platform = this.add.rectangle(x, y, width, height, 0x8b4513);
      this.platforms.add(platform);
    };

    // Ground - main floor
    createPlatform(400, 588, 1600);

    // Start area - low platforms for jump practice
    createPlatform(200, 500, 120);
    createPlatform(400, 450, 100);
    createPlatform(550, 500, 100);

    // Rooftops section
    createPlatform(750, 480, 150);
    createPlatform(950, 420, 120);
    createPlatform(1100, 500, 140);
    createPlatform(1300, 380, 200);
    createPlatform(1500, 500, 100);
  }

  private createPlayer(): void {
    this.player = new Player(this, 100, 500);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, 1600, 600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private addControlsHint(): void {
    const hint = this.add
      .text(16, 16, 'WASD or Arrows: Move | W/Space: Jump', {
        fontSize: '14px',
        color: '#333',
      })
      .setScrollFactor(0)
      .setOrigin(0);

    this.add.rectangle(hint.width / 2 + 16, 30, hint.width + 8, 24, 0xffffff, 0.6).setScrollFactor(0).setOrigin(0.5, 0);
  }

  update(): void {
    // Player preUpdate is called automatically by Phaser
  }
}
