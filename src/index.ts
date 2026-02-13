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
	const globalStats = await LeadService.getGlobalStats();
	const sentToday = await LeadService.getSentCountToday();

	return c.html(`
    <html>
      <head>
        <title>FlowSales Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f9f9f9; color: #333; }
          .container { max-width: 1000px; margin: auto; }
          .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .stat-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
          .stat-value { font-size: 1.5em; font-weight: bold; color: #007bff; }
          .stat-label { font-size: 0.8em; color: #666; text-transform: uppercase; }
          .lead-card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 5px solid #ffc107; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .lead-card.failed { border-left-color: #dc3545; }
          .email-preview { background: #f4f4f4; padding: 15px; border-radius: 4px; white-space: pre-wrap; font-size: 0.9em; margin: 10px 0; border: 1px solid #ddd; }
          .actions { display: flex; gap: 10px; }
          .btn-approve { background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          .btn-reject { background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          .nav { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="nav">
            <a href="/">← Control Panel</a>
          </div>
          <h1>Operational Report</h1>
          
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-value">${sentToday}</div>
              <div class="stat-label">Sent Today</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${globalStats.SENT}</div>
              <div class="stat-label">Total Sent</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${globalStats.WAITING_APPROVAL}</div>
              <div class="stat-label">Waiting</div>
            </div>
            <div class="stat-card" style="border-top: 3px solid #dc3545;">
              <div class="stat-value" style="color: #dc3545;">${globalStats.FAILED}</div>
              <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${globalStats.TOTAL}</div>
              <div class="stat-label">Gross Leads</div>
            </div>
          </div>
          
          <h2>Waiting for Approval (${waiting.length})</h2>
          ${
						waiting.length === 0
							? "<p>No leads waiting for approval.</p>"
							: waiting
									.map(
										(l) => `
            <div class="lead-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <strong>${l.firstName} ${l.lastName}</strong> | ${l.jobTitle}<br/>
                  <span style="color: #666;">${l.companyName} (${l.email})</span>
                </div>
              </div>
              <div class="email-preview">${l.personalizedEmail}</div>
              <div class="actions">
                <button class="btn-approve" onclick="approve('${l.id}')">Approve & Send Now</button>
                <button class="btn-reject" onclick="reject('${l.id}')">Discard Lead</button>
              </div>
            </div>
          `,
									)
									.join("")
					}

          <h2>Recent Failures</h2>
          ${
						fail.length === 0
							? "<p>No recent failures.</p>"
							: fail
									.slice(0, 10)
									.map(
										(l) => `
            <div class="lead-card failed">
              <strong>${l.email}</strong><br/>
              <p style="color: #dc3545; font-size: 0.9em;"><strong>Error:</strong> ${l.errorLog}</p>
              <button onclick="approve('${l.id}')" class="btn-approve" style="padding: 4px 10px; font-size: 0.8em;">Retry</button>
            </div>
          `,
									)
									.join("")
					}
        </div>
        <script>
          async function approve(id) {
            if(!confirm('Approve and send this email?')) return;
            const res = await fetch('/approve/' + id, {method: 'POST'});
            if(res.ok) location.reload();
          }
          async function reject(id) {
            if(!confirm('Reject this lead?')) return;
            const res = await fetch('/reject/' + id, {method: 'POST'});
            if(res.ok) location.reload();
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
