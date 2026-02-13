import Anthropic from "@anthropic-ai/sdk";

export class PersonalizationService {
	private static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

	/**
	 * リード情報とリサーチ結果に基づいてパーソナライズされたメールを生成します。
	 */
	static async generateEmail(leadInfo: any, researchData: any) {
		if (!PersonalizationService.ANTHROPIC_API_KEY)
			throw new Error("ANTHROPIC_API_KEY is missing");

		const anthropic = new Anthropic({
			apiKey: PersonalizationService.ANTHROPIC_API_KEY,
		});

		const prompt = `
      あなたは、自らもスタートアップを立ち上げているシリアルアントレプレナー兼エンジニアです。
      名前は「大倉（Kazuki）」です。
      「Launch Drive」というNext.js + Hono + Supabase + Stripeの爆速SaaSボイラープレートを、同じ立場のエンジニアとして提案してください。

      【ターゲット情報】
      氏名: ${leadInfo.firstName} ${leadInfo.lastName} 様
      役職: ${leadInfo.jobTitle}
      会社名: ${leadInfo.companyName}
      
      【リサーチ結果をフル活用してください】
      技術スタック: ${researchData.techStack}
      ビジネスの本質: ${researchData.businessSummary}
      注目トピック: ${researchData.recentNews}
      推測される課題: ${researchData.technicalPainPoints}

      【絶対に守るべきルール】
      1. AIっぽさを徹底的に排除する:
         - 「〜しております」を多用しない。「〜しています」「〜だと思っています」など、少し柔らかく。
         - 「突然のご連絡失礼します」は厳禁。
         - 「お役に立てれば幸いです」「ご検討いただけますと幸いです」などの定型表現を使わない。
      2. 冒頭で「信頼」を勝ち取る:
         - 「${leadInfo.companyName}の${researchData.recentNews}を見まして、...」や「${researchData.techStack}を使われているのを見て...」など、100%個別に書いたことが伝わる一文から始める。
      3. エンジニア同士の「対話」にする:
         - ${researchData.technicalPainPoints}について、「実は私も以前、同じ構成で苦労したことがありまして」のようなストーリーを適宜混ぜる。
      4. シンプルなCTA:
         - いきなりミーティングを組もうとせず、「エンジニア同士、情報交換だけでもできませんか？」や「もし興味があれば資料だけお送りします」といった低いハードルを設定する。

      【出力形式】
      件名: [相手が思わず開く、パーソナライズされた15文字以内のタイトル]
      本文: [上記のルールを守った本文]
    `;

		const response = await anthropic.messages.create({
			model: "claude-3-5-sonnet-latest",
			max_tokens: 1000,
			messages: [{ role: "user", content: prompt }],
		});

		// @ts-expect-error
		return response.content[0].text;
	}
}
