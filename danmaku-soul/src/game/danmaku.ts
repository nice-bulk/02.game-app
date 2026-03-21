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

export function getSequence(phase: number): AttackStep[] {
  if (phase === 3) return SEQUENCE_P3;
  if (phase === 2) return SEQUENCE_P2;
  return SEQUENCE_P1;
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

/**
 * 固定シーケンスに基づいて弾幕を生成
 * skillName は呼び出し元が SEQUENCE から取得して表示する
 */
export function generateDanmaku(
  boss: Boss,
  nextId: () => number,
  frame: number,
  seqIdx: number,
  playerPos: { x: number; y: number },
  easyFactor = 1.0,
): Bullet[] {
  const phase = boss.phase;
  const seq = getSequence(phase);
  const step = seq[seqIdx % seq.length];

  // 技名に応じてパターンを選択
  if (step.skillName === '魂の散弾' || step.skillName === '魂の乱舞' || step.skillName === '終焉の弾幕') {
    const bullets = patternRadial(boss, nextId, frame, easyFactor);
    if (step.skillName === '終焉の弾幕') {
      // 終焉の弾幕: バースト同時
      return [...bullets, ...patternBurst(boss, nextId, easyFactor)];
    }
    return bullets;
  }
  if (step.skillName === '螺旋の怨念' || step.skillName === '業火の螺旋') {
    return patternSpiral(boss, nextId, frame, easyFactor);
  }
  if (step.skillName === '怒りの扇' || step.skillName === '怒髪天の嵐') {
    return patternAimed(boss, nextId, playerPos, easyFactor);
  }
  if (step.skillName === '滅びの十字') {
    return patternCross(boss, nextId, seqIdx, easyFactor);
  }
  // fallback
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
