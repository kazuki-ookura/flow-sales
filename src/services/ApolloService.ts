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
			const response = await fetch(`${ApolloService.BASE_URL}/people/search`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-cache",
				},
				body: JSON.stringify({
					api_key: ApolloService.API_KEY,
					person_titles: titles,
					organization_num_employees_ranges: ["1,50"],
					page: page,
				}),
			});

			if (!response.ok) {
				throw new Error(`Apollo API Error: ${response.statusText}`);
			}

			return (await response.json()) as { people: ApolloPerson[] };
		} catch (error) {
			console.error("Apollo Search Error:", error);
			throw error;
		}
	}
}
