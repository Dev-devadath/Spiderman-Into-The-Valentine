import Phaser from 'phaser';
import { Player } from '../entities/Player';

/** Parallax */
const PARALLAX_SPEED = 0.08;
const PARALLAX_TRAVEL = 1200;
const PARALLAX_GAP = 400;

/** Buildings */
const MAX_BUILDING_HEIGHT = 380;
const MIN_BUILDING_HEIGHT = 0;
const MIN_BUILDING_WIDTH = 60;
const MAX_BUILDING_WIDTH = 130;

/** Buildings shorter than this are treated as "holes" and get a crane above them */
const HOLE_HEIGHT_THRESHOLD = 100;

/** Collectible hearts */
const HEART_DISPLAY_SIZE = 28;
const HEART_SPAWN_CHANCE = 0.35; // 35% chance per building
const FOURTH_POWERUP_SIZE = 34;
const FOURTH_POWERUP_SPAWN_AHEAD = 260;
const FOURTH_POWERUP_MISS_MARGIN = 130;
const REWIND_GLITCH_DURATION_MS = 1200;
const REWIND_GLITCH_TICK_MS = 70;
const FIREBALL_CHALLENGE_VIEW_X = 480;
const FIREBALL_SMALL_SPEED = 250;
const FIREBALL_BIG_SPEED = 210;
const FIREBALL_SPAWN_AHEAD = 520;
const FIREBALL_WEB_THROW_RANGE = 150;
const FIREBALL_WEB_THROW_DIST = 520;
const FIREBALL_SMALL_SIZE = 28;
const FIREBALL_BIG_SIZE = 36;
const FIREBALL_ORBIT_RADIUS = 56;
const FIREBALL_ORBIT_TURNS = 2;
const FIREBALL_ORBIT_DURATION_MS = 520;
const FIREBALL_THROW_TO_TOWER_MS = 560;
const GWEN_DISPLAY_W = 34;
const GWEN_DISPLAY_H = 50;
const GWEN_REQUIRED_HEARTS = 6;
const GWEN_MIN_SPAWN_X = 1600;
const PORTAL_X = 900; // roughly mid-way before Gwen event
const PORTAL_Y = 74; // intentionally high so player cannot reach it
const PORTAL_SIZE = 78;
const PORTAL_INNER_SCALE = 0.52;
const GWEN_TOWER_WIDTH = 150;
const GWEN_TOWER_HEIGHT = 470;
const GWEN_SPAWN_AHEAD = 560;
const GWEN_TRIGGER_RANGE_X = 200;
const GWEN_TRIGGER_RANGE_Y = 220;
const GWEN_FALL_SPEED = 55;
const GWEN_WEB_SAVE_RANGE = 420;
const GWEN_SAVE_TOP_Y_TOLERANCE = 72;
const GWEN_SAVE_TOP_X_TOLERANCE = 130;
const PLAYER_TOWER_PULL_RANGE = 260;
const GWEN_FALL_DRIFT_X = 18;
const GWEN_CRANE_EXCLUSION_RANGE = 260;
const GWEN_WEB_VISUAL_HEIGHT = 8;
const REUNION_DURATION_MS = 850;
const REUNION_JUMP_HEIGHT = 20;
const REUNION_JUMP_UP_MS = 120;

/** Swing / Crane */
const CRANE_DISPLAY_W = 10;
const CRANE_DISPLAY_H = 180;
const SWING_DETECT_RANGE = 200; // how close the player must be to a crane tip to swing
const SWING_DURATION_MS = 600; // how long the swing lasts before auto-release
const SWING_BOOST_X = 280; // horizontal velocity during swing
const SWING_BOOST_Y = -350; // upward velocity at start of swing

interface CranePoint {
  x: number; // world x of the crane's bottom tip
  y: number; // world y of the crane's bottom tip
  image: Phaser.GameObjects.Image;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private buildings!: Phaser.Physics.Arcade.StaticGroup;
  private hearts!: Phaser.GameObjects.Group;
  private powerups!: Phaser.GameObjects.Group;
  private fireballs!: Phaser.Physics.Arcade.Group;
  private deathZone!: Phaser.GameObjects.Rectangle;
  private floorTile!: Phaser.GameObjects.TileSprite;
  private parallaxImg!: Phaser.GameObjects.Image;
  private parallaxScroll = 0;
  private lastCamX = 0;
  private spawnX = 50;
  private spawnY = 180;

  private generatedUpToX = 0;
  private generateAhead = 900;
  private floorY = 600;

  /** Crane anchor points (bottom tips of khambaa) */
  private cranes: CranePoint[] = [];

  /** Swing state */
  private swingTarget: CranePoint | null = null;
  private swingTimer = 0;
  private webLine!: Phaser.GameObjects.Graphics;
  private swingKey!: Phaser.Input.Keyboard.Key;
  private heartEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private heartsCollected = 0;
  private thirdHeartCheckpointX = 0;
  private thirdHeartCheckpointY = 0;
  private fourthPowerup: Phaser.GameObjects.Image | null = null;
  private fourthPowerupSpawned = false;
  private fourthPowerupCollected = false;
  private rewindGlitchActive = false;
  private rewindOverlay: Phaser.GameObjects.Rectangle | null = null;
  private rewindScanlines: Phaser.GameObjects.Graphics | null = null;
  private fireballChallengeStarted = false;
  private fireballChallengeComplete = false;
  private fireballSpawnQueued = false;
  private fireballsDodged = 0;
  private activeFireball: Phaser.Physics.Arcade.Image | null = null;
  private gwen: Phaser.Physics.Arcade.Image | null = null;
  private gwenSpawned = false;
  private gwenFalling = false;
  private gwenPullingUp = false;
  private playerPullingToTower = false;
  private rescueTower: Phaser.Physics.Arcade.Image | null = null;
  private rescueTowerTopY = 0;
  private reunionInProgress = false;
  private gameWon = false;
  private endText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private gwenIntroBubble: Phaser.GameObjects.Container | null = null;
  private portal!: Phaser.GameObjects.Image;
  private portalInner!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image('spi1', new URL('../assets/spi1.png', import.meta.url).href);
    this.load.image('sp2', new URL('../assets/sp2.png', import.meta.url).href);
    this.load.image('sidewayspidey', new URL('../assets/sidewayspidey.png', import.meta.url).href);
    this.load.image('bg', new URL('../assets/bg.png', import.meta.url).href);
    this.load.image('building1', new URL('../assets/building1.png', import.meta.url).href);
    this.load.image('building2', new URL('../assets/building2.png', import.meta.url).href);
    this.load.image('spiral1', new URL('../assets/spiral1.png', import.meta.url).href);
    this.load.image('floor', new URL('../assets/floor.png', import.meta.url).href);
    this.load.image('parallax', new URL('../assets/parallax.png', import.meta.url).href);
    this.load.image('khambaa', new URL('../assets/khambaa.png', import.meta.url).href);
    this.load.image('web2', new URL('../assets/web2.png', import.meta.url).href);
    this.load.image('heart2', new URL('../assets/heart2.png', import.meta.url).href);
    this.load.image('bomb', new URL('../assets/BOMB.png', import.meta.url).href);
    this.load.image('gwen', new URL('../assets/gwen.png', import.meta.url).href);
  }

  create(): void {
    this.textures.get('spi1').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('sp2').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('sidewayspidey').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('building1').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('building2').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('spiral1').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('floor').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('parallax').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('khambaa').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('web2').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('heart2').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('bomb').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('gwen').setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.createBackground();
    this.createFireballTextures();
    this.createBuildings();
    this.createPortal();
    this.createPlayer();
    this.thirdHeartCheckpointX = this.spawnX;
    this.thirdHeartCheckpointY = this.spawnY;
    this.setupCollisions();
    this.setupCamera();
    this.lastCamX = this.cameras.main.scrollX;
    this.parallaxScroll = 0;
    this.updateParallaxVisual(this.lastCamX);
    this.setupSwing();
    this.addControlsHint();
    this.createQuestUI();
    this.createEndUI();
    this.createGwenIntroBubble();
  }

  // ── Background ──

  private createBackground(): void {
    const bg = this.add.image(400, 300, 'bg').setOrigin(0.5, 0.5);
    bg.setDisplaySize(800, 600);
    bg.setScrollFactor(0);

    this.parallaxImg = this.add
      .image(400, 300, 'parallax')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(800, 600)
      .setScrollFactor(0);
  }

  private updateParallaxVisual(_camX: number): void {
    const cycle = PARALLAX_TRAVEL + PARALLAX_GAP;
    const pos = ((this.parallaxScroll % cycle) + cycle) % cycle;

    if (pos <= PARALLAX_TRAVEL) {
      this.parallaxImg.setVisible(true);
      // Start from far right and move left as scroll increases.
      this.parallaxImg.x = 800 - pos;
    } else {
      this.parallaxImg.setVisible(false);
    }
  }

  private createFireballTextures(): void {
    this.textures.get('bomb').setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  // ── Buildings + Cranes ──

  private createBuilding(leftX: number, width: number, height: number, floorY: number): void {
    const cx = leftX + width / 2;
    const cy = floorY - height / 2;

    const building = this.physics.add
      .staticImage(cx, cy, 'building2')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(width, height);

    building.refreshBody();
    this.buildings.add(building);
  }

  /**
   * Place a collectible heart on top of a building.
   */
  private createHeart(buildingCenterX: number, buildingTopY: number): void {
    const heart = this.add
      .image(buildingCenterX, buildingTopY - HEART_DISPLAY_SIZE / 2, 'heart2')
      .setDisplaySize(HEART_DISPLAY_SIZE, HEART_DISPLAY_SIZE)
      .setOrigin(0.5, 0.5)
      .setDepth(5);

    this.physics.add.existing(heart, true);
    (heart.body as Phaser.Physics.Arcade.StaticBody).setSize(HEART_DISPLAY_SIZE - 4, HEART_DISPLAY_SIZE - 4);
    (heart.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.hearts.add(heart);
  }

  private createFourthHeartPowerup(worldX: number, rooftopTopY: number): void {
    const powerup = this.add
      .image(worldX, rooftopTopY - FOURTH_POWERUP_SIZE / 2, 'heart2')
      .setDisplaySize(FOURTH_POWERUP_SIZE, FOURTH_POWERUP_SIZE)
      .setOrigin(0.5, 0.5)
      .setDepth(12)
      .setTint(0x9be7ff);

    this.physics.add.existing(powerup, true);
    (powerup.body as Phaser.Physics.Arcade.StaticBody).setSize(FOURTH_POWERUP_SIZE - 2, FOURTH_POWERUP_SIZE - 2);
    (powerup.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.tweens.add({
      targets: powerup,
      scaleX: 1.14,
      scaleY: 1.14,
      yoyo: true,
      duration: 420,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.powerups.add(powerup);
    this.fourthPowerup = powerup;
    this.fourthPowerupSpawned = true;
  }

  private findRooftopTopYAtX(worldX: number): number | null {
    let bestTopY = Number.POSITIVE_INFINITY;

    for (const child of this.buildings.getChildren()) {
      const building = child as Phaser.Physics.Arcade.Image;
      const left = building.x - building.displayWidth / 2;
      const right = building.x + building.displayWidth / 2;
      if (worldX < left || worldX > right) continue;

      const topY = building.y - building.displayHeight / 2;
      if (topY < bestTopY) {
        bestTopY = topY;
      }
    }

    return Number.isFinite(bestTopY) ? bestTopY : null;
  }

  /**
   * Place a crane (khambaa) hanging from the top of the screen.
   * Origin is top-center so it hangs downward.
   */
  private createCrane(worldX: number): void {
    const img = this.add
      .image(worldX, 0, 'khambaa')
      .setOrigin(0.5, 0)
      .setDisplaySize(CRANE_DISPLAY_W, CRANE_DISPLAY_H);

    this.cranes.push({
      x: worldX,
      y: CRANE_DISPLAY_H, // bottom tip in world coords
      image: img,
    });
  }

  private isNearRescueTower(x: number): boolean {
    return !!this.rescueTower && Math.abs(x - this.rescueTower.x) <= GWEN_CRANE_EXCLUSION_RANGE;
  }

  private removeCranesNearRescueTower(): void {
    if (!this.rescueTower) return;

    const towerX = this.rescueTower.x;
    this.cranes = this.cranes.filter((crane) => {
      const near = Math.abs(crane.x - towerX) <= GWEN_CRANE_EXCLUSION_RANGE;
      if (near) {
        crane.image.destroy();
      }
      return !near;
    });
  }

  private createBuildings(): void {
    this.buildings = this.physics.add.staticGroup();
    this.hearts = this.add.group();
    this.powerups = this.add.group();
    this.fireballs = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.floorTile = this.add
      .tileSprite(400, this.floorY - 6, 800, 12, 'floor')
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0);

    this.deathZone = this.add.rectangle(0, this.floorY + 20, 1, 40, 0x000000, 0);
    this.physics.add.existing(this.deathZone, true);

    this.generateMoreBuildings();

    this.physics.world.setBounds(0, 0, 99999, 660);
    this.cameras.main.setBounds(0, 0, 99999, 600);
  }

  private createPortal(): void {
    this.portal = this.add
      .image(PORTAL_X, PORTAL_Y, 'spiral1')
      .setDisplaySize(PORTAL_SIZE, PORTAL_SIZE)
      .setOrigin(0.5, 0.5)
      .setDepth(9);

    this.portalInner = this.add
      .image(PORTAL_X, PORTAL_Y, 'spiral1')
      .setDisplaySize(PORTAL_SIZE * PORTAL_INNER_SCALE, PORTAL_SIZE * PORTAL_INNER_SCALE)
      .setOrigin(0.5, 0.5)
      .setDepth(10)
      .setAlpha(0.88);

    // Decorative only: no physics body, unreachable height.
    this.tweens.add({
      targets: [this.portal, this.portalInner],
      y: PORTAL_Y - 6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.portal,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear',
    });

    this.tweens.add({
      targets: this.portalInner,
      angle: -360,
      duration: 1900,
      repeat: -1,
      ease: 'Linear',
    });
  }

  private buildingIndex = 0;
  private seededRandom(): number {
    this.buildingIndex++;
    const x = Math.sin(this.buildingIndex * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  private generateMoreBuildings(): void {
    const targetX = this.player
      ? this.player.x + this.generateAhead
      : this.generateAhead;

    while (this.generatedUpToX < targetX) {
      const clusterSize = 4 + Math.floor(this.seededRandom() * 3);

      for (let i = 0; i < clusterSize; i++) {
        const w = MIN_BUILDING_WIDTH + Math.floor(this.seededRandom() * (MAX_BUILDING_WIDTH - MIN_BUILDING_WIDTH));
        const h = MIN_BUILDING_HEIGHT + Math.floor(this.seededRandom() * (MAX_BUILDING_HEIGHT - MIN_BUILDING_HEIGHT));

        const buildingLeftX = this.generatedUpToX;
        const buildingCenterX = buildingLeftX + w / 2;
        const buildingTopY = this.floorY - h;

        this.createBuilding(buildingLeftX, w, h, this.floorY);

        // Short building = hole → place a crane above it so player can swing across
        if (h < HOLE_HEIGHT_THRESHOLD && !this.isNearRescueTower(buildingCenterX)) {
          this.createCrane(buildingCenterX);
        }

        // Randomly spawn a heart on the rooftop (skip very short buildings)
        if (h >= 50 && this.seededRandom() < HEART_SPAWN_CHANCE) {
          this.createHeart(buildingCenterX, buildingTopY);
        }

        this.generatedUpToX += w;
        if (this.generatedUpToX >= targetX) break;
      }

      // Gap between clusters → always place a crane
      if (this.generatedUpToX < targetX) {
        const gap = 50 + Math.floor(this.seededRandom() * 60);
        const gapCenter = this.generatedUpToX + gap / 2;

        if (!this.isNearRescueTower(gapCenter)) {
          this.createCrane(gapCenter);
        }

        this.generatedUpToX += gap;
      }
    }

    const dzWidth = this.generatedUpToX + 400;
    this.deathZone.setPosition(dzWidth / 2, this.floorY + 20);
    this.deathZone.setSize(dzWidth, 40);
    (this.deathZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }

  // ── Player ──

  private createPlayer(): void {
    this.player = new Player(this, this.spawnX, this.spawnY);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.buildings);

    this.physics.add.overlap(this.player, this.deathZone, () => {
      this.respawnPlayer();
    });

    this.physics.add.overlap(this.player, this.hearts, (_player, heart) => {
      const heartImg = heart as Phaser.GameObjects.Image;
      this.heartEmitter.setPosition(heartImg.x, heartImg.y);
      this.heartEmitter.explode(2 + Math.floor(Math.random() * 2));
      heartImg.destroy();
      this.heartsCollected += 1;
      if (this.heartsCollected === 3) {
        this.thirdHeartCheckpointX = this.player.x;
        this.thirdHeartCheckpointY = this.player.y;
      }
      this.updateQuestUI();
    });

    this.physics.add.overlap(this.player, this.powerups, (_player, powerupObj) => {
      if (this.fourthPowerupCollected || this.rewindGlitchActive) return;

      const powerup = powerupObj as Phaser.GameObjects.Image;
      this.fourthPowerupCollected = true;
      this.fourthPowerupSpawned = false;
      this.fourthPowerup = null;

      this.heartEmitter.setPosition(powerup.x, powerup.y);
      this.heartEmitter.explode(8 + Math.floor(Math.random() * 3));
      powerup.destroy();
      this.updateQuestUI();
    });

    this.physics.add.overlap(this.player, this.fireballs, () => {
      if (!this.fireballChallengeStarted || this.fireballChallengeComplete || this.reunionInProgress) return;
      this.resetFireballChallenge();
      this.respawnPlayer();
    });
  }

  private respawnPlayer(): void {
    this.endSwing();
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.spawnX, this.spawnY);
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // ── Swing System ──

  private setupSwing(): void {
    this.webLine = this.add.graphics();
    this.webLine.setDepth(10);

    // Hearts drop from Spidy's hands when shooting web
    this.heartEmitter = this.add.particles(0, 0, 'heart2', {
      lifespan: 900,
      speed: { min: 60, max: 120 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.45, end: 0.1 },
      gravityY: 220,
      frequency: -1, // manual emit only
    }).setDepth(15);

    // E key to swing
    this.swingKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Mouse / touch click to swing
    this.input.on('pointerdown', () => {
      if (this.shouldPrioritizeFireballWeb()) {
        this.tryWebThrowFireball();
        return;
      }

      if (this.shouldPrioritizeGwenWeb()) {
        if (this.tryPullPlayerToTowerTop()) {
          return;
        }
        this.tryWebSaveGwen();
        return;
      }
      this.tryStartSwing();
    });
  }

  private createEndUI(): void {
    this.endText = this.add
      .text(400, 300, '', {
        fontSize: '26px',
        color: '#ffffff',
        align: 'center',
        stroke: '#111111',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setVisible(false);
  }

  private createQuestUI(): void {
    this.questText = this.add
      .text(784, 16, '', {
        fontSize: '13px',
        color: '#f8f8f8',
        align: 'right',
        stroke: '#111111',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(40);

    this.updateQuestUI();
  }

  private createGwenIntroBubble(): void {
    const bubble = this.add.rectangle(645, 96, 260, 98, 0xffffff, 0.94).setStrokeStyle(2, 0xd7d7d7);
    const puffA = this.add.circle(526, 122, 12, 0xffffff, 0.94).setStrokeStyle(2, 0xd7d7d7);
    const puffB = this.add.circle(508, 134, 8, 0xffffff, 0.94).setStrokeStyle(2, 0xd7d7d7);

    const gwenFace = this.add.image(548, 92, 'gwen').setDisplaySize(24, 30).setOrigin(0.5, 0.5);

    const message = this.add.text(
      656,
      96,
      "Spidey, I am trapped!\nFind me and save me!",
      { fontSize: '14px', color: '#1a1a1a', align: 'center' }
    ).setOrigin(0.5, 0.5);

    this.gwenIntroBubble = this.add.container(0, 0, [bubble, puffA, puffB, gwenFace, message]);
    this.gwenIntroBubble.setDepth(42);
    this.gwenIntroBubble.setScrollFactor(0);

    this.time.delayedCall(9000, () => {
      if (!this.gwenIntroBubble) return;
      this.tweens.add({
        targets: this.gwenIntroBubble,
        alpha: 0,
        duration: 550,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.gwenIntroBubble?.destroy();
          this.gwenIntroBubble = null;
        },
      });
    });
  }

  private maybeSpawnFourthHeartPowerup(): void {
    if (this.fourthPowerupCollected || this.fourthPowerupSpawned || this.heartsCollected < 3) return;

    const spawnX = this.player.x + FOURTH_POWERUP_SPAWN_AHEAD;
    const rooftopTopY = this.findRooftopTopYAtX(spawnX);
    if (rooftopTopY === null) return;

    this.createFourthHeartPowerup(spawnX, rooftopTopY);
    this.updateQuestUI();
  }

  private checkFourthPowerupMiss(): void {
    if (!this.fourthPowerupSpawned || this.fourthPowerupCollected || !this.fourthPowerup || this.rewindGlitchActive) {
      return;
    }

    if (this.player.x <= this.fourthPowerup.x + FOURTH_POWERUP_MISS_MARGIN) return;

    this.triggerFourthPowerupMissRewind();
  }

  private triggerFourthPowerupMissRewind(): void {
    if (this.rewindGlitchActive) return;

    this.rewindGlitchActive = true;
    this.endSwing();
    this.player.setVelocity(0, 0);
    this.player.isSwinging = true;

    const cam = this.cameras.main;
    const canvas = this.game.canvas as HTMLCanvasElement;
    const prevFilter = canvas.style.filter;
    canvas.style.filter = 'grayscale(1) contrast(1.45) brightness(0.8)';

    this.rewindOverlay = this.add
      .rectangle(400, 300, 800, 600, 0xffffff, 0.17)
      .setScrollFactor(0)
      .setDepth(120);

    this.rewindScanlines = this.add.graphics().setScrollFactor(0).setDepth(121);
    this.drawGlitchScanlines();

    cam.shake(REWIND_GLITCH_DURATION_MS, 0.007);

    const glitchTicks = Math.floor(REWIND_GLITCH_DURATION_MS / REWIND_GLITCH_TICK_MS);
    this.time.addEvent({
      delay: REWIND_GLITCH_TICK_MS,
      repeat: glitchTicks,
      callback: () => {
        if (!this.rewindOverlay || !this.rewindScanlines) return;

        this.rewindOverlay.alpha = 0.08 + Math.random() * 0.3;
        this.rewindOverlay.x = 400 + Phaser.Math.Between(-6, 6);
        this.rewindOverlay.y = 300 + Phaser.Math.Between(-5, 5);
        this.drawGlitchScanlines();
      },
    });

    this.time.delayedCall(REWIND_GLITCH_DURATION_MS, () => {
      canvas.style.filter = prevFilter;
      cam.shakeEffect.reset();
      cam.setFollowOffset(0, 0);

      this.rewindOverlay?.destroy();
      this.rewindOverlay = null;
      this.rewindScanlines?.destroy();
      this.rewindScanlines = null;

      this.rewindToThirdHeartCheckpoint();
      this.rewindGlitchActive = false;
      this.player.isSwinging = false;
      this.updateQuestUI();
    });
  }

  private drawGlitchScanlines(): void {
    if (!this.rewindScanlines) return;

    this.rewindScanlines.clear();
    this.rewindScanlines.lineStyle(1, 0x000000, 0.08 + Math.random() * 0.12);
    for (let y = Phaser.Math.Between(0, 4); y < 600; y += 5) {
      const xJitter = Phaser.Math.Between(-12, 12);
      this.rewindScanlines.lineBetween(xJitter, y, 800 + xJitter, y);
    }
  }

  private rewindToThirdHeartCheckpoint(): void {
    this.heartsCollected = 3;
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.thirdHeartCheckpointX, this.thirdHeartCheckpointY);

    if (this.fourthPowerup) {
      this.fourthPowerup.destroy();
      this.fourthPowerup = null;
    }
    this.fourthPowerupSpawned = false;
    this.fourthPowerupCollected = false;

    this.gwenSpawned = false;
    this.gwenFalling = false;
    this.gwenPullingUp = false;
    this.playerPullingToTower = false;

    this.gwen?.destroy();
    this.gwen = null;
    this.rescueTower?.destroy();
    this.rescueTower = null;

    this.fireballChallengeStarted = false;
    this.fireballChallengeComplete = false;
    this.fireballSpawnQueued = false;
    this.fireballsDodged = 0;
    this.activeFireball?.destroy();
    this.activeFireball = null;
    for (const child of this.fireballs.getChildren()) {
      child.destroy();
    }
  }

  private updateQuestUI(): void {
    if (!this.questText) return;

    if (this.gameWon) {
      this.questText.setText('Mission Complete');
      return;
    }

    if (this.rewindGlitchActive) {
      this.questText.setText('Reality glitching...\nRewinding...');
      return;
    }

    if (this.reunionInProgress) {
      this.questText.setText('Saving Gwen...');
      return;
    }

    if (this.playerPullingToTower) {
      this.questText.setText('Web attached!\nPulling to tower top');
      return;
    }

    if (this.gwenPullingUp) {
      this.questText.setText('Webbing Gwen...\nPulling her up');
      return;
    }

    if (this.fireballChallengeStarted && !this.fireballChallengeComplete) {
      if (this.fireballsDodged < 3) {
        this.questText.setText(`Fireballs incoming!\nJump dodge ${this.fireballsDodged}/3`);
      } else {
        this.questText.setText('Giant fireball!\nPress E to web-throw');
      }
      return;
    }

    if (this.gwenSpawned && this.gwenFalling) {
      if (this.isPlayerOnTowerTopForSave()) {
        this.questText.setText('Gwen is falling!\nPress E to save her');
      } else {
        this.questText.setText('Gwen is falling!\nPress E to zip to top');
      }
      return;
    }

    if (this.gwenSpawned) {
      this.questText.setText('Rescue Gwen\nReach the tower top');
      return;
    }

    if (this.heartsCollected >= 3 && !this.fourthPowerupCollected) {
      if (this.fourthPowerupSpawned) {
        this.questText.setText('Critical Powerup!\nDo not miss it');
      } else {
        this.questText.setText('Powerup incoming...\nStay sharp');
      }
      return;
    }

    const hearts = Math.min(this.heartsCollected, GWEN_REQUIRED_HEARTS);
    this.questText.setText(`Find Gwen\nHearts ${hearts}/${GWEN_REQUIRED_HEARTS}`);
  }

  private shouldRunFireballChallenge(): boolean {
    if (!this.gwenSpawned || !this.rescueTower) return false;
    if (!this.fourthPowerupCollected) return false;
    if (this.fireballChallengeComplete) return false;

    return this.player.x >= this.rescueTower.x - FIREBALL_CHALLENGE_VIEW_X;
  }

  private maybeStartFireballChallenge(): void {
    if (!this.shouldRunFireballChallenge() || this.fireballChallengeStarted) return;

    this.fireballChallengeStarted = true;
    this.fireballsDodged = 0;
    this.activeFireball = null;
    this.fireballSpawnQueued = false;
    this.queueNextFireball(420);
    this.updateQuestUI();
  }

  private queueNextFireball(delayMs: number): void {
    if (!this.fireballChallengeStarted || this.fireballChallengeComplete || this.fireballSpawnQueued) return;

    this.fireballSpawnQueued = true;
    this.time.delayedCall(delayMs, () => {
      this.fireballSpawnQueued = false;
      if (!this.fireballChallengeStarted || this.fireballChallengeComplete || this.activeFireball) return;
      this.spawnFireball();
    });
  }

  private spawnFireball(): void {
    const isBig = this.fireballsDodged >= 3;
    const texture = 'bomb';
    const size = isBig ? FIREBALL_BIG_SIZE : FIREBALL_SMALL_SIZE;
    const speed = isBig ? FIREBALL_BIG_SPEED : FIREBALL_SMALL_SPEED;

    const startX = this.player.x + FIREBALL_SPAWN_AHEAD;
    const startY = this.player.y - (isBig ? 8 : 12);

    const ball = this.fireballs.create(startX, startY, texture) as Phaser.Physics.Arcade.Image;
    ball.setDisplaySize(size, size);
    ball.setDepth(18);
    ball.setVelocity(-speed, 0);
    ball.setData('isBig', isBig);
    ball.setData('webbed', false);

    const body = ball.body as Phaser.Physics.Arcade.Body;
    body.setCircle(size * 0.38);
    body.setOffset(size * 0.12, size * 0.12);

    this.activeFireball = ball;
    this.updateQuestUI();
  }

  private updateFireballChallenge(): void {
    if (!this.fireballChallengeStarted || this.fireballChallengeComplete) return;

    if (!this.activeFireball || !this.activeFireball.active) {
      this.activeFireball = null;
      if (!this.fireballSpawnQueued) {
        this.queueNextFireball(450);
      }
      return;
    }

    this.activeFireball.angle += this.activeFireball.getData('isBig') ? 6 : 9;

    if (!this.activeFireball.getData('isBig') && this.activeFireball.x < this.player.x - 70) {
      this.activeFireball.destroy();
      this.activeFireball = null;
      this.fireballsDodged += 1;
      this.updateQuestUI();
      this.queueNextFireball(380);
      return;
    }

    if (this.activeFireball.getData('isBig') && this.activeFireball.x < this.player.x - 160) {
      this.resetFireballChallenge();
      this.respawnPlayer();
    }
  }

  private tryWebThrowFireball(): boolean {
    if (!this.fireballChallengeStarted || this.fireballChallengeComplete || !this.activeFireball) return false;
    if (!this.activeFireball.active || !this.activeFireball.getData('isBig')) return false;
    if (this.activeFireball.getData('webbed')) return false;

    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y - 24,
      this.activeFireball.x,
      this.activeFireball.y
    );

    if (dist > FIREBALL_WEB_THROW_RANGE) return false;

    this.activeFireball.setData('webbed', true);
    this.activeFireball.setVelocity(0, 0);
    this.activeFireball.setDepth(24);

    const web = this.add.image(
      (this.player.x + this.activeFireball.x) / 2,
      (this.player.y - 24 + this.activeFireball.y) / 2,
      'web2'
    ).setDepth(22);

    const updateWeb = () => {
      if (!this.activeFireball) return;
      const px = this.player.x;
      const py = this.player.y - 24;
      const fx = this.activeFireball.x;
      const fy = this.activeFireball.y;
      web.setPosition((px + fx) / 2, (py + fy) / 2);
      web.setDisplaySize(Math.max(18, Phaser.Math.Distance.Between(px, py, fx, fy)), GWEN_WEB_VISUAL_HEIGHT);
      web.setRotation(Phaser.Math.Angle.Between(px, py, fx, fy));
    };

    updateWeb();

    const orbitCenterX = this.player.x;
    const orbitCenterY = this.player.y - 24;
    const startAngle = Phaser.Math.Angle.Between(
      orbitCenterX,
      orbitCenterY,
      this.activeFireball.x,
      this.activeFireball.y
    );

    const orbitObj = { t: 0 };
    this.tweens.add({
      targets: orbitObj,
      t: 1,
      duration: FIREBALL_ORBIT_DURATION_MS,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!this.activeFireball) return;

        const a = startAngle + orbitObj.t * Math.PI * 2 * FIREBALL_ORBIT_TURNS;
        const cx = this.player.x;
        const cy = this.player.y - 24;
        this.activeFireball.setPosition(
          cx + Math.cos(a) * FIREBALL_ORBIT_RADIUS,
          cy + Math.sin(a) * FIREBALL_ORBIT_RADIUS
        );
        this.activeFireball.angle += 18;
        updateWeb();
      },
      onComplete: () => {
        if (!this.activeFireball) {
          web.destroy();
          return;
        }

        const targetX = this.rescueTower ? this.rescueTower.x : this.activeFireball.x + FIREBALL_WEB_THROW_DIST;
        const targetY = this.rescueTower ? this.rescueTowerTopY + 40 : this.activeFireball.y - 40;

        this.tweens.add({
          targets: this.activeFireball,
          x: targetX,
          y: targetY,
          angle: this.activeFireball.angle + 720,
          duration: FIREBALL_THROW_TO_TOWER_MS,
          ease: 'Cubic.easeIn',
          onUpdate: () => updateWeb(),
          onComplete: () => {
            web.destroy();
            this.burstBombAt(targetX, targetY);
            this.activeFireball?.destroy();
            this.activeFireball = null;
            this.fireballChallengeComplete = true;
            this.updateQuestUI();
          },
        });
      },
    });

    return true;
  }

  private burstBombAt(x: number, y: number): void {
    this.cameras.main.shake(220, 0.004);

    const particles = this.add.particles(x, y, 'bomb', {
      lifespan: 480,
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.22, end: 0 },
      quantity: 18,
      gravityY: 240,
      blendMode: 'ADD',
    }).setDepth(25);

    this.time.delayedCall(520, () => particles.destroy());

    const flash = this.add.circle(x, y, 26, 0xffe6a3, 0.8).setDepth(26);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.6,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private resetFireballChallenge(): void {
    this.activeFireball?.destroy();
    this.activeFireball = null;
    this.fireballSpawnQueued = false;
    this.fireballsDodged = 0;
    this.fireballChallengeStarted = this.shouldRunFireballChallenge();

    for (const child of this.fireballs.getChildren()) {
      child.destroy();
    }

    if (this.fireballChallengeStarted) {
      this.queueNextFireball(420);
    }

    this.updateQuestUI();
  }

  private shouldPrioritizeGwenWeb(): boolean {
    if (!this.gwen || !this.gwenSpawned || this.gameWon || this.reunionInProgress) {
      return false;
    }

    return this.gwenFalling || this.gwenPullingUp || this.playerPullingToTower;
  }

  private shouldPrioritizeFireballWeb(): boolean {
    return !!(
      this.fireballChallengeStarted &&
      !this.fireballChallengeComplete &&
      this.activeFireball &&
      this.activeFireball.active &&
      this.activeFireball.getData('isBig')
    );
  }

  private isPlayerOnTowerTopForSave(): boolean {
    if (!this.rescueTower) return false;

    const nearTopY = this.player.y <= this.rescueTowerTopY + GWEN_SAVE_TOP_Y_TOLERANCE;
    const nearTopX = Math.abs(this.player.x - this.rescueTower.x) <= GWEN_SAVE_TOP_X_TOLERANCE;
    return nearTopY && nearTopX;
  }

  private maybeSpawnGwen(): void {
    if (this.gwenSpawned || this.heartsCollected < GWEN_REQUIRED_HEARTS || this.player.x < GWEN_MIN_SPAWN_X) {
      return;
    }

    const towerX = this.player.x + GWEN_SPAWN_AHEAD;
    const towerY = this.floorY - GWEN_TOWER_HEIGHT / 2;

    this.rescueTower = this.physics.add
      .staticImage(towerX, towerY, 'building1')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(GWEN_TOWER_WIDTH, GWEN_TOWER_HEIGHT);
    this.rescueTower.refreshBody();
    this.buildings.add(this.rescueTower);

    this.rescueTowerTopY = this.floorY - GWEN_TOWER_HEIGHT;
    this.removeCranesNearRescueTower();

    this.gwen = this.physics.add
      .image(towerX, this.rescueTowerTopY + 1, 'gwen')
      .setDisplaySize(GWEN_DISPLAY_W, GWEN_DISPLAY_H)
      .setOrigin(0.5, 1)
      .setDepth(8);
    this.gwen.setVelocity(0, 0);
    const gwenBody = this.gwen.body as Phaser.Physics.Arcade.Body;
    gwenBody.setAllowGravity(false);
    gwenBody.setImmovable(true);

    this.gwenSpawned = true;
    this.updateQuestUI();
  }

  private updateWinCondition(): void {
    if (this.gameWon || this.reunionInProgress || !this.gwen || !this.rescueTower) return;
    if (this.shouldRunFireballChallenge() && !this.fireballChallengeComplete) return;

    if (!this.gwenFalling) {
      const nearTowerX = Math.abs(this.player.x - this.rescueTower.x) <= GWEN_TRIGGER_RANGE_X;
      const nearTowerY = this.player.y <= this.rescueTowerTopY + GWEN_TRIGGER_RANGE_Y;
      if (nearTowerX && nearTowerY) {
        this.startGwenFall();
      }
      return;
    }

    if (this.gwenPullingUp) return;

    const gwenBody = this.gwen.body as Phaser.Physics.Arcade.Body;
    this.gwen.setVelocity(gwenBody.velocity.x, GWEN_FALL_SPEED);

    if (this.gwen.y >= this.floorY + 10) {
      this.resetGwenOnTower();
    }
  }

  private startGwenFall(): void {
    if (!this.gwen || !this.rescueTower) return;
    if (this.gwenPullingUp) return;

    this.gwenFalling = true;
    // Jump away from Spidey: opposite direction of where Spidey is relative to Gwen.
    const dir = this.player.x <= this.gwen.x ? 1 : -1;
    const fallX = this.rescueTower.x + dir * (GWEN_TOWER_WIDTH / 2 + 18);
    this.gwen.x = fallX;

    const gwenBody = this.gwen.body as Phaser.Physics.Arcade.Body;
    gwenBody.setImmovable(false);
    gwenBody.setAllowGravity(false);
    this.gwen.setVelocity(dir * GWEN_FALL_DRIFT_X, GWEN_FALL_SPEED);
    this.updateQuestUI();
  }

  private resetGwenOnTower(): void {
    if (!this.gwen || !this.rescueTower) return;

    this.gwenFalling = false;
    this.gwen.setPosition(this.rescueTower.x, this.rescueTowerTopY + 1);
    this.gwen.setVelocity(0, 0);
    const gwenBody = this.gwen.body as Phaser.Physics.Arcade.Body;
    gwenBody.setImmovable(true);
    gwenBody.setAllowGravity(false);
    this.updateQuestUI();
  }

  private tryWebSaveGwen(): boolean {
    if (
      !this.gwen ||
      !this.rescueTower ||
      !this.gwenFalling ||
      this.gwenPullingUp ||
      this.reunionInProgress ||
      this.gameWon
    ) {
      return false;
    }

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y - 10, this.gwen.x, this.gwen.y - 10);
    if (dist > GWEN_WEB_SAVE_RANGE || !this.isPlayerOnTowerTopForSave()) {
      return false;
    }

    this.shootWebToGwenAndPullUp();
    return true;
  }

  private tryPullPlayerToTowerTop(): boolean {
    if (!this.gwenFalling || !this.rescueTower || this.playerPullingToTower || this.gwenPullingUp || this.gameWon || this.reunionInProgress) {
      return false;
    }

    if (this.isPlayerOnTowerTopForSave()) {
      return false;
    }

    const towerAnchorX = this.rescueTower.x;
    const towerAnchorY = this.rescueTowerTopY + 2;
    const distToAnchor = Phaser.Math.Distance.Between(this.player.x, this.player.y - 24, towerAnchorX, towerAnchorY);
    if (distToAnchor > PLAYER_TOWER_PULL_RANGE) {
      return false;
    }

    this.endSwing();
    this.player.isSwinging = true;
    this.playerPullingToTower = true;
    this.updateQuestUI();

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    this.player.setVelocity(0, 0);

    const web = this.add
      .image((this.player.x + towerAnchorX) / 2, (this.player.y - 24 + towerAnchorY) / 2, 'web2')
      .setDepth(22);
    web.setDisplaySize(Math.max(18, distToAnchor), GWEN_WEB_VISUAL_HEIGHT);
    web.setRotation(Phaser.Math.Angle.Between(this.player.x, this.player.y - 24, towerAnchorX, towerAnchorY));

    this.tweens.add({
      targets: this.player,
      x: towerAnchorX,
      y: this.rescueTowerTopY + 4,
      duration: 460,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        const curPX = this.player.x;
        const curPY = this.player.y - 24;
        web.setPosition((curPX + towerAnchorX) / 2, (curPY + towerAnchorY) / 2);
        web.setDisplaySize(
          Math.max(18, Phaser.Math.Distance.Between(curPX, curPY, towerAnchorX, towerAnchorY)),
          GWEN_WEB_VISUAL_HEIGHT
        );
        web.setRotation(Phaser.Math.Angle.Between(curPX, curPY, towerAnchorX, towerAnchorY));
      },
      onComplete: () => {
        this.playerPullingToTower = false;
        this.player.isSwinging = false;
        playerBody.setAllowGravity(true);
        this.player.setVelocity(0, 0);
        web.destroy();
        this.updateQuestUI();
      },
    });

    return true;
  }

  private shootWebToGwenAndPullUp(): void {
    if (!this.gwen || !this.rescueTower) return;

    this.gwenFalling = false;
    this.gwenPullingUp = true;
    this.gwen.setVelocity(0, 0);

    const px = this.player.x;
    const py = this.player.y - 24;
    const gx = this.gwen.x;
    const gy = this.gwen.y - 10;

    const web = this.add.image((px + gx) / 2, (py + gy) / 2, 'web2').setDepth(22);
    web.setDisplaySize(Math.max(18, Phaser.Math.Distance.Between(px, py, gx, gy)), GWEN_WEB_VISUAL_HEIGHT);
    web.setRotation(Phaser.Math.Angle.Between(px, py, gx, gy));

    this.tweens.add({
      targets: this.gwen,
      x: this.rescueTower.x,
      y: this.rescueTowerTopY + 1,
      duration: 560,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        if (!this.gwen) return;

        const curPX = this.player.x;
        const curPY = this.player.y - 24;
        const curGX = this.gwen.x;
        const curGY = this.gwen.y - 10;

        web.setPosition((curPX + curGX) / 2, (curPY + curGY) / 2);
        web.setDisplaySize(
          Math.max(18, Phaser.Math.Distance.Between(curPX, curPY, curGX, curGY)),
          GWEN_WEB_VISUAL_HEIGHT
        );
        web.setRotation(Phaser.Math.Angle.Between(curPX, curPY, curGX, curGY));
      },
      onComplete: () => {
        if (!this.gwen) {
          web.destroy();
          return;
        }

        this.gwenPullingUp = false;
        this.gwenFalling = false;

        const gwenBody = this.gwen.body as Phaser.Physics.Arcade.Body;
        gwenBody.setImmovable(true);
        gwenBody.setAllowGravity(false);
        this.gwen.setVelocity(0, 0);

        web.destroy();
        this.heartEmitter.setPosition(this.gwen.x, this.gwen.y - 20);
        this.heartEmitter.explode(6 + Phaser.Math.Between(0, 2));
        this.startReunion();
      },
    });
  }

  private startReunion(): void {
    if (!this.gwen) return;

    this.reunionInProgress = true;
    this.updateQuestUI();

    this.endSwing();
    this.player.isSwinging = false;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    const gwenBody = this.gwen.body as Phaser.Physics.Arcade.Body;
    gwenBody.setAllowGravity(false);
    gwenBody.setImmovable(true);

    // Prevent player input/movement during the reunion moment.
    this.player.isSwinging = true;

    this.tweens.add({
      targets: this.player,
      x: this.gwen.x - 18,
      y: this.gwen.y,
      duration: REUNION_DURATION_MS,
      ease: 'Sine.easeInOut',
      onStart: () => {
        this.heartEmitter.setPosition(this.gwen!.x, this.gwen!.y - 30);
        this.heartEmitter.explode(6);
      },
      onComplete: () => {
        this.playReunionJumps(Phaser.Math.Between(2, 3));
      },
    });

    this.tweens.add({
      targets: this.gwen,
      y: this.gwen.y - 8,
      duration: REUNION_DURATION_MS / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  private playReunionJumps(remainingJumps: number): void {
    if (!this.gwen) {
      this.finishWinState();
      return;
    }

    if (remainingJumps <= 0) {
      this.finishWinState();
      return;
    }

    this.heartEmitter.setPosition((this.player.x + this.gwen.x) / 2, this.gwen.y - 24);
    this.heartEmitter.explode(5 + Phaser.Math.Between(0, 2));

    this.tweens.add({
      targets: [this.player, this.gwen],
      y: `-=${REUNION_JUMP_HEIGHT}`,
      duration: REUNION_JUMP_UP_MS,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 30,
      onComplete: () => {
        this.playReunionJumps(remainingJumps - 1);
      },
    });
  }

  private finishWinState(): void {
    this.gameWon = true;
    this.reunionInProgress = false;
    this.updateQuestUI();

    this.physics.pause();
    this.endText.setText('You saved Gwen!\nPress R to restart').setVisible(true);
  }

  /** Find the nearest crane tip within range and start swinging */
  private tryStartSwing(): void {
    if (this.gameWon || this.reunionInProgress || this.rewindGlitchActive) return;
    if (this.fireballChallengeStarted && !this.fireballChallengeComplete) return;
    if (this.player.isSwinging) return;

    const px = this.player.x;
    const py = this.player.y - 24; // roughly player center

    let nearest: CranePoint | null = null;
    let nearestDist = Infinity;

    for (const crane of this.cranes) {
      const dx = crane.x - px;
      const dy = crane.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = crane;
      }
    }

    if (nearest && nearestDist <= SWING_DETECT_RANGE) {
      this.startSwing(nearest);
    }
  }

  private startSwing(crane: CranePoint): void {
    this.swingTarget = crane;
    this.swingTimer = 0;
    this.player.isSwinging = true;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // Direction: push player forward (towards and past the crane)
    const dirX = crane.x >= this.player.x ? 1 : -1;
    this.player.setVelocity(SWING_BOOST_X * dirX, SWING_BOOST_Y);

    // Hearts drop from Spidy's hands when shooting web
    this.heartEmitter.setPosition(this.player.x, this.player.y - 20);
    this.heartEmitter.explode(2 + Math.floor(Math.random() * 2)); // 2–3 hearts
  }

  private endSwing(): void {
    if (!this.swingTarget) return;

    this.swingTarget = null;
    this.swingTimer = 0;
    this.player.isSwinging = false;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);

    this.webLine.clear();
  }

  private updateSwing(delta: number): void {
    if (this.rewindGlitchActive) {
      this.webLine.clear();
      return;
    }

    // Check for E key press
    if (Phaser.Input.Keyboard.JustDown(this.swingKey)) {
      if (this.shouldPrioritizeFireballWeb()) {
        this.tryWebThrowFireball();
        return;
      }

      if (this.shouldPrioritizeGwenWeb()) {
        if (this.tryPullPlayerToTowerTop()) {
          return;
        }
        this.tryWebSaveGwen();
        return;
      }
      if (this.tryWebSaveGwen()) {
        return;
      }
      this.tryStartSwing();
    }

    if (!this.swingTarget) {
      this.webLine.clear();
      return;
    }

    this.swingTimer += delta;

    // During swing: gradually add gravity-like downward pull for the arc feel
    const progress = this.swingTimer / SWING_DURATION_MS;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Ease the vertical velocity from boost upward to downward (arc)
    const arcGravity = 400 * progress;
    body.setVelocityY(SWING_BOOST_Y + arcGravity * 2);

    // Draw web line from player to crane tip
    this.webLine.clear();
    this.webLine.lineStyle(2, 0xffffff, 1);
    this.webLine.lineBetween(
      this.player.x,
      this.player.y - 24,
      this.swingTarget.x,
      this.swingTarget.y
    );

    // Auto-release after duration
    if (this.swingTimer >= SWING_DURATION_MS) {
      // Give a final momentum boost on release
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      this.endSwing();
      // Keep momentum after release
      this.player.setVelocity(vx * 1.1, Math.min(vy, -100));
    }
  }

  // ── UI ──

  private addControlsHint(): void {
    const hint = this.add
      .text(16, 16, 'WASD: Move | W/Space: Jump | E/Click: Swing | E near Gwen: Save', {
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

  // ── Game Loop ──

  update(_time: number, delta: number): void {
    if (this.gameWon) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    if (this.rewindGlitchActive) {
      return;
    }

    if (this.reunionInProgress) {
      return;
    }

    // Parallax
    const camX = this.cameras.main.scrollX;
    this.parallaxScroll += (camX - this.lastCamX) * PARALLAX_SPEED;
    this.lastCamX = camX;
    this.updateParallaxVisual(camX);

    // Floor tile
    this.floorTile.x = camX + 400;
    this.floorTile.tilePositionX = camX;

    // Generate more world
    if (this.player && this.player.x + this.generateAhead > this.generatedUpToX) {
      this.generateMoreBuildings();
    }

    // Swing system
    this.updateSwing(delta);

    // 4th-heart powerup flow
    this.maybeSpawnFourthHeartPowerup();
    this.checkFourthPowerupMiss();

    // Gwen flow
    this.maybeSpawnGwen();
    this.maybeStartFireballChallenge();
    this.updateFireballChallenge();
    this.updateWinCondition();
  }
}
