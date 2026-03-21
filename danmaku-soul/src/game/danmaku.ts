// 弾幕パターン生成モジュール（固定シーケンス覚えゲー方式）

import type { Boss, Bullet } from './types';
import { BULLET_RADIUS, BOMB_RADIUS, BOMB_SPEED, PARRY_WINDOW } from './constants';

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

// ================================================================
// 攻撃シーケンス定義
// フェーズごとに固定の順番で技が出る（死んで覚える）
// ================================================================

export interface AttackStep {
  type: 'danmaku' | 'bomb';
  skillName: string;          // 画面に表示される技名
  telegraphFrames: number;    // 予兆フレーム数
}

// Phase1: 3技ループ（基本を学ぶ）
export const SEQUENCE_P1: AttackStep[] = [
  { type: 'danmaku', skillName: '魂の散弾',   telegraphFrames: 30 },
  { type: 'bomb',    skillName: '滅魂爆弾',   telegraphFrames: 50 },
  { type: 'danmaku', skillName: '螺旋の怨念', telegraphFrames: 30 },
  { type: 'bomb',    skillName: '滅魂爆弾',   telegraphFrames: 50 },
];

// Phase2: 5技ループ（パターンが増える）
export const SEQUENCE_P2: AttackStep[] = [
  { type: 'danmaku', skillName: '業火の螺旋',   telegraphFrames: 25 },
  { type: 'danmaku', skillName: '怒りの扇',     telegraphFrames: 25 },
  { type: 'bomb',    skillName: '業焔爆弾',     telegraphFrames: 45 },
  { type: 'danmaku', skillName: '業火の螺旋',   telegraphFrames: 25 },
  { type: 'bomb',    skillName: '業焔爆弾',     telegraphFrames: 45 },
];

// Phase3: 6技ループ（全力・緊張感MAX）
export const SEQUENCE_P3: AttackStep[] = [
  { type: 'danmaku', skillName: '滅びの十字',   telegraphFrames: 20 },
  { type: 'danmaku', skillName: '魂の乱舞',     telegraphFrames: 18 },
  { type: 'bomb',    skillName: '魂滅爆炎弾',   telegraphFrames: 40 },
  { type: 'danmaku', skillName: '怒髪天の嵐',  telegraphFrames: 18 },
  { type: 'bomb',    skillName: '魂滅爆炎弾',   telegraphFrames: 40 },
  { type: 'danmaku', skillName: '終焉の弾幕',   telegraphFrames: 15 },
];

// ---- ANCIENT SOUL シーケンス取得 ----
export function getSequence(phase: number): AttackStep[] {
  if (phase === 3) return SEQUENCE_P3;
  if (phase === 2) return SEQUENCE_P2;
  return SEQUENCE_P1;
}

// ================================================================
// IRON SENTINEL シーケンス（機械型・十字・速射）
// ================================================================
export const IRON_SEQ_P1: AttackStep[] = [
  { type: 'danmaku', skillName: '機械十字砲',   telegraphFrames: 25 },
  { type: 'danmaku', skillName: '追尾弾幕',     telegraphFrames: 25 },
  { type: 'bomb',    skillName: '誘導爆弾',     telegraphFrames: 40 },
  { type: 'danmaku', skillName: '機械十字砲',   telegraphFrames: 25 },
];
export const IRON_SEQ_P2: AttackStep[] = [
  { type: 'danmaku', skillName: '高速十字砲',   telegraphFrames: 20 },
  { type: 'danmaku', skillName: '追尾連射',     telegraphFrames: 20 },
  { type: 'bomb',    skillName: '誘導爆弾',     telegraphFrames: 35 },
  { type: 'danmaku', skillName: '回転ガトリング', telegraphFrames: 20 },
  { type: 'bomb',    skillName: '誘導爆弾',     telegraphFrames: 35 },
];
export const IRON_SEQ_P3: AttackStep[] = [
  { type: 'danmaku', skillName: '殲滅十字砲',   telegraphFrames: 15 },
  { type: 'danmaku', skillName: '全方位ガトリング', telegraphFrames: 15 },
  { type: 'bomb',    skillName: '高速誘導弾',   telegraphFrames: 28 },
  { type: 'danmaku', skillName: '追尾乱射',     telegraphFrames: 15 },
  { type: 'bomb',    skillName: '高速誘導弾',   telegraphFrames: 28 },
  { type: 'danmaku', skillName: '最終兵装',     telegraphFrames: 12 },
];

export function getIronSequence(phase: number): AttackStep[] {
  if (phase === 3) return IRON_SEQ_P3;
  if (phase === 2) return IRON_SEQ_P2;
  return IRON_SEQ_P1;
}

// ================================================================
// VOID WRAITH シーケンス（虚無型・散弾・高速ボム）
// ================================================================
export const VOID_SEQ_P1: AttackStep[] = [
  { type: 'danmaku', skillName: '虚無の散弾',   telegraphFrames: 35 },
  { type: 'bomb',    skillName: '暗黒爆弾',     telegraphFrames: 55 },
  { type: 'danmaku', skillName: '闇の螺旋',     telegraphFrames: 35 },
  { type: 'bomb',    skillName: '暗黒爆弾',     telegraphFrames: 55 },
];
export const VOID_SEQ_P2: AttackStep[] = [
  { type: 'danmaku', skillName: '虚空展開',     telegraphFrames: 28 },
  { type: 'danmaku', skillName: '闇の追尾',     telegraphFrames: 28 },
  { type: 'bomb',    skillName: '虚無爆弾',     telegraphFrames: 45 },
  { type: 'danmaku', skillName: '次元亀裂',     telegraphFrames: 28 },
  { type: 'bomb',    skillName: '虚無爆弾',     telegraphFrames: 45 },
];
export const VOID_SEQ_P3: AttackStep[] = [
  { type: 'danmaku', skillName: '崩壊の散弾',   telegraphFrames: 20 },
  { type: 'danmaku', skillName: '次元断裂',     telegraphFrames: 18 },
  { type: 'bomb',    skillName: '深淵爆弾',     telegraphFrames: 38 },
  { type: 'danmaku', skillName: '虚無の終焉',   telegraphFrames: 15 },
  { type: 'bomb',    skillName: '深淵爆弾',     telegraphFrames: 38 },
  { type: 'danmaku', skillName: '宇宙消滅',     telegraphFrames: 12 },
];

export function getVoidSequence(phase: number): AttackStep[] {
  if (phase === 3) return VOID_SEQ_P3;
  if (phase === 2) return VOID_SEQ_P2;
  return VOID_SEQ_P1;
}

// ================================================================
// パターン実装
// easyFactor: 慣らし難易度係数（1.0=通常、0.65など=やさしい）
// ================================================================

function patternRadial(
  boss: Boss, nextId: () => number, frame: number, easyFactor: number,
): Bullet[] {
  const phase = boss.phase;
  let count = Math.floor((phase === 3 ? 20 : phase === 2 ? 16 : 12) * easyFactor);
  count = Math.max(6, count);
  const speed = (phase === 3 ? 2.8 : phase === 2 ? 2.4 : 1.8) * easyFactor;
  const rotSpeed = phase === 3 ? 0.03 : phase === 2 ? 0.02 : 0.01;

  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 / count) * i + frame * rotSpeed;
    return {
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal' as const,
      fromBoss: true,
      parryWindowTimer: 0,
    };
  });
}

function patternSpiral(
  boss: Boss, nextId: () => number, frame: number, easyFactor: number,
): Bullet[] {
  const phase = boss.phase;
  const arms = phase === 3 ? 3 : 2;
  const speed = (phase === 3 ? 2.8 : 2.2) * easyFactor;
  const rotSpeed = phase === 3 ? 0.06 : 0.045;

  return Array.from({ length: arms }, (_, arm) => {
    const angle = (Math.PI * 2 / arms) * arm + frame * rotSpeed;
    return {
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal' as const,
      fromBoss: true,
      parryWindowTimer: 0,
    };
  });
}

function patternAimed(
  boss: Boss, nextId: () => number,
  playerPos: { x: number; y: number }, easyFactor: number,
): Bullet[] {
  const phase = boss.phase;
  const count = Math.floor((phase === 3 ? 7 : 5) * easyFactor);
  const spread = phase === 3 ? 0.55 : 0.45;
  const speed = (phase === 3 ? 2.8 : 2.2) * easyFactor;
  const baseAngle = Math.atan2(
    playerPos.y - boss.pos.y,
    playerPos.x - boss.pos.x,
  );

  return Array.from({ length: Math.max(3, count) }, (_, i) => {
    const angle = baseAngle + (i - (count - 1) / 2) * (spread / (count - 1));
    return {
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal' as const,
      fromBoss: true,
      parryWindowTimer: 0,
    };
  });
}

function patternCross(
  boss: Boss, nextId: () => number, seqIdx: number, easyFactor: number,
): Bullet[] {
  const count = 8;
  const speed = 2.6 * easyFactor;
  const rotOffset = (seqIdx % 2 === 0) ? 0 : Math.PI / 8;

  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 / count) * i + rotOffset;
    return {
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal' as const,
      fromBoss: true,
      parryWindowTimer: 0,
    };
  });
}

function patternBurst(
  boss: Boss, nextId: () => number, easyFactor: number,
): Bullet[] {
  const count = Math.floor(24 * easyFactor);
  return Array.from({ length: Math.max(12, count) }, (_, i) => {
    const angle = (Math.PI * 2 / count) * i;
    const speed = rand(1.8, 4.2) * easyFactor;
    return {
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal' as const,
      fromBoss: true,
      parryWindowTimer: 0,
    };
  });
}

// ================================================================
// 公開API
// ================================================================

// 技名 → パターンのマッピング表
const SKILL_PATTERN: Record<string, 'radial' | 'spiral' | 'aimed' | 'cross' | 'burst' | 'burst+aimed' | 'cross+aimed'> = {
  // Ancient Soul
  '魂の散弾':   'radial',
  '螺旋の怨念': 'spiral',
  '業火の螺旋': 'spiral',
  '怒りの扇':   'aimed',
  '怒髪天の嵐': 'aimed',
  '滅びの十字': 'cross',
  '魂の乱舞':   'radial',
  '終焉の弾幕': 'burst+aimed',
  // Iron Sentinel
  '機械十字砲':     'cross',
  '追尾弾幕':       'aimed',
  '高速十字砲':     'cross',
  '追尾連射':       'aimed',
  '回転ガトリング': 'radial',
  '殲滅十字砲':     'cross',
  '全方位ガトリング': 'radial',
  '追尾乱射':       'aimed',
  '最終兵装':       'cross+aimed',
  // Void Wraith
  '虚無の散弾': 'burst',
  '闇の螺旋':   'spiral',
  '虚空展開':   'radial',
  '闇の追尾':   'aimed',
  '次元亀裂':   'burst',
  '崩壊の散弾': 'burst',
  '次元断裂':   'burst+aimed',
  '虚無の終焉': 'radial',
  '宇宙消滅':   'burst+aimed',
};

/**
 * 固定シーケンスに基づいて弾幕を生成
 */
export function generateDanmaku(
  boss: Boss,
  nextId: () => number,
  frame: number,
  seqIdx: number,
  playerPos: { x: number; y: number },
  easyFactor = 1.0,
  bossId: import('./types').BossId = 'ancient_soul',
): Bullet[] {
  const phase = boss.phase;
  let seq: AttackStep[];
  if (bossId === 'iron_sentinel') seq = getIronSequence(phase);
  else if (bossId === 'void_wraith') seq = getVoidSequence(phase);
  else seq = getSequence(phase);

  const step = seq[seqIdx % seq.length];
  const pattern = SKILL_PATTERN[step.skillName] ?? 'radial';

  if (pattern === 'radial')      return patternRadial(boss, nextId, frame, easyFactor);
  if (pattern === 'spiral')      return patternSpiral(boss, nextId, frame, easyFactor);
  if (pattern === 'aimed')       return patternAimed(boss, nextId, playerPos, easyFactor);
  if (pattern === 'cross')       return patternCross(boss, nextId, seqIdx, easyFactor);
  if (pattern === 'burst')       return patternBurst(boss, nextId, easyFactor);
  if (pattern === 'burst+aimed') return [...patternBurst(boss, nextId, easyFactor), ...patternAimed(boss, nextId, playerPos, easyFactor)];
  if (pattern === 'cross+aimed') return [...patternCross(boss, nextId, seqIdx, easyFactor), ...patternAimed(boss, nextId, playerPos, easyFactor)];
  return patternRadial(boss, nextId, frame, easyFactor);
}

/** ボム生成 */
export function generateBomb(
  boss: Boss,
  playerPos: { x: number; y: number },
  nextId: () => number,
): Bullet {
  const dir = normalize(playerPos.x - boss.pos.x, playerPos.y - boss.pos.y);
  return {
    id: nextId(),
    pos: { x: boss.pos.x, y: boss.pos.y },
    vel: { x: dir.x * BOMB_SPEED, y: dir.y * BOMB_SPEED },
    radius: BOMB_RADIUS,
    type: 'bomb',
    fromBoss: true,
    parryWindowTimer: PARRY_WINDOW,
  };
}
