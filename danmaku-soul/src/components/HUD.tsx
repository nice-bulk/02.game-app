import { useGameStore } from '../store/gameStore';
import { HEAL_STACK_COST, ULT_STACK_COST } from '../game/constants';

export function HUD() {
  const { player, boss, phase } = useGameStore();

  if (phase !== 'playing') return null;

  const staminaRatio = player.stamina / player.maxStamina;
  const bossHpRatio = boss.hp / boss.maxHp;

  const canHeal = player.stack >= HEAL_STACK_COST && player.hp < player.maxHp;
  const canUlt  = player.stack >= ULT_STACK_COST;
  const isTransitioning = boss.phaseTransitionTimer > 0;

  return (
    <div className="hud">
      {/* ============ プレイヤー左下 ============ */}
      <div className="hud-player">
        {/* HP ハート */}
        <div className="hp-row">
          {Array.from({ length: player.maxHp }, (_, i) => (
            <span key={i} className={`heart ${i < player.hp ? 'heart-full' : 'heart-empty'}`}>
              ♥
            </span>
          ))}
        </div>

        {/* スタミナ */}
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

        {/* スタックゲージ */}
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
          <span className={canHeal ? 'stack-action-ready' : 'stack-action-dim'}>
            [SPACE] 回復
          </span>
          {' '}
          <span className={canUlt ? 'stack-action-ult' : 'stack-action-dim'}>
            [MW] 必殺
          </span>
        </div>

        {/* 必殺技アクティブ表示 */}
        {player.ultActive && (
          <div className="ult-active-badge">
            ⚡ ULTIMATE ⚡
          </div>
        )}
      </div>

      {/* ============ ボスHPバー（上部中央） ============ */}
      <div className="hud-boss">
        <div className={`boss-name ${isTransitioning ? 'boss-name-flash' : ''}`}>
          {boss.phase === 3
            ? '⚡ ANCIENT SOUL ⚡'
            : boss.phase === 2
            ? '💀 ANCIENT SOUL'
            : 'ANCIENT SOUL'}
        </div>
        <div className="boss-hp-bar-wrap">
          <div
            className="boss-hp-bar-fill"
            style={{
              width: `${bossHpRatio * 100}%`,
              backgroundColor:
                boss.phase === 3 ? '#ff2200' : boss.phase === 2 ? '#cc4400' : '#aa6600',
            }}
          />
          <div className="boss-hp-phase-mark" style={{ left: '30%' }} />
          <div className="boss-hp-phase-mark" style={{ left: '60%' }} />
        </div>
        {/* フェーズ移行テキスト */}
        {isTransitioning && boss.phase > 1 && (
          <div className="phase-transition-text">
            {boss.phase === 3 ? '— FINAL PHASE —' : '— PHASE 2 —'}
          </div>
        )}
      </div>
    </div>
  );
}
