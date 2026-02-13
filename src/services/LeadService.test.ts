import { describe, expect, it, mock } from "bun:test";
import { LeadService } from "./LeadService";

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
