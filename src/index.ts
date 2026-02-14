import { Hono } from "hono";
import { logger } from "hono/logger";
import { AgentService } from "./services/AgentService";
import { LeadService } from "./services/LeadService";
import { SettingsService } from "./services/SettingsService";

const app = new Hono();
app.use("*", logger());

// 起動時に一回実行し、その後定期実行する仕組み
const runAutomatedWorkflow = async () => {
	console.log(`[Scheduled Task] Starting at ${new Date().toISOString()}`);
	try {
		await AgentService.runWorkflow();
	} catch (error) {
		console.error("[Scheduled Task] Critical Error:", error);
	}
};

// 12時間おきに定期実行
const INTERVAL_MS = 12 * 60 * 60 * 1000;
setInterval(runAutomatedWorkflow, INTERVAL_MS);

// 起動から5秒後に初回実行（1回のみ実行されるように徹底）
setTimeout(() => {
	console.log("🚀 Server is ready. Starting initial workflow...");
	runAutomatedWorkflow();
}, 5000);

app.get("/", (c) => {
	return c.html(`
    <html>
      <head>
        <title>FlowSales Control</title>
        <style>
          body { font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: auto; background: #0f172a; color: #f8fafc; }
          .card { background: #1e293b; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); }
          button { background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; }
          button:hover { background: #4f46e5; }
          .btn-secondary { background: #6c757d; }
          a { text-decoration: none; }
          h1 { color: #fff; }
        </style>
      </head>
      <body>
        <h1>🚀 FlowSales AI SDR</h1>
        <div class="card">
          <h3>Svelte 5 Dashboard (New)</h3>
          <p>Access the modernized dashboard built with Svelte 5.</p>
          <a href="http://localhost:5173" target="_blank"><button>Open Svelte Dashboard</button></a>
        </div>
        <div class="card">
          <h3>Legacy Control</h3>
          <p>The system runs automatically every 12 hours.</p>
          <button onclick="runNow()">Run Workflow Manually</button>
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
 * ダッシュボード用データAPI
 */
app.get("/api/data", async (c) => {
	const waiting = await LeadService.getLeadsByStatus("WAITING_APPROVAL");
	const fail = await LeadService.getLeadsByStatus("FAILED");
	const sent = await LeadService.getLeadsByStatus("SENT");
	const globalStats = await LeadService.getGlobalStats();
	const sentToday = await LeadService.getSentCountToday();

	return c.json({
		waiting,
		fail,
		sent,
		globalStats,
		sentToday,
	});
});

/**
 * 設定取得・更新用API
 */
app.get("/api/settings", async (c) => {
	const excludedDomains = await SettingsService.getSetting("EXCLUDED_DOMAINS");
	return c.json({ excludedDomains: excludedDomains || "" });
});

app.post("/api/settings", async (c) => {
	const { excludedDomains } = await c.req.json();
	await SettingsService.updateSetting("EXCLUDED_DOMAINS", excludedDomains);
	return c.json({ success: true });
});

/**
 * 送信承認ダッシュボード (HTML - 移行期間用)
 */
app.get("/dashboard", async (c) => {
	const waiting = await LeadService.getLeadsByStatus("WAITING_APPROVAL");
	const fail = await LeadService.getLeadsByStatus("FAILED");
	const sent = await LeadService.getLeadsByStatus("SENT");
	const globalStats = await LeadService.getGlobalStats();
	const sentToday = await LeadService.getSentCountToday();

	return c.html(`
    <html>
      <head>
        <title>Launch Flow | Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          /* ... existing styles ... */
          :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #ec4899;
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --success: #22c55e;
            --danger: #ef4444;
            --warning: #f59e0b;
          }
          body { 
            font-family: 'Inter', sans-serif; 
            background-color: var(--bg);
            background-image: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%);
            color: var(--text);
            margin: 0;
            padding: 40px 20px;
            line-height: 1.5;
          }
          .container { max-width: 1000px; margin: auto; }
          .glass {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
          }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
          .nav-link { color: var(--text-muted); text-decoration: none; font-weight: 600; transition: color 0.2s; }
          .nav-link:hover { color: var(--primary); }
          h1 { margin: 0; font-size: 2.5rem; background: linear-gradient(to right, #fff, var(--text-muted)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          
          .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 40px; }
          .stat-card { padding: 24px; text-align: left; position: relative; overflow: hidden; }
          .stat-value { font-size: 2rem; font-weight: 700; margin-bottom: 4px; color: #fff; }
          .stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
          .stat-card.active::after { content: ''; position: absolute; bottom: 0; left: 0; height: 4px; width: 100%; background: linear-gradient(to right, var(--primary), var(--secondary)); }

          h2 { font-size: 1.5rem; margin-top: 40px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
          .badge { background: var(--primary); color: white; padding: 2px 10px; border-radius: 999px; font-size: 0.8rem; }

          .lead-card { 
            padding: 24px; 
            margin-bottom: 20px; 
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
          }
          .lead-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
          
          .lead-header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .lead-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; color: #fff; }
          .lead-info { font-size: 0.85rem; color: var(--text-muted); }
          
          .email-preview { 
            background: rgba(15, 23, 42, 0.5); 
            padding: 20px; 
            border-radius: 12px; 
            white-space: pre-wrap; 
            font-size: 0.95rem; 
            color: #e2e8f0;
            margin: 16px 0; 
            border: 1px solid rgba(255, 255, 255, 0.05);
            font-family: inherit;
          }
          
          .actions { display: flex; gap: 12px; margin-top: 24px; }
          .btn { 
            padding: 10px 20px; 
            border-radius: 8px; 
            font-weight: 600; 
            cursor: pointer; 
            border: none; 
            transition: all 0.2s; 
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
          }
          .btn-approve { background: var(--primary); color: white; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4); }
          .btn-approve:hover { background: var(--primary-dark); transform: translateY(-1px); }
          .btn-reject { background: transparent; color: var(--danger); border: 1px solid var(--danger); }
          .btn-reject:hover { background: rgba(239, 68, 68, 0.1); }
          
          .lead-card.sent { border-left: 4px solid var(--success); }
          .lead-card.failed { border-left: 4px solid var(--danger); }
          
          .error-msg { color: var(--danger); font-size: 0.85rem; border-left: 2px solid var(--danger); padding-left: 10px; margin-top: 10px; }
          .empty-state { text-align: center; padding: 40px; color: var(--text-muted); font-style: italic; }

          /* Custom Modal Styles */
          #modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
            display: none; align-items: center; justify-content: center; z-index: 1000;
          }
          .modal-content {
            width: 90%; max-width: 400px; padding: 30px; text-align: center;
          }
          .modal-btns { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div id="modal-overlay">
          <div class="glass modal-content">
            <h3 id="modal-title" style="margin-top:0">Confirmation</h3>
            <p id="modal-text" style="color: var(--text-muted)"></p>
            <div class="modal-btns">
              <button id="modal-cancel" class="btn btn-reject">Cancel</button>
              <button id="modal-confirm" class="btn btn-approve">Confirm</button>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="header">
            <h1>Operational Report</h1>
            <a href="/" class="nav-link">← Control Panel</a>
          </div>
          
          <div class="stat-grid">
            <div class="glass stat-card active">
              <div class="stat-value">${sentToday}</div>
              <div class="stat-label">Sent Today</div>
            </div>
            <div class="glass stat-card">
              <div class="stat-value">${globalStats.SENT}</div>
              <div class="stat-label">Total Sent</div>
            </div>
            <div class="glass stat-card">
              <div class="stat-value">${globalStats.WAITING_APPROVAL}</div>
              <div class="stat-label">Waiting</div>
            </div>
            <div class="glass stat-card">
              <div class="stat-value" style="color: var(--danger)">${globalStats.FAILED}</div>
              <div class="stat-label">Failed/Rejected</div>
            </div>
          </div>
          
          <h2>Waiting for Approval <span class="badge">${waiting.length}</span></h2>
          ${
						waiting.length === 0
							? '<div class="glass empty-state">No leads waiting for approval at the moment.</div>'
							: waiting
									.map(
										(l) => `
            <div class="glass lead-card">
              <div class="lead-header">
                <div>
                  <div class="lead-name">${l.firstName || "N/A"} ${l.lastName || ""}</div>
                  <div class="lead-info">${l.jobTitle || "No Title"} at <strong>${l.companyName}</strong></div>
                  <div class="lead-info" style="margin-top:2px;">${l.email}</div>
                </div>
              </div>
              <div class="email-preview">${l.personalizedEmail}</div>
              <div class="actions">
                <button class="btn btn-approve" onclick="showPrompt('${l.id}', 'APPROVE')">
                  Approve & Send Now
                </button>
                <button class="btn btn-reject" onclick="showPrompt('${l.id}', 'REJECT')">
                  Discard Lead
                </button>
              </div>
            </div>
          `,
									)
									.join("")
					}

          <h2>Sent History <span class="badge">${sent.length}</span></h2>
          ${
						sent.length === 0
							? '<div class="glass empty-state">No history of sent emails.</div>'
							: sent
									.slice(0, 5)
									.map(
										(l) => `
            <div class="glass lead-card sent">
              <div class="lead-header">
                <div>
                  <div class="lead-name">${l.firstName || "N/A"} ${l.lastName || ""}</div>
                  <div class="lead-info">${l.email} • Sent at ${l.sentAt ? new Date(l.sentAt).toLocaleString() : "Unknown"}</div>
                </div>
              </div>
              <div class="email-preview" style="opacity: 0.8; font-size: 0.85rem;">${l.personalizedEmail}</div>
            </div>
          `,
									)
									.join("")
					}

          <h2>Recent Failures</h2>
          ${
						fail.length === 0
							? '<div class="glass empty-state">Clean record! No recent failures.</div>'
							: fail
									.slice(0, 5)
									.map(
										(l) => `
            <div class="glass lead-card failed">
              <div class="lead-name">${l.email}</div>
              <div class="error-msg">${l.errorLog || "Unknown error"}</div>
              <button onclick="showPrompt('${l.id}', 'APPROVE')" class="btn btn-approve" style="margin-top:15px; padding: 6px 12px; font-size: 0.8rem;">
                Retry Processing
              </button>
            </div>
          `,
									)
									.join("")
					}
        </div>
        
        <script>
          let currentAction = null;
          const overlay = document.getElementById('modal-overlay');
          const modalText = document.getElementById('modal-text');
          const modalConfirm = document.getElementById('modal-confirm');

          function showPrompt(id, action) {
            currentAction = { id, action };
            modalText.innerText = action === 'APPROVE' ? 'Do you want to approve and send this email?' : 'Are you sure you want to discard this lead?';
            modalConfirm.innerText = action === 'APPROVE' ? 'Approve' : 'Discard';
            modalConfirm.className = action === 'APPROVE' ? 'btn btn-approve' : 'btn btn-danger';
            overlay.style.display = 'flex';
          }

          document.getElementById('modal-cancel').onclick = () => { overlay.style.display = 'none'; };

          modalConfirm.onclick = async () => {
            if(!currentAction) return;
            const { id, action } = currentAction;
            const endpoint = action === 'APPROVE' ? '/approve/' : '/reject/';
            
            modalConfirm.disabled = true;
            modalConfirm.innerText = 'Processing...';

            try {
              const res = await fetch(endpoint + id, { method: 'POST' });
              const data = await res.json();
              if (res.ok && data.success) {
                location.reload();
              } else {
                alert('Error: ' + (data.error || 'Action failed'));
                modalConfirm.disabled = false;
                overlay.style.display = 'none';
              }
            } catch (e) {
              alert('Network Error: ' + e.message);
              modalConfirm.disabled = false;
              overlay.style.display = 'none';
            }
          };
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
	try {
		await LeadService.updateLead(id, { status: "APPROVED" });
		return c.json({ success: true });
	} catch (e: any) {
		return c.json({ success: false, error: e.message }, 500);
	}
});

app.post("/reject/:id", async (c) => {
	const id = c.req.param("id");
	try {
		await LeadService.updateLead(id, {
			status: "FAILED",
			errorLog: "Rejected by user",
		});
		return c.json({ success: true });
	} catch (e: any) {
		return c.json({ success: false, error: e.message }, 500);
	}
});

export default {
	port: Number(process.env.PORT) || 3000,
	fetch: app.fetch,
};
