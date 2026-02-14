import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { leads } from "../db/schema";

export class LeadService {
	/**
	 * リードを取得または作成し、重複を防ぎます。
	 * @param leadData 登録するリード情報
	 * @returns 登録されたリード、または既に存在する場合はnull
	 */
	static async upsertLead(leadData: typeof leads.$inferInsert) {
		if (!leadData.email) throw new Error("Email is required");

		const existing = await db
			.select()
			.from(leads)
			.where(eq(leads.email, leadData.email))
			.get();

		if (existing) {
			return null;
		}

		const [newLead] = await db.insert(leads).values(leadData).returning();
		return newLead;
	}

	/**
	 * メールアドレスからリードを1件取得します。
	 */
	static async getLeadByEmail(email: string) {
		return await db
			.select()
			.from(leads)
			.where(eq(leads.email, email))
			.get();
	}

	/**
	 * 指定したステータスのリードを一覧取得します。
	 */
	static async getLeadsByStatus(
		status:
			| "PENDING"
			| "RESEARCHED"
			| "PERSONALIZED"
			| "WAITING_APPROVAL"
			| "APPROVED"
			| "SENT"
			| "FAILED",
	) {
		return await db
			.select()
			.from(leads)
			.where(sql`${leads.status} = ${status} AND ${leads.unsubscribed} = 0`)
			.all();
	}

	/**
	 * リードのステータスと情報を更新します。
	 * @param id リードID
	 * @param updateData 更新内容
	 */
	static async updateLead(
		id: string,
		updateData: Partial<typeof leads.$inferInsert>,
	) {
		return await db
			.update(leads)
			.set({ ...updateData, updatedAt: new Date() })
			.where(eq(leads.id, id))
			.returning();
	}

	/**
	 * 今日送信されたリードの数を取得します。
	 */
	static async getSentCountToday() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(leads)
			.where(
				sql`${leads.status} = 'SENT' AND ${leads.sentAt} >= ${today.getTime() / 1000}`,
			)
			.get();

		return result?.count || 0;
	}

	/**
	 * 全体の集計データを取得します。
	 */
	static async getGlobalStats() {
		const result = await db
			.select({
				status: leads.status,
				count: sql<number>`count(*)`,
			})
			.from(leads)
			.groupBy(leads.status)
			.all();

		const stats = {
			TOTAL: 0,
			PENDING: 0,
			RESEARCHED: 0,
			PERSONALIZED: 0,
			WAITING_APPROVAL: 0,
			APPROVED: 0,
			SENT: 0,
			FAILED: 0,
		};

		for (const row of result) {
			if (row.status && row.status in stats) {
				(stats as any)[row.status] = row.count;
				stats.TOTAL += row.count;
			}
		}

		return stats;
	}
}
