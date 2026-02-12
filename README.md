# 🌊 FlowSales: Autonomous AI SDR System

FlowSalesは、SaaSボイラープレート「Launch Flow」の販売を最大化するために設計された、完全自律型のAI SDR（Sales Development Representative）システムです。リードの獲得から会社リサーチ、パーソナライズされたメール生成、そして送信予約までをノンストップで自動化します。

## 🚀 Key Features

- **Lead Generation**: Apollo.io APIを使用して、ターゲットとなるCTOや創業主を精密にフィルタリング。
- **Deep Research**: Firecrawlを使用してウェブサイトをスクレイピングし、Claude 3.5 Sonnetで技術スタックや潜在的な課題を自動解析。
- **Ultra-Personalization**: リサーチ結果に基づき、相手の文脈に完全に合わせた1:1の営業メールをAIが生成。
- **Seamless Outreach**: パーソナライズされたメールをInstantly.aiのキャンペーンへ自動投入。
- **Lead Tracking**: SQLite + Drizzle ORMによる堅牢な重複排除と進捗管理。

## 🛠 Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **Database**: SQLite (via LibSQL)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **AI/LLM**: [Anthropic Claude 3.5 Sonnet](https://www.anthropic.com/claude)
- **External Services**:
  - Apollo.io (Lead Data)
  - Firecrawl (Web Scraping / Markdown extraction)
  - Instantly.ai (Cold Email Automation)

## 📁 Project Structure

```text
src/
├── db/              # Database schema & connection
├── services/        # Business logic (API integration, AI workflows)
│   ├── ApolloService.ts   # Lead fetching
│   ├── ResearchService.ts # Website analysis (Firecrawl + Claude)
│   ├── PersonalizationService.ts # Email generation (Claude)
│   ├── InstantlyService.ts  # Outreach automation
│   ├── LeadService.ts     # Data management (CRUD)
│   └── AgentService.ts    # Main orchestrator
├── routes/          # Express-like API routes
├── index.ts         # Hono server entry point
└── test-flow.ts     # Logic verification script
```

## 🏁 Getting Started

### 1. Prerequisites

- [Bun](https://bun.sh/) がインストールされていること。

### 2. Installation

```bash
bun install
```

### 3. Configuration

`.env`ファイルを準備し、以下のAPIキーを設定してください。

```bash
cp .env.example .env
# .envをエディタで開き、各キーを設定
```

- `APOLLO_API_KEY`: Apollo.ioのAPIキー
- `FIRECRAWL_API_KEY`: FirecrawlのAPIキー
- `ANTHROPIC_API_KEY`: AnthropicのAPIキー
- `INSTANTLY_API_KEY`: Instantly.aiのAPIキー
- `INSTANTLY_CAMPAIGN_ID`: 投入先のキャンペーンID

### 4. Database Setup

```bash
bun db:push
```

### 5. Verification (Test Run)

実際のAPIキーを使用する前に、ロジックの流れを確認できます。

```bash
# APIキーがない場合はモックデータで実行されます
bun test-flow
```

### 6. Running the Server

```bash
bun dev
```

- `GET /`: ステータス確認
- `GET /leads`: 送信済み・待機中のリード一覧表示

## 🤖 SDR Workflow Details

1. **Apollo Fetch**: ターゲット（例: CTO, Founder）を検索し、会社URLとメールアドレスを取得。
2. **Firecrawl Scraping**: 会社URLをFirecrawlに渡し、クリーンなマークダウン形式でコンテンツを抽出。
3. **Claude Analysis**: 
   - 技術スタックの特定（Next.js, Tailwind等）
   - ビジネスモデルの把握
   - 開発における「痛み」の推論
4. **Email Drafting**: 抽出された情報を元に、「Launch Flow」がどう役立つかを具体的に示すメールを執筆。
5. **Instantly Push**: `personalization` 変数と共にInstantlyへリードを登録。

## ⚠️ Security & Best Practices

- **Deduplication**: 同じメールアドレスを二度追わないようDBレベルで厳密にチェックしています。
- **Rate Limiting**: 各APIの制限を考慮し、Agentの実行間隔には注意してください。
- **Compliance**: 特定電子メール法等の規制を遵守し、Instantlyの設定でオプトアウトリンクを含めることを推奨します。
