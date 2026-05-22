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

    const { data, error } = await supabase
        .rpc('get_current_queue', {
            p_business_id: currentBusinessId
        });

    if (error) {
        console.error('Queue RPC Error:', error);
        return;
    }

    currentQueueNumber = data?.current_queue || '--';



    // تحديث الرقم الحالي في الواجهة مباشرة
    const queueEl =
        document.getElementById('liveQueueNumber');

    if (queueEl) {
        queueEl.innerText = currentQueueNumber;
    }



    // تحديث الرقم الحالي في صفحة الحالة
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

  // فقط إذا لم يتم تمرير البيانات
  if (!request) {

    const { data, error } = await supabase
      .from('table_requests')
      .select('*')
      .eq('id', currentRequestId)
      .single();

    if (error) {
      console.error('Error fetching request:', error);
      return;
    }

    request = data;
  }

  // إذا تم إلغاء الحجز
  if (!request || request.status === 'cancelled') {

    sessionStorage.removeItem('booking_cancelled');
    sessionStorage.removeItem('current_booking_id');

    currentRequestId = null;

    renderBookingForm();

    return;
  }



  // =========================
  // حساب التقدم
  // =========================

const remainingCount =
  request?.queue_position || 1;

const isFinished =
  request.status === 'reserved' ||
  request.status === 'called' ||
  request.status === 'ready' ||
  request.status === 'occupied';

const originalQueueNumber =
  remainingCount || 1;

const progressPercent = isFinished
  ? 100
  : 100;

const circleLength = 578;

const dashOffset =
  circleLength -
  ((circleLength * progressPercent) / 100);

const fillColor =
  isFinished ? '#10B981' : '#D4AF37';

let numberText = remainingCount;

let labelText = 'رقمك في الانتظار';

if (remainingCount === 2 && !isFinished) {
  labelText = 'اقترب دورك';
}

if (remainingCount === 1 && !isFinished) {
  labelText = 'أنت التالي، كن جاهزًا';
}

if (isFinished) {
  numberText = 'حان دورك';
  labelText = '';
}

const numberClass = isFinished
  ? 'queue-progress-number finished'
  : 'queue-progress-number';
  // =========================
  // Render
  // =========================

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

  <div class="premium-queue-wrapper">

<div
  class="premium-queue-ring"
  id="premiumQueueRing"
  style="--progress:${progressPercent};"
>

      <svg class="premium-ring-svg" viewBox="0 0 220 220">

        <circle
          class="premium-ring-bg"
          cx="110"
          cy="110"
          r="92"
        />

        <circle
          class="premium-ring-progress"
          cx="110"
          cy="110"
          r="92"
        />

      </svg>

      <div class="premium-ring-content">

        <div class="premium-ring-label">
          رقمك في القائمة
        </div>

        <div
  class="premium-ring-number"
  id="remainingCount"
>
  ${remainingCount}
</div>

        <div class="premium-ring-sub">
          مجموعة أمامك
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



      <button
        class="submit-btn"
        id="refreshStatusBtn"
        style="background: rgba(255,255,255,0.1);"
      >

        <i class="fas fa-sync-alt"></i>

        تحديث

      </button>



      <div
        class="cancel-link"
        id="cancelBookingLink"
      >

        إلغاء الحجز

      </div>

    </div>
  `;



  // =========================
  // Events
  // =========================

  document
    .getElementById('refreshStatusBtn')
    ?.addEventListener(
      'click',
      () => renderStatusPage()
    );

  document
    .getElementById('cancelBookingLink')
    ?.addEventListener(
      'click',
      cancelBooking
    );
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
    
    // استخدام RPC لإنشاء طلب حجز
    const { data: booking, error: bookingError } = await supabase.rpc('create_booking_safe', {
        p_customer_id: customerId,
        p_business_id: currentBusinessId,
        p_party_size: partySize,
        p_zone_name: zone
    });




    
    if (bookingError) throw new Error(bookingError.message);
    
    currentRequestId = booking.request_id || booking;
    sessionStorage.setItem('booking_cancelled', 'false');
    sessionStorage.setItem('current_booking_id', currentRequestId);
    
    await getCurrentQueueNumber();

    await renderStatusPage({
    id: booking.request_id,
    queue_position: booking.queue_position,
    status: 'waiting'
});
    
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
  if (realtimeChannel) realtimeChannel.unsubscribe();
  
  realtimeChannel = supabase
    .channel('booking-realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'table_requests' },
      async (payload) => {
        if (payload.new?.id === currentRequestId) {
          await renderStatusPage();
        }
        if (payload.eventType === 'UPDATE' && payload.new?.queue_position) {
          if (payload.new.queue_position <= 3 && payload.new.queue_position > 0) {
            if (Notification.permission === 'granted') {
              new Notification('🔔 دورك يقترب!', {
                body: `رقم ${payload.new.queue_position} في قائمة الانتظار`,
                icon: '/favicon.ico'
              });
            }
          }
          await getCurrentQueueNumber();
          const queueEl = document.getElementById('liveQueueNumber');
          if (queueEl) queueEl.innerText = currentQueueNumber || '--';
          const servingEl = document.getElementById('currentServingNumber');
          if (servingEl) servingEl.innerText = currentQueueNumber || '--';
        }
      }
    )
    .subscribe();
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