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
    const { error } = await supabase
      .from('dining_tables')
      .update({
        pos_x: validateTablePosition(position.pos_x, position.pos_y, tableId, 160).x,
        pos_y: validateTablePosition(position.pos_x, position.pos_y, tableId, 160).y
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
  localStorage.removeItem('easyq_user');
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'flex';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

// ============================================================
// جعل الدوال عامة وإعادة ربط الأحداث
// ============================================================

// 1. جعل الدوال عالمية
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

// 2. إعادة ربط الأحداث بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    const sidebarBtn = document.getElementById('sidebarToggle');
    if (sidebarBtn) {
        // إزالة أي أحداث قديمة
        sidebarBtn.removeEventListener('click', toggleSidebar);
        // إضافة الحدث الجديد
        sidebarBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
        console.log("✅ Sidebar button connected!");
    }
});