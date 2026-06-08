import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
	url: process.env.DATABASE_URL || "file:sqlite.db",
});

export const db = drizzle(client, { schema });

// unsubscribe_token カラムが存在しない場合に追加するマイグレーション
export async function runMigrations() {
	try {
		await client.execute(
			"ALTER TABLE leads ADD COLUMN unsubscribe_token TEXT UNIQUE"
		);
		console.log("[DB] Migration: unsubscribe_token column added.");
	} catch {
		// カラムが既に存在する場合は無視
	}
}
