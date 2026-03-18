// 弾幕パターン生成モジュール

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

// ---- パターン定義 ----

/** 回転放射（既存） */
function patternRadial(boss: Boss, nextId: () => number, frame: number): Bullet[] {
  const phase = boss.phase;
  let count = 12;
  let speed = 1.8;
  let rotSpeed = 0.01;
  if (phase === 2) { count = 16; speed = 2.4; rotSpeed = 0.02; }
  if (phase === 3) { count = 20; speed = rand(2.5, 3.2); rotSpeed = 0.03; }

  const bullets: Bullet[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + frame * rotSpeed;
    const s = phase === 3 ? rand(2.2, 3.2) : speed;
    bullets.push({
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * s, y: Math.sin(angle) * s },
      radius: BULLET_RADIUS,
      type: 'normal',
      fromBoss: true,
      parryWindowTimer: 0,
    });
  }
  return bullets;
}

/** 螺旋弾（Phase2以降） */
function patternSpiral(boss: Boss, nextId: () => number, frame: number): Bullet[] {
  const phase = boss.phase;
  const arms = phase === 3 ? 3 : 2;
  const speed = phase === 3 ? 2.8 : 2.2;
  const rotSpeed = phase === 3 ? 0.06 : 0.045;
  const bullets: Bullet[] = [];
  for (let arm = 0; arm < arms; arm++) {
    const angle = (Math.PI * 2 / arms) * arm + frame * rotSpeed;
    bullets.push({
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal',
      fromBoss: true,
      parryWindowTimer: 0,
    });
  }
  return bullets;
}

/** 扇形狙い撃ち（プレイヤー方向に扇状） */
function patternAimed(
  boss: Boss,
  nextId: () => number,
  playerPos: { x: number; y: number },
): Bullet[] {
  const phase = boss.phase;
  const count = phase === 3 ? 7 : 5;
  const spread = phase === 3 ? 0.55 : 0.45;
  const speed = phase === 3 ? 2.8 : 2.2;

  const dx = playerPos.x - boss.pos.x;
  const dy = playerPos.y - boss.pos.y;
  const baseAngle = Math.atan2(dy, dx);

  const bullets: Bullet[] = [];
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (i - (count - 1) / 2) * (spread / (count - 1));
    bullets.push({
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal',
      fromBoss: true,
      parryWindowTimer: 0,
    });
  }
  return bullets;
}

/** 十字＋斜め交互（Phase3専用） */
function patternCross(boss: Boss, nextId: () => number, shotCount: number): Bullet[] {
  const count = 8;
  const speed = 2.6;
  const rotOffset = (shotCount % 2 === 0) ? 0 : Math.PI / 8;
  const bullets: Bullet[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + rotOffset;
    bullets.push({
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal',
      fromBoss: true,
      parryWindowTimer: 0,
    });
  }
  return bullets;
}

/** バースト（全方位散弾 少数高速） Phase3 */
function patternBurst(boss: Boss, nextId: () => number): Bullet[] {
  const count = 24;
  const bullets: Bullet[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const speed = rand(1.8, 4.2);
    bullets.push({
      id: nextId(),
      pos: { x: boss.pos.x, y: boss.pos.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: BULLET_RADIUS,
      type: 'normal',
      fromBoss: true,
      parryWindowTimer: 0,
    });
  }
  return bullets;
}

// ---- エクスポート ----

/** パターンを選択して弾幕を生成 */
export function generateDanmaku(
  boss: Boss,
  nextId: () => number,
  frame: number,
  shotCount: number,
  playerPos: { x: number; y: number },
): Bullet[] {
  const phase = boss.phase;

  if (phase === 1) {
    // Phase1: 放射のみ
    return patternRadial(boss, nextId, frame);
  }

  if (phase === 2) {
    // Phase2: 放射 / 螺旋 / 扇形 をローテーション
    const pattern = shotCount % 3;
    if (pattern === 0) return patternRadial(boss, nextId, frame);
    if (pattern === 1) return patternSpiral(boss, nextId, frame);
    return patternAimed(boss, nextId, playerPos);
  }

  // Phase3: 4種をローテーション
  const pattern = shotCount % 4;
  if (pattern === 0) return patternRadial(boss, nextId, frame);
  if (pattern === 1) return patternSpiral(boss, nextId, frame);
  if (pattern === 2) return patternCross(boss, nextId, shotCount);
  if (pattern === 3) {
    // バースト＋扇形を同時
    return [...patternBurst(boss, nextId), ...patternAimed(boss, nextId, playerPos)];
  }
  return patternRadial(boss, nextId, frame);
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
