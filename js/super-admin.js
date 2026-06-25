/* ============================================================================
   EASY-Q | super-admin.js
   Premium standalone Super Admin layer
   ---------------------------------------------------------------------------
   الهدف:
   - لوحة سوبر أدمن مميزة فعليًا بصريًا ووظيفيًا.
   - لا تكسر لوحة المطعم الحالية.
   - تعمل فقط مع currentUser.role === 'super_admin'.
   - تستخدم RPCs الموجودة إن توفرت، وتتعامل بأمان إذا غابت.
   - لا تعتمد على business_id.
   - تترك دعم المطعم الحالي كما هو، وتضيف واجهة سوبر أدمن مستقلة.

   مكان الربط المقترح في index.html:
   بعد js/auth.js وقبل js/app.js
   <script src="js/super-admin.js"></script>
============================================================================ */

(function () {
  'use strict';

  const SA = {
    version: '2.0.0',
    booted: false,
    loaded: false,
    loading: false,
    currentView: 'overview',
    businesses: [],
    supportSessions: [],
    adminNotifications: [],
    supportBusinessFilter: '',
    supportBusinessFilterLabel: '',
    errorLogs: [],
    requestStatusAuditLogs: [],
    errorsSearch: '',
    errorsStatusFilter: 'unresolved',
    currentSupportSessionId: null,
    supportMessagesSignature: '',
    supportSessionsSignature: '',
    supportRefreshInterval: null,
    supportListRefreshInterval: null,
    dataRefreshInterval: null,
    restaurantsSearch: '',
    restaurantsStatusFilter: 'all',
    restaurantsPlanFilter: 'all',
    lastLoadedAt: null,
    original: {}
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function isSuperAdmin() {
    return !!(window.currentUser && window.currentUser.role === 'super_admin');
  }

  function safeText(value, fallback = '—') {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
  }

  function esc(value) {
    return safeText(value, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function n(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function notify(message, type = 'info') {
    if (type === 'success' && typeof window.showSuccessNotification === 'function') {
      window.showSuccessNotification(message);
      return;
    }
    if (typeof window.showAlert === 'function') {
      window.showAlert(message);
      return;
    }
    if (type === 'error') alert(message);
    else console.log('[EASY-Q Super Admin]', message);
  }

  function fmtDate(value) {
    if (!value) return '—';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('ar-SA');
    } catch (_) {
      return '—';
    }
  }

  function fmtDateTime(value) {
    if (!value) return '—';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
    } catch (_) {
      return '—';
    }
  }

  function daysLabel(value) {
    if (value === null || value === undefined || value === '') return '—';
    const days = n(value);
    if (days < 0) return `منتهي منذ ${Math.abs(days)} يوم`;
    if (days === 0) return 'ينتهي اليوم';
    return `${days} يوم`;
  }

  function statusInfo(row) {
    const effective = safeText(row.effective_status || row.subscription_status || row.license_status || row.status, '').toLowerCase();
    const activeFlag = row.access_allowed === true || row.is_active === true;

    if (effective.includes('suspended')) return { key: 'suspended', label: 'موقوف', color: '#991B1B', bg: '#FEF2F2' };
    if (effective.includes('cancelled')) return { key: 'cancelled', label: 'ملغي', color: '#6B7280', bg: '#F3F4F6' };
    if (effective.includes('expired')) return { key: 'expired', label: 'منتهي', color: '#DC2626', bg: '#FEF2F2' };
    if (effective.includes('grace')) return { key: 'grace', label: 'فترة سماح', color: '#F97316', bg: '#FFF7ED' };
    if (effective.includes('trial')) return { key: 'trial', label: 'تجريبي', color: '#D97706', bg: '#FFFBEB' };
    if (effective.includes('active')) return { key: 'active', label: 'نشط', color: '#059669', bg: '#ECFDF5' };
    if (activeFlag) return { key: 'active', label: 'نشط', color: '#059669', bg: '#ECFDF5' };
    return { key: 'unknown', label: 'غير محدد', color: '#6B7280', bg: '#F3F4F6' };
  }

  function planInfo(plan) {
    const key = safeText(plan || 'unknown', 'unknown').toLowerCase();
    if (key === 'enterprise') return { label: 'Enterprise', color: '#7C3AED', bg: '#F5F3FF' };
    if (key === 'pro') return { label: 'Pro', color: '#2563EB', bg: '#EFF6FF' };
    if (key === 'basic') return { label: 'Basic', color: '#059669', bg: '#ECFDF5' };
    if (key === 'trial') return { label: 'Trial', color: '#D97706', bg: '#FFFBEB' };
    return { label: key === 'unknown' ? 'غير محدد' : plan, color: '#6B7280', bg: '#F3F4F6' };
  }

  function badge(label, color, bg) {
    return `<span class="eqsa-badge" style="color:${esc(color)};background:${esc(bg)};border-color:${esc(color)}22;">${esc(label)}</span>`;
  }

  function injectStyles() {
    if ($('eqsaStyles')) return;
    const style = document.createElement('style');
    style.id = 'eqsaStyles';
    style.textContent = `
      :root {
        --eqsa-primary: #0E146D;
        --eqsa-primary-2: #060427;
        --eqsa-gold: #F4D28A;
        --eqsa-bg: #F4F6FB;
        --eqsa-card: rgba(255,255,255,0.92);
        --eqsa-border: rgba(15,23,42,0.08);
        --eqsa-text: #0F172A;
        --eqsa-muted: #64748B;
        --eqsa-danger: #DC2626;
        --eqsa-success: #059669;
        --eqsa-warning: #D97706;
        --eqsa-shadow: 0 20px 55px rgba(15,23,42,0.10);
      }
        .eqsa-support-ref {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #EEF2FF;
  color: #0E146D;
  font-size: 12px;
  font-weight: 900;
  direction: ltr;
}

.eqsa-copy-mini {
  border: none;
  background: #0E146D;
  color: #fff;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  cursor: pointer;
  margin-right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
      body.super-admin-mode {
  overflow: hidden !important;
  background: var(--eqsa-bg) !important;
}

body.super-admin-mode .app-container,
body.super-admin-mode .topbar,
body.super-admin-mode #sidebar,
body.super-admin-mode .sidebar,
body.super-admin-mode .unified-bar,
body.super-admin-mode .waiting-sidebar,
body.super-admin-mode .main-content {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
      .eqsa-root { position: fixed; inset: 0; z-index: 20000; direction: rtl; font-family: inherit; color: var(--eqsa-text); background:
        radial-gradient(circle at top right, rgba(14,20,109,0.18), transparent 28%),
        radial-gradient(circle at bottom left, rgba(244,210,138,0.22), transparent 26%),
        linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%); display: flex; flex-direction: column; overflow: hidden; }
      .eqsa-topbar { height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 26px; background: linear-gradient(135deg, #060427 0%, #0E146D 70%, #111A8E 100%); color: white; box-shadow: 0 12px 35px rgba(6,4,39,0.22); }
      .eqsa-brand { display:flex; align-items:center; gap:14px; }
      .eqsa-logo { width:46px; height:46px; border-radius:16px; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.12); color: var(--eqsa-gold); font-size:22px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.13); }
      .eqsa-brand h1 { margin:0; font-size:19px; line-height:1.15; font-weight:900; letter-spacing:.2px; }
      .eqsa-brand p { margin:4px 0 0; font-size:12px; opacity:.72; }
      .eqsa-userbar { display:flex; align-items:center; gap:12px; }
      .eqsa-user { text-align:left; line-height:1.2; }
      .eqsa-user strong { font-size:13px; }
      .eqsa-user span { display:block; font-size:11px; opacity:.72; margin-top:3px; }
      .eqsa-shell { flex:1; min-height:0; display:grid; grid-template-columns: 286px 1fr; gap:18px; padding:18px; }
      .eqsa-sidebar { background: rgba(255,255,255,0.72); border:1px solid var(--eqsa-border); border-radius:26px; box-shadow: var(--eqsa-shadow); backdrop-filter: blur(16px); padding:16px; overflow-y:auto; }
      .eqsa-side-title { font-size:12px; font-weight:900; color:var(--eqsa-muted); margin:6px 8px 12px; }
      .eqsa-nav { width:100%; border:0; background:transparent; color:var(--eqsa-text); display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 14px; border-radius:16px; cursor:pointer; font-weight:900; margin-bottom:8px; transition:.18s ease; text-align:right; }
      .eqsa-nav > span { display:flex; align-items:center; gap:10px; }
      .eqsa-nav:hover { background: rgba(14,20,109,0.07); transform: translateX(-2px); }
      .eqsa-nav.active { background: linear-gradient(135deg, var(--eqsa-primary), #1822A6); color:#fff; box-shadow: 0 12px 24px rgba(14,20,109,0.24); }
      .eqsa-nav .counter { min-width:22px; height:22px; border-radius:999px; background:#E5E7EB; color:#334155; font-size:11px; display:inline-flex; align-items:center; justify-content:center; padding:0 6px; }
      .eqsa-nav.active .counter { background: rgba(255,255,255,.20); color:#fff; }
      .eqsa-main { min-width:0; overflow-y:auto; padding-left:2px; }
      .eqsa-view { display:none; animation:eqsaFade .18s ease; }
      .eqsa-view.active { display:block; }
      @keyframes eqsaFade { from { opacity:.25; transform: translateY(6px); } to { opacity:1; transform:none; } }
      .eqsa-page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; }
      .eqsa-page-head h2 { margin:0; font-size:25px; font-weight:950; letter-spacing:-.3px; }
      .eqsa-page-head p { margin:7px 0 0; color:var(--eqsa-muted); font-size:13px; }
      .eqsa-actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      .eqsa-btn { border:0; border-radius:14px; padding:11px 15px; cursor:pointer; font-weight:900; display:inline-flex; align-items:center; gap:8px; background:#fff; color:var(--eqsa-text); border:1px solid var(--eqsa-border); box-shadow: 0 8px 22px rgba(15,23,42,0.06); }
      .eqsa-btn.primary { background: linear-gradient(135deg, var(--eqsa-primary), #1822A6); color:#fff; border-color: transparent; }
      .eqsa-btn.danger { background:#DC2626; color:#fff; border-color:transparent; }
      .eqsa-btn:disabled { opacity:.55; cursor:not-allowed; }
      .eqsa-grid { display:grid; gap:14px; }
      .eqsa-stats { grid-template-columns: repeat(4, minmax(160px, 1fr)); margin-bottom:18px; }
      .eqsa-card { background: var(--eqsa-card); border:1px solid var(--eqsa-border); border-radius:24px; box-shadow: var(--eqsa-shadow); backdrop-filter: blur(12px); }
      .eqsa-stat { padding:18px; position:relative; overflow:hidden; }
      .eqsa-stat::after { content:''; position:absolute; width:86px; height:86px; border-radius:50%; background: currentColor; opacity:.08; left:-22px; top:-28px; }
      .eqsa-stat-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
      .eqsa-stat label { color:var(--eqsa-muted); font-size:12px; font-weight:900; }
      .eqsa-stat strong { display:block; font-size:30px; margin-top:8px; letter-spacing:-.5px; }
      .eqsa-stat i { font-size:25px; }
      .eqsa-panel { padding:18px; }
      .eqsa-panel-title { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
      .eqsa-panel-title h3 { margin:0; font-size:17px; font-weight:950; }
      .eqsa-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
      .eqsa-input, .eqsa-select { height:44px; border:1px solid #D6DAE4; border-radius:14px; background:#fff; padding:0 13px; outline:none; font-weight:800; color:var(--eqsa-text); }
      .eqsa-input { min-width:260px; flex:1; }
      .eqsa-table-wrap { overflow:auto; border-radius:20px; border:1px solid var(--eqsa-border); background:#fff; }
      .eqsa-table { width:100%; border-collapse:collapse; min-width:1050px; }
      .eqsa-table th { text-align:right; font-size:12px; color:#475569; background:#F8FAFC; padding:13px 12px; border-bottom:1px solid #E5E7EB; white-space:nowrap; }
      .eqsa-table td { padding:13px 12px; border-bottom:1px solid #EEF2F7; vertical-align:middle; color:#334155; font-size:13px; }
      .eqsa-table tr:hover td { background:#FAFBFF; }
      .eqsa-name { font-weight:950; color:#0F172A; }
      .eqsa-sub { color:#64748B; font-size:12px; margin-top:4px; }
      .eqsa-badge { display:inline-flex; align-items:center; justify-content:center; border:1px solid; border-radius:999px; padding:5px 10px; font-size:11.5px; font-weight:950; white-space:nowrap; }
      .eqsa-mini-actions { display:flex; align-items:center; gap:6px; white-space:nowrap; }
      .eqsa-icon-btn { width:34px; height:34px; border-radius:11px; border:0; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; color:white; }
      .eqsa-empty { padding:38px; text-align:center; color:#64748B; }
      .eqsa-two { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
      .eqsa-alert-list { display:flex; flex-direction:column; gap:10px; }
      .eqsa-alert-item { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px; border-radius:16px; background:#F8FAFC; border:1px solid #EDF2F7; }
      .eqsa-support-layout { display:grid; grid-template-columns: 380px 1fr; gap:14px; height: calc(100vh - 162px); min-height:560px; }
      .eqsa-support-list { overflow-y:auto; padding:10px; }
      .eqsa-support-session { border:1px solid #E5E7EB; border-radius:18px; padding:12px; margin-bottom:10px; background:#fff; cursor:pointer; transition:.15s ease; }
      .eqsa-support-session:hover, .eqsa-support-session.active { border-color:#0E146D; box-shadow:0 8px 20px rgba(14,20,109,.10); transform:translateY(-1px); }
      .eqsa-chat { display:flex; flex-direction:column; min-width:0; overflow:hidden; }
      .eqsa-chat-head { min-height:58px; border-bottom:1px solid #E5E7EB; padding:14px 16px; font-weight:950; }
      .eqsa-messages { flex:1; overflow-y:auto; background:#F8FAFC; padding:16px; }
      .eqsa-msg-row { display:flex; margin-bottom:8px; }
      .eqsa-msg-row.admin { justify-content:flex-start; }
      .eqsa-msg-row.business { justify-content:flex-end; }
      .eqsa-msg { max-width:68%; border-radius:18px; padding:9px 11px; font-size:13px; line-height:1.45; white-space:pre-wrap; word-break:break-word; box-shadow:0 3px 10px rgba(15,23,42,.04); }
      .eqsa-msg.admin .eqsa-msg, .eqsa-msg-row.admin .eqsa-msg { background:#0E146D; color:#fff; border-bottom-right-radius:6px; }
      .eqsa-msg-row.business .eqsa-msg { background:#fff; color:#0F172A; border:1px solid #E5E7EB; border-bottom-left-radius:6px; }
      .eqsa-msg-time { display:block; font-size:10px; opacity:.62; margin-top:4px; text-align:left; }
      .eqsa-reply { border-top:1px solid #E5E7EB; padding:12px; display:flex; gap:10px; background:#fff; }
      .eqsa-modal-backdrop { position:fixed; inset:0; z-index:21000; background:rgba(2,6,23,.56); backdrop-filter:blur(7px); display:flex; align-items:center; justify-content:center; padding:20px; }
      .eqsa-modal { width:min(920px, 96vw); max-height:86vh; overflow:auto; background:#fff; border-radius:28px; box-shadow:0 35px 90px rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.6); }
      .eqsa-modal-head { padding:18px 20px; border-bottom:1px solid #EEF2F7; display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .eqsa-modal-body { padding:20px; }
      .eqsa-detail-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
      .eqsa-detail { padding:13px; border-radius:16px; background:#F8FAFC; border:1px solid #EEF2F7; }
      .eqsa-detail label { display:block; color:#64748B; font-size:12px; font-weight:900; margin-bottom:5px; }
      .eqsa-detail strong { color:#0F172A; font-size:14px; }
      @media (max-width: 1100px) { .eqsa-shell { grid-template-columns: 1fr; } .eqsa-sidebar { display:flex; gap:8px; overflow-x:auto; border-radius:20px; } .eqsa-side-title { display:none; } .eqsa-nav { min-width:160px; } .eqsa-stats { grid-template-columns: repeat(2, minmax(160px,1fr)); } .eqsa-support-layout { grid-template-columns: 1fr; height:auto; } }
      @media (max-width: 720px) { .eqsa-topbar { height:auto; padding:14px; gap:12px; flex-wrap:wrap; } .eqsa-shell { padding:12px; } .eqsa-stats, .eqsa-two, .eqsa-detail-grid { grid-template-columns: 1fr; } .eqsa-page-head { flex-direction:column; } .eqsa-input { min-width:100%; } }
    `;
    document.head.appendChild(style);
  }

  function hideRestaurantUI() {
    ['.app-container', '.topbar', '#sidebar'].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    });
  }

  function restoreRestaurantUI() {
    ['.app-container', '.topbar', '#sidebar'].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.style.display = '';
    });
  }

  function stopRestaurantIntervals() {
    ['reservationCheckInterval', 'subscriptionRefreshInterval', 'autoRefreshInterval'].forEach((key) => {
      try {
        if (window[key]) clearInterval(window[key]);
        window[key] = null;
      } catch (_) {}
    });
    try {
      if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    } catch (_) {}
    try {
      if (window.supabaseChannel && typeof window.supabaseChannel.unsubscribe === 'function') {
        window.supabaseChannel.unsubscribe();
        window.supabaseChannel = null;
      }
    } catch (_) {}
    if (typeof window.stopBusinessSupportSidebarBadgeAutoRefresh === 'function') {
      window.stopBusinessSupportSidebarBadgeAutoRefresh();
    }
  }

  function buildShell() {
    const old = $('superAdminDashboard');
    if (old) old.remove();

    const root = document.createElement('div');
    root.id = 'superAdminDashboard';
    root.className = 'eqsa-root';
    root.innerHTML = `
      <header class="eqsa-topbar">
        <div class="eqsa-brand">
          <div class="eqsa-logo"><i class="fas fa-crown"></i></div>
          <div>
            <h1>EASY-Q Super Admin</h1>
            <p>مركز تحكم النظام · المطاعم · الاشتراكات · الدعم الحي</p>
          </div>
        </div>
        <div class="eqsa-userbar">
          <button class="eqsa-btn" onclick="EasyQSuperAdmin.refresh()"><i class="fas fa-sync-alt"></i> تحديث</button>
          <div class="eqsa-user">
            <strong>${esc(window.currentUser?.display_name || 'المدير العام')}</strong>
            <span>Super Admin</span>
          </div>
          <button class="eqsa-btn danger" onclick="logoutAndClean()"><i class="fas fa-sign-out-alt"></i> خروج</button>
        </div>
      </header>
      <div class="eqsa-shell">
        <aside class="eqsa-sidebar">
          <div class="eqsa-side-title">لوحة التحكم</div>
          ${navButton('overview', 'fa-chart-pie', 'الرئيسية', '0', true)}
          ${navButton('restaurants', 'fa-store', 'المطاعم', '0')}
          ${navButton('subscriptions', 'fa-credit-card', 'الاشتراكات', '0')}
          ${navButton('alerts', 'fa-bell', 'التنبيهات', '0')}
          ${navButton('errors', 'fa-triangle-exclamation', 'سجل الأخطاء', '0')}
          ${navButton('support', 'fa-headset', 'الدعم الحي', '0')}
          ${navButton('settings', 'fa-cog', 'الإعدادات', '')}
        </aside>
        <main class="eqsa-main">
          <section id="eqsaViewOverview" class="eqsa-view active"></section>
          <section id="eqsaViewRestaurants" class="eqsa-view"></section>
          <section id="eqsaViewSubscriptions" class="eqsa-view"></section>
          <section id="eqsaViewAlerts" class="eqsa-view"></section>
          <section id="eqsaViewErrors" class="eqsa-view"></section>
          <section id="eqsaViewSupport" class="eqsa-view"></section>
          <section id="eqsaViewSettings" class="eqsa-view"></section>
        </main>
      </div>
    `;
    document.body.appendChild(root);
    setupNav();
  }

  function navButton(view, icon, label, counter, active = false) {
    return `
      <button type="button" class="eqsa-nav ${active ? 'active' : ''}" data-eqsa-view="${esc(view)}">
        <span><i class="fas ${esc(icon)}"></i>${esc(label)}</span>
        ${counter !== '' ? `<em class="counter" id="eqsaCount_${esc(view)}">${esc(counter)}</em>` : ''}
      </button>
    `;
  }

  function setupNav() {
    $$('.eqsa-nav').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.eqsaView || 'overview';
        showView(view);
      });
    });
  }

  function showView(view) {
    if (!isSuperAdmin()) return;
    SA.currentView = view;
    $$('.eqsa-nav').forEach((btn) => btn.classList.toggle('active', btn.dataset.eqsaView === view));
    $$('.eqsa-view').forEach((el) => el.classList.remove('active'));
    const target = $('eqsaView' + view.charAt(0).toUpperCase() + view.slice(1));
    if (target) target.classList.add('active');

    if (view === 'overview') renderOverview();
    if (view === 'restaurants') renderRestaurants();
    if (view === 'subscriptions') renderSubscriptions();
    if (view === 'alerts') renderAlerts();
    if (view === 'errors') renderErrors();
    if (view === 'support') renderSupport();
    if (view === 'settings') renderSettings();
  }

  async function rpc(name, args) {
    if (!window.supabase) throw new Error('Supabase غير متوفر');
    const { data, error } = await window.supabase.rpc(name, args || {});
    if (error) throw error;
    return data;
  }

  async function loadBusinesses() {
    try {
      const data = await rpc('super_admin_list_subscriptions');
      return Array.isArray(data) ? data : [];
    } catch (rpcErr) {
      console.warn('[EASY-Q SA] super_admin_list_subscriptions failed, trying fallback:', rpcErr);
      try {
        const { data, error } = await window.supabase
          .from('businesses')
          .select('*, licenses(*), app_users(count), dining_tables(count)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return normalizeFallbackBusinesses(data || []);
      } catch (fallbackErr) {
        console.error('[EASY-Q SA] fallback businesses failed:', fallbackErr);
        notify('تعذر تحميل بيانات المطاعم. تأكد من RPC: super_admin_list_subscriptions', 'error');
        return [];
      }
    }
  }

  function normalizeFallbackBusinesses(rows) {
    return rows.map((b) => {
      const license = Array.isArray(b.licenses) ? b.licenses[0] : b.licenses;
      const end = license?.expires_at || license?.end_date || null;
      let days = null;
      if (end) {
        days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
      }
      return {
        business_id: b.id,
        business_name: b.name || b.business_name,
        branch_name: b.branch_name,
        city: b.city,
        address: b.address,
        phone: b.phone,
        support_ref: b.support_ref,
        created_at: b.created_at,
        plan_type: license?.plan_type || license?.plan || null,
        starts_at: license?.starts_at || license?.start_date || null,
        expires_at: end,
        days_remaining: days,
        access_allowed: license?.access_allowed ?? license?.is_active ?? b.is_active ?? true,
        effective_status: license?.status || (license?.is_active === false ? 'suspended' : (days !== null && days < 0 ? 'expired' : 'active')),
        max_tables: license?.max_tables,
        max_users: license?.max_users,
        max_bookings: license?.max_bookings,
        current_users_count: Array.isArray(b.app_users) && b.app_users[0]?.count !== undefined ? b.app_users[0].count : 0,
        current_tables_count: Array.isArray(b.dining_tables) && b.dining_tables[0]?.count !== undefined ? b.dining_tables[0].count : 0
      };
    });
  }

  async function loadSupportSessions() {
    try {
      const data = await rpc('super_admin_list_support_sessions');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[EASY-Q SA] support sessions failed:', err);
      return [];
    }
  }

  async function loadAdminNotifications() {
    try {
      const data = await rpc('super_admin_list_notifications');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[EASY-Q SA] admin notifications log failed:', err);
      return [];
    }
  }

  async function loadErrorLogs() {
    try {
      const data = await rpc('super_admin_list_error_logs', {
        p_limit: 250,
        p_only_unresolved: false
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[EASY-Q SA] error logs failed:', err);
      return [];
    }
  }

async function loadRequestStatusAuditLogs() {
  try {
    const data = await rpc('super_admin_list_request_status_audit_v1', {
      p_limit: 300,
      p_business_id: null,
      p_request_id: null
    });

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[EASY-Q SA] request status audit logs failed:', err);
    return [];
  }
}

  async function loadData(force = false) {
    if (SA.loading) return;
    if (SA.loaded && !force) return;
    SA.loading = true;
    setLoadingState(true);
    try {
const [
  businesses,
  supportSessions,
  errorLogs,
  requestStatusAuditLogs,
  adminNotifications
] = await Promise.all([
  loadBusinesses(),
  loadSupportSessions(),
  loadErrorLogs(),
  loadRequestStatusAuditLogs(),
  loadAdminNotifications()
]);

SA.businesses = businesses;
SA.supportSessions = supportSessions;
SA.errorLogs = errorLogs;
SA.requestStatusAuditLogs = requestStatusAuditLogs;
SA.adminNotifications = adminNotifications;
      SA.loaded = true;
      SA.lastLoadedAt = new Date();
      updateCounters();
    } finally {
      SA.loading = false;
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading) {
    $$('.eqsa-btn').forEach((btn) => {
      if (btn.textContent.includes('تحديث')) btn.disabled = isLoading;
    });
  }

function updateCounters() {
  const active = SA.businesses.filter((b) => statusInfo(b).key === 'active').length;
  const unread = SA.supportSessions.reduce((sum, s) => sum + n(s.unread_for_super_admin_count || s.unread_count), 0);
  const unresolvedErrors = SA.errorLogs.filter((e) => e.is_resolved !== true).length;

  setCounter('overview', SA.businesses.length);
  setCounter('restaurants', SA.businesses.length);
  setCounter('subscriptions', active);
  setCounter('alerts', countSmartAlerts());
  setCounter('errors', unresolvedErrors);
  setCounter('support', unread || SA.supportSessions.filter((s) => s.status === 'open' || s.status === 'pending').length);
}

  function setCounter(view, value) {
    const el = $('eqsaCount_' + view);
    if (el) el.textContent = value > 99 ? '99+' : String(value);
  }

  function renderOverview() {
    const el = $('eqsaViewOverview');
    if (!el) return;
    const total = SA.businesses.length;
    const active = SA.businesses.filter((b) => statusInfo(b).key === 'active').length;
    const trial = SA.businesses.filter((b) => statusInfo(b).key === 'trial').length;
    const expired = SA.businesses.filter((b) => statusInfo(b).key === 'expired').length;
    const suspended = SA.businesses.filter((b) => statusInfo(b).key === 'suspended').length;
    const expiring = SA.businesses.filter((b) => {
      const d = Number(b.days_remaining);
      return Number.isFinite(d) && d >= 0 && d <= 7;
    }).length;
    const users = SA.businesses.reduce((sum, b) => sum + n(b.current_users_count), 0);
    const tables = SA.businesses.reduce((sum, b) => sum + n(b.current_tables_count), 0);
    const openSupport = SA.supportSessions.filter((s) => s.status === 'open' || s.status === 'pending').length;
    const unread = SA.supportSessions.reduce((sum, s) => sum + n(s.unread_for_super_admin_count || s.unread_count), 0);
    const unresolvedErrors = SA.errorLogs.filter((e) => e.is_resolved !== true).length;

    el.innerHTML = `
      ${pageHead('الرئيسية', 'نظرة تنفيذية على حالة النظام والمطاعم والدعم الحي.', true)}
      <div class="eqsa-grid eqsa-stats">
        ${stat('إجمالي المطاعم', total, 'fa-store', '#0E146D')}
        ${stat('مطاعم نشطة', active, 'fa-check-circle', '#059669')}
        ${stat('تجريبية', trial, 'fa-hourglass-half', '#D97706')}
        ${stat('تنتهي قريبًا', expiring, 'fa-clock', '#F97316')}
        ${stat('منتهية', expired, 'fa-times-circle', '#DC2626')}
        ${stat('موقوفة', suspended, 'fa-ban', '#991B1B')}
        ${stat('المستخدمون', users, 'fa-users', '#2563EB')}
        ${stat('الطاولات', tables, 'fa-chair', '#7C3AED')}
        ${stat('جلسات الدعم', openSupport, 'fa-headset', '#0E146D')}
        ${stat('غير مقروء', unread, 'fa-envelope', '#DC2626')}
        ${stat('أخطاء غير محلولة', unresolvedErrors, 'fa-bug', '#DC2626')}
      </div>
      <div class="eqsa-two">
        <div class="eqsa-card eqsa-panel">
          <div class="eqsa-panel-title"><h3>اشتراكات تحتاج انتباه</h3><button class="eqsa-btn" onclick="EasyQSuperAdmin.showView('alerts')">عرض الكل</button></div>
          ${miniAlertList(getAttentionBusinesses().slice(0, 6))}
        </div>
        <div class="eqsa-card eqsa-panel">
          <div class="eqsa-panel-title"><h3>آخر جلسات الدعم</h3><button class="eqsa-btn" onclick="EasyQSuperAdmin.showView('support')">فتح الدعم</button></div>
          ${miniSupportList(SA.supportSessions.slice(0, 6))}
        </div>
      </div>
    `;
  }

  function pageHead(title, subtitle, showRefresh) {
    return `
      <div class="eqsa-page-head">
        <div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>
        <div class="eqsa-actions">
          ${SA.lastLoadedAt ? `<span class="eqsa-badge" style="color:#64748B;background:#fff;border-color:#E5E7EB;">آخر تحديث: ${esc(fmtDateTime(SA.lastLoadedAt))}</span>` : ''}
          ${showRefresh ? `<button class="eqsa-btn primary" onclick="EasyQSuperAdmin.refresh()"><i class="fas fa-sync-alt"></i> تحديث البيانات</button>` : ''}
        </div>
      </div>`;
  }

  function stat(label, value, icon, color) {
    return `
      <div class="eqsa-card eqsa-stat" style="color:${esc(color)};">
        <div class="eqsa-stat-top">
          <div><label>${esc(label)}</label><strong>${esc(value)}</strong></div>
          <i class="fas ${esc(icon)}"></i>
        </div>
      </div>`;
  }

  function getAttentionBusinesses() {
    return SA.businesses.filter((b) => {
      const s = statusInfo(b).key;
      const d = Number(b.days_remaining);
      return ['expired', 'suspended', 'grace'].includes(s) || (Number.isFinite(d) && d >= 0 && d <= 7);
    });
  }

  function hasReachedAnyLimit(b) {
  return (
    b.table_limit_reached === true ||
    b.user_limit_reached === true ||
    b.zone_limit_reached === true ||
    b.floor_limit_reached === true ||
    (
      b.max_tables !== null &&
      b.max_tables !== undefined &&
      n(b.max_tables) > 0 &&
      n(b.current_tables_count) >= n(b.max_tables)
    ) ||
    (
      b.max_users !== null &&
      b.max_users !== undefined &&
      n(b.max_users) > 0 &&
      n(b.current_users_count) >= n(b.max_users)
    ) ||
    (
      b.max_zones !== null &&
      b.max_zones !== undefined &&
      n(b.max_zones) > 0 &&
      n(b.current_zones_count) >= n(b.max_zones)
    ) ||
    (
      b.max_floors !== null &&
      b.max_floors !== undefined &&
      n(b.max_floors) > 0 &&
      n(b.current_floors_count) >= n(b.max_floors)
    )
  );
}

function limitReachedText(b) {
  const parts = [];

  if (
    b.table_limit_reached === true ||
    (
      b.max_tables !== null &&
      b.max_tables !== undefined &&
      n(b.max_tables) > 0 &&
      n(b.current_tables_count) >= n(b.max_tables)
    )
  ) {
    parts.push(`الطاولات ${n(b.current_tables_count)}/${b.max_tables}`);
  }

  if (
    b.user_limit_reached === true ||
    (
      b.max_users !== null &&
      b.max_users !== undefined &&
      n(b.max_users) > 0 &&
      n(b.current_users_count) >= n(b.max_users)
    )
  ) {
    parts.push(`المستخدمون ${n(b.current_users_count)}/${b.max_users}`);
  }

  if (
    b.zone_limit_reached === true ||
    (
      b.max_zones !== null &&
      b.max_zones !== undefined &&
      n(b.max_zones) > 0 &&
      n(b.current_zones_count) >= n(b.max_zones)
    )
  ) {
    parts.push(`المناطق ${n(b.current_zones_count)}/${b.max_zones}`);
  }

  if (
    b.floor_limit_reached === true ||
    (
      b.max_floors !== null &&
      b.max_floors !== undefined &&
      n(b.max_floors) > 0 &&
      n(b.current_floors_count) >= n(b.max_floors)
    )
  ) {
    parts.push(`الطوابق ${n(b.current_floors_count)}/${b.max_floors}`);
  }

  return parts.length ? parts.join(' · ') : 'تم الوصول إلى حد من حدود الباقة';
}

function countSmartAlerts() {
  const expired = SA.businesses.filter((b) => statusInfo(b).key === 'expired').length;
  const suspended = SA.businesses.filter((b) => statusInfo(b).key === 'suspended').length;
  const cancelled = SA.businesses.filter((b) => statusInfo(b).key === 'cancelled').length;
  const grace = SA.businesses.filter((b) => statusInfo(b).key === 'grace').length;

  const expiring = SA.businesses.filter((b) => {
    const d = Number(b.days_remaining);
    return Number.isFinite(d) && d >= 0 && d <= 7;
  }).length;

  const noPlan = SA.businesses.filter((b) => !b.plan_type && !b.plan).length;
  const limitsReached = SA.businesses.filter((b) => hasReachedAnyLimit(b)).length;
  const unread = SA.supportSessions.reduce((sum, s) => sum + n(s.unread_for_super_admin_count || s.unread_count), 0);
  const unresolvedErrors = SA.errorLogs.filter((e) => e.is_resolved !== true).length;

  return expired + suspended + cancelled + grace + expiring + noPlan + limitsReached + unread + unresolvedErrors;
}

  function miniAlertList(rows) {
    if (!rows.length) return `<div class="eqsa-empty">لا توجد تنبيهات حرجة حاليًا.</div>`;
    return `<div class="eqsa-alert-list">${rows.map((b) => {
      const s = statusInfo(b);
      return `<div class="eqsa-alert-item"><div><div class="eqsa-name">${esc(b.business_name || b.name)}</div><div class="eqsa-sub">${esc(b.city || '—')} · ${esc(daysLabel(b.days_remaining))}</div></div>${badge(s.label, s.color, s.bg)}</div>`;
    }).join('')}</div>`;
  }

  function miniSupportList(rows) {
    if (!rows.length) return `<div class="eqsa-empty">لا توجد جلسات دعم.</div>`;
    return `<div class="eqsa-alert-list">${rows.map((s) => {
      const unread = n(s.unread_for_super_admin_count || s.unread_count);
      return `<div class="eqsa-alert-item"><div><div class="eqsa-name">${esc(s.business_name || s.subject || 'جلسة دعم')}</div><div class="eqsa-sub">${esc(s.last_message_body || 'لا توجد رسالة')} · ${esc(fmtDateTime(s.last_message_created_at || s.last_message_at))}</div></div>${unread ? badge(unread + ' جديد', '#DC2626', '#FEF2F2') : badge(s.status || '—', '#64748B', '#F8FAFC')}</div>`;
    }).join('')}</div>`;
  }

  function filteredBusinesses() {
    const q = SA.restaurantsSearch.trim().toLowerCase();
    return SA.businesses.filter((b) => {
      const s = statusInfo(b).key;
      const plan = safeText(b.plan_type || b.plan, '').toLowerCase();
      if (SA.restaurantsStatusFilter !== 'all' && s !== SA.restaurantsStatusFilter) return false;
      if (SA.restaurantsPlanFilter !== 'all' && plan !== SA.restaurantsPlanFilter) return false;
      if (!q) return true;
      const text = [
  b.business_name,
  b.name,
  b.branch_name,
  b.city,
  b.phone,
  b.address,
  b.support_ref
].join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  function renderRestaurants() {
    const el = $('eqsaViewRestaurants');
    if (!el) return;
    el.innerHTML = `
      ${pageHead('إدارة المطاعم', 'إدارة كل المطاعم وربطها بالاشتراكات والحالة التشغيلية.', true)}
      <div class="eqsa-card eqsa-panel">
        <div class="eqsa-toolbar">
          <input class="eqsa-input" value="${esc(SA.restaurantsSearch)}" oninput="EasyQSuperAdmin.setRestaurantSearch(this.value)" placeholder="بحث باسم المطعم، المدينة، الهاتف...">
          <select class="eqsa-select" onchange="EasyQSuperAdmin.setRestaurantStatus(this.value)">
            ${option('all','كل الحالات',SA.restaurantsStatusFilter)}${option('active','نشط',SA.restaurantsStatusFilter)}${option('trial','تجريبي',SA.restaurantsStatusFilter)}${option('grace','فترة سماح',SA.restaurantsStatusFilter)}${option('expired','منتهي',SA.restaurantsStatusFilter)}${option('suspended','موقوف',SA.restaurantsStatusFilter)}
          </select>
          <select class="eqsa-select" onchange="EasyQSuperAdmin.setRestaurantPlan(this.value)">
            ${option('all','كل الباقات',SA.restaurantsPlanFilter)}${option('trial','Trial',SA.restaurantsPlanFilter)}${option('basic','Basic',SA.restaurantsPlanFilter)}${option('pro','Pro',SA.restaurantsPlanFilter)}${option('enterprise','Enterprise',SA.restaurantsPlanFilter)}
          </select>
        </div>
        ${restaurantsTable(filteredBusinesses())}
      </div>`;
  }

  function option(value, label, selected) {
    return `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
  }

  function restaurantsTable(rows) {
    if (!rows.length) return `<div class="eqsa-empty">لا توجد مطاعم مطابقة.</div>`;
    return `
      <div class="eqsa-table-wrap">
        <table class="eqsa-table">
          <thead><tr><th>#</th><th>المطعم</th><th>رقم الدعم</th><th>المدينة</th><th>الهاتف</th><th>الباقة</th><th>الانتهاء</th><th>الأيام</th><th>الاستخدام</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>${rows.map((b, i) => businessRow(b, i)).join('')}</tbody>
        </table>
      </div>`;
  }

  function businessRow(b, i) {
    const s = statusInfo(b);
    const p = planInfo(b.plan_type || b.plan);
    const bid = esc(b.business_id || b.id);
    const usage = `طاولات ${n(b.current_tables_count)}/${b.max_tables ?? '∞'} · مستخدمين ${n(b.current_users_count)}/${b.max_users ?? '∞'}`;
    return `<tr>
      <td>${i + 1}</td>
      <td>
  <div class="eqsa-name">${esc(b.business_name || b.name || '—')}</div>
  <div class="eqsa-sub">${esc(b.branch_name || b.address || 'بدون فرع')}</div>
</td>

<td style="direction:ltr;text-align:right;">
  <span class="eqsa-support-ref">${esc(b.support_ref || '—')}</span>
  ${
    b.support_ref
      ? `<button class="eqsa-copy-mini" onclick="EasyQSuperAdmin.copyText('${esc(b.support_ref)}','تم نسخ رقم الدعم')" title="نسخ رقم الدعم">
          <i class="fas fa-copy"></i>
        </button>`
      : ''
  }
</td>

<td>${esc(b.city || '—')}</td>
      <td style="direction:ltr;text-align:right;">${esc(b.phone || '—')}</td>
      <td>${badge(p.label, p.color, p.bg)}</td>
      <td>${esc(fmtDate(b.expires_at || b.end_date))}</td>
      <td>${esc(daysLabel(b.days_remaining))}</td>
      <td><span class="eqsa-sub">${esc(usage)}</span></td>
      <td>${badge(s.label, s.color, s.bg)}</td>
      <td><div class="eqsa-mini-actions">
        ${iconBtn('#0E146D','fa-eye',`EasyQSuperAdmin.viewBusiness('${bid}')`,'عرض التفاصيل')}
        ${iconBtn('#10B981','fa-link',`EasyQSuperAdmin.copyBookingLink('${bid}')`,'نسخ رابط الحجز')}
        ${iconBtn('#F59E0B','fa-power-off',`EasyQSuperAdmin.manageBusinessStatus('${bid}')`,'إدارة الحالة')}
      </div></td>
    </tr>`;
  }

  function iconBtn(color, icon, onclick, title) {
    return `<button class="eqsa-icon-btn" style="background:${esc(color)}" onclick="${onclick}" title="${esc(title)}"><i class="fas ${esc(icon)}"></i></button>`;
  }

  function renderSubscriptions() {
    const el = $('eqsaViewSubscriptions');
    if (!el) return;
    el.innerHTML = `
      ${pageHead('الاشتراكات والرخص', 'عرض حالة الاشتراك والحدود والاستخدام لكل مطعم.', true)}
      <div class="eqsa-card eqsa-panel">
        ${subscriptionsTable(SA.businesses)}
      </div>`;
  }

  function subscriptionsTable(rows) {
    if (!rows.length) return `<div class="eqsa-empty">لا توجد اشتراكات.</div>`;
    return `
      <div class="eqsa-table-wrap">
        <table class="eqsa-table">
          <thead><tr><th>المطعم</th><th>الخطة</th><th>البداية</th><th>النهاية</th><th>الأيام</th><th>الحالة</th><th>الحدود</th><th>إجراءات</th></tr></thead>
          <tbody>${rows.map((b) => {
            const s = statusInfo(b);
            const p = planInfo(b.plan_type || b.plan);
            const bid = esc(b.business_id || b.id);
            const limits = `طاولات ${b.max_tables ?? '∞'} · مستخدمين ${b.max_users ?? '∞'} · حجوزات ${b.max_bookings ?? '∞'}`;
            return `<tr>
              <td><div class="eqsa-name">${esc(b.business_name || b.name || '—')}</div><div class="eqsa-sub">${esc(b.city || b.branch_name || '')}</div></td>
              <td>${badge(p.label, p.color, p.bg)}</td>
              <td>${esc(fmtDate(b.starts_at || b.start_date))}</td>
              <td>${esc(fmtDate(b.expires_at || b.end_date))}</td>
              <td>${esc(daysLabel(b.days_remaining))}</td>
              <td>${badge(s.label, s.color, s.bg)}</td>
              <td><span class="eqsa-sub">${esc(limits)}</span></td>
              <td><div class="eqsa-mini-actions">
                <button class="eqsa-btn" onclick="EasyQSuperAdmin.manageBusinessStatus('${bid}')"><i class="fas fa-sliders-h"></i> إدارة</button>
                ${iconBtn('#0E146D','fa-eye',`EasyQSuperAdmin.viewBusiness('${bid}')`,'التفاصيل')}
              </div></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
  }

async function sendAdminNotificationFromUI() {
  if (!isSuperAdmin()) return;

  const titleInput = $('eqsaAdminNoticeTitle');
  const bodyInput = $('eqsaAdminNoticeBody');
  const scopeInput = $('eqsaAdminNoticeScope');
  const businessInput = $('eqsaAdminNoticeBusiness');
  const severityInput = $('eqsaAdminNoticeSeverity');
  const forcePopupInput = $('eqsaAdminNoticeForcePopup');
  const sendBtn = $('eqsaAdminNoticeSendBtn');

  const title = titleInput ? titleInput.value.trim() : '';
  const body = bodyInput ? bodyInput.value.trim() : '';
  const scope = scopeInput ? scopeInput.value : 'specific_business';
  const businessId = businessInput ? businessInput.value : '';
  const severity = severityInput ? severityInput.value : 'info';
  const forcePopup = forcePopupInput ? forcePopupInput.checked === true : false;

  const targetRoles = Array.from(document.querySelectorAll('.eqsa-admin-notice-role:checked'))
    .map((input) => input.value)
    .filter(Boolean);

  if (!title) {
    notify('اكتب عنوان الإشعار', 'error');
    return;
  }

  if (!body) {
    notify('اكتب نص الإشعار', 'error');
    return;
  }

  if (scope === 'specific_business' && !businessId) {
    notify('اختر المطعم المستهدف أو اختر كل المطاعم', 'error');
    return;
  }

  if (!targetRoles.length) {
    notify('اختر منصبًا واحدًا على الأقل لاستقبال الإشعار', 'error');
    return;
  }

  try {
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    }

    const data = await rpc('super_admin_create_notification', {
      p_title: title,
      p_body: body,
      p_target_scope: scope,
      p_target_business_id: scope === 'specific_business' ? businessId : null,
      p_target_roles: targetRoles,
      p_severity: severity,
      p_force_popup: forcePopup,
      p_expires_at: null
    });

    const row = Array.isArray(data) ? data[0] : data;

    if (!row || row.success !== true) {
      const code = row?.message || 'UNKNOWN_ERROR';

      const msg =
        code === 'TITLE_REQUIRED' ? 'عنوان الإشعار مطلوب' :
        code === 'BODY_REQUIRED' ? 'نص الإشعار مطلوب' :
        code === 'BODY_TOO_LONG' ? 'نص الإشعار طويل جدًا' :
        code === 'BUSINESS_REQUIRED' ? 'يجب اختيار مطعم محدد' :
        code === 'BUSINESS_NOT_FOUND' ? 'المطعم المحدد غير موجود' :
        code === 'INVALID_TARGET_ROLES' ? 'الأدوار المستهدفة غير صحيحة' :
        code === 'PERMISSION_DENIED' ? 'ليس لديك صلاحية إرسال الإشعارات' :
        'فشل إرسال الإشعار';

      notify(msg, 'error');
      return;
    }

    if (titleInput) titleInput.value = '';
    if (bodyInput) bodyInput.value = '';
    if (scopeInput) scopeInput.value = 'specific_business';
    if (businessInput) businessInput.value = '';
    if (severityInput) severityInput.value = 'info';
    if (forcePopupInput) forcePopupInput.checked = false;

    document.querySelectorAll('.eqsa-admin-notice-role').forEach((input) => {
      input.checked = true;
    });

    const businessWrap = $('eqsaAdminNoticeBusinessWrap');
    if (businessWrap) businessWrap.style.display = 'block';

    notify('تم إرسال الإشعار بنجاح', 'success');

    closeAdminNoticeComposer();

  } catch (err) {
    console.error('[EASY-Q SA] send admin notification failed:', err);
    notify('حدث خطأ أثناء إرسال الإشعار', 'error');

  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الإشعار';
    }
  }
}
 
function openAdminNoticeComposer() {
  if (!isSuperAdmin()) return;

  let overlay = $('eqsaAdminNoticeComposerModal');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'eqsaAdminNoticeComposerModal';
    document.body.appendChild(overlay);
  }

  const businessOptions = SA.businesses
    .slice()
    .sort((a, b) => safeText(a.business_name || a.name).localeCompare(safeText(b.business_name || b.name), 'ar'))
    .map((b) => {
      const id = b.business_id || b.id;
      const label = [
        b.business_name || b.name || 'مطعم بدون اسم',
        b.branch_name,
        b.city
      ].filter(Boolean).join(' - ');

      return `<option value="${esc(id)}">${esc(label)}</option>`;
    })
    .join('');

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 26000;
    background: rgba(15, 23, 42, 0.46);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    direction: rtl;
  `;

  overlay.innerHTML = `
    <div style="
      width: min(560px, calc(100vw - 28px));
      max-height: calc(100vh - 40px);
      background: #FFFFFF;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
      border: 1px solid rgba(15, 23, 42, 0.08);
    ">
      <div style="
        padding: 16px 18px;
        background: linear-gradient(135deg, #0E146D 0%, #060427 100%);
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      ">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 14px;
            background: rgba(255,255,255,0.13);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #F4D28A;
          ">
            <i class="fas fa-envelope-open-text"></i>
          </div>

          <div>
            <div style="font-size:15px;font-weight:900;">إرسال إشعار إداري</div>
            <div style="font-size:11px;opacity:.72;margin-top:3px;">إشعار يظهر داخل لوحة المطعم للمناصب المستهدفة</div>
          </div>
        </div>

        <button type="button" onclick="EasyQSuperAdmin.closeAdminNoticeComposer()" style="
          border: none;
          background: rgba(255,255,255,0.12);
          color: #FFFFFF;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>

      <div style="
        padding: 16px;
        overflow: auto;
        max-height: calc(100vh - 118px);
      ">
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        ">
          <div>
            <label style="display:block;font-size:12px;font-weight:900;color:#64748B;margin-bottom:6px;">
              نطاق الإرسال
            </label>

            <select id="eqsaAdminNoticeScope" class="eqsa-select" style="width:100%;" onchange="
              document.getElementById('eqsaAdminNoticeBusinessWrap').style.display = this.value === 'specific_business' ? 'block' : 'none';
            ">
              <option value="specific_business">مطعم محدد</option>
              <option value="all_businesses">كل المطاعم</option>
            </select>
          </div>

          <div id="eqsaAdminNoticeBusinessWrap">
            <label style="display:block;font-size:12px;font-weight:900;color:#64748B;margin-bottom:6px;">
              المطعم المستهدف
            </label>

            <select id="eqsaAdminNoticeBusiness" class="eqsa-select" style="width:100%;">
              <option value="">اختر المطعم</option>
              ${businessOptions}
            </select>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:900;color:#64748B;margin-bottom:6px;">
              نوع الإشعار
            </label>

            <select id="eqsaAdminNoticeSeverity" class="eqsa-select" style="width:100%;">
              <option value="info">معلومة</option>
              <option value="warning">تنبيه</option>
              <option value="important">مهم</option>
              <option value="maintenance">صيانة</option>
              <option value="subscription">اشتراك</option>
            </select>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:900;color:#64748B;margin-bottom:6px;">
              المستلمون
            </label>

            <div style="
              display:flex;
              align-items:center;
              gap:8px;
              flex-wrap:wrap;
              min-height:42px;
              background:#fff;
              border:1px solid #D6DAE4;
              border-radius:14px;
              padding:8px 10px;
            ">
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:900;color:#334155;">
                <input type="checkbox" class="eqsa-admin-notice-role" value="admin" checked>
                أدمن
              </label>

              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:900;color:#334155;">
                <input type="checkbox" class="eqsa-admin-notice-role" value="manager" checked>
                مدير
              </label>

              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:900;color:#334155;">
                <input type="checkbox" class="eqsa-admin-notice-role" value="staff" checked>
                موظف
              </label>
            </div>
          </div>

          <div style="grid-column:1 / -1;">
            <label style="display:block;font-size:12px;font-weight:900;color:#64748B;margin-bottom:6px;">
              عنوان الإشعار
            </label>

            <input
              id="eqsaAdminNoticeTitle"
              class="eqsa-input"
              maxlength="140"
              placeholder="مثال: صيانة مجدولة الليلة"
              style="width:100%;min-width:0;"
            >
          </div>

          <div style="grid-column:1 / -1;">
            <label style="display:block;font-size:12px;font-weight:900;color:#64748B;margin-bottom:6px;">
              نص الإشعار
            </label>

            <textarea
              id="eqsaAdminNoticeBody"
              maxlength="3000"
              placeholder="اكتب نص الإشعار الذي سيظهر للمطعم..."
              style="
                width:100%;
                min-height:96px;
                max-height:180px;
                border:1px solid #D6DAE4;
                border-radius:16px;
                background:#fff;
                padding:12px;
                outline:none;
                font-weight:800;
                color:#0F172A;
                resize:vertical;
                line-height:1.8;
                font-family:inherit;
              "
            ></textarea>
          </div>

          <div style="
            grid-column:1 / -1;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            flex-wrap:wrap;
            padding-top:2px;
          ">
            <label style="
              display:inline-flex;
              align-items:center;
              gap:8px;
              color:#475569;
              font-size:12px;
              font-weight:900;
            ">
              <input type="checkbox" id="eqsaAdminNoticeForcePopup">
              إظهار كمودل تلقائي
            </label>

            <button
              type="button"
              id="eqsaAdminNoticeSendBtn"
              class="eqsa-btn primary"
              onclick="EasyQSuperAdmin.sendAdminNotificationFromUI()"
              style="min-height:42px;"
            >
              <i class="fas fa-paper-plane"></i>
              إرسال الإشعار
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeAdminNoticeComposer() {
  const overlay = $('eqsaAdminNoticeComposerModal');
  if (overlay) overlay.remove();
}

async function showAdminNotificationReadDetails(notificationId) {
  if (!isSuperAdmin()) return;
  if (!notificationId) return;

  try {
    const rows = await rpc('super_admin_get_notification_read_status', {
      p_notification_id: notificationId
    });

    const list = Array.isArray(rows) ? rows : [];
    const readRows = list.filter((row) => row.has_read === true);
    const unreadRows = list.filter((row) => row.has_read !== true);
    const title = list[0]?.notification_title || 'تفاصيل الإشعار';

    let overlay = $('eqsaAdminNoticeDetailsModal');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'eqsaAdminNoticeDetailsModal';
      document.body.appendChild(overlay);
    }

    function userRow(row, isRead) {
      return `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:10px;
          border-radius:14px;
          background:${isRead ? '#ECFDF5' : '#FEF2F2'};
          border:1px solid ${isRead ? '#BBF7D0' : '#FECACA'};
          margin-bottom:8px;
        ">
          <div style="min-width:0;">
            <div style="
              font-size:13px;
              font-weight:950;
              color:#0F172A;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">
              ${esc(row.target_display_name || 'مستخدم بدون اسم')}
            </div>

            <div style="
              font-size:11px;
              font-weight:800;
              color:#64748B;
              margin-top:4px;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">
              ${esc(row.target_business_name || 'مطعم غير معروف')} · ${esc(row.target_role || '—')}
            </div>
          </div>

          <div style="
            flex:0 0 auto;
            font-size:11px;
            font-weight:900;
            color:${isRead ? '#059669' : '#DC2626'};
            text-align:left;
            direction:rtl;
          ">
            ${
              isRead
                ? esc(fmtDateTime(row.read_at))
                : 'لم يقرأ'
            }
          </div>
        </div>
      `;
    }

    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 27000;
      background: rgba(15, 23, 42, 0.48);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      direction: rtl;
    `;

    overlay.innerHTML = `
      <div style="
        width:min(900px, calc(100vw - 28px));
        max-height:calc(100vh - 40px);
        background:#FFFFFF;
        border-radius:24px;
        overflow:hidden;
        box-shadow:0 34px 90px rgba(15,23,42,.30);
        border:1px solid rgba(15,23,42,.08);
      ">
        <div style="
          padding:16px 18px;
          background:linear-gradient(135deg,#0E146D 0%,#060427 100%);
          color:#FFFFFF;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        ">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="
              width:38px;
              height:38px;
              border-radius:14px;
              background:rgba(255,255,255,.13);
              display:flex;
              align-items:center;
              justify-content:center;
              color:#F4D28A;
              flex:0 0 auto;
            ">
              <i class="fas fa-eye"></i>
            </div>

            <div style="min-width:0;">
              <div style="
                font-size:15px;
                font-weight:950;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
              ">
                تفاصيل قراءة الإشعار
              </div>

              <div style="
                font-size:12px;
                opacity:.78;
                margin-top:4px;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
              ">
                ${esc(title)}
              </div>
            </div>
          </div>

          <button type="button" onclick="EasyQSuperAdmin.closeAdminNotificationDetailsModal()" style="
            border:none;
            background:rgba(255,255,255,.12);
            color:#FFFFFF;
            width:34px;
            height:34px;
            border-radius:12px;
            cursor:pointer;
            font-size:18px;
            display:flex;
            align-items:center;
            justify-content:center;
          ">×</button>
        </div>

        <div style="
          padding:16px;
          overflow:auto;
          max-height:calc(100vh - 118px);
        ">
          <div style="
            display:grid;
            grid-template-columns:repeat(3, minmax(0, 1fr));
            gap:10px;
            margin-bottom:14px;
          ">
            <div class="eqsa-card" style="padding:14px;border-radius:18px;box-shadow:none;">
              <div style="font-size:12px;font-weight:900;color:#64748B;">المستهدفون</div>
              <div style="font-size:26px;font-weight:950;color:#0E146D;margin-top:5px;">${list.length}</div>
            </div>

            <div class="eqsa-card" style="padding:14px;border-radius:18px;box-shadow:none;">
              <div style="font-size:12px;font-weight:900;color:#64748B;">قرأ</div>
              <div style="font-size:26px;font-weight:950;color:#059669;margin-top:5px;">${readRows.length}</div>
            </div>

            <div class="eqsa-card" style="padding:14px;border-radius:18px;box-shadow:none;">
              <div style="font-size:12px;font-weight:900;color:#64748B;">لم يقرأ</div>
              <div style="font-size:26px;font-weight:950;color:#DC2626;margin-top:5px;">${unreadRows.length}</div>
            </div>
          </div>

          <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px;
            align-items:start;
          ">
            <div style="
              background:#FFFFFF;
              border:1px solid #E5E7EB;
              border-radius:18px;
              padding:12px;
            ">
              <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-bottom:10px;
              ">
                <h3 style="margin:0;font-size:14px;font-weight:950;color:#059669;">
                  <i class="fas fa-check-circle"></i>
                  قرأ الإشعار
                </h3>
                ${badge(readRows.length, '#059669', '#ECFDF5')}
              </div>

              ${
                readRows.length
                  ? readRows.map((row) => userRow(row, true)).join('')
                  : `<div class="eqsa-empty" style="padding:18px;">لا يوجد مستخدمون قرأوا الإشعار بعد.</div>`
              }
            </div>

            <div style="
              background:#FFFFFF;
              border:1px solid #E5E7EB;
              border-radius:18px;
              padding:12px;
            ">
              <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-bottom:10px;
              ">
                <h3 style="margin:0;font-size:14px;font-weight:950;color:#DC2626;">
                  <i class="fas fa-clock"></i>
                  لم يقرأ
                </h3>
                ${badge(unreadRows.length, '#DC2626', '#FEF2F2')}
              </div>

              ${
                unreadRows.length
                  ? unreadRows.map((row) => userRow(row, false)).join('')
                  : `<div class="eqsa-empty" style="padding:18px;">كل المستهدفين قرأوا الإشعار.</div>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    console.error('[EASY-Q SA] notification read details failed:', err);
    notify('تعذر عرض تفاصيل قراءة الإشعار', 'error');
  }
}

function closeAdminNotificationDetailsModal() {
  const overlay = $('eqsaAdminNoticeDetailsModal');
  if (overlay) overlay.remove();
}

function renderAdminNotificationsLog() {
  const rows = Array.isArray(SA.adminNotifications) ? SA.adminNotifications : [];

  if (!rows.length) {
    return `
      <div class="eqsa-card eqsa-panel" style="margin-bottom:14px;border-radius:20px;">
        <div class="eqsa-panel-title">
          <h3>
            <i class="fas fa-envelope-open-text" style="color:#0E146D;margin-left:8px;"></i>
            سجل إشعارات الإدارة
          </h3>
          ${badge(0, '#64748B', '#F8FAFC')}
        </div>

        <div class="eqsa-empty" style="padding:22px;">
          لا توجد إشعارات مرسلة حتى الآن.
        </div>
      </div>
    `;
  }

  return `
    <div class="eqsa-card eqsa-panel" style="margin-bottom:14px;border-radius:20px;">
      <div class="eqsa-panel-title">
        <h3>
          <i class="fas fa-envelope-open-text" style="color:#0E146D;margin-left:8px;"></i>
          سجل إشعارات الإدارة
        </h3>
        ${badge(rows.length, '#0E146D', '#EEF2FF')}
      </div>

      <div class="eqsa-table-wrap">
        <table class="eqsa-table" style="min-width:980px;">
          <thead>
            <tr>
              <th>الإشعار</th>
              <th>النطاق</th>
              <th>الأدوار</th>
              <th>النوع</th>
              <th>المستهدفين</th>
              <th>قرأ</th>
              <th>لم يقرأ</th>
              <th>الحالة</th>
              <th>الإرسال</th>
              <th>تفاصيل</th>
            </tr>
          </thead>

          <tbody>
            ${rows.slice(0, 30).map((row) => {
              const targetCount = n(row.target_users_count);
              const readCount = n(row.read_users_count);
              const unreadCount = n(row.unread_users_count);

              const targetLabel =
                row.target_scope === 'all_businesses'
                  ? 'كل المطاعم'
                  : safeText(row.target_business_name, 'مطعم محدد');

              const rolesLabel = Array.isArray(row.target_roles)
                ? row.target_roles.join(' / ')
                : safeText(row.target_roles, '—');

              const severityLabel =
                row.severity === 'warning' ? 'تنبيه' :
                row.severity === 'important' ? 'مهم' :
                row.severity === 'maintenance' ? 'صيانة' :
                row.severity === 'subscription' ? 'اشتراك' :
                'معلومة';

              const severityColor =
                row.severity === 'warning' ? '#D97706' :
                row.severity === 'important' ? '#DC2626' :
                row.severity === 'maintenance' ? '#7C3AED' :
                row.severity === 'subscription' ? '#0E146D' :
                '#2563EB';

              const severityBg =
                row.severity === 'warning' ? '#FFFBEB' :
                row.severity === 'important' ? '#FEF2F2' :
                row.severity === 'maintenance' ? '#F5F3FF' :
                row.severity === 'subscription' ? '#EEF2FF' :
                '#EFF6FF';

              return `
                <tr>
                  <td>
                    <div class="eqsa-name" style="
                      max-width:240px;
                      white-space:nowrap;
                      overflow:hidden;
                      text-overflow:ellipsis;
                    ">
                      ${esc(row.title || 'إشعار بدون عنوان')}
                    </div>
                    <div class="eqsa-sub" style="
                      max-width:260px;
                      white-space:nowrap;
                      overflow:hidden;
                      text-overflow:ellipsis;
                    ">
                      ${esc(row.body || '')}
                    </div>
                  </td>

                  <td>
                    <div class="eqsa-name" style="font-size:12px;">
                      ${esc(row.target_scope === 'all_businesses' ? 'عام' : 'محدد')}
                    </div>
                    <div class="eqsa-sub" style="
                      max-width:180px;
                      white-space:nowrap;
                      overflow:hidden;
                      text-overflow:ellipsis;
                    ">
                      ${esc(targetLabel)}
                    </div>
                  </td>

                  <td style="direction:ltr;text-align:right;">
                    ${esc(rolesLabel)}
                  </td>

                  <td>
                    ${badge(severityLabel, severityColor, severityBg)}
                  </td>

                  <td>${targetCount}</td>

                  <td>
                    ${badge(readCount, '#059669', '#ECFDF5')}
                  </td>

                  <td>
                    ${badge(unreadCount, unreadCount > 0 ? '#DC2626' : '#64748B', unreadCount > 0 ? '#FEF2F2' : '#F8FAFC')}
                  </td>

                  <td>
                    ${row.is_active ? badge('نشط', '#059669', '#ECFDF5') : badge('معطل', '#64748B', '#F8FAFC')}
                  </td>

                  <td>
                    <div class="eqsa-sub">
                      ${esc(fmtDateTime(row.created_at))}
                    </div>
                  </td>

                  <td>
                    <button
                      type="button"
                      class="eqsa-btn"
                      onclick="EasyQSuperAdmin.showAdminNotificationReadDetails('${esc(row.notification_id)}')"
                      style="
                        min-height:34px;
                        padding:7px 10px;
                        font-size:12px;
                        box-shadow:none;
                      "
                    >
                      <i class="fas fa-eye"></i>
                      تفاصيل
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      ${
        rows.length > 30
          ? `<div style="padding-top:10px;color:#64748B;font-size:12px;font-weight:900;">
              يتم عرض آخر 30 إشعار فقط.
            </div>`
          : ''
      }
    </div>
  `;
}

function renderAlerts() {
  const el = $('eqsaViewAlerts');
  if (!el) return;

  const expired = SA.businesses.filter((b) => statusInfo(b).key === 'expired');
  const suspended = SA.businesses.filter((b) => statusInfo(b).key === 'suspended');
  const cancelled = SA.businesses.filter((b) => statusInfo(b).key === 'cancelled');
  const grace = SA.businesses.filter((b) => statusInfo(b).key === 'grace');

  const expiring = SA.businesses.filter((b) => {
    const d = Number(b.days_remaining);
    return Number.isFinite(d) && d >= 0 && d <= 7;
  });

  const noPlan = SA.businesses.filter((b) => !b.plan_type && !b.plan);
  const limitsReached = SA.businesses.filter((b) => hasReachedAnyLimit(b));

  const unread = SA.supportSessions.filter((s) => {
    return n(s.unread_for_super_admin_count || s.unread_count) > 0;
  });

  const unresolvedErrors = SA.errorLogs.filter((e) => e.is_resolved !== true);

  el.innerHTML = `
    ${pageHead('التنبيهات', 'إرسال إشعارات إدارية ومتابعة الحالات المهمة بشكل مختصر.', true)}

    <div class="eqsa-card" style="
      margin-bottom: 14px;
      padding: 13px 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      border-radius: 20px;
    ">
      <div>
        <div style="font-size:15px;font-weight:950;color:#0F172A;">
          إشعارات الإدارة
        </div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;line-height:1.6;">
          أرسل إشعارًا للمطاعم. البطاقات أدناه مختصرة، والتفاصيل من أزرار العرض.
        </div>
      </div>

      <button
        type="button"
        class="eqsa-btn primary"
        onclick="EasyQSuperAdmin.openAdminNoticeComposer()"
        style="min-height:40px;padding:10px 14px;"
      >
        <i class="fas fa-paper-plane"></i>
        إرسال إشعار إداري
      </button>
    </div>

    ${renderAdminNotificationsLog()}

    <div class="eqsa-grid eqsa-stats" style="
      margin-bottom: 14px;
      grid-template-columns: repeat(4, minmax(150px, 1fr));
      gap: 12px;
    ">
      ${stat('إجمالي التنبيهات', countSmartAlerts(), 'fa-bell', '#0E146D')}
      ${stat('تنتهي قريبًا', expiring.length, 'fa-clock', '#F97316')}
      ${stat('تجاوز حدود', limitsReached.length, 'fa-gauge-high', '#7C3AED')}
      ${stat('أخطاء غير محلولة', unresolvedErrors.length, 'fa-bug', '#DC2626')}
    </div>

    <div style="
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
      margin-bottom: 12px;
    ">
      ${alertPanel('تنتهي خلال 7 أيام', expiring, '#F97316', 'fa-clock', 'subscriptions')}
      ${alertPanel('في فترة السماح', grace, '#D97706', 'fa-hourglass-half', 'subscriptions')}
      ${alertPanel('منتهية', expired, '#DC2626', 'fa-times-circle', 'subscriptions')}
    </div>

    <div style="
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
      margin-bottom: 12px;
    ">
      ${limitPanel(limitsReached)}
      ${supportPanel(unread)}
      ${errorPanel(unresolvedErrors)}
    </div>

    <div style="
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    ">
      ${alertPanel('موقوفة', suspended, '#991B1B', 'fa-ban', 'subscriptions')}
      ${alertPanel('ملغية', cancelled, '#64748B', 'fa-circle-xmark', 'subscriptions')}
      ${alertPanel('بدون خطة واضحة', noPlan, '#64748B', 'fa-file-circle-question', 'restaurants')}
    </div>
  `;
}

function compactAlertRows(rows, options = {}) {
  const limit = options.limit || 4;
  const emptyText = options.emptyText || 'لا توجد عناصر حاليًا.';
  const type = options.type || 'business';
  const view = options.view || 'restaurants';
  const visibleRows = rows.slice(0, limit);
  const extraCount = Math.max(rows.length - limit, 0);

  if (!rows.length) {
    return `
      <div style="
        padding: 16px;
        text-align: center;
        color: #64748B;
        font-size: 12px;
        font-weight: 900;
        background: #F8FAFC;
        border: 1px dashed #CBD5E1;
        border-radius: 16px;
      ">
        ${esc(emptyText)}
      </div>
    `;
  }

  const html = visibleRows.map((row) => {
    if (type === 'error') {
      return `
        <div class="eqsa-alert-item" style="
          padding: 10px;
          min-height: 58px;
          align-items: center;
        ">
          <div style="min-width:0;">
            <div class="eqsa-name" style="
              font-size: 13px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            ">
              ${esc(row.business_name || 'مطعم غير محدد')}
            </div>

            <div class="eqsa-sub" style="
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            ">
              ${esc(row.error_code || 'ERROR')} · ${esc(fmtDateTime(row.created_at))}
            </div>
          </div>

          <button class="eqsa-icon-btn" style="background:#DC2626;flex:0 0 auto;" onclick="EasyQSuperAdmin.showView('errors')" title="عرض الأخطاء">
            <i class="fas fa-list"></i>
          </button>
        </div>
      `;
    }

    if (type === 'support') {
      const unreadCount = n(row.unread_for_super_admin_count || row.unread_count);
      return `
        <div class="eqsa-alert-item" style="
          padding: 10px;
          min-height: 58px;
          align-items: center;
        ">
          <div style="min-width:0;">
            <div class="eqsa-name" style="
              font-size: 13px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            ">
              ${esc(row.business_name || row.subject || 'جلسة دعم')}
            </div>

            <div class="eqsa-sub" style="
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            ">
              ${unreadCount ? esc(unreadCount + ' رسالة غير مقروءة') : 'لا توجد رسائل جديدة'}
            </div>
          </div>

          <button class="eqsa-icon-btn" style="background:#0E146D;flex:0 0 auto;" onclick="EasyQSuperAdmin.showView('support')" title="فتح الدعم">
            <i class="fas fa-headset"></i>
          </button>
        </div>
      `;
    }

    const bid = esc(row.business_id || row.id || '');

    return `
      <div class="eqsa-alert-item" style="
        padding: 10px;
        min-height: 58px;
        align-items: center;
      ">
        <div style="min-width:0;">
          <div class="eqsa-name" style="
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          ">
            ${esc(row.business_name || row.name || 'مطعم')}
          </div>

          <div class="eqsa-sub" style="
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          ">
            ${esc(options.subText ? options.subText(row) : `${row.city || row.branch_name || '—'} · ${daysLabel(row.days_remaining)}`)}
          </div>
        </div>

        <button class="eqsa-icon-btn" style="background:#0E146D;flex:0 0 auto;" onclick="EasyQSuperAdmin.viewBusiness('${bid}')" title="تفاصيل المطعم">
          <i class="fas fa-eye"></i>
        </button>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${html}

      ${
        extraCount > 0
          ? `<button class="eqsa-btn" onclick="EasyQSuperAdmin.showView('${esc(view)}')" style="
              justify-content:center;
              min-height:36px;
              padding:8px 10px;
              font-size:12px;
              box-shadow:none;
            ">
              عرض ${extraCount} إضافية
            </button>`
          : ''
      }
    </div>
  `;
}

function alertPanel(title, rows, color, icon, view = 'restaurants') {
  return `
    <div class="eqsa-card eqsa-panel" style="
      padding: 13px;
      border-radius: 20px;
      min-height: 190px;
    ">
      <div class="eqsa-panel-title" style="margin-bottom:10px;">
        <h3 style="
          font-size: 14px;
          display:flex;
          align-items:center;
          gap:7px;
        ">
          <i class="fas ${esc(icon)}" style="color:${esc(color)};"></i>
          ${esc(title)}
        </h3>

        ${badge(rows.length, color, color + '12')}
      </div>

      ${compactAlertRows(rows, {
        limit: 4,
        emptyText: 'لا توجد حالات في هذه البطاقة.',
        view
      })}
    </div>
  `;
}

function limitPanel(rows) {
  return `
    <div class="eqsa-card eqsa-panel" style="
      padding: 13px;
      border-radius: 20px;
      min-height: 190px;
    ">
      <div class="eqsa-panel-title" style="margin-bottom:10px;">
        <h3 style="
          font-size: 14px;
          display:flex;
          align-items:center;
          gap:7px;
        ">
          <i class="fas fa-gauge-high" style="color:#7C3AED;"></i>
          تجاوز حدود الباقة
        </h3>

        ${badge(rows.length, '#7C3AED', '#F5F3FF')}
      </div>

      ${compactAlertRows(rows, {
        limit: 4,
        emptyText: 'لا توجد مطاعم تجاوزت حدود الباقة.',
        view: 'subscriptions',
        subText: limitReachedText
      })}
    </div>
  `;
}

function supportPanel(rows) {
  return `
    <div class="eqsa-card eqsa-panel" style="
      padding: 13px;
      border-radius: 20px;
      min-height: 190px;
    ">
      <div class="eqsa-panel-title" style="margin-bottom:10px;">
        <h3 style="
          font-size: 14px;
          display:flex;
          align-items:center;
          gap:7px;
        ">
          <i class="fas fa-headset" style="color:#0E146D;"></i>
          دعم غير مقروء
        </h3>

        ${badge(rows.length, '#DC2626', '#FEF2F2')}
      </div>

      ${compactAlertRows(rows, {
        limit: 4,
        emptyText: 'لا توجد رسائل دعم غير مقروءة.',
        type: 'support',
        view: 'support'
      })}
    </div>
  `;
}

function errorPanel(rows) {
  return `
    <div class="eqsa-card eqsa-panel" style="
      padding: 13px;
      border-radius: 20px;
      min-height: 190px;
    ">
      <div class="eqsa-panel-title" style="margin-bottom:10px;">
        <h3 style="
          font-size: 14px;
          display:flex;
          align-items:center;
          gap:7px;
        ">
          <i class="fas fa-bug" style="color:#DC2626;"></i>
          أخطاء غير محلولة
        </h3>

        ${badge(rows.length, '#DC2626', '#FEF2F2')}
      </div>

      ${compactAlertRows(rows, {
        limit: 4,
        emptyText: 'لا توجد أخطاء غير محلولة.',
        type: 'error',
        view: 'errors'
      })}
    </div>
  `;
}

  function miniErrorList(rows) {
    if (!rows.length) return `<div class="eqsa-empty">لا توجد أخطاء غير محلولة.</div>`;
    return `<div class="eqsa-alert-list">${rows.map((e) => {
      return `<div class="eqsa-alert-item"><div><div class="eqsa-name">${esc(e.business_name || 'مطعم غير محدد')}</div><div class="eqsa-sub">${esc(e.error_code || 'ERROR')} · ${esc(e.endpoint || '—')} · ${esc(fmtDateTime(e.created_at))}</div><div class="eqsa-sub" style="max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(e.error_message || '')}</div></div><button class="eqsa-btn" onclick="EasyQSuperAdmin.showView('errors')"><i class="fas fa-list"></i> عرض</button></div>`;
    }).join('')}</div>`;
  }

  function filteredErrors() {
    const q = (SA.errorsSearch || '').trim().toLowerCase();
    return SA.errorLogs.filter((e) => {
      const resolved = e.is_resolved === true;
      if (SA.errorsStatusFilter === 'unresolved' && resolved) return false;
      if (SA.errorsStatusFilter === 'resolved' && !resolved) return false;
      if (!q) return true;
      const text = [
        e.business_name,
        e.support_ref,
        e.error_code,
        e.error_message,
        e.endpoint,
        e.method,
        e.user_email,
        e.ip_address
      ].join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  function renderErrors() {
  const el = $('eqsaViewErrors');
  if (!el) return;

  const rows = filteredErrors();
const auditRows = Array.isArray(SA.requestStatusAuditLogs)
  ? SA.requestStatusAuditLogs
  : [];

  const totalErrors = SA.errorLogs.length;
  const unresolved = SA.errorLogs.filter((e) => e.is_resolved !== true).length;
  const resolved = SA.errorLogs.filter((e) => e.is_resolved === true).length;

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayErrors = SA.errorLogs.filter((e) => {
    if (!e.created_at) return false;
    return new Date(e.created_at).toISOString().slice(0, 10) === todayKey;
  }).length;

  el.innerHTML = `
    ${pageHead('سجل أخطاء المطاعم', 'متابعة أخطاء النظام حسب المطعم والمصدر ومعالجتها من لوحة السوبر أدمن.', true)}

    <div class="eqsa-grid eqsa-stats" style="margin-bottom:18px;">
      ${stat('إجمالي الأخطاء', totalErrors, 'fa-bug', '#0E146D')}
      ${stat('غير محلولة', unresolved, 'fa-triangle-exclamation', '#DC2626')}
      ${stat('محلولة', resolved, 'fa-check-circle', '#059669')}
      ${stat('أخطاء اليوم', todayErrors, 'fa-calendar-day', '#D97706')}
    </div>

    <div class="eqsa-card eqsa-panel">
      <div class="eqsa-toolbar">
        <input
          id="eqsaErrorSearch"
          class="eqsa-input"
          value="${esc(SA.errorsSearch)}"
          oninput="EasyQSuperAdmin.setErrorSearch(this.value)"
          placeholder="بحث باسم المطعم، رقم الدعم، كود الخطأ، الرسالة، endpoint..."
        >

        <select
          id="eqsaErrorStatus"
          class="eqsa-select"
          onchange="EasyQSuperAdmin.setErrorStatus(this.value)"
        >
          ${option('unresolved','غير محلولة',SA.errorsStatusFilter)}
          ${option('all','كل الأخطاء',SA.errorsStatusFilter)}
          ${option('resolved','محلولة',SA.errorsStatusFilter)}
        </select>

        ${
          SA.errorsSearch
            ? `<button class="eqsa-btn" onclick="EasyQSuperAdmin.clearErrorSearch()">
                <i class="fas fa-times"></i> مسح البحث
              </button>`
            : ''
        }

        <span class="eqsa-badge" style="color:#DC2626;background:#FEF2F2;border-color:#FECACA;">
          النتائج: ${rows.length}
        </span>
      </div>

      ${errorsTable(rows)}

<div style="height:18px;"></div>

${requestStatusAuditPanel(auditRows)}
    </div>
  `;
}

  function errorsTable(rows) {
    if (!rows.length) return `<div class="eqsa-empty">لا توجد أخطاء مطابقة.</div>`;
    return `
      <div class="eqsa-table-wrap">
        <table class="eqsa-table" style="min-width:1180px;">
          <thead><tr><th>#</th><th>المطعم</th><th>رقم الدعم</th><th>كود الخطأ</th><th>الرسالة</th><th>المصدر</th><th>المستخدم</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>${rows.map((e, i) => errorRow(e, i)).join('')}</tbody>
        </table>
      </div>`;
  }

  function requestStatusAuditPanel(rows) {
  return `
    <div class="eqsa-card eqsa-panel">
      <div class="eqsa-panel-title">
        <div>
          <h3 style="margin-bottom:4px;">
            <i class="fas fa-shuffle" style="color:#0E146D;"></i>
            سجل تدقيق حالات الطلبات
          </h3>
          <div class="eqsa-sub">
            يعرض آخر تغييرات حالة الطلبات: من أي حالة إلى أي حالة، وعلى أي طاولة، ومتى حدث التغيير.
          </div>
        </div>

        <span class="eqsa-badge" style="color:#0E146D;background:#EEF2FF;border-color:#C7D2FE;">
          ${rows.length} عملية
        </span>
      </div>

      ${requestStatusAuditTable(rows)}
    </div>
  `;
}

function requestStatusAuditTable(rows) {
  if (!rows.length) {
    return `<div class="eqsa-empty">لا توجد تغييرات حالات مسجلة حتى الآن.</div>`;
  }

  return `
    <div class="eqsa-table-wrap">
      <table class="eqsa-table" style="min-width:1180px;">
        <thead>
          <tr>
            <th>#</th>
            <th>المطعم</th>
            <th>الطلب</th>
            <th>العميل</th>
            <th>الطاولة</th>
            <th>التغيير</th>
            <th>حالة التعيين</th>
            <th>المستخدم</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => requestStatusAuditRow(row, index)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function requestStatusAuditRow(row, index) {
  const oldStatus = row.old_status || '—';
  const newStatus = row.new_status || '—';

  return `
    <tr>
      <td>${index + 1}</td>

      <td>
        <div class="eqsa-name">${esc(row.business_name || '—')}</div>
        <div class="eqsa-sub" style="direction:ltr;text-align:right;">${esc(row.business_id || '')}</div>
      </td>

      <td>
        <div class="eqsa-name" style="direction:ltr;text-align:right;">${esc(row.booking_code || '—')}</div>
        <div class="eqsa-sub">${esc(row.request_source || '—')}</div>
      </td>

      <td>
        <div class="eqsa-name">${esc(row.customer_name_snapshot || '—')}</div>
        <div class="eqsa-sub" style="direction:ltr;text-align:right;">${esc(row.customer_phone_snapshot || '—')}</div>
      </td>

      <td>
        <div class="eqsa-name">${esc(row.table_name || '—')}</div>
        <div class="eqsa-sub" style="direction:ltr;text-align:right;">${esc(row.table_id || '')}</div>
      </td>

      <td>
        ${requestStatusTransitionBadge(oldStatus, newStatus)}
      </td>

      <td>
        ${badge(row.assignment_status || '—', '#64748B', '#F8FAFC')}
      </td>

      <td>
        <div class="eqsa-name">${esc(row.changed_by_role || 'system')}</div>
        <div class="eqsa-sub" style="direction:ltr;text-align:right;">${esc(row.changed_by_user_id || '—')}</div>
      </td>

      <td>${esc(fmtDateTime(row.changed_at))}</td>
    </tr>
  `;
}

function requestStatusTransitionBadge(oldStatus, newStatus) {
  return `
    <span class="eqsa-badge" style="color:#0E146D;background:#EEF2FF;border-color:#C7D2FE;">
      ${esc(oldStatus)} → ${esc(newStatus)}
    </span>
  `;
}

  function errorRow(e, i) {
  const resolved = e.is_resolved === true;
  const id = esc(e.id);
  const businessId = getErrorBusinessId(e);

  return `<tr>
    <td>${i + 1}</td>

    <td>
      <div class="eqsa-name">${esc(e.business_name || '—')}</div>
      <div class="eqsa-sub">${esc(e.city || '')}</div>
    </td>

    <td style="direction:ltr;text-align:right;">
      <span class="eqsa-support-ref">${esc(e.support_ref || '—')}</span>
    </td>

    <td>
      <span class="eqsa-badge" style="color:#DC2626;background:#FEF2F2;border-color:#FECACA;">
        ${esc(e.error_code || 'ERROR')}
      </span>
    </td>

    <td>
      <div class="eqsa-sub" style="max-width:310px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${esc(e.error_message || '—')}
      </div>
    </td>

    <td>
      <div style="direction:ltr;text-align:right;">
        ${esc(e.method || '')} ${esc(e.endpoint || '—')}
      </div>
    </td>

    <td>
      <div class="eqsa-sub">${esc(e.user_email || '—')}</div>
    </td>

    <td>${esc(fmtDateTime(e.created_at))}</td>

    <td>
      ${resolved ? badge('محلول', '#059669', '#ECFDF5') : badge('غير محلول', '#DC2626', '#FEF2F2')}
    </td>

    <td>
      <div class="eqsa-mini-actions">
        ${iconBtn('#0E146D','fa-eye',`EasyQSuperAdmin.viewError('${id}')`,'عرض تفاصيل الخطأ')}

        ${
          businessId
            ? iconBtn('#2563EB','fa-store',`EasyQSuperAdmin.openErrorBusiness('${id}')`,'فتح تفاصيل المطعم')
            : ''
        }

        ${
          businessId || e.support_ref || e.business_name
            ? iconBtn('#7C3AED','fa-filter',`EasyQSuperAdmin.filterErrorsByErrorBusiness('${id}')`,'أخطاء نفس المطعم')
            : ''
        }

        ${!resolved ? iconBtn('#059669','fa-check',`EasyQSuperAdmin.markErrorResolved('${id}')`,'تعليم كمحلول') : ''}
      </div>
    </td>
  </tr>`;
}

  function viewError(errorId) {
  if (!isSuperAdmin()) return;

  const e = SA.errorLogs.find((x) => String(x.id) === String(errorId));

  if (!e) {
    notify('لم يتم العثور على الخطأ', 'error');
    return;
  }

  const businessId = getErrorBusinessId(e);
  const resolved = e.is_resolved === true;

  openModal(`
    <div class="eqsa-modal-head">
      <div>
        <div class="eqsa-name" style="font-size:18px;">
          تفاصيل الخطأ
        </div>
        <div class="eqsa-sub">
          ${esc(e.error_code || 'ERROR')} · ${esc(fmtDateTime(e.created_at))}
        </div>
      </div>

      <button class="eqsa-btn" onclick="EasyQSuperAdmin.closeModal()">
        <i class="fas fa-times"></i> إغلاق
      </button>
    </div>

    <div class="eqsa-modal-body">
      <div class="eqsa-detail-grid">
        ${detail('حالة الخطأ', resolved ? 'محلول' : 'غير محلول')}
        ${detail('معرف الخطأ', e.id)}
        ${detail('المطعم', e.business_name || '—')}
        ${detail('رقم الدعم', e.support_ref || '—')}
        ${detail('معرف المطعم', businessId || '—')}
        ${detail('المدينة', e.city || '—')}
        ${detail('كود الخطأ', e.error_code || 'ERROR')}
        ${detail('وقت الحدوث', fmtDateTime(e.created_at))}
        ${detail('المستخدم', e.user_email || '—')}
        ${detail('User ID', e.user_id || '—')}
        ${detail('Method', e.method || '—')}
        ${detail('Endpoint', e.endpoint || '—')}
        ${detail('IP', e.ip_address || '—')}
        ${detail('تم الحل في', fmtDateTime(e.resolved_at))}
      </div>

      <div class="eqsa-card eqsa-panel" style="box-shadow:none;margin-top:14px;background:#F8FAFC;">
        <div class="eqsa-panel-title">
          <h3>
            <i class="fas fa-message" style="color:#DC2626;margin-left:8px;"></i>
            رسالة الخطأ
          </h3>

          <button class="eqsa-btn" onclick="EasyQSuperAdmin.copyErrorField('${esc(e.id)}','error_message','تم نسخ رسالة الخطأ')">
            <i class="fas fa-copy"></i> نسخ
          </button>
        </div>

        <div style="
          direction:ltr;
          text-align:left;
          background:#FFFFFF;
          border:1px solid #E5E7EB;
          border-radius:16px;
          padding:14px;
          color:#991B1B;
          font-weight:800;
          white-space:pre-wrap;
          word-break:break-word;
          line-height:1.6;
        ">${esc(e.error_message || 'لا توجد رسالة خطأ')}</div>
      </div>

      <div class="eqsa-card eqsa-panel" style="box-shadow:none;margin-top:14px;background:#F8FAFC;">
        <div class="eqsa-panel-title">
          <h3>
            <i class="fas fa-route" style="color:#0E146D;margin-left:8px;"></i>
            مصدر الطلب
          </h3>

          <button class="eqsa-btn" onclick="EasyQSuperAdmin.copyErrorField('${esc(e.id)}','endpoint','تم نسخ Endpoint')">
            <i class="fas fa-copy"></i> نسخ Endpoint
          </button>
        </div>

        <div style="
          direction:ltr;
          text-align:left;
          background:#FFFFFF;
          border:1px solid #E5E7EB;
          border-radius:16px;
          padding:14px;
          font-family:Consolas, monospace;
          font-size:12.5px;
          white-space:pre-wrap;
          word-break:break-word;
          line-height:1.6;
        ">${esc((e.method ? e.method + ' ' : '') + (e.endpoint || '—'))}</div>
      </div>

      <div class="eqsa-card eqsa-panel" style="box-shadow:none;margin-top:14px;background:#0F172A;color:#E5E7EB;">
        <div class="eqsa-panel-title">
          <h3 style="color:#FFFFFF;">
            <i class="fas fa-code" style="color:#F4D28A;margin-left:8px;"></i>
            Stack Trace
          </h3>

          <button class="eqsa-btn" onclick="EasyQSuperAdmin.copyErrorField('${esc(e.id)}','error_stack','تم نسخ Stack Trace')">
            <i class="fas fa-copy"></i> نسخ Stack
          </button>
        </div>

        <pre style="
          margin:0;
          direction:ltr;
          text-align:left;
          white-space:pre-wrap;
          word-break:break-word;
          font-family:Consolas, monospace;
          font-size:12px;
          line-height:1.65;
          color:#E5E7EB;
          max-height:280px;
          overflow:auto;
        ">${esc(e.error_stack || 'لا يوجد Stack Trace')}</pre>
      </div>

      <div class="eqsa-card eqsa-panel" style="box-shadow:none;margin-top:14px;background:#F8FAFC;">
        <div class="eqsa-panel-title">
          <h3>
            <i class="fas fa-desktop" style="color:#64748B;margin-left:8px;"></i>
            معلومات الجهاز والمتصفح
          </h3>

          <button class="eqsa-btn" onclick="EasyQSuperAdmin.copyErrorField('${esc(e.id)}','user_agent','تم نسخ User Agent')">
            <i class="fas fa-copy"></i> نسخ
          </button>
        </div>

        <div style="
          direction:ltr;
          text-align:left;
          background:#FFFFFF;
          border:1px solid #E5E7EB;
          border-radius:16px;
          padding:14px;
          font-family:Consolas, monospace;
          font-size:12px;
          white-space:pre-wrap;
          word-break:break-word;
          line-height:1.6;
        ">${esc(e.user_agent || '—')}</div>
      </div>

      <div class="eqsa-actions" style="margin-top:18px;">
        ${
          e.support_ref
            ? `<button class="eqsa-btn" onclick="EasyQSuperAdmin.copyText('${esc(e.support_ref)}','تم نسخ رقم الدعم')">
                <i class="fas fa-headset"></i> نسخ رقم الدعم
              </button>`
            : ''
        }

        ${
          businessId
            ? `<button class="eqsa-btn" onclick="EasyQSuperAdmin.openErrorBusiness('${esc(e.id)}')">
                <i class="fas fa-store"></i> فتح تفاصيل المطعم
              </button>`
            : ''
        }

        <button class="eqsa-btn" onclick="EasyQSuperAdmin.filterErrorsByErrorBusiness('${esc(e.id)}')">
          <i class="fas fa-filter"></i> أخطاء نفس المطعم
        </button>

        <button class="eqsa-btn" onclick="EasyQSuperAdmin.copyErrorDiagnostic('${esc(e.id)}')">
          <i class="fas fa-clipboard-list"></i> نسخ تقرير التشخيص
        </button>

        ${
          !resolved
            ? `<button class="eqsa-btn primary" onclick="EasyQSuperAdmin.markErrorResolved('${esc(e.id)}')">
                <i class="fas fa-check"></i> تعليم كمحلول
              </button>`
            : ''
        }
      </div>
    </div>
  `);
}

  async function markErrorResolved(errorId) {
    if (!isSuperAdmin() || !errorId) return;
    const ok = confirm('هل تريد تعليم هذا الخطأ كمحلول؟');
    if (!ok) return;
    try {
      await rpc('super_admin_mark_error_resolved', { p_error_id: errorId });
      notify('تم تعليم الخطأ كمحلول', 'success');
      closeModal();
      SA.loaded = false;
      await loadData(true);
      renderErrors();
      updateCounters();
    } catch (err) {
      console.error('[EASY-Q SA] mark error resolved failed:', err);
      notify('تعذر تحديث حالة الخطأ: ' + (err.message || err), 'error');
    }
  }


  function getErrorBusinessId(errorRow) {
  if (!errorRow) return '';

  const directId =
    errorRow.business_id ||
    errorRow.businessId ||
    errorRow.restaurant_id ||
    '';

  if (directId) return String(directId);

  const matched = SA.businesses.find((b) => {
    const bid = String(b.business_id || b.id || '');
    const sameSupportRef =
      errorRow.support_ref &&
      b.support_ref &&
      String(errorRow.support_ref) === String(b.support_ref);

    const sameName =
      errorRow.business_name &&
      (b.business_name || b.name) &&
      String(errorRow.business_name).trim() === String(b.business_name || b.name).trim();

    return bid && (sameSupportRef || sameName);
  });

  return matched ? String(matched.business_id || matched.id || '') : '';
}

function openErrorBusiness(errorId) {
  if (!isSuperAdmin()) return;

  const e = SA.errorLogs.find((x) => String(x.id) === String(errorId));

  if (!e) {
    notify('لم يتم العثور على الخطأ', 'error');
    return;
  }

  const businessId = getErrorBusinessId(e);

  if (!businessId) {
    notify('لا يمكن تحديد المطعم المرتبط بهذا الخطأ', 'error');
    return;
  }

  closeModal();
  viewBusiness(businessId);
}

function filterErrorsByErrorBusiness(errorId) {
  if (!isSuperAdmin()) return;

  const e = SA.errorLogs.find((x) => String(x.id) === String(errorId));

  if (!e) {
    notify('لم يتم العثور على الخطأ', 'error');
    return;
  }

  const businessId = getErrorBusinessId(e);

  const searchValue =
    e.support_ref ||
    e.business_name ||
    businessId ||
    '';

  if (!searchValue) {
    notify('لا توجد قيمة مناسبة لفلترة أخطاء هذا المطعم', 'error');
    return;
  }

  SA.errorsSearch = String(searchValue);
  SA.errorsStatusFilter = 'all';

  closeModal();
  showView('errors');

  setTimeout(() => {
    const input = $('eqsaErrorSearch');
    if (input) input.value = SA.errorsSearch;

    const status = $('eqsaErrorStatus');
    if (status) status.value = SA.errorsStatusFilter;
  }, 50);
}

function clearErrorSearch() {
  SA.errorsSearch = '';
  SA.errorsStatusFilter = 'unresolved';
  renderErrors();
}

function buildErrorDiagnosticReport(errorRow) {
  if (!errorRow) return '';

  const businessId = getErrorBusinessId(errorRow);

  return [
    'EASY-Q Error Diagnostic Report',
    '--------------------------------',
    `Error ID: ${safeText(errorRow.id, '-')}`,
    `Created At: ${safeText(errorRow.created_at, '-')}`,
    `Status: ${errorRow.is_resolved === true ? 'Resolved' : 'Unresolved'}`,
    '',
    'Business',
    '--------------------------------',
    `Business ID: ${safeText(businessId, '-')}`,
    `Business Name: ${safeText(errorRow.business_name, '-')}`,
    `Support Ref: ${safeText(errorRow.support_ref, '-')}`,
    `City: ${safeText(errorRow.city, '-')}`,
    '',
    'Error',
    '--------------------------------',
    `Code: ${safeText(errorRow.error_code, '-')}`,
    `Message: ${safeText(errorRow.error_message, '-')}`,
    '',
    'Request',
    '--------------------------------',
    `Method: ${safeText(errorRow.method, '-')}`,
    `Endpoint: ${safeText(errorRow.endpoint, '-')}`,
    `User Email: ${safeText(errorRow.user_email, '-')}`,
    `User ID: ${safeText(errorRow.user_id, '-')}`,
    '',
    'Environment',
    '--------------------------------',
    `IP Address: ${safeText(errorRow.ip_address, '-')}`,
    `User Agent: ${safeText(errorRow.user_agent, '-')}`,
    '',
    'Stack',
    '--------------------------------',
    safeText(errorRow.error_stack, '-')
  ].join('\n');
}

function copyErrorField(errorId, fieldName, successMessage) {
  const e = SA.errorLogs.find((x) => String(x.id) === String(errorId));

  if (!e) {
    notify('لم يتم العثور على الخطأ', 'error');
    return;
  }

  const value = e[fieldName];

  if (!value) {
    notify('لا توجد بيانات لنسخها', 'error');
    return;
  }

  copyText(String(value), successMessage || 'تم النسخ');
}

function copyErrorDiagnostic(errorId) {
  const e = SA.errorLogs.find((x) => String(x.id) === String(errorId));

  if (!e) {
    notify('لم يتم العثور على الخطأ', 'error');
    return;
  }

  const report = buildErrorDiagnosticReport(e);
  copyText(report, 'تم نسخ تقرير التشخيص');
}

  function renderSupport() {
    const el = $('eqsaViewSupport');
    if (!el) return;
el.innerHTML = `
  ${pageHead('الدعم الحي', 'مركز متابعة محادثات الدعم بين EASY-Q والمطاعم.', false)}

  ${
    SA.supportBusinessFilter
      ? `<div class="eqsa-card eqsa-panel" style="margin-bottom:14px;background:#EEF2FF;border-color:#C7D2FE;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div>
              <div class="eqsa-name">
                <i class="fas fa-filter" style="color:#0E146D;margin-left:8px;"></i>
                عرض جلسات دعم مطعم محدد
              </div>
              <div class="eqsa-sub">${esc(SA.supportBusinessFilterLabel || 'مطعم محدد')}</div>
            </div>

            <button class="eqsa-btn" onclick="EasyQSuperAdmin.clearSupportBusinessFilter()">
              <i class="fas fa-times"></i> عرض كل الجلسات
            </button>
          </div>
        </div>`
      : ''
  }

  <div class="eqsa-card eqsa-panel" style="margin-bottom:14px;">
        <div class="eqsa-toolbar">
          <input id="eqsaSupportCode" class="eqsa-input" style="direction:ltr;flex:0 1 220px;min-width:220px;text-align:center" placeholder="رمز الدعم EQ-123456">
          <input id="eqsaSupportSubject" class="eqsa-input" style="flex:0 1 260px;min-width:220px" value="طلب دعم" placeholder="عنوان الجلسة">
          <button class="eqsa-btn primary" onclick="EasyQSuperAdmin.verifySupportCode()"><i class="fas fa-unlock-alt"></i> فتح جلسة برمز</button>
          <button class="eqsa-btn" onclick="EasyQSuperAdmin.reloadSupport()"><i class="fas fa-sync-alt"></i> تحديث الجلسات</button>
        </div>
      </div>
      <div class="eqsa-support-layout">
        <div class="eqsa-card" style="display:flex;flex-direction:column;min-height:0;overflow:hidden;">
          <div class="eqsa-chat-head">جلسات الدعم</div>
          <div id="eqsaSupportSessions" class="eqsa-support-list">${supportSessionsHtml()}</div>
        </div>
        <div class="eqsa-card eqsa-chat">
          <div id="eqsaSupportHeader" class="eqsa-chat-head">اختر جلسة دعم</div>
          <div id="eqsaSupportMessages" class="eqsa-messages"><div class="eqsa-empty">لا توجد جلسة محددة</div></div>
          <div class="eqsa-reply">
            <input id="eqsaSupportReply" class="eqsa-input" placeholder="اكتب ردك هنا..." onkeydown="if(event.key==='Enter'){event.preventDefault();EasyQSuperAdmin.sendSupportReply();}">
            <button class="eqsa-btn primary" onclick="EasyQSuperAdmin.sendSupportReply()"><i class="fas fa-paper-plane"></i> إرسال</button>
            <button class="eqsa-btn" onclick="EasyQSuperAdmin.closeSupportSession()"><i class="fas fa-lock"></i> إغلاق الجلسة</button>
          </div>
        </div>
      </div>`;
    startSupportListAutoRefresh();
  }

  function supportSessionsHtml() {
  const rows = (SA.supportSessions || []).filter((session) => {
    if (!SA.supportBusinessFilter) return true;

    return String(session.business_id || session.businessId || '') === String(SA.supportBusinessFilter);
  });

  if (!rows.length) {
    return `
      <div class="eqsa-empty">
        ${
          SA.supportBusinessFilter
            ? `لا توجد جلسات دعم للمطعم: ${esc(SA.supportBusinessFilterLabel || '')}`
            : 'لا توجد جلسات دعم.'
        }
      </div>
    `;
  }

  return rows.map((s) => {
    const sid = esc(s.session_id || s.id);
    const unread = n(s.unread_for_super_admin_count || s.unread_count);
    const active = SA.currentSupportSessionId === (s.session_id || s.id) ? 'active' : '';

    return `<div class="eqsa-support-session ${active}" onclick="EasyQSuperAdmin.openSupportSession('${sid}')">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
        <div>
          <div class="eqsa-name">${esc(s.business_name || 'مطعم')}</div>
          <div class="eqsa-sub">${esc(s.subject || 'جلسة دعم')}</div>
        </div>
        ${unread ? badge(unread, '#DC2626', '#FEF2F2') : badge(s.status || 'open', '#64748B', '#F8FAFC')}
      </div>

      <div class="eqsa-sub" style="margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${esc(s.last_message_body || 'لا توجد رسائل بعد')}
      </div>

      <div class="eqsa-sub" style="margin-top:5px;">
        ${esc(fmtDateTime(s.last_message_created_at || s.last_message_at || s.created_at))}
      </div>
    </div>`;
  }).join('');
}

  async function reloadSupport(silent = false) {
    const sessions = await loadSupportSessions();
    const signature = JSON.stringify(sessions.map((s) => ({ id: s.session_id || s.id, status: s.status, last: s.last_message_body, unread: s.unread_for_super_admin_count || s.unread_count })));
    SA.supportSessions = sessions;
    updateCounters();
    const list = $('eqsaSupportSessions');
    if (list && SA.supportSessionsSignature !== signature) {
      SA.supportSessionsSignature = signature;
      list.innerHTML = supportSessionsHtml();
    }
    if (!silent) notify('تم تحديث جلسات الدعم', 'success');
  }

  async function openSupportSession(sessionId) {
    if (!isSuperAdmin() || !sessionId) return;
    SA.currentSupportSessionId = sessionId;
    const header = $('eqsaSupportHeader');
    const messagesEl = $('eqsaSupportMessages');
    if (header) header.innerHTML = 'جاري تحميل الجلسة...';
    if (messagesEl) messagesEl.innerHTML = `<div class="eqsa-empty">جاري تحميل المحادثة...</div>`;
    try {
      try { await rpc('mark_support_session_read', { p_session_id: sessionId }); } catch (_) {}
      const session = SA.supportSessions.find((s) => (s.session_id || s.id) === sessionId);
      if (header) header.innerHTML = `<div class="eqsa-name">${esc(session?.business_name || 'جلسة دعم')}</div><div class="eqsa-sub">${esc(session?.subject || '')} · ${esc(session?.status || 'open')}</div>`;
      await refreshSupportSession(sessionId, true);
      startSupportAutoRefresh();
      await reloadSupport(true);
    } catch (err) {
      console.error('[EASY-Q SA] open support session failed:', err);
      if (messagesEl) messagesEl.innerHTML = `<div class="eqsa-empty" style="color:#DC2626">فشل تحميل المحادثة</div>`;
    }
  }

  async function refreshSupportSession(sessionId, force = false) {
    if (!isSuperAdmin() || !sessionId) return;
    const messagesEl = $('eqsaSupportMessages');
    if (!messagesEl) return;
    const data = await rpc('get_support_session_messages', { p_session_id: sessionId });
    const messages = Array.isArray(data) ? data : [];
    const sig = JSON.stringify(messages.map((m) => ({ id: m.id, body: m.message_body, at: m.created_at, role: m.sender_role })));
    if (!force && sig === SA.supportMessagesSignature) return;
    SA.supportMessagesSignature = sig;
    messagesEl.innerHTML = messagesHtml(messages);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function messagesHtml(messages) {
    if (!messages.length) return `<div class="eqsa-empty">لا توجد رسائل بعد</div>`;
    return messages.map((m) => {
      const isAdmin = m.sender_role === 'super_admin' || m.sender_type === 'super_admin' || m.is_from_super_admin === true;
      return `<div class="eqsa-msg-row ${isAdmin ? 'admin' : 'business'}"><div class="eqsa-msg">${esc(m.message_body || m.body || '')}<span class="eqsa-msg-time">${esc(fmtDateTime(m.created_at))}</span></div></div>`;
    }).join('');
  }

  async function sendSupportReply() {
    if (!isSuperAdmin()) return;
    const sessionId = SA.currentSupportSessionId;
    const input = $('eqsaSupportReply');
    const text = input ? input.value.trim() : '';
    if (!sessionId) { notify('اختر جلسة دعم أولًا', 'error'); return; }
    if (!text) { notify('اكتب الرد أولًا', 'error'); return; }
    try {
      if (input) input.disabled = true;
      await rpc('send_support_message', { p_session_id: sessionId, p_message_body: text, p_is_internal: false });
      if (input) input.value = '';
      await refreshSupportSession(sessionId, true);
      await reloadSupport(true);
    } catch (err) {
      console.error('[EASY-Q SA] send reply failed:', err);
      notify('فشل إرسال الرد: ' + (err.message || err), 'error');
    } finally {
      if (input) { input.disabled = false; input.focus(); }
    }
  }

  async function verifySupportCode() {
    if (!isSuperAdmin()) return;
    const code = $('eqsaSupportCode')?.value.trim();
    const subject = $('eqsaSupportSubject')?.value.trim() || 'طلب دعم';
    if (!code) { notify('أدخل رمز الدعم أولًا', 'error'); return; }
    try {
      const data = await rpc('super_admin_verify_support_code', { p_code: code, p_subject: subject });
      const row = Array.isArray(data) ? data[0] : data;
      if (row && row.success === false) { notify(row.message || 'لم يتم فتح الجلسة', 'error'); return; }
      if ($('eqsaSupportCode')) $('eqsaSupportCode').value = '';
      notify('تم فتح جلسة الدعم بنجاح', 'success');
      await reloadSupport(true);
      if (row?.session_id) await openSupportSession(row.session_id);
    } catch (err) {
      console.error('[EASY-Q SA] verify code failed:', err);
      notify('فشل فتح جلسة الدعم: ' + (err.message || err), 'error');
    }
  }

  async function closeSupportSession() {
    if (!isSuperAdmin()) return;
    const sessionId = SA.currentSupportSessionId;
    if (!sessionId) { notify('اختر جلسة أولًا', 'error'); return; }
    const ok = confirm('هل تريد إغلاق جلسة الدعم؟');
    if (!ok) return;
    try {
      try { await rpc('super_admin_close_support_session', { p_session_id: sessionId }); }
      catch (_) { await rpc('close_support_session', { p_session_id: sessionId }); }
      notify('تم إغلاق الجلسة', 'success');
      await reloadSupport(true);
      await openSupportSession(sessionId);
    } catch (err) {
      console.error('[EASY-Q SA] close session failed:', err);
      notify('تعذر إغلاق الجلسة: ' + (err.message || err), 'error');
    }
  }

  function startSupportAutoRefresh() {
    stopSupportAutoRefresh();
    SA.supportRefreshInterval = setInterval(async () => {
      if (SA.currentView !== 'support' || !SA.currentSupportSessionId) return;
      try { await refreshSupportSession(SA.currentSupportSessionId, false); } catch (err) { console.warn('[EASY-Q SA] chat refresh:', err); }
    }, 7000);
  }

  function stopSupportAutoRefresh() {
    if (SA.supportRefreshInterval) clearInterval(SA.supportRefreshInterval);
    SA.supportRefreshInterval = null;
  }

  function startSupportListAutoRefresh() {
    stopSupportListAutoRefresh();
    SA.supportListRefreshInterval = setInterval(async () => {
      if (SA.currentView !== 'support' && SA.currentView !== 'overview' && SA.currentView !== 'alerts') return;
      try { await reloadSupport(true); } catch (err) { console.warn('[EASY-Q SA] support list refresh:', err); }
    }, 10000);
  }

  function stopSupportListAutoRefresh() {
    if (SA.supportListRefreshInterval) clearInterval(SA.supportListRefreshInterval);
    SA.supportListRefreshInterval = null;
  }

  function renderSettings() {
    const el = $('eqsaViewSettings');
    if (!el) return;
    el.innerHTML = `
      ${pageHead('الإعدادات', 'معلومات تشغيلية وأدوات تشخيص خفيفة للسوبر أدمن.', false)}
      <div class="eqsa-two">
        <div class="eqsa-card eqsa-panel">
          <div class="eqsa-panel-title"><h3>معلومات الحساب</h3></div>
          <div class="eqsa-detail-grid" style="grid-template-columns:1fr;">
            ${detail('الاسم', window.currentUser?.display_name)}
            ${detail('البريد / المستخدم', window.currentUser?.username)}
            ${detail('الدور', window.currentUser?.role)}
            ${detail('آخر تحديث بيانات', SA.lastLoadedAt ? fmtDateTime(SA.lastLoadedAt) : '—')}
          </div>
        </div>
        <div class="eqsa-card eqsa-panel">
          <div class="eqsa-panel-title"><h3>اختبارات سريعة</h3></div>
          <div class="eqsa-alert-list">
            <button class="eqsa-btn" onclick="EasyQSuperAdmin.refresh()"><i class="fas fa-sync-alt"></i> اختبار تحميل البيانات</button>
            <button class="eqsa-btn" onclick="EasyQSuperAdmin.reloadSupport()"><i class="fas fa-headset"></i> اختبار تحميل الدعم</button>
            <button class="eqsa-btn" onclick="console.log(EasyQSuperAdmin.state)"><i class="fas fa-bug"></i> طباعة حالة اللوحة في Console</button>
          </div>
        </div>
      </div>`;
  }

  function detail(label, value) {
    return `<div class="eqsa-detail"><label>${esc(label)}</label><strong>${esc(value)}</strong></div>`;
  }
function businessRecentSupportHtml(businessId) {
  const rows = (SA.supportSessions || [])
    .filter((session) => String(session.business_id || session.businessId || '') === String(businessId))
    .sort((a, b) => new Date(b.last_message_at || b.updated_at || b.created_at || 0) - new Date(a.last_message_at || a.updated_at || a.created_at || 0))
    .slice(0, 3);

  if (!rows.length) {
    return `
      <div class="eqsa-card eqsa-panel" style="box-shadow:none;margin-top:14px;background:#F8FAFC;">
        <div class="eqsa-panel-title">
          <h3><i class="fas fa-headset" style="color:#0E146D;margin-left:8px;"></i> آخر جلسات الدعم</h3>
        </div>
        <div class="eqsa-empty" style="padding:18px;">لا توجد جلسات دعم لهذا المطعم.</div>
      </div>
    `;
  }

  return `
    <div class="eqsa-card eqsa-panel" style="box-shadow:none;margin-top:14px;background:#F8FAFC;">
      <div class="eqsa-panel-title">
        <h3><i class="fas fa-headset" style="color:#0E146D;margin-left:8px;"></i> آخر جلسات الدعم</h3>
        <button class="eqsa-btn" onclick="EasyQSuperAdmin.showView('support')">
          <i class="fas fa-arrow-left"></i> فتح الدعم
        </button>
      </div>

      <div class="eqsa-alert-list">
        ${rows.map((session) => {
          const sessionId = session.session_id || session.id || '';
          const unread = n(session.unread_for_super_admin_count || session.unread_count || 0);

          const statusLabel =
            session.status === 'open' ? 'مفتوحة' :
            session.status === 'pending' ? 'بانتظار الرد' :
            session.status === 'closed' ? 'مغلقة' :
            'غير معروف';

          const statusColor =
            session.status === 'open' ? '#059669' :
            session.status === 'pending' ? '#D97706' :
            session.status === 'closed' ? '#64748B' :
            '#64748B';

          return `
            <div class="eqsa-alert-item">
              <div style="min-width:0;">
                <div class="eqsa-name">${esc(session.subject || 'جلسة دعم')}</div>
                <div class="eqsa-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${esc(session.last_message_body || 'لا توجد رسالة أخيرة')}
                </div>
                <div class="eqsa-sub">
                  آخر نشاط: ${esc(fmtDateTime(session.last_message_at || session.updated_at || session.created_at))}
                </div>
              </div>

              <div class="eqsa-mini-actions">
                ${unread > 0 ? badge(unread > 99 ? '99+' : String(unread), '#DC2626', '#FEF2F2') : ''}
                ${badge(statusLabel, statusColor, '#FFFFFF')}
                ${
                  sessionId
                    ? `<button class="eqsa-icon-btn" style="background:#0E146D;" onclick="EasyQSuperAdmin.openSupportSession('${esc(sessionId)}')" title="فتح الجلسة">
                        <i class="fas fa-comments"></i>
                      </button>`
                    : ''
                }
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

  function businessRecentErrorsHtml(businessId) {
    const rows = SA.errorLogs
      .filter((e) => String(e.business_id) === String(businessId))
      .slice(0, 5);
    if (!rows.length) {
      return `<div class="eqsa-detail" style="margin-top:14px;"><label>آخر أخطاء المطعم</label><strong>لا توجد أخطاء مسجلة</strong></div>`;
    }
    return `<div class="eqsa-detail" style="margin-top:14px;"><label>آخر أخطاء المطعم</label><div class="eqsa-alert-list" style="margin-top:10px;">${rows.map((e) => `<div class="eqsa-alert-item"><div><div class="eqsa-name">${esc(e.error_code || 'ERROR')}</div><div class="eqsa-sub">${esc(e.error_message || '')} · ${esc(fmtDateTime(e.created_at))}</div></div>${e.is_resolved ? badge('محلول', '#059669', '#ECFDF5') : badge('غير محلول', '#DC2626', '#FEF2F2')}</div>`).join('')}</div></div>`;
  }

  function viewBusiness(businessId) {
  if (!isSuperAdmin()) return;

  const b = SA.businesses.find((x) => String(x.business_id || x.id) === String(businessId));

  if (!b) {
    notify('لم يتم العثور على المطعم', 'error');
    return;
  }

  const businessIdValue = b.business_id || b.id;
  const s = statusInfo(b);
  const p = planInfo(b.plan_type || b.plan);

  const usageCards = `
    <div class="eqsa-grid" style="grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-top:14px;">
      ${stat('المستخدمون', `${n(b.current_users_count)}/${b.max_users ?? '∞'}`, 'fa-users', '#2563EB')}
      ${stat('الطاولات', `${n(b.current_tables_count)}/${b.max_tables ?? '∞'}`, 'fa-chair', '#7C3AED')}
      ${stat('المناطق', `${n(b.current_zones_count)}/${b.max_zones ?? '∞'}`, 'fa-map', '#059669')}
      ${stat('الطوابق', `${n(b.current_floors_count)}/${b.max_floors ?? '∞'}`, 'fa-building', '#D97706')}
    </div>
  `;

  openModal(`
    <div class="eqsa-modal-head">
      <div>
        <div class="eqsa-name" style="font-size:18px;">${esc(b.business_name || b.name || 'مطعم بدون اسم')}</div>
        <div class="eqsa-sub">
          ${esc(b.branch_name || b.address || '—')}
          ${b.support_ref ? ' · ' + esc(b.support_ref) : ''}
        </div>
      </div>

      <button class="eqsa-btn" onclick="EasyQSuperAdmin.closeModal()">
        <i class="fas fa-times"></i> إغلاق
      </button>
    </div>

    <div class="eqsa-modal-body">
      <div class="eqsa-detail-grid">
        ${detail('معرف المطعم', businessIdValue)}
        ${detail('رقم الدعم', b.support_ref || '—')}
        ${detail('المدينة', b.city)}
        ${detail('الجوال', b.phone)}
        ${detail('العنوان', b.address)}
        ${detail('الباقة', p.label)}
        ${detail('حالة الاشتراك', s.label)}
        ${detail('السماح بالدخول', b.access_allowed === false ? 'غير مسموح' : 'مسموح')}
        ${detail('تاريخ البداية', fmtDate(b.starts_at || b.start_date))}
        ${detail('تاريخ الانتهاء', fmtDate(b.expires_at || b.end_date))}
        ${detail('الأيام المتبقية', daysLabel(b.days_remaining))}
        ${detail('أولوية الدعم', b.support_priority || '—')}
        ${detail('سبب الإيقاف', b.suspension_reason || '—')}
        ${detail('آخر تحديث اشتراك', fmtDateTime(b.updated_at))}
      </div>

      ${usageCards}

      ${
        typeof businessRecentErrorsHtml === 'function'
          ? businessRecentErrorsHtml(businessIdValue)
          : ''
      }

      ${businessRecentSupportHtml(businessIdValue)}

      <div class="eqsa-actions" style="margin-top:18px;">
        <button class="eqsa-btn primary" onclick="EasyQSuperAdmin.copyBookingLink('${esc(businessIdValue)}')">
          <i class="fas fa-link"></i> نسخ رابط الحجز
        </button>

        ${
          b.support_ref
            ? `<button class="eqsa-btn" onclick="EasyQSuperAdmin.copyText('${esc(b.support_ref)}','تم نسخ رقم الدعم')">
                <i class="fas fa-headset"></i> نسخ رقم الدعم
              </button>`
            : ''
        }

<button class="eqsa-btn" onclick="EasyQSuperAdmin.closeModal(); setTimeout(function(){ EasyQSuperAdmin.manageBusinessStatus('${esc(businessIdValue)}'); }, 80);">
  <i class="fas fa-sliders-h"></i> إدارة الاشتراك/الحالة
</button>

<button class="eqsa-btn" onclick="EasyQSuperAdmin.openBusinessErrors('${esc(businessIdValue)}')">
  <i class="fas fa-bug"></i> أخطاء هذا المطعم
</button>

<button class="eqsa-btn" onclick="EasyQSuperAdmin.openBusinessSupport('${esc(businessIdValue)}')">
  <i class="fas fa-comments"></i> دعم هذا المطعم
</button>
      </div>
    </div>
  `);
}

  function openModal(html) {
    closeModal();
    const back = document.createElement('div');
    back.id = 'eqsaModalBackdrop';
    back.className = 'eqsa-modal-backdrop';
    back.innerHTML = `<div class="eqsa-modal">${html}</div>`;
    document.body.appendChild(back);
  }

  function closeModal() {
    const old = $('eqsaModalBackdrop');
    if (old) old.remove();
  }

  function copyBookingLink(businessId) {
    if (!businessId) return;
    const url = `${window.location.origin}/booking.html?business_id=${encodeURIComponent(businessId)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => notify('تم نسخ رابط الحجز', 'success')).catch(() => fallbackCopy(url));
    } else fallbackCopy(url);
  }


function copyText(text, message) {
  if (!text) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => notify(message || 'تم النسخ', 'success'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    notify('تم نسخ الرابط', 'success');
  }

  function manageBusinessStatus(businessId) {
    if (typeof SA.original.toggleBusinessStatus === 'function') {
      SA.original.toggleBusinessStatus(businessId);
      return;
    }
    if (typeof window.toggleBusinessStatus === 'function' && window.toggleBusinessStatus !== manageBusinessStatus) {
      window.toggleBusinessStatus(businessId);
      return;
    }
    notify('دالة إدارة الحالة غير متوفرة حاليًا', 'error');
  }


  function openBusinessErrors(businessId) {
  if (!isSuperAdmin()) return;

  const b = SA.businesses.find((x) => String(x.business_id || x.id) === String(businessId));

  if (!b) {
    notify('لم يتم العثور على المطعم لفلترة الأخطاء', 'error');
    return;
  }

  const searchValue =
    b.support_ref ||
    b.business_name ||
    b.name ||
    businessId;

  SA.errorsSearch = String(searchValue || '');
  SA.errorsStatusFilter = 'all';

  closeModal();
  showView('errors');

  setTimeout(() => {
    const input = $('eqsaErrorSearch');
    if (input) input.value = SA.errorsSearch;

    const status = $('eqsaErrorStatus');
    if (status) status.value = SA.errorsStatusFilter;
  }, 50);
}

async function openBusinessSupport(businessId) {
  if (!isSuperAdmin()) return;

  const b = SA.businesses.find((x) => String(x.business_id || x.id) === String(businessId));

  if (!b) {
    notify('لم يتم العثور على المطعم لفلترة الدعم', 'error');
    return;
  }

  SA.supportBusinessFilter = String(businessId);
  SA.supportBusinessFilterLabel = b.business_name || b.name || b.support_ref || 'المطعم المحدد';

  closeModal();
  showView('support');

  const firstSession = (SA.supportSessions || []).find((session) => {
    return String(session.business_id || session.businessId || '') === String(businessId);
  });

  if (firstSession) {
    const sessionId = firstSession.session_id || firstSession.id;
    if (sessionId) {
      await openSupportSession(sessionId);
    }
  }
}

function clearSupportBusinessFilter() {
  SA.supportBusinessFilter = '';
  SA.supportBusinessFilterLabel = '';
  SA.currentSupportSessionId = null;
  SA.supportSessionsSignature = '';
  renderSupport();
}

  async function refresh() {
    if (!isSuperAdmin()) return;
    SA.loaded = false;
    await loadData(true);
    showView(SA.currentView || 'overview');
    notify('تم تحديث بيانات لوحة السوبر أدمن', 'success');
  }

  async function init() {
    if (!isSuperAdmin()) return;
    injectStyles();
    document.body.classList.add('logged-in', 'super-admin-mode');
    hideRestaurantUI();
    stopRestaurantIntervals();
    buildShell();
    await loadData(true);
    renderOverview();
    startDataAutoRefresh();
    SA.booted = true;
  }

  function startDataAutoRefresh() {
    if (SA.dataRefreshInterval) clearInterval(SA.dataRefreshInterval);
    SA.dataRefreshInterval = setInterval(async () => {
      if (!isSuperAdmin()) return;
      try {
        await loadData(true);
        if (SA.currentView === 'overview') renderOverview();
        if (SA.currentView === 'alerts') renderAlerts();
        if (SA.currentView === 'errors') renderErrors();
        if (SA.currentView === 'restaurants') renderRestaurants();
        if (SA.currentView === 'subscriptions') renderSubscriptions();
      } catch (err) {
        console.warn('[EASY-Q SA] data auto refresh:', err);
      }
    }, 60000);
  }

  function teardown() {
    stopSupportAutoRefresh();
    stopSupportListAutoRefresh();
    if (SA.dataRefreshInterval) clearInterval(SA.dataRefreshInterval);
    SA.dataRefreshInterval = null;
    const root = $('superAdminDashboard');
    if (root) root.remove();
    closeModal();
    document.body.classList.remove('super-admin-mode');
    restoreRestaurantUI();
    SA.booted = false;
    SA.loaded = false;
    SA.currentSupportSessionId = null;
  }

  function wireOverrides() {
    if (typeof window.showSuperAdminDashboard === 'function' && !SA.original.showSuperAdminDashboard) {
      SA.original.showSuperAdminDashboard = window.showSuperAdminDashboard;
    }
    window.showSuperAdminDashboard = function () {
      init();
    };

    if (typeof window.loadSuperAdminData === 'function' && !SA.original.loadSuperAdminData) {
      SA.original.loadSuperAdminData = window.loadSuperAdminData;
    }
    window.loadSuperAdminData = async function () {
      await refresh();
    };

    if (typeof window.toggleBusinessStatus === 'function' && !SA.original.toggleBusinessStatus) {
      SA.original.toggleBusinessStatus = window.toggleBusinessStatus;
    }
    window.toggleBusinessStatus = function (businessId) {
      manageBusinessStatus(businessId);
    };

    if (typeof window.viewBusinessDetails === 'function' && !SA.original.viewBusinessDetails) {
      SA.original.viewBusinessDetails = window.viewBusinessDetails;
    }
    window.viewBusinessDetails = function (businessId) {
      viewBusiness(businessId);
    };

    if (typeof window.logoutAndClean === 'function' && !SA.original.logoutAndClean) {
      SA.original.logoutAndClean = window.logoutAndClean;
      window.logoutAndClean = async function () {
        try { teardown(); } catch (_) {}
        return SA.original.logoutAndClean.apply(this, arguments);
      };
    }

    // Global wrappers expected by older HTML
    window.setupSuperAdminNavigation = function () { setupNav(); };
    window.renderSuperAdminSupportCodeBox = function () { if (SA.currentView === 'support') renderSupport(); };
    window.verifySuperAdminSupportCodeFromUI = verifySupportCode;
    window.loadSuperAdminSupportSessions = async function () { await reloadSupport(); };
    window.openSuperAdminSupportSession = openSupportSession;
    window.sendSuperAdminSupportReply = sendSupportReply;
    window.closeSuperAdminSupportSession = closeSupportSession;
    window.startSuperAdminSupportAutoRefresh = startSupportAutoRefresh;
    window.stopSuperAdminSupportAutoRefresh = stopSupportAutoRefresh;
    window.refreshSuperAdminSupportSessionSilently = async function (sessionId) { await refreshSupportSession(sessionId || SA.currentSupportSessionId, false); };
    window.refreshSuperAdminSupportSessionsListSilently = async function () { await reloadSupport(true); };
    window.exportBusinessSubscriptionPdf = window.exportBusinessSubscriptionPdf || function () { notify('تصدير PDF غير مفعّل بعد', 'error'); };
  }

  window.EasyQSuperAdmin = {
    version: SA.version,
    state: SA,
    init,
    teardown,
    refresh,
    showView,
    setRestaurantSearch(value) { SA.restaurantsSearch = value || ''; renderRestaurants(); },
    setRestaurantStatus(value) { SA.restaurantsStatusFilter = value || 'all'; renderRestaurants(); },
    setRestaurantPlan(value) { SA.restaurantsPlanFilter = value || 'all'; renderRestaurants(); },
    setErrorSearch(value) { SA.errorsSearch = value || ''; renderErrors(); },
    setErrorStatus(value) { SA.errorsStatusFilter = value || 'unresolved'; renderErrors(); },
    renderErrors,
    viewError,
    markErrorResolved,
    openErrorBusiness,
    filterErrorsByErrorBusiness,
    clearErrorSearch,
    copyErrorField,
    copyErrorDiagnostic,
    viewBusiness,
    copyBookingLink,
    copyText,
    manageBusinessStatus,
    openBusinessErrors,
    openBusinessSupport,
    clearSupportBusinessFilter,
    reloadSupport,
    openSupportSession,
    sendSupportReply,
    verifySupportCode,
    closeSupportSession,
    openAdminNoticeComposer,
    closeAdminNoticeComposer,
    sendAdminNotificationFromUI,
    showAdminNotificationReadDetails,
    closeAdminNotificationDetailsModal,
    closeModal
  };

  function boot() {
    wireOverrides();
    if (isSuperAdmin()) {
      setTimeout(() => init(), 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
