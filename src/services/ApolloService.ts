export interface ApolloPerson {
	first_name: string;
	last_name: string;
	name: string;
	email?: string;
	title: string;
	organization?: {
		name: string;
		website_url: string;
		primary_domain: string;
	};
}

export class ApolloService {
	private static API_KEY = process.env.APOLLO_API_KEY;
	private static BASE_URL = "https://api.apollo.io/v1";

	/**
	 * CTOやFounderを検索します。
	 * @param titles 職種タイトルのリスト
	 */
	static async searchLeads(
		titles: string[] = ["CTO", "Founder"],
		page: number = 1,
	) {
		if (!ApolloService.API_KEY) throw new Error("APOLLO_API_KEY is missing");

		try {
			// POST https://api.apollo.io/api/v1/mixed_people/api_search
			// フィルタはJSONボディで送るのが推奨
			const response = await fetch(
				`${ApolloService.BASE_URL}/mixed_people/api_search`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "no-cache",
						"X-Api-Key": ApolloService.API_KEY,
					},
					body: JSON.stringify({
						person_titles: titles,
						person_locations: ["Japan"],
						organization_num_employees_ranges: ["1,50"],
						page: page,
						per_page: 10,
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				// Free PlanなどでAPIアクセス権限がない場合は、エラーを投げずに空配列を返す（既存のリードで続行するため）
				if (response.status === 403) {
					console.warn(
						"⚠️ Apollo API Access Denied (403): Free Planでは検索APIが利用できない可能性があります。ダッシュボードからの手動追加、またはプランのアップグレードを検討してください。",
					);
					return { people: [] };
				}
				throw new Error(`Apollo API Error: ${response.status} ${errorText}`);
			}

			return (await response.json()) as { people: ApolloPerson[] };
		} catch (error) {
			console.error("Apollo Search Error:", error);
			return { people: [] }; // ワークフロー全体を止めないよう、エラー時は空で返す
		}
	}
}
