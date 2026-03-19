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
// BGM エンジン（Undertale風: ピアノ主体・8bitベース・控えめドラム）
// ============================================================

let bgmMasterGain: GainNode | null = null;
let bgmSchedulerTimer: ReturnType<typeof setTimeout> | null = null;
let bgmPhase = 1;
let bgmPlaying = false;

// ---- BPM・テンポ ----
// Phase1=120, Phase2=138, Phase3=158（Undertaleは大体120前後）
function getBpm(): number {
  if (bgmPhase === 3) return 158;
  if (bgmPhase === 2) return 138;
  return 120;
}
// 4分音符1個の秒数
function getBeatSec(): number { return 60 / getBpm(); }

// ============================================================
// Undertale風ピアノ音色（triangle波 + 短いADSR + ローパス）
// ============================================================
function schedulePiano(time: number, freq: number, dur: number, vol = 0.28) {
  if (freq === 0) return;
  try {
    const ac = getCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const lp   = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.Q.value = 0.5;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // ピアノ的ADSR: 瞬間アタック・緩やかなディケイ・短いリリース
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(vol * 0.6, time + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(lp);
    lp.connect(bgmMasterGain!);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  } catch { /* ignore */ }
}

// 8bit風スクエア波ベース
function scheduleSqBass(time: number, freq: number, dur: number, vol = 0.22) {
  if (freq === 0) return;
  try {
    const ac = getCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const lp   = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);

    osc.connect(gain);
    gain.connect(lp);
    lp.connect(bgmMasterGain!);
    osc.start(time);
    osc.stop(time + dur);
  } catch { /* ignore */ }
}

// 控えめなバスドラム
function scheduleKick(time: number, vol = 0.45) {
  try {
    const ac  = getCtx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.07);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(g); g.connect(bgmMasterGain!);
    osc.start(time); osc.stop(time + 0.18);
  } catch { /* ignore */ }
}

// 控えめなスネア（ノイズのみ、短め）
function scheduleSnare(time: number, vol = 0.12) {
  try {
    const ac     = getCtx();
    const dur    = 0.08;
    const bufLen = Math.ceil(ac.sampleRate * dur);
    const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d      = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource();
    ns.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2000;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    ns.connect(hp); hp.connect(g); g.connect(bgmMasterGain!);
    ns.start(time);
  } catch { /* ignore */ }
}

// ============================================================
// 楽曲データ（Undertale風Aマイナー）
// 4分音符単位で書く。0=休符。各配列は1小節(4拍)
// ============================================================

// --- Phase1: 静かで不穏な旋律 ---
// コード進行: Am - F - C - G の4小節ループ
const PHRASE_P1_MELODY: [number, number][][] = [
  // 小節1: Am (A4=440, C5=523, E5=659)
  [[440,1],[0,0.5],[523,0.5],[440,1],[0,1]],
  // 小節2: F  (F4=349, A4=440, C5=523)
  [[349,0.5],[440,0.5],[523,1],[440,0.5],[349,1.5]],
  // 小節3: C  (C4=262, E4=330, G4=392)
  [[392,1],[330,0.5],[0,0.5],[392,0.5],[440,1.5]],
  // 小節4: G  (G4=392, B4=494, D5=587)
  [[494,1],[440,0.5],[392,0.5],[330,2]],
];
const PHRASE_P1_BASS: [number, number][][] = [
  [[110,2],[110,1],[0,1]],   // Am
  [[87.3,2],[87.3,2]],       // F
  [[130.8,2],[130.8,2]],     // C
  [[98,2],[98,1],[0,1]],     // G
];
// kick: 1・3拍, snare: 2・4拍
const BEAT_P1 = [[1,0,0,0],[0,1,0,0],[1,0,0,0],[0,1,0,0]]; // [kick,snare] per beat

// --- Phase2: テンポアップ、メロディが動く ---
const PHRASE_P2_MELODY: [number, number][][] = [
  [[440,0.5],[494,0.5],[523,1],[494,0.5],[440,1.5]],
  [[349,0.5],[392,0.5],[440,1],[349,0.5],[0,1.5]],
  [[392,0.5],[440,0.5],[494,0.5],[523,0.5],[494,1],[440,1]],
  [[494,0.5],[440,0.5],[392,0.5],[330,0.5],[294,2]],
];
const PHRASE_P2_BASS: [number, number][][] = [
  [[110,1],[110,1],[165,1],[0,1]],
  [[87.3,1],[87.3,1],[131,2]],
  [[130.8,1],[130.8,1],[196,2]],
  [[98,1],[98,1],[147,1],[0,1]],
];

// --- Phase3: 緊張感の高い速い旋律 ---
const PHRASE_P3_MELODY: [number, number][][] = [
  [[440,0.5],[523,0.25],[494,0.25],[440,0.5],[392,0.5],[440,1],[0,1]],
  [[349,0.5],[440,0.5],[494,0.5],[523,0.5],[440,1],[0,1]],
  [[659,0.5],[587,0.5],[523,0.5],[494,0.5],[440,1],[392,1]],
  [[494,0.25],[440,0.25],[392,0.5],[330,0.5],[294,0.5],[330,0.5],[440,1.5]],
];
const PHRASE_P3_BASS: [number, number][][] = [
  [[110,0.5],[110,0.5],[165,0.5],[110,0.5],[110,2]],
  [[87.3,0.5],[87.3,0.5],[131,1],[87.3,2]],
  [[130.8,0.5],[130.8,0.5],[196,1],[130.8,2]],
  [[98,0.5],[98,0.5],[147,0.5],[98,0.5],[98,2]],
];

function getPhrase() {
  if (bgmPhase === 3) return { mel: PHRASE_P3_MELODY, bass: PHRASE_P3_BASS };
  if (bgmPhase === 2) return { mel: PHRASE_P2_MELODY, bass: PHRASE_P2_BASS };
  return { mel: PHRASE_P1_MELODY, bass: PHRASE_P1_BASS };
}

// ============================================================
// スケジューラ（1小節先読みして音符をスケジュール）
// ============================================================
const SCHEDULE_AHEAD = 0.15;
const SCHEDULER_INTERVAL = 60;
// 現在スケジュール済みの小節番号
let bgmMeasure = 0;
// 次にスケジュールする小節の開始時刻
let bgmMeasureStartTime = 0;

function scheduleMeasure(measureIdx: number, startTime: number) {
  const { mel, bass } = getPhrase();
  const beatSec = getBeatSec();
  const measure = measureIdx % 4;

  // メロディ
  let t = startTime;
  for (const [freq, dur] of mel[measure]) {
    schedulePiano(t, freq, dur * beatSec * 0.92);
    t += dur * beatSec;
  }

  // ベース
  let bt = startTime;
  for (const [freq, dur] of bass[measure]) {
    scheduleSqBass(bt, freq, dur * beatSec * 0.88);
    bt += dur * beatSec;
  }

  // ドラム（4拍ぶん）
  for (let b = 0; b < 4; b++) {
    const beatTime = startTime + b * beatSec;
    const [kick, snare] = BEAT_P1[b];
    if (kick)  scheduleKick(beatTime,  bgmPhase === 3 ? 0.5 : bgmPhase === 2 ? 0.4 : 0.35);
    if (snare) scheduleSnare(beatTime, bgmPhase === 3 ? 0.18 : bgmPhase === 2 ? 0.14 : 0.1);
    // Phase3: 8分音符のサブキック
    if (bgmPhase === 3) {
      scheduleKick(beatTime + beatSec * 0.5, 0.2);
    }
  }
}

function bgmScheduler() {
  if (!bgmPlaying || !bgmMasterGain) return;

  const ac = getCtx();
  const beatSec = getBeatSec();
  const measureSec = beatSec * 4;

  while (bgmMeasureStartTime < ac.currentTime + SCHEDULE_AHEAD + measureSec) {
    scheduleMeasure(bgmMeasure, bgmMeasureStartTime);
    bgmMeasure++;
    bgmMeasureStartTime += measureSec;
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
    bgmMasterGain.gain.value = 0.72;
    bgmMasterGain.connect(ac.destination);

    bgmPlaying = true;
    bgmMeasure = 0;
    bgmMeasureStartTime = ac.currentTime + 0.05;
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

// ============================================================
// クリアBGM
// ============================================================

let clearBgmGain: GainNode | null = null;
let clearBgmTimer: ReturnType<typeof setTimeout> | null = null;
let clearBgmPlaying = false;

/**
 * クリアBGM停止
 */
export function stopClearBgm(fadeMs = 600) {
  clearBgmPlaying = false;
  if (clearBgmTimer !== null) {
    clearTimeout(clearBgmTimer);
    clearBgmTimer = null;
  }
  if (clearBgmGain) {
    const ac = getCtx();
    clearBgmGain.gain.setValueAtTime(clearBgmGain.gain.value, ac.currentTime);
    clearBgmGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + fadeMs / 1000);
    const old = clearBgmGain;
    setTimeout(() => { try { old.disconnect(); } catch { /* ignore */ } }, fadeMs + 100);
    clearBgmGain = null;
  }
}

// ---- 内部ヘルパー ----

function scheduleNote(
  ac: AudioContext,
  dest: AudioNode,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number,
  attack = 0.02,
  release = 0.3,
) {
  if (freq === 0) return;
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  g.gain.setValueAtTime(0.001, startTime);
  g.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
  g.gain.setValueAtTime(gainPeak, startTime + duration - release);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(g);
  g.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function scheduleChord(
  ac: AudioContext,
  dest: AudioNode,
  freqs: number[],
  startTime: number,
  duration: number,
  vol = 0.12,
) {
  for (const f of freqs) {
    scheduleNote(ac, dest, f, 'sine', startTime, duration, vol, 0.04, 0.5);
  }
}

function scheduleArpeggio(
  ac: AudioContext,
  dest: AudioNode,
  freqs: number[],
  startTime: number,
  stepSec: number,
  vol = 0.18,
) {
  freqs.forEach((f, i) => {
    scheduleNote(ac, dest, f, 'triangle', startTime + i * stepSec, stepSec * 2, vol, 0.01, stepSec * 1.5);
  });
}

function schedulePercBoom(ac: AudioContext, dest: AudioNode, time: number) {
  // キックドラム
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
  g.gain.setValueAtTime(0.9, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(g); g.connect(dest);
  osc.start(time); osc.stop(time + 0.3);

  // ノイズ
  const bufLen = Math.ceil(ac.sampleRate * 0.05);
  const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
  const d      = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
  const ns  = ac.createBufferSource();
  ns.buffer = buf;
  const ng  = ac.createGain();
  ng.gain.setValueAtTime(0.4, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  ns.connect(ng); ng.connect(dest);
  ns.start(time);
}

function scheduleBell(
  ac: AudioContext,
  dest: AudioNode,
  freq: number,
  time: number,
  vol = 0.25,
) {
  // ベル音 = サイン波 + 倍音 + 長いリリース
  const harmonics = [1, 2.756, 5.404, 8.933];
  const gains     = [1.0,  0.5,   0.25,  0.1];
  for (let h = 0; h < harmonics.length; h++) {
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * harmonics[h];
    const peak = vol * gains[h];
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, time + 3.5);
    osc.connect(g); g.connect(dest);
    osc.start(time); osc.stop(time + 3.6);
  }
}

/**
 * クリアBGM開始
 *
 * 構成:
 *   0.0s  ── ファンファーレ（ドラムブーム + 上昇コード）
 *   2.0s  ── 解放のメロディ（Cメジャー、明るいアルペジオ）
 *   6.0s  ── 壮大コーラス（弦楽風コード + ベル）
 *  12.0s  ── 静かなアウトロ（余韻）
 *  16.0s  ── フェードアウト
 */
export function startClearBgm() {
  if (clearBgmPlaying) return;
  clearBgmPlaying = true;

  try {
    const ac   = getCtx();
    const master = ac.createGain();
    master.gain.value = 0.0;
    master.connect(ac.destination);
    clearBgmGain = master;

    const t0 = ac.currentTime + 0.1;

    // フェードイン
    master.gain.linearRampToValueAtTime(0.75, t0 + 0.5);

    // ---- 0.0s: ファンファーレ ----
    // ドラムブーム x3
    schedulePercBoom(ac, master, t0 + 0.0);
    schedulePercBoom(ac, master, t0 + 0.5);
    schedulePercBoom(ac, master, t0 + 0.9);

    // 上昇コード: C → G → Am → F（各0.4s）
    const fanfareChords = [
      [261.6, 329.6, 392.0],   // C
      [392.0, 493.9, 587.3],   // G
      [440.0, 523.3, 659.3],   // Am（高め）
      [349.2, 440.0, 523.3],   // F
    ];
    fanfareChords.forEach((ch, i) => {
      scheduleChord(ac, master, ch, t0 + i * 0.42, 0.5, 0.18);
    });

    // 高音ファンファーレリード（トランペット風 sawtooth）
    const fanLead = [523.3, 587.3, 659.3, 784.0, 880.0];
    fanLead.forEach((f, i) => {
      scheduleNote(ac, master, f, 'sawtooth', t0 + i * 0.18, 0.22, 0.15, 0.01, 0.1);
    });

    // ---- 2.0s: 解放のメロディ ----
    const m = t0 + 2.0;
    // アルペジオベース（C major）
    const arp1 = [261.6, 329.6, 392.0, 523.3, 659.3, 523.3, 392.0, 329.6];
    scheduleArpeggio(ac, master, arp1, m,       0.22, 0.14);
    scheduleArpeggio(ac, master, arp1, m + 1.8, 0.22, 0.14);

    // メロディライン（明るいCメジャー）
    const melody1 = [
      [523.3, 0.35], [587.3, 0.2], [659.3, 0.4],
      [784.0, 0.55], [880.0, 0.9],
      [784.0, 0.25], [659.3, 0.25], [587.3, 0.5],
    ];
    let mt = m + 0.1;
    for (const [f, dur] of melody1) {
      scheduleNote(ac, master, f as number, 'triangle', mt, dur as number, 0.22, 0.02, 0.15);
      mt += (dur as number) + 0.04;
    }

    // コード伴奏
    scheduleChord(ac, master, [261.6, 329.6, 392.0], m,       1.6, 0.08); // C
    scheduleChord(ac, master, [392.0, 493.9, 587.3], m + 1.8, 1.6, 0.08); // G

    // ---- 6.0s: 壮大コーラス ----
    const c = t0 + 6.0;

    // コード進行: C - F - G - C（各1.5s）
    const bigChords: [number[], number][] = [
      [[130.8, 261.6, 329.6, 392.0, 523.3], 1.5], // C
      [[174.6, 261.6, 349.2, 440.0, 523.3], 1.5], // F
      [[196.0, 293.7, 392.0, 493.9, 587.3], 1.5], // G
      [[130.8, 261.6, 329.6, 523.3, 659.3], 1.5], // C high
    ];
    let ct = c;
    for (const [freqs, dur] of bigChords) {
      scheduleChord(ac, master, freqs, ct, dur, 0.1);
      ct += dur;
    }

    // ベル（コードの頭で鳴らす）
    scheduleBell(ac, master, 523.3, c + 0.0, 0.22);
    scheduleBell(ac, master, 440.0, c + 1.5, 0.18);
    scheduleBell(ac, master, 392.0, c + 3.0, 0.18);
    scheduleBell(ac, master, 523.3, c + 4.5, 0.25);

    // アルペジオ（高音）
    const arp2 = [523.3, 659.3, 784.0, 1046.5, 784.0, 659.3];
    scheduleArpeggio(ac, master, arp2, c,       0.25, 0.12);
    scheduleArpeggio(ac, master, arp2, c + 1.5, 0.25, 0.12);
    scheduleArpeggio(ac, master, arp2, c + 3.0, 0.25, 0.12);
    scheduleArpeggio(ac, master, arp2, c + 4.5, 0.25, 0.12);

    // ドラムブームをコーラス頭に
    schedulePercBoom(ac, master, c);
    schedulePercBoom(ac, master, c + 3.0);

    // ---- 12.0s: 静かなアウトロ ----
    const a = t0 + 12.0;
    // ピアノ風の単音アルペジオ（しずかに）
    const outro = [523.3, 659.3, 784.0, 1046.5, 784.0, 659.3, 523.3, 392.0];
    scheduleArpeggio(ac, master, outro, a,       0.3, 0.09);
    scheduleArpeggio(ac, master, outro, a + 2.5, 0.3, 0.07);

    // 最後のベル
    scheduleBell(ac, master, 1046.5, a + 0.0, 0.15);
    scheduleBell(ac, master, 784.0,  a + 1.5, 0.12);
    scheduleBell(ac, master, 523.3,  a + 3.5, 0.18);

    // ---- 16.0s: フェードアウト ----
    master.gain.setValueAtTime(0.75, t0 + 15.5);
    master.gain.exponentialRampToValueAtTime(0.001, t0 + 18.0);

    // 18s後にリソース解放
    clearBgmTimer = setTimeout(() => {
      clearBgmPlaying = false;
      try { master.disconnect(); } catch { /* ignore */ }
      if (clearBgmGain === master) clearBgmGain = null;
    }, 18500);

  } catch { /* ignore */ }
}
