// Web Audio API による効果音管理

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  // ユーザー操作後の再開
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  volumeStart: number,
  volumeEnd: number,
  delay = 0,
) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);

    gain.gain.setValueAtTime(volumeStart, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volumeEnd, 0.001),
      ac.currentTime + delay + duration,
    );

    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  } catch {
    // AudioContext が使えない環境では無視
  }
}

function playNoise(duration: number, volume: number, delay = 0) {
  try {
    const ac = getCtx();
    const bufferSize = Math.ceil(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);

    source.connect(gain);
    gain.connect(ac.destination);
    source.start(ac.currentTime + delay);
  } catch {
    // ignore
  }
}

// ---- 各効果音 ----

/** ビーム発射音 */
export function playBeamSound(ultActive: boolean) {
  if (ultActive) {
    playTone(880, 'sawtooth', 0.08, 0.12, 0.01);
    playTone(1100, 'sine', 0.08, 0.08, 0.01);
  } else {
    playTone(660, 'sawtooth', 0.07, 0.08, 0.01);
  }
}

/** 被弾音 */
export function playHitSound() {
  playNoise(0.15, 0.35);
  playTone(150, 'square', 0.12, 0.3, 0.01);
}

/** パリィ成功音 */
export function playParrySound() {
  // 金属的なリング音
  playTone(1200, 'sine', 0.05, 0.5, 0.01);
  playTone(1800, 'sine', 0.08, 0.4, 0.01, 0.02);
  playTone(2400, 'sine', 0.12, 0.3, 0.01, 0.04);
  playTone(900,  'triangle', 0.3, 0.2, 0.01, 0.05);
}

/** 体幹崩し音（ボスにスタン）*/
export function playStunSound() {
  // ドスン＋低音振動
  playTone(60,  'square', 0.4, 0.6, 0.01);
  playTone(80,  'sine',   0.5, 0.4, 0.01, 0.05);
  playTone(120, 'square', 0.3, 0.3, 0.01, 0.1);
  playNoise(0.2, 0.25, 0.0);
}

/** ボムがヒットした重い爆発音 */
export function playBombHitSound() {
  playNoise(0.25, 0.5);
  playTone(80,  'sine',   0.3, 0.5, 0.01);
  playTone(120, 'square', 0.2, 0.35, 0.01, 0.05);
}

/** ボスにビームがヒットした小さい音 */
export function playBossHitSound() {
  playTone(440, 'square', 0.04, 0.06, 0.001);
}

/** 必殺技発動音 */
export function playUltSound() {
  // 上昇スウィープ
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ac.currentTime + 0.4);
    gain.gain.setValueAtTime(0.4, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.5);
  } catch { /* ignore */ }

  playTone(200, 'sine', 0.6, 0.35, 0.01, 0.1);
  playNoise(0.15, 0.3);
}

/** HP回復音 */
export function playHealSound() {
  playTone(600,  'sine', 0.1, 0.2, 0.01);
  playTone(800,  'sine', 0.1, 0.2, 0.01, 0.08);
  playTone(1000, 'sine', 0.15, 0.15, 0.01, 0.16);
}

/** ジャスト回避音 */
export function playReflexSound() {
  playTone(800, 'sine', 0.06, 0.15, 0.01);
  playTone(1200, 'sine', 0.08, 0.12, 0.01, 0.03);
}

/** フェーズ移行音 */
export function playPhaseTransitionSound(phase: number) {
  if (phase === 2) {
    playTone(300, 'sawtooth', 0.5, 0.5, 0.01);
    playTone(200, 'square',   0.4, 0.4, 0.01, 0.2);
    playNoise(0.3, 0.3, 0.1);
  } else if (phase === 3) {
    playTone(200, 'sawtooth', 0.6, 0.6, 0.01);
    playTone(150, 'square',   0.5, 0.5, 0.01, 0.1);
    playTone(100, 'square',   0.4, 0.4, 0.01, 0.2);
    playNoise(0.4, 0.4, 0.05);
  }
}

/** ボス弾幕発射音 */
export function playShootSound(phase: number) {
  const freq = phase === 3 ? 180 : phase === 2 ? 200 : 220;
  playTone(freq, 'square', 0.06, 0.12, 0.01);
}

/** ボム発射音 */
export function playBombLaunchSound() {
  playTone(100, 'sawtooth', 0.2, 0.3, 0.01);
  playNoise(0.1, 0.2);
}
