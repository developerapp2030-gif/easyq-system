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
      no_show: 'لم يحضر',
      total_requests: 'إجمالي الطلبات',
      confirmed_visits: 'زيارات مؤكدة',
      unconfirmed_visits: 'غير مكتملة',
      no_show_visits: 'لم يحضر / ملغي',
      pending_visits: 'حجوزات مفتوحة',
      confirmed_after_last_reward: 'زيارات مؤكدة بعد آخر مكافأة',
      reward_history: 'سجل المكافآت',
      rewards_count: 'عدد المكافآت',
      last_reward: 'آخر مكافأة',
      reward_customer: 'العميل',
      rewarded_by: 'الموظف',
      reward_type: 'نوع المكافأة',
      reward_note: 'ملاحظة المكافأة',
      rewarded_at: 'تاريخ المكافأة',
      rewarded_after: 'تمت بعد',
      visits_after_reward: 'زيارات بعد المكافأة',
      actual_visits_note: 'الزيارات المؤكدة هي التي وصلت إلى مشغول أو تنظيف أو مكتمل فقط.',
      reward_empty: 'لا توجد مكافآت مسجلة لهذا العميل بعد',
      export_clean_note: 'التصدير يعرض آخر اسم ورقم الجوال الدولي فقط بدون معرفات أو كل الأسماء المستخدمة.'
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
      no_show: 'No Show',
      total_requests: 'Total Requests',
      confirmed_visits: 'Confirmed Visits',
      unconfirmed_visits: 'Incomplete',
      no_show_visits: 'No-show / Cancelled',
      pending_visits: 'Open Bookings',
      confirmed_after_last_reward: 'Confirmed After Last Reward',
      reward_history: 'Reward History',
      rewards_count: 'Rewards Count',
      last_reward: 'Last Reward',
      reward_customer: 'Customer',
      rewarded_by: 'Employee',
      reward_type: 'Reward Type',
      reward_note: 'Reward Note',
      rewarded_at: 'Rewarded At',
      rewarded_after: 'Rewarded After',
      visits_after_reward: 'Visits After Reward',
      actual_visits_note: 'Confirmed visits are only occupied, cleaning, or completed visits.',
      reward_empty: 'No rewards recorded for this customer yet',
      export_clean_note: 'Export shows latest name and international phone only, without IDs or all used names.'
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

  function isConfirmedVisitStatus(status) {
    return ['occupied', 'cleaning', 'completed'].includes(String(status || '').toLowerCase());
  }

  function isNoShowLikeStatus(status) {
    return ['cancelled', 'expired', 'no_show'].includes(String(status || '').toLowerCase());
  }

  function isPendingLikeStatus(status) {
    return ['waiting', 'offered', 'reserved'].includes(String(status || '').toLowerCase());
  }

  function rewardTypeLabel(type) {
    const key = String(type || 'hospitality').toLowerCase();
    const map = {
      hospitality: isAr() ? 'ضيافة' : 'Hospitality',
      discount: isAr() ? 'خصم' : 'Discount',
      upgrade: isAr() ? 'ترقية / أولوية' : 'Upgrade / Priority',
      note: isAr() ? 'ملاحظة فقط' : 'Note Only'
    };
    return map[key] || type || (isAr() ? 'غير محدد' : 'Unknown');
  }

  function requestStatusGroup(status) {
    if (isConfirmedVisitStatus(status)) return 'confirmed';
    if (isNoShowLikeStatus(status)) return 'no_show';
    if (isPendingLikeStatus(status)) return 'pending';
    return 'unconfirmed';
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

    let rewards = [];
    try {
      rewards = await fetchAllRows(() => window.supabase
        .from('customer_rewards')
        .select('id,business_id,customer_id,request_id,phone_snapshot,customer_name_snapshot,reward_type,reward_note,repeat_visit_count,rewarded_by,rewarded_by_auth,rewarded_at,created_at')
        .eq('business_id', businessId)
        .order('rewarded_at', { ascending: false })
      );

      const rewardUserIds = [...new Set(
        rewards
          .map((reward) => reward.rewarded_by)
          .filter((id) => id && String(id).trim())
      )];

      if (rewardUserIds.length > 0) {
        try {
          const rewardUsers = await fetchAllRows(() => window.supabase
            .from('app_users')
            .select('id,auth_id,display_name,username')
            .in('id', rewardUserIds)
          );

          const rewardUsersMap = new Map();
          (rewardUsers || []).forEach((user) => {
            const displayName = user.display_name || user.username || '—';
            if (user.id) rewardUsersMap.set(String(user.id), displayName);
            if (user.auth_id) rewardUsersMap.set(String(user.auth_id), displayName);
          });

          rewards = rewards.map((reward) => ({
            ...reward,
            rewarded_by_name:
              rewardUsersMap.get(String(reward.rewarded_by || '')) ||
              rewardUsersMap.get(String(reward.rewarded_by_auth || '')) ||
              '—'
          }));
        } catch (rewardUsersErr) {
          console.warn('[EASY-Q Customers] تعذر تحميل أسماء الموظفين للمكافآت:', rewardUsersErr);
          rewards = rewards.map((reward) => ({
            ...reward,
            rewarded_by_name: '—'
          }));
        }
      }
    } catch (rewardErr) {
      console.warn('[EASY-Q Customers] تعذر تحميل سجل المكافآت:', rewardErr);
      rewards = [];
    }

    return buildDirectPayload(customers, requests, rewards, businessId);
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
      /*
        مهم:
        النسخة القديمة التي كانت تظهر 250+ عميل كانت تعتمد على RPC لأنه يجلب قاعدة العملاء كاملة.
        التحميل المباشر وحده قد يرجع عددًا أقل حسب RLS أو صلاحيات الجدول.
        لذلك نستخدم تحميلًا هجينًا:
        1) RPC للحصول على قاعدة العملاء الكاملة.
        2) Direct Fetch لإضافة الزيارات المؤكدة والمكافآت والتصدير المطوّر.
        3) إذا كان Direct أقل من RPC، نحافظ على قاعدة RPC ونركب عليها بيانات Direct المتاحة.
      */
      let rpcData = null;
      let directData = null;
      let rpcError = null;
      let directError = null;

      try {
        rpcData = await tryRpcLoad(businessId);
      } catch (err) {
        rpcError = err;
        console.warn('[EASY-Q Customers] RPC load failed:', err);
      }

      try {
        directData = await directLoad(businessId);
      } catch (err) {
        directError = err;
        console.warn('[EASY-Q Customers] Direct load failed:', err);
      }

      let data = null;

      if (rpcData && directData) {
        data = mergeRpcBaseWithDirectDetails(rpcData, directData, businessId);
      } else if (directData) {
        data = directData;
        data.rpcError = rpcError?.message || null;
      } else if (rpcData) {
        data = rpcData;
        data.directError = directError?.message || null;
      } else {
        throw directError || rpcError || new Error('تعذر تحميل بيانات العملاء');
      }

      data.businessId = businessId;
      data.range = EQC.range;
      data.loadedAt = new Date().toISOString();
      EQC.data = data;
      EQC.loadedAt = new Date();

      console.log('[EASY-Q Customers] Customers load:', {
        source: data.source,
        customers: data.customers?.length || 0,
        uniqueCustomersByPhone: data.stats?.uniqueCustomersByPhone,
        rpcCustomers: rpcData?.customers?.length || 0,
        directCustomers: directData?.customers?.length || 0,
        businessId
      });

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

  function mergeRpcBaseWithDirectDetails(rpcData, directData, businessId) {
    const rpcCustomers = Array.isArray(rpcData?.customers) ? rpcData.customers : [];
    const directCustomers = Array.isArray(directData?.customers) ? directData.customers : [];

    const directByKey = new Map();
    const directByPhone = new Map();

    directCustomers.forEach((customer) => {
      if (customer?.key) directByKey.set(customer.key, customer);
      if (customer?.cleanPhone) directByPhone.set(customer.cleanPhone, customer);
    });

    const usedDirectKeys = new Set();

    const mergedCustomers = rpcCustomers.map((rpcCustomer) => {
      const directCustomer =
        directByKey.get(rpcCustomer.key) ||
        directByPhone.get(rpcCustomer.cleanPhone || normalizePhone(rpcCustomer.phone || '')) ||
        null;

      if (directCustomer) {
        usedDirectKeys.add(directCustomer.key);
        return {
          ...rpcCustomer,
          ...directCustomer,
          key: rpcCustomer.key || directCustomer.key,
          cleanPhone: directCustomer.cleanPhone || rpcCustomer.cleanPhone,
          phone: directCustomer.cleanPhone || directCustomer.phone || rpcCustomer.phone,
          name: directCustomer.name || rpcCustomer.name,
          namesUsed: directCustomer.namesUsed?.length ? directCustomer.namesUsed : (rpcCustomer.namesUsed || []),
          customerIds: directCustomer.customerIds?.length ? directCustomer.customerIds : (rpcCustomer.customerIds || [])
        };
      }

      const totalRequests = n(rpcCustomer.totalRequests ?? rpcCustomer.total_requests ?? 0);
      const confirmedVisitsCount = n(rpcCustomer.confirmedVisitsCount ?? rpcCustomer.confirmed_visits_count ?? 0);
      const unconfirmedVisitsCount = n(rpcCustomer.unconfirmedVisitsCount ?? rpcCustomer.unconfirmed_visits_count ?? Math.max(0, totalRequests - confirmedVisitsCount));

      return {
        ...rpcCustomer,
        totalRequests,
        confirmedVisitsCount,
        unconfirmedVisitsCount,
        noShowVisitsCount: n(rpcCustomer.noShowVisitsCount ?? rpcCustomer.no_show_visits_count ?? 0),
        pendingVisitsCount: n(rpcCustomer.pendingVisitsCount ?? rpcCustomer.pending_visits_count ?? 0),
        rewardsCount: n(rpcCustomer.rewardsCount ?? rpcCustomer.rewards_count ?? 0),
        rewardHistory: Array.isArray(rpcCustomer.rewardHistory) ? rpcCustomer.rewardHistory : [],
        lastRewardAt: rpcCustomer.lastRewardAt || rpcCustomer.last_reward_at || null,
        confirmedVisitsAfterLastReward: n(rpcCustomer.confirmedVisitsAfterLastReward ?? rpcCustomer.confirmed_visits_after_last_reward ?? 0),
        confirmedVisitsLast30: n(rpcCustomer.confirmedVisitsLast30 ?? rpcCustomer.confirmed_visits_last30 ?? 0),
        confirmedActiveInRange: !!rpcCustomer.confirmedActiveInRange,
        periodConfirmedVisits: n(rpcCustomer.periodConfirmedVisits ?? rpcCustomer.period_confirmed_visits ?? 0)
      };
    });

    directCustomers.forEach((customer) => {
      if (!customer?.key || usedDirectKeys.has(customer.key)) return;
      mergedCustomers.push(customer);
    });

    const stats = {
      ...(directData?.stats || {}),
      ...(rpcData?.stats || {})
    };

    const validPhones = mergedCustomers
      .map((customer) => customer.cleanPhone || normalizePhone(customer.phone || ''))
      .filter((phone) => phone && phone.length >= 9);

    stats.uniqueCustomersByPhone = Math.max(
      n(rpcData?.stats?.uniqueCustomersByPhone),
      n(directData?.stats?.uniqueCustomersByPhone),
      new Set(validPhones).size
    );

    stats.visibleCustomerGroups = mergedCustomers.length;
    stats.listRowsIncludingNoPhone = mergedCustomers.length;
    stats.multiNameCustomers = mergedCustomers.filter((c) => c.hasMultipleNames).length;
    stats.rawCustomerRows = Math.max(n(rpcData?.stats?.rawCustomerRows), n(directData?.stats?.rawCustomerRows));
    stats.requestRowsAllTime = Math.max(n(rpcData?.stats?.requestRowsAllTime), n(directData?.stats?.requestRowsAllTime));
    stats.requestRowsInRange = Math.max(n(rpcData?.stats?.requestRowsInRange), n(directData?.stats?.requestRowsInRange));
    stats.rewardRows = n(directData?.stats?.rewardRows);

    const merged = {
      ...directData,
      business: rpcData?.business || directData?.business || getBusinessProfile(),
      source: 'hybrid',
      stats,
      customers: mergedCustomers,
      rewards: directData?.rewards || [],
      range: EQC.range,
      businessId
    };

    merged.filtered = filterCustomers(merged.customers);
    merged.segments = buildSegments(merged.customers);
    merged.loyalty = buildLoyalty(merged.customers);

    return merged;
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

  function buildDirectPayload(customers, requests, rewards, businessId) {
    const start = rangeStart(EQC.range);
    const map = new Map();
    const phoneToKey = new Map();
    const idToKey = new Map();
    const requestIdToKey = new Map();

    function keyForCustomer(c) {
      const phone = normalizePhone(c.phone || c.whatsapp_number || '');
      return phone && phone.length >= 9 ? `phone:${phone}` : `id:${c.id}`;
    }

    function rememberKey(row, key) {
      if (row.cleanPhone) phoneToKey.set(row.cleanPhone, key);
      (row.customerIds || []).forEach((id) => { if (id) idToKey.set(id, key); });
    }

    function updateLatestName(row, name, at) {
      const cleanName = String(name || '').trim();
      if (!cleanName) return;

      const ts = new Date(at || 0).getTime();
      const oldTs = new Date(row.nameUpdatedAt || 0).getTime();

      if (!row.nameUpdatedAt || (Number.isFinite(ts) && ts >= oldTs)) {
        row.name = cleanName;
        row.nameUpdatedAt = at || row.nameUpdatedAt || null;
      }

      if (!row.namesUsed.includes(cleanName)) row.namesUsed.push(cleanName);
    }

    function ensure(key, seed) {
      if (!map.has(key)) {
        const phone = normalizePhone(seed.phone || seed.whatsapp_number || seed.customer_phone_snapshot || seed.phone_snapshot || '');
        map.set(key, {
          key,
          cleanPhone: phone || '',
          phone: phone || t('no_phone'),
          name: seed.name || seed.customer_name_snapshot || seed.customer_name || seed.customer_name_snapshot || 'عميل',
          nameUpdatedAt: seed.created_at || seed.rewarded_at || null,
          namesUsed: [],
          customerIds: [],
          rawCustomerCount: 0,
          notes: '',
          firstSeen: seed.created_at || seed.rewarded_at || null,
          lastSeen: seed.created_at || seed.rewarded_at || null,
          sourceCounts: {},
          zoneCounts: {},
          statusCounts: {},
          requests: [],
          rewardHistory: [],
          avgParty: 0,
          partySizes: [],
          activeInRange: false,
          confirmedActiveInRange: false,
          periodRequests: 0,
          periodConfirmedVisits: 0,
          totalRequests: 0,
          hasValidPhone: !!phone && phone.length >= 9
        });
      }

      const row = map.get(key);
      rememberKey(row, key);
      return row;
    }

    customers.forEach((c) => {
      const key = keyForCustomer(c);
      const row = ensure(key, c);
      row.rawCustomerCount += 1;
      if (c.id && !row.customerIds.includes(c.id)) row.customerIds.push(c.id);
      updateLatestName(row, c.name, c.created_at);
      if (c.notes) row.notes = row.notes ? `${row.notes} | ${c.notes}` : c.notes;
      if (c.created_at) {
        if (!row.firstSeen || new Date(c.created_at) < new Date(row.firstSeen)) row.firstSeen = c.created_at;
        if (!row.lastSeen || new Date(c.created_at) > new Date(row.lastSeen)) row.lastSeen = c.created_at;
      }
      rememberKey(row, key);
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
      updateLatestName(row, r.customer_name_snapshot, r.created_at);
      row.requests.push(r);
      if (r.id) requestIdToKey.set(r.id, key);
      row.totalRequests += 1;

      const inRange = !start || new Date(r.created_at) >= start;
      if (inRange) {
        row.periodRequests += 1;
        row.activeInRange = true;
        if (isConfirmedVisitStatus(r.status)) {
          row.periodConfirmedVisits += 1;
          row.confirmedActiveInRange = true;
        }
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

      rememberKey(row, key);
    });

    (rewards || []).forEach((reward) => {
      const phone = normalizePhone(reward.phone_snapshot || '');
      const key = phoneToKey.get(phone) || idToKey.get(reward.customer_id) || requestIdToKey.get(reward.request_id) || (phone ? `phone:${phone}` : `reward:${reward.id}`);
      const row = ensure(key, {
        phone_snapshot: reward.phone_snapshot,
        customer_name_snapshot: reward.customer_name_snapshot,
        rewarded_at: reward.rewarded_at,
        created_at: reward.created_at
      });

      if (reward.customer_id && !row.customerIds.includes(reward.customer_id)) row.customerIds.push(reward.customer_id);
      if (reward.customer_name_snapshot && !row.namesUsed.includes(reward.customer_name_snapshot)) row.namesUsed.push(reward.customer_name_snapshot);
      row.rewardHistory.push({
        ...reward,
        cleanPhone: phone,
        customer_display_name: reward.customer_name_snapshot || row.name || 'عميل',
        customer_display_phone: phone || row.cleanPhone || '',
        rewarded_by_name: reward.rewarded_by_name || '—',
        reward_type_label: rewardTypeLabel(reward.reward_type)
      });

      rememberKey(row, key);
    });

    const rows = Array.from(map.values()).map((row) => finalizeCustomer(row));
    const validPhoneRows = customers.map((c) => normalizePhone(c.phone || c.whatsapp_number)).filter((p) => p && p.length >= 9);
    const activeAllSet = new Set();
    const activeRangeSet = new Set();
    const confirmedAllSet = new Set();
    const confirmedRangeSet = new Set();
    const reqStart = rangeStart(EQC.range);

    requests.forEach((r) => {
      const phone = normalizePhone(r.customer_phone_snapshot || '');
      if (phone && phone.length >= 9) {
        activeAllSet.add(phone);
        if (isConfirmedVisitStatus(r.status)) confirmedAllSet.add(phone);
        if (!reqStart || new Date(r.created_at) >= reqStart) {
          activeRangeSet.add(phone);
          if (isConfirmedVisitStatus(r.status)) confirmedRangeSet.add(phone);
        }
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
        confirmedVisitsAllTime: requests.filter((r) => isConfirmedVisitStatus(r.status)).length,
        confirmedVisitsInRange: reqStart ? requests.filter((r) => isConfirmedVisitStatus(r.status) && new Date(r.created_at) >= reqStart).length : requests.filter((r) => isConfirmedVisitStatus(r.status)).length,
        activeCustomersAllTime: activeAllSet.size,
        activeCustomersInRange: activeRangeSet.size,
        confirmedCustomersAllTime: confirmedAllSet.size,
        confirmedCustomersInRange: confirmedRangeSet.size,
        visibleCustomerGroups: rows.length,
        multiNameCustomers: rows.filter((r) => r.hasMultipleNames).length,
        listRowsIncludingNoPhone: rows.length,
        rewardRows: (rewards || []).length
      },
      customers: rows,
      rewards: rewards || [],
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
    const requests = Array.isArray(row.requests) ? row.requests.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) : [];
    const totalRequests = n(row.totalRequests ?? row.total_requests ?? requests.length);
    const periodRequests = n(row.periodRequests ?? row.period_requests);
    const avgParty = n(row.avgParty ?? row.avg_party_size) || (row.partySizes?.length ? Math.round((row.partySizes.reduce((a, b) => a + n(b), 0) / row.partySizes.length) * 10) / 10 : 0);

    const confirmedRequests = requests.filter((r) => isConfirmedVisitStatus(r.status));
    const unconfirmedRequests = requests.filter((r) => !isConfirmedVisitStatus(r.status));
    const noShowRequests = requests.filter((r) => isNoShowLikeStatus(r.status));
    const pendingRequests = requests.filter((r) => isPendingLikeStatus(r.status));
    const confirmedVisitsCount = confirmedRequests.length;
    const unconfirmedVisitsCount = unconfirmedRequests.length;
    const noShowVisitsCount = noShowRequests.length;
    const pendingVisitsCount = pendingRequests.length;
    const lossCount = noShowVisitsCount;

    const lastSeen = row.lastSeen || row.last_seen || row.lastRequestAt || row.last_request_at || row.lastCustomerCreatedAt || row.last_customer_created_at;
    const firstSeen = row.firstSeen || row.first_seen || row.firstRequestAt || row.first_request_at || row.firstCustomerCreatedAt || row.first_customer_created_at;
    const lastConfirmedVisitAt = confirmedRequests[0]?.created_at || null;
    const firstConfirmedVisitAt = confirmedRequests.length ? confirmedRequests[confirmedRequests.length - 1]?.created_at : null;
    const namesUsed = Array.isArray(row.namesUsed) ? row.namesUsed : (Array.isArray(row.names_used) ? row.names_used : []);
    const customerIds = Array.isArray(row.customerIds) ? row.customerIds : (Array.isArray(row.customer_ids) ? row.customer_ids : []);
    const cleanPhone = row.cleanPhone || row.clean_phone || normalizePhone(row.phone);
    const preferredSource = topFromObject(sourceCounts) || 'other';
    const preferredZone = topFromObject(zoneCounts) || t('unknown');
    const inactive = daysSince(lastConfirmedVisitAt || lastSeen) !== null && daysSince(lastConfirmedVisitAt || lastSeen) >= 30;
    const repeat = confirmedVisitsCount > 1;
    const vip = confirmedVisitsCount >= 5 && pct(lossCount, Math.max(totalRequests, 1)) <= 20;
    const highLoss = totalRequests >= 2 && pct(lossCount, totalRequests) >= 50;
    const level = confirmedVisitsCount >= 5 ? 'gold' : confirmedVisitsCount >= 3 ? 'silver' : confirmedVisitsCount >= 2 ? 'bronze' : 'one_time';

    const rewardHistory = (Array.isArray(row.rewardHistory) ? row.rewardHistory : [])
      .slice()
      .sort((a, b) => new Date(b.rewarded_at || b.created_at || 0) - new Date(a.rewarded_at || a.created_at || 0));
    const lastRewardAt = rewardHistory[0]?.rewarded_at || rewardHistory[0]?.created_at || null;
    const lastRewardTime = lastRewardAt ? new Date(lastRewardAt).getTime() : 0;
    const confirmedVisitsAfterLastReward = lastRewardTime
      ? confirmedRequests.filter((r) => new Date(r.created_at || 0).getTime() > lastRewardTime).length
      : confirmedVisitsCount;

    const thirtyDaysAgo = Date.now() - (30 * 86400000);
    const confirmedVisitsLast30 = confirmedRequests.filter((r) => new Date(r.created_at || 0).getTime() >= thirtyDaysAgo).length;

    rewardHistory.forEach((reward) => {
      const rewardTime = new Date(reward.rewarded_at || reward.created_at || 0).getTime();
      reward.confirmed_visits_before_reward = Number(reward.repeat_visit_count || 0) || confirmedRequests.filter((r) => new Date(r.created_at || 0).getTime() <= rewardTime).length;
      reward.confirmed_visits_after_reward = Number.isFinite(rewardTime)
        ? confirmedRequests.filter((r) => new Date(r.created_at || 0).getTime() > rewardTime).length
        : 0;
      reward.reward_type_label = rewardTypeLabel(reward.reward_type);
    });

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
      firstConfirmedVisitAt,
      lastConfirmedVisitAt,
      requests,
      confirmedRequests,
      unconfirmedRequests,
      noShowRequests,
      pendingRequests,
      totalRequests,
      periodRequests,
      periodConfirmedVisits: n(row.periodConfirmedVisits),
      confirmedVisitsCount,
      unconfirmedVisitsCount,
      noShowVisitsCount,
      pendingVisitsCount,
      activeInRange: !!row.activeInRange || !!row.active_in_range || periodRequests > 0,
      confirmedActiveInRange: !!row.confirmedActiveInRange || n(row.periodConfirmedVisits) > 0,
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
      daysSinceLast: daysSince(lastConfirmedVisitAt || lastSeen),
      rewardHistory,
      rewardsCount: rewardHistory.length,
      lastRewardAt,
      confirmedVisitsAfterLastReward,
      confirmedVisitsLast30,
      repeatWithin30: confirmedVisitsLast30 >= 2 || confirmedVisitsAfterLastReward > 0
    };
  }

  function filterCustomers(rows) {
    const q = String(EQC.search || '').trim().toLowerCase();
    let out = rows.filter((c) => {
      const searchText = [c.name, c.phone, c.cleanPhone, c.notes, ...(c.namesUsed || [])]
        .map((v) => String(v || '').toLowerCase()).join(' ');
      if (q && !searchText.includes(q)) return false;

      if (EQC.filter === 'active') return c.confirmedActiveInRange || c.activeInRange;
      if (EQC.filter === 'with_requests') return c.totalRequests > 0;
      if (EQC.filter === 'no_requests') return c.totalRequests === 0;
      if (EQC.filter === 'repeat') return c.confirmedVisitsCount > 1;
      if (EQC.filter === 'confirmed') return c.confirmedVisitsCount > 0;
      if (EQC.filter === 'unconfirmed') return c.unconfirmedVisitsCount > 0;
      if (EQC.filter === 'rewarded') return c.rewardsCount > 0;
      if (EQC.filter === 'multi_names') return c.hasMultipleNames;
      if (EQC.filter === 'no_phone') return !c.hasValidPhone;
      if (EQC.filter === 'online') return c.preferredSource === 'online';
      if (EQC.filter === 'walk_in') return c.preferredSource === 'walk_in';
      if (EQC.filter === 'inactive') return c.inactive;
      return true;
    });

    out.sort((a, b) => new Date(b.lastConfirmedVisitAt || b.lastSeen || 0) - new Date(a.lastConfirmedVisitAt || a.lastSeen || 0));
    return out;
  }

  function visitsOf(c) {
    return Array.isArray(c.confirmedRequests) ? c.confirmedRequests : (Array.isArray(c.requests) ? c.requests.filter((r) => isConfirmedVisitStatus(r.status)) : []);
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
      ['active', t('active_in_range'), rows.filter((r) => r.confirmedActiveInRange || r.activeInRange), 'fa-heart-pulse'],
      ['repeat', t('repeat'), rows.filter((r) => r.confirmedVisitsCount > 1), 'fa-repeat'],
      ['confirmed', t('confirmed_visits'), rows.filter((r) => r.confirmedVisitsCount > 0), 'fa-circle-check'],
      ['unconfirmed', t('unconfirmed_visits'), rows.filter((r) => r.unconfirmedVisitsCount > 0), 'fa-triangle-exclamation'],
      ['rewarded', t('reward_history'), rows.filter((r) => r.rewardsCount > 0), 'fa-gift'],
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
      topRepeat: rows.slice().sort((a, b) => b.confirmedVisitsCount - a.confirmedVisitsCount || b.confirmedVisitsAfterLastReward - a.confirmedVisitsAfterLastReward || b.totalRequests - a.totalRequests).slice(0, 12),
      topRequests: rows.slice().sort((a, b) => b.totalRequests - a.totalRequests || b.confirmedVisitsCount - a.confirmedVisitsCount).slice(0, 12),
      topNoShow: rows.slice().sort((a, b) => b.unconfirmedVisitsCount - a.unconfirmedVisitsCount || b.noShowVisitsCount - a.noShowVisitsCount).slice(0, 12),
      rewarded: rows.filter((r) => r.rewardsCount > 0).sort((a, b) => new Date(b.lastRewardAt || 0) - new Date(a.lastRewardAt || 0)).slice(0, 12),
      followup: rows.filter((r) => r.inactive && r.confirmedVisitsCount > 1).slice(0, 12)
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
    const topRepeat = (data.loyalty.topRepeat || []).filter((c) => c.confirmedVisitsCount > 0).slice(0, 8);
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
      ['confirmed', t('confirmed_visits')],
      ['unconfirmed', t('unconfirmed_visits')],
      ['rewarded', t('reward_history')],
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
    return `<div class="eqc-table-wrap"><table class="eqc-table" style="min-width:980px;"><thead><tr>
      <th>${esc(t('latest_name'))}</th><th>${esc(t('phone'))}</th><th>${esc(t('total_requests'))}</th><th>${esc(t('confirmed_visits'))}</th><th>${esc(t('unconfirmed_visits'))}</th><th>${esc(t('rewards_count'))}</th><th>${esc(t('confirmed_after_last_reward'))}</th><th>${esc(t('last_seen'))}</th><th>${esc(t('top_source'))}</th><th>${esc(t('top_zone'))}</th>${showActions ? `<th>${esc(t('actions'))}</th>` : ''}
    </tr></thead><tbody>${rows.map((c)=>`<tr>
      <td><b>${esc(c.confirmedVisitsAfterLastReward > 0 ? '🏆 ' : '')}${esc(c.name)}</b><div class="eqc-sub">${esc(c.rewardsCount > 0 ? `${t('last_reward')}: ${fmtDate(c.lastRewardAt)}` : '')}</div></td>
      <td class="eqc-phone">${esc(c.cleanPhone || t('no_phone'))}</td>
      <td>${esc(c.totalRequests)}</td>
      <td><span class="eqc-badge ok">${esc(c.confirmedVisitsCount)}</span></td>
      <td><span class="eqc-badge ${c.unconfirmedVisitsCount > 0 ? 'warn' : 'muted'}">${esc(c.unconfirmedVisitsCount)}</span></td>
      <td>${esc(c.rewardsCount || 0)}</td>
      <td>${esc(c.confirmedVisitsAfterLastReward || 0)}</td>
      <td>${esc(fmtDate(c.lastConfirmedVisitAt || c.lastSeen))}</td>
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
          <div class="eqc-avatar">${esc(c.confirmedVisitsAfterLastReward > 0 ? '🏆' : String(c.name || 'ع').slice(0,1))}</div>
          <div style="min-width:0;"><div class="eqc-title" style="font-size:18px;">${esc(c.name)}</div><div class="eqc-phone">${esc(c.cleanPhone || t('no_phone'))}</div></div>
        </div>
        <div class="eqc-small-grid">
          <div class="eqc-small"><div class="eqc-small-num">${esc(c.totalRequests)}</div><div class="eqc-small-label">${esc(t('total_requests'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num">${esc(c.confirmedVisitsCount)}</div><div class="eqc-small-label">${esc(t('confirmed_visits'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num">${esc(c.unconfirmedVisitsCount)}</div><div class="eqc-small-label">${esc(t('unconfirmed_visits'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num">${esc(c.confirmedVisitsAfterLastReward)}</div><div class="eqc-small-label">${esc(t('confirmed_after_last_reward'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num">${esc(c.rewardsCount)}</div><div class="eqc-small-label">${esc(t('rewards_count'))}</div></div>
          <div class="eqc-small"><div class="eqc-small-num" style="font-size:14px;line-height:1.5;">${esc(fmtDate(c.lastRewardAt))}</div><div class="eqc-small-label">${esc(t('last_reward'))}</div></div>
        </div>
        <div style="margin-top:12px;">${profileAlerts(c)}</div>
        <div style="margin-top:12px;"><button class="eqc-btn dark" onclick="EQRestaurantCustomers.copy('${esc(c.cleanPhone || '')}')"><i class="fas fa-copy"></i>${esc(t('copy_phone'))}</button></div>
      </div>
      <div class="eqc-card">
        <div class="eqc-title"><i class="fas fa-id-card"></i>${esc(t('identity'))}</div>
        ${infoLine(t('latest_name'), c.name)}
        ${infoLine(t('phone'), c.cleanPhone || t('no_phone'), true)}
        ${infoLine(t('confirmed_visits'), c.confirmedVisitsCount)}
        ${infoLine(t('no_show_visits'), c.noShowVisitsCount)}
        ${infoLine(t('pending_visits'), c.pendingVisitsCount)}
        ${infoLine(t('top_source'), t(c.preferredSource))}
        ${infoLine(t('top_zone'), c.preferredZone)}
        ${infoLine(t('avg_party'), c.avgParty || '—')}
        ${infoLine(t('notes'), c.notes || '—')}
      </div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-gift"></i>${esc(t('reward_history'))}</div><div class="eqc-sub">${esc(t('actual_visits_note'))}</div>${rewardsTable(c.rewardHistory || [])}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-chart-simple"></i>${esc(t('simple_snapshot'))}</div>${profileMiniCards([
        { label: t('confirmed_visits'), value: c.confirmedVisitsCount, icon: 'fa-check-circle', tone: 'ok' },
        { label: t('unconfirmed_visits'), value: c.unconfirmedVisitsCount, icon: 'fa-hourglass-half', tone: 'warn' },
        { label: t('no_show_visits'), value: c.noShowVisitsCount, icon: 'fa-user-xmark', tone: 'bad' },
        { label: t('rewards_count'), value: c.rewardsCount, icon: 'fa-gift', tone: 'info' }
      ])}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-store"></i>${esc(t('source_summary'))}</div>${profileMiniCards(Object.entries(c.sourceCounts || {}).map(([label,value])=>({ label: t(label), value, icon: sourceIcon(label), tone: 'info' })).slice(0, 6))}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-location-dot"></i>${esc(t('zone_summary'))}</div>${profileMiniCards(Object.entries(c.zoneCounts || {}).map(([label,value])=>({ label, value, icon: 'fa-location-dot', tone: 'muted' })).slice(0, 6))}</div>
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-clock-rotate-left"></i>${esc(t('requests_linked'))}</div><div class="eqc-sub">${esc(t('total_requests'))}: ${esc(c.totalRequests)} — ${esc(t('confirmed_visits'))}: ${esc(c.confirmedVisitsCount)}</div>${visitsTable(c.requests || [])}</div>
    </div>`;
  }

  function profileAlerts(c) {
    const alerts = [];
    if (c.confirmedVisitsAfterLastReward > 0) alerts.push(['ok','fa-trophy',`${t('confirmed_after_last_reward')}: ${c.confirmedVisitsAfterLastReward}`]);
    if (c.rewardsCount > 0) alerts.push(['ok','fa-gift',`${t('last_reward')}: ${fmtDate(c.lastRewardAt)}`]);
    if (c.unconfirmedVisitsCount > 0) alerts.push(['warn','fa-triangle-exclamation',`${t('unconfirmed_visits')}: ${c.unconfirmedVisitsCount}`]);
    if (c.hasMultipleNames) alerts.push(['warn','fa-id-card',t('multi_name_filter')]);
    if (c.inactive) alerts.push(['warn','fa-user-clock',t('inactive')]);
    if (!c.hasValidPhone) alerts.push(['bad','fa-phone-slash',t('no_phone')]);
    if (!alerts.length) alerts.push(['ok','fa-check',t('active_in_range')]);
    return `<div class="eqc-list">${alerts.map(([cls,icon,text])=>`<div class="eqc-alert ${cls}"><i class="fas ${icon}"></i><div class="eqc-item-title">${esc(text)}</div></div>`).join('')}</div>`;
  }

  function infoLine(label, value, isIds) {
    return `<div style="margin-top:12px;"><div class="eqc-sub">${esc(label)}</div><div class="${isIds ? 'eqc-ids' : ''}" style="font-weight:900;line-height:1.7;">${esc(value || '—')}</div></div>`;
  }

  function rewardsTable(rows) {
    if (!rows.length) return `<div class="eqc-empty" style="margin-top:12px;">${esc(t('reward_empty'))}</div>`;

    const sortedRows = rows
      .slice()
      .sort((a, b) => new Date(b.rewarded_at || b.created_at || 0) - new Date(a.rewarded_at || a.created_at || 0));

    return `
      <div class="eqc-table-wrap" style="margin-top:12px;">
        <table class="eqc-table" style="min-width:980px; table-layout:fixed;">
          <thead>
            <tr>
              <th style="width:150px;">${esc(t('reward_customer'))}</th>
              <th style="width:135px;">${esc(t('phone'))}</th>
              <th style="width:120px;">${esc(t('reward_type'))}</th>
              <th style="width:150px;">${esc(t('rewarded_at'))}</th>
              <th style="width:120px;">${esc(t('rewarded_after'))}</th>
              <th style="width:130px;">${esc(t('rewarded_by'))}</th>
              <th>${esc(t('reward_note'))}</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRows.map((r)=>`
              <tr>
                <td>
                  <div style="font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.customer_display_name || r.customer_name_snapshot || 'عميل')}">
                    ${esc(r.customer_display_name || r.customer_name_snapshot || 'عميل')}
                  </div>
                </td>
                <td class="eqc-phone" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${esc(r.customer_display_phone || r.cleanPhone || normalizePhone(r.phone_snapshot) || '—')}
                </td>
                <td>
                  <span class="eqc-badge ok" style="white-space:nowrap;">${esc(r.reward_type_label || rewardTypeLabel(r.reward_type))}</span>
                </td>
                <td style="font-size:11px;line-height:1.5;">${esc(fmtDate(r.rewarded_at || r.created_at))}</td>
                <td>
                  <b>${esc(r.confirmed_visits_before_reward || 0)}</b>
                  <div class="eqc-sub" style="margin:2px 0 0;line-height:1.3;">${esc(t('confirmed_visits'))}</div>
                </td>
                <td>
                  <div style="font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.rewarded_by_name || '—')}">
                    ${esc(r.rewarded_by_name || '—')}
                  </div>
                </td>
                <td>
                  <div style="max-height:44px;overflow:hidden;line-height:1.55;font-size:11.5px;">
                    ${esc(r.reward_note || '—')}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function visitsTable(rows) {
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-table-wrap" style="margin-top:12px;"><table class="eqc-table" style="min-width:900px;"><thead><tr><th>${esc(t('booking_code'))}</th><th>${esc(t('date'))}</th><th>${esc(t('source'))}</th><th>${esc(t('zone'))}</th><th>${esc(t('party'))}</th><th>${esc(t('status'))}</th><th>${esc(t('diagnostic'))}</th></tr></thead><tbody>${rows.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).map((r)=>{
      const group = requestStatusGroup(r.status);
      const cls = group === 'confirmed' ? 'ok' : group === 'no_show' ? 'bad' : group === 'pending' ? 'warn' : 'muted';
      const label = group === 'confirmed' ? t('confirmed_visits') : group === 'no_show' ? t('no_show_visits') : group === 'pending' ? t('pending_visits') : t('unconfirmed_visits');
      return `<tr><td>${esc(r.booking_code || '—')}</td><td>${esc(fmtDate(r.created_at))}</td><td>${esc(sourceLabel(r.request_source))}</td><td>${esc(r.zone_name || t('unknown'))}</td><td>${esc(r.requested_party_size || 1)}</td><td><span class="eqc-badge ${cls}">${esc(t(r.status || 'unknown'))}</span></td><td>${esc(label)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
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
    const recent = (data.customers || []).filter((c) => c.confirmedVisitsAfterLastReward > 0).sort((a,b)=>b.confirmedVisitsAfterLastReward-a.confirmedVisitsAfterLastReward || new Date(b.lastConfirmedVisitAt||0)-new Date(a.lastConfirmedVisitAt||0));
    return `<div class="eqc-grid">
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-trophy"></i>${esc(t('loyalty'))}</div><div class="eqc-sub" style="font-size:13px;color:#334155;">${esc(t('loyalty_cup_note'))}</div><div class="eqc-sub" style="margin-top:8px;">${esc(t('actual_visits_note'))}</div></div>
      ${kpi('fa-trophy', t('confirmed_after_last_reward'), recent.length, t('loyalty_hint'))}
      ${kpi('fa-repeat', t('top_repeat'), l.topRepeat.filter((c)=>c.confirmedVisitsCount>0).length, t('confirmed_visits'))}
      ${kpi('fa-calendar-check', t('customers_30'), countVisitedInRange(data.customers || [], 'last30'), t('confirmed_visits'))}
      ${kpi('fa-gift', t('rewards_count'), (data.customers || []).reduce((sum,c)=>sum+n(c.rewardsCount),0), t('reward_history'))}
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-trophy"></i>${esc(t('confirmed_after_last_reward'))}</div>${miniCustomers(recent.slice(0,12))}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-repeat"></i>${esc(t('top_repeat'))}</div>${miniCustomers(l.topRepeat.filter((c)=>c.confirmedVisitsCount>0).slice(0,12))}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-gift"></i>${esc(t('reward_history'))}</div>${miniCustomers(l.rewarded || [])}</div>
      <div class="eqc-card wide"><div class="eqc-title"><i class="fas fa-triangle-exclamation"></i>${esc(t('unconfirmed_visits'))}</div>${miniCustomers(l.topNoShow.filter((c)=>c.unconfirmedVisitsCount>0).slice(0,12))}</div>
    </div>`;
  }

  function exportHtml(data) {
    return `<div class="eqc-grid">
      <div class="eqc-card full"><div class="eqc-title"><i class="fas fa-file-excel"></i>${esc(t('export'))}</div><div class="eqc-sub">${esc(t('showing'))}: ${esc(data.filtered.length)} ${esc(t('of'))} ${esc(data.customers.length)} — ${esc(rangeLabel(EQC.range))}</div><div class="eqc-sub" style="margin-top:6px;">${esc(t('export_clean_note'))}</div><div class="eqc-chip-row" style="margin-top:14px;"><button class="eqc-btn dark" onclick="EQRestaurantCustomers.exportExcel('filtered')"><i class="fas fa-file-excel"></i>${esc(t('export_current'))}</button><button class="eqc-btn light" onclick="EQRestaurantCustomers.exportExcel('all')"><i class="fas fa-database"></i>${esc(t('export_all'))}</button><button class="eqc-btn light" onclick="EQRestaurantCustomers.print('filtered')"><i class="fas fa-print"></i>${esc(t('print_current'))}</button><button class="eqc-btn light" onclick="EQRestaurantCustomers.print('all')"><i class="fas fa-print"></i>${esc(t('print_all'))}</button></div></div>
      <div class="eqc-card full">${customersTable(data.filtered.slice(0,30), true)}</div>
    </div>`;
  }

  function miniCustomers(rows) {
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-list" style="margin-top:12px;">${rows.map((c)=>`<div class="eqc-item"><div class="eqc-icon"><i class="fas ${c.confirmedVisitsAfterLastReward > 0 ? 'fa-trophy' : 'fa-user'}"></i></div><div><div class="eqc-item-title">${esc(c.confirmedVisitsAfterLastReward > 0 ? '🏆 ' : '')}${esc(c.name)}</div><div class="eqc-item-sub">${esc(c.cleanPhone || t('no_phone'))} — ${esc(t('confirmed_visits'))}: ${esc(c.confirmedVisitsCount)} — ${esc(t('unconfirmed_visits'))}: ${esc(c.unconfirmedVisitsCount)}</div></div><button class="eqc-mini" onclick="EQRestaurantCustomers.openProfile('${esc(c.key)}')">${esc(t('open_profile'))}</button></div>`).join('')}</div>`;
  }

  function sourceIcon(source) {
    const key = sourceKey(source);
    if (key === 'walk_in') return 'fa-store';
    if (key === 'online') return 'fa-globe';
    if (key === 'restored') return 'fa-rotate-left';
    return 'fa-circle-dot';
  }

  function profileMiniCards(items) {
    const list = (items || []).filter((item) => item && item.label !== undefined);

    if (!list.length) return `<div class="eqc-empty" style="margin-top:12px;">${esc(t('no_data'))}</div>`;

    return `
      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(118px, 1fr));
        gap:8px;
        margin-top:12px;
      ">
        ${list.map((item) => {
          const tone = item.tone || 'muted';
          const icon = item.icon || 'fa-circle-dot';
          const bg = tone === 'ok' ? '#ECFDF5' : tone === 'warn' ? '#FFFBEB' : tone === 'bad' ? '#FEF2F2' : tone === 'info' ? '#EFF6FF' : '#F8FAFC';
          const border = tone === 'ok' ? '#A7F3D0' : tone === 'warn' ? '#FDE68A' : tone === 'bad' ? '#FECACA' : tone === 'info' ? '#BFDBFE' : '#EEF2F7';
          const color = tone === 'ok' ? '#047857' : tone === 'warn' ? '#B45309' : tone === 'bad' ? '#B91C1C' : tone === 'info' ? '#1D4ED8' : '#475569';

          return `
            <div style="
              background:${bg};
              border:1px solid ${border};
              border-radius:14px;
              padding:10px;
              min-height:74px;
              display:flex;
              flex-direction:column;
              justify-content:space-between;
              overflow:hidden;
            ">
              <div style="
                display:flex;
                align-items:center;
                gap:6px;
                color:${color};
                font-size:11px;
                font-weight:1000;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
              " title="${esc(item.label)}">
                <i class="fas ${icon}"></i>
                <span style="overflow:hidden;text-overflow:ellipsis;">${esc(item.label)}</span>
              </div>
              <div style="
                color:#0F172A;
                font-size:22px;
                font-weight:1000;
                line-height:1;
                margin-top:8px;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
              " title="${esc(item.value)}">${esc(item.value ?? 0)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
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
      t('latest_name'),
      t('phone'),
      t('total_requests'),
      t('confirmed_visits'),
      t('unconfirmed_visits'),
      t('no_show_visits'),
      t('rewards_count'),
      t('last_reward'),
      t('confirmed_after_last_reward'),
      t('first_seen'),
      t('last_seen'),
      t('top_source'),
      t('top_zone'),
      t('avg_party'),
      t('notes')
    ];

    const trs = rows.map((c) => [
      c.name,
      c.cleanPhone || '',
      c.totalRequests,
      c.confirmedVisitsCount,
      c.unconfirmedVisitsCount,
      c.noShowVisitsCount,
      c.rewardsCount || 0,
      fmtDate(c.lastRewardAt),
      c.confirmedVisitsAfterLastReward || 0,
      fmtDate(c.firstSeen),
      fmtDate(c.lastConfirmedVisitAt || c.lastSeen),
      t(c.preferredSource),
      c.preferredZone,
      c.avgParty || '',
      c.notes || ''
    ]);

    const widths = [180,130,90,95,95,110,90,160,130,160,160,110,130,90,260];
    const html = `<!doctype html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,Tahoma,sans-serif;margin:0;padding:14px;background:#fff;color:#111827;}
      table{border-collapse:collapse;table-layout:fixed;width:100%;direction:${isAr()?'rtl':'ltr'};font-size:12px;}
      th,td{border:1px solid #D1D5DB;padding:7px 8px;text-align:${isAr()?'right':'left'};vertical-align:middle;height:30px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      th{background:#0E146D;color:white;font-weight:800;}
      tr:nth-child(even) td{background:#F8FAFC;}
      .ltr{direction:ltr;text-align:left;mso-number-format:'\@';font-family:Arial, sans-serif;}
      .num{text-align:center;}
    </style></head><body><table><colgroup>${widths.map(w=>`<col style="width:${w}px">`).join('')}</colgroup><thead><tr>${headers.map((h)=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${trs.map((row)=>`<tr>${row.map((v,i)=>`<td class="${i===1?'ltr':([2,3,4,5,6,8,13].includes(i)?'num':'')}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
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
    const body = `<!doctype html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>body{font-family:Arial,Tahoma,sans-serif;direction:${isAr()?'rtl':'ltr'};padding:22px;color:#111827}h2{margin:0 0 8px}.sub{color:#64748B;margin-bottom:16px}table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:${isAr()?'right':'left'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}th{background:#0E146D;color:white}.ltr{direction:ltr;text-align:left}.num{text-align:center}@media print{button{display:none}body{padding:8px}}</style></head><body><button onclick="window.print()" style="padding:10px 14px;margin-bottom:14px;cursor:pointer;">${esc(t('print_current'))}</button><h2>${esc(title)}</h2><div class="sub">${esc(t('unique_customers'))}: ${esc((EQC.data?.stats?.uniqueCustomersByPhone)||rows.length)} — ${esc(t('showing'))}: ${esc(rows.length)} — ${esc(t('export_clean_note'))}</div><table><thead><tr><th>${esc(t('latest_name'))}</th><th>${esc(t('phone'))}</th><th>${esc(t('total_requests'))}</th><th>${esc(t('confirmed_visits'))}</th><th>${esc(t('unconfirmed_visits'))}</th><th>${esc(t('rewards_count'))}</th><th>${esc(t('confirmed_after_last_reward'))}</th><th>${esc(t('last_seen'))}</th><th>${esc(t('top_source'))}</th><th>${esc(t('top_zone'))}</th></tr></thead><tbody>${rows.map((c)=>`<tr><td>${esc(c.name)}</td><td class="ltr">${esc(c.cleanPhone||'')}</td><td class="num">${esc(c.totalRequests)}</td><td class="num">${esc(c.confirmedVisitsCount)}</td><td class="num">${esc(c.unconfirmedVisitsCount)}</td><td class="num">${esc(c.rewardsCount||0)}</td><td class="num">${esc(c.confirmedVisitsAfterLastReward||0)}</td><td>${esc(fmtDate(c.lastConfirmedVisitAt || c.lastSeen))}</td><td>${esc(t(c.preferredSource))}</td><td>${esc(c.preferredZone||'')}</td></tr>`).join('')}</tbody></table></body></html>`;
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
