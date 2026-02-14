import { eq } from "drizzle-orm";
import { db } from "./db";
import { leads } from "./db/schema";
import { AgentService } from "./services/AgentService";

/**
 * 送信フローの検証テスト
 * リサーチ → パーソナライズ → 承認待ちステータスへの遷移を確認します。
 */
async function test() {
	// コマンドライン引数の取得
	// 例: bun src/test-flow.ts <domain> <first_name> <last_name> <title>
	const targetDomain = process.argv[2] || "firecrawl.dev";
	const firstName = process.argv[3] || "John";
	const lastName = process.argv[4] || "Doe";
	const jobTitle = process.argv[5] || "CTO";
	const companyName = process.argv[6] || "";

	const websiteUrl = targetDomain.startsWith("http")
		? targetDomain
		: `https://${targetDomain}`;

	console.log(`\nTesting with domain: ${targetDomain} (${firstName} ${lastName}, ${jobTitle})`);

	// テスト用の環境変数を設定
	process.env.REQUIRE_APPROVAL = "true";
	process.env.DAILY_SEND_LIMIT = "10";

	const targetEmail = `test-${Date.now()}@${targetDomain}`;
	const sampleLead = {
		first_name: firstName,
		last_name: lastName,
		name: `${firstName} ${lastName}`,
		title: jobTitle,
		email: targetEmail,
		organization: {
			name: companyName || targetDomain.split(".").at(0)?.toUpperCase() || targetDomain.toUpperCase(),
			website_url: websiteUrl,
			primary_domain: targetDomain,
		},
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
			console.log(
				`- Personalized Email: ${lead.personalizedEmail?.substring(0, 50)}...`,
			);
			console.log(
				`- Crawled Content Length: ${lead.crawledContent?.length || 0} characters`,
			);

			if (lead.status === "WAITING_APPROVAL") {
				console.log("\n✅ Success: Status is WAITING_APPROVAL as expected.");
			} else {
				console.log(
					`\n❌ Failed: Expected status WAITING_APPROVAL but got ${lead.status}`,
				);
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
