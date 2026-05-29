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


async function getBusinessSettings() {
    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('business_id') || '5a2fd95a-0f88-4c70-89db-e6ee7ba8f49c';
    
    const { data: queueSetting } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('business_id', currentBusinessId)
        .eq('setting_key', 'show_current_queue')
        .maybeSingle();
    
    showCurrentQueueConfig = queueSetting?.setting_value === 'true';
    
    const { data: zonesSetting } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('business_id', currentBusinessId)
        .eq('setting_key', 'active_zones')
        .maybeSingle();
    
    if (zonesSetting?.setting_value) {
        zonesEnabled = true;
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
async function renderBookingForm() {
  app.innerHTML = `
    <div class="container">
      <div class="booking-header">
        <div class="restaurant-logo">
          <i class="fas fa-utensils"></i>
        </div>
        <div class="restaurant-name">المطعم الرئيسي</div>
        <div class="restaurant-address">الرياض، المملكة العربية السعودية</div>
        <div class="datetime-row">
          <span id="currentDate"></span>
          <span id="currentTime"></span>
        </div>
      </div>
      
      <div class="welcome-message">
        <i class="fas fa-hands-helping" style="margin-left: 9px; color: #FFD700;"></i>
        مرحباً بك، احجز دورك بسهولة وتابع حالة انتظارك مباشرة.
      </div>
                 <!-- سطر استعادة الحجز -->
      <div class="restore-hint" style="text-align: center; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 20px; font-size: 13px;">
        <span style="color: rgba(255,255,255,0.8);">إذا كان لديك حجز نشط </span>
        <span onclick="openRestoreModal()" style="color: #10B981; font-weight: bold; cursor: pointer; text-decoration: underline;">اضغط هنا</span>
        <span style="color: rgba(255,255,255,0.8);"> ... ولحجز جديد املأ البيانات أدناه</span>
      </div>
      
      ${showCurrentQueueConfig ? `
      <div class="current-queue-card" id="currentQueueCard">
        <div class="current-queue-title">الطابور الحالي</div>
        <div class="current-number-circle">
          <div class="current-number" id="liveQueueNumber">${currentQueueNumber || '--'}</div>
        </div>
        <div class="current-queue-sub">يتم تحديث الرقم مباشرة</div>
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
        
        ${zonesEnabled ? `
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
          تأكيد الحجز
        </button>
      </div>
      
      <div id="notificationBtnContainer" class="hidden">
        <button class="notif-btn" id="enableNotifBtn">
          <i class="fas fa-bell"></i> تفعيل إشعارات الدور
        </button>
      </div>
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

  window.currentCustomerName = request.customer_name || window.currentCustomerName || 'ضيف';
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
          labelText = 'اقترب دورك';
          statusMessage = '';
      } else if (currentQueueNumber === 1) {
          labelText = 'أنت التالي';
          statusMessage = '';
      } else {
          labelText = 'رقمك في الانتظار';
          statusMessage = '';
      }
      showCancelButton = true;
  }
else if (isOffered) {
      if (remainingSeconds !== null && remainingSeconds > 0) {
          numberText = formatCountdownTime(remainingSeconds);
          labelText = 'طاولتك جاهزة';
          statusMessage = 'يجب عليك الحضور قبل انتهاء الوقت';
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
      labelText = 'تم وصولك أهلاً وسهلاً بك';
      statusMessage = 'شرفت المكان';
      showCancelButton = false;
  }
else if (isCleaning) {
      numberText = '🙏';
      labelText = 'شكراً لزيارتك';
      statusMessage = 'نتمنى زيارتك قريبا';
      showCancelButton = false;
  }
  else {
      numberText = currentQueueNumber;
      labelText = 'رقمك في الانتظار';
      statusMessage = 'نشكر لك صبرك';
      showCancelButton = true;
  }

  if (window.previousQueueNumber === undefined) {
    window.previousQueueNumber = currentQueueNumber;
  }
  if (window.previousStatus === undefined) {
    window.previousStatus = request.status;
  }
  
  if (window.audioEnabled) {
    if (window.previousQueueNumber !== currentQueueNumber && isWaiting) {
      if (currentQueueNumber === 2 && shouldTriggerCustomerAlert('near')) {
        playBookingAlert('near');
      } else if (currentQueueNumber === 1 && shouldTriggerCustomerAlert('next')) {
        playBookingAlert('next');
      }
    }
    
    if (isOffered && window.previousStatus !== 'offered' && shouldTriggerCustomerAlert('offered')) {
        playBookingAlert('ready');
        startContinuousAlert();
        showStopAlertButton();
    }
  }
  
  window.previousQueueNumber = currentQueueNumber;
  window.previousStatus = request.status;

  app.innerHTML = `
    <div class="container">
      <div class="booking-header">
        <div class="restaurant-logo">
          <i class="fas fa-utensils"></i>
        </div>
        <div class="restaurant-name">المطعم الرئيسي</div>
        <div class="restaurant-address">الرياض، المملكة العربية السعودية</div>
        <div class="datetime-row">
          <span id="currentDate"></span>
          <span id="currentTime"></span>
        </div>
      </div>

      <div class="premium-waiting-card">
        <div class="premium-waiting-header">
          <span class="premium-line"></span>
          <h2>متابعة الحجز</h2>
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
        


<div class="booking-ref-code" style="text-align: center; margin: 10px 0;">
          <div style="color: #FF4444; font-weight: bold; font-size: 13px;">
             رقم حجزك المرجعي: 
            <span style="font-size: 16px; background: rgba(255,68,68,0.2); padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px;">
              ${request.booking_code || '---'}
              <i onclick="copyBookingCode('${request.booking_code}')" 
                 style="cursor: pointer; font-size: 12px; color: #FF8888;" 
                 class="fas fa-copy"></i>
            </span>
          </div>
          <div style="color: #FF8888; font-size: 11px; margin-top: 8px;">
            💡 قم بحفظ رقم حجزك المرجعي لاستعراض صفحة انتظار حجزك من أي هاتف آخر أو في حال إغلاقها
          </div>
        </div>

<div class="premium-queue-status">
          <i class="fas fa-heart"></i>
          <span>
            ${isOccupied ? '' : (isOffered ? 'نحن بانتظارك' : (isWaiting ? 'نشكر لك صبرك دورك يتقدم' : ''))}
          </span>
        </div>
      </div>

${showCancelButton ? `
        <div class="cancel-link" id="cancelBookingLink" style="text-align: center; margin: 20px auto; padding: 12px 25px; background: rgba(239,68,68,0.15); color: #EF4444; border-radius: 50px; cursor: pointer; font-weight: bold; font-size: 16px; width: fit-content;">
          إلغاء الحجز
        </div>
      ` : `
        <div class="exit-link" id="exitBookingLink" style="text-align: center; margin: 20px auto; padding: 12px 25px; background: rgba(16,185,129,0.15); color: #10B981; border-radius: 50px; cursor: pointer; font-weight: bold; font-size: 16px; width: fit-content;">
          خروج
        </div>
      `}
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
    showAudioModal();
    startCustomerSafetyPolling();
    
  } catch (err) {
    alert('فشل الحجز: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'تأكيد الحجز';
  }
}

async function cancelBooking() {
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
        stopCustomerSafetyPolling();
    await renderBookingForm();
    
  } catch (err) {
    console.error('❌ فشل إلغاء الحجز:', err);
    alert('لم يتم إلغاء الحجز: ' + err.message);
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

    // اختبار سرعة المتصفح وتحديد فترة الفحص
    testBrowserSpeed().then(isFast => {
        const intervalTime = isFast ? 30000 : 8000; // سريع: 30 ثانية، بطيء: 8 ثوانٍ
        console.log(`🔄 بدء الفحص الاحتياطي كل ${intervalTime / 1000} ثانية (${isFast ? 'متصفح سريع' : 'متصفح بطيء'})`);
        
        customerSafetyPolling = setInterval(async () => {
            if (document.hidden) return;
            if (!currentRequestId) return;
            if (isSafetyRefreshRunning) return;

            isSafetyRefreshRunning = true;
            console.log('🛟 فحص احتياطي لحالة العميل');

            try {
                // جلب الحالة فقط (خفيف)
                const { data: request } = await supabase
                    .from('table_requests')
                    .select('status, queue_position')
                    .eq('id', currentRequestId)
                    .maybeSingle();
                
                if (request?.status === 'cancelled' || request?.status === 'expired') {
                    console.log('⚠️ تم اكتشاف تغيير عبر الفحص الاحتياطي');
                    await renderStatusPage(request);
                }
                
                await getCurrentQueueNumber();
                await renderStatusPage();
            } catch (err) {
                console.error('فشل الفحص الاحتياطي:', err);
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

// ========== تحديث عند الرجوع للصفحة ==========
async function safeRefreshCustomerStatus(reason = 'unknown') {
    if (!currentRequestId) return;
    console.log(`🔄 تحديث حالة العميل بسبب: ${reason}`);
    try {
        await getCurrentQueueNumber();
        await renderStatusPage();
    } catch (err) {
        console.error('❌ فشل تحديث حالة العميل:', err);
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

    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
    }

    realtimeChannel = supabase
      .channel('booking-realtime', {
        config: {
          broadcast: { self: true }
        }
      });

    realtimeChannel.on(
        'postgres_changes',
        {
            event: 'UPDATE', 
            schema: 'public',
            table: 'table_requests'
        },
                async function(payload) {
            console.log('🔥 EVENT RECEIVED VIA REALTIME:', payload);
            console.log('NEW DATA:', payload.new);

            if (payload.new && payload.new.id === currentRequestId) {
                console.log(`🎯 رقم طابورك تغير في قاعدة البيانات إلى: ${payload.new.queue_position}`);
                
                // عند استلام أي حدث، نعلم أن Realtime يعمل
                testBrowserSpeed().then(isFast => {
                    if (isFast && customerSafetyPolling) {
                        console.log('📡 Realtime يعمل، إيقاف Polling مؤقتاً');
                        clearInterval(customerSafetyPolling);
                        customerSafetyPolling = null;
                        // إعادة تشغيل Polling بعد 30 ثانية من عدم النشاط
                        setTimeout(() => {
                            if (!customerSafetyPolling && currentRequestId) {
                                startCustomerSafetyPolling();
                            }
                        }, 30000);
                    }
                });
                
                renderStatusPage(payload.new);
                
                // تحديث العداد إذا كان الطلب offered
                if (payload.new?.status === 'offered' && payload.new?.id === currentRequestId) {
                    const remaining = await getRemainingHoldTime();
                    const timerEl = document.getElementById('countdownTimer');
                    if (timerEl && remaining !== null) {
                        const mins = Math.floor(remaining / 60);
                        const secs = remaining % 60;
                        timerEl.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
                    }
                }
            }
        }
    );

        // ✅ إضافة اشتراك table_assignments
    realtimeChannel.on(
        'postgres_changes',
        {
            event: 'UPDATE', 
            schema: 'public',
            table: 'table_assignments'
        },
        async function(payload) {
            console.log('🔄 EVENT RECEIVED VIA REALTIME (table_assignments):', payload);
            
            if (payload.new?.request_id === currentRequestId || payload.old?.request_id === currentRequestId) {
                console.log('🎯 تحديث في التعيين يخص حجزك');
                await renderStatusPage();
            }
        }
    );

    realtimeChannel.subscribe(function(status) {
        console.log('📡 realtime status:', status);
    });
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

    // ✅ استعادة الحجز من localStorage (بعد إغلاق الصفحة)
    const savedBookingId = localStorage.getItem('current_booking_id');
    if (savedBookingId && !currentRequestId) {
        currentRequestId = savedBookingId;
        sessionStorage.setItem('booking_cancelled', 'false');
        console.log('🔄 Restored booking ID from localStorage:', currentRequestId);
    }

    await getBusinessSettings();
    await getCurrentQueueNumber();
    await renderUI();
    setupRealtime();
    
    setInterval(async () => {
        await getCurrentQueueNumber();
    }, 5000);
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