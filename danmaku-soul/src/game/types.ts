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
  vel: Vec2;
  moveDirTimer: number;
  radius: number;
  hp: number;
  maxHp: number;
  phase: number;
  poise: number;
  maxPoise: number;
  poiseRecoverTimer: number;
  // 固定攻撃シーケンス
  attackSeqIndex: number;    // 現在の攻撃シーケンス番号
  shootTimer: number;
  bombTimer: number;
  stunTimer: number;
  telegraphTimer: number;
  telegraphActive: boolean;
  bombTelegraphActive: boolean;
  bombTelegraphTimer: number;
  hitFlash: number;
  // 技名表示
  skillNameTimer: number;    // 技名表示残りフレーム
  skillName: string;         // 表示する技名
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

// クリア後のリザルト
export interface ClearResult {
  clearTimeSec: number;   // クリアタイム（秒）
  parryCount: number;     // パリィ成功回数
  tookDamage: boolean;    // ダメージを受けたか
  runCount: number;       // 何回目の挑戦か
  rank: 'S' | 'A' | 'B' | 'C';
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  roll: boolean;
  beamFire: boolean;
  parry: boolean;
  parryFrames: number;
  ultimate: boolean;
  mouseX: number;
  mouseY: number;
}
