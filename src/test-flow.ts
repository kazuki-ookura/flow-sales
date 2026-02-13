import { AgentService } from "./services/AgentService";
import { db } from "./db";
import { leads } from "./db/schema";
import { eq } from "drizzle-orm";

/**
 * 送信フローの検証テスト
 * リサーチ → パーソナライズ → 承認待ちステータスへの遷移を確認します。
 */
async function test() {
  // テスト用の環境変数を設定
  process.env.REQUIRE_APPROVAL = "true";
  process.env.DAILY_SEND_LIMIT = "10";

  const sampleLead = {
    first_name: "Test",
    last_name: "User",
    title: "CTO",
    email: `test-${Date.now()}@example.com`,
    website: "https://firecrawl.dev", // 実際に存在し、読み込みやすいURL
    companyName: "Firecrawl Inc."
  };

  console.log("=== FlowSales Verification Test ===");
  console.log(`Target Email: ${sampleLead.email}`);

  try {
    // ワークフローの実行 (単一リード)
    console.log("\n[Step] Running AgentService.processSingleLead...");
    await AgentService.processSingleLead(sampleLead);

    // DBの状態を確認
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.email, sampleLead.email))
      .get();

    if (lead) {
      console.log("\n[Result] Lead found in DB:");
      console.log(`- Status: ${lead.status}`);
      console.log(`- Tech Stack: ${lead.techStack}`);
      console.log(`- Personalized Email: ${lead.personalizedEmail?.substring(0, 50)}...`);
      console.log(`- Crawled Content Length: ${lead.crawledContent?.length || 0} characters`);

      if (lead.status === "WAITING_APPROVAL") {
        console.log("\n✅ Success: Status is WAITING_APPROVAL as expected.");
      } else {
        console.log(`\n❌ Failed: Expected status WAITING_APPROVAL but got ${lead.status}`);
      }
    } else {
      console.log("\n❌ Failed: Lead not found in DB.");
    }

  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
  } finally {
    console.log("\nVerification complete.");
  }
}

test();
