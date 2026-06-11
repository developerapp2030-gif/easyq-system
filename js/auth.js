

// ============================================================
// LOGIN SYSTEM 11
// ============================================================

function addBusinessSupportSidebarButton() {
  // لا يعمل في وضع السوبر أدمن
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  // الزر يجب أن يكون موجودًا في index.html داخل قسم إدارة الفرع
  const btn = document.getElementById('businessSupportSidebarBtn');

  if (!btn) {
    console.warn('زر الدعم الحي غير موجود في index.html داخل قسم إدارة الفرع');
    return;
  }

  // منع تكرار ربط الحدث
  if (btn.dataset.supportBound === 'true') return;
  btn.dataset.supportBound = 'true';

  btn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof openBusinessSupportModal === 'function') {
      openBusinessSupportModal();
    } else {
      alert('واجهة الدعم لم تكتمل بعد');
    }
    });
    updateBusinessSupportSidebarBadge();
    startBusinessSupportSidebarBadgeAutoRefresh();
}

let businessSupportSidebarBadgeInterval = null;
let isBusinessSupportSidebarBadgeRefreshing = false;

async function updateBusinessSupportSidebarBadge() {
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const btn = document.getElementById('businessSupportSidebarBtn');

  if (!btn) return;

  try {
    const { data, error } = await supabase.rpc('get_my_support_sessions');

    if (error) {
      console.warn('تعذر تحديث شارة الدعم الحي:', error);
      return;
    }

    const sessions = Array.isArray(data) ? data : [];

    const unreadCount = sessions.reduce((sum, session) => {
      return sum + Number(
        session.unread_for_business_count ||
        session.unread_count ||
        0
      );
    }, 0);

    let badge = document.getElementById('businessSupportUnreadBadge');

    if (unreadCount <= 0) {
      if (badge) badge.remove();
      btn.classList.remove('has-support-unread');
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'businessSupportUnreadBadge';

      badge.style.cssText = `
        margin-right: auto;
        min-width: 19px;
        height: 19px;
        padding: 0 6px;
        border-radius: 999px;
        background: #DC2626;
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 900;
        line-height: 19px;
        text-align: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.14);
      `;

      btn.appendChild(badge);
    }

    badge.innerText = unreadCount > 99 ? '99+' : String(unreadCount);
    btn.classList.add('has-support-unread');

  } catch (err) {
    console.warn('خطأ غير متوقع أثناء تحديث شارة الدعم الحي:', err);
  }
}

function startBusinessSupportSidebarBadgeAutoRefresh() {
  stopBusinessSupportSidebarBadgeAutoRefresh();

  businessSupportSidebarBadgeInterval = setInterval(async function () {
    if (isBusinessSupportSidebarBadgeRefreshing) return;

    try {
      isBusinessSupportSidebarBadgeRefreshing = true;
      await updateBusinessSupportSidebarBadge();
    } finally {
      isBusinessSupportSidebarBadgeRefreshing = false;
    }
  }, 15000);
}

function stopBusinessSupportSidebarBadgeAutoRefresh() {
  if (businessSupportSidebarBadgeInterval) {
    clearInterval(businessSupportSidebarBadgeInterval);
    businessSupportSidebarBadgeInterval = null;
  }
}

async function openBusinessSupportModal() {
  // حماية: لا يفتح في وضع السوبر أدمن
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const modal = document.getElementById('businessSupportModal');

  if (!modal) {
    console.warn('businessSupportModal غير موجود في index.html');
    return;
  }

  modal.classList.add('show');

  // إغلاق السايدبار عند فتح الدعم
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }

  bindBusinessSupportModalButtons();

  await loadBusinessSupportSessions();
  startBusinessSupportSessionsListAutoRefresh();
}

async function loadBusinessSupportSessions() {
  const sessionsContainer = document.getElementById('businessSupportSessionsList');

  if (!sessionsContainer) {
    console.warn('businessSupportSessionsList غير موجود داخل مودل الدعم');
    return;
  }

  try {
    sessionsContainer.innerHTML = `
      <div style="padding: 18px; text-align: center; color: #6B7280;">
        جاري تحميل جلسات الدعم...
      </div>
    `;

    const { data, error } = await supabase.rpc('get_my_support_sessions');

    if (error) {
      console.error('فشل تحميل جلسات دعم المطعم:', error);

      sessionsContainer.innerHTML = `
        <div style="padding: 18px; text-align: center; color: #DC2626;">
          فشل تحميل جلسات الدعم
        </div>
      `;

      return;
    }

    const sessions = Array.isArray(data) ? data : [];

    if (sessions.length === 0) {
      sessionsContainer.innerHTML = `
        <div style="padding: 18px; text-align: center; color: #6B7280;">
          لا توجد جلسات دعم حتى الآن
        </div>
      `;

      return;
    }

    sessionsContainer.innerHTML = sessions.map(session => {
      const sessionId = session.session_id || session.id;

      const statusLabel =
        session.status === 'open' ? 'مفتوحة' :
        session.status === 'pending' ? 'بانتظار الرد' :
        session.status === 'closed' ? 'مغلقة' :
        'غير معروف';

      const statusColor =
        session.status === 'open' ? '#10B981' :
        session.status === 'pending' ? '#F59E0B' :
        session.status === 'closed' ? '#6B7280' :
        '#6B7280';

      const lastActivity =
        session.last_message_at ||
        session.last_message_created_at ||
        session.opened_at ||
        session.created_at ||
        null;

      const lastActivityText = lastActivity
        ? new Date(lastActivity).toLocaleString('ar-SA')
        : '-';

      const unreadCount = Number(
        session.unread_for_business_count ||
        session.unread_count ||
        0
      );

      const unreadBadge = unreadCount > 0
        ? `
          <span style="
            background: #DC2626;
            color: white;
            font-size: 11px;
            font-weight: 900;
            border-radius: 999px;
            padding: 3px 8px;
          ">
            ${unreadCount}
          </span>
        `
        : '';

      return `
        <div
          onclick="openBusinessSupportSession('${sessionId}')"
          data-support-session-id="${sessionId || ''}"
          style="
            border: 1px solid #E5E7EB;
            border-radius: 14px;
            padding: 12px;
            margin-bottom: 10px;
            background: #FFFFFF;
            cursor: pointer;
          "
        >
          <div style="
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;
          ">
            <div>
              <div style="font-weight: 900; color: #111827;">
                ${session.subject || 'طلب دعم'}
              </div>

              <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
                آخر نشاط: ${lastActivityText}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              ${unreadBadge}

              <span style="
                background: ${statusColor};
                color: white;
                font-size: 11px;
                font-weight: 900;
                border-radius: 999px;
                padding: 4px 8px;
                white-space: nowrap;
              ">
                ${statusLabel}
              </span>
            </div>
          </div>

          <div style="
            font-size: 12px;
            color: #374151;
            margin-top: 10px;
            line-height: 1.5;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            ${session.last_message_body || 'لا توجد رسائل بعد'}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('خطأ غير متوقع أثناء تحميل جلسات دعم المطعم:', err);

    sessionsContainer.innerHTML = `
      <div style="padding: 18px; text-align: center; color: #DC2626;">
        حدث خطأ أثناء تحميل جلسات الدعم
      </div>
    `;
  }
}

let currentBusinessSupportSessionId = null;

function renderBusinessSupportMessagesHtml(messages) {
  return messages.map(msg => {
    const isSystem = msg.message_type === 'system';
    const isBusiness = msg.sender_role !== 'super_admin';

    if (isSystem) {
      return `
        <div style="
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 6px 0;
        ">
          <span style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            max-width: 70%;
            background: #E5E7EB;
            color: #6B7280;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 10.5px;
            line-height: 1.25;
            text-align: center;
          ">
            ${msg.message_body || ''}
          </span>
        </div>
      `;
    }

    const timeText = msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    return `
      <div style="
        width: 100%;
        display: flex;
        justify-content: ${isBusiness ? 'flex-start' : 'flex-end'};
        margin-bottom: 6px;
      ">
        <div style="
          display: inline-flex;
          flex-direction: column;
          width: fit-content;
          min-width: 36px;
          max-width: min(58%, 460px);
          background: ${isBusiness ? '#0E146D' : '#FFFFFF'};
          color: ${isBusiness ? '#FFFFFF' : '#111827'};
          border: 1px solid ${isBusiness ? '#0E146D' : '#E5E7EB'};
          border-radius: ${isBusiness ? '12px 12px 4px 12px' : '12px 12px 12px 4px'};
          padding: 5px 8px 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.035);
        ">
          <span style="
            display: block;
            font-size: 12.5px;
            line-height: 1.3;
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
            padding: 0;
          ">${msg.message_body || ''}</span>

          <span style="
            display: block;
            align-self: flex-end;
            font-size: 8.5px;
            line-height: 1;
            margin-top: 2px;
            opacity: 0.55;
            color: ${isBusiness ? 'rgba(255,255,255,0.72)' : '#6B7280'};
          ">${timeText}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function openBusinessSupportSession(sessionId) {
  if (!sessionId) {
    alert('لم يتم تحديد جلسة الدعم');
    return;
  }

  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  currentBusinessSupportSessionId = sessionId;

  const header = document.getElementById('businessSupportChatHeader');
  const messagesContainer = document.getElementById('businessSupportMessagesList');
  const input = document.getElementById('businessSupportMessageInput');
  const sendBtn = document.getElementById('businessSendSupportMessageBtn');

  if (header) {
    header.innerHTML = 'جاري تحميل بيانات الجلسة...';
  }

  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #6B7280;">
        جاري تحميل المحادثة...
      </div>
    `;
  }

  try {
    // تعليم رسائل السوبر أدمن كمقروءة عند فتح المطعم للجلسة
    try {
      await supabase.rpc('mark_support_session_read', {
        p_session_id: sessionId
      });
    } catch (readErr) {
      console.warn('تعذر تعليم رسائل الدعم كمقروءة للمطعم:', readErr);
    }

    // جلب جلسات المطعم لمعرفة حالة الجلسة الحالية
    const { data: sessionsData, error: sessionsError } = await supabase
      .rpc('get_my_support_sessions');

    if (sessionsError) throw sessionsError;

    const sessions = Array.isArray(sessionsData) ? sessionsData : [];
    const session = sessions.find(item => {
      const itemId = item.session_id || item.id;
      return itemId === sessionId;
    });

    const statusLabel =
      session?.status === 'open' ? 'مفتوحة' :
      session?.status === 'pending' ? 'بانتظار الرد' :
      session?.status === 'closed' ? 'مغلقة' :
      'غير معروف';

    if (header) {
      header.innerHTML = `
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          width: 100%;
        ">
          <div>
            <div style="font-weight: 900; color: #111827;">
              ${session?.subject || 'طلب دعم'}
            </div>
            <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
              حالة الجلسة: ${statusLabel}
            </div>
          </div>

          <button type="button" onclick="loadBusinessSupportSessions()" style="
            border: none;
            background: #F3F4F6;
            color: #374151;
            padding: 8px 11px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 800;
            font-size: 12px;
          ">
            <i class="fas fa-sync-alt"></i>
            تحديث
          </button>
        </div>
      `;
    }

    if (session?.status === 'closed') {
      if (input) {
        input.value = '';
        input.disabled = true;
        input.placeholder = 'لا يمكن الرد على جلسة مغلقة';
      }

      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';
        sendBtn.style.cursor = 'not-allowed';
      }
    } else {
      if (input) {
        input.disabled = false;
        input.placeholder = 'اكتب رسالتك هنا...';
      }

      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        sendBtn.style.cursor = 'pointer';
      }
    }

    const { data: messagesData, error: messagesError } = await supabase
      .rpc('get_support_session_messages', {
        p_session_id: sessionId
      });

    if (messagesError) throw messagesError;

    const messages = Array.isArray(messagesData) ? messagesData : [];

    if (!messagesContainer) return;

    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #6B7280;">
          لا توجد رسائل في هذه الجلسة حتى الآن
        </div>
      `;
      return;
    }

    messagesContainer.innerHTML = renderBusinessSupportMessagesHtml(messages);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

await loadBusinessSupportSessions();
await updateBusinessSupportSidebarBadge();

startBusinessSupportAutoRefresh();

  } catch (err) {
    console.error('خطأ في فتح محادثة الدعم من جهة المطعم:', err);

    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #DC2626;">
          فشل تحميل المحادثة
        </div>
      `;
    }

    if (header) {
      header.innerHTML = 'تعذر تحميل جلسة الدعم';
    }
  }
}

function closeBusinessSupportModal() {
  const modal = document.getElementById('businessSupportModal');

  if (!modal) return;

stopBusinessSupportAutoRefresh();
stopBusinessSupportSessionsListAutoRefresh();

updateBusinessSupportSidebarBadge();

modal.classList.remove('show');
}

function bindBusinessSupportModalButtons() {
  const closeBtn = document.getElementById('businessSupportCloseBtn');

  if (closeBtn && closeBtn.dataset.bound !== 'true') {
    closeBtn.dataset.bound = 'true';

    closeBtn.addEventListener('click', function (event) {
      event.preventDefault();
      closeBusinessSupportModal();
    });
  }

  const createCodeBtn = document.getElementById('businessCreateSupportCodeBtn');

  if (createCodeBtn && createCodeBtn.dataset.bound !== 'true') {
    createCodeBtn.dataset.bound = 'true';

    createCodeBtn.addEventListener('click', async function (event) {
      event.preventDefault();
      await createBusinessSupportVerificationCode();
    });
  }

  const sendMessageBtn = document.getElementById('businessSendSupportMessageBtn');

  if (sendMessageBtn && sendMessageBtn.dataset.bound !== 'true') {
    sendMessageBtn.dataset.bound = 'true';

    sendMessageBtn.addEventListener('click', async function (event) {
      event.preventDefault();
      await sendBusinessSupportMessage();
    });
  }

  const messageInput = document.getElementById('businessSupportMessageInput');

  if (messageInput && messageInput.dataset.bound !== 'true') {
    messageInput.dataset.bound = 'true';

    messageInput.addEventListener('keydown', async function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        await sendBusinessSupportMessage();
      }
    });
  }
}

async function sendBusinessSupportMessage() {
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  if (!currentBusinessSupportSessionId) {
    alert('اختر جلسة دعم أولًا');
    return;
  }

  const input = document.getElementById('businessSupportMessageInput');
  const sendBtn = document.getElementById('businessSendSupportMessageBtn');

  if (!input) {
    alert('حقل الرسالة غير موجود');
    return;
  }

  const messageBody = input.value.trim();

  if (!messageBody) {
    alert('اكتب رسالة قبل الإرسال');
    return;
  }

  try {
    input.disabled = true;

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        جاري الإرسال...
      `;
    }

    const { data, error } = await supabase.rpc('send_support_message', {
      p_session_id: currentBusinessSupportSessionId,
      p_message_body: messageBody,
      p_is_internal: false
    });

    if (error) {
      console.error('فشل إرسال رسالة الدعم من جهة المطعم:', error);
      alert('فشل إرسال الرسالة: ' + error.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (row && row.success === false) {
      alert(row.message || 'فشل إرسال الرسالة');
      return;
    }

input.value = '';

await refreshBusinessSupportSessionSilently(currentBusinessSupportSessionId);

  } catch (err) {
    console.error('خطأ غير متوقع أثناء إرسال رسالة الدعم:', err);
    alert('حدث خطأ أثناء إرسال الرسالة');

  } finally {
    if (input) {
      input.disabled = false;
      input.focus();
    }

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = `
        <i class="fas fa-paper-plane"></i>
        إرسال
      `;
    }
  }
}

let businessSupportRefreshInterval = null;
let isBusinessSupportRefreshing = false;

function startBusinessSupportAutoRefresh() {
  stopBusinessSupportAutoRefresh();

  businessSupportRefreshInterval = setInterval(async function () {
    const modal = document.getElementById('businessSupportModal');

    if (!modal || !modal.classList.contains('show')) {
      stopBusinessSupportAutoRefresh();
      return;
    }

    if (!currentBusinessSupportSessionId) return;
    if (isBusinessSupportRefreshing) return;

    try {
      isBusinessSupportRefreshing = true;
      await refreshBusinessSupportSessionSilently(currentBusinessSupportSessionId);
    } catch (err) {
      console.warn('تعذر تحديث محادثة الدعم صامتًا:', err);
    } finally {
      isBusinessSupportRefreshing = false;
    }
  }, 7000);
}

async function refreshBusinessSupportSessionSilently(sessionId) {
  if (!sessionId) return;
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const messagesContainer = document.getElementById('businessSupportMessagesList');
  const input = document.getElementById('businessSupportMessageInput');
  const sendBtn = document.getElementById('businessSendSupportMessageBtn');

  if (!messagesContainer) return;

  const { data: sessionsData, error: sessionsError } = await supabase
    .rpc('get_my_support_sessions');

  if (sessionsError) {
    console.warn('تعذر تحديث حالة جلسة الدعم صامتًا:', sessionsError);
    return;
  }

  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  const session = sessions.find(item => {
    const itemId = item.session_id || item.id;
    return itemId === sessionId;
  });

  if (session?.status === 'closed') {
    if (input) {
      input.value = '';
      input.disabled = true;
      input.placeholder = 'لا يمكن الرد على جلسة مغلقة';
    }

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.5';
      sendBtn.style.cursor = 'not-allowed';
    }
  }

  try {
    await supabase.rpc('mark_support_session_read', {
      p_session_id: sessionId
    });
  } catch (readErr) {
    console.warn('تعذر تعليم رسائل الدعم كمقروءة أثناء التحديث الصامت:', readErr);
  }

  const { data: messagesData, error: messagesError } = await supabase
    .rpc('get_support_session_messages', {
      p_session_id: sessionId
    });

  if (messagesError) {
    console.warn('تعذر تحديث رسائل الدعم صامتًا:', messagesError);
    return;
  }

  const messages = Array.isArray(messagesData) ? messagesData : [];

  const newSignature = JSON.stringify(
    messages.map(msg => ({
      id: msg.id,
      body: msg.message_body,
      created_at: msg.created_at,
      sender_role: msg.sender_role,
      message_type: msg.message_type
    }))
  );

  if (messagesContainer.dataset.messagesSignature === newSignature) {
    return;
  }

  messagesContainer.dataset.messagesSignature = newSignature;

  if (messages.length === 0) {
    messagesContainer.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #6B7280;">
        لا توجد رسائل في هذه الجلسة حتى الآن
      </div>
    `;
    return;
  }

  const wasNearBottom =
    messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 80;

  messagesContainer.innerHTML = renderBusinessSupportMessagesHtml(messages);

  if (wasNearBottom) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function stopBusinessSupportAutoRefresh() {
  if (businessSupportRefreshInterval) {
    clearInterval(businessSupportRefreshInterval);
    businessSupportRefreshInterval = null;
  }
}

let businessSupportSessionsListRefreshInterval = null;
let isBusinessSupportSessionsListRefreshing = false;

function startBusinessSupportSessionsListAutoRefresh() {
  stopBusinessSupportSessionsListAutoRefresh();

  businessSupportSessionsListRefreshInterval = setInterval(async function () {
    const modal = document.getElementById('businessSupportModal');

    if (!modal || !modal.classList.contains('show')) {
      stopBusinessSupportSessionsListAutoRefresh();
      return;
    }

    if (isBusinessSupportSessionsListRefreshing) return;

    try {
      isBusinessSupportSessionsListRefreshing = true;
      await refreshBusinessSupportSessionsListSilently();
    } catch (err) {
      console.warn('تعذر تحديث قائمة جلسات دعم المطعم صامتًا:', err);
    } finally {
      isBusinessSupportSessionsListRefreshing = false;
    }
  }, 7000);
}

function stopBusinessSupportSessionsListAutoRefresh() {
  if (businessSupportSessionsListRefreshInterval) {
    clearInterval(businessSupportSessionsListRefreshInterval);
    businessSupportSessionsListRefreshInterval = null;
  }
}

async function refreshBusinessSupportSessionsListSilently() {
  const sessionsContainer = document.getElementById('businessSupportSessionsList');

  if (!sessionsContainer) return;
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const { data, error } = await supabase.rpc('get_my_support_sessions');

  if (error) {
    console.warn('تعذر تحديث قائمة جلسات دعم المطعم:', error);
    return;
  }

  const sessions = Array.isArray(data) ? data : [];

  const newSignature = JSON.stringify(
    sessions.map(session => ({
      session_id: session.session_id || session.id,
      status: session.status,
      subject: session.subject,
      last_message_body: session.last_message_body,
      last_message_at: session.last_message_at,
      last_message_created_at: session.last_message_created_at,
      unread_for_business_count: session.unread_for_business_count || session.unread_count || 0
    }))
  );

  if (sessionsContainer.dataset.sessionsSignature === newSignature) {
    return;
  }

  sessionsContainer.dataset.sessionsSignature = newSignature;

  if (sessions.length === 0) {
    sessionsContainer.innerHTML = `
      <div style="padding: 18px; text-align: center; color: #6B7280;">
        لا توجد جلسات دعم حتى الآن
      </div>
    `;
    return;
  }

  sessionsContainer.innerHTML = sessions.map(session => {
    const sessionId = session.session_id || session.id;

    const statusLabel =
      session.status === 'open' ? 'مفتوحة' :
      session.status === 'pending' ? 'بانتظار الرد' :
      session.status === 'closed' ? 'مغلقة' :
      'غير معروف';

    const statusColor =
      session.status === 'open' ? '#10B981' :
      session.status === 'pending' ? '#F59E0B' :
      session.status === 'closed' ? '#6B7280' :
      '#6B7280';

    const lastActivity =
      session.last_message_at ||
      session.last_message_created_at ||
      session.opened_at ||
      session.created_at ||
      null;

    const lastActivityText = lastActivity
      ? new Date(lastActivity).toLocaleString('ar-SA')
      : '-';

    const unreadCount = Number(
      session.unread_for_business_count ||
      session.unread_count ||
      0
    );

    const unreadBadge = unreadCount > 0
      ? `
        <span style="
          background: #DC2626;
          color: white;
          font-size: 11px;
          font-weight: 900;
          border-radius: 999px;
          padding: 3px 8px;
        ">
          ${unreadCount}
        </span>
      `
      : '';

    const activeStyle = sessionId === currentBusinessSupportSessionId
      ? 'border-color:#0E146D; box-shadow:0 0 0 3px rgba(14,20,109,0.08);'
      : '';

    return `
      <div
        onclick="openBusinessSupportSession('${sessionId}')"
        data-support-session-id="${sessionId || ''}"
        style="
          border: 1px solid #E5E7EB;
          ${activeStyle}
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 10px;
          background: #FFFFFF;
          cursor: pointer;
        "
      >
        <div style="
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        ">
          <div>
            <div style="font-weight: 900; color: #111827;">
              ${session.subject || 'طلب دعم'}
            </div>

            <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
              آخر نشاط: ${lastActivityText}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            ${unreadBadge}

            <span style="
              background: ${statusColor};
              color: white;
              font-size: 11px;
              font-weight: 900;
              border-radius: 999px;
              padding: 4px 8px;
              white-space: nowrap;
            ">
              ${statusLabel}
            </span>
          </div>
        </div>

        <div style="
          font-size: 12px;
          color: #374151;
          margin-top: 10px;
          line-height: 1.5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${session.last_message_body || 'لا توجد رسائل بعد'}
        </div>
      </div>
    `;
  }).join('');
}

async function createBusinessSupportVerificationCode() {
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const codeValueEl = document.getElementById('businessSupportCodeValue');
  const codeHintEl = document.getElementById('businessSupportCodeHint');
  const createCodeBtn = document.getElementById('businessCreateSupportCodeBtn');

  try {
    if (createCodeBtn) {
      createCodeBtn.disabled = true;
      createCodeBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        جاري إنشاء الرمز...
      `;
    }

    if (codeValueEl) {
      codeValueEl.innerText = 'جاري إنشاء الرمز...';
    }

    if (codeHintEl) {
      codeHintEl.innerText = 'يرجى الانتظار لحظات';
    }

    const { data, error } = await supabase.rpc('create_support_verification_code');

    if (error) {
      console.error('فشل إنشاء رمز الدعم:', error);

      if (codeValueEl) {
        codeValueEl.innerText = 'تعذر إنشاء الرمز';
      }

      if (codeHintEl) {
        codeHintEl.innerText = error.message || 'تأكد أن حسابك يملك صلاحية طلب الدعم';
      }

      if (typeof showAlert === 'function') {
        showAlert('فشل إنشاء رمز الدعم');
      } else {
        alert('فشل إنشاء رمز الدعم');
      }

      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    const supportCode =
      row?.code ||
      row?.support_code ||
      row?.verification_code ||
      row?.created_code ||
      null;

    const expiresAt =
      row?.expires_at ||
      row?.code_expires_at ||
      null;

    if (!supportCode) {
      console.warn('لم يتم إرجاع رمز واضح من create_support_verification_code:', data);

      if (codeValueEl) {
        codeValueEl.innerText = 'تم إنشاء الرمز ولكن لم يتم عرضه';
      }

      if (codeHintEl) {
        codeHintEl.innerText = 'راجع نتيجة الدالة في Console';
      }

      return;
    }

    if (codeValueEl) {
      codeValueEl.innerText = supportCode;
    }

    if (codeHintEl) {
      const expiryText = expiresAt
        ? new Date(expiresAt).toLocaleString('ar-SA')
        : '10 دقائق من الآن';

      codeHintEl.innerText = `أرسل هذا الرمز للسوبر أدمن. صالح حتى: ${expiryText}`;
    }

    if (typeof showSuccessNotification === 'function') {
      showSuccessNotification('تم إنشاء رمز الدعم بنجاح');
    }

  } catch (err) {
    console.error('خطأ غير متوقع أثناء إنشاء رمز الدعم:', err);

    if (codeValueEl) {
      codeValueEl.innerText = 'حدث خطأ غير متوقع';
    }

    if (codeHintEl) {
      codeHintEl.innerText = err.message || 'حاول مرة أخرى';
    }

    if (typeof showAlert === 'function') {
      showAlert('حدث خطأ أثناء إنشاء رمز الدعم');
    } else {
      alert('حدث خطأ أثناء إنشاء رمز الدعم');
    }

  } finally {
    if (createCodeBtn) {
      createCodeBtn.disabled = false;
      createCodeBtn.innerHTML = `
        <i class="fas fa-key"></i>
        إنشاء رمز دعم
      `;
    }
  }
}

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  
  if (!username || !password) {
    if (errorEl) errorEl.classList.add('show');
    return;
  }
  
  try {
    const email = username;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (authError) {
      console.error("Auth error:", authError);
      if (errorEl) errorEl.classList.add('show');
      return;
    }
    
    // جلب بيانات المستخدم
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .eq('is_active', true)
      .single();
    
    if (userError || !user) {
      console.error("User data error:", userError);
      if (errorEl) errorEl.classList.add('show');
      return;
    }
    
    // 🔥 الشرط هنا بعد جلب user (المكان الصحيح)
    if (user.role === 'super_admin') {
      currentUser = user;
      localStorage.setItem('easyq_user', JSON.stringify(user));
      const loginOverlay = document.getElementById('loginOverlay');
      if (loginOverlay) loginOverlay.style.display = 'none';
      document.body.classList.add('logged-in');
      showSuperAdminDashboard();
      return;
    }
    
// باقي الكود للمستخدمين العاديين
await supabase.rpc('set_current_business_id', { p_business_id: user.business_id });

if (typeof setCurrentBusinessId === 'function') {
  setCurrentBusinessId(user.business_id);
}

// ============================================================
// SUBSCRIPTION CHECK - EASY-Q
// فحص اشتراك المطعم قبل تشغيل النظام
// ============================================================
const { data: licenseRows, error: licenseError } = await supabase
  .rpc('get_my_license_status');

if (licenseError) {
  console.error('License check error:', licenseError);
  await supabase.auth.signOut();

  if (errorEl) {
    errorEl.innerText = 'تعذر التحقق من اشتراك المطعم. الرجاء المحاولة لاحقًا.';
    errorEl.classList.add('show');
  }

  return;
}

const licenseStatus = Array.isArray(licenseRows) ? licenseRows[0] : null;

if (!licenseStatus) {
  console.warn('No license status returned for this user');
  await supabase.auth.signOut();

  if (errorEl) {
    errorEl.innerText = 'لا يوجد اشتراك مرتبط بهذا الحساب. يرجى التواصل مع إدارة EASY-Q.';
    errorEl.classList.add('show');
  }

  return;
}

if (licenseStatus.access_allowed === false) {
  console.warn('Subscription access denied:', licenseStatus);
  await supabase.auth.signOut();

  let message = 'انتهى اشتراك المطعم. يرجى التواصل مع إدارة EASY-Q لتجديد الاشتراك.';

  if (licenseStatus.effective_status === 'suspended') {
    message = licenseStatus.suspension_reason || 'تم إيقاف اشتراك المطعم مؤقتًا. يرجى التواصل مع إدارة EASY-Q.';
  }

  if (licenseStatus.effective_status === 'cancelled') {
    message = 'تم إلغاء اشتراك المطعم. يرجى التواصل مع إدارة EASY-Q.';
  }

  if (errorEl) {
    errorEl.innerText = message;
    errorEl.classList.add('show');
  }

  return;
}

// حفظ بيانات المستخدم والاشتراك بعد نجاح الفحص
currentUser = user;
localStorage.setItem('easyq_user', JSON.stringify(user));
localStorage.setItem('easyq_license_status', JSON.stringify(licenseStatus));

const loginOverlay = document.getElementById('loginOverlay');
if (loginOverlay) loginOverlay.style.display = 'none';

document.body.classList.add('logged-in');

await loadUserPermissions();

/* تحميل بيانات المطعم الحالي بعد تسجيل الدخول */
await loadSettings();
await loadActiveSettings();

if (typeof loadTopbarBusinessIdentity === 'function') {
  await loadTopbarBusinessIdentity();
}

// إضافة زر الدعم الحي داخل السايدبار بعد جاهزية الواجهة
if (typeof addBusinessSupportSidebarButton === 'function') {
  setTimeout(addBusinessSupportSidebarButton, 500);
}

await loadAll();

const currentUserNameSpan = document.getElementById('currentUserName');
if (currentUserNameSpan) currentUserNameSpan.innerText = user.display_name;

// عرض تنبيه الاشتراك داخل الواجهة إن وجد
showSubscriptionNotice(licenseStatus);

// تشغيل تحديث الاشتراك تلقائيًا كل 5 دقائق أثناء بقاء النظام مفتوحًا
if (window.subscriptionRefreshInterval) {
  clearInterval(window.subscriptionRefreshInterval);
}

window.subscriptionRefreshInterval = setInterval(() => {
  refreshSubscriptionStatus();
}, 5 * 60 * 1000);

if (licenseStatus.should_show_expiry_warning) {
  showSuccessNotification(`مرحباً ${user.display_name} - تنبيه: اشتراك المطعم ينتهي بعد ${licenseStatus.days_remaining} يوم`);
} else if (licenseStatus.effective_status === 'grace') {
  showSuccessNotification(`مرحباً ${user.display_name} - الاشتراك في فترة السماح، متبقي ${licenseStatus.grace_days_remaining} يوم`);
} else {
  showSuccessNotification(`مرحباً ${user.display_name}`);
}
    
  } catch (err) {
    console.error("Login error:", err);
    if (errorEl) errorEl.classList.add('show');
  }
}

// ============================================================
// SUBSCRIPTION NOTICE UI - EASY-Q
// عرض تنبيه الاشتراك بجوار اسم المستخدم داخل الواجهة
// ============================================================

function showSubscriptionNotice(licenseStatus) {
  if (!licenseStatus) return;

  // إزالة أي تنبيه قديم حتى لا يتكرر
  const oldNotice = document.getElementById('subscriptionNoticeBadge');
  if (oldNotice) oldNotice.remove();

  // لا نعرض تنبيه إذا الاشتراك طبيعي ولا يوجد قرب انتهاء
  if (
    licenseStatus.access_allowed === true &&
    licenseStatus.should_show_expiry_warning !== true &&
    licenseStatus.effective_status !== 'grace'
  ) {
    return;
  }

  let message = '';
  let bgColor = '#FF1F1F';

  if (licenseStatus.effective_status === 'grace') {
    message = `الاشتراك في فترة السماح - متبقي ${licenseStatus.grace_days_remaining} يوم`;
    bgColor = '#FF1F1F';
  } else if (licenseStatus.should_show_expiry_warning === true) {
    message = `ينتهي الاشتراك بعد ${licenseStatus.days_remaining} يوم`;
    bgColor = '#FF1F1F';
  } else if (licenseStatus.access_allowed === false) {
    message = 'الاشتراك منتهي';
    bgColor = '#DC2626';
  } else {
    return;
  }

  const currentUserNameSpan = document.getElementById('currentUserName');

  if (!currentUserNameSpan) {
    console.warn('currentUserName element not found for subscription notice');
    return;
  }

  const badge = document.createElement('span');
  badge.id = 'subscriptionNoticeBadge';
  badge.innerText = message;

  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
    padding: 4px 9px;
    border-radius: 999px;
    background: ${bgColor};
    color: #ffffff;
    font-size: 11px;
    font-weight: 400;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 3px 10px rgba(255, 31, 31, 0.35);
    vertical-align: middle;
  `;

  currentUserNameSpan.insertAdjacentElement('afterend', badge);
}

// ============================================================
// REFRESH SUBSCRIPTION STATUS - EASY-Q
// تحديث حالة الاشتراك أثناء عمل النظام
// ============================================================

async function refreshSubscriptionStatus() {
  if (!currentUser || currentUser.role === 'super_admin') return;

  try {
    const { data: licenseRows, error } = await supabase
      .rpc('get_my_license_status');

    if (error) {
      console.error('Refresh subscription status error:', error);
      return;
    }

    const licenseStatus = Array.isArray(licenseRows) ? licenseRows[0] : null;

    if (!licenseStatus) {
      console.warn('No license status returned while refreshing subscription');
      return;
    }

    localStorage.setItem('easyq_license_status', JSON.stringify(licenseStatus));

    showSubscriptionNotice(licenseStatus);

    if (licenseStatus.access_allowed === false) {
      showAlert('انتهى اشتراك المطعم. سيتم تسجيل الخروج من النظام.');

      setTimeout(() => {
        logoutAndClean();
      }, 1500);
    }

  } catch (err) {
    console.error('Unexpected refreshSubscriptionStatus error:', err);
  }
}

// ============================================================
// CHECK EXISTING SESSION
// ============================================================

async function checkExistingSession() {
  const savedUser = localStorage.getItem('easyq_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      const { data: validUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();
      
if (validUser) {
  // السوبر أدمن له لوحة خاصة ولا نطبق عليه فحص اشتراك مطعم
  if (validUser.role === 'super_admin') {
    currentUser = validUser;
    localStorage.setItem('easyq_user', JSON.stringify(validUser));

    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'none';

    document.body.classList.add('logged-in');
    showSuperAdminDashboard();
    return;
  }

  // تثبيت business_id للمستخدم الحالي قبل فحص الاشتراك
  await supabase.rpc('set_current_business_id', { p_business_id: validUser.business_id });

  if (typeof setCurrentBusinessId === 'function') {
    setCurrentBusinessId(validUser.business_id);
  }

  // ============================================================
  // SUBSCRIPTION CHECK ON EXISTING SESSION - EASY-Q
  // فحص الاشتراك عند تحديث الصفحة أو وجود جلسة محفوظة
  // ============================================================
  const { data: licenseRows, error: licenseError } = await supabase
    .rpc('get_my_license_status');

  if (licenseError) {
    console.error('Existing session license check error:', licenseError);

    await supabase.auth.signOut();
    localStorage.removeItem('easyq_user');
    localStorage.removeItem('easyq_license_status');

    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'flex';

    document.body.classList.remove('logged-in');

    showAlert('تعذر التحقق من اشتراك المطعم. الرجاء تسجيل الدخول مرة أخرى.');
    return;
  }

  const licenseStatus = Array.isArray(licenseRows) ? licenseRows[0] : null;

  if (!licenseStatus || licenseStatus.access_allowed === false) {
    console.warn('Existing session subscription denied:', licenseStatus);

    await supabase.auth.signOut();
    localStorage.removeItem('easyq_user');
    localStorage.removeItem('easyq_license_status');

    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'flex';

    document.body.classList.remove('logged-in');

    let message = 'انتهى اشتراك المطعم. يرجى التواصل مع إدارة EASY-Q لتجديد الاشتراك.';

    if (licenseStatus?.effective_status === 'suspended') {
      message = licenseStatus.suspension_reason || 'تم إيقاف اشتراك المطعم مؤقتًا. يرجى التواصل مع إدارة EASY-Q.';
    }

    if (licenseStatus?.effective_status === 'cancelled') {
      message = 'تم إلغاء اشتراك المطعم. يرجى التواصل مع إدارة EASY-Q.';
    }

    showAlert(message);
    return;
  }

  currentUser = validUser;
  localStorage.setItem('easyq_user', JSON.stringify(validUser));
  localStorage.setItem('easyq_license_status', JSON.stringify(licenseStatus));

  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'none';

  document.body.classList.add('logged-in');

  await loadUserPermissions();

const currentUserNameSpan = document.getElementById('currentUserName');
if (currentUserNameSpan) currentUserNameSpan.innerText = validUser.display_name;

// عرض تنبيه الاشتراك بعد تحديث الصفحة أو استعادة الجلسة
showSubscriptionNotice(licenseStatus);

// تشغيل تحديث الاشتراك تلقائيًا كل 5 دقائق بعد تحديث الصفحة
if (window.subscriptionRefreshInterval) {
  clearInterval(window.subscriptionRefreshInterval);
}

window.subscriptionRefreshInterval = setInterval(() => {
  refreshSubscriptionStatus();
}, 5 * 60 * 1000);

return;
}
    } catch(e) {
      console.log("Session check error:", e);
    }
  }
  
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'flex';
  document.body.classList.add('logged-in');
}


async function logoutAndClean() {
  // 1. تسجيل الخروج من Supabase Auth
  await supabase.auth.signOut();
  
  // 2. مسح بيانات المستخدم من الذاكرة
  currentUser = null;
  
  // 3. مسح التخزين المحلي
  localStorage.removeItem('easyq_user');
  
  // 4. إظهار شاشة تسجيل الدخول
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'flex';
  
  // 5. مسح حقول الإدخال
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  
  // 6. إخفاء واجهة النظام
  document.body.classList.remove('logged-in');
  
  // 7. رسالة تأكيد
  showSuccessNotification('تم تسجيل الخروج بنجاح');
}


async function resetPassword() {
  const email = document.getElementById('loginUsername').value.trim();
  if (!email) {
    showAlert('الرجاء إدخال البريد الإلكتروني');
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://easyq-system.vercel.app/reset-password.html'
  });
  if (error) {
    showAlert('فشل إرسال الرابط: ' + error.message);
    return;
  }
  showSuccessNotification('✅ تم إرسال رابط إعادة التعيين إلى بريدك');
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

// ============================================================
// FORGOT PASSWORD MODAL (تحويل المودال الحالي)
// ============================================================

function resetPassword() {
  // إخفاء محتوى البطاقة الحالية
  const loginCard = document.querySelector('.premium-login-card');
  const loginOverlay = document.getElementById('loginOverlay');
  
  if (!loginCard) return;
  
  // حفظ المحتوى الأصلي للبطاقة (للعودة لاحقاً)
  if (!window.originalLoginContent) {
    window.originalLoginContent = loginCard.innerHTML;
  }
  
  // عرض مودال استعادة كلمة المرور داخل نفس البطاقة
  loginCard.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 24px; font-weight: 800; margin-bottom: 16px; color: #06372E;">نسيت كلمة المرور؟</div>
      <p style="color: #6B7280; margin-bottom: 24px; font-size: 14px;">أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور</p>
      
      <div class="premium-form-group">
        <label>البريد الإلكتروني</label>
        <div class="premium-input-wrapper">
          <input type="email" id="resetEmail" class="premium-login-input" placeholder="example@restaurant.com" style="text-align: right;">
          <i class="fas fa-envelope"></i>
        </div>
      </div>
      
      <div id="resetMessage" style="margin-bottom: 20px; font-size: 14px; display: none;"></div>
      
      <button id="sendResetBtn" class="premium-login-btn" style="margin-bottom: 12px;">إرسال رابط إعادة التعيين</button>
      <button id="backToLoginBtn" class="premium-trial-btn" style="background: #F3F4F6; color: #1F2937;">العودة إلى تسجيل الدخول</button>
    </div>
  `;
  
  // ربط الأزرار
  document.getElementById('sendResetBtn')?.addEventListener('click', sendResetEmail);
  document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
    // استعادة المحتوى الأصلي
    if (window.originalLoginContent) {
      loginCard.innerHTML = window.originalLoginContent;
    } else {
      location.reload();
    }
  });
}

async function sendResetEmail() {
  const email = document.getElementById('resetEmail')?.value.trim();
  const messageDiv = document.getElementById('resetMessage');
  
  if (!email) {
    messageDiv.style.color = '#EF4444';
    messageDiv.innerHTML = '❌ الرجاء إدخال البريد الإلكتروني';
    messageDiv.style.display = 'block';
    return;
  }
  
  if (!email.includes('@') || !email.includes('.')) {
    messageDiv.style.color = '#EF4444';
    messageDiv.innerHTML = '❌ البريد الإلكتروني غير صحيح';
    messageDiv.style.display = 'block';
    return;
  }
  
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://easyq-system.vercel.app/reset-password.html',
    });
    
if (error) {
  if (error.message.includes('rate limit')) {
    messageDiv.style.color = '#F59E0B';
    messageDiv.innerHTML = '⚠️ يرجى الانتظار دقيقة قبل إرسال طلب آخر لحماية حسابك.';
    messageDiv.style.display = 'block';
    return;
  }
  throw error;
}    
    messageDiv.style.color = '#10B981';
    messageDiv.innerHTML = '✅ تم إرسال بريد إلكتروني إلى البريد المسجل لاستعادة كلمة المرور. يرجى التحقق من بريدك الإلكتروني.';
    messageDiv.style.display = 'block';
    
    const sendBtn = document.getElementById('sendResetBtn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
    }
    
  } catch (err) {
    console.error('Reset password error:', err);
    messageDiv.style.color = '#EF4444';
    messageDiv.innerHTML = '❌ فشل إرسال رابط إعادة التعيين: ' + err.message;
    messageDiv.style.display = 'block';
  }
}

// ============================================================
// USER PERMISSIONS
// ============================================================

async function loadUserPermissions() {
  if (!currentUser) return;
  
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', currentUser.role);
  
  if (error) return;
  
  userPermissions = {};
  data.forEach(p => {
    userPermissions[p.permission_key] = p.is_enabled;
  });
  
  updateUIBasedOnPermissions();
}

function updateUIBasedOnPermissions() {
  const addTableBtn = document.getElementById('addTableBtn');
  if (addTableBtn) {
    addTableBtn.style.display = canDo('add_tables') ? 'flex' : 'none';
    if (canDo('add_tables')) {
      const span = addTableBtn.querySelector('span');
      if (span) span.innerHTML = currentLang === 'ar' ? '➕ إضافة طاولة' : '➕ Add Table';
    }
  }
  
  const editTableBtn = document.getElementById('editTableBtn');
  if (editTableBtn) {
    editTableBtn.style.display = canDo('edit_tables') ? 'flex' : 'none';
    if (canDo('edit_tables')) {
      const span = editTableBtn.querySelector('span');
      if (span) span.innerHTML = currentLang === 'ar' ? 'تعديل طاولة' : 'Edit Table';
    }
  }
  
  const deleteTableBtn = document.getElementById('deleteTableBtn');
  if (deleteTableBtn) {
    deleteTableBtn.style.display = canDo('delete_tables') ? 'flex' : 'none';
    if (canDo('delete_tables')) {
      const span = deleteTableBtn.querySelector('span');
      if (span) span.innerHTML = currentLang === 'ar' ? 'حذف طاولة' : 'Delete Table';
    }
  }
  
  const moveTableBtn = document.getElementById('moveTableBtn');
  if (moveTableBtn) {
    moveTableBtn.style.display = canDo('move_tables') ? 'flex' : 'none';
    if (canDo('move_tables')) {
      const span = moveTableBtn.querySelector('span');
      if (span) span.innerHTML = currentLang === 'ar' ? 'تحريك طاولات' : 'Move Tables';
    }
  }
  
  const usersSection = document.querySelector('[data-menu="users"]');
  if (usersSection) {
    usersSection.style.display = canDo('manage_users') ? 'block' : 'none';
  }
  
  const zonesItem = document.querySelector('[data-view="zones-list"]');
  if (zonesItem) {
    zonesItem.style.display = canDo('manage_zones') ? 'flex' : 'none';
  }
  
  const floorsItem = document.querySelector('[data-view="floors-list"]');
  if (floorsItem) {
    floorsItem.style.display = canDo('manage_floors') ? 'flex' : 'none';
  }
  
  const reportsSection = document.querySelector('[data-menu="reports"]');
  if (reportsSection) {
    reportsSection.style.display = canDo('view_reports') ? 'block' : 'none';
  }
  
const settingsSection = document.querySelector('[data-menu="settings"]');
if (settingsSection) {
  settingsSection.style.display = canDo('manage_settings') ? 'block' : 'none';
}

// إضافة زر الدعم الحي داخل قسم إدارة الفرع بعد ضبط الصلاحيات
if (canDo('manage_settings') && typeof addBusinessSupportSidebarButton === 'function') {
  setTimeout(addBusinessSupportSidebarButton, 300);
}
}

// ============================================================
// USER MANAGEMENT MODALS
// ============================================================

function openUsersModal() {
  document.getElementById('usersModal').classList.add('show');
  loadUsers();
}

function closeUsersModal() {
  document.getElementById('usersModal').classList.remove('show');
  document.getElementById('addUserForm').style.display = 'none';
}

function showAddUserForm() {
  document.getElementById('addUserForm').style.display = 'block';
  document.getElementById('newUsername').value = '';
  document.getElementById('newDisplayName').value = '';
  document.getElementById('newPassword').value = '';
}

function cancelAddUser() {
  document.getElementById('addUserForm').style.display = 'none';
}

async function loadUsers() {
  const businessId = currentUser?.business_id;
  
  if (!businessId) {
    console.warn('لا يمكن تحديد المطعم للمستخدم الحالي');
    return;
  }
  
  const { data: users, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  
  if (error) return;
  
  const container = document.getElementById('usersList');
  if (!container) return;
  
  container.innerHTML = users.map(u => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-color);">
      <div>
        <strong>${u.display_name}</strong>
        <span style="color: var(--gray-500); font-size: 12px; margin-right: 8px;">@${u.username}</span>
        <span style="background: var(--gray-200); padding: 2px 8px; border-radius: 10px; font-size: 11px;">${u.role}</span>
      </div>
      <button class="modal-btn" style="background: var(--danger); padding: 6px 12px; min-height: auto; font-size: 12px;" onclick="deleteUser('${u.id}', '${u.username}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

async function saveUser() {
  const email = document.getElementById('newUsername').value.trim();
  const displayName = document.getElementById('newDisplayName').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;
  
  if (!email || !displayName || !password) {
    showAlert('جميع الحقول مطلوبة');
    return;
  }
  
try {
  // ============================================================
  // PACKAGE LIMIT CHECK - USERS
  // فحص حد المستخدمين حسب باقة الاشتراك
  // null في max_users يعني بدون حد
  // ============================================================
  const { data: usageRows, error: usageError } = await supabase
    .rpc('get_my_license_usage');

  if (usageError) {
    console.error('License usage check error:', usageError);
    showAlert('تعذر التحقق من حدود الباقة. حاول مرة أخرى.');
    return;
  }

  const usage = Array.isArray(usageRows) ? usageRows[0] : null;

  if (!usage) {
    showAlert('لا يمكن قراءة حدود باقة الاشتراك لهذا المطعم.');
    return;
  }

  if (usage.max_users !== null && usage.user_limit_reached === true) {
    showAlert(`وصلت للحد الأقصى للمستخدمين في باقتك الحالية (${usage.current_users_count} من ${usage.max_users}).`);
    return;
  }

  const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: email,
        password: password,
        display_name: displayName,
        role: role,
        business_id: currentUser?.business_id
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
if (error) {
  console.error('Create user edge function error:', error);

  let edgeMessage = error.message || 'فشل استدعاء دالة إنشاء المستخدم';

  try {
    if (error.context && typeof error.context.json === 'function') {
      const errorBody = await error.context.json();
      console.error('Create user edge function error body:', errorBody);

      edgeMessage =
        errorBody?.message ||
        errorBody?.error ||
        JSON.stringify(errorBody);
    }
  } catch (parseErr) {
    console.warn('Could not parse create-user error body:', parseErr);
  }

let friendlyMessage = edgeMessage;

if (
  edgeMessage.includes('Unable to validate email address') ||
  edgeMessage.includes('invalid format')
) {
  friendlyMessage = 'البريد الإلكتروني غير صحيح. الرجاء إدخال بريد كامل مثل: name@example.com';
}

if (
  edgeMessage.includes('already registered') ||
  edgeMessage.includes('already exists') ||
  edgeMessage.includes('User already registered')
) {
  friendlyMessage = 'هذا البريد الإلكتروني مستخدم مسبقًا. الرجاء استخدام بريد آخر.';
}

if (
  edgeMessage.includes('Password') ||
  edgeMessage.includes('password')
) {
  friendlyMessage = 'كلمة المرور غير مقبولة. اجعلها 6 أحرف أو أكثر.';
}

throw new Error(friendlyMessage);
}

if (!data || data.success !== true) {
  console.error('Create user edge function response:', data);
  throw new Error(data?.message || data?.error || 'فشل إنشاء المستخدم من دالة create-user');
}
    
    showSuccessNotification('تم إضافة المستخدم بنجاح');
    cancelAddUser();
    loadUsers();
  } catch (err) {
    console.error(err);
    showAlert('فشل إضافة المستخدم: ' + err.message);
  }
}

async function deleteUser(userId, username) {
  if (username === 'admin' || username === 'super_admin') {
    showAlert('لا يمكن حذف المدير الرئيسي');
    return;
  }
  
  if (!confirm('هل أنت متأكد من حذف المستخدم ' + username + '؟')) return;
  
  const { error } = await supabase
    .from('app_users')
    .delete()
    .eq('id', userId);
  
  if (error) {
    showAlert('فشل حذف المستخدم');
    return;
  }
  
  showSuccessNotification('تم حذف المستخدم');
  loadUsers();
}

// ============================================================
// PERMISSIONS MODAL
// ============================================================

function openPermissionsModal() {
  document.getElementById('permissionsModal').classList.add('show');
  loadPermissions();
}

function closePermissionsModal() {
  document.getElementById('permissionsModal').classList.remove('show');
}

async function loadPermissions() {
  const { data: permissions, error } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role');
  
  console.log('Permissions loaded:', permissions);
  
  if (error) return;
  
  const roles = ['admin', 'manager', 'staff'];
  const roleNames = { admin: 'مدير النظام', manager: 'مشرف', staff: 'موظف' };
  
  const container = document.getElementById('permissionsList');
  if (!container) return;
  
  container.innerHTML = roles.map(role => {
    const rolePermissions = permissions.filter(p => p.role === role);
    
    return `
      <div style="margin-bottom: 20px; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
        <h4 style="margin-bottom: 12px; color: var(--primary);">${roleNames[role]}</h4>
        ${PERMISSION_KEYS.map(p => {
          const perm = rolePermissions.find(rp => rp.permission_key === p.key);
          const isEnabled = perm ? perm.is_enabled : false;
          return `
            <div class="zone-item" style="padding: 8px 12px; margin-bottom: 4px;">
              <span style="font-size: 13px;">${currentLang === 'ar' ? p.ar : p.en}</span>
              <button class="toggle-switch ${isEnabled ? 'active' : ''}" 
                      onclick="this.classList.toggle('active')" 
                      data-role="${role}" 
                      data-key="${p.key}">
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

async function savePermissions() {
  const buttons = document.querySelectorAll('#permissionsList .toggle-switch');
  const total = buttons.length;
  let completed = 0;
  
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--card-bg); padding: 20px 30px; border-radius: 16px;
    box-shadow: var(--shadow-lg); z-index: 10000; text-align: center;
    min-width: 250px;
  `;
  progressBar.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">
      <i class="fas fa-spinner fa-pulse" style="color: var(--primary); margin-right: 8px;"></i>
      جاري حفظ الصلاحيات...
    </div>
    <div style="background: var(--gray-200); border-radius: 10px; height: 8px; overflow: hidden;">
      <div id="progressFill" style="background: var(--primary); height: 100%; width: 0%; border-radius: 10px; transition: width 0.2s;"></div>
    </div>
    <div id="progressText" style="margin-top: 6px; font-size: 12px; color: var(--gray-500);">0%</div>
  `;
  document.body.appendChild(progressBar);
  
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  
  for (const btn of buttons) {
    const role = btn.getAttribute('data-role');
    const key = btn.getAttribute('data-key');
    const isEnabled = btn.classList.contains('active');
    
    await supabase
      .from('role_permissions')
      .upsert({ role: role, permission_key: key, is_enabled: isEnabled }, { onConflict: 'role,permission_key' });
    
    completed++;
    const percent = Math.round((completed / total) * 100);
    if (fill) fill.style.width = percent + '%';
    if (text) text.innerText = percent + '%';
  }
  
  setTimeout(() => {
    progressBar.remove();
    closePermissionsModal();
    showSuccessNotification('✅ تم حفظ الصلاحيات بنجاح');
  }, 500);
}


// ============================================================
// SUPER ADMIN DASHBOARD
// ============================================================
function showSuperAdminDashboard() {
  // إخفاء واجهة المطعم بالكامل
  const appContainer = document.querySelector('.app-container');
  const topbar = document.querySelector('.topbar');
  const sidebar = document.getElementById('sidebar');
  const loginOverlay = document.getElementById('loginOverlay');

  if (appContainer) appContainer.style.display = 'none';
  if (topbar) topbar.style.display = 'none';
  if (sidebar) sidebar.style.display = 'none';
  if (loginOverlay) loginOverlay.style.display = 'none';

  document.body.classList.add('logged-in');
  document.body.classList.add('super-admin-mode');

  // إزالة أي لوحة موجودة مسبقًا
  const existingDashboard = document.getElementById('superAdminDashboard');
  if (existingDashboard) existingDashboard.remove();

  const dashboardHtml = `
    <div id="superAdminDashboard" style="
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: #F3F4F6;
      direction: rtl;
      font-family: inherit;
      color: #111827;
      overflow: hidden;
    ">
      <div style="
        height: 64px;
        background: linear-gradient(135deg, #070219 0%, #060427 48%, #0E146D 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.18);
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 42px;
            height: 42px;
            border-radius: 14px;
            background: rgba(255,255,255,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #F4D28A;
            font-size: 20px;
          ">
            <i class="fas fa-crown"></i>
          </div>

          <div>
            <div style="font-size: 18px; font-weight: 900; line-height: 1.2;">
              EASY-Q Super Admin
            </div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.72); margin-top: 3px;">
              لوحة إدارة النظام والاشتراكات
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="text-align: left;">
            <div style="font-size: 13px; font-weight: 800;">
              ${currentUser?.display_name || 'Super Admin'}
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">
              مدير عام
            </div>
          </div>

          <button onclick="logoutAndClean()" style="
            border: 1px solid rgba(255,255,255,0.20);
            background: rgba(255,255,255,0.10);
            color: #ffffff;
            padding: 9px 14px;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 800;
          ">
            <i class="fas fa-sign-out-alt"></i>
            تسجيل خروج
          </button>
        </div>
      </div>

      <div style="
        height: calc(100vh - 64px);
        display: grid;
        grid-template-columns: 250px 1fr;
        overflow: hidden;
      ">
        <aside style="
          background: #ffffff;
          border-left: 1px solid #E5E7EB;
          padding: 18px 14px;
          overflow-y: auto;
        ">
          <div style="
            font-size: 12px;
            font-weight: 900;
            color: #6B7280;
            margin: 0 8px 12px;
          ">
            أقسام لوحة الإدارة
          </div>

          <button class="super-admin-nav active" data-super-view="overview" style="
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            border: none;
            background: #0E146D;
            color: white;
            padding: 12px 14px;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 900;
            margin-bottom: 8px;
            text-align: right;
          ">
            <i class="fas fa-chart-pie"></i>
            الرئيسية
          </button>

          <button class="super-admin-nav" data-super-view="subscriptions" style="
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            border: none;
            background: transparent;
            color: #111827;
            padding: 12px 14px;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 800;
            margin-bottom: 8px;
            text-align: right;
          ">
            <i class="fas fa-credit-card"></i>
            الاشتراكات
          </button>

          <button class="super-admin-nav" data-super-view="restaurants" style="
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            border: none;
            background: transparent;
            color: #111827;
            padding: 12px 14px;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 800;
            margin-bottom: 8px;
            text-align: right;
          ">
            <i class="fas fa-store"></i>
            المطاعم
          </button>

          <button class="super-admin-nav" data-super-view="alerts" style="
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            border: none;
            background: transparent;
            color: #111827;
            padding: 12px 14px;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 800;
            margin-bottom: 8px;
            text-align: right;
          ">
            <i class="fas fa-bell"></i>
            التنبيهات
          </button>

          <button class="super-admin-nav" data-super-view="support" style="
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  color: #111827;
  padding: 12px 14px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 800;
  margin-bottom: 8px;
  text-align: right;
">
  <i class="fas fa-headset"></i>
  الدعم الحي
</button>

          <div style="
            margin-top: 20px;
            padding: 14px;
            border-radius: 16px;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            color: #6B7280;
            font-size: 12px;
            line-height: 1.7;
          ">
            هذه اللوحة مستقلة عن واجهة المطعم ولا تعرض عناصر التشغيل اليومية.
          </div>
        </aside>

        <main style="
          overflow-y: auto;
          padding: 24px;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 22px;
          ">
            <div>
              <h1 style="margin: 0; font-size: 26px; color: #111827;">
                لوحة الإدارة العامة
              </h1>
              <p style="margin: 7px 0 0; color: #6B7280; font-size: 14px;">
                متابعة المطاعم، الاشتراكات، حدود الباقات، وحالة الوصول للنظام.
              </p>
            </div>

            <button onclick="loadSuperAdminData()" style="
              border: none;
              background: #0E146D;
              color: white;
              padding: 11px 16px;
              border-radius: 12px;
              cursor: pointer;
              font-weight: 900;
              box-shadow: 0 6px 14px rgba(14,20,109,0.18);
            ">
              <i class="fas fa-sync-alt"></i>
              تحديث البيانات
            </button>
          </div>

          <section id="superAdminOverview">
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
              gap: 16px;
              margin-bottom: 22px;
            ">
              <div style="background:#ffffff; border-radius:18px; padding:18px; box-shadow:0 4px 14px rgba(0,0,0,0.05); border:1px solid #E5E7EB;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div>
                    <div style="color:#6B7280; font-size:12px; font-weight:800;">إجمالي المطاعم</div>
                    <h3 id="totalBusinesses" style="margin:8px 0 0; font-size:28px;">0</h3>
                  </div>
                  <i class="fas fa-store" style="font-size:28px; color:#0E146D;"></i>
                </div>
              </div>

              <div style="background:#ffffff; border-radius:18px; padding:18px; box-shadow:0 4px 14px rgba(0,0,0,0.05); border:1px solid #E5E7EB;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div>
                    <div style="color:#6B7280; font-size:12px; font-weight:800;">إجمالي المستخدمين</div>
                    <h3 id="totalUsers" style="margin:8px 0 0; font-size:28px;">0</h3>
                  </div>
                  <i class="fas fa-users" style="font-size:28px; color:#0E146D;"></i>
                </div>
              </div>

              <div style="background:#ffffff; border-radius:18px; padding:18px; box-shadow:0 4px 14px rgba(0,0,0,0.05); border:1px solid #E5E7EB;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div>
                    <div style="color:#6B7280; font-size:12px; font-weight:800;">اشتراكات فعالة</div>
                    <h3 id="activeLicenses" style="margin:8px 0 0; font-size:28px;">0</h3>
                  </div>
                  <i class="fas fa-check-circle" style="font-size:28px; color:#10B981;"></i>
                </div>
              </div>

              <div style="background:#ffffff; border-radius:18px; padding:18px; box-shadow:0 4px 14px rgba(0,0,0,0.05); border:1px solid #E5E7EB;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div>
                    <div style="color:#6B7280; font-size:12px; font-weight:800;">تنتهي خلال 7 أيام</div>
                    <h3 id="expiringSoon" style="margin:8px 0 0; font-size:28px;">0</h3>
                  </div>
                  <i class="fas fa-clock" style="font-size:28px; color:#F59E0B;"></i>
                </div>
              </div>
              <div style="background:#ffffff; border-radius:18px; padding:18px; box-shadow:0 4px 14px rgba(0,0,0,0.05); border:1px solid #E5E7EB;">
  <div style="display:flex; align-items:center; justify-content:space-between;">
    <div>
      <div style="color:#6B7280; font-size:12px; font-weight:800;">اشتراكات منتهية</div>
      <h3 id="expiredLicenses" style="margin:8px 0 0; font-size:28px;">0</h3>
    </div>
    <i class="fas fa-times-circle" style="font-size:28px; color:#DC2626;"></i>
  </div>
</div>
            </div>

            <div style="
              background: #ffffff;
              border-radius: 20px;
              border: 1px solid #E5E7EB;
              box-shadow: 0 4px 14px rgba(0,0,0,0.05);
              overflow: hidden;
            ">
              <div style="
                padding: 16px 18px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #E5E7EB;
              ">
                <div>
                  <div style="font-size: 16px; font-weight: 900;">المطاعم والاشتراكات</div>
                  <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">عرض سريع لحالة كل مطعم</div>
                </div>
              </div>

              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: 980px;">
                  <thead style="background: #F9FAFB; color: #374151;">
                    <tr>
                      <th style="padding: 12px; text-align:right;">#</th>
                      <th style="padding: 12px; text-align:right;">المطعم</th>
                      <th style="padding: 12px; text-align:right;">المدينة</th>
                      <th style="padding: 12px; text-align:right;">الجوال</th>
                      <th style="padding: 12px; text-align:right;">الخطة</th>
                      <th style="padding: 12px; text-align:right;">الانتهاء</th>
                      <th style="padding: 12px; text-align:right;">الأيام</th>
                      <th style="padding: 12px; text-align:right;">الاستخدام</th>
                      <th style="padding: 12px; text-align:right;">الحالة</th>
                      <th style="padding: 12px; text-align:right;">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody id="businessesTable">
                    <tr>
                      <td colspan="10" style="text-align:center; padding:40px; color:#6B7280;">
                        جاري تحميل بيانات الاشتراكات...
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          <section id="superAdminSupportView" style="display:none;">
  <div style="
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
  ">
    <div>
      <h2 style="margin: 0; font-size: 24px; color: #111827;">
        الدعم الحي
      </h2>
      <p style="margin: 7px 0 0; color: #6B7280; font-size: 14px;">
        متابعة جلسات الدعم بين إدارة EASY-Q والمطاعم.
      </p>
    </div>

    <button onclick="loadSuperAdminSupportSessions()" style="
      border: none;
      background: #0E146D;
      color: white;
      padding: 11px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 900;
      box-shadow: 0 6px 14px rgba(14,20,109,0.18);
    ">
      <i class="fas fa-sync-alt"></i>
      تحديث جلسات الدعم
    </button>
  </div>

  <div style="
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 16px;
    height: calc(100vh - 170px);
    min-height: 520px;
  ">
    <div style="
      background: #ffffff;
      border: 1px solid #E5E7EB;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
    ">
      <div style="
        padding: 14px 16px;
        border-bottom: 1px solid #E5E7EB;
        font-weight: 900;
        color: #111827;
      ">
        جلسات الدعم
      </div>

      <div id="supportSessionsList" style="
        overflow-y: auto;
        padding: 10px;
        flex: 1;
      ">
        <div style="padding: 30px; text-align: center; color: #6B7280;">
          اضغط تحديث جلسات الدعم
        </div>
      </div>
    </div>

    <div style="
      background: #ffffff;
      border: 1px solid #E5E7EB;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
    ">
      <div id="supportChatHeader" style="
        padding: 14px 16px;
        border-bottom: 1px solid #E5E7EB;
        font-weight: 900;
        color: #111827;
      ">
        اختر جلسة دعم لعرض المحادثة
      </div>

      <div id="supportMessagesList" style="
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #F9FAFB;
      ">
        <div style="padding: 40px; text-align: center; color: #6B7280;">
          لا توجد جلسة محددة
        </div>
      </div>

      <div style="
        padding: 12px;
        border-top: 1px solid #E5E7EB;
        display: flex;
        gap: 10px;
        background: #ffffff;
      ">
        <input id="supportReplyInput" type="text" placeholder="اكتب ردك هنا..." style="
          flex: 1;
          border: 1px solid #D1D5DB;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          outline: none;
        ">

        <button onclick="sendSuperAdminSupportReply()" style="
          border: none;
          background: #0E146D;
          color: white;
          padding: 0 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 900;
        ">
          <i class="fas fa-paper-plane"></i>
          إرسال
        </button>
      </div>
    </div>
  </div>
</section>
        </main>
      </div>
    </div>
  `;

document.body.insertAdjacentHTML('beforeend', dashboardHtml);

setupSuperAdminNavigation();

// تحميل بيانات السوبر أدمن
loadSuperAdminData();
}

function setupSuperAdminNavigation() {
  const navButtons = document.querySelectorAll('.super-admin-nav');

  navButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const view = button.getAttribute('data-super-view');

      navButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#111827';
      });

      button.classList.add('active');
      button.style.background = '#0E146D';
      button.style.color = '#ffffff';

      const overviewView = document.getElementById('superAdminOverview');
      const supportView = document.getElementById('superAdminSupportView');

      if (overviewView) overviewView.style.display = 'none';
      if (supportView) supportView.style.display = 'none';

if (view === 'support') {
  if (supportView) supportView.style.display = 'block';

  if (typeof renderSuperAdminSupportCodeBox === 'function') {
    renderSuperAdminSupportCodeBox();
  }

  await loadSuperAdminSupportSessions();
  return;
}

      if (overviewView) overviewView.style.display = 'block';
    });
  });
}

function renderSuperAdminSupportCodeBox() {
  const supportView = document.getElementById('superAdminSupportView');

  if (!supportView) return;

  // منع التكرار
  if (document.getElementById('superAdminSupportCodeBox')) return;

  supportView.insertAdjacentHTML('afterbegin', `
    <div id="superAdminSupportCodeBox" style="
      background: #ffffff;
      border: 1px solid #E5E7EB;
      border-radius: 18px;
      padding: 14px;
      margin-bottom: 16px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    ">
      <div style="flex: 1; min-width: 220px;">
        <div style="font-weight: 900; color: #111827; margin-bottom: 4px;">
          فتح جلسة دعم برمز المطعم
        </div>
        <div style="font-size: 12px; color: #6B7280;">
          أدخل رمز الدعم الذي أنشأه المطعم مثل EQ-123456
        </div>
      </div>

      <input
        type="text"
        id="superAdminSupportCodeInput"
        placeholder="EQ-123456"
        style="
          width: 170px;
          border: 1px solid #D1D5DB;
          border-radius: 12px;
          padding: 11px 12px;
          font-size: 14px;
          font-weight: 900;
          direction: ltr;
          text-align: center;
          outline: none;
        "
      >

      <input
        type="text"
        id="superAdminSupportSubjectInput"
        placeholder="عنوان الجلسة"
        value="طلب دعم"
        style="
          width: 190px;
          border: 1px solid #D1D5DB;
          border-radius: 12px;
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
        "
      >

      <button type="button" onclick="verifySuperAdminSupportCodeFromUI()" style="
        border: none;
        background: #0E146D;
        color: white;
        padding: 11px 16px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 900;
      ">
        <i class="fas fa-unlock-alt"></i>
        فتح الجلسة
      </button>
    </div>
  `);
}

async function verifySuperAdminSupportCodeFromUI() {
  try {
    if (currentUser?.role !== 'super_admin') {
      alert('هذه العملية متاحة للسوبر أدمن فقط');
      return;
    }

    const codeInput = document.getElementById('superAdminSupportCodeInput');
    const subjectInput = document.getElementById('superAdminSupportSubjectInput');

    const code = codeInput?.value.trim();
    const subject = subjectInput?.value.trim() || 'طلب دعم';

    if (!code) {
      alert('أدخل رمز الدعم أولًا');
      return;
    }

    const { data, error } = await supabase.rpc('super_admin_verify_support_code', {
      p_code: code,
      p_subject: subject
    });

    if (error) {
      console.error('فشل التحقق من رمز الدعم:', error);
      alert('فشل فتح جلسة الدعم: ' + error.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (row && row.success === false) {
      alert(row.message || 'لم يتم فتح جلسة الدعم');
      return;
    }

    if (codeInput) codeInput.value = '';

    alert('تم فتح جلسة الدعم بنجاح');

    await loadSuperAdminSupportSessions();

  } catch (err) {
    console.error('خطأ غير متوقع أثناء فتح جلسة الدعم:', err);
    alert('حدث خطأ أثناء فتح جلسة الدعم');
  }
}

async function loadSuperAdminSupportSessions() {
  try {
    const container = document.getElementById('supportSessionsList');

    if (!container) return;

    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #6B7280;">
        جاري تحميل جلسات الدعم...
      </div>
    `;

    const { data, error } = await supabase
      .rpc('super_admin_list_support_sessions');

    if (error) throw error;

    const sessions = Array.isArray(data) ? data : [];

    if (sessions.length === 0) {
      container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #6B7280;">
          لا توجد جلسات دعم حتى الآن
        </div>
      `;
      return;
    }

    container.innerHTML = sessions.map(session => {
      const statusLabel =
        session.status === 'open' ? 'مفتوحة' :
        session.status === 'pending' ? 'بانتظار الرد' :
        session.status === 'closed' ? 'مغلقة' :
        'غير معروف';

      const statusColor =
        session.status === 'open' ? '#10B981' :
        session.status === 'pending' ? '#F59E0B' :
        session.status === 'closed' ? '#6B7280' :
        '#6B7280';

      const lastMessageTime = session.last_message_created_at
        ? new Date(session.last_message_created_at).toLocaleString('ar-SA')
        : '-';

      const unreadBadge = Number(session.unread_for_super_admin_count || 0) > 0
        ? `<span style="
            background:#DC2626;
            color:white;
            font-size:11px;
            font-weight:900;
            border-radius:999px;
            padding:3px 8px;
          ">${session.unread_for_super_admin_count}</span>`
        : '';

      return `
        <div onclick="openSuperAdminSupportSession('${session.session_id}')" style="
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 10px;
          cursor: pointer;
          background: #FFFFFF;
          transition: 0.15s;
        ">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div>
              <div style="font-weight:900; color:#111827;">
                ${session.business_name || '-'}
              </div>
              <div style="font-size:12px; color:#6B7280; margin-top:4px;">
                ${session.subject || 'طلب دعم'}
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:6px;">
              ${unreadBadge}
              <span style="
                background:${statusColor};
                color:white;
                font-size:11px;
                font-weight:900;
                border-radius:999px;
                padding:4px 8px;
                white-space:nowrap;
              ">
                ${statusLabel}
              </span>
            </div>
          </div>

          <div style="
            font-size:12px;
            color:#374151;
            margin-top:10px;
            line-height:1.5;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${session.last_message_body || 'لا توجد رسائل'}
          </div>

          <div style="font-size:11px; color:#9CA3AF; margin-top:8px;">
            آخر نشاط: ${lastMessageTime}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('خطأ في تحميل جلسات الدعم:', err);

    const container = document.getElementById('supportSessionsList');
    if (container) {
      container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #DC2626;">
          فشل تحميل جلسات الدعم
        </div>
      `;
    }
  }
}

let currentSupportSessionId = null;

function renderSuperAdminSupportMessagesHtml(messages) {
  return messages.map(msg => {
    const isSuperAdmin = msg.sender_role === 'super_admin';
    const isSystem = msg.message_type === 'system';

    if (isSystem) {
      return `
        <div style="
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 6px 0;
        ">
          <span style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            max-width: 70%;
            background: #E5E7EB;
            color: #6B7280;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 10.5px;
            line-height: 1.25;
            text-align: center;
          ">
            ${msg.message_body || ''}
          </span>
        </div>
      `;
    }

    const timeText = msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    return `
      <div style="
        width: 100%;
        display: flex;
        justify-content: ${isSuperAdmin ? 'flex-start' : 'flex-end'};
        margin-bottom: 7px;
      ">
        <div style="
          display: inline-flex;
          flex-direction: column;
          width: max-content;
          min-width: 0;
          max-width: min(58%, 460px);
          background: ${isSuperAdmin ? '#0E146D' : '#FFFFFF'};
          color: ${isSuperAdmin ? '#FFFFFF' : '#111827'};
          border: 1px solid ${isSuperAdmin ? '#0E146D' : '#E5E7EB'};
          border-radius: ${isSuperAdmin ? '12px 12px 4px 12px' : '12px 12px 12px 4px'};
          padding: 5px 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.035);
        ">
          <span style="
            display: block;
            font-size: 12.5px;
            line-height: 1.35;
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
            padding: 0;
          ">${msg.message_body || ''}</span>

          <span style="
            display: block;
            align-self: flex-end;
            font-size: 8.5px;
            line-height: 1;
            margin-top: 3px;
            opacity: 0.55;
            color: ${isSuperAdmin ? 'rgba(255,255,255,0.72)' : '#6B7280'};
          ">${timeText}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function openSuperAdminSupportSession(sessionId) {
  try {
currentSupportSessionId = sessionId;

// تعليم رسائل المطعم كمقروءة للسوبر أدمن عند فتح الجلسة
try {
  await supabase.rpc('mark_support_session_read', {
    p_session_id: sessionId
  });
} catch (readErr) {
  console.warn('تعذر تعليم رسائل الدعم كمقروءة:', readErr);
}

const header = document.getElementById('supportChatHeader');
const messagesContainer = document.getElementById('supportMessagesList');

    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #6B7280;">
          جاري تحميل المحادثة...
        </div>
      `;
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .rpc('super_admin_list_support_sessions');

    if (sessionsError) throw sessionsError;

    const sessions = Array.isArray(sessionsData) ? sessionsData : [];
    const session = sessions.find(item => item.session_id === sessionId);

if (header && session) {
  const statusLabel =
    session.status === 'open' ? 'مفتوحة' :
    session.status === 'pending' ? 'بانتظار الرد' :
    session.status === 'closed' ? 'مغلقة' :
    session.status;

  const closeButton = session.status !== 'closed'
    ? `
      <button onclick="closeSuperAdminSupportSession('${session.session_id}')" style="
        border: none;
        background: #DC2626;
        color: white;
        padding: 9px 13px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 900;
        font-size: 12px;
      ">
        <i class="fas fa-times-circle"></i>
        إغلاق الجلسة
      </button>
    `
    : `
      <span style="
        background: #F3F4F6;
        color: #6B7280;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
      ">
        الجلسة مغلقة
      </span>
    `;

  header.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      width:100%;
    ">
      <div>
        <div style="font-weight:900; color:#111827;">
          ${session.business_name || '-'}
        </div>
        <div style="font-size:12px; color:#6B7280; margin-top:4px;">
          ${session.subject || 'طلب دعم'} · ${statusLabel}
        </div>
      </div>

      ${closeButton}
    </div>
  `;
}

const replyInput = document.getElementById('supportReplyInput');
const replyButton = document.querySelector('button[onclick="sendSuperAdminSupportReply()"]');

if (session && session.status === 'closed') {
  if (replyInput) {
    replyInput.value = '';
    replyInput.disabled = true;
    replyInput.placeholder = 'لا يمكن الرد على جلسة مغلقة';
  }

  if (replyButton) {
    replyButton.disabled = true;
    replyButton.style.opacity = '0.5';
    replyButton.style.cursor = 'not-allowed';
  }
} else {
  if (replyInput) {
    replyInput.disabled = false;
    replyInput.placeholder = 'اكتب ردك هنا...';
  }

  if (replyButton) {
    replyButton.disabled = false;
    replyButton.style.opacity = '1';
    replyButton.style.cursor = 'pointer';
  }
}

    const { data: messagesData, error: messagesError } = await supabase
      .rpc('get_support_session_messages', {
        p_session_id: sessionId
      });

    if (messagesError) throw messagesError;

    const messages = Array.isArray(messagesData) ? messagesData : [];

    if (!messagesContainer) return;

    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #6B7280;">
          لا توجد رسائل في هذه الجلسة
        </div>
      `;
      return;
    }

messagesContainer.innerHTML = renderSuperAdminSupportMessagesHtml(messages);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    startSuperAdminSupportAutoRefresh();

  } catch (err) {
    console.error('خطأ في فتح جلسة الدعم:', err);

    const messagesContainer = document.getElementById('supportMessagesList');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #DC2626;">
          فشل تحميل المحادثة
        </div>
      `;
    }
  }
}

let superAdminSupportRefreshInterval = null;
let isSuperAdminSupportRefreshing = false;

function startSuperAdminSupportAutoRefresh() {
  stopSuperAdminSupportAutoRefresh();

  superAdminSupportRefreshInterval = setInterval(async function () {
    const supportView = document.getElementById('superAdminSupportView');

    if (!supportView || supportView.style.display === 'none') {
      stopSuperAdminSupportAutoRefresh();
      return;
    }

    if (!currentSupportSessionId) return;
    if (isSuperAdminSupportRefreshing) return;

    try {
      isSuperAdminSupportRefreshing = true;
      await refreshSuperAdminSupportSessionSilently(currentSupportSessionId);
    } catch (err) {
      console.warn('تعذر تحديث محادثة السوبر أدمن صامتًا:', err);
    } finally {
      isSuperAdminSupportRefreshing = false;
    }
  }, 7000);
}

function stopSuperAdminSupportAutoRefresh() {
  if (superAdminSupportRefreshInterval) {
    clearInterval(superAdminSupportRefreshInterval);
    superAdminSupportRefreshInterval = null;
  }
}

async function refreshSuperAdminSupportSessionSilently(sessionId) {
  if (!sessionId) return;
  if (currentUser?.role !== 'super_admin') return;

  const header = document.getElementById('supportChatHeader');
  const messagesContainer = document.getElementById('supportMessagesList');
  const replyInput = document.getElementById('supportReplyInput');
  const replyButton = document.querySelector('button[onclick="sendSuperAdminSupportReply()"]');

  if (!messagesContainer) return;

  const { data: sessionsData, error: sessionsError } = await supabase
    .rpc('super_admin_list_support_sessions');

  if (sessionsError) {
    console.warn('تعذر تحديث حالة جلسة الدعم للسوبر أدمن صامتًا:', sessionsError);
    return;
  }

  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  const session = sessions.find(item => item.session_id === sessionId);

  if (!session) return;

  const statusLabel =
    session.status === 'open' ? 'مفتوحة' :
    session.status === 'pending' ? 'بانتظار الرد' :
    session.status === 'closed' ? 'مغلقة' :
    session.status;

  const closeButton = session.status !== 'closed'
    ? `
      <button onclick="closeSuperAdminSupportSession('${session.session_id}')" style="
        border: none;
        background: #DC2626;
        color: white;
        padding: 9px 13px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 900;
        font-size: 12px;
      ">
        <i class="fas fa-times-circle"></i>
        إغلاق الجلسة
      </button>
    `
    : `
      <span style="
        background: #F3F4F6;
        color: #6B7280;
        padding: 7px 11px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
      ">
        الجلسة مغلقة
      </span>
    `;

  const newHeaderSignature = JSON.stringify({
    session_id: session.session_id,
    status: session.status,
    subject: session.subject,
    business_name: session.business_name
  });

  if (header && header.dataset.headerSignature !== newHeaderSignature) {
    header.dataset.headerSignature = newHeaderSignature;

    header.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        width:100%;
      ">
        <div>
          <div style="font-weight:900; color:#111827;">
            ${session.business_name || '-'}
          </div>
          <div style="font-size:12px; color:#6B7280; margin-top:4px;">
            ${session.subject || 'طلب دعم'} · ${statusLabel}
          </div>
        </div>

        ${closeButton}
      </div>
    `;
  }

  if (session.status === 'closed') {
    if (replyInput) {
      replyInput.value = '';
      replyInput.disabled = true;
      replyInput.placeholder = 'لا يمكن الرد على جلسة مغلقة';
    }

    if (replyButton) {
      replyButton.disabled = true;
      replyButton.style.opacity = '0.5';
      replyButton.style.cursor = 'not-allowed';
    }
  } else {
    if (replyInput) {
      replyInput.disabled = false;
      replyInput.placeholder = 'اكتب ردك هنا...';
    }

    if (replyButton) {
      replyButton.disabled = false;
      replyButton.style.opacity = '1';
      replyButton.style.cursor = 'pointer';
    }
  }

  try {
    await supabase.rpc('mark_support_session_read', {
      p_session_id: sessionId
    });
  } catch (readErr) {
    console.warn('تعذر تعليم رسائل المطعم كمقروءة أثناء تحديث السوبر أدمن:', readErr);
  }

  const { data: messagesData, error: messagesError } = await supabase
    .rpc('get_support_session_messages', {
      p_session_id: sessionId
    });

  if (messagesError) {
    console.warn('تعذر تحديث رسائل السوبر أدمن صامتًا:', messagesError);
    return;
  }

  const messages = Array.isArray(messagesData) ? messagesData : [];

  const newSignature = JSON.stringify(
    messages.map(msg => ({
      id: msg.id,
      body: msg.message_body,
      created_at: msg.created_at,
      sender_role: msg.sender_role,
      message_type: msg.message_type
    }))
  );

  if (messagesContainer.dataset.messagesSignature === newSignature) {
    return;
  }

  messagesContainer.dataset.messagesSignature = newSignature;

  if (messages.length === 0) {
    messagesContainer.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #6B7280;">
        لا توجد رسائل في هذه الجلسة
      </div>
    `;
    return;
  }

  const wasNearBottom =
    messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 80;

  messagesContainer.innerHTML = renderSuperAdminSupportMessagesHtml(messages);

  if (wasNearBottom) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  await refreshSuperAdminSupportSessionsListSilently();
}

async function refreshSuperAdminSupportSessionsListSilently() {
  const container = document.getElementById('supportSessionsList');

  if (!container) return;

  const { data, error } = await supabase
    .rpc('super_admin_list_support_sessions');

  if (error) {
    console.warn('تعذر تحديث قائمة جلسات السوبر أدمن صامتًا:', error);
    return;
  }

  const sessions = Array.isArray(data) ? data : [];

  const newSignature = JSON.stringify(
    sessions.map(session => ({
      session_id: session.session_id,
      status: session.status,
      last_message_body: session.last_message_body,
      last_message_created_at: session.last_message_created_at,
      unread_for_super_admin_count: session.unread_for_super_admin_count
    }))
  );

  if (container.dataset.sessionsSignature === newSignature) {
    return;
  }

  container.dataset.sessionsSignature = newSignature;

  if (sessions.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #6B7280;">
        لا توجد جلسات دعم حتى الآن
      </div>
    `;
    return;
  }

  container.innerHTML = sessions.map(session => {
    const statusLabel =
      session.status === 'open' ? 'مفتوحة' :
      session.status === 'pending' ? 'بانتظار الرد' :
      session.status === 'closed' ? 'مغلقة' :
      'غير معروف';

    const statusColor =
      session.status === 'open' ? '#10B981' :
      session.status === 'pending' ? '#F59E0B' :
      session.status === 'closed' ? '#6B7280' :
      '#6B7280';

    const lastMessageTime = session.last_message_created_at
      ? new Date(session.last_message_created_at).toLocaleString('ar-SA')
      : '-';

    const unreadBadge = Number(session.unread_for_super_admin_count || 0) > 0
      ? `<span style="
          background:#DC2626;
          color:white;
          font-size:11px;
          font-weight:900;
          border-radius:999px;
          padding:3px 8px;
        ">${session.unread_for_super_admin_count}</span>`
      : '';

    const activeStyle = session.session_id === currentSupportSessionId
      ? 'border-color:#0E146D; box-shadow:0 0 0 3px rgba(14,20,109,0.08);'
      : '';

    return `
      <div onclick="openSuperAdminSupportSession('${session.session_id}')" style="
        border: 1px solid #E5E7EB;
        ${activeStyle}
        border-radius: 16px;
        padding: 12px;
        margin-bottom: 10px;
        cursor: pointer;
        background: #FFFFFF;
        transition: 0.15s;
      ">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <div style="font-weight:900; color:#111827;">
              ${session.business_name || '-'}
            </div>
            <div style="font-size:12px; color:#6B7280; margin-top:4px;">
              ${session.subject || 'طلب دعم'}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            ${unreadBadge}
            <span style="
              background:${statusColor};
              color:white;
              font-size:11px;
              font-weight:900;
              border-radius:999px;
              padding:4px 8px;
              white-space:nowrap;
            ">
              ${statusLabel}
            </span>
          </div>
        </div>

        <div style="
          font-size:12px;
          color:#374151;
          margin-top:10px;
          line-height:1.5;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        ">
          ${session.last_message_body || 'لا توجد رسائل'}
        </div>

        <div style="font-size:11px; color:#9CA3AF; margin-top:8px;">
          آخر نشاط: ${lastMessageTime}
        </div>
      </div>
    `;
  }).join('');
}

async function sendSuperAdminSupportReply() {
  try {
    if (!currentSupportSessionId) {
      alert('اختر جلسة دعم أولًا');
      return;
    }

    const input = document.getElementById('supportReplyInput');

    if (!input) {
      alert('حقل الرد غير موجود');
      return;
    }

    const messageBody = input.value.trim();

    if (!messageBody) {
      alert('اكتب رسالة قبل الإرسال');
      return;
    }

    input.disabled = true;

    const { data, error } = await supabase.rpc('send_support_message', {
      p_session_id: currentSupportSessionId,
      p_message_body: messageBody,
      p_is_internal: false
    });

    input.disabled = false;

    if (error) {
      console.error('فشل إرسال رد الدعم:', error);
      alert('فشل إرسال الرسالة');
      return;
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (row && row.success === false) {
      alert(row.message || 'فشل إرسال الرسالة');
      return;
    }

input.value = '';

await refreshSuperAdminSupportSessionSilently(currentSupportSessionId);

  } catch (err) {
    console.error('خطأ غير متوقع أثناء إرسال رد الدعم:', err);
    alert('فشل إرسال الرسالة');
  } finally {
    const input = document.getElementById('supportReplyInput');
    if (input) input.disabled = false;
  }
}

async function closeSuperAdminSupportSession(sessionId) {
  try {
    if (!sessionId) {
      alert('لم يتم تحديد جلسة الدعم');
      return;
    }

    const confirmed = confirm('هل تريد إغلاق جلسة الدعم؟ لن يتمكن المطعم من الرد عليها بعد الإغلاق.');

    if (!confirmed) return;

    const { data, error } = await supabase.rpc('super_admin_close_support_session', {
      p_session_id: sessionId
    });

    if (error) {
      console.error('فشل إغلاق جلسة الدعم:', error);
      alert('فشل إغلاق جلسة الدعم');
      return;
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (row && row.success === false) {
      alert(row.message || 'فشل إغلاق جلسة الدعم');
      return;
    }

    alert('تم إغلاق جلسة الدعم بنجاح');

    await loadSuperAdminSupportSessions();
    await openSuperAdminSupportSession(sessionId);

  } catch (err) {
    console.error('خطأ غير متوقع أثناء إغلاق جلسة الدعم:', err);
    alert('فشل إغلاق جلسة الدعم');
  }
}

async function loadSuperAdminData() {
  try {
    // جلب جميع المطاعم مع الاشتراكات والاستخدام من دالة السوبر أدمن الآمنة
    const { data: businesses, error } = await supabase
      .rpc('super_admin_list_subscriptions');

    if (error) throw error;

    const rows = Array.isArray(businesses) ? businesses : [];

    // تحديث الإحصائيات
    const totalBusinesses = rows.length;

    const totalUsers = rows.reduce((sum, b) => {
      return sum + Number(b.current_users_count || 0);
    }, 0);

    const activeLicenses = rows.filter(b => {
      return b.access_allowed === true &&
        ['active', 'trial', 'grace'].includes(b.effective_status);
    }).length;

    const expiringSoon = rows.filter(b => {
      return b.access_allowed === true &&
        Number(b.days_remaining || 0) > 0 &&
        Number(b.days_remaining || 0) <= 7;
    }).length;

    const expiredLicenses = rows.filter(b => {
      return b.effective_status === 'expired' ||
        b.access_allowed === false ||
        b.subscription_status === 'expired';
    }).length;

    const totalBusinessesEl = document.getElementById('totalBusinesses');
    const totalUsersEl = document.getElementById('totalUsers');
    const activeLicensesEl = document.getElementById('activeLicenses');
    const expiringSoonEl = document.getElementById('expiringSoon');
    const expiredLicensesEl = document.getElementById('expiredLicenses');

    if (totalBusinessesEl) totalBusinessesEl.innerText = totalBusinesses;
    if (totalUsersEl) totalUsersEl.innerText = totalUsers;
    if (activeLicensesEl) activeLicensesEl.innerText = activeLicenses;
    if (expiringSoonEl) expiringSoonEl.innerText = expiringSoon;
    if (expiredLicensesEl) expiredLicensesEl.innerText = expiredLicenses;

    // عرض الجدول
    const tableBody = document.getElementById('businessesTable');
    if (!tableBody) return;

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: #6B7280;">
            لا توجد مطاعم مسجلة بعد
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = rows.map((b, index) => {
      const planType = b.plan_type || 'بدون';
      const effectiveStatus = b.effective_status || 'unknown';
      const accessAllowed = b.access_allowed === true;

      const planColor =
        planType === 'enterprise' ? '#8B5CF6' :
        planType === 'pro' ? '#3B82F6' :
        planType === 'basic' ? '#10B981' :
        planType === 'trial' ? '#F59E0B' :
        '#6B7280';

      const statusLabel =
        effectiveStatus === 'active' ? 'نشط' :
        effectiveStatus === 'trial' ? 'تجريبي' :
        effectiveStatus === 'grace' ? 'فترة سماح' :
        effectiveStatus === 'expired' ? 'منتهي' :
        effectiveStatus === 'suspended' ? 'موقوف' :
        effectiveStatus === 'cancelled' ? 'ملغي' :
        accessAllowed ? 'مسموح' : 'غير مسموح';

      const statusColor =
        effectiveStatus === 'active' ? '#10B981' :
        effectiveStatus === 'trial' ? '#F59E0B' :
        effectiveStatus === 'grace' ? '#F97316' :
        effectiveStatus === 'expired' ? '#DC2626' :
        effectiveStatus === 'suspended' ? '#991B1B' :
        effectiveStatus === 'cancelled' ? '#6B7280' :
        accessAllowed ? '#10B981' : '#DC2626';

      const expiresAt = b.expires_at
        ? new Date(b.expires_at).toLocaleDateString('ar-SA')
        : '-';

      const daysText =
        b.days_remaining === null || b.days_remaining === undefined
          ? '-'
          : `${b.days_remaining} يوم`;

      const tableUsage = `${b.current_tables_count || 0}/${b.max_tables ?? '∞'}`;
      const userUsage = `${b.current_users_count || 0}/${b.max_users ?? '∞'}`;
      const zoneUsage = `${b.current_zones_count || 0}/${b.max_zones ?? '∞'}`;
      const floorUsage = `${b.current_floors_count || 0}/${b.max_floors ?? '∞'}`;

      return `
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px; text-align: center; color:#6B7280;">${index + 1}</td>

          <td style="padding: 12px;">
            <div style="font-weight: 900; color:#111827;">
              ${b.business_name || '-'}
            </div>
            <div style="font-size: 12px; color:#6B7280; margin-top:4px;">
              ${b.branch_name || 'بدون فرع'}
            </div>
          </td>

          <td style="padding: 12px; color:#374151;">
            ${b.city || '-'}
          </td>

          <td style="padding: 12px; color:#374151; direction:ltr; text-align:right;">
            ${b.phone || '-'}
          </td>

          <td style="padding: 12px;">
            <span style="
              background: ${planColor};
              color: white;
              padding: 5px 11px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            ">
              ${planType}
            </span>
          </td>

          <td style="padding: 12px; color:#374151;">
            ${expiresAt}
          </td>

          <td style="padding: 12px; color:#374151;">
            ${daysText}
          </td>

          <td style="padding: 12px;">
            <div style="font-size: 12px; line-height: 1.8; color:#374151;">
              <div>طاولات: <strong>${tableUsage}</strong></div>
              <div>مستخدمين: <strong>${userUsage}</strong></div>
              <div>مناطق: <strong>${zoneUsage}</strong></div>
              <div>أدوار: <strong>${floorUsage}</strong></div>
            </div>
          </td>

          <td style="padding: 12px;">
            <span style="
              background: ${statusColor};
              color: white;
              padding: 5px 11px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 800;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              white-space: nowrap;
            ">
              ${statusLabel}
            </span>
          </td>

          <td style="padding: 12px; white-space: nowrap;">
            <button onclick="viewBusinessDetails('${b.business_id}')" style="
              background: #0E146D;
              color: white;
              border: none;
              padding: 7px 10px;
              border-radius: 9px;
              cursor: pointer;
              margin-left: 6px;
            " title="عرض التفاصيل">
              <i class="fas fa-eye"></i>
            </button>

            <button onclick="toggleBusinessStatus('${b.business_id}')" style="
              background: #F59E0B;
              color: white;
              border: none;
              padding: 7px 10px;
              border-radius: 9px;
              cursor: pointer;
            " title="إدارة الحالة">
              <i class="fas fa-power-off"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('خطأ في تحميل بيانات super admin:', err);

    const tableBody = document.getElementById('businessesTable');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: #DC2626;">
            فشل تحميل البيانات
          </td>
        </tr>
      `;
    }
  }
}

async function viewBusinessDetails(businessId) {
  try {
    const { data: subscriptions, error: subError } = await supabase
      .rpc('super_admin_list_subscriptions');

    if (subError) throw subError;

    const rows = Array.isArray(subscriptions) ? subscriptions : [];
    const business = rows.find(item => item.business_id === businessId);

    if (!business) {
      alert('لم يتم العثور على بيانات هذا المطعم');
      return;
    }

    const { data: logs, error: logsError } = await supabase
      .from('subscription_activity_logs')
      .select(`
        id,
        action_type,
        action_title,
        action_description,
        old_values,
        new_values,
        actor_role,
        created_at
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) throw logsError;

    const oldModal = document.getElementById('businessDetailsModal');
    if (oldModal) oldModal.remove();

    const statusLabel =
      business.effective_status === 'active' ? 'نشط' :
      business.effective_status === 'trial' ? 'تجريبي' :
      business.effective_status === 'grace' ? 'فترة سماح' :
      business.effective_status === 'expired' ? 'منتهي' :
      business.effective_status === 'suspended' ? 'موقوف' :
      business.effective_status === 'cancelled' ? 'ملغي' :
      'غير معروف';

    const statusColor =
      business.effective_status === 'active' ? '#10B981' :
      business.effective_status === 'trial' ? '#F59E0B' :
      business.effective_status === 'grace' ? '#F97316' :
      business.effective_status === 'expired' ? '#DC2626' :
      business.effective_status === 'suspended' ? '#991B1B' :
      business.effective_status === 'cancelled' ? '#6B7280' :
      '#6B7280';

    const expiresAt = business.expires_at
      ? new Date(business.expires_at).toLocaleDateString('ar-SA')
      : '-';

    const formatLimit = (current, max) => {
      return `${current || 0}/${max ?? '∞'}`;
    };

    const formatLogDate = (dateValue) => {
      if (!dateValue) return '-';
      return new Date(dateValue).toLocaleString('ar-SA');
    };

    const logsHtml = (logs || []).length
      ? logs.map(log => `
        <div style="
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 10px;
          background: #FFFFFF;
        ">
          <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
            <div>
              <div style="font-weight:900; color:#111827;">
                ${log.action_title || '-'}
              </div>
              <div style="font-size:12px; color:#6B7280; margin-top:5px; line-height:1.6;">
                ${log.action_description || ''}
              </div>
            </div>
            <div style="font-size:11px; color:#6B7280; white-space:nowrap;">
              ${formatLogDate(log.created_at)}
            </div>
          </div>
          <div style="font-size:11px; color:#9CA3AF; margin-top:8px;">
            ${log.action_type || '-'} · ${log.actor_role || '-'}
          </div>
        </div>
      `).join('')
      : `
        <div style="
          padding: 24px;
          text-align: center;
          color: #6B7280;
          background: #F9FAFB;
          border-radius: 14px;
          border: 1px dashed #D1D5DB;
        ">
          لا توجد عمليات مسجلة بعد
        </div>
      `;

    const modalHtml = `
      <div id="businessDetailsModal" style="
        position: fixed;
        inset: 0;
        z-index: 20000;
        background: rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        direction: rtl;
      ">
        <div style="
          width: min(900px, calc(100vw - 32px));
          max-height: calc(100vh - 40px);
          background: #F9FAFB;
          border-radius: 24px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        ">
          <div style="
            background: linear-gradient(135deg, #070219 0%, #060427 48%, #0E146D 100%);
            color: white;
            padding: 18px 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div>
              <div style="font-size: 19px; font-weight: 900;">
                تفاصيل المطعم
              </div>
              <div style="font-size: 12px; opacity: 0.75; margin-top: 5px;">
                ${business.business_name || '-'}
              </div>
            </div>

<div style="display:flex; align-items:center; gap:8px;">
  <button id="exportBusinessSubscriptionPdfBtn" style="
    border: none;
    background: rgba(255,255,255,0.14);
    color: white;
    height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 900;
  ">
    <i class="fas fa-file-pdf"></i>
    تقرير PDF
  </button>

  <button id="closeBusinessDetailsModal" style="
    border: none;
    background: rgba(255,255,255,0.14);
    color: white;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    cursor: pointer;
  ">
    <i class="fas fa-times"></i>
  </button>
</div>
          </div>

          <div style="
            padding: 20px;
            overflow-y: auto;
          ">
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 12px;
              margin-bottom: 18px;
            ">
              <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:16px; padding:14px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">اسم المطعم</div>
                <div style="font-size:16px; font-weight:900; margin-top:7px;">${business.business_name || '-'}</div>
              </div>

              <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:16px; padding:14px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">الفرع</div>
                <div style="font-size:16px; font-weight:900; margin-top:7px;">${business.branch_name || '-'}</div>
              </div>

              <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:16px; padding:14px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">المدينة</div>
                <div style="font-size:16px; font-weight:900; margin-top:7px;">${business.city || '-'}</div>
              </div>

              <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:16px; padding:14px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">الجوال</div>
                <div style="font-size:16px; font-weight:900; margin-top:7px; direction:ltr; text-align:right;">${business.phone || '-'}</div>
              </div>
            </div>

            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              margin-bottom: 18px;
            ">
              <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:18px; padding:16px;">
                <div style="font-size:15px; font-weight:900; margin-bottom:12px;">الاشتراك</div>

                <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
                  <div>
                    <div style="font-size:12px; color:#6B7280;">الخطة</div>
                    <div style="font-weight:900; margin-top:5px;">${business.plan_type || '-'}</div>
                  </div>

                  <div>
                    <div style="font-size:12px; color:#6B7280;">الحالة</div>
                    <div style="
                      display:inline-flex;
                      margin-top:5px;
                      background:${statusColor};
                      color:white;
                      padding:4px 9px;
                      border-radius:999px;
                      font-size:12px;
                      font-weight:900;
                    ">${statusLabel}</div>
                  </div>

                  <div>
                    <div style="font-size:12px; color:#6B7280;">تاريخ الانتهاء</div>
                    <div style="font-weight:900; margin-top:5px;">${expiresAt}</div>
                  </div>

                  <div>
                    <div style="font-size:12px; color:#6B7280;">الأيام المتبقية</div>
                    <div style="font-weight:900; margin-top:5px;">${business.days_remaining ?? 0} يوم</div>
                  </div>
                </div>
              </div>

              <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:18px; padding:16px;">
                <div style="font-size:15px; font-weight:900; margin-bottom:12px;">الاستخدام والحدود</div>

                <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
                  <div>
                    <div style="font-size:12px; color:#6B7280;">الطاولات</div>
                    <div style="font-weight:900; margin-top:5px;">${formatLimit(business.current_tables_count, business.max_tables)}</div>
                  </div>

                  <div>
                    <div style="font-size:12px; color:#6B7280;">المستخدمين</div>
                    <div style="font-weight:900; margin-top:5px;">${formatLimit(business.current_users_count, business.max_users)}</div>
                  </div>

                  <div>
                    <div style="font-size:12px; color:#6B7280;">المناطق</div>
                    <div style="font-weight:900; margin-top:5px;">${formatLimit(business.current_zones_count, business.max_zones)}</div>
                  </div>

                  <div>
                    <div style="font-size:12px; color:#6B7280;">الأدوار</div>
                    <div style="font-weight:900; margin-top:5px;">${formatLimit(business.current_floors_count, business.max_floors)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style="background:#FFFFFF; border:1px solid #E5E7EB; border-radius:18px; padding:16px;">
              <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:12px;
              ">
                <div>
                  <div style="font-size:15px; font-weight:900;">آخر عمليات الاشتراك</div>
                  <div style="font-size:12px; color:#6B7280; margin-top:4px;">آخر 10 عمليات على هذا المطعم</div>
                </div>
              </div>

              ${logsHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('closeBusinessDetailsModal')?.addEventListener('click', () => {
      document.getElementById('businessDetailsModal')?.remove();
    });
    document.getElementById('exportBusinessSubscriptionPdfBtn')?.addEventListener('click', async () => {
  await exportBusinessSubscriptionPdf(business, logs || []);
});

  } catch (err) {
    console.error('خطأ في عرض تفاصيل المطعم:', err);
    alert('فشل عرض تفاصيل المطعم');
  }
}

async function exportBusinessSubscriptionPdf(business, logs) {
  try {
    if (!business) {
      alert('لا توجد بيانات مطعم لتصدير التقرير');
      return;
    }

    // تحميل مكتبة html2pdf تلقائيًا عند الحاجة فقط
    if (typeof html2pdf === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const formatDate = (value) => {
      if (!value) return '-';
      return new Date(value).toLocaleDateString('ar-SA');
    };

    const formatDateTime = (value) => {
      if (!value) return '-';
      return new Date(value).toLocaleString('ar-SA');
    };

    const statusLabel =
      business.effective_status === 'active' ? 'نشط' :
      business.effective_status === 'trial' ? 'تجريبي' :
      business.effective_status === 'grace' ? 'فترة سماح' :
      business.effective_status === 'expired' ? 'منتهي' :
      business.effective_status === 'suspended' ? 'موقوف' :
      business.effective_status === 'cancelled' ? 'ملغي' :
      'غير معروف';

    const reportLogs = Array.isArray(logs) ? logs : [];

    const logsRows = reportLogs.length
      ? reportLogs.map((log, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${log.action_title || '-'}</td>
          <td>${log.action_description || '-'}</td>
          <td>${log.actor_role || '-'}</td>
          <td>${formatDateTime(log.created_at)}</td>
        </tr>
      `).join('')
      : `
        <tr>
          <td colspan="5" style="text-align:center; color:#777;">
            لا توجد عمليات مسجلة
          </td>
        </tr>
      `;

    const reportHtml = document.createElement('div');
reportHtml.style.cssText = `
  width: 190mm;
  padding: 10mm;
  background: #ffffff;
  color: #111827;
  direction: rtl;
  font-family: Arial, Tahoma, sans-serif;
  box-sizing: border-box;
`;

    reportHtml.innerHTML = `
      <div style="
        border-bottom: 4px solid #0E146D;
        padding-bottom: 16px;
        margin-bottom: 22px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      ">
        <div>
          <div style="font-size: 26px; font-weight: 900; color: #0E146D;">
            EASY-Q
          </div>
          <div style="font-size: 13px; color: #6B7280; margin-top: 5px;">
            تقرير اشتراك المطعم
          </div>
        </div>

        <div style="text-align: left; font-size: 12px; color: #6B7280;">
          <div>تاريخ التقرير</div>
          <strong style="color:#111827;">${formatDateTime(new Date().toISOString())}</strong>
        </div>
      </div>

      <div style="
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 18px;
      ">
        <h2 style="margin: 0 0 12px; font-size: 20px; color: #111827;">
          ${business.business_name || '-'}
        </h2>

        <table style="width:100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding:7px; color:#6B7280;">الفرع</td>
            <td style="padding:7px; font-weight:800;">${business.branch_name || '-'}</td>
            <td style="padding:7px; color:#6B7280;">المدينة</td>
            <td style="padding:7px; font-weight:800;">${business.city || '-'}</td>
          </tr>
          <tr>
            <tr>
  <td style="padding:7px; color:#6B7280;">الجوال</td>
  <td style="padding:7px; font-weight:800; direction:ltr; text-align:right;">${business.phone || '-'}</td>
  <td style="padding:7px; color:#6B7280;">رقم التقرير</td>
  <td style="padding:7px; font-weight:800; direction:ltr; text-align:right;">EQ-${Date.now()}</td>
</tr>
        </table>
      </div>

      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 18px;
      ">
        <div style="
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 14px;
        ">
          <h3 style="margin:0 0 12px; font-size: 16px; color:#0E146D;">
            بيانات الاشتراك
          </h3>

          <table style="width:100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding:7px; color:#6B7280;">الخطة</td>
              <td style="padding:7px; font-weight:900;">${business.plan_type || '-'}</td>
            </tr>
            <tr>
              <td style="padding:7px; color:#6B7280;">الحالة</td>
              <td style="padding:7px; font-weight:900;">${statusLabel}</td>
            </tr>
            <tr>
              <td style="padding:7px; color:#6B7280;">تاريخ الانتهاء</td>
              <td style="padding:7px; font-weight:900;">${formatDate(business.expires_at)}</td>
            </tr>
            <tr>
              <td style="padding:7px; color:#6B7280;">الأيام المتبقية</td>
              <td style="padding:7px; font-weight:900;">${business.days_remaining ?? 0} يوم</td>
            </tr>
          </table>
        </div>

        <div style="
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 14px;
        ">
          <h3 style="margin:0 0 12px; font-size: 16px; color:#0E146D;">
            الاستخدام والحدود
          </h3>

          <table style="width:100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding:7px; color:#6B7280;">الطاولات</td>
              <td style="padding:7px; font-weight:900; direction:ltr; text-align:right; unicode-bidi:embed;">
  ${business.current_tables_count || 0} / ${business.max_tables ?? 'Unlimited'}
</td>
            </tr>
            <tr>
              <td style="padding:7px; color:#6B7280;">المستخدمين</td>
            <td style="padding:7px; font-weight:900; direction:ltr; text-align:right; unicode-bidi:embed;">
  ${business.current_users_count || 0} / ${business.max_users ?? 'Unlimited'}
</td>
            </tr>
            <tr>
              <td style="padding:7px; color:#6B7280;">المناطق</td>
            <td style="padding:7px; font-weight:900; direction:ltr; text-align:right; unicode-bidi:embed;">
  ${business.current_zones_count || 0} / ${business.max_zones ?? 'Unlimited'}
</td>
            </tr>
            <tr>
              <td style="padding:7px; color:#6B7280;">الأدوار</td>
            <td style="padding:7px; font-weight:900; direction:ltr; text-align:right; unicode-bidi:embed;">
  ${business.current_floors_count || 0} / ${business.max_floors ?? 'Unlimited'}
</td>
            </tr>
          </table>
        </div>
      </div>

      <div style="
        border: 1px solid #E5E7EB;
        border-radius: 14px;
        padding: 14px;
      ">
        <h3 style="margin:0 0 12px; font-size: 16px; color:#0E146D;">
          سجل عمليات الاشتراك
        </h3>

        <table style="
          width:100%;
          border-collapse: collapse;
          font-size: 11px;
        ">
          <thead>
            <tr style="background:#0E146D; color:white;">
              <th style="padding:8px; border:1px solid #E5E7EB;">#</th>
              <th style="padding:8px; border:1px solid #E5E7EB;">العملية</th>
              <th style="padding:8px; border:1px solid #E5E7EB;">الوصف</th>
              <th style="padding:8px; border:1px solid #E5E7EB;">المنفذ</th>
              <th style="padding:8px; border:1px solid #E5E7EB;">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${logsRows}
          </tbody>
        </table>
      </div>

      <div style="
        margin-top: 18px;
        padding-top: 12px;
        border-top: 1px solid #E5E7EB;
        color: #6B7280;
        font-size: 11px;
        text-align: center;
      ">
        هذا التقرير صادر من نظام EASYQ لإدارة الطوابير والطاولات باحترافيه.
      </div>
    `;

    document.body.appendChild(reportHtml);

    const fileName = `EASY-Q-${business.business_name || 'business'}-subscription-report.pdf`
      .replace(/[\\/:*?"<>|]/g, '-');

const options = {
  margin: [8, 8, 8, 8],
  filename: fileName,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  },
  jsPDF: {
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  },
  pagebreak: {
    mode: ['avoid-all', 'css', 'legacy']
  }
};

    await html2pdf().set(options).from(reportHtml).save();

    reportHtml.remove();

  } catch (err) {
    console.error('فشل تصدير تقرير الاشتراك PDF:', err);
    alert('فشل تصدير تقرير PDF');
  }
}

async function toggleBusinessStatus(businessId) {
  try {
    const { data, error } = await supabase
      .rpc('super_admin_list_subscriptions');

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const business = rows.find(item => item.business_id === businessId);

    if (!business) {
      alert('لم يتم العثور على بيانات هذا المطعم');
      return;
    }

    const oldModal = document.getElementById('subscriptionManageModal');
    if (oldModal) oldModal.remove();

    const statusLabel =
      business.effective_status === 'active' ? 'نشط' :
      business.effective_status === 'trial' ? 'تجريبي' :
      business.effective_status === 'grace' ? 'فترة سماح' :
      business.effective_status === 'expired' ? 'منتهي' :
      business.effective_status === 'suspended' ? 'موقوف' :
      business.effective_status === 'cancelled' ? 'ملغي' :
      'غير معروف';

    const expiresAt = business.expires_at
      ? new Date(business.expires_at).toLocaleDateString('ar-SA')
      : '-';

    const modalHtml = `
      <div id="subscriptionManageModal" style="
        position: fixed;
        inset: 0;
        z-index: 20000;
        background: rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        direction: rtl;
      ">
        <div style="
          width: min(560px, calc(100vw - 32px));
          background: #ffffff;
          border-radius: 22px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.25);
          overflow: hidden;
        ">
          <div style="
            background: linear-gradient(135deg, #070219 0%, #060427 48%, #0E146D 100%);
            color: white;
            padding: 18px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div>
              <div style="font-size: 18px; font-weight: 900;">
                إدارة اشتراك المطعم
              </div>
              <div style="font-size: 12px; opacity: 0.75; margin-top: 5px;">
                ${business.business_name || '-'}
              </div>
            </div>

            <button id="closeSubscriptionManageModal" style="
              border: none;
              background: rgba(255,255,255,0.14);
              color: white;
              width: 36px;
              height: 36px;
              border-radius: 12px;
              cursor: pointer;
            ">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div style="padding: 20px;">
            <div style="
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 18px;
            ">
              <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:14px; padding:12px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">الخطة</div>
                <div style="font-size:16px; font-weight:900; margin-top:6px;">${business.plan_type || '-'}</div>
              </div>

              <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:14px; padding:12px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">الحالة</div>
                <div style="font-size:16px; font-weight:900; margin-top:6px;">${statusLabel}</div>
              </div>

              <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:14px; padding:12px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">تاريخ الانتهاء</div>
                <div style="font-size:16px; font-weight:900; margin-top:6px;">${expiresAt}</div>
              </div>

              <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:14px; padding:12px;">
                <div style="font-size:12px; color:#6B7280; font-weight:800;">الأيام المتبقية</div>
                <div style="font-size:16px; font-weight:900; margin-top:6px;">${business.days_remaining ?? 0} يوم</div>
              </div>
            </div>

            <div style="
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            ">
            <button id="extendLicenseBtn" style="
            border: none;
            background: #0E146D;
            color: white;
            padding: 12px;
            border-radius: 13px;
            cursor: pointer;
            font-weight: 900;
            ">
           <i class="fas fa-calendar-plus"></i>
           تمديد بالأيام
           </button>

              <button id="activateLicenseBtn" style="
                border: none;
                background: #10B981;
                color: white;
                padding: 12px;
                border-radius: 13px;
                cursor: pointer;
                font-weight: 900;
              ">
                <i class="fas fa-check-circle"></i>
                تفعيل الاشتراك
              </button>

              <button id="suspendLicenseBtn" style="
                border: none;
                background: #F59E0B;
                color: white;
                padding: 12px;
                border-radius: 13px;
                cursor: pointer;
                font-weight: 900;
              ">
                <i class="fas fa-pause-circle"></i>
                إيقاف مؤقت
              </button>

              <button id="cancelLicenseBtn" style="
                border: none;
                background: #DC2626;
                color: white;
                padding: 12px;
                border-radius: 13px;
                cursor: pointer;
                font-weight: 900;
              ">
                <i class="fas fa-ban"></i>
                إلغاء الاشتراك
              </button>
              <button id="editPlanLimitsBtn" style="
  border: none;
  background: #6366F1;
  color: white;
  padding: 12px;
  border-radius: 13px;
  cursor: pointer;
  font-weight: 900;
  grid-column: 1 / -1;
">
  <i class="fas fa-sliders-h"></i>
  تعديل الخطة وحدود الباقة
</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeModal = () => {
      const modal = document.getElementById('subscriptionManageModal');
      if (modal) modal.remove();
    };

    document.getElementById('closeSubscriptionManageModal')?.addEventListener('click', closeModal);

document.getElementById('extendLicenseBtn')?.addEventListener('click', async () => {
  const daysInput = prompt('كم يوم تريد تمديد الاشتراك؟', '30');

  if (daysInput === null) return;

  const days = Number(daysInput);

  if (!Number.isInteger(days) || days <= 0) {
    alert('الرجاء إدخال عدد أيام صحيح أكبر من صفر');
    return;
  }

  if (!confirm(`هل تريد تمديد اشتراك هذا المطعم ${days} يوم؟`)) return;

  const { data: result, error: rpcError } = await supabase
    .rpc('super_admin_extend_license', {
      p_business_id: businessId,
      p_days: days
    });

  if (rpcError) {
    console.error(rpcError);
    alert('فشل تمديد الاشتراك');
    return;
  }

  const row = Array.isArray(result) ? result[0] : null;
  alert(row?.message || 'تم تمديد الاشتراك');
  closeModal();
  loadSuperAdminData();
});

    document.getElementById('activateLicenseBtn')?.addEventListener('click', async () => {
      if (!confirm('هل تريد تفعيل اشتراك هذا المطعم؟')) return;

      const { data: result, error: rpcError } = await supabase
        .rpc('super_admin_update_license_plan', {
          p_business_id: businessId,
          p_plan_type: business.plan_type || 'basic',
          p_subscription_status: business.plan_type === 'trial' ? 'trial' : 'active'
        });

      if (rpcError) {
        console.error(rpcError);
        alert('فشل تفعيل الاشتراك');
        return;
      }

      const row = Array.isArray(result) ? result[0] : null;
      alert(row?.message || 'تم تفعيل الاشتراك');
      closeModal();
      loadSuperAdminData();
    });

    document.getElementById('suspendLicenseBtn')?.addEventListener('click', async () => {
      const reason = prompt('سبب الإيقاف المؤقت:', 'تم إيقاف الاشتراك من إدارة EASY-Q');
      if (reason === null) return;

      const { data: result, error: rpcError } = await supabase
        .rpc('super_admin_suspend_license', {
          p_business_id: businessId,
          p_reason: reason
        });

      if (rpcError) {
        console.error(rpcError);
        alert('فشل إيقاف الاشتراك');
        return;
      }

      const row = Array.isArray(result) ? result[0] : null;
      alert(row?.message || 'تم إيقاف الاشتراك');
      closeModal();
      loadSuperAdminData();
    });

    document.getElementById('cancelLicenseBtn')?.addEventListener('click', async () => {
      const reason = prompt('سبب إلغاء الاشتراك:', 'تم إلغاء الاشتراك من إدارة EASY-Q');
      if (reason === null) return;

      if (!confirm('تأكيد نهائي: هل تريد إلغاء اشتراك هذا المطعم؟')) return;

      const { data: result, error: rpcError } = await supabase
        .rpc('super_admin_cancel_license', {
          p_business_id: businessId,
          p_reason: reason
        });

      if (rpcError) {
        console.error(rpcError);
        alert('فشل إلغاء الاشتراك');
        return;
      }

      const row = Array.isArray(result) ? result[0] : null;
      alert(row?.message || 'تم إلغاء الاشتراك');
      closeModal();
      loadSuperAdminData();
    });
    document.getElementById('editPlanLimitsBtn')?.addEventListener('click', async () => {
  const planInput = prompt(
    'اكتب نوع الخطة: trial أو basic أو pro أو enterprise',
    business.plan_type || 'basic'
  );

  if (planInput === null) return;

  const planType = planInput.trim().toLowerCase();

  if (!['trial', 'basic', 'pro', 'enterprise'].includes(planType)) {
    alert('نوع الخطة غير صحيح. الخيارات: trial / basic / pro / enterprise');
    return;
  }

  const maxTablesInput = prompt(
    'حد الطاولات: اكتب رقم أو اتركه فارغًا ليكون بدون حد',
    business.max_tables ?? ''
  );

  if (maxTablesInput === null) return;

  const maxUsersInput = prompt(
    'حد المستخدمين: اكتب رقم أو اتركه فارغًا ليكون بدون حد',
    business.max_users ?? ''
  );

  if (maxUsersInput === null) return;

  const maxZonesInput = prompt(
    'حد المناطق: اكتب رقم أو اتركه فارغًا ليكون بدون حد',
    business.max_zones ?? ''
  );

  if (maxZonesInput === null) return;

  const maxFloorsInput = prompt(
    'حد الأدوار: اكتب رقم أو اتركه فارغًا ليكون بدون حد',
    business.max_floors ?? ''
  );

  if (maxFloorsInput === null) return;

  const parseLimit = (value) => {
    const clean = String(value).trim();

    if (clean === '') return null;

    const numberValue = Number(clean);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      return 'INVALID';
    }

    return numberValue;
  };

  const maxTables = parseLimit(maxTablesInput);
  const maxUsers = parseLimit(maxUsersInput);
  const maxZones = parseLimit(maxZonesInput);
  const maxFloors = parseLimit(maxFloorsInput);

  if (
    maxTables === 'INVALID' ||
    maxUsers === 'INVALID' ||
    maxZones === 'INVALID' ||
    maxFloors === 'INVALID'
  ) {
    alert('الحدود يجب أن تكون أرقام صحيحة 0 أو أكثر، أو اترك الحقل فارغًا ليكون بدون حد.');
    return;
  }

if (!confirm('هل تريد حفظ الخطة وحدود الباقة لهذا المطعم؟')) return;

const nextStatus = planType === 'trial' ? 'trial' : 'active';

const planChanged =
  planType !== business.plan_type ||
  nextStatus !== business.subscription_status;

const limitsChanged =
  maxTables !== business.max_tables ||
  maxUsers !== business.max_users ||
  maxZones !== business.max_zones ||
  maxFloors !== business.max_floors;

if (!planChanged && !limitsChanged) {
  alert('لم يتم تغيير أي شيء');
  return;
}

if (planChanged) {
  const { data: planResult, error: planError } = await supabase
    .rpc('super_admin_update_license_plan', {
      p_business_id: businessId,
      p_plan_type: planType,
      p_subscription_status: nextStatus
    });

  if (planError) {
    console.error(planError);
    alert('فشل تحديث نوع الخطة');
    return;
  }

  const planRow = Array.isArray(planResult) ? planResult[0] : null;

  if (planRow && planRow.success === false) {
    alert(planRow.message || 'فشل تحديث نوع الخطة');
    return;
  }
}

if (!limitsChanged) {
  alert('✅ تم تحديث الخطة بنجاح');
  closeModal();
  loadSuperAdminData();
  return;
}

const { data: limitsResult, error: limitsError } = await supabase
    .rpc('super_admin_update_license_limits', {
      p_business_id: businessId,
      p_max_tables: maxTables,
      p_max_users: maxUsers,
      p_max_zones: maxZones,
      p_max_floors: maxFloors
    });

  if (limitsError) {
    console.error(limitsError);
    alert('تم تحديث الخطة، لكن فشل تحديث حدود الباقة');
    return;
  }

  const limitsRow = Array.isArray(limitsResult) ? limitsResult[0] : null;

  if (limitsRow && limitsRow.success === false) {
    alert(limitsRow.message || 'فشل تحديث حدود الباقة');
    return;
  }

  alert('✅ تم تحديث الخطة وحدود الباقة بنجاح');
  closeModal();
  loadSuperAdminData();
});
  } catch (err) {
    console.error('خطأ في فتح إدارة الاشتراك:', err);
    alert('فشل فتح إدارة الاشتراك');
  }
}

// ============================================================
// ENTER KEY LOGIN
// ============================================================

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay && loginOverlay.style.display !== 'none') {
      doLogin();
    }
  }
});

// ============================================================
// LOGOUT BUTTON
// ============================================================

async function logoutAndClean() {
await supabase.auth.signOut();

// إيقاف مؤقت تحديث الاشتراك عند تسجيل الخروج
if (window.subscriptionRefreshInterval) {
  clearInterval(window.subscriptionRefreshInterval);
  window.subscriptionRefreshInterval = null;
}

currentUser = null;
localStorage.removeItem('easyq_user');
localStorage.removeItem('easyq_license_status');

  settings = {
    ready_mode: "any_match",
    alert_sound_enabled: true,
    expired_sound_enabled: true,
    alert_vibration_enabled: true,
    expired_panel_enabled: true,
    expired_list_limit: 5,
    reservation_hold_minutes: 10,
    pending_hold_minutes: 5,
    cleaning_hold_minutes: 10,
    business_id: null,
    id: null
  };

  settingsDraft = {};
  floorData = [];
  waitingData = [];
  expiredData = [];
  cachedExpiredData = [];

  selectedRequestId = null;
  selectedPartySize = null;
  draggedRequestId = null;
  draggedPartySize = null;
  selectedTableForMove = null;
  pendingPositionUpdates = {};

  moveModeActive = false;
  tableEditMode = false;
  tableDeleteMode = false;

  const floorCanvas = document.getElementById('floorCanvas');
  if (floorCanvas) floorCanvas.innerHTML = '';

  const waitingList = document.getElementById('waitingList');
  if (waitingList) waitingList.innerHTML = '';

  const expiredList = document.getElementById('expiredList');
  if (expiredList) expiredList.innerHTML = '';

  const statusSummary = document.getElementById('statusSummary');
  if (statusSummary) statusSummary.innerHTML = '';

  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'flex';

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';

  document.body.classList.remove('logged-in');

  showSuccessNotification('تم تسجيل الخروج بنجاح');
}