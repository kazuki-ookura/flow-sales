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
			// 新しいエンドポイント mixed_people/api_search を使用
			// また、クエリパラメータとして渡す必要がある
			const params = new URLSearchParams({
				api_key: ApolloService.API_KEY,
				page: page.toString(),
				per_page: "10",
			});

			// 配列系のパラメータを追加
			for (const title of titles) {
				params.append("person_titles[]", title);
			}
			params.append("person_locations[]", "Japan");
			params.append("organization_num_employees_ranges[]", "1,50");

			const response = await fetch(
				`${ApolloService.BASE_URL}/mixed_people/api_search?${params.toString()}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "no-cache",
					},
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Apollo API Error: ${response.status} ${errorText}`);
			}

			return (await response.json()) as { people: ApolloPerson[] };
		} catch (error) {
			console.error("Apollo Search Error:", error);
			throw error;
		}
	}
}
