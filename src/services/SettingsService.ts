import { eq } from "drizzle-orm";
import { db } from "../db";
import { settings } from "../db/schema";
import { ExclusionService } from "./ExclusionService";

export class SettingsService {
	/**
	 * 設定値を取得します。
	 */
	static async getSetting(key: string): Promise<string | null> {
		const result = await db
			.select()
			.from(settings)
			.where(eq(settings.key, key))
			.get();
		return result?.value || null;
	}

	/**
	 * 設定値を保存または更新します。
	 */
	static async updateSetting(key: string, value: string) {
		const existing = await this.getSetting(key);
		if (existing !== null) {
			await db
				.update(settings)
				.set({ value, updatedAt: new Date() })
				.where(eq(settings.key, key));
		} else {
			await db.insert(settings).values({ key, value });
		}
	}

	/**
	 * 除外ドメインのリストを取得します（DB + デフォルト + Env）。
	 */
	static async getExcludedDomains(): Promise<string[]> {
		const dbValue = await this.getSetting("EXCLUDED_DOMAINS");
		const dbExcluded = dbValue
			? dbValue.split(",").map((d) => d.trim().toLowerCase())
			: [];

		const defaultAndEnv = ExclusionService.getExcludedDomains();
		return Array.from(new Set([...defaultAndEnv, ...dbExcluded]));
	}

	/**
	 * 指定されたメールが除外対象か判定します（DB設定を考慮）。
	 */
	static async isExcluded(email: string): Promise<boolean> {
		if (!email) return true;
		const domain = email.split("@")[1]?.toLowerCase();
		if (!domain) return true;

		const allExcluded = await this.getExcludedDomains();

		return allExcluded.some((excluded) => {
			return domain === excluded || domain.endsWith(`.${excluded}`);
		});
	}
}
