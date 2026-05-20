// ============================================================
// EASY-Q BOOKING & QUEUE PAGE (Mobile First)
// ============================================================

const SUPABASE_URL = 'https://zjdfadkonftkgljvzxoy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZGZhZGtvbmZ0a2dsanZ6eG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTQ3NTQsImV4cCI6MjA4ODMzMDc1NH0.XZaHGtz3PdBh08m2P9ZM7Xsg3tCG4nskzsoc3wPT-_Q';
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Global state
let currentRequestId = null;
let currentQueueNumber = null;
let currentBusinessId = null;
let currentCustomerId = null;
let realtimeChannel = null;
let showCurrentQueueConfig = false;
let zonesEnabled = false;
let availableZones = [];


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

// DOM Elements
const app = document.getElementById('app');

// Initialize
async function init() {
  await getBusinessSettings();
  await getCurrentQueueNumber();
  renderUI();
  setupRealtime();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  requestNotificationPermission();
}

async function getBusinessSettings() {
  // Get business_id from URL or use default
  const urlParams = new URLSearchParams(window.location.search);
  currentBusinessId = urlParams.get('business_id') || '5a2fd95a-0f88-4c70-89db-e6ee7ba8f49c';
  
  // Get show_current_queue setting
  const { data: queueSetting } = await supabase
    .from('restaurant_settings')
    .select('setting_value')
    .eq('business_id', currentBusinessId)
    .eq('setting_key', 'show_current_queue')
    .maybeSingle();
  
  showCurrentQueueConfig = queueSetting?.setting_value === 'true';
  
  // Get zones enabled and zones list
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
  const { data } = await supabase
    .from('table_requests')
    .select('queue_position')
    .eq('business_id', currentBusinessId)
    .eq('status', 'waiting')
    .order('queue_position', { ascending: true })
    .limit(1);
  
  if (data && data.length > 0) {
    currentQueueNumber = data[0].queue_position;
  }
}

async function renderUI() {
  const hasActiveBooking = currentRequestId && !sessionStorage.getItem('booking_cancelled');
  
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

async function renderStatusPage() {
  const { data: request } = await supabase
    .from('table_requests')
    .select('*, customers(name, phone)')
    .eq('id', currentRequestId)
    .single();
  
  if (!request || request.status === 'cancelled') {
    sessionStorage.removeItem('booking_cancelled');
    currentRequestId = null;
    renderBookingForm();
    return;
  }
  
  app.innerHTML = `
    <div class="container">
      <div class="booking-header">
        <div class="restaurant-logo">
          <i class="fas fa-utensils"></i>
        </div>
        <div class="restaurant-name">المطعم الرئيسي</div>
        <div class="restaurant-address">الرياض، المملكة العربية السعودية</div>
      </div>
      
      <div class="status-card">
        <div class="queue-number-circle">
          <div class="queue-number">${request.queue_position || '--'}</div>
        </div>
        <div class="current-serving">
          الرقم الحالي: <span id="currentServingNumber">${currentQueueNumber || '--'}</span>
        </div>
        <div class="follow-message">
          <i class="fas fa-mobile-alt"></i> يرجى متابعة حالة الحجز من هذه الصفحة وعدم إغلاقها.
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
  
  document.getElementById('refreshStatusBtn')?.addEventListener('click', () => renderStatusPage());
  document.getElementById('cancelBookingLink')?.addEventListener('click', cancelBooking);
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
    // Get or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    
    if (!customer) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ name, phone, whatsapp_number: phone })
        .select()
        .single();
      customer = newCustomer;
    }
    
    // Create table request
    const { data: request, error } = await supabase
      .from('table_requests')
      .insert({
        customer_id: customer.id,
        business_id: currentBusinessId,
        requested_party_size: partySize,
        zone_name: zone,
        request_source: 'web_booking',
        status: 'waiting'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    currentRequestId = request.id;
    sessionStorage.setItem('booking_cancelled', 'false');
    
    showNotificationPermissionButton();
    renderStatusPage();
    
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
// تأكد من أن الصفحة جاهزة قبل التشغيل
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
// Make functions global for inline onclick
window.changePartySize = changePartySize;