# タスク完了時にすること (danmaku-soul)

1. **Lint チェック**: `npm run lint` を実行し 0 warnings を確認
2. **TypeScript コンパイル確認**: `tsc --noEmit` または `npm run build` で型エラーがないことを確認
3. **動作確認**: `npm run dev` で Electron アプリが起動することを確認
4. **Git コミット**: 変更内容を適切なメッセージでコミット
