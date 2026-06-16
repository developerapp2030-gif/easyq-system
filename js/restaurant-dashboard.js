/* ============================================================
   EASY-Q RESTAURANT DASHBOARD
   ملف مستقل للوحة مراقبة مسؤول المطعم
   الربط لاحقًا: <script src="js/restaurant-dashboard.js"></script>
   ============================================================ */

(function () {
  'use strict';

  const EQD = {
    activeView: 'overview',
    loadedAt: null,
    refreshTimer: null,
    lastData: null,
    autoRefreshMs: 20000
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function esc(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value)
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

  function pct(part, total) {
    const p = n(part);
    const t = n(total);
    if (!t) return 0;
    return Math.max(0, Math.min(100, Math.round((p / t) * 100)));
  }

  function todayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function todayEnd() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function isToday(value) {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    return d >= todayStart() && d <= todayEnd();
  }

  function minutesBetween(start, end) {
    if (!start) return 0;
    const a = new Date(start).getTime();
    const b = end ? new Date(end).getTime() : Date.now();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
    return Math.floor((b - a) / 60000);
  }

  function fmtMinutes(mins) {
    const m = Math.max(0, Math.round(n(mins)));
    if (m < 60) return `${m} د`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}س ${r}د` : `${h}س`;
  }

  function fmtDateTime(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });
    } catch (_) {
      return '—';
    }
  }

  function fmtTime(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return '—';
    }
  }

  function statusArabic(status) {
    const map = {
      waiting: 'انتظار',
      offered: 'جاهز/معيّن',
      reserved: 'محجوز',
      occupied: 'مشغول',
      cleaning: 'تنظيف',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      expired: 'منتهي',
      no_show: 'لم يحضر',
      available: 'متاحة',
      disabled: 'مغلقة',
      pending: 'معلقة'
    };
    return map[status] || status || '—';
  }

  function statusClass(status) {
    if (status === 'waiting') return 'wait';
    if (status === 'offered' || status === 'reserved') return 'warn';
    if (status === 'occupied' || status === 'completed') return 'ok';
    if (status === 'cleaning') return 'info';
    if (status === 'cancelled' || status === 'expired' || status === 'no_show') return 'bad';
    return 'muted';
  }

  function getBusinessId() {
    return window.currentUser?.business_id || window.BUSINESS_ID || null;
  }

  function getActiveTables() {
    const floors = Array.isArray(window.globalActiveFloors) ? window.globalActiveFloors.map(String) : [];
    const zones = Array.isArray(window.globalActiveZones) ? window.globalActiveZones : [];
    const tables = Array.isArray(window.floorData) ? window.floorData : [];

    return tables.filter((table) => {
      const floorOk = floors.length === 0 || floors.includes(String(table.floor_number));
      const zoneOk = zones.length === 0 || zones.includes(table.zone_name);
      return floorOk && zoneOk;
    });
  }

  function getWaitingRows() {
    const rows = Array.isArray(window.waitingData) ? window.waitingData : [];
    return rows.filter((r) => r.status === 'waiting' || r.status === 'offered');
  }

  function getExpiredRows() {
    return Array.isArray(window.expiredData) ? window.expiredData : [];
  }

  function canOpenDashboard() {
    if (!window.currentUser) return false;
    if (window.currentUser.role === 'super_admin') return false;
    if (typeof window.canDo !== 'function') return true;
    return window.canDo('view_reports') || window.canDo('manage_queue') || window.canDo('assign_tables') || window.canDo('manage_tables');
  }

  function ensureStyles() {
    if ($('eqRestaurantDashboardStyles')) return;

    const style = document.createElement('style');
    style.id = 'eqRestaurantDashboardStyles';
    style.textContent = `
      .eqrd-page {
        direction: rtl;
        font-family: inherit;
        color: #111827;
        padding: 18px;
        background: #F5F7FF;
        min-height: calc(100vh - 120px);
      }

      .eqrd-hero {
        background: linear-gradient(135deg, #070219 0%, #060427 52%, #0E146D 100%);
        color: #FFFFFF;
        border-radius: 24px;
        padding: 20px;
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
        gap: 18px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
        overflow: hidden;
        position: relative;
      }

      .eqrd-hero::after {
        content: '';
        position: absolute;
        width: 260px;
        height: 260px;
        border-radius: 50%;
        left: -90px;
        top: -110px;
        background: rgba(221, 231, 255, 0.11);
        pointer-events: none;
      }

      .eqrd-hero h2 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 1000;
        letter-spacing: -0.5px;
      }

      .eqrd-hero p {
        margin: 0;
        color: rgba(255,255,255,0.72);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.8;
      }

      .eqrd-hero-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 16px;
      }

      .eqrd-btn {
        border: none;
        min-height: 40px;
        padding: 0 14px;
        border-radius: 13px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        font-weight: 1000;
        font-size: 12px;
        transition: transform .16s ease, opacity .16s ease, background .16s ease;
      }

      .eqrd-btn:hover { transform: translateY(-1px); }
      .eqrd-btn.primary { background: #FFFFFF; color: #0E146D; }
      .eqrd-btn.ghost { background: rgba(255,255,255,0.12); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.16); }
      .eqrd-btn.dark { background: #0E146D; color: #FFFFFF; }
      .eqrd-btn.light { background: #EEF2FF; color: #0E146D; }
      .eqrd-btn:disabled { opacity: .65; cursor: not-allowed; transform: none; }

      .eqrd-health-card {
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 20px;
        padding: 15px;
        position: relative;
        z-index: 1;
      }

      .eqrd-health-title {
        font-size: 13px;
        color: rgba(255,255,255,0.75);
        font-weight: 900;
        margin-bottom: 8px;
      }

      .eqrd-health-value {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 28px;
        font-weight: 1000;
      }

      .eqrd-health-dot {
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #10B981;
        box-shadow: 0 0 0 7px rgba(16,185,129,0.14);
      }

      .eqrd-health-dot.warn { background: #F59E0B; box-shadow: 0 0 0 7px rgba(245,158,11,0.14); }
      .eqrd-health-dot.bad { background: #EF4444; box-shadow: 0 0 0 7px rgba(239,68,68,0.14); }

      .eqrd-tabs {
        margin-top: 14px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .eqrd-tab {
        border: 1px solid #E5E7EB;
        background: #FFFFFF;
        color: #64748B;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 1000;
        font-size: 12px;
      }

      .eqrd-tab.active {
        background: #0E146D;
        color: #FFFFFF;
        border-color: #0E146D;
      }

      .eqrd-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .eqrd-card {
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
        border-radius: 20px;
        padding: 15px;
        box-shadow: 0 10px 26px rgba(15,23,42,0.055);
        min-width: 0;
      }

      .eqrd-card.soft { background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%); }
      .eqrd-card.wide { grid-column: span 2; }
      .eqrd-card.full { grid-column: 1 / -1; }

      .eqrd-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      .eqrd-card-title {
        font-size: 13px;
        font-weight: 1000;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .eqrd-card-title i { color: #0E146D; }

      .eqrd-card-sub {
        font-size: 11px;
        color: #64748B;
        font-weight: 800;
        margin-top: 4px;
      }

      .eqrd-kpi-value {
        font-size: 30px;
        font-weight: 1000;
        color: #0F172A;
        line-height: 1;
      }

      .eqrd-kpi-label {
        margin-top: 8px;
        font-size: 12px;
        color: #64748B;
        font-weight: 800;
        line-height: 1.5;
      }

      .eqrd-mini-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
      }

      .eqrd-mini-stat {
        background: #F8FAFC;
        border: 1px solid #EEF2F7;
        border-radius: 15px;
        padding: 10px;
      }

      .eqrd-mini-num {
        font-size: 20px;
        font-weight: 1000;
        color: #111827;
      }

      .eqrd-mini-label {
        font-size: 11px;
        font-weight: 800;
        color: #64748B;
        margin-top: 3px;
      }

      .eqrd-progress {
        height: 9px;
        border-radius: 999px;
        background: #EEF2FF;
        overflow: hidden;
        margin-top: 12px;
      }

      .eqrd-progress > span {
        display: block;
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #0E146D, #3B82F6);
        border-radius: inherit;
      }

      .eqrd-list {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .eqrd-list-item {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        padding: 10px;
        background: #F8FAFC;
        border: 1px solid #EEF2F7;
        border-radius: 16px;
      }

      .eqrd-icon-box {
        width: 38px;
        height: 38px;
        border-radius: 13px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #EEF2FF;
        color: #0E146D;
        flex-shrink: 0;
      }

      .eqrd-list-title {
        font-size: 12.5px;
        font-weight: 1000;
        color: #111827;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .eqrd-list-sub {
        font-size: 11px;
        font-weight: 800;
        color: #64748B;
        margin-top: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .eqrd-badge {
        min-height: 25px;
        padding: 0 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 1000;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
      }

      .eqrd-badge.ok { background: #ECFDF5; color: #047857; }
      .eqrd-badge.warn { background: #FFFBEB; color: #B45309; }
      .eqrd-badge.bad { background: #FEF2F2; color: #B91C1C; }
      .eqrd-badge.info { background: #EFF6FF; color: #1D4ED8; }
      .eqrd-badge.wait { background: #EEF2FF; color: #0E146D; }
      .eqrd-badge.muted { background: #F3F4F6; color: #6B7280; }

      .eqrd-table-wrap {
        overflow: auto;
        border: 1px solid #EEF2F7;
        border-radius: 16px;
      }

      .eqrd-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
      }

      .eqrd-table th,
      .eqrd-table td {
        padding: 12px;
        border-bottom: 1px solid #EEF2F7;
        text-align: right;
        font-size: 12px;
        font-weight: 800;
      }

      .eqrd-table th {
        background: #F8FAFC;
        color: #64748B;
        font-weight: 1000;
        position: sticky;
        top: 0;
      }

      .eqrd-table tr:last-child td { border-bottom: none; }

      .eqrd-alert {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 11px;
        border-radius: 16px;
        border: 1px solid #EEF2F7;
        background: #FFFFFF;
      }

      .eqrd-alert.warn { background: #FFFBEB; border-color: #FDE68A; }
      .eqrd-alert.bad { background: #FEF2F2; border-color: #FECACA; }
      .eqrd-alert.ok { background: #ECFDF5; border-color: #A7F3D0; }
      .eqrd-alert i { margin-top: 2px; }
      .eqrd-alert.warn i { color: #D97706; }
      .eqrd-alert.bad i { color: #DC2626; }
      .eqrd-alert.ok i { color: #059669; }

      .eqrd-empty {
        padding: 20px;
        text-align: center;
        color: #64748B;
        font-weight: 900;
        background: #F8FAFC;
        border: 1px dashed #CBD5E1;
        border-radius: 16px;
      }

      .eqrd-loader {
        min-height: 260px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 12px;
        color: #64748B;
        font-weight: 1000;
      }

      .eqrd-spinner {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 4px solid rgba(14,20,109,0.13);
        border-top-color: #0E146D;
        animation: eqrdSpin .8s linear infinite;
      }

      @keyframes eqrdSpin { to { transform: rotate(360deg); } }

      @media (max-width: 1180px) {
        .eqrd-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .eqrd-hero { grid-template-columns: 1fr; }
      }

      @media (max-width: 720px) {
        .eqrd-page { padding: 12px; }
        .eqrd-grid { grid-template-columns: 1fr; }
        .eqrd-card.wide { grid-column: span 1; }
        .eqrd-hero h2 { font-size: 20px; }
      }
    `;

    document.head.appendChild(style);
  }

  function openPanel(title, subtitle, bodyHtml) {
    ensureStyles();

    if (typeof window.openFullPagePanel === 'function') {
      window.openFullPagePanel(title, subtitle, bodyHtml);
      return;
    }

    let fallback = $('eqrdFallbackPanel');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'eqrdFallbackPanel';
      fallback.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#F5F7FF;overflow:auto;direction:rtl;';
      document.body.appendChild(fallback);
    }

    fallback.innerHTML = `
      <div style="padding:14px;background:#070219;color:white;display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div style="font-weight:1000;font-size:18px;">${esc(title)}</div>
          <div style="font-weight:700;font-size:12px;opacity:.72;margin-top:4px;">${esc(subtitle)}</div>
        </div>
        <button onclick="document.getElementById('eqrdFallbackPanel').remove()" style="width:38px;height:38px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:white;font-size:20px;cursor:pointer;">×</button>
      </div>
      ${bodyHtml}
    `;
  }

  function setActiveSidebar(view) {
    $$('.sidebar .sub-menu-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-view') === `dashboard-${view}`);
    });

    const dashboardParent = document.querySelector('.main-menu-item[data-menu="dashboard"]');
    if (dashboardParent) dashboardParent.classList.add('open', 'active');

    const dashboardSub = document.querySelector('.sub-menu[data-submenu="dashboard"]');
    if (dashboardSub) dashboardSub.classList.add('open');
  }

  function loadingHtml() {
    return `
      <div class="eqrd-page" id="eqrdDashboard">
        <div class="eqrd-loader">
          <div class="eqrd-spinner"></div>
          <div>جاري تجهيز لوحة المراقبة...</div>
        </div>
      </div>
    `;
  }

  async function safeQuery(fn, fallback) {
    try {
      return await fn();
    } catch (err) {
      console.warn('[EASY-Q Dashboard] query failed:', err);
      return fallback;
    }
  }

  async function loadDashboardData() {
    const businessId = getBusinessId();

    if (!businessId) {
      throw new Error('لا يوجد business_id للمستخدم الحالي');
    }

    const tablesFromMemory = getActiveTables();
    const tableIds = tablesFromMemory.map((t) => t.id).filter(Boolean);

    const todayIso = todayStart().toISOString();

    const requestsTodayPromise = safeQuery(async () => {
      const { data, error } = await window.supabase
        .from('table_requests')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', todayIso)
        .order('created_at', { ascending: false })
        .limit(700);

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }, []);

    const recentRequestsPromise = safeQuery(async () => {
      const { data, error } = await window.supabase
        .from('table_requests')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }, []);

    const assignmentsTodayPromise = safeQuery(async () => {
      if (!tableIds.length) return [];

      const { data, error } = await window.supabase
        .from('table_assignments')
        .select('*')
        .in('table_id', tableIds)
        .gte('assigned_at', todayIso)
        .order('assigned_at', { ascending: false })
        .limit(700);

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }, []);

    const licenseUsagePromise = safeQuery(async () => {
      if (typeof window.supabase?.rpc !== 'function') return null;
      const { data, error } = await window.supabase.rpc('get_my_license_usage');
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    }, null);

    const [requestsToday, recentRequests, assignmentsToday, licenseUsage] = await Promise.all([
      requestsTodayPromise,
      recentRequestsPromise,
      assignmentsTodayPromise,
      licenseUsagePromise
    ]);

    const tables = getActiveTables();
    const waiting = getWaitingRows();
    const expired = getExpiredRows();

    const result = buildDashboardModel({
      businessId,
      tables,
      waiting,
      expired,
      requestsToday,
      recentRequests,
      assignmentsToday,
      licenseUsage
    });

    EQD.loadedAt = new Date();
    EQD.lastData = result;
    return result;
  }

  function requestDoneAt(req) {
    return req.offered_at || req.seated_at || req.completed_at || req.cancelled_at || req.expired_at || req.updated_at || null;
  }

  function sourceLabel(source) {
    if (source === 'walk_in') return 'داخلي';
    if (source === 'booking_page') return 'رابط الحجز';
    if (source === 'restored') return 'مستعاد';
    if (source === 'whatsapp') return 'واتساب';
    return source || 'غير محدد';
  }

  function getCustomerName(req) {
    return req.customer_name || req.customer_name_snapshot || req.name || req.customer_display_name || 'عميل';
  }

  function buildDashboardModel(input) {
    const tables = input.tables || [];
    const waiting = input.waiting || [];
    const expired = input.expired || [];
    const requestsToday = input.requestsToday || [];
    const recentRequests = input.recentRequests || [];
    const assignmentsToday = input.assignmentsToday || [];

    const tableCounts = {
      total: tables.length,
      available: tables.filter((t) => (t.status || 'available') === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
      disabled: tables.filter((t) => t.status === 'disabled').length,
      pending: tables.filter((t) => t.status === 'pending').length
    };

    tableCounts.busy = tableCounts.occupied + tableCounts.reserved + tableCounts.cleaning + tableCounts.pending;
    tableCounts.usable = Math.max(0, tableCounts.total - tableCounts.disabled);
    tableCounts.utilization = pct(tableCounts.occupied, tableCounts.usable);
    tableCounts.busyRate = pct(tableCounts.busy, tableCounts.usable);

    const waitingOnly = waiting.filter((r) => r.status === 'waiting');
    const offeredNow = waiting.filter((r) => r.status === 'offered');

    const readyNow = waitingOnly.filter((row) => {
      if (typeof window.hasMatchingAvailableTable === 'function') {
        try { return window.hasMatchingAvailableTable(row); } catch (_) { return false; }
      }
      return tableCounts.available > 0;
    });

    const waitingMinutes = waitingOnly.map((r) => minutesBetween(r.created_at));
    const avgCurrentWait = waitingMinutes.length
      ? Math.round(waitingMinutes.reduce((a, b) => a + b, 0) / waitingMinutes.length)
      : 0;

    const longestWait = waitingMinutes.length ? Math.max(...waitingMinutes) : 0;

    const avgTodayWaitRows = requestsToday
      .filter((r) => r.created_at && requestDoneAt(r))
      .map((r) => minutesBetween(r.created_at, requestDoneAt(r)))
      .filter((m) => m >= 0);

    const avgTodayWait = avgTodayWaitRows.length
      ? Math.round(avgTodayWaitRows.reduce((a, b) => a + b, 0) / avgTodayWaitRows.length)
      : 0;

    const todayCounts = {
      total: requestsToday.length,
      waiting: requestsToday.filter((r) => r.status === 'waiting').length,
      offered: requestsToday.filter((r) => r.status === 'offered' || r.status === 'reserved').length,
      occupied: requestsToday.filter((r) => r.status === 'occupied').length,
      completed: requestsToday.filter((r) => r.status === 'completed' || r.status === 'cleaning').length,
      cancelled: requestsToday.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length,
      expired: requestsToday.filter((r) => r.status === 'expired').length,
      walkIn: requestsToday.filter((r) => r.source === 'walk_in').length,
      online: requestsToday.filter((r) => r.source !== 'walk_in').length,
      assigned: assignmentsToday.length
    };

    const serviceDone = todayCounts.completed + todayCounts.occupied + todayCounts.offered;
    todayCounts.conversion = pct(serviceDone, todayCounts.total);
    todayCounts.loss = todayCounts.cancelled + todayCounts.expired;
    todayCounts.lossRate = pct(todayCounts.loss, todayCounts.total);

    const zones = buildZoneStats(tables, waiting, requestsToday);
    const floors = buildFloorStats(tables);
    const alerts = buildAlerts({ tableCounts, waitingOnly, offeredNow, readyNow, todayCounts, longestWait, avgCurrentWait, expired });
    const recommendations = buildRecommendations({ tableCounts, waitingOnly, offeredNow, readyNow, todayCounts, alerts });
    const priorities = buildPriorities({ waitingOnly, readyNow, tables });

    const health = buildHealth({ tableCounts, todayCounts, alerts, longestWait });

    return {
      businessId: input.businessId,
      tableCounts,
      todayCounts,
      avgCurrentWait,
      avgTodayWait,
      longestWait,
      waitingOnly,
      offeredNow,
      readyNow,
      expired,
      zones,
      floors,
      alerts,
      recommendations,
      priorities,
      recentRequests,
      assignmentsToday,
      licenseUsage: input.licenseUsage,
      health
    };
  }

  function buildZoneStats(tables, waiting, requestsToday) {
    const zoneMap = {};

    function ensure(zone) {
      const key = zone || 'بدون منطقة';
      if (!zoneMap[key]) {
        zoneMap[key] = {
          zone: key,
          totalTables: 0,
          available: 0,
          occupied: 0,
          reserved: 0,
          cleaning: 0,
          waiting: 0,
          today: 0,
          avgWait: 0,
          waitSamples: []
        };
      }
      return zoneMap[key];
    }

    tables.forEach((t) => {
      const z = ensure(t.zone_name || 'بدون منطقة');
      z.totalTables += 1;
      if ((t.status || 'available') === 'available') z.available += 1;
      if (t.status === 'occupied') z.occupied += 1;
      if (t.status === 'reserved') z.reserved += 1;
      if (t.status === 'cleaning') z.cleaning += 1;
    });

    waiting.forEach((w) => {
      const z = ensure(w.zone_name || 'بدون منطقة');
      if (w.status === 'waiting' || w.status === 'offered') z.waiting += 1;
    });

    requestsToday.forEach((r) => {
      const z = ensure(r.zone_name || 'بدون منطقة');
      z.today += 1;
      if (r.created_at && requestDoneAt(r)) {
        z.waitSamples.push(minutesBetween(r.created_at, requestDoneAt(r)));
      }
    });

    return Object.values(zoneMap)
      .map((z) => ({
        ...z,
        utilization: pct(z.occupied, z.totalTables),
        avgWait: z.waitSamples.length
          ? Math.round(z.waitSamples.reduce((a, b) => a + b, 0) / z.waitSamples.length)
          : 0
      }))
      .sort((a, b) => (b.waiting + b.occupied + b.today) - (a.waiting + a.occupied + a.today));
  }

  function buildFloorStats(tables) {
    const map = {};
    tables.forEach((t) => {
      const key = String(t.floor_number || '1');
      if (!map[key]) {
        map[key] = { floor: key, total: 0, available: 0, occupied: 0, reserved: 0, cleaning: 0, disabled: 0 };
      }
      const row = map[key];
      row.total += 1;
      if ((t.status || 'available') === 'available') row.available += 1;
      if (t.status === 'occupied') row.occupied += 1;
      if (t.status === 'reserved') row.reserved += 1;
      if (t.status === 'cleaning') row.cleaning += 1;
      if (t.status === 'disabled') row.disabled += 1;
    });

    return Object.values(map)
      .map((f) => ({ ...f, utilization: pct(f.occupied, Math.max(0, f.total - f.disabled)) }))
      .sort((a, b) => Number(a.floor) - Number(b.floor));
  }

  function buildAlerts({ tableCounts, waitingOnly, offeredNow, readyNow, todayCounts, longestWait, avgCurrentWait, expired }) {
    const alerts = [];
    const reservationHold = n(window.settings?.reservation_hold_minutes || 10);
    const waitWarning = Math.max(15, reservationHold * 2);

    if (waitingOnly.length > 0 && tableCounts.available === 0) {
      alerts.push({ type: 'bad', icon: 'fa-chair', title: 'لا توجد طاولات متاحة الآن', text: `يوجد ${waitingOnly.length} عميل في الانتظار بدون طاولات متاحة.` });
    }

    if (readyNow.length > 0) {
      alerts.push({ type: 'ok', icon: 'fa-bolt', title: 'عملاء جاهزون للتعيين', text: `${readyNow.length} عميل لديهم طاولة مناسبة متاحة الآن.` });
    }

    if (offeredNow.length > 0) {
      alerts.push({ type: 'warn', icon: 'fa-hourglass-half', title: 'عملاء تم تعيينهم وينتظرون الجلوس', text: `${offeredNow.length} عميل في حالة جاهز/معيّن، راقب وقت الحجز.` });
    }

    if (longestWait >= waitWarning) {
      alerts.push({ type: 'warn', icon: 'fa-clock', title: 'انتظار طويل', text: `أطول انتظار حاليًا ${fmtMinutes(longestWait)}، والمتوسط ${fmtMinutes(avgCurrentWait)}.` });
    }

    if (todayCounts.lossRate >= 25 && todayCounts.total >= 4) {
      alerts.push({ type: 'bad', icon: 'fa-user-slash', title: 'نسبة فقد عالية اليوم', text: `الملغي/المنتهي ${todayCounts.loss} من ${todayCounts.total} طلب (${todayCounts.lossRate}%).` });
    }

    if (expired.length > 0) {
      alerts.push({ type: 'warn', icon: 'fa-list', title: 'قائمة منتهية تحتاج مراجعة', text: `يوجد ${expired.length} عنصر في قائمة المنتهية حسب البيانات المحملة.` });
    }

    if (alerts.length === 0) {
      alerts.push({ type: 'ok', icon: 'fa-circle-check', title: 'الوضع مستقر', text: 'لا توجد مؤشرات حرجة الآن، العمل اليومي يبدو تحت السيطرة.' });
    }

    return alerts;
  }

  function buildRecommendations({ tableCounts, waitingOnly, offeredNow, readyNow, todayCounts, alerts }) {
    const out = [];

    if (readyNow.length > 0) {
      out.push('ابدأ بتعيين العملاء الجاهزين لأن لديهم طاولات مناسبة متاحة الآن.');
    }

    if (offeredNow.length > 0) {
      out.push('راجع العملاء المعيّنين على الطاولات البرتقالية قبل انتهاء مهلة الحجز.');
    }

    if (waitingOnly.length > 0 && tableCounts.cleaning > 0) {
      out.push('سرّع إنهاء طاولات التنظيف لأن هناك عملاء في الانتظار.');
    }

    if (todayCounts.lossRate >= 20 && todayCounts.total >= 5) {
      out.push('راجع سبب الطلبات الملغية أو المنتهية اليوم، فقد تكون مدة الانتظار أو التواصل غير مناسب.');
    }

    if (tableCounts.utilization >= 85 && waitingOnly.length > 0) {
      out.push('الضغط مرتفع: فكر في تقليل مدة حجز الطاولة أو إعادة توزيع الطاولات حسب المناطق.');
    }

    if (alerts.length === 1 && alerts[0].type === 'ok') {
      out.push('استمر بالمراقبة الدورية، وركز على الحفاظ على سرعة تعيين العملاء الجاهزين.');
    }

    return out.slice(0, 5);
  }

  function buildPriorities({ waitingOnly, readyNow, tables }) {
    const readyIds = new Set(readyNow.map((r) => r.request_id || r.id));

    const waitingPriority = waitingOnly
      .slice()
      .sort((a, b) => {
        const ar = readyIds.has(a.request_id || a.id) ? 0 : 1;
        const br = readyIds.has(b.request_id || b.id) ? 0 : 1;
        if (ar !== br) return ar - br;
        return (a.queue_position || 9999) - (b.queue_position || 9999);
      })
      .slice(0, 6);

    const occupiedTables = tables
      .filter((t) => t.status === 'occupied')
      .map((t) => ({
        ...t,
        elapsed: minutesBetween(t.occupied_at || t.seated_at || t.updated_at || t.created_at)
      }))
      .sort((a, b) => b.elapsed - a.elapsed)
      .slice(0, 6);

    return { waitingPriority, occupiedTables, readyIds };
  }

  function buildHealth({ tableCounts, todayCounts, alerts, longestWait }) {
    const badAlerts = alerts.filter((a) => a.type === 'bad').length;
    const warnAlerts = alerts.filter((a) => a.type === 'warn').length;

    if (badAlerts > 0 || longestWait >= 45) {
      return { label: 'ضغط عالي', className: 'bad', text: 'يوجد مؤشر يحتاج تدخل سريع من مسؤول المطعم.' };
    }

    if (warnAlerts > 0 || tableCounts.busyRate >= 80 || todayCounts.lossRate >= 15) {
      return { label: 'تحت المراقبة', className: 'warn', text: 'العمل جيد لكن هناك نقاط تحتاج متابعة خلال الوردية.' };
    }

    return { label: 'مستقر', className: 'ok', text: 'الوضع الحالي مستقر ولا توجد مؤشرات حرجة.' };
  }

  function renderDashboard(data, view) {
    const title = view === 'today' ? 'ملخص اليوم' : 'لوحة مراقبة المطعم';
    const subtitle = view === 'today'
      ? 'مؤشرات العمل اليومي، الطلبات، الطاولات، والتنبيهات التشغيلية'
      : 'نظرة شاملة تساعد مسؤول المطعم على متابعة التشغيل لحظة بلحظة';

    const body = `
      <div class="eqrd-page" id="eqrdDashboard" data-view="${esc(view)}">
        ${heroHtml(data)}
        ${tabsHtml(view)}
        ${view === 'today' ? todayViewHtml(data) : overviewViewHtml(data)}
      </div>
    `;

    openPanel(title, subtitle, body);
  }

  function heroHtml(data) {
    const updated = EQD.loadedAt ? EQD.loadedAt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—';

    return `
      <section class="eqrd-hero">
        <div style="position:relative;z-index:1;">
          <h2>لوحة مراقبة EASY-Q</h2>
          <p>
            تجمع حالة الطاولات، ضغط الطابور، أداء اليوم، العملاء الجاهزين، والتنبيهات التشغيلية في مكان واحد لمسؤول المطعم.
          </p>
          <div class="eqrd-hero-actions">
            <button class="eqrd-btn primary" onclick="EQRestaurantDashboard.refresh()">
              <i class="fas fa-sync-alt"></i>
              تحديث الآن
            </button>
            <button class="eqrd-btn ghost" onclick="EQRestaurantDashboard.setView('overview')">
              <i class="fas fa-chart-pie"></i>
              نظرة عامة
            </button>
            <button class="eqrd-btn ghost" onclick="EQRestaurantDashboard.setView('today')">
              <i class="fas fa-calendar-day"></i>
              ملخص اليوم
            </button>
          </div>
        </div>

        <div class="eqrd-health-card">
          <div class="eqrd-health-title">حالة التشغيل الآن</div>
          <div class="eqrd-health-value">
            <span class="eqrd-health-dot ${esc(data.health.className)}"></span>
            <span>${esc(data.health.label)}</span>
          </div>
          <p style="margin-top:10px;">${esc(data.health.text)}</p>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <span class="eqrd-badge info">آخر تحديث: ${esc(updated)}</span>
            <span class="eqrd-badge wait">تحديث تلقائي كل ${Math.round(EQD.autoRefreshMs / 1000)} ث</span>
          </div>
        </div>
      </section>
    `;
  }

  function tabsHtml(view) {
    return `
      <div class="eqrd-tabs">
        <button class="eqrd-tab ${view === 'overview' ? 'active' : ''}" onclick="EQRestaurantDashboard.setView('overview')">
          <i class="fas fa-chart-pie"></i> نظرة عامة
        </button>
        <button class="eqrd-tab ${view === 'today' ? 'active' : ''}" onclick="EQRestaurantDashboard.setView('today')">
          <i class="fas fa-calendar-day"></i> ملخص اليوم
        </button>
      </div>
    `;
  }

  function overviewViewHtml(data) {
    return `
      <div class="eqrd-grid">
        ${kpiCard('fa-users', 'الطابور الآن', data.waitingOnly.length, `متوسط الانتظار ${fmtMinutes(data.avgCurrentWait)}`, [
          ['جاهزون', data.readyNow.length],
          ['معيّنون', data.offeredNow.length]
        ])}

        ${kpiCard('fa-chair', 'الطاولات المتاحة', data.tableCounts.available, `من أصل ${data.tableCounts.usable} طاولة عاملة`, [
          ['مشغولة', data.tableCounts.occupied],
          ['تنظيف', data.tableCounts.cleaning]
        ])}

        ${progressCard('fa-fire', 'استغلال الطاولات', `${data.tableCounts.utilization}%`, 'نسبة الطاولات المشغولة حاليًا', data.tableCounts.utilization)}

        ${kpiCard('fa-calendar-check', 'طلبات اليوم', data.todayCounts.total, `نسبة التحويل ${data.todayCounts.conversion}%`, [
          ['جلس/خدمة', data.todayCounts.completed + data.todayCounts.occupied],
          ['فقد', data.todayCounts.loss]
        ])}

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-triangle-exclamation"></i> التنبيهات الذكية</div>
              <div class="eqrd-card-sub">أهم ما يحتاج انتباه مسؤول المطعم الآن</div>
            </div>
          </div>
          ${alertsHtml(data.alerts)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-list-check"></i> أولويات التنفيذ</div>
              <div class="eqrd-card-sub">من يجب التعامل معه أولًا</div>
            </div>
          </div>
          ${priorityHtml(data)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-map-location-dot"></i> المناطق</div>
              <div class="eqrd-card-sub">ضغط الانتظار والطاولات حسب المنطقة</div>
            </div>
          </div>
          ${zonesHtml(data.zones)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-layer-group"></i> الطوابق</div>
              <div class="eqrd-card-sub">توزيع الطاولات حسب الدور</div>
            </div>
          </div>
          ${floorsHtml(data.floors)}
        </div>

        <div class="eqrd-card full">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-lightbulb"></i> توصيات تشغيلية</div>
              <div class="eqrd-card-sub">اقتراحات مباشرة لتحسين الوردية الحالية</div>
            </div>
          </div>
          ${recommendationsHtml(data.recommendations)}
        </div>
      </div>
    `;
  }

  function todayViewHtml(data) {
    return `
      <div class="eqrd-grid">
        ${kpiCard('fa-receipt', 'إجمالي طلبات اليوم', data.todayCounts.total, `منذ بداية اليوم`, [
          ['داخلي', data.todayCounts.walkIn],
          ['رابط/آخر', data.todayCounts.online]
        ])}

        ${kpiCard('fa-user-check', 'تمت خدمتهم/نشط', data.todayCounts.completed + data.todayCounts.occupied, `متوسط الانتظار ${fmtMinutes(data.avgTodayWait)}`, [
          ['تعيينات', data.todayCounts.assigned],
          ['جاهز الآن', data.todayCounts.offered]
        ])}

        ${progressCard('fa-arrow-trend-up', 'تحويل الطلبات', `${data.todayCounts.conversion}%`, 'طلبات وصلت للخدمة أو التعيين', data.todayCounts.conversion)}

        ${progressCard('fa-user-slash', 'الفقد اليوم', `${data.todayCounts.lossRate}%`, `${data.todayCounts.loss} ملغي/منتهي`, data.todayCounts.lossRate)}

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-clock-rotate-left"></i> أحدث الطلبات</div>
              <div class="eqrd-card-sub">آخر حركة على طلبات المطعم</div>
            </div>
          </div>
          ${recentRequestsHtml(data.recentRequests)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-chart-simple"></i> ملخص الحالات اليوم</div>
              <div class="eqrd-card-sub">تفصيل سريع حسب حالة الطلب</div>
            </div>
          </div>
          ${todayStatusTableHtml(data)}
        </div>

        <div class="eqrd-card full">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-map-location-dot"></i> أداء المناطق اليوم</div>
              <div class="eqrd-card-sub">عدد الطلبات ومتوسط الانتظار حسب المنطقة</div>
            </div>
          </div>
          ${zonesTableHtml(data.zones)}
        </div>
      </div>
    `;
  }

  function kpiCard(icon, title, value, label, miniItems) {
    return `
      <div class="eqrd-card soft">
        <div class="eqrd-card-head">
          <div>
            <div class="eqrd-card-title"><i class="fas ${esc(icon)}"></i> ${esc(title)}</div>
            <div class="eqrd-card-sub">${esc(label)}</div>
          </div>
        </div>
        <div class="eqrd-kpi-value">${esc(value)}</div>
        <div class="eqrd-mini-row">
          ${(miniItems || []).map(([labelText, num]) => `
            <div class="eqrd-mini-stat">
              <div class="eqrd-mini-num">${esc(num)}</div>
              <div class="eqrd-mini-label">${esc(labelText)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function progressCard(icon, title, value, label, percentValue) {
    return `
      <div class="eqrd-card soft">
        <div class="eqrd-card-head">
          <div>
            <div class="eqrd-card-title"><i class="fas ${esc(icon)}"></i> ${esc(title)}</div>
            <div class="eqrd-card-sub">${esc(label)}</div>
          </div>
        </div>
        <div class="eqrd-kpi-value">${esc(value)}</div>
        <div class="eqrd-progress"><span style="width:${pct(percentValue, 100)}%;"></span></div>
        <div class="eqrd-kpi-label">${pct(percentValue, 100)}% من المؤشر</div>
      </div>
    `;
  }

  function alertsHtml(alerts) {
    return `
      <div class="eqrd-list">
        ${(alerts || []).map((a) => `
          <div class="eqrd-alert ${esc(a.type)}">
            <i class="fas ${esc(a.icon)}"></i>
            <div>
              <div class="eqrd-list-title">${esc(a.title)}</div>
              <div class="eqrd-list-sub" style="white-space:normal;line-height:1.6;">${esc(a.text)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function priorityHtml(data) {
    const rows = data.priorities.waitingPriority;
    if (!rows.length) return `<div class="eqrd-empty">لا يوجد عملاء في الانتظار الآن</div>`;

    return `
      <div class="eqrd-list">
        ${rows.map((r) => {
          const id = r.request_id || r.id;
          const ready = data.priorities.readyIds.has(id);
          return `
            <div class="eqrd-list-item">
              <div class="eqrd-icon-box"><i class="fas ${ready ? 'fa-bolt' : 'fa-user'}"></i></div>
              <div>
                <div class="eqrd-list-title">${esc(getCustomerName(r))} — دور ${esc(r.queue_position || '—')}</div>
                <div class="eqrd-list-sub">${esc(r.zone_name || 'بدون تفضيل')} / ${esc(r.requested_party_size || 1)} أشخاص / انتظار ${fmtMinutes(minutesBetween(r.created_at))}</div>
              </div>
              <span class="eqrd-badge ${ready ? 'ok' : 'wait'}">${ready ? 'جاهز' : 'انتظار'}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function zonesHtml(zones) {
    if (!zones.length) return `<div class="eqrd-empty">لا توجد مناطق مفعلة أو بيانات كافية</div>`;

    return `
      <div class="eqrd-list">
        ${zones.slice(0, 7).map((z) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-location-dot"></i></div>
            <div>
              <div class="eqrd-list-title">${esc(z.zone)}</div>
              <div class="eqrd-list-sub">انتظار ${z.waiting} / متاحة ${z.available} / مشغولة ${z.occupied}</div>
              <div class="eqrd-progress"><span style="width:${z.utilization}%;"></span></div>
            </div>
            <span class="eqrd-badge info">${z.utilization}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function floorsHtml(floors) {
    if (!floors.length) return `<div class="eqrd-empty">لا توجد طوابق مفعلة أو بيانات كافية</div>`;

    return `
      <div class="eqrd-list">
        ${floors.map((f) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-building"></i></div>
            <div>
              <div class="eqrd-list-title">الدور ${esc(f.floor)}</div>
              <div class="eqrd-list-sub">متاحة ${f.available} / مشغولة ${f.occupied} / محجوزة ${f.reserved} / تنظيف ${f.cleaning}</div>
              <div class="eqrd-progress"><span style="width:${f.utilization}%;"></span></div>
            </div>
            <span class="eqrd-badge info">${f.utilization}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function recommendationsHtml(items) {
    if (!items.length) return `<div class="eqrd-empty">لا توجد توصيات إضافية الآن</div>`;

    return `
      <div class="eqrd-list">
        ${items.map((text, index) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-lightbulb"></i></div>
            <div>
              <div class="eqrd-list-title">توصية ${index + 1}</div>
              <div class="eqrd-list-sub" style="white-space:normal;line-height:1.6;">${esc(text)}</div>
            </div>
            <span class="eqrd-badge wait">تشغيلي</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function recentRequestsHtml(rows) {
    if (!rows.length) return `<div class="eqrd-empty">لا توجد طلبات حديثة</div>`;

    return `
      <div class="eqrd-list">
        ${rows.slice(0, 10).map((r) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-receipt"></i></div>
            <div>
              <div class="eqrd-list-title">${esc(getCustomerName(r))} ${r.booking_code ? `— ${esc(r.booking_code)}` : ''}</div>
              <div class="eqrd-list-sub">${esc(sourceLabel(r.source))} / ${esc(r.zone_name || 'بدون منطقة')} / ${esc(r.requested_party_size || 1)} أشخاص / ${fmtDateTime(r.created_at)}</div>
            </div>
            <span class="eqrd-badge ${statusClass(r.status)}">${esc(statusArabic(r.status))}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function todayStatusTableHtml(data) {
    const rows = [
      ['إجمالي الطلبات', data.todayCounts.total, 'كل الطلبات التي أنشئت اليوم'],
      ['انتظار', data.todayCounts.waiting, 'لا يزالون في الطابور'],
      ['جاهز/معيّن', data.todayCounts.offered, 'تم تعيين أو تجهيز طاولة'],
      ['مشغول الآن', data.todayCounts.occupied, 'عملاء على الطاولات'],
      ['مكتمل/تنظيف', data.todayCounts.completed, 'انتهت الخدمة أو دخلت تنظيف'],
      ['ملغي/لم يحضر', data.todayCounts.cancelled, 'طلبات فقدت قبل الخدمة'],
      ['منتهي', data.todayCounts.expired, 'انتهت مهلة الحجز أو الانتظار']
    ];

    return `
      <div class="eqrd-table-wrap">
        <table class="eqrd-table">
          <thead><tr><th>الحالة</th><th>العدد</th><th>التفسير</th></tr></thead>
          <tbody>
            ${rows.map(([name, count, note]) => `
              <tr>
                <td>${esc(name)}</td>
                <td><strong>${esc(count)}</strong></td>
                <td>${esc(note)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function zonesTableHtml(zones) {
    if (!zones.length) return `<div class="eqrd-empty">لا توجد بيانات مناطق اليوم</div>`;

    return `
      <div class="eqrd-table-wrap">
        <table class="eqrd-table">
          <thead>
            <tr>
              <th>المنطقة</th>
              <th>طلبات اليوم</th>
              <th>انتظار الآن</th>
              <th>طاولات متاحة</th>
              <th>طاولات مشغولة</th>
              <th>متوسط الانتظار</th>
              <th>استغلال</th>
            </tr>
          </thead>
          <tbody>
            ${zones.map((z) => `
              <tr>
                <td>${esc(z.zone)}</td>
                <td>${esc(z.today)}</td>
                <td>${esc(z.waiting)}</td>
                <td>${esc(z.available)}</td>
                <td>${esc(z.occupied)}</td>
                <td>${fmtMinutes(z.avgWait)}</td>
                <td>${esc(z.utilization)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function errorHtml(message) {
    return `
      <div class="eqrd-page" id="eqrdDashboard">
        <div class="eqrd-card full">
          <div class="eqrd-alert bad">
            <i class="fas fa-triangle-exclamation"></i>
            <div>
              <div class="eqrd-list-title">تعذر فتح لوحة المراقبة</div>
              <div class="eqrd-list-sub" style="white-space:normal;line-height:1.6;">${esc(message)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function openDashboard(view = 'overview', force = false) {
    EQD.activeView = view === 'today' ? 'today' : 'overview';
    setActiveSidebar(EQD.activeView);

    if (!canOpenDashboard()) {
      openPanel('لوحة مراقبة المطعم', 'لا توجد صلاحية كافية', errorHtml('ليس لديك صلاحية لعرض لوحة المراقبة.'));
      return;
    }

    openPanel(
      EQD.activeView === 'today' ? 'ملخص اليوم' : 'لوحة مراقبة المطعم',
      'جاري تحميل مؤشرات التشغيل',
      loadingHtml()
    );

    try {
      let data = EQD.lastData;
      if (!data || force) {
        data = await loadDashboardData();
      }

      renderDashboard(data, EQD.activeView);
      startAutoRefresh();
    } catch (err) {
      console.error('[EASY-Q Dashboard] open failed:', err);
      openPanel('لوحة مراقبة المطعم', 'تعذر تحميل البيانات', errorHtml(err.message || 'حدث خطأ غير متوقع'));
    }
  }

  async function refreshDashboard() {
    const btns = $$('#eqrdDashboard .eqrd-btn');
    btns.forEach((btn) => {
      if (btn.textContent.includes('تحديث')) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث';
      }
    });

    EQD.lastData = null;
    await openDashboard(EQD.activeView, true);
  }

  function startAutoRefresh() {
    stopAutoRefresh();

    EQD.refreshTimer = setInterval(async () => {
      const panelOpen = $('eqrdDashboard') && (!$('fullPagePanel') || $('fullPagePanel').classList.contains('show'));
      if (!panelOpen) {
        stopAutoRefresh();
        return;
      }

      try {
        const data = await loadDashboardData();
        renderDashboard(data, EQD.activeView);
      } catch (err) {
        console.warn('[EASY-Q Dashboard] auto refresh failed:', err);
      }
    }, EQD.autoRefreshMs);
  }

  function stopAutoRefresh() {
    if (EQD.refreshTimer) {
      clearInterval(EQD.refreshTimer);
      EQD.refreshTimer = null;
    }
  }

  function bindSidebarButtons() {
    const overviewBtn = document.querySelector('.sub-menu-item[data-view="dashboard-overview"]');
    const todayBtn = document.querySelector('.sub-menu-item[data-view="dashboard-today"]');

    if (overviewBtn && overviewBtn.dataset.eqrdBound !== 'true') {
      overviewBtn.dataset.eqrdBound = 'true';
      overviewBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openDashboard('overview', true);
      });
    }

    if (todayBtn && todayBtn.dataset.eqrdBound !== 'true') {
      todayBtn.dataset.eqrdBound = 'true';
      todayBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openDashboard('today', true);
      });
    }
  }

  function boot() {
    ensureStyles();
    bindSidebarButtons();

    setTimeout(bindSidebarButtons, 600);
    setTimeout(bindSidebarButtons, 1600);
  }

  window.EQRestaurantDashboard = {
    open: openDashboard,
    refresh: refreshDashboard,
    setView: function (view) {
      return openDashboard(view, false);
    },
    stop: stopAutoRefresh,
    boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
