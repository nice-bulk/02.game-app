// ゲーム定数

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// プレイヤー
export const PLAYER_RADIUS = 10;
export const PLAYER_SPEED = 3.5;
export const PLAYER_MAX_HP = 3;              // ハートは3つ
export const PLAYER_MAX_STAMINA = 100;
export const PLAYER_STAMINA_REGEN = 0.4;
export const PLAYER_STAMINA_REGEN_DELAY = 60;
export const MOVE_STAMINA_COST = 0.15;
export const ROLL_DURATION = 20;
export const ROLL_COOLDOWN = 40;
export const ROLL_SPEED = 7;
export const ROLL_STAMINA_COST = 25;
export const REFLEX_STAMINA_RECOVER = 15;
export const REFLEX_WINDOW = 6;
export const INVINCIBLE_AFTER_HIT = 90;

// スタック
export const MAX_STACK = 5;
export const HEAL_STACK_COST = 2;           // HP回復に必要なスタック
export const ULT_STACK_COST = 4;            // 必殺技に必要なスタック

// ビーム攻撃
export const BEAM_DAMAGE_INTERVAL = 8;      // ビームがダメージを与える間隔（フレーム）
export const BEAM_DAMAGE = 2;               // 1ヒットあたりのダメージ（通常）
export const BEAM_LIFE = 6;                 // ビームの描画持続フレーム
export const BEAM_STAMINA_COST = 0;         // ビームはスタミナ消費なし（長押し継続可）

// 必殺技
export const ULT_DURATION = 180;            // 必殺技の持続フレーム（3秒）
export const ULT_DAMAGE_MULTIPLIER = 3;     // 必殺技中のビームダメージ倍率
export const ULT_BEAM_INTERVAL = 3;         // 必殺技中のビーム間隔（高速）

// ボス
export const BOSS_RADIUS = 40;
export const BOSS_MAX_HP = 400;
export const BOSS_MAX_POISE = 4;
export const BOSS_POISE_RECOVER_TIME = 600; // 体幹回復は10秒かかる（パリィ間に回復しないよう長め）
export const BOSS_STUN_DURATION = 150;

// ボス移動
export const BOSS_MOVE_SPEED_P1 = 0.8;
export const BOSS_MOVE_SPEED_P2 = 1.3;
export const BOSS_MOVE_SPEED_P3 = 2.0;
export const BOSS_MOVE_CHANGE_INTERVAL = 180; // 移動方向変更間隔（フレーム）
export const BOSS_MARGIN = 80;               // 壁からの最小距離

// 弾・ボム
export const BULLET_RADIUS = 6;
export const BOMB_RADIUS = 28;              // 巨大ボム
export const BOMB_SPEED = 1.4;
export const PARRY_WINDOW = 9999;           // ボムは飛んでいる間ずっとパリィ可能
export const BOMB_DAMAGE = 2;              // ボム被弾のダメージ

// ボム投擲インターバル（フェーズ別）
export const BOMB_INTERVAL_P1 = 220;
export const BOMB_INTERVAL_P2 = 160;
export const BOMB_INTERVAL_P3 = 110;

// 弾幕インターバル（フェーズ別）
export const SHOOT_INTERVAL_P1 = 90;
export const SHOOT_INTERVAL_P2 = 65;
export const SHOOT_INTERVAL_P3 = 45;

// ヒットストップ
export const HITSTOP_PARRY = 15;
export const HITSTOP_HIT = 6;

// フェーズ閾値
export const PHASE2_THRESHOLD = 0.6;
export const PHASE3_THRESHOLD = 0.3;

// フェーズ移行演出
export const PHASE_TRANSITION_DURATION = 90; // フェーズ移行エフェクトフレーム数

// 技名表示
export const SKILL_NAME_DURATION = 90; // 技名表示フレーム数

// 慣らし難易度（初回プレイは弾速・弾数を下げる）
// runCount が EASY_RUN_THRESHOLD 以下のとき適用
export const EASY_RUN_THRESHOLD = 2;
export const EASY_SPEED_FACTOR = 0.65;   // 弾速 65%
export const EASY_COUNT_FACTOR = 0.7;    // 弾数 70%

// ランク閾値（クリアタイム秒）
export const RANK_S_TIME = 90;   // 90秒以内
export const RANK_A_TIME = 150;  // 150秒以内
export const RANK_B_TIME = 240;  // 240秒以内

// パリィ演出強化
export const PARRY_HITSTOP_STRONG = 22; // ジャストパリィ時のヒットストップ（強め）

// ---- IRON SENTINEL ----
export const IRON_MAX_HP    = 350;
export const IRON_RADIUS    = 36;
export const IRON_MAX_POISE = 3;
// フェーズ別移動速度（速め）
export const IRON_MOVE_SPEED_P1 = 1.4;
export const IRON_MOVE_SPEED_P2 = 2.0;
export const IRON_MOVE_SPEED_P3 = 2.8;
// 弾幕インターバル（速め）
export const IRON_SHOOT_P1 = 70;
export const IRON_SHOOT_P2 = 50;
export const IRON_SHOOT_P3 = 35;
export const IRON_BOMB_P1  = 180;
export const IRON_BOMB_P2  = 130;
export const IRON_BOMB_P3  = 90;

// ---- VOID WRAITH ----
export const VOID_MAX_HP    = 500;
export const VOID_RADIUS    = 44;
export const VOID_MAX_POISE = 5;
// 移動速度（テレポート的なランダム）
export const VOID_MOVE_SPEED_P1 = 1.0;
export const VOID_MOVE_SPEED_P2 = 1.8;
export const VOID_MOVE_SPEED_P3 = 3.0;
// 弾幕インターバル（遅いが大量）
export const VOID_SHOOT_P1 = 100;
export const VOID_SHOOT_P2 = 72;
export const VOID_SHOOT_P3 = 48;
export const VOID_BOMB_P1  = 200;
export const VOID_BOMB_P2  = 145;
export const VOID_BOMB_P3  = 95;
