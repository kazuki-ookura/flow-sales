import Anthropic from "@anthropic-ai/sdk";

export class ResearchService {
	private static FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
	private static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

	/**
	 * ウェブサイトの内容をFirecrawlで取得し、Claudeで要約・解析します。
	 * @param url 調査対象のURL
	 * @param options クロールオプション
	 */
	static async researchWebsite(
		url: string,
		options: { mode: "scrape" | "crawl" } = { mode: "scrape" },
	) {
		if (!ResearchService.FIRECRAWL_API_KEY)
			throw new Error("FIRECRAWL_API_KEY is missing");
		if (!ResearchService.ANTHROPIC_API_KEY)
			throw new Error("ANTHROPIC_API_KEY is missing");

		let combinedMarkdown = "";

		if (options.mode === "scrape") {
			// 1. Firecrawlでスクレイピング
			const scrapeResponse = await fetch(
				"https://api.firecrawl.dev/v1/scrape",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${ResearchService.FIRECRAWL_API_KEY}`,
					},
					body: JSON.stringify({
						url: url,
						formats: ["markdown"],
					}),
				},
			);

			if (!scrapeResponse.ok) {
				throw new Error(`Firecrawl Scrape Error: ${scrapeResponse.statusText}`);
			}

			const scrapeData = (await scrapeResponse.json()) as any;
			combinedMarkdown = scrapeData.data?.markdown || "";
		} else {
			// 2. Firecrawlでクロール (最大5ページ)
			console.log(`Starting crawl for ${url}...`);
			const crawlResponse = await fetch("https://api.firecrawl.dev/v1/crawl", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${ResearchService.FIRECRAWL_API_KEY}`,
				},
				body: JSON.stringify({
					url: url,
					limit: 5,
					scrapeOptions: {
						formats: ["markdown"],
					},
					// 会社概要、採用、ニュース等を優先的に含めるよう試みる
					allowBackwardLinks: false,
					maxDepth: 2,
				}),
			});

			if (!crawlResponse.ok) {
				throw new Error(`Firecrawl Crawl Error: ${crawlResponse.statusText}`);
			}

			const { id } = (await crawlResponse.json()) as { id: string };

			// クロール結果をポーリング
			let status = "running";
			let crawlData: any = null;

			while (status === "running" || status === "scraping") {
				await new Promise((resolve) => setTimeout(resolve, 3000)); // 3秒待機
				const pollResponse = await fetch(
					`https://api.firecrawl.dev/v1/crawl/${id}`,
					{
						headers: {
							Authorization: `Bearer ${ResearchService.FIRECRAWL_API_KEY}`,
						},
					},
				);
				crawlData = await pollResponse.json();
				status = crawlData.status;
				console.log(`Crawl status for ${id}: ${status}`);
			}

			if (status === "completed" && crawlData.data) {
				combinedMarkdown = crawlData.data
					.map(
						(page: any) =>
							`### URL: ${page.metadata?.url || "Unknown"}\n\n${page.markdown || ""}`,
					)
					.join("\n\n---\n\n");
			} else {
				throw new Error(`Crawl failed with status: ${status}`);
			}
		}

		// 2. Claudeで解析
		const anthropic = new Anthropic({
			apiKey: ResearchService.ANTHROPIC_API_KEY,
		});
		const response = await anthropic.messages.create({
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 1500,
			system: `
        あなたは一流のセールスリサーチャー兼技術コンサルタントです。
        提供されたウェブサイトのマークダウンから、決定権者（CTO/Founder）の心に刺さる営業メッセージを作成するための重要情報を抽出してください。

        特に以下の点に注目して解析してください：
        1. 【技術スタック】: 単なる羅列ではなく、どのような選定思想（モダン志向、安定志向など）が見えるか。
        2. 【ビジネスの本質】: 誰の、どのような不便を、どう解決しているか。収益モデルは何か。
        3. 【独自の強み】: 競合他社と比較して、技術的またはビジネス的にユニークな点はどこか。
        4. 【最新の重要事実】: 直近の資金調達、大規模なアップデート、採用の急拡大、エンジニアブログでの発信内容。
        5. 【技術的課題の推論】: 事業成長のフェーズや技術構成から、現在直面していそうな技術的負債や開発効率の課題は何か。

        回答は必ず以下のJSON形式で、日本語で出力してください。
        {
          "techStack": "主な技術とその選定思想の推察",
          "businessSummary": "ビジネスモデルと社会的意義の簡潔な要約",
          "recentNews": "直近で最も注目すべき事実とその背景",
          "technicalPainPoints": "現在抱えていそうな技術的・組織的課題の推論",
          "fullContent": "（変更なし：提供された全マークダウン）"
        }
      `,
			messages: [{ role: "user", content: combinedMarkdown }],
		});

		try {
			// @ts-expect-error
			const content = response.content[0].text;
			const parsed = JSON.parse(content);
			// 入力された全コンテンツも保持するように指示されたので、解析結果に追加
			return {
				...parsed,
				fullContent: combinedMarkdown,
			};
		} catch (e) {
			console.error("AI Analysis Parse Error:", e);
			return {
				techStack: "Unknown",
				businessSummary: "Failed to summarize",
				recentNews: "N/A",
				technicalPainPoints: "N/A",
				fullContent: combinedMarkdown,
			};
		}
	}
}
