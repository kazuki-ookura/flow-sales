import Anthropic from "@anthropic-ai/sdk";

export class PersonalizationService {
	private static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

		const anthropic = new Anthropic({
			apiKey: PersonalizationService.ANTHROPIC_API_KEY,
		});

		const prompt = `
      あなたは、SaaS開発を効率化するボイラープレート「Launch Flow」を開発・運営しているシリアルアントレプレナー兼エンジニアです。
      名前は「大倉 和紀」です。
      
      【重要】あなたは「Launch Flow」の運営者であり、提案相手の会社（${leadInfo.companyName}様）の人間ではありません。
      外部のエンジニア/起業家として、同じ立場の${leadInfo.firstName}様に「Launch Flow」を提案してください。

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
         - 例: 「${leadInfo.companyName}さんのエンジニア採用の募集を拝見し、...」や「${researchData.recentNews}のリリース、おめでとうございます！」など。
      3. エンジニア/起業家同士の「対話」にする:
         - ${researchData.technicalPainPoints}について、「実は私も以前、同じ構成で苦労したことがありまして」のようなストーリーを適宜混ぜる。
      4. シンプルなCTA:
         - いきなりミーティングを組もうとせず、「エンジニア同士、情報交換だけでもできませんか？」や「もし興味があれば資料だけお送りします」といった低いハードルを設定する。

      【出力形式】
      件名: [相手が思わず開く、パーソナライズされた15文字以内のタイトル]
      本文: [上記のルールを守った本文]

      --
      大倉 和紀 | i-media LLC 代表
      SaaS開発スタック「Launch Flow」開発者
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
