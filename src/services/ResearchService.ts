import Anthropic from "@anthropic-ai/sdk";

export class ResearchService {
  private static FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  private static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  /**
   * ウェブサイトの内容をFirecrawlで取得し、Claudeで要約・解析します。
   * @param url 調査対象のURL
   * @param options クロールオプション
   */
  static async researchWebsite(url: string, options: { mode: "scrape" | "crawl" } = { mode: "scrape" }) {
    if (!this.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is missing");
    if (!this.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing");

    let combinedMarkdown = "";

    if (options.mode === "scrape") {
      // 1. Firecrawlでスクレイピング
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url: url,
          formats: ["markdown"],
        }),
      });

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
          "Authorization": `Bearer ${this.FIRECRAWL_API_KEY}`,
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
        const pollResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${id}`, {
          headers: {
            "Authorization": `Bearer ${this.FIRECRAWL_API_KEY}`,
          },
        });
        crawlData = await pollResponse.json();
        status = crawlData.status;
        console.log(`Crawl status for ${id}: ${status}`);
      }

      if (status === "completed" && crawlData.data) {
        combinedMarkdown = crawlData.data
          .map((page: any) => `### URL: ${page.metadata?.url || "Unknown"}\n\n${page.markdown || ""}`)
          .join("\n\n---\n\n");
      } else {
        throw new Error(`Crawl failed with status: ${status}`);
      }
    }

    // 2. Claudeで解析
    const anthropic = new Anthropic({ apiKey: this.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      system: `
        あなたは優秀なセールスリサーチャーです。
        提供されたウェブサイト（複数ページの場合あり）のマークダウン内容から、以下の情報を抽出・推論してください。
        
        リサーチの目的:
        送信対象の決定権者（CTOや創業者）に対して、エンジニア視点でのパーソナライズされた営業メールを送るため。
        
        抽出項目:
        1. 使用されている技術スタック（Next.js, React, Tailwind, TypeScript, AWS, Python等）
        2. 企業の主なビジネスモデルと提供サービス（何を解決しているか）
        3. 最新の動向（ニュース、採用ポジション、ブログ記事等から得られる事実）
        4. エンジニアとして共感できるポイントや、解決できそうな技術的課題
        
        回答は日本語のJSON形式で返してください。
        フォーマット: { "techStack": string, "businessSummary": string, "recentNews": string, "technicalPainPoints": string, "fullContent": string }
        ※ fullContent には、提供された全てのマークダウンを結合したものを入れてください。
      `,
      messages: [{ role: "user", content: combinedMarkdown }],
    });

    try {
      // @ts-ignore
      const content = response.content[0].text;
      const parsed = JSON.parse(content);
      // 入力された全コンテンツも保持するように指示されたので、解析結果に追加
      return {
        ...parsed,
        fullContent: combinedMarkdown
      };
    } catch (e) {
      console.error("AI Analysis Parse Error:", e);
      return { 
        techStack: "Unknown", 
        businessSummary: "Failed to summarize", 
        recentNews: "N/A", 
        technicalPainPoints: "N/A",
        fullContent: combinedMarkdown 
      };
    }
  }
}
