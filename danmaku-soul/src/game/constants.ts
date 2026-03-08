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
export const BEAM_DAMAGE = 8;               // 1ヒットあたりのダメージ
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
export const BOSS_POISE_RECOVER_TIME = 200;
export const BOSS_STUN_DURATION = 150;

// 弾・ボム
export const BULLET_RADIUS = 6;
export const BOMB_RADIUS = 28;              // 巨大ボム
export const BOMB_SPEED = 1.4;
export const PARRY_WINDOW = 9999;          // ボムは飛んでいる間ずっとパリィ可能
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
