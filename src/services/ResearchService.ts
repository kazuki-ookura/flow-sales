import Anthropic from "@anthropic-ai/sdk";
import { Logger } from "../utils/Logger";

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
			Logger.info(`Starting crawl for ${url}...`);
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
				Logger.debug(`Crawl status for ${id}: ${status}`);
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

		// 20,000トークンの制限（Tier 1）等に配慮し、入力を一定文字数でカットする
		const truncatedMarkdown = combinedMarkdown.substring(0, 6000);

		const response = await anthropic.messages.create({
			model: "claude-4-6-sonnet-latest",
			max_tokens: 1500,
			system: `
        あなたは一流のセールスリサーチャー兼技術コンサルタントです。
        提供されたウェブサイトのマークダウンから、決定権者（CTO/Founder）の心に刺さる営業メッセージを作成するための重要情報を抽出してください。
        特に「採用情報（エンジニア募集など）」「最近のプロダクト発表」「資金調達」「プレスリリース」など、「今、提案すべき理由」となるシグナルを重視してください。

        【重要】回答は必ず「純粋なJSONのみ」を出力してください。
        Markdownのコードブロック（ \`\`\`json ... \`\`\` ）や解説文は一切不要です。
        
        形式：
        {
          "techStack": "使用技術や言語",
          "businessSummary": "事業内容の簡潔な要約",
          "recentNews": "最近の大きなニュース",
          "technicalPainPoints": "想定される技術的課題",
          "hiringIntent": "採用募集状況（特にエンジニア）",
          "whyNowHook": "『今』提案すべき具体的な理由（インテント）"
        }
      `,
			messages: [{ role: "user", content: truncatedMarkdown }],
		});

		try {
			// @ts-expect-error
			let content = response.content[0].text;
			// 最初の { から 最後の } までを抽出してパースを強固にする
			const jsonMatch = content.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				content = jsonMatch[0];
			}

			const parsed = JSON.parse(content);
			return {
				...parsed,
				fullContent: combinedMarkdown,
			};
		} catch (e) {
			Logger.error("AI Analysis Parse Error or JSON Error:", e);
			Logger.debug(`Raw content was: ${JSON.stringify(response.content[0])}`);
			return {
				techStack: "Unknown",
				businessSummary: "Failed to summarize",
				recentNews: "N/A",
				technicalPainPoints: "N/A",
				hiringIntent: "Unknown",
				whyNowHook: "N/A",
				fullContent: combinedMarkdown,
			};
		}
	}
}
