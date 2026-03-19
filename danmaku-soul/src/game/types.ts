// ゲーム内で使用する型定義

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  isRolling: boolean;
  rollTimer: number;
  rollCooldown: number;
  invincible: boolean;
  parryInvincible: boolean;  // パリィ由来の無敵（点滅しない）
  hitFlash: number;
  reflexFlash: number;
  // スタック
  stack: number;
  maxStack: number;
  // ビーム攻撃
  isFiringBeam: boolean;
  beamCooldown: number;
  // 必殺技
  ultActive: boolean;
  ultTimer: number;
}

export interface Boss {
  pos: Vec2;
  vel: Vec2;           // 移動速度ベクトル（新規）
  moveDirTimer: number; // 移動方向変更タイマー（新規）
  radius: number;
  hp: number;
  maxHp: number;
  phase: number;
  poise: number;
  maxPoise: number;
  poiseRecoverTimer: number;
  shootTimer: number;
  bombTimer: number;          // ボム投擲タイマー
  stunTimer: number;
  telegraphTimer: number;
  telegraphActive: boolean;
  bombTelegraphActive: boolean; // ボム予兆
  bombTelegraphTimer: number;
  hitFlash: number;
  // フェーズ移行演出
  phaseTransitionTimer: number;
  lastPhase: number;
}

// ボム = パリィ可能な巨大弾
export type BulletType = 'normal' | 'bomb';

// 弾幕パターン種別
export type DanmakuPattern = 'radial' | 'spiral' | 'aimed' | 'burst' | 'cross';

export interface Bullet {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  type: BulletType;
  fromBoss: boolean;
  parryWindowTimer: number;
}

export interface Beam {
  id: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export type GamePhase = 'title' | 'playing' | 'paused' | 'dead' | 'victory';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  roll: boolean;          // Space: HP回復
  beamFire: boolean;      // 左クリック長押し
  parry: boolean;         // 右クリック（押下中フラグ）
  parryFrames: number;    // パリィ有効残りフレーム（右クリック押下で20フレームセット）
  ultimate: boolean;      // ホイールクリック
  mouseX: number;
  mouseY: number;
}
