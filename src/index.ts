import { Hono } from "hono";
import { AgentService } from "./services/AgentService";
import { LeadService } from "./services/LeadService";

const app = new Hono();

// 起動時に一回実行し、その後定期実行する仕組み
const runAutomatedWorkflow = async () => {
	console.log(`[Scheduled Task] Starting at ${new Date().toISOString()}`);
	try {
		await AgentService.runWorkflow();
	} catch (error) {
		console.error("[Scheduled Task] Critical Error:", error);
	}
};

// 12時間おきに実行 (12 * 60 * 60 * 1000)
const INTERVAL_MS = 12 * 60 * 60 * 1000;
setInterval(runAutomatedWorkflow, INTERVAL_MS);

// 起動から1分後に初回実行（サーバー起動直後の負荷分散のため少し待つ）
setTimeout(runAutomatedWorkflow, 60 * 1000);

app.get("/", (c) => {
	return c.html(`
    <html>
      <head>
        <title>FlowSales Control</title>
        <style>
          body { font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: auto; background: #f4f7f6; }
          .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
          button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .btn-secondary { background: #6c757d; }
          a { text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>🚀 FlowSales AI SDR</h1>
        <div class="card">
          <h3>Current Operations</h3>
          <p>The system runs automatically every 12 hours.</p>
          <button onclick="runNow()">Run Workflow Manually</button>
        </div>
        <div class="card">
          <h3>Lead Management</h3>
          <p>Check and approve personalized emails before they are sent.</p>
          <a href="/dashboard"><button class="btn-secondary">Open Dashboard</button></a>
        </div>
        <script>
          async function runNow() {
            const res = await fetch('/run-now');
            const data = await res.json();
            alert(data.message);
          }
        </script>
      </body>
    </html>
  `);
});

/**
 * 手動実行用エンドポイント
 */
app.get("/run-now", async (c) => {
	// バックグラウンドで実行
	runAutomatedWorkflow();
	return c.json({ message: "Workflow triggered in background." });
});

/**
 * 送信承認ダッシュボード
 */
app.get("/dashboard", async (c) => {
	const waiting = await LeadService.getLeadsByStatus("WAITING_APPROVAL");
	const fail = await LeadService.getLeadsByStatus("FAILED");
	const stats = {
		sent: await LeadService.getSentCountToday(),
		waiting: waiting.length,
		failed: fail.length,
	};

	return c.html(`
    <html>
      <head>
        <title>FlowSales Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f9f9f9; }
          .container { max-width: 1000px; margin: auto; }
          .lead-card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 5px solid #ffc107; shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .lead-card.failed { border-left-color: #dc3545; }
          .email-preview { background: #eee; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 0.9em; margin: 10px 0; }
          .actions { display: flex; gap: 10px; }
          .btn-approve { background: #28a745; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; }
          .btn-reject { background: #dc3545; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Dashboard</h1>
          <p>Sent Today: <strong>${stats.sent}</strong> | Waiting: ${stats.waiting} | Failed: ${stats.failed}</p>
          <a href="/">← Back to Control</a>
          
          <h2>Waiting for Approval (${waiting.length})</h2>
          ${waiting
						.map(
							(l) => `
            <div class="lead-card">
              <strong>${l.firstName} ${l.lastName} (${l.companyName})</strong><br/>
              <small>${l.email} | ${l.jobTitle}</small>
              <div class="email-preview">${l.personalizedEmail}</div>
              <div class="actions">
                <button class="btn-approve" onclick="approve('${l.id}')">Approve & Send</button>
                <button class="btn-reject" onclick="reject('${l.id}')">Reject</button>
              </div>
            </div>
          `,
						)
						.join("")}

          <h2>Failed Leads (${fail.length})</h2>
          ${fail
						.map(
							(l) => `
            <div class="lead-card failed">
              <strong>${l.email}</strong><br/>
              <p style="color: red;">Error: ${l.errorLog}</p>
              <button onclick="approve('${l.id}')" class="btn-approve">Retry</button>
            </div>
          `,
						)
						.join("")}
        </div>
        <script>
          async function approve(id) {
            if(!confirm('Approve and send this email?')) return;
            await fetch('/approve/' + id, {method: 'POST'});
            location.reload();
          }
          async function reject(id) {
            if(!confirm('Reject this lead?')) return;
            await fetch('/reject/' + id, {method: 'POST'});
            location.reload();
          }
        </script>
      </body>
    </html>
  `);
});

/**
 * 承認・却下用API
 */
app.post("/approve/:id", async (c) => {
	const id = c.req.param("id");
	await LeadService.updateLead(id, { status: "APPROVED" });
	return c.json({ success: true });
});

app.post("/reject/:id", async (c) => {
	const id = c.req.param("id");
	await LeadService.updateLead(id, {
		status: "FAILED",
		errorLog: "Rejected by user",
	});
	return c.json({ success: true });
});

export default {
	port: Number(process.env.PORT) || 3000,
	fetch: app.fetch,
};
