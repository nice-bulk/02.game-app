import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../game/useGameLoop';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ULT_DURATION } from '../game/constants';
import type { Player, Boss, Bullet, Beam, Particle } from '../game/types';

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player) {
  const { pos, radius, isRolling, hitFlash, reflexFlash, invincible, ultActive, ultTimer } = player;

  ctx.save();

  // 必殺技中のオーラ
  if (ultActive) {
    const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 4);
    grd.addColorStop(0, `rgba(255, 200, 0, ${pulse * 0.5})`);
    grd.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 4, 0, Math.PI * 2);
    ctx.fill();
    // タイマーリング
    const ratio = ultTimer / ULT_DURATION;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = `rgba(255, 200, 0, 0.9)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // ジャスト回避/回復エフェクト
  if (reflexFlash > 0) {
    const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 3);
    grd.addColorStop(0, `rgba(0, 255, 180, ${reflexFlash / 30 * 0.6})`);
    grd.addColorStop(1, 'rgba(0, 255, 180, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 無敵中点滅
  if (invincible && !isRolling && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.restore();
    return;
  }

  // 本体
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

  // 中心点（当たり判定）
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

function drawBeams(ctx: CanvasRenderingContext2D, beams: Beam[], ultActive: boolean) {
  for (const beam of beams) {
    const alpha = beam.life / beam.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;

    // 外側の太いグロー
    ctx.beginPath();
    ctx.moveTo(beam.originX, beam.originY);
    ctx.lineTo(beam.targetX, beam.targetY);
    ctx.strokeStyle = ultActive ? 'rgba(255, 200, 0, 0.3)' : 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = ultActive ? 22 : 16;
    ctx.lineCap = 'round';
    ctx.shadowColor = ultActive ? '#ffcc00' : '#44aaff';
    ctx.shadowBlur = 20;
    ctx.stroke();

    // 内側の細いコア
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

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss) {
  const { pos, radius, hp, maxHp, phase, poise, maxPoise, stunTimer,
    telegraphActive, bombTelegraphActive, hitFlash } = boss;
  const hpRatio = hp / maxHp;

  ctx.save();

  // ボム予兆（大きな赤いパルス）
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

function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
  const { pos, radius, type, fromBoss, parryWindowTimer } = bullet;
  ctx.save();

  if (!fromBoss) {
    // 跳ね返しボム
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
    // 巨大ボム（パリィ可能）
    const canParry = parryWindowTimer > 0;
    const pulse = canParry ? Math.sin(Date.now() * 0.03) * 0.2 + 0.8 : 1;

    // 外周グロー
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = canParry
      ? `rgba(255, 120, 20, ${pulse * 0.3})`
      : 'rgba(180, 40, 0, 0.15)';
    ctx.fill();

    // 本体
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

    // パリィウィンドウ中のリングエフェクト
    if (canParry) {
      const ringR = radius + 10 + Math.sin(Date.now() * 0.05) * 4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 80, ${parryWindowTimer / 60 * 0.8})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      // 中のシンボル
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 240, 180, ${parryWindowTimer / 60})`;
      ctx.fillText('⟳', pos.x, pos.y);
    }
  } else {
    // 通常弾（赤）
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

function drawBackground(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(80, 40, 80, 0.3)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  const offset = (frame * 0.5) % gridSize;
  for (let x = -gridSize; x < CANVAS_WIDTH + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + offset, 0);
    ctx.lineTo(x + offset, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = -gridSize; y < CANVAS_HEIGHT + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + offset);
    ctx.lineTo(CANVAS_WIDTH, y + offset);
    ctx.stroke();
  }
  ctx.restore();
}

// カーソルの十字線（照準）
function drawCrosshair(ctx: CanvasRenderingContext2D, mx: number, my: number, ultActive: boolean) {
  ctx.save();
  ctx.strokeStyle = ultActive ? 'rgba(255, 200, 0, 0.8)' : 'rgba(100, 220, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = ultActive ? '#ffcc00' : '#44aaff';
  ctx.shadowBlur = 6;
  const size = 10;
  const gap = 4;
  // 十字
  ctx.beginPath();
  ctx.moveTo(mx - size - gap, my); ctx.lineTo(mx - gap, my);
  ctx.moveTo(mx + gap, my);       ctx.lineTo(mx + size + gap, my);
  ctx.moveTo(mx, my - size - gap); ctx.lineTo(mx, my - gap);
  ctx.moveTo(mx, my + gap);       ctx.lineTo(mx, my + size + gap);
  ctx.stroke();
  // 外円
  ctx.beginPath();
  ctx.arc(mx, my, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCountRef = useRef(0);

  useGameLoop(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // カーソル非表示
    canvas.style.cursor = 'none';

    let raf: number;
    const render = () => {
      raf = requestAnimationFrame(render);
      frameCountRef.current++;

      const { player, boss, bullets, beams, particles, screenShake, input } = useGameStore.getState();

      let shakeX = 0, shakeY = 0;
      if (screenShake.duration > 0) {
        shakeX = (Math.random() - 0.5) * screenShake.intensity * 2;
        shakeY = (Math.random() - 0.5) * screenShake.intensity * 2;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 背景
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);
      drawBackground(ctx, frameCountRef.current);

      // ボス発光エリア
      const bossGrd = ctx.createRadialGradient(boss.pos.x, boss.pos.y, 0, boss.pos.x, boss.pos.y, 200);
      const bossAlpha = boss.phase === 3 ? 0.12 : boss.phase === 2 ? 0.08 : 0.05;
      bossGrd.addColorStop(0, `rgba(200, 50, 0, ${bossAlpha})`);
      bossGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bossGrd;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 必殺技中の画面エフェクト
      if (player.ultActive) {
        const ultPulse = Math.sin(Date.now() * 0.008) * 0.04 + 0.04;
        ctx.fillStyle = `rgba(255, 180, 0, ${ultPulse})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // 描画順
      particles.forEach((p) => drawParticle(ctx, p));
      drawBeams(ctx, beams, player.ultActive);
      bullets.forEach((b) => drawBullet(ctx, b));
      drawPlayer(ctx, player);
      drawBoss(ctx, boss);

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
