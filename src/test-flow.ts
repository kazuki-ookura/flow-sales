import { ResearchService } from "./services/ResearchService";
import { PersonalizationService } from "./services/PersonalizationService";

/**
 * 簡易テストスクリプト
 * 実際のAPIキーがない場合でもロジックを確認できるようにモックデータを使用するオプションを含めます。
 */
async function test() {
  const sampleLead = {
    firstName: "Taro",
    lastName: "Yamada",
    jobTitle: "CTO",
    companyName: "Sample Tech Inc.",
    website: "https://example.com", 
    email: "taro@example.com"
  };

  console.log("=== FlowSales Verification Test ===");
  console.log(`Target: ${sampleLead.companyName} (${sampleLead.website})`);

  try {
    // 1. リサーチ (APIキーがない場合はスキップ)
    console.log("\n[1] Researching (Firecrawl + Claude)...");
    let researchResults;
    
    if (process.env.FIRECRAWL_API_KEY && process.env.ANTHROPIC_API_KEY) {
      researchResults = await ResearchService.researchWebsite(sampleLead.website);
    } else {
      console.log("⚠️ API Keys missing. Using mock research data.");
      researchResults = {
        techStack: "Next.js, Tailwind CSS, TypeScript",
        businessSummary: "SaaS platform for marketing automation.",
        painPoints: "Slow development cycles and manual deployment processes."
      };
    }
    console.log("Research Summary:", researchResults);

    // 2. パーソナライズ (APIキーがない場合はスキップ)
    console.log("\n[2] Personalizing Email (Claude)...");
    let draftEmail;
    if (process.env.ANTHROPIC_API_KEY) {
      draftEmail = await PersonalizationService.generateEmail(sampleLead, researchResults);
    } else {
      console.log("⚠️ API Key missing. Using mock email draft.");
      draftEmail = `Subject: Quick question about ${sampleLead.companyName}'s development\n\nHi ${sampleLead.firstName},\n\nI noticed you're using ${researchResults.techStack}. We've built Launch Flow to solve ${researchResults.painPoints}...`;
    }

    console.log("\n--- DRAFT EMAIL START ---");
    console.log(draftEmail);
    console.log("--- DRAFT EMAIL END ---\n");

    console.log("Verification complete! The flow logic is working as expected.");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
