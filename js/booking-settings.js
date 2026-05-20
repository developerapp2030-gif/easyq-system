// ============================================================
// EASY-Q BOOKING SETTINGS PAGE
// إعدادات واجهة حجز العملاء
// ============================================================

// Global state
let currentBusinessId = null;
let settings = {};

// Default settings values
const DEFAULT_SETTINGS = {
  // General
  booking_enabled: true,
  direct_link_enabled: true,
  qr_code_enabled: true,
  advance_booking_days: 3,
  booking_interval_minutes: 30,
  
  // Queue Display
  show_current_queue: true,
  show_waiting_count: true,
  show_avg_wait_time: true,
  show_last_called: true,
  queue_display_style: 'circle', // circle, square, bar
  
  // Form Fields
  show_name_field: true,
  show_phone_field: true,
  show_party_size_field: true,
  show_zone_field: true,
  show_notes_field: false,
  show_preferred_time_field: false,
  
  // Texts
  page_title: 'EASY-Q | حجز وانتظار',
  welcome_message: 'مرحباً بك، احجز دورك بسهولة وتابع حالة انتظارك مباشرة.',
  submit_button_text: 'تأكيد الحجز',
  success_message: 'تم إضافة طلبك بنجاح',
  error_message: 'حدث خطأ، حاول مرة أخرى',
  
  // Notifications
  enable_notification_prompt: true,
  notify_when_near: true,
  notify_when_table_ready: true,
  notify_when_number_changed: true,
  notify_when_cancelled: true,
  notification_sound: 'default',
  
  // Colors
  primary_color: '#8B0000',
  secondary_color: '#FFD700',
  text_color: '#FFFFFF',
  
  // Integrations
  whatsapp_confirmation: true,
  google_maps_link: '',
  google_analytics_id: '',
  
  // Limits
  prevent_duplicate_minutes: 10,
  max_party_size: 20,
  min_party_size: 1,
  enable_captcha: false
};

// Initialize page
async function init() {
  await getBusinessId();
  await loadSettings();
  renderSettingsUI();
  loadStats();
}

// Get business_id from URL or localStorage or currentUser
async function getBusinessId() {
  const urlParams = new URLSearchParams(window.location.search);
  currentBusinessId = urlParams.get('business_id');
  
  if (!currentBusinessId) {
    // Try to get from localStorage (set by main app)
    const savedUser = localStorage.getItem('easyq_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        currentBusinessId = user.business_id;
      } catch(e) {}
    }
  }
  
  if (!currentBusinessId) {
    currentBusinessId = '5a2fd95a-0f88-4c70-89db-e6ee7ba8f49c';
  }
}

// Load all settings from Supabase
async function loadSettings() {
  try {
    // Load booking settings
    const { data: bookingData } = await supabase
      .from('restaurant_settings')
      .select('setting_key, setting_value')
      .eq('business_id', currentBusinessId)
      .eq('setting_key', 'booking_settings');
    
    if (bookingData && bookingData[0]) {
      const saved = JSON.parse(bookingData[0].setting_value);
      settings = { ...DEFAULT_SETTINGS, ...saved };
    } else {
      settings = { ...DEFAULT_SETTINGS };
    }
    
    // Load theme colors separately if needed
    const { data: themeData } = await supabase
      .from('restaurant_settings')
      .select('setting_value')
      .eq('business_id', currentBusinessId)
      .eq('setting_key', 'booking_theme')
      .maybeSingle();
    
    if (themeData?.setting_value) {
      const theme = JSON.parse(themeData.setting_value);
      settings.primary_color = theme.primary_color || settings.primary_color;
      settings.secondary_color = theme.secondary_color || settings.secondary_color;
      settings.text_color = theme.text_color || settings.text_color;
    }
    
  } catch (err) {
    console.error('Error loading settings:', err);
    settings = { ...DEFAULT_SETTINGS };
  }
}

// Render settings UI
function renderSettingsUI() {
  const container = document.getElementById('settingsGrid');
  if (!container) return;
  
  const bookingUrl = `${window.location.origin}/booking.html?business_id=${currentBusinessId}`;
  
  container.innerHTML = `
    <!-- General Settings -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-sliders-h"></i>
        الإعدادات العامة
      </div>
      
      <div class="form-row">
        <div class="form-label">
          تفعيل واجهة الحجز للعملاء
          <small>السماح للعملاء بالحجز عبر الرابط/QR</small>
        </div>
        <button class="toggle-switch ${settings.booking_enabled ? 'active' : ''}" 
                onclick="toggleSetting('booking_enabled')" id="toggle_booking_enabled"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">
          تفعيل الحجز عبر الرابط المباشر
        </div>
        <button class="toggle-switch ${settings.direct_link_enabled ? 'active' : ''}" 
                onclick="toggleSetting('direct_link_enabled')" id="toggle_direct_link_enabled"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">
          تفعيل الحجز عبر QR Code
        </div>
        <button class="toggle-switch ${settings.qr_code_enabled ? 'active' : ''}" 
                onclick="toggleSetting('qr_code_enabled')" id="toggle_qr_code_enabled"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">
          عدد أيام الحجز المسبق المسموح بها
        </div>
        <input type="number" class="form-input" id="advance_booking_days" 
               value="${settings.advance_booking_days}" min="0" max="30" 
               onchange="updateSetting('advance_booking_days', this.value)">
      </div>
      
      <div class="form-row">
        <div class="form-label">
          الفاصل الزمني بين الحجوزات (دقائق)
        </div>
        <input type="number" class="form-input" id="booking_interval_minutes" 
               value="${settings.booking_interval_minutes}" min="5" max="120" 
               onchange="updateSetting('booking_interval_minutes', this.value)">
      </div>
    </div>
    
    <!-- Links & QR Code -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-qrcode"></i>
        الروابط و QR Code
      </div>
      
      <div class="url-box">
        <i class="fas fa-link"></i> رابط الحجز:<br>
        <code style="font-size: 11px; word-break: break-all;">${bookingUrl}</code>
      </div>
      
      <div class="qr-area">
        <div class="qr-placeholder" id="qrPreview">
          <i class="fas fa-qrcode" style="font-size: 64px; opacity: 0.3;"></i>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="copyBookingUrl()">
            <i class="fas fa-copy"></i> نسخ الرابط
          </button>
          <button class="btn btn-outline" onclick="downloadQRCode()">
            <i class="fas fa-download"></i> تحميل QR Code
          </button>
          <button class="btn btn-outline" onclick="printQRCode()">
            <i class="fas fa-print"></i> طباعة QR
          </button>
        </div>
      </div>
    </div>
    
    <!-- Queue Display Settings -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-chart-line"></i>
        الطابور الحالي (عرض للعملاء)
      </div>
      
      <div class="form-row">
        <div class="form-label">
          إظهار الطابور الحالي للعملاء
        </div>
        <button class="toggle-switch ${settings.show_current_queue ? 'active' : ''}" 
                onclick="toggleSetting('show_current_queue')" id="toggle_show_current_queue"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">
          إظهار عدد الأشخاص المنتظرين
        </div>
        <button class="toggle-switch ${settings.show_waiting_count ? 'active' : ''}" 
                onclick="toggleSetting('show_waiting_count')" id="toggle_show_waiting_count"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">
          إظهار متوسط وقت الانتظار
        </div>
        <button class="toggle-switch ${settings.show_avg_wait_time ? 'active' : ''}" 
                onclick="toggleSetting('show_avg_wait_time')" id="toggle_show_avg_wait_time"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">
          تنسيق عرض الرقم الحالي
        </div>
        <select class="form-input" id="queue_display_style" onchange="updateSetting('queue_display_style', this.value)">
          <option value="circle" ${settings.queue_display_style === 'circle' ? 'selected' : ''}>دائري كبير</option>
          <option value="square" ${settings.queue_display_style === 'square' ? 'selected' : ''}>مربع</option>
          <option value="bar" ${settings.queue_display_style === 'bar' ? 'selected' : ''}>شريط علوي</option>
        </select>
      </div>
    </div>
    
    <!-- Form Fields Settings -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-edit"></i>
        حقول نموذج الحجز
      </div>
      
      <div class="form-row">
        <div class="form-label">الاسم (إجباري)</div>
        <button class="toggle-switch ${settings.show_name_field ? 'active' : ''}" 
                onclick="toggleSetting('show_name_field')" id="toggle_show_name_field"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">رقم الجوال (إجباري)</div>
        <button class="toggle-switch ${settings.show_phone_field ? 'active' : ''}" 
                onclick="toggleSetting('show_phone_field')" id="toggle_show_phone_field"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">عدد الأشخاص</div>
        <button class="toggle-switch ${settings.show_party_size_field ? 'active' : ''}" 
                onclick="toggleSetting('show_party_size_field')" id="toggle_show_party_size_field"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">المنطقة المفضلة</div>
        <button class="toggle-switch ${settings.show_zone_field ? 'active' : ''}" 
                onclick="toggleSetting('show_zone_field')" id="toggle_show_zone_field"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">ملاحظات إضافية</div>
        <button class="toggle-switch ${settings.show_notes_field ? 'active' : ''}" 
                onclick="toggleSetting('show_notes_field')" id="toggle_show_notes_field"></button>
      </div>
    </div>
    
    <!-- Texts Settings -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-language"></i>
        النصوص والترجمة
      </div>
      
      <div class="form-row">
        <div class="form-label">عنوان الصفحة</div>
        <input type="text" class="form-input large" id="page_title" 
               value="${settings.page_title.replace(/"/g, '&quot;')}" 
               onchange="updateSetting('page_title', this.value)">
      </div>
      
      <div class="form-row">
        <div class="form-label">رسالة الترحيب</div>
        <input type="text" class="form-input large" id="welcome_message" 
               value="${settings.welcome_message.replace(/"/g, '&quot;')}" 
               onchange="updateSetting('welcome_message', this.value)">
      </div>
      
      <div class="form-row">
        <div class="form-label">نص زر الحجز</div>
        <input type="text" class="form-input" id="submit_button_text" 
               value="${settings.submit_button_text}" 
               onchange="updateSetting('submit_button_text', this.value)">
      </div>
      
      <div class="form-row">
        <div class="form-label">رسالة النجاح</div>
        <input type="text" class="form-input large" id="success_message" 
               value="${settings.success_message}" 
               onchange="updateSetting('success_message', this.value)">
      </div>
    </div>
    
    <!-- Notifications Settings -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-bell"></i>
        الإشعارات للعميل
      </div>
      
      <div class="form-row">
        <div class="form-label">طلب إذن الإشعارات عند فتح الصفحة</div>
        <button class="toggle-switch ${settings.enable_notification_prompt ? 'active' : ''}" 
                onclick="toggleSetting('enable_notification_prompt')" id="toggle_enable_notification_prompt"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">إشعار عند اقتراب الدور (رقم 1,2,3)</div>
        <button class="toggle-switch ${settings.notify_when_near ? 'active' : ''}" 
                onclick="toggleSetting('notify_when_near')" id="toggle_notify_when_near"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">إشعار عند جاهزية الطاولة</div>
        <button class="toggle-switch ${settings.notify_when_table_ready ? 'active' : ''}" 
                onclick="toggleSetting('notify_when_table_ready')" id="toggle_notify_when_table_ready"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">صوت الإشعار</div>
        <select class="form-input" id="notification_sound" onchange="updateSetting('notification_sound', this.value)">
          <option value="default" ${settings.notification_sound === 'default' ? 'selected' : ''}>افتراضي</option>
          <option value="gentle" ${settings.notification_sound === 'gentle' ? 'selected' : ''}>ناعم</option>
          <option value="none" ${settings.notification_sound === 'none' ? 'selected' : ''}>بدون صوت</option>
        </select>
      </div>
    </div>
    
    <!-- Appearance Settings -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-palette"></i>
        تخصيص المظهر
      </div>
      
      <div class="form-row">
        <div class="form-label">اللون الرئيسي</div>
        <div class="color-preview">
          <input type="color" class="color-input" id="primary_color" 
                 value="${settings.primary_color}" 
                 onchange="updateSetting('primary_color', this.value)">
          <span>${settings.primary_color}</span>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-label">اللون الذهبي/الثانوي</div>
        <div class="color-preview">
          <input type="color" class="color-input" id="secondary_color" 
                 value="${settings.secondary_color}" 
                 onchange="updateSetting('secondary_color', this.value)">
          <span>${settings.secondary_color}</span>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-label">لون النص</div>
        <div class="color-preview">
          <input type="color" class="color-input" id="text_color" 
                 value="${settings.text_color}" 
                 onchange="updateSetting('text_color', this.value)">
          <span>${settings.text_color}</span>
        </div>
      </div>
    </div>
    
    <!-- Limits & Security -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-shield-alt"></i>
        القيود والحماية
      </div>
      
      <div class="form-row">
        <div class="form-label">
          منع الحجوزات المكررة خلال (دقائق)
          <small>نفس رقم الجوال</small>
        </div>
        <input type="number" class="form-input" id="prevent_duplicate_minutes" 
               value="${settings.prevent_duplicate_minutes}" min="0" max="60"
               onchange="updateSetting('prevent_duplicate_minutes', this.value)">
      </div>
      
      <div class="form-row">
        <div class="form-label">الحد الأقصى لعدد الأشخاص</div>
        <input type="number" class="form-input" id="max_party_size" 
               value="${settings.max_party_size}" min="1" max="50"
               onchange="updateSetting('max_party_size', this.value)">
      </div>
      
      <div class="form-row">
        <div class="form-label">رمز التحقق (Captcha)</div>
        <button class="toggle-switch ${settings.enable_captcha ? 'active' : ''}" 
                onclick="toggleSetting('enable_captcha')" id="toggle_enable_captcha"></button>
      </div>
    </div>
    
    <!-- Integrations -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-plug"></i>
        التكامل مع الأنظمة الأخرى
      </div>
      
      <div class="form-row">
        <div class="form-label">
          إرسال تأكيد الحجز عبر واتساب
        </div>
        <button class="toggle-switch ${settings.whatsapp_confirmation ? 'active' : ''}" 
                onclick="toggleSetting('whatsapp_confirmation')" id="toggle_whatsapp_confirmation"></button>
      </div>
      
      <div class="form-row">
        <div class="form-label">رابط Google Maps</div>
        <input type="text" class="form-input large" id="google_maps_link" 
               value="${settings.google_maps_link}" placeholder="https://maps.google.com/..."
               onchange="updateSetting('google_maps_link', this.value)">
      </div>
      
      <div class="form-row">
        <div class="form-label">Google Analytics ID</div>
        <input type="text" class="form-input" id="google_analytics_id" 
               value="${settings.google_analytics_id}" placeholder="UA-XXXXXX-X"
               onchange="updateSetting('google_analytics_id', this.value)">
      </div>
    </div>
    
    <!-- Statistics -->
    <div class="settings-card">
      <div class="card-title">
        <i class="fas fa-chart-bar"></i>
        إحصائيات واجهة الحجز
      </div>
      
      <div class="stats-row" id="statsContainer">
        <div class="stat-box">
          <div class="stat-number" id="todayBookings">--</div>
          <div class="stat-label">حجوزات اليوم</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" id="monthBookings">--</div>
          <div class="stat-label">حجوزات الشهر</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" id="avgWaitTime">--</div>
          <div class="stat-label">متوسط وقت الانتظار</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" id="peakHour">--</div>
          <div class="stat-label">أوقات الذروة</div>
        </div>
      </div>
      
      <button class="btn btn-outline" style="width: 100%; margin-top: 16px;" onclick="refreshStats()">
        <i class="fas fa-chart-line"></i> عرض التفاصيل
      </button>
    </div>
  `;
}

// Toggle boolean setting
function toggleSetting(key) {
  settings[key] = !settings[key];
  const toggle = document.getElementById(`toggle_${key}`);
  if (toggle) {
    if (settings[key]) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
}

// Update setting value
function updateSetting(key, value) {
  settings[key] = value;
}

// Save all settings to Supabase
async function saveAllSettings() {
  showToast('جاري حفظ الإعدادات...', 'info');
  
  try {
    // Save main booking settings
    const settingsToSave = { ...settings };
    delete settingsToSave.primary_color;
    delete settingsToSave.secondary_color;
    delete settingsToSave.text_color;
    
    const { error: settingsError } = await supabase
      .from('restaurant_settings')
      .upsert({
        business_id: currentBusinessId,
        setting_key: 'booking_settings',
        setting_value: JSON.stringify(settingsToSave),
        updated_at: new Date().toISOString()
      }, { onConflict: 'business_id,setting_key' });
    
    if (settingsError) throw settingsError;
    
    // Save theme colors
    const { error: themeError } = await supabase
      .from('restaurant_settings')
      .upsert({
        business_id: currentBusinessId,
        setting_key: 'booking_theme',
        setting_value: JSON.stringify({
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          text_color: settings.text_color
        }),
        updated_at: new Date().toISOString()
      }, { onConflict: 'business_id,setting_key' });
    
    if (themeError) throw themeError;
    
    showToast('✅ تم حفظ جميع الإعدادات بنجاح', 'success');
    
  } catch (err) {
    console.error('Save error:', err);
    showToast('❌ فشل حفظ الإعدادات: ' + err.message, 'error');
  }
}

// Reset to default settings
async function resetToDefault() {
  if (confirm('هل أنت متأكد من إعادة ضبط جميع الإعدادات إلى القيم الافتراضية؟')) {
    Object.assign(settings, DEFAULT_SETTINGS);
    renderSettingsUI();
    showToast('تم إعادة ضبط الإعدادات إلى القيم الافتراضية', 'info');
  }
}

// Copy booking URL to clipboard
function copyBookingUrl() {
  const url = `${window.location.origin}/booking.html?business_id=${currentBusinessId}`;
  navigator.clipboard.writeText(url);
  showToast('تم نسخ الرابط إلى الحافظة', 'success');
}

// Download QR Code
function downloadQRCode() {
  showToast('جاري إنشاء QR Code...', 'info');
  // Will implement with QR generation library
  setTimeout(() => {
    showToast('سيتم إضافة ميزة إنشاء QR Code قريباً', 'info');
  }, 500);
}

// Print QR Code
function printQRCode() {
  window.print();
}

// Load statistics
async function loadStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: todayData } = await supabase
      .from('table_requests')
      .select('id', { count: 'exact' })
      .eq('business_id', currentBusinessId)
      .eq('request_source', 'web_booking')
      .gte('created_at', today);
    
    const todayCount = todayData?.length || 0;
    document.getElementById('todayBookings')?.innerText = todayCount;
    
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// Refresh statistics
function refreshStats() {
  loadStats();
  showToast('تم تحديث الإحصائيات', 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    color: white;
    padding: 12px 24px;
    border-radius: 40px;
    font-size: 14px;
    z-index: 1000;
    animation: fadeInUp 0.3s ease;
  `;
  toast.innerHTML = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Add animation style
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;
document.head.appendChild(style);

// Initialize
init();

// Make functions global
window.toggleSetting = toggleSetting;
window.updateSetting = updateSetting;
window.saveAllSettings = saveAllSettings;
window.resetToDefault = resetToDefault;
window.copyBookingUrl = copyBookingUrl;
window.downloadQRCode = downloadQRCode;
window.printQRCode = printQRCode;
window.refreshStats = refreshStats;