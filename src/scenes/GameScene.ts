import Phaser from 'phaser';
import { Player } from '../entities/Player';

interface BuildingDef {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  darkColor: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private buildings!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.physics.world.setBounds(0, 0, 2400, 600);
    this.generatePlayerTexture();
    this.createBackground();
    this.createBuildings();
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
    this.add.rectangle(400, 300, 800, 600, 0x4a90d9).setScrollFactor(0);

    // Distant city silhouette (parallax) - spans full level width
    const silhouettes = [
      { x: 200, w: 90, h: 220 }, { x: 350, w: 70, h: 280 }, { x: 480, w: 100, h: 180 },
      { x: 640, w: 60, h: 320 }, { x: 760, w: 110, h: 200 }, { x: 920, w: 80, h: 260 },
      { x: 1060, w: 90, h: 240 }, { x: 1200, w: 70, h: 300 }, { x: 1330, w: 100, h: 190 },
      { x: 1480, w: 80, h: 270 }, { x: 1620, w: 90, h: 230 }, { x: 1780, w: 70, h: 290 },
      { x: 1920, w: 100, h: 200 }, { x: 2080, w: 80, h: 250 }, { x: 2220, w: 90, h: 220 },
    ];
    silhouettes.forEach((s) => {
      const b = this.add
        .rectangle(s.x, 600 - s.h / 2, s.w, s.h, 0x1a1a2e)
        .setScrollFactor(0.15);
    });
  }

  private createBuilding(def: BuildingDef): void {
    const { x, y, width, height, color, darkColor } = def;

    const main = this.add.rectangle(x, y, width, height, color);
    this.physics.add.existing(main, true);
    (main.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.buildings.add(main);

    this.add.rectangle(x, y - height / 2 + 2, width, 4, darkColor);
    this.add.rectangle(x - width / 2 + 2, y, 4, height, darkColor);
    this.add.rectangle(x + width / 2 - 2, y, 4, height, darkColor);

    const windowW = 12;
    const windowH = 16;
    const cols = Math.floor((width - 20) / (windowW + 6));
    const rows = Math.floor((height - 30) / (windowH + 8));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x - width / 2 + 14 + c * (windowW + 6);
        const wy = y - height / 2 + 20 + r * (windowH + 8);
        this.add.rectangle(wx, wy, windowW, windowH, 0x87ceeb, 0.6);
      }
    }
  }

  private createBuildings(): void {
    this.buildings = this.physics.add.staticGroup();

    const groundY = 588;
    const ground = this.add.rectangle(1200, groundY, 2400, 24, 0x333333);
    this.physics.add.existing(ground, true);
    (ground.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.buildings.add(ground);

    const buildingDefs: BuildingDef[] = [
      { x: 150, y: groundY - 80, width: 120, height: 160, color: 0x5c4b37, darkColor: 0x3d2f22 },
      { x: 320, y: groundY - 100, width: 140, height: 200, color: 0x6b5b4f, darkColor: 0x4a3d32 },
      { x: 510, y: groundY - 70, width: 100, height: 140, color: 0x4a4a4a, darkColor: 0x2d2d2d },
      { x: 650, y: groundY - 120, width: 130, height: 240, color: 0x5c4b37, darkColor: 0x3d2f22 },
      { x: 820, y: groundY - 90, width: 110, height: 180, color: 0x3d5a3d, darkColor: 0x2a3d2a },
      { x: 970, y: groundY - 130, width: 150, height: 260, color: 0x4a4a4a, darkColor: 0x2d2d2d },
      { x: 1160, y: groundY - 80, width: 100, height: 160, color: 0x5c4b37, darkColor: 0x3d2f22 },
      { x: 1300, y: groundY - 110, width: 140, height: 220, color: 0x6b5b4f, darkColor: 0x4a3d32 },
      { x: 1480, y: groundY - 95, width: 120, height: 190, color: 0x4a4a4a, darkColor: 0x2d2d2d },
      { x: 1650, y: groundY - 140, width: 160, height: 280, color: 0x5c4b37, darkColor: 0x3d2f22 },
      { x: 1860, y: groundY - 85, width: 100, height: 170, color: 0x3d5a3d, darkColor: 0x2a3d2a },
      { x: 2010, y: groundY - 115, width: 130, height: 230, color: 0x6b5b4f, darkColor: 0x4a3d32 },
    ];

    buildingDefs.forEach((def) => this.createBuilding(def));
  }

  private createPlayer(): void {
    this.player = new Player(this, 80, 550);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.buildings);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, 2400, 600);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private addControlsHint(): void {
    const hint = this.add
      .text(16, 16, 'WASD: Move | W/Space: Jump | On wall: W/S to climb', {
        fontSize: '12px',
        color: '#eee',
      })
      .setScrollFactor(0)
      .setOrigin(0);

    this.add
      .rectangle(hint.width / 2 + 16, 28, hint.width + 12, 22, 0x1a1a2e, 0.8)
      .setScrollFactor(0)
      .setOrigin(0.5, 0);
  }

  update(): void {}
}
