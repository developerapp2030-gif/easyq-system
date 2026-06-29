/* ============================================================
   EASY-Q Restaurant Queue Center
   قسم الطابور الشامل
   - ملخص اليوم / 7 أيام / 30 يوم / فترة مخصصة
   - بطاقات مختصرة + فلاتر + جدول تفاصيل
   - يعتمد على table_requests فقط ولا يغير بيانات النظام
   ============================================================ */

(function () {
  'use strict';

  const EQQ = {
    view: 'overview',
    range: 'today',
    filter: 'all',
    source: 'all',
    search: '',
    page: 1,
    pageSize: 60,
    customStart: '',
    customEnd: '',
    data: null,
    loading: false,
    lastError: null
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function lang() {
    return String(
      window.currentLang ||
      localStorage.getItem('easyq_lang') ||
      localStorage.getItem('hajzak_lang') ||
      'ar'
    )
      .toLowerCase()
      .startsWith('en') ? 'en' : 'ar';
  }

  function isAr() {
    return lang() === 'ar';
  }

  function t(arText, enText) {
    return isAr() ? arText : enText;
  }

  function panelTitle() {
    return t('الطابور', 'Queue');
  }

  function panelSubtitle() {
    return t('ملخص وتفاصيل طلبات الطابور', 'Queue requests summary and details');
  }

  function unknownText() {
    return t('غير محدد', 'Unknown');
  }

  function dashText() {
    return '—';
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function n(value) {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num : 0;
  }

  function getBusinessId() {
    const candidates = [
      window.currentBusinessProfile?.id,
      window.currentBusiness?.id,
      window.currentUser?.business_id,
      window.BUSINESS_ID
    ];

    return candidates.find((x) => {
      const v = String(x || '').trim();
      return v && v !== 'undefined' && v !== 'null';
    }) || null;
  }

  function canOpenQueue() {
    if (!window.currentUser) return false;
    if (window.currentUser.role === 'super_admin') return false;
    if (typeof window.canDo !== 'function') return true;

    return (
      window.canDo('manage_queue') ||
      window.canDo('add_walkin') ||
      window.canDo('view_reports') ||
      window.canDo('view_customers')
    );
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(isAr() ? 'ar-SA' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  function fmtDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function rangeBounds() {
    const now = new Date();

    if (EQQ.range === 'today') {
      return { start: startOfDay(now), end: endOfDay(now), label: t('اليوم', 'Today') };
    }

    if (EQQ.range === 'last7') {
      const start = startOfDay(new Date(now.getTime() - (6 * 86400000)));
      return { start, end: endOfDay(now), label: t('آخر 7 أيام', 'Last 7 days') };
    }

    if (EQQ.range === 'last30') {
      const start = startOfDay(new Date(now.getTime() - (29 * 86400000)));
      return { start, end: endOfDay(now), label: t('آخر 30 يوم', 'Last 30 days') };
    }

    const fallbackStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const fallbackEnd = endOfDay(now);

    const customStart = EQQ.customStart ? startOfDay(new Date(EQQ.customStart)) : fallbackStart;
    const customEnd = EQQ.customEnd ? endOfDay(new Date(EQQ.customEnd)) : fallbackEnd;

    return {
      start: Number.isNaN(customStart.getTime()) ? fallbackStart : customStart,
      end: Number.isNaN(customEnd.getTime()) ? fallbackEnd : customEnd,
      label: t('فترة مخصصة', 'Custom range')
    };
  }

  function normalizePhone(phone) {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');

    if (!digits) return '';

    // رقم دولي واضح مثل +966553473330 أو +96551234567 أو +201012345678
    if (raw.startsWith('+')) {
      return digits;
    }

    // رقم دولي مكتوب بدون + مثل 9665 أو 965 أو 20
    if (digits.length >= 10 && !digits.startsWith('0')) {
      return digits;
    }

    // دعم السعودية فقط للصيغ المحلية القديمة
    if (digits.startsWith('05') && digits.length === 10) {
      return `966${digits.slice(1)}`;
    }

    if (digits.startsWith('5') && digits.length === 9) {
      return `966${digits}`;
    }

    return digits;
  }

  function statusKey(row) {
    const s = String(row?.status || '').toLowerCase();
    const expiredAt = row?.expired_at ? new Date(row.expired_at).getTime() : 0;

    if (s === 'expired') return 'expired';
    if (expiredAt && Number.isFinite(expiredAt) && expiredAt < Date.now() && ['waiting', 'offered', 'reserved'].includes(s)) {
      return 'expired';
    }

    return s || 'unknown';
  }

  function statusLabel(key) {
    const mapAr = {
      waiting: 'انتظار',
      offered: 'جاهز للتعيين',
      reserved: 'محجوز',
      occupied: 'تم الجلوس',
      cleaning: 'تنظيف',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      expired: 'منتهي',
      no_show: 'لم يحضر',
      unknown: 'غير محدد'
    };

    const mapEn = {
      waiting: 'Waiting',
      offered: 'Ready',
      reserved: 'Reserved',
      occupied: 'Seated',
      cleaning: 'Cleaning',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
      no_show: 'No-show',
      unknown: 'Unknown'
    };

    const map = isAr() ? mapAr : mapEn;
    return map[key] || key || unknownText();
  }

  function statusBadgeClass(key) {
    if (key === 'waiting') return 'wait';
    if (key === 'offered' || key === 'reserved') return 'ready';
    if (['occupied', 'cleaning', 'completed'].includes(key)) return 'ok';
    if (key === 'cancelled' || key === 'no_show' || key === 'expired') return 'bad';
    return 'muted';
  }

  function sourceKey(source) {
    const s = String(source || '').toLowerCase();
    if (['walk_in', 'manual', 'local'].includes(s)) return 'walk_in';
    if (['web_booking', 'booking_page', 'online', 'qr_code', 'qr'].includes(s)) return 'online';
    if (['restored', 'restore', 'recovered'].includes(s)) return 'restored';
    return 'other';
  }

  function sourceLabel(key) {
    const mapAr = {
      walk_in: 'محلي',
      online: 'أونلاين',
      restored: 'مسترجع',
      other: 'أخرى'
    };

    const mapEn = {
      walk_in: 'Local',
      online: 'Online',
      restored: 'Restored',
      other: 'Other'
    };

    const map = isAr() ? mapAr : mapEn;
    return map[key] || t('أخرى', 'Other');
  }

  function requestName(row) {
    return row.customer_name_snapshot || row.customers?.name || t('ضيف', 'Guest');
  }

  function requestPhone(row) {
    return normalizePhone(row.customer_phone_snapshot || row.customers?.phone || row.customers?.whatsapp_number || '');
  }

  function isSeatedStatus(key) {
    return ['occupied', 'cleaning', 'completed'].includes(key);
  }

  function isIncompleteStatus(key) {
    return ['cancelled', 'expired', 'no_show'].includes(key);
  }

  function isNoShowOrCancelled(key) {
    return ['cancelled', 'no_show'].includes(key);
  }

  async function fetchAllRows(buildQuery, pageSize = 1000, maxPages = 30) {
    const all = [];

    for (let page = 0; page < maxPages; page += 1) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await buildQuery().range(from, to);
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      all.push(...rows);

      if (rows.length < pageSize) break;
    }

    return all;
  }

  async function loadQueueData(force = false) {
    if (EQQ.loading) return EQQ.data;
    if (!force && EQQ.data && EQQ.data.range === EQQ.range && EQQ.data.customStart === EQQ.customStart && EQQ.data.customEnd === EQQ.customEnd) {
      return EQQ.data;
    }

    const businessId = getBusinessId();
    if (!businessId) throw new Error(t('لم يتم العثور على معرف المطعم الحالي', 'Current restaurant ID was not found'));
    if (!window.supabase) throw new Error(t('Supabase client غير متوفر', 'Supabase client is not available'));

    const bounds = rangeBounds();

    EQQ.loading = true;
    EQQ.lastError = null;

    try {
      const rows = await fetchAllRows(() => window.supabase
        .from('table_requests')
        .select(`
          id,
          business_id,
          customer_id,
          booking_code,
          request_source,
          requested_party_size,
          status,
          zone_name,
          created_at,
          expired_at,
          customer_name_snapshot,
          customer_phone_snapshot,
          customers (
            name,
            phone,
            whatsapp_number
          )
        `)
        .eq('business_id', businessId)
        .gte('created_at', bounds.start.toISOString())
        .lte('created_at', bounds.end.toISOString())
        .order('created_at', { ascending: false })
      );

      const safeRows = (rows || []).filter((row) => row.business_id === businessId).map((row) => {
        const key = statusKey(row);
        const src = sourceKey(row.request_source);

        return {
          ...row,
          _statusKey: key,
          _sourceKey: src,
          _customerName: requestName(row),
          _phone: requestPhone(row),
          _party: n(row.requested_party_size) || 1,
          _createdMs: new Date(row.created_at || 0).getTime() || 0
        };
      });

      const data = buildPayload(safeRows, businessId, bounds);

      console.log('[EASY-Q Queue] Loaded:', {
        businessId,
        range: EQQ.range,
        rows: safeRows.length,
        start: bounds.start.toISOString(),
        end: bounds.end.toISOString()
      });

      EQQ.data = data;
      return data;

    } finally {
      EQQ.loading = false;
    }
  }

  function countWhere(rows, fn) {
    return rows.filter(fn).length;
  }

  function buildPayload(rows, businessId, bounds) {
    const stats = {
      total: rows.length,
      waiting: countWhere(rows, (r) => r._statusKey === 'waiting'),
      ready: countWhere(rows, (r) => r._statusKey === 'offered'),
      reserved: countWhere(rows, (r) => r._statusKey === 'reserved'),
      seated: countWhere(rows, (r) => isSeatedStatus(r._statusKey)),
      occupied: countWhere(rows, (r) => r._statusKey === 'occupied'),
      cleaning: countWhere(rows, (r) => r._statusKey === 'cleaning'),
      completed: countWhere(rows, (r) => r._statusKey === 'completed'),
      cancelled: countWhere(rows, (r) => r._statusKey === 'cancelled'),
      noShow: countWhere(rows, (r) => r._statusKey === 'no_show'),
      expired: countWhere(rows, (r) => r._statusKey === 'expired'),
      incomplete: countWhere(rows, (r) => isIncompleteStatus(r._statusKey)),
      noShowOrCancelled: countWhere(rows, (r) => isNoShowOrCancelled(r._statusKey)),
      online: countWhere(rows, (r) => r._sourceKey === 'online'),
      local: countWhere(rows, (r) => r._sourceKey === 'walk_in'),
      restored: countWhere(rows, (r) => r._sourceKey === 'restored'),
      otherSource: countWhere(rows, (r) => r._sourceKey === 'other'),
      totalParty: rows.reduce((sum, r) => sum + n(r._party), 0)
    };

    stats.avgParty = stats.total ? Math.round((stats.totalParty / stats.total) * 10) / 10 : 0;

    return {
      businessId,
      range: EQQ.range,
      customStart: EQQ.customStart,
      customEnd: EQQ.customEnd,
      bounds,
      rows,
      stats,
      sourceCounts: makeCountMap(rows, (r) => sourceLabel(r._sourceKey)),
      statusCounts: makeCountMap(rows, (r) => statusLabel(r._statusKey)),
      zoneCounts: makeCountMap(rows, (r) => r.zone_name || unknownText()),
      loadedAt: new Date().toISOString()
    };
  }

  function makeCountMap(rows, fn) {
    const out = {};
    rows.forEach((row) => {
      const key = fn(row) || unknownText();
      out[key] = (out[key] || 0) + 1;
    });
    return Object.entries(out).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }

  function filteredRows(data) {
    const q = String(EQQ.search || '').trim().toLowerCase();

    let rows = (data?.rows || []).filter((row) => {
      const text = [
        row._customerName,
        row._phone,
        row.booking_code,
        row.zone_name,
        row._statusKey,
        statusLabel(row._statusKey),
        sourceLabel(row._sourceKey)
      ].map((v) => String(v || '').toLowerCase()).join(' ');

      if (q && !text.includes(q)) return false;

      if (EQQ.source !== 'all' && row._sourceKey !== EQQ.source) return false;

      if (EQQ.filter === 'waiting') return row._statusKey === 'waiting';
      if (EQQ.filter === 'ready') return row._statusKey === 'offered';
      if (EQQ.filter === 'reserved') return row._statusKey === 'reserved';
      if (EQQ.filter === 'seated') return isSeatedStatus(row._statusKey);
      if (EQQ.filter === 'cancelled') return row._statusKey === 'cancelled';
      if (EQQ.filter === 'no_show') return row._statusKey === 'no_show';
      if (EQQ.filter === 'expired') return row._statusKey === 'expired';
      if (EQQ.filter === 'incomplete') return isIncompleteStatus(row._statusKey);

      return true;
    });

    rows.sort((a, b) => Number(b._createdMs || 0) - Number(a._createdMs || 0));
    return rows;
  }

  function ensureStyles() {
    if ($('eqqStyles')) return;

    const style = document.createElement('style');
    style.id = 'eqqStyles';
    style.textContent = `
      .eqq-page{font-family:inherit;color:#111827;background:#F5F7FF;min-height:calc(100vh - 120px);padding:18px;direction:rtl;text-align:right}
      .eqq-hero{background:linear-gradient(135deg,#070219,#060427 54%,#0E146D);color:#fff;border-radius:24px;padding:20px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,.7fr);gap:16px;box-shadow:0 18px 45px rgba(15,23,42,.18);overflow:hidden;position:relative}
      .eqq-hero:after{content:'';position:absolute;inset-inline-end:-80px;top:-110px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.10)}
      .eqq-hero>*{position:relative;z-index:1}.eqq-hero h2{margin:0 0 8px;font-size:24px;font-weight:1000}.eqq-hero p{margin:0;color:rgba(255,255,255,.76);font-size:13px;font-weight:800;line-height:1.8}
      .eqq-health{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:15px}.eqq-health-num{font-size:36px;font-weight:1000;line-height:1}.eqq-health-label{font-size:13px;font-weight:900;color:rgba(255,255,255,.84);margin-top:7px}.eqq-health-note{font-size:11px;font-weight:800;color:rgba(255,255,255,.68);line-height:1.7;margin-top:9px}
      .eqq-btn,.eqq-chip,.eqq-tab{border:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:0 12px;border-radius:13px;font-size:12px;font-weight:1000;cursor:pointer;transition:.16s ease;white-space:nowrap}.eqq-btn:hover,.eqq-chip:hover,.eqq-tab:hover{transform:translateY(-1px)}.eqq-btn.primary{background:#fff;color:#0E146D}.eqq-btn.dark{background:#0E146D;color:#fff}.eqq-btn.light{background:#EEF2FF;color:#0E146D}.eqq-btn.gray{background:#F3F4F6;color:#374151}
      .eqq-toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;margin-top:14px;background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:12px;box-shadow:0 10px 26px rgba(15,23,42,.055)}
      .eqq-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.eqq-chip{background:#fff;border:1px solid #E5E7EB;color:#64748B;border-radius:999px}.eqq-chip.active{background:#0E146D;border-color:#0E146D;color:#fff}.eqq-search,.eqq-date{min-height:38px;border:1px solid #E5E7EB;border-radius:13px;padding:0 11px;background:#F8FAFC;color:#111827;font-weight:900;outline:none}.eqq-search{min-width:300px}.eqq-date{width:145px;direction:ltr;text-align:left}.eqq-search:focus,.eqq-date:focus{border-color:#0E146D;box-shadow:0 0 0 3px rgba(14,20,109,.10)}
      .eqq-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.eqq-card{background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:15px;box-shadow:0 10px 26px rgba(15,23,42,.055);min-width:0}.eqq-card.wide{grid-column:span 2}.eqq-card.full{grid-column:1/-1}.eqq-title{font-size:13px;font-weight:1000;color:#111827;display:flex;align-items:center;gap:8px}.eqq-title i{color:#0E146D}.eqq-sub{font-size:11px;color:#64748B;font-weight:800;line-height:1.7;margin-top:4px}.eqq-num{font-size:31px;font-weight:1000;color:#0F172A;line-height:1;margin-top:10px}.eqq-card.ok .eqq-num{color:#047857}.eqq-card.bad .eqq-num{color:#B91C1C}.eqq-card.wait .eqq-num{color:#0E146D}.eqq-card.info .eqq-num{color:#1D4ED8}.eqq-card.warn .eqq-num{color:#B45309}
      .eqq-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.eqq-tab{background:#fff;border:1px solid #E5E7EB;color:#64748B;border-radius:999px}.eqq-tab.active{background:#0E146D;color:#fff;border-color:#0E146D}
      .eqq-table-wrap{overflow:auto;border:1px solid #EEF2F7;border-radius:16px}.eqq-table{width:100%;border-collapse:collapse;min-width:1040px;table-layout:fixed}.eqq-table th,.eqq-table td{padding:10px;border-bottom:1px solid #EEF2F7;text-align:right;font-size:12px;font-weight:850;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.eqq-table th{background:#F8FAFC;color:#64748B;font-weight:1000;position:sticky;top:0}.eqq-phone{direction:ltr;text-align:left!important;color:#0E146D;font-weight:1000}.eqq-code{direction:ltr;text-align:left!important;font-weight:1000;color:#111827}.eqq-badge{min-height:24px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:1000;display:inline-flex;align-items:center;justify-content:center}.eqq-badge.ok{background:#ECFDF5;color:#047857}.eqq-badge.bad{background:#FEF2F2;color:#B91C1C}.eqq-badge.wait{background:#EEF2FF;color:#0E146D}.eqq-badge.ready{background:#FFF7ED;color:#C2410C}.eqq-badge.muted{background:#F3F4F6;color:#6B7280}.eqq-badge.info{background:#EFF6FF;color:#1D4ED8}
      .eqq-bars{display:flex;flex-direction:column;gap:8px;margin-top:12px}.eqq-bar{display:grid;grid-template-columns:120px minmax(0,1fr) 44px;gap:8px;align-items:center;font-size:11px;font-weight:900;color:#475569}.eqq-track{height:9px;background:#EDF2FF;border-radius:999px;overflow:hidden}.eqq-fill{height:100%;background:linear-gradient(90deg,#0E146D,#60A5FA);border-radius:999px}.eqq-empty{padding:22px;text-align:center;color:#64748B;font-weight:900;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:16px}.eqq-loader{min-height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#64748B;font-weight:1000}.eqq-spinner{width:34px;height:34px;border-radius:50%;border:4px solid rgba(14,20,109,.13);border-top-color:#0E146D;animation:eqqSpin .8s linear infinite}@keyframes eqqSpin{to{transform:rotate(360deg)}}
      .eqq-page.eqq-ltr{direction:ltr;text-align:left}.eqq-page.eqq-ltr .eqq-table th,.eqq-page.eqq-ltr .eqq-table td{text-align:left}.eqq-page.eqq-ltr .eqq-phone,.eqq-page.eqq-ltr .eqq-code{text-align:left!important}.eqq-page.eqq-ltr .eqq-date{direction:ltr;text-align:left}.eqq-page.eqq-ltr .eqq-hero h2,.eqq-page.eqq-ltr .eqq-hero p{text-align:left}.eqq-page.eqq-ltr .eqq-bar{grid-template-columns:150px minmax(0,1fr) 44px}.eqq-page.eqq-ltr .eqq-bar>div:first-child{text-align:left}
      .eqq-page.eqq-rtl{direction:rtl;text-align:right}.eqq-page.eqq-rtl .eqq-table th,.eqq-page.eqq-rtl .eqq-table td{text-align:right}
      @media(max-width:1180px){.eqq-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.eqq-hero{grid-template-columns:1fr}}@media(max-width:720px){.eqq-page{padding:12px}.eqq-grid{grid-template-columns:1fr}.eqq-card.wide{grid-column:span 1}.eqq-search{min-width:100%;width:100%}.eqq-date{width:calc(50% - 6px)}}
    `;

    document.head.appendChild(style);
  }

  function openPanel(title, subtitle, bodyHtml) {
    ensureStyles();

    if (typeof window.openFullPagePanel === 'function') {
      window.openFullPagePanel(title, subtitle, bodyHtml);
      return;
    }

    let fallback = $('eqqFallbackPanel');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'eqqFallbackPanel';
      fallback.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#F5F7FF;overflow:auto;';
      document.body.appendChild(fallback);
    }

    fallback.style.direction = isAr() ? 'rtl' : 'ltr';

    fallback.innerHTML = `
      <div style="padding:14px;background:#070219;color:white;display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div style="font-weight:1000;font-size:18px;">${esc(title)}</div>
          <div style="font-weight:800;font-size:12px;opacity:.72;margin-top:4px;">${esc(subtitle)}</div>
        </div>
        <button onclick="document.getElementById('eqqFallbackPanel').remove()" style="width:38px;height:38px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:white;font-size:20px;cursor:pointer;">×</button>
      </div>
      ${bodyHtml}
    `;
  }

  function loadingHtml() {
    return `
      <div class="eqq-page ${isAr() ? 'eqq-rtl' : 'eqq-ltr'}">
        <div class="eqq-loader">
          <div class="eqq-spinner"></div>
          <div>${t('جاري تحميل بيانات الطابور.', 'Loading queue data...')}</div>
        </div>
      </div>
    `;
  }

  function errorHtml(message) {
    return `
      <div class="eqq-page ${isAr() ? 'eqq-rtl' : 'eqq-ltr'}">
        <div class="eqq-card full">
          <div class="eqq-title"><i class="fas fa-triangle-exclamation"></i>${t('تعذر فتح قسم الطابور', 'Unable to open queue section')}</div>
          <div class="eqq-sub">${esc(message || '')}</div>
        </div>
      </div>
    `;
  }

  function rangeChip(key, label) {
    return `<button class="eqq-chip ${EQQ.range === key ? 'active' : ''}" onclick="EQRestaurantQueue.setRange('${key}')">${esc(label)}</button>`;
  }

  function filterChip(key, label) {
    return `<button class="eqq-chip ${EQQ.filter === key ? 'active' : ''}" onclick="EQRestaurantQueue.setFilter('${key}')">${esc(label)}</button>`;
  }

  function sourceChip(key, label) {
    return `<button class="eqq-chip ${EQQ.source === key ? 'active' : ''}" onclick="EQRestaurantQueue.setSource('${key}')">${esc(label)}</button>`;
  }

  function tabButton(view, label, icon) {
    return `<button class="eqq-tab ${EQQ.view === view ? 'active' : ''}" onclick="EQRestaurantQueue.setView('${view}')"><i class="fas ${icon}"></i>${esc(label)}</button>`;
  }

  function card(icon, title, value, sub, cls) {
    return `
      <div class="eqq-card ${cls || ''}">
        <div class="eqq-title"><i class="fas ${icon}"></i>${esc(title)}</div>
        <div class="eqq-num">${esc(value)}</div>
        <div class="eqq-sub">${esc(sub || '')}</div>
      </div>
    `;
  }

  function shellHtml(data) {
    const b = data.bounds;
    const rangeText = `${fmtDateInput(b.start)} → ${fmtDateInput(b.end)}`;
    const pageClass = isAr() ? 'eqq-rtl' : 'eqq-ltr';

    return `
      <div class="eqq-page ${pageClass}" id="eqQueueCenter">
        <section class="eqq-hero">
          <div>
            <h2>${t('الطابور', 'Queue')}</h2>
            <p>${t(
              'متابعة طلبات الانتظار والحجوزات حسب اليوم أو 7 أيام أو 30 يوم أو فترة مخصصة، مع بطاقات مختصرة وتفاصيل قابلة للفلترة.',
              'Track waitlist and booking requests by today, 7 days, 30 days, or a custom range, with summary cards and filterable details.'
            )}</p>
            <div class="eqq-row" style="margin-top:14px;">
              <button class="eqq-btn primary" onclick="EQRestaurantQueue.refresh()"><i class="fas fa-sync-alt"></i>${t('تحديث', 'Refresh')}</button>
              <span class="eqq-badge info">${esc(data.bounds.label)}</span>
              <span class="eqq-badge muted">${esc(rangeText)}</span>
              <span class="eqq-badge muted">${t('آخر تحديث:', 'Last updated:')} ${esc(fmtDate(data.loadedAt))}</span>
            </div>
          </div>
          <div class="eqq-health">
            <div class="eqq-health-num">${esc(data.stats.total)}</div>
            <div class="eqq-health-label">${t('إجمالي طلبات الفترة', 'Total requests in range')}</div>
            <div class="eqq-health-note">${t('النطاق يؤثر على كل البطاقات والتفاصيل في هذه الصفحة.', 'The selected range affects all cards and details on this page.')}</div>
          </div>
        </section>

        <section class="eqq-toolbar">
          <div>
            <div class="eqq-sub" style="margin-bottom:8px;">${t('النطاق الزمني', 'Date range')}</div>
            <div class="eqq-row">
              ${rangeChip('today', t('اليوم', 'Today'))}
              ${rangeChip('last7', t('7 أيام', '7 days'))}
              ${rangeChip('last30', t('30 يوم', '30 days'))}
              ${rangeChip('custom', t('فترة مخصصة', 'Custom range'))}
              <label style="display:flex; flex-direction:column; gap:5px; font-size:11px; font-weight:1000; color:#475569;">
                ${t('من تاريخ', 'From date')}
                <input class="eqq-date" type="date" id="eqqStartDate" value="${esc(EQQ.customStart || fmtDateInput(data.bounds.start))}" onchange="EQRestaurantQueue.setCustomStart(this.value)">
              </label>

              <label style="display:flex; flex-direction:column; gap:5px; font-size:11px; font-weight:1000; color:#475569;">
                ${t('إلى تاريخ', 'To date')}
                <input class="eqq-date" type="date" id="eqqEndDate" value="${esc(EQQ.customEnd || fmtDateInput(data.bounds.end))}" onchange="EQRestaurantQueue.setCustomEnd(this.value)">
              </label>
              <button class="eqq-btn dark" onclick="EQRestaurantQueue.applyCustomRange()"><i class="fas fa-calendar-check"></i>${t('تطبيق الفترة', 'Apply range')}</button>
            </div>
          </div>
          <div>
            <div class="eqq-sub" style="margin-bottom:8px;">${t('بحث سريع', 'Quick search')}</div>
            <input class="eqq-search" id="eqqSearchInput" value="${esc(EQQ.search)}" placeholder="${esc(t('اسم العميل، الجوال، كود الحجز، المنطقة...', 'Customer name, phone, booking code, zone...'))}" oninput="EQRestaurantQueue.setSearch(this.value)">
          </div>
        </section>

        <nav class="eqq-tabs">
          ${tabButton('overview', t('ملخص الطابور', 'Queue Summary'), 'fa-chart-pie')}
          ${tabButton('details', t('تفاصيل الطلبات', 'Request Details'), 'fa-list')}
          ${tabButton('sources', t('المصادر والمناطق', 'Sources & Zones'), 'fa-chart-simple')}
        </nav>

        <div id="eqqContent"></div>
      </div>
    `;
  }

  function overviewHtml(data) {
    return `
      <div class="eqq-grid">
        ${card('fa-list-check', t('إجمالي الطلبات', 'Total Requests'), data.stats.total, t('كل طلبات الفترة', 'All requests in selected range'), 'info')}
        ${card('fa-hourglass-half', t('الانتظار الحالية', 'Current Waiting'), data.stats.waiting, t('حالة waiting', 'Waiting status'), 'wait')}
        ${card('fa-circle-check', t('تم الجلوس', 'Seated'), data.stats.seated, t('مشغول / تنظيف / مكتمل', 'Occupied / cleaning / completed'), 'ok')}
        ${card('fa-user-xmark', t('ملغي / لم يحضر', 'Cancelled / No-show'), data.stats.noShowOrCancelled, 'cancelled + no_show', 'bad')}
        ${card('fa-ban', t('غير مكتملة', 'Incomplete'), data.stats.incomplete, t('ملغي / منتهي / لم يحضر', 'Cancelled / expired / no-show'), 'bad')}
        ${card('fa-globe', t('حجوزات أونلاين', 'Online Bookings'), data.stats.online, t('من صفحة الحجز أو QR', 'From booking page or QR'), 'info')}
        ${card('fa-store', t('حجوزات محلي', 'Local Bookings'), data.stats.local, 'walk_in / manual', 'ok')}
        ${card('fa-users', t('إجمالي الأشخاص', 'Total Guests'), data.stats.totalParty, `${t('متوسط المجموعة:', 'Average party:')} ${data.stats.avgParty}`, 'warn')}
        <div class="eqq-card wide">
          <div class="eqq-title"><i class="fas fa-filter"></i>${t('فلاتر التفاصيل', 'Detail Filters')}</div>
          <div class="eqq-sub">${t('اختر فلترًا ثم انتقل إلى تفاصيل الطلبات أو ابق في نفس الصفحة.', 'Choose a filter, then go to request details or stay on this page.')}</div>
          <div class="eqq-row" style="margin-top:12px;">${filtersHtml()}</div>
        </div>
        <div class="eqq-card wide">
          <div class="eqq-title"><i class="fas fa-location-dot"></i>${t('أعلى المناطق', 'Top Zones')}</div>
          ${barsHtml(data.zoneCounts.slice(0, 6), data.stats.total)}
        </div>
        <div class="eqq-card full">
          <div class="eqq-title"><i class="fas fa-list"></i>${t('آخر الطلبات', 'Latest Requests')}</div>
          <div class="eqq-sub">${t('أحدث 12 طلب في الفترة المحددة.', 'Latest 12 requests in the selected range.')}</div>
          ${requestsTable((data.rows || []).slice(0, 12))}
        </div>
      </div>
    `;
  }

  function filtersHtml() {
    return `
      ${filterChip('all', t('الكل', 'All'))}
      ${filterChip('waiting', t('انتظار', 'Waiting'))}
      ${filterChip('ready', t('جاهز', 'Ready'))}
      ${filterChip('reserved', t('محجوز', 'Reserved'))}
      ${filterChip('seated', t('تم الجلوس', 'Seated'))}
      ${filterChip('incomplete', t('غير مكتملة', 'Incomplete'))}
      ${filterChip('cancelled', t('ملغي', 'Cancelled'))}
      ${filterChip('no_show', t('لم يحضر', 'No-show'))}
      ${filterChip('expired', t('منتهي', 'Expired'))}
    `;
  }

  function sourcesHtml(data) {
    return `
      <div class="eqq-grid">
        <div class="eqq-card wide">
          <div class="eqq-title"><i class="fas fa-share-nodes"></i>${t('مصادر الطلبات', 'Request Sources')}</div>
          ${barsHtml(data.sourceCounts, data.stats.total)}
        </div>
        <div class="eqq-card wide">
          <div class="eqq-title"><i class="fas fa-location-dot"></i>${t('المناطق الأكثر اختيارًا', 'Most Selected Zones')}</div>
          ${barsHtml(data.zoneCounts, data.stats.total)}
        </div>
        <div class="eqq-card full">
          <div class="eqq-title"><i class="fas fa-filter"></i>${t('فلترة حسب المصدر', 'Filter by Source')}</div>
          <div class="eqq-row" style="margin-top:12px;">
            ${sourceChip('all', t('كل المصادر', 'All sources'))}
            ${sourceChip('walk_in', t('محلي', 'Local'))}
            ${sourceChip('online', t('أونلاين', 'Online'))}
            ${sourceChip('restored', t('مسترجع', 'Restored'))}
            ${sourceChip('other', t('أخرى', 'Other'))}
          </div>
        </div>
        <div class="eqq-card full">
          <div class="eqq-title"><i class="fas fa-list"></i>${t('تفاصيل المصدر المختار', 'Selected Source Details')}</div>
          ${detailsHtml(data, true)}
        </div>
      </div>
    `;
  }

  function detailsHtml(data, insideOnly = false) {
    const rows = filteredRows(data);
    const pages = Math.max(1, Math.ceil(rows.length / EQQ.pageSize));
    if (EQQ.page > pages) EQQ.page = pages;

    const start = (EQQ.page - 1) * EQQ.pageSize;
    const pageRows = rows.slice(start, start + EQQ.pageSize);

    const fromRow = start + (pageRows.length ? 1 : 0);
    const toRow = start + pageRows.length;

    const body = `
      <div class="eqq-card full">
        <div class="eqq-title"><i class="fas fa-filter"></i>${t('فلاتر الطلبات', 'Request Filters')}</div>
        <div class="eqq-row" style="margin-top:12px;">${filtersHtml()}</div>
        <div class="eqq-row" style="margin-top:10px;">
          ${sourceChip('all', t('كل المصادر', 'All sources'))}
          ${sourceChip('walk_in', t('محلي', 'Local'))}
          ${sourceChip('online', t('أونلاين', 'Online'))}
          ${sourceChip('restored', t('مسترجع', 'Restored'))}
          ${sourceChip('other', t('أخرى', 'Other'))}
        </div>
      </div>

      <div class="eqq-card full">
        <div class="eqq-row" style="justify-content:space-between;margin-bottom:12px;">
          <div>
            <div class="eqq-title"><i class="fas fa-list"></i>${t('تفاصيل الطلبات', 'Request Details')}</div>
            <div class="eqq-sub">
              ${t('المعروض', 'Showing')} ${esc(fromRow)}-${esc(toRow)}
              ${t('من', 'of')} ${esc(rows.length)}
              ${t('طلب', 'requests')}
            </div>
          </div>
          <div class="eqq-row">
            <button class="eqq-btn light" onclick="EQRestaurantQueue.prevPage()">‹</button>
            <span class="eqq-badge muted">${esc(EQQ.page)} / ${esc(pages)}</span>
            <button class="eqq-btn light" onclick="EQRestaurantQueue.nextPage()">›</button>
          </div>
        </div>
        ${requestsTable(pageRows)}
      </div>
    `;

    return insideOnly ? body : `<div class="eqq-grid">${body}</div>`;
  }

  function requestsTable(rows) {
    if (!rows.length) return `<div class="eqq-empty">${t('لا توجد طلبات مطابقة', 'No matching requests')}</div>`;

    return `
      <div class="eqq-table-wrap">
        <table class="eqq-table">
          <thead>
            <tr>
              <th style="width:120px;">${t('كود الحجز', 'Booking Code')}</th>
              <th style="width:170px;">${t('العميل', 'Customer')}</th>
              <th style="width:135px;">${t('الجوال', 'Phone')}</th>
              <th style="width:80px;">${t('الأشخاص', 'Guests')}</th>
              <th style="width:105px;">${t('المصدر', 'Source')}</th>
              <th style="width:120px;">${t('المنطقة', 'Zone')}</th>
              <th style="width:120px;">${t('الحالة', 'Status')}</th>
              <th style="width:175px;">${t('التاريخ', 'Date')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr title="${esc(row._customerName)} - ${esc(row.booking_code || '')}">
                <td class="eqq-code">${esc(row.booking_code || dashText())}</td>
                <td>${esc(row._customerName || t('ضيف', 'Guest'))}</td>
                <td class="eqq-phone">${esc(row._phone || dashText())}</td>
                <td>${esc(row._party || 1)}</td>
                <td><span class="eqq-badge info">${esc(sourceLabel(row._sourceKey))}</span></td>
                <td>${esc(row.zone_name || unknownText())}</td>
                <td><span class="eqq-badge ${statusBadgeClass(row._statusKey)}">${esc(statusLabel(row._statusKey))}</span></td>
                <td>${esc(fmtDate(row.created_at))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function barsHtml(items, total) {
    const list = (items || []).filter((item) => n(item.value) > 0);
    if (!list.length) return `<div class="eqq-empty">${t('لا توجد بيانات', 'No data available')}</div>`;

    const max = Math.max(1, ...list.map((item) => n(item.value)));

    return `
      <div class="eqq-bars">
        ${list.map((item) => `
          <div class="eqq-bar">
            <div>${esc(item.label)}</div>
            <div class="eqq-track"><div class="eqq-fill" style="width:${Math.max(5, Math.round((n(item.value) / max) * 100))}%"></div></div>
            <div>${esc(item.value)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderContent() {
    const content = $('eqqContent');
    if (!content || !EQQ.data) return;

    if (EQQ.view === 'details') {
      content.innerHTML = detailsHtml(EQQ.data);
      return;
    }

    if (EQQ.view === 'sources') {
      content.innerHTML = sourcesHtml(EQQ.data);
      return;
    }

    content.innerHTML = overviewHtml(EQQ.data);
  }

  function updateButtons() {
    $$('.eqq-chip').forEach((btn) => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes('setRange')) btn.classList.toggle('active', onclick.includes(`'${EQQ.range}'`));
      if (onclick.includes('setFilter')) btn.classList.toggle('active', onclick.includes(`'${EQQ.filter}'`));
      if (onclick.includes('setSource')) btn.classList.toggle('active', onclick.includes(`'${EQQ.source}'`));
    });

    $$('.eqq-tab').forEach((btn) => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes('setView')) btn.classList.toggle('active', onclick.includes(`'${EQQ.view}'`));
    });
  }

  function setActiveSidebar(view) {
    $$('.sidebar .sub-menu-item').forEach((item) => {
      const v = item.getAttribute('data-view') || '';
      item.classList.toggle('active', v === `queue-${view}` || (view === 'overview' && v === 'queue-overview'));
    });

    const parent = document.querySelector('.main-menu-item[data-menu="queue"]');
    if (parent) parent.classList.add('open', 'active');

    const submenu = document.querySelector('.sub-menu[data-submenu="queue"]');
    if (submenu) submenu.classList.add('open');
  }

  function injectQueueSidebarItems() {
    const submenu = document.querySelector('.sub-menu[data-submenu="queue"]');
    if (!submenu) return;

    if (!submenu.querySelector('[data-view="queue-overview"]')) {
      const overview = document.createElement('div');
      overview.className = 'sub-menu-item';
      overview.setAttribute('data-view', 'queue-overview');
      overview.innerHTML = `<i class="fas fa-chart-pie"></i> <span>${t('ملخص الطابور', 'Queue Summary')}</span>`;
      submenu.insertBefore(overview, submenu.firstChild);
    } else {
      const overview = submenu.querySelector('[data-view="queue-overview"] span');
      if (overview) overview.textContent = t('ملخص الطابور', 'Queue Summary');
    }

    if (!submenu.querySelector('[data-view="queue-details"]')) {
      const details = document.createElement('div');
      details.className = 'sub-menu-item';
      details.setAttribute('data-view', 'queue-details');
      details.innerHTML = `<i class="fas fa-list"></i> <span>${t('تفاصيل الطلبات', 'Request Details')}</span>`;

      const firstOld = submenu.querySelector('[data-view="queue-cancelled"]') || null;
      submenu.insertBefore(details, firstOld);
    } else {
      const details = submenu.querySelector('[data-view="queue-details"] span');
      if (details) details.textContent = t('تفاصيل الطلبات', 'Request Details');
    }

    const cancelled = submenu.querySelector('[data-view="queue-cancelled"] span');
    if (cancelled) cancelled.textContent = t('ملغي / لم يحضر', 'Cancelled / No-show');

    const seated = submenu.querySelector('[data-view="queue-seated"] span');
    if (seated) seated.textContent = t('تم الجلوس', 'Seated');
  }

  function bindSidebar() {
    injectQueueSidebarItems();

    const bindings = {
      'queue-overview': { view: 'overview', filter: 'all' },
      'queue-details': { view: 'details', filter: 'all' },
      'queue-cancelled': { view: 'details', filter: 'incomplete' },
      'queue-seated': { view: 'details', filter: 'seated' }
    };

    Object.entries(bindings).forEach(([dataView, cfg]) => {
      const item = document.querySelector(`.sub-menu-item[data-view="${dataView}"]`);
      if (!item || item.dataset.eqqBound === '1') return;

      item.dataset.eqqBound = '1';
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        EQQ.view = cfg.view;
        EQQ.filter = cfg.filter;
        openQueue(cfg.view, false);
      });
    });

    const parent = document.querySelector('.main-menu-item[data-menu="queue"]');
    if (parent && parent.dataset.eqqParentBound !== '1') {
      parent.dataset.eqqParentBound = '1';
      parent.addEventListener('dblclick', (event) => {
        event.preventDefault();
        event.stopPropagation();
        EQQ.view = 'overview';
        EQQ.filter = 'all';
        openQueue('overview', false);
      });
    }
  }

  async function openQueue(view = 'overview', force = false) {
    if (!canOpenQueue()) {
      openPanel(panelTitle(), panelSubtitle(), errorHtml(t('ليس لديك صلاحية لفتح قسم الطابور', 'You do not have permission to open the queue section')));
      return;
    }

    EQQ.view = view || EQQ.view || 'overview';
    setActiveSidebar(EQQ.view);
    openPanel(panelTitle(), panelSubtitle(), loadingHtml());

    try {
      const data = await loadQueueData(force);
      openPanel(panelTitle(), panelSubtitle(), shellHtml(data));
      renderContent();
      updateButtons();
    } catch (err) {
      console.error('[EASY-Q Queue] open failed:', err);
      EQQ.lastError = err.message || String(err);
      openPanel(panelTitle(), panelSubtitle(), errorHtml(EQQ.lastError));
    }
  }

  window.EQRestaurantQueue = {
    open: openQueue,
    refresh() {
      EQQ.data = null;
      return openQueue(EQQ.view, true);
    },
    setRange(range) {
      EQQ.range = ['today', 'last7', 'last30', 'custom'].includes(range) ? range : 'today';
      EQQ.page = 1;
      EQQ.data = null;
      return openQueue(EQQ.view, true);
    },
    setCustomStart(value) {
      EQQ.customStart = value || '';
    },
    setCustomEnd(value) {
      EQQ.customEnd = value || '';
    },
    applyCustomRange() {
      const startEl = $('eqqStartDate');
      const endEl = $('eqqEndDate');
      EQQ.customStart = startEl?.value || EQQ.customStart || '';
      EQQ.customEnd = endEl?.value || EQQ.customEnd || '';
      EQQ.range = 'custom';
      EQQ.page = 1;
      EQQ.data = null;
      return openQueue(EQQ.view, true);
    },
    setView(view) {
      EQQ.view = view || 'overview';
      EQQ.page = 1;
      setActiveSidebar(EQQ.view);
      updateButtons();
      renderContent();
    },
    setFilter(filter) {
      EQQ.filter = filter || 'all';
      EQQ.page = 1;
      if (EQQ.view === 'overview') EQQ.view = 'details';
      updateButtons();
      renderContent();
    },
    setSource(source) {
      EQQ.source = source || 'all';
      EQQ.page = 1;
      if (EQQ.view === 'overview') EQQ.view = 'details';
      updateButtons();
      renderContent();
    },
    setSearch(value) {
      EQQ.search = value || '';
      EQQ.page = 1;
      if (EQQ.view === 'overview') EQQ.view = 'details';
      updateButtons();
      renderContent();

      const input = $('eqqSearchInput');
      if (input && document.activeElement !== input) {
        input.focus();
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
      }
    },
    nextPage() {
      const total = EQQ.data ? filteredRows(EQQ.data).length : 0;
      const pages = Math.max(1, Math.ceil(total / EQQ.pageSize));
      EQQ.page = Math.min(pages, EQQ.page + 1);
      renderContent();
    },
    prevPage() {
      EQQ.page = Math.max(1, EQQ.page - 1);
      renderContent();
    },
    diagnostics() {
      return EQQ.data;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindSidebar();
    setTimeout(bindSidebar, 700);
    setTimeout(bindSidebar, 1800);
  });

  window.addEventListener('load', () => setTimeout(bindSidebar, 600));
})();
