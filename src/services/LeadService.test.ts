import { describe, expect, it, afterEach } from "bun:test";
import { LeadService } from "./LeadService";
import { db } from "../db";
import { leads } from "../db/schema";
import { eq } from "drizzle-orm";

describe("LeadService (Integration)", () => {
    const TEST_EMAIL = "integration-test@example.com";

    afterEach(async () => {
        // テスト用データのクリーンアップ
        await db.delete(leads).where(eq(leads.email, TEST_EMAIL));
    });

	it("メールアドレスがない場合にエラーを投げること", async () => {
		const invalidLead = {
			firstName: "John",
			lastName: "Doe",
			email: "",
			jobTitle: "CTO",
		} as any;

		expect(LeadService.upsertLead(invalidLead)).rejects.toThrow(
			"Email is required",
		);
	});

    it("新しいリードを正常に登録できること", async () => {
        const leadData = {
            email: TEST_EMAIL,
            firstName: "Test",
            lastName: "User",
            companyName: "Test Corp",
            status: "PENDING" as const,
        };

        const newLead = await LeadService.upsertLead(leadData);
        expect(newLead).not.toBeNull();
        expect(newLead?.email).toBe(TEST_EMAIL);

        // 重複登録のチェック
        const duplicateResult = await LeadService.upsertLead(leadData);
        expect(duplicateResult).toBeNull();
    });

    it("ステータスによるフィルタリングが正しく機能すること", async () => {
        await LeadService.upsertLead({
            email: TEST_EMAIL,
            status: "RESEARCHED" as const,
        });

        const researchedLeads = await LeadService.getLeadsByStatus("RESEARCHED");
        expect(researchedLeads.some(l => l.email === TEST_EMAIL)).toBe(true);

        const pendingLeads = await LeadService.getLeadsByStatus("PENDING");
        expect(pendingLeads.some(l => l.email === TEST_EMAIL)).toBe(false);
    });

    it("リード情報の更新ができること", async () => {
        const lead = await LeadService.upsertLead({
            email: TEST_EMAIL,
            status: "PENDING" as const,
        });

        if (!lead) throw new Error("Setup failed");

        await LeadService.updateLead(lead.id, {
            status: "SENT" as const,
            sentAt: new Date()
        });

        const updated = await db.select().from(leads).where(eq(leads.id, lead.id)).get();
        expect(updated?.status).toBe("SENT");
        expect(updated?.sentAt).not.toBeNull();
    });

    it("今日の送信件数を正しく集計できること", async () => {
        await LeadService.upsertLead({
            email: TEST_EMAIL,
            status: "SENT" as const,
            sentAt: new Date(), // 今日
        });

        const count = await LeadService.getSentCountToday();
        expect(count).toBeGreaterThan(0);
    });

    it("グローバル統計を正しく取得できること", async () => {
        await LeadService.upsertLead({
            email: TEST_EMAIL,
            status: "FAILED" as const,
        });

        const stats = await LeadService.getGlobalStats();
        expect(stats.TOTAL).toBeGreaterThan(0);
        expect(stats.FAILED).toBeGreaterThan(0);
    });
});

// LeadServiceが依存しているdbをモック化するデモ
describe("LeadService (Mock Example)", () => {
	it("メールアドレスがない場合にエラーを投げること", async () => {
		const invalidLead = {
			firstName: "John",
			lastName: "Doe",
			email: "", // 無効なメール
			jobTitle: "CTO",
		} as any;

		expect(LeadService.upsertLead(invalidLead)).rejects.toThrow(
			"Email is required",
		);
	});

	// ロジックのテスト例
	it("今日送信されたリード数が数値として返ること", async () => {
		// 実際にはDBを叩かずにモックに差し替えることも可能ですが、
		// ここではメソッドが定義されていることと、基本的な動作を確認します。
		const count = await LeadService.getSentCountToday();
		expect(typeof count).toBe("number");
	});
});
