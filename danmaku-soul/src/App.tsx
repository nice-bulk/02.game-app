import { useGameStore } from './store/gameStore';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TitleScreen, BossSelectScreen, PauseScreen, DeadScreen, VictoryScreen } from './components/Screens';
import './index.css';

function App() {
  const phase = useGameStore((s) => s.phase);
  const inGame = phase === 'playing' || phase === 'paused' || phase === 'dead' || phase === 'victory';

  return (
    <div className="game-wrapper">
      <div className="game-container">
        {/* タイトル中はCanvasをマウントしない（透け防止） */}
        {inGame && <GameCanvas />}
        {inGame && <HUD />}
        {phase === 'title'       && <TitleScreen />}
        {phase === 'bossSelect'  && <BossSelectScreen />}
        {phase === 'paused'      && <PauseScreen />}
        {phase === 'dead'        && <DeadScreen />}
        {phase === 'victory'     && <VictoryScreen />}
      </div>
    </div>
  );
}

export default App;
