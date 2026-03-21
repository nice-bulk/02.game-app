import { useGameStore } from '../store/gameStore';
import { HEAL_STACK_COST, ULT_STACK_COST } from '../game/constants';
import type { BossId } from '../game/types';

// ボスIDごとの表示名・HPバー色
const BOSS_DISPLAY: Record<BossId, {
  name: (phase: number) => string;
  hpColor: (phase: number) => string;
}> = {
  ancient_soul: {
    name: (p) => p === 3 ? '⚡ ANCIENT SOUL ⚡' : p === 2 ? '💀 ANCIENT SOUL' : 'ANCIENT SOUL',
    hpColor: (p) => p === 3 ? '#ff2200' : p === 2 ? '#cc4400' : '#aa6600',
  },
  iron_sentinel: {
    name: (p) => p === 3 ? '⚡ IRON SENTINEL ⚡' : p === 2 ? '🔩 IRON SENTINEL' : 'IRON SENTINEL',
    hpColor: (p) => p === 3 ? '#00ccff' : p === 2 ? '#0099cc' : '#007799',
  },
  void_wraith: {
    name: (p) => p === 3 ? '⚡ VOID WRAITH ⚡' : p === 2 ? '👁 VOID WRAITH' : 'VOID WRAITH',
    hpColor: (p) => p === 3 ? '#cc00ff' : p === 2 ? '#9900cc' : '#660099',
  },
};

export function HUD() {
  const { player, boss, phase, selectedBossId } = useGameStore();

  if (phase !== 'playing') return null;

  const staminaRatio = player.stamina / player.maxStamina;
  const bossHpRatio = boss.hp / boss.maxHp;

  const canHeal = player.stack >= HEAL_STACK_COST && player.hp < player.maxHp;
  const canUlt  = player.stack >= ULT_STACK_COST;
  const isTransitioning = boss.phaseTransitionTimer > 0;

  const display = BOSS_DISPLAY[selectedBossId];

  return (
    <div className="hud">
      {/* ============ プレイヤー左下 ============ */}
      <div className="hud-player">
        <div className="hp-row">
          {Array.from({ length: player.maxHp }, (_, i) => (
            <span key={i} className={`heart ${i < player.hp ? 'heart-full' : 'heart-empty'}`}>
              ♥
            </span>
          ))}
        </div>

        <div className="stamina-bar-wrap">
          <div
            className="stamina-bar-fill"
            style={{
              width: `${staminaRatio * 100}%`,
              backgroundColor: staminaRatio < 0.25 ? '#ff4400' : '#44ff88',
            }}
          />
        </div>
        <div className="stamina-label">STAMINA</div>

        <div className="stack-row">
          {Array.from({ length: player.maxStack }, (_, i) => {
            const filled = i < player.stack;
            const isUltSlot = i >= ULT_STACK_COST - 1;
            const isHealSlot = i >= HEAL_STACK_COST - 1;
            let slotClass = 'stack-slot';
            if (filled) {
              if (isUltSlot && i < player.stack) slotClass += ' stack-ult';
              else if (isHealSlot) slotClass += ' stack-heal';
              else slotClass += ' stack-filled';
            }
            return <div key={i} className={slotClass} />;
          })}
        </div>
        <div className="stack-label">
          <span className={canHeal ? 'stack-action-ready' : 'stack-action-dim'}>[SPACE] 回復</span>
          {' '}
          <span className={canUlt ? 'stack-action-ult' : 'stack-action-dim'}>[MW] 必殺</span>
        </div>

        {player.ultActive && (
          <div className="ult-active-badge">⚡ ULTIMATE ⚡</div>
        )}
      </div>

      {/* ============ ボスHPバー（上部中央） ============ */}
      <div className="hud-boss">
        <div className={`boss-name ${isTransitioning ? 'boss-name-flash' : ''}`}>
          {display.name(boss.phase)}
        </div>
        <div className="boss-hp-bar-wrap">
          <div
            className="boss-hp-bar-fill"
            style={{
              width: `${bossHpRatio * 100}%`,
              backgroundColor: display.hpColor(boss.phase),
            }}
          />
          <div className="boss-hp-phase-mark" style={{ left: '30%' }} />
          <div className="boss-hp-phase-mark" style={{ left: '60%' }} />
        </div>
        {isTransitioning && boss.phase > 1 && (
          <div className="phase-transition-text">
            {boss.phase === 3 ? '— FINAL PHASE —' : '— PHASE 2 —'}
          </div>
        )}
      </div>
    </div>
  );
}
