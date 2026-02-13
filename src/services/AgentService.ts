import { type ApolloPerson, ApolloService } from "./ApolloService";
import { InstantlyService } from "./InstantlyService";
import { LeadService } from "./LeadService";
import { PersonalizationService } from "./PersonalizationService";
import { ResearchService } from "./ResearchService";

export class AgentService {
	/**
	 * 全体のワークフローを実行します。
	 */
	static async runWorkflow() {
		console.log("Starting Apollo search...");
		const searchResults = await ApolloService.searchLeads(["CTO", "Founder"]);

		const rawLeads = searchResults.people || [];
		console.log(`Found ${rawLeads.length} leads from Apollo.`);

		for (const rawLead of rawLeads) {
			await AgentService.processSingleLead(rawLead);
		}
	}

	/**
	 * 単一のリードに対してワークフローを実行します。
	 */
	static async processSingleLead(rawLead: ApolloPerson) {
		try {
			// 1. 保存 & 重複チェック
			const email = rawLead.email;
			if (!email) return;

			const leadData = {
				email,
				firstName: rawLead.first_name,
				lastName: rawLead.last_name,
				jobTitle: rawLead.title,
				companyName: rawLead.organization?.name || "",
				website: rawLead.organization?.website_url || "",
				status: "PENDING" as const,
			};

			const lead = await LeadService.upsertLead(leadData);
			if (!lead) {
				console.log(`Skipping existing lead: ${leadData.email}`);
				return;
			}

			console.log(`Processing lead: ${lead.email}`);

			// 2. リサーチ (Crawlモード)
			if (lead.website) {
				console.log(`Researching website (Crawl mode): ${lead.website}`);
				let research: {
					techStack: string;
					businessSummary: string;
					recentNews: string;
					technicalPainPoints: string;
					fullContent: string;
				};

				if (process.env.FIRECRAWL_API_KEY && process.env.ANTHROPIC_API_KEY) {
					research = await ResearchService.researchWebsite(lead.website, {
						mode: "crawl",
					});
				} else {
					console.log("⚠️ API Keys missing. Using mock research.");
					research = {
						techStack: "Next.js, Tailwind, TypeScript",
						businessSummary: "AI automation for developers",
						recentNews: "Launched version 2.0",
						technicalPainPoints: "High infrastructure costs",
						fullContent: "Mock crawled content...",
					};
				}

				await LeadService.updateLead(lead.id, {
					techStack: research.techStack,
					researchSummary: research.businessSummary,
					crawledContent: research.fullContent,
					status: "RESEARCHED",
				});

				// 3. パーソナライズ
				console.log(`Generating personalized email for ${lead.email}...`);
				let email: string;
				if (process.env.ANTHROPIC_API_KEY) {
					email = await PersonalizationService.generateEmail(lead, research);
				} else {
					email = "Mock personalized email";
				}

				await LeadService.updateLead(lead.id, {
					personalizedEmail: email,
					status: "PERSONALIZED",
				});

				// 4. 送信判定
				if (process.env.REQUIRE_APPROVAL === "true") {
					console.log(
						`Requirement approval for ${lead.email}. Setting status to WAITING_APPROVAL.`,
					);
					await LeadService.updateLead(lead.id, { status: "WAITING_APPROVAL" });
					return;
				}

				// 5. 送信
				await AgentService.processSending(
					lead.id,
					lead.email,
					lead.firstName || "",
					lead.lastName || "",
					email,
				);
			}
		} catch (error) {
			const email = (rawLead as any)?.email || "unknown";
			console.error(`Error processing lead ${email}:`, error);
		}
	}

	/**
	 * 送信処理（制限チェックと待機を含む）
	 */
	private static async processSending(
		id: string,
		email: string,
		firstName: string,
		lastName: string,
		body: string,
	) {
		const dailyLimit = parseInt(process.env.DAILY_SEND_LIMIT || "50", 10);
		// 1日の送信数チェック
		const sentToday = await LeadService.getSentCountToday();
		if (sentToday >= dailyLimit) {
			console.log(
				`Daily send limit reached (${dailyLimit}). Skipping sending for ${email}.`,
			);
			return;
		}

		// セーフティ・スロットル (60秒〜180秒)
		const waitTime = Math.floor(Math.random() * (180 - 60 + 1) + 60);
		console.log(
			`Safety throttle: Waiting for ${waitTime} seconds before sending to ${email}...`,
		);
		await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

		// 送信 (Instantlyへ投入)
		console.log(`Pushing to Instantly campaign...`);
		await InstantlyService.addLeadToCampaign(email, firstName, lastName, body);

		await LeadService.updateLead(id, {
			status: "SENT",
			sentAt: new Date(),
		});
		console.log(`Successfully processed and sent: ${email}`);
	}
}
