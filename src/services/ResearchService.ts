import Anthropic from "@anthropic-ai/sdk";

export class ResearchService {
  private static FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  private static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  /**
   * ウェブサイトの内容をFirecrawlで取得し、Claudeで要約・解析します。
   * @param url 調査対象のURL
   */
  static async researchWebsite(url: string) {
    if (!this.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is missing");
    if (!this.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing");

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
      throw new Error(`Firecrawl Error: ${scrapeResponse.statusText}`);
    }

    const scrapeData = (await scrapeResponse.json()) as any;
    const markdown = scrapeData.data?.markdown || "";

    // 2. Claudeで解析
    const anthropic = new Anthropic({ apiKey: this.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      system: `
        あなたは優秀なセールスリサーチャーです。
        提供されたウェブサイトのマークダウン内容から、以下の情報を抽出・推論してください。
        1. 使用されている技術スタック（特に関連があればNext.js, React, Tailwind, TypeScript等）
        2. 企業の主なビジネスモデルと提供サービス
        3. 現在の課題やニーズ（推論でOK）
        
        回答は日本語のJSON形式で返してください。
        フォーマット: { "techStack": string, "businessSummary": string, "painPoints": string }
      `,
      messages: [{ role: "user", content: markdown }],
    });

    try {
      // @ts-ignore
      const content = response.content[0].text;
      return JSON.parse(content);
    } catch (e) {
      console.error("AI Analysis Parse Error:", e);
      return { techStack: "Unknown", businessSummary: "Failed to summarize", painPoints: "N/A" };
    }
  }
}
