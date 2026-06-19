// ============================================================
// FORCE PREMIUM THEME ON START
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('theme-premium');
  localStorage.setItem('easyq_premium_theme', 'true');
});

// ============================================================
// SETTINGS FUNCTIONS
// ============================================================

function openSettingsModal() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert('ليس لديك صلاحية لإعدادات التنبيهات والمؤقتات');
    return;
  }

  settingsDraft = { ...settings };
  renderSettingsModal();
  document.getElementById("settingsModal").classList.add("show");
}

function closeSettingsModal() {
  document.getElementById("settingsModal").classList.remove("show");
}

function setReadyMode(mode) {
  settingsDraft.ready_mode = mode;
  renderSettingsModal();
}

function setBoolSetting(key, val) {
  settingsDraft[key] = val;
  renderSettingsModal();
}

function changeNumberSetting(key, delta, min, max) {
  let cur = Number(settingsDraft[key] ?? settings[key] ?? min);
  cur += delta;
  if (cur < min) cur = min;
  if (cur > max) cur = max;
  settingsDraft[key] = cur;
  renderSettingsModal();
}

function renderSettingsModal() {
  const panelTitle = document.getElementById("settingsPanelTitle");
  if (panelTitle) {
    panelTitle.innerHTML = currentLang === "ar"
      ? "إعدادات التنبيهات والمؤقتات"
      : "Alerts & Timers Settings";
  }

  const readyModeLabel = document.getElementById("readyModeLabel");
  if (readyModeLabel) {
    readyModeLabel.innerHTML = currentLang === "ar"
      ? "سياسة التعيين التلقائي"
      : "Auto Assignment Policy";
  }

  const modeAnyBtn = document.getElementById("modeAnyBtn");
  const modeQueueBtn = document.getElementById("modeQueueBtn");

  if (modeAnyBtn) {
    modeAnyBtn.innerHTML = currentLang === "ar"
      ? "الأول المناسب"
      : "First Match";
  }

  if (modeQueueBtn) {
    modeQueueBtn.innerHTML = currentLang === "ar"
      ? "حسب أولوية الطابور"
      : "Queue Priority";
  }
  const settingsLabelTranslations = [
    {
      icon: 'fa-bell',
      ar: 'صوت تنبيه جاهزية الطاولة',
      en: 'Ready Alert Sound'
    },
    {
      icon: 'fa-mobile-alt',
      ar: 'اهتزاز تنبيه الجاهزية',
      en: 'Ready Alert Vibration'
    },
    {
      icon: 'fa-hourglass-end',
      ar: 'صوت انتهاء الحجز',
      en: 'Expired Alert Sound'
    },
    {
      icon: 'fa-mobile-alt',
      ar: 'اهتزاز انتهاء الحجز',
      en: 'Expired Alert Vibration'
    },
    {
      icon: 'fa-list',
      ar: 'إظهار قائمة المنتهية',
      en: 'Show Expired Panel'
    },
    {
      icon: 'fa-list-ol',
      ar: 'عدد الحجوزات المنتهية المعروضة',
      en: 'Expired List Limit'
    },
    {
      icon: 'fa-clock',
      ar: 'مدة انتظار العميل بعد تعيين الطاولة',
      en: 'Reservation Hold Minutes'
    },
    {
      icon: 'fa-hourglass-start',
      ar: 'مدة تعليق طاولة',
      en: 'Pending Hold Minutes'
    },
    {
      icon: 'fa-broom',
      ar: 'مدة تنظيف الطاولة',
      en: 'Cleaning Hold Minutes'
    }
  ];

  document
    .querySelectorAll('#settingsModal .settings-section .settings-row .settings-label')
    .forEach((label, index) => {
      if (label.id === 'readyModeLabel') return;

      const item = settingsLabelTranslations[index - 1];
      if (!item) return;

      label.innerHTML = `
        <i class="fas ${item.icon}"></i>
        ${currentLang === "ar" ? item.ar : item.en}
      `;
    });

  document
    .querySelectorAll('#settingsModal .toggle-group .toggle-btn')
    .forEach(btn => {
      const text = btn.innerText.trim().toUpperCase();

      if (text === 'ON' || text === 'تشغيل') {
        btn.innerHTML = currentLang === "ar" ? "تشغيل" : "ON";
      }

      if (text === 'OFF' || text === 'إيقاف') {
        btn.innerHTML = currentLang === "ar" ? "إيقاف" : "OFF";
      }
    });

  const saveSettingsBtn = document.querySelector('#settingsModal .settings-save');
  if (saveSettingsBtn) {
    saveSettingsBtn.innerHTML = currentLang === "ar" ? "حفظ" : "Save";
  }

  const closeSettingsBtn = document.querySelector('#settingsModal .settings-close');
  if (closeSettingsBtn) {
    closeSettingsBtn.innerHTML = currentLang === "ar" ? "إلغاء" : "Cancel";
  }

  if (modeAnyBtn) modeAnyBtn.classList.toggle("active", settingsDraft.ready_mode === "any_match");
  if (modeQueueBtn) modeQueueBtn.classList.toggle("active", settingsDraft.ready_mode === "queue_priority");
  
  const soundOnBtn = document.getElementById("soundOnBtn");
  const soundOffBtn = document.getElementById("soundOffBtn");
  if (soundOnBtn) soundOnBtn.classList.toggle("active", settingsDraft.alert_sound_enabled === true);
  if (soundOffBtn) soundOffBtn.classList.toggle("active", settingsDraft.alert_sound_enabled === false);
  
  const vibrationOnBtn = document.getElementById("vibrationOnBtn");
  const vibrationOffBtn = document.getElementById("vibrationOffBtn");
  if (vibrationOnBtn) vibrationOnBtn.classList.toggle("active", settingsDraft.alert_vibration_enabled === true);
  if (vibrationOffBtn) vibrationOffBtn.classList.toggle("active", settingsDraft.alert_vibration_enabled === false);
  
  const expiredSoundOnBtn = document.getElementById("expiredSoundOnBtn");
  const expiredSoundOffBtn = document.getElementById("expiredSoundOffBtn");
  if (expiredSoundOnBtn) expiredSoundOnBtn.classList.toggle("active", settingsDraft.expired_sound_enabled === true);
  if (expiredSoundOffBtn) expiredSoundOffBtn.classList.toggle("active", settingsDraft.expired_sound_enabled === false);
  
  const expiredVibrationOnBtn = document.getElementById("expiredVibrationOnBtn");
  const expiredVibrationOffBtn = document.getElementById("expiredVibrationOffBtn");
  if (expiredVibrationOnBtn) expiredVibrationOnBtn.classList.toggle("active", settingsDraft.expired_vibration_enabled === true);
  if (expiredVibrationOffBtn) expiredVibrationOffBtn.classList.toggle("active", settingsDraft.expired_vibration_enabled === false);
  
  const expiredPanelOnBtn = document.getElementById("expiredPanelOnBtn");
  const expiredPanelOffBtn = document.getElementById("expiredPanelOffBtn");
  if (expiredPanelOnBtn) expiredPanelOnBtn.classList.toggle("active", settingsDraft.expired_panel_enabled === true);
  if (expiredPanelOffBtn) expiredPanelOffBtn.classList.toggle("active", settingsDraft.expired_panel_enabled === false);
  
  const expiredListLimit = document.getElementById("expired_list_limit_value");
  if (expiredListLimit) expiredListLimit.innerText = settingsDraft.expired_list_limit ?? 5;
  
  const reservationHold = document.getElementById("reservation_hold_minutes_value");
  if (reservationHold) reservationHold.innerText = settingsDraft.reservation_hold_minutes ?? 10;
  
  const pendingHold = document.getElementById("pending_hold_minutes_value");
  if (pendingHold) pendingHold.innerText = settingsDraft.pending_hold_minutes ?? 5;
  
  const cleaningHold = document.getElementById("cleaning_hold_minutes_value");
  if (cleaningHold) cleaningHold.innerText = settingsDraft.cleaning_hold_minutes ?? 10;
}

async function saveSettings() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert('ليس لديك صلاحية لحفظ إعدادات التنبيهات والمؤقتات');
    return;
  }

  const businessId = currentUser?.business_id;

  if (!businessId || !settings?.id) {
    alert("Settings not found");
    return;
  }

  const payload = {
    ready_mode: settingsDraft.ready_mode,
    alert_sound_enabled: settingsDraft.alert_sound_enabled,
    alert_vibration_enabled: settingsDraft.alert_vibration_enabled,
    expired_sound_enabled: settingsDraft.expired_sound_enabled,
    expired_vibration_enabled: settingsDraft.expired_vibration_enabled,
    expired_panel_enabled: settingsDraft.expired_panel_enabled,
    expired_list_limit: settingsDraft.expired_list_limit,
    reservation_hold_minutes: settingsDraft.reservation_hold_minutes,
    pending_hold_minutes: settingsDraft.pending_hold_minutes,
    cleaning_hold_minutes: settingsDraft.cleaning_hold_minutes
  };
  const { error } = await supabase
  .from("business_settings")
  .update(payload)
  .eq("id", settings.id)
  .eq("business_id", businessId);
  if (error) {
    console.log(error);
    alert("Save failed");
    return;
  }
  settings = { ...settings, ...payload };
  closeSettingsModal();
  renderWaitingList();
  renderExpiredList();
  processReadyAlerts();
}

// ============================================================
// QUEUE RULES MODAL
// ============================================================

function openQueueRulesModal() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert('ليس لديك صلاحية لتعديل قواعد الطابور');
    return;
  }

  settingsDraft = { ...settings };
  renderQueueRulesModal();

  const modal = document.getElementById('queueRulesModal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeQueueRulesModal() {
  const modal = document.getElementById('queueRulesModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function setQueueReadyMode(mode) {
  settingsDraft.ready_mode = mode;
  renderQueueRulesModal();
}

function renderQueueRulesModal() {
  const anyBtn = document.getElementById('queueRuleAnyBtn');
  const priorityBtn = document.getElementById('queueRulePriorityBtn');

  const currentMode = settingsDraft.ready_mode || settings.ready_mode || 'any_match';

  if (anyBtn) {
    anyBtn.classList.toggle('active', currentMode === 'any_match');
    anyBtn.innerHTML = currentMode === 'any_match'
      ? '<i class="fas fa-check"></i> محدد'
      : 'اختيار';
  }

  if (priorityBtn) {
    priorityBtn.classList.toggle('active', currentMode === 'queue_priority');
    priorityBtn.innerHTML = currentMode === 'queue_priority'
      ? '<i class="fas fa-check"></i> محدد'
      : 'اختيار';
  }
}

async function saveQueueRulesSettings() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert('ليس لديك صلاحية لحفظ قواعد الطابور');
    return;
  }

  const businessId = currentUser?.business_id;

  if (!businessId || !settings?.id) {
    showAlert('لم يتم العثور على إعدادات المطعم الحالي');
    return;
  }

  const nextReadyMode = settingsDraft.ready_mode || settings.ready_mode || 'any_match';

  const { error } = await supabase
    .from('business_settings')
    .update({
      ready_mode: nextReadyMode
    })
    .eq('id', settings.id)
    .eq('business_id', businessId);

  if (error) {
    console.error('Queue rules save error:', error);
    showAlert('فشل حفظ قواعد الطابور');
    return;
  }

  settings = {
    ...settings,
    ready_mode: nextReadyMode
  };

  settingsDraft = {
    ...settingsDraft,
    ready_mode: nextReadyMode
  };

  closeQueueRulesModal();

  renderWaitingList();
  renderExpiredList();
  processReadyAlerts();

  showSuccessNotification('✅ تم حفظ قواعد الطابور');
}

// ============================================================
// TIMER SETTINGS MODAL
// ============================================================

function openTimerSettingsModal() {
  if (!canDo('manage_timers')) {
    showAlert('ليس لديك صلاحية لإعدادات المؤقتات');
    return;
  }

  const reservationDisplay = document.getElementById('reservation_hold_minutes_display');
  const cleaningDisplay = document.getElementById('cleaning_hold_minutes_display');
  if (reservationDisplay) reservationDisplay.innerText = settings.reservation_hold_minutes || 10;
  if (cleaningDisplay) cleaningDisplay.innerText = settings.cleaning_hold_minutes || 10;
  document.getElementById('timerSettingsModal').classList.add('show');
}

function closeTimerSettingsModal() {
  document.getElementById('timerSettingsModal').classList.remove('show');
}

function changeTimerSetting(key, delta, min, max) {
  let current = parseInt(document.getElementById(key + '_display').innerText) || min;
  let newValue = current + delta;
  if (newValue < min) newValue = min;
  if (newValue > max) newValue = max;
  document.getElementById(key + '_display').innerText = newValue;
}

async function saveTimerSettings() {
  if (!canDo('manage_timers')) {
    showAlert('ليس لديك صلاحية لحفظ إعدادات المؤقتات');
    return;
  }

  const newReservationHold = parseInt(document.getElementById('reservation_hold_minutes_display').innerText);
  const newCleaningHold = parseInt(document.getElementById('cleaning_hold_minutes_display').innerText);

  const businessId = currentUser?.business_id || settings?.business_id;

  if (!businessId || !settings?.id) {
    showAlert("لم يتم العثور على إعدادات المطعم الحالي");
    return;
  }

  const { data, error } = await supabase
    .from('business_settings')
    .update({
      reservation_hold_minutes: newReservationHold,
      cleaning_hold_minutes: newCleaningHold
    })
    .eq('id', settings.id)
    .eq('business_id', businessId)
    .select('id, business_id, reservation_hold_minutes, cleaning_hold_minutes, pending_hold_minutes')
    .single();

  if (error) {
    console.error("Error saving timer settings:", error);
    showAlert("فشل حفظ إعدادات المؤقتات");
    return;
  }

  if (!data) {
    showAlert("لم يتم تحديث أي سجل. تأكد أن الإعدادات تخص المطعم الحالي");
    return;
  }

  settings.reservation_hold_minutes = data.reservation_hold_minutes;
  settings.cleaning_hold_minutes = data.cleaning_hold_minutes;
  settings.pending_hold_minutes = data.pending_hold_minutes;

  closeTimerSettingsModal();
  showSuccessNotification("✅ تم حفظ إعدادات المؤقتات");
}

// ============================================================
// LOAD DATA FUNCTIONS
// ============================================================

async function loadAll() {
  await loadFloorPlan();
  await loadWaitingList();
  await renderExpiredList();
  processReadyAlerts();
  processExpiredAlerts();
}

async function loadSettings() {
  const businessId = currentUser?.business_id;

  if (!businessId) {
    console.warn("No business_id found for current user");

    settings = {
      ready_mode: "any_match",
      alert_sound_enabled: true,
      expired_sound_enabled: true,
      alert_vibration_enabled: true,
      expired_vibration_enabled: true,
      expired_panel_enabled: true,
      expired_list_limit: 5,
      reservation_hold_minutes: 10,
      pending_hold_minutes: 5,
      cleaning_hold_minutes: 10,
      business_id: null,
      id: null
    };

    return;
  }

  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    const defaultSettings = {
      business_id: businessId,
      ready_mode: "any_match",
      alert_sound_enabled: true,
      expired_sound_enabled: true,
      alert_vibration_enabled: true,
      expired_panel_enabled: true,
      expired_list_limit: 5,
      reservation_hold_minutes: 10,
      pending_hold_minutes: 5,
      cleaning_hold_minutes: 10
    };

    const { data: insertedSettings, error: insertError } = await supabase
      .from("business_settings")
      .insert(defaultSettings)
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating default settings:", insertError);

      settings = {
        ...defaultSettings,
        id: null
      };

      return;
    }

    settings = insertedSettings;
    return;
  }

  settings = data;
}

async function loadFloorPlan() {
  const businessId = currentUser?.business_id;

  if (!businessId) {
    floorData = [];
    renderStatusSummary();
    renderFloorPlan();
    return;
  }

  const { data, error } = await supabase
    .from("dashboard_tables_full")
    .select("*")
    .eq("business_id", businessId);

  if (error) {
    console.log(error);
    floorData = [];
    renderStatusSummary();
    renderFloorPlan();
    return;
  }

  floorData = data || [];
  renderStatusSummary();
  renderFloorPlan();
}

async function loadActiveSettings() {
  const businessId = currentUser?.business_id || BUSINESS_ID;
  try {
    const { data: floors } = await supabase
      .from('restaurant_settings')
      .select('setting_value')
      .eq('business_id', businessId)
      .eq('setting_key', 'active_floors')
      .maybeSingle();
    if (floors?.setting_value) {
      globalActiveFloors = JSON.parse(floors.setting_value);
      localStorage.setItem('easyq_floors', JSON.stringify(globalActiveFloors));
    }
    
    const { data: zones } = await supabase
      .from('restaurant_settings')
      .select('setting_value')
      .eq('business_id', businessId)
      .eq('setting_key', 'active_zones')
      .maybeSingle();
    if (zones?.setting_value) {
      globalActiveZones = JSON.parse(zones.setting_value);
      localStorage.setItem('easyq_zones', JSON.stringify(globalActiveZones));
    }
  } catch (e) {
    console.warn("Error loading active settings:", e);
  }
}

function easyqNormalizePhoneForRepeatVisit(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('00966')) {
    return digits.slice(2);
  }

  if (digits.startsWith('966')) {
    return digits;
  }

  if (digits.startsWith('05')) {
    return `966${digits.slice(1)}`;
  }

  if (digits.startsWith('5') && digits.length >= 9) {
    return `966${digits}`;
  }

  return digits;
}

function easyqGetWaitingCustomerPhone(row) {
  return (
    row?.phone ||
    row?.customer_phone ||
    row?.customer_phone_snapshot ||
    row?.customers?.phone ||
    row?.customers?.whatsapp_number ||
    ''
  );
}

async function enrichWaitingDataWithRepeatVisits() {
  try {
    const businessId = currentUser?.business_id;

    if (!businessId || !Array.isArray(waitingData) || waitingData.length === 0) {
      return;
    }

    const waitingPhones = waitingData
      .map((row) => easyqNormalizePhoneForRepeatVisit(easyqGetWaitingCustomerPhone(row)))
      .filter((phone) => phone && phone.length >= 9);

    const uniqueWaitingPhones = [...new Set(waitingPhones)];

    if (uniqueWaitingPhones.length === 0) {
      waitingData = waitingData.map((row) => ({
        ...row,
        repeat_visit_30_days: false,
        repeat_visit_count_30_days: 0,
        repeat_last_visit_at: null,
        repeat_last_reward_at: null
      }));
      return;
    }

    const sinceDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString();

    /*
      نحسب فقط الزيارات المؤكدة:
      occupied / cleaning / completed

      لا نحسب:
      waiting / offered / reserved / cancelled / expired / no_show
    */
    const { data, error } = await supabase
      .from('table_requests')
      .select(`
        id,
        customer_id,
        customer_phone_snapshot,
        created_at,
        status,
        customers (
          phone,
          whatsapp_number
        )
      `)
      .eq('business_id', businessId)
      .gte('created_at', sinceDate)
      .in('status', ['occupied', 'cleaning', 'completed']);

    if (error) {
      console.warn('تعذر فحص الزيارات المؤكدة للعملاء خلال 30 يوم:', error);
      return;
    }

    /*
      آخر مكافأة:
      أي زيارة مؤكدة قبل آخر مكافأة لا تدخل في العد الجديد.
    */
    const rewardsByPhone = new Map();

    const { data: rewardsData, error: rewardsError } = await supabase
      .from('customer_rewards')
      .select('phone_snapshot, rewarded_at')
      .eq('business_id', businessId)
      .gte('rewarded_at', sinceDate)
      .order('rewarded_at', { ascending: false });

    if (rewardsError) {
      console.warn('تعذر جلب سجل مكافآت العملاء:', rewardsError);
    }

    (rewardsData || []).forEach((reward) => {
      const rewardPhone = easyqNormalizePhoneForRepeatVisit(reward.phone_snapshot || '');

      if (!rewardPhone || !uniqueWaitingPhones.includes(rewardPhone)) return;

      const rewardAt = new Date(reward.rewarded_at || '').getTime();

      if (!Number.isFinite(rewardAt) || rewardAt <= 0) return;

      const oldRewardAt = rewardsByPhone.get(rewardPhone) || 0;

      if (rewardAt > oldRewardAt) {
        rewardsByPhone.set(rewardPhone, rewardAt);
      }
    });

    const confirmedVisitsByPhone = new Map();

    (data || []).forEach((visit) => {
      const visitPhone = easyqNormalizePhoneForRepeatVisit(
        visit.customer_phone_snapshot ||
        visit.customers?.phone ||
        visit.customers?.whatsapp_number ||
        ''
      );

      if (!visitPhone || !uniqueWaitingPhones.includes(visitPhone)) return;

      if (!confirmedVisitsByPhone.has(visitPhone)) {
        confirmedVisitsByPhone.set(visitPhone, []);
      }

      confirmedVisitsByPhone.get(visitPhone).push(visit);
    });

    waitingData = waitingData.map((row) => {
      const currentPhone = easyqNormalizePhoneForRepeatVisit(easyqGetWaitingCustomerPhone(row));
      const currentRequestId = String(row.request_id || row.id || '');
      const visits = confirmedVisitsByPhone.get(currentPhone) || [];
      const lastRewardAt = rewardsByPhone.get(currentPhone) || 0;

      const previousConfirmedVisits = visits.filter((visit) => {
        const visitTime = new Date(visit.created_at || '').getTime();

        return (
          String(visit.id || '') !== currentRequestId &&
          Number.isFinite(visitTime) &&
          visitTime > lastRewardAt
        );
      });

      previousConfirmedVisits.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return {
        ...row,
        repeat_visit_30_days: previousConfirmedVisits.length > 0,
        repeat_visit_count_30_days: previousConfirmedVisits.length,
        repeat_last_visit_at: previousConfirmedVisits[0]?.created_at || null,
        repeat_last_reward_at: lastRewardAt ? new Date(lastRewardAt).toISOString() : null
      };
    });

  } catch (err) {
    console.warn('خطأ أثناء فحص تكرار زيارة العميل:', err);
  }
}

async function loadWaitingList() {
  const businessId = currentUser?.business_id;

  if (!businessId) {
    console.warn("⚠️ لا يوجد business_id للمستخدم الحالي - تم إفراغ قائمة الانتظار");
    waitingData = [];
    renderWaitingList();
    return;
  }

  const { data, error } = await supabase
    .from("waiting_list_full")
    .select("*")
    .eq("business_id", businessId);

  if (error) {
    console.error("❌ خطأ في جلب قائمة الانتظار:", error);
    waitingData = [];
    renderWaitingList();
    return;
  }

  // حماية إضافية داخل الواجهة حتى لو رجعت بيانات خاطئة من الـ view
  waitingData = (data || []).filter(r => r.business_id === businessId);

  await enrichWaitingDataWithRepeatVisits();

  console.log(`✅ تم تحميل قائمة انتظار المطعم الحالي فقط: ${waitingData.length} طلب`);
  renderWaitingList();
}

// ============================================================
// ZONE & FLOOR MANAGEMENT
// ============================================================

async function openZonesModal() {
  if (!canDo('manage_zones')) {
    showAlert('ليس لديك صلاحية لإدارة المناطق');
    return;
  }

  // تحميل آخر إعدادات المناطق من قاعدة البيانات قبل عرض المودل
  await loadActiveSettings();

  document.getElementById('zonesModal').classList.add('show');
  loadZones();
}

function closeZonesModal() {
  document.getElementById('zonesModal').classList.remove('show');
}

function loadZones() {
  const activeZones = globalActiveZones;
  const container = document.getElementById('zonesList');
  if (!container) return;
  
  container.innerHTML = DEFAULT_ZONES.map(zone => `
    <div class="zone-item">
      <span>${currentLang === 'ar' ? zone.nameAr : zone.nameEn}</span>
      <button class="toggle-switch ${activeZones.includes(zone.id) ? 'active' : ''}" 
              onclick="this.classList.toggle('active')" 
              data-zone="${zone.id}">
      </button>
    </div>
  `).join('');
}

async function saveZonePreferences() {
  const buttons = document.querySelectorAll('#zonesList .toggle-switch');
  const activeZones = [];
  buttons.forEach(btn => {
    if (btn.classList.contains('active')) {
      activeZones.push(btn.getAttribute('data-zone'));
    }
  });
  
    // ============================================================
  // PACKAGE LIMIT CHECK - ZONES
  // فحص حد المناطق حسب باقة الاشتراك
  // null في max_zones يعني بدون حد
  // ============================================================
  const { data: usageRows, error: usageError } = await supabase
    .rpc('get_my_license_usage');

  if (usageError) {
    console.error('License usage check error:', usageError);
    showAlert('تعذر التحقق من حدود الباقة. حاول مرة أخرى.');
    return;
  }

  const usage = Array.isArray(usageRows) ? usageRows[0] : null;

  if (!usage) {
    showAlert('لا يمكن قراءة حدود باقة الاشتراك لهذا المطعم.');
    return;
  }

if (usage.max_zones !== null && activeZones.length > Number(usage.max_zones)) {
  showAlert(`لا يمكن تفعيل أكثر من ${usage.max_zones} مناطق في باقتك الحالية. المناطق المحددة الآن: ${activeZones.length}.`);

  // إرجاع أزرار المودل إلى آخر حالة محفوظة فعليًا
  await loadActiveSettings();
  loadZones();

  return;
}

  const oldZones = JSON.parse(localStorage.getItem('easyq_zones') || '["Indoor","Outdoor","VIP","Family","Smoking"]');
  const disabledZones = oldZones.filter(z => !activeZones.includes(z));
  for (const zone of disabledZones) {
    const tablesCount = floorData.filter(t => t.zone_name === zone && t.status === 'available').length;
    if (tablesCount > 0) {
      showAlert(`⚠️ لا يمكن تعطيل منطقة "${zone}" لأن بها ${tablesCount} طاولة متاحة.\nالرجاء تعطيل الطاولات أولاً.`);
      return;
    }
  }
  
  localStorage.setItem('easyq_zones', JSON.stringify(activeZones));

// تحديث المناطق المفعلة داخل الذاكرة حتى يظهر المودل صحيح عند فتحه مرة أخرى
globalActiveZones = activeZones;
  if (currentUser && currentUser.business_id && currentUser.id) {
    const { error } = await supabase.rpc('save_restaurant_setting', {
      p_business_id: currentUser.business_id,
      p_setting_key: 'active_zones',
      p_setting_value: JSON.stringify(activeZones),
      p_updated_by: currentUser.id
    });
    if (error) {
      console.error("RPC error:", error);
      showAlert("فشل حفظ الإعدادات في قاعدة البيانات");
      return;
    }
  }
  if (!activeZones.includes(currentZone) && currentZone !== "all") {
    currentZone = activeZones[0] || "all";
    const zoneNames = ZONE_NAMES;
    document.getElementById('currentZoneLabel').innerHTML = zoneNames[currentZone]?.icon + ' ' + (zoneNames[currentZone]?.[currentLang === 'ar' ? 'ar' : 'en'] || currentZone);
  }
  closeZonesModal();
  updateZoneDropdowns();
  await loadFloorPlan();
  renderFloorPlan();
  renderStatusSummary();
  loadZoneDropdown();
  showSuccessNotification('تم حفظ تفضيلات المناطق');
}

async function openFloorsModal() {
    if (!canDo('manage_floors')) {
    showAlert('ليس لديك صلاحية لإدارة الطوابق');
    return;
  }
  // تحميل آخر إعدادات الطوابق من قاعدة البيانات قبل عرض المودل
  await loadActiveSettings();

  document.getElementById('floorsModal').classList.add('show');
  loadFloors();
}

function closeFloorsModal() {
  document.getElementById('floorsModal').classList.remove('show');
}

function loadFloors() {
  const activeFloors = globalActiveFloors;
  const container = document.getElementById('floorsList');
  if (!container) return;
  
  container.innerHTML = DEFAULT_FLOORS.map(floor => `
    <div class="zone-item">
      <span>${currentLang === 'ar' ? floor.nameAr : floor.nameEn}</span>
      <button class="toggle-switch ${activeFloors.includes(floor.id) ? 'active' : ''}" 
              onclick="this.classList.toggle('active')" 
              data-floor="${floor.id}">
      </button>
    </div>
  `).join('');
}

async function saveFloorPreferences() {
  const buttons = document.querySelectorAll('#floorsList .toggle-switch');
  const activeFloors = [];
  buttons.forEach(btn => {
    if (btn.classList.contains('active')) {
      activeFloors.push(btn.getAttribute('data-floor'));
    }
  });
  if (activeFloors.length === 0) {
    showAlert('يجب تفعيل طابق واحد على الأقل');
    return;
  }
  
  // ============================================================
  // PACKAGE LIMIT CHECK - FLOORS
  // فحص حد الأدوار حسب باقة الاشتراك
  // null في max_floors يعني بدون حد
  // ============================================================
  const { data: usageRows, error: usageError } = await supabase
    .rpc('get_my_license_usage');

  if (usageError) {
    console.error('License usage check error:', usageError);
    showAlert('تعذر التحقق من حدود الباقة. حاول مرة أخرى.');
    return;
  }

  const usage = Array.isArray(usageRows) ? usageRows[0] : null;

  if (!usage) {
    showAlert('لا يمكن قراءة حدود باقة الاشتراك لهذا المطعم.');
    return;
  }

if (usage.max_floors !== null && activeFloors.length > Number(usage.max_floors)) {
  showAlert(`لا يمكن تفعيل أكثر من ${usage.max_floors} أدوار في باقتك الحالية. الأدوار المحددة الآن: ${activeFloors.length}.`);

  // إرجاع أزرار المودل إلى آخر حالة محفوظة فعليًا
  await loadActiveSettings();
  loadFloors();

  return;
}

  const oldFloors = JSON.parse(localStorage.getItem('easyq_floors') || '["1","2","3"]');
  const disabledFloors = oldFloors.filter(f => !activeFloors.includes(f));
  for (const floor of disabledFloors) {
    const tablesCount = floorData.filter(t => String(t.floor_number) === floor && t.status === 'available').length;
    if (tablesCount > 0) {
      const floorName = floor === '1' ? 'أرضي' : floor === '2' ? 'أول' : 'ثاني';
      showAlert(`⚠️ لا يمكن تعطيل الطابق "${floorName}" لأن به ${tablesCount} طاولة متاحة.\nالرجاء تعطيل الطاولات أولاً.`);
      return;
    }
  }
  
  localStorage.setItem('easyq_floors', JSON.stringify(activeFloors));
  if (currentUser && currentUser.business_id && currentUser.id) {
    const { error } = await supabase.rpc('save_restaurant_setting', {
      p_business_id: currentUser.business_id,
      p_setting_key: 'active_floors',
      p_setting_value: JSON.stringify(activeFloors),
      p_updated_by: currentUser.id
    });
    if (error) {
      console.error("RPC error:", error);
      showAlert("فشل حفظ الإعدادات في قاعدة البيانات");
      return;
    }
  }
  if (!activeFloors.includes(String(currentFloor))) {
    currentFloor = parseInt(activeFloors[0]);
    const floorNames = FLOOR_NAMES;
    document.getElementById('currentFloorLabel').innerHTML = floorNames[String(currentFloor)]?.icon + ' ' + (floorNames[String(currentFloor)]?.[currentLang === 'ar' ? 'ar' : 'en'] || currentFloor);
  }
  closeFloorsModal();
  await loadFloorPlan();
  renderFloorPlan();
  renderStatusSummary();
  loadFloorDropdown();
  await loadActiveSettings();
  showSuccessNotification('تم حفظ تفضيلات الطوابق');
}

// ============================================================
// DROPDOWN FUNCTIONS
// ============================================================

function toggleZoneMenu() {
  const menu = document.getElementById('zoneDropdownMenu');
  if (menu) menu.classList.toggle('show');
}

function toggleFloorMenu() {
  const menu = document.getElementById('floorDropdownMenu');
  const zoneMenu = document.getElementById('zoneDropdownMenu');
  if (zoneMenu) zoneMenu.classList.remove('show');
  if (menu) menu.classList.toggle('show');
}

async function loadZoneDropdown() {
  const menu = document.getElementById('zoneDropdownMenu');
  const activeZones = await getActiveZones();
  
  const zoneAvailable = {};
  activeZones.forEach(zone => { zoneAvailable[zone] = 0; });
  
  const activeFloorsForZones = (() => {
    const saved = localStorage.getItem('easyq_floors');
    return saved ? JSON.parse(saved) : ['1', '2', '3'];
  })();
  
  floorData.forEach(table => {
    const tableFloor = String(table.floor_number);
    if (activeFloorsForZones.includes(tableFloor) && 
        zoneAvailable[table.zone_name] !== undefined && 
        table.status === 'available') {
      zoneAvailable[table.zone_name]++;
    }
  });
  
  if (menu) {
    menu.innerHTML = activeZones.map(zone => {
      const name = ZONE_NAMES[zone] || { ar: zone, en: zone, icon: '📍' };
      const displayName = currentLang === 'ar' ? name.ar : name.en;
      const availableCount = zoneAvailable[zone] || 0;
      
      return `
        <div class="zone-item-menu" onclick="selectZone('${zone}', '${name.icon} ${displayName}')">
          <span>${name.icon} ${displayName}</span>
          <span class="dropdown-available-count">
  <span class="dropdown-green-dot"></span>
  ${availableCount}
</span>
        </div>
      `;
    }).join('');
  }
  
  if (activeZones.length > 0 && !activeZones.includes(currentZone)) {
    const firstZone = activeZones[0];
    const firstName = ZONE_NAMES[firstZone] || { ar: firstZone, en: firstZone, icon: '📍' };
    const firstDisplay = currentLang === 'ar' ? firstName.ar : firstName.en;
    selectZone(firstZone, `${firstName.icon} ${firstDisplay}`);
  }
}

async function loadFloorDropdown() {
  const menu = document.getElementById('floorDropdownMenu');
  const activeFloors = await getActiveFloors();
  
  const floorAvailable = {};
  activeFloors.forEach(f => { floorAvailable[f] = 0; });
  const activeFloorsForFloors = (() => {
    const saved = localStorage.getItem('easyq_floors');
    return saved ? JSON.parse(saved) : ['1', '2', '3'];
  })();
  
  floorData.forEach(table => {
    const floorKey = String(table.floor_number);
    if (activeFloorsForFloors.includes(floorKey) && 
        floorAvailable[floorKey] !== undefined && 
        table.status === 'available') {
      floorAvailable[floorKey]++;
    }
  });
  
  if (menu) {
    menu.innerHTML = activeFloors.map(floor => {
      const name = FLOOR_NAMES[floor] || { ar: floor, en: floor, icon: '🏢' };
      const displayName = currentLang === 'ar' ? name.ar : name.en;
      const availableCount = floorAvailable[floor] || 0;
      
      return `
        <div class="zone-item-menu" onclick="selectFloor('${floor}', '${name.icon} ${displayName}')">
          <span>${name.icon} ${displayName}</span>
          <span class="dropdown-available-count">
  <span class="dropdown-green-dot"></span>
  ${availableCount}
</span>
        </div>
      `;
    }).join('');
  }
  
  if (activeFloors.length > 0 && !activeFloors.includes(String(currentFloor))) {
    const firstFloor = activeFloors[0];
    const firstName = FLOOR_NAMES[firstFloor] || { ar: firstFloor, en: firstFloor, icon: '🏢' };
    const firstDisplay = currentLang === 'ar' ? firstName.ar : firstName.en;
    selectFloor(firstFloor, `${firstName.icon} ${firstDisplay}`);
  }
}

function selectZone(zoneId, zoneLabel) {
  currentZone = zoneId;
  const currentZoneLabel = document.getElementById('currentZoneLabel');
  
  if (currentZoneLabel) {
    // ترجمة المنطقة الأساسية حسب اللغة الحالية
    if (currentLang === 'ar') {
      const zoneNames = {
        'Indoor': '🍽️ داخلي',
        'Outdoor': '🌿 خارجي',
        'VIP': '👑 VIP',
        'Family': '👨‍👩‍👧‍👦 عائلي',
        'Smoking': '🚬 مدخنين'
      };
      currentZoneLabel.innerHTML = zoneNames[zoneId] || zoneLabel;
    } else {
      const zoneNames = {
        'Indoor': '🍽️ Indoor',
        'Outdoor': '🌿 Outdoor',
        'VIP': '👑 VIP',
        'Family': '👨‍👩‍👧‍👦 Family',
        'Smoking': '🚬 Smoking'
      };
      currentZoneLabel.innerHTML = zoneNames[zoneId] || zoneLabel;
    }
  }
  
  const zoneMenu = document.getElementById('zoneDropdownMenu');
  if (zoneMenu) zoneMenu.classList.remove('show');
  renderFloorPlan();
  renderStatusSummary();
  renderWaitingList();
  renderExpiredList();
}

function selectFloor(floorId, floorLabel) {
  currentFloor = parseInt(floorId);
  const currentFloorLabel = document.getElementById('currentFloorLabel');
  
  if (currentFloorLabel) {
    // ترجمة الطابق الأساسي حسب اللغة الحالية
    if (currentLang === 'ar') {
      const floorNames = {
        '1': '🏠 أرضي',
        '2': '🔼 أول',
        '3': '🔽 ثاني'
      };
      currentFloorLabel.innerHTML = floorNames[floorId] || floorLabel;
    } else {
      const floorNames = {
        '1': '🏠 Ground',
        '2': '🔼 First',
        '3': '🔽 Second'
      };
      currentFloorLabel.innerHTML = floorNames[floorId] || floorLabel;
    }
  }
  
  const floorMenu = document.getElementById('floorDropdownMenu');
  if (floorMenu) floorMenu.classList.remove('show');
  renderFloorPlan();
  renderStatusSummary();
  loadZoneDropdown();
}

async function getActiveZones() {
  const businessId = currentUser?.business_id || BUSINESS_ID;
  try {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('setting_value')
      .eq('business_id', businessId)
      .eq('setting_key', 'active_zones')
      .maybeSingle();
    if (!error && data?.setting_value) {
      const parsed = JSON.parse(data.setting_value);
      localStorage.setItem('easyq_zones', JSON.stringify(parsed));
      return parsed;
    }
  } catch (e) { console.warn(e); }
  const saved = localStorage.getItem('easyq_zones');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return ['Indoor', 'Outdoor', 'VIP', 'Family', 'Smoking'];
}

async function getActiveFloors() {
  const businessId = currentUser?.business_id || BUSINESS_ID;
  try {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('setting_value')
      .eq('business_id', businessId)
      .eq('setting_key', 'active_floors')
      .maybeSingle();
    if (!error && data?.setting_value) {
      const parsed = JSON.parse(data.setting_value);
      localStorage.setItem('easyq_floors', JSON.stringify(parsed));
      return parsed;
    }
  } catch (e) { console.warn(e); }
  const saved = localStorage.getItem('easyq_floors');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return ['1', '2', '3'];
}

async function updateZoneDropdowns() {
  const activeZones = await getActiveZones();
  const zoneSelects = document.querySelectorAll('#zoneSelectNew, #walkInZone, #editZone, #tableZone');
  
  zoneSelects.forEach(select => {
    if (!select) return;
    const options = select.querySelectorAll('option');
    options.forEach(opt => {
      if (opt.value === '' || opt.value === 'all') return;
      opt.style.display = activeZones.includes(opt.value) ? 'block' : 'none';
    });
  });
}

async function updateFloorDropdowns() {
  const activeFloors = await getActiveFloors();
  const floorSelects = document.querySelectorAll('#floorSelect, #tableFloor');
  
  floorSelects.forEach(floorSelect => {
    if (!floorSelect) return;
    const options = floorSelect.querySelectorAll('option');
    options.forEach(opt => {
      if (activeFloors.includes(opt.value)) {
        opt.style.display = 'block';
      } else {
        opt.style.display = 'none';
      }
    });
  });
}