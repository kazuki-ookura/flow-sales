import { type ApolloPerson, ApolloService } from "./ApolloService";
import { InstantlyService } from "./InstantlyService";
import { LeadService } from "./LeadService";
import { PersonalizationService } from "./PersonalizationService";
import { ResearchService } from "./ResearchService";
import { SlackService } from "./SlackService";
import { ExclusionService } from "./ExclusionService";
import { SettingsService } from "./SettingsService";
import { Logger } from "../utils/Logger";

export class AgentService {
	/**
	 * 全体のワークフローを実行します。
	 * 1. 新しいリードをApolloから取得して保存
	 * 2. 未処理のリード（PENDING等）を順番に処理
	 */
	static async runWorkflow() {
		Logger.info("=== Starting FlowSales Workflow ===");

		// 1日の上限チェック
		const dailyLimit = parseInt(process.env.DAILY_SEND_LIMIT || "50", 10);
		const sentToday = await LeadService.getSentCountToday();
		if (sentToday >= dailyLimit) {
			Logger.warn(
				`Daily send limit reached (${sentToday}/${dailyLimit}). Stops.`,
			);
			return;
		}

		// 1. Apolloから新しいリードを取得して保存
		Logger.info("Fetching new leads from Apollo...");
		try {
			const searchResults = await ApolloService.searchLeads(["CTO", "Founder"]);
			const rawLeads = searchResults.people || [];
			Logger.info(`Found ${rawLeads.length} new potential leads from Apollo.`);

			for (const rawLead of rawLeads) {
				await AgentService.saveRawLead(rawLead);
			}
		} catch (error) {
			Logger.error("Failed to fetch leads from Apollo:", error);
		}

		// 2. 未処理のリードを処理
		await AgentService.processPendingLeads();

		// 3. 通知
		const waiting = await LeadService.getLeadsByStatus("WAITING_APPROVAL");
		if (waiting.length > 0) {
			await SlackService.notifyWaitingApproval(waiting.length);
		}

		Logger.info("=== Workflow Completed ===");
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

			Logger.info(`Processing ${leads.length} leads with status: ${status}`);

			for (const lead of leads) {
				// 送信済み上限を再チェック
				const sentToday = await LeadService.getSentCountToday();
				const dailyLimit = parseInt(process.env.DAILY_SEND_LIMIT || "50", 10);
				if (sentToday >= dailyLimit) {
					Logger.warn(
						"Daily limit reached during processing. Skipping remaining leads.",
					);
					return;
				}

				try {
					await AgentService.executeLeadWorkflow(lead);
					// レートリミット回避のため、1件ごとに5秒待機
					await new Promise((resolve) => setTimeout(resolve, 5000));
				} catch (error) {
					Logger.error(`Fatal error in lead loop for ${lead.email}:`, error);
				}
			}
		}
	}

	/**
	 * 単一のリードをApolloの生データから処理します（テスト・デバッグ用）。
	 */
	static async processSingleLead(rawLead: ApolloPerson) {
		const lead = await AgentService.saveRawLead(rawLead);
		if (lead) {
			await AgentService.executeLeadWorkflow(lead);
			return lead;
		}
		return null;
	}

	/**
	 * Apolloから来た生データをDBに保存（重複チェック込み）
	 */
	private static async saveRawLead(rawLead: ApolloPerson) {
		const email = rawLead.email;
		if (!email) return null;

		if (await SettingsService.isExcluded(email)) {
			Logger.debug(`Lead skipped (Excluded Domain): ${email}`);
			return null;
		}

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
				Logger.info(`New lead saved: ${email}`);
				return lead;
			}
			// 既存リードの場合は再取得（emailで特定）
			return await LeadService.getLeadByEmail(email);
		} catch (error) {
			Logger.error(`Failed to save lead ${email}:`, error);
			return null;
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

				Logger.info(`[Research] ${lead.email} (${lead.website})`);
				const research = await ResearchService.researchWebsite(lead.website, {
					mode: "crawl",
				});

				const [updated] = await LeadService.updateLead(lead.id, {
					techStack: research.techStack,
					researchSummary: research.businessSummary,
					crawledContent: JSON.stringify(research), // 全データを保存
					status: "RESEARCHED",
				});
				lead = updated;
			}

			// 3. パーソナライズ
			if (lead.status === "RESEARCHED") {
				Logger.info(`[Personalize] ${lead.email}`);
				let researchData;
				try {
					researchData = JSON.parse(lead.crawledContent || "{}");
				} catch (e) {
					// 互換性維持: 古い形式の場合は最低限のデータを構成
					researchData = {
						techStack: lead.techStack,
						businessSummary: lead.researchSummary,
						recentNews: "N/A",
						technicalPainPoints: "N/A",
						hiringIntent: "Unknown",
						whyNowHook: "N/A",
					};
				}

				// 役職に応じてスタイルを選択
				const jobTitle = (lead.jobTitle || "").toUpperCase();
				const style =
					jobTitle.includes("CTO") ||
					jobTitle.includes("ENGINEER") ||
					jobTitle.includes("DEV") ||
					jobTitle.includes("TECH")
						? "TECHNICAL"
						: "BUSINESS";

				Logger.info(`[Personalize] ${lead.email} (Style: ${style})`);
				const email = await PersonalizationService.generateEmail(
					lead,
					researchData,
					style,
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
					Logger.info(`[Wait Approval] ${lead.email}`);
					await LeadService.updateLead(lead.id, { status: "WAITING_APPROVAL" });
					// Slackへ詳細通知
					await SlackService.notifyNewLeadForApproval(lead);
					return;
				}
				lead.status = "APPROVED"; // 承認不要なら自動的にAPPROVED扱い
			}

			// 5. 送信
			if (lead.status === "APPROVED") {
				Logger.info(`[Send Approved] ${lead.email}`);
				await AgentService.processSending(
					lead.id,
					lead.email,
					lead.firstName || "",
					lead.lastName || "",
					lead.personalizedEmail || "",
				);
			}
		} catch (error: any) {
			Logger.error(`Workflow error for ${lead.email}:`, error.message);
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
		Logger.info(`[Send] Waiting ${waitTime}s for ${email}...`);
		await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

		await InstantlyService.addLeadToCampaign(email, firstName, lastName, body);

		await LeadService.updateLead(id, {
			status: "SENT",
			sentAt: new Date(),
		});
		Logger.info(`[Done] Email sent to ${email}`);
	}
}
