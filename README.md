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

#### 必須の環境変数

| 変数名 | 取得先 | 説明 |
|---|---|---|
| `APOLLO_API_KEY` | [Apollo.io](https://app.apollo.io/) | リード検索用 |
| `FIRECRAWL_API_KEY` | [Firecrawl](https://www.firecrawl.dev/) | Webスクレイピング用 |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) | Claude（AI分析・メール生成）用 |
| `INSTANTLY_API_KEY` | [Instantly.ai](https://app.instantly.ai/) | メール送信用 |
| `INSTANTLY_CAMPAIGN_ID` | Instantly.ai ダッシュボード | 投入先キャンペーンのID |

#### オプションの環境変数

| 変数名 | デフォルト | 説明 |
|---|---|---|
| `DAILY_SEND_LIMIT` | `50` | 1日の最大送信数 |
| `REQUIRE_APPROVAL` | `false` | `true` にすると送信前に承認待ち（`WAITING_APPROVAL`）で停止 |
| `DATABASE_URL` | `file:sqlite.db` | SQLiteデータベースのパス |

#### 各APIキーの取得手順

<details>
<summary>🔑 Apollo.io APIキー</summary>

1. [app.apollo.io](https://app.apollo.io/) にログイン（アカウントがなければ無料で作成）
2. 左下の **⚙️ Settings** をクリック
3. 左メニューから **Integrations** → **API** タブを選択
4. **API Keys** をクリック → **Create new key**
5. 名前（例: `FlowSales`）を入力して作成
6. 表示されたキーをコピーして `.env` に貼り付け

> 💡 無料プランでもAPIアクセスは可能ですが、月間のクレジット制限があります。
</details>

<details>
<summary>🔥 Firecrawl APIキー</summary>

1. [firecrawl.dev](https://www.firecrawl.dev/) にアクセス
2. **Sign Up**（GitHub / Google アカウントでも可）
3. ログイン後のダッシュボードに **API Key** が表示される（`fc-` で始まるキー）
4. コピーして `.env` に貼り付け

> 💡 無料プランで月500クレジット利用可能。1回のcrawl（最大5ページ）で約5クレジット消費。
</details>

<details>
<summary>🤖 Anthropic APIキー</summary>

1. [console.anthropic.com](https://console.anthropic.com/) にアクセス
2. **Sign Up** でアカウント作成（※ Claudeチャットのアカウントとは別）
3. 左メニューの **API Keys** をクリック
4. **Create Key** → 名前を入力して作成
5. **⚠️ キーは一度しか表示されない**のですぐにコピーして `.env` に貼り付け
6. 左メニューの **Billing** からクレジットを購入（最低 $5〜）

> 💡 APIは従量課金制です。Claude 3.5 Sonnet の場合、入力 $3/100万トークン、出力 $15/100万トークン程度。
</details>

<details>
<summary>📧 Instantly.ai APIキー & キャンペーンID</summary>

**APIキー:**
1. [app.instantly.ai](https://app.instantly.ai/) にログイン
2. 左サイドバーの **Integrations** をクリック
3. **API Keys** セクション → **Create API Key**
4. 名前を入力し、必要なスコープを選択して作成
5. コピーして `.env` に貼り付け

**キャンペーンID:**
1. Instantly ダッシュボードで対象のキャンペーンを開く
2. URLバーに表示されるUUID（例: `https://app.instantly.ai/campaigns/xxxxxxxx-xxxx-...`）がキャンペーンID
3. コピーして `.env` の `INSTANTLY_CAMPAIGN_ID` に貼り付け

> ⚠️ API機能を利用するには **Hypergrowth プラン以上**の契約が必要な場合があります。
</details>

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
