// ============================================================
// EASY-Q BOOKING & QUEUE PAGE (Mobile First)
// ============================================================

// تعريف supabase مباشرة من window

// Global state
let currentRequestId = null;
let currentQueueNumber = null;
let currentBusinessId = null;
let currentCustomerId = null;
let realtimeChannel = null;
let isGuestViewOnly = false;
let currentBusinessProfile = null;

// ============================================================
// إعدادات واجهة الحجز V2
// ============================================================

const EASYQ_BOOKING_SETTINGS_KEY = "booking_settings_v2";

const DEFAULT_EASYQ_BOOKING_SETTINGS = {
  welcome_message: "مرحباً بك، احجز دورك بسهولة وتابع حالة انتظارك مباشرة.",
  restore_hint_prefix: "إذا كان لديك حجز نشط",
  restore_hint_link: "اضغط هنا",
  restore_hint_suffix: "... ولحجز جديد املأ البيانات أدناه",
  current_queue_title: "الطابور الحالي",
  current_queue_sub: "يتم تحديث الرقم مباشرة",
  submit_button_text: "تأكيد الحجز",
  notification_button_text: "تفعيل إشعارات الدور",

  share_hint_text: "شارك أصدقاءك ليتابعوا ويشاهدوا حجزك فقط، لن يتمكنوا من إلغاء الحجز.",
  guest_view_text: "يمكنك متابعة الحجز من هنا، والإلغاء متاح لصاحب الحجز فقط",
  reference_label_text: "رقم حجزك المرجعي:",
  reference_save_hint_text: "💡قم بحفظ رقم حجزك المرجعي لاستعراض صفحة انتظار حجزك من أي هاتف آخر أو في حال إغلاقها",
  cancel_waiting_text: "إلغاء الحجز",
  cannot_attend_title: "لا أستطيع الحضور",
  cannot_attend_sub: "اضغط هنا إذا لم تتمكن من الحضور، لتحرير الطاولة لعميل آخر.",
  exit_text: "خروج",

  share_booking_enabled: true,
  cancel_waiting_enabled: true,
  cannot_attend_enabled: true,
  show_current_queue: false,
  show_zone_selector: true,
  show_business_logo: true,
  show_business_info: true,
  show_restore_hint: true,
  show_reference_code: true,
  show_notification_button: true,

  page_bg_start: "#0A0A0F",
  page_bg_end: "#1A1A2A",
  primary_color: "#8B0000",
  primary_color_2: "#C62828",
  accent_color: "#FFD700",
  progress_color: "#D4AF37",
  success_color: "#10B981",
  text_color: "#FFFFFF",
  muted_text_color: "rgba(255,255,255,0.65)",
  card_bg_color: "rgba(255,255,255,0.05)",
  button_text_color: "#FFFFFF"
};

let easyQBookingSettings = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };

function bookingText(key) {
  return easyQBookingSettings?.[key] ?? DEFAULT_EASYQ_BOOKING_SETTINGS[key] ?? "";
}

function bookingEnabled(key) {
  return easyQBookingSettings?.[key] !== false;
}

async function loadEasyQBookingSettings() {
  if (!currentBusinessId) {
    easyQBookingSettings = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };
    return easyQBookingSettings;
  }

  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("setting_value")
    .eq("business_id", currentBusinessId)
    .eq("setting_key", EASYQ_BOOKING_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.error("❌ فشل تحميل إعدادات واجهة الحجز:", error);
    easyQBookingSettings = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };
    applyEasyQBookingTheme();
    return easyQBookingSettings;
  }

  let savedSettings = {};

  try {
    savedSettings = data?.setting_value ? JSON.parse(data.setting_value) : {};
  } catch (err) {
    console.warn("⚠️ booking_settings_v2 ليس JSON صالح:", err);
    savedSettings = {};
  }

  easyQBookingSettings = {
    ...DEFAULT_EASYQ_BOOKING_SETTINGS,
    ...savedSettings
  };

  applyEasyQBookingTheme();

  console.log("✅ تم تحميل إعدادات واجهة الحجز:", easyQBookingSettings);
  return easyQBookingSettings;
}

function applyEasyQBookingTheme() {
  const s = easyQBookingSettings || DEFAULT_EASYQ_BOOKING_SETTINGS;
  const root = document.documentElement;

  root.style.setProperty("--booking-bg-start", s.page_bg_start);
  root.style.setProperty("--booking-bg-end", s.page_bg_end);
  root.style.setProperty("--booking-primary", s.primary_color);
  root.style.setProperty("--booking-primary-2", s.primary_color_2);
  root.style.setProperty("--booking-accent", s.accent_color);
  root.style.setProperty("--booking-progress", s.progress_color);
  root.style.setProperty("--booking-success", s.success_color);
  root.style.setProperty("--booking-text", s.text_color);
  root.style.setProperty("--booking-muted-text", s.muted_text_color);
  root.style.setProperty("--booking-card-bg", s.card_bg_color);
  root.style.setProperty("--booking-button-text", s.button_text_color);
}
// ============================================================
// إعدادات Realtime Watchdog
// ============================================================
const MAX_SILENT_ATTEMPTS = 3;
const ZOMBIE_TIMEOUT = 30000; // 30 ثانية
let silentReconnectAttempts = 0;
let lastRealtimePulse = Date.now();
let showCurrentQueueConfig = false;
let zonesEnabled = false;
let availableZones = [];

// DOM Elements
let app = null;

let continuousAlertInterval = null;
let isAlertStopped = false;
let previousStatus = null;  // <--- أضف هذا السطر هنا
// ========== منع تكرار التنبيهات ==========
let lastCustomerAlertKey = null;
let hasInitialStatusLoaded = false;
let readyAlertStartedForRequestId = null;

// ========== كشف سرعة المتصفح ==========
let browserSpeedTested = false;
let isBrowserFast = true;

async function testBrowserSpeed() {
    if (browserSpeedTested) return isBrowserFast;
    
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        // اختبار WebSocket
        const ws = new WebSocket('wss://zjdfadkonftkgljvzxoy.supabase.co/realtime/v1/websocket?apikey=' + SUPABASE_ANON_KEY);
        let responded = false;
        
        const timeout = setTimeout(() => {
            if (!responded) {
                ws.close();
                isBrowserFast = false;
                browserSpeedTested = true;
                console.log('🐌 تم اكتشاف متصفح بطيء (WebSocket لم يستجب خلال 5 ثوانٍ)');
                resolve(false);
            }
        }, 5000);
        
        ws.onopen = () => {
            const elapsed = performance.now() - startTime;
            ws.close();
            clearTimeout(timeout);
            
            isBrowserFast = elapsed < 1500;
            browserSpeedTested = true;
            console.log(`⚡ سرعة الاتصال: ${elapsed.toFixed(0)}ms - ${isBrowserFast ? 'سريع ✅' : 'بطيء 🐌'}`);
            resolve(isBrowserFast);
        };
        
        ws.onerror = () => {
            clearTimeout(timeout);
            ws.close();
            isBrowserFast = false;
            browserSpeedTested = true;
            console.log('❌ فشل اتصال WebSocket، تفعيل وضع البطيء');
            resolve(false);
        };
    });
}

function shouldTriggerCustomerAlert(alertType, data = {}) {
    if (!hasInitialStatusLoaded) {
        console.log('🔕 منع التنبيه في أول تحميل');
        return false;
    }
    const requestId = currentRequestId || data.requestId || 'no-request';
    const queuePosition = data.queuePosition ?? currentQueueNumber ?? 'no-position';
    const status = data.status || 'no-status';
    const alertKey = `${requestId}:${alertType}:${status}:${queuePosition}`;
    if (lastCustomerAlertKey === alertKey) {
        console.log('🔕 تم منع تكرار التنبيه:', alertKey);
        return false;
    }
    lastCustomerAlertKey = alertKey;
    return true;
}

function resetCustomerAlertProtection() {
    lastCustomerAlertKey = null;
    hasInitialStatusLoaded = false;
}
// ========== الفحص الاحتياطي ==========
let customerSafetyPolling = null;
let isSafetyRefreshRunning = false;

// ========== الدوال المساعدة ==========


function requestNotificationPermission() {
    // سيتم تفعيلها لاحقاً
}



// ========== الدوال الأساسية ==========

async function loadBookingBusinessIdentity() {
  if (!currentBusinessId) {
    console.warn("⚠️ لا يوجد business_id لجلب بيانات المطعم");
    currentBusinessProfile = null;
    return null;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, branch_name, city, address, phone, logo_url, google_maps_url, instagram_url, website_url")
    .eq("id", currentBusinessId)
    .maybeSingle();

  if (error) {
    console.error("❌ فشل جلب بيانات المطعم:", error);
    currentBusinessProfile = null;
    return null;
  }

  currentBusinessProfile = data || null;
  console.log("✅ تم تحميل بيانات المطعم لصفحة الحجز:", currentBusinessProfile);

  return currentBusinessProfile;
}

async function getBusinessSettings() {
    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('business_id') || '5a2fd95a-0f88-4c70-89db-e6ee7ba8f49c';
    await loadBookingBusinessIdentity();
    await loadEasyQBookingSettings();

    const { data: queueSetting } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('business_id', currentBusinessId)
        .eq('setting_key', 'show_current_queue')
        .maybeSingle();
    
    showCurrentQueueConfig = easyQBookingSettings.show_current_queue === true;

    const { data: zonesSetting } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('business_id', currentBusinessId)
        .eq('setting_key', 'active_zones')
        .maybeSingle();
    
    if (zonesSetting?.setting_value) {
    zonesEnabled = bookingEnabled("show_zone_selector");
    availableZones = JSON.parse(zonesSetting.setting_value);
     console.log('✅ availableZones loaded:', availableZones);
    } else {
        console.log('⚠️ No zones setting found');
    }
}

async function getCurrentQueueNumber() {

    if (!currentRequestId) return;

    const { data: request, error } = await supabase
        .from('table_requests')
        .select('queue_position, status')
        .eq('id', currentRequestId)
        .maybeSingle()

if (error) {
    console.error('Queue Fetch Error:', error);
    return;
}

if (!request) return;

currentQueueNumber =
    request?.queue_position || '--';

    const queueEl =
        document.getElementById('liveQueueNumber');

    if (queueEl) {
        queueEl.innerText = currentQueueNumber;
    }

    const servingEl =
        document.getElementById('currentServingNumber');

    if (servingEl) {
        servingEl.innerText = currentQueueNumber;
    }
}

async function getRemainingHoldTime() {
    if (!currentRequestId) return null;
    
    const { data, error } = await supabase.rpc('get_remaining_hold_time', {
        p_request_id: currentRequestId
    });
    
    if (error || !data?.has_active_reservation) return null;
    return data.remaining_seconds;
}


async function renderUI() {
    console.log('🔍 renderUI - currentRequestId:', currentRequestId);
    const hasActiveBooking = currentRequestId && sessionStorage.getItem('booking_cancelled') !== 'true';
    
    if (hasActiveBooking) {
        // جلب البيانات كاملة (*) لضمان عدم حدوث تضارب في الاسم
        const { data: request, error } = await supabase
            .from('table_requests')
            .select('*')
            .eq('id', currentRequestId)
            .maybeSingle();

        if (error || !request) {
            console.log('❌ Booking not found, clearing localStorage');
            localStorage.removeItem('current_booking_id');
            currentRequestId = null;
            await renderBookingForm();
            return;
        }
        
        if (request.status === 'cancelled' || request.status === 'expired') {
            console.log('❌ Booking is cancelled/expired, clearing localStorage');
            localStorage.removeItem('current_booking_id');
            currentRequestId = null;
            await renderBookingForm();
            return;
        }
        
        // تمرير كائن الطلب كاملاً لمنع ظهور كلمة "ضيف"
        await renderStatusPage(request);
    } else {
        await renderBookingForm();
    }
}

function getBookingBusinessHeaderHtml() {
  const business = currentBusinessProfile || {};

  const businessName = business.name || "EASY-Q";
  const branchName = business.branch_name || "";
  const cityName = business.city || "";
  const addressText = business.address || "";
  const logoUrl = business.logo_url || "";

  const showLogo = bookingEnabled("show_business_logo");
  const showBusinessInfo = bookingEnabled("show_business_info");

  const logoHtml = logoUrl
    ? `
      <div class="restaurant-logo has-logo">
        <img 
          src="${logoUrl}" 
          alt="${businessName}" 
          onerror="this.style.display='none'; this.parentElement.classList.remove('has-logo'); this.parentElement.innerHTML='<i class=&quot;fas fa-utensils&quot;></i>';"
        >
      </div>
    `
    : `
      <div class="restaurant-logo">
        <i class="fas fa-utensils"></i>
      </div>
    `;

  return `
    <div class="booking-header">

      ${showLogo ? logoHtml : ""}

      ${showBusinessInfo ? `
        <div class="restaurant-name">
          ${businessName}
        </div>

        ${branchName ? `
          <div class="restaurant-branch">
            ${branchName}
          </div>
        ` : ""}

        ${(cityName || addressText) ? `
          <div class="restaurant-address">
            ${cityName ? `<span>${cityName}</span>` : ""}
            ${(cityName && addressText) ? `<span class="address-separator"> - </span>` : ""}
            ${addressText ? `<span>${addressText}</span>` : ""}
          </div>
        ` : ""}
      ` : ""}

      <div class="datetime-row">
        <span id="currentDate"></span>
        <span id="currentTime"></span>
      </div>

    </div>
  `;
}

async function renderBookingForm() {
  app.innerHTML = `
    <div class="container">
      ${getBookingBusinessHeaderHtml()}
      
      <div class="welcome-message">
        <i class="fas fa-hands-helping" style="margin-left: 9px; color: var(--booking-accent);"></i>
        ${bookingText("welcome_message")}
      </div>
                 <!-- سطر استعادة الحجز -->
      ${bookingEnabled("show_restore_hint") ? `
        <div class="restore-hint" style="text-align: center; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 20px; font-size: 13px;">
          <span style="color: rgba(255,255,255,0.8);">${bookingText("restore_hint_prefix")} </span>
          <span onclick="openRestoreModal()" style="color: var(--booking-success); font-weight: bold; cursor: pointer; text-decoration: underline;">${bookingText("restore_hint_link")}</span>
          <span style="color: rgba(255,255,255,0.8);"> ${bookingText("restore_hint_suffix")}</span>
        </div>
      ` : ""}
      
      ${showCurrentQueueConfig ? `
      <div class="current-queue-card" id="currentQueueCard">
                <div class="current-queue-title">${bookingText("current_queue_title")}</div>
        <div class="current-number-circle">
          <div class="current-number" id="liveQueueNumber">${currentQueueNumber || '--'}</div>
        </div>
        <div class="current-queue-sub">${bookingText("current_queue_sub")}</div>
      </div>
      ` : ''}
      
      <div class="booking-card">
        <div class="form-group">
          <label class="form-label">الاسم</label>
          <input type="text" id="customerName" class="form-input" placeholder="أدخل اسمك">
        </div>
        
        <div class="form-group">
          <label class="form-label">رقم الجوال</label>
          <input type="tel" id="customerPhone" class="form-input" placeholder="05xxxxxxxx" maxlength="10">
        </div>
        
        ${(zonesEnabled && bookingEnabled("show_zone_selector")) ? `
        <div class="form-group">
          <label class="form-label">المنطقة</label>
          <select id="customerZone" class="form-input">
            <option value="">بدون تفضيل</option>
            ${availableZones.map(zone => `<option value="${zone}">${zone}</option>`).join('')}
          </select>
        </div>
        ` : ''}
        
        <div class="form-group">
          <label class="form-label">عدد الأشخاص</label>
          <div class="party-stepper">
            <button class="stepper-btn" onclick="changePartySize(-1)">-</button>
            <span class="stepper-value" id="partySizeValue">2</span>
            <button class="stepper-btn" onclick="changePartySize(1)">+</button>
          </div>
        </div>
        
       <button class="submit-btn" id="submitBookingBtn">
       ${bookingText("submit_button_text")}
        </button>
      </div>
      
            ${bookingEnabled("show_notification_button") ? `
        <div id="notificationBtnContainer" class="hidden">
          <button class="notif-btn" id="enableNotifBtn">
            <i class="fas fa-bell"></i> ${bookingText("notification_button_text")}
          </button>
        </div>
      ` : ""}
    </div>
  `;
  
  document.getElementById('submitBookingBtn')?.addEventListener('click', submitBooking);
  document.getElementById('enableNotifBtn')?.addEventListener('click', () => requestNotificationPermission(true));
}


function getTimelineStatus(step, requestStatus, remainingCount, isFinished = false) {
  if (requestStatus === 'cancelled') return '';
  if (step === 0) return 'completed';
  if (step === 1) {
    if (remainingCount > 0) return 'active';
    if (isFinished) return 'completed';
    return '';
  }
  if (step === 2) {
    if (remainingCount === 1 && !isFinished) return 'active';
    if (isFinished) return 'completed';
    return '';
  }
  if (step === 3) {
    if (isFinished) return 'active completed';
    return '';
  }
  return '';
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

async function getBookingCustomerName(request) {
  // 1) إذا الاسم موجود داخل كائن الطلب نفسه
  if (request?.customer_name) {
    return request.customer_name;
  }

  // 2) إذا الاسم محفوظ كسنابشوت داخل table_requests
  if (request?.customer_name_snapshot) {
    return request.customer_name_snapshot;
  }

  // 3) إذا الاسم موجود مؤقتًا في نفس الجهاز
  if (window.currentCustomerName && window.currentCustomerName !== 'ضيف') {
    return window.currentCustomerName;
  }

  // 4) جلب الاسم الحقيقي من جدول customers عبر customer_id
  if (request?.customer_id) {
    const { data, error } = await supabase
      .from('customers')
      .select('name')
      .eq('id', request.customer_id)
      .maybeSingle();

    if (!error && data?.name) {
      return data.name;
    }
  }

  // 5) آخر حل
  return 'ضيف';
}

async function renderStatusPage(requestData = null) {
  let request = requestData;

  if (!request) {
    const { data, error } = await supabase
      .from('table_requests')
      .select('*')
      .eq('id', currentRequestId)
      .maybeSingle();

    if (error || !data) return;
    request = data;
    if (!hasInitialStatusLoaded) hasInitialStatusLoaded = true;
  }

  if (!request || request.status === 'cancelled' || request.status === 'expired') {
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    alert('تم إلغاء حجزك لانتهاء الوقت المحدد لتأكيد الحضور يمكنك معاودة الحجز مجددا');
    localStorage.removeItem('current_booking_id');
    sessionStorage.removeItem('current_booking_id');
    currentRequestId = null;
    await renderBookingForm();
    return;
  }

  window.currentCustomerName = await getBookingCustomerName(request);
  let customerName = window.currentCustomerName;
  let partySize = request.requested_party_size || 2;
  let bookingTime = formatTime(request.created_at);

  if (customerName.length > 15) {
      customerName = customerName.substring(0, 15) + '...';
  }

  window.originalQueueNumber = window.originalQueueNumber || request.original_queue_position || request.queue_position || 1;
  const originalQueueNumber = window.originalQueueNumber;
  const currentQueueNumber = request?.queue_position || window.currentQueueNumber || originalQueueNumber;
  window.currentQueueNumber = currentQueueNumber;
    // جلب رقم الطاولة المعيّنة للعميل عند حالة "طاولتك جاهزة"
  let assignedTableName = "";

  if (request.status === "offered" || request.status === "reserved") {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from("table_assignments")
      .select(`
        table_id,
        status,
        dining_tables (
          table_name
        )
      `)
      .eq("request_id", request.id)
      .in("status", ["offered", "reserved"])
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assignmentError && assignmentData?.dining_tables?.table_name) {
      assignedTableName = assignmentData.dining_tables.table_name;
    }
  }

  const isWaiting = request.status === 'waiting';
  const isOffered = request.status === 'offered';
  const isOccupied = request.status === 'occupied';
  const isCleaning = request.status === 'cleaning' || request.status === 'completed';
  const isFinished = isOffered || isOccupied || isCleaning;
  
  let remainingSeconds = null;
  if (isOffered) {
      remainingSeconds = await getRemainingHoldTime();
  }
  
  function formatCountdownTime(seconds) {
      if (seconds < 0) seconds = 0;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const circleLength = 578;
  let progressPercent = 100;
  if (isWaiting) {
    progressPercent = (currentQueueNumber / originalQueueNumber) * 100;
  } else {
    progressPercent = 100;
  }
  const dashOffset = circleLength - ((circleLength * progressPercent) / 100);

  console.log('🔍 Debug - currentQueueNumber:', currentQueueNumber, 'status:', request.status);
  
  let numberText = '';
  let labelText = '';
  let subText = '';
  let showTimer = false;
  let showCancelButton = true;
  let statusMessage = '';
  
if (isWaiting) {
      numberText = currentQueueNumber;

      if (currentQueueNumber === 2) {
          labelText = bookingText("waiting_near_label");
          statusMessage = '';
      } else if (currentQueueNumber === 1) {
          labelText = bookingText("waiting_next_label");
          statusMessage = '';
      } else {
          labelText = bookingText("waiting_default_label");
          statusMessage = '';
      }

      showCancelButton = true;
  }
else if (isOffered) {
      if (remainingSeconds !== null && remainingSeconds > 0) {
          numberText = formatCountdownTime(remainingSeconds);

          const tableReadyWithNumber = bookingText("table_ready_with_number_text")
            .replace("{table}", `<span class="assigned-table-number">${assignedTableName}</span>`);

          labelText = assignedTableName
            ? `
              <div class="turn-ready-title">${bookingText("ready_title_text")}</div>
              <div class="ready-table-line">${tableReadyWithNumber}</div>
            `
            : `
              <div class="turn-ready-title">${bookingText("ready_title_text")}</div>
              <div class="ready-table-line">${bookingText("table_ready_text")}</div>
            `;

          statusMessage = bookingText("ready_sub_text");
          showTimer = true;
      } else {
          numberText = '0';
          labelText = 'تم إلغاء حجزك';
          statusMessage = '';
          showCancelButton = false;
      }
  }
else if (isOccupied) {
      numberText = '🎉';
      labelText = bookingText("occupied_title_text");
      statusMessage = bookingText("occupied_sub_text");
      showCancelButton = false;
  }
else if (isCleaning) {
      numberText = '🙏';
      labelText = bookingText("cleaning_title_text");
      statusMessage = bookingText("cleaning_sub_text");
      showCancelButton = false;
  }
  else {
      numberText = currentQueueNumber;
      labelText = 'رقمك في الانتظار';
      statusMessage = 'نشكر لك صبرك';
      showCancelButton = true;
  }

  const previousQueueNumber = window.previousQueueNumber;
  const previousStatus = window.previousStatus;

  if (window.audioEnabled) {
    if (previousQueueNumber !== undefined && previousQueueNumber !== currentQueueNumber && isWaiting) {
      if (currentQueueNumber === 2 && shouldTriggerCustomerAlert('near')) {
        playBookingAlert('near');
      } else if (currentQueueNumber === 1 && shouldTriggerCustomerAlert('next')) {
        playBookingAlert('next');
      }
    }

    // تنبيه الطاولة الجاهزة:
    // يعمل مرة واحدة لكل حجز عندما تصبح الحالة offered
    // حتى لو فتحت الصفحة بعد أن أصبحت الطاولة جاهزة
    if (
      isOffered &&
      remainingSeconds !== null &&
      remainingSeconds > 0 &&
      readyAlertStartedForRequestId !== request.id
    ) {
      readyAlertStartedForRequestId = request.id;
      isAlertStopped = false;

      playBookingAlert('ready');
      startContinuousAlert();
      showStopAlertButton();
    }
  }

  window.previousQueueNumber = currentQueueNumber;
  window.previousStatus = request.status;

  app.innerHTML = `
    <div class="container">
      ${getBookingBusinessHeaderHtml()}

      <div class="premium-waiting-card">
        <div class="premium-waiting-header">
          <span class="premium-line"></span>
          <h2>${bookingText("status_page_title")}</h2>
          <span class="premium-line"></span>
        </div>
        
        <div class="booking-details">
          <span class="customer-name"><i class="fas fa-user"></i> ${customerName}</span>
          <span class="separator">|</span>
          <span class="party-size"><i class="fas fa-user-friends"></i> ${partySize}</span>
          <span class="separator">|</span>
          <span class="booking-time"><i class="fas fa-clock"></i> ${bookingTime}</span>
        </div>
        
        <div class="premium-queue-wrapper">
          <div class="premium-queue-ring" style="--progress:${progressPercent};">
            <svg class="premium-ring-svg" viewBox="0 0 220 220">
              <circle class="premium-ring-bg" cx="110" cy="110" r="92" />
              <circle class="premium-ring-progress" cx="110" cy="110" r="92" 
                      stroke-dasharray="578" 
                      stroke-dashoffset="${dashOffset}"
                      style="stroke: ${isFinished ? '#10B981' : '#D4AF37'}; transition: stroke-dashoffset 0.6s ease-in-out;" />
            </svg>
            <div class="premium-ring-content">
              <div class="premium-ring-label">${labelText}</div>
              <div class="premium-ring-number" id="remainingCount" style="${showTimer ? 'font-size: 38px; font-family: monospace;' : ''}">
                ${numberText}
              </div>
              <div class="premium-ring-sub" style="${(isWaiting && statusMessage === '') ? 'display: none;' : ''}">${statusMessage}</div>
            </div>
          </div>
        </div>
        


${!isGuestViewOnly ? `
  ${bookingEnabled("show_reference_code") ? `
    <div class="booking-ref-code" style="text-align: center; margin: 10px 0;">

      ${bookingEnabled("share_booking_enabled") ? `
        <div class="share-booking-hint" onclick="shareBookingViewOnly('${request.id}')">
          <span>${bookingText("share_hint_text")}</span>
          <i class="fas fa-share-alt"></i>
        </div>
      ` : ""}

      <div style="color: #FF4444; font-weight: bold; font-size: 13px;">
        ${bookingText("reference_label_text")}
        <span style="font-size: 16px; background: rgba(255,68,68,0.2); padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px;">
          ${request.booking_code || '---'}
          <i onclick="copyBookingCode('${request.booking_code}')" 
             style="cursor: pointer; font-size: 12px; color: #FF8888;" 
             class="fas fa-copy"></i>
        </span>
      </div>

      <div style="color: #918d8d; font-size: 12px; margin-top: 8px;">
        ${bookingText("reference_save_hint_text")}
      </div>

    </div>
  ` : ""}
` : `
<div class="guest-view-note">
  <i class="fas fa-eye"></i>
  <span>${bookingText("guest_view_text")}</span>
</div>
`}
<div class="premium-queue-status">
          <span>
            ${isOccupied ? '' : (isOffered ? 'نحن بانتظارك' : (isWaiting ? 'نشكر لك صبرك دورك يتقدم' : ''))}
          </span>
        </div>
      </div>

${!isGuestViewOnly ? `
  ${showCancelButton ? `
    ${
      isOffered
        ? bookingEnabled("cannot_attend_enabled") ? `
          <div class="cannot-attend-card" id="cannotAttendLink">
            <div class="cannot-attend-title">${bookingText("cannot_attend_title")}</div>
            <div class="cannot-attend-sub">
              ${bookingText("cannot_attend_sub")}
            </div>
          </div>
        ` : ""
        : bookingEnabled("cancel_waiting_enabled") ? `
          <div class="cancel-link" id="cancelBookingLink">
            ${bookingText("cancel_waiting_text")}
          </div>
        ` : ""
    }
  ` : `
    <div class="exit-link" id="exitBookingLink" style="text-align: center; margin: 20px auto; padding: 12px 25px; background: rgba(16,185,129,0.15); color: var(--booking-success); border-radius: 50px; cursor: pointer; font-weight: bold; font-size: 16px; width: fit-content;">
      ${bookingText("exit_text")}
    </div>
  `}
` : ``}
    </div>
  `;

  if (window.countdownInterval) clearInterval(window.countdownInterval);
  
  if (isOffered && remainingSeconds !== null && remainingSeconds > 0) {
      let currentSeconds = remainingSeconds;
      window.countdownInterval = setInterval(() => {
          currentSeconds--;
          const timerEl = document.getElementById('remainingCount');
          if (currentSeconds <= 0) {
              clearInterval(window.countdownInterval);
              if (timerEl) timerEl.innerText = "0:00";
          } else {
              if (timerEl) timerEl.innerText = formatCountdownTime(currentSeconds);
              if (document.getElementById('countdownTimer')) {
                  document.getElementById('countdownTimer').innerText = formatCountdownTime(currentSeconds);
              }
          }
      }, 1000);
  }

  document.getElementById('cancelBookingLink')?.addEventListener('click', cancelBooking);
  document.getElementById('cannotAttendLink')?.addEventListener('click', cannotAttendBooking);
  document.getElementById('exitBookingLink')?.addEventListener('click', async () => {
      await supabase
          .from('table_requests')
          .update({ status: 'completed' })
          .eq('id', currentRequestId);
      
      localStorage.removeItem('current_booking_id');
      sessionStorage.removeItem('current_booking_id');
      currentRequestId = null;
      await renderBookingForm();
  });
  
  updateDateTime();
  console.log('✅ renderStatusPage finished - status:', request.status);
}

async function submitBooking() {
  const name = document.getElementById('customerName')?.value.trim();
  window.currentCustomerName = name;
  const phone = document.getElementById('customerPhone')?.value.trim();
  const partySize = parseInt(document.getElementById('partySizeValue')?.innerText || '2');
  const zone = document.getElementById('customerZone')?.value || null;
  
  if (!name) {
    alert('الرجاء إدخال الاسم');
    return;
  }
  
  if (!phone || phone.length !== 10 || !phone.startsWith('05')) {
    alert('الرجاء إدخال رقم جوال صحيح (05xxxxxxxx)');
    return;
  }
  
  const submitBtn = document.getElementById('submitBookingBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div> جاري التحقق...';
  
  try {
    // ✅ الخطوة 1: التحقق من وجود حجز نشط لنفس الجوال
    const { data: activeCheck, error: checkError } = await supabase
      .rpc('check_active_booking_by_phone', {
        p_phone: phone,
        p_business_id: currentBusinessId
      });
    
    if (checkError) throw new Error(checkError.message);
    
    // ✅ إذا وجد حجز نشط، استعد الحجز الحالي
    if (activeCheck?.has_active === true) {
      console.log('🔄 Active booking found:', activeCheck);
      
      currentRequestId = activeCheck.request_id;
      currentQueueNumber = activeCheck.queue_position;
      
      localStorage.setItem('current_booking_id', currentRequestId);
      sessionStorage.setItem('booking_cancelled', 'false');
      sessionStorage.setItem('current_booking_id', currentRequestId);
      
      // جلب بيانات الطلب كاملة لعرضها
      const { data: existingRequest } = await supabase
        .from('table_requests')
        .select('*')
        .eq('id', currentRequestId)
        .single();
      
      alert(`⚠️ لديك حجز نشط بالفعل!\nرقمك في الانتظار: ${activeCheck.queue_position}\nسيتم استعادة الحجز الحالي.`);
      
await renderStatusPage(existingRequest);
setupRealtime();
startCustomerSafetyPolling();
return;
    }
    
    // ✅ الخطوة 2: لا يوجد حجز نشط، تابع إنشاء حجز جديد
    submitBtn.innerHTML = '<div class="spinner"></div> جاري الحجز...';
    
    // استخدام RPC لإنشاء عميل
    const { data: customerId, error: customerError } = await supabase.rpc('create_customer_safe', {
        p_name: name,
        p_phone: phone,
        p_business_id: currentBusinessId
    });
    
    if (customerError) throw new Error(customerError.message);
    if (!customerId) throw new Error('فشل إنشاء العميل');
    
    // استخدام RPC لإنشاء طلب حجز
    const { data: booking, error: bookingError } = await supabase.rpc('create_booking_safe', {
        p_customer_id: customerId,
        p_business_id: currentBusinessId,
        p_party_size: partySize,
        p_zone_name: zone
    });
    
    if (bookingError) throw new Error(bookingError.message);
    
    // تعيين المتغيرات
    currentRequestId = booking.id;
    currentQueueNumber = booking.queue_position;
    window.originalQueueNumber = booking.original_queue_position || booking.queue_position;
    
    // حفظ في localStorage
    localStorage.setItem('current_booking_id', currentRequestId);
    sessionStorage.setItem('booking_cancelled', 'false');
    sessionStorage.setItem('current_booking_id', currentRequestId);
    
    console.log('✅ currentRequestId:', currentRequestId);
    console.log('✅ queue_position:', currentQueueNumber);
    console.log('✅ booking_code:', booking.booking_code);
    resetCustomerAlertProtection();
    await renderStatusPage(booking);
    await setupRealtime();           // ✅ إضافة جديدة
    showAudioModal();
    startCustomerSafetyPolling();
    
  } catch (err) {
    alert('فشل الحجز: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'تأكيد الحجز';
  }
  
}

async function cancelBooking() {
    if (!bookingEnabled("cancel_waiting_enabled")) {
    alert("إلغاء الحجز غير متاح حاليًا من قبل المطعم.");
    return;
  }
  // ✅ تأكد من وجود requestId
  if (!currentRequestId) {
    currentRequestId = localStorage.getItem('current_booking_id');
  }
  
  const requestId = currentRequestId;
  
  if (!requestId) {
    alert('لا يوجد حجز نشط للإلغاء');
    return;
  }
  
  console.log('🆔 Cancelling request ID:', requestId);
  
  const confirmed = confirm('هل أنت متأكد من إلغاء الحجز؟');
  if (!confirmed) return;
  
  try {
    const { data, error } = await supabase.rpc('delete_booking', {
      p_request_id: requestId
    });
    
    if (error) throw error;
    
    console.log('✅ تم حذف الحجز بنجاح');
    
    localStorage.removeItem('current_booking_id');
    sessionStorage.removeItem('current_booking_id');
    sessionStorage.setItem('booking_cancelled', 'true');
    currentRequestId = null;
    await cleanupRealtime();
    stopCustomerSafetyPolling();
    await renderBookingForm();
    
  } catch (err) {
    console.error('❌ فشل إلغاء الحجز:', err);
    alert('لم يتم إلغاء الحجز: ' + err.message);
  }
}

async function cannotAttendBooking() {
    if (!bookingEnabled("cannot_attend_enabled")) {
    alert("خيار لا أستطيع الحضور غير متاح حاليًا من قبل المطعم.");
    return;
  }
  if (!currentRequestId) {
    currentRequestId = localStorage.getItem('current_booking_id');
  }

  const requestId = currentRequestId;

  if (!requestId) {
    alert('لا يوجد حجز نشط');
    return;
  }

  const confirmed = confirm('هل أنت متأكد أنك لا تستطيع الحضور؟ سيتم تحرير الطاولة لعميل آخر.');
  if (!confirmed) return;

  try {
    // إيقاف التنبيه المستمر إن كان يعمل
    if (typeof stopContinuousAlert === 'function') {
      stopContinuousAlert();
    }

    const { data, error } = await supabase.rpc('customer_cannot_attend', {
      p_request_id: requestId
    });

    if (error) throw error;

    if (data?.success === false) {
      alert(data.message || 'لم يتم تنفيذ العملية');
      return;
    }

    localStorage.removeItem('current_booking_id');
    sessionStorage.removeItem('current_booking_id');
    sessionStorage.setItem('booking_cancelled', 'true');

    currentRequestId = null;

    await cleanupRealtime();
    stopCustomerSafetyPolling();

    alert('تم تحرير الطاولة بنجاح، شكرًا لإبلاغنا.');
    await renderBookingForm();

  } catch (err) {
    console.error('❌ فشل تحرير الطاولة:', err);
    alert('لم يتم تحرير الطاولة: ' + err.message);
  }
}



function changePartySize(delta) {
  const span = document.getElementById('partySizeValue');
  let val = parseInt(span.innerText);
  val = Math.max(1, Math.min(20, val + delta));
  span.innerText = val;
}

function copyBookingCode(code) {
  if (!code) return;
  navigator.clipboard.writeText(code);
  
  // إشعار مؤقت
  const btn = event.target;
  const originalClass = btn.className;
  btn.className = 'fas fa-check';
  setTimeout(() => {
    btn.className = originalClass;
  }, 1000);
  
  alert(`✅ تم نسخ الرقم المرجعي: ${code}`);
}

async function shareBookingViewOnly(requestId) {
    if (!bookingEnabled("share_booking_enabled")) {
    alert("مشاركة الحجز غير متاحة حاليًا من قبل المطعم.");
    return;
  }
  if (!requestId) return;

  const shareUrl = `${window.location.origin}${window.location.pathname}?view=guest&request_id=${requestId}`;

  const shareText = `تابع حالة حجزي في EASY-Q للمشاهدة فقط:\n${shareUrl}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'متابعة الحجز',
        text: 'تابع حالة حجزي للمشاهدة فقط',
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('✅ تم نسخ رابط المشاركة');
    }
  } catch (err) {
    console.log('Share cancelled or failed:', err);
  }
}

function showAudioModal() {
  const modal = document.getElementById('audioModal');
  if (modal) modal.classList.add('show');
}

function hideAudioModal() {
  const modal = document.getElementById('audioModal');
  if (modal) modal.classList.remove('show');
}

function enableAudio() {
  window.audioEnabled = true;
  hideAudioModal();
  playBookingAlert('near');
}

function disableAudio() {
  window.audioEnabled = false;
  hideAudioModal();
}

function playBookingAlert(type = 'near') {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const duration = 0.3;
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    let repeatCount = 1;
    let frequency = 800;
    
switch(type) {
    case 'near':      // اقترب دورك (رقم 2)
        repeatCount = 2;
        frequency = 700;
        vibrateDevice(200);
        break;
    case 'next':      // أنت التالي (رقم 1)
        repeatCount = 2;
        frequency = 900;
        vibrateDevice(300);
        break;
    case 'ready':     // طاولتك جاهزة (offered)
        repeatCount = 2;
        frequency = 1200;
        vibrateDevice(500);
        break;
    default:
        repeatCount = 1;
        frequency = 600;
        vibrateDevice(100);
}
    
    for (let i = 0; i < repeatCount; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
      }, i * 400);
    }
  } catch(e) {
    console.log('Audio not supported:', e);
  }
}

function vibrateDevice(duration = 200) {
    if (window.audioEnabled && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// ========== دوال الفحص الاحتياطي ==========
function startCustomerSafetyPolling() {
    if (customerSafetyPolling) clearInterval(customerSafetyPolling);

    testBrowserSpeed().then(isFast => {
        const intervalTime = isFast ? 10000 : 4000;
        console.log(`🔄 بدء الفحص الاحتياطي والـ Watchdog كل ${intervalTime / 1000} ثانية`);
        
        customerSafetyPolling = setInterval(async () => {
            if (document.hidden) return; 
            if (!currentRequestId) return; 
            if (isSafetyRefreshRunning) return; 

            isSafetyRefreshRunning = true;

            try {
                // ✅ تم تصحيح الأعمدة وحذف العمود غير الموجود customer_name
                const { data: request, error } = await supabase
                    .from('table_requests')
                    .select('id,status,queue_position,original_queue_position,booking_code,requested_party_size,created_at,customer_id,customer_name_snapshot,customer_phone_snapshot')
                    .eq('id', currentRequestId)
                    .maybeSingle();
                
                if (error) throw error;
                
                if (!request) {
                    console.log('⚠️ لم يتم العثور على الحجز في السيرفر، إنهاء الجلسة والعودة للنموذج');
                    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
                    stopCustomerSafetyPolling();
                    await renderBookingForm();
                    return;
                }
                
                const localStatus = window.previousStatus;
const localQueueNumber = window.currentQueueNumber;

const isDataStaleLocally =
    String(request.status) !== String(localStatus) ||
    String(request.queue_position) !== String(localQueueNumber);
                const isTimeExceeded = (Date.now() - lastRealtimePulse) > ZOMBIE_TIMEOUT;

                if (isDataStaleLocally && isTimeExceeded && realtimeChannel) {
                    console.warn('🚨 [Watchdog] تم اكتشاف اتصال زومبي ميت! جاري الإنعاش صامتاً...');
                    lastRealtimePulse = Date.now(); 
                    handleSilentReconnect(); 
                }

                if (isDataStaleLocally || !hasInitialStatusLoaded) {
                    console.log('🔄 تحديث واجهة المستخدم لوجود تغيير حقيقي في البيانات أو تحميل أول مرة');
                    await renderStatusPage(request);
                } else {
                    lastRealtimePulse = Date.now();
                }
                
            } catch (err) {
                console.error('❌ فشل الفحص الدوري المساعد عبر HTTP:', err);
            } finally {
                isSafetyRefreshRunning = false;
            }
        }, intervalTime);
    });
}
function stopCustomerSafetyPolling() {
    if (customerSafetyPolling) {
        clearInterval(customerSafetyPolling);
        customerSafetyPolling = null;
    }
    isSafetyRefreshRunning = false;
}

// ========== دالة تنظيف Realtime ==========
async function cleanupRealtime() {
    if (realtimeChannel) {
        try {
            await supabase.removeChannel(realtimeChannel);
            console.log('🧹 تم تنظيف قناة Realtime بنجاح');
        } catch (err) {
            console.error('❌ خطأ في تنظيف قناة Realtime:', err);
        }
        realtimeChannel = null;
    }
    
    // إعادة تعيين العدادات
    silentReconnectAttempts = 0;
    lastRealtimePulse = Date.now();
}

// ========== إعادة الاتصال الصامتة ==========
async function handleSilentReconnect() {
    if (!currentRequestId) {
        await cleanupRealtime();
        return;
    }
    
    if (silentReconnectAttempts >= MAX_SILENT_ATTEMPTS) {
        console.error(`🚨 فشلت ${MAX_SILENT_ATTEMPTS} محاولات اتصال. الاعتماد على Polling فقط.`);
        return;
    }
    
    silentReconnectAttempts++;
    const delay = 2000 * silentReconnectAttempts;
    console.log(`🔄 محاولة إعادة اتصال ${silentReconnectAttempts}/${MAX_SILENT_ATTEMPTS} خلال ${delay/1000} ثانية`);
    
    setTimeout(async () => {
        await setupRealtime();
    }, delay);
}

// ========== تحديث عند الرجوع للصفحة ==========
async function safeRefreshCustomerStatus(reason = 'unknown') {
    if (!currentRequestId) return;
    
    console.log(`🔄 تحديث فوري لحالة العميل بسبب: [${reason}]`);
    
    try {
        // ✅ تم تصحيح الأعمدة وحذف العمود غير الموجود customer_name
        const { data: request, error } = await supabase
            .from('table_requests')
            .select('id,status,queue_position,original_queue_position,booking_code,requested_party_size,created_at,customer_id,customer_name_snapshot,customer_phone_snapshot')
            .eq('id', currentRequestId)
            .maybeSingle();

        if (error) throw error;

        if (request) {
            await renderStatusPage(request);
            lastRealtimePulse = Date.now();
            silentReconnectAttempts = 0;
            console.log('✅ تم تحديث الشاشة وتغذية نبض الحارس الصامت بنجاح');
        } else {
            console.warn('⚠️ لم يتم العثور على بيانات هذا الحجز أثناء التحديث الفوري');
        }
        
    } catch (err) {
        console.error('❌ فشل التحديث الفوري لحالة العميل عبر safeRefreshCustomerStatus:', err);
    }
}

function reconnectRealtimeIfNeeded() {
    if (!currentRequestId) return;
    if (!realtimeChannel || realtimeChannel.state !== 'SUBSCRIBED') {
        console.log('🔌 Realtime غير متصل، إعادة الاشتراك');
        setupRealtime();
    }
}

function startContinuousAlert() {
    if (continuousAlertInterval) clearInterval(continuousAlertInterval);
    isAlertStopped = false;
    
    continuousAlertInterval = setInterval(() => {
        if (!isAlertStopped && window.audioEnabled) {
            // اهتزاز
            if (navigator.vibrate) navigator.vibrate(500);
            // صوت
            playBookingAlert('ready');
        }
    }, 2000);
}

function stopContinuousAlert() {
    if (continuousAlertInterval) {
        clearInterval(continuousAlertInterval);
        continuousAlertInterval = null;
    }
    isAlertStopped = true;
}

function showStopAlertButton() {
    // إزالة الزر القديم إذا وجد
    const oldBtn = document.getElementById('stopAlertBtn');
    if (oldBtn) oldBtn.remove();
    
    const btn = document.createElement('div');
    btn.id = 'stopAlertBtn';
    btn.innerHTML = `
        <div style="background: #8B0000; color: white; padding: 15px 25px; border-radius: 50px; font-size: 18px; font-weight: bold; display: flex; align-items: center; gap: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
            <i class="fas fa-bell-slash"></i>
            إيقاف التنبيه
        </div>
    `;
    btn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        cursor: pointer;
        animation: pulse 0.5s infinite;
    `;
    btn.onclick = () => {
        stopContinuousAlert();
        btn.remove();
    };
    document.body.appendChild(btn);
}

function updateDateTime() {
  const now = new Date();
  const dateEl = document.getElementById('currentDate');
  const timeEl = document.getElementById('currentTime');
  if (dateEl) dateEl.innerText = now.toLocaleDateString('ar-SA');
  if (timeEl) timeEl.innerText = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function showNotificationPermissionButton() {
  if (Notification.permission === 'default') {
    const container = document.getElementById('notificationBtnContainer');
    if (container) container.classList.remove('hidden');
  }
}

async function requestNotificationPermission(showAlert = false) {
  if (!('Notification' in window)) {
    if (showAlert) alert('المتصفح لا يدعم الإشعارات');
    return;
  }
  
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    if (showAlert) alert('✅ تم تفعيل الإشعارات');
    const container = document.getElementById('notificationBtnContainer');
    if (container) container.classList.add('hidden');
  } else if (showAlert) {
    alert('لم يتم تفعيل الإشعارات');
  }
}


function setupRealtime() {
    console.log('📡 setupRealtime started');

    // 1️⃣ منع تشغيل الريل تايم تماماً إذا لم يكن هناك حجز نشط بعد
    if (!currentRequestId) {
        console.log('⏸️ لا يوجد حجز نشط، لن يتم تشغيل Realtime');
        return;
    }

    // دالة داخلية معزولة لبناء القناة والاشتراك بها بعد التأكد من حذف القديمة
    const initializeNewChannel = () => {
        // إنشاء قناة فريدة برقم حجز العميل لضمان الفصل الكامل للاتصالات
        realtimeChannel = supabase.channel(`booking-realtime-${currentRequestId}`);

        // 2️⃣ المستمع المفلتر من جهة السيرفر لجدول الطلبات (تحديثاتك أنت فقط)
        realtimeChannel.on(
            'postgres_changes',
            {
                event: 'UPDATE', 
                schema: 'public',
                table: 'table_requests',
                filter: `id=eq.${currentRequestId}` // 🔥 سرعة فائقة وحماية تامة للبيانات
            },
            async function(payload) {
                console.log('🔥 EVENT RECEIVED VIA REALTIME (table_requests):', payload);
                
                if (payload.new && payload.new.id === currentRequestId) {
                    // تغذية نبض الحارس الصامت وتصفير عداد محاولات الفشل فوراً
                    lastRealtimePulse = Date.now();
                    silentReconnectAttempts = 0;
                    
                    await renderStatusPage(payload.new);
                }
            }
        );

        // 3️⃣ المستمع الخاص بجدول تعيين الطاولات (جلس الحجز أم لا)
        realtimeChannel.on(
            'postgres_changes',
            {
                event: 'UPDATE', 
                schema: 'public',
                table: 'table_assignments'
            },
            async function(payload) {
                console.log('🎯 EVENT RECEIVED VIA REALTIME (table_assignments):', payload);
                
                if (payload.new?.request_id === currentRequestId || payload.old?.request_id === currentRequestId) {
                    console.log('🎯 تحديث في التعيين يخص حجزك');
                    lastRealtimePulse = Date.now();
                    silentReconnectAttempts = 0;
                    await renderStatusPage();
                }
            }
        );

        // 4️⃣ إدارة حالات الاشتراك (تغذية الـ Watchdog ومعالجة الأخطاء)
        realtimeChannel.subscribe(function(status, error) {
            console.log('📡 Realtime status callback:', status);
            
            if (status === 'SUBSCRIBED') {
                console.log('✅ تم الاشتراك بنجاح في الريل تايم للعميل');
                lastRealtimePulse = Date.now();
                silentReconnectAttempts = 0;
            }
            
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn(`⚠️ مشكلة في اتصال الريل تايم [${status}]، بدء محاولة صامتة...`);
                handleSilentReconnect(); // دالة إعادة الاتصال مع الـ Backoff التضاعفي
            }
        });
    };

    // 5️⃣ تفكيك وإغلاق القناة القديمة بشكل متزامن وآمن قبل بدء الجديدة
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
            .then(() => {
                console.log('🗑️ القناة القديمة تم حذفها بنجاح قبل التجديد');
                realtimeChannel = null;
                initializeNewChannel(); // بناء القناة الجديدة فور انتهاء الحذف
            })
            .catch((chErr) => {
                console.error('خطأ أثناء حذف القناة القديمة، المتابعة للبناء على أي حال:', chErr);
                realtimeChannel = null;
                initializeNewChannel(); // المتابعة حتى لو فشل الحذف لضمان عدم توقف الصفحة
            });
    } else {
        // إذا لم تكن هناك قناة مفتوحة أصلاً، نبدأ البناء فوراً
        initializeNewChannel();
    }
}

function openRestoreModal() {
  document.getElementById('restoreModal').classList.add('show');
}

function closeRestoreModal() {
  document.getElementById('restoreModal').classList.remove('show');
  document.getElementById('restoreCode').value = '';
  document.getElementById('restorePhone').value = '';
}

async function viewBooking() {
  const bookingCode = document.getElementById('restoreCode')?.value.trim().toUpperCase();
  const phone = document.getElementById('restorePhone')?.value.trim();
  
  if (!bookingCode || !phone) {
    alert('الرجاء إدخال رقم الحجز المرجعي ورقم الجوال');
    return;
  }
  
  if (!phone.startsWith('05') || phone.length !== 10) {
    alert('رقم الجوال غير صحيح (05xxxxxxxx)');
    return;
  }
  
  const { data, error } = await supabase.rpc('view_booking_by_code_and_phone', {
    p_booking_code: bookingCode,
    p_phone: phone
  });
  
  if (error || !data?.success) {
    alert(data?.message || '❌ لم يتم العثور على حجز نشط');
    return;
  }
  
  const booking = data.booking;
  
  currentRequestId = booking.id;
  currentQueueNumber = booking.queue_position;
  localStorage.setItem('current_booking_id', currentRequestId);
  sessionStorage.setItem('booking_cancelled', 'false');
  
  closeRestoreModal();
await renderStatusPage(booking);
setupRealtime();
startCustomerSafetyPolling();
showAudioModal();
}

// Start
async function startBookingPage() {
    app = document.getElementById('app');

    if (!app) {
        console.error("❌ app container not found");
        return;
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);
        // ✅ وضع المشاهدة فقط عبر رابط المشاركة
    const initialUrlParams = new URLSearchParams(window.location.search);
    const viewMode = initialUrlParams.get('view');
    const sharedRequestId = initialUrlParams.get('request_id');

    if (viewMode === 'guest' && sharedRequestId) {
        isGuestViewOnly = true;
        currentRequestId = sharedRequestId;

        console.log('👀 Guest view only mode:', currentRequestId);

        await getBusinessSettings();

        const { data: request, error } = await supabase
            .from('table_requests')
            .select('*')
            .eq('id', currentRequestId)
            .in('status', ['waiting', 'offered', 'occupied', 'cleaning', 'completed'])
            .maybeSingle();

        if (error || !request) {
            console.error('❌ لم يتم العثور على الحجز المشترك:', error);
            await renderBookingForm();
            return;
        }

        await renderStatusPage(request);

        setupRealtime();
        startCustomerSafetyPolling();

        return;
    }

    // ✅ استعادة الحجز من localStorage (بعد إغلاق الصفحة)
    const savedBookingId = localStorage.getItem('current_booking_id');
    if (savedBookingId && !currentRequestId) {
        currentRequestId = savedBookingId;
        sessionStorage.setItem('booking_cancelled', 'false');
        console.log('🔄 Restored booking ID from localStorage:', currentRequestId);
    }
    // ✅ التحقق من وجود code في URL (متابعة عبر QR)
    const urlParams = new URLSearchParams(window.location.search);
    const bookingCode = urlParams.get('code');
    
    if (bookingCode && !currentRequestId) {
        console.log('🔍 محاولة استعادة حجز عبر QR Code:', bookingCode);
        
        // جلب الطلب باستخدام booking_code
        const { data: request, error } = await supabase
            .from('table_requests')
            .select('*')
            .eq('booking_code', bookingCode)
            .in('status', ['waiting', 'offered', 'occupied'])
            .maybeSingle();
        
if (request && !error) {
            currentRequestId = request.id;
            currentQueueNumber = request.queue_position;
            localStorage.setItem('current_booking_id', currentRequestId);
            sessionStorage.setItem('booking_cancelled', 'false');
            console.log('✅ تم استعادة الحجز عبر QR:', currentRequestId);
            
            // ❌ تم حذف startCustomerSafetyPolling من هنا لمنع تشغيله قبل بناء الواجهة (renderUI)
        } else {
            console.log('⚠️ لم يتم العثور على حجز نشط لهذا الرمز');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    await getBusinessSettings();
    await getCurrentQueueNumber();
    await renderUI();
    
    // ✅ المكان الموحد والآمن لتشغيل منظومة المزامنة بالكامل بعد اكتمال بناء الصفحة
    if (currentRequestId) {
        setupRealtime();               // استدعاء عادي بدون await لأنها دالة عادية
        startCustomerSafetyPolling();  // تشغيل الحارس الاحتياطي الذكي هنا فوراً وبأمان
    }
    

}
// ========== مستمعي الأحداث ==========
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && currentRequestId) {
        await safeRefreshCustomerStatus('رجوع العميل للصفحة');
        reconnectRealtimeIfNeeded();
    }
});

window.addEventListener('online', async () => {
    if (currentRequestId) {
        await safeRefreshCustomerStatus('عودة الإنترنت');
        reconnectRealtimeIfNeeded();
    }
});
// تأكد من جاهزية الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startBookingPage);
} else {
    startBookingPage();
}


// ========== ربط أزرار مودال التنبيهات ==========
function bindAudioModalButtons() {
    const yesBtn = document.getElementById('enableAudioYes');
    const noBtn = document.getElementById('enableAudioNo');
    
    if (yesBtn) {
        // إزالة أي مستمعين قديمين
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        
        newYesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 تم الضغط على زر نعم (حدث مربوط)');
            window.audioEnabled = true;
            localStorage.setItem('audioEnabled', 'true');
            hideAudioModal();
            playBookingAlert('near');
        });
        console.log('✅ تم ربط زر نعم');
    } else {
        console.log('⚠️ زر نعم غير موجود بعد');
    }
    
    if (noBtn) {
        // إزالة أي مستمعين قديمين
        const newNoBtn = noBtn.cloneNode(true);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);
        
        newNoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 تم الضغط على زر لا (حدث مربوط)');
            window.audioEnabled = false;
            localStorage.setItem('audioEnabled', 'false');
            hideAudioModal();
        });
        console.log('✅ تم ربط زر لا');
    } else {
        console.log('⚠️ زر لا غير موجود بعد');
    }
}

// ========== تحسين دوال المودال ==========
const originalShowAudioModal = showAudioModal;
window.showAudioModal = function() {
    console.log('🔊 showAudioModal تم استدعاؤها');
    bindAudioModalButtons(); // إعادة ربط الأزرار قبل العرض
    originalShowAudioModal();
};

showAudioModal = window.showAudioModal;

// ========== ربط الأزرار عند تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(bindAudioModalButtons, 100);
});

// ========== ربط الأزرار أيضاً عند كل ظهور للمودال ==========
if (typeof showAudioModal === 'function') {
    const originalShow = showAudioModal;
    showAudioModal = function() {
        setTimeout(bindAudioModalButtons, 50);
        originalShow();
    };
}