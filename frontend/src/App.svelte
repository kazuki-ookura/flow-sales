<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import {
    Send,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    ChevronRight,
    Eye,
    Mail,
    User,
    Building2,
    Settings,
    Save,
    Activity,
    Zap,
    Shield,
    PlayCircle,
    RotateCcw,
    Info,
    Sparkles,
    Filter,
    Search,
    MoreHorizontal,
    ArrowUpRight,
    CircleDot,
    Check,
    Ban,
    Edit3,
    X,
    ChevronDown,
    BarChart2,
  } from 'lucide-svelte';

  // ---- Types ----
  interface Lead {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    jobTitle: string | null;
    website: string | null;
    personalizedEmail: string | null;
    researchSummary: string | null;
    techStack: string | null;
    status: string;
    approvalStatus: string | null;
    sentAt: string | null;
    errorLog: string | null;
    createdAt: string | null;
    updatedAt: string | null;
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

  type Tab = 'approval' | 'execution' | 'settings' | 'logs';

  // ---- State ----
  let activeTab = $state<Tab>('approval');
  let waiting = $state<Lead[]>([]);
  let sent = $state<Lead[]>([]);
  let fail = $state<Lead[]>([]);
  let allLeads = $state<Lead[]>([]);
  let globalStats = $state<Stats | null>(null);
  let sentToday = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let workflowRunning = $state(false);

  // Modal State
  let showModal = $state(false);
  let selectedLead = $state<Lead | null>(null);
  let modalMode = $state<'approve' | 'reject' | 'view' | 'edit'>('view');
  let editContent = $state('');
  let processingAction = $state(false);

  // Settings State
  let excludedDomains = $state('');
  let senderName = $state('');
  let senderTitle = $state('');
  let productName = $state('');
  let productDescription = $state('');
  let savingSettings = $state(false);
  let settingsSaved = $state(false);

  // Search / filter
  let searchQuery = $state('');
  let executionFilter = $state<string>('ALL');

  // ---- Derived ----
  let filteredWaiting = $derived(
    waiting.filter(l => {
      const q = searchQuery.toLowerCase();
      return !q || [l.email, l.firstName, l.lastName, l.companyName].some(v => v?.toLowerCase().includes(q));
    })
  );

  let filteredLeads = $derived(
    allLeads.filter(l => {
      const matchFilter = executionFilter === 'ALL' || l.status === executionFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || [l.email, l.firstName, l.lastName, l.companyName].some(v => v?.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    })
  );

  let errorLeads = $derived(fail.filter(l => l.errorLog));

  // ---- Fetch ----
  async function fetchData() {
    try {
      loading = true;
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      waiting = data.waiting ?? [];
      sent = data.sent ?? [];
      fail = data.fail ?? [];
      globalStats = data.globalStats;
      sentToday = data.sentToday ?? 0;
      allLeads = [...(data.waiting ?? []), ...(data.sent ?? []), ...(data.fail ?? []), ...(data.inProgress ?? [])];
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
        excludedDomains = data.excludedDomains ?? '';
        senderName = data.senderName ?? '';
        senderTitle = data.senderTitle ?? '';
        productName = data.productName ?? '';
        productDescription = data.productDescription ?? '';
      }
    } catch (e) { /* noop */ }
  }

  async function saveSettings() {
    savingSettings = true;
    settingsSaved = false;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedDomains, senderName, senderTitle, productName, productDescription })
      });
      if (res.ok) {
        settingsSaved = true;
        setTimeout(() => (settingsSaved = false), 2500);
      }
    } catch (e) { /* noop */ }
    finally { savingSettings = false; }
  }

  async function runWorkflowNow() {
    workflowRunning = true;
    try {
      await fetch('/run-now');
      await fetchData();
    } catch (e) { /* noop */ }
    finally { setTimeout(() => (workflowRunning = false), 1500); }
  }

  async function handleApprove(lead: Lead) {
    processingAction = true;
    try {
      const body = editContent ? JSON.stringify({ content: editContent }) : undefined;
      const res = await fetch('/approve/' + lead.id, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showModal = false;
        await fetchData();
      }
    } catch (e) { /* noop */ }
    finally { processingAction = false; }
  }

  async function handleReject(lead: Lead) {
    processingAction = true;
    try {
      const res = await fetch('/reject/' + lead.id, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showModal = false;
        await fetchData();
      }
    } catch (e) { /* noop */ }
    finally { processingAction = false; }
  }

  async function retryLead(lead: Lead) {
    try {
      await fetch('/approve/' + lead.id, { method: 'POST' });
      await fetchData();
    } catch (e) { /* noop */ }
  }

  function openLeadModal(lead: Lead, mode: 'approve' | 'reject' | 'view' | 'edit') {
    selectedLead = lead;
    modalMode = mode;
    editContent = lead.personalizedEmail ?? '';
    showModal = true;
  }

  onMount(() => {
    fetchData();
    fetchSettings();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  });

  // ---- Helpers ----
  function statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: '待機中',
      RESEARCHED: 'リサーチ済',
      PERSONALIZED: 'メール生成済',
      WAITING_APPROVAL: '承認待ち',
      APPROVED: '承認済',
      SENT: '送信済',
      FAILED: 'エラー',
    };
    return map[status] ?? status;
  }

  function statusColor(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'status-pending',
      RESEARCHED: 'status-researched',
      PERSONALIZED: 'status-personalized',
      WAITING_APPROVAL: 'status-waiting',
      APPROVED: 'status-approved',
      SENT: 'status-sent',
      FAILED: 'status-failed',
    };
    return map[status] ?? 'status-pending';
  }

  function parseErrorLog(raw: string | null): { cause: string; impact: string; action: string } {
    if (!raw) return { cause: 'エラー詳細なし', impact: '処理が中断されました', action: '再実行して確認してください' };
    const lower = raw.toLowerCase();
    if (lower.includes('website') || lower.includes('crawl') || lower.includes('fetch')) {
      return {
        cause: 'ウェブサイトのクロールに失敗しました',
        impact: 'リサーチデータが不足しているため、メール生成をスキップしました',
        action: 'サイトのアクセス制限を確認後、再実行してください'
      };
    }
    if (lower.includes('api') || lower.includes('anthropic') || lower.includes('openai')) {
      return {
        cause: 'AI APIへの接続に失敗しました',
        impact: 'パーソナライズメールが生成できませんでした',
        action: 'APIキーの有効性を確認して再実行してください'
      };
    }
    if (lower.includes('email') || lower.includes('smtp') || lower.includes('send')) {
      return {
        cause: 'メール送信に失敗しました',
        impact: '相手にメールが届いていません',
        action: 'SMTP設定を確認後、再実行してください'
      };
    }
    if (lower.includes('rate') || lower.includes('limit') || lower.includes('quota')) {
      return {
        cause: 'APIレート制限に達しました',
        impact: '処理がスキップされました',
        action: 'しばらく待ってから再実行してください'
      };
    }
    return {
      cause: raw.length > 120 ? raw.slice(0, 120) + '...' : raw,
      impact: 'このリードの処理が中断されました',
      action: '内容を確認して再実行してください'
    };
  }

  function formatTime(ts: string | null): string {
    if (!ts) return '-';
    const d = new Date(typeof ts === 'number' ? (ts as any) * 1000 : ts);
    return d.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function extractWhyNow(summary: string | null): string {
    if (!summary) return 'リサーチ内容に基づいてパーソナライズされました';
    return summary.slice(0, 200) + (summary.length > 200 ? '...' : '');
  }
</script>

<!-- ===================== LAYOUT ===================== -->
<div class="layout">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon">
        <Zap size={16} />
      </div>
      <span class="brand-name">FlowSales</span>
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item {activeTab === 'approval' ? 'active' : ''}"
        onclick={() => { activeTab = 'approval'; searchQuery = ''; }}
      >
        <Clock size={16} />
        <span>承認待ち</span>
        {#if waiting.length > 0}
          <span class="nav-badge">{waiting.length}</span>
        {/if}
      </button>

      <button
        class="nav-item {activeTab === 'execution' ? 'active' : ''}"
        onclick={() => { activeTab = 'execution'; searchQuery = ''; executionFilter = 'ALL'; }}
      >
        <Activity size={16} />
        <span>実行状況</span>
      </button>

      <button
        class="nav-item {activeTab === 'settings' ? 'active' : ''}"
        onclick={() => { activeTab = 'settings'; }}
      >
        <Settings size={16} />
        <span>配信設定</span>
      </button>

      <button
        class="nav-item {activeTab === 'logs' ? 'active' : ''}"
        onclick={() => { activeTab = 'logs'; }}
      >
        <Shield size={16} />
        <span>ログ &amp; エラー対応</span>
        {#if errorLeads.length > 0}
          <span class="nav-badge error">{errorLeads.length}</span>
        {/if}
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-stats">
        <div class="sidebar-stat">
          <span class="sidebar-stat-value">{sentToday}</span>
          <span class="sidebar-stat-label">今日の送信</span>
        </div>
        <div class="sidebar-stat">
          <span class="sidebar-stat-value">{globalStats?.SENT ?? 0}</span>
          <span class="sidebar-stat-label">累計送信</span>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main content -->
  <div class="main">

    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        {#if activeTab === 'approval'}
          <h1 class="page-title">承認待ち</h1>
          <span class="page-subtitle">AIが生成したメールを確認・承認してください</span>
        {:else if activeTab === 'execution'}
          <h1 class="page-title">実行状況</h1>
          <span class="page-subtitle">リードのパイプライン進捗を確認します</span>
        {:else if activeTab === 'settings'}
          <h1 class="page-title">配信設定</h1>
          <span class="page-subtitle">送信者情報・キャンペーン設定を管理します</span>
        {:else}
          <h1 class="page-title">ログ &amp; エラー対応</h1>
          <span class="page-subtitle">エラーの原因を分析し、対応できます</span>
        {/if}
      </div>

      <div class="topbar-right">
        <button class="btn-icon-only" onclick={fetchData} disabled={loading} title="更新">
          <RefreshCw size={15} class={loading ? 'spin' : ''} />
        </button>
        <button class="btn-primary" onclick={runWorkflowNow} disabled={workflowRunning}>
          {#if workflowRunning}
            <RefreshCw size={14} class="spin" />
            実行中...
          {:else}
            <PlayCircle size={14} />
            ワークフロー実行
          {/if}
        </button>
      </div>
    </header>

    <!-- KPI strip -->
    {#if globalStats}
      <div class="kpi-strip">
        <div class="kpi-item">
          <span class="kpi-value">{sentToday}</span>
          <span class="kpi-label">今日の送信</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-value">{globalStats.SENT}</span>
          <span class="kpi-label">累計送信</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-value kpi-accent">{globalStats.WAITING_APPROVAL}</span>
          <span class="kpi-label">承認待ち</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-value">{globalStats.TOTAL}</span>
          <span class="kpi-label">リード総数</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-value kpi-error">{globalStats.FAILED}</span>
          <span class="kpi-label">エラー</span>
        </div>
      </div>
    {/if}

    <!-- Page content -->
    <div class="page-content">

      <!-- ====== TAB: APPROVAL ====== -->
      {#if activeTab === 'approval'}
        <div class="tab-content" in:fade={{ duration: 150 }}>

          {#if filteredWaiting.length > 0}
            <div class="content-toolbar">
              <div class="search-box">
                <Search size={14} />
                <input bind:value={searchQuery} placeholder="メール・企業名で検索..." class="search-input" />
              </div>
              <span class="result-count">{filteredWaiting.length} 件</span>
            </div>
          {/if}

          {#if filteredWaiting.length === 0}
            <div class="empty-state" in:fade>
              <CheckCircle2 size={32} class="empty-icon" />
              <p class="empty-title">承認待ちのメールはありません</p>
              <p class="empty-desc">AIが新しいリードを処理すると、ここに表示されます</p>
            </div>
          {:else}
            <div class="approval-list">
              {#each filteredWaiting as lead (lead.id)}
                <div class="approval-card" in:fly={{ y: 8, duration: 200 }}>

                  <!-- Card header -->
                  <div class="approval-card-header">
                    <div class="lead-avatar">{(lead.firstName?.[0] ?? lead.email[0]).toUpperCase()}</div>
                    <div class="lead-info">
                      <div class="lead-name">
                        {lead.firstName ?? ''} {lead.lastName ?? ''}
                        {#if !lead.firstName && !lead.lastName}
                          <span class="text-muted">{lead.email}</span>
                        {/if}
                      </div>
                      <div class="lead-meta">
                        <Building2 size={12} />
                        <span>{lead.companyName ?? '不明'}</span>
                        {#if lead.jobTitle}
                          <span class="meta-sep">·</span>
                          <span>{lead.jobTitle}</span>
                        {/if}
                      </div>
                      <div class="lead-email-row">
                        <Mail size={12} />
                        <span>{lead.email}</span>
                        {#if lead.website}
                          <a href={lead.website} target="_blank" rel="noreferrer" class="website-link">
                            <ArrowUpRight size={12} />
                          </a>
                        {/if}
                      </div>
                    </div>
                    <div class="card-actions-top">
                      <button class="btn-ghost-sm" onclick={() => openLeadModal(lead, 'view')} title="メール全文を表示">
                        <Eye size={14} />
                      </button>
                      <button class="btn-ghost-sm" onclick={() => openLeadModal(lead, 'edit')} title="編集">
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </div>

                  <!-- AI reasoning block -->
                  {#if lead.researchSummary || lead.techStack}
                    <div class="ai-reason">
                      <div class="ai-reason-label">
                        <Sparkles size={12} />
                        <span>AI がこのメールを書いた理由</span>
                      </div>
                      <p class="ai-reason-text">{extractWhyNow(lead.researchSummary)}</p>
                      {#if lead.techStack}
                        <div class="tech-tags">
                          {#each lead.techStack.split(',').slice(0, 4) as tag}
                            <span class="tech-tag">{tag.trim()}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Email preview -->
                  <div class="email-preview-block">
                    <div class="email-preview-text">{lead.personalizedEmail ?? 'メール未生成'}</div>
                    <div class="email-preview-fade"></div>
                  </div>

                  <!-- Actions -->
                  <div class="card-actions-bottom">
                    <button class="btn-approve" onclick={() => openLeadModal(lead, 'approve')}>
                      <Check size={14} />
                      承認して送信
                    </button>
                    <button class="btn-reject" onclick={() => openLeadModal(lead, 'reject')}>
                      <Ban size={14} />
                      却下
                    </button>
                  </div>

                </div>
              {/each}
            </div>
          {/if}
        </div>

      <!-- ====== TAB: EXECUTION ====== -->
      {:else if activeTab === 'execution'}
        <div class="tab-content" in:fade={{ duration: 150 }}>

          <div class="content-toolbar">
            <div class="search-box">
              <Search size={14} />
              <input bind:value={searchQuery} placeholder="リードを検索..." class="search-input" />
            </div>
            <div class="filter-tabs">
              {#each ['ALL', 'PENDING', 'RESEARCHED', 'PERSONALIZED', 'WAITING_APPROVAL', 'SENT', 'FAILED'] as f}
                <button
                  class="filter-tab {executionFilter === f ? 'active' : ''}"
                  onclick={() => (executionFilter = f)}
                >
                  {f === 'ALL' ? 'すべて' : statusLabel(f)}
                </button>
              {/each}
            </div>
          </div>

          <!-- Pipeline overview -->
          {#if globalStats}
            <div class="pipeline-bar">
              {#each [
                { key: 'PENDING', label: '待機', count: globalStats.PENDING, cls: 'pipe-pending' },
                { key: 'RESEARCHED', label: 'リサーチ済', count: globalStats.RESEARCHED, cls: 'pipe-researched' },
                { key: 'PERSONALIZED', label: 'メール生成', count: globalStats.PERSONALIZED, cls: 'pipe-personalized' },
                { key: 'WAITING_APPROVAL', label: '承認待ち', count: globalStats.WAITING_APPROVAL, cls: 'pipe-waiting' },
                { key: 'SENT', label: '送信済', count: globalStats.SENT, cls: 'pipe-sent' },
                { key: 'FAILED', label: 'エラー', count: globalStats.FAILED, cls: 'pipe-failed' },
              ] as step}
                <div class="pipe-step {step.cls}" class:active={executionFilter === step.key} onclick={() => (executionFilter = step.key)}>
                  <span class="pipe-count">{step.count}</span>
                  <span class="pipe-label">{step.label}</span>
                </div>
              {/each}
            </div>
          {/if}

          {#if filteredLeads.length === 0}
            <div class="empty-state" in:fade>
              <BarChart2 size={32} class="empty-icon" />
              <p class="empty-title">該当するリードがありません</p>
            </div>
          {:else}
            <div class="exec-table">
              <div class="exec-table-header">
                <span>リード</span>
                <span>会社</span>
                <span>ステータス</span>
                <span>更新日時</span>
                <span></span>
              </div>
              {#each filteredLeads as lead (lead.id)}
                <div class="exec-table-row" in:fade={{ duration: 100 }}>
                  <div class="exec-lead">
                    <div class="exec-avatar">{(lead.firstName?.[0] ?? lead.email[0]).toUpperCase()}</div>
                    <div>
                      <div class="exec-name">{lead.firstName ?? ''} {lead.lastName ?? ''}</div>
                      <div class="exec-email">{lead.email}</div>
                    </div>
                  </div>
                  <span class="exec-company">{lead.companyName ?? '-'}</span>
                  <span class="status-badge {statusColor(lead.status)}">{statusLabel(lead.status)}</span>
                  <span class="exec-time">{formatTime(lead.updatedAt)}</span>
                  <div class="exec-row-actions">
                    {#if lead.personalizedEmail}
                      <button class="btn-ghost-sm" onclick={() => openLeadModal(lead, 'view')} title="メール確認">
                        <Eye size={14} />
                      </button>
                    {/if}
                    {#if lead.status === 'FAILED'}
                      <button class="btn-ghost-sm" onclick={() => retryLead(lead)} title="再実行">
                        <RotateCcw size={14} />
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      <!-- ====== TAB: SETTINGS ====== -->
      {:else if activeTab === 'settings'}
        <div class="tab-content" in:fade={{ duration: 150 }}>
          <div class="settings-grid">

            <!-- Sender block -->
            <div class="settings-card">
              <div class="settings-card-header">
                <User size={16} />
                <h3>送信者情報</h3>
              </div>
              <div class="settings-body">
                <div class="field">
                  <label class="field-label">送信者名 <span class="required">*</span></label>
                  <input class="field-input" bind:value={senderName} placeholder="例: 山田 太郎" />
                </div>
                <div class="field">
                  <label class="field-label">役職</label>
                  <input class="field-input" bind:value={senderTitle} placeholder="例: CEO / Head of Growth" />
                </div>
              </div>
            </div>

            <!-- Product block -->
            <div class="settings-card">
              <div class="settings-card-header">
                <Sparkles size={16} />
                <h3>製品 / サービス情報</h3>
              </div>
              <div class="settings-body">
                <div class="field">
                  <label class="field-label">製品名 <span class="required">*</span></label>
                  <input class="field-input" bind:value={productName} placeholder="例: FlowSales" />
                </div>
                <div class="field">
                  <label class="field-label">製品説明 <span class="required">*</span></label>
                  <textarea class="field-textarea" bind:value={productDescription} rows={3} placeholder="AIが営業メールを自動生成するSaaS..."></textarea>
                  <p class="field-hint">AIがメール生成時にこの内容を参照します</p>
                </div>
              </div>
            </div>

            <!-- Exclusion block -->
            <div class="settings-card full-width">
              <div class="settings-card-header">
                <Ban size={16} />
                <h3>除外ドメイン設定</h3>
              </div>
              <div class="settings-body">
                <div class="field">
                  <label class="field-label">除外ドメイン（カンマ区切り）</label>
                  <textarea
                    class="field-textarea"
                    bind:value={excludedDomains}
                    rows={3}
                    placeholder="例: gmail.com, yahoo.co.jp, competitor.com"
                  ></textarea>
                  <p class="field-hint">これらのドメインへのアウトリーチはスキップされます</p>
                </div>
              </div>
            </div>

          </div>

          <div class="settings-actions">
            <button class="btn-primary" onclick={saveSettings} disabled={savingSettings}>
              {#if savingSettings}
                <RefreshCw size={14} class="spin" />
                保存中...
              {:else if settingsSaved}
                <Check size={14} />
                保存しました
              {:else}
                <Save size={14} />
                設定を保存
              {/if}
            </button>
          </div>
        </div>

      <!-- ====== TAB: LOGS ====== -->
      {:else if activeTab === 'logs'}
        <div class="tab-content" in:fade={{ duration: 150 }}>

          {#if errorLeads.length === 0}
            <div class="empty-state" in:fade>
              <Shield size={32} class="empty-icon empty-icon-ok" />
              <p class="empty-title">エラーはありません</p>
              <p class="empty-desc">すべてのリードが正常に処理されています</p>
            </div>
          {:else}
            <div class="logs-list">
              {#each errorLeads as lead (lead.id)}
                {@const parsed = parseErrorLog(lead.errorLog)}
                <div class="log-card" in:fly={{ y: 6, duration: 200 }}>

                  <div class="log-card-header">
                    <div class="log-severity">
                      <AlertTriangle size={14} />
                      <span>エラー</span>
                    </div>
                    <div class="log-lead-info">
                      <span class="log-lead-name">{lead.firstName ?? ''} {lead.lastName ?? ''}</span>
                      {#if lead.firstName || lead.lastName}
                        <span class="meta-sep">·</span>
                      {/if}
                      <span class="log-lead-email">{lead.email}</span>
                      {#if lead.companyName}
                        <span class="meta-sep">·</span>
                        <span class="log-company">{lead.companyName}</span>
                      {/if}
                    </div>
                    <span class="log-time">{formatTime(lead.updatedAt)}</span>
                  </div>

                  <div class="log-detail-grid">
                    <div class="log-detail-item cause">
                      <div class="log-detail-label">
                        <Info size={12} />
                        原因
                      </div>
                      <p>{parsed.cause}</p>
                    </div>
                    <div class="log-detail-item impact">
                      <div class="log-detail-label">
                        <AlertTriangle size={12} />
                        影響
                      </div>
                      <p>{parsed.impact}</p>
                    </div>
                    <div class="log-detail-item action">
                      <div class="log-detail-label">
                        <Zap size={12} />
                        対応
                      </div>
                      <p>{parsed.action}</p>
                    </div>
                  </div>

                  <div class="log-card-footer">
                    <button class="btn-retry" onclick={() => retryLead(lead)}>
                      <RotateCcw size={13} />
                      再実行
                    </button>
                    {#if lead.personalizedEmail}
                      <button class="btn-ghost-sm" onclick={() => openLeadModal(lead, 'view')}>
                        <Eye size={13} />
                        ドラフト確認
                      </button>
                    {/if}
                  </div>

                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

    </div><!-- /page-content -->
  </div><!-- /main -->
</div><!-- /layout -->


<!-- ===================== MODAL ===================== -->
{#if showModal && selectedLead}
  <div
    class="modal-backdrop"
    in:fade={{ duration: 150 }}
    out:fade={{ duration: 100 }}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Escape' && !processingAction && (showModal = false)}
    onclick={() => !processingAction && (showModal = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="modal"
      in:fly={{ y: 12, duration: 200 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal header -->
      <div class="modal-header">
        <div class="modal-title-group">
          {#if modalMode === 'approve'}
            <CheckCircle2 size={16} class="modal-icon approve" />
            <h3>承認して送信</h3>
          {:else if modalMode === 'reject'}
            <Ban size={16} class="modal-icon reject" />
            <h3>リードを却下</h3>
          {:else if modalMode === 'edit'}
            <Edit3 size={16} class="modal-icon edit" />
            <h3>メールを編集</h3>
          {:else}
            <Eye size={16} class="modal-icon view" />
            <h3>メールプレビュー</h3>
          {/if}
        </div>
        <button class="modal-close" onclick={() => (showModal = false)} disabled={processingAction}>
          <X size={16} />
        </button>
      </div>

      <!-- Lead summary line -->
      <div class="modal-lead-summary">
        <div class="modal-lead-avatar">{(selectedLead.firstName?.[0] ?? selectedLead.email[0]).toUpperCase()}</div>
        <div>
          <span class="modal-lead-name">{selectedLead.firstName ?? ''} {selectedLead.lastName ?? ''}</span>
          {#if selectedLead.companyName}
            <span class="meta-sep">·</span>
            <span class="modal-lead-company">{selectedLead.companyName}</span>
          {/if}
          <div class="modal-lead-email">{selectedLead.email}</div>
        </div>
      </div>

      <!-- AI reason (for approve/view/edit) -->
      {#if (modalMode === 'approve' || modalMode === 'view' || modalMode === 'edit') && selectedLead.researchSummary}
        <div class="modal-ai-reason">
          <div class="modal-ai-label">
            <Sparkles size={12} />
            AIがこのメールを書いた理由
          </div>
          <p>{extractWhyNow(selectedLead.researchSummary)}</p>
        </div>
      {/if}

      <!-- Body -->
      <div class="modal-body">
        {#if modalMode === 'reject'}
          <p class="modal-confirm-text">
            このリードを却下しますか？却下後は「ログ &amp; エラー対応」から再実行できます。
          </p>
        {:else if modalMode === 'edit'}
          <textarea
            class="modal-edit-textarea"
            bind:value={editContent}
            rows={14}
          ></textarea>
        {:else}
          <div class="modal-email-preview">{selectedLead.personalizedEmail ?? 'メール未生成'}</div>
        {/if}
      </div>

      <!-- Footer actions -->
      <div class="modal-footer">
        {#if modalMode === 'view'}
          <button class="btn-secondary" onclick={() => { modalMode = 'edit'; editContent = selectedLead?.personalizedEmail ?? ''; }}>
            <Edit3 size={13} />
            編集する
          </button>
          <button class="btn-primary" onclick={() => { modalMode = 'approve'; }}>
            <Check size={13} />
            承認する
          </button>
        {:else if modalMode === 'edit'}
          <button class="btn-secondary" onclick={() => { modalMode = 'approve'; }}>
            編集内容で承認
          </button>
          <button class="btn-ghost-modal" onclick={() => (showModal = false)} disabled={processingAction}>キャンセル</button>
        {:else if modalMode === 'approve'}
          <button class="btn-ghost-modal" onclick={() => (showModal = false)} disabled={processingAction}>キャンセル</button>
          <button class="btn-primary" onclick={() => handleApprove(selectedLead!)} disabled={processingAction}>
            {#if processingAction}
              <RefreshCw size={13} class="spin" />
              送信中...
            {:else}
              <Send size={13} />
              確定して送信
            {/if}
          </button>
        {:else if modalMode === 'reject'}
          <button class="btn-ghost-modal" onclick={() => (showModal = false)} disabled={processingAction}>キャンセル</button>
          <button class="btn-danger" onclick={() => handleReject(selectedLead!)} disabled={processingAction}>
            {#if processingAction}
              <RefreshCw size={13} class="spin" />
              処理中...
            {:else}
              <Ban size={13} />
              却下する
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}


<style>
  /* ===== RESET & BASE ===== */
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    font-size: 14px;
    background: #f7f7f8;
    color: #0f0f10;
    -webkit-font-smoothing: antialiased;
  }

  /* ===== LAYOUT ===== */
  .layout {
    display: flex;
    min-height: 100vh;
    background: #f7f7f8;
  }

  /* ===== SIDEBAR ===== */
  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: #ffffff;
    border-right: 1px solid #e8e8ec;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 16px 16px;
    border-bottom: 1px solid #e8e8ec;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
    background: #7c3aed;
    color: #fff;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .brand-name {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f0f10;
  }

  .sidebar-nav {
    padding: 12px 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    border-radius: 7px;
    font-size: 13.5px;
    font-weight: 500;
    color: #555560;
    background: none;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }

  .nav-item:hover {
    background: #f3f3f6;
    color: #0f0f10;
  }

  .nav-item.active {
    background: #f0ecff;
    color: #7c3aed;
    font-weight: 600;
  }

  .nav-badge {
    margin-left: auto;
    background: #7c3aed;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }

  .nav-badge.error {
    background: #ef4444;
  }

  .sidebar-footer {
    padding: 14px 14px 18px;
    border-top: 1px solid #e8e8ec;
  }

  .sidebar-stats {
    display: flex;
    gap: 20px;
  }

  .sidebar-stat {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .sidebar-stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #0f0f10;
    line-height: 1;
  }

  .sidebar-stat-label {
    font-size: 11px;
    color: #9999a8;
  }

  /* ===== MAIN ===== */
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* ===== TOPBAR ===== */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 28px;
    background: #ffffff;
    border-bottom: 1px solid #e8e8ec;
    gap: 16px;
  }

  .topbar-left {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .page-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f0f10;
  }

  .page-subtitle {
    font-size: 13px;
    color: #9999a8;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ===== KPI STRIP ===== */
  .kpi-strip {
    display: flex;
    align-items: center;
    padding: 0 28px;
    background: #ffffff;
    border-bottom: 1px solid #e8e8ec;
    height: 52px;
    gap: 0;
  }

  .kpi-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 0 20px 0 0;
  }

  .kpi-value {
    font-size: 18px;
    font-weight: 700;
    color: #0f0f10;
    line-height: 1;
  }

  .kpi-accent { color: #7c3aed; }
  .kpi-error { color: #ef4444; }

  .kpi-label {
    font-size: 12px;
    color: #9999a8;
  }

  .kpi-divider {
    width: 1px;
    height: 20px;
    background: #e8e8ec;
    margin: 0 20px 0 0;
    flex-shrink: 0;
  }

  /* ===== PAGE CONTENT ===== */
  .page-content {
    flex: 1;
    padding: 24px 28px;
    overflow-y: auto;
  }

  .tab-content {
    max-width: 900px;
  }

  /* ===== TOOLBAR ===== */
  .content-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    border: 1px solid #e8e8ec;
    border-radius: 8px;
    padding: 7px 12px;
    color: #9999a8;
  }

  .search-input {
    border: none;
    outline: none;
    font-size: 13px;
    color: #0f0f10;
    background: transparent;
    width: 200px;
  }

  .search-input::placeholder { color: #b8b8c4; }

  .result-count {
    font-size: 13px;
    color: #9999a8;
    margin-left: 4px;
  }

  .filter-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .filter-tab {
    padding: 5px 11px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid #e8e8ec;
    background: #fff;
    color: #555560;
    cursor: pointer;
    transition: all 0.1s;
  }

  .filter-tab:hover { background: #f3f3f6; }
  .filter-tab.active {
    background: #f0ecff;
    border-color: #c4b5fd;
    color: #7c3aed;
    font-weight: 600;
  }

  /* ===== EMPTY STATE ===== */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    color: #b8b8c4;
    text-align: center;
    gap: 10px;
  }

  :global(.empty-icon) { color: #d4d4de; }
  :global(.empty-icon-ok) { color: #10b981; }

  .empty-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #6b6b78;
  }

  .empty-desc {
    margin: 0;
    font-size: 13px;
    color: #b8b8c4;
  }

  /* ===== APPROVAL CARDS ===== */
  .approval-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .approval-card {
    background: #ffffff;
    border: 1px solid #e8e8ec;
    border-radius: 12px;
    overflow: hidden;
    transition: box-shadow 0.15s;
  }

  .approval-card:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  }

  .approval-card-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 16px 0;
  }

  .lead-avatar {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #ede9fe;
    color: #7c3aed;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .lead-info { flex: 1; min-width: 0; }

  .lead-name {
    font-size: 14px;
    font-weight: 600;
    color: #0f0f10;
    margin-bottom: 3px;
  }

  .lead-meta, .lead-email-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    color: #9999a8;
    margin-bottom: 2px;
  }

  .meta-sep { color: #d4d4de; }
  .text-muted { color: #9999a8; }

  .website-link {
    color: #9999a8;
    text-decoration: none;
    display: flex;
    align-items: center;
  }
  .website-link:hover { color: #7c3aed; }

  .card-actions-top {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  /* ===== AI REASON BLOCK ===== */
  .ai-reason {
    margin: 12px 16px 0;
    background: #fafafa;
    border: 1px solid #ece9ff;
    border-radius: 8px;
    padding: 10px 12px;
  }

  .ai-reason-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: #7c3aed;
    margin-bottom: 5px;
  }

  .ai-reason-text {
    margin: 0 0 8px;
    font-size: 12.5px;
    color: #555560;
    line-height: 1.55;
  }

  .tech-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }

  .tech-tag {
    padding: 2px 7px;
    background: #ede9fe;
    color: #7c3aed;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  /* ===== EMAIL PREVIEW BLOCK ===== */
  .email-preview-block {
    position: relative;
    margin: 12px 16px 0;
    background: #f9f9fb;
    border: 1px solid #e8e8ec;
    border-radius: 8px;
    max-height: 110px;
    overflow: hidden;
  }

  .email-preview-text {
    padding: 12px 14px;
    font-size: 13px;
    color: #555560;
    line-height: 1.6;
    white-space: pre-wrap;
    font-family: inherit;
  }

  .email-preview-fade {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(transparent, #f9f9fb);
  }

  /* ===== CARD BOTTOM ACTIONS ===== */
  .card-actions-bottom {
    display: flex;
    gap: 8px;
    padding: 12px 16px 14px;
    margin-top: 12px;
    border-top: 1px solid #f0f0f4;
  }

  /* ===== EXECUTION TABLE ===== */
  .pipeline-bar {
    display: flex;
    gap: 1px;
    background: #e8e8ec;
    border-radius: 9px;
    overflow: hidden;
    margin-bottom: 18px;
  }

  .pipe-step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 8px;
    background: #fff;
    cursor: pointer;
    transition: background 0.1s;
    gap: 2px;
  }

  .pipe-step:first-child { border-radius: 9px 0 0 9px; }
  .pipe-step:last-child { border-radius: 0 9px 9px 0; }

  .pipe-step:hover { background: #f7f7f8; }
  .pipe-step.active { background: #f0ecff; }
  .pipe-step.pipe-failed.active { background: #fef2f2; }

  .pipe-count {
    font-size: 16px;
    font-weight: 700;
    color: #0f0f10;
    line-height: 1;
  }

  .pipe-label {
    font-size: 11px;
    color: #9999a8;
  }

  .pipe-failed .pipe-count { color: #ef4444; }
  .pipe-sent .pipe-count { color: #10b981; }
  .pipe-waiting .pipe-count { color: #7c3aed; }

  .exec-table {
    background: #fff;
    border: 1px solid #e8e8ec;
    border-radius: 10px;
    overflow: hidden;
  }

  .exec-table-header {
    display: grid;
    grid-template-columns: 2fr 1.2fr 1fr 1fr 80px;
    padding: 10px 16px;
    font-size: 11.5px;
    font-weight: 600;
    color: #9999a8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #f0f0f4;
    background: #fafafa;
  }

  .exec-table-row {
    display: grid;
    grid-template-columns: 2fr 1.2fr 1fr 1fr 80px;
    padding: 11px 16px;
    align-items: center;
    border-bottom: 1px solid #f0f0f4;
    transition: background 0.1s;
  }

  .exec-table-row:last-child { border-bottom: none; }
  .exec-table-row:hover { background: #fafafa; }

  .exec-lead {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .exec-avatar {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: #ede9fe;
    color: #7c3aed;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .exec-name { font-size: 13.5px; font-weight: 500; color: #0f0f10; }
  .exec-email { font-size: 12px; color: #9999a8; }
  .exec-company { font-size: 13px; color: #555560; }
  .exec-time { font-size: 12px; color: #9999a8; }

  .exec-row-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }

  /* ===== STATUS BADGES ===== */
  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 11.5px;
    font-weight: 600;
    width: fit-content;
  }

  .status-pending { background: #f3f3f6; color: #6b6b78; }
  .status-researched { background: #eff6ff; color: #2563eb; }
  .status-personalized { background: #f0fdf4; color: #16a34a; }
  .status-waiting { background: #f0ecff; color: #7c3aed; }
  .status-approved { background: #f0fdf4; color: #16a34a; }
  .status-sent { background: #f0fdf4; color: #10b981; }
  .status-failed { background: #fef2f2; color: #ef4444; }

  /* ===== SETTINGS ===== */
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .full-width { grid-column: 1 / -1; }

  .settings-card {
    background: #fff;
    border: 1px solid #e8e8ec;
    border-radius: 10px;
    overflow: hidden;
  }

  .settings-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f4;
    font-size: 13.5px;
    font-weight: 600;
    color: #0f0f10;
    background: #fafafa;
  }

  .settings-card-header h3 { margin: 0; font-size: inherit; font-weight: inherit; }

  .settings-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

  .field { display: flex; flex-direction: column; gap: 5px; }

  .field-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #555560;
  }

  .required { color: #ef4444; }

  .field-input {
    border: 1px solid #e8e8ec;
    border-radius: 7px;
    padding: 8px 11px;
    font-size: 13.5px;
    color: #0f0f10;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
    background: #fff;
  }

  .field-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08); }

  .field-textarea {
    border: 1px solid #e8e8ec;
    border-radius: 7px;
    padding: 8px 11px;
    font-size: 13.5px;
    color: #0f0f10;
    outline: none;
    transition: border-color 0.15s;
    resize: vertical;
    font-family: inherit;
    background: #fff;
    line-height: 1.5;
  }

  .field-textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08); }

  .field-hint { margin: 0; font-size: 12px; color: #b8b8c4; }

  .settings-actions {
    display: flex;
    justify-content: flex-end;
  }

  /* ===== LOG CARDS ===== */
  .logs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .log-card {
    background: #fff;
    border: 1px solid #fecaca;
    border-radius: 10px;
    overflow: hidden;
  }

  .log-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #fff7f7;
    border-bottom: 1px solid #fecaca;
  }

  .log-severity {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 700;
    color: #ef4444;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 3px 8px;
    border-radius: 5px;
    flex-shrink: 0;
  }

  .log-lead-info {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
  }

  .log-lead-name { font-weight: 600; color: #0f0f10; }
  .log-lead-email { color: #555560; }
  .log-company { color: #9999a8; }
  .log-time { font-size: 12px; color: #b8b8c4; flex-shrink: 0; }

  .log-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1px;
    background: #f0f0f4;
    border-bottom: 1px solid #f0f0f4;
  }

  .log-detail-item {
    background: #fff;
    padding: 13px 16px;
  }

  .log-detail-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 5px;
  }

  .log-detail-item.cause .log-detail-label { color: #ef4444; }
  .log-detail-item.impact .log-detail-label { color: #f59e0b; }
  .log-detail-item.action .log-detail-label { color: #7c3aed; }

  .log-detail-item p {
    margin: 0;
    font-size: 12.5px;
    color: #555560;
    line-height: 1.55;
  }

  .log-card-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
  }

  /* ===== BUTTONS ===== */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 15px;
    background: #7c3aed;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .btn-primary:hover { background: #6d28d9; }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: #fff;
    color: #0f0f10;
    border: 1px solid #e8e8ec;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .btn-secondary:hover { background: #f7f7f8; }

  .btn-approve {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: #7c3aed;
    color: #fff;
    border: none;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .btn-approve:hover { background: #6d28d9; }

  .btn-reject {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: transparent;
    color: #6b6b78;
    border: 1px solid #e8e8ec;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .btn-reject:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

  .btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 15px;
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .btn-danger:hover { background: #dc2626; }
  .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-retry {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #7c3aed;
    color: #fff;
    border: none;
    border-radius: 7px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .btn-retry:hover { background: #6d28d9; }

  .btn-ghost-sm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 5px 8px;
    background: transparent;
    color: #9999a8;
    border: 1px solid #e8e8ec;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.1s;
    font-family: inherit;
  }

  .btn-ghost-sm:hover { background: #f3f3f6; color: #0f0f10; }

  .btn-icon-only {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: transparent;
    color: #9999a8;
    border: 1px solid #e8e8ec;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .btn-icon-only:hover { background: #f3f3f6; color: #0f0f10; }
  .btn-icon-only:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-ghost-modal {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: transparent;
    color: #6b6b78;
    border: 1px solid #e8e8ec;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s;
    font-family: inherit;
  }

  .btn-ghost-modal:hover { background: #f7f7f8; }
  .btn-ghost-modal:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ===== MODAL ===== */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 15, 16, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 20px;
  }

  .modal {
    background: #fff;
    border-radius: 14px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f4;
  }

  .modal-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .modal-title-group h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f0f10; }

  :global(.modal-icon) { color: #9999a8; }
  :global(.modal-icon.approve) { color: #7c3aed; }
  :global(.modal-icon.reject) { color: #ef4444; }
  :global(.modal-icon.edit) { color: #2563eb; }
  :global(.modal-icon.view) { color: #6b6b78; }

  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #9999a8;
    cursor: pointer;
    transition: background 0.1s;
  }

  .modal-close:hover { background: #f3f3f6; color: #0f0f10; }
  .modal-close:disabled { opacity: 0.4; cursor: not-allowed; }

  .modal-lead-summary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f4;
  }

  .modal-lead-avatar {
    width: 32px;
    height: 32px;
    border-radius: 7px;
    background: #ede9fe;
    color: #7c3aed;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .modal-lead-name { font-size: 13.5px; font-weight: 600; color: #0f0f10; }
  .modal-lead-company { font-size: 13px; color: #555560; }
  .modal-lead-email { font-size: 12px; color: #9999a8; margin-top: 1px; }

  .modal-ai-reason {
    padding: 12px 20px;
    background: #fafaf8;
    border-bottom: 1px solid #f0f0f4;
  }

  .modal-ai-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    color: #7c3aed;
    margin-bottom: 5px;
  }

  .modal-ai-reason p {
    margin: 0;
    font-size: 12.5px;
    color: #555560;
    line-height: 1.55;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }

  .modal-confirm-text { margin: 0; font-size: 14px; color: #555560; line-height: 1.6; }

  .modal-email-preview {
    font-size: 13.5px;
    color: #555560;
    line-height: 1.7;
    white-space: pre-wrap;
    font-family: inherit;
  }

  .modal-edit-textarea {
    width: 100%;
    border: 1px solid #e8e8ec;
    border-radius: 8px;
    padding: 12px;
    font-size: 13.5px;
    color: #0f0f10;
    line-height: 1.7;
    outline: none;
    resize: vertical;
    font-family: inherit;
    background: #fff;
    box-sizing: border-box;
  }

  .modal-edit-textarea:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid #f0f0f4;
  }

  /* ===== SPINNER ===== */
  :global(.spin) {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
