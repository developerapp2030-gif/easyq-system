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

// ========== الدوال المساعدة ==========
function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if (dateEl) dateEl.innerText = now.toLocaleDateString('ar-SA');
    if (timeEl) timeEl.innerText = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function requestNotificationPermission() {
    // سيتم تفعيلها لاحقاً
}

function changePartySize(delta) {
    const span = document.getElementById('partySizeValue');
    if (span) {
        let val = parseInt(span.innerText) || 2;
        val = Math.max(1, Math.min(20, val + delta));
        span.innerText = val;
    }
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

async function renderUI() {

    const hasActiveBooking =
      currentRequestId &&
      !sessionStorage.getItem('booking_cancelled');

    if (hasActiveBooking) {

        await renderStatusPage();

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
        <i class="fas fa-hands-helping" style="margin-left: 8px; color: #FFD700;"></i>
        مرحباً بك، احجز دورك بسهولة وتابع حالة انتظارك مباشرة.
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
  console.log('🔍 customer_name:', request?.customer_name, 'full request:', request);
// جلب اسم العميل وعدد الأشخاص
let customerName = request.customer_name || 'ضيف';
let partySize = request.requested_party_size || 2;
let bookingTime = formatTime(request.created_at);

// تقصير الاسم إذا تجاوز 15 حرف
if (customerName.length > 15) {
    customerName = customerName.substring(0, 15) + '...';
}
  if (!request) {
    const { data, error } = await supabase
      .from('table_requests')
      .select('*')
      .eq('id', currentRequestId)
      .maybeSingle();

    if (error || !data) return;
    request = data;
  }

  if (!request || request.status === 'cancelled') {
    // ... إلغاء الحجز
    return;
  }

  // 🎯 الحسابات الذكية للتناسب التقسيمي للدائرة
  
  // الرقم الأصلي عند دخول الطابور
  const originalQueueNumber = request.original_queue_position || request.queue_position || 1;
  
  // الرقم الحالي الحقيقي للعميل
    const currentQueueNumber = request?.queue_position || window.currentQueueNumber || originalQueueNumber;

  // هل تم تعيينه لطاولة؟
  const isFinished = request.status === 'offered' || request.status === 'reserved' || request.status === 'occupied';

  // طول محيط الدائرة (المطابق للـ Radius 92)
  const circleLength = 578;

  // حساب النسبة المئوية بشكل تناسبي بحت
  let progressPercent = 100;
  if (!isFinished) {
    // التقسيم التناسبي المباشر: (الرقم الحالي ÷ الرقم الأصلي) × 100
    progressPercent = (currentQueueNumber / originalQueueNumber) * 100;
  } else {
    progressPercent = 100;
  }

  // حساب الإزاحة الفعلية لإطار SVG للرسم بدقة
  const dashOffset = circleLength - ((circleLength * progressPercent) / 100);

  // النصوص الديناميكية الملاءمة للحالة

  console.log('🔍 Debug - currentQueueNumber:', currentQueueNumber, 'isFinished:', isFinished);
  let numberText = currentQueueNumber;
  let labelText = 'رقمك في الانتظار';

  if (currentQueueNumber === 3 && !isFinished) {
    labelText = 'رقمك في الانتظار';
  }
  if (currentQueueNumber === 2 && !isFinished) {
    labelText = 'اقترب دورك ';
  }
  if (currentQueueNumber === 1 && !isFinished) {
    labelText = 'أنت التالي، كن جاهزاً';
  }
  if (isFinished) {
    numberText = '0';
    labelText = 'حان دورك ، تفضل بالدخول';
  }

 

  app.innerHTML = `
    <div class="container">
      <div class="booking-header">
        <div class="restaurant-logo">
          <i class="fas fa-utensils"></i>
        </div>
        <div class="restaurant-name">
          المطعم الرئيسي
        </div>
        <div class="restaurant-address">
          الرياض، المملكة العربية السعودية
        </div>
      </div>

      <div class="premium-waiting-card">
        <div class="premium-waiting-header">
          <span class="premium-line"></span>
          <h2>متابعة الحجز</h2>
          <span class="premium-line"></span>
        </div>
        <div class="booking-details">
  <span class="customer-name">${customerName}</span>
  <span class="separator">-</span>
  <span class="party-size"><i class="fas fa-user-friends"></i> ${partySize}</span>
  <span class="separator">-</span>
  <span class="booking-time"><i class="fas fa-clock"></i> ${bookingTime}</span>
</div>
        <div class="premium-queue-wrapper">
          <div class="premium-queue-ring" id="premiumQueueRing" style="--progress:${progressPercent};">
            <svg class="premium-ring-svg" viewBox="0 0 220 220">
              <circle class="premium-ring-bg" cx="110" cy="110" r="92" />
              <circle class="premium-ring-progress" cx="110" cy="110" r="92" 
                      stroke-dasharray="578" 
                      stroke-dashoffset="${dashOffset}"
                      style="stroke: ${isFinished ? '#10B981' : '#D4AF37'}; transition: stroke-dashoffset 0.6s ease-in-out, stroke 0.4s ease;" />
            </svg>
            <div class="premium-ring-content">
           <div class="premium-ring-label">
  ${labelText}
</div>
              <div class="premium-ring-number" id="remainingCount">
                ${numberText}
</div>
              <div class="premium-ring-sub">
              
              </div>
            </div>
          </div>
        </div>
        <div class="premium-queue-status">
          <i class="fas fa-heart"></i>
          <span>
            دورك يتقدم، شكرًا لصبرك
          </span>
        </div>
      </div>

      <button class="submit-btn" id="refreshStatusBtn" style="background: rgba(255,255,255,0.1);">
        <i class="fas fa-sync-alt"></i> تحديث
      </button>

      <div class="cancel-link" id="cancelBookingLink">
        إلغاء الحجز
      </div>
    </div>
  `;

  // =========================
  // Events
  // =========================

  document.getElementById('refreshStatusBtn')?.addEventListener('click', () => renderStatusPage());
  document.getElementById('cancelBookingLink')?.addEventListener('click', cancelBooking);
  
  console.log('✅ renderStatusPage finished');
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
  submitBtn.innerHTML = '<div class="spinner"></div> جاري الحجز...';
  
  try {
    // استخدام RPC لإنشاء عميل
    const { data: customerId, error: customerError } = await supabase.rpc('create_customer_safe', {
        p_name: name,
        p_phone: phone,
        p_business_id: currentBusinessId
    });
    
    if (customerError) throw new Error(customerError.message);
    if (!customerId) throw new Error('فشل إنشاء العميل');
    
    // استخدام RPC لإنشاء طلب حجز (ترجع الطلب كاملاً)
    const { data: booking, error: bookingError } = await supabase.rpc('create_booking_safe', {
        p_customer_id: customerId,
        p_business_id: currentBusinessId,
        p_party_size: partySize,
        p_zone_name: zone
    });
    
    if (bookingError) throw new Error(bookingError.message);
    
    // ✅ تعيين المتغيرات من البيانات المرجعة مباشرة
    currentRequestId = booking.id;
    currentQueueNumber = booking.queue_position;
    
    sessionStorage.setItem('booking_cancelled', 'false');
    sessionStorage.setItem('current_booking_id', currentRequestId);
    
    console.log('✅ currentRequestId:', currentRequestId);
    console.log('✅ queue_position:', currentQueueNumber);
    
    // ✅ تمرير بيانات الطلب مباشرة إلى renderStatusPage
    await renderStatusPage(booking);
    
  } catch (err) {
    alert('فشل الحجز: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'تأكيد الحجز';
  }
}

async function cancelBooking() {
  const confirmed = confirm('هل أنت متأكد من إلغاء الحجز؟');
  if (!confirmed) return;
  
  await supabase
    .from('table_requests')
    .update({ status: 'cancelled' })
    .eq('id', currentRequestId);
  
  sessionStorage.setItem('booking_cancelled', 'true');
  currentRequestId = null;
  renderBookingForm();
}

function changePartySize(delta) {
  const span = document.getElementById('partySizeValue');
  let val = parseInt(span.innerText);
  val = Math.max(1, Math.min(20, val + delta));
  span.innerText = val;
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

    // الاستماع لأحداث التعديل فقط UPDATE
    realtimeChannel.on(
        'postgres_changes',
        {
            event: 'UPDATE', 
            schema: 'public',
            table: 'table_requests'
        },
        function(payload) {
            console.log('🔥 EVENT RECEIVED VIA REALTIME:', payload);
            console.log('NEW DATA:', payload.new);

            // 🎯 الشرط السحري: نتحقق أن التحديث الحالي يخص رقم حجز هذا العميل تحديداً
            if (payload.new && payload.new.id === currentRequestId) {
                console.log(`🎯 رقم طابورك تغير في قاعدة البيانات إلى: ${payload.new.queue_position}`);
                window.currentQueueNumber = payload.new.queue_position;
                
                // نقوم بتمرير السطر المحدث مباشرة للدالة لتحديث الدائرة فوراً 
                // دون الحاجة لعمل SELECT جديدة من قاعدة البيانات عبر الشبكة
                renderStatusPage(payload.new); 
            }
        }
    );

    realtimeChannel.subscribe(function(status) {
        console.log('📡 realtime status:', status);
    });
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

    await getBusinessSettings();
    await getCurrentQueueNumber();
    await renderUI();
    setupRealtime();
    setInterval(async () => {

    await getCurrentQueueNumber();

}, 5000);
}

// تأكد من جاهزية الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startBookingPage);
} else {
    startBookingPage();
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
  submitBtn.innerHTML = '<div class="spinner"></div> جاري الحجز...';
  
  try {
    // استخدام RPC لإنشاء عميل
    const { data: customerId, error: customerError } = await supabase.rpc('create_customer_safe', {
        p_name: name,
        p_phone: phone,
        p_business_id: currentBusinessId
    });
    
    if (customerError) throw new Error(customerError.message);
    if (!customerId) throw new Error('فشل إنشاء العميل');
    
    // استخدام RPC لإنشاء طلب حجز (ترجع الطلب كاملاً)
    const { data: booking, error: bookingError } = await supabase.rpc('create_booking_safe', {
        p_customer_id: customerId,
        p_business_id: currentBusinessId,
        p_party_size: partySize,
        p_zone_name: zone
    });
    
    if (bookingError) throw new Error(bookingError.message);
    
    // ✅ تعيين المتغيرات من البيانات المرجعة مباشرة
    currentRequestId = booking.id;
   currentQueueNumber = booking.queue_position;
window.originalQueueNumber = booking.original_queue_position || booking.queue_position;
    
    sessionStorage.setItem('booking_cancelled', 'false');
    sessionStorage.setItem('current_booking_id', currentRequestId);
    
    console.log('✅ currentRequestId:', currentRequestId);
    console.log('✅ queue_position:', currentQueueNumber);
    
    // ✅ تمرير بيانات الطلب مباشرة إلى renderStatusPage
    await renderStatusPage(booking);
    
  } catch (err) {
    alert('فشل الحجز: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'تأكيد الحجز';
  }
}

async function cancelBooking() {
  const confirmed = confirm('هل أنت متأكد من إلغاء الحجز؟');
  if (!confirmed) return;
  
  await supabase
    .from('table_requests')
    .update({ status: 'cancelled' })
    .eq('id', currentRequestId);
  
  sessionStorage.setItem('booking_cancelled', 'true');
  currentRequestId = null;
  renderBookingForm();
}

function changePartySize(delta) {
  const span = document.getElementById('partySizeValue');
  let val = parseInt(span.innerText);
  val = Math.max(1, Math.min(20, val + delta));
  span.innerText = val;
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

    // الاستماع لأحداث التعديل فقط UPDATE
    realtimeChannel.on(
        'postgres_changes',
        {
            event: 'UPDATE', 
            schema: 'public',
            table: 'table_requests'
        },
        function(payload) {
            console.log('🔥 EVENT RECEIVED VIA REALTIME:', payload);
            console.log('NEW DATA:', payload.new);

            // 🎯 الشرط السحري: نتحقق أن التحديث الحالي يخص رقم حجز هذا العميل تحديداً
            if (payload.new && payload.new.id === currentRequestId) {
                console.log(`🎯 رقم طابورك تغير في قاعدة البيانات إلى: ${payload.new.queue_position}`);
                
                // نقوم بتمرير السطر المحدث مباشرة للدالة لتحديث الدائرة فوراً 
                // دون الحاجة لعمل SELECT جديدة من قاعدة البيانات عبر الشبكة
                renderStatusPage(payload.new); 
            }
        }
    );

    realtimeChannel.subscribe(function(status) {
        console.log('📡 realtime status:', status);
    });
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

    await getBusinessSettings();
    await getCurrentQueueNumber();
    await renderUI();
    setupRealtime();
    setInterval(async () => {

    await getCurrentQueueNumber();

}, 5000);
}

// تأكد من جاهزية الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startBookingPage);
} else {
    startBookingPage();
}