import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { SettingsService } from "./SettingsService";
import { db } from "../db";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";

describe("SettingsService", () => {
    const TEST_KEY = "TEST_SETTING";
    const EXCLUSION_KEY = "EXCLUDED_DOMAINS";

    beforeAll(async () => {
        // テスト前のクリーンアップ（任意）
    });

    it("設定値の保存と取得ができること", async () => {
        const testValue = "hello-world";
        await SettingsService.updateSetting(TEST_KEY, testValue);
        
        const retrieved = await SettingsService.getSetting(TEST_KEY);
        expect(retrieved).toBe(testValue);
    });

    it("既存の設定値を更新できること", async () => {
        await SettingsService.updateSetting(TEST_KEY, "initial");
        await SettingsService.updateSetting(TEST_KEY, "updated");
        
        const retrieved = await SettingsService.getSetting(TEST_KEY);
        expect(retrieved).toBe("updated");
    });

    it("DBに保存された除外ドメインを正しく合算して取得できること", async () => {
        // DBの設定を保存
        await SettingsService.updateSetting(EXCLUSION_KEY, "test-db-excluded.com, another-one.jp");
        
        const allExcluded = await SettingsService.getExcludedDomains();
        
        // デフォルトのドメインが含まれているか
        expect(allExcluded).toContain("gmail.com");
        // DBで追加したドメインが含まれているか
        expect(allExcluded).toContain("test-db-excluded.com");
        expect(allExcluded).toContain("another-one.jp");
    });

    it("DB設定を考慮した除外判定ができること", async () => {
        await SettingsService.updateSetting(EXCLUSION_KEY, "ui-configured-competitor.com");
        
        const isExcluded = await SettingsService.isExcluded("ceo@ui-configured-competitor.com");
        expect(isExcluded).toBe(true);

        const isNotExcluded = await SettingsService.isExcluded("partner@awesome-startup.com");
        expect(isNotExcluded).toBe(false);
    });
});
