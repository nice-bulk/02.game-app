import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../game/useGameLoop';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ULT_DURATION, PHASE_TRANSITION_DURATION } from '../game/constants';
import type { Player, Boss, Bullet, Beam, Particle } from '../game/types';

// ============================
// 必殺技 — 発動フラッシュ
// ============================
function drawUltFlash(ctx: CanvasRenderingContext2D, ultFlashTimer: number) {
  if (ultFlashTimer <= 0) return;
  const t = ultFlashTimer / 40; // 1→0
  ctx.save();

  // 白→金のフラッシュオーバーレイ
  const flashAlpha = t < 0.5 ? t * 2 : (1 - t) * 2;
  ctx.fillStyle = `rgba(255, 230, 100, ${flashAlpha * 0.55})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 画面四隅から中心へ収束するライン
  const lineAlpha = flashAlpha * 0.9;
  ctx.strokeStyle = `rgba(255, 220, 50, ${lineAlpha})`;
  ctx.lineWidth = 3;
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const reach = (1 - t) * Math.sqrt(cx * cx + cy * cy) * 1.2;
  const corners = [
    [0, 0], [CANVAS_WIDTH, 0],
    [0, CANVAS_HEIGHT], [CANVAS_WIDTH, CANVAS_HEIGHT],
  ];
  for (const [ox, oy] of corners) {
    const dx = cx - ox; const dy = cy - oy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ex = ox + (dx / len) * reach;
    const ey = oy + (dy / len) * reach;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 12;
    ctx.stroke();
  }

  ctx.restore();
}

// ============================
// 必殺技 — 持続中オーラ（プレイヤー周囲）
// ============================
function drawUltAura(ctx: CanvasRenderingContext2D, player: Player) {
  if (!player.ultActive) return;
  const { pos, radius, ultTimer } = player;
  const t = Date.now();
  const ratio = ultTimer / ULT_DURATION;

  ctx.save();

  // 外側の大きなグロー
  const pulseOuter = Math.sin(t * 0.006) * 0.3 + 0.7;
  const grdOuter = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 5);
  grdOuter.addColorStop(0,   `rgba(255, 200, 0, ${pulseOuter * 0.35})`);
  grdOuter.addColorStop(0.5, `rgba(255, 120, 0, ${pulseOuter * 0.15})`);
  grdOuter.addColorStop(1,   'rgba(255, 60, 0, 0)');
  ctx.fillStyle = grdOuter;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius * 5, 0, Math.PI * 2);
  ctx.fill();

  // 回転する剣気リング（3本の弧）
  const rotSpeed = t * 0.004;
  for (let i = 0; i < 3; i++) {
    const baseAngle = rotSpeed + (Math.PI * 2 / 3) * i;
    const arcR = radius + 14 + Math.sin(t * 0.01 + i) * 3;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, arcR, baseAngle, baseAngle + Math.PI * 0.8);
    ctx.strokeStyle = `rgba(255, 220, 60, ${0.7 + Math.sin(t * 0.01 + i) * 0.3})`;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 14;
    ctx.stroke();
  }

  // 逆回転する内リング（細め）
  const rotSpeed2 = -t * 0.003;
  for (let i = 0; i < 4; i++) {
    const baseAngle = rotSpeed2 + (Math.PI * 2 / 4) * i;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 6, baseAngle, baseAngle + Math.PI * 0.4);
    ctx.strokeStyle = `rgba(255, 255, 160, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.stroke();
  }

  // 残り時間タイマーリング（残り少なくなると点滅）
  const blinkFactor = ratio < 0.3
    ? (Math.sin(t * 0.03) * 0.5 + 0.5)
    : 1;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius + 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
  ctx.strokeStyle = `rgba(255, 200, 0, ${0.9 * blinkFactor})`;
  ctx.lineWidth = 4;
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = ratio < 0.3 ? 20 * blinkFactor : 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 稲妻（ランダム小枝）
  if (Math.random() < 0.4) {
    const lAngle = Math.random() * Math.PI * 2;
    const lR1 = radius + 8;
    const lR2 = radius + 28 + Math.random() * 20;
    ctx.beginPath();
    ctx.moveTo(pos.x + Math.cos(lAngle) * lR1, pos.y + Math.sin(lAngle) * lR1);
    // ジグザグ中間点
    const midAngle = lAngle + (Math.random() - 0.5) * 0.6;
    const midR = (lR1 + lR2) / 2;
    ctx.lineTo(pos.x + Math.cos(midAngle) * midR, pos.y + Math.sin(midAngle) * midR);
    ctx.lineTo(pos.x + Math.cos(lAngle) * lR2, pos.y + Math.sin(lAngle) * lR2);
    ctx.strokeStyle = `rgba(255, 255, 200, ${Math.random() * 0.6 + 0.3})`;
    ctx.lineWidth = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.stroke();
  }

  ctx.restore();
}

// ============================
// 背景描画（強化版）
// ============================
function drawBackground(ctx: CanvasRenderingContext2D, frame: number, bossPhase: number) {
  ctx.save();

  // 基本グリッド（奥行き感のある2層）
  const gridSize = 40;
  const speed1 = (frame * 0.4) % gridSize;
  const speed2 = (frame * 0.15) % (gridSize * 2);

  // 遠景グリッド（薄い）
  ctx.strokeStyle = `rgba(60, 20, 80, 0.18)`;
  ctx.lineWidth = 0.5;
  for (let x = -gridSize; x < CANVAS_WIDTH + gridSize; x += gridSize * 2) {
    ctx.beginPath();
    ctx.moveTo(x + speed2, 0);
    ctx.lineTo(x + speed2, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = -gridSize * 2; y < CANVAS_HEIGHT + gridSize * 2; y += gridSize * 2) {
    ctx.beginPath();
    ctx.moveTo(0, y + speed2);
    ctx.lineTo(CANVAS_WIDTH, y + speed2);
    ctx.stroke();
  }

  // 近景グリッド
  const gridAlpha = bossPhase === 3 ? 0.35 : bossPhase === 2 ? 0.28 : 0.22;
  ctx.strokeStyle = `rgba(80, 30, 100, ${gridAlpha})`;
  ctx.lineWidth = 0.8;
  for (let x = -gridSize; x < CANVAS_WIDTH + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + speed1, 0);
    ctx.lineTo(x + speed1, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = -gridSize; y < CANVAS_HEIGHT + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + speed1);
    ctx.lineTo(CANVAS_WIDTH, y + speed1);
    ctx.stroke();
  }

  // スキャンライン（CRTエフェクト）
  const scanAlpha = 0.04;
  ctx.fillStyle = `rgba(0, 0, 0, ${scanAlpha})`;
  for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
    ctx.fillRect(0, y, CANVAS_WIDTH, 2);
  }

  ctx.restore();
}

// ============================
// フェーズ移行エフェクト
// ============================
function drawPhaseTransition(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
) {
  if (boss.phaseTransitionTimer <= 0) return;

  const progress = boss.phaseTransitionTimer / PHASE_TRANSITION_DURATION;
  const ease = Math.sin(progress * Math.PI); // ベルカーブ

  ctx.save();

  // 画面端から中央へ走るフラッシュライン
  const lineColor = boss.phase === 3 ? `rgba(255, 30, 0, ${ease * 0.7})` : `rgba(255, 100, 0, ${ease * 0.6})`;
  const lineCount = 8;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < lineCount; i++) {
    const y = (CANVAS_HEIGHT / lineCount) * i + (CANVAS_HEIGHT / lineCount / 2);
    const xLen = CANVAS_WIDTH * (1 - progress) * ease;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - xLen / 2, y);
    ctx.lineTo(CANVAS_WIDTH / 2 + xLen / 2, y);
    ctx.stroke();
  }

  // 全画面フラッシュ
  const flashAlpha = ease * (boss.phase === 3 ? 0.22 : 0.15);
  ctx.fillStyle = boss.phase === 3
    ? `rgba(200, 0, 0, ${flashAlpha})`
    : `rgba(220, 80, 0, ${flashAlpha})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // ボス周囲リング
  const ringRadius = boss.radius + 60 * ease;
  ctx.beginPath();
  ctx.arc(boss.pos.x, boss.pos.y, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = boss.phase === 3
    ? `rgba(255, 50, 0, ${ease * 0.8})`
    : `rgba(255, 120, 0, ${ease * 0.8})`;
  ctx.lineWidth = 4 * ease;
  ctx.stroke();

  ctx.restore();
}

// ============================
// プレイヤー描画
// ============================
function drawPlayer(ctx: CanvasRenderingContext2D, player: Player) {
  const { pos, radius, isRolling, hitFlash, reflexFlash, invincible, parryInvincible, ultActive } = player;
  ctx.save();

  // ultAura は drawUltAura() で先に描画済み

  if (reflexFlash > 0) {
    const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 3);
    grd.addColorStop(0, `rgba(0, 255, 180, ${reflexFlash / 30 * 0.6})`);
    grd.addColorStop(1, 'rgba(0, 255, 180, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 被弾無敵中のみ点滅（パリィ無敵は点滅しない）
  if (invincible && !parryInvincible && !isRolling && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

  if (hitFlash > 0) {
    ctx.fillStyle = '#ff8888';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 18;
  } else if (ultActive) {
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 25;
  } else if (isRolling) {
    ctx.fillStyle = '#88ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
  } else {
    ctx.fillStyle = '#e8e8ff';
    ctx.shadowColor = '#8888ff';
    ctx.shadowBlur = 10;
  }
  ctx.fill();
  ctx.strokeStyle = ultActive ? '#ffcc00' : isRolling ? '#00ffff' : '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

// ============================
// ビーム描画
// ============================
function drawBeams(ctx: CanvasRenderingContext2D, beams: Beam[], ultActive: boolean) {
  for (const beam of beams) {
    const alpha = beam.life / beam.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(beam.originX, beam.originY);
    ctx.lineTo(beam.targetX, beam.targetY);
    ctx.strokeStyle = ultActive ? 'rgba(255, 200, 0, 0.3)' : 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = ultActive ? 22 : 16;
    ctx.lineCap = 'round';
    ctx.shadowColor = ultActive ? '#ffcc00' : '#44aaff';
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(beam.originX, beam.originY);
    ctx.lineTo(beam.targetX, beam.targetY);
    ctx.strokeStyle = ultActive ? '#ffffff' : '#aaeeff';
    ctx.lineWidth = ultActive ? 4 : 3;
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.restore();
  }
}

// ============================
// ボス描画（移動軌跡エフェクト追加）
// ============================
function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss) {
  const { pos, radius, hp, maxHp, phase, poise, maxPoise, stunTimer,
    telegraphActive, bombTelegraphActive, hitFlash, phaseTransitionTimer } = boss;
  const hpRatio = hp / maxHp;
  const isTransitioning = phaseTransitionTimer > 0;

  ctx.save();

  // 移動エフェクト（フェーズに応じた速度感を示す軌跡）
  if (phase >= 2) {
    const trailAlpha = phase === 3 ? 0.3 : 0.2;
    const trailDist = phase === 3 ? 20 : 12;
    const velNorm = Math.sqrt(boss.vel.x ** 2 + boss.vel.y ** 2);
    if (velNorm > 0.1) {
      const trailX = pos.x - (boss.vel.x / velNorm) * trailDist;
      const trailY = pos.y - (boss.vel.y / velNorm) * trailDist;
      const grd = ctx.createRadialGradient(trailX, trailY, 0, trailX, trailY, radius);
      const trailColor = phase === 3 ? `rgba(200, 0, 0, ${trailAlpha})` : `rgba(140, 40, 0, ${trailAlpha})`;
      grd.addColorStop(0, trailColor);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(trailX, trailY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // フェーズ移行中のパルスリング
  if (isTransitioning) {
    const progress = phaseTransitionTimer / PHASE_TRANSITION_DURATION;
    const pulse = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * (1.2 + pulse * 0.5), 0, Math.PI * 2);
    ctx.strokeStyle = phase === 3
      ? `rgba(255, 50, 0, ${pulse * 0.9})`
      : `rgba(255, 120, 0, ${pulse * 0.8})`;
    ctx.lineWidth = 6;
    ctx.shadowColor = phase === 3 ? '#ff2200' : '#ff6600';
    ctx.shadowBlur = 30;
    ctx.stroke();
  }

  // ボム予兆
  if (bombTelegraphActive) {
    const pulse = Math.sin(Date.now() * 0.03) * 0.4 + 0.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 50, 0, ${pulse})`;
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 20;
    ctx.stroke();
  }

  // 弾幕予兆
  if (telegraphActive) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.5, 0, Math.PI * 2);
    const alpha = Math.sin(Date.now() * 0.02) * 0.3 + 0.3;
    ctx.strokeStyle = `rgba(255, 100, 80, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // スタン
  if (stunTimer > 0) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 180, 0, ${stunTimer / 60 * 0.8})`;
    ctx.lineWidth = 10;
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 35;
    ctx.stroke();
  }

  // ボス本体
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

  let color1: string, color2: string;
  if (phase === 3) { color1 = '#cc2200'; color2 = '#ff4400'; }
  else if (phase === 2) { color1 = '#882200'; color2 = '#cc3300'; }
  else { color1 = '#552200'; color2 = '#883300'; }

  const grd = ctx.createRadialGradient(pos.x - radius * 0.3, pos.y - radius * 0.3, 0, pos.x, pos.y, radius);
  grd.addColorStop(0, color2);
  grd.addColorStop(1, color1);
  ctx.fillStyle = grd;
  ctx.shadowColor = hitFlash > 0 ? '#ffffff' : phase === 3 ? '#ff2200' : '#880000';
  ctx.shadowBlur = hitFlash > 0 ? 35 : 20;
  ctx.fill();

  // HP低下時のひびエフェクト
  if (hpRatio < 0.5) {
    ctx.strokeStyle = `rgba(255, 100, 0, ${(0.5 - hpRatio) * 2})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Date.now() * 0.001;
      ctx.beginPath();
      ctx.moveTo(pos.x + Math.cos(angle) * radius * 0.3, pos.y + Math.sin(angle) * radius * 0.3);
      ctx.lineTo(pos.x + Math.cos(angle) * radius, pos.y + Math.sin(angle) * radius);
      ctx.stroke();
    }
  }

  // 体幹ゲージ
  const poiseBarW = radius * 2;
  const poiseBarH = 6;
  const poiseX = pos.x - poiseBarW / 2;
  const poiseY = pos.y + radius + 12;
  const poiseRatio = poise / maxPoise;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(poiseX, poiseY, poiseBarW, poiseBarH);
  ctx.fillStyle = `hsl(${poiseRatio * 120}, 80%, 55%)`;
  ctx.fillRect(poiseX, poiseY, poiseBarW * poiseRatio, poiseBarH);
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = 1;
  ctx.strokeRect(poiseX, poiseY, poiseBarW, poiseBarH);

  ctx.fillStyle = 'rgba(255,180,100,0.9)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`PHASE ${phase}`, pos.x, poiseY + 20);

  ctx.restore();
}

// ============================
// 弾描画
// ============================
function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
  const { pos, radius, type, fromBoss, parryWindowTimer } = bullet;
  ctx.save();

  if (!fromBoss) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffcc44';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.strokeStyle = '#ffeeaa';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (type === 'bomb') {
    const canParry = parryWindowTimer > 0;
    const pulse = canParry ? Math.sin(Date.now() * 0.03) * 0.2 + 0.8 : 1;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = canParry
      ? `rgba(255, 120, 20, ${pulse * 0.3})`
      : 'rgba(180, 40, 0, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    const bombGrd = ctx.createRadialGradient(pos.x - radius * 0.3, pos.y - radius * 0.3, 0, pos.x, pos.y, radius);
    if (canParry) {
      bombGrd.addColorStop(0, '#ffaa44');
      bombGrd.addColorStop(0.6, '#ff5500');
      bombGrd.addColorStop(1, '#aa2200');
    } else {
      bombGrd.addColorStop(0, '#aa3300');
      bombGrd.addColorStop(1, '#551100');
    }
    ctx.fillStyle = bombGrd;
    ctx.shadowColor = canParry ? '#ff6600' : '#880000';
    ctx.shadowBlur = canParry ? 25 : 15;
    ctx.fill();
    ctx.strokeStyle = canParry ? '#ffcc66' : '#884422';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (canParry) {
      const ringR = radius + 10 + Math.sin(Date.now() * 0.05) * 4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 80, ${parryWindowTimer / 60 * 0.8})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 240, 180, ${parryWindowTimer / 60})`;
      ctx.fillText('⟳', pos.x, pos.y);
    }
  } else {
    // 通常弾（フェーズによって色変化）
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4422';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = '#ffaa88';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

// ============================
// パーティクル描画
// ============================
function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.life / p.maxLife;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
}

// ============================
// カーソル照準
// ============================
function drawCrosshair(ctx: CanvasRenderingContext2D, mx: number, my: number, ultActive: boolean) {
  ctx.save();
  ctx.strokeStyle = ultActive ? 'rgba(255, 200, 0, 0.8)' : 'rgba(100, 220, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = ultActive ? '#ffcc00' : '#44aaff';
  ctx.shadowBlur = 6;
  const size = 10;
  const gap = 4;
  ctx.beginPath();
  ctx.moveTo(mx - size - gap, my); ctx.lineTo(mx - gap, my);
  ctx.moveTo(mx + gap, my);       ctx.lineTo(mx + size + gap, my);
  ctx.moveTo(mx, my - size - gap); ctx.lineTo(mx, my - gap);
  ctx.moveTo(mx, my + gap);       ctx.lineTo(mx, my + size + gap);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx, my, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ============================
// GameCanvas コンポーネント
// ============================
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCountRef = useRef(0);

  useGameLoop(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.style.cursor = 'none';

    let raf: number;
    const render = () => {
      raf = requestAnimationFrame(render);
      frameCountRef.current++;

      const { player, boss, bullets, beams, particles, screenShake, input, ultFlashTimer } = useGameStore.getState();

      let shakeX = 0, shakeY = 0;
      if (screenShake.duration > 0) {
        shakeX = (Math.random() - 0.5) * screenShake.intensity * 2;
        shakeY = (Math.random() - 0.5) * screenShake.intensity * 2;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 背景
      ctx.fillStyle = '#060610';
      ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);
      drawBackground(ctx, frameCountRef.current, boss.phase);

      // ボス発光エリア（フェーズによって広がる）
      const bossGlowSize = boss.phase === 3 ? 280 : boss.phase === 2 ? 230 : 180;
      const bossGrd = ctx.createRadialGradient(boss.pos.x, boss.pos.y, 0, boss.pos.x, boss.pos.y, bossGlowSize);
      const bossAlpha = boss.phase === 3 ? 0.14 : boss.phase === 2 ? 0.09 : 0.05;
      bossGrd.addColorStop(0, `rgba(200, 50, 0, ${bossAlpha})`);
      bossGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bossGrd;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 必殺技中の画面エフェクト（微妙な金色オーバーレイ）
      if (player.ultActive) {
        const ultPulse = Math.sin(Date.now() * 0.005) * 0.025 + 0.025;
        ctx.fillStyle = `rgba(255, 160, 0, ${ultPulse})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 画面端の金色ビネット
        const vigGrd = ctx.createRadialGradient(
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.3,
          CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.85,
        );
        vigGrd.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrd.addColorStop(1, `rgba(180, 80, 0, ${0.18 + Math.sin(Date.now() * 0.004) * 0.06})`);
        ctx.fillStyle = vigGrd;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // フェーズ移行エフェクト
      drawPhaseTransition(ctx, boss);

      // 描画順
      particles.forEach((p) => drawParticle(ctx, p));
      drawBeams(ctx, beams, player.ultActive);
      bullets.forEach((b) => drawBullet(ctx, b));
      drawUltAura(ctx, player);   // プレイヤーの下のオーラ（本体より先）
      drawPlayer(ctx, player);
      drawBoss(ctx, boss);

      // 必殺技発動フラッシュ（最前面）
      drawUltFlash(ctx, ultFlashTimer);

      // 照準
      drawCrosshair(ctx, input.mouseX, input.mouseY, player.ultActive);

      ctx.restore();
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      canvas.style.cursor = 'default';
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ display: 'block' }}
    />
  );
}
