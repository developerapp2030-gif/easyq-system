/* ============================================================
   EASY-Q Restaurant Reservations Center
   ملف مستقل لقسم الحجوزات
   - تقويم الحجوزات لمدة أقصاها 60 يوم
   - القادمة
   - الحجوزات المكتملة / الملغية / لم يحضر
   - إضافة / تعديل / إلغاء حجز
   - تصدير CSV
   - يدعم العربية والإنجليزية
   ملاحظة: يحتاج جدول Supabase باسم restaurant_reservations
   ============================================================ */

(function () {
  'use strict';

  const TABLE_NAME = 'restaurant_reservations';
  const MAX_DAYS_AHEAD = 60;

  const EQR = {
    view: 'calendar',
    monthOffset: 0,
    search: '',
    statusFilter: 'all',
    zoneFilter: 'all',
    data: [],
    loading: false,
    lastError: null,
    editingId: null,
    cancellingId: null,
    datePickerMonthOffset: 0,
    permissionCache: null,
    permissionRole: null,
    permissionsLoading: null
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function lang() {
    return String(
      window.currentLang ||
      localStorage.getItem('hajzak_lang') ||
      localStorage.getItem('easyq_lang') ||
      'ar'
    ).toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function isAr() {
    return lang() === 'ar';
  }

  function t(arText, enText) {
    return isAr() ? arText : enText;
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function n(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function getBusinessId() {
    const candidates = [
      window.currentBusinessProfile?.id,
      window.currentBusiness?.id,
      window.currentUser?.business_id,
      window.BUSINESS_ID
    ];

    return candidates.find((item) => {
      const v = String(item || '').trim();
      return v && v !== 'undefined' && v !== 'null';
    }) || null;
  }

  const RESERVATION_PERMISSION_KEYS = [
    'manage_reservations',
    'view_reservations',
    'add_reservations',
    'edit_reservations',
    'cancel_reservations',
    'complete_reservations'
  ];

  function getCurrentAppUser() {
    if (window.currentUser) return window.currentUser;

    try {
      if (typeof currentUser !== 'undefined' && currentUser) return currentUser;
    } catch (e) {
      // تجاهل: بعض الصفحات لا تحتوي المتغير القديم
    }

    try {
      const saved = JSON.parse(localStorage.getItem('easyq_user') || 'null');
      return saved || null;
    } catch (e) {
      return null;
    }
  }

  function getReservationPermissionFromCache(permissionKey) {
    return !!(EQR.permissionCache && EQR.permissionCache[permissionKey] === true);
  }

  function hasReservationPermission(...permissionKeys) {
    const user = getCurrentAppUser();
    if (!user) return false;
    if (user.role === 'super_admin') return false;

    // في النظام الحالي admin هو مدير الفرع الأعلى، و canDo يعطيه كل الصلاحيات.
    if (user.role === 'admin') return true;

    if (typeof window.canDo === 'function') {
      if (window.canDo('manage_reservations')) return true;
      if (permissionKeys.some((key) => window.canDo(key))) return true;
    }

    if (getReservationPermissionFromCache('manage_reservations')) return true;
    return permissionKeys.some((key) => getReservationPermissionFromCache(key));
  }

  async function loadReservationPermissions(force = false) {
    const user = getCurrentAppUser();
    if (!user || !user.role || user.role === 'super_admin') {
      EQR.permissionCache = {};
      EQR.permissionRole = null;
      return EQR.permissionCache;
    }

    if (user.role === 'admin') {
      EQR.permissionCache = RESERVATION_PERMISSION_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      EQR.permissionRole = user.role;
      syncReservationSidebarVisibility();
      return EQR.permissionCache;
    }

    if (!force && EQR.permissionCache && EQR.permissionRole === user.role) {
      return EQR.permissionCache;
    }

    if (!window.supabase) {
      return EQR.permissionCache || {};
    }

    if (EQR.permissionsLoading) {
      return EQR.permissionsLoading;
    }

    EQR.permissionsLoading = window.supabase
      .from('role_permissions')
      .select('permission_key,is_enabled')
      .eq('role', user.role)
      .in('permission_key', RESERVATION_PERMISSION_KEYS)
      .then(({ data, error }) => {
        if (error) throw error;

        EQR.permissionCache = {};
        (data || []).forEach((item) => {
          EQR.permissionCache[item.permission_key] = item.is_enabled === true;
        });
        EQR.permissionRole = user.role;
        syncReservationSidebarVisibility();
        return EQR.permissionCache;
      })
      .catch((err) => {
        console.warn('[EASY-Q Reservations] permission load failed:', err);
        EQR.permissionCache = EQR.permissionCache || {};
        return EQR.permissionCache;
      })
      .finally(() => {
        EQR.permissionsLoading = null;
      });

    return EQR.permissionsLoading;
  }

  function canViewReservations() {
    return hasReservationPermission(
      'view_reservations',
      'add_reservations',
      'edit_reservations',
      'cancel_reservations',
      'complete_reservations'
    );
  }

  function canOpenReservations() {
    return canViewReservations();
  }

  function canAddReservations() {
    return hasReservationPermission('add_reservations');
  }

  function canEditReservations() {
    return hasReservationPermission('edit_reservations');
  }

  function canCancelReservations() {
    return hasReservationPermission('cancel_reservations');
  }

  function canCompleteReservations() {
    return hasReservationPermission('complete_reservations');
  }

  function todayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function dateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function timeShort(value) {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    return raw.slice(0, 5);
  }

  function reservationDateTime(row) {
    const date = row?.reservation_date || row?.date || '';
    const time = timeShort(row?.reservation_time || row?.time || '00:00');
    return new Date(`${date}T${time}:00`);
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(isAr() ? 'ar-SA' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function fmtDateTime(row) {
    const date = fmtDate(row?.reservation_date);
    const time = timeShort(row?.reservation_time);
    return `${date} ${time}`;
  }

  function fmtNow() {
    return new Date().toLocaleString(isAr() ? 'ar-SA' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  function generateReservationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let part = '';
    for (let i = 0; i < 6; i++) {
      part += chars[Math.floor(Math.random() * chars.length)];
    }
    return `EQ-R-${part}`;
  }

  function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('966')) return digits;
    if (digits.startsWith('05') && digits.length === 10) return `966${digits.slice(1)}`;
    if (digits.startsWith('5') && digits.length === 9) return `966${digits}`;

    return digits;
  }

  function statusMeta(status) {
    const key = String(status || 'upcoming').toLowerCase();

    const map = {
      upcoming: { ar: 'قادم', en: 'Upcoming', cls: 'info' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed', cls: 'ok' },
      table_hold: { ar: 'طاولة معلقة', en: 'Table Hold', cls: 'hold' },
      seated: { ar: 'تم الجلوس', en: 'Seated', cls: 'ok' },
      completed: { ar: 'مكتمل', en: 'Completed', cls: 'ok' },
      cancelled: { ar: 'ملغي', en: 'Cancelled', cls: 'bad' },
      no_show: { ar: 'لم يحضر', en: 'No-show', cls: 'bad' }
    };

    return map[key] || map.upcoming;
  }

  function showToast(message, type = 'info') {
    if (typeof window.showSuccessNotification === 'function' && type === 'success') {
      window.showSuccessNotification(message);
      return;
    }

    if (typeof window.showAlert === 'function' && type !== 'success') {
      window.showAlert(message);
      return;
    }

    alert(message);
  }

  function ensureStyles() {
    if ($('eqrStyles')) return;

    const style = document.createElement('style');
    style.id = 'eqrStyles';
    style.textContent = `
      .eqr-page{font-family:inherit;color:#111827;background:#F5F7FF;min-height:calc(100vh - 120px);padding:18px;direction:rtl;text-align:right}
      .eqr-page *{box-sizing:border-box}.eqr-page.eqr-ltr{direction:ltr;text-align:left}.eqr-page.eqr-rtl{direction:rtl;text-align:right}
      .eqr-hero{background:linear-gradient(135deg,#070219,#060427 55%,#0E146D);color:#fff;border-radius:24px;padding:20px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(250px,.75fr);gap:16px;box-shadow:0 18px 45px rgba(15,23,42,.18);overflow:hidden;position:relative}.eqr-hero:after{content:'';position:absolute;inset-inline-end:-90px;top:-100px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.10)}.eqr-hero>*{position:relative;z-index:1}.eqr-hero h2{margin:0 0 8px;font-size:24px;font-weight:1000}.eqr-hero p{margin:0;color:rgba(255,255,255,.76);font-size:13px;font-weight:800;line-height:1.8}
      .eqr-hero-box{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:15px}.eqr-hero-num{font-size:34px;font-weight:1000;line-height:1}.eqr-hero-label{font-size:13px;font-weight:900;color:rgba(255,255,255,.84);margin-top:7px}.eqr-hero-note{font-size:11px;font-weight:800;color:rgba(255,255,255,.68);line-height:1.7;margin-top:8px}
      .eqr-btn,.eqr-chip,.eqr-tab{border:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:0 12px;border-radius:13px;font-size:12px;font-weight:1000;cursor:pointer;transition:.16s ease;white-space:nowrap;font-family:inherit}.eqr-btn:hover,.eqr-chip:hover,.eqr-tab:hover{transform:translateY(-1px)}.eqr-btn.primary{background:#0E146D;color:#fff}.eqr-btn.white{background:#fff;color:#0E146D}.eqr-btn.light{background:#EEF2FF;color:#0E146D}.eqr-btn.gray{background:#F3F4F6;color:#374151}.eqr-btn.danger{background:#FEF2F2;color:#B91C1C}.eqr-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
      .eqr-toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;margin-top:14px;background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:12px;box-shadow:0 10px 26px rgba(15,23,42,.055)}.eqr-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.eqr-search,.eqr-date,.eqr-select,.eqr-input,.eqr-textarea{min-height:38px;border:1px solid #E5E7EB;border-radius:13px;padding:0 11px;background:#F8FAFC;color:#111827;font-weight:900;outline:none;font-family:inherit}.eqr-search{min-width:280px}.eqr-date{width:150px;direction:ltr;text-align:left}.eqr-select{min-width:145px}.eqr-input:focus,.eqr-textarea:focus,.eqr-search:focus,.eqr-date:focus,.eqr-select:focus{border-color:#0E146D;box-shadow:0 0 0 3px rgba(14,20,109,.10);background:#fff}.eqr-textarea{min-height:64px;resize:vertical;padding:10px 11px;line-height:1.6}
      .eqr-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.eqr-card{background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:15px;box-shadow:0 10px 26px rgba(15,23,42,.055);min-width:0}.eqr-card.wide{grid-column:span 2}.eqr-card.full{grid-column:1/-1}.eqr-title{font-size:13px;font-weight:1000;color:#111827;display:flex;align-items:center;gap:8px}.eqr-title i{color:#0E146D}.eqr-sub{font-size:11px;color:#64748B;font-weight:800;line-height:1.7;margin-top:4px}.eqr-num{font-size:31px;font-weight:1000;color:#0F172A;line-height:1;margin-top:10px}.eqr-card.ok .eqr-num{color:#047857}.eqr-card.bad .eqr-num{color:#B91C1C}.eqr-card.info .eqr-num{color:#1D4ED8}.eqr-card.warn .eqr-num{color:#B45309}
      .eqr-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.eqr-tab{background:#fff;border:1px solid #E5E7EB;color:#64748B;border-radius:999px}.eqr-tab.active{background:#0E146D;color:#fff;border-color:#0E146D}.eqr-chip{background:#fff;border:1px solid #E5E7EB;color:#64748B;border-radius:999px}.eqr-chip.active{background:#0E146D;border-color:#0E146D;color:#fff}
      .eqr-table-wrap{overflow:auto;border:1px solid #EEF2F7;border-radius:16px;background:#fff}.eqr-table{width:100%;border-collapse:collapse;min-width:1050px;table-layout:fixed}.eqr-table th,.eqr-table td{padding:10px;border-bottom:1px solid #EEF2F7;text-align:right;font-size:12px;font-weight:850;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.eqr-table th{background:#F8FAFC;color:#64748B;font-weight:1000;position:sticky;top:0}.eqr-page.eqr-ltr .eqr-table th,.eqr-page.eqr-ltr .eqr-table td{text-align:left}.eqr-phone,.eqr-code{direction:ltr;text-align:left!important;font-weight:1000}.eqr-phone{color:#0E146D}.eqr-code{color:#111827}.eqr-actions{display:flex;gap:6px;align-items:center;justify-content:flex-start;flex-wrap:nowrap}.eqr-page.eqr-rtl .eqr-actions{justify-content:flex-end}
      .eqr-badge{min-height:24px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:1000;display:inline-flex;align-items:center;justify-content:center}.eqr-badge.ok{background:#ECFDF5;color:#047857}.eqr-badge.bad{background:#FEF2F2;color:#B91C1C}.eqr-badge.info{background:#EFF6FF;color:#1D4ED8}.eqr-badge.hold{background:#FFF7ED;color:#C2410C}.eqr-badge.muted{background:#F3F4F6;color:#6B7280}
      .eqr-empty{padding:22px;text-align:center;color:#64748B;font-weight:900;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:16px}.eqr-loader{min-height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#64748B;font-weight:1000}.eqr-spinner{width:34px;height:34px;border-radius:50%;border:4px solid rgba(14,20,109,.13);border-top-color:#0E146D;animation:eqrSpin .8s linear infinite}@keyframes eqrSpin{to{transform:rotate(360deg)}}
      .eqr-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-top:14px}.eqr-day-name{font-size:11px;font-weight:1000;color:#64748B;text-align:center}.eqr-day{min-height:96px;background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:9px;box-shadow:0 8px 20px rgba(15,23,42,.045);cursor:pointer;transition:.15s ease;display:flex;flex-direction:column;gap:7px}.eqr-day:hover{transform:translateY(-1px);border-color:#0E146D}.eqr-day.out{opacity:.35}.eqr-day.today{border-color:#0E146D;box-shadow:0 0 0 3px rgba(14,20,109,.08)}.eqr-day-number{font-size:13px;font-weight:1000;color:#111827}.eqr-day-mark{margin-top:auto;display:flex;align-items:center;gap:5px;flex-wrap:wrap}.eqr-dot{width:8px;height:8px;border-radius:50%;background:#0E146D}.eqr-count{font-size:10px;font-weight:1000;background:#EEF2FF;color:#0E146D;border-radius:999px;padding:2px 7px}.eqr-day-list{font-size:10px;font-weight:900;color:#475569;line-height:1.55;display:grid;gap:3px}.eqr-day-list div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .eqr-modal-backdrop{position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,.42);display:none;align-items:flex-start;justify-content:center;padding:18px 12px 12px;overflow:auto}.eqr-modal-backdrop.show{display:flex}.eqr-modal{width:min(560px,calc(100vw - 24px));background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.26);border:1px solid rgba(15,23,42,.08);margin-top:8px}.eqr-modal-head{background:linear-gradient(135deg,#0E146D,#060427);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}.eqr-modal-title{font-size:17px;font-weight:1000}.eqr-modal-sub{font-size:11.5px;font-weight:800;color:rgba(255,255,255,.72);margin-top:3px}.eqr-modal-x{width:34px;height:34px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-size:19px}.eqr-form{padding:14px;display:grid;gap:10px}.eqr-field label{display:block;font-size:12px;font-weight:1000;color:#334155;margin-bottom:6px}.eqr-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.eqr-stepper{display:flex;align-items:center;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:13px;height:40px;overflow:hidden}.eqr-stepper button{width:40px;height:40px;border:none;background:#EEF2FF;color:#0E146D;font-weight:1000;font-size:17px;cursor:pointer}.eqr-stepper span{flex:1;text-align:center;font-weight:1000;color:#111827}.eqr-modal-actions{display:flex;gap:10px;justify-content:flex-end;padding:0 14px 14px}.eqr-page.eqr-rtl .eqr-modal-actions{justify-content:flex-start}
      .eqr-modal.compact{width:min(492px,calc(100vw - 24px));border-radius:20px}.eqr-modal.compact .eqr-modal-head{padding:11px 13px}.eqr-modal.compact .eqr-form{padding:12px;gap:8px}.eqr-modal.compact .eqr-form-grid{gap:8px}.eqr-modal.compact .eqr-input,.eqr-modal.compact .eqr-select{min-height:36px;border-radius:12px}.eqr-modal.compact .eqr-textarea{min-height:54px;border-radius:12px}.eqr-modal.compact .eqr-modal-actions{padding:0 12px 12px}.eqr-btn.compact{min-height:30px;padding:0 9px;border-radius:10px;font-size:11px;gap:5px}.eqr-btn.icon-only{width:32px;min-width:32px;height:32px;min-height:32px;padding:0;border-radius:10px}.eqr-stepper{height:36px;border-radius:12px}.eqr-stepper button{width:34px;height:36px}.eqr-modal-x{width:30px;height:30px;border-radius:10px;font-size:18px;line-height:1}.eqr-picker-shell{position:relative}.eqr-picker-button{width:100%;min-height:38px;border:1px solid #E5E7EB;border-radius:13px;background:#F8FAFC;color:#111827;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;font-family:inherit;cursor:pointer}.eqr-picker-button:focus{outline:none;border-color:#0E146D;box-shadow:0 0 0 3px rgba(14,20,109,.10);background:#fff}.eqr-picker-main{display:grid;gap:2px;text-align:inherit}.eqr-picker-greg{font-size:12px;font-weight:1000;color:#0E146D;line-height:1.2}.eqr-picker-hijri{font-size:10.5px;font-weight:1000;color:#047857;line-height:1.2}.eqr-floating-picker{display:none;position:absolute;inset-inline-start:0;top:calc(100% + 6px);width:min(330px,calc(100vw - 42px));background:#fff;border:1px solid #E5E7EB;border-radius:16px;box-shadow:0 20px 55px rgba(15,23,42,.22);z-index:1000005;padding:10px}.eqr-floating-picker.show{display:block}.eqr-picker-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.eqr-picker-month{font-size:12px;font-weight:1000;color:#111827;text-align:center;line-height:1.4}.eqr-picker-nav{width:30px;height:30px;border:none;border-radius:10px;background:#EEF2FF;color:#0E146D;font-weight:1000;cursor:pointer}.eqr-picker-week,.eqr-picker-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.eqr-picker-week span{text-align:center;font-size:9.5px;font-weight:1000;color:#64748B}.eqr-picker-day{min-height:43px;border:1px solid #EEF2F7;background:#F8FAFC;border-radius:11px;display:grid;align-content:center;justify-items:center;gap:1px;cursor:pointer;padding:3px}.eqr-picker-day:hover{border-color:#0E146D;background:#fff}.eqr-picker-day.out{opacity:.35}.eqr-picker-day.disabled{opacity:.28;cursor:not-allowed;background:#F1F5F9}.eqr-picker-day.selected{border-color:#0E146D;box-shadow:0 0 0 2px rgba(14,20,109,.10);background:#EEF2FF}.eqr-picker-day .greg{font-size:12px;font-weight:1000;color:#1D4ED8;line-height:1}.eqr-picker-day .hijri{font-size:9.5px;font-weight:1000;color:#047857;line-height:1}.eqr-time-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:220px;overflow:auto}.eqr-time-option{min-height:32px;border:none;border-radius:11px;background:#F8FAFC;color:#0E146D;font-size:11px;font-weight:1000;cursor:pointer}.eqr-time-option:hover,.eqr-time-option.selected{background:#0E146D;color:#fff}.eqr-cancel-other{display:none}.eqr-cancel-other.show{display:block}.eqr-helper-note{font-size:10.5px;font-weight:800;color:#64748B;margin-top:5px;line-height:1.5}

.eqr-modal-backdrop{align-items:center;padding:18px 12px;overflow:auto}
.eqr-modal{overflow:visible}
.eqr-modal.compact{overflow:visible;max-height:calc(100vh - 36px)}
.eqr-modal.compact .eqr-form{max-height:calc(100vh - 145px);overflow:auto;overflow-x:hidden}
.eqr-field{min-width:0}
.eqr-form-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.eqr-input,.eqr-select,.eqr-date,.eqr-textarea,.eqr-picker-button{width:100%;max-width:100%;min-width:0}
.eqr-stepper{width:100%;min-width:0}
.eqr-picker-shell{position:relative;min-width:0}
.eqr-floating-picker{top:auto;bottom:calc(100% + 8px);inset-inline-start:0;max-width:calc(100vw - 36px)}
.eqr-floating-picker.show{display:block}
.eqr-picker-days{max-height:250px;overflow:auto}
@media(max-height:740px){
  .eqr-modal.compact{max-height:calc(100vh - 20px)}
  .eqr-modal.compact .eqr-form{max-height:calc(100vh - 130px)}
  .eqr-floating-picker{width:min(310px,calc(100vw - 36px))}
  .eqr-picker-day{min-height:38px}
}
@media(max-width:560px){
  .eqr-form-grid{grid-template-columns:1fr}
  .eqr-floating-picker{position:fixed;left:12px;right:12px;bottom:18px;width:auto;max-width:none}
}
      @media(max-width:1180px){.eqr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.eqr-hero{grid-template-columns:1fr}}@media(max-width:720px){.eqr-page{padding:12px}.eqr-grid{grid-template-columns:1fr}.eqr-card.wide{grid-column:span 1}.eqr-search{min-width:100%;width:100%}.eqr-calendar{gap:5px}.eqr-day{min-height:82px;border-radius:13px;padding:7px}.eqr-day-list{display:none}.eqr-form-grid{grid-template-columns:1fr}.eqr-modal{margin-top:0}}
    

/* ============================================================
   تطوير احترافي لنافذة الحجز فقط — مضاف لاحقاً ومحصور تحت
   #eqrReservationModal كي لا يمس نافذة الإلغاء أو الجدول أو
   التقويم أو أي قاعدة مشتركة. لا تغيير في أي ربط أو دالة.
   ============================================================ */
#eqrReservationModal .eqr-modal.compact{width:min(520px,calc(100vw - 24px));border-radius:22px;border:1px solid rgba(14,20,109,.10);box-shadow:0 30px 80px rgba(7,6,30,.34),0 10px 30px rgba(7,6,30,.18);animation:eqrRezPop .26s cubic-bezier(.2,.8,.2,1)}
@keyframes eqrRezPop{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
#eqrReservationModal .eqr-modal-head{padding:16px 18px;background:linear-gradient(135deg,#0E146D,#080430 72%);border-bottom:2px solid #C9A86A;border-radius:22px 22px 0 0;align-items:flex-start}
#eqrReservationModal .eqr-modal-title{font-size:17px;letter-spacing:.2px}
#eqrReservationModal .eqr-modal-sub{margin-top:5px;line-height:1.55}
#eqrReservationModal .eqr-modal-x{width:32px;height:32px;border-radius:11px;background:rgba(255,255,255,.14);display:grid;place-items:center;line-height:1;transition:.18s ease}
#eqrReservationModal .eqr-modal-x:hover{background:rgba(220,38,38,.92);transform:rotate(90deg)}
#eqrReservationModal .eqr-modal.compact .eqr-form{padding:16px 18px;gap:13px}
#eqrReservationModal .eqr-modal.compact .eqr-form-grid{gap:12px}
#eqrReservationModal .eqr-field label{font-size:11.5px;font-weight:900;color:#475569;margin-bottom:7px}
#eqrReservationModal .eqr-input,#eqrReservationModal .eqr-select,#eqrReservationModal .eqr-date,#eqrReservationModal .eqr-picker-button{min-height:42px;border-radius:12px;border-color:#E3E7F0;background:#F7F9FC;font-weight:800;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}
#eqrReservationModal .eqr-textarea{height:40px;min-height:40px;padding:7px 11px;border-radius:12px;border-color:#E3E7F0;background:#F7F9FC;font-weight:700;line-height:1.5;resize:vertical}
#eqrReservationModal{align-items:flex-start;padding-top:14px}
#eqrReservationModal .eqr-time-grid{grid-template-columns:repeat(3,1fr);gap:6px;max-height:240px;padding:2px}
#eqrReservationModal .eqr-time-option{min-height:40px;border:1px solid #E3E7F0;border-radius:10px;background:#F7F9FC;color:#0E146D;font-size:12px;font-weight:900;transition:.14s ease}
#eqrReservationModal .eqr-time-option:hover,#eqrReservationModal .eqr-time-option.selected{background:#0E146D;border-color:#0E146D;color:#fff}
#eqrReservationModal .eqr-form-alert{display:none;margin-bottom:2px;padding:10px 12px;border-radius:11px;background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;font-size:12px;font-weight:900;line-height:1.5}
#eqrReservationModal .eqr-form-alert.show{display:block}
#eqrReservationModal .eqr-time-row{display:flex;align-items:center;gap:6px}
#eqrReservationModal .eqr-time-part{min-width:0;flex:1;text-align:center;padding:0 6px;font-weight:900}
#eqrReservationModal .eqr-time-period{flex:0 0 64px}
#eqrReservationModal .eqr-time-colon{flex:0 0 auto;font-weight:1000;color:#0E146D}
#eqrReservationModal .eqr-input:focus,#eqrReservationModal .eqr-select:focus,#eqrReservationModal .eqr-date:focus,#eqrReservationModal .eqr-textarea:focus,#eqrReservationModal .eqr-picker-button:focus{border-color:#0E146D;background:#fff;box-shadow:0 0 0 3.5px rgba(14,20,109,.12)}
#eqrReservationModal .eqr-stepper{height:42px;border-radius:12px;background:#F7F9FC;border-color:#E3E7F0}
#eqrReservationModal .eqr-stepper button{width:42px;height:42px;background:#EEF1FF;color:#0E146D;font-size:18px;transition:.15s ease}
#eqrReservationModal .eqr-stepper button:hover:not(:disabled){background:#0E146D;color:#fff}
#eqrReservationModal .eqr-stepper span{font-size:15px;font-variant-numeric:tabular-nums}
#eqrReservationModal .eqr-picker-button{padding:6px 12px}
#eqrReservationModal .eqr-picker-button>i{color:#C9A86A}
#eqrReservationModal .eqr-picker-greg{font-size:12.5px}
#eqrReservationModal .eqr-picker-hijri{font-size:10.5px}
#eqrReservationModal .eqr-floating-picker{border-radius:16px;padding:12px;box-shadow:0 24px 60px rgba(7,6,30,.28)}
#eqrReservationModal .eqr-picker-month{font-size:12.5px;font-weight:1000}
#eqrReservationModal .eqr-picker-nav{width:32px;height:32px;border-radius:10px;transition:.15s ease}
#eqrReservationModal .eqr-picker-nav:hover{background:#0E146D;color:#fff}
#eqrReservationModal .eqr-picker-day{min-height:42px;border-radius:10px;transition:.12s ease}
#eqrReservationModal .eqr-picker-day:hover:not(.disabled){border-color:#0E146D;background:#fff;transform:translateY(-1px)}
#eqrReservationModal .eqr-picker-day.selected{background:#0E146D;border-color:#0E146D;box-shadow:0 6px 16px rgba(14,20,109,.28)}
#eqrReservationModal .eqr-picker-day.selected .greg{color:#fff}
#eqrReservationModal .eqr-picker-day.selected .hijri{color:#C9A86A}
#eqrReservationModal .eqr-modal-actions{padding:13px 18px;background:#fff;border-top:1px solid #EEF1F7;border-radius:0 0 22px 22px}
#eqrReservationModal .eqr-modal-actions .eqr-btn{min-height:40px;border-radius:12px;font-size:12.5px}
#eqrReservationModal .eqr-modal-actions .eqr-btn.gray{background:#F3F5F9;color:#475569}
#eqrReservationModal .eqr-modal-actions .eqr-btn.primary{background:linear-gradient(135deg,#0E146D,#161F8C);box-shadow:0 10px 22px rgba(14,20,109,.26)}
#eqrReservationModal .eqr-modal-actions .eqr-btn.primary:hover{filter:brightness(1.06)}
@media(prefers-reduced-motion:reduce){#eqrReservationModal .eqr-modal.compact{animation:none}}
`;

    document.head.appendChild(style);
  }

  function openPanel(title, subtitle, bodyHtml) {
    ensureStyles();

    if (typeof window.openFullPagePanel === 'function') {
      window.openFullPagePanel(title, subtitle, bodyHtml);
      return;
    }

    let fallback = $('eqrFallbackPanel');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'eqrFallbackPanel';
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
        <button onclick="document.getElementById('eqrFallbackPanel').remove()" style="width:38px;height:38px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:white;font-size:20px;cursor:pointer;">×</button>
      </div>
      ${bodyHtml}
    `;
  }

  function titleText() {
    return t('الحجوزات', 'Reservations');
  }

  function subtitleText() {
    return t('تقويم وقائمة الحجوزات القادمة والمكتملة', 'Calendar, upcoming and completed reservations');
  }

  function loadingHtml() {
    return `
      <div class="eqr-page ${isAr() ? 'eqr-rtl' : 'eqr-ltr'}">
        <div class="eqr-loader">
          <div class="eqr-spinner"></div>
          <div>${t('جاري تحميل الحجوزات...', 'Loading reservations...')}</div>
        </div>
      </div>
    `;
  }

  function errorHtml(message) {
    return `
      <div class="eqr-page ${isAr() ? 'eqr-rtl' : 'eqr-ltr'}">
        <div class="eqr-card full">
          <div class="eqr-title"><i class="fas fa-triangle-exclamation"></i>${t('تعذر فتح قسم الحجوزات', 'Unable to open reservations')}</div>
          <div class="eqr-sub">${esc(message || '')}</div>
          <div class="eqr-sub" style="margin-top:10px;">${t('إذا لم يتم إنشاء جدول الحجوزات بعد، أخبرني بعد تجربة الملف وسأعطيك استعلام إنشاء الجدول والسياسات.', 'If the reservations table has not been created yet, tell me after testing and I will provide the table and policies SQL.')}</div>
        </div>
      </div>
    `;
  }

  function maxDateKey() {
    return dateKey(addDays(todayStart(), MAX_DAYS_AHEAD));
  }

  function minDateKey() {
    return dateKey(todayStart());
  }

  function historicalStartKey() {
    return dateKey(addDays(todayStart(), -180));
  }

  async function loadReservations(force = false) {
    if (!force && Array.isArray(EQR.data) && EQR.data.length > 0) {
      return EQR.data;
    }

    if (!window.supabase) {
      throw new Error(t('Supabase غير محمل في الصفحة', 'Supabase is not loaded'));
    }

    const businessId = getBusinessId();
    if (!businessId) {
      throw new Error(t('لم يتم تحديد المطعم الحالي', 'Current business was not detected'));
    }

    const { data, error } = await window.supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('business_id', businessId)
      .gte('reservation_date', historicalStartKey())
      .lte('reservation_date', maxDateKey())
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    if (error) {
      throw new Error(error.message || t('فشل تحميل الحجوزات', 'Failed to load reservations'));
    }

    EQR.data = Array.isArray(data) ? data : [];
    return EQR.data;
  }

  function upcomingRows() {
    const now = new Date();
    const max = addDays(todayStart(), MAX_DAYS_AHEAD + 1);

    return (EQR.data || [])
      .filter((row) => {
        const status = String(row.status || 'upcoming').toLowerCase();
        if (['completed', 'cancelled', 'no_show', 'seated'].includes(status)) return false;
        const dt = reservationDateTime(row);
        return !Number.isNaN(dt.getTime()) && dt >= now && dt < max;
      })
      .sort((a, b) => reservationDateTime(a) - reservationDateTime(b));
  }

  function completedRows() {
    return (EQR.data || [])
      .filter((row) => ['completed', 'cancelled', 'no_show', 'seated'].includes(String(row.status || '').toLowerCase()))
      .sort((a, b) => reservationDateTime(b) - reservationDateTime(a));
  }

  function filterRows(rows) {
    const q = String(EQR.search || '').trim().toLowerCase();
    const st = String(EQR.statusFilter || 'all');
    const zone = String(EQR.zoneFilter || 'all');

    return rows.filter((row) => {
      if (st !== 'all' && String(row.status || 'upcoming') !== st) return false;
      if (zone !== 'all' && String(row.preferred_zone || '') !== zone) return false;

      if (!q) return true;

      const haystack = [
        row.customer_name,
        row.phone,
        row.reservation_code,
        row.preferred_zone,
        row.notes
      ].join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }

  function zonesFromData() {
    const set = new Set();
    (EQR.data || []).forEach((row) => {
      const z = String(row.preferred_zone || '').trim();
      if (z) set.add(z);
    });

    ['Indoor', 'Family', 'VIP', 'Outdoor'].forEach((z) => set.add(z));
    return Array.from(set);
  }

  function zoneLabel(value) {
    const key = String(value || '').trim();
    const map = {
      Indoor: t('داخلي', 'Indoor'),
      Family: t('عائلي', 'Family'),
      VIP: 'VIP',
      Outdoor: t('خارجي', 'Outdoor'),
      Smoking: t('مدخنين', 'Smoking')
    };

    return map[key] || key || t('بدون تفضيل', 'No preference');
  }

  function normalizeReservationZones(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((zone) => String(zone || '').trim())
    .filter(Boolean);
}

async function getReservationActiveZones(force = false) {
  if (!force && Array.isArray(EQR.activeZones) && EQR.activeZones.length > 0) {
    return EQR.activeZones;
  }

  if (typeof window.getActiveZones === 'function') {
    try {
      const zones = normalizeReservationZones(await window.getActiveZones());

      if (zones.length > 0) {
        EQR.activeZones = zones;
        return zones;
      }
    } catch (e) {
      console.warn('[EASY-Q Reservations] getActiveZones failed:', e);
    }
  }

  const businessId = getBusinessId();

  if (window.supabase && businessId) {
    try {
      const { data, error } = await window.supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('business_id', businessId)
        .eq('setting_key', 'active_zones')
        .maybeSingle();

      if (!error && data?.setting_value) {
        const parsed = JSON.parse(data.setting_value);
        const zones = normalizeReservationZones(parsed);

        if (zones.length > 0) {
          EQR.activeZones = zones;
          localStorage.setItem('easyq_zones', JSON.stringify(zones));
          return zones;
        }
      }
    } catch (e) {
      console.warn('[EASY-Q Reservations] active_zones load failed:', e);
    }
  }

  try {
    const saved = normalizeReservationZones(
      JSON.parse(localStorage.getItem('easyq_zones') || '[]')
    );

    if (saved.length > 0) {
      EQR.activeZones = saved;
      return saved;
    }
  } catch (e) {
    // تجاهل
  }

  EQR.activeZones = ['Indoor', 'Outdoor', 'VIP', 'Family', 'Smoking'];
  return EQR.activeZones;
}

function reservationZoneOptionsHtml(selectedZone) {
  const zones = normalizeReservationZones(EQR.activeZones);

  if (!zones.length) {
    return '';
  }

  return zones
    .map((z) => `
      <option value="${esc(z)}" ${String(selectedZone || '') === z ? 'selected' : ''}>
        ${esc(zoneLabel(z))}
      </option>
    `)
    .join('');
}

  function stats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const total = list.length;
    const completed = list.filter((r) => ['completed', 'seated'].includes(String(r.status || '').toLowerCase())).length;
    const cancelled = list.filter((r) => String(r.status || '').toLowerCase() === 'cancelled').length;
    const noShow = list.filter((r) => String(r.status || '').toLowerCase() === 'no_show').length;
    const avgParty = total ? Math.round(list.reduce((sum, r) => sum + n(r.party_size, 0), 0) / total) : 0;

    const hours = {};
    list.forEach((row) => {
      const h = timeShort(row.reservation_time).slice(0, 2);
      if (h) hours[h] = (hours[h] || 0) + 1;
    });

    const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return { total, completed, cancelled, noShow, avgParty, peakHour };
  }

  function card(icon, title, value, sub, cls) {
    return `
      <div class="eqr-card ${cls || ''}">
        <div class="eqr-title"><i class="fas ${icon}"></i>${esc(title)}</div>
        <div class="eqr-num">${esc(value)}</div>
        <div class="eqr-sub">${esc(sub || '')}</div>
      </div>
    `;
  }

  function heroHtml(activeRows) {
    const next = activeRows[0];
    const nextText = next
      ? `${next.customer_name || '—'} · ${timeShort(next.reservation_time)} · ${n(next.party_size, 1)} ${t('مقاعد', 'seats')}`
      : t('لا يوجد حجز قادم', 'No upcoming reservation');

    return `
      <section class="eqr-hero">
        <div>
          <h2>${t('الحجوزات', 'Reservations')}</h2>
          <p>${t(
            'إدارة الحجوزات القادمة خلال 60 يوم، مع تقويم واضح، قائمة قادمة، سجل مكتمل، وإضافة حجز سريعة مناسبة للتابلت.',
            'Manage reservations for the next 60 days with a clear calendar, upcoming list, completed log, and a tablet-friendly quick add modal.'
          )}</p>
          <div class="eqr-row" style="margin-top:14px;">
            <button class="eqr-btn white" onclick="EQRestaurantReservations.refresh()"><i class="fas fa-sync-alt"></i>${t('تحديث', 'Refresh')}</button>
            ${canAddReservations() ? `<button class="eqr-btn white" onclick="EQRestaurantReservations.openAddModal()"><i class="fas fa-plus-circle"></i>${t('إضافة حجز', 'Add Reservation')}</button>` : ''}
            <span class="eqr-badge muted">${t('الحد الأقصى:', 'Limit:')} ${MAX_DAYS_AHEAD} ${t('يوم', 'days')}</span>
            <span class="eqr-badge muted">${t('آخر تحديث:', 'Last updated:')} ${esc(fmtNow())}</span>
          </div>
        </div>
        <div class="eqr-hero-box">
          <div class="eqr-hero-num">${esc(activeRows.length)}</div>
          <div class="eqr-hero-label">${t('حجوزات قادمة', 'Upcoming reservations')}</div>
          <div class="eqr-hero-note">${esc(nextText)}</div>
        </div>
      </section>
    `;
  }

  function toolbarHtml(kind) {
    const zones = zonesFromData();

    return `
      <div class="eqr-toolbar">
        <div class="eqr-row">
          <button class="eqr-chip ${kind === 'calendar' ? 'active' : ''}" onclick="EQRestaurantReservations.open('calendar')"><i class="fas fa-calendar-days"></i>${t('تقويم الحجوزات', 'Reservations Calendar')}</button>
          <button class="eqr-chip ${kind === 'upcoming' ? 'active' : ''}" onclick="EQRestaurantReservations.open('upcoming')"><i class="fas fa-clock"></i>${t('القادمة', 'Upcoming')}</button>
          <button class="eqr-chip ${kind === 'completed' ? 'active' : ''}" onclick="EQRestaurantReservations.open('completed')"><i class="fas fa-circle-check"></i>${t('الحجوزات المكتملة', 'Completed Reservations')}</button>
        </div>
        <div class="eqr-row">
          <input class="eqr-search" id="eqrSearchInput" value="${esc(EQR.search)}" oninput="EQRestaurantReservations.setSearch(this.value)" placeholder="${t('بحث بالاسم أو الجوال أو رقم الحجز', 'Search name, phone, or code')}">
          <select class="eqr-select" onchange="EQRestaurantReservations.setZoneFilter(this.value)">
            <option value="all">${t('كل المناطق', 'All zones')}</option>
            ${zones.map((z) => `<option value="${esc(z)}" ${EQR.zoneFilter === z ? 'selected' : ''}>${esc(zoneLabel(z))}</option>`).join('')}
          </select>
          <button class="eqr-btn light" onclick="EQRestaurantReservations.exportCurrent()"><i class="fas fa-download"></i>${t('تصدير', 'Export')}</button>
        </div>
      </div>
    `;
  }

  function shellHtml(innerHtml, kind) {
    const pageClass = isAr() ? 'eqr-rtl' : 'eqr-ltr';
    const up = upcomingRows();

    return `
      <div class="eqr-page ${pageClass}" id="eqReservationsCenter">
        ${heroHtml(up)}
        ${toolbarHtml(kind)}
        ${innerHtml}
      </div>
    `;
  }

  function monthBaseDate() {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + n(EQR.monthOffset, 0));
    return d;
  }

  function calendarRows() {
    const base = monthBaseDate();
    const start = new Date(base);
    const firstDay = start.getDay();
    const offset = isAr() ? (firstDay + 1) % 7 : firstDay;
    start.setDate(start.getDate() - offset);

    const rows = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      rows.push(d);
    }
    return rows;
  }

  function reservationsByDay() {
    const map = {};
    upcomingRows().forEach((row) => {
      const key = String(row.reservation_date || '');
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });
    return map;
  }

  function calendarHtml() {
    const base = monthBaseDate();
    const days = calendarRows();
    const byDay = reservationsByDay();
    const today = dateKey(new Date());

    const monthLabel = base.toLocaleDateString(isAr() ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long'
    });

    const names = isAr()
      ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const orderedNames = isAr() ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : names;

    return shellHtml(`
      <div class="eqr-card full" style="margin-top:14px;">
        <div class="eqr-row" style="justify-content:space-between;margin-bottom:10px;">
          <div>
            <div class="eqr-title"><i class="fas fa-calendar-days"></i>${esc(monthLabel)}</div>
            <div class="eqr-sub">${t('الأيام التي تحتوي على حجوزات تظهر بعلامة وعدد الحجوزات.', 'Days with reservations show a marker and count.')}</div>
          </div>
          <div class="eqr-row">
            <button class="eqr-btn gray" onclick="EQRestaurantReservations.changeMonth(-1)"><i class="fas fa-chevron-${isAr() ? 'right' : 'left'}"></i>${t('السابق', 'Previous')}</button>
            <button class="eqr-btn light" onclick="EQRestaurantReservations.changeMonth(0)">${t('الشهر الحالي', 'This month')}</button>
            <button class="eqr-btn gray" onclick="EQRestaurantReservations.changeMonth(1)">${t('التالي', 'Next')}<i class="fas fa-chevron-${isAr() ? 'left' : 'right'}"></i></button>
          </div>
        </div>

        <div class="eqr-calendar">
          ${orderedNames.map((name) => `<div class="eqr-day-name">${esc(name)}</div>`).join('')}
          ${days.map((day) => {
            const key = dateKey(day);
            const list = byDay[key] || [];
            const isCurrentMonth = day.getMonth() === base.getMonth();
            const isToday = key === today;
            return `
              <div class="eqr-day ${isCurrentMonth ? '' : 'out'} ${isToday ? 'today' : ''}" onclick="EQRestaurantReservations.openDay('${key}')">
                <div class="eqr-day-number">${day.getDate()}</div>
                <div class="eqr-day-list">
                  ${list.slice(0, 3).map((r) => `<div>${esc(timeShort(r.reservation_time))} · ${esc(r.customer_name || '—')}</div>`).join('')}
                </div>
                ${list.length ? `<div class="eqr-day-mark"><span class="eqr-dot"></span><span class="eqr-count">${list.length}</span></div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `, 'calendar');
  }

  function tableHtml(rows, kind) {
    const list = filterRows(rows);

    if (!list.length) {
      return `<div class="eqr-empty">${t('لا توجد حجوزات مطابقة', 'No matching reservations')}</div>`;
    }

    return `
      <div class="eqr-table-wrap">
        <table class="eqr-table">
          <thead>
            <tr>
              <th style="width:145px;">${t('رقم الحجز', 'Code')}</th>
              <th style="width:160px;">${t('اسم العميل', 'Customer')}</th>
              <th style="width:145px;">${t('الجوال', 'Phone')}</th>
              <th style="width:90px;">${t('المقاعد', 'Seats')}</th>
              <th style="width:130px;">${t('المنطقة', 'Zone')}</th>
              <th style="width:190px;">${t('الموعد', 'Date & time')}</th>
              <th style="width:120px;">${t('الحالة', 'Status')}</th>
              <th style="width:150px;">${t('إجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((row) => rowHtml(row, kind)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function rowHtml(row, kind) {
    const meta = statusMeta(row.status);
    const id = esc(row.id || '');
    const code = esc(row.reservation_code || row.booking_code || '—');
    const phone = esc(row.phone || '—');
    const status = String(row.status || '').toLowerCase();
    const canModify = !['completed', 'cancelled', 'no_show', 'seated'].includes(status);
    const actions = [];

    if (canModify && canEditReservations()) {
      actions.push(`<button class="eqr-btn light compact" onclick="EQRestaurantReservations.openEditModal('${id}')"><i class="fas fa-pen"></i>${t('تعديل', 'Edit')}</button>`);
    }

    if (canModify && canCancelReservations()) {
      actions.push(`<button class="eqr-btn danger compact" onclick="EQRestaurantReservations.openCancelModal('${id}')"><i class="fas fa-ban"></i>${t('إلغاء', 'Cancel')}</button>`);
    }

    if (canModify && canCompleteReservations()) {
      actions.push(`<button class="eqr-btn light compact" onclick="EQRestaurantReservations.completeReservation('${id}')"><i class="fas fa-circle-check"></i>${t('إكمال', 'Complete')}</button>`);
      actions.push(`<button class="eqr-btn gray compact" onclick="EQRestaurantReservations.markNoShow('${id}')"><i class="fas fa-user-clock"></i>${t('لم يحضر', 'No-show')}</button>`);
    }

    if (!canModify && kind === 'completed') {
      actions.push(`<button class="eqr-btn gray compact" onclick="EQRestaurantReservations.openEditModal('${id}', true)"><i class="fas fa-eye"></i>${t('عرض', 'View')}</button>`);
    }

    return `
      <tr>
        <td class="eqr-code">${code}</td>
        <td title="${esc(row.customer_name || '')}">${esc(row.customer_name || '—')}</td>
        <td class="eqr-phone">${phone}</td>
        <td>${esc(n(row.party_size, 1))}</td>
        <td>${esc(zoneLabel(row.preferred_zone))}</td>
        <td>${esc(fmtDateTime(row))}</td>
        <td><span class="eqr-badge ${meta.cls}">${esc(isAr() ? meta.ar : meta.en)}</span></td>
        <td>
          <div class="eqr-actions">
            ${actions.length ? actions.join('') : '<span class="eqr-badge muted">—</span>'}
          </div>
        </td>
      </tr>
    `;
  }

  function upcomingHtml() {
    const rows = upcomingRows();
    const s = stats(rows);

    return shellHtml(`
      <div class="eqr-grid">
        ${card('fa-calendar-check', t('القادمة', 'Upcoming'), s.total, t('خلال 60 يوم', 'Within 60 days'), 'info')}
        ${card('fa-users', t('إجمالي المقاعد', 'Total seats'), rows.reduce((sum, r) => sum + n(r.party_size, 0), 0), t('مقاعد محجوزة', 'Reserved seats'), 'ok')}
        ${card('fa-clock', t('أقرب حجز', 'Next reservation'), rows[0] ? timeShort(rows[0].reservation_time) : '—', rows[0] ? rows[0].customer_name : t('لا يوجد', 'None'), 'warn')}
        ${card('fa-location-dot', t('أكثر منطقة', 'Top zone'), topZone(rows), t('حسب الحجوزات القادمة', 'By upcoming reservations'), '')}
        <div class="eqr-card full">
          <div class="eqr-title"><i class="fas fa-list"></i>${t('الحجوزات القادمة', 'Upcoming Reservations')}</div>
          <div class="eqr-sub">${t('يمكن تعديل تفاصيل الحجز أو إلغاؤه بدون حذف السجل نهائيًا.', 'You can edit or cancel a reservation without permanently deleting its record.')}</div>
          <div style="margin-top:12px;">${tableHtml(rows, 'upcoming')}</div>
        </div>
      </div>
    `, 'upcoming');
  }

  function completedHtml() {
    const rows = completedRows();
    const s = stats(rows);

    return shellHtml(`
      <div class="eqr-grid">
        ${card('fa-circle-check', t('مكتملة', 'Completed'), s.completed, t('تم الجلوس أو اكتمل الحجز', 'Seated or completed'), 'ok')}
        ${card('fa-ban', t('ملغية', 'Cancelled'), s.cancelled, t('حجوزات تم إلغاؤها', 'Cancelled reservations'), 'bad')}
        ${card('fa-user-clock', t('لم يحضر', 'No-show'), s.noShow, t('حجوزات لم يحضر أصحابها', 'Reservations that did not arrive'), 'bad')}
        ${card('fa-chart-simple', t('متوسط المقاعد', 'Average seats'), s.avgParty || '—', t('لكل حجز في السجل', 'Per reservation in log'), 'info')}
        ${card('fa-fire', t('ساعة الذروة', 'Peak hour'), s.peakHour === '—' ? '—' : `${s.peakHour}:00`, t('حسب السجل المعروض', 'Based on shown log'), 'warn')}
        ${card('fa-location-dot', t('أكثر منطقة', 'Top zone'), topZone(rows), t('حسب السجل', 'By log'), '')}
        <div class="eqr-card full">
          <div class="eqr-title"><i class="fas fa-clock-rotate-left"></i>${t('سجل الحجوزات', 'Reservations Log')}</div>
          <div class="eqr-sub">${t('يشمل الحجوزات المكتملة والملغية والتي لم يحضر أصحابها.', 'Includes completed, cancelled, and no-show reservations.')}</div>
          <div style="margin-top:12px;">${tableHtml(rows, 'completed')}</div>
        </div>
      </div>
    `, 'completed');
  }

  function topZone(rows) {
    const counts = {};
    rows.forEach((row) => {
      const z = String(row.preferred_zone || '').trim() || t('بدون تفضيل', 'No preference');
      counts[z] = (counts[z] || 0) + 1;
    });

    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? zoneLabel(top[0]) : '—';
  }

  function openDayHtml(dayKey) {
    const list = upcomingRows().filter((row) => String(row.reservation_date || '') === dayKey);
    const date = fmtDate(dayKey);

    return shellHtml(`
      <div class="eqr-card full" style="margin-top:14px;">
        <div class="eqr-row" style="justify-content:space-between;margin-bottom:12px;">
          <div>
            <div class="eqr-title"><i class="fas fa-calendar-day"></i>${esc(date)}</div>
            <div class="eqr-sub">${t('حجوزات هذا اليوم', 'Reservations for this day')}</div>
          </div>
          <button class="eqr-btn light" onclick="EQRestaurantReservations.open('calendar')"><i class="fas fa-calendar-days"></i>${t('رجوع للتقويم', 'Back to calendar')}</button>
        </div>
        ${tableHtml(list, 'upcoming')}
      </div>
    `, 'calendar');
  }

  function setActiveSidebar(view) {
    const map = {
      calendar: 'reservations-calendar',
      upcoming: 'reservations-upcoming',
      completed: 'reservations-completed',
      add: 'reservations-add'
    };

    $$('.sidebar .sub-menu-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-view') === map[view]);
    });

    const parent = document.querySelector('.main-menu-item[data-menu="reservations"]');
    if (parent) parent.classList.add('open', 'active');

    const submenu = document.querySelector('.sub-menu[data-submenu="reservations"]');
    if (submenu) submenu.classList.add('open');
  }

  function setReservationSidebarItemVisible(dataView, visible) {
    const item = document.querySelector(`.sub-menu-item[data-view="${dataView}"]`);
    if (!item) return;
    item.style.display = visible ? 'flex' : 'none';
  }

  function syncReservationSidebarVisibility() {
    const canView = canViewReservations();
    const canAdd = canAddReservations();

    const parent = document.querySelector('.main-menu-item[data-menu="reservations"]');
    if (parent) parent.style.display = canView ? 'block' : 'none';

    const submenu = document.querySelector('.sub-menu[data-submenu="reservations"]');
    if (submenu) submenu.style.display = canView ? '' : 'none';

    setReservationSidebarItemVisible('reservations-calendar', canView);
    setReservationSidebarItemVisible('reservations-upcoming', canView);
    setReservationSidebarItemVisible('reservations-completed', canView);
    setReservationSidebarItemVisible('reservations-add', canAdd);
  }

  function bindSidebar() {
    syncReservationSidebarVisibility();
    loadReservationPermissions(false).then(syncReservationSidebarVisibility);

    const bindings = {
      'reservations-calendar': () => open('calendar'),
      'reservations-upcoming': () => open('upcoming'),
      'reservations-completed': () => open('completed'),
      'reservations-add': () => {
        setActiveSidebar('add');
        openAddModal();
      }
    };

    Object.entries(bindings).forEach(([dataView, handler]) => {
      const item = document.querySelector(`.sub-menu-item[data-view="${dataView}"]`);
      if (!item || item.dataset.eqrBound === '1') return;

      item.dataset.eqrBound = '1';
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handler();
      });
    });
  }

  async function open(view = 'calendar', force = false) {
    await loadReservationPermissions(force);
    syncReservationSidebarVisibility();

    if (!canOpenReservations()) {
      openPanel(titleText(), subtitleText(), errorHtml(t('ليس لديك صلاحية لفتح قسم الحجوزات', 'You do not have permission to open reservations')));
      return;
    }

    EQR.view = view || 'calendar';
    setActiveSidebar(EQR.view);
    openPanel(titleText(), subtitleText(), loadingHtml());

    try {
      await loadReservations(force);

      if (EQR.view === 'upcoming') {
        openPanel(titleText(), subtitleText(), upcomingHtml());
      } else if (EQR.view === 'completed') {
        openPanel(titleText(), subtitleText(), completedHtml());
      } else {
        openPanel(titleText(), subtitleText(), calendarHtml());
      }
    } catch (err) {
      console.error('[EASY-Q Reservations] open failed:', err);
      EQR.lastError = err.message || String(err);
      openPanel(titleText(), subtitleText(), errorHtml(EQR.lastError));
    }
  }

  function ensureModal() {
    let modal = $('eqrReservationModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'eqrReservationModal';
    modal.className = 'eqr-modal-backdrop';
    document.body.appendChild(modal);
    return modal;
  }

  function modalTitle(readonly) {
    if (readonly) return t('عرض الحجز', 'View Reservation');
    return EQR.editingId ? t('تعديل الحجز', 'Edit Reservation') : t('إضافة حجز', 'Add Reservation');
  }

  async function openAddModal() {
    await loadReservationPermissions(true);
    syncReservationSidebarVisibility();

    if (!canAddReservations()) {
      showToast(t('ليس لديك صلاحية إضافة حجز', 'You do not have permission to add reservations'));
      return;
    }

await getReservationActiveZones(true);

EQR.editingId = null;
renderReservationModal(null, false);
  }

  async function openEditModal(id, readonly = false) {
    if (!readonly) {
      await loadReservationPermissions(true);
      syncReservationSidebarVisibility();
    }

    const row = (EQR.data || []).find((item) => String(item.id) === String(id));
    if (!row) {
      showToast(t('لم يتم العثور على الحجز', 'Reservation was not found'));
      return;
    }

    if (!readonly && !canEditReservations()) {
      showToast(t('ليس لديك صلاحية تعديل الحجز', 'You do not have permission to edit reservations'));
      return;
    }

await getReservationActiveZones(true);

EQR.editingId = readonly ? null : id;
renderReservationModal(row, readonly);
  }

  function renderReservationModal(row, readonly) {
    ensureStyles();

    const modal = ensureModal();
    const code = row?.reservation_code || generateReservationCode();
    const date = row?.reservation_date || minDateKey();
    const time = timeShort(row?.reservation_time || '19:00');
    const party = n(row?.party_size, 2);
    const zone = row?.preferred_zone || '';
    const selectedDate = new Date(`${date}T12:00:00`);
    const today = todayStart();
    EQR.datePickerMonthOffset = Number.isNaN(selectedDate.getTime())
      ? 0
      : Math.max(0, Math.min(2, (selectedDate.getFullYear() - today.getFullYear()) * 12 + selectedDate.getMonth() - today.getMonth()));
    const dateDisplay = datePickerButtonText(date);

    modal.setAttribute('dir', isAr() ? 'rtl' : 'ltr');
    modal.innerHTML = `
      <div class="eqr-modal compact">
        <div class="eqr-modal-head">
          <div>
            <div class="eqr-modal-title">${esc(modalTitle(readonly))}</div>
            <div class="eqr-modal-sub">${t('إنشاء أو تعديل حجز بموعد محدد خلال 60 يوم', 'Create or edit a reservation within 60 days')}</div>
          </div>
          <button class="eqr-modal-x" onclick="EQRestaurantReservations.closeReservationModal()" aria-label="${t('إغلاق', 'Close')}">×</button>
        </div>

        <div class="eqr-form">
          <input type="hidden" id="eqrReservationId" value="${esc(row?.id || '')}">

          <div class="eqr-form-alert" id="eqrFormAlert"></div>

          <div class="eqr-form-grid">
            <div class="eqr-field">
              <label>${t('اسم العميل', 'Customer name')}</label>
              <input class="eqr-input" id="eqrCustomerName" value="${esc(row?.customer_name || '')}" maxlength="40" ${readonly ? 'disabled' : ''}>
            </div>

            <div class="eqr-field">
              <label>${t('رقم الجوال', 'Phone number')}</label>
              <input class="eqr-input" id="eqrPhone" value="${esc(toLocalPhone(row?.phone || ''))}" inputmode="numeric" maxlength="10" placeholder="05XXXXXXXX" oninput="EQRestaurantReservations.handleReservationPhoneInput(this)" ${readonly ? 'disabled' : ''}>
            </div>
          </div>

          <div class="eqr-form-grid">
            <div class="eqr-field">
              <label>${t('رقم الحجز المرجعي', 'Reference code')}</label>
              <input class="eqr-input" id="eqrReservationCode" value="${esc(code)}" maxlength="24" ${readonly || row ? 'disabled' : ''}>
            </div>

            <div class="eqr-field">
              <label>${t('عدد المقاعد', 'Seats')}</label>
              <div class="eqr-stepper">
                <button type="button" onclick="EQRestaurantReservations.changeParty(-1)" ${readonly ? 'disabled' : ''}>-</button>
                <span id="eqrPartyValue">${esc(party)}</span>
                <button type="button" onclick="EQRestaurantReservations.changeParty(1)" ${readonly ? 'disabled' : ''}>+</button>
              </div>
              <input type="hidden" id="eqrPartySize" value="${esc(party)}">
            </div>
          </div>

          <div class="eqr-form-grid">
            <div class="eqr-field">
              <label>${t('تاريخ الحجز', 'Reservation date')}</label>
              <div class="eqr-picker-shell">
                <input type="hidden" id="eqrDate" value="${esc(date)}">
                <button type="button" class="eqr-picker-button" onclick="EQRestaurantReservations.toggleReservationDatePicker()" ${readonly ? 'disabled' : ''}>
                  <span class="eqr-picker-main">
                    <span class="eqr-picker-greg" id="eqrDateButtonMain">${esc(dateDisplay.gregorian)}</span>
                    <span class="eqr-picker-hijri" id="eqrDateButtonHijri">${esc(dateDisplay.hijri || '')}</span>
                  </span>
                  <i class="fas fa-calendar-days"></i>
                </button>
                <div class="eqr-floating-picker" id="eqrDatePicker">
                  ${reservationDatePickerHtml(date)}
                </div>
              </div>
              <div class="eqr-helper-note">${t('الأزرق ميلادي، والأخضر هجري', 'Blue is Gregorian, green is Hijri')}</div>
            </div>

            <div class="eqr-field">
              <label>${t('وقت الحجز', 'Reservation time')}</label>
              <input type="hidden" id="eqrTime" value="${esc(time)}">
              <div class="eqr-time-row">
                ${reservationTimeSelectsHtml(time, readonly)}
              </div>
              <div class="eqr-helper-note">${t('اختر الساعة والدقيقة والفترة (ص/م)', 'Pick hour, minute, and AM/PM')}</div>
            </div>
          </div>

          <div class="eqr-field">
            <label>${t('المنطقة المفضلة', 'Preferred zone')}</label>
            <select class="eqr-select" style="width:100%;" id="eqrZone" ${readonly ? 'disabled' : ''}>
              <option value="">${t('بدون تفضيل', 'No preference')}</option>
              ${reservationZoneOptionsHtml(zone)}
            </select>
          </div>

          <div class="eqr-field">
            <label>${t('ملاحظات', 'Notes')}</label>
            <textarea class="eqr-textarea" id="eqrNotes" rows="1" maxlength="250" ${readonly ? 'disabled' : ''}>${esc(row?.notes || '')}</textarea>
          </div>
        </div>

        <div class="eqr-modal-actions">
          <button class="eqr-btn gray compact" onclick="EQRestaurantReservations.closeReservationModal()">${t('إغلاق', 'Close')}</button>
          ${readonly ? '' : `<button class="eqr-btn primary compact" onclick="EQRestaurantReservations.saveReservation()"><i class="fas fa-save"></i>${EQR.editingId ? t('حفظ التعديلات', 'Save Changes') : t('حفظ الحجز', 'Save Reservation')}</button>`}
        </div>
      </div>
    `;

    modal.classList.add('show');

    if (modal.dataset.datePickerCloseBound !== '1') {
      modal.dataset.datePickerCloseBound = '1';

      modal.addEventListener('click', (event) => {
        const insidePicker = event.target.closest('.eqr-floating-picker');
        const onButton = event.target.closest('.eqr-picker-button');
        if (insidePicker || onButton) return;

        let closedAny = false;
        ['eqrDatePicker', 'eqrTimePicker'].forEach((id) => {
          const p = $(id);
          if (p && p.classList.contains('show')) {
            p.classList.remove('show');
            closedAny = true;
          }
        });
        if (closedAny) closeReservationPickerCleanup();
      });
    }

    setTimeout(() => {
      const name = $('eqrCustomerName');
      if (name && !readonly) name.focus();
    }, 80);
  }

  function closeReservationModal() {
    const modal = $('eqrReservationModal');
    if (modal) modal.classList.remove('show');
    EQR.editingId = null;
  }

  function changeParty(delta) {
    const input = $('eqrPartySize');
    const label = $('eqrPartyValue');
    const next = Math.max(1, Math.min(30, n(input?.value, 1) + n(delta, 0)));

    if (input) input.value = String(next);
    if (label) label.textContent = String(next);
  }

  function readForm() {
    const name = String($('eqrCustomerName')?.value || '').trim();
    const phone = normalizePhone($('eqrPhone')?.value || '');
    const code = String($('eqrReservationCode')?.value || '').trim() || generateReservationCode();
    const party = n($('eqrPartySize')?.value, 1);
    const date = String($('eqrDate')?.value || '').trim();
    const time = String($('eqrTime')?.value || '').trim();
    const zone = String($('eqrZone')?.value || '').trim();
    const notes = String($('eqrNotes')?.value || '').trim();

    return { name, phone, code, party, date, time, zone, notes };
  }

  function validateForm(form) {
    if (!form.name) return t('اسم العميل مطلوب', 'Customer name is required');
    if (!form.phone) return t('رقم الجوال مطلوب', 'Phone number is required');
    if (!/^9665\d{8}$/.test(form.phone)) return t('رقم الجوال يجب أن يكون ١٠ أرقام ويبدأ بـ 05', 'Phone must be 10 digits starting with 05');
    if (!form.date) return t('تاريخ الحجز مطلوب', 'Reservation date is required');
    if (!form.time) return t('وقت الحجز مطلوب', 'Reservation time is required');
    if (form.party < 1) return t('عدد المقاعد غير صحيح', 'Seat count is invalid');

    const selected = new Date(`${form.date}T${form.time}:00`);
    const min = todayStart();
    const max = addDays(todayStart(), MAX_DAYS_AHEAD + 1);

    if (Number.isNaN(selected.getTime())) return t('تاريخ أو وقت الحجز غير صحيح', 'Reservation date or time is invalid');
    if (selected < min) return t('لا يمكن تسجيل حجز بتاريخ سابق', 'Cannot create a reservation in the past');
    if (selected >= max) return t('لا يمكن تسجيل حجز بعد أكثر من 60 يوم', 'Cannot create a reservation more than 60 days ahead');

    return '';
  }

  async function saveReservation() {
    try {
      const form = readForm();
      await loadReservationPermissions(true);
      syncReservationSidebarVisibility();

      if (!EQR.editingId && !canAddReservations()) {
        showToast(t('ليس لديك صلاحية إضافة حجز', 'You do not have permission to add reservations'));
        return;
      }

      if (EQR.editingId && !canEditReservations()) {
        showToast(t('ليس لديك صلاحية تعديل الحجز', 'You do not have permission to edit reservations'));
        return;
      }

      clearReservationAlert();
      const validation = validateForm(form);
      if (validation) {
        showReservationAlert(validation);
        return;
      }

      const businessId = getBusinessId();
      if (!businessId) {
        showToast(t('لم يتم تحديد المطعم الحالي', 'Current business was not detected'));
        return;
      }

      const payload = {
        business_id: businessId,
        reservation_code: form.code,
        customer_name: form.name,
        phone: form.phone,
        party_size: form.party,
        preferred_zone: form.zone || null,
        reservation_date: form.date,
        reservation_time: form.time,
        notes: form.notes || null,
        status: 'upcoming',
        updated_at: new Date().toISOString()
      };

      if (!EQR.editingId) {
        payload.created_by = getCurrentAppUser()?.id || null;
        payload.created_at = new Date().toISOString();
      }

      const query = EQR.editingId
        ? window.supabase.from(TABLE_NAME).update(payload).eq('id', EQR.editingId).eq('business_id', businessId)
        : window.supabase.from(TABLE_NAME).insert(payload);

      const { error } = await query;
      if (error) throw error;

      const wasEditing = Boolean(EQR.editingId);
      EQR.data = [];
      closeReservationModal();
      await open(EQR.view === 'completed' ? 'upcoming' : EQR.view, true);
      showToast(wasEditing ? t('تم حفظ التعديلات', 'Changes saved') : t('تم إضافة الحجز', 'Reservation added'), 'success');
    } catch (err) {
      console.error('[EASY-Q Reservations] save failed:', err);
      showReservationAlert(err.message || t('فشل حفظ الحجز', 'Failed to save reservation'));
    }
  }

  async function updateReservationStatus(id, status, extraFields, successMessage) {
    try {
      if (!canCompleteReservations()) {
        showToast(t('ليس لديك صلاحية إنهاء الحجز', 'You do not have permission to complete reservations'));
        return;
      }

      const businessId = getBusinessId();
      if (!businessId) {
        showToast(t('لم يتم تحديد المطعم الحالي', 'Current business was not detected'));
        return;
      }

      const payload = {
        status,
        ...extraFields,
        updated_at: new Date().toISOString()
      };

      const { error } = await window.supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) throw error;

      EQR.data = [];
      await open(EQR.view || 'upcoming', true);
      showToast(successMessage, 'success');
    } catch (err) {
      console.error('[EASY-Q Reservations] status update failed:', err);
      showToast(err.message || t('فشل تحديث حالة الحجز', 'Failed to update reservation status'));
    }
  }

  function completeReservation(id) {
    updateReservationStatus(
      id,
      'completed',
      { completed_at: new Date().toISOString() },
      t('تم إكمال الحجز', 'Reservation completed')
    );
  }

  function markNoShow(id) {
    updateReservationStatus(
      id,
      'no_show',
      { no_show_at: new Date().toISOString() },
      t('تم تسجيل الحجز كعدم حضور', 'Reservation marked as no-show')
    );
  }

  function cancellationReasonOptions() {
    return [
      { value: 'customer_request', ar: 'طلب العميل الإلغاء', en: 'Customer requested cancellation' },
      { value: 'customer_unreachable', ar: 'تعذر التواصل مع العميل', en: 'Customer could not be reached' },
      { value: 'duplicate_booking', ar: 'حجز مكرر', en: 'Duplicate reservation' },
      { value: 'wrong_date_or_time', ar: 'تاريخ أو وقت غير مناسب', en: 'Wrong date or time' },
      { value: 'restaurant_full', ar: 'عدم توفر طاولات', en: 'No tables available' },
      { value: 'other', ar: 'أخرى', en: 'Other' }
    ];
  }

  function cancellationReasonLabel(value) {
    const item = cancellationReasonOptions().find((reason) => reason.value === value);
    if (!item) return '';
    return isAr() ? item.ar : item.en;
  }

  function handleCancelReasonChange() {
    const select = $('eqrCancelReasonSelect');
    const otherWrap = $('eqrCancelReasonOtherWrap');
    const otherInput = $('eqrCancelReasonOther');
    const showOther = select?.value === 'other';

    if (otherWrap) otherWrap.classList.toggle('show', Boolean(showOther));
    if (otherInput && showOther) {
      setTimeout(() => otherInput.focus(), 50);
    }
  }

  function ensureCancelModal() {
    let modal = $('eqrCancelModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'eqrCancelModal';
    modal.className = 'eqr-modal-backdrop';
    document.body.appendChild(modal);
    return modal;
  }

  function openCancelModal(id) {
    if (!canCancelReservations()) {
      showToast(t('ليس لديك صلاحية إلغاء الحجز', 'You do not have permission to cancel reservations'));
      return;
    }

    const row = (EQR.data || []).find((item) => String(item.id) === String(id));
    if (!row) return;
    EQR.cancellingId = id;

    const modal = ensureCancelModal();
    modal.setAttribute('dir', isAr() ? 'rtl' : 'ltr');
    modal.innerHTML = `
      <div class="eqr-modal compact" style="width:min(430px,calc(100vw - 24px));">
        <div class="eqr-modal-head">
          <div>
            <div class="eqr-modal-title">${t('إلغاء الحجز', 'Cancel Reservation')}</div>
            <div class="eqr-modal-sub">${esc(row.reservation_code || '')} · ${esc(row.customer_name || '')}</div>
          </div>
          <button class="eqr-modal-x" onclick="EQRestaurantReservations.closeCancelModal()" aria-label="${t('إغلاق', 'Close')}">×</button>
        </div>
        <div class="eqr-form">
          <div class="eqr-field">
            <label>${t('سبب الإلغاء', 'Cancellation reason')}</label>
            <select class="eqr-select" style="width:100%;" id="eqrCancelReasonSelect" onchange="EQRestaurantReservations.handleCancelReasonChange()">
              <option value="">${t('اختر سبب الإلغاء', 'Choose cancellation reason')}</option>
              ${cancellationReasonOptions().map((reason) => `<option value="${esc(reason.value)}">${esc(isAr() ? reason.ar : reason.en)}</option>`).join('')}
            </select>
          </div>

          <div class="eqr-field eqr-cancel-other" id="eqrCancelReasonOtherWrap">
            <label>${t('اكتب السبب', 'Write the reason')}</label>
            <textarea class="eqr-textarea" id="eqrCancelReasonOther" maxlength="250" placeholder="${t('اكتب سبب الإلغاء', 'Write cancellation reason')}"></textarea>
          </div>
        </div>
        <div class="eqr-modal-actions">
          <button class="eqr-btn gray compact" onclick="EQRestaurantReservations.closeCancelModal()">${t('رجوع', 'Back')}</button>
          <button class="eqr-btn danger compact" onclick="EQRestaurantReservations.confirmCancelReservation()"><i class="fas fa-ban"></i>${t('حفظ الإلغاء', 'Save Cancel')}</button>
        </div>
      </div>
    `;
    modal.classList.add('show');
  }

  function closeCancelModal() {
    const modal = $('eqrCancelModal');
    if (modal) modal.classList.remove('show');
    EQR.cancellingId = null;
  }

  async function confirmCancelReservation() {
    try {
      const id = EQR.cancellingId;
      if (!id) return;

      if (!canCancelReservations()) {
        showToast(t('ليس لديك صلاحية إلغاء الحجز', 'You do not have permission to cancel reservations'));
        return;
      }

      const businessId = getBusinessId();
      const selectedReason = String($('eqrCancelReasonSelect')?.value || '').trim();
      const otherReason = String($('eqrCancelReasonOther')?.value || '').trim();

      if (!selectedReason) {
        showToast(t('اختر سبب الإلغاء', 'Choose a cancellation reason'));
        return;
      }

      if (selectedReason === 'other' && !otherReason) {
        showToast(t('اكتب سبب الإلغاء', 'Write the cancellation reason'));
        return;
      }

      const reason = selectedReason === 'other'
        ? otherReason
        : cancellationReasonLabel(selectedReason);

      const { error } = await window.supabase
        .from(TABLE_NAME)
        .update({
          status: 'cancelled',
          cancellation_reason: reason || null,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) throw error;

      EQR.data = [];
      closeCancelModal();
      await open(EQR.view || 'upcoming', true);
      showToast(t('تم إلغاء الحجز', 'Reservation cancelled'), 'success');
    } catch (err) {
      console.error('[EASY-Q Reservations] cancel failed:', err);
      showToast(err.message || t('فشل إلغاء الحجز', 'Failed to cancel reservation'));
    }
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportRows(rows, filePrefix) {
    const headers = [
      t('رقم الحجز', 'Code'),
      t('اسم العميل', 'Customer'),
      t('الجوال', 'Phone'),
      t('المقاعد', 'Seats'),
      t('المنطقة', 'Zone'),
      t('التاريخ', 'Date'),
      t('الوقت', 'Time'),
      t('الحالة', 'Status'),
      t('ملاحظات', 'Notes')
    ];

    const csv = [headers.map(csvEscape).join(',')].concat(
      rows.map((row) => {
        const meta = statusMeta(row.status);
        return [
          row.reservation_code || '',
          row.customer_name || '',
          row.phone || '',
          row.party_size || '',
          zoneLabel(row.preferred_zone),
          row.reservation_date || '',
          timeShort(row.reservation_time),
          isAr() ? meta.ar : meta.en,
          row.notes || ''
        ].map(csvEscape).join(',');
      })
    ).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}-${dateKey(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCurrent() {
    if (EQR.view === 'completed') {
      exportRows(filterRows(completedRows()), 'easyq-reservations-completed');
      return;
    }

    exportRows(filterRows(upcomingRows()), 'easyq-reservations-upcoming');
  }

  async function refresh() {
    EQR.data = [];
    return open(EQR.view || 'calendar', true);
  }

  function setSearch(value) {
    EQR.search = value || '';
    if (EQR.view === 'completed') {
      openPanel(titleText(), subtitleText(), completedHtml());
    } else if (EQR.view === 'upcoming') {
      openPanel(titleText(), subtitleText(), upcomingHtml());
    } else {
      openPanel(titleText(), subtitleText(), calendarHtml());
    }
  }

  function setZoneFilter(value) {
    EQR.zoneFilter = value || 'all';
    setSearch(EQR.search);
  }

  function changeMonth(delta) {
    if (delta === 0) {
      EQR.monthOffset = 0;
    } else {
      EQR.monthOffset += n(delta, 0);
      if (EQR.monthOffset < 0) EQR.monthOffset = 0;
      if (EQR.monthOffset > 2) EQR.monthOffset = 2;
    }

    openPanel(titleText(), subtitleText(), calendarHtml());
  }

  function openDay(dayKey) {
    openPanel(titleText(), subtitleText(), openDayHtml(dayKey));
  }

function datePickerButtonText(value) {
  const raw = String(value || '').trim();
  const d = raw ? new Date(`${raw}T00:00:00`) : new Date();

  if (Number.isNaN(d.getTime())) {
    return {
      gregorian: raw || '—',
      hijri: ''
    };
  }

  let hijri = '';

  try {
    hijri = new Intl.DateTimeFormat(isAr() ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    hijri = '';
  }

  return {
    gregorian: d.toLocaleDateString(isAr() ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    hijri
  };
}

function getReservationPickerBaseDate(selectedDate) {
  const raw = String(selectedDate || $('eqrDate')?.value || minDateKey()).trim();
  const base = raw ? new Date(`${raw}T00:00:00`) : todayStart();

  if (Number.isNaN(base.getTime())) {
    return todayStart();
  }

  base.setDate(1);
  base.setMonth(base.getMonth() + n(EQR.reservationDatePickerMonthOffset, 0));

  return base;
}

function reservationDatePickerHtml(selectedDate) {
  const selected = String(selectedDate || $('eqrDate')?.value || minDateKey()).trim();
  const base = getReservationPickerBaseDate(selected);
  const first = new Date(base);
  const start = new Date(first);
  const firstDay = start.getDay();
  const offset = isAr() ? (firstDay + 1) % 7 : firstDay;

  start.setDate(start.getDate() - offset);

  const min = new Date(`${minDateKey()}T00:00:00`);
  const max = new Date(`${maxDateKey()}T00:00:00`);

  const monthLabel = base.toLocaleDateString(isAr() ? 'ar-SA' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });

  const weekNames = isAr()
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = [];

  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);

    const key = dateKey(day);
    const display = datePickerButtonText(key);
    const isCurrentMonth = day.getMonth() === base.getMonth();
    const isSelected = key === selected;
    const disabled = day < min || day > max;

    days.push(`
      <button
        type="button"
        class="eqr-picker-day ${isCurrentMonth ? '' : 'out'} ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
        ${disabled ? 'disabled' : `onclick="EQRestaurantReservations.selectReservationDate('${key}')"`}>
        <span class="greg">${esc(day.getDate())}</span>
        <span class="hijri">${esc(display.hijri)}</span>
      </button>
    `);
  }

  return `
    <div class="eqr-picker-head">
      <button type="button" class="eqr-picker-nav" onclick="EQRestaurantReservations.changeReservationPickerMonth(-1)">
        <i class="fas fa-chevron-${isAr() ? 'right' : 'left'}"></i>
      </button>
      <div class="eqr-picker-month">${esc(monthLabel)}</div>
      <button type="button" class="eqr-picker-nav" onclick="EQRestaurantReservations.changeReservationPickerMonth(1)">
        <i class="fas fa-chevron-${isAr() ? 'left' : 'right'}"></i>
      </button>
    </div>

    <div class="eqr-picker-week">
      ${weekNames.map((name) => `<span>${esc(name)}</span>`).join('')}
    </div>

    <div class="eqr-picker-days" style="margin-top:6px;">
      ${days.join('')}
    </div>
  `;
}

/* ---- مساعدات الجوال (عرض محلي 05 + تقييد الإدخال) ---- */
function toAsciiDigits(str) {
  return String(str || '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

function toLocalPhone(value) {
  let d = toAsciiDigits(value).replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('966')) d = '0' + d.slice(3);
  if (d.startsWith('5')) d = '0' + d;
  return d.slice(0, 10);
}

function handleReservationPhoneInput(el) {
  if (!el) return;
  let v = toAsciiDigits(el.value).replace(/\D/g, '');
  if (v.startsWith('966')) v = '0' + v.slice(3);
  if (v.startsWith('5')) v = '0' + v;
  if (v.length > 10) v = v.slice(0, 10);
  el.value = v;
}

/* ---- تموضع عام لأي قائمة منبثقة (تاريخ/وقت) ---- */
function positionFloatingPicker(picker) {
  if (!picker || !picker.classList.contains('show')) return;

  const shell = picker.closest('.eqr-picker-shell');
  const btn = shell ? shell.querySelector('.eqr-picker-button') : null;
  const card = picker.closest('.eqr-modal');
  if (!btn) return;

  const b = btn.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 10;
  const gap = 6;

  let width = Math.max(300, b.width);
  width = Math.min(width, 360, vw - margin * 2);

  picker.style.position = 'fixed';
  picker.style.width = width + 'px';
  picker.style.maxWidth = (vw - margin * 2) + 'px';
  picker.style.right = 'auto';
  picker.style.bottom = 'auto';
  picker.style.insetInlineStart = 'auto';
  picker.style.zIndex = '1000006';

  const ph = picker.offsetHeight;

  const cardRect = card ? card.getBoundingClientRect() : { top: margin, bottom: vh - margin };
  const head = card ? card.querySelector('.eqr-modal-head') : null;
  const topBound = (head ? head.getBoundingClientRect().bottom : cardRect.top) + 6;
  const bottomBound = Math.min(cardRect.bottom, vh) - 6;

  let top = b.bottom + gap;
  if (top + ph > bottomBound) {
    const up = b.top - gap - ph;
    top = up >= topBound ? up : Math.max(topBound, bottomBound - ph);
  }
  if (top < topBound) top = topBound;
  picker.style.top = top + 'px';

  let left = b.left;
  if (left + width > vw - margin) left = vw - margin - width;
  if (left < margin) left = margin;
  picker.style.left = left + 'px';
}

function positionReservationDatePicker() { positionFloatingPicker($('eqrDatePicker')); }
function positionReservationTimePicker() { positionFloatingPicker($('eqrTimePicker')); }

function _eqrRepositionPicker() {
  positionFloatingPicker($('eqrDatePicker'));
  positionFloatingPicker($('eqrTimePicker'));
}

function bindReservationPickerReposition() {
  window.addEventListener('resize', _eqrRepositionPicker);
  window.addEventListener('scroll', _eqrRepositionPicker, true);
}

function unbindReservationPickerReposition() {
  window.removeEventListener('resize', _eqrRepositionPicker);
  window.removeEventListener('scroll', _eqrRepositionPicker, true);
}

function closeReservationPickerCleanup() {
  unbindReservationPickerReposition();
  ['eqrDatePicker', 'eqrTimePicker'].forEach((id) => {
    const p = $(id);
    if (p && !p.classList.contains('show')) p.style.cssText = '';
  });
}

/* ---- قائمة الوقت المنسدلة ---- */
function reservationTimeLabel(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value || '';
  let h = parseInt(m[1], 10);
  const min = m[2];
  const am = h < 12;
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  const suffix = isAr() ? (am ? 'ص' : 'م') : (am ? 'AM' : 'PM');
  return h12 + ':' + min + ' ' + suffix;
}

function reservationTimePickerHtml(selectedValue) {
  const selected = String(selectedValue || $('eqrTime')?.value || '19:00').slice(0, 5);
  const startMin = 8 * 60;
  const endMin = 23 * 60 + 45;
  const step = 15;
  const opts = [];
  for (let mins = startMin; mins <= endMin; mins += step) {
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const value = hh + ':' + mm;
    const isSel = value === selected;
    opts.push('<button type="button" class="eqr-time-option' + (isSel ? ' selected' : '') + '" onclick="EQRestaurantReservations.selectReservationTime(\'' + value + '\')">' + esc(reservationTimeLabel(value)) + '</button>');
  }
  return '<div class="eqr-time-grid">' + opts.join('') + '</div>';
}

/* ---- تنبيه داخل المودل (يظهر فوق كل شيء، لا خلف المودل) ---- */
function showReservationAlert(message) {
  const box = $('eqrFormAlert');
  if (!box) return;
  box.textContent = message;
  box.classList.add('show');
  const form = box.closest('.eqr-form');
  if (form) form.scrollTop = 0;
}

function clearReservationAlert() {
  const box = $('eqrFormAlert');
  if (box) { box.textContent = ''; box.classList.remove('show'); }
}

/* ---- إدخال الوقت: ساعة / دقيقة / فترة (ص-م) ---- */
function reservationTimeParts(value) {
  const m = String(value || '19:00').match(/^(\d{1,2}):(\d{2})/);
  let h = m ? parseInt(m[1], 10) : 19;
  const min = m ? m[2] : '00';
  const period = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return { h12: h12, min: min, period: period };
}

function reservationTimeSelectsHtml(value, readonly) {
  const p = reservationTimeParts(value);
  const dis = readonly ? 'disabled' : '';
  let hours = '';
  for (let i = 1; i <= 12; i++) hours += '<option value="' + i + '"' + (i === p.h12 ? ' selected' : '') + '>' + i + '</option>';
  let mins = '';
  for (let i = 0; i < 60; i++) { const mm = String(i).padStart(2, '0'); mins += '<option value="' + mm + '"' + (mm === p.min ? ' selected' : '') + '>' + mm + '</option>'; }
  const amSel = p.period === 'AM' ? ' selected' : '';
  const pmSel = p.period === 'PM' ? ' selected' : '';
  return '' +
    '<select class="eqr-select eqr-time-part" id="eqrTimeHour" onchange="EQRestaurantReservations.syncReservationTime()" ' + dis + '>' + hours + '</select>' +
    '<span class="eqr-time-colon">:</span>' +
    '<select class="eqr-select eqr-time-part" id="eqrTimeMinute" onchange="EQRestaurantReservations.syncReservationTime()" ' + dis + '>' + mins + '</select>' +
    '<select class="eqr-select eqr-time-part eqr-time-period" id="eqrTimePeriod" onchange="EQRestaurantReservations.syncReservationTime()" ' + dis + '>' +
      '<option value="AM"' + amSel + '>' + (isAr() ? 'ص' : 'AM') + '</option>' +
      '<option value="PM"' + pmSel + '>' + (isAr() ? 'م' : 'PM') + '</option>' +
    '</select>';
}

function syncReservationTime() {
  const h = $('eqrTimeHour');
  const mn = $('eqrTimeMinute');
  const pr = $('eqrTimePeriod');
  const out = $('eqrTime');
  if (!h || !mn || !pr || !out) return;
  let hour = parseInt(h.value, 10) % 12;
  if (pr.value === 'PM') hour += 12;
  out.value = String(hour).padStart(2, '0') + ':' + mn.value;
}

function toggleReservationDatePicker() {
  const picker = $('eqrDatePicker');
  if (!picker) return;

  EQR.reservationDatePickerMonthOffset = 0;
  picker.innerHTML = reservationDatePickerHtml($('eqrDate')?.value || minDateKey());
  picker.classList.toggle('show');

  if (picker.classList.contains('show')) {
    positionReservationDatePicker();
    bindReservationPickerReposition();
  } else {
    closeReservationPickerCleanup();
  }
}

function changeReservationPickerMonth(delta) {
  const picker = $('eqrDatePicker');
  if (!picker) return;

  EQR.reservationDatePickerMonthOffset = n(EQR.reservationDatePickerMonthOffset, 0) + n(delta, 0);

  if (EQR.reservationDatePickerMonthOffset < 0) {
    EQR.reservationDatePickerMonthOffset = 0;
  }

  if (EQR.reservationDatePickerMonthOffset > 2) {
    EQR.reservationDatePickerMonthOffset = 2;
  }

  picker.innerHTML = reservationDatePickerHtml($('eqrDate')?.value || minDateKey());
  positionReservationDatePicker();
}

function selectReservationDate(value) {
  const input = $('eqrDate');
  const picker = $('eqrDatePicker');
  const main = $('eqrDateButtonMain');
  const hijri = $('eqrDateButtonHijri');
  const display = datePickerButtonText(value);

  if (input) {
    input.value = value;
  }

  if (main) {
    main.textContent = display.gregorian;
  }

  if (hijri) {
    hijri.textContent = display.hijri || '';
  }

  if (picker) {
    picker.classList.remove('show');
    closeReservationPickerCleanup();
  }
}

function toggleReservationTimePicker() {
  const picker = $('eqrTimePicker');
  if (!picker) return;

  picker.innerHTML = reservationTimePickerHtml($('eqrTime')?.value || '19:00');
  picker.classList.toggle('show');

  if (picker.classList.contains('show')) {
    positionReservationTimePicker();
    bindReservationPickerReposition();
    const grid = picker.querySelector('.eqr-time-grid');
    const sel = picker.querySelector('.eqr-time-option.selected');
    if (grid && sel) {
      const gr = grid.getBoundingClientRect();
      const sr = sel.getBoundingClientRect();
      grid.scrollTop += (sr.top - gr.top) - (grid.clientHeight - sel.clientHeight) / 2;
    }
  } else {
    closeReservationPickerCleanup();
  }
}

function selectReservationTime(value) {
  const input = $('eqrTime');
  const picker = $('eqrTimePicker');
  const main = $('eqrTimeButtonMain');

  if (input) input.value = value;
  if (main) main.textContent = reservationTimeLabel(value);

  if (picker) {
    picker.classList.remove('show');
    closeReservationPickerCleanup();
  }
}

  window.EQRestaurantReservations = {
    open,
    refresh,
    openAddModal,
    openEditModal,
    closeReservationModal,
    changeParty,
    toggleReservationDatePicker,
    changeReservationPickerMonth,
    selectReservationDate,
    toggleReservationTimePicker,
    selectReservationTime,
    handleReservationPhoneInput,
    syncReservationTime,
    saveReservation,
    completeReservation,
    markNoShow,
    openCancelModal,
    closeCancelModal,
    handleCancelReasonChange,
    confirmCancelReservation,
    setSearch,
    setZoneFilter,
    changeMonth,
    openDay,
    exportCurrent,
    diagnostics() {
      return { ...EQR, tableName: TABLE_NAME };
    }
  };

  window.openRestaurantReservations = open;
  window.openReservationQuickModal = openAddModal;

  document.addEventListener('DOMContentLoaded', () => {
    bindSidebar();
    loadReservationPermissions(true).then(syncReservationSidebarVisibility);
    setTimeout(bindSidebar, 700);
    setTimeout(bindSidebar, 1800);
  });

  window.addEventListener('load', () => {
    setTimeout(bindSidebar, 600);
    setTimeout(() => loadReservationPermissions(true).then(syncReservationSidebarVisibility), 900);
  });
})();