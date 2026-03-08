# 開発コマンド (danmaku-soul)

## 開発サーバー起動
```
npm run dev
```
Vite + Electron の開発サーバーが起動し、ホットリロード有効

## ビルド（パッケージング）
```
npm run build
```
TypeScript コンパイル → Vite ビルド → electron-builder でパッケージング

## Lint
```
npm run lint
```
ESLint でコードチェック（0 warnings が要件）

## プレビュー
```
npm run preview
```
Vite のビルド済みファイルをプレビュー

## OS固有コマンド (Windows)
- ファイル一覧: `dir` または `Get-ChildItem`
- パス区切り: `\`
- Git: `git` (通常通り使用可能)
