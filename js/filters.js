// ============================================================
// ALERT & NOTIFICATION FUNCTIONS
// ============================================================

function playExpiredAlert() {
  if (settings.expired_sound_enabled !== false) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 400;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  }
  if (settings.expired_vibration_enabled !== false && navigator.vibrate) {
    navigator.vibrate([300, 150, 300]);
  }
}

function playReadyAlert() {
  if (settings.alert_sound_enabled === false && settings.alert_vibration_enabled === false) return;
  if (settings.alert_sound_enabled === true) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 700;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }
  if (settings.alert_vibration_enabled === true && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
  if (Notification.permission === "granted" && document.visibilityState === "hidden") {
    const waitingCount = waitingData.filter(w => w.status === "waiting" || w.status === "offered").length;
    new Notification("🆕 تحديث في قائمة الانتظار", {
      body: `${waitingCount} عميل في الانتظار`,
      icon: "/favicon.ico",
      vibrate: [200, 100, 200],
      silent: false
    });
  }
}

function processExpiredAlerts() {
  const currentIds = new Set();
  filteredExpiredData().forEach(r => {
    currentIds.add(r.request_id);
    if (!expiredAlerted.has(r.request_id)) {
      expiredAlerted.add(r.request_id);
      playExpiredAlert();
    }
  });
  expiredAlerted.forEach(id => {
    if (!currentIds.has(id)) expiredAlerted.delete(id);
  });
}

function processReadyAlerts() {
  const newIds = new Set();
  filteredWaitingData().forEach(r => {
    const isReady = hasMatchingAvailableTable(r);
    if (isReady) {
      newIds.add(r.request_id);
      if (!readyAlerted.has(r.request_id)) {
        readyAlerted.add(r.request_id);
        playReadyAlert();
      }
    } else {
      if (readyAlerted.has(r.request_id)) readyAlerted.delete(r.request_id);
    }
  });
}

// ============================================================
// SUCCESS NOTIFICATION
// ============================================================

function showSuccessNotification(message, callback) {
  // حذف أي انبثاق سابق من النسخة الجديدة أو القديمة
  document.querySelectorAll('.easyq-success-toast, .toast-notification').forEach(el => el.remove());

  const notification = document.createElement('div');
  notification.className = 'easyq-success-toast';

  notification.style.cssText = `
    position: fixed !important;
    top: 86px !important;
    left: 50% !important;
    transform: translateX(-50%) translateY(-10px) !important;
    z-index: 9999999 !important;
    min-width: 260px !important;
    max-width: 90vw !important;
    min-height: 56px !important;
    padding: 12px 18px !important;
    border-radius: 999px !important;
    background: #ffffff !important;
    color: #111827 !important;
    border: 1px solid rgba(16,185,129,0.35) !important;
    box-shadow: 0 16px 40px rgba(0,0,0,0.28) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 12px !important;
    direction: rtl !important;
    opacity: 0 !important;
    pointer-events: none !important;
    transition: opacity 0.25s ease, transform 0.25s ease !important;
    animation: none !important;
  `;

  const icon = document.createElement('div');
  icon.innerHTML = '<i class="fas fa-check"></i>';
  icon.style.cssText = `
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    background: rgba(16,185,129,0.14) !important;
    color: #10b981 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
    font-size: 15px !important;
  `;

  const messageSpan = document.createElement('div');
  messageSpan.innerText = message;
  messageSpan.style.cssText = `
    font-size: 14px !important;
    font-weight: 800 !important;
    color: #111827 !important;
    white-space: nowrap !important;
  `;

  notification.appendChild(icon);
  notification.appendChild(messageSpan);
  document.body.appendChild(notification);

  // إجبار المتصفح على تطبيق الستايل ثم إظهار العنصر
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(-50%) translateY(0)';
  }, 20);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(-10px)';

    setTimeout(() => {
      notification.remove();
      if (typeof callback === 'function') callback();
    }, 300);
  }, 2600);
}

function showPersistentAlert(message, bgColor = '#3B82F6') {
  const container = document.getElementById('offlineToastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'offline-toast';
  toast.style.background = bgColor;
  toast.style.cursor = 'pointer';
  toast.innerHTML = `
    <i class="fas fa-clock"></i>
    <span>${message}</span>
    <button class="close-toast" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.insertBefore(toast, container.firstChild);
}

// ============================================================
// CUSTOM ALERT MODAL
// ============================================================

function showAlert(message, title = null) {
  return new Promise((resolve) => {
    const existingOverlay = document.querySelector('.alert-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'alert-overlay';
    
    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert';
    alertBox.innerHTML = `
      <div class="alert-header">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="alert-body">
        <div class="alert-message">${message}</div>
      </div>
      <div class="alert-footer">
        <button class="alert-button" id="alertConfirmBtn">${currentLang === 'ar' ? 'حسناً' : 'OK'}</button>
      </div>
    `;
    
    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);
    
    const confirmBtn = document.getElementById('alertConfirmBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
    }
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve();
      }
    });
  });
}

// ============================================================
// OFFLINE & CONNECTION HANDLERS
// ============================================================

function updateConnectionStatus() {
  const statusDot = document.getElementById('statusDot');
  if (statusDot) {
    if (navigator.onLine) {
      statusDot.className = 'status-dot connected';
    } else {
      statusDot.className = 'status-dot maintenance';
    }
  }
}

function showOfflineToast() {
  const container = document.getElementById('offlineToastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'offline-toast';
  toast.innerHTML = `
    <i class="fas fa-wifi-slash"></i>
    <span>أنت غير متصل بالإنترنت</span>
    <button class="close-toast" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.appendChild(toast);
}

// ============================================================
// WHATSAPP MESSAGE
// ============================================================

async function sendWhatsAppMessage(phone, message) {
  // التحقق من وجود business_id للمستخدم الحالي
  if (!currentUser?.business_id) {
    console.log('⚠️ لا يمكن إرسال رسالة واتساب: business_id غير موجود');
    return;
  }

  try {
    // استدعاء RPC الآمن بدلاً من الاتصال المباشر بـ Facebook API
    const { data, error } = await supabase.rpc('send_whatsapp_message', {
      p_phone: phone,
      p_message: message,
      p_business_id: currentUser.business_id
    });

    if (error) {
      console.error('❌ خطأ في RPC واتساب:', error);
      return;
    }

    console.log('✅ تم إرسال الرسالة إلى الخادم:', data);
  } catch (e) {
    console.log('❌ خطأ في إرسال واتساب:', e);
  }
}

// ============================================================
// SEARCH CUSTOMER BY PHONE
// ============================================================

async function searchCustomerByPhone(phone) {
  const nameInput = document.getElementById('walkInName');
  
  if (!phone || phone.length !== 8) {
    if (nameInput && nameInput.value) {
      nameInput.value = "";
      nameInput.placeholder = "الاسم الكامل";
    }
    return;
  }
  
  const fullPhone = "05" + phone;
  const { data, error } = await supabase
    .from("customers")
    .select("name")
    .eq("phone", fullPhone)
    .maybeSingle();
  
  if (!error && data && data.name) {
    nameInput.value = data.name;
    nameInput.placeholder = "الاسم (يمكن تعديله)";
    console.log("✅ تم العثور على العميل:", data.name);
  } else {
    nameInput.value = "";
    nameInput.placeholder = "الاسم الكامل";
  }
}

// ============================================================
// UPDATE VERSION BANNER
// ============================================================

let newVersionAvailable = false;

function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: #10B981;
    color: white;
    padding: 10px 20px;
    border-radius: 40px;
    font-size: 14px;
    font-weight: 600;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    animation: slideDown 0.3s ease;
  `;
  banner.innerHTML = `
    <i class="fas fa-sync-alt"></i>
    <span>تحديث جديد متوفر - اضغط للتحديث</span>
  `;
  banner.onclick = () => {
    navigator.serviceWorker.ready.then(registration => {
      if (registration.waiting) registration.waiting.postMessage('skipWaiting');
    });
    banner.remove();
    location.reload();
  };
  document.body.appendChild(banner);
  
  setTimeout(() => {
    if (banner.parentElement) banner.remove();
  }, 15000);
}

// ============================================================
// SYNC FUNCTIONS
// ============================================================

async function performFinalSync() {
  if (isCurrentlySyncing) return;
  if (moveModeActive || tableEditMode || tableDeleteMode) return;
  
  isCurrentlySyncing = true;
  console.log("🔄 جاري تحديث المزامنة...");
  
  try {
    await loadAll();
    console.log("✅ تم تحديث البيانات بنجاح");
  } catch (err) {
    console.error("❌ خطأ في تحديث البيانات:", err);
  } finally {
    isCurrentlySyncing = false;
  }
}

function debouncedSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    performFinalSync();
    syncTimeout = null;
  }, 500);
}