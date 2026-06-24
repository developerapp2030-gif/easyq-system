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
  
  // تنظيف ذكي لمؤقت التنظيف من الذاكرة
  if (cleaningTimers[tableId]) {
    const timerId = cleaningTimers[tableId].id || cleaningTimers[tableId];
    clearTimeout(timerId);
    delete cleaningTimers[tableId];
  }
  if (reservationTimers[tableId]) {
    clearTimeout(reservationTimers[tableId]);
    delete reservationTimers[tableId];
  }
  if (table.status === "occupied" && newStatus !== "occupied") {
    stopTableTimer(tableId, table.table_name);
  }
  
  // إدارة كاش المتصفح لبيانات العميل لضمان عدم الاختفاء
  if (newStatus === "occupied") {
    startTableTimer(tableId, table.table_name);
    
    if (table.customer_name) {
      const occupiedData = {
        customer_name: table.customer_name,
        requested_party_size: table.requested_party_size,
        seated_at: new Date().toISOString()
      };
      sessionStorage.setItem(`occupied_table_${tableId}`, JSON.stringify(occupiedData));
    }
    
    // جلب التعيين النشط لهذه الطاولة
    const { data: assignment } = await supabase
        .from('table_assignments')
        .select('request_id')
        .eq('table_id', tableId)
        .eq('status', 'offered')
        .maybeSingle();
    console.log('🔍 assignment found:', assignment);

    if (assignment?.request_id) {
        console.log('🔄 جاري تحديث الطلب:', assignment.request_id);
        
        const { data: reqData, error: reqError } = await supabase
            .from('table_requests')
            .update({ status: 'occupied' })
            .eq('id', assignment.request_id)
            .select();
        
        if (reqError) {
            console.error('❌ فشل تحديث الطلب table_requests:', reqError);
            showAlert(`فشل تحديث حالة الطلب: ${reqError.message}`);
        } else {
            console.log('✅ تم تحديث الطلب بنجاح:', reqData);
        }
        
        const occupiedAt = new Date().toISOString();

        const { error: assignError } = await supabase
            .from('table_assignments')
            .update({
              status: 'occupied',
              occupied_at: occupiedAt
            })
            .eq('table_id', tableId)
            .eq('status', 'offered');
            
        if (assignError) {
            console.error('❌ فشل تحديث التعيين table_assignments:', assignError);
        } else {
            table.seated_at = occupiedAt;
            console.log('✅ تم تحديث حالة التعيين بنجاح إلى occupied مع حفظ وقت الجلوس');
        }
    } else {
        console.warn('⚠️ لم يتم العثور على تعيين نشط (offered) لهذه الطاولة.');
    }
  } else {
    // إذا تحولت لأي حالة أخرى غير المشغولة، يتم تفريغ كاش الطاولة فوراً
    sessionStorage.removeItem(`occupied_table_${tableId}`);
  }
  
  if (newStatus === "available") {
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

  // ✅ تحديث حالة الطلب والتعيين عند تنظيف الطاولة
  if (newStatus === 'cleaning') {
    const holdMinutes = Number(settings.cleaning_hold_minutes || 10);
    const cleaningStartedAt = new Date();
    const cleaningExpiresAt = new Date(cleaningStartedAt.getTime() + (holdMinutes * 60 * 1000));

    /*
      نقبل التنظيف من:
      - occupied: عميل كان جالساً وانتهت خدمته
      - offered: حجز كان على الطاولة وتم تحويلها للتنظيف مباشرة
      - reserved: احتياط إذا كان هناك سجل قديم بهذه الحالة
    */
    const { data: assignment } = await supabase
        .from('table_assignments')
        .select('id, request_id, status')
        .eq('table_id', tableId)
        .in('status', ['occupied', 'offered', 'reserved'])
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (assignment?.request_id) {
        const { error: requestCleaningError } = await supabase
            .from('table_requests')
            .update({ status: 'cleaning' })
            .eq('id', assignment.request_id);

        if (requestCleaningError) {
          console.error('❌ فشل تحديث حالة الطلب إلى cleaning:', requestCleaningError);
          showAlert(`فشل تحديث حالة الطلب: ${requestCleaningError.message}`);
          return false;
        }

        const { error: assignmentCleaningError } = await supabase
            .from('table_assignments')
            .update({
              status: 'cleaning',
              cleaning_started_at: cleaningStartedAt.toISOString(),
              cleaning_expires_at: cleaningExpiresAt.toISOString()
            })
            .eq('id', assignment.id);

        if (assignmentCleaningError) {
          console.error('❌ فشل تحديث حالة التعيين إلى cleaning:', assignmentCleaningError);
          showAlert(`فشل تحديث حالة التعيين: ${assignmentCleaningError.message}`);
          return false;
        }

        console.log(`✅ تم تحديث الطلب والتعيين إلى cleaning للطاولة ${table.table_name}`);
    }

    /*
      نبقي مؤقت المتصفح للعمل الفوري داخل نفس الجلسة،
      لكن مصدر الوقت الرسمي أصبح محفوظاً في table_assignments.cleaning_expires_at.
    */
    cleaningTimers[tableId] = {
      id: setTimeout(async () => {
        console.log(`⏰ انتهى وقت التنظيف للطاولة ${table.table_name}`);
        await changeTableStatus(tableId, 'available');
        showPersistentAlert(`🧹 انتهى وقت التنظيف للطاولة ${table.table_name}`);
      }, holdMinutes * 60 * 1000),
      expiresAt: cleaningExpiresAt.getTime()
    };
  }
  
  if (newStatus === 'reserved') {
    console.log(`⏳ الطاولة ${table.table_name} محجوزة. انتهاء الحجز سيتم عبر checkReservationTimers فقط.`);
  }
  
  // جلب كافة البيانات المحدثة (الطاولات والطلبات) فوراً محلياً دون انتظار الـ Realtime
  await loadAll();
  
  renderFloorPlan();
  renderStatusSummary();
  
  return true;
}

// ============================================================
// ASSIGN REQUEST TO TABLE
// ============================================================

// ============================================================
// ASSIGN REQUEST TO TABLE
// ============================================================

async function assignRequestToTable(reqId, partySize, row) {
  if (!canDo('assign_tables')) {
    showAlert('ليس لديك صلاحية لتعيين العملاء على الطاولات');
    return;
  }

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
    // 1. استخراج وقت الحجز من إعدادات الواجهة الحالية
    const holdMinutes = Number(settings.reservation_hold_minutes || 10);
    
    // 2. إرسال الدقائق مع الطلب إلى الـ RPC
    const { data: result, error: assignErr } = await supabase.rpc('assign_table_to_request', {
      p_table_id: row.id,
      p_request_id: reqId,
      p_business_id: currentUser?.business_id || null,
      p_hold_minutes: holdMinutes // تمرير الدقائق مباشرة لقاعدة البيانات
    });
    
    if (assignErr) throw assignErr;
    if (!result.success) throw new Error(result.message);
    
    console.log("✅ التعيين تم بنجاح، الدقائق المستخدمة:", result.hold_minutes_used);
    

    
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
  if (window.easyqAssignNextBusy === true) {
    return;
  }

  window.easyqAssignNextBusy = true;

  const assignBtn = document.querySelector('.assign-auto-btn');
  const oldBtnHtml = assignBtn ? assignBtn.innerHTML : '';
  const oldBtnTitle = assignBtn ? assignBtn.getAttribute('title') : '';
  const oldBtnOpacity = assignBtn ? assignBtn.style.opacity : '';
  const oldBtnCursor = assignBtn ? assignBtn.style.cursor : '';
  const oldBtnPointerEvents = assignBtn ? assignBtn.style.pointerEvents : '';

  if (assignBtn) {
    assignBtn.disabled = true;
    assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    assignBtn.setAttribute('title', 'جاري التعيين...');
    assignBtn.style.opacity = '0.65';
    assignBtn.style.cursor = 'not-allowed';
    assignBtn.style.pointerEvents = 'none';
  }

  try {
    const businessId = currentUser?.business_id;

    if (!businessId) {
      alert("لا يمكن التعيين: لم يتم العثور على مطعم المستخدم الحالي");
      return;
    }

    const waitingList = filteredWaitingData()
      .filter(w => w.business_id === businessId);

  const waitingListOrdered = waitingList
    .filter(w => w.status === "waiting" || w.status === "offered")
    .sort((a, b) => (a.queue_position || 999) - (b.queue_position || 999));

  let targetRequest = waitingListOrdered.find(w => hasMatchingAvailableTable(w));

    if (!targetRequest) {
      alert("لا يوجد عميل جاهز للتعيين");
      return;
    }

    if (targetRequest.business_id !== businessId) {
      alert("لا يمكن التعيين: هذا الطلب لا يتبع المطعم الحالي");
      return;
    }

    const { data: tables, error: tablesError } = await supabase
      .from("dashboard_tables_full")
      .select("*")
      .eq("business_id", businessId);

    if (tablesError) {
      console.error("❌ خطأ في جلب طاولات المطعم:", tablesError);
      alert("فشل جلب طاولات المطعم الحالي");
      return;
    }

    let availableTables = (tables || []).filter(t =>
      t.business_id === businessId &&
      t.status === "available" &&
      Number(t.floor_number) === Number(currentFloor) &&
      Number(t.capacity) >= Number(targetRequest.requested_party_size)
    );

    let bestTable = null;

    if (targetRequest.zone_name && targetRequest.zone_name !== "") {
      let zoneTables = availableTables.filter(t => t.zone_name === targetRequest.zone_name);

      if (zoneTables.length > 0) {
        zoneTables.sort((a, b) => Number(a.capacity) - Number(b.capacity));
        bestTable = zoneTables[0];
      }
    }

    if (!bestTable && availableTables.length > 0) {
      availableTables.sort((a, b) => Number(a.capacity) - Number(b.capacity));
      bestTable = availableTables[0];
    }

    if (!bestTable) {
      alert("لا توجد طاولة مناسبة في المطعم الحالي");
      return;
    }

    console.log("✅ الطلب المختار:", {
      request_id: targetRequest.request_id,
      request_business_id: targetRequest.business_id,
      customer: targetRequest.customer_name
    });

    console.log("✅ الطاولة المختارة:", {
      table_id: bestTable.id,
      table_name: bestTable.table_name,
      table_business_id: bestTable.business_id
    });

    await assignRequestToTable(
      targetRequest.request_id,
      targetRequest.requested_party_size,
      bestTable
    );

  } finally {
    window.easyqAssignNextBusy = false;

    if (assignBtn) {
      assignBtn.disabled = false;
      assignBtn.innerHTML = oldBtnHtml || '<i class="fas fa-arrow-left"></i>';

      if (oldBtnTitle) {
        assignBtn.setAttribute('title', oldBtnTitle);
      } else {
        assignBtn.setAttribute('title', 'تعيين تلقائي');
      }

      assignBtn.style.opacity = oldBtnOpacity;
      assignBtn.style.cursor = oldBtnCursor;
      assignBtn.style.pointerEvents = oldBtnPointerEvents;
    }
  }
}

// ============================================================
// RESERVATION TIMER CHECK (UPDATED)
// ============================================================

async function checkReservationTimers() {
  // ✅ لا تشغل فحص حجوزات المطاعم داخل لوحة السوبر أدمن
  if (window.currentUser && window.currentUser.role === 'super_admin') {
    return;
  }

  const holdMinutes = Number(settings.reservation_hold_minutes || 10);
  
  console.log('🔍 بدء فحص المؤقتات (checkReservationTimers)...');
  
  const { data: assignments, error } = await supabase.rpc('get_offered_assignments');
  if (error) {
    console.error('❌ خطأ في جلب التعيينات get_offered_assignments:', error);
    return;
  }
  
  if (!assignments || assignments.length === 0) {
      return; // لا يوجد تعيينات للفحص
  }

  console.log(`📋 التعيينات الحالية (offered): ${assignments.length} تعيين`, assignments);
  
  const now = Date.now();
  let expired = [];
  
  for (const a of assignments) {
    console.log(`🔎 فحص التعيين ID: ${a.id}`);
    
    // جلب حالة الطاولة للتأكد أن العميل لم يحضر ويحولها لـ occupied
    const { data: table } = await supabase
      .from("dining_tables")
      .select("status")
      .eq("id", a.table_id)
      .single();
    
    if (table && table.status === "occupied") {
      console.log(`⏸️ الطاولة مشغولة، لن يتم إلغاء الحجز للتعيين: ${a.id}`);
      continue;
    }
    
    // التحقق من الوقت باستخدام hold_expires_at كأولوية
    if (a.hold_expires_at) {
      const expiresAt = new Date(a.hold_expires_at).getTime();
      const remainingSeconds = ((expiresAt - now) / 1000).toFixed(0);
      
      console.log(`⏳ التعيين ${a.id} - متبقي ${remainingSeconds} ثانية.`);
      
      if (now >= expiresAt) {
        console.log(`⚠️ انتهى وقت الحجز (حسب hold_expires_at)!`);
        expired.push(a);
      }
    } else if (a.reserved_at) {
      // Fallback في حال لم يكن hold_expires_at متوفراً
      const reservedTime = new Date(a.reserved_at).getTime();
      const minutesPassed = (now - reservedTime) / 60000;
      
      console.log(`⏳ التعيين ${a.id} - مضى ${minutesPassed.toFixed(2)} دقيقة من أصل ${holdMinutes}`);
      
      if (minutesPassed >= holdMinutes) {
        console.log(`⚠️ انتهى وقت الحجز (حسب الدقائق)!`);
        expired.push(a);
      }
    } else {
      console.log(`⚠️ لا يوجد وقت مسجل للتعيين ${a.id} (تجاهل).`);
    }
  }
  
  if (expired.length > 0) {
    console.log(`🗑️ جاري تنظيف ${expired.length} حجز منتهي...`);
  }

  for (const a of expired) {
    // 1. استدعاء الدالة الآمنة (RPC)
    console.log(`🔄 استدعاء expire_table_assignment للتعيين: ${a.id}`);
    const { data: expireResult, error: expireError } = await supabase.rpc(
      'expire_table_assignment',
      { p_assignment_id: a.id }
    );
    
    console.log('⏰ نتيجة expire_table_assignment:', expireResult, expireError);
    
    if (expireError || (expireResult && !expireResult.success)) {
      console.error('❌ فشل إنهاء الحجز:', expireError || expireResult);
      continue; // منع إرسال الواتساب أو إكمال العمليات إذا فشلت الـ RPC
    }
    
    console.log('✅ تم إنهاء الحجز بنجاح وتحويل الطلب إلى cancelled');

    // 2. إرسال الواتساب فقط بعد نجاح تفكيك الحجز كلياً
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
  
  if (expired.length > 0) {
    await loadAll();
  }
}

// ============================================================
// RESTORE EXPIRED BOOKING
// ============================================================

async function restoreExpiredBooking(reqId) {
  if (!reqId) return;

  window.easyqRestoringExpiredBookings = window.easyqRestoringExpiredBookings || new Set();

  if (window.easyqRestoringExpiredBookings.has(reqId)) {
    return;
  }

  window.easyqRestoringExpiredBookings.add(reqId);

  const clickedBtn =
    window.event?.currentTarget ||
    window.event?.target?.closest?.("button") ||
    null;

  const oldBtnHtml = clickedBtn ? clickedBtn.innerHTML : "";
  const oldBtnOpacity = clickedBtn ? clickedBtn.style.opacity : "";
  const oldBtnCursor = clickedBtn ? clickedBtn.style.cursor : "";

  if (clickedBtn) {
    clickedBtn.disabled = true;
    clickedBtn.style.opacity = "0.65";
    clickedBtn.style.cursor = "not-allowed";
    clickedBtn.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      ${currentLang === "ar" ? "جاري الاسترجاع..." : "Restoring..."}
    `;
  }

  try {
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
      alert(currentLang === "ar" ? "فشل استرجاع الحجز" : "Restore failed");

      if (clickedBtn) {
        clickedBtn.disabled = false;
        clickedBtn.style.opacity = oldBtnOpacity;
        clickedBtn.style.cursor = oldBtnCursor;
        clickedBtn.innerHTML = oldBtnHtml;
      }

      return;
    }

    await loadAll();

  } catch (err) {
    console.error("Restore expired booking error:", err);
    alert(currentLang === "ar" ? "حدث خطأ أثناء استرجاع الحجز" : "Restore failed");

    if (clickedBtn) {
      clickedBtn.disabled = false;
      clickedBtn.style.opacity = oldBtnOpacity;
      clickedBtn.style.cursor = oldBtnCursor;
      clickedBtn.innerHTML = oldBtnHtml;
    }

  } finally {
    window.easyqRestoringExpiredBookings.delete(reqId);
  }
}

// ============================================================
// CLOSE EXPIRED REQUEST
// ============================================================

async function closeExpiredRequest(reqId) {
  if (!reqId) {
    showAlert(currentLang === "ar"
      ? "لا يمكن تحديد الطلب المراد إلغاؤه"
      : "Could not identify the booking to cancel");
    return;
  }

  const confirmMessage = currentLang === "ar"
    ? "هل أنت متأكد من إلغاء هذا الطلب؟"
    : "Are you sure you want to cancel this booking?";

  if (!confirm(confirmMessage)) {
    return;
  }

  const clickedBtn =
    window.event?.currentTarget ||
    window.event?.target?.closest?.("button") ||
    null;

  const oldBtnHtml = clickedBtn ? clickedBtn.innerHTML : "";
  const oldBtnOpacity = clickedBtn ? clickedBtn.style.opacity : "";
  const oldBtnCursor = clickedBtn ? clickedBtn.style.cursor : "";

  if (clickedBtn) {
    clickedBtn.disabled = true;
    clickedBtn.style.opacity = "0.65";
    clickedBtn.style.cursor = "not-allowed";
    clickedBtn.innerHTML = currentLang === "ar"
      ? '<i class="fas fa-spinner fa-spin"></i> جاري الإلغاء'
      : '<i class="fas fa-spinner fa-spin"></i> Cancelling';
  }

  try {
    const { error } = await supabase.rpc("delete_booking", {
      p_request_id: reqId
    });

    if (error) {
      console.error("Expired booking cancel error:", error);

      if (clickedBtn) {
        clickedBtn.disabled = false;
        clickedBtn.style.opacity = oldBtnOpacity;
        clickedBtn.style.cursor = oldBtnCursor;
        clickedBtn.innerHTML = oldBtnHtml;
      }

      showAlert(currentLang === "ar"
        ? "فشل إلغاء الطلب، حاول مرة أخرى"
        : "Failed to cancel booking, please try again");
      return;
    }

    showSuccessNotification(currentLang === "ar"
      ? "تم إلغاء الطلب بنجاح"
      : "Booking cancelled successfully");

    try {
      if (typeof cachedExpiredData !== "undefined" && Array.isArray(cachedExpiredData)) {
        cachedExpiredData = cachedExpiredData.filter(item => String(item.id) !== String(reqId));
      }

      const expiredCard = clickedBtn?.closest?.(".expired-card");
      if (expiredCard) {
        expiredCard.remove();
      } else if (typeof renderExpiredList === "function") {
        await renderExpiredList();
      }

    } catch (uiErr) {
      console.warn("تم إلغاء الطلب بنجاح، لكن حدث خطأ بسيط أثناء تحديث واجهة المنتهية:", uiErr);
    }

  } catch (err) {
    console.error("Expired booking cancel unexpected error:", err);

    if (clickedBtn) {
      clickedBtn.disabled = false;
      clickedBtn.style.opacity = oldBtnOpacity;
      clickedBtn.style.cursor = oldBtnCursor;
      clickedBtn.innerHTML = oldBtnHtml;
    }

    showAlert(currentLang === "ar"
      ? "حدث خطأ أثناء إلغاء الطلب"
      : "An error occurred while cancelling the booking");
  }
}

// ============================================================
// WALK-IN CUSTOMER
// ============================================================

async function saveWalkIn() {
  if (!canDo('add_walkin')) {
    showAlert('ليس لديك صلاحية لحفظ عميل داخلي');
    return;
  }

let name = document.getElementById("walkInName").value.trim();

if (!name) {
  alert("اسم العميل مطلوب لإضافة عميل محلي");
  return;
}

if (name.length > 20) {
  name = name.substring(0, 20);
  alert("الاسم مقيد بـ 20 حرف كحد أقصى");
}

const party = parseInt(document.getElementById("walkInParty").value);
let phoneDigits = document.getElementById("walkInPhone").value.trim();
const preferredZone = document.getElementById("walkInZone").value;
const customerName = name;

if (!phoneDigits) {
  alert("رقم الجوال مطلوب لإضافة عميل محلي");
  return;
}
  
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

  /*
    منع تكرار عميل محلي إذا كان نفس رقم الجوال موجوداً حالياً في الطابور.
    الفحص الأول من waitingData سريع وفوري.
    الفحص الثاني من قاعدة البيانات للتأكد إذا كانت الواجهة لم تتحدث بعد.
  */
  if (fullPhone) {
    const normalizeQueuePhone = (phone) => {
      const digits = String(phone || "").replace(/\D/g, "");

      if (digits.startsWith("9665") && digits.length >= 12) {
        return "0" + digits.substring(3);
      }

      if (digits.startsWith("5") && digits.length === 9) {
        return "0" + digits;
      }

      if (digits.startsWith("05") && digits.length === 10) {
        return digits;
      }

      return digits;
    };

    const normalizedFullPhone = normalizeQueuePhone(fullPhone);

    const localDuplicate = Array.isArray(waitingData)
      ? waitingData.find(item => {
          const status = String(item.status || "").toLowerCase();

          if (!["waiting", "offered", "restored"].includes(status)) {
            return false;
          }

          const existingPhone =
            item.phone ||
            item.customer_phone ||
            item.customer_phone_snapshot ||
            "";

          return normalizeQueuePhone(existingPhone) === normalizedFullPhone;
        })
      : null;

    if (localDuplicate) {
      alert(
        currentLang === "ar"
          ? "لا يمكن إضافة العميل، يوجد عميل في الطابور بنفس رقم الجوال"
          : "This phone number already exists in the queue"
      );
      return;
    }

    const { data: latestWaitingRows, error: duplicateCheckError } = await supabase
      .from("waiting_list_full")
      .select("request_id, queue_position, status, phone, customer_phone, customer_phone_snapshot")
      .eq("business_id", currentUser.business_id)
      .in("status", ["waiting", "offered", "restored"]);

    if (duplicateCheckError) {
      console.error("Duplicate walk-in phone check error:", duplicateCheckError);
      alert(
        currentLang === "ar"
          ? "تعذر التحقق من تكرار رقم الجوال، حاول مرة أخرى"
          : "Could not verify duplicate phone number, please try again"
      );
      return;
    }

    const dbDuplicate = Array.isArray(latestWaitingRows)
      ? latestWaitingRows.find(item => {
          const existingPhone =
            item.phone ||
            item.customer_phone ||
            item.customer_phone_snapshot ||
            "";

          return normalizeQueuePhone(existingPhone) === normalizedFullPhone;
        })
      : null;

    if (dbDuplicate) {
      alert(
        currentLang === "ar"
          ? "لا يمكن إضافة العميل، يوجد عميل في الطابور بنفس رقم الجوال"
          : "This phone number already exists in the queue"
      );
      return;
    }
  }
  
  const saveBtn = document.getElementById('walkInSaveBtn');
const saveBtnText = document.getElementById('walkInSaveBtnText');
const saveBtnSpinner = document.getElementById('walkInSaveBtnSpinner');

if (saveBtn) saveBtn.disabled = true;
if (saveBtnText) saveBtnText.innerText = 'جاري الإضافة...';
if (saveBtnSpinner) saveBtnSpinner.style.display = 'inline-block';

let customerId = null;

try {
  
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
  
// ✅ حفظ نسخة اسم ورقم العميل داخل الطلب نفسه حتى تظهر في صفحة التتبع والـ QR
const { error: snapshotError } = await supabase
  .from("table_requests")
  .update({
    customer_name_snapshot: customerName,
    customer_phone_snapshot: fullPhone || null
  })
  .eq("id", newRequestId);

if (snapshotError) {
  console.warn("⚠️ تم إنشاء الطلب لكن فشل حفظ نسخة اسم العميل:", snapshotError);
}

  closeWalkInModal();
  await loadAll();
  showSuccessNotification("تم إضافة العميل");

  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveBtnText) saveBtnText.innerText = 'إضافة';
    if (saveBtnSpinner) saveBtnSpinner.style.display = 'none';
  }
}

// ============================================================
// EDIT REQUEST (WALK-IN ONLY)
// ============================================================

function openEditRequestModal(requestId) {
  const request = waitingData.find(w => w.request_id === requestId);
  if (!request) return;
  
  if (!canDo('edit_requests')) {
    showAlert('ليس لديك صلاحية لتعديل طلبات العملاء');
    return;
  }

  if (!['waiting', 'restored'].includes(request.status)) {
    showAlert('يمكن تعديل الطلب فقط أثناء وجوده في قائمة الانتظار');
    return;
  }
  
  currentEditingRequest = request;
  currentEditPartySize = request.requested_party_size || 2;
  
  document.getElementById('editName').value = request.customer_name || "";
  
  let phoneValue = "";
  if (request.phone) {
    let phoneStr = String(request.phone).trim();

    // تحويل أي صيغة رقم إلى صيغة 8 أرقام فقط بعد 05
    // أمثلة:
    // +966553473330 => 53473330
    // 966553473330  => 53473330
    // 0553473330    => 53473330
    // 553473330     => 53473330
    phoneStr = phoneStr.replace(/\D/g, "");

    if (phoneStr.startsWith("9665") && phoneStr.length >= 12) {
      phoneValue = phoneStr.substring(4);
    } else if (phoneStr.startsWith("05") && phoneStr.length >= 10) {
      phoneValue = phoneStr.substring(2);
    } else if (phoneStr.startsWith("5") && phoneStr.length === 9) {
      phoneValue = phoneStr.substring(1);
    } else if (phoneStr.length === 8) {
      phoneValue = phoneStr;
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
  if (!canDo('edit_requests')) {
    showAlert('ليس لديك صلاحية لحفظ تعديل طلب العميل');
    return;
  }

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
  zone_name: newZone,
  customer_name_snapshot: newName || null,
  customer_phone_snapshot: fullPhone || null
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
  if (!selectedRequestId) return;

  const isStrictQueueMode = (settings?.ready_mode || 'any_match') === 'queue_priority';
  const selectedCard = document.querySelector(`.waiting-card[data-request-id="${selectedRequestId}"]`);

  if (isStrictQueueMode && selectedCard && !selectedCard.classList.contains('ready')) {
    showAlert('وضع الانضباط مفعّل: لا يمكن تعيين غير العميل الجاهز الأول.');
    clearSelection();
    return;
  }

  assignRequestToTable(selectedRequestId, selectedPartySize, row);
}