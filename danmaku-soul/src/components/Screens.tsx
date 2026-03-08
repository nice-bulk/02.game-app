import { useGameStore } from '../store/gameStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';

export function TitleScreen() {
  const resetGame = useGameStore((s) => s.resetGame);
  return (
    <div className="overlay">
      <div className="overlay-content">
        <h1 className="title-main">DANMAKU<br />SOULS</h1>
        <p className="title-sub">弾幕×ソウルライク</p>
        <div className="title-controls">
          <div>WASD — 移動</div>
          <div>左クリック長押し — ビーム攻撃</div>
          <div>右クリック — パリィ（ボムに）</div>
          <div>SPACE — HP回復（2スタック消費）</div>
          <div>ホイールクリック — 必殺技（4スタック消費）</div>
          <div>ESC — ポーズ</div>
        </div>
        <button className="start-btn" onClick={resetGame}>
          ENTER THE FIGHT
        </button>
      </div>
    </div>
  );
}

export function PauseScreen() {
  const setPhase  = useGameStore((s) => s.setPhase);
  const resetGame = useGameStore((s) => s.resetGame);

  const handleQuit = () => {
    // Electron環境ではwindow.closeで終了、ブラウザ環境ではタイトルへ
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
          <button
            className="pause-btn"
            onClick={() => setPhase('playing')}
          >
            ▶ 再開
          </button>
          <button
            className="pause-btn"
            onClick={resetGame}
          >
            ↺ 最初から
          </button>
          <button
            className="pause-btn pause-btn-quit"
            onClick={handleQuit}
          >
            ✕ ゲーム終了
          </button>
        </div>
        <p className="pause-hint">ESC で再開</p>
      </div>
    </div>
  );
}

export function DeadScreen() {
  const resetGame = useGameStore((s) => s.resetGame);
  const setPhase  = useGameStore((s) => s.setPhase);

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
          <button className="start-btn" onClick={resetGame}>
            TRY AGAIN
          </button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>
            ✕ ゲーム終了
          </button>
        </div>
      </div>
    </div>
  );
}

export function VictoryScreen() {
  const resetGame = useGameStore((s) => s.resetGame);
  const setPhase  = useGameStore((s) => s.setPhase);

  const handleQuit = () => {
    if (window.ipcRenderer) {
      window.close();
    } else {
      setPhase('title');
    }
  };

  return (
    <div className="overlay overlay-victory">
      <div className="overlay-content">
        <h2 className="victory-title">SOUL OBTAINED</h2>
        <p className="victory-sub">古の魂を打ち倒した</p>
        <div className="pause-menu">
          <button className="start-btn start-btn-victory" onClick={resetGame}>
            PLAY AGAIN
          </button>
          <button className="pause-btn pause-btn-quit" onClick={handleQuit}>
            ✕ ゲーム終了
          </button>
        </div>
      </div>
    </div>
  );
}

export { CANVAS_WIDTH, CANVAS_HEIGHT };
