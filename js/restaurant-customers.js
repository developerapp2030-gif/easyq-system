/* ============================================================
   EASY-Q Restaurant Customers
   ملف شامل لقسم العملاء
   - إجمالي العملاء من customers حسب رقم الجوال
   - نشاط الفترة من table_requests
   - يحل مشكلة ظهور 10 عملاء فقط
   ============================================================ */

(function () {
  'use strict';

  const EQC = {
    view: 'overview',
    range: 'last30',
    search: '',
    filter: 'all',
    page: 1,
    pageSize: 50,
    selectedKey: null,
    data: null,
    loadedAt: null,
    loading: false,
    lastError: null
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const T = {
    ar: {
      title: 'العملاء',
      subtitle: 'نظرة واضحة على عملاء المطعم وزياراتهم وبياناتهم .',
      loading: 'جاري تحميل قاعدة العملاء...',
      error: 'تعذر تحميل بيانات العملاء',
      refresh: 'تحديث',
      range: 'النطاق',
      today: 'اليوم',
      last7: '7 أيام',
      last30: '30 يوم',
      last90: '90 يوم',
      all_time: 'كل البيانات',
      overview: 'ملخص العملاء',
      list: 'قائمة العملاء',
      profile: 'ملف العميل',
      segments: 'لمحات العملاء',
      loyalty: 'الولاء والتكرار',
      export: 'تصدير العملاء',
      unique_customers: 'إجمالي العملاء المسجلين',
      raw_rows: 'سجلات داخلية',
      active_period: 'عملاء في الفترة',
      requests_period: 'زيارات الفترة',
      requests_all: 'كل الزيارات',
      no_phone: 'بدون رقم جوال',
      duplicated_rows: 'أرقام مكررة تم دمجها',
      multi_names: 'أسماء متعددة لنفس الجوال',
      visible_groups: 'العملاء الظاهرون',
      period_note: 'إجمالي العملاء ثابت، والفترة توضّح من زار المطعم خلال المدة المحددة.',
      diagnostic: 'معلومات غير معروضة',
      business_id: 'معرف المطعم',
      support_ref: 'معرف الدعم',
      loaded_at: 'آخر تحديث',
      source_rpc: 'مصدر البيانات جاهز',
      source_direct: 'مصدر البيانات جاهز',
      search_placeholder: 'ابحث باسم العميل أو رقم الجوال...',
      all: 'الكل',
      active_in_range: 'زاروا في الفترة',
      with_requests: 'لديهم زيارات',
      no_requests: 'بدون زيارات',
      repeat: 'زيارات متكررة',
      multi_name_filter: 'أكثر من اسم',
      no_phone_filter: 'بدون جوال',
      online: 'أونلاين',
      walk_in: 'محلي',
      inactive: 'لم يزوروا منذ فترة',
      reset: 'إعادة ضبط',
      showing: 'المعروض',
      of: 'من',
      phone: 'الجوال',
      latest_name: 'الاسم الأخير',
      used_names: 'الأسماء المستخدمة',
      customer_ids: 'بيانات داخلية',
      raw_count: 'الأسماء المرتبطة',
      visits: 'عدد الزيارات',
      period_visits: 'زيارات الفترة',
      first_seen: 'أول ظهور',
      last_seen: 'آخر ظهور',
      top_source: 'المصدر المعتاد',
      top_zone: 'المنطقة المفضلة',
      avg_party: 'متوسط المجموعة',
      actions: 'إجراء',
      open_profile: 'عرض الملف',
      close_profile: 'إغلاق الملف',
      back_to_list: 'العودة للقائمة',
      copy_phone: 'نسخ الجوال',
      copied: 'تم النسخ',
      no_data: 'لا توجد بيانات مطابقة',
      customer_file: 'ملف العميل',
      identity: 'بيانات العميل',
      requests_linked: 'كل الزيارات المرتبطة بنفس الجوال',
      booking_code: 'رمز الزيارة',
      date: 'التاريخ',
      source: 'المصدر',
      zone: 'المنطقة',
      party: 'عدد الأشخاص',
      status: 'الحالة',
      notes: 'ملاحظات',
      segments_summary: 'لمحات العملاء',
      loyalty_hint: 'هذا القسم لا يمنح نقاطًا تلقائيًا؛ هو يساعدك على ملاحظة العملاء المتكررين واتخاذ قرار المكافأة بنفسك.',
      gold: 'مرشحون للاهتمام',
      silver: 'زيارات جيدة',
      bronze: 'عادوا مرة أخرى',
      one_time: 'زيارة واحدة',
      top_repeat: 'العملاء الأكثر زيارة',
      needs_followup: 'عادوا مؤخرًا',
      export_excel: 'تحميل Excel',
      export_current: 'تصدير المعروض',
      export_all: 'تصدير كل العملاء',
      table_requests_only_warning: '',
      customers_today: 'عملاء اليوم',
      customers_7: 'خلال 7 أيام',
      customers_30: 'خلال 30 يوم',
      customers_90: 'خلال 90 يوم',
      source_summary: 'مصادر العملاء',
      zone_summary: 'المناطق الأكثر اختيارًا',
      simple_snapshot: 'نظرة سريعة',
      customer_love_note: 'هذه الأرقام تساعد المطعم يعرف من عاد، ومن يستحق اهتمامًا خاصًا.',
      print_current: 'طباعة المعروض',
      print_all: 'طباعة كل العملاء',
      loyalty_cup_note: 'علامة الكأس 🏆 تعني أن العميل كرر الزيارة بنفس رقم الجوال خلال أقل من 30 يوم. عند ظهوره في قائمة الانتظار يستطيع صاحب الصلاحية  فتح ملفه ومعرفة هل يستحق ترحيبًا خاصًا أو مكافأة.',
      cup_candidate: 'عميل متكرر قريبًا',
      no_auto_points: 'لا توجد نقاط أو مكافآت تلقائية هنا. القرار يبقى للمطعم.',
      visits_history: 'سجل الزيارات',
      unknown: 'غير محدد',
      other: 'غير مصنف',
      restored: 'مسترجع',
      waiting: 'انتظار',
      offered: 'جاهز',
      reserved: 'محجوز',
      occupied: 'مشغول',
      cleaning: 'تنظيف',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      expired: 'منتهي',
      no_show: 'لم يحضر'
    },
    en: {
      title: 'Customers',
      subtitle: 'A simple view of restaurant customers, visits, and sources.',
      loading: 'Loading customer base...',
      error: 'Unable to load customers',
      refresh: 'Refresh',
      range: 'Range',
      today: 'Today',
      last7: '7 Days',
      last30: '30 Days',
      last90: '90 Days',
      all_time: 'All Data',
      overview: 'Overview',
      list: 'Customer List',
      profile: 'Customer Profile',
      segments: 'Highlights',
      loyalty: 'Loyalty & Repeat Visits',
      export: 'Export',
      unique_customers: 'Registered Customers',
      raw_rows: 'Internal Rows',
      active_period: 'Visited in Range',
      requests_period: 'Range Visits',
      requests_all: 'All Visits',
      no_phone: 'No Phone',
      duplicated_rows: 'Merged Duplicate Phones',
      multi_names: 'Multiple Names',
      visible_groups: 'List Rows',
      period_note: 'Range affects activity only, not the total customer base.',
      diagnostic: 'Hidden Info',
      business_id: 'Business ID',
      support_ref: 'Support Ref',
      loaded_at: 'Last Update',
      source_rpc: 'Source: Secure RPC',
      source_direct: 'Source: Direct Fetch',
      search_placeholder: 'Search by customer name or phone...',
      all: 'All',
      active_in_range: 'Visited in Range',
      with_requests: 'With Visits',
      no_requests: 'No Visits',
      repeat: 'Repeat Visits',
      multi_name_filter: 'Multiple Names',
      no_phone_filter: 'No Phone',
      online: 'Online',
      walk_in: 'Local',
      inactive: 'Inactive',
      reset: 'Reset',
      showing: 'Showing',
      of: 'of',
      phone: 'Phone',
      latest_name: 'Latest Name',
      used_names: 'Used Names',
      customer_ids: 'Internal Data',
      raw_count: 'Linked Names',
      visits: 'Visits',
      period_visits: 'Range Visits',
      first_seen: 'First Seen',
      last_seen: 'Last Seen',
      top_source: 'Usual Source',
      top_zone: 'Top Zone',
      avg_party: 'Avg Party',
      actions: 'Actions',
      open_profile: 'View Profile',
      close_profile: 'Close Profile',
      back_to_list: 'Back to List',
      copy_phone: 'Copy Phone',
      copied: 'Copied',
      no_data: 'No matching data',
      customer_file: 'Customer File',
      identity: 'Customer Details',
      requests_linked: 'All Visits Linked to This Phone',
      booking_code: 'Visit Code',
      date: 'Date',
      source: 'Source',
      zone: 'Zone',
      party: 'Party',
      status: 'Status',
      notes: 'Notes',
      segments_summary: 'Customer Highlights',
      loyalty_hint: 'This is not an automatic points program; it highlights repeat customers so the restaurant can decide how to reward them.',
      gold: 'Worth Attention',
      silver: 'Good Repeat',
      bronze: 'Returned Again',
      one_time: 'One Time',
      top_repeat: 'Most Visiting Customers',
      needs_followup: 'Returned Recently',
      export_excel: 'Download Excel',
      export_current: 'Export Current Results',
      export_all: 'Export All Customers',
      table_requests_only_warning: '',
      customers_today: 'Today',
      customers_7: 'Last 7 Days',
      customers_30: 'Last 30 Days',
      customers_90: 'Last 90 Days',
      source_summary: 'Customer Sources',
      zone_summary: 'Top Zones',
      simple_snapshot: 'Quick Snapshot',
      customer_love_note: 'These numbers help the restaurant notice returning customers and reward good relationships.',
      print_current: 'Print Current',
      print_all: 'Print All Customers',
      loyalty_cup_note: 'The cup 🏆 means this phone number repeated a visit within less than 30 days. When it appears in the queue, staff can open the profile and decide whether to offer a special welcome or reward.',
      cup_candidate: 'Recent Repeat Customer',
      no_auto_points: 'No automatic points or rewards. The decision remains with the restaurant.',
      visits_history: 'Visit History',
      unknown: 'Unknown',
      other: 'Other',
      restored: 'Restored',
      waiting: 'Waiting',
      offered: 'Ready',
      reserved: 'Reserved',
      occupied: 'Occupied',
      cleaning: 'Cleaning',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
      no_show: 'No Show'
    }
  };

  function lang() {
    return String(window.currentLang || localStorage.getItem('easyq_lang') || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function t(key) {
    const l = lang();
    return (T[l] && T[l][key]) || T.ar[key] || key;
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

  function isAr() {
    return lang() === 'ar';
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(isAr() ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('00966')) return digits.slice(2);
    if (digits.startsWith('966')) return digits;
    if (digits.startsWith('05')) return `966${digits.slice(1)}`;
    if (digits.startsWith('5') && digits.length >= 9) return `966${digits}`;
    return digits;
  }

  function validPhone(phone) {
    return normalizePhone(phone).length >= 9;
  }

  function rangeStart(range) {
    const now = new Date();
    if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === 'last7') return new Date(now.getTime() - 7 * 86400000);
    if (range === 'last30') return new Date(now.getTime() - 30 * 86400000);
    if (range === 'last90') return new Date(now.getTime() - 90 * 86400000);
    return null;
  }

  function rangeLabel(range) {
    if (range === 'today') return t('today');
    if (range === 'last7') return t('last7');
    if (range === 'last30') return t('last30');
    if (range === 'last90') return t('last90');
    return t('all_time');
  }

  function daysSince(value) {
    if (!value) return null;
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return null;
    return Math.floor((Date.now() - ts) / 86400000);
  }

  function pct(part, total) {
    return total ? Math.round((n(part) / n(total)) * 100) : 0;
  }

  function sourceKey(source) {
    const s = String(source || '').toLowerCase();
    if (['walk_in', 'manual', 'local'].includes(s)) return 'walk_in';
    if (['web_booking', 'booking_page', 'online', 'qr_code', 'qr'].includes(s)) return 'online';
    if (['restored', 'restore', 'recovered'].includes(s)) return 'restored';
    return 'other';
  }

  function sourceLabel(source) {
    return t(sourceKey(source));
  }

  function topFromObject(obj) {
    const entries = Object.entries(obj || {}).filter(([, value]) => n(value) > 0);
    if (!entries.length) return null;
    entries.sort((a, b) => n(b[1]) - n(a[1]));
    return entries[0][0];
  }

  function getBusinessId() {
    const candidates = [
      window.currentBusinessProfile?.id,
      window.currentBusiness?.id,
      window.currentUser?.business_id,
      window.BUSINESS_ID
    ];
    return candidates.find((x) => x && String(x).trim() && !['undefined', 'null'].includes(String(x).trim())) || null;
  }

  function getBusinessProfile() {
    return window.currentBusinessProfile || window.currentBusiness || {};
  }

  function canOpen() {
    if (!window.currentUser) return false;
    if (window.currentUser.role === 'super_admin') return false;
    if (typeof window.canDo !== 'function') return true;
    return window.canDo('view_customers') || window.canDo('manage_queue') || window.canDo('view_reports') || window.canDo('add_walkin');
  }

  function ensureStyles() {
    if ($('eqcFinalStyles')) return;
    const style = document.createElement('style');
    style.id = 'eqcFinalStyles';
    style.textContent = `
      .eqc-page{font-family:inherit;color:#111827;padding:18px;background:#F5F7FF;min-height:calc(100vh - 120px)}
      .eqc-page[dir="rtl"]{direction:rtl;text-align:right}.eqc-page[dir="ltr"]{direction:ltr;text-align:left}
      .eqc-hero{background:linear-gradient(135deg,#070219,#060427 54%,#0E146D);color:#fff;border-radius:24px;padding:20px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:16px;box-shadow:0 18px 45px rgba(15,23,42,.18);position:relative;overflow:hidden}.eqc-hero:after{content:'';position:absolute;inset-inline-end:-80px;top:-110px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.10)}
      .eqc-hero h2{margin:0 0 8px;font-size:24px;font-weight:1000}.eqc-hero p{margin:0;color:rgba(255,255,255,.75);font-size:13px;font-weight:800;line-height:1.8}.eqc-hero>*{position:relative;z-index:1}
      .eqc-health{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:15px}.eqc-health-num{font-size:34px;font-weight:1000;line-height:1}.eqc-health-label{font-size:13px;font-weight:900;color:rgba(255,255,255,.80);margin-top:6px}.eqc-health-note{font-size:11px;font-weight:800;color:rgba(255,255,255,.68);line-height:1.7;margin-top:9px}
      .eqc-btn,.eqc-chip,.eqc-tab,.eqc-mini{border:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:0 13px;border-radius:13px;font-size:12px;font-weight:1000;cursor:pointer;transition:.16s ease}.eqc-btn:hover,.eqc-chip:hover,.eqc-tab:hover,.eqc-mini:hover{transform:translateY(-1px)}.eqc-btn.primary{background:#fff;color:#0E146D}.eqc-btn.dark{background:#0E146D;color:#fff}.eqc-btn.light{background:#EEF2FF;color:#0E146D}.eqc-btn.danger{background:#FEF2F2;color:#B91C1C}
      .eqc-toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;margin-top:14px;background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:12px;box-shadow:0 10px 26px rgba(15,23,42,.055)}.eqc-chip-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.eqc-chip{background:#fff;border:1px solid #E5E7EB;color:#64748B;border-radius:999px;min-height:35px}.eqc-chip.active{background:#0E146D;border-color:#0E146D;color:#fff}.eqc-search{min-height:40px;border:1px solid #E5E7EB;border-radius:13px;padding:0 12px;background:#F8FAFC;color:#111827;font-weight:900;min-width:320px;outline:none}.eqc-search:focus{border-color:#0E146D;box-shadow:0 0 0 3px rgba(14,20,109,.10)}
      .eqc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.eqc-tab{background:#fff;border:1px solid #E5E7EB;color:#64748B;border-radius:999px}.eqc-tab.active{background:#0E146D;border-color:#0E146D;color:#fff}
      .eqc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.eqc-card{background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:15px;box-shadow:0 10px 26px rgba(15,23,42,.055);min-width:0}.eqc-card.wide{grid-column:span 2}.eqc-card.full{grid-column:1/-1}.eqc-card.soft{background:linear-gradient(180deg,#fff,#F8FAFF)}
      .eqc-title{font-size:13px;font-weight:1000;color:#111827;display:flex;align-items:center;gap:8px}.eqc-title i{color:#0E146D}.eqc-sub{font-size:11px;color:#64748B;font-weight:800;line-height:1.7;margin-top:4px}.eqc-num{font-size:30px;font-weight:1000;color:#0F172A;line-height:1;margin-top:10px}.eqc-small-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.eqc-small{background:#F8FAFC;border:1px solid #EEF2F7;border-radius:15px;padding:10px}.eqc-small-num{font-size:19px;font-weight:1000}.eqc-small-label{font-size:11px;font-weight:800;color:#64748B;margin-top:3px}
      .eqc-badge{min-height:25px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:1000;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}.eqc-badge.ok{background:#ECFDF5;color:#047857}.eqc-badge.warn{background:#FFFBEB;color:#B45309}.eqc-badge.bad{background:#FEF2F2;color:#B91C1C}.eqc-badge.info{background:#EFF6FF;color:#1D4ED8}.eqc-badge.wait{background:#EEF2FF;color:#0E146D}.eqc-badge.muted{background:#F3F4F6;color:#6B7280}
      .eqc-table-wrap{overflow:auto;border:1px solid #EEF2F7;border-radius:16px}.eqc-table{width:100%;border-collapse:collapse;min-width:1050px}.eqc-table th,.eqc-table td{padding:12px;border-bottom:1px solid #EEF2F7;text-align:start;font-size:12px;font-weight:850;vertical-align:top}.eqc-table th{background:#F8FAFC;color:#64748B;font-weight:1000;position:sticky;top:0}.eqc-table tr:last-child td{border-bottom:none}.eqc-phone{direction:ltr;text-align:left;font-weight:1000;color:#0E146D}.eqc-ids{direction:ltr;text-align:left;max-width:360px;white-space:normal;word-break:break-all;color:#475569;font-size:11px;line-height:1.6}
      .eqc-list{display:flex;flex-direction:column;gap:9px}.eqc-item{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;background:#F8FAFC;border:1px solid #EEF2F7;border-radius:16px}.eqc-icon{width:40px;height:40px;border-radius:14px;background:#EEF2FF;color:#0E146D;display:inline-flex;align-items:center;justify-content:center}.eqc-item-title{font-size:12.5px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.eqc-item-sub{font-size:11px;color:#64748B;font-weight:800;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .eqc-empty{padding:22px;text-align:center;color:#64748B;font-weight:900;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:16px}.eqc-loader{min-height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#64748B;font-weight:1000}.eqc-spinner{width:34px;height:34px;border-radius:50%;border:4px solid rgba(14,20,109,.13);border-top-color:#0E146D;animation:eqcSpin .8s linear infinite}@keyframes eqcSpin{to{transform:rotate(360deg)}}
      .eqc-profile{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:12px}.eqc-avatar{width:62px;height:62px;border-radius:20px;background:#EEF2FF;color:#0E146D;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:1000}.eqc-pill-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.eqc-pill{background:#F8FAFC;border:1px solid #EEF2F7;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:900;color:#475569}.eqc-alert{display:flex;gap:10px;align-items:flex-start;padding:11px;border-radius:16px;border:1px solid #EEF2F7;background:#fff}.eqc-alert.warn{background:#FFFBEB;border-color:#FDE68A}.eqc-alert.bad{background:#FEF2F2;border-color:#FECACA}.eqc-alert.ok{background:#ECFDF5;border-color:#A7F3D0}
      .eqc-bars{display:flex;flex-direction:column;gap:8px}.eqc-bar{display:grid;grid-template-columns:135px minmax(0,1fr) 48px;gap:8px;align-items:center;font-size:11px;font-weight:900;color:#475569}.eqc-track{height:9px;background:#EDF2FF;border-radius:999px;overflow:hidden}.eqc-fill{height:100%;background:linear-gradient(90deg,#0E146D,#60A5FA);border-radius:999px}
      @media(max-width:1180px){.eqc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.eqc-hero,.eqc-profile{grid-template-columns:1fr}}@media(max-width:720px){.eqc-page{padding:12px}.eqc-grid{grid-template-columns:1fr}.eqc-card.wide{grid-column:span 1}.eqc-search{min-width:100%;width:100%}.eqc-hero h2{font-size:20px}}
    `;
    document.head.appendChild(style);
  }

  function openPanel(title, subtitle, html) {
    ensureStyles();
    if (typeof window.openFullPagePanel === 'function') {
      window.openFullPagePanel(title, subtitle, html);
      return;
    }
    let panel = $('eqcFallbackPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'eqcFallbackPanel';
      panel.style.cssText = 'position:fixed;inset:0;background:#F5F7FF;z-index:99999;overflow:auto;';
      document.body.appendChild(panel);
    }
    panel.innerHTML = `<div style="padding:14px;background:#070219;color:#fff;display:flex;justify-content:space-between;gap:12px;"><div><b>${esc(title)}</b><div style="font-size:12px;opacity:.7;margin-top:4px;">${esc(subtitle)}</div></div><button onclick="document.getElementById('eqcFallbackPanel').remove()" style="width:38px;height:38px;border:none;border-radius:12px;">×</button></div>${html}`;
  }

  function loadingHtml() {
    return `<div class="eqc-page" dir="${isAr() ? 'rtl' : 'ltr'}"><div class="eqc-loader"><div class="eqc-spinner"></div><div>${esc(t('loading'))}</div></div></div>`;
  }

  function errorHtml(message) {
    return `<div class="eqc-page" dir="${isAr() ? 'rtl' : 'ltr'}"><div class="eqc-card full"><div class="eqc-alert bad"><i class="fas fa-triangle-exclamation"></i><div><div class="eqc-title">${esc(t('error'))}</div><div class="eqc-sub">${esc(message || '')}</div></div></div></div></div>`;
  }

  function setActiveSidebar(view) {
    $$('.sidebar .sub-menu-item').forEach((item) => {
      const expected = view === 'overview' ? 'customers-list' : `customers-${view}`;
      item.classList.toggle('active', item.getAttribute('data-view') === expected);
    });
    const parent = document.querySelector('.main-menu-item[data-menu="customers"]');
    if (parent) parent.classList.add('open', 'active');
    const submenu = document.querySelector('.sub-menu[data-submenu="customers"]');
    if (submenu) submenu.classList.add('open');
  }

  async function fetchAllRows(buildQuery, pageSize = 1000, maxPages = 50) {
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

  async function tryRpcLoad(businessId) {
    const { data, error } = await window.supabase.rpc('get_restaurant_customers_dashboard', {
      p_business_id: businessId,
      p_range: EQC.range
    });
    if (error) throw error;
    return normalizePayload(data, 'rpc');
  }

  async function directLoad(businessId) {
    const customers = await fetchAllRows(() => window.supabase
      .from('customers')
      .select('id,business_id,name,phone,whatsapp_number,notes,created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    );

    const requests = await fetchAllRows(() => window.supabase
      .from('table_requests')
      .select('id,business_id,customer_id,customer_name_snapshot,customer_phone_snapshot,booking_code,request_source,requested_party_size,status,zone_name,created_at,expired_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    );

    return buildDirectPayload(customers, requests, businessId);
  }

  async function loadData(force = false) {
    if (EQC.loading) return EQC.data;
    if (!force && EQC.data && EQC.data.range === EQC.range) return EQC.data;

    const businessId = getBusinessId();
    if (!businessId) throw new Error('business_id غير متوفر في الجلسة الحالية');
    if (!window.supabase) throw new Error('Supabase client غير متوفر');

    EQC.loading = true;
    EQC.lastError = null;

    try {
      let data;
      try {
        data = await tryRpcLoad(businessId);
      } catch (rpcErr) {
        console.warn('[EASY-Q Customers] RPC failed, falling back to direct fetch:', rpcErr);
        data = await directLoad(businessId);
        data.rpcError = rpcErr.message || String(rpcErr);
      }

      data.businessId = businessId;
      data.range = EQC.range;
      data.loadedAt = new Date().toISOString();
      EQC.data = data;
      EQC.loadedAt = new Date();
      return data;
    } finally {
      EQC.loading = false;
    }
  }

  function normalizePayload(payload, source) {
    const p = Array.isArray(payload) ? payload[0] : payload;
    const business = p?.business || getBusinessProfile() || {};
    const stats = p?.stats || {};
    const customers = Array.isArray(p?.customers) ? p.customers.map(finalizeCustomer) : [];
    const filtered = filterCustomers(customers);

    return {
      source,
      business,
      stats: normalizeStats(stats, customers),
      customers,
      filtered,
      segments: buildSegments(customers),
      loyalty: buildLoyalty(customers),
      range: EQC.range
    };
  }

  function normalizeStats(stats, customers) {
    const s = stats || {};
    return {
      rawCustomerRows: n(s.raw_customer_rows ?? s.rawCustomerRows),
      customerRowsWithValidPhone: n(s.customer_rows_with_valid_phone ?? s.customerRowsWithValidPhone),
      uniqueCustomersByPhone: n(s.unique_customers_by_phone ?? s.uniqueCustomersByPhone),
      customerRowsWithoutValidPhone: n(s.customer_rows_without_valid_phone ?? s.customerRowsWithoutValidPhone),
      duplicatedCustomerRowsByPhone: n(s.duplicated_customer_rows_by_phone ?? s.duplicatedCustomerRowsByPhone),
      requestRowsAllTime: n(s.request_rows_all_time ?? s.requestRowsAllTime),
      requestRowsInRange: n(s.request_rows_in_range ?? s.requestRowsInRange),
      activeCustomersAllTime: n(s.active_customers_all_time ?? s.activeCustomersAllTime),
      activeCustomersInRange: n(s.active_customers_in_range ?? s.activeCustomersInRange),
      visibleCustomerGroups: n((s.visible_customer_groups ?? s.visibleCustomerGroups) || customers.length),
      multiNameCustomers: customers.filter((c) => c.hasMultipleNames).length,
      listRowsIncludingNoPhone: customers.length
    };
  }

  function buildDirectPayload(customers, requests, businessId) {
    const start = rangeStart(EQC.range);
    const map = new Map();

    function keyForCustomer(c) {
      const phone = normalizePhone(c.phone || c.whatsapp_number || '');
      return phone && phone.length >= 9 ? `phone:${phone}` : `id:${c.id}`;
    }

    function ensure(key, seed) {
      if (!map.has(key)) {
        const phone = normalizePhone(seed.phone || seed.whatsapp_number || seed.customer_phone_snapshot || '');
        map.set(key, {
          key,
          cleanPhone: phone || '',
          phone: phone || t('no_phone'),
          name: seed.name || seed.customer_name_snapshot || 'عميل',
          namesUsed: [],
          customerIds: [],
          rawCustomerCount: 0,
          notes: '',
          firstSeen: seed.created_at || null,
          lastSeen: seed.created_at || null,
          sourceCounts: {},
          zoneCounts: {},
          statusCounts: {},
          requests: [],
          avgParty: 0,
          partySizes: [],
          activeInRange: false,
          periodRequests: 0,
          totalRequests: 0,
          hasValidPhone: !!phone && phone.length >= 9
        });
      }
      return map.get(key);
    }

    customers.forEach((c) => {
      const key = keyForCustomer(c);
      const row = ensure(key, c);
      row.rawCustomerCount += 1;
      if (c.id && !row.customerIds.includes(c.id)) row.customerIds.push(c.id);
      if (c.name && !row.namesUsed.includes(c.name)) row.namesUsed.push(c.name);
      if (c.name) row.name = c.name;
      if (c.notes) row.notes = row.notes ? `${row.notes} | ${c.notes}` : c.notes;
      if (c.created_at) {
        if (!row.firstSeen || new Date(c.created_at) < new Date(row.firstSeen)) row.firstSeen = c.created_at;
        if (!row.lastSeen || new Date(c.created_at) > new Date(row.lastSeen)) row.lastSeen = c.created_at;
      }
    });

    const phoneToKey = new Map();
    map.forEach((row, key) => {
      if (row.cleanPhone) phoneToKey.set(row.cleanPhone, key);
    });
    const idToKey = new Map();
    map.forEach((row, key) => {
      (row.customerIds || []).forEach((id) => idToKey.set(id, key));
    });

    requests.forEach((r) => {
      const phone = normalizePhone(r.customer_phone_snapshot || '');
      const key = idToKey.get(r.customer_id) || phoneToKey.get(phone) || (phone ? `phone:${phone}` : `request:${r.id}`);
      const row = ensure(key, {
        customer_phone_snapshot: r.customer_phone_snapshot,
        customer_name_snapshot: r.customer_name_snapshot,
        created_at: r.created_at
      });

      if (r.customer_id && !row.customerIds.includes(r.customer_id)) row.customerIds.push(r.customer_id);
      if (r.customer_name_snapshot && !row.namesUsed.includes(r.customer_name_snapshot)) row.namesUsed.push(r.customer_name_snapshot);
      if (r.customer_name_snapshot) row.name = r.customer_name_snapshot;
      row.requests.push(r);
      row.totalRequests += 1;
      const inRange = !start || new Date(r.created_at) >= start;
      if (inRange) {
        row.periodRequests += 1;
        row.activeInRange = true;
      }
      const src = sourceKey(r.request_source);
      row.sourceCounts[src] = (row.sourceCounts[src] || 0) + 1;
      const zone = r.zone_name || t('unknown');
      row.zoneCounts[zone] = (row.zoneCounts[zone] || 0) + 1;
      const status = r.status || 'unknown';
      row.statusCounts[status] = (row.statusCounts[status] || 0) + 1;
      row.partySizes.push(n(r.requested_party_size) || 1);
      if (r.created_at) {
        if (!row.firstSeen || new Date(r.created_at) < new Date(row.firstSeen)) row.firstSeen = r.created_at;
        if (!row.lastSeen || new Date(r.created_at) > new Date(row.lastSeen)) row.lastSeen = r.created_at;
      }
    });

    const rows = Array.from(map.values()).map((row) => finalizeCustomer(row));
    const validPhoneRows = customers.map((c) => normalizePhone(c.phone || c.whatsapp_number)).filter((p) => p && p.length >= 9);
    const activeAllSet = new Set();
    const activeRangeSet = new Set();
    const reqStart = rangeStart(EQC.range);
    requests.forEach((r) => {
      const phone = normalizePhone(r.customer_phone_snapshot || '');
      if (phone && phone.length >= 9) {
        activeAllSet.add(phone);
        if (!reqStart || new Date(r.created_at) >= reqStart) activeRangeSet.add(phone);
      }
    });

    const payload = {
      source: 'direct',
      business: getBusinessProfile(),
      stats: {
        rawCustomerRows: customers.length,
        customerRowsWithValidPhone: validPhoneRows.length,
        uniqueCustomersByPhone: new Set(validPhoneRows).size,
        customerRowsWithoutValidPhone: customers.length - validPhoneRows.length,
        duplicatedCustomerRowsByPhone: customers.length - new Set(validPhoneRows).size,
        requestRowsAllTime: requests.length,
        requestRowsInRange: reqStart ? requests.filter((r) => new Date(r.created_at) >= reqStart).length : requests.length,
        activeCustomersAllTime: activeAllSet.size,
        activeCustomersInRange: activeRangeSet.size,
        visibleCustomerGroups: rows.length,
        multiNameCustomers: rows.filter((r) => r.hasMultipleNames).length,
        listRowsIncludingNoPhone: rows.length
      },
      customers: rows,
      range: EQC.range
    };
    payload.filtered = filterCustomers(payload.customers);
    payload.segments = buildSegments(payload.customers);
    payload.loyalty = buildLoyalty(payload.customers);
    return payload;
  }

  function finalizeCustomer(row) {
    const sourceCounts = row.sourceCounts || row.source_counts || {};
    const zoneCounts = row.zoneCounts || row.zone_counts || {};
    const statusCounts = row.statusCounts || row.status_counts || {};
    const requests = Array.isArray(row.requests) ? row.requests : [];
    const totalRequests = n(row.totalRequests ?? row.total_requests ?? requests.length);
    const periodRequests = n(row.periodRequests ?? row.period_requests);
    const avgParty = n(row.avgParty ?? row.avg_party_size);
    const lossCount = n(statusCounts.cancelled) + n(statusCounts.expired) + n(statusCounts.no_show);
    const lastSeen = row.lastSeen || row.last_seen || row.lastRequestAt || row.last_request_at || row.lastCustomerCreatedAt || row.last_customer_created_at;
    const firstSeen = row.firstSeen || row.first_seen || row.firstRequestAt || row.first_request_at || row.firstCustomerCreatedAt || row.first_customer_created_at;
    const namesUsed = Array.isArray(row.namesUsed) ? row.namesUsed : (Array.isArray(row.names_used) ? row.names_used : []);
    const customerIds = Array.isArray(row.customerIds) ? row.customerIds : (Array.isArray(row.customer_ids) ? row.customer_ids : []);
    const cleanPhone = row.cleanPhone || row.clean_phone || normalizePhone(row.phone);
    const preferredSource = topFromObject(sourceCounts) || 'other';
    const preferredZone = topFromObject(zoneCounts) || t('unknown');
    const inactive = daysSince(lastSeen) !== null && daysSince(lastSeen) >= 30;
    const repeat = totalRequests > 1 || n(row.rawCustomerCount ?? row.raw_customer_count) > 1;
    const vip = totalRequests >= 5 && pct(lossCount, totalRequests) <= 20;
    const highLoss = totalRequests >= 2 && pct(lossCount, totalRequests) >= 50;
    const level = totalRequests >= 5 ? 'gold' : totalRequests >= 3 ? 'silver' : totalRequests >= 2 ? 'bronze' : 'one_time';

    return {
      ...row,
      key: row.key || (cleanPhone ? `phone:${cleanPhone}` : `id:${customerIds[0] || Math.random()}`),
      name: row.name || row.last_name || namesUsed[0] || 'عميل',
      cleanPhone,
      phone: cleanPhone || row.phone || t('no_phone'),
      namesUsed: namesUsed.length ? namesUsed : [row.name || row.last_name || 'عميل'],
      customerIds,
      rawCustomerCount: n((row.rawCustomerCount ?? row.raw_customer_count) || customerIds.length),
      firstSeen,
      lastSeen,
      requests,
      totalRequests,
      periodRequests,
      activeInRange: !!row.activeInRange || !!row.active_in_range || periodRequests > 0,
      sourceCounts,
      zoneCounts,
      statusCounts,
      preferredSource,
      preferredZone,
      avgParty,
      inactive,
      repeat,
      vip,
      highLoss,
      level,
      lossCount,
      hasValidPhone: cleanPhone && cleanPhone.length >= 9,
      hasMultipleNames: (namesUsed || []).filter(Boolean).length > 1,
      daysSinceLast: daysSince(lastSeen),
      repeatWithin30: hasRecentRepeat(requests, 30) || (totalRequests >= 2 && daysSince(lastSeen) !== null && daysSince(lastSeen) <= 30)
    };
  }

  function filterCustomers(rows) {
    const q = String(EQC.search || '').trim().toLowerCase();
    let out = rows.filter((c) => {
      const searchText = [c.name, c.phone, c.cleanPhone, c.notes, ...(c.namesUsed || []), ...(c.customerIds || [])]
        .map((v) => String(v || '').toLowerCase()).join(' ');
      if (q && !searchText.includes(q)) return false;

      if (EQC.filter === 'active') return c.activeInRange;
      if (EQC.filter === 'with_requests') return c.totalRequests > 0;
      if (EQC.filter === 'no_requests') return c.totalRequests === 0;
      if (EQC.filter === 'repeat') return c.repeat;
      if (EQC.filter === 'multi_names') return c.hasMultipleNames;
      if (EQC.filter === 'no_phone') return !c.hasValidPhone;
      if (EQC.filter === 'online') return c.preferredSource === 'online';
      if (EQC.filter === 'walk_in') return c.preferredSource === 'walk_in';
      if (EQC.filter === 'inactive') return c.inactive;
      return true;
    });

    out.sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0));
    return out;
  }

  function visitsOf(c) {
    return Array.isArray(c.requests) ? c.requests : [];
  }

  function visitDate(r) {
    return r && r.created_at ? new Date(r.created_at) : null;
  }

  function customerVisitedInRange(c, key) {
    const start = rangeStart(key);
    return visitsOf(c).some((r) => {
      const d = visitDate(r);
      if (!d || !Number.isFinite(d.getTime())) return false;
      return !start || d >= start;
    });
  }

  function countVisitedInRange(rows, key) {
    return (rows || []).filter((c) => customerVisitedInRange(c, key)).length;
  }

  function hasRecentRepeat(requests, days = 30) {
    const times = (requests || [])
      .map((r) => new Date(r.created_at || 0).getTime())
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => b - a);
    if (times.length < 2) return false;
    for (let i = 0; i < times.length - 1; i++) {
      if ((times[i] - times[i + 1]) <= days * 86400000) return true;
    }
    return false;
  }

  function sourceSummary(rows) {
    const out = {};
    (rows || []).forEach((c) => {
      Object.entries(c.sourceCounts || {}).forEach(([k, v]) => { out[k] = (out[k] || 0) + n(v); });
    });
    return Object.entries(out).map(([label, value]) => ({ label: t(label), value })).sort((a, b) => b.value - a.value);
  }

  function zoneSummary(rows) {
    const out = {};
    (rows || []).forEach((c) => {
      Object.entries(c.zoneCounts || {}).forEach(([k, v]) => { out[k] = (out[k] || 0) + n(v); });
    });
    return Object.entries(out).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }

  function rangeCustomers(rows) {
    if (EQC.range === 'all') return rows || [];
    return (rows || []).filter((c) => customerVisitedInRange(c, EQC.range));
  }

  function buildSegments(rows) {
    const items = [
      ['active', t('active_in_range'), rows.filter((r) => r.activeInRange), 'fa-heart-pulse'],
      ['repeat', t('repeat'), rows.filter((r) => r.repeat), 'fa-repeat'],
      ['multi_names', t('multi_name_filter'), rows.filter((r) => r.hasMultipleNames), 'fa-id-card'],
      ['no_phone', t('no_phone_filter'), rows.filter((r) => !r.hasValidPhone), 'fa-phone-slash'],
      ['online', t('online'), rows.filter((r) => r.preferredSource === 'online'), 'fa-globe'],
      ['walk_in', t('walk_in'), rows.filter((r) => r.preferredSource === 'walk_in'), 'fa-store'],
      ['inactive', t('inactive'), rows.filter((r) => r.inactive), 'fa-user-clock']
    ];
    return items.map(([key, label, list, icon]) => ({ key, label, count: list.length, percent: pct(list.length, rows.length), icon, rows: list }));
  }

  function buildLoyalty(rows) {
    return {
      gold: rows.filter((r) => r.level === 'gold'),
      silver: rows.filter((r) => r.level === 'silver'),
      bronze: rows.filter((r) => r.level === 'bronze'),
      one_time: rows.filter((r) => r.level === 'one_time'),
      topRepeat: rows.slice().sort((a, b) => b.totalRequests - a.totalRequests || b.rawCustomerCount - a.rawCustomerCount).slice(0, 12),
      followup: rows.filter((r) => r.inactive && r.repeat).slice(0, 12)
    };
  }

  function shellHtml(data) {
    const business = data.business || getBusinessProfile() || {};
    const stats = data.stats || {};
    const today = countVisitedInRange(data.customers || [], 'today');
    const last7 = countVisitedInRange(data.customers || [], 'last7');
    const last30 = countVisitedInRange(data.customers || [], 'last30');
    const last90 = countVisitedInRange(data.customers || [], 'last90');
    return `
      <div class="eqc-page" id="eqCustomers" dir="${isAr() ? 'rtl' : 'ltr'}">
        <section class="eqc-hero">
          <div>
            <h2>${esc(t('title'))}</h2>
            <p>${esc(t('subtitle'))}</p>
            <div class="eqc-chip-row" style="margin-top:14px;">
              <button class="eqc-btn primary" onclick="EQRestaurantCustomers.refresh()"><i class="fas fa-sync-alt"></i>${esc(t('refresh'))}</button>
              <span class="eqc-badge info">${esc(business.name || '')}</span>
              <span class="eqc-badge wait">${esc(business.support_ref || '')}</span>
            </div>
            <div class="eqc-chip-row" style="margin-top:14px;">
              <span class="eqc-badge muted">${esc(t('customers_today'))}: ${esc(today)}</span>
              <span class="eqc-badge muted">${esc(t('customers_7'))}: ${esc(last7)}</span>
              <span class="eqc-badge muted">${esc(t('customers_30'))}: ${esc(last30)}</span>
              <span class="eqc-badge muted">${esc(t('customers_90'))}: ${esc(last90)}</span>
            </div>
          </div>
          <div class="eqc-health">
            <div class="eqc-health-num">${esc(stats.uniqueCustomersByPhone)}</div>
            <div class="eqc-health-label">${esc(t('unique_customers'))}</div>
            <div class="eqc-health-note">${esc(t('customer_love_note'))}</div>
          </div>
        </section>

        <section class="eqc-toolbar">
          <div>
            <div class="eqc-sub" style="margin-bottom:8px;">${esc(t('range'))}</div>
            <div class="eqc-chip-row">
              ${rangeButton('today')}${rangeButton('last7')}${rangeButton('last30')}${rangeButton('last90')}${rangeButton('all')}
            </div>
          </div>
          <div class="eqc-chip-row" style="align-items:flex-end;">
            <input id="eqcSearchInput" class="eqc-search" value="${esc(EQC.search)}" placeholder="${esc(t('search_placeholder'))}" oninput="EQRestaurantCustomers.setSearch(this.value)">
            <button class="eqc-btn light" onclick="EQRestaurantCustomers.reset()"><i class="fas fa-rotate-left"></i>${esc(t('reset'))}</button>
          </div>
        </section>

        <nav class="eqc-tabs">
          ${tabButton('overview', 'overview', 'fa-chart-pie')}
          ${tabButton('list', 'list', 'fa-list')}
          ${tabButton('profile', 'profile', 'fa-id-card')}
          ${tabButton('segments', 'segments', 'fa-lightbulb')}
          ${tabButton('loyalty', 'loyalty', 'fa-trophy')}
          ${tabButton('export', 'export', 'fa-file-excel')}
        </nav>

        <div id="eqcContent"></div>
      </div>
    `;
  }

  function rangeButton(key) {
    const label = key === 'all' ? t('all_time') : t(key);
    return `<button class="eqc-chip ${EQC.range === key ? 'active' : ''}" onclick="EQRestaurantCustomers.setRange('${key}')">${esc(label)}</button>`;
  }

  function tabButton(key, labelKey, icon) {
    return `<button class="eqc-tab ${EQC.view === key ? 'active' : ''}" onclick="EQRestaurantCustomers.setView('${key}')"><i class="fas ${icon}"></i>${esc(t(labelKey))}</button>`;
  }

  function kpi(icon, title, value, sub, mini) {
    return `<div class="eqc-card soft"><div class="eqc-title"><i class="fas ${icon}"></i>${esc(title)}</div><div class="eqc-num">${esc(value)}</div><div class="eqc-sub">${esc(sub || '')}</div>${mini ? `<div class="eqc-small-grid">${mini.map(([a,b])=>`<div class="eqc-small"><div class="eqc-small-num">${esc(b)}</div><div class="eqc-small-label">${esc(a)}</div></div>`).join('')}</div>` : ''}</div>`;
  }

  function renderContent() {
    const wrap = $('eqcContent');
    if (!wrap || !EQC.data) return;
    const data = EQC.data;
    data.filtered = filterCustomers(data.customers || []);
    data.segments = buildSegments(data.customers || []);
    data.loyalty = buildLoyalty(data.customers || []);

    if (EQC.view === 'list') wrap.innerHTML = listHtml(data);
    else if (EQC.view === 'profile') wrap.innerHTML = profileHtml(data);
    else if (EQC.view === 'segments') wrap.innerHTML = segmentsHtml(data);
    else if (EQC.view === 'loyalty') wrap.innerHTML = loyaltyHtml(data);
    else if (EQC.view === 'export') wrap.innerHTML = exportHtml(data);
    else wrap.innerHTML = overviewHtml(data);
  }

  function overviewHtml(data) {
    const ranged = rangeCustomers(data.customers || []);
    const today = countVisitedInRange(data.customers || [], 'today');
    const last7 = countVisitedInRange(data.customers || [], 'last7');
    const last30 = countVisitedInRange(data.customers || [], 'last30');
    const last90 = countVisitedInRange(data.customers || [], 'last90');
    const topRepeat = (data.loyalty.topRepeat || []).filter((c) => c.totalRequests > 0).slice(0, 8);
    return `<div class="eqc-grid">
      ${kpi('fa-calendar-day', t('customers_today'), today, t('visits_history'))}
      ${kpi('fa-calendar-week', t('customers_7'), last7, t('visits_history'))}
      ${kpi('fa-calendar-days', t('customers_30'), last30, t('visits_history'))}
      ${kpi('fa-clock-rotate-left', t('customers_90'), last90, t('visits_history'))}
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-store"></i>${esc(t('source_summary'))}</div><div class="eqc-sub">${esc(t('customer_love_note'))}</div>${barsHtml(sourceSummary(ranged).slice(0,6), 1)}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-location-dot"></i>${esc(t('zone_summary'))}</div><div class="eqc-sub">${esc(rangeLabel(EQC.range))}</div>${barsHtml(zoneSummary(ranged), 1)}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-trophy"></i>${esc(t('top_repeat'))}</div><div class="eqc-sub">${esc(t('loyalty_hint'))}</div>${miniCustomers(topRepeat)}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-list"></i>${esc(t('list'))}</div><div class="eqc-sub">${esc(t('showing'))}: ${esc(Math.min(8, data.filtered.length))} ${esc(t('of'))} ${esc(data.filtered.length)}</div>${customersTable(data.filtered.slice(0,8), true)}</div>
    </div>`;
  }

  function filtersHtml() {
    const filters = [
      ['all', t('all')],
      ['active', t('active_in_range')],
      ['with_requests', t('with_requests')],
      ['no_requests', t('no_requests')],
      ['repeat', t('repeat')],
      ['multi_names', t('multi_name_filter')],
      ['no_phone', t('no_phone_filter')],
      ['online', t('online')],
      ['walk_in', t('walk_in')],
      ['inactive', t('inactive')]
    ];
    return `<div class="eqc-chip-row">${filters.map(([key,label])=>`<button class="eqc-chip ${EQC.filter===key?'active':''}" onclick="EQRestaurantCustomers.setFilter('${key}')">${esc(label)}</button>`).join('')}</div>`;
  }

  function listHtml(data) {
    const rows = data.filtered || [];
    const pages = Math.max(1, Math.ceil(rows.length / EQC.pageSize));
    if (EQC.page > pages) EQC.page = pages;
    const start = (EQC.page - 1) * EQC.pageSize;
    const pageRows = rows.slice(start, start + EQC.pageSize);
    return `<div class="eqc-grid">
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-filter"></i>${esc(t('list'))}</div><div class="eqc-sub">${esc(t('showing'))}: ${esc(rows.length)} ${esc(t('of'))} ${esc(data.customers.length)}</div><div style="margin-top:12px;">${filtersHtml()}</div></div>
      <div class="eqc-card full"><div class="eqc-chip-row" style="justify-content:space-between;margin-bottom:12px;"><div class="eqc-sub">${esc(t('showing'))} ${esc(start + 1)}-${esc(start + pageRows.length)} ${esc(t('of'))} ${esc(rows.length)}</div><div class="eqc-chip-row"><button class="eqc-btn light" onclick="EQRestaurantCustomers.prevPage()">‹</button><span class="eqc-badge muted">${esc(EQC.page)} / ${esc(pages)}</span><button class="eqc-btn light" onclick="EQRestaurantCustomers.nextPage()">›</button></div></div>${customersTable(pageRows, true)}</div>
    </div>`;
  }

  function customersTable(rows, showActions) {
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-table-wrap"><table class="eqc-table"><thead><tr>
      <th>${esc(t('latest_name'))}</th><th>${esc(t('phone'))}</th><th>${esc(t('used_names'))}</th><th>${esc(t('visits'))}</th><th>${esc(t('period_visits'))}</th><th>${esc(t('last_seen'))}</th><th>${esc(t('top_source'))}</th><th>${esc(t('top_zone'))}</th>${showActions ? `<th>${esc(t('actions'))}</th>` : ''}
    </tr></thead><tbody>${rows.map((c)=>`<tr>
      <td><b>${esc(c.repeatWithin30 ? '🏆 ' : '')}${esc(c.name)}</b><div class="eqc-sub">${esc(c.repeatWithin30 ? t('cup_candidate') : (c.hasMultipleNames ? t('multi_name_filter') : ''))}</div></td>
      <td class="eqc-phone">${esc(c.cleanPhone || t('no_phone'))}</td>
      <td>${esc((c.namesUsed || []).slice(0, 4).join('، '))}${(c.namesUsed || []).length > 4 ? '...' : ''}</td>
      <td>${esc(c.totalRequests)}</td>
      <td>${esc(c.periodRequests)}</td>
      <td>${esc(fmtDate(c.lastSeen))}</td>
      <td><span class="eqc-badge info">${esc(t(c.preferredSource))}</span></td>
      <td>${esc(c.preferredZone || t('unknown'))}</td>
      ${showActions ? `<td><button class="eqc-btn light" onclick="EQRestaurantCustomers.openProfile('${esc(c.key)}')"><i class="fas fa-id-card"></i>${esc(t('open_profile'))}</button></td>` : ''}
    </tr>`).join('')}</tbody></table></div>`;
  }

  function profileHtml(data) {
    const c = data.customers.find((x) => x.key === EQC.selectedKey) || data.filtered[0] || data.customers[0];
    if (!c) return `<div class="eqc-card full"><div class="eqc-empty">${esc(t('no_data'))}</div></div>`;
    EQC.selectedKey = c.key;
    return `<div class="eqc-profile" style="margin-top:14px;">
      <div class="eqc-card">
        <div class="eqc-chip-row" style="justify-content:space-between;margin-bottom:12px;">
          <button class="eqc-btn light" onclick="EQRestaurantCustomers.setView('list')"><i class="fas fa-arrow-right"></i>${esc(t('back_to_list'))}</button>
          <button class="eqc-btn danger" onclick="EQRestaurantCustomers.setView('list')"><i class="fas fa-times"></i>${esc(t('close_profile'))}</button>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="eqc-avatar">${esc(c.repeatWithin30 ? '🏆' : String(c.name || 'ع').slice(0,1))}</div>
          <div style="min-width:0;"><div class="eqc-title" style="font-size:18px;">${esc(c.name)}</div><div class="eqc-phone">${esc(c.cleanPhone || t('no_phone'))}</div></div>
        </div>
        <div class="eqc-small-grid">
          <div class="eqc-small"><div class="eqc-small-num">${esc(c.totalRequests)}</div><div class="eqc-small-label">${esc(t('visits'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num">${esc(c.periodRequests)}</div><div class="eqc-small-label">${esc(t('period_visits'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num">${esc(fmtDate(c.firstSeen))}</div><div class="eqc-small-label">${esc(t('first_seen'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num">${esc(fmtDate(c.lastSeen))}</div><div class="eqc-small-label">${esc(t('last_seen'))}</div></div>
        </div>
        <div style="margin-top:12px;">${profileAlerts(c)}</div>
        <div style="margin-top:12px;"><button class="eqc-btn dark" onclick="EQRestaurantCustomers.copy('${esc(c.cleanPhone || '')}')"><i class="fas fa-copy"></i>${esc(t('copy_phone'))}</button></div>
      </div>
      <div class="eqc-card">
        <div class="eqc-title"><i class="fas fa-id-card"></i>${esc(t('identity'))}</div>
        ${infoLine(t('latest_name'), c.name)}
        ${infoLine(t('used_names'), (c.namesUsed || []).join('، '))}
        ${infoLine(t('top_source'), t(c.preferredSource))}
        ${infoLine(t('top_zone'), c.preferredZone)}
        ${infoLine(t('avg_party'), c.avgParty || '—')}
        ${infoLine(t('notes'), c.notes || '—')}
      </div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-store"></i>${esc(t('source_summary'))}</div>${barsHtml(Object.entries(c.sourceCounts || {}).map(([label,value])=>({label:t(label),value})), c.totalRequests || 1)}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-location-dot"></i>${esc(t('zone_summary'))}</div>${barsHtml(Object.entries(c.zoneCounts || {}).map(([label,value])=>({label,value})), c.totalRequests || 1)}</div>
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-clock-rotate-left"></i>${esc(t('requests_linked'))}</div><div class="eqc-sub">${esc(t('visits'))}: ${esc(c.totalRequests)}</div>${visitsTable(c.requests || [])}</div>
    </div>`;
  }

  function profileAlerts(c) {
    const alerts = [];
    if (c.repeatWithin30) alerts.push(['ok','fa-trophy',t('cup_candidate')]);
    if (c.hasMultipleNames) alerts.push(['warn','fa-id-card',t('multi_name_filter')]);
    if (c.inactive) alerts.push(['warn','fa-user-clock',t('inactive')]);
    if (!c.hasValidPhone) alerts.push(['bad','fa-phone-slash',t('no_phone')]);
    if (!alerts.length) alerts.push(['ok','fa-check',t('active_in_range')]);
    return `<div class="eqc-list">${alerts.map(([cls,icon,text])=>`<div class="eqc-alert ${cls}"><i class="fas ${icon}"></i><div class="eqc-item-title">${esc(text)}</div></div>`).join('')}</div>`;
  }

  function infoLine(label, value, isIds) {
    return `<div style="margin-top:12px;"><div class="eqc-sub">${esc(label)}</div><div class="${isIds ? 'eqc-ids' : ''}" style="font-weight:900;line-height:1.7;">${esc(value || '—')}</div></div>`;
  }

  function visitsTable(rows) {
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-table-wrap" style="margin-top:12px;"><table class="eqc-table" style="min-width:760px;"><thead><tr><th>${esc(t('booking_code'))}</th><th>${esc(t('date'))}</th><th>${esc(t('source'))}</th><th>${esc(t('zone'))}</th><th>${esc(t('party'))}</th><th>${esc(t('status'))}</th></tr></thead><tbody>${rows.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).map((r)=>`<tr><td>${esc(r.booking_code || '—')}</td><td>${esc(fmtDate(r.created_at))}</td><td>${esc(sourceLabel(r.request_source))}</td><td>${esc(r.zone_name || t('unknown'))}</td><td>${esc(r.requested_party_size || 1)}</td><td><span class="eqc-badge muted">${esc(t(r.status || 'unknown'))}</span></td></tr>`).join('')}</tbody></table></div>`;
  }

  function segmentsHtml(data) {
    const ranged = rangeCustomers(data.customers || []);
    const topRepeat = (data.loyalty.topRepeat || []).filter((c) => c.totalRequests > 0).slice(0, 10);
    const noVisits = (data.customers || []).filter((c) => c.totalRequests === 0).slice(0, 8);
    return `<div class="eqc-grid">
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-store"></i>${esc(t('source_summary'))}</div><div class="eqc-sub">${esc(t('customer_love_note'))}</div>${barsHtml(sourceSummary(ranged).slice(0,8), 1)}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-location-dot"></i>${esc(t('zone_summary'))}</div><div class="eqc-sub">${esc(rangeLabel(EQC.range))}</div>${barsHtml(zoneSummary(ranged), 1)}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-trophy"></i>${esc(t('top_repeat'))}</div>${miniCustomers(topRepeat)}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-user-clock"></i>${esc(t('no_requests'))}</div><div class="eqc-sub">${esc(t('customer_love_note'))}</div>${miniCustomers(noVisits)}</div>
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-filter"></i>${esc(t('list'))}</div><div style="margin-top:12px;">${filtersHtml()}</div></div>
      <div class="eqc-card full">${customersTable(data.filtered.slice(0,50), true)}</div>
    </div>`;
  }

  function loyaltyHtml(data) {
    const l = data.loyalty;
    const recent = (data.customers || []).filter((c) => c.repeatWithin30).sort((a,b)=>new Date(b.lastSeen||0)-new Date(a.lastSeen||0));
    return `<div class="eqc-grid">
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-trophy"></i>${esc(t('loyalty'))}</div><div class="eqc-sub" style="font-size:13px;color:#334155;">${esc(t('loyalty_cup_note'))}</div><div class="eqc-sub" style="margin-top:8px;">${esc(t('no_auto_points'))}</div></div>
      ${kpi('fa-trophy', t('cup_candidate'), recent.length, t('loyalty_hint'))}
      ${kpi('fa-repeat', t('top_repeat'), l.topRepeat.filter((c)=>c.totalRequests>0).length, t('visits_history'))}
      ${kpi('fa-calendar-check', t('customers_30'), countVisitedInRange(data.customers || [], 'last30'), t('visits_history'))}
      ${kpi('fa-user', t('one_time'), l.one_time.length, t('visits_history'))}
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-trophy"></i>${esc(t('cup_candidate'))}</div>${miniCustomers(recent.slice(0,12))}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-repeat"></i>${esc(t('top_repeat'))}</div>${miniCustomers(l.topRepeat.filter((c)=>c.totalRequests>0).slice(0,12))}</div>
    </div>`;
  }

  function exportHtml(data) {
    return `<div class="eqc-grid">
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-file-excel"></i>${esc(t('export'))}</div><div class="eqc-sub">${esc(t('showing'))}: ${esc(data.filtered.length)} ${esc(t('of'))} ${esc(data.customers.length)} — ${esc(rangeLabel(EQC.range))}</div><div class="eqc-chip-row" style="margin-top:14px;"><button class="eqc-btn dark" onclick="EQRestaurantCustomers.exportExcel('filtered')"><i class="fas fa-file-excel"></i>${esc(t('export_current'))}</button><button class="eqc-btn light" onclick="EQRestaurantCustomers.exportExcel('all')"><i class="fas fa-database"></i>${esc(t('export_all'))}</button><button class="eqc-btn light" onclick="EQRestaurantCustomers.print('filtered')"><i class="fas fa-print"></i>${esc(t('print_current'))}</button><button class="eqc-btn light" onclick="EQRestaurantCustomers.print('all')"><i class="fas fa-print"></i>${esc(t('print_all'))}</button></div></div>
      <div class="eqc-card full">${customersTable(data.filtered.slice(0,30), true)}</div>
    </div>`;
  }

  function miniCustomers(rows) {
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-list" style="margin-top:12px;">${rows.map((c)=>`<div class="eqc-item"><div class="eqc-icon"><i class="fas ${c.repeatWithin30 ? 'fa-trophy' : 'fa-user'}"></i></div><div><div class="eqc-item-title">${esc(c.repeatWithin30 ? '🏆 ' : '')}${esc(c.name)}</div><div class="eqc-item-sub">${esc(c.cleanPhone || t('no_phone'))} — ${esc(t('visits'))}: ${esc(c.totalRequests)} — ${esc(t('top_source'))}: ${esc(t(c.preferredSource))}</div></div><button class="eqc-mini" onclick="EQRestaurantCustomers.openProfile('${esc(c.key)}')">${esc(t('open_profile'))}</button></div>`).join('')}</div>`;
  }

  function barsHtml(items, total) {
    const max = Math.max(1, ...items.map((x) => n(x.value)));
    if (!items.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-bars" style="margin-top:12px;">${items.map((x)=>`<div class="eqc-bar"><div>${esc(x.label)}</div><div class="eqc-track"><div class="eqc-fill" style="width:${Math.max(4, Math.round((n(x.value)/max)*100))}%"></div></div><div>${esc(x.value)}</div></div>`).join('')}</div>`;
  }

  function updateShellButtons() {
    $$('.eqc-chip').forEach((btn) => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes('setRange')) {
        btn.classList.toggle('active', onclick.includes(`'${EQC.range}'`));
      }
    });
    $$('.eqc-tab').forEach((btn) => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes('setView')) {
        btn.classList.toggle('active', onclick.includes(`'${EQC.view}'`));
      }
    });
  }

  async function openCustomers(view = 'overview', force = false) {
    if (!canOpen()) {
      openPanel(t('title'), t('subtitle'), errorHtml('لا توجد صلاحية لفتح قسم العملاء'));
      return;
    }

    EQC.view = view || EQC.view;
    setActiveSidebar(EQC.view);
    openPanel(t('title'), t('subtitle'), loadingHtml());

    try {
      const data = await loadData(force);
      openPanel(t('title'), t('subtitle'), shellHtml(data));
      renderContent();
    } catch (err) {
      console.error('[EASY-Q Customers] open failed:', err);
      EQC.lastError = err.message || String(err);
      openPanel(t('title'), t('subtitle'), errorHtml(EQC.lastError));
    }
  }

  function bindSidebar() {
    const map = {
      'customers-list': 'list',
      'customers-profiles': 'profile',
      'customers-segments': 'segments',
      'customers-loyalty': 'loyalty'
    };
    Object.entries(map).forEach(([view, target]) => {
      const item = document.querySelector(`.sub-menu-item[data-view="${view}"]`);
      if (!item || item.dataset.eqcBound === '1') return;
      item.dataset.eqcBound = '1';
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCustomers(target, false);
      });
    });
  }

  function makeExcel(rows) {
    const headers = [
      t('latest_name'), t('phone'), t('used_names'),
      t('visits'), t('period_visits'), t('first_seen'), t('last_seen'),
      t('top_source'), t('top_zone'), t('avg_party'), t('notes')
    ];
    const trs = rows.map((c) => [
      c.name,
      c.cleanPhone || '',
      (c.namesUsed || []).join('، '),
      c.totalRequests,
      c.periodRequests,
      fmtDate(c.firstSeen),
      fmtDate(c.lastSeen),
      t(c.preferredSource),
      c.preferredZone,
      c.avgParty || '',
      c.notes || ''
    ]);
    const html = `<!doctype html><html><head><meta charset="UTF-8"><style>body{font-family:Arial}table{border-collapse:collapse;width:100%;direction:${isAr()?'rtl':'ltr'}}th,td{border:1px solid #ddd;padding:8px;text-align:${isAr()?'right':'left'}}th{background:#0E146D;color:white}.ltr{direction:ltr;text-align:left}</style></head><body><table><thead><tr>${headers.map((h)=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${trs.map((row)=>`<tr>${row.map((v,i)=>`<td${i===1?' class="ltr"':''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `easyq-customers-${EQC.range}-${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printRows(rows) {
    const title = `${t('title')} - ${rangeLabel(EQC.range)}`;
    const body = `<!doctype html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>body{font-family:Arial,Tahoma,sans-serif;direction:${isAr()?'rtl':'ltr'};padding:22px;color:#111827}h2{margin:0 0 8px}.sub{color:#64748B;margin-bottom:16px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:${isAr()?'right':'left'}}th{background:#0E146D;color:white}.ltr{direction:ltr;text-align:left}@media print{button{display:none}}</style></head><body><button onclick="window.print()" style="padding:10px 14px;margin-bottom:14px;cursor:pointer;">${esc(t('print_current'))}</button><h2>${esc(title)}</h2><div class="sub">${esc(t('unique_customers'))}: ${esc((EQC.data?.stats?.uniqueCustomersByPhone)||rows.length)} — ${esc(t('showing'))}: ${esc(rows.length)}</div><table><thead><tr><th>${esc(t('latest_name'))}</th><th>${esc(t('phone'))}</th><th>${esc(t('used_names'))}</th><th>${esc(t('visits'))}</th><th>${esc(t('last_seen'))}</th><th>${esc(t('top_source'))}</th><th>${esc(t('top_zone'))}</th></tr></thead><tbody>${rows.map((c)=>`<tr><td>${esc(c.name)}</td><td class="ltr">${esc(c.cleanPhone||'')}</td><td>${esc((c.namesUsed||[]).join('، '))}</td><td>${esc(c.totalRequests)}</td><td>${esc(fmtDate(c.lastSeen))}</td><td>${esc(t(c.preferredSource))}</td><td>${esc(c.preferredZone||'')}</td></tr>`).join('')}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(body);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 300);
  }

  window.EQRestaurantCustomers = {
    open: openCustomers,
    refresh() {
      EQC.data = null;
      return openCustomers(EQC.view, true);
    },
    setRange(range) {
      EQC.range = ['today','last7','last30','last90','all'].includes(range) ? range : 'last30';
      EQC.page = 1;
      EQC.data = null;
      return openCustomers(EQC.view, true);
    },
    setView(view) {
      EQC.view = view || 'overview';
      updateShellButtons();
      setActiveSidebar(EQC.view);
      renderContent();
    },
    setSearch(value) {
      EQC.search = value || '';
      EQC.page = 1;
      if (EQC.view !== 'list') EQC.view = 'list';
      updateShellButtons();
      renderContent();
      const input = $('eqcSearchInput');
      if (input && document.activeElement !== input) {
        input.focus();
        const len = input.value.length;
        try { input.setSelectionRange(len, len); } catch (_) {}
      }
    },
    setFilter(filter) {
      EQC.filter = filter || 'all';
      EQC.page = 1;
      if (EQC.view !== 'list') EQC.view = 'list';
      updateShellButtons();
      renderContent();
    },
    reset() {
      EQC.search = '';
      EQC.filter = 'all';
      EQC.page = 1;
      const input = $('eqcSearchInput');
      if (input) input.value = '';
      renderContent();
    },
    nextPage() {
      const total = (EQC.data ? filterCustomers(EQC.data.customers).length : 0);
      const pages = Math.max(1, Math.ceil(total / EQC.pageSize));
      EQC.page = Math.min(pages, EQC.page + 1);
      renderContent();
    },
    prevPage() {
      EQC.page = Math.max(1, EQC.page - 1);
      renderContent();
    },
    openProfile(key) {
      EQC.selectedKey = key;
      EQC.view = 'profile';
      updateShellButtons();
      renderContent();
    },
    exportExcel(mode) {
      if (!EQC.data) return;
      const rows = mode === 'all' ? EQC.data.customers : filterCustomers(EQC.data.customers);
      makeExcel(rows);
    },
    print(mode) {
      if (!EQC.data) return;
      const rows = mode === 'all' ? EQC.data.customers : filterCustomers(EQC.data.customers);
      printRows(rows);
    },
    shouldShowCupForPhone(phone) {
      if (!EQC.data) return false;
      const clean = normalizePhone(phone || '');
      const c = (EQC.data.customers || []).find((x) => x.cleanPhone === clean);
      return !!(c && c.repeatWithin30);
    },
    copy(text) {
      const value = String(text || '').trim();
      if (!value) return;
      navigator.clipboard?.writeText(value).then(() => {
        if (typeof window.showSuccessNotification === 'function') window.showSuccessNotification(t('copied'));
      }).catch(() => {});
    },
    diagnostics() {
      return EQC.data;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindSidebar();
    setTimeout(bindSidebar, 700);
    setTimeout(bindSidebar, 1800);
  });

  window.addEventListener('load', () => setTimeout(bindSidebar, 600));
})();
