# danmaku-soul プロジェクト概要

## プロジェクトの目的
- **danmaku-soul** は弾幕系ゲームアプリ（Electron + React + TypeScript）
- デスクトップアプリとしてパッケージ化される
- 現時点ではボイラープレート段階（Vite + React + Electron テンプレート）

## テックスタック
- **フレームワーク**: React 18 + TypeScript
- **ビルドツール**: Vite 5
- **デスクトップ**: Electron 30 (vite-plugin-electron)
- **パッケージャー**: electron-builder
- **Lint**: ESLint + @typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh
- **言語**: TypeScript

## ディレクトリ構造
- `electron/` : Electron メインプロセス (main.ts, preload.ts)
- `src/`       : Renderer プロセス (React) - App.tsx, main.tsx
- `public/`    : 静的アセット
- `dist-electron/` : ビルド済み Electron ファイル

## OS
Windows
