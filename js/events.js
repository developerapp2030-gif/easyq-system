// ============================================================
// UI EVENT HANDLERS
// ============================================================

function openStatusModal(row) {
    modalTable = row;
    
    // ترجمة أزرار المودال
    const btns = {
        'btnAvailable': 'Available',
        'btnReserved': 'Reserved',
        'btnOccupied': 'Occupied',
        'btnCleaning': 'Cleaning',
        'btnDisabled': 'Disabled',
        'btnPending': 'Pending',
        'btnSwap': 'Swap'
    };
    
    for (const [id, enText] of Object.entries(btns)) {
        const btn = document.getElementById(id);
        if (btn) {
            const arText = {
                'Available': 'متاحة',
                'Reserved': 'محجوزة',
                'Occupied': 'مشغولة',
                'Cleaning': 'تنظيف',
                'Disabled': 'مغلقة',
                'Pending': 'معلقة',
                'Swap': 'تبديل'
            }[enText];
            btn.innerHTML = currentLang === 'ar' ? arText : enText;
        }
    }
    
    // ترجمة زر الإغلاق
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) {
        closeBtn.innerHTML = currentLang === 'ar' ? 'إغلاق' : 'Close';
    }

    document.getElementById("statusModal").classList.add("show");
    document.getElementById("modalSub").innerHTML = `${row.table_name} - ${getStatusLabel(row.status)}`;
}

function closeStatusModal() {
  modalTable = null;
  document.getElementById("statusModal").classList.remove("show");
}

function showQRModal(bookingCode, customerName, queuePosition, status) {
    const trackUrl = `${window.location.origin}/booking.html?code=${bookingCode}`;
    
    const qrContainer = document.getElementById('qrCodeContainer');
    if (qrContainer && typeof QRCode !== 'undefined') {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: trackUrl,
            width: 200,
            height: 200
        });
    }
    
    document.getElementById('qrCustomerName').innerText = customerName;
    document.getElementById('qrBookingCode').innerText = bookingCode;
    document.getElementById('qrQueuePosition').innerText = queuePosition;
    let statusText = '';
    if (status === 'waiting') statusText = 'في الانتظار';
    else if (status === 'offered') statusText = 'تم التعيين';
    else if (status === 'occupied') statusText = 'قيد الخدمة';
    else statusText = status;
    document.getElementById('qrStatus').innerText = statusText;
    document.getElementById('qrLink').value = trackUrl;
    
    document.getElementById('qrModal').classList.add('show');
}

function copyQRLink() {
    const linkInput = document.getElementById('qrLink');
    if (linkInput) {
        linkInput.select();
        document.execCommand('copy');
        alert('✅ تم نسخ رابط المتابعة');
    }
}

function printQR() {
    const qrContainer = document.getElementById('qrCodeContainer');
    if (!qrContainer) return;
    
    // الحصول على رابط QR من المودال
    const qrLink = document.getElementById('qrLink')?.value || '';
    
    // إنشاء نافذة طباعة
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>طباعة QR Code - EASY-Q</title>
            <meta charset="UTF-8">
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    font-family: Arial, sans-serif;
                    background: white;
                }
                .qr-container {
                    text-align: center;
                    padding: 30px;
                }
                .qr-container img {
                    width: 250px;
                    height: 250px;
                }
                .info {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #333;
                }
                .info div {
                    margin: 5px 0;
                }
                .link {
                    font-size: 12px;
                    color: #666;
                    word-break: break-all;
                }
            </style>
        </head>
        <body>
            <div class="qr-container">
                <h2>EASY-Q - رمز متابعة الحجز</h2>
                ${qrContainer.innerHTML}
                <div class="info">
                    <div><strong>${document.getElementById('qrCustomerName')?.innerText || ''}</strong></div>
                    <div>الرقم المرجعي: ${document.getElementById('qrBookingCode')?.innerText || ''}</div>
                    <div>رقم الدور: ${document.getElementById('qrQueuePosition')?.innerText || ''}</div>
                    <div class="link">رابط المتابعة: ${qrLink}</div>
                </div>
                <p>امسح الرمز لمتابعة الحجز</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
}

function closeQRModal() {
    document.getElementById('qrModal').classList.remove('show');
}

function clearSelection() {
  selectedRequestId = null;
  selectedPartySize = null;
  draggedRequestId = null;
  draggedPartySize = null;
  renderFloorPlan();
  renderWaitingList();
}

function selectWaiting(id, size) {
  if (selectedRequestId === id) {
    clearSelection();
    return;
  }
  selectedRequestId = id;
  selectedPartySize = size;
  draggedRequestId = null;
  draggedPartySize = null;
  
  document.querySelectorAll('.waiting-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  const selectedCard = document.querySelector(`.waiting-card[data-request-id="${id}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  
  renderFloorPlan();
  renderWaitingList();
}

function openWalkInModal() {
  document.getElementById("walkInName").value = "";
  currentPartySize = 2;
  const walkInPartyValue = document.getElementById("walkInPartyValue");
  const walkInParty = document.getElementById("walkInParty");
  if (walkInPartyValue) walkInPartyValue.innerText = "2";
  if (walkInParty) walkInParty.value = "2";
  document.getElementById("walkInPhone").value = "";
  document.getElementById("walkInZone").value = "";
  
  const phoneInput = document.getElementById('walkInPhone');
  if (phoneInput) {
    phoneInput.oninput = function() {
      searchCustomerByPhone(this.value);
    };
  }
  document.getElementById("walkInModal").classList.add("show");
}

function closeWalkInModal() {
  document.getElementById("walkInModal").classList.remove("show");
}

// ============================================================
// TABLE CRUD EVENTS
// ============================================================

function openAddTableModal() {
  if (!canDo('add_tables')) {
    showAlert('ليس لديك صلاحية لإضافة طاولات');
    return;
  }
  selectedTableId = null;
  const modalTitle = document.getElementById('tableModalTitle');
  if (modalTitle) modalTitle.innerHTML = currentLang === 'ar' ? 'إضافة طاولة جديدة' : 'Add New Table';
  document.getElementById('tableName').value = '';
  document.getElementById('tableCapacity').value = 4;
  document.getElementById('tableFloor').value = currentFloor;
  document.getElementById('tableModal').classList.add('show');
}

function enableTableEditMode() {
  if (!canDo('edit_tables')) {
    showAlert('ليس لديك صلاحية لتعديل الطاولات');
    return;
  }
  if (moveModeActive) toggleMoveMode();
  if (tableDeleteMode) disableDeleteMode();
  tableEditMode = true;
  tableDeleteMode = false;
  alert(currentLang === 'ar' ? 'اضغط على الطاولة التي تريد تعديلها' : 'Click on the table you want to edit');
}

function enableTableDeleteMode() {
  if (!canDo('delete_tables')) {
    showAlert('ليس لديك صلاحية لحذف الطاولات');
    return;
  }
  if (moveModeActive) toggleMoveMode();
  if (tableEditMode) tableEditMode = false;
  tableDeleteMode = true;
  document.body.classList.add('delete-mode-active');
  alert(currentLang === 'ar' ? '⚠️ اضغط على الطاولة التي تريد حذفها' : '⚠️ Click on the table you want to delete');
}

function disableDeleteMode() {
  tableDeleteMode = false;
  document.body.classList.remove('delete-mode-active');
}

function editTable(table) {
  selectedTableId = table.id;
  const modalTitle = document.getElementById('tableModalTitle');
  if (modalTitle) modalTitle.innerHTML = currentLang === 'ar' ? 'تعديل طاولة' : 'Edit Table';
  document.getElementById('tableName').value = table.table_name;
  document.getElementById('tableCapacity').value = table.capacity;
  document.getElementById('tableFloor').value = table.floor_number || 1;
  document.getElementById('tableZone').value = table.zone_name || 'General';
  document.getElementById('tableModal').classList.add('show');
  tableEditMode = false;
}

async function deleteTable(tableId, tableName) {
  const confirmMsg = currentLang === 'ar'
    ? `هل أنت متأكد من حذف طاولة ${tableName}؟`
    : `Delete table ${tableName}?`;
  
  if (!confirm(confirmMsg)) return;
  
  const { error } = await supabase
    .from('dining_tables')
    .delete()
    .eq('id', tableId);
  
  if (error) {
    console.error('Delete error:', error);
    alert(currentLang === 'ar' ? 'فشل حذف الطاولة' : 'Failed to delete');
    return;
  }
  
  alert(currentLang === 'ar' ? 'تم حذف الطاولة' : 'Table deleted');
  tableDeleteMode = false;
  await loadAll();
}

async function saveTable() {
  const tableName = document.getElementById('tableName').value.trim();
  const capacity = parseInt(document.getElementById('tableCapacity').value);
  const floorNumber = parseInt(document.getElementById('tableFloor').value);
  const zoneName = document.getElementById('tableZone').value;
  
  if (!tableName) {
    alert(currentLang === 'ar' ? 'الرجاء إدخال اسم الطاولة' : 'Please enter table name');
    return;
  }
  
  if (selectedTableId) {
    const { error } = await supabase
      .from('dining_tables')
      .update({
        table_name: tableName,
        capacity: capacity,
        floor_number: floorNumber,
        zone_name: zoneName
      })
      .eq('id', selectedTableId);
    
    if (error) {
      console.error('Update error:', error);
      alert(currentLang === 'ar' ? 'فشل تحديث الطاولة' : 'Failed to update');
      return;
    }
    showSuccessNotification(currentLang === "ar" ? "تم تحديث الطاولة" : "Table updated");
  } else {
    const { error } = await supabase
      .from('dining_tables')
      .insert({
        business_id: BUSINESS_ID,
        table_name: tableName,
        capacity: capacity,
        floor_number: floorNumber,
        zone_name: zoneName,
        status: 'available',
        pos_x: 100,
        pos_y: 100,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Insert error:', error);
      alert(currentLang === 'ar' ? 'فشل إضافة الطاولة' : 'Failed to add');
      return;
    }
    showSuccessNotification(currentLang === "ar" ? "تم إضافة الطاولة" : "Table added");
  }
  
  closeTableModal();
  tableEditMode = false;
  tableDeleteMode = false;
  await loadAll();
}

function closeTableModal() {
  document.getElementById('tableModal').classList.remove('show');
  tableEditMode = false;
  tableDeleteMode = false;
  selectedTableId = null;
}

// ============================================================
// MOVE MODE
// ============================================================

function toggleMoveMode() {
  if (!canDo('move_tables')) {
    showAlert('ليس لديك صلاحية لتحريك الطاولات');
    return;
  }
  if (tableEditMode || tableDeleteMode) {
    alert(currentLang === 'ar' ? 'الرجاء الخروج من وضع التعديل/الحذف أولاً' : 'Please exit edit/delete mode first');
    return;
  }
  
  moveModeActive = !moveModeActive;
  const moveBtn = document.getElementById('moveTableBtn');
  const saveBtn = document.getElementById('savePositionsBtn');
  
  if (moveModeActive) {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
    
    document.body.classList.add('edit-mode-active');
    if (moveBtn) {
      moveBtn.classList.add('active');
      const span = moveBtn.querySelector('span');
      if (span) span.innerHTML = currentLang === 'ar' ? '🔴 خروج من وضع التحريك' : '🔴 Exit Move Mode';
      moveBtn.style.background = 'var(--danger)';
      moveBtn.style.color = 'white';
    }
    if (saveBtn) saveBtn.style.display = 'flex';
    
    disableCustomerDragDrop(true);
    
    pendingPositionUpdates = {};
    
    const floorCanvas = document.getElementById('floorCanvas');
    if (floorCanvas) floorCanvas.classList.add('show-grid');
    renderMoveModeTables();
  } else {
    const floorCanvas = document.getElementById('floorCanvas');
    if (floorCanvas) floorCanvas.classList.remove('show-grid');
    
    if (!autoRefreshInterval) {
      autoRefreshInterval = setInterval(() => {
        if (!moveModeActive) {
          loadAll();
        }
      }, 15000);
    }
    
    document.body.classList.remove('edit-mode-active');
    if (moveBtn) {
      moveBtn.classList.remove('active');
      const span = moveBtn.querySelector('span');
      if (span) span.innerHTML = currentLang === 'ar' ? 'تحريك' : 'Move';
      moveBtn.style.background = '';
      moveBtn.style.color = '';
    }
    if (saveBtn) saveBtn.style.display = 'none';
    
    disableCustomerDragDrop(false);
    selectedTableForMove = null;
    
    renderFloorPlan();
  }
}

async function saveTablePositions() {
  if (!moveModeActive) {
    alert(currentLang === 'ar' ? 'الرجاء تفعيل وضع التحريك أولاً' : 'Please enable move mode first');
    return;
  }
  
  if (Object.keys(pendingPositionUpdates).length === 0) {
    alert(currentLang === 'ar' ? 'لا توجد تغييرات لحفظها' : 'No changes to save');
    return;
  }
  
  const saveBtn = document.getElementById('savePositionsBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> حفظ...';
  }
  
  let successCount = 0;
  let errorCount = 0;
  
for (const [tableId, position] of Object.entries(pendingPositionUpdates)) {
  const canvas = document.getElementById('floorCanvas');
  const canvasWidth = canvas ? canvas.clientWidth : 1000;
  const canvasHeight = canvas ? canvas.clientHeight : 800;

  const TABLE_W = 88;
  const TABLE_H = 80;

  const finalPosition = {
    x: Math.max(10, Math.min(Math.round(position.pos_x), canvasWidth - TABLE_W)),
    y: Math.max(10, Math.min(Math.round(position.pos_y), canvasHeight - TABLE_H))
  };

  const { error } = await supabase
    .from('dining_tables')
    .update({
      pos_x: finalPosition.x,
      pos_y: finalPosition.y
    })
    .eq('id', tableId);    
    if (error) {
      console.error('Error saving table position:', error);
      errorCount++;
    } else {
      successCount++;
    }
  }
  
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i>';
  }
  
  if (successCount > 0) {
    showSuccessNotification(currentLang === 'ar'
      ? `✅ تم حفظ مواقع ${successCount} طاولة${errorCount > 0 ? `، فشل ${errorCount}` : ''}`
      : `✅ Saved ${successCount} table positions${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    
for (const [tableId, position] of Object.entries(pendingPositionUpdates)) {
  const table = floorData.find(t => t.id == tableId);
  if (table) {
    table.pos_x = Math.round(position.pos_x);
    table.pos_y = Math.round(position.pos_y);
  }
}
    
    pendingPositionUpdates = {};
    
    const originalReadyMode = settings.ready_mode;
    settings.ready_mode = "disabled";
    
    await loadFloorPlan();
    
    settings.ready_mode = originalReadyMode;
  } else if (errorCount > 0) {
    alert(currentLang === 'ar' ? 'فشل حفظ المواقع' : 'Failed to save positions');
  }
  
  moveModeActive = false;
  const floorCanvas = document.getElementById('floorCanvas');
  if (floorCanvas) floorCanvas.classList.remove('show-grid');
  
  const moveBtn = document.getElementById('moveTableBtn');
  const saveBtn2 = document.getElementById('savePositionsBtn');
  
  if (moveBtn) {
    moveBtn.classList.remove('active');
    const span = moveBtn.querySelector('span');
    if (span) span.innerHTML = currentLang === 'ar' ? 'تحريك' : 'Move';
  }
  if (saveBtn2) saveBtn2.style.display = 'none';
  
  disableCustomerDragDrop(false);
  selectedTableForMove = null;
  
  if (!autoRefreshInterval) {
    autoRefreshInterval = setInterval(() => {
      if (!moveModeActive) {
        loadAll();
      }
    }, 15000);
  }
  
  renderFloorPlan();
}
// ============================================================
// SIDEBAR TOGGLE - VERSION FIXED (تعمل 100%)
// ============================================================

const sidebarToggleBtn = document.getElementById('sidebarToggle');

function toggleSidebarFixed() {
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        sidebarElement.classList.toggle('open');
        console.log("Sidebar toggled, open:", sidebarElement.classList.contains('open'));
    }
}

function closeSidebarFixed() {
    const sidebarElement = document.getElementById('sidebar');
    if (sidebarElement) {
        sidebarElement.classList.remove('open');
        
        // ✅وضع التحريك غير مفعل
        if (!window.moveModeActive) {
            // إغلاق جميع البنود الفرعية المفتوحة
            document.querySelectorAll('.sub-menu.open').forEach(submenu => {
                submenu.classList.remove('open');
            });
            
            // إزالة كلاس open من العناصر الرئيسية
            document.querySelectorAll('.main-menu-item.open').forEach(mainItem => {
                mainItem.classList.remove('open');
            });
            
            console.log("Sidebar closed with all submenus closed");
        } else {
            console.log("Sidebar closed but move mode active, keeping submenus open");
        }
    }
}

// ربط الزر بالدالة
if (sidebarToggleBtn) {
    sidebarToggleBtn.onclick = function(e) {
        e.stopPropagation();
        toggleSidebarFixed();
    };
}

// إغلاق السايدبار عند الضغط خارجها
document.addEventListener('click', function(e) {
    const sidebarElement = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (sidebarElement && sidebarElement.classList.contains('open')) {
        if (!sidebarElement.contains(e.target) && !toggleBtn.contains(e.target)) {
            closeSidebarFixed();
        }
    }
});
// ============================================================
// THEME TOGGLE
// ============================================================

const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const icon = themeToggleBtn.querySelector('i');
    if (document.body.classList.contains('dark')) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
  });
  
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    const icon = themeToggleBtn.querySelector('i');
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  }
}

// ============================================================
// LOGOUT
// ============================================================

function logoutAndClean() {
  currentUser = null;

  // حذف بيانات تسجيل الدخول
  localStorage.removeItem('easyq_user');
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

settingsDraft = {};
  // تنظيف بيانات المطعم السابق من الذاكرة
  floorData = [];
  waitingData = [];
  expiredData = [];
  cachedExpiredData = [];

  // تنظيف التحديدات والحالات المؤقتة
  selectedRequestId = null;
  selectedPartySize = null;
  draggedRequestId = null;
  draggedPartySize = null;
  selectedTableForMove = null;
  pendingPositionUpdates = {};

  // إيقاف وضع التحريك أو التعديل إن كان مفعل
  moveModeActive = false;
  tableEditMode = false;
  tableDeleteMode = false;

  // تنظيف لوحة الطاولات والقوائم من الواجهة
  const floorCanvas = document.getElementById('floorCanvas');
  if (floorCanvas) floorCanvas.innerHTML = '';

  const waitingList = document.getElementById('waitingList');
  if (waitingList) waitingList.innerHTML = '';

  const expiredList = document.getElementById('expiredList');
  if (expiredList) expiredList.innerHTML = '';

  const statusSummary = document.getElementById('statusSummary');
  if (statusSummary) statusSummary.innerHTML = '';

  // إظهار شاشة تسجيل الدخول
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'flex';

  const loginUsername = document.getElementById('loginUsername');
  if (loginUsername) loginUsername.value = '';

  const loginPassword = document.getElementById('loginPassword');
  if (loginPassword) loginPassword.value = '';
}

// ============================================================
// جعل دوال السايدبار عامة وإعادة ربط الأحداث
// ============================================================

// الدوال الموجودة فعليًا في هذا الملف هي:
// toggleSidebarFixed()
// closeSidebarFixed()

window.toggleSidebar = toggleSidebarFixed;
window.closeSidebar = closeSidebarFixed;

document.addEventListener('DOMContentLoaded', function() {
  const sidebarBtn = document.getElementById('sidebarToggle');

  if (sidebarBtn) {
    sidebarBtn.onclick = function(e) {
      e.stopPropagation();
      toggleSidebarFixed();
    };

    console.log("✅ Sidebar button connected with toggleSidebarFixed!");
  }
});

// ============================================================
// FULL PAGE PANEL FUNCTIONS
// ============================================================

function openFullPagePanel(title, subtitle, contentHtml) {
  const panel = document.getElementById("fullPagePanel");
  const titleEl = document.getElementById("fullPagePanelTitle");
  const subtitleEl = document.getElementById("fullPagePanelSubtitle");
  const bodyEl = document.getElementById("fullPagePanelBody");

  if (!panel || !titleEl || !subtitleEl || !bodyEl) {
    console.error("❌ عناصر fullPagePanel غير موجودة في index.html");
    return;
  }

  titleEl.innerHTML = title || "";
  subtitleEl.innerHTML = subtitle || "";
  bodyEl.innerHTML = contentHtml || "";
  const closeBtn = document.querySelector(".full-page-panel-close");
if (closeBtn) {
  closeBtn.style.display = "inline-flex";
}

  panel.classList.add("show");

  // إغلاق السايدبار عند فتح صفحة كاملة
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.classList.remove("open");
  }
}

function closeFullPagePanel() {
  const panel = document.getElementById("fullPagePanel");
  const bodyEl = document.getElementById("fullPagePanelBody");

  if (!panel) return;

  panel.classList.remove("show");

  if (bodyEl) {
    bodyEl.innerHTML = "";
  }
}

// ============================================================
// BUSINESS PROFILE PAGE
// ============================================================

// ============================================================
// BUSINESS PROFILE PAGE
// ============================================================

// ============================================================
// BOOKING SETTINGS PAGE
// ============================================================
// BOOKING SETTINGS PAGE V2
// إعدادات واجهة الحجز داخل fullPagePanel
// ============================================================

const EASYQ_BOOKING_SETTINGS_KEY = "booking_settings_v2";

const DEFAULT_EASYQ_BOOKING_SETTINGS = {
  // النصوص - نموذج الحجز
  welcome_message: "مرحباً بك، احجز دورك بسهولة وتابع حالة انتظارك مباشرة.",
  restore_hint_prefix: "إذا كان لديك حجز نشط",
  restore_hint_link: "اضغط هنا",
  restore_hint_suffix: "... ولحجز جديد املأ البيانات أدناه",
  current_queue_title: "الطابور الحالي",
  current_queue_sub: "يتم تحديث الرقم مباشرة",
  submit_button_text: "تأكيد الحجز",
  notification_button_text: "تفعيل إشعارات الدور",

  // النصوص - المتابعة
  status_page_title: "متابعة الحجز",
  waiting_default_label: "رقمك في الانتظار",
  waiting_near_label: "اقترب دورك",
  waiting_next_label: "أنت التالي",
  ready_title_text: "حان دورك",
  table_ready_text: "طاولتك جاهزة",
  table_ready_with_number_text: "طاولتك رقم {table} جاهزة",
  ready_sub_text: "يجب عليك الحضور قبل انتهاء الوقت",
  occupied_title_text: "تم وصولك أهلاً وسهلاً بك",
  occupied_sub_text: "شرفت المكان",
  cleaning_title_text: "شكراً لزيارتك",
  cleaning_sub_text: "نتمنى زيارتك قريبا",
  queue_status_waiting_text: "نشكر لك صبرك دورك يتقدم",
  queue_status_offered_text: "نحن بانتظارك",

  // نصوص المشاركة والرقم المرجعي
  share_hint_text: "شارك أصدقاءك ليتابعوا ويشاهدوا حجزك فقط، لن يتمكنوا من إلغاء الحجز.",
  guest_view_text: "يمكنك متابعة الحجز من هنا، والإلغاء متاح لصاحب الحجز فقط",
  reference_label_text: "رقم حجزك المرجعي:",
  reference_save_hint_text: "💡قم بحفظ رقم حجزك المرجعي لاستعراض صفحة انتظار حجزك من أي هاتف آخر أو في حال إغلاقها",
  cancel_waiting_text: "إلغاء الحجز",
  cannot_attend_title: "لا أستطيع الحضور",
  cannot_attend_sub: "اضغط هنا إذا لم تتمكن من الحضور، لتحرير الطاولة لعميل آخر.",
  exit_text: "خروج",

  // تفعيل وتعطيل
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

  // الألوان
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

let easyQBookingSettingsAdmin = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };

function getBookingSettingsBusinessId() {
  return currentUser?.business_id || BUSINESS_ID || null;
}

function escapeBookingSetting(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isBookingSettingChecked(settings, key) {
  return settings?.[key] === true ? "checked" : "";
}

function bookingSettingsTextInput(settings, key, label, placeholder = "") {
  return `
    <div class="form-group">
      <label>${label}</label>
      <input
        type="text"
        id="bookingSetting_${key}"
        class="business-profile-input"
        value="${escapeBookingSetting(settings[key])}"
        placeholder="${escapeBookingSetting(placeholder)}"
      >
    </div>
  `;
}

function bookingSettingsColorInput(settings, key, label) {
  const safeValue = escapeBookingSetting(settings[key]);

  return `
    <div class="form-group">
      <label>${label}</label>

      <div style="display:flex; gap:10px; align-items:center;">
        <input
          type="color"
          id="bookingSetting_${key}_picker"
          class="business-profile-input"
          value="${safeValue}"
          style="width:70px; height:46px; padding:6px; flex:0 0 70px;"
          oninput="
            const textInput = document.getElementById('bookingSetting_${key}');
            if (textInput) textInput.value = this.value;
          "
        >

        <input
          type="text"
          id="bookingSetting_${key}"
          class="business-profile-input"
          value="${safeValue}"
          placeholder="#000000"
          maxlength="20"
          style="flex:1; direction:ltr; text-align:left;"
          oninput="
            const picker = document.getElementById('bookingSetting_${key}_picker');
            if (picker && /^#[0-9A-Fa-f]{6}$/.test(this.value)) picker.value = this.value;
          "
        >
      </div>
    </div>
  `;
}

function bookingSettingsToggle(settings, key, label, hint = "") {
  return `
    <div class="booking-setting-toggle-row">
      <div>
        <div class="booking-setting-toggle-title">${label}</div>
        ${hint ? `<div class="booking-setting-toggle-hint">${hint}</div>` : ""}
      </div>

      <label class="booking-setting-switch">
        <input
          type="checkbox"
          id="bookingSetting_${key}"
          ${isBookingSettingChecked(settings, key)}
        >
        <span></span>
      </label>
    </div>
  `;
}

async function loadBookingSettingsV2ForAdmin() {
  const businessId = getBookingSettingsBusinessId();

  if (!businessId) {
    showAlert("لم يتم العثور على مطعم المستخدم الحالي");
    return { ...DEFAULT_EASYQ_BOOKING_SETTINGS };
  }

  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("setting_value")
    .eq("business_id", businessId)
    .eq("setting_key", EASYQ_BOOKING_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.error("❌ فشل تحميل إعدادات واجهة الحجز:", error);
    showAlert("فشل تحميل إعدادات واجهة الحجز");
    return { ...DEFAULT_EASYQ_BOOKING_SETTINGS };
  }

  let savedSettings = {};

  try {
    savedSettings = data?.setting_value ? JSON.parse(data.setting_value) : {};
  } catch (err) {
    console.warn("⚠️ إعدادات الحجز غير صالحة JSON، سيتم استخدام الافتراضي:", err);
    savedSettings = {};
  }

  return {
    ...DEFAULT_EASYQ_BOOKING_SETTINGS,
    ...savedSettings
  };
}

function collectBookingSettingsV2FromPanel() {
  const next = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };

  Object.keys(DEFAULT_EASYQ_BOOKING_SETTINGS).forEach((key) => {
    const el = document.getElementById(`bookingSetting_${key}`);
    if (!el) return;

    if (el.type === "checkbox") {
      next[key] = el.checked;
    } else {
      next[key] = el.value;
    }
  });

  return next;
}

async function saveBookingSettingsV2() {
  const businessId = getBookingSettingsBusinessId();

  if (!businessId) {
    showAlert("لم يتم العثور على مطعم المستخدم الحالي");
    return;
  }

  const saveBtn = document.getElementById("saveBookingSettingsV2Btn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...`;
  }

  const nextSettings = collectBookingSettingsV2FromPanel();

  try {
    const { data: existing, error: readError } = await supabase
      .from("restaurant_settings")
      .select("setting_key")
      .eq("business_id", businessId)
      .eq("setting_key", EASYQ_BOOKING_SETTINGS_KEY)
      .maybeSingle();

    if (readError) throw readError;

    if (existing) {
      const { error: updateError } = await supabase
        .from("restaurant_settings")
        .update({
          setting_value: JSON.stringify(nextSettings)
        })
        .eq("business_id", businessId)
        .eq("setting_key", EASYQ_BOOKING_SETTINGS_KEY);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("restaurant_settings")
        .insert({
          business_id: businessId,
          setting_key: EASYQ_BOOKING_SETTINGS_KEY,
          setting_value: JSON.stringify(nextSettings)
        });

      if (insertError) throw insertError;
    }

    easyQBookingSettingsAdmin = nextSettings;
    closeFullPagePanel();
    showSuccessNotification("✅ تم حفظ إعدادات واجهة الحجز بنجاح");
  } catch (err) {
    console.error("❌ فشل حفظ إعدادات واجهة الحجز:", err);
    showAlert("فشل حفظ إعدادات واجهة الحجز: " + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fas fa-save"></i> حفظ الإعدادات`;
    }
  }
}

function renderBookingSettingsV2Panel(settings) {
  return `
    <div class="business-profile-page booking-settings-v2-page">

      <div class="business-profile-grid">

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-comment-dots"></i>
            نصوص نموذج الحجز
          </div>

          <div class="business-profile-form">
            ${bookingSettingsTextInput(settings, "welcome_message", "عبارة الترحيب")}
            ${bookingSettingsTextInput(settings, "restore_hint_prefix", "عبارة استعادة الحجز - البداية")}
            ${bookingSettingsTextInput(settings, "restore_hint_link", "نص رابط استعادة الحجز")}
            ${bookingSettingsTextInput(settings, "restore_hint_suffix", "عبارة استعادة الحجز - النهاية")}
            ${bookingSettingsTextInput(settings, "current_queue_title", "عنوان الطابور الحالي")}
            ${bookingSettingsTextInput(settings, "current_queue_sub", "وصف الطابور الحالي")}
            ${bookingSettingsTextInput(settings, "submit_button_text", "نص زر الحجز")}
            ${bookingSettingsTextInput(settings, "notification_button_text", "نص زر الإشعارات")}
          </div>
        </div>

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-list-check"></i>
            نصوص صفحة المتابعة
          </div>

          <div class="business-profile-form">
            ${bookingSettingsTextInput(settings, "status_page_title", "عنوان صفحة المتابعة")}
            ${bookingSettingsTextInput(settings, "waiting_default_label", "نص الحالة العادية")}
            ${bookingSettingsTextInput(settings, "waiting_near_label", "نص اقترب دورك")}
            ${bookingSettingsTextInput(settings, "waiting_next_label", "نص أنت التالي")}
            ${bookingSettingsTextInput(settings, "ready_title_text", "نص حان دورك")}
            ${bookingSettingsTextInput(settings, "table_ready_text", "نص طاولتك جاهزة")}
            ${bookingSettingsTextInput(settings, "table_ready_with_number_text", "نص طاولتك رقم جاهزة", "استخدم {table} مكان رقم الطاولة")}
            ${bookingSettingsTextInput(settings, "ready_sub_text", "نص الحضور قبل انتهاء الوقت")}
            ${bookingSettingsTextInput(settings, "occupied_title_text", "نص تم وصولك")}
            ${bookingSettingsTextInput(settings, "occupied_sub_text", "نص شرفت المكان")}
            ${bookingSettingsTextInput(settings, "cleaning_title_text", "نص شكراً لزيارتك")}
            ${bookingSettingsTextInput(settings, "cleaning_sub_text", "نص نتمنى زيارتك")}
            ${bookingSettingsTextInput(settings, "queue_status_waiting_text", "النص أسفل الحلقة أثناء الانتظار")}
            ${bookingSettingsTextInput(settings, "queue_status_offered_text", "النص أسفل الحلقة عند جاهزية الطاولة")}
          </div>
        </div>

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-share-alt"></i>
            المشاركة والرقم المرجعي
          </div>

          <div class="business-profile-form">
            ${bookingSettingsTextInput(settings, "share_hint_text", "عبارة مشاركة الحجز")}
            ${bookingSettingsTextInput(settings, "guest_view_text", "عبارة رابط المشاهدة فقط")}
            ${bookingSettingsTextInput(settings, "reference_label_text", "عنوان الرقم المرجعي")}
            ${bookingSettingsTextInput(settings, "reference_save_hint_text", "عبارة حفظ الرقم المرجعي")}
            ${bookingSettingsTextInput(settings, "cancel_waiting_text", "نص إلغاء الحجز")}
            ${bookingSettingsTextInput(settings, "cannot_attend_title", "عنوان لا أستطيع الحضور")}
            ${bookingSettingsTextInput(settings, "cannot_attend_sub", "وصف لا أستطيع الحضور")}
            ${bookingSettingsTextInput(settings, "exit_text", "نص زر الخروج")}
          </div>
        </div>

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-toggle-on"></i>
            التفعيل والتعطيل
          </div>

          ${bookingSettingsToggle(settings, "share_booking_enabled", "تفعيل مشاركة الحجز", "إظهار عبارة المشاركة ورابط المشاهدة فقط.")}
          ${bookingSettingsToggle(settings, "cancel_waiting_enabled", "تفعيل إلغاء الحجز أثناء الانتظار", "إظهار زر إلغاء الحجز قبل تعيين الطاولة.")}
          ${bookingSettingsToggle(settings, "cannot_attend_enabled", "تفعيل زر لا أستطيع الحضور", "يظهر بعد جاهزية الطاولة لتحريرها لعميل آخر.")}
          ${bookingSettingsToggle(settings, "show_current_queue", "إظهار الطابور الحالي", "إظهار بطاقة الطابور الحالي في نموذج الحجز.")}
          ${bookingSettingsToggle(settings, "show_zone_selector", "إظهار اختيار المنطقة", "إذا كانت المناطق مفعلة في الفرع.")}
          ${bookingSettingsToggle(settings, "show_business_logo", "إظهار شعار المطعم", "إظهار دائرة الشعار في صفحة الحجز.")}
          ${bookingSettingsToggle(settings, "show_business_info", "إظهار بيانات المطعم", "اسم المطعم والفرع والمدينة والعنوان.")}
          ${bookingSettingsToggle(settings, "show_restore_hint", "إظهار سطر استعادة الحجز", "سطر: إذا كان لديك حجز نشط اضغط هنا.")}
          ${bookingSettingsToggle(settings, "show_reference_code", "إظهار الرقم المرجعي", "إخفاؤه لا يلغي إنشاء الرقم في قاعدة البيانات.")}
          ${bookingSettingsToggle(settings, "show_notification_button", "إظهار زر الإشعارات", "زر تفعيل إشعارات الدور.")}
        </div>

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-palette"></i>
            ألوان صفحة الحجز
          </div>

          <div class="business-profile-form">
            ${bookingSettingsColorInput(settings, "page_bg_start", "لون بداية الخلفية")}
            ${bookingSettingsColorInput(settings, "page_bg_end", "لون نهاية الخلفية")}
            ${bookingSettingsColorInput(settings, "primary_color", "اللون الرئيسي")}
            ${bookingSettingsColorInput(settings, "primary_color_2", "اللون الرئيسي الثاني")}
            ${bookingSettingsColorInput(settings, "accent_color", "اللون الذهبي / المميز")}
            ${bookingSettingsColorInput(settings, "progress_color", "لون الحلقة أثناء الانتظار")}
            ${bookingSettingsColorInput(settings, "success_color", "لون النجاح / الجاهزية")}
            ${bookingSettingsColorInput(settings, "text_color", "لون النص الأساسي")}
            ${bookingSettingsColorInput(settings, "button_text_color", "لون نص الأزرار")}
          </div>
        </div>

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-info-circle"></i>
            ملاحظة مهمة
          </div>

          <div style="font-size: 14px; line-height: 1.9; color: #4b5563;">
            سيتم حفظ جميع هذه الإعدادات داخل جدول
            <strong>restaurant_settings</strong>
            بالمفتاح:
            <strong>${EASYQ_BOOKING_SETTINGS_KEY}</strong>
            <br><br>
            ربط النصوص والألوان سيتم تدريجيًا في صفحة الحجز بدون تغيير قاعدة البيانات مرة أخرى.
          </div>
        </div>

      </div>

      <div class="business-profile-actions">
        <button class="business-profile-save-btn" id="saveBookingSettingsV2Btn" onclick="saveBookingSettingsV2()">
          <i class="fas fa-save"></i>
          حفظ الإعدادات
        </button>

        <button class="business-profile-cancel-btn" onclick="closeFullPagePanel()">
          إغلاق
        </button>
      </div>

    </div>
  `;
}

async function openBookingSettingsModal() {
  openFullPagePanel(
    "إعدادات واجهة الحجز",
    "تخصيص نصوص وألوان وخيارات صفحة الحجز الخاصة بالعملاء",
    `
      <div style="text-align:center; padding:60px;">
        <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
        <div style="margin-top:14px;">جاري تحميل إعدادات واجهة الحجز...</div>
      </div>
    `
  );

  const closeBtn = document.querySelector(".full-page-panel-close");
  if (closeBtn) {
    closeBtn.style.display = "none";
  }

  easyQBookingSettingsAdmin = await loadBookingSettingsV2ForAdmin();

  const bodyEl = document.getElementById("fullPagePanelBody");
  if (bodyEl) {
    bodyEl.innerHTML = renderBookingSettingsV2Panel(easyQBookingSettingsAdmin);
  }
}

window.openBookingSettingsModal = openBookingSettingsModal;
window.saveBookingSettingsV2 = saveBookingSettingsV2;

function openBusinessProfileModal() {
  const contentHtml = `
    <div class="business-profile-page">

      <div class="business-profile-grid">

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-store-alt"></i>
            بيانات المطعم / الفرع
          </div>

          <div class="business-profile-form">

            <div class="form-group">
              <label>اسم المطعم</label>
              <input type="text" id="businessProfileName" class="business-profile-input" placeholder="مثال: مطعم الأحلام">
            </div>

            <div class="form-group">
              <label>اسم الفرع</label>
              <input type="text" id="businessProfileBranchName" class="business-profile-input" placeholder="مثال: فرع أبها الرئيسي">
            </div>

            <div class="form-group">
              <label>المدينة</label>
              <input type="text" id="businessProfileCity" class="business-profile-input" placeholder="مثال: أبها">
            </div>

            <div class="form-group">
              <label>العنوان المختصر</label>
              <input type="text" id="businessProfileAddress" class="business-profile-input" placeholder="مثال: حي النزهة - طريق الملك فهد">
            </div>

            <div class="form-group">
              <label>رقم التواصل</label>
              <input type="text" id="businessProfilePhone" class="business-profile-input" placeholder="مثال: 05xxxxxxxx">
            </div>

            <div class="form-group">
              <label>البريد الإلكتروني</label>
              <input type="email" id="businessProfileEmail" class="business-profile-input" placeholder="example@restaurant.com">
            </div>

            <div class="form-group">
              <label>رابط خرائط Google</label>
              <input type="text" id="businessProfileMapUrl" class="business-profile-input" placeholder="ضع رابط موقع المطعم من خرائط Google">
            </div>

            <div class="form-group">
              <label>رابط إنستغرام</label>
              <input type="text" id="businessProfileInstagramUrl" class="business-profile-input" placeholder="https://instagram.com/restaurant">
            </div>

            <div class="form-group">
              <label>رابط الموقع الإلكتروني</label>
              <input type="text" id="businessProfileWebsiteUrl" class="business-profile-input" placeholder="https://example.com">
            </div>

          </div>
        </div>

        <div class="business-profile-card">
          <div class="business-profile-card-title">
            <i class="fas fa-image"></i>
            شعار المطعم
          </div>

          <div class="business-logo-preview">
            <div class="business-logo-circle" id="businessLogoPreviewCircle">
              <i class="fas fa-utensils" id="businessLogoDefaultIcon"></i>
              <img id="businessLogoPreviewImg" src="" alt="Logo" style="display:none; width:100%; height:100%; object-fit:cover; border-radius:50%;">
            </div>

            <div class="business-logo-note">
              ضع رابط الشعار الآن، ولاحقًا يمكن ربطه برفع مباشر من الجهاز.
            </div>
          </div>

          <div class="form-group">
<div class="form-group">
  <label>رابط الشعار</label>
  <input 
    type="text" 
    id="businessProfileLogoUrl" 
    class="business-profile-input" 
    placeholder="https://example.com/logo.png" 
    oninput="previewBusinessLogoFromInput()"
  >
</div>

<div class="form-group" style="margin-top: 12px;">
  <label>أو ارفع شعار من الجهاز</label>

  <div style="display: flex; gap: 10px; align-items: center;">
    <input 
      type="file" 
      id="businessLogoFileInput" 
      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
      style="display: none;"
      onchange="handleBusinessLogoFileSelected(event)"
    >

    <button 
      type="button" 
      class="business-profile-upload-btn" 
      onclick="document.getElementById('businessLogoFileInput').click()"
    >
      <i class="fas fa-upload"></i>
      اختيار شعار
    </button>

    <span id="businessLogoUploadStatus" style="font-size: 12px; color: var(--gray-500);">
      لم يتم اختيار ملف
    </span>
  </div>

  <div style="font-size: 11px; color: var(--gray-500); margin-top: 8px; line-height: 1.6;">
    الصيغ المدعومة: PNG, JPG, WEBP, SVG — يفضل شعار مربع أو دائري.
  </div>
</div>
        </div>

      </div>

      <div class="business-profile-actions">
        <button class="business-profile-save-btn" onclick="saveBusinessProfile()">
          <i class="fas fa-save"></i>
          حفظ بيانات المطعم
        </button>

        <button class="business-profile-cancel-btn" onclick="closeFullPagePanel()">
        إغلاق
        </button>
        </div>

    </div>
  `;

openFullPagePanel(
  "بيانات المطعم / الفرع",
  "إدارة الاسم، العنوان، الشعار، وبيانات الظهور في واجهة النظام وواجهة الحجز",
  contentHtml
);

// إخفاء زر الإغلاق العلوي لهذه الصفحة فقط
const closeBtn = document.querySelector(".full-page-panel-close");
if (closeBtn) {
  closeBtn.style.display = "none";
}

loadBusinessProfile();
}

async function loadBusinessProfile() {
  const businessId = currentUser?.business_id;

  if (!businessId) {
    showAlert("لم يتم العثور على مطعم المستخدم الحالي");
    return;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      branch_name,
      city,
      address,
      phone,
      email,
      google_maps_url,
      instagram_url,
      website_url,
      logo_url
    `)
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    console.error("❌ خطأ في تحميل بيانات المطعم:", error);
    showAlert("فشل تحميل بيانات المطعم");
    return;
  }

  if (!data) {
    showAlert("لم يتم العثور على بيانات المطعم");
    return;
  }

  document.getElementById("businessProfileName").value = data.name || "";
  document.getElementById("businessProfileBranchName").value = data.branch_name || "";
  document.getElementById("businessProfileCity").value = data.city || "";
  document.getElementById("businessProfileAddress").value = data.address || "";
  document.getElementById("businessProfilePhone").value = data.phone || "";
  document.getElementById("businessProfileEmail").value = data.email || "";
  document.getElementById("businessProfileMapUrl").value = data.google_maps_url || "";
  document.getElementById("businessProfileInstagramUrl").value = data.instagram_url || "";
  document.getElementById("businessProfileWebsiteUrl").value = data.website_url || "";
  document.getElementById("businessProfileLogoUrl").value = data.logo_url || "";

  previewBusinessLogo(data.logo_url);
}

async function saveBusinessProfile() {
  const businessId = currentUser?.business_id;

  if (!businessId) {
    showAlert("لم يتم العثور على مطعم المستخدم الحالي");
    return;
  }

  const name = document.getElementById("businessProfileName").value.trim();
  const branchName = document.getElementById("businessProfileBranchName").value.trim();
  const city = document.getElementById("businessProfileCity").value.trim();
  const address = document.getElementById("businessProfileAddress").value.trim();
  const phone = document.getElementById("businessProfilePhone").value.trim();
  const email = document.getElementById("businessProfileEmail").value.trim();
  const googleMapsUrl = document.getElementById("businessProfileMapUrl").value.trim();
  const instagramUrl = document.getElementById("businessProfileInstagramUrl").value.trim();
  const websiteUrl = document.getElementById("businessProfileWebsiteUrl").value.trim();
  const logoUrl = document.getElementById("businessProfileLogoUrl").value.trim();

  if (!name) {
    showAlert("اسم المطعم مطلوب");
    return;
  }

  const payload = {
    name,
    branch_name: branchName || null,
    city: city || null,
    address: address || null,
    phone: phone || null,
    email: email || null,
    google_maps_url: googleMapsUrl || null,
    instagram_url: instagramUrl || null,
    website_url: websiteUrl || null,
    logo_url: logoUrl || null
  };

  const { data, error } = await supabase
    .from("businesses")
    .update(payload)
    .eq("id", businessId)
    .select(`
      id,
      name,
      branch_name,
      city,
      address,
      phone,
      email,
      google_maps_url,
      instagram_url,
      website_url,
      logo_url
    `)
    .maybeSingle();

  if (error) {
    console.error("❌ خطأ في حفظ بيانات المطعم:", error);
    showAlert("فشل حفظ بيانات المطعم: " + error.message);
    return;
  }

  if (!data) {
    showAlert("لم يتم تحديث أي بيانات");
    return;
  }

 // تحديث اسم المطعم في أعلى الواجهة فورًا
updateTopbarBusinessIdentity(data);

// تحديث خلفية شعار لوحة الطاولات فورًا
if (typeof renderFloorPlan === "function") {
  renderFloorPlan();
}

// إغلاق شاشة بيانات المطعم
closeFullPagePanel();

// إظهار إشعار نجاح بعد الإغلاق
showSuccessNotification("✅ تم حفظ بيانات المطعم بنجاح");
}

function previewBusinessLogoFromInput() {
  const logoUrl = document.getElementById("businessProfileLogoUrl")?.value.trim();
  previewBusinessLogo(logoUrl);
}

function previewBusinessLogo(logoUrl) {
  const img = document.getElementById("businessLogoPreviewImg");
  const icon = document.getElementById("businessLogoDefaultIcon");

  if (!img || !icon) return;

  if (logoUrl) {
    img.src = logoUrl;
    img.style.display = "block";
    icon.style.display = "none";

    img.onerror = function () {
      img.style.display = "none";
      icon.style.display = "block";
    };
  } else {
    img.style.display = "none";
    icon.style.display = "block";
  }
}

function updateTopbarBusinessIdentity(business) {
  window.currentBusinessProfile = business || null;
  const brandText = document.getElementById("brandText");
  const brandIcon = document.querySelector(".brand-icon");

  if (brandText) {
    const name = business?.name || "EASY-Q";
    const branch = business?.branch_name || business?.city || "";

    brandText.innerHTML = branch
      ? `${name} <span style="opacity:.75; font-size:12px;">- ${branch}</span>`
      : name;
  }

if (brandIcon) {
  brandIcon.innerHTML = `<i class="fas fa-utensils"></i>`;
}
}

async function loadTopbarBusinessIdentity() {
  const businessId = currentUser?.business_id;

  if (!businessId) {
    console.warn("⚠️ لا يمكن تحميل هوية المطعم: business_id غير موجود");
    return;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      branch_name,
      city,
      address,
      logo_url
    `)
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    console.error("❌ خطأ في تحميل هوية المطعم:", error);
    return;
  }

  if (!data) {
    console.warn("⚠️ لم يتم العثور على بيانات المطعم");
    return;
  }

  updateTopbarBusinessIdentity(data);
}

// ============================================================
// BUSINESS LOGO UPLOAD
// ============================================================

async function handleBusinessLogoFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  const statusEl = document.getElementById("businessLogoUploadStatus");

  if (!file) {
    if (statusEl) statusEl.innerText = "لم يتم اختيار ملف";
    return;
  }

  const businessId = currentUser?.business_id;

  if (!businessId) {
    showAlert("لم يتم العثور على مطعم المستخدم الحالي");
    event.target.value = "";
    return;
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/svg+xml"
  ];

  if (!allowedTypes.includes(file.type)) {
    showAlert("صيغة الشعار غير مدعومة. استخدم PNG أو JPG أو WEBP أو SVG");
    event.target.value = "";
    return;
  }

  const maxSizeMB = 2;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    showAlert(`حجم الشعار كبير. الحد الأقصى ${maxSizeMB}MB`);
    event.target.value = "";
    return;
  }

  try {
    if (statusEl) statusEl.innerText = "جاري رفع الشعار...";

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${businessId}/logo-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      console.error("❌ خطأ رفع الشعار:", uploadError);
      showAlert("فشل رفع الشعار: " + uploadError.message);
      if (statusEl) statusEl.innerText = "فشل الرفع";
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("business-logos")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      showAlert("تم الرفع لكن لم يتم إنشاء رابط الشعار");
      if (statusEl) statusEl.innerText = "فشل إنشاء الرابط";
      return;
    }

    const logoInput = document.getElementById("businessProfileLogoUrl");
    if (logoInput) {
      logoInput.value = publicUrl;
    }

    previewBusinessLogo(publicUrl);

    if (statusEl) statusEl.innerText = "تم رفع الشعار بنجاح";

    showSuccessNotification("✅ تم رفع الشعار، اضغط حفظ بيانات المطعم لتثبيته");

  } catch (err) {
    console.error("❌ خطأ غير متوقع في رفع الشعار:", err);
    showAlert("حدث خطأ أثناء رفع الشعار: " + err.message);
    if (statusEl) statusEl.innerText = "فشل الرفع";
  }
}