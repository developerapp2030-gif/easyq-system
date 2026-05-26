// ============================================================
// RENDER STATUS SUMMARY
// ============================================================

function renderStatusSummary() {
  const data = floorData.filter(table => 
    globalActiveFloors.includes(String(table.floor_number)) && 
    globalActiveZones.includes(table.zone_name)
  );
  const counts = { available: 0, reserved: 0, occupied: 0, cleaning: 0, disabled: 0, pending: 0 };
  data.forEach(i => {
    const s = i.status || "available";
    if (counts[s] !== undefined) counts[s]++;
  });
  
  const container = document.getElementById("statusSummary");
  if (!container) return;
  container.innerHTML = "";
  
  const items = [
    { key: "available", color: "#10b981" },
    { key: "reserved", color: "#f59e0b" },
    { key: "occupied", color: "#8B0000" },
    { key: "cleaning", color: "#3b82f6" },
    { key: "disabled", color: "#9ca3af" },
    { key: "pending", color: "#8b5cf6" }
  ];
  
  items.forEach(item => {
    const count = counts[item.key] || 0;
    const statDiv = document.createElement("div");
    statDiv.className = "stat-item";
    statDiv.innerHTML = `
      <span class="stat-dot" style="background: ${item.color};"></span>
      <span>${count}</span>
    `;
    container.appendChild(statDiv);
  });
}

// ============================================================
// RENDER FLOOR PLAN
// ============================================================

async function renderFloorPlan() {
  const container = document.getElementById("floorCanvas");
  if (!container) return;
  
  if (moveModeActive) {
    renderMoveModeTables();
    return;
  }
  
  container.innerHTML = "";
  container.style.cssText = `
    display: block;
    position: relative;
    min-height: 80vh;
    background-color: var(--gray-50);
    border-radius: 16px;
    padding: 20px;
  `;
  
  const tables = filteredFloorData();
  
  tables.forEach(table => {
    const card = document.createElement("div");
    card.className = "table-card";
    card.setAttribute('data-id', table.id);
    card.setAttribute('data-table-id', table.id);
    
    const left = table.pos_x || 50;
    const top = table.pos_y || 50;
    
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    
    const activeParty = getActivePartySize();
    if (activeParty && !editModeActive) {
      if (isSuitableTable(table)) card.classList.add("match");
      else card.classList.add("dim");
    }
    
    if (!editModeActive) {
      card.onclick = () => {
        if (tableDeleteMode) {
          deleteTable(table.id, table.table_name);
        } else if (tableEditMode) {
          editTable(table);
        } else if (selectedRequestId) {
          assignSelectedToTable(table);
        } else {
          openStatusModal(table);
        }
      };
    }
    
    const status = table.status || "available";
    const isBusy = (status === "reserved" || status === "occupied" || status === "cleaning");
    
    const nameHtml = `<span class="table-name">${table.table_name}</span>`;
    const capacityHtml = `<span class="table-capacity"><i class="fas fa-chair"></i> ${table.capacity}</span>`;
    
    let timerHtml = "";
    if (table.customer_name) {
      if (table.status === "reserved" && table.reserved_at)
        timerHtml = getRemainingReservationText(table.reserved_at);
      else if (table.reserved_at)
        timerHtml = timeSince(table.reserved_at);
      else if (table.request_time)
        timerHtml = timeSince(table.request_time);
    } else if (table.status === "cleaning" && cleaningTimers[table.id]) {
      const remaining = Math.ceil((cleaningTimers[table.id] - Date.now()) / 60000);
      if (remaining > 0) timerHtml = `${remaining} دقيقة`;
    }
    
    card.innerHTML = `
      <div class="table-status-bar ${status}">
        ${isBusy ? nameHtml + capacityHtml : ''}
      </div>
      <div class="table-info">
        ${!isBusy ? nameHtml + capacityHtml : ''}
        ${table.customer_name ? `<div class="table-customer"><i class="fas fa-user"></i> ${table.customer_name.substring(0, 10)}${table.customer_name.length > 10 ? '..' : ""}${table.requested_party_size ? ` • ${table.requested_party_size}` : ""}</div>` : ""}
        ${table.customer_name ? `<div class="table-divider"></div>` : ""}
        ${timerHtml ? `<div class="table-timer"><i class="far fa-clock"></i> ${timerHtml}</div>` : ""}
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================
// RENDER MOVE MODE TABLES
// ============================================================

function renderMoveModeTables() {
  const container = document.getElementById("floorCanvas");
  if (!container) return;
  
  container.innerHTML = "";
  container.style.cssText = `
    display: block;
    position: relative;
    min-height: 80vh;
    background-color: var(--gray-50);
    border-radius: 16px;
    padding: 20px;
  `;
  
  const tables = filteredFloorData();
  
  tables.forEach(table => {
    const isSelected = selectedTableForMove && selectedTableForMove.id === table.id;
    const card = document.createElement('div');
    card.className = `table-card${isSelected ? ' table-selected-for-move' : ''}`;
    card.setAttribute('data-id', table.id);
    
    const pendingPos = pendingPositionUpdates[table.id];
    const left = pendingPos ? pendingPos.pos_x : (table.pos_x || 50);
    const top = pendingPos ? pendingPos.pos_y : (table.pos_y || 50);
    
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.width = '120px';
    card.style.height = '100px';
    card.style.transition = 'all 0.2s ease';
    
    if (isSelected) {
      card.style.border = '3px solid #2196F3';
      card.style.boxShadow = '0 0 15px rgba(33,150,243,0.5)';
      card.style.zIndex = '1001';
    }
    
    const canMove = (table.status !== 'reserved' && table.status !== 'occupied' && table.status !== 'cleaning');
    
    card.onclick = (e) => {
      e.stopPropagation();
      if (!canMove) {
        showAlert('لا يمكن نقل هذه الطاولة');
        return;
      }
      if (selectedTableForMove && selectedTableForMove.id === table.id) {
        selectedTableForMove = null;
        renderMoveModeTables();
      } else if (selectedTableForMove) {
        showAlert('المكان مشغول بطاولة أخرى');
      } else {
        selectedTableForMove = table;
        renderMoveModeTables();
      }
    };
    
    const status = table.status || "available";
    const isBusy = (status === "reserved" || status === "occupied");
    
    const nameHtml = `<span class="table-name">${table.table_name}</span>`;
    const capacityHtml = `<span class="table-capacity"><i class="fas fa-chair"></i> ${table.capacity}</span>`;
    
    let timerHtml = "";
    if (table.customer_name) {
      if (table.status === "reserved" && table.reserved_at)
        timerHtml = getRemainingReservationText(table.reserved_at);
      else if (table.reserved_at)
        timerHtml = timeSince(table.reserved_at);
      else if (table.request_time)
        timerHtml = timeSince(table.request_time);
    }
    
    card.innerHTML = `
      <div class="table-status-bar ${status}">
        ${isBusy ? nameHtml + capacityHtml : ''}
      </div>
      <div class="table-info">
        ${!isBusy ? nameHtml + capacityHtml : ''}
        ${table.customer_name ? `<div class="table-customer"><i class="fas fa-user"></i> ${table.customer_name}${table.requested_party_size ? ` • ${table.requested_party_size}` : ""}</div>` : ""}
        ${table.customer_name ? `<div class="table-divider"></div>` : ""}
        ${timerHtml ? `<div class="table-timer"><i class="far fa-clock"></i> ${timerHtml}</div>` : ""}
        ${isSelected ? '<i class="fas fa-mouse-pointer" style="margin-top:4px; color:#2196F3; font-size:10px;"></i>' : ''}
      </div>
    `;
    container.appendChild(card);
  });
  
  container.onclick = async (e) => {
    if (selectedTableForMove && e.target === container) {
      const rect = container.getBoundingClientRect();
      const newX = e.clientX - rect.left - 60;
      const newY = e.clientY - rect.top - 50;
      
      pendingPositionUpdates[selectedTableForMove.id] = {
        pos_x: Math.max(10, newX),
        pos_y: Math.max(10, newY),
        floor_number: currentFloor
      };
      
      selectedTableForMove.pos_x = Math.max(10, newX);
      selectedTableForMove.pos_y = Math.max(10, newY);
      
      selectedTableForMove = null;
      renderMoveModeTables();
      
      showSuccessNotification('📍 تم تحريك الطاولة، اضغط حفظ للمواقع');
    }
  };
}

// ============================================================
// RENDER WAITING LIST
// ============================================================

function renderWaitingList() {
  const waitingCount = waitingData.filter(w => w.status === "waiting" || w.status === "offered").length;
  const waitingCountElement = document.getElementById('waitingCount');
  if (waitingCountElement) waitingCountElement.innerText = waitingCount;
  const container = document.getElementById("waitingList");
  if (!container) return;
  container.innerHTML = "";
  
  waitingData.forEach(w => {
    if (w.status !== "waiting" && w.status !== "offered") return;
    
    let isZoneCompatible = false;
    if (currentZone === "all") {
      isZoneCompatible = true;
    } else {
      if (!w.zone_name || w.zone_name === "") {
        isZoneCompatible = true;
      } else {
        isZoneCompatible = (w.zone_name === currentZone);
      }
    }
    
    let ready = false;
    if (hasMatchingAvailableTable(w)) {
      const suitableCustomers = waitingData.filter(c =>
        (c.status === "waiting" || c.status === "offered") &&
        hasMatchingAvailableTable(c)
      );
      suitableCustomers.sort((a, b) => (a.queue_position || 999) - (b.queue_position || 999));
      if (suitableCustomers.length > 0 && suitableCustomers[0].request_id === w.request_id) {
        ready = true;
      }
    }
    
    const card = document.createElement("div");
    card.className = "waiting-card" + (!isZoneCompatible ? ' zone-mismatch' : '');
    card.setAttribute('data-request-id', w.request_id);
    if (ready) card.classList.add("ready");
    card.draggable = !editModeActive;
    if (selectedRequestId === w.request_id) card.classList.add("active");
    if (selectedRequestId === w.request_id) card.classList.add("selected");
    
    card.ondblclick = () => openEditRequestModal(w.request_id);
    card.onclick = () => selectWaiting(w.request_id, w.requested_party_size);
    card.ondragstart = () => {
      if (editModeActive) return false;
      draggedRequestId = w.request_id;
      draggedPartySize = w.requested_party_size;
      selectedRequestId = w.request_id;
      selectedPartySize = w.requested_party_size;
      card.classList.add("dragging");
      renderFloorPlan();
      renderWaitingList();
    };
    card.ondragend = () => {
      card.classList.remove("dragging");
      draggedRequestId = null;
      draggedPartySize = null;
      renderFloorPlan();
      renderWaitingList();
    };
    
    let phoneDisplay = "";
    if (w.phone) {
      let phoneStr = w.phone.toString();
      phoneDisplay = phoneStr.length >= 8 ? phoneStr.slice(-8) : phoneStr;
    }
    
let zoneDisplayText = currentLang === 'ar' ? "بدون تفضيل" : "No Preference";
if (w.zone_name && w.zone_name !== "") {
    const zoneMap = currentLang === 'ar' ? {
        "Indoor": "داخلي",
        "VIP": "VIP",
        "Smoking": "مدخنين",
        "Family": "عائلي",
        "Outdoor": "خارجي"
    } : {
        "Indoor": "Indoor",
        "VIP": "VIP",
        "Smoking": "Smoking",
        "Family": "Family",
        "Outdoor": "Outdoor"
    };
    zoneDisplayText = zoneMap[w.zone_name] || w.zone_name;
}
    
    const queueNum = w.queue_position || "?";
    
    let sourceLabel = "";
    let sourceIcon = "";
    let iconClass = "";
    if (w.request_source === "walk_in") {
      sourceLabel = currentLang === 'ar' ? 'محلي' : 'Local';
      sourceIcon = "fa-user-plus";
      iconClass = "fas";
    } else if (w.request_source === "restored") {
      sourceLabel = currentLang === 'ar' ? 'مسترجع' : 'Restored';
      sourceIcon = "fa-undo-alt";
      iconClass = "fas";
} else if (w.request_source === "web_booking") {
  sourceLabel = currentLang === 'ar' ? 'أونلاين' : 'Online';
  sourceIcon = "fa-globe";
  iconClass = "fas";
    } else if (w.request_source === "qr_code") {
      sourceLabel = currentLang === 'ar' ? 'QR Code' : 'QR Code';
      sourceIcon = "fa-qrcode";
      iconClass = "fas";
    } else {
      sourceLabel = currentLang === 'ar' ? 'واتس' : 'WSP';
      sourceIcon = "fa-whatsapp";
      iconClass = "fab";
    }
    
    card.innerHTML = `
      <div class="waiting-row-top">
        <div class="waiting-left-group">
          <span class="source-badge"><i class="${iconClass} ${sourceIcon}"></i> ${sourceLabel}</span>
          <span class="customer-name-part">${(w.customer_name || "ضيف").substring(0, 18)}${phoneDisplay ? ` - ${phoneDisplay}` : ""}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="queue-number-badge">${queueNum}</span>
        </div>
      </div>
      <hr class="waiting-divider">
      <div class="waiting-row-bottom">
        <span class="detail-item"><i class="fas fa-map-marker-alt"></i> ${zoneDisplayText}</span>
        <span class="detail-item"><i class="fas fa-user-friends"></i> ${w.requested_party_size || 0}</span>
        ${w.booking_code ? `<span class="detail-item" style="color: #06372E;"><i class="fas fa-key"></i> ${w.booking_code}</span>` : ''}
        <span class="detail-item"><i class="fas fa-hourglass-half"></i> ${timeSince(w.local_time || w.created_at || w.request_time)}</span>
      </div>
    `;
    
    if ((w.queue_position == 1 || w.queue_position == 2) && w.phone) {
      const alreadyNotified = sessionStorage.getItem(`notified_soon_${w.request_id}`);
      if (!alreadyNotified) {
        sendWhatsAppMessage(w.phone,
          `🔔 مرحباً *${w.customer_name || 'ضيفنا'}*، دورك على وشك الوصول!\nأنت حالياً رقم *${w.queue_position}* في قائمة الانتظار.\nنرجو الاستعداد للحضور. 🙏`
        );
        sessionStorage.setItem(`notified_soon_${w.request_id}`, 'true');
      }
    }
    container.appendChild(card);
  });
}

// ============================================================
// RENDER EXPIRED LIST
// ============================================================

async function renderExpiredList() {
  console.log("🔄 جاري تحديث قائمة المنتهية...");
  const container = document.getElementById("expiredList");
  if (!container) return;
  
  if (settings.expired_panel_enabled === false) return;
  const limit = settings.expired_list_limit || 5;
  
  const { data: expiredDataWithPhone, error } = await supabase
    .from("table_requests")
    .select(`
      id,
      requested_party_size,
      request_source,
      created_at,
      expired_at,
      zone_name,
      status,
      customers (name, phone)
    `)
    .not("expired_at", "is", null)
    .lt("expired_at", new Date().toISOString())
    .order("expired_at", { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error("Error fetching expired requests:", error);
    return;
  }
  
  console.log("📊 عدد الطلبات المنتهية:", expiredDataWithPhone.length);
  
  let html = "";
  
  expiredDataWithPhone.forEach(e => {
    let phoneLast5 = "";
    let customerName = "";
    let customerPhone = "";
    
    if (e.customers) {
      customerName = e.customers.name || "ضيف";
      customerPhone = e.customers.phone;
    }
    
    if (customerPhone && customerPhone !== null && customerPhone !== "") {
      let phoneStr = String(customerPhone);
      phoneLast5 = phoneStr.length >= 5 ? phoneStr.slice(-5) : phoneStr;
    }
    
    let sourceLabel = "";
    let sourceIcon = "";
    let iconClass = "";
    
if (e.request_source === "walk_in") {
    sourceLabel = currentLang === 'ar' ? 'محلي' : 'Local';
    sourceIcon = "fa-user-plus";
    iconClass = "fas";
} else if (e.request_source === "restored") {
    sourceLabel = currentLang === 'ar' ? 'مسترجع' : 'Restored';
    sourceIcon = "fa-undo-alt";
    iconClass = "fas";
} else {
    sourceLabel = currentLang === 'ar' ? 'واتس' : 'WSP';
    sourceIcon = "fa-whatsapp";
    iconClass = "fab";
}
    
let zoneDisplayText = currentLang === 'ar' ? "بدون تفضيل" : "No Preference";
if (e.zone_name && e.zone_name !== "") {
    const zoneMap = currentLang === 'ar' ? {
        "Indoor": "داخلي",
        "VIP": "VIP",
        "Smoking": "مدخنين",
        "Family": "عائلي",
        "Outdoor": "خارجي"
    } : {
        "Indoor": "Indoor",
        "VIP": "VIP",
        "Smoking": "Smoking",
        "Family": "Family",
        "Outdoor": "Outdoor"
    };
    zoneDisplayText = zoneMap[e.zone_name] || e.zone_name;
}
    
    let customerDisplay = customerName || "ضيف";
    if (phoneLast5) {
      customerDisplay = customerDisplay + " - " + phoneLast5;
    }
    
    html += `
      <div class="expired-card" style="display: flex; flex-direction: column; gap: 10px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${(customerName || "ضيف").substring(0, 18)}${customerPhone ? ` - ${customerPhone}` : ""}</span>
          <span style="background: var(--gray-300); color: var(--gray-700); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
            <i class="${iconClass} ${sourceIcon}"></i> ${sourceLabel}
          </span>
        </div>
        <hr style="border: none; border-top: 1px solid var(--gray-300); margin: 0;">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--gray-600);">
<span style="display: inline-flex; align-items: center; gap: 4px;">
    <i class="fas fa-user-friends"></i> ${e.requested_party_size || 0}
</span>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <i class="fas fa-map-marker-alt"></i> ${zoneDisplayText}
          </span>
<span style="display: inline-flex; align-items: center; gap: 4px;">
    <i class="fas fa-hourglass-end"></i> ${timeSince(e.expired_at || e.created_at)}
</span>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 5px;">
          <button onclick="restoreExpiredBooking('${e.id}')" style="flex: 1; padding: 8px; border-radius: 20px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; background: rgba(16,185,129,0.15); color: var(--success); display: flex; align-items: center; justify-content: center; gap: 6px;">
    <i class="fas fa-undo-alt"></i> ${currentLang === 'ar' ? 'استرجاع' : 'Restore'}
</button>
<button onclick="closeExpiredRequest('${e.id}')" style="flex: 1; padding: 8px; border-radius: 20px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; background: rgba(239,68,68,0.15); color: var(--danger); display: flex; align-items: center; justify-content: center; gap: 6px;">
    <i class="fas fa-trash"></i> ${currentLang === 'ar' ? 'حذف' : 'Delete'}
</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  console.log("✅ تم تحديث الواجهة بعدد", expiredDataWithPhone.length, "بطاقات");
}