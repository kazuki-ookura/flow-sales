import { describe, expect, it, afterEach } from "bun:test";
import { ExclusionService } from "./ExclusionService";

describe("ExclusionService", () => {
    const originalEnv = process.env.EXCLUDED_DOMAINS;

    afterEach(() => {
        process.env.EXCLUDED_DOMAINS = originalEnv;
    });

    it("デフォルトの除外ドメインを正しく判定できること", () => {
        expect(ExclusionService.isExcluded("test@gmail.com")).toBe(true);
        expect(ExclusionService.isExcluded("user@yahoo.co.jp")).toBe(true);
        expect(ExclusionService.isExcluded("someone@hotmail.com")).toBe(true);
    });

    it("除外対象でないドメインを正しく判定できること", () => {
        expect(ExclusionService.isExcluded("founder@startup.io")).toBe(false);
        expect(ExclusionService.isExcluded("cto@brand-new-corp.jp")).toBe(false);
    });

    it("環境変数による追加除外ドメインを正しく判定できること", () => {
        process.env.EXCLUDED_DOMAINS = "competitor.com,rival.jp";
        
        expect(ExclusionService.isExcluded("boss@competitor.com")).toBe(true);
        expect(ExclusionService.isExcluded("info@rival.jp")).toBe(true);
        expect(ExclusionService.isExcluded("staff@products.competitor.com")).toBe(true); // サブドメイン
    });

    it("大文字小文字を区別せずに判定できること", () => {
        expect(ExclusionService.isExcluded("TEST@GMAIL.COM")).toBe(true);
    });

    it("不正なメールアドレスの場合は除外（true）として扱うこと", () => {
        expect(ExclusionService.isExcluded("")).toBe(true);
        expect(ExclusionService.isExcluded("invalid-email")).toBe(true);
    });
});
