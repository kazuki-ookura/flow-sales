# FlowSales Project Context (Gemini CLI)

このプロジェクトは、Gemini CLI を使用して開発・運用されています。

## プロジェクトの基本方針
- **Runtime**: 全ての操作（実行、テスト、ビルド）において Bun を使用します。
- **Language**: ユーザーとの対話、コードコメント（JSDoc）、ドキュメント作成は全て**日本語**で行います。
- **Coding Style**:
  - Biome による Lint/Format を遵守します。
  - プロフェッショナルなログ出力（`src/utils/Logger.ts`）を使用します。
  - テストは `bun test` で実行します。

## Gemini CLI への指示
- 実装プランや解説は、常に簡潔かつ明快な日本語で提供してください。
- ファイル参照時は ` ` で囲んでください。
- データベース操作が必要な場合は、`src/db/schema.ts` を参照して Drizzle ORM の流儀に従ってください。
