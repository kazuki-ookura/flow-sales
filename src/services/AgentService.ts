import { type ApolloPerson, ApolloService } from "./ApolloService";
import { InstantlyService } from "./InstantlyService";
import { LeadService } from "./LeadService";
import { PersonalizationService } from "./PersonalizationService";
import { ResearchService } from "./ResearchService";
import { SlackService } from "./SlackService";

export class AgentService {
	/**
	 * 全体のワークフローを実行します。
	 * 1. 新しいリードをApolloから取得して保存
	 * 2. 未処理のリード（PENDING等）を順番に処理
	 */
	static async runWorkflow() {
		console.log("=== Starting FlowSales Workflow ===");

		// 1日の上限チェック
		const dailyLimit = parseInt(process.env.DAILY_SEND_LIMIT || "50", 10);
		const sentToday = await LeadService.getSentCountToday();
		if (sentToday >= dailyLimit) {
			console.log(
				`⚠️ Daily send limit reached (${sentToday}/${dailyLimit}). Stops.`,
			);
			return;
		}

		// 1. Apolloから新しいリードを取得して保存
		console.log("Fetching new leads from Apollo...");
		try {
			const searchResults = await ApolloService.searchLeads(["CTO", "Founder"]);
			const rawLeads = searchResults.people || [];
			console.log(`Found ${rawLeads.length} new potential leads from Apollo.`);

			for (const rawLead of rawLeads) {
				await AgentService.saveRawLead(rawLead);
			}
		} catch (error) {
			console.error("Failed to fetch leads from Apollo:", error);
		}

		// 2. 未処理のリードを処理
		await AgentService.processPendingLeads();

		// 3. 通知
		const waiting = await LeadService.getLeadsByStatus("WAITING_APPROVAL");
		if (waiting.length > 0) {
			await SlackService.notifyWaitingApproval(waiting.length);
		}

		console.log("=== Workflow Completed ===");
	}

	/**
	 * DBに保存されている未処理のリードを順次リサーチ・送信します。
	 */
	static async processPendingLeads() {
		// 優先順位: PERSONALIZED (承認待ち以外で送信直前) > RESEARCHED > PENDING
		const statuses: (
			| "APPROVED"
			| "PERSONALIZED"
			| "RESEARCHED"
			| "PENDING"
			| "FAILED"
		)[] = ["APPROVED", "PERSONALIZED", "RESEARCHED", "PENDING", "FAILED"];

		for (const status of statuses) {
			const leads = await LeadService.getLeadsByStatus(status as any);
			if (leads.length === 0) continue;

			console.log(`Processing ${leads.length} leads with status: ${status}`);

			for (const lead of leads) {
				// 送信済み上限を再チェック
				const sentToday = await LeadService.getSentCountToday();
				const dailyLimit = parseInt(process.env.DAILY_SEND_LIMIT || "50", 10);
				if (sentToday >= dailyLimit) {
					console.log(
						"Daily limit reached during processing. Skipping remaining leads.",
					);
					return;
				}

				try {
					await AgentService.executeLeadWorkflow(lead);
				} catch (error) {
					console.error(`Fatal error in lead loop for ${lead.email}:`, error);
				}
			}
		}
	}

	/**
	 * Apolloから来た生データをDBに保存（重複チェック込み）
	 */
	private static async saveRawLead(rawLead: ApolloPerson) {
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

		try {
			const lead = await LeadService.upsertLead(leadData);
			if (lead) {
				console.log(`New lead saved: ${email}`);
			} else {
				// console.log(`Lead already exists: ${email}`);
			}
		} catch (error) {
			console.error(`Failed to save lead ${email}:`, error);
		}
	}

	/**
	 * 保存済みの1件のリードを、現在のステータスから最後まで進める
	 */
	private static async executeLeadWorkflow(lead: any) {
		try {
			// 2. リサーチ
			if (lead.status === "PENDING" || lead.status === "FAILED") {
				if (!lead.website) {
					throw new Error("Website URL is missing for research");
				}

				console.log(`[Research] ${lead.email} (${lead.website})`);
				const research = await ResearchService.researchWebsite(lead.website, {
					mode: "crawl",
				});

				const [updated] = await LeadService.updateLead(lead.id, {
					techStack: research.techStack,
					researchSummary: research.businessSummary,
					crawledContent: research.fullContent,
					status: "RESEARCHED",
				});
				lead = updated;
			}

			// 3. パーソナライズ
			if (lead.status === "RESEARCHED") {
				console.log(`[Personalize] ${lead.email}`);
				const researchData = {
					techStack: lead.techStack,
					businessSummary: lead.researchSummary,
					recentNews: "", // 既存データから再構成
					technicalPainPoints: "",
					fullContent: lead.crawledContent,
				};

				const email = await PersonalizationService.generateEmail(
					lead,
					researchData,
				);

				const [updated] = await LeadService.updateLead(lead.id, {
					personalizedEmail: email,
					status: "PERSONALIZED",
				});
				lead = updated;
			}

			// 4. 送信判定
			if (lead.status === "PERSONALIZED") {
				if (process.env.REQUIRE_APPROVAL === "true") {
					console.log(`[Wait Approval] ${lead.email}`);
					await LeadService.updateLead(lead.id, { status: "WAITING_APPROVAL" });
					return;
				}
				lead.status = "APPROVED"; // 承認不要なら自動的にAPPROVED扱い
			}

			// 5. 送信
			if (lead.status === "APPROVED") {
				console.log(`[Send Approved] ${lead.email}`);
				await AgentService.processSending(
					lead.id,
					lead.email,
					lead.firstName || "",
					lead.lastName || "",
					lead.personalizedEmail || "",
				);
			}
		} catch (error: any) {
			console.error(`Workflow error for ${lead.email}:`, error.message);
			await LeadService.updateLead(lead.id, {
				status: "FAILED",
				errorLog: error.message,
			});
		}
	}

	/**
	 * 送信処理（待機を含む）
	 */
	private static async processSending(
		id: string,
		email: string,
		firstName: string,
		lastName: string,
		body: string,
	) {
		// セーフティ・スロットル (60秒〜180秒)
		const waitTime = Math.floor(Math.random() * (180 - 60 + 1) + 60);
		console.log(`[Send] Waiting ${waitTime}s for ${email}...`);
		await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

		await InstantlyService.addLeadToCampaign(email, firstName, lastName, body);

		await LeadService.updateLead(id, {
			status: "SENT",
			sentAt: new Date(),
		});
		console.log(`[Done] Email sent to ${email}`);
	}
}
