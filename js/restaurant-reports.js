/* ============================================================
   EASY-Q RESTAURANT REPORTS
   ملف مستقل لقسم التقارير لمسؤول المطعم
   الربط لاحقًا: <script src="js/restaurant-reports.js"></script>
   ============================================================ */

(function () {
  'use strict';

  const EQR = {
    activeView: 'summary',
    range: 'today',
    loadedAt: null,
    lastData: null,
    exportLang: 'ar'
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const I18N = {
    ar: {
      reports_title: 'تقارير المطعم',
      reports_subtitle: 'تحليل نهاية اليوم للطلبات والطاولات والذروة والتعيينات مع أدوات التصدير.',
      loading: 'جاري تجهيز التقارير...',
      load_error: 'تعذر فتح التقارير',
      unexpected_error: 'حدث خطأ غير متوقع',
      no_permission: 'ليس لديك صلاحية لعرض التقارير.',
      loading_indicators: 'جاري تحميل بيانات التقارير',
      unable_load_data: 'تعذر تحميل البيانات',
      refresh_now: 'تحديث الآن',
      report_range: 'نطاق التقرير',
      today: 'اليوم',
      last7: 'آخر 7 أيام',
      last30: 'آخر 30 يوم',
      report_generated: 'آخر تحديث',
      business_label: 'المطعم',
      current_lang: 'لغة العرض',
      summary: 'ملخص الطلبات',
      waiting_analysis: 'تحليل وقت الانتظار',
      customer_sources: 'مصادر العملاء',
      peak_hours: 'ساعات الذروة',
      table_utilization: 'استغلال الطاولات',
      assignments_whatsapp: 'التعيينات والواتساب',
      zones_floors: 'المناطق والطوابق',
      export_reports: 'تصدير التقارير',
      current_status: 'حالة التشغيل الحالية',
      stable: 'مستقر',
      under_watch: 'تحت المراقبة',
      high_pressure: 'ضغط عالٍ',
      total_requests: 'إجمالي الطلبات',
      active_requests: 'طلبات نشطة',
      loss_requests: 'طلبات مفقودة',
      conversion_rate: 'نسبة التحويل',
      avg_wait_current: 'متوسط الانتظار الحالي',
      avg_wait_assigned: 'متوسط وقت الوصول للتعيين',
      avg_wait_expired: 'متوسط وقت الطلبات المنتهية',
      longest_wait: 'أطول انتظار',
      above_15: 'فوق 15 دقيقة',
      current_waiting: 'الانتظار الحالي',
      assigned_waiting: 'طلبات تم تعيينها',
      expired_waiting: 'طلبات منتهية',
      distribution: 'التوزيع',
      by_status: 'حسب الحالة',
      by_source: 'حسب المصدر',
      requests_flow: 'مسار الطلبات',
      requests_count: 'عدد الطلبات',
      requests_created: 'الطلبات المنشأة',
      waiting: 'انتظار',
      offered: 'جاهز/معيّن',
      reserved: 'محجوز',
      occupied: 'مشغول',
      completed: 'مكتمل',
      cleaning: 'تنظيف',
      cancelled: 'ملغي',
      expired: 'منتهي',
      no_show: 'لم يحضر',
      available: 'متاحة',
      disabled: 'معطلة',
      pending: 'معلقة',
      walk_in: 'محلي',
      online: 'أونلاين',
      restored: 'مسترجع',
      other_source: 'غير مصنف',
      requests: 'طلب',
      customers: 'عميل',
      count: 'العدد',
      percent: 'النسبة',
      lost: 'فقد',
      served_or_active: 'تمت خدمتهم / نشط',
      source_breakdown: 'تحليل المصادر',
      top_source: 'أفضل مصدر',
      best_conversion: 'أفضل تحويل',
      highest_loss: 'أعلى فقد',
      peak_requests_hour: 'أعلى ساعة طلبات',
      peak_assignments_hour: 'أعلى ساعة تعيين',
      quiet_hour: 'أهدأ ساعة',
      by_hour: 'حسب الساعة',
      by_day: 'حسب اليوم',
      request_peak_chart: 'منحنى الطلبات حسب الساعة',
      assignment_peak_chart: 'منحنى التعيينات حسب الساعة',
      current_tables: 'حالة الطاولات الحالية',
      usable_tables: 'الطاولات العاملة',
      utilization: 'نسبة الإشغال الحالية',
      busy_rate: 'الانشغال الحالي',
      capacity_mix: 'توزيع السعات',
      tables_by_zone: 'الطاولات حسب المنطقة',
      tables_by_floor: 'الطاولات حسب الطابق',
      most_active_tables: 'أكثر الطاولات نشاطًا',
      assignments_total: 'إجمالي التعيينات',
      assignment_rate: 'معدل التعيين من الطلبات',
      avg_to_assignment: 'متوسط الوصول للتعيين',
      whatsapp_sent: 'تم إشعارهم واتساب',
      whatsapp_not_sent: 'لم يتم إشعارهم',
      active_holds: 'حجوزات نشطة',
      expiring_holds: 'تقترب من الانتهاء',
      assignments_over_time: 'التعيينات عبر الوقت',
      whatsapp_summary: 'ملخص الإشعارات',
      zones_summary: 'ملخص المناطق',
      floors_summary: 'ملخص الطوابق',
      zone: 'المنطقة',
      floor: 'الطابق',
      tables: 'الطاولات',
      requests_today: 'طلبات الفترة',
      available_tables: 'طاولات متاحة',
      occupied_tables: 'طاولات مشغولة',
      waiting_now: 'انتظار الآن',
      avg_wait: 'متوسط الانتظار',
      export_title: 'تصدير ومشاركة التقرير',
      export_sub: 'إنشاء نسخة احترافية قابلة للطباعة أو المشاركة أو التنزيل.',
      export_lang: 'لغة التصدير',
      export_ar: 'العربية',
      export_en: 'English',
      print_pdf: 'طباعة / PDF',
      download_html: 'تحميل HTML',
      download_csv: 'تحميل CSV',
      share_report: 'مشاركة التقرير',
      email_report: 'إرسال بالبريد',
      whatsapp_share: 'مشاركة واتساب',
      copy_summary: 'نسخ الملخص',
      social_share: 'مشاركة اجتماعية',
      share_x: 'X',
      share_fb: 'Facebook',
      export_preview: 'معاينة التقرير',
      generated_on: 'تم إنشاؤه في',
      no_data: 'لا توجد بيانات كافية',
      no_requests: 'لا توجد طلبات في النطاق المحدد',
      no_tables: 'لا توجد بيانات طاولات كافية',
      no_assignments: 'لا توجد تعيينات في النطاق المحدد',
      no_zones: 'لا توجد بيانات مناطق/طوابق كافية',
      copied: 'تم نسخ الملخص',
      shared_not_supported: 'المشاركة المباشرة غير مدعومة في هذا الجهاز، جرى نسخ الملخص للحافظة.',
      email_subject: 'تقرير EASY-Q',
      time_to_assignment: 'الوقت حتى التعيين',
      expired_wait_time: 'وقت الطلب حتى الانتهاء',
      current_wait_time: 'وقت الانتظار الحالي',
      bucket_0_5: '0-5 دقائق',
      bucket_6_10: '6-10 دقائق',
      bucket_11_15: '11-15 دقيقة',
      bucket_16_20: '16-20 دقيقة',
      bucket_21_plus: '21+ دقيقة',
      party_distribution: 'توزيع أحجام المجموعات',
      top_zones: 'أكثر المناطق طلبًا',
      top_floors: 'أكثر الطوابق نشاطًا',
      report_ready: 'التقرير جاهز',
      live_snapshot: 'لقطة آنية',
      period_analysis: 'تحليل الفترة',
      current_wait_alert: 'عملاء فوق 15 دقيقة',
      source: 'المصدر',
      details: 'التفاصيل',
      status: 'الحالة',
      value: 'القيمة',
      note: 'ملاحظة',
      generated_report_name: 'تقرير المطعم',
      best_hour: 'أفضل ساعة',
      top_day: 'أكثر يوم نشاطًا',
      current_range_note: 'يعرض هذا التقرير بيانات الفترة المحددة بالإضافة إلى حالة الطاولات الحالية.',
      top_capacity: 'أكثر سعة شيوعًا',
      report_preview_note: 'التقرير المصدّر يتضمن اسم المطعم وتاريخ الإنشاء واللغة المحددة.',
      request_summary: 'ملخص الطلبات',
      operational_takeaways: 'أهم الملاحظات',
      immediate_read: 'قراءة سريعة',
      low_data_note: 'قد تكون بعض المؤشرات تقريبية بسبب الاعتماد على الجداول الحالية فقط.',
      view: 'عرض',
      min: 'د',
      h: 'س',
      hour: 'ساعة',
      day: 'يوم',
      yes: 'نعم',
      no: 'لا',
      notified: 'تم الإشعار',
      not_notified: 'لم يتم الإشعار'
    },
    en: {
      reports_title: 'Restaurant Reports',
      reports_subtitle: 'End-of-day analysis for requests, tables, peak hours, assignments, and export tools.',
      loading: 'Preparing reports...',
      load_error: 'Unable to open reports',
      unexpected_error: 'An unexpected error occurred',
      no_permission: 'You do not have permission to view reports.',
      loading_indicators: 'Loading report data',
      unable_load_data: 'Unable to load data',
      refresh_now: 'Refresh Now',
      report_range: 'Report Range',
      today: 'Today',
      last7: 'Last 7 Days',
      last30: 'Last 30 Days',
      report_generated: 'Last Update',
      business_label: 'Business',
      current_lang: 'Display Language',
      summary: 'Request Summary',
      waiting_analysis: 'Wait Time Analysis',
      customer_sources: 'Customer Sources',
      peak_hours: 'Peak Hours',
      table_utilization: 'Table Utilization',
      assignments_whatsapp: 'Assignments & WhatsApp',
      zones_floors: 'Zones & Floors',
      export_reports: 'Export Reports',
      current_status: 'Current Operating Status',
      stable: 'Stable',
      under_watch: 'Under Watch',
      high_pressure: 'High Pressure',
      total_requests: 'Total Requests',
      active_requests: 'Active Requests',
      loss_requests: 'Lost Requests',
      conversion_rate: 'Conversion Rate',
      avg_wait_current: 'Current Avg Wait',
      avg_wait_assigned: 'Avg Time To Assignment',
      avg_wait_expired: 'Avg Expired Wait',
      longest_wait: 'Longest Wait',
      above_15: 'Over 15 Minutes',
      current_waiting: 'Current Waiting',
      assigned_waiting: 'Assigned Requests',
      expired_waiting: 'Expired Requests',
      distribution: 'Distribution',
      by_status: 'By Status',
      by_source: 'By Source',
      requests_flow: 'Request Flow',
      requests_count: 'Request Count',
      requests_created: 'Requests Created',
      waiting: 'Waiting',
      offered: 'Ready/Assigned',
      reserved: 'Reserved',
      occupied: 'Occupied',
      completed: 'Completed',
      cleaning: 'Cleaning',
      cancelled: 'Cancelled',
      expired: 'Expired',
      no_show: 'No Show',
      available: 'Available',
      disabled: 'Disabled',
      pending: 'Pending',
      walk_in: 'Local',
      online: 'Online',
      restored: 'Restored',
      other_source: 'Unclassified',
      requests: 'requests',
      customers: 'customers',
      count: 'Count',
      percent: 'Percent',
      lost: 'Lost',
      served_or_active: 'Served / Active',
      source_breakdown: 'Source Breakdown',
      top_source: 'Top Source',
      best_conversion: 'Best Conversion',
      highest_loss: 'Highest Loss',
      peak_requests_hour: 'Peak Request Hour',
      peak_assignments_hour: 'Peak Assignment Hour',
      quiet_hour: 'Quietest Hour',
      by_hour: 'By Hour',
      by_day: 'By Day',
      request_peak_chart: 'Requests by Hour',
      assignment_peak_chart: 'Assignments by Hour',
      current_tables: 'Current Table Status',
      usable_tables: 'Usable Tables',
      utilization: 'Current Utilization',
      busy_rate: 'Current Busy Rate',
      capacity_mix: 'Capacity Mix',
      tables_by_zone: 'Tables by Zone',
      tables_by_floor: 'Tables by Floor',
      most_active_tables: 'Most Active Tables',
      assignments_total: 'Total Assignments',
      assignment_rate: 'Assignment Rate',
      avg_to_assignment: 'Avg To Assignment',
      whatsapp_sent: 'WhatsApp Sent',
      whatsapp_not_sent: 'WhatsApp Not Sent',
      active_holds: 'Active Holds',
      expiring_holds: 'Expiring Soon',
      assignments_over_time: 'Assignments Over Time',
      whatsapp_summary: 'Notification Summary',
      zones_summary: 'Zone Summary',
      floors_summary: 'Floor Summary',
      zone: 'Zone',
      floor: 'Floor',
      tables: 'Tables',
      requests_today: 'Requests In Range',
      available_tables: 'Available Tables',
      occupied_tables: 'Occupied Tables',
      waiting_now: 'Waiting Now',
      avg_wait: 'Avg Wait',
      export_title: 'Export & Share Report',
      export_sub: 'Create a professional version ready for print, sharing, or download.',
      export_lang: 'Export Language',
      export_ar: 'Arabic',
      export_en: 'English',
      print_pdf: 'Print / PDF',
      download_html: 'Download HTML',
      download_csv: 'Download CSV',
      share_report: 'Share Report',
      email_report: 'Send Email',
      whatsapp_share: 'Share WhatsApp',
      copy_summary: 'Copy Summary',
      social_share: 'Social Share',
      share_x: 'X',
      share_fb: 'Facebook',
      export_preview: 'Report Preview',
      generated_on: 'Generated On',
      no_data: 'Not enough data',
      no_requests: 'No requests in the selected range',
      no_tables: 'No sufficient table data',
      no_assignments: 'No assignments in the selected range',
      no_zones: 'No sufficient zone/floor data',
      copied: 'Summary copied',
      shared_not_supported: 'Direct sharing is not supported on this device. The summary was copied to the clipboard.',
      email_subject: 'EASY-Q Report',
      time_to_assignment: 'Time To Assignment',
      expired_wait_time: 'Expired Request Time',
      current_wait_time: 'Current Wait Time',
      bucket_0_5: '0-5 min',
      bucket_6_10: '6-10 min',
      bucket_11_15: '11-15 min',
      bucket_16_20: '16-20 min',
      bucket_21_plus: '21+ min',
      party_distribution: 'Party Size Distribution',
      top_zones: 'Top Demand Zones',
      top_floors: 'Top Active Floors',
      report_ready: 'Report Ready',
      live_snapshot: 'Live Snapshot',
      period_analysis: 'Period Analysis',
      current_wait_alert: 'Guests Over 15 Minutes',
      source: 'Source',
      details: 'Details',
      status: 'Status',
      value: 'Value',
      note: 'Note',
      generated_report_name: 'Restaurant Report',
      best_hour: 'Best Hour',
      top_day: 'Top Day',
      current_range_note: 'This report shows selected-range data plus the current table snapshot.',
      top_capacity: 'Most Common Capacity',
      report_preview_note: 'The exported report includes the restaurant name, generation date, and selected language.',
      request_summary: 'Request Summary',
      operational_takeaways: 'Key Takeaways',
      immediate_read: 'Quick Read',
      low_data_note: 'Some indicators may be approximate because they rely only on the current available tables.',
      view: 'View',
      min: 'min',
      h: 'h',
      hour: 'hour',
      day: 'day',
      yes: 'Yes',
      no: 'No',
      notified: 'Notified',
      not_notified: 'Not Notified'
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
    const tt = n(total);
    if (!tt) return 0;
    return Math.max(0, Math.min(100, Math.round((p / tt) * 100)));
  }

  function average(list) {
    if (!Array.isArray(list) || !list.length) return 0;
    return Math.round(list.reduce((sum, item) => sum + n(item), 0) / list.length);
  }

  function fmtMinutes(mins, forcedLang) {
    const m = Math.max(0, Math.round(n(mins)));
    const l = forcedLang || lang();
    if (l === 'ar') {
      if (m < 60) return `${m} ${t('min', 'ar')}`;
      const h = Math.floor(m / 60);
      const r = m % 60;
      return r ? `${h}${t('h', 'ar')} ${r}${t('min', 'ar')}` : `${h}${t('h', 'ar')}`;
    }
    if (m < 60) return `${m} ${t('min', 'en')}`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}${t('h', 'en')} ${r}${t('min', 'en')}` : `${h}${t('h', 'en')}`;
  }

  function fmtDateTime(value, forcedLang) {
    if (!value) return '—';
    const locale = (forcedLang || lang()) === 'ar' ? 'ar-SA' : 'en-US';
    try {
      return new Date(value).toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return '—';
    }
  }

  function fmtDate(value, forcedLang) {
    if (!value) return '—';
    const locale = (forcedLang || lang()) === 'ar' ? 'ar-SA' : 'en-US';
    try {
      return new Date(value).toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (_) {
      return '—';
    }
  }

  function fmtHourLabel(hour, forcedLang) {
    const l = forcedLang || lang();
    if (l === 'ar') return `${hour}:00`;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${suffix}`;
  }

  function fileSafeName(value) {
    return String(value || 'report').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
  }

  function rangeStartEnd(rangeKey) {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    if (rangeKey === 'last30') {
      start.setDate(now.getDate() - 29);
    } else if (rangeKey === 'last7') {
      start.setDate(now.getDate() - 6);
    } else {
      start.setHours(0, 0, 0, 0);
    }
    if (rangeKey !== 'today') start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  function minutesBetween(start, end) {
    if (!start) return 0;
    const a = new Date(start).getTime();
    const b = end ? new Date(end).getTime() : Date.now();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
    return Math.floor((b - a) / 60000);
  }

  function requestDoneAt(req) {
    return req?.offered_at || req?.seated_at || req?.completed_at || req?.cancelled_at || req?.expired_at || req?.updated_at || null;
  }

  function requestStatusLabel(status, forcedLang) {
    const map = {
      waiting: t('waiting', forcedLang),
      offered: t('offered', forcedLang),
      reserved: t('reserved', forcedLang),
      occupied: t('occupied', forcedLang),
      completed: t('completed', forcedLang),
      cleaning: t('cleaning', forcedLang),
      cancelled: t('cancelled', forcedLang),
      expired: t('expired', forcedLang),
      no_show: t('no_show', forcedLang),
      available: t('available', forcedLang),
      disabled: t('disabled', forcedLang),
      pending: t('pending', forcedLang)
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

  function getRequestSource(req) {
    return req?.request_source || req?.source || req?.source_type || '';
  }

  function normalizeSource(source) {
    if (source === 'walk_in') return 'walk_in';
    if (source === 'web_booking' || source === 'booking_page' || source === 'online' || source === 'qr_code') return 'online';
    if (source === 'restored') return 'restored';
    return 'other';
  }

  function sourceLabelKey(normalized) {
    if (normalized === 'walk_in') return 'walk_in';
    if (normalized === 'online') return 'online';
    if (normalized === 'restored') return 'restored';
    return 'other_source';
  }

  function getBusinessId() {
    return window.currentUser?.business_id || window.BUSINESS_ID || null;
  }

  function getBusinessProfile() {
    return window.currentBusinessProfile || window.currentBusiness || null;
  }

  function getActiveTablesFromMemory() {
    return Array.isArray(window.floorData) ? window.floorData : [];
  }

  function getWaitingRows() {
    const rows = Array.isArray(window.waitingData) ? window.waitingData : [];
    return rows.filter((r) => r.status === 'waiting' || r.status === 'offered');
  }

  function getExpiredRows() {
    return Array.isArray(window.expiredData) ? window.expiredData : [];
  }

  function canOpenReports() {
    if (!window.currentUser) return false;
    if (window.currentUser.role === 'super_admin') return false;
    if (typeof window.canDo !== 'function') return true;
    return window.canDo('view_reports') || window.canDo('manage_queue') || window.canDo('assign_tables') || window.canDo('manage_tables');
  }

  function ensureStyles() {
    if ($('eqRestaurantReportsStyles')) return;

    const style = document.createElement('style');
    style.id = 'eqRestaurantReportsStyles';
    style.textContent = `
      .eqrr-page {
        font-family: inherit;
        color: #111827;
        padding: 18px;
        background: #F5F7FF;
        min-height: calc(100vh - 120px);
      }
      .eqrr-page[dir="rtl"] { direction: rtl; text-align: right; }
      .eqrr-page[dir="ltr"] { direction: ltr; text-align: left; }
      .eqrr-hero {
        background: linear-gradient(135deg, #070219 0%, #060427 52%, #0E146D 100%);
        color: #FFF;
        border-radius: 24px;
        padding: 20px;
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
        gap: 18px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
        overflow: hidden;
        position: relative;
      }
      .eqrr-hero::after {
        content: '';
        position: absolute;
        width: 260px;
        height: 260px;
        border-radius: 50%;
        inset-inline-end: -90px;
        top: -110px;
        background: rgba(221,231,255,.11);
        pointer-events: none;
      }
      .eqrr-hero h2 { margin: 0 0 8px; font-size: 24px; font-weight: 1000; letter-spacing: -.4px; }
      .eqrr-hero p { margin: 0; color: rgba(255,255,255,.76); font-size: 13px; font-weight: 700; line-height: 1.8; }
      .eqrr-hero-actions, .eqrr-chip-row, .eqrr-tab-row { display: flex; gap: 10px; flex-wrap: wrap; }
      .eqrr-hero-actions { margin-top: 16px; }
      .eqrr-btn, .eqrr-chip, .eqrr-tab, .eqrr-mini-btn {
        border: none; min-height: 40px; padding: 0 14px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-weight: 1000; font-size: 12px; transition: transform .16s ease, opacity .16s ease, background .16s ease;
      }
      .eqrr-btn:hover, .eqrr-chip:hover, .eqrr-tab:hover, .eqrr-mini-btn:hover { transform: translateY(-1px); }
      .eqrr-btn.primary { background: #FFFFFF; color: #0E146D; }
      .eqrr-btn.ghost { background: rgba(255,255,255,.12); color: #FFF; border: 1px solid rgba(255,255,255,.16); }
      .eqrr-mini-btn { min-height: 34px; padding: 0 12px; background: #EEF2FF; color: #0E146D; }
      .eqrr-mini-btn.active { background: #0E146D; color: #FFF; }
      .eqrr-health-card { background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.14); border-radius: 20px; padding: 15px; position: relative; z-index: 1; }
      .eqrr-health-title { font-size: 13px; color: rgba(255,255,255,.75); font-weight: 900; margin-bottom: 8px; }
      .eqrr-health-value { display: flex; align-items: center; gap: 10px; font-size: 28px; font-weight: 1000; }
      .eqrr-health-dot { width: 13px; height: 13px; border-radius: 50%; background: #10B981; box-shadow: 0 0 0 7px rgba(16,185,129,.14); }
      .eqrr-health-dot.warn { background: #F59E0B; box-shadow: 0 0 0 7px rgba(245,158,11,.14); }
      .eqrr-health-dot.bad { background: #EF4444; box-shadow: 0 0 0 7px rgba(239,68,68,.14); }
      .eqrr-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-top: 14px; }
      .eqrr-chip-row { gap: 8px; }
      .eqrr-chip {
        border: 1px solid #E5E7EB; background: #FFF; color: #64748B; min-height: 36px; padding: 0 14px; border-radius: 999px;
      }
      .eqrr-chip.active { background: #0E146D; border-color: #0E146D; color: #FFF; }
      .eqrr-tab-row { margin-top: 14px; gap: 8px; }
      .eqrr-tab { border: 1px solid #E5E7EB; background: #FFF; color: #64748B; min-height: 38px; border-radius: 999px; }
      .eqrr-tab.active { background: #0E146D; color: #FFF; border-color: #0E146D; }
      .eqrr-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-top: 14px; }
      .eqrr-card { background: #FFF; border: 1px solid #E5E7EB; border-radius: 20px; padding: 15px; box-shadow: 0 10px 26px rgba(15,23,42,.055); min-width: 0; }
      .eqrr-card.soft { background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%); }
      .eqrr-card.wide { grid-column: span 2; }
      .eqrr-card.full { grid-column: 1 / -1; }
      .eqrr-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
      .eqrr-card-title { font-size: 13px; font-weight: 1000; color: #111827; display: flex; align-items: center; gap: 8px; }
      .eqrr-card-title i { color: #0E146D; }
      .eqrr-card-sub { font-size: 11px; color: #64748B; font-weight: 800; margin-top: 4px; line-height: 1.6; }
      .eqrr-kpi-value { font-size: 30px; font-weight: 1000; color: #0F172A; line-height: 1; }
      .eqrr-kpi-label { margin-top: 8px; font-size: 12px; color: #64748B; font-weight: 800; line-height: 1.6; }
      .eqrr-mini-row { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin-top: 10px; }
      .eqrr-mini-stat { background: #F8FAFC; border: 1px solid #EEF2F7; border-radius: 15px; padding: 10px; }
      .eqrr-mini-num { font-size: 20px; font-weight: 1000; color: #111827; }
      .eqrr-mini-label { font-size: 11px; font-weight: 800; color: #64748B; margin-top: 3px; line-height: 1.5; }
      .eqrr-progress { height: 9px; border-radius: 999px; background: #EEF2FF; overflow: hidden; margin-top: 12px; }
      .eqrr-progress > span { display: block; height: 100%; width: 0%; background: linear-gradient(90deg, #0E146D, #3B82F6); border-radius: inherit; }
      .eqrr-list { display: flex; flex-direction: column; gap: 9px; }
      .eqrr-list-item { display: grid; grid-template-columns: 38px minmax(0,1fr) auto; gap: 10px; align-items: center; padding: 10px; background: #F8FAFC; border: 1px solid #EEF2F7; border-radius: 16px; }
      .eqrr-icon-box { width: 38px; height: 38px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; background: #EEF2FF; color: #0E146D; flex-shrink: 0; }
      .eqrr-list-title { font-size: 12.5px; font-weight: 1000; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .eqrr-list-sub { font-size: 11px; font-weight: 800; color: #64748B; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .eqrr-badge { min-height: 25px; padding: 0 9px; border-radius: 999px; font-size: 11px; font-weight: 1000; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; }
      .eqrr-badge.ok { background: #ECFDF5; color: #047857; }
      .eqrr-badge.warn { background: #FFFBEB; color: #B45309; }
      .eqrr-badge.bad { background: #FEF2F2; color: #B91C1C; }
      .eqrr-badge.info { background: #EFF6FF; color: #1D4ED8; }
      .eqrr-badge.wait { background: #EEF2FF; color: #0E146D; }
      .eqrr-badge.muted { background: #F3F4F6; color: #6B7280; }
      .eqrr-table-wrap { overflow: auto; border: 1px solid #EEF2F7; border-radius: 16px; }
      .eqrr-table { width: 100%; border-collapse: collapse; min-width: 760px; }
      .eqrr-table th, .eqrr-table td { padding: 12px; border-bottom: 1px solid #EEF2F7; text-align: start; font-size: 12px; font-weight: 800; }
      .eqrr-table th { background: #F8FAFC; color: #64748B; font-weight: 1000; position: sticky; top: 0; }
      .eqrr-table tr:last-child td { border-bottom: none; }
      .eqrr-empty { padding: 20px; text-align: center; color: #64748B; font-weight: 900; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; }
      .eqrr-loader { min-height: 260px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: #64748B; font-weight: 1000; }
      .eqrr-spinner { width: 34px; height: 34px; border-radius: 50%; border: 4px solid rgba(14,20,109,.13); border-top-color: #0E146D; animation: eqrrSpin .8s linear infinite; }
      .eqrr-alert { display: flex; align-items: flex-start; gap: 10px; padding: 11px; border-radius: 16px; border: 1px solid #EEF2F7; background: #FFF; }
      .eqrr-alert.warn { background: #FFFBEB; border-color: #FDE68A; }
      .eqrr-alert.bad { background: #FEF2F2; border-color: #FECACA; }
      .eqrr-alert.ok { background: #ECFDF5; border-color: #A7F3D0; }
      .eqrr-split { display: grid; grid-template-columns: 1.2fr .8fr; gap: 12px; }
      .eqrr-bars { display: flex; flex-direction: column; gap: 8px; }
      .eqrr-bar-row { display: grid; grid-template-columns: 110px minmax(0,1fr) 54px; gap: 10px; align-items: center; font-size: 11px; font-weight: 900; color: #475569; }
      .eqrr-bar-track { width: 100%; height: 10px; border-radius: 999px; background: #EDF2FF; overflow: hidden; }
      .eqrr-bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg,#0E146D,#60A5FA); }
      .eqrr-chart { width: 100%; background: linear-gradient(180deg, #FCFDFF 0%, #F6F8FF 100%); border: 1px solid #EEF2F7; border-radius: 18px; padding: 10px; }
      .eqrr-chart svg { width: 100%; height: 220px; overflow: visible; }
      .eqrr-chart-labels { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; color: #64748B; font-weight: 900; margin-top: 8px; }
      .eqrr-note { font-size: 11px; color: #64748B; font-weight: 800; line-height: 1.6; }
      .eqrr-export-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .eqrr-export-preview { border: 1px solid #E5E7EB; border-radius: 18px; background: #FFF; padding: 16px; max-height: 500px; overflow: auto; }
      .eqrr-report-preview-page { background: #FFF; color: #111827; }
      .eqrr-report-preview-page h2, .eqrr-report-preview-page h3 { margin: 0; }
      .eqrr-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 24px; padding: 0 10px; border-radius: 999px; font-size: 10px; font-weight: 1000; background: #EEF2FF; color: #0E146D; }
      @keyframes eqrrSpin { to { transform: rotate(360deg);} }
      @media (max-width: 1180px) {
        .eqrr-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .eqrr-hero, .eqrr-split { grid-template-columns: 1fr; }
      }
      @media (max-width: 720px) {
        .eqrr-page { padding: 12px; }
        .eqrr-grid { grid-template-columns: 1fr; }
        .eqrr-card.wide { grid-column: span 1; }
        .eqrr-hero h2 { font-size: 20px; }
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
    let fallback = $('eqrrFallbackPanel');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'eqrrFallbackPanel';
      fallback.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#F5F7FF;overflow:auto;';
      document.body.appendChild(fallback);
    }
    fallback.innerHTML = `<div style="padding:14px;background:#070219;color:white;display:flex;justify-content:space-between;align-items:center;gap:12px;"><div><div style="font-weight:1000;font-size:18px;">${esc(title)}</div><div style="font-weight:700;font-size:12px;opacity:.72;margin-top:4px;">${esc(subtitle)}</div></div><button onclick="document.getElementById('eqrrFallbackPanel').remove()" style="width:38px;height:38px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:white;font-size:20px;cursor:pointer;">×</button></div>${bodyHtml}`;
  }

  function setActiveSidebar(view) {
    $$('.sidebar .sub-menu-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-view') === `reports-${view}`);
    });
    const parent = document.querySelector('.main-menu-item[data-menu="reports"]');
    if (parent) parent.classList.add('open', 'active');
    const submenu = document.querySelector('.sub-menu[data-submenu="reports"]');
    if (submenu) submenu.classList.add('open');
  }

  function loadingHtml() {
    return `
      <div class="eqrr-page" id="eqrrReports" dir="${lang() === 'ar' ? 'rtl' : 'ltr'}">
        <div class="eqrr-loader">
          <div class="eqrr-spinner"></div>
          <div>${esc(t('loading'))}</div>
        </div>
      </div>
    `;
  }

  function errorHtml(message) {
    return `
      <div class="eqrr-page" id="eqrrReports" dir="${lang() === 'ar' ? 'rtl' : 'ltr'}">
        <div class="eqrr-card full">
          <div class="eqrr-alert bad">
            <i class="fas fa-triangle-exclamation"></i>
            <div>
              <div class="eqrr-list-title">${esc(t('load_error'))}</div>
              <div class="eqrr-list-sub" style="white-space:normal;line-height:1.6;">${esc(message)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function safeQuery(fn, fallback) {
    try {
      return await fn();
    } catch (err) {
      console.warn('[EASY-Q Reports] query failed:', err);
      return fallback;
    }
  }

  async function loadReportData() {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('No business_id available for current user');

    const profile = getBusinessProfile();
    const { start, end } = rangeStartEnd(EQR.range);
    const fromIso = start.toISOString();
    const toIso = end.toISOString();

    const memoryTables = getActiveTablesFromMemory();
    const memoryTableIds = memoryTables.map((t) => t.id).filter(Boolean);

    const businessPromise = safeQuery(async () => {
      if (profile) return profile;
      const { data, error } = await window.supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }, profile || null);

    const requestsPromise = safeQuery(async () => {
      const { data, error } = await window.supabase
        .from('table_requests')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .order('created_at', { ascending: true })
        .limit(5000);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }, []);

    const assignmentsPromise = safeQuery(async () => {
      const { data, error } = await window.supabase
        .from('table_assignments')
        .select('*')
        .eq('business_id', businessId)
        .gte('assigned_at', fromIso)
        .lte('assigned_at', toIso)
        .order('assigned_at', { ascending: true })
        .limit(5000);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }, []);

    const tablesPromise = safeQuery(async () => {
      if (memoryTables.length) return memoryTables;
      const { data, error } = await window.supabase
        .from('dining_tables')
        .select('*')
        .eq('business_id', businessId)
        .order('table_name', { ascending: true })
        .limit(2000);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }, memoryTables);

    const statusLogsPromise = safeQuery(async () => {
      const tableIds = memoryTableIds.length ? memoryTableIds : [];
      if (!tableIds.length) return [];
      const { data, error } = await window.supabase
        .from('table_status_logs')
        .select('*')
        .in('table_id', tableIds)
        .gte('changed_at', fromIso)
        .lte('changed_at', toIso)
        .order('changed_at', { ascending: true })
        .limit(10000);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }, []);

    const [business, requests, assignments, tables, statusLogs] = await Promise.all([
      businessPromise,
      requestsPromise,
      assignmentsPromise,
      tablesPromise,
      statusLogsPromise
    ]);

    const waitingNow = getWaitingRows();
    const expiredNow = getExpiredRows();

    const result = buildReportModel({ business, requests, assignments, tables, statusLogs, waitingNow, expiredNow, rangeStart: start, rangeEnd: end });
    EQR.loadedAt = new Date();
    EQR.lastData = result;
    return result;
  }

  function buildReportModel(input) {
    const business = input.business || {};
    const requests = Array.isArray(input.requests) ? input.requests : [];
    const assignments = Array.isArray(input.assignments) ? input.assignments : [];
    const tables = Array.isArray(input.tables) ? input.tables : [];
    const statusLogs = Array.isArray(input.statusLogs) ? input.statusLogs : [];
    const waitingNow = Array.isArray(input.waitingNow) ? input.waitingNow : [];
    const expiredNow = Array.isArray(input.expiredNow) ? input.expiredNow : [];

    const requestMap = new Map(requests.map((r) => [r.id, r]));
    const waitingOnly = waitingNow.filter((r) => r.status === 'waiting');
    const offeredNow = waitingNow.filter((r) => r.status === 'offered');

    const statusCounts = {
      total: requests.length,
      waiting: requests.filter((r) => r.status === 'waiting').length,
      offered: requests.filter((r) => r.status === 'offered' || r.status === 'reserved').length,
      occupied: requests.filter((r) => r.status === 'occupied').length,
      completed: requests.filter((r) => r.status === 'completed' || r.status === 'cleaning').length,
      cancelled: requests.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length,
      expired: requests.filter((r) => r.status === 'expired').length
    };

    statusCounts.active = statusCounts.waiting + statusCounts.offered + statusCounts.occupied;
    statusCounts.loss = statusCounts.cancelled + statusCounts.expired;
    statusCounts.servedOrActive = statusCounts.completed + statusCounts.occupied + statusCounts.offered;
    statusCounts.conversion = pct(statusCounts.servedOrActive, statusCounts.total);

    const sourceSeed = {
      walk_in: { key: 'walk_in', count: 0, active: 0, loss: 0 },
      online: { key: 'online', count: 0, active: 0, loss: 0 },
      restored: { key: 'restored', count: 0, active: 0, loss: 0 },
      other: { key: 'other', count: 0, active: 0, loss: 0 }
    };

    requests.forEach((req) => {
      const key = normalizeSource(getRequestSource(req));
      if (!sourceSeed[key]) sourceSeed[key] = { key, count: 0, active: 0, loss: 0 };
      sourceSeed[key].count += 1;
      if (['offered', 'reserved', 'occupied', 'completed', 'cleaning'].includes(req.status)) sourceSeed[key].active += 1;
      if (['cancelled', 'expired', 'no_show'].includes(req.status)) sourceSeed[key].loss += 1;
    });

    const sourceStats = Object.values(sourceSeed).map((row) => ({
      ...row,
      percent: pct(row.count, requests.length),
      conversion: pct(row.active, row.count),
      lossRate: pct(row.loss, row.count)
    })).sort((a, b) => b.count - a.count);

    const assignmentDelays = assignments
      .map((a) => {
        const req = requestMap.get(a.request_id);
        if (!req || !req.created_at || !a.assigned_at) return null;
        return minutesBetween(req.created_at, a.assigned_at);
      })
      .filter((v) => Number.isFinite(v) && v >= 0);

    const expiredWaits = requests
      .filter((r) => r.created_at && r.expired_at)
      .map((r) => minutesBetween(r.created_at, r.expired_at))
      .filter((v) => Number.isFinite(v) && v >= 0);

    const currentWaits = waitingOnly.map((r) => minutesBetween(r.created_at));

    const waitingAnalysis = {
      currentAvg: average(currentWaits),
      currentLongest: currentWaits.length ? Math.max(...currentWaits) : 0,
      currentOver15: currentWaits.filter((v) => v >= 15).length,
      assignedAvg: average(assignmentDelays),
      expiredAvg: average(expiredWaits),
      buckets: buildBuckets(assignmentDelays),
      currentCount: waitingOnly.length,
      assignedCount: assignments.length,
      expiredCount: expiredWaits.length
    };

    const hourlyRequests = buildHourlySeries(requests, 'created_at');
    const hourlyAssignments = buildHourlySeries(assignments, 'assigned_at');
    const dailyRequests = buildDailySeries(requests, 'created_at');

    const peak = {
      requestsHour: getTopSeriesPoint(hourlyRequests),
      assignmentsHour: getTopSeriesPoint(hourlyAssignments),
      quietHour: getQuietSeriesPoint(hourlyRequests),
      hourlyRequests,
      hourlyAssignments,
      dailyRequests,
      topDay: getTopDay(dailyRequests)
    };

    const tableCounts = {
      total: tables.length,
      available: tables.filter((t) => (t.status || 'available') === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
      disabled: tables.filter((t) => t.status === 'disabled').length,
      pending: tables.filter((t) => t.status === 'pending').length
    };
    tableCounts.usable = Math.max(0, tableCounts.total - tableCounts.disabled);
    tableCounts.busy = tableCounts.occupied + tableCounts.reserved + tableCounts.cleaning + tableCounts.pending;
    tableCounts.utilization = pct(tableCounts.occupied, tableCounts.usable);
    tableCounts.busyRate = pct(tableCounts.busy, tableCounts.usable);

    const capacityMap = {};
    tables.forEach((table) => {
      const cap = n(table.capacity) || 0;
      const key = cap ? String(cap) : '0';
      if (!capacityMap[key]) capacityMap[key] = 0;
      capacityMap[key] += 1;
    });
    const capacityMix = Object.entries(capacityMap)
      .map(([capacity, count]) => ({ label: capacity === '0' ? 'N/A' : capacity, count }))
      .sort((a, b) => Number(a.label) - Number(b.label));

    const zoneMap = {};
    function ensureZone(zone) {
      const key = zone || 'General';
      if (!zoneMap[key]) {
        zoneMap[key] = { zone: key, requests: 0, waiting: 0, available: 0, occupied: 0, tables: 0, avgWaitSamples: [] };
      }
      return zoneMap[key];
    }
    tables.forEach((table) => {
      const row = ensureZone(table.zone_name || 'General');
      row.tables += 1;
      if ((table.status || 'available') === 'available') row.available += 1;
      if (table.status === 'occupied') row.occupied += 1;
    });
    requests.forEach((req) => {
      const row = ensureZone(req.zone_name || 'General');
      row.requests += 1;
      const matchedAssign = assignments.find((a) => a.request_id === req.id && a.assigned_at);
      if (matchedAssign && req.created_at) row.avgWaitSamples.push(minutesBetween(req.created_at, matchedAssign.assigned_at));
    });
    waitingNow.forEach((req) => {
      const row = ensureZone(req.zone_name || 'General');
      row.waiting += 1;
    });
    const zones = Object.values(zoneMap).map((row) => ({
      ...row,
      avgWait: average(row.avgWaitSamples),
      utilization: pct(row.occupied, row.tables)
    })).sort((a, b) => b.requests - a.requests);

    const floorMap = {};
    function ensureFloor(floor) {
      const key = String(floor || '1');
      if (!floorMap[key]) floorMap[key] = { floor: key, tables: 0, available: 0, occupied: 0, reserved: 0, cleaning: 0, disabled: 0 };
      return floorMap[key];
    }
    tables.forEach((table) => {
      const row = ensureFloor(table.floor_number || 1);
      row.tables += 1;
      if ((table.status || 'available') === 'available') row.available += 1;
      if (table.status === 'occupied') row.occupied += 1;
      if (table.status === 'reserved') row.reserved += 1;
      if (table.status === 'cleaning') row.cleaning += 1;
      if (table.status === 'disabled') row.disabled += 1;
    });
    const floors = Object.values(floorMap).map((row) => ({
      ...row,
      utilization: pct(row.occupied, Math.max(1, row.tables - row.disabled))
    })).sort((a, b) => Number(a.floor) - Number(b.floor));

    const holdThresholdMins = Math.max(3, n(window.settings?.reservation_hold_minutes || 10));
    const nowTs = Date.now();
    const activeHolds = assignments.filter((a) => ['assigned', 'offered', 'reserved', 'active'].includes(String(a.status || '').toLowerCase()) || (!!a.hold_expires_at && new Date(a.hold_expires_at).getTime() > nowTs));
    const expiringSoon = activeHolds.filter((a) => a.hold_expires_at && minutesBetween(new Date().toISOString(), a.hold_expires_at) === 0 ? false : (new Date(a.hold_expires_at).getTime() - nowTs) <= holdThresholdMins * 60000 && new Date(a.hold_expires_at).getTime() > nowTs);

    const whatsappSent = assignments.filter((a) => !!a.whatsapp_notified).length;
    const whatsappNotSent = Math.max(0, assignments.length - whatsappSent);

    const tableLogCounts = {};
    statusLogs.forEach((log) => {
      if (!log.table_id) return;
      tableLogCounts[log.table_id] = (tableLogCounts[log.table_id] || 0) + 1;
    });
    const mostActiveTables = tables
      .map((table) => ({
        id: table.id,
        name: table.table_name || table.id,
        zone: table.zone_name || 'General',
        floor: table.floor_number || 1,
        changes: tableLogCounts[table.id] || 0,
        status: table.status || 'available'
      }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 8);

    const assignmentRate = pct(assignments.length, requests.length);
    const partyDist = buildPartyDistribution(requests);

    const health = buildHealth({ waitingAnalysis, statusCounts, tableCounts });
    const takeaways = buildTakeaways({ waitingAnalysis, sourceStats, peak, tableCounts, assignments, whatsappSent, zones });

    return {
      business,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      requests,
      assignments,
      tables,
      waitingNow,
      expiredNow,
      statusLogs,
      statusCounts,
      sourceStats,
      waitingAnalysis,
      peak,
      tableCounts,
      capacityMix,
      zones,
      floors,
      assignmentsReport: {
        total: assignments.length,
        assignmentRate,
        avgToAssignment: average(assignmentDelays),
        whatsappSent,
        whatsappNotSent,
        activeHolds: activeHolds.length,
        expiringSoon: expiringSoon.length,
        hourlyAssignments
      },
      mostActiveTables,
      partyDist,
      health,
      takeaways
    };
  }

  function buildBuckets(values) {
    const rows = [
      { key: 'bucket_0_5', min: 0, max: 5, count: 0 },
      { key: 'bucket_6_10', min: 6, max: 10, count: 0 },
      { key: 'bucket_11_15', min: 11, max: 15, count: 0 },
      { key: 'bucket_16_20', min: 16, max: 20, count: 0 },
      { key: 'bucket_21_plus', min: 21, max: Infinity, count: 0 }
    ];
    values.forEach((value) => {
      const row = rows.find((r) => value >= r.min && value <= r.max);
      if (row) row.count += 1;
    });
    return rows;
  }

  function buildHourlySeries(items, field) {
    const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 }));
    (items || []).forEach((item) => {
      const raw = item && item[field];
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      rows[d.getHours()].value += 1;
    });
    return rows;
  }

  function buildDailySeries(items, field) {
    const map = {};
    (items || []).forEach((item) => {
      const raw = item && item[field];
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
  }

  function getTopSeriesPoint(rows) {
    if (!rows.length) return { hour: 0, value: 0 };
    return rows.reduce((best, row) => row.value > best.value ? row : best, rows[0]);
  }

  function getQuietSeriesPoint(rows) {
    const positive = rows.filter((row) => row.value > 0);
    if (!positive.length) return { hour: 0, value: 0 };
    return positive.reduce((best, row) => row.value < best.value ? row : best, positive[0]);
  }

  function getTopDay(rows) {
    if (!rows.length) return null;
    return rows.reduce((best, row) => row.value > best.value ? row : best, rows[0]);
  }

  function buildPartyDistribution(requests) {
    const map = {};
    (requests || []).forEach((req) => {
      const size = n(req.requested_party_size) || 1;
      map[size] = (map[size] || 0) + 1;
    });
    return Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => Number(a.label) - Number(b.label));
  }

  function buildHealth({ waitingAnalysis, statusCounts, tableCounts }) {
    if (waitingAnalysis.currentOver15 > 0 || statusCounts.loss >= 5) {
      return { key: 'high_pressure', className: 'bad', textAr: 'يوجد فقد أو انتظار مرتفع يحتاج مراجعة.', textEn: 'There is significant loss or long waiting that requires review.' };
    }
    if (tableCounts.busyRate >= 80 || waitingAnalysis.currentCount > 0) {
      return { key: 'under_watch', className: 'warn', textAr: 'المطعم يعمل بشكل جيد لكن توجد مؤشرات تستحق المتابعة.', textEn: 'Operations are good, but some indicators require monitoring.' };
    }
    return { key: 'stable', className: 'ok', textAr: 'الوضع مستقر ومؤشرات التشغيل مطمئنة.', textEn: 'The operation looks stable and indicators are healthy.' };
  }

  function buildTakeaways({ waitingAnalysis, sourceStats, peak, tableCounts, assignments, whatsappSent, zones }) {
    const out = [];
    const topSource = sourceStats[0];
    if (topSource && topSource.count > 0) {
      out.push({
        ar: `أعلى مصدر للعملاء هو ${t(sourceLabelKey(topSource.key), 'ar')} بنسبة ${topSource.percent}% من إجمالي الطلبات.`,
        en: `Top customer source is ${t(sourceLabelKey(topSource.key), 'en')} with ${topSource.percent}% of total requests.`
      });
    }
    if (waitingAnalysis.assignedAvg > 0) {
      out.push({
        ar: `متوسط الوصول إلى التعيين خلال الفترة هو ${fmtMinutes(waitingAnalysis.assignedAvg, 'ar')}.`,
        en: `Average time to assignment during the period is ${fmtMinutes(waitingAnalysis.assignedAvg, 'en')}.`
      });
    }
    if (peak.requestsHour && peak.requestsHour.value > 0) {
      out.push({
        ar: `ذروة الطلبات كانت عند ${fmtHourLabel(peak.requestsHour.hour, 'ar')} بعدد ${peak.requestsHour.value} طلب.`,
        en: `Peak request hour was ${fmtHourLabel(peak.requestsHour.hour, 'en')} with ${peak.requestsHour.value} requests.`
      });
    }
    if (assignments.length > 0) {
      out.push({
        ar: `تم إرسال واتساب لـ ${whatsappSent} من أصل ${assignments.length} تعيين (${pct(whatsappSent, assignments.length)}%).`,
        en: `WhatsApp notifications were sent for ${whatsappSent} out of ${assignments.length} assignments (${pct(whatsappSent, assignments.length)}%).`
      });
    }
    if (zones[0] && zones[0].requests > 0) {
      out.push({
        ar: `أكثر منطقة طلبًا هي ${zones[0].zone} بعدد ${zones[0].requests} طلب.`,
        en: `Top demand zone is ${zones[0].zone} with ${zones[0].requests} requests.`
      });
    }
    out.push({
      ar: `نسبة إشغال الطاولات الحالية ${tableCounts.utilization}%، والانشغال الكلي الحالي ${tableCounts.busyRate}%.`,
      en: `Current occupied-table utilization is ${tableCounts.utilization}%, while overall current busy rate is ${tableCounts.busyRate}%.`
    });
    return out.slice(0, 6);
  }

  function renderReports(data, view) {
    const title = t('reports_title');
    const subtitle = t('reports_subtitle');
    const dir = lang() === 'ar' ? 'rtl' : 'ltr';
    const body = `
      <div class="eqrr-page" id="eqrrReports" data-view="${esc(view)}" dir="${dir}">
        ${heroHtml(data)}
        ${toolbarHtml(data)}
        ${tabsHtml(view)}
        ${viewBodyHtml(data, view)}
      </div>
    `;
    openPanel(title, subtitle, body);
  }

  function heroHtml(data) {
    const healthLabel = t(data.health.key);
    const healthText = lang() === 'ar' ? data.health.textAr : data.health.textEn;
    const updated = EQR.loadedAt ? fmtDateTime(EQR.loadedAt) : '—';
    const businessName = data.business?.name || data.business?.business_name || data.business?.branch_name || 'EASY-Q';
    return `
      <section class="eqrr-hero">
        <div style="position:relative;z-index:1;">
          <h2>${esc(t('reports_title'))}</h2>
          <p>${esc(t('reports_subtitle'))}</p>
          <div class="eqrr-hero-actions">
            <button class="eqrr-btn primary" onclick="EQRestaurantReports.refresh()"><i class="fas fa-sync-alt"></i>${esc(t('refresh_now'))}</button>
          </div>
          <div class="eqrr-chip-row" style="margin-top:12px;">
            <span class="eqrr-pill">${esc(t('business_label'))}: ${esc(businessName)}</span>
            <span class="eqrr-pill">${esc(t('report_generated'))}: ${esc(updated)}</span>
            <span class="eqrr-pill">${esc(t('report_range'))}: ${esc(rangeLabel(EQR.range))}</span>
          </div>
        </div>
        <div class="eqrr-health-card">
          <div class="eqrr-health-title">${esc(t('current_status'))}</div>
          <div class="eqrr-health-value">
            <span class="eqrr-health-dot ${esc(data.health.className)}"></span>
            <span>${esc(healthLabel)}</span>
          </div>
          <p style="margin-top:10px;">${esc(healthText)}</p>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <span class="eqrr-badge info">${esc(t('requests_today'))}: ${esc(data.statusCounts.total)}</span>
            <span class="eqrr-badge wait">${esc(t('current_wait_alert'))}: ${esc(data.waitingAnalysis.currentOver15)}</span>
          </div>
        </div>
      </section>
    `;
  }

  function rangeLabel(range) {
    if (range === 'last30') return t('last30');
    if (range === 'last7') return t('last7');
    return t('today');
  }

  function toolbarHtml(data) {
    return `
      <div class="eqrr-toolbar">
        <div>
          <div class="eqrr-card-sub" style="margin-bottom:8px;">${esc(t('report_range'))}</div>
          <div class="eqrr-chip-row">
            <button class="eqrr-chip ${EQR.range === 'today' ? 'active' : ''}" onclick="EQRestaurantReports.setRange('today')">${esc(t('today'))}</button>
            <button class="eqrr-chip ${EQR.range === 'last7' ? 'active' : ''}" onclick="EQRestaurantReports.setRange('last7')">${esc(t('last7'))}</button>
            <button class="eqrr-chip ${EQR.range === 'last30' ? 'active' : ''}" onclick="EQRestaurantReports.setRange('last30')">${esc(t('last30'))}</button>
          </div>
        </div>
        <div class="eqrr-note">${esc(t('current_range_note'))}</div>
      </div>
    `;
  }

  function tabsHtml(view) {
    const tabs = [
      ['summary', 'summary', 'fa-receipt'],
      ['waiting', 'waiting_analysis', 'fa-hourglass-half'],
      ['sources', 'customer_sources', 'fa-users-viewfinder'],
      ['peak', 'peak_hours', 'fa-chart-line'],
      ['tables', 'table_utilization', 'fa-chair'],
      ['assignments', 'assignments_whatsapp', 'fa-paper-plane'],
      ['zones', 'zones_floors', 'fa-map-location-dot'],
      ['export', 'export_reports', 'fa-download']
    ];
    return `<div class="eqrr-tab-row">${tabs.map(([key, labelKey, icon]) => `<button class="eqrr-tab ${view===key?'active':''}" onclick="EQRestaurantReports.setView('${key}')"><i class="fas ${icon}"></i>${esc(t(labelKey))}</button>`).join('')}</div>`;
  }

  function viewBodyHtml(data, view) {
    if (view === 'waiting') return waitingViewHtml(data);
    if (view === 'sources') return sourcesViewHtml(data);
    if (view === 'peak') return peakViewHtml(data);
    if (view === 'tables') return tablesViewHtml(data);
    if (view === 'assignments') return assignmentsViewHtml(data);
    if (view === 'zones') return zonesViewHtml(data);
    if (view === 'export') return exportViewHtml(data);
    return summaryViewHtml(data);
  }

  function kpiCard(icon, title, value, label, miniItems) {
    return `
      <div class="eqrr-card soft">
        <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas ${esc(icon)}"></i>${esc(title)}</div><div class="eqrr-card-sub">${esc(label)}</div></div></div>
        <div class="eqrr-kpi-value">${esc(value)}</div>
        <div class="eqrr-mini-row">
          ${(miniItems || []).map(([txt, num]) => `<div class="eqrr-mini-stat"><div class="eqrr-mini-num">${esc(num)}</div><div class="eqrr-mini-label">${esc(txt)}</div></div>`).join('')}
        </div>
      </div>
    `;
  }

  function progressCard(icon, title, value, label, percentValue) {
    return `
      <div class="eqrr-card soft">
        <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas ${esc(icon)}"></i>${esc(title)}</div><div class="eqrr-card-sub">${esc(label)}</div></div></div>
        <div class="eqrr-kpi-value">${esc(value)}</div>
        <div class="eqrr-progress"><span style="width:${pct(percentValue,100)}%"></span></div>
        <div class="eqrr-kpi-label">${pct(percentValue,100)}%</div>
      </div>
    `;
  }

  function summaryViewHtml(data) {
    return `
      <div class="eqrr-grid">
        ${kpiCard('fa-receipt', t('total_requests'), data.statusCounts.total, t('request_summary'), [[t('active_requests'), data.statusCounts.active], [t('loss_requests'), data.statusCounts.loss]])}
        ${kpiCard('fa-user-clock', t('avg_wait_assigned'), fmtMinutes(data.waitingAnalysis.assignedAvg), t('time_to_assignment'), [[t('avg_wait_current'), fmtMinutes(data.waitingAnalysis.currentAvg)], [t('longest_wait'), fmtMinutes(data.waitingAnalysis.currentLongest)]])}
        ${progressCard('fa-arrow-trend-up', t('conversion_rate'), `${data.statusCounts.conversion}%`, t('served_or_active'), data.statusCounts.conversion)}
        ${progressCard('fa-user-slash', t('loss_requests'), `${pct(data.statusCounts.loss, data.statusCounts.total)}%`, `${data.statusCounts.loss} ${t('requests')}`, pct(data.statusCounts.loss, data.statusCounts.total))}

        <div class="eqrr-card wide">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-stream"></i>${esc(t('requests_flow'))}</div><div class="eqrr-card-sub">${esc(t('by_status'))}</div></div></div>
          ${requestFlowHtml(data)}
        </div>

        <div class="eqrr-card wide">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-bullseye"></i>${esc(t('immediate_read'))}</div><div class="eqrr-card-sub">${esc(t('operational_takeaways'))}</div></div></div>
          ${takeawaysHtml(data.takeaways)}
        </div>

        <div class="eqrr-card full">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-chart-pie"></i>${esc(t('party_distribution'))}</div><div class="eqrr-card-sub">${esc(t('distribution'))}</div></div></div>
          ${barsHtml(data.partyDist.map((row) => ({ label: row.label, value: row.count })), '', 10)}
        </div>
      </div>
    `;
  }

  function requestFlowHtml(data) {
    const rows = [
      [t('waiting'), data.statusCounts.waiting],
      [t('offered'), data.statusCounts.offered],
      [t('occupied'), data.statusCounts.occupied],
      [t('completed'), data.statusCounts.completed],
      [t('cancelled'), data.statusCounts.cancelled],
      [t('expired'), data.statusCounts.expired]
    ];
    return barsHtml(rows.map(([label, value]) => ({ label, value })), t('requests'), 12);
  }

  function takeawaysHtml(rows) {
    if (!rows.length) return `<div class="eqrr-empty">${esc(t('no_data'))}</div>`;
    return `<div class="eqrr-list">${rows.map((row, idx) => `<div class="eqrr-list-item"><div class="eqrr-icon-box"><i class="fas fa-lightbulb"></i></div><div><div class="eqrr-list-title">${esc((lang()==='ar'?'ملاحظة':'Takeaway') + ' ' + (idx+1))}</div><div class="eqrr-list-sub" style="white-space:normal;line-height:1.6;">${esc(lang()==='ar'?row.ar:row.en)}</div></div><span class="eqrr-badge wait">${esc(t('report_ready'))}</span></div>`).join('')}</div>`;
  }

  function waitingViewHtml(data) {
    return `
      <div class="eqrr-grid">
        ${kpiCard('fa-hourglass-half', t('avg_wait_current'), fmtMinutes(data.waitingAnalysis.currentAvg), t('current_wait_time'), [[t('current_waiting'), data.waitingAnalysis.currentCount], [t('above_15'), data.waitingAnalysis.currentOver15]])}
        ${kpiCard('fa-user-check', t('avg_wait_assigned'), fmtMinutes(data.waitingAnalysis.assignedAvg), t('time_to_assignment'), [[t('assigned_waiting'), data.waitingAnalysis.assignedCount], [t('expired_waiting'), data.waitingAnalysis.expiredCount]])}
        ${kpiCard('fa-timer', t('avg_wait_expired'), fmtMinutes(data.waitingAnalysis.expiredAvg), t('expired_wait_time'), [[t('longest_wait'), fmtMinutes(data.waitingAnalysis.currentLongest)], [t('current_wait_alert'), data.waitingAnalysis.currentOver15]])}
        ${progressCard('fa-gauge-high', t('above_15'), `${pct(data.waitingAnalysis.currentOver15, Math.max(1, data.waitingAnalysis.currentCount))}%`, t('current_wait_alert'), pct(data.waitingAnalysis.currentOver15, Math.max(1, data.waitingAnalysis.currentCount)))}

        <div class="eqrr-card wide">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-layer-group"></i>${esc(t('distribution'))}</div><div class="eqrr-card-sub">${esc(t('time_to_assignment'))}</div></div></div>
          ${barsHtml(data.waitingAnalysis.buckets.map((row) => ({ label: t(row.key), value: row.count })), t('requests'), 12)}
        </div>

        <div class="eqrr-card wide">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-list-check"></i>${esc(t('by_status'))}</div><div class="eqrr-card-sub">${esc(t('request_summary'))}</div></div></div>
          ${waitingSummaryTable(data)}
        </div>

        <div class="eqrr-card full"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-circle-info"></i>${esc(t('low_data_note'))}</div></div></div><div class="eqrr-note">${esc(t('low_data_note'))}</div></div>
      </div>
    `;
  }

  function waitingSummaryTable(data) {
    const rows = [
      [t('current_waiting'), data.waitingAnalysis.currentCount, t('live_snapshot')],
      [t('assigned_waiting'), data.waitingAnalysis.assignedCount, t('period_analysis')],
      [t('expired_waiting'), data.waitingAnalysis.expiredCount, t('period_analysis')],
      [t('avg_wait_current'), fmtMinutes(data.waitingAnalysis.currentAvg), t('live_snapshot')],
      [t('avg_wait_assigned'), fmtMinutes(data.waitingAnalysis.assignedAvg), t('period_analysis')],
      [t('avg_wait_expired'), fmtMinutes(data.waitingAnalysis.expiredAvg), t('period_analysis')]
    ];
    return tableHtml([t('details'), t('value'), t('note')], rows);
  }

  function sourcesViewHtml(data) {
    const topSource = data.sourceStats[0] || null;
    const bestConversion = data.sourceStats.slice().sort((a, b) => b.conversion - a.conversion)[0] || null;
    const highestLoss = data.sourceStats.slice().sort((a, b) => b.lossRate - a.lossRate)[0] || null;
    return `
      <div class="eqrr-grid">
        ${kpiCard('fa-users-viewfinder', t('top_source'), topSource ? t(sourceLabelKey(topSource.key)) : '—', t('source_breakdown'), [[t('count'), topSource ? topSource.count : 0], [t('percent'), topSource ? topSource.percent + '%' : '0%']])}
        ${kpiCard('fa-arrow-trend-up', t('best_conversion'), bestConversion ? t(sourceLabelKey(bestConversion.key)) : '—', t('conversion_rate'), [[t('percent'), bestConversion ? bestConversion.conversion + '%' : '0%'], [t('count'), bestConversion ? bestConversion.count : 0]])}
        ${kpiCard('fa-user-slash', t('highest_loss'), highestLoss ? t(sourceLabelKey(highestLoss.key)) : '—', t('loss_requests'), [[t('percent'), highestLoss ? highestLoss.lossRate + '%' : '0%'], [t('lost'), highestLoss ? highestLoss.loss : 0]])}
        ${progressCard('fa-chart-simple', t('by_source'), `${data.statusCounts.total}`, t('requests_count'), 100)}

        <div class="eqrr-card full">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-globe"></i>${esc(t('source_breakdown'))}</div><div class="eqrr-card-sub">${esc(t('requests_flow'))}</div></div></div>
          ${sourceBreakdownHtml(data.sourceStats)}
        </div>
      </div>
    `;
  }

  function sourceBreakdownHtml(rows) {
    if (!rows.length) return `<div class="eqrr-empty">${esc(t('no_requests'))}</div>`;
    return `<div class="eqrr-list">${rows.map((row) => `<div class="eqrr-list-item"><div class="eqrr-icon-box"><i class="fas fa-circle-dot"></i></div><div><div class="eqrr-list-title">${esc(t(sourceLabelKey(row.key)))} — ${esc(row.count)} ${esc(t('requests'))}</div><div class="eqrr-list-sub">${esc(t('served_or_active'))}: ${esc(row.active)} — ${esc(t('lost'))}: ${esc(row.loss)} — ${esc(t('percent'))}: ${esc(row.percent)}%</div><div class="eqrr-progress"><span style="width:${row.percent}%"></span></div></div><span class="eqrr-badge wait">${esc(row.conversion)}%</span></div>`).join('')}</div>`;
  }

  function peakViewHtml(data) {
    return `
      <div class="eqrr-grid">
        ${kpiCard('fa-fire', t('peak_requests_hour'), fmtHourLabel(data.peak.requestsHour.hour), t('requests_created'), [[t('count'), data.peak.requestsHour.value], [t('top_day'), data.peak.topDay ? fmtDate(data.peak.topDay.date) : '—']])}
        ${kpiCard('fa-bolt', t('peak_assignments_hour'), fmtHourLabel(data.peak.assignmentsHour.hour), t('assignments_total'), [[t('count'), data.peak.assignmentsHour.value], [t('quiet_hour'), fmtHourLabel(data.peak.quietHour.hour)]])}
        ${progressCard('fa-wave-square', t('best_hour'), fmtHourLabel(data.peak.requestsHour.hour), t('peak_requests_hour'), pct(data.peak.requestsHour.value, Math.max(1, Math.max(...data.peak.hourlyRequests.map(r => r.value)) )))}
        ${progressCard('fa-calendar-days', t('top_day'), data.peak.topDay ? fmtDate(data.peak.topDay.date) : '—', t('by_day'), data.peak.topDay ? pct(data.peak.topDay.value, Math.max(1, data.statusCounts.total)) : 0)}

        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-chart-line"></i>${esc(t('request_peak_chart'))}</div><div class="eqrr-card-sub">${esc(t('by_hour'))}</div></div></div>${lineChartHtml(data.peak.hourlyRequests, 'requests')}</div>
        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-chart-area"></i>${esc(t('assignment_peak_chart'))}</div><div class="eqrr-card-sub">${esc(t('by_hour'))}</div></div></div>${lineChartHtml(data.peak.hourlyAssignments, 'assignments')}</div>
        <div class="eqrr-card full"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-calendar-week"></i>${esc(t('by_day'))}</div><div class="eqrr-card-sub">${esc(t('requests_created'))}</div></div></div>${barsHtml(data.peak.dailyRequests.map((row) => ({ label: fmtDate(row.date), value: row.value })), t('requests'), 10)}</div>
      </div>
    `;
  }

  function tablesViewHtml(data) {
    const topCapacity = data.capacityMix.slice().sort((a,b)=>b.count-a.count)[0] || null;
    return `
      <div class="eqrr-grid">
        ${kpiCard('fa-chair', t('usable_tables'), data.tableCounts.usable, t('current_tables'), [[t('available_tables'), data.tableCounts.available], [t('occupied_tables'), data.tableCounts.occupied]])}
        ${progressCard('fa-chart-pie', t('utilization'), `${data.tableCounts.utilization}%`, t('occupied_tables'), data.tableCounts.utilization)}
        ${progressCard('fa-chart-simple', t('busy_rate'), `${data.tableCounts.busyRate}%`, t('current_tables'), data.tableCounts.busyRate)}
        ${kpiCard('fa-users-rectangle', t('top_capacity'), topCapacity ? topCapacity.label : '—', t('capacity_mix'), [[t('count'), topCapacity ? topCapacity.count : 0], [t('tables'), data.tableCounts.total]])}

        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-people-group"></i>${esc(t('capacity_mix'))}</div><div class="eqrr-card-sub">${esc(t('tables'))}</div></div></div>${barsHtml(data.capacityMix.map((row) => ({ label: row.label, value: row.count })), t('tables'), 10)}</div>
        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-star"></i>${esc(t('most_active_tables'))}</div><div class="eqrr-card-sub">${esc(t('period_analysis'))}</div></div></div>${mostActiveTablesHtml(data.mostActiveTables)}</div>
        <div class="eqrr-card full"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-table-list"></i>${esc(t('current_tables'))}</div><div class="eqrr-card-sub">${esc(t('live_snapshot'))}</div></div></div>${tableStatusTable(data)}</div>
      </div>
    `;
  }

  function mostActiveTablesHtml(rows) {
    if (!rows.length) return `<div class="eqrr-empty">${esc(t('no_tables'))}</div>`;
    return `<div class="eqrr-list">${rows.map((row) => `<div class="eqrr-list-item"><div class="eqrr-icon-box"><i class="fas fa-chair"></i></div><div><div class="eqrr-list-title">${esc(row.name)}</div><div class="eqrr-list-sub">${esc(t('zone'))}: ${esc(row.zone)} / ${esc(t('floor'))}: ${esc(row.floor)} / ${esc(t('status'))}: ${esc(requestStatusLabel(row.status))}</div></div><span class="eqrr-badge info">${esc(row.changes)}</span></div>`).join('')}</div>`;
  }

  function tableStatusTable(data) {
    const rows = [
      [t('available'), data.tableCounts.available, t('live_snapshot')],
      [t('occupied'), data.tableCounts.occupied, t('live_snapshot')],
      [t('reserved'), data.tableCounts.reserved, t('live_snapshot')],
      [t('cleaning'), data.tableCounts.cleaning, t('live_snapshot')],
      [t('pending'), data.tableCounts.pending, t('live_snapshot')],
      [t('disabled'), data.tableCounts.disabled, t('live_snapshot')]
    ];
    return tableHtml([t('status'), t('count'), t('note')], rows);
  }

  function assignmentsViewHtml(data) {
    return `
      <div class="eqrr-grid">
        ${kpiCard('fa-link', t('assignments_total'), data.assignmentsReport.total, t('period_analysis'), [[t('assignment_rate'), data.assignmentsReport.assignmentRate + '%'], [t('avg_to_assignment'), fmtMinutes(data.assignmentsReport.avgToAssignment)]])}
        ${kpiCard('fa-paper-plane', t('whatsapp_sent'), data.assignmentsReport.whatsappSent, t('whatsapp_summary'), [[t('whatsapp_not_sent'), data.assignmentsReport.whatsappNotSent], [t('assignment_rate'), pct(data.assignmentsReport.whatsappSent, Math.max(1, data.assignmentsReport.total)) + '%']])}
        ${kpiCard('fa-clock', t('active_holds'), data.assignmentsReport.activeHolds, t('current_tables'), [[t('expiring_holds'), data.assignmentsReport.expiringSoon], [t('avg_to_assignment'), fmtMinutes(data.assignmentsReport.avgToAssignment)]])}
        ${progressCard('fa-message', t('whatsapp_summary'), `${pct(data.assignmentsReport.whatsappSent, Math.max(1, data.assignmentsReport.total))}%`, t('notified'), pct(data.assignmentsReport.whatsappSent, Math.max(1, data.assignmentsReport.total)))}
        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-chart-line"></i>${esc(t('assignments_over_time'))}</div><div class="eqrr-card-sub">${esc(t('by_hour'))}</div></div></div>${lineChartHtml(data.assignmentsReport.hourlyAssignments, 'assignments')}</div>
        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-bell"></i>${esc(t('whatsapp_summary'))}</div><div class="eqrr-card-sub">${esc(t('requests_flow'))}</div></div></div>${barsHtml([{ label: t('notified'), value: data.assignmentsReport.whatsappSent }, { label: t('not_notified'), value: data.assignmentsReport.whatsappNotSent }], t('count'), 12)}</div>
      </div>
    `;
  }

  function zonesViewHtml(data) {
    return `
      <div class="eqrr-grid">
        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-map-location-dot"></i>${esc(t('zones_summary'))}</div><div class="eqrr-card-sub">${esc(t('top_zones'))}</div></div></div>${zonesTableHtml(data.zones)}</div>
        <div class="eqrr-card wide"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-building"></i>${esc(t('floors_summary'))}</div><div class="eqrr-card-sub">${esc(t('top_floors'))}</div></div></div>${floorsTableHtml(data.floors)}</div>
        <div class="eqrr-card full"><div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-layer-group"></i>${esc(t('tables_by_zone'))}</div><div class="eqrr-card-sub">${esc(t('tables'))}</div></div></div>${barsHtml(data.zones.slice(0,10).map((row)=>({ label: row.zone, value: row.tables })), t('tables'), 12)}</div>
      </div>
    `;
  }

  function exportViewHtml(data) {
    return `
      <div class="eqrr-grid">
        <div class="eqrr-card wide">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-file-export"></i>${esc(t('export_title'))}</div><div class="eqrr-card-sub">${esc(t('export_sub'))}</div></div></div>
          <div class="eqrr-card-sub">${esc(t('export_lang'))}</div>
          <div class="eqrr-chip-row" style="margin-top:8px;">
            <button class="eqrr-mini-btn ${EQR.exportLang==='ar'?'active':''}" onclick="EQRestaurantReports.setExportLang('ar')">${esc(t('export_ar'))}</button>
            <button class="eqrr-mini-btn ${EQR.exportLang==='en'?'active':''}" onclick="EQRestaurantReports.setExportLang('en')">${esc(t('export_en'))}</button>
          </div>
          <div class="eqrr-export-actions">
            <button class="eqrr-btn primary" onclick="EQRestaurantReports.print()"><i class="fas fa-print"></i>${esc(t('print_pdf'))}</button>
            <button class="eqrr-btn ghost" onclick="EQRestaurantReports.downloadHTML()"><i class="fas fa-code"></i>${esc(t('download_html'))}</button>
            <button class="eqrr-btn ghost" onclick="EQRestaurantReports.downloadCSV()"><i class="fas fa-file-csv"></i>${esc(t('download_csv'))}</button>
            <button class="eqrr-btn ghost" onclick="EQRestaurantReports.share()"><i class="fas fa-share-nodes"></i>${esc(t('share_report'))}</button>
            <button class="eqrr-btn ghost" onclick="EQRestaurantReports.email()"><i class="fas fa-envelope"></i>${esc(t('email_report'))}</button>
            <button class="eqrr-btn ghost" onclick="EQRestaurantReports.shareWhatsApp()"><i class="fab fa-whatsapp"></i>${esc(t('whatsapp_share'))}</button>
            <button class="eqrr-btn ghost" onclick="EQRestaurantReports.copySummary()"><i class="fas fa-copy"></i>${esc(t('copy_summary'))}</button>
          </div>
          <div class="eqrr-export-actions">
            <button class="eqrr-mini-btn" onclick="EQRestaurantReports.shareX()"><i class="fab fa-x-twitter"></i>${esc(t('share_x'))}</button>
            <button class="eqrr-mini-btn" onclick="EQRestaurantReports.shareFacebook()"><i class="fab fa-facebook-f"></i>${esc(t('share_fb'))}</button>
          </div>
          <div class="eqrr-note" style="margin-top:12px;">${esc(t('report_preview_note'))}</div>
        </div>
        <div class="eqrr-card wide">
          <div class="eqrr-card-head"><div><div class="eqrr-card-title"><i class="fas fa-eye"></i>${esc(t('export_preview'))}</div><div class="eqrr-card-sub">${esc(t('generated_on'))}: ${esc(fmtDateTime(new Date(), EQR.exportLang))}</div></div></div>
          <div class="eqrr-export-preview">${buildPrintableReportBody(data, EQR.exportLang, true)}</div>
        </div>
      </div>
    `;
  }

  function barsHtml(items, unitLabel, labelWidth) {
    if (!items || !items.length) return `<div class="eqrr-empty">${esc(t('no_data'))}</div>`;
    const max = Math.max(1, ...items.map((row) => n(row.value)));
    return `<div class="eqrr-bars">${items.map((row) => `<div class="eqrr-bar-row" style="grid-template-columns:${labelWidth||110}px minmax(0,1fr) 54px;"><div title="${esc(row.label)}">${esc(row.label)}</div><div class="eqrr-bar-track"><div class="eqrr-bar-fill" style="width:${pct(row.value, max)}%"></div></div><div>${esc(row.value)}${unitLabel ? ' ' + esc(unitLabel) : ''}</div></div>`).join('')}</div>`;
  }

  function lineChartHtml(series, mode) {
    if (!series || !series.length) return `<div class="eqrr-empty">${esc(t('no_data'))}</div>`;
    const w = 640;
    const h = 220;
    const pad = 18;
    const max = Math.max(1, ...series.map((row) => n(row.value)));
    const stepX = (w - pad * 2) / Math.max(1, series.length - 1);
    const points = series.map((row, index) => {
      const x = pad + index * stepX;
      const y = h - pad - ((n(row.value) / max) * (h - pad * 2));
      return `${x},${y}`;
    }).join(' ');
    const areaPoints = `${pad},${h-pad} ${points} ${w-pad},${h-pad}`;
    const peak = getTopSeriesPoint(series);
    return `
      <div class="eqrr-chart">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <defs><linearGradient id="eqrrLineGrad-${mode}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#0E146D"></stop><stop offset="100%" stop-color="#60A5FA"></stop></linearGradient></defs>
          <path d="M ${areaPoints}" fill="rgba(59,130,246,.10)"></path>
          <polyline fill="none" stroke="url(#eqrrLineGrad-${mode})" stroke-width="3" points="${points}"></polyline>
          ${series.map((row, index) => {
            const x = pad + index * stepX;
            const y = h - pad - ((n(row.value) / max) * (h - pad * 2));
            return `<circle cx="${x}" cy="${y}" r="${row.value === peak.value ? 4.2 : 3.2}" fill="${row.value === peak.value ? '#F59E0B' : '#0E146D'}"></circle>`;
          }).join('')}
        </svg>
        <div class="eqrr-chart-labels">
          <span>${esc(fmtHourLabel(0))}</span>
          <span>${esc(fmtHourLabel(6))}</span>
          <span>${esc(fmtHourLabel(12))}</span>
          <span>${esc(fmtHourLabel(18))}</span>
          <span>${esc(fmtHourLabel(23))}</span>
        </div>
      </div>
    `;
  }

  function tableHtml(headers, rows) {
    return `
      <div class="eqrr-table-wrap">
        <table class="eqrr-table">
          <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    `;
  }

  function zonesTableHtml(zones) {
    if (!zones.length) return `<div class="eqrr-empty">${esc(t('no_zones'))}</div>`;
    const rows = zones.slice(0, 12).map((z) => [z.zone, z.requests, z.waiting, z.available, z.occupied, fmtMinutes(z.avgWait), `${z.utilization}%`]);
    return tableHtml([t('zone'), t('requests_today'), t('waiting_now'), t('available_tables'), t('occupied_tables'), t('avg_wait'), t('utilization')], rows);
  }

  function floorsTableHtml(floors) {
    if (!floors.length) return `<div class="eqrr-empty">${esc(t('no_zones'))}</div>`;
    const rows = floors.map((f) => [f.floor, f.tables, f.available, f.occupied, f.reserved, f.cleaning, `${f.utilization}%`]);
    return tableHtml([t('floor'), t('tables'), t('available_tables'), t('occupied_tables'), t('reserved'), t('cleaning'), t('utilization')], rows);
  }

  function buildPrintableReportBody(data, exportLang, previewOnly) {
    const dir = exportLang === 'ar' ? 'rtl' : 'ltr';
    const businessName = data.business?.name || data.business?.business_name || data.business?.branch_name || 'EASY-Q';
    const label = (key) => t(key, exportLang);
    const takeaways = data.takeaways.map((item) => exportLang === 'ar' ? item.ar : item.en);
    return `
      <div class="eqrr-report-preview-page" dir="${dir}" style="font-family:Arial, sans-serif; direction:${dir}; text-align:${exportLang==='ar'?'right':'left'};">
        <div style="border-bottom:2px solid #0E146D;padding-bottom:12px;margin-bottom:16px;">
          <div style="font-size:24px;font-weight:900;color:#0E146D;">${esc(businessName)}</div>
          <div style="font-size:18px;font-weight:900;color:#111827;margin-top:4px;">${esc(label('generated_report_name'))}</div>
          <div style="font-size:12px;color:#64748B;font-weight:700;margin-top:6px;">${esc(label('generated_on'))}: ${esc(fmtDateTime(new Date(), exportLang))}</div>
          <div style="font-size:12px;color:#64748B;font-weight:700;margin-top:4px;">${esc(label('report_range'))}: ${esc(rangeLabelForExport(EQR.range, exportLang))}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
          ${printKpi(label('total_requests'), data.statusCounts.total, label('request_summary'))}
          ${printKpi(label('conversion_rate'), data.statusCounts.conversion + '%', label('served_or_active'))}
          ${printKpi(label('avg_wait_assigned'), fmtMinutes(data.waitingAnalysis.assignedAvg, exportLang), label('time_to_assignment'))}
          ${printKpi(label('utilization'), data.tableCounts.utilization + '%', label('current_tables'))}
        </div>
        <div style="margin-top:18px;">
          <div style="font-size:16px;font-weight:900;margin-bottom:8px;">${esc(label('request_summary'))}</div>
          ${printTable([
            label('status'), label('count')
          ], [
            [label('waiting'), data.statusCounts.waiting],
            [label('offered'), data.statusCounts.offered],
            [label('occupied'), data.statusCounts.occupied],
            [label('completed'), data.statusCounts.completed],
            [label('cancelled'), data.statusCounts.cancelled],
            [label('expired'), data.statusCounts.expired]
          ])}
        </div>
        <div style="margin-top:18px;">
          <div style="font-size:16px;font-weight:900;margin-bottom:8px;">${esc(label('source_breakdown'))}</div>
          ${printTable([
            label('source'), label('count'), label('percent'), label('lost')
          ], data.sourceStats.map((row) => [label(sourceLabelKey(row.key)), row.count, row.percent + '%', row.loss]))}
        </div>
        <div style="margin-top:18px;">
          <div style="font-size:16px;font-weight:900;margin-bottom:8px;">${esc(label('operational_takeaways'))}</div>
          <ul style="margin:0;padding-${exportLang==='ar'?'right':'left'}:18px;line-height:1.9;color:#334155;font-size:13px;">
            ${takeaways.map((item) => `<li>${esc(item)}</li>`).join('')}
          </ul>
        </div>
        <div style="margin-top:18px;">
          <div style="font-size:16px;font-weight:900;margin-bottom:8px;">${esc(label('peak_hours'))}</div>
          <div style="font-size:13px;color:#334155;line-height:1.8;">${esc(label('peak_requests_hour'))}: ${esc(fmtHourLabel(data.peak.requestsHour.hour, exportLang))} — ${esc(data.peak.requestsHour.value)} ${esc(label('requests'))}</div>
          <div style="font-size:13px;color:#334155;line-height:1.8;">${esc(label('peak_assignments_hour'))}: ${esc(fmtHourLabel(data.peak.assignmentsHour.hour, exportLang))} — ${esc(data.peak.assignmentsHour.value)} ${esc(label('requests'))}</div>
        </div>
        ${previewOnly ? '' : '<div style="margin-top:22px;font-size:11px;color:#64748B;">Generated by EASY-Q</div>'}
      </div>
    `;
  }

  function rangeLabelForExport(range, l) {
    if (range === 'last30') return t('last30', l);
    if (range === 'last7') return t('last7', l);
    return t('today', l);
  }

  function printKpi(title, value, sub) {
    return `<div style="border:1px solid #E5E7EB;border-radius:14px;padding:12px;background:#FAFBFF;"><div style="font-size:12px;color:#64748B;font-weight:800;">${esc(title)}</div><div style="font-size:26px;font-weight:900;color:#0F172A;margin-top:6px;">${esc(value)}</div><div style="font-size:11px;color:#64748B;font-weight:700;margin-top:6px;">${esc(sub)}</div></div>`;
  }

  function printTable(headers, rows) {
    return `<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr>${headers.map((h) => `<th style="padding:10px;border:1px solid #E5E7EB;background:#F8FAFC;color:#475569;">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td style="padding:10px;border:1px solid #E5E7EB;">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function openPrintWindow(data) {
    const html = buildPrintableDocument(data, EQR.exportLang);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  function buildPrintableDocument(data, exportLang) {
    const dir = exportLang === 'ar' ? 'rtl' : 'ltr';
    return `<!DOCTYPE html><html lang="${exportLang}" dir="${dir}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(t('generated_report_name', exportLang))}</title><style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:24px;direction:${dir};text-align:${exportLang==='ar'?'right':'left'};color:#111827;} @media print{body{padding:0;margin:12mm;} .no-print{display:none;}} </style></head><body>${buildPrintableReportBody(data, exportLang, false)}</body></html>`;
  }

  function downloadHtmlReport(data) {
    const html = buildPrintableDocument(data, EQR.exportLang);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const businessName = fileSafeName(data.business?.name || data.business?.business_name || 'business');
    triggerDownload(blob, `${businessName}-report-${EQR.range}-${EQR.exportLang}.html`);
  }

  function downloadCsvReport(data) {
    const rows = [
      [t('generated_report_name', EQR.exportLang), data.business?.name || data.business?.business_name || 'EASY-Q'],
      [t('generated_on', EQR.exportLang), fmtDateTime(new Date(), EQR.exportLang)],
      [t('report_range', EQR.exportLang), rangeLabelForExport(EQR.range, EQR.exportLang)],
      [],
      [t('status', EQR.exportLang), t('count', EQR.exportLang)],
      [t('waiting', EQR.exportLang), data.statusCounts.waiting],
      [t('offered', EQR.exportLang), data.statusCounts.offered],
      [t('occupied', EQR.exportLang), data.statusCounts.occupied],
      [t('completed', EQR.exportLang), data.statusCounts.completed],
      [t('cancelled', EQR.exportLang), data.statusCounts.cancelled],
      [t('expired', EQR.exportLang), data.statusCounts.expired],
      [],
      [t('source', EQR.exportLang), t('count', EQR.exportLang), t('percent', EQR.exportLang), t('lost', EQR.exportLang)],
      ...data.sourceStats.map((row) => [t(sourceLabelKey(row.key), EQR.exportLang), row.count, `${row.percent}%`, row.loss])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const businessName = fileSafeName(data.business?.name || data.business?.business_name || 'business');
    triggerDownload(blob, `${businessName}-report-${EQR.range}-${EQR.exportLang}.csv`);
  }

  function csvCell(value) {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function summaryTextForShare(data, forcedLang) {
    const l = forcedLang || EQR.exportLang;
    const businessName = data.business?.name || data.business?.business_name || 'EASY-Q';
    const lines = [
      `${t('generated_report_name', l)} - ${businessName}`,
      `${t('report_range', l)}: ${rangeLabelForExport(EQR.range, l)}`,
      `${t('total_requests', l)}: ${data.statusCounts.total}`,
      `${t('conversion_rate', l)}: ${data.statusCounts.conversion}%`,
      `${t('avg_wait_assigned', l)}: ${fmtMinutes(data.waitingAnalysis.assignedAvg, l)}`,
      `${t('peak_requests_hour', l)}: ${fmtHourLabel(data.peak.requestsHour.hour, l)} (${data.peak.requestsHour.value})`,
      `${t('utilization', l)}: ${data.tableCounts.utilization}%`
    ];
    return lines.join('\n');
  }

  async function copySummary(data) {
    const text = summaryTextForShare(data, EQR.exportLang);
    try {
      await navigator.clipboard.writeText(text);
      alert(t('copied'));
    } catch (_) {
      window.prompt('Copy report summary', text);
    }
  }

  async function shareReport(data) {
    const text = summaryTextForShare(data, EQR.exportLang);
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('generated_report_name', EQR.exportLang),
          text
        });
        return;
      } catch (_) {}
    }
    await copySummary(data);
    alert(t('shared_not_supported'));
  }

  function shareViaUrl(base, text) {
    window.open(base + encodeURIComponent(text), '_blank', 'noopener');
  }

  function emailReport(data) {
    const subject = `${t('email_subject', EQR.exportLang)} - ${(data.business?.name || data.business?.business_name || 'EASY-Q')}`;
    const body = summaryTextForShare(data, EQR.exportLang);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function shareWhatsApp(data) {
    const text = summaryTextForShare(data, EQR.exportLang);
    shareViaUrl('https://wa.me/?text=', text);
  }

  function shareX(data) {
    const text = summaryTextForShare(data, EQR.exportLang);
    shareViaUrl('https://twitter.com/intent/tweet?text=', text);
  }

  function shareFacebook(data) {
    const text = summaryTextForShare(data, EQR.exportLang);
    shareViaUrl('https://www.facebook.com/sharer/sharer.php?u=&quote=', text);
  }

  async function openReports(view = 'summary', force = false) {
    const allowedViews = ['summary', 'waiting', 'sources', 'peak', 'tables', 'assignments', 'zones', 'export'];
    EQR.activeView = allowedViews.includes(view) ? view : 'summary';
    setActiveSidebar(sidebarViewFor(EQR.activeView));
    if (!canOpenReports()) {
      openPanel(t('reports_title'), t('no_permission'), errorHtml(t('no_permission')));
      return;
    }
    openPanel(t('reports_title'), t('loading_indicators'), loadingHtml());
    try {
      let data = EQR.lastData;
      if (!data || force) data = await loadReportData();
      renderReports(data, EQR.activeView);
    } catch (err) {
      console.error('[EASY-Q Reports] open failed:', err);
      openPanel(t('reports_title'), t('unable_load_data'), errorHtml(err.message || t('unexpected_error')));
    }
  }

  function sidebarViewFor(view) {
    if (view === 'waiting') return 'waiting';
    if (view === 'peak') return 'peak';
    if (view === 'tables') return 'tables';
    if (view === 'export') return 'export';
    return 'waiting';
  }

  async function refreshReports() {
    return openReports(EQR.activeView, true);
  }

  function bindSidebarButtons() {
    const map = [
      ['reports-waiting', 'waiting'],
      ['reports-peak', 'peak'],
      ['reports-tables', 'tables'],
      ['reports-export', 'export']
    ];
    map.forEach(([dataView, targetView]) => {
      const btn = document.querySelector(`.sub-menu-item[data-view="${dataView}"]`);
      if (btn && btn.dataset.eqrrBound !== 'true') {
        btn.dataset.eqrrBound = 'true';
        btn.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          openReports(targetView, true);
        });
      }
    });

    const staffBtn = document.querySelector('.sub-menu-item[data-view="reports-staff"]');
    if (staffBtn) staffBtn.style.display = 'none';
  }

  function boot() {
    ensureStyles();
    bindSidebarButtons();
    setTimeout(bindSidebarButtons, 600);
    setTimeout(bindSidebarButtons, 1600);
  }

  window.EQRestaurantReports = {
    open: openReports,
    refresh: refreshReports,
    setView(view) {
      return openReports(view, false);
    },
    setRange(range) {
      EQR.range = ['today', 'last7', 'last30'].includes(range) ? range : 'today';
      return openReports(EQR.activeView, true);
    },
    setExportLang(langCode) {
      EQR.exportLang = langCode === 'en' ? 'en' : 'ar';
      return openReports('export', false);
    },
    print() {
      if (!EQR.lastData) return;
      openPrintWindow(EQR.lastData);
    },
    downloadHTML() {
      if (!EQR.lastData) return;
      downloadHtmlReport(EQR.lastData);
    },
    downloadCSV() {
      if (!EQR.lastData) return;
      downloadCsvReport(EQR.lastData);
    },
    share() {
      if (!EQR.lastData) return;
      return shareReport(EQR.lastData);
    },
    email() {
      if (!EQR.lastData) return;
      return emailReport(EQR.lastData);
    },
    shareWhatsApp() {
      if (!EQR.lastData) return;
      return shareWhatsApp(EQR.lastData);
    },
    copySummary() {
      if (!EQR.lastData) return;
      return copySummary(EQR.lastData);
    },
    shareX() {
      if (!EQR.lastData) return;
      return shareX(EQR.lastData);
    },
    shareFacebook() {
      if (!EQR.lastData) return;
      return shareFacebook(EQR.lastData);
    },
    boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
