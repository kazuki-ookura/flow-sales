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
      あなたは一流のエンジニア兼SDRです。名前は「大倉」です。
      「Launch Flow」というNext.jsベースのSaaSボイラープレート（Hono, Supabase, Stripe連携済み）を、エンジニアの立場から提案してください。

      【ターゲット情報】
      氏名: ${leadInfo.firstName} ${leadInfo.lastName}
      役職: ${leadInfo.jobTitle}
      会社名: ${leadInfo.companyName}
      
      【リサーチ結果】
      技術スタック: ${researchData.techStack}
      ビジネス概要: ${researchData.businessSummary}
      最新動向/課題: ${researchData.recentNews} / ${researchData.technicalPainPoints}

      【メール作成の指針】
      1. 冒頭の挨拶を工夫する: 
         「突然のご連絡失礼します」や「お世話になっております」といった定型文は絶対に避けてください。
         リサーチ結果（${researchData.recentNews} や ${researchData.businessSummary}）に基づいた具体的な事実や、相手のサービスへの関心から書き始めてください。
      2. エンジニアとしての共感:
         同じ技術を扱うエンジニア（大倉）として、彼らが直面しているであろう技術的な課題（${researchData.technicalPainPoints}）に対する共感を伝えてください。
      3. 自然な口語表現:
         「ですので」を「なので」にするなど、堅苦しすぎない自然な日本語を使用してください。
      4. Launch Flowの提案:
         開発工数の削減や、技術選定の迷いを解消し、初期開発をブーストできる点を「エンジニア同士の会話」のようなトーンで提案してください。

      【出力形式】
      件名: [件名]
      本文: [本文]
    `;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    // @ts-ignore
    return response.content[0].text;
  }
}
