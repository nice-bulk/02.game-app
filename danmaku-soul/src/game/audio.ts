// Web Audio API による効果音・BGM管理

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

// ============================================================
// BGM エンジン
// ============================================================

// マスターゲイン（BGM全体の音量）
let bgmMasterGain: GainNode | null = null;
// スケジューラ用タイマー
let bgmSchedulerTimer: ReturnType<typeof setTimeout> | null = null;
// 現在のフェーズ（BGMが参照）
let bgmPhase = 1;
// 再生中フラグ
let bgmPlaying = false;
// 次回スケジュール時刻
let bgmNextBeatTime = 0;
// 現在のビート番号（16分音符単位）
let bgmBeat = 0;

// ---- 音楽パラメータ ----
// BPM: Phase1=110, Phase2=130, Phase3=155
function getBpm(): number {
  if (bgmPhase === 3) return 155;
  if (bgmPhase === 2) return 130;
  return 110;
}
function getStepSec(): number {
  return 60 / getBpm() / 4; // 16分音符1個の秒数
}

// Amマイナースケール上のベース音（Hz）
// Am - F - G - Em の4小節ループ（各4拍=16ステップ）
const BASE_NOTES_HZ: number[] = [
  // Am (A2=110Hz)
  110, 0, 0, 0,  110, 0, 0, 82.4,
  // F (F2=87.3Hz)
  87.3, 0, 0, 0,  87.3, 0, 0, 0,
  // G (G2=98Hz)
  98, 0, 0, 0,  98, 0, 82.4, 0,
  // Em (E2=82.4Hz)
  82.4, 0, 0, 0,  82.4, 0, 0, 0,
];
const PATTERN_LEN = BASE_NOTES_HZ.length; // 32ステップ = 2小節 × 2

// メロディ（高音シンセ） - Aマイナーペンタ上の不規則フレーズ
// Hz: 0=休符
const MELODY_A: number[] = [
  // 小節1
  0,0,0,0, 440,0,0,0, 0,0,392,0, 0,0,0,0,
  // 小節2
  0,0,330,0, 0,0,0,0, 294,0,0,0, 0,0,0,0,
];
const MELODY_B: number[] = [
  // Phase2以降：より動きの多いフレーズ
  0,0,440,0, 523,0,494,0, 440,0,0,0, 392,0,0,0,
  0,0,330,0, 0,349,0,0,   294,0,330,0, 0,0,0,0,
];
const MELODY_C: number[] = [
  // Phase3：高速・緊張感
  440,0,494,0, 523,494,440,0, 392,0,440,0, 494,0,523,0,
  494,0,440,0, 392,330,294,0, 330,0,392,0, 440,0,0,0,
];

// ---- ドラムパターン ----
// 各配列はPATTERN_LEN(32)ステップ分
// kick
const KICK_P1  = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
const KICK_P2  = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,1,0, 0,0,0,0];
const KICK_P3  = [1,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,1,0, 1,0,1,0, 0,1,0,0, 1,0,1,0, 0,0,1,0];
// snare
const SNARE_P1 = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
const SNARE_P2 = [0,0,0,0, 1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0];
const SNARE_P3 = [0,0,0,0, 1,0,0,1, 0,0,1,0, 1,0,0,0, 0,0,1,0, 1,0,0,1, 0,0,0,0, 1,0,1,0];
// hihat
const HIHAT_P1 = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];
const HIHAT_P2 = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
const HIHAT_P3 = [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];

function getKick()  { return bgmPhase===3 ? KICK_P3  : bgmPhase===2 ? KICK_P2  : KICK_P1; }
function getSnare() { return bgmPhase===3 ? SNARE_P3 : bgmPhase===2 ? SNARE_P2 : SNARE_P1; }
function getHihat() { return bgmPhase===3 ? HIHAT_P3 : bgmPhase===2 ? HIHAT_P2 : HIHAT_P1; }
function getMelody(){ return bgmPhase===3 ? MELODY_C  : bgmPhase===2 ? MELODY_B  : MELODY_A; }

// ---- 各音源スケジュール ----

function scheduleKick(time: number) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(bgmMasterGain!);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
    gain.gain.setValueAtTime(1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.start(time);
    osc.stop(time + 0.25);

    // 低音ノイズクリック
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.02), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource();
    ns.buffer = buf;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.3, time);
    ng.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    ns.connect(ng);
    ng.connect(bgmMasterGain!);
    ns.start(time);
  } catch { /* ignore */ }
}

function scheduleSnare(time: number) {
  try {
    const ac = getCtx();
    const bufLen = Math.ceil(ac.sampleRate * 0.18);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource();
    ns.buffer = buf;

    // ハイパスフィルタ
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    ns.connect(hp);
    hp.connect(gain);
    gain.connect(bgmMasterGain!);
    ns.start(time);

    // スネアのトーン成分
    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(180, time + 0.06);
    og.gain.setValueAtTime(0.25, time);
    og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(og);
    og.connect(bgmMasterGain!);
    osc.start(time);
    osc.stop(time + 0.1);
  } catch { /* ignore */ }
}

function scheduleHihat(time: number, open: boolean) {
  try {
    const ac = getCtx();
    const dur = open ? 0.12 : 0.04;
    const bufLen = Math.ceil(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource();
    ns.buffer = buf;

    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    ns.connect(hp);
    hp.connect(gain);
    gain.connect(bgmMasterGain!);
    ns.start(time);
  } catch { /* ignore */ }
}

function scheduleBass(time: number, freq: number, stepSec: number) {
  if (freq === 0) return;
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    // ローパスフィルタで丸くする
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const dur = stepSec * 1.8;
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(lp);
    lp.connect(bgmMasterGain!);
    osc.start(time);
    osc.stop(time + dur);
  } catch { /* ignore */ }
}

function scheduleMelody(time: number, freq: number, stepSec: number) {
  if (freq === 0) return;
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = bgmPhase === 3 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(freq, time);

    // 軽いビブラート
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 5.5;
    lfoGain.gain.value = bgmPhase === 3 ? 6 : 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(time);
    lfo.stop(time + stepSec * 2);

    // ハイパスで暗い低音成分をカット
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 200;

    const vol = bgmPhase === 3 ? 0.14 : 0.1;
    const dur = stepSec * 1.5;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(hp);
    hp.connect(bgmMasterGain!);
    osc.start(time);
    osc.stop(time + dur);
  } catch { /* ignore */ }
}

// ---- スケジューラ本体 ----
const SCHEDULE_AHEAD = 0.12; // 何秒先までスケジュールするか
const SCHEDULER_INTERVAL = 60; // ms

function bgmScheduler() {
  if (!bgmPlaying || !bgmMasterGain) return;

  const ac = getCtx();
  const stepSec = getStepSec();

  while (bgmNextBeatTime < ac.currentTime + SCHEDULE_AHEAD) {
    const step = bgmBeat % PATTERN_LEN;
    const t = bgmNextBeatTime;

    // ドラム
    if (getKick()[step])  scheduleKick(t);
    if (getSnare()[step]) scheduleSnare(t);
    if (getHihat()[step]) scheduleHihat(t, step % 8 === 4);

    // ベース
    scheduleBass(t, BASE_NOTES_HZ[step], stepSec);

    // メロディ
    const mel = getMelody();
    scheduleMelody(t, mel[step % mel.length], stepSec);

    bgmNextBeatTime += stepSec;
    bgmBeat++;
  }

  bgmSchedulerTimer = setTimeout(bgmScheduler, SCHEDULER_INTERVAL);
}

// ---- 公開API ----

/** BGM開始 */
export function startBgm() {
  if (bgmPlaying) return;
  try {
    const ac = getCtx();
    bgmMasterGain = ac.createGain();
    bgmMasterGain.gain.value = 0.7;
    bgmMasterGain.connect(ac.destination);

    bgmPlaying = true;
    bgmBeat = 0;
    bgmNextBeatTime = ac.currentTime + 0.05;
    bgmScheduler();
  } catch { /* ignore */ }
}

/** BGM停止（フェードアウト） */
export function stopBgm(fadeMs = 400) {
  if (!bgmPlaying) return;
  bgmPlaying = false;
  if (bgmSchedulerTimer !== null) {
    clearTimeout(bgmSchedulerTimer);
    bgmSchedulerTimer = null;
  }
  if (bgmMasterGain) {
    const ac = getCtx();
    bgmMasterGain.gain.setValueAtTime(bgmMasterGain.gain.value, ac.currentTime);
    bgmMasterGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + fadeMs / 1000);
    const old = bgmMasterGain;
    setTimeout(() => { try { old.disconnect(); } catch { /* ignore */ } }, fadeMs + 100);
    bgmMasterGain = null;
  }
}

/** フェーズ変更通知（BGMが次のループから変わる） */
export function setBgmPhase(phase: number) {
  bgmPhase = phase;
}

/** BGM再生中かどうか */
export function isBgmPlaying() {
  return bgmPlaying;
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
