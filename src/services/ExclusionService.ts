export class ExclusionService {
	private static DEFAULT_EXCLUDED_DOMAINS = [
		"gmail.com",
		"yahoo.co.jp",
		"outlook.com",
		"hotmail.com",
		"icloud.com",
		"me.com",
	];

	/**
	 * 指定されたメールアドレスのドメインが除外リストに含まれているか判定します。
	 */
	static isExcluded(email: string): boolean {
		if (!email) return true;

		const domain = email.split("@")[1]?.toLowerCase();
		if (!domain) return true;

		const envExcluded = process.env.EXCLUDED_DOMAINS
			? process.env.EXCLUDED_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
			: [];

		const allExcluded = [...this.DEFAULT_EXCLUDED_DOMAINS, ...envExcluded];

		return allExcluded.some((excluded) => {
			// 完全一致、またはサブドメイン（例: apple.com を除外した場合に products.apple.com も除外）
			return domain === excluded || domain.endsWith(`.${excluded}`);
		});
	}

	/**
	 * 現在の除外リストを返します。
	 */
	static getExcludedDomains(): string[] {
		const envExcluded = process.env.EXCLUDED_DOMAINS
			? process.env.EXCLUDED_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
			: [];
		return [...this.DEFAULT_EXCLUDED_DOMAINS, ...envExcluded];
	}
}
