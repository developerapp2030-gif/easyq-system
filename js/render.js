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
    
    // استعادة ذكية لبيانات العميل المفقودة للطاولات المشغولة من الكاش المحلي للمتصفح
    if (status === "occupied") {
      const cachedDataStr = sessionStorage.getItem(`occupied_table_${table.id}`);
      if (cachedDataStr) {
        const cached = JSON.parse(cachedDataStr);
        if (!table.customer_name) table.customer_name = cached.customer_name;
        if (!table.requested_party_size) table.requested_party_size = cached.requested_party_size;
        if (!table.seated_at) table.seated_at = cached.seated_at;
      }
    }

    const isBusy = (status === "reserved" || status === "occupied" || status === "cleaning");
    const infoClass =
  status === "cleaning" && !table.customer_name
    ? "table-info-cleaning"
    : isBusy
      ? "table-info-busy"
      : "table-info-free";
    
const seatsLabel = table.customer_name && table.requested_party_size
  ? `${table.requested_party_size}/${table.capacity}`
  : `${table.capacity}`;

const nameHtml = `
  <span class="table-name">
    <span class="table-title-text">${table.table_name}</span>
    <span class="table-seat-label">
      <i class="fas fa-user-friends"></i> ${seatsLabel}
    </span>
  </span>
`;
    const capacityHtml = `<span class="table-capacity"><i class="fas fa-chair"></i> ${table.capacity}</span>`;
    
    let timerHtml = "";
    if (table.customer_name) {
      if (table.status === "reserved" && table.reserved_at) {
        timerHtml = getRemainingReservationText(table.reserved_at);
      } else if (table.status === "occupied") {
        // حساب وقت جلوس العميل الفعلي على الطاولة المشغولة تصاعدياً
        const seatedTime = table.seated_at || table.reserved_at || table.request_time;
        if (seatedTime) timerHtml = timeSince(seatedTime);
      } else if (table.reserved_at) {
        timerHtml = timeSince(table.reserved_at);
      } else if (table.request_time) {
        timerHtml = timeSince(table.request_time);
      }
    } else if (table.status === "cleaning" && cleaningTimers[table.id]) {
      const remainingMs = cleaningTimers[table.id].expiresAt - Date.now();
      if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      timerHtml = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        timerHtml = `00:00`;
      }
    }
    
card.innerHTML = `
  
  <div class="table-status-bar ${status}"></div>

  <div class="table-info ${infoClass}">
    <div class="table-name-wrap">
      ${nameHtml}
    </div>

    ${table.customer_name ? `<div class="table-customer">${table.customer_name.substring(0, 12)}</div>` : ""}

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
  border-radius: 16px;
  padding: 20px;
  background: #F5F7FF !important;
  background-image: none !important;
  background-size: auto !important;
  background-position: 0 0 !important;
  background-repeat: no-repeat !important;
  overflow: hidden;
  isolation: isolate;
`;
const GRID_W = 104;
const GRID_H = 96;
const GRID_OFFSET_X = 20;
const GRID_OFFSET_Y = 20;

const fullGridCols = Math.floor((container.clientWidth - GRID_OFFSET_X) / GRID_W);
const fullGridRows = Math.floor((container.clientHeight - GRID_OFFSET_Y) / GRID_H);

const fullGridWidth = fullGridCols * GRID_W;
const fullGridHeight = fullGridRows * GRID_H;

const gridLayer = document.createElement('div');
gridLayer.className = 'move-grid-layer';

gridLayer.style.cssText = `
  position: absolute;
  left: ${GRID_OFFSET_X}px;
  top: ${GRID_OFFSET_Y}px;
  width: ${fullGridWidth}px;
  height: ${fullGridHeight}px;
  pointer-events: none;
  z-index: 0;

  background-image:
    linear-gradient(to right, rgba(14, 20, 109, 0.16) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(14, 20, 109, 0.16) 1px, transparent 1px);
  background-size: ${GRID_W}px ${GRID_H}px;
  background-repeat: repeat;
  border-right: 1px solid rgba(14, 20, 109, 0.16);
  border-bottom: 1px solid rgba(14, 20, 109, 0.16);
`;

container.appendChild(gridLayer);
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
    card.style.width = '88px';
    card.style.height = '80px';
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
    const isBusy = (status === "reserved" || status === "occupied" || status === "cleaning");
    
    const nameHtml = `<span class="table-name">${table.table_name}</span>`;
    const capacityHtml = `<span class="table-capacity"><i class="fas fa-chair"></i> ${table.capacity}</span>`;
    
let timerHtml = "";

if (table.customer_name) {
  if (table.status === "reserved" && table.reserved_at) {
    timerHtml = getRemainingReservationText(table.reserved_at);

  } else if (table.status === "occupied") {
    const seatedTime = table.seated_at || table.reserved_at || table.request_time;
    if (seatedTime) timerHtml = timeSince(seatedTime);

  } else if (table.reserved_at) {
    timerHtml = timeSince(table.reserved_at);

  } else if (table.request_time) {
    timerHtml = timeSince(table.request_time);
  }

} else if (table.status === "cleaning" && cleaningTimers[table.id]) {
  const remainingMs = cleaningTimers[table.id].expiresAt - Date.now();

  if (remainingMs > 0) {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
timerHtml = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    timerHtml = `00:00`;
  }
}
    
card.innerHTML = `
  <div class="table-status-bar ${status}"></div>

  <div class="table-info ${
  status === 'cleaning' && !table.customer_name
    ? 'table-info-cleaning'
    : isBusy
      ? 'table-info-busy'
      : 'table-info-free'
}">
    <div class="table-name-wrap">
      ${nameHtml}
    </div>

    ${table.customer_name ? `<div class="table-customer">${table.customer_name.substring(0, 12)}</div>` : ""}

    ${table.customer_name ? `<div class="table-divider"></div>` : ""}

    ${timerHtml ? `<div class="table-timer"><i class="far fa-clock"></i> ${timerHtml}</div>` : ""}
  </div>
`;
    container.appendChild(card);
  });
  
  container.onclick = async (e) => {
  if (selectedTableForMove && e.target === container) {
    const rect = container.getBoundingClientRect();

    /* مقاسات الشبكة والطاولة */
    const GRID_W = 104;
    const GRID_H = 96;
    const TABLE_W = 88;
    const TABLE_H = 80;
    const GRID_OFFSET_X = 20;
    const GRID_OFFSET_Y = 20;

    /* مكان الضغط داخل مساحة الطاولات */
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    /* حدود منطقة الشبكة الكاملة فقط */
    const gridStartX = GRID_OFFSET_X;
    const gridStartY = GRID_OFFSET_Y;
    const gridEndX = GRID_OFFSET_X + fullGridWidth;
    const gridEndY = GRID_OFFSET_Y + fullGridHeight;

    /* منع النقل خارج الشبكة الكاملة */
    if (
      clickX < gridStartX ||
      clickY < gridStartY ||
      clickX >= gridEndX ||
      clickY >= gridEndY
    ) {
      showAlert('اختر مربعًا داخل الشبكة');
      return;
    }

    /* تحديد المربع الذي تم الضغط داخله */
    const col = Math.floor((clickX - GRID_OFFSET_X) / GRID_W);
    const row = Math.floor((clickY - GRID_OFFSET_Y) / GRID_H);

    const cellX = GRID_OFFSET_X + col * GRID_W;
    const cellY = GRID_OFFSET_Y + row * GRID_H;

    /* وضع الطاولة في وسط مربع الشبكة */
    const finalX = cellX + (GRID_W - TABLE_W) / 2;
    const finalY = cellY + (GRID_H - TABLE_H) / 2;

    pendingPositionUpdates[selectedTableForMove.id] = {
      pos_x: finalX,
      pos_y: finalY,
      floor_number: currentFloor
    };

    selectedTableForMove.pos_x = finalX;
    selectedTableForMove.pos_y = finalY;
      
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
              ${w.booking_code ? `<span class="detail-item" style="color: #06372E; cursor: pointer;" onclick="showQRModal('${w.booking_code}', '${(w.customer_name || "ضيف").replace(/'/g, "\\'")}', '${w.queue_position || "?"}', '${w.status}')"><i class="fas fa-qrcode"></i> ${w.booking_code}</span>` : ''}        <span class="detail-item"><i class="fas fa-hourglass-half"></i> ${timeSince(w.local_time || w.created_at || w.request_time)}</span>
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

  if (settings.expired_panel_enabled === false) {
    container.innerHTML = "";
    return;
  }

  const businessId = currentUser?.business_id;

  if (!businessId) {
    console.warn("⚠️ لا يوجد business_id للمستخدم الحالي - تم إفراغ قائمة المنتهية");
    container.innerHTML = "";
    return;
  }

  const limit = settings.expired_list_limit || 5;

  const { data: expiredDataWithPhone, error } = await supabase
    .from("table_requests")
    .select(`
      id,
      business_id,
      customer_id,
      booking_code,
      requested_party_size,
      request_source,
      created_at,
      expired_at,
      zone_name,
      status,
      customer_name_snapshot,
      customer_phone_snapshot,
      customers (
        name,
        phone
      )
    `)
    .eq("business_id", businessId)
    .not("expired_at", "is", null)
    .lt("expired_at", new Date().toISOString())
    .order("expired_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching expired requests:", error);
    container.innerHTML = "";
    return;
  }

  const safeExpiredData = (expiredDataWithPhone || []).filter(e => e.business_id === businessId);

  console.log("📊 عدد الطلبات المنتهية:", safeExpiredData.length);

  let html = "";

  safeExpiredData.forEach(e => {
    let customerName =
      e.customer_name_snapshot ||
      e.customers?.name ||
      "ضيف";

    let customerPhone =
      e.customer_phone_snapshot ||
      e.customers?.phone ||
      "";

    let phoneLast5 = "";
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
    } else if (e.request_source === "web_booking") {
      sourceLabel = currentLang === 'ar' ? 'أونلاين' : 'Online';
      sourceIcon = "fa-globe";
      iconClass = "fas";
    } else if (e.request_source === "qr_code") {
      sourceLabel = currentLang === 'ar' ? 'QR Code' : 'QR Code';
      sourceIcon = "fa-qrcode";
      iconClass = "fas";
    } else {
      sourceLabel = currentLang === 'ar' ? 'واتس' : 'WSP';
      sourceIcon = "fa-whatsapp";
      iconClass = "fab";
    }

    let zoneDisplayText = currentLang === 'ar' ? "بدون تفضيل" : "No Preference";

    if (e.zone_name && e.zone_name !== "") {
      const zoneMap = currentLang === 'ar'
        ? {
            "Indoor": "داخلي",
            "VIP": "VIP",
            "Smoking": "مدخنين",
            "Family": "عائلي",
            "Outdoor": "خارجي"
          }
        : {
            "Indoor": "Indoor",
            "VIP": "VIP",
            "Smoking": "Smoking",
            "Family": "Family",
            "Outdoor": "Outdoor"
          };

      zoneDisplayText = zoneMap[e.zone_name] || e.zone_name;
    }

    html += `
      <div class="expired-card" style="display: flex; flex-direction: column; gap: 10px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
            ${(customerName || "ضيف").substring(0, 18)}${customerPhone ? ` - ${customerPhone}` : ""}
          </span>

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

${e.booking_code ? `
  <span style="display: inline-flex; align-items: center; gap: 4px; color: #06372E; font-weight: 600;">
    <i class="fas fa-qrcode"></i> ${e.booking_code}
  </span>
` : ""}

<span style="display: inline-flex; align-items: center; gap: 4px;">
  <i class="fas fa-hourglass-end"></i> ${timeSince(e.expired_at || e.created_at)}
</span>
        </div>

        <div style="display: flex; justify-content: center; margin-top: 5px;">
          <button onclick="restoreExpiredBooking('${e.id}')" style="padding: 8px 25px; border-radius: 20px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; background: rgba(16,185,129,0.15); color: var(--success); display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fas fa-undo-alt"></i> ${currentLang === 'ar' ? 'استرجاع الحجز' : 'Restore Booking'}
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  console.log("✅ تم تحديث الواجهة بعدد", safeExpiredData.length, "بطاقات");
}