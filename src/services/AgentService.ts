import { ApolloService } from "./ApolloService";
import { LeadService } from "./LeadService";
import { ResearchService } from "./ResearchService";
import { PersonalizationService } from "./PersonalizationService";
import { InstantlyService } from "./InstantlyService";

export class AgentService {
  /**
   * 全体のワークフローを実行します。
   */
  static async runWorkflow() {
    console.log("Starting Apollo search...");
    const searchResults = (await ApolloService.searchLeads(["CTO", "Founder"])) as any;
    
    const rawLeads = searchResults.people || [];
    console.log(`Found ${rawLeads.length} leads from Apollo.`);

    for (const rawLead of rawLeads) {
      try {
        // 1. 保存 & 重複チェック
        const leadData = {
          email: rawLead.email,
          firstName: rawLead.first_name,
          lastName: rawLead.last_name,
          jobTitle: rawLead.title,
          companyName: rawLead.organization?.name,
          website: rawLead.organization?.website_url,
          status: "PENDING" as const,
        };

        if (!leadData.email) continue;

        const lead = await LeadService.upsertLead(leadData);
        if (!lead) {
          console.log(`Skipping existing lead: ${leadData.email}`);
          continue;
        }

        console.log(`Processing lead: ${lead.email}`);

        // 2. リサーチ
        if (lead.website) {
          console.log(`Researching website: ${lead.website}`);
          const research = await ResearchService.researchWebsite(lead.website);
          
          await LeadService.updateLead(lead.id, {
            techStack: research.techStack,
            researchSummary: research.businessSummary,
            status: "RESEARCHED",
          });

          // 3. パーソナライズ
          console.log(`Generating personalized email for ${lead.email}...`);
          const email = await PersonalizationService.generateEmail(lead, research);
          
          await LeadService.updateLead(lead.id, {
            personalizedEmail: email,
            status: "PERSONALIZED",
          });

          // 4. 送信 (Instantlyへ投入)
          console.log(`Pushing to Instantly campaign...`);
          await InstantlyService.addLeadToCampaign(
            lead.email,
            lead.firstName || "",
            lead.lastName || "",
            email
          );

          await LeadService.updateLead(lead.id, { status: "SENT" });
          console.log(`Successfully processed and sent: ${lead.email}`);
        }
      } catch (error: any) {
        console.error(`Error processing lead ${rawLead.email}:`, error);
        // DBにエラーを記録（リードIDが取得できている場合のみ）
        // 簡易化のためここではログ出力のみ
      }
    }
  }
}
