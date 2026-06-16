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
    const translated = tr(value);
    return String(translated)
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

  function isAr() {
    return (window.currentLang || 'ar') === 'ar';
  }

  function txt(ar, en) {
    return isAr() ? ar : en;
  }

  function dashboardDir() {
    return isAr() ? 'rtl' : 'ltr';
  }

  function tStatus(okKey) {
    if (okKey === 'ok') return txt('جيد', 'Good');
    if (okKey === 'warn') return txt('تنبيه', 'Watch');
    if (okKey === 'bad') return txt('خطر', 'Critical');
    return okKey || '';
  }

  function tr(value) {
    if (isAr() || value === null || value === undefined) return value;

    const str = String(value);

    const map = {
      'جاري تجهيز لوحة المراقبة...': 'Preparing dashboard...',
      'لا يوجد business_id للمستخدم الحالي': 'No business_id found for the current user',
      'بدون منطقة': 'No Zone',
      'بدون تفضيل': 'No Preference',
      'مستقر': 'Stable',
      'يحتاج متابعة': 'Needs Follow-up',
      'تحت المراقبة': 'Watch',
      'ضغط عالي': 'High Pressure',
      'جيد': 'Good',
      'لا توجد مؤشرات حرجة حاليًا.': 'No critical indicators right now.',
      'يوجد عملاء تجاوزوا مدة انتظار عالية أو طلبات منتهية تحتاج مراجعة.': 'Some customers have waited too long or expired requests need review.',
      'يوجد عملاء يحتاجون إجراء قريب من الموظف.': 'Some customers need staff attention soon.',
      'لا توجد إجراءات عاجلة في الطابور أو الطلبات الحالية.': 'No urgent actions in the queue or current requests.',
      'يوجد مؤشر يحتاج تدخل سريع من مسؤول المطعم.': 'There is an indicator that needs quick manager attention.',
      'العمل جيد لكن هناك نقاط تحتاج متابعة خلال الوردية.': 'Operations are good, but some items need monitoring during the shift.',
      'الوضع الحالي مستقر ولا توجد مؤشرات حرجة.': 'Current operations are stable with no critical indicators.',
      'لوحة مراقبة المطعم': 'Restaurant Dashboard',
      'ملخص اليوم': 'Today Summary',
      'نظرة عامة': 'Overview',
      'مؤشرات العمل اليومي، الطلبات، الطاولات، والتنبيهات التشغيلية': 'Daily operations, requests, tables, and operational alerts',
      'نظرة شاملة تساعد مسؤول المطعم على متابعة التشغيل لحظة بلحظة': 'A real-time overview to help restaurant managers monitor operations',
      'لوحة مراقبة EASY-Q': 'EASY-Q Dashboard',
      'تحديث الآن': 'Refresh Now',
      'حالة التشغيل الآن': 'Current Operating Status',
      'آخر تحديث:': 'Last update:',
      'تحديث تلقائي كل': 'Auto refresh every',
      'ث': 's',
      'الطابور الآن': 'Queue Now',
      'متوسط الانتظار': 'Average Wait',
      'جاهزون': 'Ready',
      'معيّنون': 'Assigned',
      'الطاولات المتاحة': 'Available Tables',
      'من أصل': 'Out of',
      'طاولة عاملة': 'active tables',
      'مشغولة': 'Occupied',
      'تنظيف': 'Cleaning',
      'استغلال الطاولات': 'Table Utilization',
      'نسبة الطاولات المشغولة حاليًا': 'Current occupied-table ratio',
      'طلبات اليوم': 'Today Requests',
      'نسبة التحويل': 'Conversion Rate',
      'جلس/خدمة': 'Seated/Served',
      'فقد': 'Lost',
      'التنبيهات الذكية': 'Smart Alerts',
      'أهم ما يحتاج انتباه مسؤول المطعم الآن': 'What needs the manager attention now',
      'أولويات التنفيذ': 'Execution Priorities',
      'من يجب التعامل معه أولًا': 'Who should be handled first',
      'المناطق': 'Zones',
      'ضغط الانتظار والطاولات حسب المنطقة': 'Queue and table pressure by zone',
      'الطوابق': 'Floors',
      'توزيع الطاولات حسب الدور': 'Table distribution by floor',
      'توصيات تشغيلية': 'Operational Recommendations',
      'اقتراحات مباشرة لتحسين الوردية الحالية': 'Direct suggestions to improve the current shift',
      'إجمالي طلبات اليوم': 'Total Requests Today',
      'منذ بداية اليوم': 'Since start of day',
      'محلي': 'Local',
      'أونلاين': 'Online',
      'تمت خدمتهم/نشط': 'Served/Active',
      'تعيينات': 'Assignments',
      'جاهز الآن': 'Ready Now',
      'تحويل الطلبات': 'Request Conversion',
      'طلبات وصلت للخدمة أو التعيين': 'Requests that reached service or assignment',
      'الفقد اليوم': 'Today Loss',
      'ملغي/منتهي': 'Cancelled/Expired',
      'مصادر العملاء اليوم': 'Customer Sources Today',
      'تمييز سريع بين العميل المحلي وحجز صفحة الأونلاين': 'Quick split between local walk-ins and online bookings',
      'مركز المتابعة الفورية': 'Live Monitoring Center',
      'إشارات تشغيلية سريعة لا تدخل ضمن التقارير التحليلية': 'Quick operational signals separate from deep reports',
      'أحدث الطلبات': 'Latest Requests',
      'آخر حركة على طلبات المطعم': 'Latest activity on restaurant requests',
      'ملخص الحالات اليوم': 'Today Status Summary',
      'تفصيل سريع حسب حالة الطلب': 'Quick breakdown by request status',
      'أداء المناطق اليوم': 'Zone Performance Today',
      'عدد الطلبات ومتوسط الانتظار حسب المنطقة': 'Request count and average wait by zone',
      'لا توجد بيانات تشغيلية كافية': 'Not enough operational data',
      'حالة المتابعة:': 'Monitoring Status:',
      'نشط': 'active',
      'جاهز للتعيين': 'Ready to Assign',
      'معيّن/جاهز': 'Assigned/Ready',
      'فوق 15 دقيقة': 'Over 15 min',
      'بدون جوال': 'No Mobile',
      'محلي من داخل المطعم': 'Local Walk-in',
      'حجز أونلاين / صفحة الحجز': 'Online / Booking Page',
      'مسترجع': 'Restored',
      'مصادر غير مصنفة': 'Unclassified Sources',
      'طلب': 'request',
      'طلبات': 'requests',
      'النسبة': 'ratio',
      'من المؤشر': 'of indicator',
      'لا يوجد عملاء في الانتظار الآن': 'No customers waiting right now',
      'دور': 'Turn',
      'أشخاص': 'people',
      'جاهز': 'Ready',
      'لا توجد مناطق مفعلة أو بيانات كافية': 'No active zones or enough data',
      'انتظار': 'Waiting',
      'متاحة': 'Available',
      'لا توجد طوابق مفعلة أو بيانات كافية': 'No active floors or enough data',
      'الدور': 'Floor',
      'محجوزة': 'Reserved',
      'لا توجد توصيات إضافية الآن': 'No additional recommendations right now',
      'توصية': 'Recommendation',
      'تشغيلي': 'Operational',
      'لا توجد طلبات حديثة': 'No recent requests',
      'إجمالي الطلبات': 'Total Requests',
      'كل الطلبات التي أنشئت اليوم': 'All requests created today',
      'أضيفوا يدويًا من موظف المطعم': 'Added manually by restaurant staff',
      'حجز أونلاين': 'Online Booking',
      'دخلوا من صفحة الحجز أو QR': 'Entered from the booking page or QR',
      'لا يزالون في الطابور': 'Still in the queue',
      'جاهز/معيّن': 'Ready/Assigned',
      'تم تعيين أو تجهيز طاولة': 'A table was assigned or prepared',
      'مشغول الآن': 'Occupied Now',
      'عملاء على الطاولات': 'Customers at tables',
      'مكتمل/تنظيف': 'Completed/Cleaning',
      'انتهت الخدمة أو دخلت تنظيف': 'Service ended or table entered cleaning',
      'ملغي/لم يحضر': 'Cancelled/No Show',
      'طلبات فقدت قبل الخدمة': 'Requests lost before service',
      'منتهي': 'Expired',
      'انتهت مهلة الحجز أو الانتظار': 'Reservation or waiting time expired',
      'الحالة': 'Status',
      'العدد': 'Count',
      'التفسير': 'Explanation',
      'لا توجد بيانات مناطق اليوم': 'No zone data today',
      'المنطقة': 'Zone',
      'انتظار الآن': 'Waiting Now',
      'طاولات متاحة': 'Available Tables',
      'طاولات مشغولة': 'Occupied Tables',
      'استغلال': 'Utilization',
      'تعذر فتح لوحة المراقبة': 'Unable to open dashboard',
      'لا توجد صلاحية كافية': 'Insufficient Permission',
      'ليس لديك صلاحية لعرض لوحة المراقبة.': 'You do not have permission to view the dashboard.',
      'جاري تحميل مؤشرات التشغيل': 'Loading operational indicators',
      'تعذر تحميل البيانات': 'Unable to load data',
      'حدث خطأ غير متوقع': 'An unexpected error occurred',
      'جاري التحديث': 'Refreshing',
      'لا توجد طاولات متاحة الآن': 'No tables available now',
      'عملاء جاهزون للتعيين': 'Customers ready to assign',
      'عملاء تم تعيينهم وينتظرون الجلوس': 'Assigned customers waiting to be seated',
      'انتظار طويل': 'Long Wait',
      'نسبة فقد عالية اليوم': 'High loss rate today',
      'قائمة منتهية تحتاج مراجعة': 'Expired list needs review',
      'الوضع مستقر': 'Operations stable',
      'عيّن العملاء الجاهزين': 'Assign ready customers',
      'تابع العملاء المعيّنين': 'Follow assigned customers',
      'انتظار تجاوز 15 دقيقة': 'Wait exceeded 15 minutes',
      'طلبات بدون رقم جوال': 'Requests without mobile number',
      'طلبات منتهية تحتاج مراجعة': 'Expired requests need review',
      'لا توجد طاولات متاحة': 'No available tables',
      'الوضع اليومي جيد': 'Daily status is good'
    };

    if (map[str]) return map[str];

    let m;
    if ((m = str.match(/^(\d+) عميل لديه طاولة مناسبة الآن\.$/))) return `${m[1]} customer(s) have a suitable table now.`;
    if ((m = str.match(/^(\d+) عميل تم تعيينه أو تجهيزه ولم تكتمل خدمته بعد\.$/))) return `${m[1]} customer(s) have been assigned/prepared and service is not completed yet.`;
    if ((m = str.match(/^(\d+) عميل يحتاج متابعة حتى لا يتحول لفقد\.$/))) return `${m[1]} customer(s) need follow-up to avoid losing them.`;
    if ((m = str.match(/^(\d+) طلب اليوم بدون رقم جوال، قد يصعب التواصل معهم\.$/))) return `${m[1]} request(s) today have no mobile number, which may make contact difficult.`;
    if ((m = str.match(/^(\d+) طلب موجود في قائمة المنتهية\.$/))) return `${m[1]} request(s) are in the expired list.`;
    if ((m = str.match(/^يوجد (\d+) عميل ينتظر ولا توجد طاولات متاحة الآن\.$/))) return `${m[1]} customer(s) are waiting and no tables are available now.`;
    if ((m = str.match(/^يوجد (\d+) عميل في الانتظار بدون طاولات متاحة\.$/))) return `${m[1]} customer(s) are waiting with no available tables.`;
    if ((m = str.match(/^(\d+) عميل لديهم طاولة مناسبة متاحة الآن\.$/))) return `${m[1]} customer(s) have a suitable table available now.`;
    if ((m = str.match(/^(\d+) عميل في حالة جاهز\/معيّن، راقب وقت الحجز\.$/))) return `${m[1]} customer(s) are ready/assigned; monitor the reservation timer.`;
    if ((m = str.match(/^أطول انتظار حاليًا (.+)، والمتوسط (.+)\.$/))) return `Longest current wait is ${m[1]}, average is ${m[2]}.`;
    if ((m = str.match(/^الملغي\/المنتهي (\d+) من (\d+) طلب \((\d+)%\)\.$/))) return `Cancelled/expired: ${m[1]} of ${m[2]} requests (${m[3]}%).`;
    if ((m = str.match(/^يوجد (\d+) عنصر في قائمة المنتهية حسب البيانات المحملة\.$/))) return `${m[1]} item(s) in the expired list based on loaded data.`;
    if ((m = str.match(/^(\d+) ملغي\/منتهي$/))) return `${m[1]} cancelled/expired`;

    return value;
  }

  function fmtMinutes(mins) {
    const m = Math.max(0, Math.round(n(mins)));

    if (isAr()) {
      if (m < 60) return `${m} د`;
      const h = Math.floor(m / 60);
      const r = m % 60;
      return r ? `${h}س ${r}د` : `${h}س`;
    }

    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }

  function fmtDateTime(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString(isAr() ? 'ar-SA' : 'en-US', {
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
      return new Date(value).toLocaleTimeString(isAr() ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return '—';
    }
  }

  function statusArabic(status) {
    const arMap = {
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

    const enMap = {
      waiting: 'Waiting',
      offered: 'Ready/Assigned',
      reserved: 'Reserved',
      occupied: 'Occupied',
      cleaning: 'Cleaning',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
      no_show: 'No Show',
      available: 'Available',
      disabled: 'Disabled',
      pending: 'Pending'
    };

    return (isAr() ? arMap : enMap)[status] || status || '—';
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
        font-family: inherit;
        color: #111827;
        padding: 18px;
        background: #F5F7FF;
        min-height: calc(100vh - 120px);
      }

      .eqrd-page[dir="rtl"] {
        direction: rtl;
        text-align: right;
      }

      .eqrd-page[dir="ltr"] {
        direction: ltr;
        text-align: left;
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
        text-align: start;
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
      fallback.style.cssText = `position:fixed;inset:0;z-index:99999;background:#F5F7FF;overflow:auto;direction:${dashboardDir()};`;
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
      <div class="eqrd-page" id="eqrdDashboard" dir="${dashboardDir()}">
        <div class="eqrd-loader">
          <div class="eqrd-spinner"></div>
          <div>${txt('جاري تجهيز لوحة المراقبة...', 'Preparing dashboard...')}</div>
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
      throw new Error(txt('لا يوجد business_id للمستخدم الحالي', 'No business_id found for the current user'));
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

  function getRequestSource(req) {
    return req?.request_source || req?.source || req?.source_type || '';
  }

  function isWalkInSource(source) {
    return source === 'walk_in';
  }

  function isOnlineBookingSource(source) {
    return source === 'web_booking' || source === 'booking_page' || source === 'online' || source === 'qr_code';
  }

  function isSeatedOrServed(req) {
    return ['offered', 'reserved', 'occupied', 'cleaning', 'completed'].includes(req?.status);
  }

  function isLostRequest(req) {
    return ['cancelled', 'expired', 'no_show'].includes(req?.status);
  }

  function getRequestSource(req) {
    return req?.request_source || req?.source || req?.source_type || '';
  }

  function isWalkInSource(source) {
    return source === 'walk_in';
  }

  function isOnlineBookingSource(source) {
    return source === 'web_booking' || source === 'booking_page' || source === 'online' || source === 'qr_code';
  }

  function isSeatedOrServed(req) {
    return ['offered', 'reserved', 'occupied', 'cleaning', 'completed'].includes(req?.status);
  }

  function isLostRequest(req) {
    return ['cancelled', 'expired', 'no_show'].includes(req?.status);
  }

  function getRequestSource(req) {
    return req?.request_source || req?.source || req?.source_type || '';
  }

  function isWalkInSource(source) {
    return source === 'walk_in';
  }

  function isOnlineBookingSource(source) {
    return source === 'web_booking' || source === 'booking_page' || source === 'online' || source === 'qr_code';
  }

  function isSeatedOrServed(req) {
    return ['offered', 'reserved', 'occupied', 'cleaning', 'completed'].includes(req?.status);
  }

  function isLostRequest(req) {
    return ['cancelled', 'expired', 'no_show'].includes(req?.status);
  }

  function getRequestSource(req) {
    return req?.request_source || req?.source || req?.source_type || '';
  }

  function isWalkInSource(source) {
    return source === 'walk_in';
  }

  function isOnlineBookingSource(source) {
    return source === 'web_booking' || source === 'booking_page' || source === 'online' || source === 'qr_code';
  }

  function isSeatedOrServed(req) {
    return ['offered', 'reserved', 'occupied', 'cleaning', 'completed'].includes(req?.status);
  }

  function isLostRequest(req) {
    return ['cancelled', 'expired', 'no_show'].includes(req?.status);
  }

  function getRequestSource(req) {
    return req?.request_source || req?.source || req?.source_type || '';
  }

  function isWalkInSource(source) {
    return source === 'walk_in';
  }

  function isOnlineBookingSource(source) {
    return source === 'web_booking' || source === 'booking_page' || source === 'online' || source === 'qr_code';
  }

  function isSeatedOrServed(req) {
    return ['offered', 'reserved', 'occupied', 'cleaning', 'completed'].includes(req?.status);
  }

  function isLostRequest(req) {
    return ['cancelled', 'expired', 'no_show'].includes(req?.status);
  }

  function sourceLabel(source) {
    if (source === 'walk_in') return txt('محلي', 'Local');
    if (source === 'web_booking') return txt('أونلاين', 'Online');
    if (source === 'booking_page') return txt('رابط الحجز', 'Booking Link');
    if (source === 'qr_code') return 'QR Code';
    if (source === 'restored') return txt('مستعاد', 'Restored');
    if (source === 'whatsapp') return txt('واتساب', 'WhatsApp');
    return source || txt('غير محدد', 'Unknown');
  }

  function getCustomerName(req) {
    return req.customer_name || req.customer_name_snapshot || req.name || req.customer_display_name || txt('عميل', 'Customer');
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

    const walkInRequests = requestsToday.filter((r) => isWalkInSource(getRequestSource(r)));
    const onlineRequests = requestsToday.filter((r) => isOnlineBookingSource(getRequestSource(r)));
    const restoredRequests = requestsToday.filter((r) => getRequestSource(r) === 'restored');

    const otherSourceRequests = requestsToday.filter((r) => {
      const source = getRequestSource(r);
      return !isWalkInSource(source) && !isOnlineBookingSource(source) && source !== 'restored';
    });

    const todayCounts = {
      total: requestsToday.length,
      waiting: requestsToday.filter((r) => r.status === 'waiting').length,
      offered: requestsToday.filter((r) => r.status === 'offered' || r.status === 'reserved').length,
      occupied: requestsToday.filter((r) => r.status === 'occupied').length,
      completed: requestsToday.filter((r) => r.status === 'completed' || r.status === 'cleaning').length,
      cancelled: requestsToday.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length,
      expired: requestsToday.filter((r) => r.status === 'expired').length,
      walkIn: walkInRequests.length,
      online: onlineRequests.length,
      restored: restoredRequests.length,
      otherSource: otherSourceRequests.length,
      walkInPercent: pct(walkInRequests.length, requestsToday.length),
      onlinePercent: pct(onlineRequests.length, requestsToday.length),
      restoredPercent: pct(restoredRequests.length, requestsToday.length),
      otherSourcePercent: pct(otherSourceRequests.length, requestsToday.length),
      seatedWalkIn: walkInRequests.filter(isSeatedOrServed).length,
      seatedOnline: onlineRequests.filter(isSeatedOrServed).length,
      seatedRestored: restoredRequests.filter(isSeatedOrServed).length,
      seatedOther: otherSourceRequests.filter(isSeatedOrServed).length,
      lostWalkIn: walkInRequests.filter(isLostRequest).length,
      lostOnline: onlineRequests.filter(isLostRequest).length,
      lostRestored: restoredRequests.filter(isLostRequest).length,
      lostOther: otherSourceRequests.filter(isLostRequest).length,
      assigned: assignmentsToday.length
    };

    const serviceDone = todayCounts.completed + todayCounts.occupied + todayCounts.offered;
    todayCounts.conversion = pct(serviceDone, todayCounts.total);
    todayCounts.loss = todayCounts.cancelled + todayCounts.expired;
    todayCounts.lossRate = pct(todayCounts.loss, todayCounts.total);

    const operationalToday = buildOperationalToday({
      waitingOnly,
      offeredNow,
      readyNow,
      requestsToday,
      tableCounts,
      expired
    });

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
      operationalToday,
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
      const key = zone || txt('بدون منطقة', 'No Zone');
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
      const z = ensure(t.zone_name || txt('بدون منطقة', 'No Zone'));
      z.totalTables += 1;
      if ((t.status || 'available') === 'available') z.available += 1;
      if (t.status === 'occupied') z.occupied += 1;
      if (t.status === 'reserved') z.reserved += 1;
      if (t.status === 'cleaning') z.cleaning += 1;
    });

    waiting.forEach((w) => {
      const z = ensure(w.zone_name || txt('بدون منطقة', 'No Zone'));
      if (w.status === 'waiting' || w.status === 'offered') z.waiting += 1;
    });

    requestsToday.forEach((r) => {
      const z = ensure(r.zone_name || txt('بدون منطقة', 'No Zone'));
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

  function hasCustomerPhone(req) {
    const phone =
      req?.customer_phone_snapshot ||
      req?.customers?.phone ||
      req?.customer_phone ||
      req?.phone ||
      req?.mobile ||
      req?.phone_number ||
      req?.customer_mobile ||
      '';

    return String(phone).replace(/\D/g, '').length >= 9;
  }

  function buildOperationalToday({ waitingOnly, offeredNow, readyNow, requestsToday, tableCounts, expired }) {
    const waitingOver15 = waitingOnly.filter((r) => minutesBetween(r.created_at) >= 15);
    const waitingOver25 = waitingOnly.filter((r) => minutesBetween(r.created_at) >= 25);
    const noPhoneToday = requestsToday.filter((r) => !hasCustomerPhone(r));
    const activeNow = waitingOnly.length + offeredNow.length;

    let status = txt('مستقر', 'Stable');
    let statusClass = 'ok';
    let statusText = txt('لا توجد مؤشرات حرجة حاليًا.', 'No critical indicators right now.');

    if (waitingOver25.length > 0 || expired.length > 0) {
      status = txt('يحتاج متابعة', 'Needs Follow-up');
      statusClass = 'bad';
      statusText = txt(
        'يوجد عملاء تجاوزوا مدة انتظار عالية أو طلبات منتهية تحتاج مراجعة.',
        'Some customers have waited too long or expired requests need review.'
      );
    } else if (waitingOver15.length > 0 || readyNow.length > 0 || offeredNow.length > 0) {
      status = txt('تحت المراقبة', 'Watch');
      statusClass = 'warn';
      statusText = txt(
        'يوجد عملاء يحتاجون إجراء قريب من الموظف.',
        'Some customers need staff attention soon.'
      );
    }

    const actions = [];

    if (readyNow.length > 0) {
      actions.push({
        icon: 'fa-bolt',
        title: txt('عيّن العملاء الجاهزين', 'Assign ready customers'),
        text: txt(
          `${readyNow.length} عميل لديه طاولة مناسبة الآن.`,
          `${readyNow.length} customer(s) have a suitable table now.`
        ),
        badge: `${readyNow.length}`,
        type: 'ok'
      });
    }

    if (offeredNow.length > 0) {
      actions.push({
        icon: 'fa-chair',
        title: txt('تابع العملاء المعيّنين', 'Follow assigned customers'),
        text: txt(
          `${offeredNow.length} عميل تم تعيينه أو تجهيزه ولم تكتمل خدمته بعد.`,
          `${offeredNow.length} customer(s) have been assigned/prepared and service is not completed yet.`
        ),
        badge: `${offeredNow.length}`,
        type: 'warn'
      });
    }

    if (waitingOver15.length > 0) {
      actions.push({
        icon: 'fa-hourglass-half',
        title: txt('انتظار تجاوز 15 دقيقة', 'Wait exceeded 15 minutes'),
        text: txt(
          `${waitingOver15.length} عميل يحتاج متابعة حتى لا يتحول لفقد.`,
          `${waitingOver15.length} customer(s) need follow-up to avoid losing them.`
        ),
        badge: `${waitingOver15.length}`,
        type: waitingOver25.length > 0 ? 'bad' : 'warn'
      });
    }

    if (noPhoneToday.length > 0) {
      actions.push({
        icon: 'fa-phone-slash',
        title: txt('طلبات بدون رقم جوال', 'Requests without mobile number'),
        text: txt(
          `${noPhoneToday.length} طلب اليوم بدون رقم جوال، قد يصعب التواصل معهم.`,
          `${noPhoneToday.length} request(s) today have no mobile number, which may make contact difficult.`
        ),
        badge: `${noPhoneToday.length}`,
        type: 'warn'
      });
    }

    if (expired.length > 0) {
      actions.push({
        icon: 'fa-triangle-exclamation',
        title: txt('طلبات منتهية تحتاج مراجعة', 'Expired requests need review'),
        text: txt(
          `${expired.length} طلب موجود في قائمة المنتهية.`,
          `${expired.length} request(s) are in the expired list.`
        ),
        badge: `${expired.length}`,
        type: 'bad'
      });
    }

    if (tableCounts.available === 0 && waitingOnly.length > 0) {
      actions.push({
        icon: 'fa-ban',
        title: txt('لا توجد طاولات متاحة', 'No available tables'),
        text: txt(
          `يوجد ${waitingOnly.length} عميل ينتظر ولا توجد طاولات متاحة الآن.`,
          `${waitingOnly.length} customer(s) are waiting and no tables are available now.`
        ),
        badge: `${waitingOnly.length}`,
        type: 'bad'
      });
    }

    if (actions.length === 0) {
      actions.push({
        icon: 'fa-circle-check',
        title: txt('الوضع اليومي جيد', 'Daily status is good'),
        text: txt(
          'لا توجد إجراءات عاجلة في الطابور أو الطلبات الحالية.',
          'No urgent actions in the queue or current requests.'
        ),
        badge: txt('جيد', 'Good'),
        type: 'ok'
      });
    }

    return {
      status,
      statusClass,
      statusText,
      activeNow,
      readyNow: readyNow.length,
      offeredNow: offeredNow.length,
      waitingOver15: waitingOver15.length,
      waitingOver25: waitingOver25.length,
      noPhoneToday: noPhoneToday.length,
      expiredNow: expired.length,
      availableTables: tableCounts.available,
      actions: actions.slice(0, 6)
    };
  }


  function buildAlerts({ tableCounts, waitingOnly, offeredNow, readyNow, todayCounts, longestWait, avgCurrentWait, expired }) {
    const alerts = [];
    const reservationHold = n(window.settings?.reservation_hold_minutes || 10);
    const waitWarning = Math.max(15, reservationHold * 2);

    if (waitingOnly.length > 0 && tableCounts.available === 0) {
      alerts.push({
        type: 'bad',
        icon: 'fa-chair',
        title: txt('لا توجد طاولات متاحة الآن', 'No tables available now'),
        text: txt(
          `يوجد ${waitingOnly.length} عميل في الانتظار بدون طاولات متاحة.`,
          `${waitingOnly.length} customer(s) are waiting with no available tables.`
        )
      });
    }

    if (readyNow.length > 0) {
      alerts.push({
        type: 'ok',
        icon: 'fa-bolt',
        title: txt('عملاء جاهزون للتعيين', 'Customers ready to assign'),
        text: txt(
          `${readyNow.length} عميل لديهم طاولة مناسبة متاحة الآن.`,
          `${readyNow.length} customer(s) have a suitable table available now.`
        )
      });
    }

    if (offeredNow.length > 0) {
      alerts.push({
        type: 'warn',
        icon: 'fa-hourglass-half',
        title: txt('عملاء تم تعيينهم وينتظرون الجلوس', 'Assigned customers waiting to be seated'),
        text: txt(
          `${offeredNow.length} عميل في حالة جاهز/معيّن، راقب وقت الحجز.`,
          `${offeredNow.length} customer(s) are ready/assigned; monitor the reservation timer.`
        )
      });
    }

    if (longestWait >= waitWarning) {
      alerts.push({
        type: 'warn',
        icon: 'fa-clock',
        title: txt('انتظار طويل', 'Long Wait'),
        text: txt(
          `أطول انتظار حاليًا ${fmtMinutes(longestWait)}، والمتوسط ${fmtMinutes(avgCurrentWait)}.`,
          `Longest current wait is ${fmtMinutes(longestWait)}, average is ${fmtMinutes(avgCurrentWait)}.`
        )
      });
    }

    if (todayCounts.lossRate >= 25 && todayCounts.total >= 4) {
      alerts.push({
        type: 'bad',
        icon: 'fa-user-slash',
        title: txt('نسبة فقد عالية اليوم', 'High loss rate today'),
        text: txt(
          `الملغي/المنتهي ${todayCounts.loss} من ${todayCounts.total} طلب (${todayCounts.lossRate}%).`,
          `Cancelled/expired: ${todayCounts.loss} of ${todayCounts.total} requests (${todayCounts.lossRate}%).`
        )
      });
    }

    if (expired.length > 0) {
      alerts.push({
        type: 'warn',
        icon: 'fa-list',
        title: txt('قائمة منتهية تحتاج مراجعة', 'Expired list needs review'),
        text: txt(
          `يوجد ${expired.length} عنصر في قائمة المنتهية حسب البيانات المحملة.`,
          `${expired.length} item(s) in the expired list based on loaded data.`
        )
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        type: 'ok',
        icon: 'fa-circle-check',
        title: txt('الوضع مستقر', 'Operations stable'),
        text: txt(
          'لا توجد مؤشرات حرجة الآن، العمل اليومي يبدو تحت السيطرة.',
          'No critical indicators right now; daily operations look under control.'
        )
      });
    }

    return alerts;
  }


  function buildRecommendations({ tableCounts, waitingOnly, offeredNow, readyNow, todayCounts, alerts }) {
    const out = [];

    if (readyNow.length > 0) {
      out.push(txt(
        'ابدأ بتعيين العملاء الجاهزين لأن لديهم طاولات مناسبة متاحة الآن.',
        'Start by assigning ready customers because suitable tables are available now.'
      ));
    }

    if (offeredNow.length > 0) {
      out.push(txt(
        'راجع العملاء المعيّنين على الطاولات البرتقالية قبل انتهاء مهلة الحجز.',
        'Review assigned customers on reserved tables before the hold time expires.'
      ));
    }

    if (waitingOnly.length > 0 && tableCounts.cleaning > 0) {
      out.push(txt(
        'سرّع إنهاء طاولات التنظيف لأن هناك عملاء في الانتظار.',
        'Speed up cleaning completion because customers are waiting.'
      ));
    }

    if (todayCounts.lossRate >= 20 && todayCounts.total >= 5) {
      out.push(txt(
        'راجع سبب الطلبات الملغية أو المنتهية اليوم، فقد تكون مدة الانتظار أو التواصل غير مناسب.',
        'Review why requests were cancelled or expired today; wait time or contact may be the issue.'
      ));
    }

    if (tableCounts.utilization >= 85 && waitingOnly.length > 0) {
      out.push(txt(
        'الضغط مرتفع: فكر في تقليل مدة حجز الطاولة أو إعادة توزيع الطاولات حسب المناطق.',
        'Pressure is high: consider shortening table hold time or redistributing tables by zones.'
      ));
    }

    if (alerts.length === 1 && alerts[0].type === 'ok') {
      out.push(txt(
        'استمر بالمراقبة الدورية، وركز على الحفاظ على سرعة تعيين العملاء الجاهزين.',
        'Continue periodic monitoring and keep ready-customer assignment fast.'
      ));
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
      return {
        label: txt('ضغط عالي', 'High Pressure'),
        className: 'bad',
        text: txt(
          'يوجد مؤشر يحتاج تدخل سريع من مسؤول المطعم.',
          'There is an indicator that needs quick manager attention.'
        )
      };
    }

    if (warnAlerts > 0 || tableCounts.busyRate >= 80 || todayCounts.lossRate >= 15) {
      return {
        label: txt('تحت المراقبة', 'Watch'),
        className: 'warn',
        text: txt(
          'العمل جيد لكن هناك نقاط تحتاج متابعة خلال الوردية.',
          'Operations are good, but some items need monitoring during the shift.'
        )
      };
    }

    return {
      label: txt('مستقر', 'Stable'),
      className: 'ok',
      text: txt(
        'الوضع الحالي مستقر ولا توجد مؤشرات حرجة.',
        'Current operations are stable with no critical indicators.'
      )
    };
  }


  function renderDashboard(data, view) {
    const title = view === 'today'
      ? txt('ملخص اليوم', 'Today Summary')
      : txt('لوحة مراقبة المطعم', 'Restaurant Dashboard');

    const subtitle = view === 'today'
      ? txt(
          'مؤشرات العمل اليومي، الطلبات، الطاولات، والتنبيهات التشغيلية',
          'Daily operations, requests, tables, and operational alerts'
        )
      : txt(
          'نظرة شاملة تساعد مسؤول المطعم على متابعة التشغيل لحظة بلحظة',
          'A real-time overview to help restaurant managers monitor operations'
        );

    const body = `
      <div class="eqrd-page" id="eqrdDashboard" data-view="${esc(view)}" dir="${dashboardDir()}">
        ${heroHtml(data)}
        ${tabsHtml(view)}
        ${view === 'today' ? todayViewHtml(data) : overviewViewHtml(data)}
      </div>
    `;

    openPanel(title, subtitle, body);
  }


  function heroHtml(data) {
    const updated = EQD.loadedAt
      ? EQD.loadedAt.toLocaleTimeString(isAr() ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : '—';

    return `
      <section class="eqrd-hero">
        <div style="position:relative;z-index:1;">
          <h2>${txt('لوحة مراقبة EASY-Q', 'EASY-Q Dashboard')}</h2>
          <p>
            ${txt(
              'تجمع حالة الطاولات، ضغط الطابور، أداء اليوم، العملاء الجاهزين، والتنبيهات التشغيلية في مكان واحد لمسؤول المطعم.',
              'Combines table status, queue pressure, daily performance, ready customers, and operational alerts in one place.'
            )}
          </p>
          <div class="eqrd-hero-actions">
            <button class="eqrd-btn primary" onclick="EQRestaurantDashboard.refresh()">
              <i class="fas fa-sync-alt"></i>
              ${txt('تحديث الآن', 'Refresh Now')}
            </button>
          </div>
        </div>

        <div class="eqrd-health-card">
          <div class="eqrd-health-title">${txt('حالة التشغيل الآن', 'Current Operating Status')}</div>
          <div class="eqrd-health-value">
            <span class="eqrd-health-dot ${esc(data.health.className)}"></span>
            <span>${esc(data.health.label)}</span>
          </div>
          <p style="margin-top:10px;">${esc(data.health.text)}</p>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <span class="eqrd-badge info">${txt('آخر تحديث:', 'Last update:')} ${esc(updated)}</span>
            <span class="eqrd-badge wait">${txt('تحديث تلقائي كل', 'Auto refresh every')} ${Math.round(EQD.autoRefreshMs / 1000)} ${txt('ث', 's')}</span>
          </div>
        </div>
      </section>
    `;
  }


  function tabsHtml(view) {
    return `
      <div class="eqrd-tabs">
        <button class="eqrd-tab ${view === 'overview' ? 'active' : ''}" onclick="EQRestaurantDashboard.setView('overview')">
          <i class="fas fa-chart-pie"></i> ${txt('نظرة عامة', 'Overview')}
        </button>
        <button class="eqrd-tab ${view === 'today' ? 'active' : ''}" onclick="EQRestaurantDashboard.setView('today')">
          <i class="fas fa-calendar-day"></i> ${txt('ملخص اليوم', 'Today Summary')}
        </button>
      </div>
    `;
  }


  function overviewViewHtml(data) {
    return `
      <div class="eqrd-grid">
        ${kpiCard('fa-users', txt('الطابور الآن', 'Queue Now'), data.waitingOnly.length, `${txt('متوسط الانتظار', 'Average Wait')} ${fmtMinutes(data.avgCurrentWait)}`, [
          [txt('جاهزون', 'Ready'), data.readyNow.length],
          [txt('معيّنون', 'Assigned'), data.offeredNow.length]
        ])}

        ${kpiCard('fa-chair', txt('الطاولات المتاحة', 'Available Tables'), data.tableCounts.available, `${txt('من أصل', 'Out of')} ${data.tableCounts.usable} ${txt('طاولة عاملة', 'active tables')}`, [
          [txt('مشغولة', 'Occupied'), data.tableCounts.occupied],
          [txt('تنظيف', 'Cleaning'), data.tableCounts.cleaning]
        ])}

        ${progressCard('fa-fire', txt('استغلال الطاولات', 'Table Utilization'), `${data.tableCounts.utilization}%`, txt('نسبة الطاولات المشغولة حاليًا', 'Current occupied-table ratio'), data.tableCounts.utilization)}

        ${kpiCard('fa-calendar-check', txt('طلبات اليوم', 'Today Requests'), data.todayCounts.total, `${txt('نسبة التحويل', 'Conversion Rate')} ${data.todayCounts.conversion}%`, [
          [txt('جلس/خدمة', 'Seated/Served'), data.todayCounts.completed + data.todayCounts.occupied],
          [txt('فقد', 'Lost'), data.todayCounts.loss]
        ])}

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-triangle-exclamation"></i> ${txt('التنبيهات الذكية', 'Smart Alerts')}</div>
              <div class="eqrd-card-sub">${txt('أهم ما يحتاج انتباه مسؤول المطعم الآن', 'What needs the manager attention now')}</div>
            </div>
          </div>
          ${alertsHtml(data.alerts)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-list-check"></i> ${txt('أولويات التنفيذ', 'Execution Priorities')}</div>
              <div class="eqrd-card-sub">${txt('من يجب التعامل معه أولًا', 'Who should be handled first')}</div>
            </div>
          </div>
          ${priorityHtml(data)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-map-location-dot"></i> ${txt('المناطق', 'Zones')}</div>
              <div class="eqrd-card-sub">${txt('ضغط الانتظار والطاولات حسب المنطقة', 'Queue and table pressure by zone')}</div>
            </div>
          </div>
          ${zonesHtml(data.zones)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-layer-group"></i> ${txt('الطوابق', 'Floors')}</div>
              <div class="eqrd-card-sub">${txt('توزيع الطاولات حسب الدور', 'Table distribution by floor')}</div>
            </div>
          </div>
          ${floorsHtml(data.floors)}
        </div>

        <div class="eqrd-card full">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-lightbulb"></i> ${txt('توصيات تشغيلية', 'Operational Recommendations')}</div>
              <div class="eqrd-card-sub">${txt('اقتراحات مباشرة لتحسين الوردية الحالية', 'Direct suggestions to improve the current shift')}</div>
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
        ${kpiCard('fa-receipt', txt('إجمالي طلبات اليوم', 'Total Requests Today'), data.todayCounts.total, txt('منذ بداية اليوم', 'Since start of day'), [
          [txt('محلي', 'Local'), data.todayCounts.walkIn],
          [txt('أونلاين', 'Online'), data.todayCounts.online]
        ])}

        ${kpiCard('fa-user-check', txt('تمت خدمتهم/نشط', 'Served/Active'), data.todayCounts.completed + data.todayCounts.occupied, `${txt('متوسط الانتظار', 'Average Wait')} ${fmtMinutes(data.avgTodayWait)}`, [
          [txt('تعيينات', 'Assignments'), data.todayCounts.assigned],
          [txt('جاهز الآن', 'Ready Now'), data.todayCounts.offered]
        ])}

        ${progressCard('fa-arrow-trend-up', txt('تحويل الطلبات', 'Request Conversion'), `${data.todayCounts.conversion}%`, txt('طلبات وصلت للخدمة أو التعيين', 'Requests that reached service or assignment'), data.todayCounts.conversion)}

        ${progressCard('fa-user-slash', txt('الفقد اليوم', 'Today Loss'), `${data.todayCounts.lossRate}%`, `${data.todayCounts.loss} ${txt('ملغي/منتهي', 'cancelled/expired')}`, data.todayCounts.lossRate)}

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-users-viewfinder"></i> ${txt('مصادر العملاء اليوم', 'Customer Sources Today')}</div>
              <div class="eqrd-card-sub">${txt('تمييز سريع بين العميل المحلي وحجز صفحة الأونلاين', 'Quick split between local walk-ins and online bookings')}</div>
            </div>
          </div>
          ${sourceBreakdownHtml(data)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-tower-broadcast"></i> ${txt('مركز المتابعة الفورية', 'Live Monitoring Center')}</div>
              <div class="eqrd-card-sub">${txt('إشارات تشغيلية سريعة لا تدخل ضمن التقارير التحليلية', 'Quick operational signals separate from deep reports')}</div>
            </div>
            <span class="eqrd-badge ${esc(data.operationalToday.statusClass)}">${esc(data.operationalToday.status)}</span>
          </div>
          ${operationalTodayHtml(data.operationalToday)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-clock-rotate-left"></i> ${txt('أحدث الطلبات', 'Latest Requests')}</div>
              <div class="eqrd-card-sub">${txt('آخر حركة على طلبات المطعم', 'Latest activity on restaurant requests')}</div>
            </div>
          </div>
          ${recentRequestsHtml(data.recentRequests)}
        </div>

        <div class="eqrd-card wide">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-chart-simple"></i> ${txt('ملخص الحالات اليوم', 'Today Status Summary')}</div>
              <div class="eqrd-card-sub">${txt('تفصيل سريع حسب حالة الطلب', 'Quick breakdown by request status')}</div>
            </div>
          </div>
          ${todayStatusTableHtml(data)}
        </div>

        <div class="eqrd-card full">
          <div class="eqrd-card-head">
            <div>
              <div class="eqrd-card-title"><i class="fas fa-map-location-dot"></i> ${txt('أداء المناطق اليوم', 'Zone Performance Today')}</div>
              <div class="eqrd-card-sub">${txt('عدد الطلبات ومتوسط الانتظار حسب المنطقة', 'Request count and average wait by zone')}</div>
            </div>
          </div>
          ${zonesTableHtml(data.zones)}
        </div>
      </div>
    `;
  }


  function operationalTodayHtml(info) {
    if (!info) return `<div class="eqrd-empty">${txt('لا توجد بيانات تشغيلية كافية', 'Not enough operational data')}</div>`;

    return `
      <div class="eqrd-list">
        <div class="eqrd-list-item">
          <div class="eqrd-icon-box"><i class="fas fa-gauge-high"></i></div>
          <div>
            <div class="eqrd-list-title">${txt('حالة المتابعة:', 'Monitoring Status:')} ${esc(info.status)}</div>
            <div class="eqrd-list-sub" style="white-space:normal;line-height:1.6;">${esc(info.statusText)}</div>
          </div>
          <span class="eqrd-badge ${esc(info.statusClass)}">${esc(info.activeNow)} ${txt('نشط', 'active')}</span>
        </div>

        <div class="eqrd-mini-row" style="margin-top:10px;">
          <div class="eqrd-mini-stat">
            <div class="eqrd-mini-num">${esc(info.readyNow)}</div>
            <div class="eqrd-mini-label">${txt('جاهز للتعيين', 'Ready to Assign')}</div>
          </div>
          <div class="eqrd-mini-stat">
            <div class="eqrd-mini-num">${esc(info.offeredNow)}</div>
            <div class="eqrd-mini-label">${txt('معيّن/جاهز', 'Assigned/Ready')}</div>
          </div>
          <div class="eqrd-mini-stat">
            <div class="eqrd-mini-num">${esc(info.waitingOver15)}</div>
            <div class="eqrd-mini-label">${txt('فوق 15 دقيقة', 'Over 15 min')}</div>
          </div>
          <div class="eqrd-mini-stat">
            <div class="eqrd-mini-num">${esc(info.noPhoneToday)}</div>
            <div class="eqrd-mini-label">${txt('بدون جوال', 'No Mobile')}</div>
          </div>
        </div>

        ${info.actions.map((item) => `
          <div class="eqrd-alert ${esc(item.type)}" style="margin-top:10px;">
            <i class="fas ${esc(item.icon)}"></i>
            <div>
              <div class="eqrd-list-title">${esc(item.title)}</div>
              <div class="eqrd-list-sub" style="white-space:normal;line-height:1.6;">${esc(item.text)}</div>
            </div>
            <span class="eqrd-badge ${esc(item.type)}">${esc(item.badge)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }


  function sourceBreakdownHtml(data) {
    const rows = [
      {
        label: txt('محلي من داخل المطعم', 'Local Walk-in'),
        icon: 'fa-user-plus',
        count: data.todayCounts.walkIn,
        percent: data.todayCounts.walkInPercent,
        seated: data.todayCounts.seatedWalkIn,
        lost: data.todayCounts.lostWalkIn
      },
      {
        label: txt('حجز أونلاين / صفحة الحجز', 'Online / Booking Page'),
        icon: 'fa-globe',
        count: data.todayCounts.online,
        percent: data.todayCounts.onlinePercent,
        seated: data.todayCounts.seatedOnline,
        lost: data.todayCounts.lostOnline
      },
      {
        label: txt('مسترجع', 'Restored'),
        icon: 'fa-clock-rotate-left',
        count: data.todayCounts.restored,
        percent: data.todayCounts.restoredPercent,
        seated: data.todayCounts.seatedRestored,
        lost: data.todayCounts.lostRestored
      },
      {
        label: txt('مصادر غير مصنفة', 'Unclassified Sources'),
        icon: 'fa-layer-group',
        count: data.todayCounts.otherSource,
        percent: data.todayCounts.otherSourcePercent,
        seated: data.todayCounts.seatedOther,
        lost: data.todayCounts.lostOther
      }
    ];

    return `
      <div class="eqrd-list">
        ${rows.map((row) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas ${row.icon}"></i></div>
            <div>
              <div class="eqrd-list-title">${esc(row.label)} — ${esc(row.count)} ${txt('طلب', 'request')}</div>
              <div class="eqrd-list-sub">${txt('جلس/خدمة', 'Seated/Served')}: ${esc(row.seated)} — ${txt('ملغي/منتهي', 'Cancelled/Expired')}: ${esc(row.lost)} — ${txt('النسبة', 'Ratio')}: ${esc(row.percent)}%</div>
              <div class="eqrd-progress"><span style="width:${pct(row.percent, 100)}%;"></span></div>
            </div>
            <span class="eqrd-badge wait">${esc(row.percent)}%</span>
          </div>
        `).join('')}
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
        <div class="eqrd-kpi-label">${pct(percentValue, 100)}% ${txt('من المؤشر', 'of indicator')}</div>
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
    if (!rows.length) return `<div class="eqrd-empty">${txt('لا يوجد عملاء في الانتظار الآن', 'No customers waiting right now')}</div>`;

    return `
      <div class="eqrd-list">
        ${rows.map((r) => {
          const id = r.request_id || r.id;
          const ready = data.priorities.readyIds.has(id);
          return `
            <div class="eqrd-list-item">
              <div class="eqrd-icon-box"><i class="fas ${ready ? 'fa-bolt' : 'fa-user'}"></i></div>
              <div>
                <div class="eqrd-list-title">${esc(getCustomerName(r))} — ${txt('دور', 'Turn')} ${esc(r.queue_position || '—')}</div>
                <div class="eqrd-list-sub">${esc(r.zone_name || txt('بدون تفضيل', 'No Preference'))} / ${esc(r.requested_party_size || 1)} ${txt('أشخاص', 'people')} / ${txt('انتظار', 'Waiting')} ${fmtMinutes(minutesBetween(r.created_at))}</div>
              </div>
              <span class="eqrd-badge ${ready ? 'ok' : 'wait'}">${ready ? txt('جاهز', 'Ready') : txt('انتظار', 'Waiting')}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }


  function zonesHtml(zones) {
    if (!zones.length) return `<div class="eqrd-empty">${txt('لا توجد مناطق مفعلة أو بيانات كافية', 'No active zones or enough data')}</div>`;

    return `
      <div class="eqrd-list">
        ${zones.slice(0, 7).map((z) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-location-dot"></i></div>
            <div>
              <div class="eqrd-list-title">${esc(z.zone)}</div>
              <div class="eqrd-list-sub">${txt('انتظار', 'Waiting')} ${z.waiting} / ${txt('متاحة', 'Available')} ${z.available} / ${txt('مشغولة', 'Occupied')} ${z.occupied}</div>
              <div class="eqrd-progress"><span style="width:${z.utilization}%;"></span></div>
            </div>
            <span class="eqrd-badge info">${z.utilization}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }


  function floorsHtml(floors) {
    if (!floors.length) return `<div class="eqrd-empty">${txt('لا توجد طوابق مفعلة أو بيانات كافية', 'No active floors or enough data')}</div>`;

    return `
      <div class="eqrd-list">
        ${floors.map((f) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-building"></i></div>
            <div>
              <div class="eqrd-list-title">${txt('الدور', 'Floor')} ${esc(f.floor)}</div>
              <div class="eqrd-list-sub">${txt('متاحة', 'Available')} ${f.available} / ${txt('مشغولة', 'Occupied')} ${f.occupied} / ${txt('محجوزة', 'Reserved')} ${f.reserved} / ${txt('تنظيف', 'Cleaning')} ${f.cleaning}</div>
              <div class="eqrd-progress"><span style="width:${f.utilization}%;"></span></div>
            </div>
            <span class="eqrd-badge info">${f.utilization}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }


  function recommendationsHtml(items) {
    if (!items.length) return `<div class="eqrd-empty">${txt('لا توجد توصيات إضافية الآن', 'No additional recommendations right now')}</div>`;

    return `
      <div class="eqrd-list">
        ${items.map((text, index) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-lightbulb"></i></div>
            <div>
              <div class="eqrd-list-title">${txt('توصية', 'Recommendation')} ${index + 1}</div>
              <div class="eqrd-list-sub" style="white-space:normal;line-height:1.6;">${esc(text)}</div>
            </div>
            <span class="eqrd-badge wait">${txt('تشغيلي', 'Operational')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }


  function recentRequestsHtml(rows) {
    if (!rows.length) return `<div class="eqrd-empty">${txt('لا توجد طلبات حديثة', 'No recent requests')}</div>`;

    return `
      <div class="eqrd-list">
        ${rows.slice(0, 10).map((r) => `
          <div class="eqrd-list-item">
            <div class="eqrd-icon-box"><i class="fas fa-receipt"></i></div>
            <div>
              <div class="eqrd-list-title">${esc(getCustomerName(r))} ${r.booking_code ? `— ${esc(r.booking_code)}` : ''}</div>
              <div class="eqrd-list-sub">${esc(sourceLabel(getRequestSource(r)))} / ${esc(r.zone_name || txt('بدون منطقة', 'No Zone'))} / ${esc(r.requested_party_size || 1)} ${txt('أشخاص', 'people')} / ${fmtDateTime(r.created_at)}</div>
            </div>
            <span class="eqrd-badge ${statusClass(r.status)}">${esc(statusArabic(r.status))}</span>
          </div>
        `).join('')}
      </div>
    `;
  }


  function todayStatusTableHtml(data) {
    const rows = [
      [txt('إجمالي الطلبات', 'Total Requests'), data.todayCounts.total, txt('كل الطلبات التي أنشئت اليوم', 'All requests created today')],
      [txt('محلي من داخل المطعم', 'Local Walk-in'), data.todayCounts.walkIn, txt('أضيفوا يدويًا من موظف المطعم', 'Added manually by restaurant staff')],
      [txt('حجز أونلاين', 'Online Booking'), data.todayCounts.online, txt('دخلوا من صفحة الحجز أو QR', 'Entered from the booking page or QR')],
      [txt('انتظار', 'Waiting'), data.todayCounts.waiting, txt('لا يزالون في الطابور', 'Still in the queue')],
      [txt('جاهز/معيّن', 'Ready/Assigned'), data.todayCounts.offered, txt('تم تعيين أو تجهيز طاولة', 'A table was assigned or prepared')],
      [txt('مشغول الآن', 'Occupied Now'), data.todayCounts.occupied, txt('عملاء على الطاولات', 'Customers at tables')],
      [txt('مكتمل/تنظيف', 'Completed/Cleaning'), data.todayCounts.completed, txt('انتهت الخدمة أو دخلت تنظيف', 'Service ended or table entered cleaning')],
      [txt('ملغي/لم يحضر', 'Cancelled/No Show'), data.todayCounts.cancelled, txt('طلبات فقدت قبل الخدمة', 'Requests lost before service')],
      [txt('منتهي', 'Expired'), data.todayCounts.expired, txt('انتهت مهلة الحجز أو الانتظار', 'Reservation or waiting time expired')]
    ];

    return `
      <div class="eqrd-table-wrap">
        <table class="eqrd-table">
          <thead><tr><th>${txt('الحالة', 'Status')}</th><th>${txt('العدد', 'Count')}</th><th>${txt('التفسير', 'Explanation')}</th></tr></thead>
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
    if (!zones.length) return `<div class="eqrd-empty">${txt('لا توجد بيانات مناطق اليوم', 'No zone data today')}</div>`;

    return `
      <div class="eqrd-table-wrap">
        <table class="eqrd-table">
          <thead>
            <tr>
              <th>${txt('المنطقة', 'Zone')}</th>
              <th>${txt('طلبات اليوم', 'Today Requests')}</th>
              <th>${txt('انتظار الآن', 'Waiting Now')}</th>
              <th>${txt('طاولات متاحة', 'Available Tables')}</th>
              <th>${txt('طاولات مشغولة', 'Occupied Tables')}</th>
              <th>${txt('متوسط الانتظار', 'Average Wait')}</th>
              <th>${txt('استغلال', 'Utilization')}</th>
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
      <div class="eqrd-page" id="eqrdDashboard" dir="${dashboardDir()}">
        <div class="eqrd-card full">
          <div class="eqrd-alert bad">
            <i class="fas fa-triangle-exclamation"></i>
            <div>
              <div class="eqrd-list-title">${txt('تعذر فتح لوحة المراقبة', 'Unable to open dashboard')}</div>
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
      openPanel(
        txt('لوحة مراقبة المطعم', 'Restaurant Dashboard'),
        txt('لا توجد صلاحية كافية', 'Insufficient Permission'),
        errorHtml(txt('ليس لديك صلاحية لعرض لوحة المراقبة.', 'You do not have permission to view the dashboard.'))
      );
      return;
    }

    openPanel(
      EQD.activeView === 'today'
        ? txt('ملخص اليوم', 'Today Summary')
        : txt('لوحة مراقبة المطعم', 'Restaurant Dashboard'),
      txt('جاري تحميل مؤشرات التشغيل', 'Loading operational indicators'),
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
      openPanel(
        txt('لوحة مراقبة المطعم', 'Restaurant Dashboard'),
        txt('تعذر تحميل البيانات', 'Unable to load data'),
        errorHtml(err.message || txt('حدث خطأ غير متوقع', 'An unexpected error occurred'))
      );
    }
  }


  async function refreshDashboard() {
    const btns = $$('#eqrdDashboard .eqrd-btn');
    btns.forEach((btn) => {
      if (btn.textContent.includes('تحديث') || btn.textContent.includes('Refresh')) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${txt('جاري التحديث', 'Refreshing')}`;
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
