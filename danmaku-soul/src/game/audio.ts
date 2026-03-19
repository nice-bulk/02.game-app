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

// ---- BPM（フェーズ別）----
function getBpm(): number {
  if (bgmPhase === 3) return 178;
  if (bgmPhase === 2) return 160;
  return 145;
}
function getBeatSec(): number { return 60 / getBpm(); }

// ============================================================
// 戦闘BGM 音色（攻撃的・緊張感）
// ============================================================

// のこぎり波リード（攻撃的なメロディ用）
function scheduleLead(time: number, freq: number, dur: number, vol = 0.18) {
  if (freq === 0) return;
  try {
    const ac   = getCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const lp   = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = bgmPhase === 3 ? 3500 : 2800;
    lp.Q.value = 1.5;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // 鋭いアタック・短いディケイ
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(vol * 0.7, time + dur * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.85);

    osc.connect(gain);
    gain.connect(lp);
    lp.connect(bgmMasterGain!);
    osc.start(time);
    osc.stop(time + dur);
  } catch { /* ignore */ }
}

// 歪んだ8bitベース（square波 + 矩形波歪み風）
function scheduleBattleBass(time: number, freq: number, dur: number, vol = 0.35) {
  if (freq === 0) return;
  try {
    const ac   = getCtx();
    // 1オクターブ下と合わせて重厚に
    for (const [f, v] of [[freq, vol], [freq * 0.5, vol * 0.5]] as [number, number][]) {
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      const lp   = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, time);

      gain.gain.setValueAtTime(v, time);
      gain.gain.exponentialRampToValueAtTime(v * 0.6, time + dur * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.85);

      osc.connect(gain);
      gain.connect(lp);
      lp.connect(bgmMasterGain!);
      osc.start(time);
      osc.stop(time + dur);
    }
  } catch { /* ignore */ }
}

// 重いキック
function scheduleKick(time: number, vol = 0.8) {
  try {
    const ac  = getCtx();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.09);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(g); g.connect(bgmMasterGain!);
    osc.start(time); osc.stop(time + 0.22);

    // クリック成分
    const bufLen = Math.ceil(ac.sampleRate * 0.01);
    const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d      = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource(); ns.buffer = buf;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.5, time);
    ng.gain.exponentialRampToValueAtTime(0.001, time + 0.01);
    ns.connect(ng); ng.connect(bgmMasterGain!);
    ns.start(time);
  } catch { /* ignore */ }
}

// パワースネア
function scheduleSnare(time: number, vol = 0.35) {
  try {
    const ac     = getCtx();
    const dur    = 0.15;
    const bufLen = Math.ceil(ac.sampleRate * dur);
    const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d      = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource(); ns.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1500;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    ns.connect(hp); hp.connect(g); g.connect(bgmMasterGain!);
    ns.start(time);

    // スネアのトーン
    const osc = ac.createOscillator();
    const og  = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    osc.frequency.exponentialRampToValueAtTime(180, time + 0.05);
    og.gain.setValueAtTime(vol * 0.5, time);
    og.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(og); og.connect(bgmMasterGain!);
    osc.start(time); osc.stop(time + 0.08);
  } catch { /* ignore */ }
}

// ハイハット
function scheduleHihat(time: number, vol = 0.12) {
  try {
    const ac     = getCtx();
    const dur    = 0.04;
    const bufLen = Math.ceil(ac.sampleRate * dur);
    const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
    const d      = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource(); ns.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 8000;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    ns.connect(hp); hp.connect(g); g.connect(bgmMasterGain!);
    ns.start(time);
  } catch { /* ignore */ }
}

// ============================================================
// 戦闘楽曲データ（Aマイナー・高速・緊張感）
// 4分音符単位。0=休符。各配列は1小節(4拍)
// コード進行: Am - Dm - Em - Am の8小節ループ（2周で1サイクル）
// ============================================================

// --- Phase1 (145BPM): 不穏・緊張 ---
const BATTLE_P1_MELODY: [number, number][][] = [
  // Am: 跳躍するリフ
  [[440,0.5],[0,0.25],[523,0.25],[440,0.5],[392,0.5],[440,1],[0,1]],
  // Dm: 下降フレーズ
  [[587,0.5],[523,0.5],[494,0.5],[440,0.5],[392,1],[330,1]],
  // Em: 緊張の上昇
  [[330,0.5],[392,0.5],[440,0.5],[494,0.5],[523,1],[0,1]],
  // Am解決
  [[440,0.75],[494,0.25],[440,0.5],[392,0.5],[330,2]],
];
const BATTLE_P1_BASS: [number, number][][] = [
  [[110,0.5],[110,0.5],[110,0.5],[0,0.5],[110,2]],   // Am
  [[146.8,0.5],[146.8,0.5],[0,0.5],[146.8,0.5],[146.8,2]], // Dm
  [[164.8,0.5],[164.8,0.5],[164.8,0.5],[0,0.5],[164.8,2]], // Em
  [[110,0.5],[110,0.5],[0,0.5],[165,0.5],[110,2]],    // Am
];
// ドラムパターン（[kick, snare, hihat] per 8分音符×8）
const DRUM_P1 = [
//  k  s  h  k  s  h  k  s
  [1, 0, 1, 0, 1, 0, 1, 0], // kick
  [0, 0, 0, 0, 1, 0, 0, 0], // snare
  [1, 1, 1, 1, 1, 1, 1, 1], // hihat
];

// --- Phase2 (160BPM): 激化・前進感 ---
const BATTLE_P2_MELODY: [number, number][][] = [
  [[440,0.25],[523,0.25],[494,0.25],[440,0.25],[523,0.5],[659,0.5],[523,1],[440,1]],
  [[587,0.5],[523,0.25],[494,0.25],[587,0.5],[0,0.5],[494,1],[440,1]],
  [[330,0.25],[392,0.25],[440,0.25],[494,0.25],[523,0.5],[659,0.5],[784,1],[0,1]],
  [[880,0.5],[784,0.5],[659,0.5],[587,0.5],[523,0.5],[494,0.5],[440,1]],
];
const BATTLE_P2_BASS: [number, number][][] = [
  [[110,0.25],[110,0.25],[165,0.25],[110,0.25],[110,0.5],[110,0.5],[165,1],[110,1]],
  [[146.8,0.5],[146.8,0.25],[0,0.25],[146.8,0.5],[220,0.5],[146.8,2]],
  [[164.8,0.25],[164.8,0.25],[164.8,0.25],[0,0.25],[164.8,0.5],[247,0.5],[164.8,2]],
  [[110,0.25],[110,0.25],[165,0.5],[110,0.5],[0,0.5],[110,2]],
];
const DRUM_P2 = [
  [1, 0, 1, 1, 1, 0, 1, 1], // kick（シンコペ）
  [0, 0, 0, 0, 1, 0, 0, 1], // snare
  [1, 1, 1, 1, 1, 1, 1, 1], // hihat
];

// --- Phase3 (178BPM): 最終決戦・全力 ---
const BATTLE_P3_MELODY: [number, number][][] = [
  [[440,0.25],[494,0.25],[523,0.25],[659,0.25],[784,0.5],[880,0.5],[784,0.5],[659,0.5],[523,1]],
  [[880,0.5],[784,0.25],[659,0.25],[784,0.5],[659,0.5],[523,0.5],[494,0.5],[440,1]],
  [[330,0.25],[392,0.5],[440,0.25],[494,0.5],[523,0.25],[659,0.25],[784,0.5],[880,0.5],[784,1]],
  [[1046,0.5],[880,0.5],[784,0.5],[659,0.5],[523,0.5],[494,0.5],[440,0.5],[392,0.5]],
];
const BATTLE_P3_BASS: [number, number][][] = [
  [[110,0.25],[110,0.25],[110,0.25],[110,0.25],[165,0.5],[110,0.5],[165,0.5],[110,0.5],[110,1]],
  [[110,0.25],[0,0.25],[110,0.25],[165,0.25],[110,0.5],[220,0.5],[110,1],[110,1]],
  [[164.8,0.25],[164.8,0.25],[164.8,0.25],[164.8,0.25],[247,0.5],[164.8,0.5],[247,0.5],[164.8,1]],
  [[110,0.25],[110,0.25],[165,0.5],[110,0.25],[110,0.25],[110,0.5],[165,0.5],[110,1]],
];
const DRUM_P3 = [
  [1, 1, 0, 1, 1, 0, 1, 1], // kick（ダブルビート）
  [0, 0, 1, 0, 1, 0, 0, 1], // snare
  [1, 1, 1, 1, 1, 1, 1, 1], // hihat
];

function getBattlePhrase() {
  if (bgmPhase === 3) return { mel: BATTLE_P3_MELODY, bass: BATTLE_P3_BASS, drum: DRUM_P3 };
  if (bgmPhase === 2) return { mel: BATTLE_P2_MELODY, bass: BATTLE_P2_BASS, drum: DRUM_P2 };
  return { mel: BATTLE_P1_MELODY, bass: BATTLE_P1_BASS, drum: DRUM_P1 };
}

// ============================================================
// スケジューラ
// ============================================================
const SCHEDULE_AHEAD = 0.15;
const SCHEDULER_INTERVAL = 60;
let bgmMeasure = 0;
let bgmMeasureStartTime = 0;

function scheduleMeasure(measureIdx: number, startTime: number) {
  const { mel, bass, drum } = getBattlePhrase();
  const beatSec = getBeatSec();
  const halfBeat = beatSec * 0.5; // 8分音符
  const measure = measureIdx % 4;

  // メロディ（のこぎり波リード）
  let t = startTime;
  for (const [freq, dur] of mel[measure]) {
    scheduleLead(t, freq, dur * beatSec * 0.88);
    t += dur * beatSec;
  }

  // ベース
  let bt = startTime;
  for (const [freq, dur] of bass[measure]) {
    scheduleBattleBass(bt, freq, dur * beatSec * 0.82);
    bt += dur * beatSec;
  }

  // ドラム（8分音符×8でパターン）
  for (let i = 0; i < 8; i++) {
    const stepTime = startTime + i * halfBeat;
    if (drum[0][i]) scheduleKick(stepTime,   bgmPhase === 3 ? 0.9 : bgmPhase === 2 ? 0.8 : 0.7);
    if (drum[1][i]) scheduleSnare(stepTime,  bgmPhase === 3 ? 0.4 : bgmPhase === 2 ? 0.35 : 0.3);
    if (drum[2][i]) scheduleHihat(stepTime,  bgmPhase === 3 ? 0.16 : 0.12);
  }
}

function bgmScheduler() {
  if (!bgmPlaying || !bgmMasterGain) return;
  const ac = getCtx();
  const measureSec = getBeatSec() * 4;
  while (bgmMeasureStartTime < ac.currentTime + SCHEDULE_AHEAD + measureSec) {
    scheduleMeasure(bgmMeasure, bgmMeasureStartTime);
    bgmMeasure++;
    bgmMeasureStartTime += measureSec;
  }
  bgmSchedulerTimer = setTimeout(bgmScheduler, SCHEDULER_INTERVAL);
}

// ---- 公開API（戦闘BGM） ----

/** 戦闘BGM開始 */
export function startBgm() {
  if (bgmPlaying) return;
  try {
    const ac = getCtx();
    bgmMasterGain = ac.createGain();
    bgmMasterGain.gain.value = 0.72;
    bgmMasterGain.connect(ac.destination);

    bgmPlaying = true;
    bgmPhase = 1;
    bgmMeasure = 0;
    bgmMeasureStartTime = ac.currentTime + 0.05;
    bgmScheduler();
  } catch { /* ignore */ }
}

/** 戦闘BGM停止（フェードアウト） */
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

// ============================================================
// タイトルBGM（ゆったり・環境音楽風）
// ============================================================

let titleBgmGain: GainNode | null = null;
let titleBgmTimer: ReturnType<typeof setTimeout> | null = null;
let titleBgmPlaying = false;
let titleBgmMeasure = 0;
let titleBgmMeasureStartTime = 0;

// BPM 72 固定（ゆったり）
const TITLE_BPM = 72;
const TITLE_BEAT_SEC = 60 / TITLE_BPM;

// ---- タイトル用音色 ----

// 温かいサイン波ピアノ（長めリリース）
function scheduleTitlePiano(time: number, freq: number, dur: number, vol = 0.2) {
  if (freq === 0) return;
  try {
    const ac = getCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const lp   = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(vol * 0.5, time + dur * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 1.4); // 長い余韻

    osc.connect(gain);
    gain.connect(lp);
    lp.connect(titleBgmGain!);
    osc.start(time);
    osc.stop(time + dur * 1.5);
  } catch { /* ignore */ }
}

// 柔らかいパッド（複数倍音の重ね）
function scheduleTitlePad(time: number, freq: number, dur: number, vol = 0.07) {
  if (freq === 0) return;
  const harmonics = [1, 2, 3];
  const vols      = [1, 0.4, 0.15];
  for (let h = 0; h < harmonics.length; h++) {
    try {
      const ac   = getCtx();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      const lp   = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * harmonics[h], time);

      const v = vol * vols[h];
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(v, time + 0.3);   // ゆっくりフェードイン
      gain.gain.setValueAtTime(v, time + dur - 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      gain.connect(lp);
      lp.connect(titleBgmGain!);
      osc.start(time);
      osc.stop(time + dur + 0.1);
    } catch { /* ignore */ }
  }
}

// 低音ベース（ゆっくり）
function scheduleTitleBass(time: number, freq: number, dur: number, vol = 0.18) {
  if (freq === 0) return;
  try {
    const ac   = getCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const lp   = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.85);

    osc.connect(gain);
    gain.connect(lp);
    lp.connect(titleBgmGain!);
    osc.start(time);
    osc.stop(time + dur);
  } catch { /* ignore */ }
}

// ---- タイトル楽曲データ ----
// Cメジャー系、穏やかなループ（4小節）
// コード進行: C - Am - F - G
const TITLE_MELODY: [number, number][][] = [
  // 小節1: C (ゆったり)
  [[0,1],[523,1],[659,1],[784,1]],
  // 小節2: Am
  [[880,1.5],[784,0.5],[659,1],[0,1]],
  // 小節3: F
  [[698,1],[784,1],[880,1],[784,1]],
  // 小節4: G → C解決
  [[784,1],[740,1],[659,1.5],[523,0.5]],
];
const TITLE_BASS: [number, number][][] = [
  [[130.8,2],[130.8,2]],  // C
  [[110,2],[110,2]],      // Am
  [[87.3,2],[87.3,2]],    // F
  [[98,2],[98,2]],        // G
];
// パッド（コードルート音、全音符）
const TITLE_PAD: [number, number][] = [
  [261.6, 4], // C
  [220,   4], // Am
  [174.6, 4], // F
  [196,   4], // G
];

function scheduleTitleMeasure(measureIdx: number, startTime: number) {
  const m = measureIdx % 4;
  const bs = TITLE_BEAT_SEC;

  // パッド（コード全体を包む）
  scheduleTitlePad(startTime, TITLE_PAD[m][0], TITLE_PAD[m][1] * bs);

  // メロディ
  let t = startTime;
  for (const [freq, dur] of TITLE_MELODY[m]) {
    scheduleTitlePiano(t, freq, dur * bs * 0.88);
    t += dur * bs;
  }

  // ベース
  let bt = startTime;
  for (const [freq, dur] of TITLE_BASS[m]) {
    scheduleTitleBass(bt, freq, dur * bs * 0.75);
    bt += dur * bs;
  }
}

function titleBgmScheduler() {
  if (!titleBgmPlaying || !titleBgmGain) return;

  const ac = getCtx();
  const measureSec = TITLE_BEAT_SEC * 4;

  while (titleBgmMeasureStartTime < ac.currentTime + 0.15 + measureSec) {
    scheduleTitleMeasure(titleBgmMeasure, titleBgmMeasureStartTime);
    titleBgmMeasure++;
    titleBgmMeasureStartTime += measureSec;
  }

  titleBgmTimer = setTimeout(titleBgmScheduler, 60);
}

/** タイトルBGM開始 */
export function startTitleBgm() {
  if (titleBgmPlaying) return;
  try {
    const ac = getCtx();
    titleBgmGain = ac.createGain();
    titleBgmGain.gain.value = 0.0;
    titleBgmGain.connect(ac.destination);
    // ゆっくりフェードイン
    titleBgmGain.gain.linearRampToValueAtTime(0.65, ac.currentTime + 1.5);

    titleBgmPlaying = true;
    titleBgmMeasure = 0;
    titleBgmMeasureStartTime = ac.currentTime + 0.1;
    titleBgmScheduler();
  } catch { /* ignore */ }
}

/** タイトルBGM停止 */
export function stopTitleBgm(fadeMs = 600) {
  if (!titleBgmPlaying) return;
  titleBgmPlaying = false;
  if (titleBgmTimer !== null) {
    clearTimeout(titleBgmTimer);
    titleBgmTimer = null;
  }
  if (titleBgmGain) {
    const ac = getCtx();
    titleBgmGain.gain.setValueAtTime(titleBgmGain.gain.value, ac.currentTime);
    titleBgmGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + fadeMs / 1000);
    const old = titleBgmGain;
    setTimeout(() => { try { old.disconnect(); } catch { /* ignore */ } }, fadeMs + 100);
    titleBgmGain = null;
  }
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
