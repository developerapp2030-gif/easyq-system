// ============================================================
// TABLE STATUS CHANGE
// ============================================================

async function changeTableStatus(tableId, newStatus) {
  const table = floorData.find(t => t.id == tableId);
  if (!table) {
    console.error(`طاولة غير موجودة: ${tableId}`);
    return false;
  }
  
  console.log(`📝 تغيير حالة الطاولة ${table.table_name} من ${table.status} إلى ${newStatus}`);
  
  if (cleaningTimers[tableId]) {
    clearTimeout(cleaningTimers[tableId]);
    delete cleaningTimers[tableId];
  }
  if (reservationTimers[tableId]) {
    clearTimeout(reservationTimers[tableId]);
    delete reservationTimers[tableId];
  }
  if (table.status === "occupied" && newStatus !== "occupied") {
    stopTableTimer(tableId, table.table_name);
  }
  if (newStatus === "occupied") {
    startTableTimer(tableId, table.table_name);
  }
  
  // 🔥 استخدام RPC آمن بدلاً من الوصول المباشر إلى table_assignments
  if (newStatus === "available") {
    // استدعاء دالة RPC لتنظيف التعيينات بدلاً من الحذف المباشر
    const { error: cleanError } = await supabase.rpc('clean_table_assignments', {
      p_table_id: tableId
    });
    if (cleanError) console.error("Error cleaning assignments:", cleanError);
    stopTableTimer(tableId, table.table_name);
  }
  
  const { error } = await supabase
    .from('dining_tables')
    .update({ status: newStatus })
    .eq('id', tableId);
  
  if (error) {
    console.error(error);
    showAlert(`فشل تغيير حالة الطاولة: ${error.message}`);
    return false;
  }
  
  table.status = newStatus;
  
  if (newStatus === 'cleaning') {
    const holdMinutes = Number(settings.cleaning_hold_minutes || 10);
    cleaningTimers[tableId] = setTimeout(async () => {
      console.log(`⏰ انتهى وقت التنظيف للطاولة ${table.table_name}`);
      await changeTableStatus(tableId, 'available');
      showPersistentAlert(`🧹 انتهى وقت التنظيف للطاولة ${table.table_name}`);
    }, holdMinutes * 60 * 1000);
  }
  
  if (newStatus === 'reserved') {
    const holdMinutes = Number(settings.reservation_hold_minutes || 10);
    reservationTimers[tableId] = setTimeout(async () => {
      console.log(`⏰ انتهى وقت الحجز للطاولة ${table.table_name}`);
      await changeTableStatus(tableId, 'available');
      showPersistentAlert(`⏰ انتهى وقت الحجز للطاولة ${table.table_name}`, '#F59E0B');
    }, holdMinutes * 60 * 1000);
  }
  
  await loadFloorPlan();
  renderFloorPlan();
  renderStatusSummary();
  
  return true;
}

// ============================================================
// ASSIGN REQUEST TO TABLE
// ============================================================

async function assignRequestToTable(reqId, partySize, row) {
  if (!reqId) return;
  if (row.status !== "available") {
    await showAlert("هذه الطاولة غير متاحة");
    return;
  }
  if (Number(row.capacity) < Number(partySize)) {
    await showAlert(`سعة الطاولة ${row.capacity} أشخاص فقط`);
    return;
  }
  try {
    // 🔥 استدعاء الدالة الآمنة فقط - RPC ستقوم بكل شيء
    const { data: result, error: assignErr } = await supabase.rpc('assign_table_to_request', {
      p_table_id: row.id,
      p_request_id: reqId,
      p_business_id: currentUser?.business_id
    });
    
    if (assignErr) throw assignErr;
    if (!result.success) throw new Error(result.message);
    
    console.log("Assignment successful:", result);
    
    const holdMinutes = Number(settings.reservation_hold_minutes || 10);
    const requestData = waitingData.find(w => w.request_id === reqId);
    
    if (requestData && requestData.phone) {
      sendWhatsAppMessage(requestData.phone, 
        `🍽️ أهلاً *${requestData.customer_name || 'ضيفنا'}*، طاولتك بانتظارك الآن!\nلطفاً التوجه خلال *${holdMinutes} دقائق* قبل إلغاء الحجز.`
      );
    }
    
    clearSelection();
    await loadAll();
  } catch (err) {
    console.error("Assignment error:", err);
    alert("فشل التعيين: " + err.message);
  }
}

// ============================================================
// ASSIGN NEXT CUSTOMER
// ============================================================

async function assignNextCustomer() {
  const waitingList = filteredWaitingData();
  
  let targetRequest = null;
  
  if (settings.ready_mode === "queue_priority") {
    targetRequest = waitingList.find(w => hasMatchingAvailableTable(w));
  } else {
    targetRequest = waitingList[0];
  }
  
  if (!targetRequest) {
    alert("لا يوجد عميل جاهز للتعيين");
    return;
  }
  
  const { data: tables } = await supabase.from("dashboard_tables_full").select("*");
  
  let availableTables = tables.filter(t => 
    t.status === "available" && 
    t.floor_number === currentFloor && 
    Number(t.capacity) >= Number(targetRequest.requested_party_size)
  );
  
  let bestTable = null;
  
  if (targetRequest.zone_name && targetRequest.zone_name !== "") {
    let zoneTables = availableTables.filter(t => t.zone_name === targetRequest.zone_name);
    if (zoneTables.length > 0) {
      zoneTables.sort((a, b) => a.capacity - b.capacity);
      bestTable = zoneTables[0];
    }
  }
  
  if (!bestTable && availableTables.length > 0) {
    availableTables.sort((a, b) => a.capacity - b.capacity);
    bestTable = availableTables[0];
  }
  
  if (!bestTable) {
    alert("لا توجد طاولة مناسبة");
    return;
  }
  
  await assignRequestToTable(targetRequest.request_id, targetRequest.requested_party_size, bestTable);
}

// ============================================================
// RESERVATION TIMER CHECK
// ============================================================

async function checkReservationTimers() {
  const holdMinutes = Number(settings.reservation_hold_minutes || 10);
  const { data: assignments, error } = await supabase.rpc('get_offered_assignments');
  if (error) return;
  
  const now = Date.now();
  let expired = [];
  for (const a of assignments || []) {
    if (!a.reserved_at) continue;
    
    const { data: table } = await supabase
      .from("dining_tables")
      .select("status")
      .eq("id", a.table_id)
      .single();
    
    if (table && table.status === "occupied") {
      console.log("⏸️ طاولة مشغولة، لن يتم نقل العميل");
      continue;
    }
    
    const reservedTime = new Date(a.reserved_at).getTime();
    const minutesPassed = (now - reservedTime) / 60000;
    if (minutesPassed >= holdMinutes) expired.push(a);
  }
  
  for (const a of expired) {
    await supabase.from("dining_tables").update({ status: "available" }).eq("id", a.table_id);
    await supabase.from("table_requests").update({ status: "cancelled", expired_at: new Date().toISOString() }).eq("id", a.request_id);
    await supabase.rpc('clean_table_assignments', { p_table_id: a.table_id });
    
    const { data: reqData } = await supabase
      .from("table_requests")
      .select("customers(name, phone)")
      .eq("id", a.request_id)
      .single();
    
    if (reqData?.customers?.phone) {
      sendWhatsAppMessage(reqData.customers.phone, 
        `⏳ للأسف *${reqData.customers.name || 'ضيفنا'}*، لم يتم حضورك في الوقت المحدد\nتم تحويل الدور للعميل التالي.\nنأمل خدمتك قريباً 🌟\nيمكنك معاودة الحجز من جديد`
      );
    }
  }
  if (expired.length > 0) await loadAll();
}

// ============================================================
// RESTORE EXPIRED BOOKING
// ============================================================

async function restoreExpiredBooking(reqId) {
  const { error } = await supabase
    .from("table_requests")
    .update({ 
      status: "waiting", 
      request_source: "restored", 
      created_at: new Date().toISOString(), 
      expired_at: null 
    })
    .eq("id", reqId);
  if (error) {
    console.log(error);
    alert("Restore failed");
    return;
  }
  await loadAll();
}

// ============================================================
// CLOSE EXPIRED REQUEST
// ============================================================

async function closeExpiredRequest(reqId) {
  console.log("=== بدء حذف الطلب ===");
  console.log("المعرف المستلم:", reqId);
  
  if (!reqId) {
    alert("لا يوجد معرف للطلب");
    return;
  }
  
  try {
    const { error } = await supabase
      .from("table_requests")
      .delete()
      .eq("id", reqId);
    
    if (error) {
      console.log("❌ خطأ في الحذف:", error);
      alert("فشل حذف الطلب: " + error.message);
      return;
    }
    
    console.log("✅ تم حذف الطلب نهائياً من قاعدة البيانات");
    
    await renderExpiredList();
    await loadWaitingList();
    
    console.log("✅ تم تحديث الواجهة بنجاح");
  } catch (err) {
    console.log("❌ خطأ غير متوقع:", err);
    alert("حدث خطأ غير متوقع");
  }
}

// ============================================================
// WALK-IN CUSTOMER
// ============================================================

async function saveWalkIn() {
  let name = document.getElementById("walkInName").value.trim();
  if (name.length > 20) {
    name = name.substring(0, 20);
    alert("الاسم مقيد بـ 20 حرف كحد أقصى");
  }
  const party = parseInt(document.getElementById("walkInParty").value);
  let phoneDigits = document.getElementById("walkInPhone").value.trim();
  const preferredZone = document.getElementById("walkInZone").value;
  const customerName = name || "Guest";
  
  if (!party || party < 1) {
    alert("أدخل عدد أشخاص صحيح");
    return;
  }
  
  let fullPhone = "";
  if (phoneDigits && phoneDigits.length === 8) {
    fullPhone = "05" + phoneDigits;
  } else if (phoneDigits && phoneDigits.length > 0 && phoneDigits.length !== 8) {
    alert("رقم الجوال 8 أرقام بعد 05");
    return;
  }
  
  if (fullPhone && !isValidSaudiMobile(fullPhone)) {
    alert("رقم الجوال غير صحيح");
    return;
  }
  
  let customerId = null;
  
  // البحث عن عميل موجود بنفس رقم الهاتف
  if (fullPhone) {
    const { data: existingCustomer, error: existingError } = await supabase
      .from("customers")
      .select("id, name")
      .eq("phone", fullPhone)
      .maybeSingle();
    
    if (!existingError && existingCustomer?.id) {
      customerId = existingCustomer.id;
      
      if (existingCustomer.name !== customerName) {
        await supabase.rpc('update_customer', {
            p_customer_id: customerId,
            p_name: customerName,
            p_phone: fullPhone,
            p_whatsapp_number: fullPhone
        });
      }
    }
  }
  
  // إنشاء عميل جديد إذا لم يوجد
  if (!customerId) {
    const { data: newCustomerId, error: customerError } = await supabase.rpc('create_customer', {
        p_name: customerName,
        p_phone: fullPhone || null,
        p_whatsapp_number: fullPhone || null
    });
    
    if (customerError) {
      console.error("Customer error:", customerError);
      alert("فشل إنشاء العميل: " + customerError.message);
      return;
    }
    
    customerId = newCustomerId;
  }
  
  // 🔥 إنشاء طلب الانتظار باستخدام RPC
  const { data: newRequestId, error: requestError } = await supabase.rpc('create_table_request', {
      p_customer_id: customerId,
      p_requested_party_size: party,
      p_zone_name: preferredZone || null,
      p_request_source: 'walk_in'
  });
  
  if (requestError) {
    console.error("Request error:", requestError);
    alert("فشل إنشاء الطلب: " + requestError.message);
    return;
  }
  
  closeWalkInModal();
  await loadAll();
  showSuccessNotification("تم إضافة العميل");
}

// ============================================================
// EDIT REQUEST (WALK-IN ONLY)
// ============================================================

function openEditRequestModal(requestId) {
  const request = waitingData.find(w => w.request_id === requestId);
  if (!request) return;
  
  if (request.request_source !== "walk_in") {
    showAlert("لا يمكن تعديل هذا الطلب. يمكن للعميل تعديله عبر الواتساب");
    return;
  }
  
  currentEditingRequest = request;
  currentEditPartySize = request.requested_party_size || 2;
  
  document.getElementById('editName').value = request.customer_name || "";
  
  let phoneValue = "";
  if (request.phone) {
    let phoneStr = String(request.phone);
    if (phoneStr.startsWith("05")) {
      phoneValue = phoneStr.substring(2);
    } else {
      phoneValue = phoneStr;
    }
  }
  document.getElementById('editPhone').value = phoneValue;
  document.getElementById('editPartyValue').innerText = currentEditPartySize;
  document.getElementById('editParty').value = currentEditPartySize;
  document.getElementById('editZone').value = request.zone_name || "";
  document.getElementById('editRequestSub').innerHTML = `تعديل طلب رقم #${request.queue_position || '?'}`;
  
  document.getElementById("editRequestModal").classList.add("show");
}

function closeEditRequestModal() {
  document.getElementById("editRequestModal").classList.remove("show");
  currentEditingRequest = null;
}

async function saveEditedRequest() {
  if (!currentEditingRequest) return;
  
  const newName = document.getElementById('editName').value.trim();
  let phoneDigits = document.getElementById('editPhone').value.trim();
  const newPartySize = currentEditPartySize;
  const newZone = document.getElementById('editZone').value;
  
  let fullPhone = "";
  if (phoneDigits && phoneDigits.length === 8) {
    fullPhone = "05" + phoneDigits;
  } else if (phoneDigits && phoneDigits.length > 0 && phoneDigits.length !== 8) {
    showAlert("رقم الجوال 8 أرقام بعد 05");
    return;
  }
  
  try {
    let customerId = currentEditingRequest.customer_id;
    
    if (!customerId && fullPhone) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", fullPhone)
        .maybeSingle();
      
      if (customer) {
        customerId = customer.id;
      }
    }
    
    // 🔥 استخدام RPC الآمن بدلاً من التحديث المباشر
    if (customerId) {
      const { error: updateError } = await supabase.rpc('update_customer', {
        p_customer_id: customerId,
        p_name: newName,
        p_phone: fullPhone || null,
        p_whatsapp_number: fullPhone || null
      });
      
      if (updateError) {
        console.error("Update customer error:", updateError);
        showAlert("فشل تحديث بيانات العميل: " + updateError.message);
        return;
      }
    }
    
    const updateRequestData = {
      requested_party_size: newPartySize,
      zone_name: newZone
    };
    
    const { error: updateRequestError } = await supabase
      .from("table_requests")
      .update(updateRequestData)
      .eq("id", currentEditingRequest.request_id);
    
    if (updateRequestError) {
      console.error("Error updating request:", updateRequestError);
      showAlert("حدث خطأ أثناء حفظ التعديلات: " + updateRequestError.message);
      return;
    }
    
    showSuccessNotification("تم تحديث الطلب بنجاح");
    closeEditRequestModal();
    await loadAll();
  } catch (err) {
    console.error("Unexpected error:", err);
    showAlert("حدث خطأ غير متوقع: " + err.message);
  }
}

// ============================================================
// MANUAL STATUS CHANGE
// ============================================================

async function manualStatusChange(newStatus) {
  if (!modalTable) return;
  await changeTableStatus(modalTable.id, newStatus);
  closeStatusModal();
}

async function swapCurrentTable() {
  if (!modalTable) return;
  try {
    await supabase.rpc('clean_table_assignments', { p_table_id: modalTable.id });
    await supabase.from("dining_tables").update({ status: "available" }).eq("id", modalTable.id);
  } catch (e) {}
  closeStatusModal();
  loadAll();
}

function assignSelectedToTable(row) {
  if (selectedRequestId) assignRequestToTable(selectedRequestId, selectedPartySize, row);
}