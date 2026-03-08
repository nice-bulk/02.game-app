# コードスタイルと規約 (danmaku-soul)

## TypeScript
- TypeScript strict モード推奨
- ファイル拡張子: `.ts` (ロジック), `.tsx` (React コンポーネント)
- 命名: コンポーネントは PascalCase、変数・関数は camelCase

## React
- 関数コンポーネント + Hooks パターン使用
- `react-refresh` による Fast Refresh 対応

## ESLint ルール
- `@typescript-eslint/recommended` 準拠
- `react-hooks/recommended` 準拠
- `react-refresh/only-export-components`: warn（コンポーネントのみをエクスポート）
- 0 warnings でパスすることが要件

## ファイル構成
- Electron メインプロセスは `electron/` 以下
- React レンダラーは `src/` 以下
- 静的アセットは `public/` 以下
