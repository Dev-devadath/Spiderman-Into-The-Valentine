import Phaser from 'phaser';

const SPEED = 160;
const JUMP_VELOCITY = -330;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; w: Phaser.Input.Keyboard.Key };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_temp');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(32, 48);
    this.setOrigin(0.5, 1);
    this.setupPhysics();
    this.setupInput();
  }

  private setupPhysics(): void {
    this.body?.setSize(28, 46);
    this.body?.setOffset(2, 2);
    this.setCollideWorldBounds(true);
  }

  private setupInput(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    const keyboard = this.scene.input.keyboard!;
    this.keys = {
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };
  }

  preUpdate(): void {
    this.handleMovement();
  }

  private handleMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const jump = this.cursors.up.isDown || this.keys.w.isDown || this.cursors.space.isDown;

    if (left && !right) {
      this.setVelocityX(-SPEED);
    } else if (right && !left) {
      this.setVelocityX(SPEED);
    } else {
      this.setVelocityX(0);
    }

    if (jump && body.blocked.down) {
      this.setVelocityY(JUMP_VELOCITY);
    }
  }
}
