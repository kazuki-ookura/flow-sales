<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, slide } from 'svelte/transition';
  import { 
    Send, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    RefreshCw, 
    LayoutDashboard, 
    History,
    Eye,
    Mail,
    User,
    Building2,
    CheckCircle,
    Settings,
    Save
  } from 'lucide-svelte';

  interface Lead {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    jobTitle: string | null;
    personalizedEmail: string | null;
    status: string;
    sentAt: string | null;
    errorLog: string | null;
  }

  interface Stats {
    TOTAL: number;
    PENDING: number;
    RESEARCHED: number;
    PERSONALIZED: number;
    WAITING_APPROVAL: number;
    APPROVED: number;
    SENT: number;
    FAILED: number;
  }

  // Svelte 5 Runes
  let waiting = $state<Lead[]>([]);
  let sent = $state<Lead[]>([]);
  let fail = $state<Lead[]>([]);
  let globalStats = $state<Stats | null>(null);
  let sentToday = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Modal State
  let showModal = $state(false);
  let modalConfig = $state({ id: '', action: 'APPROVE', title: '', text: '', emailContent: '' as string | null });
  let processingAction = $state(false);
  let expandedHistoryId = $state<string | null>(null);
  let showSettings = $state(false);
  let excludedDomains = $state('');
  let savingSettings = $state(false);

  async function fetchData() {
    try {
      loading = true;
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      
      waiting = data.waiting;
      sent = data.sent;
      fail = data.fail;
      globalStats = data.globalStats;
      sentToday = data.sentToday;
      error = null;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        excludedDomains = data.excludedDomains;
      }
    } catch (e) {
      console.error('Failed to fetch settings');
    }
  }

  async function saveSettings() {
    savingSettings = true;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedDomains })
      });
      if (res.ok) {
        showSettings = false;
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (e) {
      alert('Error saving settings');
    } finally {
      savingSettings = false;
    }
  }

  onMount(() => {
    fetchData();
    fetchSettings();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  });

  function openModal(id: string, action: 'APPROVE' | 'REJECT' | 'VIEW', email?: string | null) {
    if (action === 'VIEW') {
      modalConfig = {
        id,
        action,
        title: 'Email Preview',
        text: '',
        emailContent: email || 'No content'
      };
    } else {
      modalConfig = {
        id,
        action,
        title: action === 'APPROVE' ? 'Confirm Approval' : 'Discard Lead',
        text: action === 'APPROVE' 
          ? 'Are you sure you want to approve and send this personalized email?' 
          : 'Are you sure you want to discard this lead? This action is reversible as a retry.',
        emailContent: null
      };
    }
    showModal = true;
  }

  async function handleAction() {
    processingAction = true;
    const endpoint = modalConfig.action === 'APPROVE' ? '/approve/' : '/reject/';
    
    try {
      const res = await fetch(endpoint + modalConfig.id, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showModal = false;
        await fetchData();
      } else {
        alert('Action failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Network Error: ' + e.message);
    } finally {
      processingAction = false;
    }
  }

  async function runWorkflowNow() {
    try {
      const res = await fetch('/run-now');
      const data = await res.json();
      alert(data.message);
    } catch (e: any) {
      alert('Error triggering workflow');
    }
  }
</script>

<div class="app-container">
  <!-- Header -->
  <header class="glass header">
    <div class="brand">
      <LayoutDashboard class="icon-primary" size={28} />
      <h1>Launch Flow <span class="accent-text">SDR</span></h1>
    </div>
    <div class="header-actions">
      <button class="btn btn-ghost" onclick={() => (showSettings = !showSettings)} title="Settings">
        <Settings size={20} />
      </button>
      <button class="btn btn-ghost" onclick={fetchData} disabled={loading}>
        <RefreshCw size={18} class={loading ? 'spin' : ''} />
      </button>
      <button class="btn btn-primary" onclick={runWorkflowNow}>
        Run Workflow
      </button>
    </div>
  </header>

  <!-- Settings Panel -->
  {#if showSettings}
    <div class="glass settings-panel" transition:slide>
      <div class="settings-header">
        <h3>Campaign Settings</h3>
        <button class="btn btn-primary btn-sm" onclick={saveSettings} disabled={savingSettings}>
          {#if savingSettings}
            <RefreshCw size={14} class="spin" />
          {:else}
            <Save size={14} />
          {/if}
          Save Settings
        </button>
      </div>
      <div class="settings-body">
        <label for="excluded-domains">
          <strong>Excluded Domains</strong>
          <p class="label-hint">Domains to skip during outreach (comma separated). Example: competitor.com, rival.jp</p>
        </label>
        <textarea 
          id="excluded-domains"
          class="glass input-textarea"
          bind:value={excludedDomains}
          placeholder="e.g. gmail.com, yahoo.co.jp, competitor.com"
        ></textarea>
      </div>
    </div>
  {/if}

  <!-- Stats Grid -->
  {#if globalStats}
    <div class="stats-grid">
      <div class="glass stat-card" in:fly={{ y: 20, delay: 0 }}>
        <div class="stat-icon-wrapper blue">
          <Send size={24} />
        </div>
        <div class="stat-content">
          <span class="stat-label">Sent Today</span>
          <span class="stat-value">{sentToday}</span>
        </div>
      </div>
      <div class="glass stat-card" in:fly={{ y: 20, delay: 100 }}>
        <div class="stat-icon-wrapper green">
          <CheckCircle2 size={24} />
        </div>
        <div class="stat-content">
          <span class="stat-label">Total Sent</span>
          <span class="stat-value">{globalStats.SENT}</span>
        </div>
      </div>
      <div class="glass stat-card" in:fly={{ y: 20, delay: 200 }}>
        <div class="stat-icon-wrapper orange">
          <Clock size={24} />
        </div>
        <div class="stat-content">
          <span class="stat-label">Waiting</span>
          <span class="stat-value">{globalStats.WAITING_APPROVAL}</span>
        </div>
      </div>
      <div class="glass stat-card" in:fly={{ y: 20, delay: 300 }}>
        <div class="stat-icon-wrapper red">
          <AlertCircle size={24} />
        </div>
        <div class="stat-content">
          <span class="stat-label">Failed/Rejected</span>
          <span class="stat-value">{globalStats.FAILED}</span>
        </div>
      </div>
    </div>
  {/if}

  <main class="content">
    <!-- Waiting Section -->
    <section class="section">
      <div class="section-header">
        <Clock size={20} />
        <h2>Waiting for Approval</h2>
        <span class="badge">{waiting.length}</span>
      </div>
      
      {#if waiting.length === 0}
        <div class="glass empty-state" in:fade>
          <p>No leads currently waiting for approval.</p>
        </div>
      {:else}
        <div class="leads-grid-column">
          {#each waiting as lead (lead.id)}
            <div class="glass lead-card" in:fly={{ x: -20 }} out:slide>
              <div class="lead-header">
                <div class="lead-avatar">
                  <User size={20} />
                </div>
                <div class="lead-meta">
                  <h3>{lead.firstName || 'N/A'} {lead.lastName || ''}</h3>
                  <div class="lead-sub">
                    <Building2 size={14} />
                    <span>{lead.companyName || 'Unknown Corp'}</span>
                    <span class="separator">•</span>
                    <span>{lead.jobTitle || 'No Title'}</span>
                  </div>
                  <div class="lead-email">
                    <Mail size={14} />
                    <span>{lead.email}</span>
                  </div>
                </div>
              </div>
              
              <div class="email-preview-container">
                <div class="email-preview">
                  {lead.personalizedEmail}
                </div>
              </div>

              <div class="lead-actions">
                <button 
                  class="btn btn-approve flex-1" 
                  onclick={() => openModal(lead.id, 'APPROVE')}
                >
                  <CheckCircle2 size={18} />
                  Approve & Send
                </button>
                <button 
                  class="btn btn-outline-danger" 
                  onclick={() => openModal(lead.id, 'REJECT')}
                >
                  <XCircle size={18} />
                  Discard
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <div class="side-sections">
      <!-- Sent History -->
      <section class="section">
        <div class="section-header">
          <History size={20} />
          <h2>Sent History</h2>
        </div>
        <div class="history-list">
          {#if sent.length === 0}
            <div class="glass empty-state small">No sent history.</div>
          {:else}
            {#each sent.slice(0, 10) as lead (lead.id)}
              <div class="glass history-card" in:fade>
                <div class="history-card-header">
                  <strong>{lead.firstName || ''} {lead.lastName || ''}</strong>
                  <span class="time">{lead.sentAt ? new Date(lead.sentAt).toLocaleTimeString() : ''}</span>
                </div>
                <div class="history-card-body">
                  {lead.email}
                </div>
                <div class="history-card-footer">
                  <button class="btn-text-action" onclick={() => openModal(lead.id, 'VIEW', lead.personalizedEmail)}>
                    <Eye size={14} />
                    View Sent Email
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </section>

      <!-- Failures -->
      <section class="section">
        <div class="section-header">
          <AlertCircle size={20} />
          <h2>Recent Failures</h2>
        </div>
        <div class="history-list">
          {#if fail.length === 0}
            <div class="glass empty-state small">No recent failures.</div>
          {:else}
            {#each fail.slice(0, 10) as lead (lead.id)}
              <div class="glass history-card failure" in:fade>
                <div class="history-card-header">
                  <strong>{lead.email}</strong>
                  <div class="history-actions">
                    <button class="btn-icon" onclick={() => openModal(lead.id, 'APPROVE')} title="Retry">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
                <div class="error-log">
                  {lead.errorLog || 'Unknown error'}
                </div>
                <div class="history-card-footer">
                  <button class="btn-text-action" onclick={() => openModal(lead.id, 'VIEW', lead.personalizedEmail)}>
                    <Eye size={14} />
                    View Draft
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </section>
    </div>
  </main>
</div>

<!-- Modal -->
{#if showModal}
  <div 
    class="modal-overlay" 
    transition:fade 
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Escape' && (showModal = false)}
    onclick={() => !processingAction && (showModal = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="glass modal-content" transition:fly={{ y: 20 }} onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>{modalConfig.title}</h3>
      </div>
      <div class="modal-body">
        {#if modalConfig.action === 'VIEW'}
          <div class="email-preview-container text-left scrollable">
            <div class="email-preview">{modalConfig.emailContent}</div>
          </div>
        {:else}
          <p>{modalConfig.text}</p>
        {/if}
      </div>
      <div class="modal-actions">
        {#if modalConfig.action === 'VIEW'}
          <button class="btn btn-primary" onclick={() => (showModal = false)}>
            Close
          </button>
        {:else}
          <button class="btn btn-ghost" onclick={() => (showModal = false)} disabled={processingAction}>
            Cancel
          </button>
          <button 
            class={modalConfig.action === 'APPROVE' ? 'btn btn-primary' : 'btn btn-danger'} 
            onclick={handleAction}
            disabled={processingAction}
          >
            {#if processingAction}
              <RefreshCw size={16} class="spin" />
              Processing...
            {:else}
              {modalConfig.action === 'APPROVE' ? 'Confirm Approval' : 'Discard Lead'}
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  :root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --secondary: #ec4899;
    --bg-dark: #070b14;
    --card-bg: rgba(22, 28, 45, 0.7);
    --border: rgba(255, 255, 255, 0.08);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --blue: #3b82f6;
  }

  :global(body) {
    background-color: var(--bg-dark);
    color: var(--text-main);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    margin: 0;
    min-height: 100vh;
    background-image: 
      radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.05) 0%, transparent 40%);
    background-attachment: fixed;
  }

  .app-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 30px;
  }

  .glass {
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 30px;
    margin-bottom: 40px;
    position: sticky;
    top: 20px;
    z-index: 100;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .brand h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
  }

  .accent-text {
    background: linear-gradient(to right, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :global(.icon-primary) { color: var(--primary); }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }

  .stat-card {
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    transition: transform 0.3s ease;
  }

  .stat-card:hover { transform: translateY(-5px); }

  .stat-icon-wrapper {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-icon-wrapper.blue { background: rgba(59, 130, 246, 0.1); color: var(--blue); }
  .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.1); color: var(--success); }
  .stat-icon-wrapper.orange { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
  .stat-icon-wrapper.red { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

  .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 800;
    color: #fff;
  }

  .content {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 40px;
  }

  @media (max-width: 1100px) {
    .content { grid-template-columns: 1fr; }
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding-left: 10px;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .badge {
    background: var(--primary);
    color: white;
    padding: 4px 12px;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 800;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .leads-grid-column {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .lead-card {
    padding: 30px;
    transition: all 0.3s ease;
  }

  .lead-card:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(22, 28, 45, 0.9);
    box-shadow: 0 20px 40px -20px rgba(0,0,0,0.5);
  }

  .lead-header {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
  }

  .lead-avatar {
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .lead-meta h3 {
    margin: 0 0 6px 0;
    font-size: 1.25rem;
  }

  .lead-sub, .lead-email {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .separator { opacity: 0.3; }

  .email-preview-container {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    position: relative;
  }

  .email-preview {
    font-size: 1rem;
    line-height: 1.7;
    white-space: pre-wrap;
    color: #cbd5e1;
  }

  .lead-actions {
    display: flex;
    gap: 15px;
  }

  .flex-1 { flex: 1; }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-radius: 12px;
    padding: 12px 24px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 0.95rem;
  }

  .btn-primary {
    background: linear-gradient(to right, var(--primary), var(--primary-dark));
    color: #fff;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5); }

  .btn-approve {
    background: var(--success);
    color: #fff;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  .btn-approve:hover { filter: brightness(1.1); transform: translateY(-1px); }

  .btn-danger { background: var(--danger); color: #fff; }
  .btn-outline-danger {
    background: transparent;
    border: 1.5px solid var(--danger);
    color: var(--danger);
  }
  .btn-outline-danger:hover { background: rgba(239, 68, 68, 0.1); }

  .btn-ghost { background: transparent; color: var(--text-muted); }
  .btn-ghost:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }

  /* Side Lists */
  .side-sections {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .history-card {
    padding: 16px 20px;
    font-size: 0.9rem;
  }

  .history-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .history-card-footer {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .btn-text-action {
    background: transparent;
    border: none;
    color: var(--primary);
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px 0;
    transition: all 0.2s;
  }
  .btn-text-action:hover { color: #818cf8; text-decoration: underline; }

  .history-card-header .time { font-size: 0.75rem; color: var(--text-muted); }

  .history-card-body { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .failure { border-left: 4px solid var(--danger); }
  .error-log { font-size: 0.75rem; color: var(--danger); margin-top: 8px; font-family: monospace; }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    width: 90%;
    max-width: 500px;
    padding: 40px;
    text-align: center;
  }

  .modal-header h3 { margin: 0 0 16px 0; font-size: 1.5rem; }
  .modal-body p { color: var(--text-muted); line-height: 1.6; margin-bottom: 30px; }
  .modal-actions { display: flex; gap: 15px; justify-content: center; }

  /* Utils */
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .history-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .text-left { text-align: left; }
  .scrollable { 
    max-height: 400px; 
    overflow-y: auto; 
    scrollbar-width: thin;
    scrollbar-color: var(--primary) transparent;
  }
  .scrollable::-webkit-scrollbar { width: 6px; }
  .scrollable::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; }

  .empty-state {
    padding: 60px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
  }

  .empty-state.small { padding: 30px; font-size: 0.85rem; }

  .btn-icon {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
  }
  .btn-icon:hover { color: var(--primary); background: rgba(255,255,255,0.05); }

  /* Settings Panel */
  .settings-panel {
    margin-bottom: 40px;
    padding: 30px;
    border-color: rgba(99, 102, 241, 0.3);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .settings-header h3 { margin: 0; font-size: 1.25rem; }

  .settings-body label {
    display: block;
    margin-bottom: 12px;
  }

  .label-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 4px 0 0 0;
  }

  .input-textarea {
    width: 100%;
    min-height: 100px;
    padding: 16px;
    color: #fff;
    font-family: inherit;
    font-size: 0.95rem;
    resize: vertical;
    box-sizing: border-box;
    margin-top: 8px;
  }

  .btn-sm {
    padding: 8px 16px;
    font-size: 0.85rem;
    border-radius: 8px;
  }
</style>
