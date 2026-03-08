import { useGameStore } from './store/gameStore';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TitleScreen, PauseScreen, DeadScreen, VictoryScreen } from './components/Screens';
import './index.css';

function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="game-wrapper">
      <div className="game-container">
        <GameCanvas />
        <HUD />
        {phase === 'title'   && <TitleScreen />}
        {phase === 'paused'  && <PauseScreen />}
        {phase === 'dead'    && <DeadScreen />}
        {phase === 'victory' && <VictoryScreen />}
      </div>
    </div>
  );
}

export default App;
