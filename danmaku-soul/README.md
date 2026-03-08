# DANMAKU SOULS

> 弾幕 × ソウルライク アクションゲーム  
> Vite + React + TypeScript + Electron + Zustand + Canvas API

---

## 概要

**Danmaku Souls** は、弾幕シューティングの「弾を避ける快感」とソウルライクの「スタミナ管理・パリィ・重厚な戦闘感」を融合させたデスクトップ専用アクションゲームです。

---

## 操作方法

| キー | アクション |
|---|---|
| `W` / `A` / `S` / `D` | 移動 |
| `Space` | ロール（無敵回避） |
| `Shift` / `F` | パリィ（青い弾に対して） |

---

## ゲームシステム

### スタミナ制
移動・ロールでスタミナを消費。スタミナが切れると回避不能になる。停止中は自動回復。

### 無敵ロール (Roll)
`Space` キーで短時間の無敵フレームを持つロールを発動。弾幕をすり抜けられる。クールダウンあり。

### ジャスト回避 (Reflex)
ロール中に弾をギリギリで避けると **スタミナが即時回復** し、シアンのエフェクトが発生。攻めの起点になる。

### パリィ (Parry)
**青い弾** に対して `Shift` / `F` でパリィ。弾を跳ね返してボスにダメージを与え、**体幹（ポイズ）** を削る。体幹がゼロになるとボスがスタン状態になる。

### ボス・フェーズ制
ボスのHPに応じて攻撃パターンが3段階で激化する。

| フェーズ | HP割合 | 弾数 | 弾速 |
|---|---|---|---|
| Phase 1 | 100% ～ 60% | 12方向 | 遅め |
| Phase 2 | 60% ～ 30% | 16方向 | 中速 |
| Phase 3 | 30% ～ 0% | 20方向（可変速） | 速い |

### 演出
- **予兆エフェクト**: 弾幕発射直前にボス周囲が赤く点滅
- **ヒットストップ**: 被弾・パリィ成功時に一瞬時間が止まる
- **画面揺れ (Screen Shake)**: 着弾・体幹崩し時にウィンドウが振動
- **パーティクル**: ヒット・パリィ・反射弾でエフェクト発生

---

## 技術スタック

| 技術 | 用途 |
|---|---|
| Electron 30 | デスクトップアプリ化 |
| React 18 + TypeScript | UIレンダリング |
| Vite 5 | ビルドツール / 開発サーバー |
| Zustand 5 | グローバル状態管理 |
| Canvas API | ゲーム描画（60fps） |
| electron-builder | パッケージング |

---

## ディレクトリ構成

```
danmaku-soul/
├── electron/
│   ├── main.ts          # Electron メインプロセス
│   └── preload.ts       # プリロードスクリプト
├── src/
│   ├── game/
│   │   ├── types.ts         # 型定義（Player, Boss, Bullet 等）
│   │   ├── constants.ts     # ゲーム定数
│   │   └── useGameLoop.ts   # ゲームループ・物理・当たり判定
│   ├── store/
│   │   └── gameStore.ts     # Zustand ストア
│   ├── components/
│   │   ├── GameCanvas.tsx   # Canvas 描画コンポーネント
│   │   ├── HUD.tsx          # HP / スタミナ / ボスHP 表示
│   │   └── Screens.tsx      # タイトル / 死亡 / クリア画面
│   ├── App.tsx
│   └── index.css
├── public/
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 開発コマンド

```bash
# 開発サーバー起動（Electron + Vite HMR）
npm run dev

# 本番ビルド + パッケージング
npm run build

# Lint チェック
npm run lint

# Vite プレビュー
npm run preview
```

---

## 開発メモ

- ゲームループは `requestAnimationFrame` ベースで、ヒットストップ中はロジックをスキップして描画のみ継続
- 状態管理は Zustand の `getState()` を直接呼び出すことでループ内でのサブスクライブを回避している
- 弾幕パターンは `src/game/useGameLoop.ts` の `generateBullets()` で管理しており、フェーズごとに拡張可能
