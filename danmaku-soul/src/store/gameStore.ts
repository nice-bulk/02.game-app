import { create } from 'zustand';
import type { Player, Boss, Bullet, Beam, Particle, GamePhase, InputState, ClearResult, BossId } from '../game/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  PLAYER_RADIUS, PLAYER_MAX_HP, PLAYER_MAX_STAMINA,
  BOSS_RADIUS, BOSS_MAX_HP, BOSS_MAX_POISE,
  IRON_MAX_HP, IRON_RADIUS, IRON_MAX_POISE,
  VOID_MAX_HP, VOID_RADIUS, VOID_MAX_POISE,
  MAX_STACK,
  RANK_S_TIME, RANK_A_TIME, RANK_B_TIME,
} from '../game/constants';

interface ScreenShake {
  intensity: number;
  duration: number;
}

interface HitstopState {
  frames: number;
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  boss: Boss;
  bullets: Bullet[];
  beams: Beam[];
  particles: Particle[];
  input: InputState;
  bulletIdCounter: number;
  particleIdCounter: number;
  beamIdCounter: number;
  screenShake: ScreenShake;
  hitstop: HitstopState;
  ultFlashTimer: number;

  // スコア・リザルト用
  runCount: number;
  parryCount: number;
  tookDamage: boolean;
  startFrame: number;
  clearResult: ClearResult | null;

  // ボス選択
  selectedBossId: BossId;

  setPhase: (p: GamePhase) => void;
  setPlayer: (fn: (p: Player) => Player) => void;
  setBoss: (fn: (b: Boss) => Boss) => void;
  setBullets: (fn: (b: Bullet[]) => Bullet[]) => void;
  setBeams: (fn: (b: Beam[]) => Beam[]) => void;
  addParticles: (particles: Particle[]) => void;
  tickParticles: () => void;
  setInput: (input: InputState) => void;
  nextBulletId: () => number;
  nextParticleId: () => number;
  nextBeamId: () => number;
  addScreenShake: (intensity: number, duration: number) => void;
  tickScreenShake: () => void;
  setHitstop: (frames: number) => void;
  tickHitstop: () => boolean;
  triggerUltFlash: () => void;
  tickUltFlash: () => void;
  incrementParry: () => void;
  markDamageTaken: () => void;
  finishGame: (currentFrame: number) => void;
  selectBoss: (id: BossId) => void;
  resetGame: () => void;
}

const initialPlayer = (): Player => ({
  pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 },
  vel: { x: 0, y: 0 },
  radius: PLAYER_RADIUS,
  hp: PLAYER_MAX_HP,
  maxHp: PLAYER_MAX_HP,
  stamina: PLAYER_MAX_STAMINA,
  maxStamina: PLAYER_MAX_STAMINA,
  isRolling: false,
  rollTimer: 0,
  rollCooldown: 0,
  invincible: false,
  parryInvincible: false,
  hitFlash: 0,
  reflexFlash: 0,
  stack: 0,
  maxStack: MAX_STACK,
  isFiringBeam: false,
  beamCooldown: 0,
  ultActive: false,
  ultTimer: 0,
});

const initialBoss = (bossId: BossId = 'ancient_soul'): Boss => {
  const hp     = bossId === 'void_wraith' ? VOID_MAX_HP    : bossId === 'iron_sentinel' ? IRON_MAX_HP    : BOSS_MAX_HP;
  const radius = bossId === 'void_wraith' ? VOID_RADIUS    : bossId === 'iron_sentinel' ? IRON_RADIUS    : BOSS_RADIUS;
  const poise  = bossId === 'void_wraith' ? VOID_MAX_POISE : bossId === 'iron_sentinel' ? IRON_MAX_POISE : BOSS_MAX_POISE;
  return {
    pos: { x: CANVAS_WIDTH / 2, y: 160 },
    vel: { x: 0.8, y: 0.3 },
    moveDirTimer: 0,
    radius,
    hp, maxHp: hp,
    phase: 1, lastPhase: 1,
    poise, maxPoise: poise,
    poiseRecoverTimer: 0,
    attackSeqIndex: 0,
    shootTimer: 0, bombTimer: 0,
    stunTimer: 0,
    telegraphTimer: 0, telegraphActive: false,
    bombTelegraphActive: false, bombTelegraphTimer: 0,
    hitFlash: 0,
    skillNameTimer: 0, skillName: '',
    phaseTransitionTimer: 0,
  };
};

function calcRank(
  clearTimeSec: number,
  parryCount: number,
  tookDamage: boolean,
): ClearResult['rank'] {
  if (!tookDamage && clearTimeSec <= RANK_S_TIME) return 'S';
  if (clearTimeSec <= RANK_A_TIME && parryCount >= 4)  return 'A';
  if (clearTimeSec <= RANK_B_TIME)                     return 'B';
  return 'C';
}

let _bulletId = 0;
let _particleId = 0;
let _beamId = 0;

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  player: initialPlayer(),
  boss: initialBoss(),
  bullets: [],
  beams: [],
  particles: [],
  input: {
    up: false, down: false, left: false, right: false,
    roll: false, beamFire: false, parry: false, parryFrames: 0, ultimate: false,
    mouseX: CANVAS_WIDTH / 2, mouseY: CANVAS_HEIGHT / 2,
  },
  bulletIdCounter: 0,
  particleIdCounter: 0,
  beamIdCounter: 0,
  screenShake: { intensity: 0, duration: 0 },
  hitstop: { frames: 0 },
  ultFlashTimer: 0,
  runCount: 0,
  parryCount: 0,
  tookDamage: false,
  startFrame: 0,
  clearResult: null,
  selectedBossId: 'ancient_soul',

  setPhase: (p) => set({ phase: p }),
  setPlayer: (fn) => set((s) => ({ player: fn(s.player) })),
  setBoss: (fn) => set((s) => ({ boss: fn(s.boss) })),
  setBullets: (fn) => set((s) => ({ bullets: fn(s.bullets) })),
  setBeams: (fn) => set((s) => ({ beams: fn(s.beams) })),
  addParticles: (newParticles) => set((s) => ({ particles: [...s.particles, ...newParticles] })),
  tickParticles: () =>
    set((s) => ({
      particles: s.particles
        .map((p) => ({ ...p, pos: { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y }, life: p.life - 1 }))
        .filter((p) => p.life > 0),
    })),
  setInput: (input) => set({ input }),
  nextBulletId: () => ++_bulletId,
  nextParticleId: () => ++_particleId,
  nextBeamId: () => ++_beamId,
  addScreenShake: (intensity, duration) =>
    set((s) => ({
      screenShake: {
        intensity: Math.max(s.screenShake.intensity, intensity),
        duration: Math.max(s.screenShake.duration, duration),
      },
    })),
  tickScreenShake: () =>
    set((s) => ({
      screenShake:
        s.screenShake.duration > 0
          ? { intensity: s.screenShake.intensity * 0.9, duration: s.screenShake.duration - 1 }
          : { intensity: 0, duration: 0 },
    })),
  setHitstop: (frames) => set({ hitstop: { frames } }),
  tickHitstop: () => {
    const { hitstop } = get();
    if (hitstop.frames > 0) {
      set({ hitstop: { frames: hitstop.frames - 1 } });
      return true;
    }
    return false;
  },
  triggerUltFlash: () => set({ ultFlashTimer: 40 }),
  tickUltFlash: () => set((s) => ({ ultFlashTimer: Math.max(0, s.ultFlashTimer - 1) })),
  incrementParry: () => set((s) => ({ parryCount: s.parryCount + 1 })),
  markDamageTaken: () => set({ tookDamage: true }),
  finishGame: (currentFrame: number) => {
    const s = get();
    const clearTimeSec = Math.floor((currentFrame - s.startFrame) / 60);
    const rank = calcRank(clearTimeSec, s.parryCount, s.tookDamage);
    set({
      clearResult: {
        clearTimeSec,
        parryCount: s.parryCount,
        tookDamage: s.tookDamage,
        runCount: s.runCount,
        rank,
      },
    });
  },
  selectBoss: (id: BossId) => set({ selectedBossId: id }),
  resetGame: () => {
    _bulletId = 0;
    _particleId = 0;
    _beamId = 0;
    const s = get();
    set({
      phase: 'playing',
      player: initialPlayer(),
      boss: initialBoss(s.selectedBossId),
      bullets: [],
      beams: [],
      particles: [],
      screenShake: { intensity: 0, duration: 0 },
      hitstop: { frames: 0 },
      ultFlashTimer: 0,
      runCount: s.runCount + 1,
      parryCount: 0,
      tookDamage: false,
      startFrame: 0,
      clearResult: null,
    });
  },
}));
