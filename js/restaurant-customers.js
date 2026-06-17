/* ============================================================
   EASY-Q RESTAURANT CUSTOMERS
   ملف مستقل لقسم العملاء لمسؤول المطعم
   الربط لاحقًا: <script src="js/restaurant-customers.js"></script>
   ============================================================ */

(function () {
  'use strict';

  const EQC = {
    activeView: 'overview',
    range: 'last30',
    search: '',
    segment: 'all',
    source: 'all',
    status: 'all',
    selectedCustomerKey: null,
    loadedAt: null,
    lastData: null,
    lastRange: null
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const I18N = {
    ar: {
      title: 'العملاء',
      subtitle: 'نظرة شاملة على العملاء، التكرار، الشرائح، وملفات العملاء اعتمادًا على بيانات الحجوزات والطابور.',
      loading: 'جاري تجهيز قسم العملاء...',
      load_error: 'تعذر فتح قسم العملاء',
      no_permission: 'ليس لديك صلاحية لعرض قسم العملاء.',
      refresh_now: 'تحديث الآن',
      last_update: 'آخر تحديث',
      range: 'النطاق',
      all_time: 'كل البيانات',
      today: 'اليوم',
      last7: 'آخر 7 أيام',
      last30: 'آخر 30 يوم',
      last90: 'آخر 90 يوم',
      overview: 'ملخص العملاء',
      list: 'قائمة العملاء',
      profile: 'ملف العميل',
      segments: 'شرائح العملاء',
      loyalty: 'الولاء والتكرار',
      export: 'تصدير العملاء',
      total_customers: 'إجمالي العملاء',
      new_customers: 'عملاء جدد',
      repeat_customers: 'عملاء متكررون',
      inactive_customers: 'غير نشطين',
      online_customers: 'عملاء أونلاين',
      local_customers: 'عملاء محليون',
      vip_potential: 'VIP محتملون',
      high_loss_customers: 'فقد عالي',
      customers_with_notes: 'لديهم ملاحظات',
      latest_customer: 'آخر عميل',
      search_placeholder: 'ابحث بالاسم أو رقم الجوال...',
      filter_segment: 'الشريحة',
      filter_source: 'المصدر',
      filter_status: 'الحالة',
      all: 'الكل',
      walk_in: 'محلي',
      online: 'أونلاين',
      restored: 'مسترجع',
      other: 'غير مصنف',
      active: 'نشط',
      inactive: 'غير نشط',
      new: 'جديد',
      repeat: 'متكرر',
      vip: 'VIP محتمل',
      high_loss: 'فقد عالي',
      name: 'الاسم',
      phone: 'الجوال',
      whatsapp: 'واتساب',
      visits: 'الطلبات',
      last_visit: 'آخر ظهور',
      first_visit: 'أول ظهور',
      preferred_source: 'المصدر المفضل',
      preferred_zone: 'المنطقة المفضلة',
      avg_party_size: 'متوسط المجموعة',
      loss_count: 'الفقد',
      completed_count: 'خدمة/نشط',
      actions: 'إجراءات',
      open_profile: 'فتح الملف',
      no_customers: 'لا توجد بيانات عملاء مطابقة',
      customer_profile: 'ملف العميل',
      profile_hint: 'اختر عميلًا من القائمة لعرض ملفه التفصيلي.',
      close_profile: 'إغلاق الملف',
      back_to_list: 'العودة للقائمة',
      customer_data: 'بيانات العميل',
      request_history: 'سجل الطلبات',
      customer_insights: 'مؤشرات العميل',
      private_notes: 'ملاحظات داخلية',
      source_mix: 'توزيع المصادر',
      zone_mix: 'المناطق المفضلة',
      booking_code: 'رقم الحجز',
      request_source: 'مصدر الطلب',
      zone: 'المنطقة',
      party_size: 'عدد الأشخاص',
      status: 'الحالة',
      created_at: 'تاريخ الطلب',
      waiting: 'انتظار',
      offered: 'جاهز/معيّن',
      reserved: 'محجوز',
      occupied: 'مشغول',
      cleaning: 'تنظيف',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      expired: 'منتهي',
      no_show: 'لم يحضر',
      unknown: 'غير محدد',
      segment_summary: 'ملخص الشرائح',
      segment_table: 'تفاصيل الشرائح',
      segment_name: 'اسم الشريحة',
      count: 'العدد',
      percent: 'النسبة',
      description: 'الوصف',
      new_desc: 'ظهروا لأول مرة خلال آخر 7 أيام',
      repeat_desc: 'لديهم أكثر من طلب أو زيارة',
      active_desc: 'لديهم نشاط خلال آخر 30 يوم',
      inactive_desc: 'لم يظهروا منذ 30 يوم أو أكثر',
      online_desc: 'مصدرهم الغالب أونلاين أو QR',
      local_desc: 'مصدرهم الغالب إضافة محلية من المطعم',
      vip_desc: 'تكرار جيد وفقد منخفض',
      high_loss_desc: 'لديهم أكثر من طلب ملغي أو منتهي',
      loyalty_title: 'الولاء والتكرار',
      loyalty_subtitle: 'تحليل تكرار العملاء فقط، وليس نظام نقاط حقيقي في هذه المرحلة.',
      top_repeat: 'أكثر العملاء تكرارًا',
      comeback_candidates: 'عملاء يستحقون متابعة',
      loyalty_levels: 'مستويات الولاء التحليلية',
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
      gold_desc: '5 طلبات أو أكثر وفقد منخفض',
      silver_desc: '3-4 طلبات',
      bronze_desc: 'طلبان',
      one_time_desc: 'طلب واحد فقط',
      one_time: 'مرة واحدة',
      export_title: 'تصدير العملاء',
      export_subtitle: 'تصدير ملف Excel قابل للفتح مباشرة للبيانات الحالية أو العملاء المعروضين بعد الفلاتر.',
      download_csv: 'تحميل CSV',
      download_excel: 'تحميل Excel',
      copy_summary: 'نسخ الملخص',
      export_all: 'تصدير كل العملاء',
      export_filtered: 'تصدير النتائج الحالية',
      csv_ready: 'ملف العملاء جاهز للتنزيل',
      summary_copied: 'تم نسخ الملخص',
      no_data: 'لا توجد بيانات كافية',
      source: 'المصدر',
      details: 'التفاصيل',
      value: 'القيمة',
      customer: 'عميل',
      customers: 'عملاء',
      request: 'طلب',
      requests: 'طلبات',
      days_since_last: 'أيام منذ آخر ظهور',
      loss_rate: 'نسبة الفقد',
      repeat_rate: 'نسبة التكرار',
      top_source: 'أعلى مصدر',
      top_zone: 'أكثر منطقة',
      quick_read: 'قراءة سريعة',
      insights: 'ملاحظات ذكية',
      no_notes: 'لا توجد ملاحظات محفوظة',
      customer_without_name: 'عميل',
      last_name: 'الاسم الأخير',
      used_names: 'الأسماء المستخدمة',
      linked_customer_ids: 'معرفات العملاء المرتبطة',
      linked_records: 'السجلات المرتبطة',
      raw_customer_records: 'سجلات العملاء الخام',
      unique_phone_customers: 'عملاء فريدون حسب الجوال',
      no_phone_customer: 'بدون رقم جوال',
      requests_by_phone: 'كل الطلبات المرتبطة بنفس الجوال',
      profile_summary: 'ملخص الملف',
      identity_section: 'هوية العميل الموحدة',
      latest_name_hint: 'يعرض آخر اسم مستخدم مع هذا الرقم، مع حفظ كل الأسماء السابقة.',
      no_phone: 'بدون رقم',
      table_view: 'عرض جدولي',
      card_view: 'بطاقات',
      reset_filters: 'إعادة ضبط',
      period_note: 'البيانات تعتمد على العملاء وجدول الطلبات في النطاق المحدد، مع الاحتفاظ بسجل العميل المتاح.',
      profile_not_found: 'لم يتم العثور على العميل المحدد',
      export_note: 'يتم التصدير بصيغة Excel حسب اللغة الحالية والفلاتر المحددة.',
      inactive_alert: 'لم يظهر منذ فترة طويلة',
      loss_alert: 'لديه فقد متكرر',
      vip_alert: 'عميل مميز محتمل',
      online_alert: 'يتفاعل أونلاين',
      local_alert: 'غالبًا من داخل المطعم'
    },
    en: {
      title: 'Customers',
      subtitle: 'A complete customer view with profiles, segments, repeat behavior, and loyalty-style analysis based on queue and booking data.',
      loading: 'Preparing customers section...',
      load_error: 'Unable to open customers section',
      no_permission: 'You do not have permission to view customers.',
      refresh_now: 'Refresh Now',
      last_update: 'Last Update',
      range: 'Range',
      all_time: 'All Data',
      today: 'Today',
      last7: 'Last 7 Days',
      last30: 'Last 30 Days',
      last90: 'Last 90 Days',
      overview: 'Customer Overview',
      list: 'Customer List',
      profile: 'Customer Profile',
      segments: 'Customer Segments',
      loyalty: 'Loyalty & Repeat',
      export: 'Customer Export',
      total_customers: 'Total Customers',
      new_customers: 'New Customers',
      repeat_customers: 'Repeat Customers',
      inactive_customers: 'Inactive Customers',
      online_customers: 'Online Customers',
      local_customers: 'Local Customers',
      vip_potential: 'Potential VIP',
      high_loss_customers: 'High Loss',
      customers_with_notes: 'With Notes',
      latest_customer: 'Latest Customer',
      search_placeholder: 'Search by name or phone...',
      filter_segment: 'Segment',
      filter_source: 'Source',
      filter_status: 'Status',
      all: 'All',
      walk_in: 'Local',
      online: 'Online',
      restored: 'Restored',
      other: 'Unclassified',
      active: 'Active',
      inactive: 'Inactive',
      new: 'New',
      repeat: 'Repeat',
      vip: 'Potential VIP',
      high_loss: 'High Loss',
      name: 'Name',
      phone: 'Phone',
      whatsapp: 'WhatsApp',
      visits: 'Requests',
      last_visit: 'Last Seen',
      first_visit: 'First Seen',
      preferred_source: 'Preferred Source',
      preferred_zone: 'Preferred Zone',
      avg_party_size: 'Avg Party Size',
      loss_count: 'Loss',
      completed_count: 'Served/Active',
      actions: 'Actions',
      open_profile: 'Open Profile',
      no_customers: 'No matching customers found',
      customer_profile: 'Customer Profile',
      profile_hint: 'Choose a customer from the list to view their profile.',
      close_profile: 'Close Profile',
      back_to_list: 'Back to List',
      customer_data: 'Customer Data',
      request_history: 'Request History',
      customer_insights: 'Customer Insights',
      private_notes: 'Internal Notes',
      source_mix: 'Source Mix',
      zone_mix: 'Preferred Zones',
      booking_code: 'Booking Code',
      request_source: 'Request Source',
      zone: 'Zone',
      party_size: 'Party Size',
      status: 'Status',
      created_at: 'Request Date',
      waiting: 'Waiting',
      offered: 'Ready/Assigned',
      reserved: 'Reserved',
      occupied: 'Occupied',
      cleaning: 'Cleaning',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
      no_show: 'No Show',
      unknown: 'Unknown',
      segment_summary: 'Segment Summary',
      segment_table: 'Segment Details',
      segment_name: 'Segment Name',
      count: 'Count',
      percent: 'Percent',
      description: 'Description',
      new_desc: 'First seen during the last 7 days',
      repeat_desc: 'More than one request or visit',
      active_desc: 'Active during the last 30 days',
      inactive_desc: 'No activity for 30 days or more',
      online_desc: 'Main source is online or QR',
      local_desc: 'Main source is local walk-in entry',
      vip_desc: 'Good repeat behavior and low loss',
      high_loss_desc: 'More than one cancelled or expired request',
      loyalty_title: 'Loyalty & Repeat',
      loyalty_subtitle: 'Repeat-behavior analysis only, not a real points program yet.',
      top_repeat: 'Top Repeat Customers',
      comeback_candidates: 'Customers To Follow Up',
      loyalty_levels: 'Analytical Loyalty Levels',
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
      gold_desc: '5+ requests with low loss',
      silver_desc: '3-4 requests',
      bronze_desc: '2 requests',
      one_time_desc: 'One request only',
      one_time: 'One Time',
      export_title: 'Customer Export',
      export_subtitle: 'Export an Excel-ready file for all customers or the current filtered results.',
      download_csv: 'Download CSV',
      download_excel: 'Download Excel',
      copy_summary: 'Copy Summary',
      export_all: 'Export All Customers',
      export_filtered: 'Export Current Results',
      csv_ready: 'Customer file is ready to download',
      summary_copied: 'Summary copied',
      no_data: 'Not enough data',
      source: 'Source',
      details: 'Details',
      value: 'Value',
      customer: 'customer',
      customers: 'customers',
      request: 'request',
      requests: 'requests',
      days_since_last: 'Days Since Last Seen',
      loss_rate: 'Loss Rate',
      repeat_rate: 'Repeat Rate',
      top_source: 'Top Source',
      top_zone: 'Top Zone',
      quick_read: 'Quick Read',
      insights: 'Smart Notes',
      no_notes: 'No saved notes',
      customer_without_name: 'Customer',
      last_name: 'Latest Name',
      used_names: 'Used Names',
      linked_customer_ids: 'Linked Customer IDs',
      linked_records: 'Linked Records',
      raw_customer_records: 'Raw Customer Records',
      unique_phone_customers: 'Unique Customers by Phone',
      no_phone_customer: 'No Phone Number',
      requests_by_phone: 'All Requests Linked to This Phone',
      profile_summary: 'Profile Summary',
      identity_section: 'Unified Customer Identity',
      latest_name_hint: 'Shows the latest name used with this phone while keeping all previous names.',
      no_phone: 'No Phone',
      table_view: 'Table View',
      card_view: 'Cards',
      reset_filters: 'Reset',
      period_note: 'Data is based on customers and requests in the selected range while keeping the available customer record.',
      profile_not_found: 'Selected customer was not found',
      export_note: 'Export creates an Excel-ready file using the current language and selected filters.',
      inactive_alert: 'Inactive for a long time',
      loss_alert: 'Repeated loss behavior',
      vip_alert: 'Potential high-value customer',
      online_alert: 'Engages online',
      local_alert: 'Mostly local walk-in'
    }
  };

  function lang() {
    return (window.currentLang || 'ar') === 'ar' ? 'ar' : 'en';
  }

  function t(key, forcedLang) {
    const l = forcedLang || lang();
    return (I18N[l] && I18N[l][key]) || (I18N.ar && I18N.ar[key]) || key;
  }

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
    const totalNum = n(total);
    if (!totalNum) return 0;
    return Math.max(0, Math.min(100, Math.round((p / totalNum) * 100)));
  }

  function average(list) {
    if (!Array.isArray(list) || !list.length) return 0;
    return Math.round(list.reduce((sum, item) => sum + n(item), 0) / list.length);
  }

  function fmtDate(value, forcedLang) {
    if (!value) return '—';
    const locale = (forcedLang || lang()) === 'ar' ? 'ar-SA' : 'en-US';
    try {
      return new Date(value).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (_) {
      return '—';
    }
  }

  function fmtDateTime(value, forcedLang) {
    if (!value) return '—';
    const locale = (forcedLang || lang()) === 'ar' ? 'ar-SA' : 'en-US';
    try {
      return new Date(value).toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '—';
    }
  }

  function daysSince(value) {
    if (!value) return null;
    const d = new Date(value).getTime();
    if (!Number.isFinite(d)) return null;
    const diff = Date.now() - d;
    if (diff < 0) return 0;
    return Math.floor(diff / 86400000);
  }

  function rangeStart(rangeKey) {
    if (rangeKey === 'all') return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (rangeKey === 'today') return d;
    if (rangeKey === 'last7') d.setDate(d.getDate() - 6);
    else if (rangeKey === 'last90') d.setDate(d.getDate() - 89);
    else d.setDate(d.getDate() - 29);
    return d;
  }

  function rangeLabel(rangeKey) {
    if (rangeKey === 'all') return t('all_time');
    if (rangeKey === 'today') return t('today');
    if (rangeKey === 'last7') return t('last7');
    if (rangeKey === 'last90') return t('last90');
    return t('last30');
  }

  function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function displayPhone(value) {
    const clean = normalizePhone(value);
    return clean || t('no_phone');
  }

  function sourceKey(source) {
    if (source === 'walk_in') return 'walk_in';
    if (source === 'web_booking' || source === 'booking_page' || source === 'online' || source === 'qr_code') return 'online';
    if (source === 'restored') return 'restored';
    return 'other';
  }

  function sourceLabel(source) {
    return t(sourceKey(source));
  }

  function statusLabel(status) {
    return t(status || 'unknown');
  }

  function statusClass(status) {
    if (status === 'waiting') return 'wait';
    if (status === 'offered' || status === 'reserved') return 'warn';
    if (status === 'occupied' || status === 'completed' || status === 'cleaning') return 'ok';
    if (status === 'cancelled' || status === 'expired' || status === 'no_show') return 'bad';
    return 'muted';
  }

  function getBusinessId() {
    const candidates = [
      window.currentBusinessProfile?.id,
      window.currentBusiness?.id,
      window.currentUser?.business_id,
      window.BUSINESS_ID
    ];

    return candidates.find((value) => value && String(value).trim() && String(value).trim() !== 'undefined' && String(value).trim() !== 'null') || null;
  }

  function getBusinessProfile() {
    return window.currentBusinessProfile || window.currentBusiness || null;
  }

  function canOpenCustomers() {
    if (!window.currentUser) return false;
    if (window.currentUser.role === 'super_admin') return false;
    if (typeof window.canDo !== 'function') return true;
    return window.canDo('view_customers') || window.canDo('manage_queue') || window.canDo('add_walkin') || window.canDo('view_reports');
  }

  function ensureStyles() {
    if ($('eqCustomerStyles')) return;
    const style = document.createElement('style');
    style.id = 'eqCustomerStyles';
    style.textContent = `
      .eqc-page{font-family:inherit;color:#111827;padding:18px;background:#F5F7FF;min-height:calc(100vh - 120px)}
      .eqc-page[dir="rtl"]{direction:rtl;text-align:right}.eqc-page[dir="ltr"]{direction:ltr;text-align:left}
      .eqc-hero{background:linear-gradient(135deg,#070219 0%,#060427 52%,#0E146D 100%);color:#fff;border-radius:24px;padding:20px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,.7fr);gap:18px;box-shadow:0 18px 45px rgba(15,23,42,.18);overflow:hidden;position:relative}
      .eqc-hero:after{content:'';position:absolute;width:260px;height:260px;border-radius:50%;inset-inline-end:-90px;top:-110px;background:rgba(221,231,255,.11);pointer-events:none}
      .eqc-hero h2{margin:0 0 8px;font-size:24px;font-weight:1000;letter-spacing:-.4px}.eqc-hero p{margin:0;color:rgba(255,255,255,.76);font-size:13px;font-weight:700;line-height:1.8}
      .eqc-hero-actions,.eqc-toolbar,.eqc-tabs,.eqc-chip-row,.eqc-export-actions{display:flex;gap:10px;flex-wrap:wrap}.eqc-hero-actions{margin-top:16px}
      .eqc-btn,.eqc-tab,.eqc-chip,.eqc-mini-btn{border:none;min-height:40px;padding:0 14px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-weight:1000;font-size:12px;transition:transform .16s ease,opacity .16s ease,background .16s ease}
      .eqc-btn:hover,.eqc-tab:hover,.eqc-chip:hover,.eqc-mini-btn:hover{transform:translateY(-1px)}.eqc-btn.primary{background:#fff;color:#0E146D}.eqc-btn.ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.16)}
      .eqc-health-card{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:15px;position:relative;z-index:1}.eqc-health-title{font-size:13px;color:rgba(255,255,255,.75);font-weight:900;margin-bottom:8px}.eqc-health-value{display:flex;align-items:center;gap:10px;font-size:28px;font-weight:1000}
      .eqc-toolbar{align-items:flex-end;justify-content:space-between;margin-top:14px;background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:12px;box-shadow:0 10px 26px rgba(15,23,42,.055)}
      .eqc-search{min-height:40px;border:1px solid #E5E7EB;border-radius:13px;padding:0 12px;min-width:260px;background:#F8FAFC;font-weight:800;color:#111827;outline:none}.eqc-search:focus{border-color:#0E146D;box-shadow:0 0 0 3px rgba(14,20,109,.10)}
      .eqc-chip{border:1px solid #E5E7EB;background:#fff;color:#64748B;border-radius:999px;min-height:36px}.eqc-chip.active{background:#0E146D;border-color:#0E146D;color:#fff}.eqc-mini-btn{min-height:34px;background:#EEF2FF;color:#0E146D}.eqc-mini-btn.active{background:#0E146D;color:#fff}
      .eqc-tabs{margin-top:14px;gap:8px}.eqc-tab{border:1px solid #E5E7EB;background:#fff;color:#64748B;border-radius:999px;min-height:38px}.eqc-tab.active{background:#0E146D;color:#fff;border-color:#0E146D}
      .eqc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.eqc-card{background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:15px;box-shadow:0 10px 26px rgba(15,23,42,.055);min-width:0}.eqc-card.soft{background:linear-gradient(180deg,#fff 0%,#F8FAFF 100%)}.eqc-card.wide{grid-column:span 2}.eqc-card.full{grid-column:1/-1}
      .eqc-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.eqc-card-title{font-size:13px;font-weight:1000;color:#111827;display:flex;align-items:center;gap:8px}.eqc-card-title i{color:#0E146D}.eqc-card-sub{font-size:11px;color:#64748B;font-weight:800;margin-top:4px;line-height:1.6}.eqc-kpi-value{font-size:30px;font-weight:1000;color:#0F172A;line-height:1}.eqc-kpi-label{margin-top:8px;font-size:12px;color:#64748B;font-weight:800;line-height:1.6}
      .eqc-mini-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.eqc-mini-stat{background:#F8FAFC;border:1px solid #EEF2F7;border-radius:15px;padding:10px}.eqc-mini-num{font-size:20px;font-weight:1000;color:#111827}.eqc-mini-label{font-size:11px;font-weight:800;color:#64748B;margin-top:3px;line-height:1.5}
      .eqc-list{display:flex;flex-direction:column;gap:9px}.eqc-list-item{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;background:#F8FAFC;border:1px solid #EEF2F7;border-radius:16px}.eqc-icon-box{width:38px;height:38px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;background:#EEF2FF;color:#0E146D;flex-shrink:0}.eqc-list-title{font-size:12.5px;font-weight:1000;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.eqc-list-sub{font-size:11px;font-weight:800;color:#64748B;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .eqc-badge{min-height:25px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:1000;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}.eqc-badge.ok{background:#ECFDF5;color:#047857}.eqc-badge.warn{background:#FFFBEB;color:#B45309}.eqc-badge.bad{background:#FEF2F2;color:#B91C1C}.eqc-badge.info{background:#EFF6FF;color:#1D4ED8}.eqc-badge.wait{background:#EEF2FF;color:#0E146D}.eqc-badge.muted{background:#F3F4F6;color:#6B7280}
      .eqc-progress{height:9px;border-radius:999px;background:#EEF2FF;overflow:hidden;margin-top:12px}.eqc-progress>span{display:block;height:100%;width:0%;background:linear-gradient(90deg,#0E146D,#3B82F6);border-radius:inherit}
      .eqc-table-wrap{overflow:auto;border:1px solid #EEF2F7;border-radius:16px}.eqc-table{width:100%;border-collapse:collapse;min-width:960px}.eqc-table th,.eqc-table td{padding:12px;border-bottom:1px solid #EEF2F7;text-align:start;font-size:12px;font-weight:800}.eqc-table th{background:#F8FAFC;color:#64748B;font-weight:1000;position:sticky;top:0}.eqc-table tr:last-child td{border-bottom:none}
      .eqc-empty{padding:20px;text-align:center;color:#64748B;font-weight:900;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:16px}.eqc-loader{min-height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#64748B;font-weight:1000}.eqc-spinner{width:34px;height:34px;border-radius:50%;border:4px solid rgba(14,20,109,.13);border-top-color:#0E146D;animation:eqcSpin .8s linear infinite}@keyframes eqcSpin{to{transform:rotate(360deg)}}
      .eqc-bars{display:flex;flex-direction:column;gap:8px}.eqc-bar-row{display:grid;grid-template-columns:130px minmax(0,1fr) 56px;gap:10px;align-items:center;font-size:11px;font-weight:900;color:#475569}.eqc-bar-track{width:100%;height:10px;border-radius:999px;background:#EDF2FF;overflow:hidden}.eqc-bar-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#0E146D,#60A5FA)}
      .eqc-profile-layout{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:12px}.eqc-profile-avatar{width:62px;height:62px;border-radius:20px;background:#EEF2FF;color:#0E146D;display:inline-flex;align-items:center;justify-content:center;font-weight:1000;font-size:22px}.eqc-alert{display:flex;align-items:flex-start;gap:10px;padding:11px;border-radius:16px;border:1px solid #EEF2F7;background:#fff}.eqc-alert.warn{background:#FFFBEB;border-color:#FDE68A}.eqc-alert.bad{background:#FEF2F2;border-color:#FECACA}.eqc-alert.ok{background:#ECFDF5;border-color:#A7F3D0}.eqc-note{font-size:11px;color:#64748B;font-weight:800;line-height:1.7}.eqc-export-actions{margin-top:10px}
      @media(max-width:1180px){.eqc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.eqc-hero,.eqc-profile-layout{grid-template-columns:1fr}}@media(max-width:720px){.eqc-page{padding:12px}.eqc-grid{grid-template-columns:1fr}.eqc-card.wide{grid-column:span 1}.eqc-hero h2{font-size:20px}.eqc-search{min-width:100%;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function openPanel(title, subtitle, bodyHtml) {
    ensureStyles();
    if (typeof window.openFullPagePanel === 'function') {
      window.openFullPagePanel(title, subtitle, bodyHtml);
      return;
    }
    let fallback = $('eqcFallbackPanel');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'eqcFallbackPanel';
      fallback.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#F5F7FF;overflow:auto;';
      document.body.appendChild(fallback);
    }
    fallback.innerHTML = `<div style="padding:14px;background:#070219;color:white;display:flex;justify-content:space-between;align-items:center;gap:12px;"><div><div style="font-weight:1000;font-size:18px;">${esc(title)}</div><div style="font-weight:700;font-size:12px;opacity:.72;margin-top:4px;">${esc(subtitle)}</div></div><button onclick="document.getElementById('eqcFallbackPanel').remove()" style="width:38px;height:38px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:white;font-size:20px;cursor:pointer;">×</button></div>${bodyHtml}`;
  }

  function setActiveSidebar(view) {
    $$('.sidebar .sub-menu-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-view') === `customers-${view}`);
    });
    const parent = document.querySelector('.main-menu-item[data-menu="customers"]');
    if (parent) parent.classList.add('open', 'active');
    const submenu = document.querySelector('.sub-menu[data-submenu="customers"]');
    if (submenu) submenu.classList.add('open');
  }

  function loadingHtml() {
    return `<div class="eqc-page" id="eqCustomers" dir="${lang() === 'ar' ? 'rtl' : 'ltr'}"><div class="eqc-loader"><div class="eqc-spinner"></div><div>${esc(t('loading'))}</div></div></div>`;
  }

  function errorHtml(message) {
    return `<div class="eqc-page" id="eqCustomers" dir="${lang() === 'ar' ? 'rtl' : 'ltr'}"><div class="eqc-card full"><div class="eqc-alert bad"><i class="fas fa-triangle-exclamation"></i><div><div class="eqc-list-title">${esc(t('load_error'))}</div><div class="eqc-list-sub" style="white-space:normal;line-height:1.6;">${esc(message)}</div></div></div></div></div>`;
  }

  async function safeQuery(fn, fallback) {
    try {
      return await fn();
    } catch (err) {
      console.warn('[EASY-Q Customers] query failed:', err);
      return fallback;
    }
  }

  async function fetchAllRows(buildQuery, pageSize = 1000, maxPages = 30) {
    const all = [];

    for (let page = 0; page < maxPages; page += 1) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const query = buildQuery().range(from, to);
      const { data, error } = await query;

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      all.push(...rows);

      if (rows.length < pageSize) break;
    }

    return all;
  }

  async function loadCustomersData() {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('No business_id available for current user');

    const start = rangeStart(EQC.range);
    const fromIso = start ? start.toISOString() : null;

    const customersPromise = safeQuery(async () => {
      return await fetchAllRows(() => window.supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
      );
    }, []);

    const requestsPromise = safeQuery(async () => {
      return await fetchAllRows(() => {
        let query = window.supabase
          .from('table_requests')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (fromIso) query = query.gte('created_at', fromIso);
        return query;
      });
    }, []);

    const arrivalsPromise = safeQuery(async () => {
      return await fetchAllRows(() => {
        let query = window.supabase
          .from('customer_arrivals')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (fromIso) query = query.gte('created_at', fromIso);
        return query;
      });
    }, []);

    const [customers, requests, arrivals] = await Promise.all([customersPromise, requestsPromise, arrivalsPromise]);

    const result = buildCustomersModel({ customers, requests, arrivals, business: getBusinessProfile() || {}, rangeStart: start });
    result.businessId = businessId;
    EQC.loadedAt = new Date();
    EQC.lastRange = EQC.range;
    EQC.lastData = result;
    return result;
  }

  function buildCustomersModel({ customers, requests, arrivals, business, rangeStart }) {
    const map = new Map();

    function keyFor({ id, phone, whatsapp_number, customer_phone_snapshot, name }) {
      const clean = normalizePhone(phone || whatsapp_number || customer_phone_snapshot);
      if (clean) return `phone:${clean}`;
      if (id) return `id:${id}`;
      return `name:${String(name || 'unknown').trim().toLowerCase()}`;
    }

    function pushUnique(arr, value) {
      if (value === null || value === undefined || value === '') return;
      const text = String(value).trim();
      if (!text) return;
      if (!arr.includes(text)) arr.push(text);
    }

    function chooseLatestName(row, name, createdAt) {
      const nextName = String(name || '').trim();
      if (!nextName) return;
      pushUnique(row.namesUsed, nextName);

      const nextTime = createdAt ? new Date(createdAt).getTime() : 0;
      const currentTime = row.latestNameAt ? new Date(row.latestNameAt).getTime() : -1;

      if (!row.name || row.name === t('customer_without_name') || nextTime >= currentTime) {
        row.name = nextName;
        row.latestNameAt = createdAt || row.latestNameAt || row.created_at || null;
      }
    }

    function ensureCustomer(seed) {
      const key = keyFor(seed);
      if (!map.has(key)) {
        const phone = seed.phone || seed.customer_phone_snapshot || seed.whatsapp_number || '';
        map.set(key, {
          key,
          id: seed.id || null,
          name: t('customer_without_name'),
          latestNameAt: seed.created_at || null,
          phone,
          cleanPhone: normalizePhone(phone),
          whatsapp: seed.whatsapp_number || seed.customer_phone_snapshot || seed.phone || '',
          notes: '',
          firstSeen: seed.created_at || null,
          lastSeen: seed.created_at || null,
          requests: [],
          arrivals: [],
          rawCustomers: [],
          customerIds: [],
          namesUsed: [],
          sourceCounts: {},
          zoneCounts: {},
          statuses: {},
          partySizes: [],
          fromCustomersTable: !!seed.fromCustomersTable
        });
      }

      const row = map.get(key);
      const seedName = seed.name || seed.customer_name_snapshot || '';
      chooseLatestName(row, seedName, seed.created_at);

      if (seed.id) {
        if (!row.id) row.id = seed.id;
        pushUnique(row.customerIds, seed.id);
      }

      if (seed.fromCustomersTable) {
        row.fromCustomersTable = true;
        if (!row.rawCustomers.some((item) => item.id === seed.id)) row.rawCustomers.push(seed);
      }

      if (!row.phone && (seed.phone || seed.customer_phone_snapshot || seed.whatsapp_number)) {
        row.phone = seed.phone || seed.customer_phone_snapshot || seed.whatsapp_number;
        row.cleanPhone = normalizePhone(row.phone);
      }

      if (!row.whatsapp && (seed.whatsapp_number || seed.phone || seed.customer_phone_snapshot)) {
        row.whatsapp = seed.whatsapp_number || seed.phone || seed.customer_phone_snapshot;
      }

      if (seed.notes) {
        row.notes = row.notes ? `${row.notes} | ${seed.notes}` : seed.notes;
      }

      if (seed.created_at) {
        if (!row.firstSeen || new Date(seed.created_at) < new Date(row.firstSeen)) row.firstSeen = seed.created_at;
        if (!row.lastSeen || new Date(seed.created_at) > new Date(row.lastSeen)) row.lastSeen = seed.created_at;
      }

      return row;
    }

    customers.forEach((customer) => ensureCustomer({ ...customer, fromCustomersTable: true }));

    requests.forEach((req) => {
      const row = ensureCustomer({
        id: req.customer_id || null,
        name: req.customer_name_snapshot,
        phone: req.customer_phone_snapshot,
        created_at: req.created_at
      });
      row.requests.push(req);
      if (req.created_at) {
        if (!row.firstSeen || new Date(req.created_at) < new Date(row.firstSeen)) row.firstSeen = req.created_at;
        if (!row.lastSeen || new Date(req.created_at) > new Date(row.lastSeen)) row.lastSeen = req.created_at;
      }
      const src = sourceKey(req.request_source);
      row.sourceCounts[src] = (row.sourceCounts[src] || 0) + 1;
      const zone = req.zone_name || t('unknown');
      row.zoneCounts[zone] = (row.zoneCounts[zone] || 0) + 1;
      const status = req.status || 'unknown';
      row.statuses[status] = (row.statuses[status] || 0) + 1;
      row.partySizes.push(n(req.requested_party_size) || 1);
    });

    arrivals.forEach((arr) => {
      const row = ensureCustomer({ phone: arr.customer_phone, created_at: arr.created_at });
      row.arrivals.push(arr);
      if (arr.created_at) {
        if (!row.firstSeen || new Date(arr.created_at) < new Date(row.firstSeen)) row.firstSeen = arr.created_at;
        if (!row.lastSeen || new Date(arr.created_at) > new Date(row.lastSeen)) row.lastSeen = arr.created_at;
      }
    });

    const rows = Array.from(map.values()).map((row) => finalizeCustomer(row));
    const filtered = applyFilters(rows);
    const segments = buildSegments(rows);
    const loyalty = buildLoyalty(rows);
    const summary = buildSummary(rows, filtered, segments);

    return { business, rangeStart, customers: rows, filtered, requests, arrivals, segments, loyalty, summary, rawCustomerCount: customers.length };
  }

  function finalizeCustomer(row) {
    const totalRequests = row.requests.length;
    const lossCount = row.requests.filter((r) => ['cancelled', 'expired', 'no_show'].includes(r.status)).length;
    const completedCount = row.requests.filter((r) => ['offered', 'reserved', 'occupied', 'cleaning', 'completed'].includes(r.status)).length;
    const days = daysSince(row.lastSeen);
    const preferredSource = topKey(row.sourceCounts) || 'other';
    const preferredZone = topKey(row.zoneCounts) || t('unknown');
    const avgParty = average(row.partySizes);
    const repeat = totalRequests > 1;
    const isNew = row.firstSeen ? daysSince(row.firstSeen) <= 7 : false;
    const inactive = days !== null && days >= 30;
    const highLoss = lossCount >= 2 || pct(lossCount, totalRequests) >= 50 && totalRequests >= 2;
    const vip = totalRequests >= 5 && pct(lossCount, totalRequests) <= 20;
    const level = totalRequests >= 5 && pct(lossCount, totalRequests) <= 20 ? 'gold' : totalRequests >= 3 ? 'silver' : totalRequests >= 2 ? 'bronze' : 'one_time';
    return {
      ...row,
      totalRequests,
      lossCount,
      completedCount,
      daysSinceLast: days,
      preferredSource,
      preferredZone,
      avgParty,
      repeat,
      isNew,
      inactive,
      highLoss,
      vip,
      level,
      lossRate: pct(lossCount, totalRequests),
      repeatScore: totalRequests + Math.max(0, completedCount - lossCount),
      rawCustomerCount: row.rawCustomers ? row.rawCustomers.length : 0,
      namesUsed: Array.isArray(row.namesUsed) && row.namesUsed.length ? row.namesUsed : [row.name],
      customerIds: Array.isArray(row.customerIds) ? row.customerIds : []
    };
  }

  function topKey(obj) {
    const entries = Object.entries(obj || {});
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }

  function applyFilters(rows) {
    const query = String(EQC.search || '').trim().toLowerCase();
    return rows.filter((row) => {
      const searchOk = !query || [
        row.name,
        row.phone,
        row.whatsapp,
        ...(row.namesUsed || []),
        ...(row.customerIds || [])
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const sourceOk = EQC.source === 'all' || row.preferredSource === EQC.source;
      let segmentOk = true;
      if (EQC.segment === 'new') segmentOk = row.isNew;
      if (EQC.segment === 'repeat') segmentOk = row.repeat;
      if (EQC.segment === 'vip') segmentOk = row.vip;
      if (EQC.segment === 'high_loss') segmentOk = row.highLoss;
      if (EQC.segment === 'inactive') segmentOk = row.inactive;
      let statusOk = true;
      if (EQC.status === 'active') statusOk = !row.inactive;
      if (EQC.status === 'inactive') statusOk = row.inactive;
      return searchOk && sourceOk && segmentOk && statusOk;
    }).sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0));
  }

  function buildSegments(rows) {
    const total = rows.length;
    const items = [
      { key: 'new', labelKey: 'new_customers', descKey: 'new_desc', rows: rows.filter((r) => r.isNew), icon: 'fa-user-plus' },
      { key: 'repeat', labelKey: 'repeat_customers', descKey: 'repeat_desc', rows: rows.filter((r) => r.repeat), icon: 'fa-repeat' },
      { key: 'active', labelKey: 'active', descKey: 'active_desc', rows: rows.filter((r) => !r.inactive), icon: 'fa-heart-pulse' },
      { key: 'inactive', labelKey: 'inactive_customers', descKey: 'inactive_desc', rows: rows.filter((r) => r.inactive), icon: 'fa-user-clock' },
      { key: 'online', labelKey: 'online_customers', descKey: 'online_desc', rows: rows.filter((r) => r.preferredSource === 'online'), icon: 'fa-globe' },
      { key: 'local', labelKey: 'local_customers', descKey: 'local_desc', rows: rows.filter((r) => r.preferredSource === 'walk_in'), icon: 'fa-store' },
      { key: 'vip', labelKey: 'vip_potential', descKey: 'vip_desc', rows: rows.filter((r) => r.vip), icon: 'fa-crown' },
      { key: 'high_loss', labelKey: 'high_loss_customers', descKey: 'high_loss_desc', rows: rows.filter((r) => r.highLoss), icon: 'fa-triangle-exclamation' }
    ];
    return items.map((item) => ({ ...item, count: item.rows.length, percent: pct(item.rows.length, total) }));
  }

  function buildLoyalty(rows) {
    const levels = {
      gold: rows.filter((r) => r.level === 'gold'),
      silver: rows.filter((r) => r.level === 'silver'),
      bronze: rows.filter((r) => r.level === 'bronze'),
      one_time: rows.filter((r) => r.level === 'one_time')
    };
    const topRepeat = rows.slice().sort((a, b) => b.repeatScore - a.repeatScore).slice(0, 12);
    const comeback = rows.filter((r) => r.repeat && r.daysSinceLast !== null && r.daysSinceLast >= 30 && !r.highLoss).sort((a, b) => b.totalRequests - a.totalRequests).slice(0, 12);
    return { levels, topRepeat, comeback };
  }

  function buildSummary(rows, filtered, segments) {
    const total = rows.length;
    const repeatCount = rows.filter((r) => r.repeat).length;
    const inactiveCount = rows.filter((r) => r.inactive).length;
    const onlineCount = rows.filter((r) => r.preferredSource === 'online').length;
    const localCount = rows.filter((r) => r.preferredSource === 'walk_in').length;
    const notesCount = rows.filter((r) => String(r.notes || '').trim()).length;
    const vipCount = rows.filter((r) => r.vip).length;
    const highLossCount = rows.filter((r) => r.highLoss).length;
    const latest = rows.slice().sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0))[0] || null;
    const topSource = topKey(countBy(rows, 'preferredSource')) || 'other';
    const topZone = topKey(countBy(rows, 'preferredZone')) || t('unknown');
    return { total, filtered: filtered.length, repeatCount, repeatRate: pct(repeatCount, total), inactiveCount, onlineCount, localCount, notesCount, vipCount, highLossCount, latest, topSource, topZone, segments };
  }

  function countBy(rows, key) {
    return rows.reduce((out, row) => {
      const value = row[key] || 'unknown';
      out[value] = (out[value] || 0) + 1;
      return out;
    }, {});
  }

  function renderCustomers(data, view) {
    const body = `<div class="eqc-page" id="eqCustomers" data-view="${esc(view)}" dir="${lang() === 'ar' ? 'rtl' : 'ltr'}">${heroHtml(data)}${toolbarHtml(data)}${tabsHtml(view)}${viewBodyHtml(data, view)}</div>`;
    openPanel(t('title'), t('subtitle'), body);
  }

  function heroHtml(data) {
    const business = data.business?.name || data.business?.business_name || 'EASY-Q';
    const updated = EQC.loadedAt ? fmtDateTime(EQC.loadedAt) : '—';
    return `<section class="eqc-hero"><div style="position:relative;z-index:1;"><h2>${esc(t('title'))}</h2><p>${esc(t('subtitle'))}</p><div class="eqc-hero-actions"><button class="eqc-btn primary" onclick="EQRestaurantCustomers.refresh()"><i class="fas fa-sync-alt"></i>${esc(t('refresh_now'))}</button></div><div class="eqc-chip-row" style="margin-top:12px;"><span class="eqc-badge info">${esc(business)}</span><span class="eqc-badge wait">${esc(t('range'))}: ${esc(rangeLabel(EQC.range))}</span><span class="eqc-badge muted">${esc(t('last_update'))}: ${esc(updated)}</span></div></div><div class="eqc-health-card"><div class="eqc-health-title">${esc(t('quick_read'))}</div><div class="eqc-health-value"><span>${esc(data.summary.total)}</span><span style="font-size:16px;opacity:.82;">${esc(t('unique_phone_customers'))}</span></div><p style="margin-top:10px;">${esc(t('repeat_rate'))}: ${esc(data.summary.repeatRate)}% — ${esc(t('top_source'))}: ${esc(t(data.summary.topSource))}</p></div></section>`;
  }

  function toolbarHtml() {
    return `<div class="eqc-toolbar"><div><div class="eqc-card-sub" style="margin-bottom:8px;">${esc(t('range'))}</div><div class="eqc-chip-row"><button class="eqc-chip ${EQC.range==='today'?'active':''}" onclick="EQRestaurantCustomers.setRange('today')">${esc(t('today'))}</button><button class="eqc-chip ${EQC.range==='last7'?'active':''}" onclick="EQRestaurantCustomers.setRange('last7')">${esc(t('last7'))}</button><button class="eqc-chip ${EQC.range==='last30'?'active':''}" onclick="EQRestaurantCustomers.setRange('last30')">${esc(t('last30'))}</button><button class="eqc-chip ${EQC.range==='last90'?'active':''}" onclick="EQRestaurantCustomers.setRange('last90')">${esc(t('last90'))}</button><button class="eqc-chip ${EQC.range==='all'?'active':''}" onclick="EQRestaurantCustomers.setRange('all')">${esc(t('all_time'))}</button></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;"><input class="eqc-search" value="${esc(EQC.search)}" placeholder="${esc(t('search_placeholder'))}" oninput="EQRestaurantCustomers.setSearch(this.value)"><button class="eqc-mini-btn" onclick="EQRestaurantCustomers.resetFilters()"><i class="fas fa-rotate-left"></i>${esc(t('reset_filters'))}</button></div></div>`;
  }

  function tabsHtml(view) {
    const tabs = [
      ['overview', 'overview', 'fa-chart-pie'],
      ['list', 'list', 'fa-list'],
      ['profile', 'profile', 'fa-id-card'],
      ['segments', 'segments', 'fa-tags'],
      ['loyalty', 'loyalty', 'fa-gem'],
      ['export', 'export', 'fa-download']
    ];
    return `<div class="eqc-tabs">${tabs.map(([key,label,icon])=>`<button class="eqc-tab ${view===key?'active':''}" onclick="EQRestaurantCustomers.setView('${key}')"><i class="fas ${icon}"></i>${esc(t(label))}</button>`).join('')}</div>`;
  }

  function viewBodyHtml(data, view) {
    if (view === 'list') return listViewHtml(data);
    if (view === 'profile') return profileViewHtml(data);
    if (view === 'segments') return segmentsViewHtml(data);
    if (view === 'loyalty') return loyaltyViewHtml(data);
    if (view === 'export') return exportViewHtml(data);
    return overviewViewHtml(data);
  }

  function kpiCard(icon, title, value, label, miniItems) {
    return `<div class="eqc-card soft"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas ${esc(icon)}"></i>${esc(title)}</div><div class="eqc-card-sub">${esc(label)}</div></div></div><div class="eqc-kpi-value">${esc(value)}</div><div class="eqc-mini-row">${(miniItems||[]).map(([labelText,num])=>`<div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(num)}</div><div class="eqc-mini-label">${esc(labelText)}</div></div>`).join('')}</div></div>`;
  }

  function progressCard(icon, title, value, label, percentValue) {
    return `<div class="eqc-card soft"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas ${esc(icon)}"></i>${esc(title)}</div><div class="eqc-card-sub">${esc(label)}</div></div></div><div class="eqc-kpi-value">${esc(value)}</div><div class="eqc-progress"><span style="width:${pct(percentValue,100)}%"></span></div><div class="eqc-kpi-label">${pct(percentValue,100)}%</div></div>`;
  }

  function overviewViewHtml(data) {
    return `<div class="eqc-grid">${kpiCard('fa-users', t('total_customers'), data.summary.total, t('period_note'), [[t('new_customers'), getSegment(data, 'new').count], [t('repeat_customers'), data.summary.repeatCount]])}${kpiCard('fa-repeat', t('repeat_customers'), data.summary.repeatCount, t('repeat_rate'), [[t('vip_potential'), data.summary.vipCount], [t('inactive_customers'), data.summary.inactiveCount]])}${progressCard('fa-heart-pulse', t('repeat_rate'), `${data.summary.repeatRate}%`, t('loyalty_title'), data.summary.repeatRate)}${kpiCard('fa-globe', t('top_source'), t(data.summary.topSource), t('source'), [[t('online_customers'), data.summary.onlineCount], [t('local_customers'), data.summary.localCount]])}<div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-lightbulb"></i>${esc(t('insights'))}</div><div class="eqc-card-sub">${esc(t('quick_read'))}</div></div></div>${insightsHtml(data)}</div><div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-users-viewfinder"></i>${esc(t('segment_summary'))}</div><div class="eqc-card-sub">${esc(t('segments'))}</div></div></div>${segmentBarsHtml(data.segments)}</div><div class="eqc-card full"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-clock-rotate-left"></i>${esc(t('latest_customer'))}</div><div class="eqc-card-sub">${esc(t('list'))}</div></div></div><div id="eqcCustomerCardsWrap">${customerCardsHtml(data.filtered.slice(0,8))}</div></div></div>`;
  }

  function getSegment(data, key) {
    return data.segments.find((s) => s.key === key) || { count: 0, percent: 0 };
  }

  function insightsHtml(data) {
    const rows = [
      `${t('repeat_rate')}: ${data.summary.repeatRate}%`,
      `${t('top_source')}: ${t(data.summary.topSource)}`,
      `${t('top_zone')}: ${data.summary.topZone}`,
      `${t('high_loss_customers')}: ${data.summary.highLossCount}`,
      `${t('customers_with_notes')}: ${data.summary.notesCount}`
    ];
    return `<div class="eqc-list">${rows.map((text)=>`<div class="eqc-list-item"><div class="eqc-icon-box"><i class="fas fa-circle-info"></i></div><div><div class="eqc-list-title">${esc(text)}</div><div class="eqc-list-sub">${esc(t('period_note'))}</div></div><span class="eqc-badge wait">${esc(t('details'))}</span></div>`).join('')}</div>`;
  }

  function listViewHtml(data) {
    return `<div class="eqc-grid"><div class="eqc-card full"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-filter"></i>${esc(t('filter_segment'))}</div><div class="eqc-card-sub">${esc(t('period_note'))}</div></div></div>${filtersHtml()}</div><div class="eqc-card full"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-list"></i>${esc(t('list'))}</div><div class="eqc-card-sub" id="eqcCustomersListCount">${esc(data.filtered.length)} / ${esc(data.customers.length)} ${esc(t('unique_phone_customers'))}</div></div></div><div id="eqcCustomersListWrap">${customersTableHtml(data.filtered)}</div></div></div>`;
  }

  function filtersHtml() {
    const segmentOptions = ['all','new','repeat','vip','high_loss','inactive'];
    const sourceOptions = ['all','walk_in','online','restored','other'];
    const statusOptions = ['all','active','inactive'];
    return `<div class="eqc-chip-row"><span class="eqc-card-sub">${esc(t('filter_segment'))}</span>${segmentOptions.map((key)=>`<button class="eqc-chip ${EQC.segment===key?'active':''}" onclick="EQRestaurantCustomers.setSegment('${key}')">${esc(t(key))}</button>`).join('')}</div><div class="eqc-chip-row" style="margin-top:10px;"><span class="eqc-card-sub">${esc(t('filter_source'))}</span>${sourceOptions.map((key)=>`<button class="eqc-chip ${EQC.source===key?'active':''}" onclick="EQRestaurantCustomers.setSource('${key}')">${esc(t(key))}</button>`).join('')}</div><div class="eqc-chip-row" style="margin-top:10px;"><span class="eqc-card-sub">${esc(t('filter_status'))}</span>${statusOptions.map((key)=>`<button class="eqc-chip ${EQC.status===key?'active':''}" onclick="EQRestaurantCustomers.setStatus('${key}')">${esc(t(key))}</button>`).join('')}</div>`;
  }

  function customersTableHtml(rows) {
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_customers'))}</div>`;
    return `<div class="eqc-table-wrap"><table class="eqc-table"><thead><tr><th>${esc(t('last_name'))}</th><th>${esc(t('phone'))}</th><th>${esc(t('used_names'))}</th><th>${esc(t('linked_records'))}</th><th>${esc(t('visits'))}</th><th>${esc(t('last_visit'))}</th><th>${esc(t('preferred_source'))}</th><th>${esc(t('preferred_zone'))}</th><th>${esc(t('actions'))}</th></tr></thead><tbody>${rows.map((r)=>`<tr><td>${esc(r.name)}</td><td dir="ltr">${esc(displayPhone(r.phone))}</td><td>${esc((r.namesUsed || []).slice(0,3).join('، ') || '—')}</td><td>${esc(r.customerIds?.length || r.rawCustomerCount || 0)}</td><td>${esc(r.totalRequests)}</td><td>${esc(fmtDate(r.lastSeen))}</td><td>${esc(t(r.preferredSource))}</td><td>${esc(r.preferredZone)}</td><td><button class="eqc-mini-btn" onclick="EQRestaurantCustomers.openProfile('${esc(r.key)}')">${esc(t('open_profile'))}</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  function customerCardsHtml(rows) {
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_customers'))}</div>`;
    return `<div class="eqc-list">${rows.map((r)=>`<div class="eqc-list-item"><div class="eqc-icon-box"><i class="fas fa-user"></i></div><div><div class="eqc-list-title">${esc(r.name)} — <span dir="ltr">${esc(displayPhone(r.phone))}</span></div><div class="eqc-list-sub">${esc(t('visits'))}: ${esc(r.totalRequests)} / ${esc(t('last_visit'))}: ${esc(fmtDate(r.lastSeen))} / ${esc(t('preferred_source'))}: ${esc(t(r.preferredSource))}</div></div><button class="eqc-mini-btn" onclick="EQRestaurantCustomers.openProfile('${esc(r.key)}')">${esc(t('profile'))}</button></div>`).join('')}</div>`;
  }

  function profileViewHtml(data) {
    const customer = data.customers.find((r) => r.key === EQC.selectedCustomerKey) || data.filtered[0] || data.customers[0] || null;
    if (!customer) return `<div class="eqc-grid"><div class="eqc-card full"><div class="eqc-empty">${esc(t('profile_hint'))}</div></div></div>`;
    EQC.selectedCustomerKey = customer.key;
    return `
      <div class="eqc-grid">
        <div class="eqc-card full">
          <div class="eqc-card-head">
            <div>
              <div class="eqc-card-title"><i class="fas fa-id-card"></i>${esc(t('customer_profile'))}</div>
              <div class="eqc-card-sub">${esc(customer.name)} — <span dir="ltr">${esc(displayPhone(customer.phone))}</span></div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="eqc-mini-btn" onclick="EQRestaurantCustomers.setView('list')">
                <i class="fas fa-arrow-right"></i>${esc(t('back_to_list'))}
              </button>
              <button class="eqc-mini-btn" onclick="EQRestaurantCustomers.closeProfile()">
                <i class="fas fa-times"></i>${esc(t('close_profile'))}
              </button>
            </div>
          </div>
          <div class="eqc-profile-layout">
            <div>${customerProfileMain(customer)}</div>
            <div>${customerProfileHistory(customer)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function initials(name) {
    const s = String(name || '').trim();
    if (!s) return 'EQ';
    return s.slice(0, 2).toUpperCase();
  }

  function customerProfileMain(c) {
    const names = (c.namesUsed || []).filter(Boolean);
    const ids = (c.customerIds || []).filter(Boolean);
    const customerIdList = ids.length ? ids.map((id) => `<span class="eqc-badge muted" style="direction:ltr;max-width:100%;overflow:hidden;text-overflow:ellipsis;">${esc(id)}</span>`).join('') : `<span class="eqc-badge muted">—</span>`;
    const nameList = names.length ? names.map((name) => `<span class="eqc-badge wait">${esc(name)}</span>`).join('') : `<span class="eqc-badge muted">—</span>`;

    return `
      <div class="eqc-card" style="box-shadow:none;background:linear-gradient(180deg,#FFFFFF 0%,#F8FAFF 100%);">
        <div class="eqc-card-head">
          <div style="display:flex;gap:12px;align-items:center;min-width:0;">
            <div class="eqc-profile-avatar">${esc(initials(c.name))}</div>
            <div style="min-width:0;">
              <div class="eqc-card-title" style="font-size:18px;">${esc(c.name)}</div>
              <div class="eqc-card-sub" dir="ltr">${esc(displayPhone(c.phone) || t('no_phone_customer'))}</div>
            </div>
          </div>
          <span class="eqc-badge ${c.vip?'ok':c.highLoss?'bad':c.inactive?'warn':'wait'}">${esc(c.vip?t('vip'):c.highLoss?t('high_loss'):c.inactive?t('inactive'):t('active'))}</span>
        </div>
        <div class="eqc-note">${esc(t('latest_name_hint'))}</div>
      </div>

      <div class="eqc-mini-row" style="margin-top:12px;">
        <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(c.totalRequests)}</div><div class="eqc-mini-label">${esc(t('visits'))}</div></div>
        <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(fmtDate(c.firstSeen))}</div><div class="eqc-mini-label">${esc(t('first_visit'))}</div></div>
        <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(fmtDate(c.lastSeen))}</div><div class="eqc-mini-label">${esc(t('last_visit'))}</div></div>
        <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(c.avgParty || '—')}</div><div class="eqc-mini-label">${esc(t('avg_party_size'))}</div></div>
      </div>

      <div class="eqc-card" style="box-shadow:none;margin-top:12px;">
        <div class="eqc-card-title"><i class="fas fa-fingerprint"></i>${esc(t('identity_section'))}</div>
        <div class="eqc-list" style="margin-top:12px;">
          <div class="eqc-list-item"><div class="eqc-icon-box"><i class="fas fa-user-tag"></i></div><div><div class="eqc-list-title">${esc(t('last_name'))}</div><div class="eqc-list-sub">${esc(c.name)}</div></div><span class="eqc-badge wait">${esc(t('profile'))}</span></div>
          <div class="eqc-list-item"><div class="eqc-icon-box"><i class="fas fa-signature"></i></div><div><div class="eqc-list-title">${esc(t('used_names'))}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${nameList}</div></div><span class="eqc-badge info">${esc(names.length)}</span></div>
          <div class="eqc-list-item"><div class="eqc-icon-box"><i class="fas fa-id-badge"></i></div><div><div class="eqc-list-title">${esc(t('linked_customer_ids'))}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${customerIdList}</div></div><span class="eqc-badge muted">${esc(ids.length)}</span></div>
        </div>
      </div>

      <div class="eqc-card" style="box-shadow:none;margin-top:12px;">
        <div class="eqc-card-title"><i class="fas fa-chart-line"></i>${esc(t('profile_summary'))}</div>
        <div class="eqc-mini-row">
          <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(t(c.preferredSource))}</div><div class="eqc-mini-label">${esc(t('preferred_source'))}</div></div>
          <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(c.preferredZone)}</div><div class="eqc-mini-label">${esc(t('preferred_zone'))}</div></div>
          <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(c.lossRate)}%</div><div class="eqc-mini-label">${esc(t('loss_rate'))}</div></div>
          <div class="eqc-mini-stat"><div class="eqc-mini-num">${esc(c.rawCustomerCount || ids.length || 0)}</div><div class="eqc-mini-label">${esc(t('raw_customer_records'))}</div></div>
        </div>
      </div>

      <div style="margin-top:12px;">${customerAlerts(c)}</div>

      <div class="eqc-card" style="box-shadow:none;margin-top:12px;">
        <div class="eqc-card-title"><i class="fas fa-note-sticky"></i>${esc(t('private_notes'))}</div>
        <div class="eqc-note" style="margin-top:8px;">${esc(c.notes || t('no_notes'))}</div>
      </div>

      <div class="eqc-card" style="box-shadow:none;margin-top:12px;">
        <div class="eqc-card-title"><i class="fas fa-chart-pie"></i>${esc(t('source_mix'))}</div>
        ${barsHtml(Object.entries(c.sourceCounts).map(([key,value])=>({label:t(key),value})), t('requests'), 100)}
      </div>

      <div class="eqc-card" style="box-shadow:none;margin-top:12px;">
        <div class="eqc-card-title"><i class="fas fa-map-location-dot"></i>${esc(t('zone_mix'))}</div>
        ${barsHtml(Object.entries(c.zoneCounts).map(([key,value])=>({label:key,value})), t('requests'), 130)}
      </div>
    `;
  }

  function customerAlerts(c) {
    const alerts = [];
    if (c.vip) alerts.push(['ok','fa-crown',t('vip_alert')]);
    if (c.highLoss) alerts.push(['bad','fa-triangle-exclamation',t('loss_alert')]);
    if (c.inactive) alerts.push(['warn','fa-user-clock',t('inactive_alert')]);
    if (c.preferredSource === 'online') alerts.push(['wait','fa-globe',t('online_alert')]);
    if (c.preferredSource === 'walk_in') alerts.push(['wait','fa-store',t('local_alert')]);
    if (!alerts.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-list">${alerts.map(([type,icon,text])=>`<div class="eqc-alert ${type==='wait'?'':type}"><i class="fas ${icon}"></i><div class="eqc-list-title">${esc(text)}</div></div>`).join('')}</div>`;
  }

  function customerProfileHistory(c) {
    const rows = c.requests.slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    if (!rows.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqc-card-title"><i class="fas fa-clock-rotate-left"></i>${esc(t('requests_by_phone'))}</div><div class="eqc-table-wrap" style="margin-top:12px;"><table class="eqc-table" style="min-width:720px;"><thead><tr><th>${esc(t('booking_code'))}</th><th>${esc(t('created_at'))}</th><th>${esc(t('request_source'))}</th><th>${esc(t('zone'))}</th><th>${esc(t('party_size'))}</th><th>${esc(t('status'))}</th></tr></thead><tbody>${rows.map((r)=>`<tr><td>${esc(r.booking_code || '—')}</td><td>${esc(fmtDateTime(r.created_at))}</td><td>${esc(sourceLabel(r.request_source))}</td><td>${esc(r.zone_name || t('unknown'))}</td><td>${esc(r.requested_party_size || 1)}</td><td><span class="eqc-badge ${statusClass(r.status)}">${esc(statusLabel(r.status))}</span></td></tr>`).join('')}</tbody></table></div>`;
  }

  function segmentsViewHtml(data) {
    return `<div class="eqc-grid"><div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-tags"></i>${esc(t('segment_summary'))}</div><div class="eqc-card-sub">${esc(t('description'))}</div></div></div>${segmentBarsHtml(data.segments)}</div><div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-table-list"></i>${esc(t('segment_table'))}</div><div class="eqc-card-sub">${esc(t('percent'))}</div></div></div>${segmentsTableHtml(data.segments)}</div><div class="eqc-card full"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-users"></i>${esc(t('customers'))}</div><div class="eqc-card-sub">${esc(t('filter_segment'))}</div></div></div>${customerCardsHtml(data.filtered.slice(0,12))}</div></div>`;
  }

  function segmentBarsHtml(segments) {
    return barsHtml(segments.map((s)=>({label:t(s.labelKey),value:s.count})), t('customers'), 140);
  }

  function segmentsTableHtml(segments) {
    return `<div class="eqc-table-wrap"><table class="eqc-table"><thead><tr><th>${esc(t('segment_name'))}</th><th>${esc(t('count'))}</th><th>${esc(t('percent'))}</th><th>${esc(t('description'))}</th></tr></thead><tbody>${segments.map((s)=>`<tr><td>${esc(t(s.labelKey))}</td><td>${esc(s.count)}</td><td>${esc(s.percent)}%</td><td>${esc(t(s.descKey))}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function loyaltyViewHtml(data) {
    const levels = data.loyalty.levels;
    const total = data.customers.length;
    return `<div class="eqc-grid"><div class="eqc-card soft"><div class="eqc-card-title"><i class="fas fa-crown"></i>${esc(t('gold'))}</div><div class="eqc-kpi-value">${esc(levels.gold.length)}</div><div class="eqc-kpi-label">${esc(t('gold_desc'))}</div></div><div class="eqc-card soft"><div class="eqc-card-title"><i class="fas fa-medal"></i>${esc(t('silver'))}</div><div class="eqc-kpi-value">${esc(levels.silver.length)}</div><div class="eqc-kpi-label">${esc(t('silver_desc'))}</div></div><div class="eqc-card soft"><div class="eqc-card-title"><i class="fas fa-award"></i>${esc(t('bronze'))}</div><div class="eqc-kpi-value">${esc(levels.bronze.length)}</div><div class="eqc-kpi-label">${esc(t('bronze_desc'))}</div></div><div class="eqc-card soft"><div class="eqc-card-title"><i class="fas fa-user"></i>${esc(t('one_time'))}</div><div class="eqc-kpi-value">${esc(levels.one_time.length)}</div><div class="eqc-kpi-label">${esc(t('one_time_desc'))}</div></div><div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-repeat"></i>${esc(t('top_repeat'))}</div><div class="eqc-card-sub">${esc(t('loyalty_subtitle'))}</div></div></div>${customerCardsHtml(data.loyalty.topRepeat)}</div><div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-phone"></i>${esc(t('comeback_candidates'))}</div><div class="eqc-card-sub">${esc(t('inactive_customers'))}</div></div></div>${customerCardsHtml(data.loyalty.comeback)}</div><div class="eqc-card full"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-chart-simple"></i>${esc(t('loyalty_levels'))}</div><div class="eqc-card-sub">${esc(t('loyalty_subtitle'))}</div></div></div>${barsHtml([{label:t('gold'),value:levels.gold.length},{label:t('silver'),value:levels.silver.length},{label:t('bronze'),value:levels.bronze.length},{label:t('one_time'),value:levels.one_time.length}], t('customers'), 120)}</div></div>`;
  }

  function exportViewHtml(data) {
    return `<div class="eqc-grid"><div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-download"></i>${esc(t('export_title'))}</div><div class="eqc-card-sub">${esc(t('export_subtitle'))}</div></div></div><div class="eqc-export-actions"><button class="eqc-btn primary" onclick="EQRestaurantCustomers.downloadExcel('filtered')"><i class="fas fa-file-excel"></i>${esc(t('export_filtered'))}</button><button class="eqc-btn ghost" onclick="EQRestaurantCustomers.downloadExcel('all')"><i class="fas fa-file-excel"></i>${esc(t('export_all'))}</button><button class="eqc-btn ghost" onclick="EQRestaurantCustomers.copySummary()"><i class="fas fa-copy"></i>${esc(t('copy_summary'))}</button></div><div class="eqc-note" style="margin-top:12px;">${esc(t('export_note'))}</div></div><div class="eqc-card wide"><div class="eqc-card-head"><div><div class="eqc-card-title"><i class="fas fa-eye"></i>${esc(t('quick_read'))}</div><div class="eqc-card-sub">${esc(t('last_update'))}: ${esc(EQC.loadedAt ? fmtDateTime(EQC.loadedAt) : '—')}</div></div></div>${insightsHtml(data)}</div></div>`;
  }

  function barsHtml(items, unitLabel, labelWidth) {
    if (!items || !items.length) return `<div class="eqc-empty">${esc(t('no_data'))}</div>`;
    const max = Math.max(1, ...items.map((i)=>n(i.value)));
    return `<div class="eqc-bars">${items.map((item)=>`<div class="eqc-bar-row" style="grid-template-columns:${labelWidth||130}px minmax(0,1fr) 64px;"><div title="${esc(item.label)}">${esc(item.label)}</div><div class="eqc-bar-track"><div class="eqc-bar-fill" style="width:${pct(item.value,max)}%"></div></div><div>${esc(item.value)} ${unitLabel?esc(unitLabel):''}</div></div>`).join('')}</div>`;
  }

  function makeCsv(rows) {
    return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  function excelCell(value) {
    return esc(value ?? '');
  }

  function customersExportRows(mode) {
    const data = EQC.lastData;
    if (!data) return [];
    const rows = mode === 'all' ? data.customers : data.filtered;
    const exportRows = [[t('last_name'), t('phone'), t('whatsapp'), t('used_names'), t('linked_customer_ids'), t('visits'), t('first_visit'), t('last_visit'), t('preferred_source'), t('preferred_zone'), t('avg_party_size'), t('loss_count'), t('loss_rate'), t('status')]];
    rows.forEach((r) => exportRows.push([
      r.name,
      displayPhone(r.phone),
      displayPhone(r.whatsapp),
      r.totalRequests,
      fmtDate(r.firstSeen),
      fmtDate(r.lastSeen),
      t(r.preferredSource),
      r.preferredZone,
      r.avgParty,
      r.lossCount,
      `${r.lossRate}%`,
      r.vip ? t('vip') : r.highLoss ? t('high_loss') : r.inactive ? t('inactive') : t('active')
    ]));
    return exportRows;
  }

  function downloadExcel(mode) {
    const data = EQC.lastData;
    if (!data) return;

    const rows = customersExportRows(mode);
    const direction = lang() === 'ar' ? 'rtl' : 'ltr';
    const textAlign = lang() === 'ar' ? 'right' : 'left';
    const businessName = data.business?.name || data.business?.business_name || 'EASY-Q';

    const tableRows = rows.map((row, index) => `
      <tr>
        ${row.map((cell) => index === 0
          ? `<th style="border:1px solid #d9e2f3;background:#0E146D;color:#ffffff;padding:8px;text-align:${textAlign};">${excelCell(cell)}</th>`
          : `<td style="border:1px solid #d9e2f3;padding:8px;text-align:${textAlign};mso-number-format:'\@';">${excelCell(cell)}</td>`
        ).join('')}
      </tr>
    `).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Customers</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body style="font-family:Arial, sans-serif;direction:${direction};text-align:${textAlign};">
          <h2 style="margin:0 0 6px;color:#0E146D;">${excelCell(businessName)}</h2>
          <div style="margin-bottom:12px;font-weight:bold;color:#64748B;">${excelCell(t('export_title'))} - ${excelCell(rangeLabel(EQC.range))}</div>
          <table style="border-collapse:collapse;width:100%;direction:${direction};">
            ${tableRows}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const name = `easy-q-customers-${EQC.range}-${lang()}.xls`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function downloadCsv(mode) {
    const rows = customersExportRows(mode);
    if (!rows.length) return;
    const blob = new Blob(['\uFEFF' + makeCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const name = `easy-q-customers-${EQC.range}-${lang()}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function copySummary() {
    const data = EQC.lastData;
    if (!data) return;
    const text = [
      `${t('title')} - EASY-Q`,
      `${t('range')}: ${rangeLabel(EQC.range)}`,
      `${t('total_customers')}: ${data.summary.total}`,
      `${t('repeat_customers')}: ${data.summary.repeatCount}`,
      `${t('repeat_rate')}: ${data.summary.repeatRate}%`,
      `${t('top_source')}: ${t(data.summary.topSource)}`,
      `${t('top_zone')}: ${data.summary.topZone}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert(t('summary_copied'));
    } catch (_) {
      window.prompt(t('copy_summary'), text);
    }
  }

  async function openCustomers(view = 'overview', force = false) {
    const views = ['overview', 'list', 'profile', 'segments', 'loyalty', 'export'];
    EQC.activeView = views.includes(view) ? view : 'overview';
    setActiveSidebar(sidebarViewFor(EQC.activeView));
    if (!canOpenCustomers()) {
      openPanel(t('title'), t('no_permission'), errorHtml(t('no_permission')));
      return;
    }
    openPanel(t('title'), t('subtitle'), loadingHtml());
    try {
      let data = EQC.lastData;
      if (!data || force || EQC.lastRange !== EQC.range) data = await loadCustomersData();
      else {
        data.filtered = applyFilters(data.customers);
        data.summary = buildSummary(data.customers, data.filtered, data.segments);
      }
      renderCustomers(data, EQC.activeView);
    } catch (err) {
      console.error('[EASY-Q Customers] open failed:', err);
      openPanel(t('title'), t('load_error'), errorHtml(err.message || t('load_error')));
    }
  }

  function sidebarViewFor(view) {
    if (view === 'profile') return 'profiles';
    if (view === 'segments') return 'segments';
    if (view === 'loyalty') return 'loyalty';
    return 'list';
  }

  function bindSidebarButtons() {
    const map = [
      ['customers-list', 'list'],
      ['customers-profiles', 'profile'],
      ['customers-segments', 'segments'],
      ['customers-loyalty', 'loyalty']
    ];
    map.forEach(([dataView, targetView]) => {
      const btn = document.querySelector(`.sub-menu-item[data-view="${dataView}"]`);
      if (btn && btn.dataset.eqcBound !== 'true') {
        btn.dataset.eqcBound = 'true';
        btn.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          openCustomers(targetView, true);
        });
      }
    });
  }

  function boot() {
    ensureStyles();
    bindSidebarButtons();
    setTimeout(bindSidebarButtons, 600);
    setTimeout(bindSidebarButtons, 1600);
  }

  window.EQRestaurantCustomers = {
    open: openCustomers,
    refresh() { return openCustomers(EQC.activeView, true); },
    setView(view) { return openCustomers(view, false); },
    setRange(range) {
      EQC.range = ['today','last7','last30','last90','all'].includes(range) ? range : 'last30';
      EQC.lastData = null;
      EQC.lastRange = null;
      return openCustomers(EQC.activeView, true);
    },
    setSearch(value) {
      EQC.search = value || '';
      if (!EQC.lastData) return;

      EQC.lastData.filtered = applyFilters(EQC.lastData.customers);
      EQC.lastData.summary = buildSummary(EQC.lastData.customers, EQC.lastData.filtered, EQC.lastData.segments);

      const listWrap = $('eqcCustomersListWrap');
      if (listWrap) listWrap.innerHTML = customersTableHtml(EQC.lastData.filtered);

      const countEl = $('eqcCustomersListCount');
      if (countEl) countEl.textContent = `${EQC.lastData.filtered.length} / ${EQC.lastData.customers.length} ${t('unique_phone_customers')}`;

      const cardsWrap = $('eqcCustomerCardsWrap');
      if (cardsWrap) cardsWrap.innerHTML = customerCardsHtml(EQC.lastData.filtered.slice(0, 8));
    },
    setSegment(value) { EQC.segment = value || 'all'; return openCustomers(EQC.activeView, false); },
    setSource(value) { EQC.source = value || 'all'; return openCustomers(EQC.activeView, false); },
    setStatus(value) { EQC.status = value || 'all'; return openCustomers(EQC.activeView, false); },
    resetFilters() { EQC.search = ''; EQC.segment = 'all'; EQC.source = 'all'; EQC.status = 'all'; return openCustomers(EQC.activeView, false); },
    openProfile(key) { EQC.selectedCustomerKey = key; return openCustomers('profile', false); },
    closeProfile() {
      EQC.selectedCustomerKey = null;
      if (typeof window.closeFullPagePanel === 'function') window.closeFullPagePanel();
      else return openCustomers('list', false);
    },
    downloadExcel,
    downloadCSV: downloadCsv,
    copySummary,
    boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
