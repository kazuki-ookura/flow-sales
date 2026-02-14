# SPEC.md - FlowSales: Autonomous AI SDR System

## 1. Overview
FlowSales is an autonomous AI SDR (Sales Development Representative) system designed to automate lead generation, company research, and personalized outreach. It targets CTOs and Founders of seed-stage startups or dev agencies to promote "Launch Flow" (a SaaS boilerplate).

## 2. Technical Stack
- **Language/Runtime:** TypeScript / Bun
- **Framework:** Hono (API & Webhooks)
- **Database:** SQLite with Drizzle ORM
- **Services:**
  - **Lead Gen:** Apollo.io API
  - **Research:** Firecrawl API
  - **LLM:** Anthropic Claude 3.5 Sonnet
  - **Outreach:** Instantly.ai API

## 3. System Architecture
The system is built with a modular service-oriented architecture.

### 3.1. Core Modules
- **LeadService:** Manages lead data in SQLite, handling deduplication and status (New, Researched, Personalized, Sent, Failed).
- **ApolloService:** Interfaces with Apollo.io to search and fetch lead contact details.
- **ResearchService:** Uses Firecrawl to scrape lead company websites and extract tech stack/business context.
- **PersonalizationService:** Uses Claude 3.5 Sonnet to generate highly targeted 1:1 emails based on research data.
- **InstantlyService:** Pushes personalized leads into Instantly.ai campaigns.
- **AgentService (Orchestrator):** Manages the end-to-end workflow and handles retries/error logic.
- **ExclusionService:** Filters leads based on email domains (e.g., excludes free mail or competitors).
- **SlackService:** Provides real-time notifications for approval queues and system errors.

## 4. Data Model (Drizzle ORM)

```typescript
// leads table
{
  id: string (uuid),
  email: string (unique),
  firstName: string,
  lastName: string,
  jobTitle: string,
  companyName: string,
  website: string,
  techStack: text,       // Raw data from Firecrawl
  researchSummary: text, // AI summarized context
  personalizedEmail: text,
  status: string,        // 'PENDING' | 'RESEARCHED' | 'PERSONALIZED' | 'SENT' | 'FAILED'
  errorLog: text,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 5. Workflow Sequence

1. **Trigger:** Manual trigger or Cron job starts the Apollo search.
2. **Fetch:** `ApolloService` searches for "CTO" or "Founder" in target industries/stages. Returns a list of leads.
3. **Deduplicate:** `LeadService` checks SQLite for existing emails. New leads are saved with `PENDING` status.
4. **Research:** `ResearchService` takes a lead's website and uses Firecrawl's `/scrape` (markdown output).
5. **Analyze:** Claude analyzes the markdown to identify:
   - Tech stack (Next.js, React, etc.)
   - Recent news or "About Us" mission
   - Potential pain points (e.g., slow development cycle, manual infra management)
6. **Personalize:** Claude generates a personalized outreach email emphasizing how "Launch Flow" addresses the identified pain points.
7. **Deploy:** `InstantlyService` pushes the lead + `personalizedEmail` to a specific Campaign ID.
8. **Update:** Mark lead as `SENT` in SQLite.

## 6. Personalization Strategy
- **Tech-Driven:** If the company uses Next.js, highlight how Launch Flow provides a pre-configured architecture for it.
- **Phase-Driven:** For seed-stage, focus on "Speed to Market".
- **Mission-Driven:** Mention something specific from their mission statement scraped by Firecrawl.

## 7. Error Handling & Robustness
- **Rate Limiting:** Implement delays between API calls to respect Apollo/Instantly/Claude limits.
- **Retry Logic:** Use exponential backoff for transient API failures (Firecrawl timeouts).
- **Graceful Failure:** If research fails, log the error and mark the lead for manual review or skip.
- **Deduplication:** Strict email uniqueness in DB level.

## 8. Dashboard / CLI
- Simple Hono-based dashboard showing:
  - Total leads found.
  - Distribution of status.
  - Error logs.
- CLI command to trigger a batch run: `bun run start-batch`.

## 9. Next Steps
1. Initialize Project structure.
2. Setup SQLite/Drizzle.
3. Implement `ApolloService` and `LeadService`.
4. Implement `ResearchService` (Firecrawl) and `PersonalizationService` (Claude).
5. Implement `InstantlyService`.
6. Final Integration and Verification.
