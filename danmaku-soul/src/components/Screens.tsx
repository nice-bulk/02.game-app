import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';
import { startClearBgm, stopClearBgm, startTitleBgm, stopTitleBgm, startBgm, stopBgm } from '../game/audio';

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
  const resetGame = useGameStore((s) => s.resetGame);

  // マウント時にタイトルBGM開始、アンマウント時に停止
  useEffect(() => {
    startTitleBgm();
    return () => stopTitleBgm(400);
  }, []);

  const handleStart = () => {
    stopTitleBgm(300);
    resetGame(); // useGameLoop内でstartBgm()が呼ばれる
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
    }
  };

  return (
    <div className="overlay overlay-pause">
      <div className="overlay-content">
        <h2 className="pause-title">PAUSED</h2>
        <div className="pause-menu">
          <button className="pause-btn" onClick={() => setPhase('playing')}>▶ 再開</button>
          <button className="pause-btn" onClick={handleRestart}>↺ 最初から</button>
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
    if (window.ipcRenderer) {
      window.close();
    } else {
      setPhase('title');
    }
  };

  return (
    <div className="overlay overlay-dead">
      <div className="overlay-content">
        <h2 className="dead-title">YOU DIED</h2>
        <p className="dead-sub">霧の中に消えた...</p>
        <div className="pause-menu">
          <button className="start-btn" onClick={handleTryAgain}>TRY AGAIN</button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>✕ ゲーム終了</button>
        </div>
      </div>
    </div>
  );
}

export function VictoryScreen() {
  const resetGame = useGameStore((s) => s.resetGame);
  const setPhase  = useGameStore((s) => s.setPhase);

  // マウント時にクリアBGM開始、アンマウント時に停止
  useEffect(() => {
    startClearBgm();
    return () => stopClearBgm(300);
  }, []);

  const handleQuit = () => {
    stopClearBgm(300);
    if (window.ipcRenderer) {
      window.close();
    } else {
      setPhase('title');
    }
  };

  const handlePlayAgain = () => {
    stopClearBgm(200);
    resetGame();
    startBgm(); // 戦闘BGM再起動
  };

  return (
    <div className="overlay overlay-victory">
      <div className="overlay-content">
        <h2 className="victory-title">SOUL OBTAINED</h2>
        <p className="victory-sub">古の魂を打ち倒した</p>
        <div className="pause-menu">
          <button className="start-btn start-btn-victory" onClick={handlePlayAgain}>PLAY AGAIN</button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>✕ ゲーム終了</button>
        </div>
      </div>
    </div>
  );
}

export { CANVAS_WIDTH, CANVAS_HEIGHT };
