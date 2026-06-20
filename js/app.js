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

function getEqModalLang() {
  const lang =
    (typeof currentLang !== 'undefined' && currentLang) ||
    localStorage.getItem("hajzak_lang") ||
    "ar";

  return String(lang).toLowerCase().startsWith("en") ? "en" : "ar";
}

function eqModalText(arText, enText) {
  return getEqModalLang() === "ar" ? arText : enText;
}

function setEqModalDirection(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const isArabic = getEqModalLang() === "ar";
  modal.setAttribute("dir", isArabic ? "rtl" : "ltr");
  modal.style.direction = isArabic ? "rtl" : "ltr";
}

function setEqElementHTML(selectorOrElement, html) {
  const el =
    typeof selectorOrElement === "string"
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

  if (!el) return;
  el.innerHTML = html;
}

function setEqElementText(selectorOrElement, text) {
  const el =
    typeof selectorOrElement === "string"
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

  if (!el) return;
  el.textContent = text;
}

function openSettingsModal() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert(eqModalText(
      'ليس لديك صلاحية لإعدادات التنبيهات والمؤقتات',
      'You do not have permission to manage alerts and timers'
    ));
    return;
  }

  settingsDraft = { ...settings };
  renderSettingsModal();

  const modal = document.getElementById("settingsModal");
  if (modal) modal.classList.add("show");
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.classList.remove("show");
}

/*
  إبقاء هذه الدالة حتى لا ينكسر أي زر قديم.
  قواعد الطابور الجديدة تحفظ من مودل قواعد الطابور.
*/
function setReadyMode(mode) {
  setQueueReadyMode(mode);
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
  setEqModalDirection("settingsModal");

  const draft = settingsDraft || settings || {};

  // العنوان والوصف
  setEqElementText(
    "#settingsModal .eq-settings-compact-title",
    eqModalText("إعدادات التنبيهات والمؤقتات", "Alerts & Timers Settings")
  );

  setEqElementText(
    "#settingsModal .eq-settings-compact-subtitle",
    eqModalText(
      "الأصوات، الاهتزاز، والمؤقتات الأساسية",
      "Sounds, vibration, and basic timers"
    )
  );

  // عناوين البطاقات
  const cardTitles = document.querySelectorAll("#settingsModal .eq-settings-compact-card-title");

  if (cardTitles[0]) {
    cardTitles[0].innerHTML = `
      <i class="fas fa-volume-high"></i>
      ${eqModalText("التنبيهات", "Alerts")}
    `;
  }

  if (cardTitles[1]) {
    cardTitles[1].innerHTML = `
      <i class="fas fa-stopwatch"></i>
      ${eqModalText("مؤقتات وإعدادات", "Timers & Settings")}
    `;
  }

  // تسميات الصفوف حسب ترتيبها الحالي في المودل
  const labels = document.querySelectorAll("#settingsModal .eq-settings-compact-label");

  const labelTranslations = [
    {
      icon: "fa-bell",
      ar: "تنبيه الجاهزية",
      en: "Ready Alert"
    },
    {
      icon: "fa-mobile-alt",
      ar: "اهتزاز الجاهزية",
      en: "Ready Vibration"
    },
    {
      icon: "fa-hourglass-end",
      ar: "صوت انتهاء الحجز",
      en: "Expired Booking Sound"
    },
    {
      icon: "fa-mobile-alt",
      ar: "اهتزاز انتهاء الحجز",
      en: "Expired Booking Vibration"
    },
    {
      icon: "fa-list",
      ar: "لوحة المنتهية",
      en: "Expired Panel"
    },
    {
      icon: "fa-list-ol",
      ar: "عدد الطلبات المنتهية",
      en: "Expired Requests Limit"
    },
    {
      icon: "fa-clock",
      ar: "مدة الحجز",
      en: "Reservation Hold Time"
    },
    {
      icon: "fa-hourglass-start",
      ar: "مدة الانتظار المؤقت",
      en: "Temporary Hold Time"
    },
    {
      icon: "fa-broom",
      ar: "مدة التنظيف",
      en: "Cleaning Time"
    }
  ];

  labels.forEach((label, index) => {
    const item = labelTranslations[index];
    if (!item) return;

    label.innerHTML = `
      <i class="fas ${item.icon}"></i>
      ${eqModalText(item.ar, item.en)}
    `;
  });

  // أزرار التشغيل والإيقاف
  const buttonTranslations = [
    ["soundOnBtn", "تشغيل", "ON"],
    ["soundOffBtn", "إيقاف", "OFF"],
    ["vibrationOnBtn", "تشغيل", "ON"],
    ["vibrationOffBtn", "إيقاف", "OFF"],
    ["expiredSoundOnBtn", "تشغيل", "ON"],
    ["expiredSoundOffBtn", "إيقاف", "OFF"],
    ["expiredVibrationOnBtn", "تشغيل", "ON"],
    ["expiredVibrationOffBtn", "إيقاف", "OFF"],
    ["expiredPanelOnBtn", "إظهار", "Show"],
    ["expiredPanelOffBtn", "إخفاء", "Hide"]
  ];

  buttonTranslations.forEach(([id, ar, en]) => {
    const btn = document.getElementById(id);
    if (btn) btn.innerHTML = eqModalText(ar, en);
  });

  // أزرار الحفظ والإغلاق
  const saveSettingsBtn = document.querySelector("#settingsModal .settings-save");
  if (saveSettingsBtn) {
    saveSettingsBtn.innerHTML = `
      <i class="fas fa-save"></i>
      ${eqModalText("حفظ", "Save")}
    `;
  }

  const closeSettingsBtn = document.querySelector("#settingsModal .settings-close");
  if (closeSettingsBtn) {
    closeSettingsBtn.innerHTML = eqModalText("إغلاق", "Close");
  }

  // تفعيل الأزرار حسب القيم الحالية
  const soundOnBtn = document.getElementById("soundOnBtn");
  const soundOffBtn = document.getElementById("soundOffBtn");
  if (soundOnBtn) soundOnBtn.classList.toggle("active", draft.alert_sound_enabled === true);
  if (soundOffBtn) soundOffBtn.classList.toggle("active", draft.alert_sound_enabled === false);

  const vibrationOnBtn = document.getElementById("vibrationOnBtn");
  const vibrationOffBtn = document.getElementById("vibrationOffBtn");
  if (vibrationOnBtn) vibrationOnBtn.classList.toggle("active", draft.alert_vibration_enabled === true);
  if (vibrationOffBtn) vibrationOffBtn.classList.toggle("active", draft.alert_vibration_enabled === false);

  const expiredSoundOnBtn = document.getElementById("expiredSoundOnBtn");
  const expiredSoundOffBtn = document.getElementById("expiredSoundOffBtn");
  if (expiredSoundOnBtn) expiredSoundOnBtn.classList.toggle("active", draft.expired_sound_enabled === true);
  if (expiredSoundOffBtn) expiredSoundOffBtn.classList.toggle("active", draft.expired_sound_enabled === false);

  const expiredVibrationOnBtn = document.getElementById("expiredVibrationOnBtn");
  const expiredVibrationOffBtn = document.getElementById("expiredVibrationOffBtn");
  if (expiredVibrationOnBtn) expiredVibrationOnBtn.classList.toggle("active", draft.expired_vibration_enabled === true);
  if (expiredVibrationOffBtn) expiredVibrationOffBtn.classList.toggle("active", draft.expired_vibration_enabled === false);

  const expiredPanelOnBtn = document.getElementById("expiredPanelOnBtn");
  const expiredPanelOffBtn = document.getElementById("expiredPanelOffBtn");
  if (expiredPanelOnBtn) expiredPanelOnBtn.classList.toggle("active", draft.expired_panel_enabled === true);
  if (expiredPanelOffBtn) expiredPanelOffBtn.classList.toggle("active", draft.expired_panel_enabled === false);

  // القيم الرقمية
  const expiredListLimit = document.getElementById("expired_list_limit_value");
  if (expiredListLimit) expiredListLimit.innerText = draft.expired_list_limit ?? 5;

  const reservationHold = document.getElementById("reservation_hold_minutes_value");
  if (reservationHold) reservationHold.innerText = draft.reservation_hold_minutes ?? 10;

  const pendingHold = document.getElementById("pending_hold_minutes_value");
  if (pendingHold) pendingHold.innerText = draft.pending_hold_minutes ?? 5;

  const cleaningHold = document.getElementById("cleaning_hold_minutes_value");
  if (cleaningHold) cleaningHold.innerText = draft.cleaning_hold_minutes ?? 10;
}

async function saveSettings() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert(eqModalText(
      'ليس لديك صلاحية لحفظ إعدادات التنبيهات والمؤقتات',
      'You do not have permission to save alerts and timers'
    ));
    return;
  }

  const businessId = currentUser?.business_id;

  if (!businessId || !settings?.id) {
    showAlert(eqModalText(
      "لم يتم العثور على إعدادات المطعم الحالي",
      "Restaurant settings were not found"
    ));
    return;
  }

  const payload = {
    /*
      لا نغيّر ready_mode من مودل التنبيهات والمؤقتات.
      قواعد الطابور تحفظ من مودل قواعد الطابور فقط.
    */
    ready_mode: settings?.ready_mode || settingsDraft.ready_mode || 'any_match',

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
    console.error("Save settings error:", error);
    showAlert(eqModalText("فشل حفظ الإعدادات", "Failed to save settings"));
    return;
  }

  settings = { ...settings, ...payload };

  closeSettingsModal();
  renderWaitingList();
  renderExpiredList();
  processReadyAlerts();

  if (typeof showSuccessNotification === "function") {
    showSuccessNotification(eqModalText("✅ تم حفظ الإعدادات", "✅ Settings saved"));
  }
}

// ============================================================
// QUEUE RULES MODAL
// ============================================================

function openQueueRulesModal() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert(eqModalText(
      'ليس لديك صلاحية لتعديل قواعد الطابور',
      'You do not have permission to edit queue rules'
    ));
    return;
  }

  settingsDraft = { ...settings };
  renderQueueRulesModal();

  const modal = document.getElementById('queueRulesModal');
  if (modal) modal.classList.add('show');
}

function closeQueueRulesModal() {
  const modal = document.getElementById('queueRulesModal');
  if (modal) modal.classList.remove('show');
}

function setQueueReadyMode(mode) {
  settingsDraft.ready_mode = mode;
  renderQueueRulesModal();
}

function renderQueueRulesModal() {
  setEqModalDirection("queueRulesModal");

  const draft = settingsDraft || settings || {};
  const currentMode = draft.ready_mode || settings?.ready_mode || 'any_match';

  // العنوان والوصف
  setEqElementText(
    "#queueRulesModal .eq-queue-rules-title",
    eqModalText("قواعد الطابور", "Queue Rules")
  );

  setEqElementText(
    "#queueRulesModal .eq-queue-rules-subtitle",
    eqModalText(
      "اختر طريقة السماح بالتعيين اليدوي عند توفر الطاولات",
      "Choose how manual assignment is allowed when tables become available"
    )
  );

  const policyCards = document.querySelectorAll("#queueRulesModal .eq-queue-policy-card");

  // وضع الانضباط
  if (policyCards[0]) {
    setEqElementHTML(
      policyCards[0].querySelector(".eq-queue-policy-title"),
      `
        <i class="fas fa-shield-alt"></i>
        ${eqModalText("وضع الانضباط", "Strict Mode")}
      `
    );

    setEqElementHTML(
      policyCards[0].querySelector(".eq-queue-policy-tag"),
      `
        <i class="fas fa-user-check"></i>
        ${eqModalText("سحب البطاقة الذهبية فقط", "Drag only the golden card")}
      `
    );

    setEqElementText(
      policyCards[0].querySelector(".eq-queue-policy-desc"),
      eqModalText(
        "يعرض النظام أول عميل جاهز بإطار ذهبي، ويسمح بسحب هذه البطاقة فقط للحفاظ على ترتيب الطابور وتقليل أخطاء التعيين.",
        "The system highlights the first ready customer with a golden frame and allows dragging only that card to preserve queue order and reduce assignment mistakes."
      )
    );

    setEqElementText(
      policyCards[0].querySelector(".eq-queue-policy-example"),
      eqModalText(
        "مناسب للمطاعم التي تريد أن يقود النظام قرار التعيين. أكثر عدلًا وتنظيمًا، ولكنه يقلل مرونة الموظف في اختيار مجموعة أكبر أو عميل آخر مناسب.",
        "Best for restaurants that want the system to lead the assignment decision. It is fairer and more organized, but reduces staff flexibility to choose a larger or different suitable group."
      )
    );
  }

  // وضع المرونة
  if (policyCards[1]) {
    setEqElementHTML(
      policyCards[1].querySelector(".eq-queue-policy-title"),
      `
        <i class="fas fa-hand-pointer"></i>
        ${eqModalText("وضع المرونة", "Flexible Mode")}
      `
    );

    setEqElementHTML(
      policyCards[1].querySelector(".eq-queue-policy-tag"),
      `
        <i class="fas fa-arrows-alt"></i>
        ${eqModalText("سحب أي بطاقة مناسبة", "Drag any suitable card")}
      `
    );

    setEqElementText(
      policyCards[1].querySelector(".eq-queue-policy-desc"),
      eqModalText(
        "يقترح النظام أول عميل جاهز بإطار ذهبي، لكن يسمح للموظف بسحب أي بطاقة أخرى يدويًا إذا كانت مناسبة للطاولة.",
        "The system still suggests the first ready customer with a golden frame, but staff can manually drag another suitable card when needed."
      )
    );

    setEqElementText(
      policyCards[1].querySelector(".eq-queue-policy-example"),
      eqModalText(
        "مناسب وقت الزحام أو عندما يريد الموظف اختيار مجموعة أكبر أو استغلال الطاولات بطريقة أفضل. يعطي مرونة أعلى، ويحتاج موظفًا واعيًا حتى لا يخل بترتيب الطابور.",
        "Useful during rush hours or when staff want to seat a larger group or use tables more efficiently. It gives more flexibility, but requires careful staff judgment to avoid unfair queue skipping."
      )
    );
  }

  // الملاحظة
  setEqElementHTML(
    "#queueRulesModal .eq-queue-rules-note span",
    eqModalText(
      "في الوضعين يظهر الإطار الذهبي على أول عميل جاهز فقط، وزر التعيين التلقائي يعيّن العميل الجاهز الأول. الفرق فقط في السماح أو منع السحب اليدوي لغير البطاقة الذهبية.",
      "In both modes, the golden frame appears only on the first ready customer, and auto assignment still assigns that first ready customer. The only difference is whether manual dragging of other suitable cards is allowed or blocked."
    )
  );

  // الأزرار
  const anyBtn = document.getElementById('queueRuleAnyBtn');
  const priorityBtn = document.getElementById('queueRulePriorityBtn');

  if (priorityBtn) {
    priorityBtn.classList.toggle('active', currentMode === 'queue_priority');
    priorityBtn.innerHTML = currentMode === 'queue_priority'
      ? `<i class="fas fa-check"></i> ${eqModalText("محدد", "Selected")}`
      : eqModalText("اختيار", "Choose");
  }

  if (anyBtn) {
    anyBtn.classList.toggle('active', currentMode === 'any_match');
    anyBtn.innerHTML = currentMode === 'any_match'
      ? `<i class="fas fa-check"></i> ${eqModalText("محدد", "Selected")}`
      : eqModalText("اختيار", "Choose");
  }

  const saveBtn = document.querySelector("#queueRulesModal .settings-save");
  if (saveBtn) {
    saveBtn.innerHTML = `
      <i class="fas fa-save"></i>
      ${eqModalText("حفظ", "Save")}
    `;
  }

  const closeBtn = document.querySelector("#queueRulesModal .settings-close");
  if (closeBtn) {
    closeBtn.innerHTML = eqModalText("إغلاق", "Close");
  }
}

async function saveQueueRulesSettings() {
  if (!canDo('manage_alerts') && !canDo('manage_timers')) {
    showAlert(eqModalText(
      'ليس لديك صلاحية لحفظ قواعد الطابور',
      'You do not have permission to save queue rules'
    ));
    return;
  }

  const businessId = currentUser?.business_id;

  if (!businessId || !settings?.id) {
    showAlert(eqModalText(
      'لم يتم العثور على إعدادات المطعم الحالي',
      'Restaurant settings were not found'
    ));
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
    showAlert(eqModalText('فشل حفظ قواعد الطابور', 'Failed to save queue rules'));
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

  if (typeof showSuccessNotification === "function") {
    showSuccessNotification(eqModalText("✅ تم حفظ قواعد الطابور", "✅ Queue rules saved"));
  }
}

// ============================================================
// TIMER SETTINGS MODAL
// ============================================================

function openTimerSettingsModal() {
  if (!canDo('manage_timers')) {
    showAlert(eqModalText(
      'ليس لديك صلاحية لإعدادات المؤقتات',
      'You do not have permission to manage timers'
    ));
    return;
  }

  const reservationDisplay = document.getElementById('reservation_hold_minutes_display');
  const cleaningDisplay = document.getElementById('cleaning_hold_minutes_display');

  if (reservationDisplay) reservationDisplay.innerText = settings.reservation_hold_minutes || 10;
  if (cleaningDisplay) cleaningDisplay.innerText = settings.cleaning_hold_minutes || 10;

  const modal = document.getElementById('timerSettingsModal');
  if (modal) modal.classList.add('show');
}

function closeTimerSettingsModal() {
  const modal = document.getElementById('timerSettingsModal');
  if (modal) modal.classList.remove('show');
}

function changeTimerSetting(key, delta, min, max) {
  const display = document.getElementById(key + '_display');
  if (!display) return;

  let current = parseInt(display.innerText) || min;
  let newValue = current + delta;

  if (newValue < min) newValue = min;
  if (newValue > max) newValue = max;

  display.innerText = newValue;
}

async function saveTimerSettings() {
  if (!canDo('manage_timers')) {
    showAlert(eqModalText(
      'ليس لديك صلاحية لحفظ إعدادات المؤقتات',
      'You do not have permission to save timer settings'
    ));
    return;
  }

  const reservationDisplay = document.getElementById('reservation_hold_minutes_display');
  const cleaningDisplay = document.getElementById('cleaning_hold_minutes_display');

  const newReservationHold = parseInt(reservationDisplay?.innerText);
  const newCleaningHold = parseInt(cleaningDisplay?.innerText);

  const businessId = currentUser?.business_id || settings?.business_id;

  if (!businessId || !settings?.id) {
    showAlert(eqModalText(
      "لم يتم العثور على إعدادات المطعم الحالي",
      "Restaurant settings were not found"
    ));
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
    showAlert(eqModalText("فشل حفظ إعدادات المؤقتات", "Failed to save timer settings"));
    return;
  }

  if (!data) {
    showAlert(eqModalText(
      "لم يتم تحديث أي سجل. تأكد أن الإعدادات تخص المطعم الحالي",
      "No record was updated. Make sure these settings belong to the current restaurant."
    ));
    return;
  }

  settings.reservation_hold_minutes = data.reservation_hold_minutes;
  settings.cleaning_hold_minutes = data.cleaning_hold_minutes;
  settings.pending_hold_minutes = data.pending_hold_minutes;

  closeTimerSettingsModal();

  if (typeof showSuccessNotification === "function") {
    showSuccessNotification(eqModalText("✅ تم حفظ إعدادات المؤقتات", "✅ Timer settings saved"));
  }
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

function zoneFloorText(arText, enText) {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    currentLang ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? enText : arText;
}

function getZoneFloorLang() {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    currentLang ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function getZoneDisplayNameById(zoneId) {
  const zone = DEFAULT_ZONES.find(z => z.id === zoneId);
  if (!zone) return zoneId || '-';

  return getZoneFloorLang() === 'ar'
    ? zone.nameAr
    : zone.nameEn;
}

function getFloorDisplayNameById(floorId) {
  const floor = DEFAULT_FLOORS.find(f => String(f.id) === String(floorId));
  if (!floor) return floorId || '-';

  return getZoneFloorLang() === 'ar'
    ? floor.nameAr
    : floor.nameEn;
}

function applyZonesModalStaticText() {
  const modal = document.getElementById('zonesModal');
  if (!modal) return;

  const isEnglish = getZoneFloorLang() === 'en';

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const title = modal.querySelector('.modal-title');
  if (title) {
    title.textContent = zoneFloorText('إدارة المناطق', 'Manage Zones');
  }

  const sub = modal.querySelector('.modal-sub');
  if (sub) {
    sub.textContent = zoneFloorText(
      'تفعيل أو تعطيل المناطق في المطعم',
      'Enable or disable restaurant zones'
    );
  }

  const saveBtn = modal.querySelector('button[onclick="saveZonePreferences()"]');
  if (saveBtn) {
    saveBtn.innerHTML = `
      <i class="fas fa-save"></i>
      ${zoneFloorText('حفظ التغييرات', 'Save Changes')}
    `;
  }

  const closeBtn = modal.querySelector('button[onclick="closeZonesModal()"]');
  if (closeBtn) {
    closeBtn.textContent = zoneFloorText('إغلاق', 'Close');
  }
}

function applyFloorsModalStaticText() {
  const modal = document.getElementById('floorsModal');
  if (!modal) return;

  const isEnglish = getZoneFloorLang() === 'en';

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const title = modal.querySelector('.modal-title');
  if (title) {
    title.textContent = zoneFloorText('إدارة الطوابق', 'Manage Floors');
  }

  const sub = modal.querySelector('.modal-sub');
  if (sub) {
    sub.textContent = zoneFloorText(
      'تفعيل أو تعطيل الطوابق في المطعم',
      'Enable or disable restaurant floors'
    );
  }

  const saveBtn = modal.querySelector('button[onclick="saveFloorPreferences()"]');
  if (saveBtn) {
    saveBtn.innerHTML = `
      <i class="fas fa-save"></i>
      ${zoneFloorText('حفظ التغييرات', 'Save Changes')}
    `;
  }

  const closeBtn = modal.querySelector('button[onclick="closeFloorsModal()"]');
  if (closeBtn) {
    closeBtn.textContent = zoneFloorText('إغلاق', 'Close');
  }
}

async function openZonesModal() {
  if (!canDo('manage_zones')) {
    showAlert(zoneFloorText(
      'ليس لديك صلاحية لإدارة المناطق',
      'You do not have permission to manage zones'
    ));
    return;
  }

  await loadActiveSettings();

  applyZonesModalStaticText();

  document.getElementById('zonesModal').classList.add('show');
  loadZones();
}

function closeZonesModal() {
  document.getElementById('zonesModal').classList.remove('show');
}

function loadZones() {
  applyZonesModalStaticText();

  const activeZones = globalActiveZones;
  const container = document.getElementById('zonesList');
  if (!container) return;

  container.innerHTML = DEFAULT_ZONES.map(zone => `
    <div class="zone-item">
      <span>${getZoneDisplayNameById(zone.id)}</span>
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

  const { data: usageRows, error: usageError } = await supabase
    .rpc('get_my_license_usage');

  if (usageError) {
    console.error('License usage check error:', usageError);
    showAlert(zoneFloorText(
      'تعذر التحقق من حدود الباقة. حاول مرة أخرى.',
      'Could not verify your plan limits. Please try again.'
    ));
    return;
  }

  const usage = Array.isArray(usageRows) ? usageRows[0] : null;

  if (!usage) {
    showAlert(zoneFloorText(
      'لا يمكن قراءة حدود باقة الاشتراك لهذا المطعم.',
      'Could not read the subscription limits for this restaurant.'
    ));
    return;
  }

  if (usage.max_zones !== null && activeZones.length > Number(usage.max_zones)) {
    showAlert(zoneFloorText(
      `لا يمكن تفعيل أكثر من ${usage.max_zones} مناطق في باقتك الحالية. المناطق المحددة الآن: ${activeZones.length}.`,
      `You cannot enable more than ${usage.max_zones} zones on your current plan. Selected zones now: ${activeZones.length}.`
    ));

    await loadActiveSettings();
    loadZones();

    return;
  }

  const oldZones = JSON.parse(localStorage.getItem('easyq_zones') || '["Indoor","Outdoor","VIP","Family","Smoking"]');
  const disabledZones = oldZones.filter(z => !activeZones.includes(z));

  for (const zone of disabledZones) {
    const tablesCount = floorData.filter(t => t.zone_name === zone && t.status === 'available').length;

    if (tablesCount > 0) {
      const zoneName = getZoneDisplayNameById(zone);

      showAlert(zoneFloorText(
        `⚠️ لا يمكن تعطيل منطقة "${zoneName}" لأن بها ${tablesCount} طاولة متاحة.\nالرجاء تعطيل الطاولات أولاً.`,
        `⚠️ You cannot disable "${zoneName}" because it has ${tablesCount} available tables.\nPlease disable the tables first.`
      ));
      return;
    }
  }

  localStorage.setItem('easyq_zones', JSON.stringify(activeZones));

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
      showAlert(zoneFloorText(
        'فشل حفظ الإعدادات في قاعدة البيانات',
        'Failed to save settings to the database'
      ));
      return;
    }
  }

  if (!activeZones.includes(currentZone) && currentZone !== "all") {
    currentZone = activeZones[0] || "all";
    const zoneNames = ZONE_NAMES;
    const zoneLang = getZoneFloorLang();

    document.getElementById('currentZoneLabel').innerHTML =
      zoneNames[currentZone]?.icon + ' ' +
      (zoneNames[currentZone]?.[zoneLang] || currentZone);
  }

  closeZonesModal();
  updateZoneDropdowns();
  await loadFloorPlan();
  renderFloorPlan();
  renderStatusSummary();
  loadZoneDropdown();

  showSuccessNotification(zoneFloorText(
    '✅ تم حفظ تفضيلات المناطق بنجاح',
    '✅ Zone preferences saved successfully'
  ));
}

async function openFloorsModal() {
  if (!canDo('manage_floors')) {
    showAlert(zoneFloorText(
      'ليس لديك صلاحية لإدارة الطوابق',
      'You do not have permission to manage floors'
    ));
    return;
  }

  await loadActiveSettings();

  applyFloorsModalStaticText();

  document.getElementById('floorsModal').classList.add('show');
  loadFloors();
}

function closeFloorsModal() {
  document.getElementById('floorsModal').classList.remove('show');
}

function loadFloors() {
  applyFloorsModalStaticText();

  const activeFloors = globalActiveFloors;
  const container = document.getElementById('floorsList');
  if (!container) return;

  container.innerHTML = DEFAULT_FLOORS.map(floor => `
    <div class="zone-item">
      <span>${getFloorDisplayNameById(floor.id)}</span>
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
    showAlert(zoneFloorText(
      'يجب تفعيل طابق واحد على الأقل',
      'At least one floor must be enabled'
    ));
    return;
  }

  const { data: usageRows, error: usageError } = await supabase
    .rpc('get_my_license_usage');

  if (usageError) {
    console.error('License usage check error:', usageError);
    showAlert(zoneFloorText(
      'تعذر التحقق من حدود الباقة. حاول مرة أخرى.',
      'Could not verify your plan limits. Please try again.'
    ));
    return;
  }

  const usage = Array.isArray(usageRows) ? usageRows[0] : null;

  if (!usage) {
    showAlert(zoneFloorText(
      'لا يمكن قراءة حدود باقة الاشتراك لهذا المطعم.',
      'Could not read the subscription limits for this restaurant.'
    ));
    return;
  }

  if (usage.max_floors !== null && activeFloors.length > Number(usage.max_floors)) {
    showAlert(zoneFloorText(
      `لا يمكن تفعيل أكثر من ${usage.max_floors} طوابق في باقتك الحالية. الطوابق المحددة الآن: ${activeFloors.length}.`,
      `You cannot enable more than ${usage.max_floors} floors on your current plan. Selected floors now: ${activeFloors.length}.`
    ));

    await loadActiveSettings();
    loadFloors();

    return;
  }

  const oldFloors = JSON.parse(localStorage.getItem('easyq_floors') || '["1","2","3"]');
  const disabledFloors = oldFloors.filter(f => !activeFloors.includes(f));

  for (const floor of disabledFloors) {
    const tablesCount = floorData.filter(t => String(t.floor_number) === floor && t.status === 'available').length;

    if (tablesCount > 0) {
      const floorName = getFloorDisplayNameById(floor);

      showAlert(zoneFloorText(
        `⚠️ لا يمكن تعطيل الطابق "${floorName}" لأن به ${tablesCount} طاولة متاحة.\nالرجاء تعطيل الطاولات أولاً.`,
        `⚠️ You cannot disable "${floorName}" because it has ${tablesCount} available tables.\nPlease disable the tables first.`
      ));
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
      showAlert(zoneFloorText(
        'فشل حفظ الإعدادات في قاعدة البيانات',
        'Failed to save settings to the database'
      ));
      return;
    }
  }

  if (!activeFloors.includes(String(currentFloor))) {
    currentFloor = parseInt(activeFloors[0]);
    const floorNames = FLOOR_NAMES;
    const floorLang = getZoneFloorLang();

    document.getElementById('currentFloorLabel').innerHTML =
      floorNames[String(currentFloor)]?.icon + ' ' +
      (floorNames[String(currentFloor)]?.[floorLang] || currentFloor);
  }

  closeFloorsModal();
  await loadFloorPlan();
  renderFloorPlan();
  renderStatusSummary();
  loadFloorDropdown();
  await loadActiveSettings();

  showSuccessNotification(zoneFloorText(
    '✅ تم حفظ تفضيلات الطوابق بنجاح',
    '✅ Floor preferences saved successfully'
  ));
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