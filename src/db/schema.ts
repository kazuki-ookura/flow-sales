import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => uuidv4()),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  jobTitle: text("job_title"),
  companyName: text("company_name"),
  website: text("website"),
  techStack: text("tech_stack"),
  researchSummary: text("research_summary"),
  crawledContent: text("crawled_content"),
  personalizedEmail: text("personalized_email"),
  approvalStatus: text("approval_status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING"),
  status: text("status", { enum: ["PENDING", "RESEARCHED", "PERSONALIZED", "WAITING_APPROVAL", "SENT", "FAILED"] }).default("PENDING"),
  errorLog: text("error_log"),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});
