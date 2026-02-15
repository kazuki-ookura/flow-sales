import Anthropic from "@anthropic-ai/sdk";

export class PersonalizationService {
	private static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

	private static SENDER_NAME = process.env.SDR_SENDER_NAME;
	private static SENDER_TITLE = process.env.SDR_SENDER_TITLE;
	private static PRODUCT_NAME = process.env.SDR_PRODUCT_NAME;
	private static PRODUCT_DESCRIPTION = process.env.SDR_PRODUCT_DESCRIPTION;
	private static PRODUCT_RESTRICTIONS = process.env.SDR_PRODUCT_RESTRICTIONS;

	/**
	 * リード情報とリサーチ結果に基づいてパーソナライズされたメールを生成します。
	 */
	static async generateEmail(
		leadInfo: any,
		researchData: any,
		style: "TECHNICAL" | "BUSINESS" = "TECHNICAL",
	) {
		if (!PersonalizationService.ANTHROPIC_API_KEY)
			throw new Error("ANTHROPIC_API_KEY is missing");

		// 必須設定のバリデーション
		if (!this.SENDER_NAME || !this.PRODUCT_NAME || !this.PRODUCT_DESCRIPTION) {
			throw new Error(
				"SDR configuration is incomplete. Please set SDR_SENDER_NAME, SDR_PRODUCT_NAME, and SDR_PRODUCT_DESCRIPTION in .env",
			);
		}

		const anthropic = new Anthropic({
			apiKey: PersonalizationService.ANTHROPIC_API_KEY,
		});

		const prompt = `
      あなたは、${this.PRODUCT_NAME}を提供している${this.SENDER_TITLE || ""}の${this.SENDER_NAME}です。
      
      【製品/サービス情報】
      - 名称: ${this.PRODUCT_NAME}
      - 内容: ${this.PRODUCT_DESCRIPTION}
      - 制約/対象外: ${this.PRODUCT_RESTRICTIONS || "特に無し"}
      
      【重要】あなたは「${this.PRODUCT_NAME}」の運営者であり、提案相手の会社（${leadInfo.companyName}様）の人間ではありません。
      外部の専門家/起業家として、同じ立場の${leadInfo.firstName}様に「${this.PRODUCT_NAME}」を提案してください。

      【送信スタイル】
      今回のスタイル: ${style}
      - TECHNICALを選択時: ${leadInfo.companyName} の技術スタック（${researchData.techStack}）やエンジニア文化に触れ、開発効率の課題に共感する。
      - BUSINESSを選択時: ${researchData.recentNews} や事業成長（${researchData.businessSummary}）に触れ、市場投入速度（TTM）の最大化とROIの観点から提案する。

      【ターゲット情報】
      氏名: ${leadInfo.firstName} ${leadInfo.lastName} 様
      役職: ${leadInfo.jobTitle}
      会社名: ${leadInfo.companyName}
      
      【リサーチ結果（インテントデータを最優先に！）】
      なぜ今なのか（最重要）: ${researchData.whyNowHook}
      採用募集状況: ${researchData.hiringIntent}
      最新ニュース: ${researchData.recentNews}
      技術スタック: ${researchData.techStack}
      ビジネス要約: ${researchData.businessSummary}
      推測される課題: ${researchData.technicalPainPoints}

      【絶対に守るべきルール】
      1. AIっぽさを徹底的に排除する:
         - 「〜しております」を多用しない。「〜しています」「〜だと思っています」など、少し柔らかく。
         - 「突然のご連絡失礼します」「お忙しい中恐縮ですが」は厳禁。
         - 「お役に立てれば幸いです」「ご検討いただけますと幸いです」などの定型表現を使わない。
         - 挨拶は「${leadInfo.firstName}さん、こんにちは（または、はじめまして）」など、人間味のある形にする。
      2. 冒頭で「信頼」を勝ち取る:
         - 冒頭の一文は必ず、${researchData.whyNowHook} や ${researchData.hiringIntent}、${researchData.recentNews} に基づいた「今、あなたに連絡した具体的かつ個人的な理由」から始めてください。
      3. 専門家/起業家同士の「対話」にする:
         - ${researchData.technicalPainPoints}について、自身の経験や専門知識を交えて共感を示す。
      4. シンプルなCTA:
         - いきなりミーティングを組もうとせず、「情報交換」や「資料送付」といった低いハードルを設定する。

      【出力形式】
      件名: [相手が思わず開く、パーソナライズされた15文字以内のタイトル]
      本文: [上記のルールを守った本文]

      --
      ${this.SENDER_NAME} | ${this.SENDER_TITLE}
      ${this.PRODUCT_NAME} 担当者
    `;

		const response = await anthropic.messages.create({
			model: "claude-3-7-sonnet-latest",
			max_tokens: 1500,
			messages: [{ role: "user", content: prompt }],
		});

		// @ts-expect-error
		return response.content[0].text;
	}
}
