export class SlackService {
	private static WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

	static async notifyWaitingApproval(leadCount: number) {
		if (!SlackService.WEBHOOK_URL) return;

		const message = {
			text: `🚀 *FlowSales Notification*\n${leadCount} leads are waiting for your approval.\nCheck the dashboard: ${process.env.APP_URL || "http://localhost:3000"}/dashboard`,
		};

		try {
			await fetch(SlackService.WEBHOOK_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(message),
			});
		} catch (error) {
			console.error("Failed to send Slack notification:", error);
		}
	}

	static async notifyError(email: string, error: string) {
		if (!SlackService.WEBHOOK_URL) return;

		const message = {
			text: `⚠️ *FlowSales Error*\nEmail: ${email}\nError: ${error}`,
		};

		try {
			await fetch(SlackService.WEBHOOK_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(message),
			});
		} catch (e) {
			console.error("Failed to send Slack error notification:", e);
		}
	}

	static async notifyNewLeadForApproval(lead: any) {
		if (!SlackService.WEBHOOK_URL) return;

		const blocks = [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `🆕 *New Lead Personalized & Waiting Approval*\n*${lead.firstName} ${lead.lastName}* (${lead.jobTitle}) at *${lead.companyName}*`,
				},
			},
			{
				type: "section",
				fields: [
					{
						type: "mrkdwn",
						text: `*Tech Stack:*\n${lead.techStack || "N/A"}`,
					},
					{
						type: "mrkdwn",
						text: `*Website:*\n<${lead.website}|${lead.website}>`,
					},
				],
			},
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `*Research Summary:*\n${lead.researchSummary || "N/A"}`,
				},
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: "View in Dashboard",
							emoji: true,
						},
						url: `${process.env.APP_URL || "http://localhost:3000"}/dashboard`,
						style: "primary",
					},
				],
			},
		];

		try {
			await fetch(SlackService.WEBHOOK_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ blocks }),
			});
		} catch (e) {
			console.error("Failed to send Slack lead notification:", e);
		}
	}
}
