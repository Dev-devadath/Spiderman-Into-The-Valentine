import Phaser from 'phaser';

const SPEED = 160;
const JUMP_VELOCITY = -330;
const CLIMB_SPEED = 120;

/** Display size for the sprite (scaled up from pixel art source) */
const DISPLAY_WIDTH = 32;
const DISPLAY_HEIGHT = 48;
const RUN_TEXTURE = 'sidewayspidey';

/** Breathing animation: spi1 (head up) + sp2 (head down) loop when idle */
const BREATH_IDLE_DELAY_MS = 1200;
const BREATH_FRAME_DURATION_MS = 650;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
  };

  private idleTime = 0;
  private breathFrame = 0;
  private lastBreathTime = 0;

  /** True while the player is mid-swing (movement handled externally) */
  public isSwinging = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'spi1');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    this.setOrigin(0.5, 1);
    this.setupPhysics();
    this.setupInput();
  }

  private setupPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const fw = this.frame.width;
    const fh = this.frame.height;

    const bodyW = Math.round(fw * 0.5);
    const bodyH = Math.round(fh * 0.85);
    const offsetX = Math.round((fw - bodyW) / 2);
    const offsetY = fh - bodyH;

    body.setSize(bodyW, bodyH);
    body.setOffset(offsetX, offsetY);
    this.setCollideWorldBounds(true);
  }

  private setupInput(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    const keyboard = this.scene.input.keyboard!;
    this.keys = {
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    };
  }

  preUpdate(_time: number, delta: number): void {
    if (!this.isSwinging) {
      this.handleMovement();
    }
    this.updateBreathing(delta);
  }

  private updateBreathing(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const isRunning = Math.abs(body.velocity.x) > 1 && !this.isSwinging;
    const isIdle =
      this.body!.velocity.x === 0 &&
      this.body!.velocity.y === 0 &&
      body.blocked.down &&
      !this.isSwinging &&
      !(body.blocked.left || body.blocked.right);

    // Keep running texture active while moving horizontally.
    if (isRunning) {
      this.idleTime = 0;
      return;
    }

    if (!isIdle) {
      this.idleTime = 0;
      this.setTexture('spi1');
      this.setFlipX(false);
      return;
    }

    this.idleTime += delta;
    if (this.idleTime < BREATH_IDLE_DELAY_MS) return;

    const now = this.idleTime;
    if (now - this.lastBreathTime >= BREATH_FRAME_DURATION_MS) {
      this.lastBreathTime = now;
      this.breathFrame = 1 - this.breathFrame;
      this.setTexture(this.breathFrame === 0 ? 'spi1' : 'sp2');
      this.setFlipX(false);
    }
  }

  private handleMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const up = this.cursors.up.isDown || this.keys.w.isDown;
    const down = this.cursors.down.isDown || this.keys.s.isDown;
    const jump = up || this.cursors.space.isDown;

    const canClimb = (body.blocked.left || body.blocked.right) && !body.blocked.down;

    if (canClimb) {
      body.setAllowGravity(false);
      this.setVelocityX(0);
      this.setVelocityY(up ? -CLIMB_SPEED : down ? CLIMB_SPEED : 0);
    } else {
      body.setAllowGravity(true);
      if (left && !right) {
        this.setVelocityX(-SPEED);
        this.setTexture(RUN_TEXTURE);
        this.setFlipX(true);
      } else if (right && !left) {
        this.setVelocityX(SPEED);
        this.setTexture(RUN_TEXTURE);
        this.setFlipX(false);
      } else {
        this.setVelocityX(0);
      }

      if (jump && body.blocked.down) {
        this.setVelocityY(JUMP_VELOCITY);
      }
    }
  }
}
