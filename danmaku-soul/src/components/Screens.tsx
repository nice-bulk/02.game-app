import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';
import { startClearBgm, stopClearBgm, startTitleBgm, stopTitleBgm, startBgm, stopBgm } from '../game/audio';
import type { BossId } from '../game/types';

// タイトル用ミニ弾幕アニメーション（Canvas）
function TitleDanmakuCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type TitleBullet = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };
    const bullets: TitleBullet[] = [];
    let frame = 0;
    let raf: number;

    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;

    const render = () => {
      raf = requestAnimationFrame(render);
      frame++;

      ctx.clearRect(0, 0, W, H);

      // 弾幕生成
      if (frame % 50 === 0) {
        const cx = W / 2;
        const cy = H / 3;
        const count = 18;
        const rot = frame * 0.015;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i + rot;
          const speed = 1.2;
          bullets.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 5,
            alpha: 0.7,
          });
        }
      }
      // 螺旋弾
      if (frame % 8 === 0) {
        const cx = W / 2;
        const cy = H / 3;
        const angle = frame * 0.08;
        const speed = 1.5;
        bullets.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 4,
          alpha: 0.5,
        });
        bullets.push({
          x: cx, y: cy,
          vx: Math.cos(angle + Math.PI) * speed,
          vy: Math.sin(angle + Math.PI) * speed,
          r: 4,
          alpha: 0.5,
        });
      }

      // 弾を動かす
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.alpha -= 0.003;
        if (b.alpha <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
          bullets.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = b.alpha * 0.6;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = '#cc4422';
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      // ボス（中央上部の円）
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, H / 3, 30, 0, Math.PI * 2);
      const grd = ctx.createRadialGradient(W / 2 - 10, H / 3 - 10, 0, W / 2, H / 3, 30);
      grd.addColorStop(0, '#882200');
      grd.addColorStop(1, '#441100');
      ctx.fillStyle = grd;
      const pulse = Math.sin(frame * 0.04) * 0.4 + 0.6;
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 20 * pulse;
      ctx.fill();
      ctx.restore();
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.45,
      }}
    />
  );
}

export function TitleScreen() {
  const setPhase = useGameStore((s) => s.setPhase);

  // マウント時にタイトルBGM開始、アンマウント時に停止
  useEffect(() => {
    startTitleBgm();
    return () => stopTitleBgm(400);
  }, []);

  const handleStart = () => {
    stopTitleBgm(200);
    setPhase('bossSelect');
  };

  return (
    <div className="overlay">
      <TitleDanmakuCanvas />
      <div className="overlay-content" style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="title-main">DANMAKU<br />SOULS</h1>
        <p className="title-sub">弾幕 × ソウルライク</p>
        <div className="title-controls">
          <div><span className="key-hint">WASD</span> 移動</div>
          <div><span className="key-hint">左クリック長押し</span> ビーム攻撃</div>
          <div><span className="key-hint">右クリック</span> パリィ（ボムに）</div>
          <div><span className="key-hint">SPACE</span> HP回復 <span className="cost-hint">（スタック{2}消費）</span></div>
          <div><span className="key-hint">ホイールクリック</span> 必殺技 <span className="cost-hint">（スタック{4}消費）</span></div>
          <div><span className="key-hint">ESC</span> ポーズ</div>
        </div>
        <button className="start-btn" onClick={handleStart}>
          ENTER THE FIGHT
        </button>
      </div>
    </div>
  );
}

// ボス情報
const BOSS_INFO: { id: BossId; name: string; sub: string; diff: string; diffColor: string; desc: string }[] = [
  {
    id: 'ancient_soul',
    name: 'ANCIENT SOUL',
    sub: '古の魂',
    diff: '★★☆',
    diffColor: '#cc8844',
    desc: '弾幕と体幹崩しの基本を学ぶ初代ボス。\nパリィを4回成功させるとスタン。',
  },
  {
    id: 'iron_sentinel',
    name: 'IRON SENTINEL',
    sub: '鉄の番人',
    diff: '★★★',
    diffColor: '#44aacc',
    desc: '機械型ボス。高速な十字砲と追尾弾が特徴。\n素早い動きに対応する判断力が求められる。',
  },
  {
    id: 'void_wraith',
    name: 'VOID WRAITH',
    sub: '虚無の亡霊',
    diff: '★★★',
    diffColor: '#aa44cc',
    desc: '最強の敵。全方位散弾と高速ボムの嵐。\nHPが多く長期戦になる。油断は禁物。',
  },
];

export function BossSelectScreen() {
  const selectBoss  = useGameStore((s) => s.selectBoss);
  const resetGame   = useGameStore((s) => s.resetGame);
  const setPhase    = useGameStore((s) => s.setPhase);
  const selectedBossId = useGameStore((s) => s.selectedBossId);

  const handleSelect = (id: BossId) => {
    selectBoss(id);
    resetGame();
    startBgm();
  };

  const handleBack = () => {
    setPhase('title');
    startTitleBgm();
  };

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2 className="bossselect-title">SELECT YOUR ENEMY</h2>
        <div className="bossselect-list">
          {BOSS_INFO.map((b) => (
            <div
              key={b.id}
              className={`bossselect-card ${selectedBossId === b.id ? 'bossselect-card-selected' : ''}`}
              onClick={() => handleSelect(b.id)}
            >
              <div className="bossselect-name">{b.name}</div>
              <div className="bossselect-sub">{b.sub}</div>
              <div className="bossselect-diff" style={{ color: b.diffColor }}>{b.diff}</div>
              <div className="bossselect-desc">{b.desc}</div>
            </div>
          ))}
        </div>
        <button className="pause-btn" onClick={handleBack}>← タイトルに戻る</button>
      </div>
    </div>
  );
}

export function PauseScreen() {
  const setPhase  = useGameStore((s) => s.setPhase);
  const resetGame = useGameStore((s) => s.resetGame);

  const handleRestart = () => {
    stopBgm(0);
    resetGame();
    startBgm();
  };

  const handleQuit = () => {
    stopBgm(400);
    if (window.ipcRenderer) {
      window.close();
    } else {
      setPhase('title');
      // TitleScreenのuseEffectでstartTitleBgm()が呼ばれる
    }
  };

  const handleBackToTitle = () => {
    stopBgm(400);
    setPhase('title');
  };

  return (
    <div className="overlay overlay-pause">
      <div className="overlay-content">
        <h2 className="pause-title">PAUSED</h2>
        <div className="pause-menu">
          <button className="pause-btn" onClick={() => setPhase('playing')}>▶ 再開</button>
          <button className="pause-btn" onClick={handleRestart}>↺ 最初から</button>
          <button className="pause-btn" onClick={handleBackToTitle}>⌂ タイトルに戻る</button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>✕ ゲーム終了</button>
        </div>
        <p className="pause-hint">ESC で再開</p>
      </div>
    </div>
  );
}

export function DeadScreen() {
  const resetGame = useGameStore((s) => s.resetGame);
  const setPhase  = useGameStore((s) => s.setPhase);

  const handleTryAgain = () => {
    stopBgm(0);      // 残っていれば即停止
    resetGame();     // ゲームリセット
    startBgm();      // 戦闘BGM再起動
  };

  const handleQuit = () => {
    stopBgm(0);
    if (window.ipcRenderer) {
      window.close();
    } else {
      setPhase('title');
    }
  };

  const handleBackToTitle = () => {
    stopBgm(0);
    setPhase('title');
  };

  return (
    <div className="overlay overlay-dead">
      <div className="overlay-content">
        <h2 className="dead-title">YOU DIED</h2>
        <p className="dead-sub">霧の中に消えた...</p>
        <div className="pause-menu">
          <button className="start-btn" onClick={handleTryAgain}>TRY AGAIN</button>
          <button className="pause-btn" onClick={handleBackToTitle}>⌂ タイトルに戻る</button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>✕ ゲーム終了</button>
        </div>
      </div>
    </div>
  );
}

export function VictoryScreen() {
  const resetGame     = useGameStore((s) => s.resetGame);
  const setPhase      = useGameStore((s) => s.setPhase);
  const clearResult   = useGameStore((s) => s.clearResult);

  useEffect(() => {
    startClearBgm();
    return () => stopClearBgm(300);
  }, []);

  const handleQuit = () => {
    stopClearBgm(300);
    if (window.ipcRenderer) { window.close(); }
    else { setPhase('title'); }
  };
  const handlePlayAgain = () => {
    stopClearBgm(200);
    resetGame();
    startBgm();
  };
  const handleBackToTitle = () => {
    stopClearBgm(400);
    setPhase('title');
  };

  const r = clearResult;
  const rankColor: Record<string, string> = {
    S: '#ffe066', A: '#88ffcc', B: '#88aaff', C: '#aaaaaa',
  };
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="overlay overlay-victory">
      <div className="overlay-content">
        {/* ノーダメクリア特典 */}
        {r?.tookDamage === false && (
          <div className="nodamage-badge">★ NO DAMAGE CLEAR ★</div>
        )}

        <h2 className="victory-title">SOUL OBTAINED</h2>
        <p className="victory-sub">古の魂を打ち倒した</p>

        {/* リザルト */}
        {r && (
          <div className="result-box">
            <div className="result-rank" style={{ color: rankColor[r.rank] }}>
              RANK {r.rank}
            </div>
            <div className="result-row">
              <span className="result-label">クリアタイム</span>
              <span className="result-value">{formatTime(r.clearTimeSec)}</span>
            </div>
            <div className="result-row">
              <span className="result-label">パリィ成功</span>
              <span className="result-value">{r.parryCount} 回</span>
            </div>
            <div className="result-row">
              <span className="result-label">ノーダメージ</span>
              <span className="result-value" style={{ color: r.tookDamage ? '#ff6666' : '#66ffaa' }}>
                {r.tookDamage ? '×' : '✓'}
              </span>
            </div>
            <div className="result-row">
              <span className="result-label">挑戦回数</span>
              <span className="result-value">{r.runCount} 回目</span>
            </div>
          </div>
        )}

        <div className="pause-menu">
          <button className="start-btn start-btn-victory" onClick={handlePlayAgain}>PLAY AGAIN</button>
          <button className="pause-btn" onClick={handleBackToTitle}>⌂ タイトルに戻る</button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>✕ ゲーム終了</button>
        </div>
      </div>
    </div>
  );
}

export { CANVAS_WIDTH, CANVAS_HEIGHT };
