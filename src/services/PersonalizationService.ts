import Anthropic from "@anthropic-ai/sdk";

export class PersonalizationService {
  private static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  /**
   * リード情報とリサーチ結果に基づいてパーソナライズされたメールを生成します。
   */
  static async generateEmail(leadInfo: any, researchData: any) {
    if (!this.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing");

    const anthropic = new Anthropic({ apiKey: this.ANTHROPIC_API_KEY });
    
    const prompt = `
      あなたは一流のSDR（Sales Development Representative）です。
      「Launch Flow」というNext.jsベースのSaaSボイラープレート（Hono, Supabase, Stripe連携済み）を以下のターゲットに提案してください。

      【ターゲット情報】
      氏名: ${leadInfo.firstName} ${leadInfo.lastName}
      役職: ${leadInfo.jobTitle}
      会社名: ${leadInfo.companyName}
      ウェブサイト: ${leadInfo.website}
      
      【リサーチ結果】
      技術スタック: ${researchData.techStack}
      ビジネス概要: ${researchData.businessSummary}
      想定される課題: ${researchData.painPoints}

      【目的】
      相手の技術的背景（Next.jsを使っているか等）やビジネス課題に触れつつ、Launch Flowがどのように彼らの開発スピードを加速させ、工数を削減できるかを1:1で語りかけるトーンで書いてください。
      
      【制約】
      - 件名と本文を作成してください。
      - 売り込み臭を抑え、専門家同士の対話のような自然な日本語。
      - 相手がNext.jsを使っている場合は特にそのメリット（型安全、エッジ配信等）に触れる。
    `;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    // @ts-ignore
    return response.content[0].text;
  }
}
