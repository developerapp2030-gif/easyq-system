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

function isValidSaudiMobile(phone) {
  return /^05\d{8}$/.test(phone);
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
      
      const tableId = card.getAttribute('data-id');
      const table = floorData.find(t => t.id == tableId);
      
      if (table && (table.status === 'occupied' || table.status === 'reserved' || table.status === 'cleaning')) {
        let newTime = "";
        
        if (table.status === "reserved" && table.reserved_at) {
          newTime = getRemainingReservationText(table.reserved_at);
        } else if (table.reserved_at) {
          newTime = timeSince(table.reserved_at);
        } else if (table.request_time) {
          newTime = timeSince(table.request_time);
        } else if (table.status === "cleaning" && cleaningTimers[table.id]) {
          const remaining = Math.ceil((cleaningTimers[table.id] - Date.now()) / 60000);
          if (remaining > 0) newTime = `${remaining} دقيقة`;
        }
        
        if (newTime) {
          timerEl.innerHTML = `<i class="far fa-clock"></i> ${newTime}`;
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
        timeSpan.innerHTML = `<i class="fas fa-hourglass-half"></i> ${newTime}`;
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
