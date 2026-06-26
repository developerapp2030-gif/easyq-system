// ============================================================
// HELPER FUNCTIONS
// ============================================================

// وقت التقريب
function timeSince(time) {
  if (!time) return "";
  const diff = Date.now() - new Date(time).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getRemainingReservationText(reservedAt) {
  if (!reservedAt) return "";
  const hold = Number(settings.reservation_hold_minutes || 10);
  const end = new Date(reservedAt).getTime() + hold * 60000;
  const diff = end - Date.now();
  if (diff <= 0) return "00:00";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRemainingFromExpiresAt(expiresAt) {
  if (!expiresAt) return "";

  const endTime = new Date(expiresAt).getTime();

  if (!Number.isFinite(endTime)) return "";

  const diff = endTime - Date.now();

  if (diff <= 0) return "00:00";

  const totalSeconds = Math.ceil(diff / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getTableTimerText(table) {
  if (!table) return "";

  const status = table.status || "available";

  /*
    مصدر الوقت الرسمي:
    - reserved: من hold_expires_at إذا وجد، وإلا fallback على reserved_at
    - cleaning: من cleaning_expires_at إذا وجد، وإلا fallback على cleaningTimers للجلسة الحالية
    - occupied: من occupied_at إذا وجد، وإلا fallback على seated_at/ reserved_at/ request_time
  */
  if (status === "reserved") {
    if (table.hold_expires_at) {
      return formatRemainingFromExpiresAt(table.hold_expires_at);
    }

    if (table.reserved_at) {
      return getRemainingReservationText(table.reserved_at);
    }

    return "";
  }

  if (status === "cleaning") {
    if (table.cleaning_expires_at) {
      return formatRemainingFromExpiresAt(table.cleaning_expires_at);
    }

    if (cleaningTimers[table.id]) {
      const remainingMs = cleaningTimers[table.id].expiresAt - Date.now();

      if (remainingMs <= 0) return "00:00";

      const totalSeconds = Math.ceil(remainingMs / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;

      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    return "";
  }

  if (status === "occupied") {
    const seatedTime =
      table.occupied_at ||
      table.seated_at ||
      table.reserved_at ||
      table.request_time;

    return seatedTime ? timeSince(seatedTime) : "";
  }

  if (table.customer_name) {
    if (table.reserved_at) return timeSince(table.reserved_at);
    if (table.request_time) return timeSince(table.request_time);
  }

  return "";
}

function isValidSaudiMobile(phone) {
  return /^05\d{8}$/.test(phone);
}

/* ============================================================
   EASY-Q | International Phone Helpers
   دوال مساعدة للهاتف الدولي - لا تغيّر السلوك وحدها
   ============================================================ */

window.easyqPhoneSettings = window.easyqPhoneSettings || {
  defaultCountryIso2: "sa",
  defaultDialCode: "966"
};

async function easyqLoadPhoneSettings(businessId = null) {
  try {
    const db =
      (typeof supabase !== "undefined" && supabase) ||
      window._supabaseClient ||
      window.supabaseClient ||
      null;

    if (!db || typeof db.rpc !== "function") {
      return window.easyqPhoneSettings;
    }

    const { data, error } = await db.rpc("easyq_get_phone_settings_v1", {
      p_business_id: businessId || null
    });

    if (error) {
      console.warn("easyqLoadPhoneSettings error:", error);
      return window.easyqPhoneSettings;
    }

    const iso2 = String(data?.default_country_iso2 || "sa").toLowerCase();
    const dialCode = String(data?.default_dial_code || "966").replace(/\D/g, "");

    window.easyqPhoneSettings = {
      defaultCountryIso2: /^[a-z]{2}$/.test(iso2) ? iso2 : "sa",
      defaultDialCode: dialCode || "966"
    };

    return window.easyqPhoneSettings;
  } catch (err) {
    console.warn("easyqLoadPhoneSettings failed:", err);
    return window.easyqPhoneSettings;
  }
}

function easyqGetDefaultPhoneCountry() {
  return String(
    window.easyqPhoneSettings?.defaultCountryIso2 ||
    "sa"
  ).toLowerCase();
}

function easyqInitIntlPhoneInput(inputEl, options = {}) {
  if (!inputEl) return null;

  if (inputEl._easyqIntlPhoneInstance) {
    return inputEl._easyqIntlPhoneInstance;
  }

  if (typeof window.intlTelInput !== "function") {
    console.warn("intlTelInput library is not loaded");
    return null;
  }

  const lang =
    (typeof currentLang !== "undefined" && currentLang) ||
    window.currentLang ||
    "ar";

  const placeholderText = String(lang).toLowerCase().startsWith("ar")
    ? "اكتب الرقم بدون مفتاح الدولة"
    : "Enter number without country code";

  inputEl.placeholder = options.placeholder || placeholderText;
  inputEl.setAttribute("autocomplete", "tel");
  inputEl.setAttribute("inputmode", "tel");
  inputEl.setAttribute("maxlength", "15");

  const instance = window.intlTelInput(inputEl, {
    initialCountry: options.initialCountry || easyqGetDefaultPhoneCountry(),
    separateDialCode: true,
    nationalMode: true,
    autoPlaceholder: "off",
    formatAsYouType: true,
    strictMode: true,
    useFullscreenPopup: false,
    placeholderNumberType: "MOBILE",
    validationNumberType: "MOBILE",
    preferredCountries: ["sa", "ae", "kw", "bh", "qa", "om", "eg", "sd"],
    ...options
  });

  inputEl._easyqIntlPhoneInstance = instance;

  inputEl.addEventListener("input", function () {
    easyqLimitLocalPhoneInput(inputEl, instance);
  });

  inputEl.addEventListener("countrychange", function () {
    inputEl.placeholder = options.placeholder || placeholderText;
    easyqLimitLocalPhoneInput(inputEl, instance);
  });

  return instance;
}

function easyqGetIntlPhoneValue(inputEl, instance = null) {
  if (!inputEl) return "";

  const intlInstance = instance || inputEl._easyqIntlPhoneInstance || null;
  const rawValue = String(inputEl.value || "").trim();

  if (!rawValue) return "";

  if (intlInstance && typeof intlInstance.getNumber === "function") {
    const intlNumber = intlInstance.getNumber();

    if (intlNumber) {
      return intlNumber.replace(/[^\d+]/g, "");
    }
  }

  if (rawValue.startsWith("+")) {
    return "+" + rawValue.replace(/\D/g, "");
  }

  return rawValue.replace(/[^\d]/g, "");
}

function easyqIsIntlPhoneValid(inputEl, instance = null) {
  if (!inputEl) return false;

  const intlInstance = instance || inputEl._easyqIntlPhoneInstance || null;

  const countryData =
    intlInstance && typeof intlInstance.getSelectedCountryData === "function"
      ? intlInstance.getSelectedCountryData()
      : null;

  const iso2 = String(
    countryData?.iso2 ||
    easyqGetDefaultPhoneCountry() ||
    "sa"
  ).toLowerCase();

  const dialCode = String(countryData?.dialCode || "").replace(/\D/g, "");
  const digits = String(inputEl.value || "").replace(/\D/g, "");

  if (!digits) return false;

  /*
    القاعدة المعتمدة:
    السعودية فقط تقبل:
    - 553473330
    - 0553473330
  */
  if (iso2 === "sa") {
    return /^5\d{8}$/.test(digits) || /^05\d{8}$/.test(digits);
  }

  /*
    باقي الدول:
    الموظف/العميل يكتب الرقم المحلي فقط بدون مفتاح الدولة.
    لذلك نرفض غالبًا إذا كتب مفتاح الدولة يدويًا داخل الخانة.
  */
  if (dialCode && digits.startsWith(dialCode)) {
    return false;
  }

  /*
    تحقق خفيف ومرن لباقي الدول.
    التحقق النهائي والحفظ الدولي سنثبته في saveWalkIn لاحقًا.
  */
  const maxLocalLength = dialCode ? Math.max(6, 15 - dialCode.length) : 15;

  return digits.length >= 6 && digits.length <= maxLocalLength;
}

function easyqLimitLocalPhoneInput(inputEl, instance = null) {
  if (!inputEl) return;

  const intlInstance = instance || inputEl._easyqIntlPhoneInstance || null;
  const countryData =
    intlInstance && typeof intlInstance.getSelectedCountryData === "function"
      ? intlInstance.getSelectedCountryData()
      : null;

  const iso2 = String(countryData?.iso2 || easyqGetDefaultPhoneCountry() || "sa").toLowerCase();

  let digits = String(inputEl.value || "").replace(/\D/g, "");

  /*
    القاعدة المعتمدة:
    - السعودية: نقبل 512345678 أو 0512345678
    - باقي الدول: الرقم المحلي فقط بدون مفتاح الدولة
    - الحد العام يمنع اللانهاية
  */
  let maxLength = 15;

  if (iso2 === "sa") {
    maxLength = digits.startsWith("0") ? 10 : 9;
  }

  if (digits.length > maxLength) {
    digits = digits.slice(0, maxLength);
  }

  if (inputEl.value !== digits) {
    inputEl.value = digits;
  }
}

function easyqPhoneToWhatsappDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function easyqGetIntlCountryDataList() {
  if (
    window.intlTelInput &&
    typeof window.intlTelInput.getCountryData === "function"
  ) {
    return window.intlTelInput.getCountryData();
  }

  if (
    window.intlTelInputGlobals &&
    typeof window.intlTelInputGlobals.getCountryData === "function"
  ) {
    return window.intlTelInputGlobals.getCountryData();
  }

  return [];
}

function easyqResolveCountryFromInternationalPhone(phone, fallbackIso2 = null) {
  const fallbackCountry = String(
    fallbackIso2 ||
    easyqGetDefaultPhoneCountry?.() ||
    "sa"
  ).toLowerCase();

  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) {
    return {
      iso2: fallbackCountry,
      dialCode: window.easyqPhoneSettings?.defaultDialCode || "966"
    };
  }

  const countries = easyqGetIntlCountryDataList()
    .filter(country => country && country.iso2 && country.dialCode)
    .sort((a, b) => String(b.dialCode).length - String(a.dialCode).length);

  /*
    إذا الرقم محفوظ دوليًا مثل:
    +966553473330
    +201012345678
    نحدد الدولة من مفتاحها.
  */
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const match = countries.find(country => {
      const dial = String(country.dialCode || "").replace(/\D/g, "");
      return dial && digits.startsWith(dial);
    });

    if (match) {
      return {
        iso2: String(match.iso2 || fallbackCountry).toLowerCase(),
        dialCode: String(match.dialCode || "").replace(/\D/g, "")
      };
    }
  }

  /*
    دعم أرقام قديمة محفوظة بدون علامة +
    مثال: 966553473330
  */
  const legacyMatch = countries.find(country => {
    const dial = String(country.dialCode || "").replace(/\D/g, "");
    return dial && digits.startsWith(dial) && digits.length > dial.length + 5;
  });

  if (legacyMatch) {
    return {
      iso2: String(legacyMatch.iso2 || fallbackCountry).toLowerCase(),
      dialCode: String(legacyMatch.dialCode || "").replace(/\D/g, "")
    };
  }

  return {
    iso2: fallbackCountry,
    dialCode: window.easyqPhoneSettings?.defaultDialCode || "966"
  };
}

function easyqSetIntlPhoneInputValue(inputEl, phone, instance = null) {
  if (!inputEl) {
    return {
      iso2: easyqGetDefaultPhoneCountry?.() || "sa",
      dialCode: window.easyqPhoneSettings?.defaultDialCode || "966",
      localDigits: ""
    };
  }

  const intlInstance = instance || inputEl._easyqIntlPhoneInstance || null;

  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");

  const resolved = easyqResolveCountryFromInternationalPhone(raw);

  if (intlInstance && typeof intlInstance.setCountry === "function") {
    intlInstance.setCountry(resolved.iso2);
  }

  if (!digits) {
    inputEl.value = "";
    return {
      ...resolved,
      localDigits: ""
    };
  }

  let localDigits = digits;

  if (resolved.dialCode && localDigits.startsWith(resolved.dialCode)) {
    localDigits = localDigits.substring(resolved.dialCode.length);
  }

  /*
    للسعودية في التعديل نعرض الرقم المحلي بدون صفر:
    +966553473330 => 553473330
    0553473330    => 553473330
  */
  if (resolved.iso2 === "sa" && localDigits.startsWith("0")) {
    localDigits = localDigits.substring(1);
  }

  inputEl.value = localDigits;

  if (typeof easyqLimitLocalPhoneInput === "function") {
    easyqLimitLocalPhoneInput(inputEl, intlInstance);
  }

  return {
    ...resolved,
    localDigits
  };
}

function getStatusClass(status) {
  if (status === "occupied") return "status-occupied";
  if (status === "cleaning") return "status-cleaning";
  if (status === "disabled") return "status-disabled";
  if (status === "reserved") return "status-reserved";
  if (status === "pending") return "status-pending";
  return "status-available";
}

function getStatusLabel(status) {
  const lang = window.currentLang || currentLang || 'ar';
    if (status === "occupied") return currentLang === 'ar' ? "مشغولة" : "Occupied";
    if (status === "cleaning") return currentLang === 'ar' ? "تنظيف" : "Cleaning";
    if (status === "disabled") return currentLang === 'ar' ? "مغلقة" : "Disabled";
    if (status === "reserved") return currentLang === 'ar' ? "محجوزة" : "Reserved";
    if (status === "pending") return currentLang === 'ar' ? "معلقة" : "Pending";
    return currentLang === 'ar' ? "متاحة" : "Available";
}

function getSourceLabel(source) {
  if (source === "walk_in") return "Walk-in";
  if (source === "restored") return "Restored";
  return "WhatsApp";
}

function filteredFloorData() {
  let dataByFloor = floorData.filter(r => r.floor_number === currentFloor);
  if (currentZone !== "all") {
    dataByFloor = dataByFloor.filter(r => r.zone_name === currentZone);
  }
  return dataByFloor;
}

function filteredWaitingData() {
  return waitingData;
}

function filteredExpiredData() {
  let filtered = expiredData;
  if (currentZone !== "all") {
    filtered = filtered.filter(e => e.zone_name === currentZone);
  }
  return filtered;
}

function getActivePartySize() {
  return draggedPartySize || selectedPartySize;
}

function isSuitableTable(row) {
  const ps = getActivePartySize();
  if (!ps || row.status !== "available" || Number(row.capacity) < Number(ps)) return false;
  
  const selectedCustomer = waitingData.find(w => w.request_id === selectedRequestId);
  if (selectedCustomer && selectedCustomer.zone_name && selectedCustomer.zone_name !== "") {
    return row.zone_name === selectedCustomer.zone_name;
  }
  
  return true;
}

function hasMatchingAvailableTable(wRow) {
  const currentFloorTables = floorData.filter(t => t.floor_number === currentFloor);
  
  let suitableTables = currentFloorTables.filter(t => 
    t.status === "available" && 
    Number(t.capacity) >= Number(wRow.requested_party_size)
  );
  
  if (wRow.zone_name && wRow.zone_name !== "") {
    suitableTables = suitableTables.filter(t => t.zone_name === wRow.zone_name);
  }
  
  const hasMatch = suitableTables.length > 0;
  
  if (settings.ready_mode === "queue_priority") {
    const waitingList = filteredWaitingData();
    const firstReady = waitingList.find(w => {
      let tables = currentFloorTables.filter(t => 
        t.status === "available" && 
        Number(t.capacity) >= Number(w.requested_party_size)
      );
      if (w.zone_name && w.zone_name !== "") {
        tables = tables.filter(t => t.zone_name === w.zone_name);
      }
      return tables.length > 0;
    });
    return firstReady && firstReady.request_id === wRow.request_id && hasMatch;
  }
  
  return hasMatch;
}

// ============================================================
// TIMER FUNCTIONS
// ============================================================

function startTableTimer(tableId, tableName) {
  occupiedTimers[tableId] = Date.now();
  console.log(`⏱️ بدء مراقبة الطاولة: ${tableName}`);
}

function stopTableTimer(tableId, tableName) {
  if (occupiedTimers[tableId]) {
    const elapsed = (Date.now() - occupiedTimers[tableId]) / 60000;
    console.log(`⏱️ انتهت مراقبة الطاولة: ${tableName} (مكثت ${elapsed.toFixed(1)} دقيقة)`);
    delete occupiedTimers[tableId];
  }
}

function showOccupiedTimes() {
  const occupiedTables = floorData.filter(t => t.status === "occupied");
  if (occupiedTables.length === 0) return;
  
  console.log("=== الطاولات المشغولة حالياً ===");
  for (const table of occupiedTables) {
    if (occupiedTimers[table.id]) {
      const elapsed = (Date.now() - occupiedTimers[table.id]) / 60000;
      console.log(`🍽️ ${table.table_name}: ${elapsed.toFixed(1)} دقيقة`);
    }
  }
}

// ============================================================
// UPDATE ALL TIMERS
// ============================================================

function updateAllTimers() {
  const timerElements = document.querySelectorAll('.table-timer');
  if (timerElements.length > 0) {
    timerElements.forEach((timerEl) => {
      const card = timerEl.closest('.table-card');
      if (!card) return;

      const tableId = card.getAttribute('data-id') || card.getAttribute('data-table-id');
      if (!tableId) return;

      const table = floorData.find(t => String(t.id) === String(tableId));
      if (!table) return;

      /*
        عند انتهاء وقت التنظيف من المصدر الرسمي cleaning_expires_at
        نعيد الطاولة تلقائياً إلى متاحة.
        نستخدم Set لمنع تكرار نفس الطلب كل ثانية قبل انتهاء التحديث.
      */
      if (table.status === 'cleaning' && table.cleaning_expires_at) {
        const expiresAt = new Date(table.cleaning_expires_at).getTime();

        if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
          if (!window.easyqCleaningAutoReleaseInProgress) {
            window.easyqCleaningAutoReleaseInProgress = new Set();
          }

          if (!window.easyqCleaningAutoReleaseInProgress.has(String(table.id))) {
            window.easyqCleaningAutoReleaseInProgress.add(String(table.id));

            timerEl.innerHTML = `<i class="far fa-clock"></i> 00:00`;

            if (typeof changeTableStatus === 'function') {
              changeTableStatus(table.id, 'available')
                .catch(err => {
                  console.error('❌ فشل تحويل الطاولة من تنظيف إلى متاحة:', err);
                })
                .finally(() => {
                  window.easyqCleaningAutoReleaseInProgress.delete(String(table.id));
                });
            }
          }

          return;
        }
      }

      if (table.status === 'occupied' || table.status === 'reserved' || table.status === 'cleaning') {
        const newTime = typeof getTableTimerText === 'function'
          ? getTableTimerText(table)
          : '';

        if (newTime) {
          timerEl.innerHTML = `<i class="far fa-clock"></i> ${newTime}`;
        } else {
          timerEl.innerHTML = '';
        }
      }
    });
  }
  
  const waitingCards = document.querySelectorAll('.waiting-card');
  waitingCards.forEach((card) => {
    const requestId = card.getAttribute('data-request-id');
    const waitingItem = waitingData.find(w => w.request_id === requestId);
    
    if (waitingItem && (waitingItem.status === 'waiting' || waitingItem.status === 'offered')) {
      const timeSpan = card.querySelector('.detail-item:last-child');
      if (timeSpan) {
        const newTime = timeSince(waitingItem.local_time || waitingItem.created_at || waitingItem.request_time);
        timeSpan.innerHTML = `<i class="fas fa-clock"></i> ${newTime}`;
      }
    }
  });
  
  const expiredCards = document.querySelectorAll('.expired-card');
  expiredCards.forEach((card) => {
    const timeSpan = card.querySelector('.detail-item:last-child');
    if (!timeSpan) return;
    
    const restoreBtn = card.querySelector('button[onclick^="restoreExpiredBooking"]');
    if (restoreBtn) {
      const onclickAttr = restoreBtn.getAttribute('onclick');
      const match = onclickAttr.match(/restoreExpiredBooking\('([^']+)'\)/);
      if (match && match[1]) {
        const expiredItem = cachedExpiredData.find(e => e.id === match[1]);
        if (expiredItem && expiredItem.expired_at) {
          const newTime = timeSince(expiredItem.expired_at);
          timeSpan.innerHTML = `<i class="fas fa-hourglass-end"></i> ${newTime} منتهية`;
        }
      }
    }
  });
}

// ============================================================
// DATE UPDATE
// ============================================================

function updateDate() {
  const today = new Date();
  const locale = currentLang === "ar" ? "ar-SA" : "en-US";
  const dateTextEl = document.getElementById("dateText");
  if (dateTextEl) {
    dateTextEl.innerHTML = today.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
}

// ============================================================
// GRID & POSITION HELPERS
// ============================================================

function snapToGrid(x, y, gridSize = 160) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

function validateTablePosition(x, y, tableId, gridSize = 160) {
  const canvas = document.getElementById('floorCanvas');
  const canvasWidth = canvas ? canvas.clientWidth : 1000;
  const canvasHeight = canvas ? canvas.clientHeight : 800;
  
  x = Math.max(0, Math.min(x, canvasWidth - 150));
  y = Math.max(0, Math.min(y, canvasHeight - 120));
  
  const snapped = snapToGrid(x, y, gridSize);
  
  const tables = filteredFloorData();
  const isOccupied = tables.some(t => 
    t.id !== tableId && 
    t.pos_x === snapped.x && 
    t.pos_y === snapped.y
  );
  
  if (isOccupied) {
    for (let offsetX = 0; offsetX <= gridSize * 3; offsetX += gridSize) {
      for (let offsetY = 0; offsetY <= gridSize * 3; offsetY += gridSize) {
        const checkX = snapped.x + offsetX;
        const checkY = snapped.y + offsetY;
        const checkX2 = snapped.x - offsetX;
        const checkY2 = snapped.y - offsetY;
        
        const positions = [
          { x: checkX, y: snapped.y },
          { x: snapped.x, y: checkY },
          { x: checkX2, y: snapped.y },
          { x: snapped.x, y: checkY2 }
        ];
        
        for (const pos of positions) {
          if (pos.x >= 0 && pos.x <= canvasWidth - 150 && pos.y >= 0 && pos.y <= canvasHeight - 120) {
            const free = !tables.some(t => t.id !== tableId && t.pos_x === pos.x && t.pos_y === pos.y);
            if (free) return pos;
          }
        }
      }
    }
  }
  
  return snapped;
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

function canDo(permissionKey) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return userPermissions[permissionKey] === true;
}

function disableCustomerDragDrop(disable) {
  const waitingCards = document.querySelectorAll('.waiting-card');
  waitingCards.forEach(card => {
    if (disable) {
      card.draggable = false;
      card.style.cursor = 'default';
      card.style.opacity = '0.6';
    } else {
      card.draggable = true;
      card.style.cursor = 'grab';
      card.style.opacity = '1';
    }
  });
}

// ============================================================
// MOBILE OPTIMIZATION
// ============================================================

function optimizeForTouch() {
  if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
    const buttons = document.querySelectorAll('button, .menu-item, .table-card, .waiting-card, .icon-btn');
    buttons.forEach(btn => {
      if (btn) btn.style.touchAction = 'manipulation';
    });
  }
}

function handleOrientationChange() {
  setTimeout(() => {
    renderFloorPlan();
    renderWaitingList();
    renderExpiredList();
    renderStatusSummary();
  }, 100);
}

// ============================================================
// PARTY SIZE HELPERS
// ============================================================

function changePartySize(delta) {
  currentPartySize = Math.max(1, Math.min(20, currentPartySize + delta));
  const walkInPartyValue = document.getElementById('walkInPartyValue');
  const walkInParty = document.getElementById('walkInParty');
  if (walkInPartyValue) walkInPartyValue.innerText = currentPartySize;
  if (walkInParty) walkInParty.value = currentPartySize;
}

function changeEditPartySize(delta) {
  currentEditPartySize = Math.max(1, Math.min(20, currentEditPartySize + delta));
  const editPartyValue = document.getElementById('editPartyValue');
  const editParty = document.getElementById('editParty');
  if (editPartyValue) editPartyValue.innerText = currentEditPartySize;
  if (editParty) editParty.value = currentEditPartySize;
}

// ============================================================
// PASSWORD HASHING
// ============================================================

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// TOGGLE PASSWORD VISIBILITY
// ============================================================

function togglePassword() {
  const input = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIcon');
  if (input && icon) {
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  }
}

// ============================================================
// ERROR LOGGING (أضف هذا القسم الجديد)
// ============================================================

// تسجيل خطأ في قاعدة البيانات
async function logError(errorCode, errorMessage, endpoint = null, method = null) {
    try {
        // التحقق من وجود مستخدم مسجل الدخول
        if (!currentUser?.business_id) {
            console.warn('Cannot log error: no business_id');
            return;
        }
        
        const { data, error } = await supabase.rpc('log_error', {
            p_error_code: errorCode,
            p_error_message: errorMessage,
            p_endpoint: endpoint,
            p_method: method
        });
        
        if (error) {
            console.error('Failed to log error:', error);
            return;
        }
        
        console.log('✅ Error logged successfully, ID:', data);
    } catch (e) {
        console.error('❌ Error logging failed:', e);
    }
}

// ============================================================
// END ERROR LOGGING
// ============================================================
