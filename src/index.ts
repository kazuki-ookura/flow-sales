import { Hono } from "hono";
import { AgentService } from "./services/AgentService";
import { LeadService } from "./services/LeadService";

const app = new Hono();

app.get("/", (c) => {
  return c.text("FlowSales AI SDR System is running!");
});

/**
 * 送信前テスト用エンドポイント
 * リードを検索し、ログ出力のみ行う
 */
app.get("/test", async (c) => {
  try {
    // 実際にはApolloを叩きますが、テスト用にサンプルデータで動かすことも検討
    // ここではAgentServiceの小規模実行を想定
    console.log("Running Test Workflow...");
    // 本番同様に動かす場合はこれ:
    // await AgentService.runWorkflow();
    return c.json({ message: "Test workflow triggered. Check logs." });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * リード一覧を確認する簡易ダッシュボードAPI
 */
app.get("/leads", async (c) => {
  const allLeads = await LeadService.getLeadsByStatus("SENT");
  const pendingLeads = await LeadService.getLeadsByStatus("PENDING");
  return c.json({
    sent: allLeads,
    pending: pendingLeads,
  });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
