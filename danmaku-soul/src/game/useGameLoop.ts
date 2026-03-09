import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Bullet, Beam, Particle, Player, Boss } from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  PLAYER_SPEED, PLAYER_STAMINA_REGEN, PLAYER_STAMINA_REGEN_DELAY,
  MOVE_STAMINA_COST, REFLEX_STAMINA_RECOVER, REFLEX_WINDOW,
  INVINCIBLE_AFTER_HIT,
  BEAM_DAMAGE_INTERVAL, BEAM_DAMAGE, BEAM_LIFE,
  ULT_DURATION, ULT_DAMAGE_MULTIPLIER, ULT_BEAM_INTERVAL,
  HEAL_STACK_COST, ULT_STACK_COST,
  BULLET_RADIUS, BOMB_RADIUS, BOMB_SPEED, PARRY_WINDOW, BOMB_DAMAGE,
  BOMB_INTERVAL_P1, BOMB_INTERVAL_P2, BOMB_INTERVAL_P3,
  SHOOT_INTERVAL_P1, SHOOT_INTERVAL_P2, SHOOT_INTERVAL_P3,
  HITSTOP_PARRY, HITSTOP_HIT,
  BOSS_POISE_RECOVER_TIME, BOSS_STUN_DURATION, BOSS_MAX_POISE,
  PHASE2_THRESHOLD, PHASE3_THRESHOLD,
} from './constants';

// パリィ成功後の無敵フレーム（2秒 = 120f）
const PARRY_INVINCIBLE_FRAMES = 120;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function makeParticles(
  getNextId: () => number,
  x: number, y: number,
  count: number,
  speed: number,
  life: number,
  color: string,
): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = rand(0, Math.PI * 2);
    const s = rand(speed * 0.5, speed);
    return {
      id: getNextId(),
      pos: { x, y },
      vel: { x: Math.cos(angle) * s, y: Math.sin(angle) * s },
      radius: rand(2, 5),
      life: Math.floor(rand(life * 0.5, life)),
      maxLife: life,
      color,
    };
  });
}

function generateDanmaku(boss: Boss, nextId: () => number, frame: number): Bullet[] {
  const bullets: Bullet[] = [];
  const phase = boss.phase;
  let count = 12;
  let speed = 1.8;
  let rotSpeed = 0.01;
  if (phase === 2) { count = 16; speed = 2.4; rotSpeed = 0.02; }
  if (phase === 3) { count = 20; speed = rand(2.5, 3.2); rotSpeed = 0.03; }

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

function generateBomb(boss: Boss, playerPos: { x: number; y: number }, nextId: () => number): Bullet {
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

function getShootInterval(phase: number): number {
  if (phase === 1) return SHOOT_INTERVAL_P1;
  if (phase === 2) return SHOOT_INTERVAL_P2;
  return SHOOT_INTERVAL_P3;
}

function getBombInterval(phase: number): number {
  if (phase === 1) return BOMB_INTERVAL_P1;
  if (phase === 2) return BOMB_INTERVAL_P2;
  return BOMB_INTERVAL_P3;
}

export function useGameLoop(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const store = useGameStore;
  const frameRef = useRef(0);
  const staminaRegenDelayRef = useRef(0);

  // ビームタイマー（Ref管理 = 毎フレーム確実にカウント）
  const beamTimerRef = useRef(0);

  // パリィ有効フレーム（Ref管理 = Zustandスナップショットに依存しない）
  const parryFramesRef = useRef(0);

  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ============ キーボード ============
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const s = store.getState();
      if (e.code === 'Escape' && down) {
        if (s.phase === 'playing') { s.setPhase('paused'); return; }
        if (s.phase === 'paused')  { s.setPhase('playing'); return; }
        return;
      }
      if (s.phase !== 'playing') return;
      const inp = { ...s.input };
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    inp.up = down; break;
        case 'KeyS': case 'ArrowDown':  inp.down = down; break;
        case 'KeyA': case 'ArrowLeft':  inp.left = down; break;
        case 'KeyD': case 'ArrowRight': inp.right = down; break;
        case 'Space':
          e.preventDefault();
          inp.roll = down;
          break;
      }
      s.setInput(inp);
    };

    // ============ マウス ============
    const onMouseMove = (e: MouseEvent) => {
      const s = store.getState();
      if (s.phase !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      s.setInput({
        ...s.input,
        mouseX: (e.clientX - rect.left) * scaleX,
        mouseY: (e.clientY - rect.top) * scaleY,
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      const s = store.getState();
      if (s.phase !== 'playing') return;
      e.preventDefault();
      const inp = { ...s.input };
      if (e.button === 0) inp.beamFire = true;
      if (e.button === 2) {
        inp.parry = true;
        parryFramesRef.current = 8; // 8フレーム以内（厳しめ）
      }
      if (e.button === 1) inp.ultimate = true;
      s.setInput(inp);
    };

    const onMouseUp = (e: MouseEvent) => {
      const s = store.getState();
      if (s.phase !== 'playing') return;
      const inp = { ...s.input };
      if (e.button === 0) inp.beamFire = false;
      if (e.button === 2) inp.parry = false;
      if (e.button === 1) inp.ultimate = false;
      s.setInput(inp);
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);

    // ============ ゲームループ ============
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      // phase チェックは毎フレーム最新を取る
      if (store.getState().phase !== 'playing') return;

      // ---- パリィフレームは毎フレーム必ずカウントダウン（ヒットストップ中も）----
      if (parryFramesRef.current > 0) {
        parryFramesRef.current--;
      }

      // ---- ヒットストップ判定 ----
      if (store.getState().tickHitstop()) return;

      frameRef.current++;
      const frame = frameRef.current;

      // ================================================================
      // ビーム攻撃
      // 毎フレーム最新の state を取得して判定（スナップショット汚染を排除）
      // ================================================================
      {
        const { input: bi, player: bp } = store.getState();
        const beamInterval = bp.ultActive ? ULT_BEAM_INTERVAL : BEAM_DAMAGE_INTERVAL;

        if (bi.beamFire) {
          // 押している → タイマーを進める（スタミナ不要）
          beamTimerRef.current++;

          if (beamTimerRef.current >= beamInterval) {
            beamTimerRef.current = 0; // インターバルごとにリセットして継続発射

            const boss = store.getState().boss;
            const beamDir = normalize(bi.mouseX - bp.pos.x, bi.mouseY - bp.pos.y);
            const tx = boss.pos.x - bp.pos.x;
            const ty = boss.pos.y - bp.pos.y;
            const proj = tx * beamDir.x + ty * beamDir.y;
            const cx = bp.pos.x + beamDir.x * proj;
            const cy = bp.pos.y + beamDir.y * proj;

            if (proj > 0 && dist({ x: cx, y: cy }, boss.pos) < boss.radius + 8) {
              const dmg = bp.ultActive ? BEAM_DAMAGE * ULT_DAMAGE_MULTIPLIER : BEAM_DAMAGE;
              store.getState().setBoss((b: Boss) => {
                const newHp = Math.max(0, b.hp - dmg);
                if (newHp <= 0) store.getState().setPhase('victory');
                return { ...b, hp: newHp, hitFlash: 4 };
              });
              if (bp.ultActive) {
                store.getState().addParticles(
                  makeParticles(store.getState().nextParticleId, boss.pos.x, boss.pos.y, 3, 4, 15, '#ffcc00')
                );
              }
            }

            const beam: Beam = {
              id: store.getState().nextBeamId(),
              originX: bp.pos.x,
              originY: bp.pos.y,
              targetX: bp.pos.x + beamDir.x * 1200,
              targetY: bp.pos.y + beamDir.y * 1200,
              life: BEAM_LIFE,
              maxLife: BEAM_LIFE,
            };
            store.getState().setBeams((prev) => [...prev, beam]);
          }
        } else {
          // 離した → タイマーリセット（次に押した瞬間すぐ発射）
          beamTimerRef.current = 0;
        }
      }

      // ビーム寿命更新
      store.getState().setBeams((beams) =>
        beams.map((b) => ({ ...b, life: b.life - 1 })).filter((b) => b.life > 0)
      );

      // ================================================================
      // プレイヤー移動・スタミナ
      // ================================================================
      {
        const freshInput = store.getState().input;
        store.getState().setPlayer((p: Player) => {
          const { stamina, isRolling, rollTimer, rollCooldown, invincible, hitFlash, reflexFlash } = p;
          const { pos } = p;
          let { vel } = p;
          let newStamina = stamina;
          let newIsRolling = isRolling;
          let newRollTimer = rollTimer;
          const newRollCooldown = rollCooldown > 0 ? rollCooldown - 1 : 0;
          let newInvincible = invincible;
          const newHitFlash = hitFlash > 0 ? hitFlash - 1 : 0;
          const newReflexFlash = reflexFlash > 0 ? reflexFlash - 1 : 0;
          let newUltActive = p.ultActive;
          const newUltTimer = p.ultTimer > 0 ? p.ultTimer - 1 : 0;
          if (newUltTimer <= 0) newUltActive = false;

          if (isRolling) {
            newRollTimer = rollTimer - 1;
            if (newRollTimer <= 0) {
              newIsRolling = false;
              newInvincible = false;
            }
          } else {
            let dx = 0, dy = 0;
            if (freshInput.up)    dy -= 1;
            if (freshInput.down)  dy += 1;
            if (freshInput.left)  dx -= 1;
            if (freshInput.right) dx += 1;

            const moving = dx !== 0 || dy !== 0;
            if (moving) {
              const n = normalize(dx, dy);
              vel = { x: n.x * PLAYER_SPEED, y: n.y * PLAYER_SPEED };
              newStamina = Math.max(0, stamina - MOVE_STAMINA_COST);
              staminaRegenDelayRef.current = PLAYER_STAMINA_REGEN_DELAY;
            } else {
              vel = { x: 0, y: 0 };
            }

            // Space: HP回復
            if (freshInput.roll && p.stack >= HEAL_STACK_COST && p.hp < p.maxHp) {
              store.getState().setInput({ ...freshInput, roll: false });
              return {
                ...p,
                hp: Math.min(p.maxHp, p.hp + 1),
                stack: p.stack - HEAL_STACK_COST,
                hitFlash: 0,
                reflexFlash: 15,
              };
            }

            // ビームはスタミナ消費なし
          }

          if (staminaRegenDelayRef.current > 0) {
            staminaRegenDelayRef.current--;
          } else {
            newStamina = Math.min(p.maxStamina, newStamina + PLAYER_STAMINA_REGEN);
          }

          let nx = pos.x + vel.x;
          let ny = pos.y + vel.y;
          nx = Math.max(p.radius, Math.min(CANVAS_WIDTH - p.radius, nx));
          ny = Math.max(p.radius, Math.min(CANVAS_HEIGHT - p.radius, ny));

          return {
            ...p,
            pos: { x: nx, y: ny },
            vel,
            stamina: newStamina,
            isRolling: newIsRolling,
            rollTimer: newRollTimer,
            rollCooldown: newRollCooldown,
            invincible: newInvincible,
            hitFlash: newHitFlash,
            reflexFlash: newReflexFlash,
            isFiringBeam: freshInput.beamFire,
            ultActive: newUltActive,
            ultTimer: newUltTimer,
          };
        });
      }

      // ================================================================
      // 必殺技発動
      // ================================================================
      {
        const { player: pl, input: li } = store.getState();
        if (li.ultimate && pl.stack >= ULT_STACK_COST && !pl.ultActive) {
          store.getState().setInput({ ...li, ultimate: false });
          store.getState().setPlayer((p: Player) => ({
            ...p,
            stack: p.stack - ULT_STACK_COST,
            ultActive: true,
            ultTimer: ULT_DURATION,
          }));
          // ボスに特大ダメージ（即時100ダメ）
          store.getState().setBoss((b: Boss) => {
            const newHp = Math.max(0, b.hp - 100);
            if (newHp <= 0) store.getState().setPhase('victory');
            return { ...b, hp: newHp, hitFlash: 30, stunTimer: 30 };
          });
          store.getState().addScreenShake(12, 40);
          store.getState().addParticles(
            makeParticles(store.getState().nextParticleId, pl.pos.x, pl.pos.y, 30, 8, 70, '#ffcc00')
          );
          // ボス座標にも爆発エフェクト
          const bossPos = store.getState().boss.pos;
          store.getState().addParticles(
            makeParticles(store.getState().nextParticleId, bossPos.x, bossPos.y, 30, 7, 60, '#ff8800')
          );
        }
      }

      // ================================================================
      // ボス更新
      // ================================================================
      store.getState().setBoss((b: Boss) => {
        if (b.stunTimer > 0) {
          return { ...b, stunTimer: b.stunTimer - 1, hitFlash: Math.max(0, b.hitFlash - 1) };
        }

        const shootInterval = getShootInterval(b.phase);
        const bombInterval  = getBombInterval(b.phase);
        let newShootTimer = b.shootTimer + 1;
        let newBombTimer  = b.bombTimer  + 1;

        let newTelegraphActive = b.telegraphActive;
        let newTelegraphTimer  = b.telegraphTimer > 0 ? b.telegraphTimer - 1 : 0;
        if (!newTelegraphActive && newShootTimer >= shootInterval - 20) {
          newTelegraphActive = true;
          newTelegraphTimer  = 20;
        }

        let newBombTelegraphActive = b.bombTelegraphActive;
        let newBombTelegraphTimer  = b.bombTelegraphTimer > 0 ? b.bombTelegraphTimer - 1 : 0;
        if (!newBombTelegraphActive && newBombTimer >= bombInterval - 40) {
          newBombTelegraphActive = true;
          newBombTelegraphTimer  = 40;
        }

        if (newShootTimer >= shootInterval) {
          newShootTimer = 0;
          newTelegraphActive = false;
          const danmaku = generateDanmaku(b, store.getState().nextBulletId, frame);
          store.getState().setBullets((prev) => [...prev, ...danmaku]);
          store.getState().addScreenShake(1.5, 6);
        }

        if (newBombTimer >= bombInterval) {
          newBombTimer = 0;
          newBombTelegraphActive = false;
          const bomb = generateBomb(b, store.getState().player.pos, store.getState().nextBulletId);
          store.getState().setBullets((prev) => [...prev, bomb]);
          store.getState().addScreenShake(3, 12);
        }

        let newPoise = b.poise;
        let newPoiseRecoverTimer = b.poiseRecoverTimer;
        if (newPoise < b.maxPoise) {
          newPoiseRecoverTimer++;
          if (newPoiseRecoverTimer >= BOSS_POISE_RECOVER_TIME) {
            newPoise = Math.min(b.maxPoise, newPoise + 1);
            newPoiseRecoverTimer = 0;
          }
        }

        const hpRatio = b.hp / b.maxHp;
        let phase = 1;
        if (hpRatio <= PHASE3_THRESHOLD) phase = 3;
        else if (hpRatio <= PHASE2_THRESHOLD) phase = 2;

        return {
          ...b,
          shootTimer: newShootTimer,
          bombTimer:  newBombTimer,
          telegraphTimer:       newTelegraphTimer,
          telegraphActive:      newTelegraphActive,
          bombTelegraphTimer:   newBombTelegraphTimer,
          bombTelegraphActive:  newBombTelegraphActive,
          poise: newPoise,
          poiseRecoverTimer: newPoiseRecoverTimer,
          phase,
          hitFlash: Math.max(0, b.hitFlash - 1),
        };
      });

      // ================================================================
      // 弾移動
      // ================================================================
      store.getState().setBullets((bullets: Bullet[]) =>
        bullets
          .map((b) => ({
            ...b,
            pos: { x: b.pos.x + b.vel.x, y: b.pos.y + b.vel.y },
            parryWindowTimer: b.parryWindowTimer > 0 ? b.parryWindowTimer - 1 : 0,
          }))
          .filter(
            (b) =>
              b.pos.x > -100 && b.pos.x < CANVAS_WIDTH + 100 &&
              b.pos.y > -100 && b.pos.y < CANVAS_HEIGHT + 100
          )
      );

      // ================================================================
      // 当たり判定
      // ================================================================
      const { player: pl, bullets } = store.getState();
      const parryActive = parryFramesRef.current > 0;
      const bulletsToRemove = new Set<number>();

      // パリィ成功フラグ（同フレーム内の被弾を防ぐため）
      let parriedThisFrame = false;

      for (const bullet of bullets) {
        if (!bullet.fromBoss) continue;
        if (bulletsToRemove.has(bullet.id)) continue; // 削除済みはスキップ

        const d = dist(pl.pos, bullet.pos);
        const hitRange = pl.radius + bullet.radius;

        // ジャスト回避
        if (pl.isRolling && d < hitRange + REFLEX_WINDOW && d > hitRange) {
          store.getState().setPlayer((p: Player) => ({
            ...p,
            stamina: Math.min(p.maxStamina, p.stamina + REFLEX_STAMINA_RECOVER),
            reflexFlash: 30,
          }));
          store.getState().addParticles(
            makeParticles(store.getState().nextParticleId, pl.pos.x, pl.pos.y, 8, 3, 30, '#00ffff')
          );
        }

        // ----------------------------------------------------------------
        // パリィ判定（ボムのみ）
        // 条件: 右クリックから8フレーム以内 & プレイヤーとボムが近い（距離制限あり）
        // 跳ね返しなし → ボムを消してスタック+1 & 2秒無敵
        // ----------------------------------------------------------------
        if (bullet.type === 'bomb' && bullet.parryWindowTimer > 0 && parryActive && !parriedThisFrame) {
          // 距離チェック（プレイヤー半径 + ボム半径 + 50px以内）
          const parryRange = pl.radius + bullet.radius + 50;
          if (d < parryRange) {
            bulletsToRemove.add(bullet.id);
            parryFramesRef.current = 0;
            parriedThisFrame = true;

            store.getState().addParticles(
              makeParticles(store.getState().nextParticleId, bullet.pos.x, bullet.pos.y, 20, 6, 50, '#00ffff')
            );
            store.getState().setHitstop(HITSTOP_PARRY);
            store.getState().addScreenShake(5, 18);

            // スタック +1 & パリィ後2秒無敵
            store.getState().setPlayer((p: Player) => ({
              ...p,
              stack: Math.min(p.maxStack, p.stack + 1),
              invincible: true,
              rollTimer: PARRY_INVINCIBLE_FRAMES,
              reflexFlash: 40,
            }));

            store.getState().setBoss((b: Boss) => {
              const newPoise = b.poise - 1;
              if (newPoise <= 0) {
                store.getState().addScreenShake(10, 35);
                store.getState().addParticles(
                  makeParticles(store.getState().nextParticleId, b.pos.x, b.pos.y, 25, 7, 70, '#ff8800')
                );
                return {
                  ...b, poise: BOSS_MAX_POISE, poiseRecoverTimer: 0,
                  stunTimer: BOSS_STUN_DURATION, hitFlash: 40,
                  hp: Math.max(0, b.hp - 30),
                };
              }
              return { ...b, poise: newPoise, hitFlash: 12 };
            });
            continue;
          }
        }

        // ----------------------------------------------------------------
        // 被弾判定
        // invincible は setPlayer で更新済みの最新値を取得
        // ----------------------------------------------------------------
        const currentInvincible = parriedThisFrame || store.getState().player.invincible;
        if (d < hitRange && !currentInvincible) {
          bulletsToRemove.add(bullet.id);
          const dmg = bullet.type === 'bomb' ? BOMB_DAMAGE : 1;
          store.getState().setPlayer((p: Player) => {
            const newHp = Math.max(0, p.hp - dmg);
            if (newHp <= 0) store.getState().setPhase('dead');
            return {
              ...p, hp: newHp, invincible: true,
              rollTimer: INVINCIBLE_AFTER_HIT, hitFlash: 40,
            };
          });
          store.getState().setHitstop(bullet.type === 'bomb' ? HITSTOP_HIT * 2 : HITSTOP_HIT);
          store.getState().addScreenShake(
            bullet.type === 'bomb' ? 10 : 6,
            bullet.type === 'bomb' ? 28 : 18
          );
          store.getState().addParticles(
            makeParticles(store.getState().nextParticleId, pl.pos.x, pl.pos.y, 12, 5, 40, '#ff4444')
          );
        }
      }

      if (bulletsToRemove.size > 0) {
        store.getState().setBullets((prev) => prev.filter((b) => !bulletsToRemove.has(b.id)));
      }

      // 被弾後無敵終了（rollTimerをカウントダウン）
      store.getState().setPlayer((p: Player) => {
        if (p.invincible && !p.isRolling && p.rollTimer > 0) {
          const newTimer = p.rollTimer - 1;
          if (newTimer <= 0) return { ...p, invincible: false, rollTimer: 0 };
          return { ...p, rollTimer: newTimer };
        }
        return p;
      });

      store.getState().tickParticles();
      store.getState().tickScreenShake();
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [canvasRef, store]);
}
