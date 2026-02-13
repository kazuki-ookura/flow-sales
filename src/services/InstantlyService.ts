export class InstantlyService {
	private static API_KEY = process.env.INSTANTLY_API_KEY;
	private static CAMPAIGN_ID = process.env.INSTANTLY_CAMPAIGN_ID;

	/**
	 * Instantly.aiのキャンペーンにリードを追加します。
	 */
	static async addLeadToCampaign(
		email: string,
		firstName: string,
		lastName: string,
		personalizedEmail: string,
	) {
		if (!InstantlyService.API_KEY || !InstantlyService.CAMPAIGN_ID) {
			throw new Error("Instantly API key or Campaign ID is missing");
		}

		const response = await fetch("https://api.instantly.ai/api/v1/lead/add", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${InstantlyService.API_KEY}`,
			},
			body: JSON.stringify({
				campaign_id: InstantlyService.CAMPAIGN_ID,
				skip_if_in_workspace: true,
				leads: [
					{
						email: email,
						first_name: firstName,
						last_name: lastName,
						personalization: personalizedEmail, // カスタム変数として使用可能
					},
				],
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Instantly API Error: ${errorText}`);
		}

		return await response.json();
	}
}
