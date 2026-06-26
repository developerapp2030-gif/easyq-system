

// ============================================================
// LOGIN SYSTEM 11
// ============================================================

let adminNotificationsList = [];
let currentAdminNotification = null;
let adminNotificationsInterval = null;
let isRefreshingAdminNotifications = false;

function getAdminNotificationLang() {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    currentLang ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function adminNotificationText(arText, enText) {
  return getAdminNotificationLang() === 'en' ? enText : arText;
}

function escapeAdminNotificationHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAdminNotificationAllowedLinkHosts() {
  const currentHost = window.location.hostname || '';

return Array.from(new Set([
  currentHost,

  // دومين النظام الحالي
  'easyq-system.vercel.app',

// HyperPay / HyperBill - روابط الفواتير والدفع
'hyperbill.hyperpay.com',

// WhatsApp - روابط التواصل الموثوقة فقط
'wa.me',
'api.whatsapp.com',
'web.whatsapp.com',

// أضف هنا دومينك الرسمي عند تفعيله
  // 'easyqsa.com',
  // 'www.easyqsa.com'
]
    .map(host => String(host || '').trim().toLowerCase())
    .filter(Boolean)
  ));
}

function isAdminNotificationSafeLink(rawUrl) {
  try {
    const parsedUrl = new URL(String(rawUrl || '').trim());

    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    if (parsedUrl.username || parsedUrl.password) {
      return false;
    }

    const allowedHosts = getAdminNotificationAllowedLinkHosts();
    const linkHost = parsedUrl.hostname.toLowerCase();

    return allowedHosts.includes(linkHost);

  } catch (err) {
    return false;
  }
}

function formatAdminNotificationBodyHtml(value) {
  const text = String(value ?? '');

  const urlRegex = /https?:\/\/[^\s<>"'`]+/gi;

  let html = '';
  let lastIndex = 0;

  text.replace(urlRegex, function (match, offset) {
    html += escapeAdminNotificationHtml(text.slice(lastIndex, offset));

    let cleanUrl = match;
    let trailingText = '';

    while (/[.,،؛:!?؟)\]]$/.test(cleanUrl)) {
      trailingText = cleanUrl.slice(-1) + trailingText;
      cleanUrl = cleanUrl.slice(0, -1);
    }

    if (isAdminNotificationSafeLink(cleanUrl)) {
      const safeHref = escapeAdminNotificationHtml(new URL(cleanUrl).href);
      const safeText = escapeAdminNotificationHtml(cleanUrl);

      html += `
        <a
          href="${safeHref}"
          target="_blank"
          rel="noopener noreferrer nofollow"
style="
  color:#0E146D;
  font-size:10px;
  font-weight:700;
  text-decoration:underline;
  text-underline-offset:3px;
  word-break:break-all;
"
        >${safeText}</a>
      `;
    } else {
      html += `
        <span
          title="${escapeAdminNotificationHtml(adminNotificationText('رابط غير موثوق وغير قابل للفتح', 'Untrusted link disabled'))}"
          style="
            color:#B42318;
            font-weight:1000;
            word-break:break-all;
          "
        >${escapeAdminNotificationHtml(cleanUrl)}</span>
      `;
    }

    html += escapeAdminNotificationHtml(trailingText);
    lastIndex = offset + match.length;

    return match;
  });

  html += escapeAdminNotificationHtml(text.slice(lastIndex));

  return html;
}

function getAdminNotificationSeverityMeta(severity) {
  const key = String(severity || 'info').toLowerCase();

  const map = {
    info: {
      icon: 'fa-circle-info',
      color: '#2563EB',
      bg: '#EFF6FF',
      labelAr: 'معلومة',
      labelEn: 'Info'
    },
    warning: {
      icon: 'fa-triangle-exclamation',
      color: '#D97706',
      bg: '#FFFBEB',
      labelAr: 'تنبيه',
      labelEn: 'Warning'
    },
    important: {
      icon: 'fa-circle-exclamation',
      color: '#DC2626',
      bg: '#FEF2F2',
      labelAr: 'مهم',
      labelEn: 'Important'
    },
    maintenance: {
      icon: 'fa-screwdriver-wrench',
      color: '#7C3AED',
      bg: '#F5F3FF',
      labelAr: 'صيانة',
      labelEn: 'Maintenance'
    },
    subscription: {
      icon: 'fa-credit-card',
      color: '#0E146D',
      bg: '#EEF2FF',
      labelAr: 'اشتراك',
      labelEn: 'Subscription'
    }
  };

  return map[key] || map.info;
}

function updateAdminNotificationBell(notifications) {
  const bellBtn = document.getElementById('adminNotificationBellBtn');
  const badge = document.getElementById('adminNotificationBadge');

  if (!bellBtn || !badge) return;

  const count = Array.isArray(notifications) ? notifications.length : 0;

  if (!currentUser || currentUser.role === 'super_admin' || count <= 0) {
    bellBtn.style.display = 'none';
    badge.style.display = 'none';
    badge.textContent = '0';
    return;
  }

  bellBtn.style.display = 'inline-flex';
  badge.style.display = 'inline-flex';
  badge.textContent = count > 99 ? '99+' : String(count);

  const firstImportant = notifications.some(item => {
    const severity = String(item.severity || '').toLowerCase();
    return severity === 'important' || severity === 'warning' || severity === 'maintenance';
  });

  bellBtn.style.background = firstImportant
    ? 'rgba(220, 38, 38, 0.22)'
    : 'rgba(255,255,255,0.10)';

  bellBtn.style.borderColor = firstImportant
    ? 'rgba(255,255,255,0.28)'
    : 'rgba(255,255,255,0.18)';
}

async function refreshAdminNotifications() {
  if (!currentUser || currentUser.role === 'super_admin') {
    adminNotificationsList = [];
    updateAdminNotificationBell([]);
    return;
  }

  if (isRefreshingAdminNotifications) return;

  try {
    isRefreshingAdminNotifications = true;

    const { data, error } = await supabase.rpc('get_my_admin_notifications');

    if (error) {
      console.warn('تعذر جلب إشعارات الإدارة:', error);
      return;
    }

    adminNotificationsList = Array.isArray(data) ? data : [];
    updateAdminNotificationBell(adminNotificationsList);

  } catch (err) {
    console.warn('خطأ غير متوقع أثناء جلب إشعارات الإدارة:', err);

  } finally {
    isRefreshingAdminNotifications = false;
  }
}

function startAdminNotificationsAutoRefresh() {
  if (!currentUser || currentUser.role === 'super_admin') return;

  refreshAdminNotifications();

  if (adminNotificationsInterval) return;

  adminNotificationsInterval = setInterval(() => {
    refreshAdminNotifications();
  }, 30000);
}

function stopAdminNotificationsAutoRefresh() {
  if (adminNotificationsInterval) {
    clearInterval(adminNotificationsInterval);
    adminNotificationsInterval = null;
  }
}

function openAdminNotificationModal(notificationId) {
  if (!adminNotificationsList || adminNotificationsList.length === 0) {
    refreshAdminNotifications();
    return;
  }

  const notification =
    notificationId
      ? adminNotificationsList.find(item => item.notification_id === notificationId)
      : adminNotificationsList[0];

  if (!notification) return;

  currentAdminNotification = notification;

  let overlay = document.getElementById('adminNotificationModal');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'adminNotificationModal';
    document.body.appendChild(overlay);
  }

  const isEnglish = getAdminNotificationLang() === 'en';
  const dir = isEnglish ? 'ltr' : 'rtl';
  const meta = getAdminNotificationSeverityMeta(notification.severity);

  const createdAt = notification.created_at
    ? new Date(notification.created_at).toLocaleString(isEnglish ? 'en-US' : 'ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '';

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: rgba(15, 23, 42, 0.42);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    direction: ${dir};
  `;

  overlay.innerHTML = `
    <div style="
      width: min(460px, calc(100vw - 28px));
      background: #FFFFFF;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 28px 80px rgba(15, 23, 42, 0.26);
      border: 1px solid rgba(15, 23, 42, 0.08);
    ">
      <div style="
        padding: 18px 20px;
        background: linear-gradient(135deg, #0E146D 0%, #060427 100%);
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 14px;
            background: rgba(255,255,255,0.13);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <i class="fas fa-envelope-open-text"></i>
          </div>

          <div>
            <div style="font-weight: 900; font-size: 15px;">
              ${adminNotificationText('إشعار من الإدارة', 'Admin Notice')}
            </div>
            <div style="font-size: 12px; opacity: 0.76; margin-top: 3px;">
              ${escapeAdminNotificationHtml(createdAt)}
            </div>
          </div>
        </div>

        <button type="button" onclick="closeAdminNotificationModal(false)" style="
          border: none;
          background: rgba(255,255,255,0.12);
          color: #FFFFFF;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>

      <div style="padding: 18px 20px 20px;">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: ${meta.bg};
          color: ${meta.color};
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 12px;
        ">
          <i class="fas ${meta.icon}"></i>
          ${adminNotificationText(meta.labelAr, meta.labelEn)}
        </div>

        <div style="
          margin-bottom: 12px;
        ">
          <div style="
            font-size: 12px;
            font-weight: 900;
            color: #64748B;
            margin-bottom: 7px;
          ">
            ${adminNotificationText('عنوان الإشعار', 'Notice Title')}
          </div>

          <div style="
            background: #edeff3;
            border: 1px solid #DDE3F5;
            border-radius: 16px;
            padding: 8px 12px;
            color: #111827;
            font-size: 17px;
            font-weight: 1000;
            line-height: 1.25;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.045);
            word-break: break-word;
          ">
            ${escapeAdminNotificationHtml(notification.title)}
          </div>
        </div>

        <div style="
          margin-bottom: 4px;
        ">
          <div style="
            font-size: 12px;
            font-weight: 900;
            color: #82868b;
            margin-bottom: 7px;
          ">
            ${adminNotificationText('نص الرسالة', 'Message')}
          </div>

          <div style="
            background: #fefefe;
            border: 1px solid #DDE3F5;
            border-radius: 16px;
            padding: 10px 14px;
            color: #010c1e;
            font-size: 16px;
            line-height: 1.75;
            font-weight: 800;
            white-space: pre-wrap;
            word-break: break-word;
            height: auto;
            min-height: unset;
            max-height: min(42dvh, 360px);
            overflow-y: auto;
            display: block;
            text-align: start;
            vertical-align: top;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
          ">${formatAdminNotificationBodyHtml(notification.body)}</div>
        </div>

        <div style="
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        ">
          <button type="button" onclick="closeAdminNotificationModal(true)" style="
            border: none;
            background: #0E146D;
            color: #FFFFFF;
            border-radius: 14px;
            padding: 11px 16px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 900;
          ">
            ${adminNotificationText('تم القراءة ', 'Close & Mark Read')}
          </button>
        </div>
      </div>
    </div>
  `;
}

async function closeAdminNotificationModal(markAsRead = true) {
  const overlay = document.getElementById('adminNotificationModal');

  if (overlay) {
    overlay.style.display = 'none';
  }

  if (!markAsRead || !currentAdminNotification?.notification_id) {
    currentAdminNotification = null;
    return;
  }

  const notificationId = currentAdminNotification.notification_id;
  currentAdminNotification = null;

  try {
    const { error } = await supabase.rpc('mark_admin_notification_read', {
      p_notification_id: notificationId
    });

    if (error) {
      console.warn('تعذر تعليم إشعار الإدارة كمقروء:', error);
      return;
    }

    await refreshAdminNotifications();

  } catch (err) {
    console.warn('خطأ غير متوقع أثناء تعليم إشعار الإدارة كمقروء:', err);
  }
}

function addBusinessSupportSidebarButton() {
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const btn = document.getElementById('businessSupportSidebarBtn');

  if (!btn) {
    console.warn('زر الدعم الحي غير موجود في index.html');
    return;
  }

  const supportSection =
    document.getElementById('businessSupportSidebarSection') ||
    btn.closest('.sidebar-nav-section');

  const canUseSupport = canDo('use_live_support');

  if (supportSection) {
    supportSection.style.display = canUseSupport ? 'block' : 'none';
  } else {
    btn.style.display = canUseSupport ? 'flex' : 'none';
  }

  if (!canUseSupport) return;

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

function getBusinessSupportLang() {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    currentLang ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function businessSupportText(arText, enText) {
  return getBusinessSupportLang() === 'en' ? enText : arText;
}

function businessSupportEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function businessSupportFormatDate(value, locale) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString(locale);
  } catch (err) {
    return '-';
  }
}

function businessSupportGetStatusMeta(status) {
  const key = String(status || '').toLowerCase();

  if (key === 'open') {
    return {
      label: businessSupportText('مفتوحة', 'Open'),
      color: '#10B981'
    };
  }

  if (key === 'pending') {
    return {
      label: businessSupportText('بانتظار الرد', 'Pending'),
      color: '#F59E0B'
    };
  }

  if (key === 'closed') {
    return {
      label: businessSupportText('مغلقة', 'Closed'),
      color: '#6B7280'
    };
  }

  return {
    label: businessSupportText('غير معروف', 'Unknown'),
    color: '#6B7280'
  };
}

function renderBusinessSupportSessionsCardsHtml(sessions, dateLocale) {
  return sessions.map(session => {
    const sessionIdRaw = session.session_id || session.id || '';
    const safeSessionId = businessSupportEscapeHtml(sessionIdRaw);

    const statusMeta = businessSupportGetStatusMeta(session.status);
    const safeStatusLabel = businessSupportEscapeHtml(statusMeta.label);
    const safeStatusColor = businessSupportEscapeHtml(statusMeta.color);

    const lastActivity =
      session.last_message_at ||
      session.last_message_created_at ||
      session.opened_at ||
      session.created_at ||
      null;

    const safeLastActivityText = businessSupportEscapeHtml(
      businessSupportFormatDate(lastActivity, dateLocale)
    );

    const unreadCount = Number(
      session.unread_for_business_count ||
      session.unread_count ||
      0
    );

    const safeUnreadCount = businessSupportEscapeHtml(
      unreadCount > 99 ? '99+' : String(Math.max(0, unreadCount))
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
          ${safeUnreadCount}
        </span>
      `
      : '';

    const activeStyle = String(sessionIdRaw) === String(currentBusinessSupportSessionId)
      ? 'border-color:#0E146D; box-shadow:0 0 0 3px rgba(14,20,109,0.08);'
      : '';

    const safeSubject = businessSupportEscapeHtml(
      session.subject || businessSupportText('طلب دعم', 'Support Request')
    );

    const safeLastMessage = businessSupportEscapeHtml(
      session.last_message_body || businessSupportText('لا توجد رسائل بعد', 'No messages yet')
    );

    return `
      <div
        class="js-business-support-session-card"
        data-support-session-id="${safeSessionId}"
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
              ${safeSubject}
            </div>

            <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
              ${businessSupportEscapeHtml(businessSupportText('آخر نشاط:', 'Last activity:'))} ${safeLastActivityText}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            ${unreadBadge}

            <span style="
              background: ${safeStatusColor};
              color: white;
              font-size: 11px;
              font-weight: 900;
              border-radius: 999px;
              padding: 4px 8px;
              white-space: nowrap;
            ">
              ${safeStatusLabel}
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
          ${safeLastMessage}
        </div>
      </div>
    `;
  }).join('');
}

function bindBusinessSupportSessionCards(container) {
  if (!container) return;

  container.querySelectorAll('.js-business-support-session-card').forEach(card => {
    if (card.dataset.bound === 'true') return;

    card.dataset.bound = 'true';

    card.addEventListener('click', function () {
      openBusinessSupportSession(this.dataset.supportSessionId || '');
    });
  });
}

function superAdminSupportGetStatusMeta(status) {
  const key = String(status || '').toLowerCase();

  if (key === 'open') {
    return { label: 'مفتوحة', color: '#10B981' };
  }

  if (key === 'pending') {
    return { label: 'بانتظار الرد', color: '#F59E0B' };
  }

  if (key === 'closed') {
    return { label: 'مغلقة', color: '#6B7280' };
  }

  return { label: 'غير معروف', color: '#6B7280' };
}

function superAdminSupportFormatDate(value) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('ar-SA');
  } catch (err) {
    return '-';
  }
}

function renderSuperAdminSupportSessionsCardsHtml(sessions) {
  return sessions.map(session => {
    const sessionIdRaw = session.session_id || '';
    const safeSessionId = businessSupportEscapeHtml(sessionIdRaw);

    const statusMeta = superAdminSupportGetStatusMeta(session.status);
    const safeStatusLabel = businessSupportEscapeHtml(statusMeta.label);
    const safeStatusColor = businessSupportEscapeHtml(statusMeta.color);

    const safeBusinessName = businessSupportEscapeHtml(session.business_name || '-');
    const safeSubject = businessSupportEscapeHtml(session.subject || 'طلب دعم');
    const safeLastMessage = businessSupportEscapeHtml(session.last_message_body || 'لا توجد رسائل');
    const safeLastMessageTime = businessSupportEscapeHtml(
      superAdminSupportFormatDate(session.last_message_created_at)
    );

    const unreadCount = Number(session.unread_for_super_admin_count || 0);
    const safeUnreadCount = businessSupportEscapeHtml(
      unreadCount > 99 ? '99+' : String(Math.max(0, unreadCount))
    );

    const unreadBadge = unreadCount > 0
      ? `<span style="
          background:#DC2626;
          color:white;
          font-size:11px;
          font-weight:900;
          border-radius:999px;
          padding:3px 8px;
        ">${safeUnreadCount}</span>`
      : '';

    const activeStyle = sessionIdRaw === currentSupportSessionId
      ? 'border-color:#0E146D; box-shadow:0 0 0 3px rgba(14,20,109,0.08);'
      : '';

    return `
      <div
        class="js-super-admin-support-session-card"
        data-support-session-id="${safeSessionId}"
        style="
          border: 1px solid #E5E7EB;
          ${activeStyle}
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 10px;
          cursor: pointer;
          background: #FFFFFF;
          transition: 0.15s;
        "
      >
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <div style="font-weight:900; color:#111827;">
              ${safeBusinessName}
            </div>
            <div style="font-size:12px; color:#6B7280; margin-top:4px;">
              ${safeSubject}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            ${unreadBadge}
            <span style="
              background:${safeStatusColor};
              color:white;
              font-size:11px;
              font-weight:900;
              border-radius:999px;
              padding:4px 8px;
              white-space:nowrap;
            ">
              ${safeStatusLabel}
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
          ${safeLastMessage}
        </div>

        <div style="font-size:11px; color:#9CA3AF; margin-top:8px;">
          آخر نشاط: ${safeLastMessageTime}
        </div>
      </div>
    `;
  }).join('');
}

function bindSuperAdminSupportSessionCards(container) {
  if (!container) return;

  container.querySelectorAll('.js-super-admin-support-session-card').forEach(card => {
    if (card.dataset.bound === 'true') return;

    card.dataset.bound = 'true';

    card.addEventListener('click', function () {
      openSuperAdminSupportSession(this.dataset.supportSessionId || '');
    });
  });
}

function renderSuperAdminSupportCloseControl(session) {
  if (!session || session.status === 'closed') {
    return `
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
  }

  const safeSessionId = businessSupportEscapeHtml(session.session_id || '');

  return `
    <button
      type="button"
      class="js-close-super-admin-support-session"
      data-support-session-id="${safeSessionId}"
      style="
        border: none;
        background: #DC2626;
        color: white;
        padding: 9px 13px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 900;
        font-size: 12px;
      "
    >
      <i class="fas fa-times-circle"></i>
      إغلاق الجلسة
    </button>
  `;
}

function bindSuperAdminSupportHeaderButtons(header) {
  if (!header) return;

  header.querySelectorAll('.js-close-super-admin-support-session').forEach(button => {
    if (button.dataset.bound === 'true') return;

    button.dataset.bound = 'true';

    button.addEventListener('click', function () {
      closeSuperAdminSupportSession(this.dataset.supportSessionId || '');
    });
  });
}

function applyBusinessSupportModalText() {
  const modal = document.getElementById('businessSupportModal');
  if (!modal) return;

  const isEnglish = getBusinessSupportLang() === 'en';

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const title = modal.querySelector('.modal-title');
  if (title) {
    title.innerHTML = `
      <i class="fas fa-headset"></i>
      ${businessSupportText('الدعم الحي', 'Live Support')}
    `;
  }

  const subtitle = modal.querySelector('.modal-sub');
  if (subtitle) {
    subtitle.textContent = businessSupportText(
      'تواصل مع إدارة EASY-Q، أو أنشئ رمز تحقق لفتح جلسة دعم مباشرة.',
      'Contact EASY-Q management, or create a verification code to open a live support session.'
    );
  }

  const codeTitle = modal.querySelector('.business-support-code-title');
  if (codeTitle) {
    codeTitle.textContent = businessSupportText(
      'رمز التحقق للدعم',
      'Support Verification Code'
    );
  }

  const codeValue = document.getElementById('businessSupportCodeValue');
  if (codeValue) {
    const currentText = codeValue.textContent.trim();

    if (
      currentText === 'لم يتم إنشاء رمز بعد' ||
      currentText === 'No code has been created yet'
    ) {
      codeValue.textContent = businessSupportText(
        'لم يتم إنشاء رمز بعد',
        'No code has been created yet'
      );
    }

    codeValue.style.setProperty('font-size', '12px', 'important');
    codeValue.style.setProperty('line-height', '1.4', 'important');
    codeValue.style.setProperty('font-weight', '900', 'important');
    codeValue.style.setProperty('text-align', 'center', 'important');
    codeValue.style.setProperty('white-space', 'normal', 'important');
    codeValue.style.setProperty('word-break', 'break-word', 'important');
    codeValue.style.setProperty('overflow-wrap', 'anywhere', 'important');
    codeValue.style.setProperty('max-width', '100%', 'important');
  }

  const codeHint = document.getElementById('businessSupportCodeHint');
  if (codeHint) {
    const currentText = codeHint.textContent.trim();

    if (
      currentText === 'الرمز صالح لمدة 10 دقائق فقط.' ||
      currentText === 'The code is valid for 10 minutes only.'
    ) {
      codeHint.textContent = businessSupportText(
        'الرمز صالح لمدة 10 دقائق فقط.',
        'The code is valid for 10 minutes only.'
      );
    }
  }

  const createCodeBtn = document.getElementById('businessCreateSupportCodeBtn');
  if (createCodeBtn && !createCodeBtn.disabled) {
    createCodeBtn.innerHTML = `
      <i class="fas fa-key"></i>
      <span>${businessSupportText('إنشاء رمز دعم', 'Create Support Code')}</span>
    `;

    createCodeBtn.style.setProperty('width', '100%', 'important');
    createCodeBtn.style.setProperty('max-width', '100%', 'important');
    createCodeBtn.style.setProperty('min-width', '0', 'important');
    createCodeBtn.style.setProperty('padding', '9px 10px', 'important');
    createCodeBtn.style.setProperty('font-size', '12px', 'important');
    createCodeBtn.style.setProperty('line-height', '1.25', 'important');
    createCodeBtn.style.setProperty('white-space', 'normal', 'important');
    createCodeBtn.style.setProperty('text-align', 'center', 'important');
    createCodeBtn.style.setProperty('justify-content', 'center', 'important');
    createCodeBtn.style.setProperty('gap', '6px', 'important');

    const btnText = createCodeBtn.querySelector('span');
    if (btnText) {
      btnText.style.setProperty('white-space', 'normal', 'important');
      btnText.style.setProperty('line-height', '1.25', 'important');
      btnText.style.setProperty('min-width', '0', 'important');
    }
  }

  const sectionTitles = modal.querySelectorAll('.business-support-section-title');
  if (sectionTitles[0]) {
    sectionTitles[0].textContent = businessSupportText(
      'جلسات الدعم',
      'Support Sessions'
    );
  }

  const sessionsList = document.getElementById('businessSupportSessionsList');
  if (sessionsList) {
    const currentText = sessionsList.textContent.trim();

    if (
      currentText === 'لا توجد جلسات دعم محملة بعد' ||
      currentText === 'No support sessions loaded yet'
    ) {
      sessionsList.textContent = businessSupportText(
        'لا توجد جلسات دعم محملة بعد',
        'No support sessions loaded yet'
      );
    }
  }

  const chatHeader = document.getElementById('businessSupportChatHeader');
  if (chatHeader) {
    const currentText = chatHeader.textContent.trim();

    if (
      currentText === 'اختر جلسة دعم لعرض المحادثة' ||
      currentText === 'Select a support session to view the conversation'
    ) {
      chatHeader.textContent = businessSupportText(
        'اختر جلسة دعم لعرض المحادثة',
        'Select a support session to view the conversation'
      );
    }
  }

  const messagesList = document.getElementById('businessSupportMessagesList');
  if (messagesList) {
    const currentText = messagesList.textContent.trim();

    if (
      currentText === 'لا توجد محادثة محددة' ||
      currentText === 'No conversation selected'
    ) {
      messagesList.textContent = businessSupportText(
        'لا توجد محادثة محددة',
        'No conversation selected'
      );
    }
  }

  const input = document.getElementById('businessSupportMessageInput');
  if (input) {
    input.placeholder = businessSupportText(
      'اكتب رسالتك هنا...',
      'Type your message here...'
    );
  }

  const sendBtn = document.getElementById('businessSendSupportMessageBtn');
  if (sendBtn && !sendBtn.disabled) {
    sendBtn.innerHTML = `
      <i class="fas fa-paper-plane"></i>
      ${businessSupportText('إرسال', 'Send')}
    `;
  }

  const closeBtn = document.getElementById('businessSupportCloseBtn');
  if (closeBtn) {
    closeBtn.textContent = businessSupportText('إغلاق', 'Close');
  }
}

function renderBusinessSupportModalShell() {
  const modal = document.getElementById('businessSupportModal');
  if (!modal) return;

  const isEnglish = getBusinessSupportLang() === 'en';
  const dir = isEnglish ? 'ltr' : 'rtl';

  modal.innerHTML = `
    <div class="modal business-support-modal" style="
      max-width: 1040px;
      width: min(1040px, calc(100vw - 28px));
      max-height: calc(100vh - 36px);
      overflow: hidden;
      padding: 0;
      border-radius: 24px;
      background: #F8FAFF;
      box-shadow: 0 26px 70px rgba(15, 23, 42, 0.22);
      direction: ${dir};
    ">
      <div style="
        padding: 18px 20px;
        background: linear-gradient(135deg, #0E146D 0%, #060427 100%);
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 42px;
            height: 42px;
            border-radius: 16px;
            background: rgba(255,255,255,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            <i class="fas fa-headset"></i>
          </div>

          <div>
            <div id="businessSupportMainTitle" style="font-size: 18px; font-weight: 900;">
              ${businessSupportText('الدعم الحي', 'Live Support')}
            </div>
            <div id="businessSupportMainSub" style="
              font-size: 12px;
              color: rgba(255,255,255,0.76);
              margin-top: 4px;
              line-height: 1.5;
            ">
              ${businessSupportText(
                'افتح تذكرة دعم أو أنشئ رمز تحقق عند التواصل الهاتفي.',
                'Open a support ticket or create a verification code for phone support.'
              )}
            </div>
          </div>
        </div>

        <button type="button" id="businessSupportCloseBtn" style="
          border: none;
          background: rgba(255,255,255,0.12);
          color: #FFFFFF;
          width: 38px;
          height: 38px;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        ">
          ×
        </button>
      </div>

      <div style="
        padding: 16px;
        overflow: auto;
        max-height: calc(100vh - 118px);
      ">
        <div style="
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        ">
          <div style="
            background: #FFFFFF;
            border: 1px solid #E6EAF5;
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
          ">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="
                  width: 38px;
                  height: 38px;
                  border-radius: 14px;
                  background: rgba(14, 20, 109, 0.08);
                  color: #0E146D;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <i class="fas fa-ticket-alt"></i>
                </div>

                <div>
                  <div style="font-weight: 900; color: #111827; font-size: 14px;">
                    ${businessSupportText('فتح تذكرة دعم جديدة', 'Open New Support Ticket')}
                  </div>
                  <div style="font-size: 12px; color: #6B7280; margin-top: 4px; line-height: 1.6;">
                    ${businessSupportText(
                      'اكتب المشكلة وسيتم إرسالها مباشرة إلى السوبر أدمن.',
                      'Describe the issue and send it directly to the super admin.'
                    )}
                  </div>
                </div>
              </div>

                <button type="button" id="businessSupportToggleTicketFormBtn" style="
                border: none;
                background: #0E146D;
                color: #FFFFFF;
                border-radius: 13px;
                padding: 10px 13px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 900;
                white-space: nowrap;
                display: inline-flex;
                align-items: center;
                gap: 7px;
              ">
                <i class="fas fa-plus"></i>
                <span id="businessSupportToggleTicketFormBtnText">
                  ${businessSupportText('فتح تذكرة', 'Open Ticket')}
                </span>
              </button>
            </div>
          </div>

<div id="businessSupportCodeBox" style="
            background: #FFFFFF;
            border: 1px solid #E6EAF5;
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
          ">
            <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px;">
              <div style="
                width: 38px;
                height: 38px;
                border-radius: 14px;
                background: rgba(244, 210, 138, 0.22);
                color: #8A650E;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              ">
                <i class="fas fa-key"></i>
              </div>

              <div>
                <div class="business-support-code-title" style="font-weight: 900; color: #111827; font-size: 14px;">
                  ${businessSupportText('رمز الدعم الهاتفي', 'Phone Support Code')}
                </div>

                <div id="businessSupportCodeHint" class="business-support-code-hint" style="
                  font-size: 12px;
                  color: #6B7280;
                  margin-top: 4px;
                  line-height: 1.6;
                ">
                  ${businessSupportText(
                    'استخدمه فقط عند التواصل الهاتفي أو عبر واتساب.',
                    'Use it only for phone or WhatsApp verification.'
                  )}
                </div>
              </div>
            </div>

            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            ">
              <div id="businessSupportCodeValue" class="business-support-code-value" style="
                flex: 1;
                min-height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px 12px;
                border-radius: 13px;
                background: #F3F4F6;
                color: #111827;
                font-size: 12px;
                font-weight: 900;
                letter-spacing: 0.3px;
                white-space: nowrap;
              ">
                ${businessSupportText('لم يتم إنشاء رمز بعد', 'No code created yet')}
              </div>

              <button type="button" id="businessCreateSupportCodeBtn" class="settings-save" style="
                border: none;
                background: #F4D28A;
                color: #0E146D;
                border-radius: 13px;
                padding: 0 14px;
                min-height: 40px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 900;
                white-space: nowrap;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
              ">
                <i class="fas fa-key"></i>
                ${businessSupportText('إنشاء رمز', 'Create Code')}
              </button>
            </div>
          </div>
        </div>

        <div id="businessSupportTicketForm" style="
          display: none;
          background: #FFFFFF;
          border: 1px solid #E6EAF5;
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 12px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
        ">
          <div style="
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) 180px;
            gap: 10px;
            margin-bottom: 10px;
          ">
            <div>
              <label style="display:block; font-size:12px; font-weight:900; color:#374151; margin-bottom:7px;">
                ${businessSupportText('عنوان المشكلة', 'Issue Subject')}
              </label>
              <input
                type="text"
                id="businessSupportTicketSubject"
                maxlength="120"
                placeholder="${businessSupportText('مثال: مشكلة في صفحة الحجز', 'Example: Booking page issue')}"
                style="
                  width: 100%;
                  min-height: 44px;
                  border: 1px solid #DDE3F0;
                  background: #FFFFFF;
                  color: #111827;
                  border-radius: 14px;
                  padding: 0 13px;
                  font-size: 13px;
                  font-weight: 700;
                  outline: none;
                "
              >
            </div>

            <div>
              <label style="display:block; font-size:12px; font-weight:900; color:#374151; margin-bottom:7px;">
                ${businessSupportText('الأولوية', 'Priority')}
              </label>
              <select
                id="businessSupportTicketPriority"
                style="
                  width: 100%;
                  min-height: 44px;
                  border: 1px solid #DDE3F0;
                  background: #FFFFFF;
                  color: #111827;
                  border-radius: 14px;
                  padding: 0 13px;
                  font-size: 13px;
                  font-weight: 800;
                  outline: none;
                "
              >
                <option value="normal">${businessSupportText('عادي', 'Normal')}</option>
                <option value="high">${businessSupportText('مهم', 'High')}</option>
                <option value="urgent">${businessSupportText('عاجل', 'Urgent')}</option>
                <option value="low">${businessSupportText('منخفض', 'Low')}</option>
              </select>
            </div>
          </div>

          <div>
            <label style="display:block; font-size:12px; font-weight:900; color:#374151; margin-bottom:7px;">
              ${businessSupportText('وصف المشكلة', 'Issue Details')}
            </label>
            <textarea
              id="businessSupportTicketMessage"
              maxlength="2000"
              placeholder="${businessSupportText('اكتب تفاصيل المشكلة هنا...', 'Describe the issue here...')}"
              style="
                width: 100%;
                min-height: 118px;
                border: 1px solid #DDE3F0;
                background: #FFFFFF;
                color: #111827;
                border-radius: 16px;
                padding: 13px;
                font-size: 13px;
                font-weight: 700;
                line-height: 1.8;
                outline: none;
                resize: vertical;
              "
            ></textarea>
          </div>

          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
            flex-wrap: wrap;
          ">
            <div style="
              font-size: 12px;
              color: #6B7280;
              line-height: 1.6;
            ">
              ${businessSupportText(
                'سيتم إنشاء محادثة دعم مباشرة، ويظهر الطلب لدى السوبر أدمن.',
                'A live support conversation will be created and shown to the super admin.'
              )}
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <button type="button" id="businessSupportCancelTicketBtn" style="
                border: 1px solid #E5E7EB;
                background: #FFFFFF;
                color: #374151;
                border-radius: 13px;
                padding: 10px 14px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 900;
              ">
                ${businessSupportText('إلغاء', 'Cancel')}
              </button>

              <button type="button" id="businessSupportSubmitTicketBtn" style="
                border: none;
                background: #0E146D;
                color: #FFFFFF;
                border-radius: 13px;
                padding: 10px 15px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 900;
                display: inline-flex;
                align-items: center;
                gap: 7px;
              ">
                <i class="fas fa-paper-plane"></i>
                <span id="businessSupportSubmitTicketBtnText">
                  ${businessSupportText('إرسال الطلب', 'Submit Ticket')}
                </span>
              </button>
            </div>
          </div>
        </div>

<div id="businessSupportWorkArea" style="
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 12px;
          min-height: 430px;
        ">
          <div style="
            background: #FFFFFF;
            border: 1px solid #E6EAF5;
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
            min-height: 430px;
          ">
            <div class="business-support-section-title" style="
              font-size: 13px;
              font-weight: 900;
              color: #111827;
              margin-bottom: 10px;
            ">
              ${businessSupportText('جلسات الدعم', 'Support Sessions')}
            </div>

            <div id="businessSupportSessionsList" class="business-support-sessions-list" style="
              max-height: 378px;
              overflow: auto;
              padding-inline-end: 2px;
            ">
              ${businessSupportText('لا توجد جلسات دعم محملة بعد', 'No support sessions loaded yet')}
            </div>
          </div>

          <div style="
            background: #FFFFFF;
            border: 1px solid #E6EAF5;
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
            min-height: 430px;
            display: flex;
            flex-direction: column;
          ">
            <div id="businessSupportChatHeader" class="business-support-chat-header" style="
              padding-bottom: 10px;
              border-bottom: 1px solid #EEF2F7;
              font-size: 13px;
              font-weight: 900;
              color: #111827;
              min-height: 42px;
              display: flex;
              align-items: center;
            ">
              ${businessSupportText('اختر جلسة دعم لعرض المحادثة', 'Select a support session to view the conversation')}
            </div>

            <div id="businessSupportMessagesList" class="business-support-messages-list" style="
              flex: 1;
              min-height: 290px;
              max-height: 318px;
              overflow: auto;
              padding: 12px 4px;
              background: #FAFBFF;
              border-radius: 15px;
              margin-top: 10px;
            ">
              <div style="padding: 24px; text-align:center; color:#6B7280; font-size:13px;">
                ${businessSupportText('لا توجد محادثة محددة', 'No conversation selected')}
              </div>
            </div>

            <div class="business-support-reply-box" style="
              display: flex;
              gap: 8px;
              align-items: center;
              margin-top: 10px;
            ">
              <input
                type="text"
                id="businessSupportMessageInput"
                placeholder="${businessSupportText('اكتب رسالتك هنا...', 'Type your message here...')}"
                style="
                  flex: 1;
                  min-height: 44px;
                  border: 1px solid #DDE3F0;
                  border-radius: 14px;
                  padding: 0 13px;
                  outline: none;
                  font-size: 13px;
                  font-weight: 700;
                  background: #FFFFFF;
                  color: #111827;
                "
              >

              <button type="button" id="businessSendSupportMessageBtn" class="settings-save" style="
                border: none;
                background: #0E146D;
                color: #FFFFFF;
                border-radius: 14px;
                padding: 0 15px;
                min-height: 44px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 900;
                display: inline-flex;
                align-items: center;
                gap: 7px;
              ">
                <i class="fas fa-paper-plane"></i>
                ${businessSupportText('إرسال', 'Send')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function openBusinessSupportModal() {
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  if (!canDo('use_live_support')) {
    showAlert(
      businessSupportText(
        'ليس لديك صلاحية لاستخدام الدعم الحي',
        'You do not have permission to use live support'
      )
    );
    return;
  }

  const modal = document.getElementById('businessSupportModal');

  if (!modal) {
    console.warn('businessSupportModal غير موجود في index.html');
    return;
  }

  renderBusinessSupportModalShell();

  modal.classList.add('show');

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }

  bindBusinessSupportModalButtons();

  await loadBusinessSupportSessions();
  startBusinessSupportSessionsListAutoRefresh();
}

function toggleBusinessSupportTicketForm(forceState) {
  const form = document.getElementById('businessSupportTicketForm');
  const btnText = document.getElementById('businessSupportToggleTicketFormBtnText');
  const workArea = document.getElementById('businessSupportWorkArea');

  if (!form) return;

  const shouldShow =
    typeof forceState === 'boolean'
      ? forceState
      : form.style.display === 'none';

  form.style.display = shouldShow ? 'block' : 'none';

  if (workArea) {
    workArea.style.display = shouldShow ? 'none' : 'grid';
  }

  if (btnText) {
    btnText.textContent = shouldShow
      ? businessSupportText('إخفاء النموذج', 'Hide Form')
      : businessSupportText('فتح تذكرة', 'Open Ticket');
  }

  if (shouldShow) {
    const subjectInput = document.getElementById('businessSupportTicketSubject');
    if (subjectInput) subjectInput.focus();
  }
}

async function submitBusinessSupportTicket() {
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const subjectInput = document.getElementById('businessSupportTicketSubject');
  const priorityInput = document.getElementById('businessSupportTicketPriority');
  const messageInput = document.getElementById('businessSupportTicketMessage');
  const submitBtn = document.getElementById('businessSupportSubmitTicketBtn');

  const subject = subjectInput ? subjectInput.value.trim() : '';
  const priority = priorityInput ? priorityInput.value : 'normal';
  const messageBody = messageInput ? messageInput.value.trim() : '';

  if (!messageBody) {
    showAlert(
      businessSupportText(
        'اكتب وصف المشكلة قبل إرسال الطلب',
        'Describe the issue before submitting the ticket'
      )
    );
    return;
  }

  if (messageBody.length > 2000) {
    showAlert(
      businessSupportText(
        'وصف المشكلة طويل جدًا. الحد الأقصى 2000 حرف.',
        'The issue details are too long. Maximum is 2000 characters.'
      )
    );
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>${businessSupportText('جاري الإرسال...', 'Submitting...')}</span>
      `;
    }

    const { data, error } = await supabase.rpc('create_my_support_session', {
      p_subject: subject || businessSupportText('طلب دعم', 'Support Request'),
      p_message_body: messageBody,
      p_priority: priority || 'normal'
    });

    if (error) {
      console.error('فشل إنشاء تذكرة الدعم:', error);
      showAlert(
        businessSupportText(
          'فشل إنشاء تذكرة الدعم',
          'Failed to create support ticket'
        )
      );
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row || row.success !== true) {
      const errorCode = row?.message || 'UNKNOWN_ERROR';

if (errorCode === 'ACTIVE_SESSION_EXISTS') {
  if (subjectInput) subjectInput.value = '';
  if (messageInput) messageInput.value = '';
  if (priorityInput) priorityInput.value = 'normal';

  toggleBusinessSupportTicketForm(false);

  await loadBusinessSupportSessions();

  if (row.session_id) {
    await openBusinessSupportSession(row.session_id);
  }

  showAlert(
    businessSupportText(
      'لديك تذكرة دعم مفتوحة بالفعل، تم فتحها لك الآن.',
      'You already have an active support ticket. It has been opened for you.'
    )
  );

  return;
}

const translatedMessage =
  errorCode === 'NOT_AUTHENTICATED'
    ? businessSupportText('يجب تسجيل الدخول أولًا', 'You must sign in first')
    : errorCode === 'USER_OR_BUSINESS_NOT_FOUND'
      ? businessSupportText('تعذر معرفة بيانات المطعم', 'Could not identify the business account')
      : errorCode === 'PERMISSION_DENIED'
        ? businessSupportText('ليس لديك صلاحية فتح تذكرة دعم', 'You do not have permission to open a support ticket')
        : errorCode === 'MESSAGE_REQUIRED'
          ? businessSupportText('وصف المشكلة مطلوب', 'Issue details are required')
          : errorCode === 'MESSAGE_TOO_LONG'
            ? businessSupportText('وصف المشكلة طويل جدًا', 'Issue details are too long')
            : businessSupportText('فشل إنشاء تذكرة الدعم', 'Failed to create support ticket');

showAlert(translatedMessage);
return;
    }

    if (subjectInput) subjectInput.value = '';
    if (messageInput) messageInput.value = '';
    if (priorityInput) priorityInput.value = 'normal';

    toggleBusinessSupportTicketForm(false);

    await loadBusinessSupportSessions();

    if (row.session_id) {
      await openBusinessSupportSession(row.session_id);
    }

    if (typeof updateBusinessSupportSidebarBadge === 'function') {
      await updateBusinessSupportSidebarBadge();
    }

    if (typeof showSuccessNotification === 'function') {
      showSuccessNotification(
        businessSupportText(
          'تم فتح تذكرة الدعم بنجاح',
          'Support ticket opened successfully'
        )
      );
    }

  } catch (err) {
    console.error('خطأ غير متوقع أثناء إنشاء تذكرة الدعم:', err);

    showAlert(
      businessSupportText(
        'حدث خطأ أثناء إنشاء تذكرة الدعم',
        'An error occurred while creating the support ticket'
      )
    );

  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.innerHTML = `
        <i class="fas fa-paper-plane"></i>
        <span id="businessSupportSubmitTicketBtnText">
          ${businessSupportText('إرسال الطلب', 'Submit Ticket')}
        </span>
      `;
    }
  }
}

async function loadBusinessSupportSessions() {
  const sessionsContainer = document.getElementById('businessSupportSessionsList');

  if (!sessionsContainer) {
    console.warn('businessSupportSessionsList غير موجود داخل مودل الدعم');
    return;
  }

  const isEnglish = getBusinessSupportLang() === 'en';
  const dateLocale = isEnglish ? 'en-US' : 'ar-SA';

  try {
    sessionsContainer.innerHTML = `
      <div style="padding: 18px; text-align: center; color: #6B7280;">
        ${businessSupportEscapeHtml(businessSupportText('جاري تحميل جلسات الدعم...', 'Loading support sessions...'))}
      </div>
    `;

    const { data, error } = await supabase.rpc('get_my_support_sessions');

    if (error) {
      console.error('فشل تحميل جلسات دعم المطعم:', error);

      sessionsContainer.innerHTML = `
        <div style="padding: 18px; text-align: center; color: #DC2626;">
          ${businessSupportEscapeHtml(businessSupportText('فشل تحميل جلسات الدعم', 'Failed to load support sessions'))}
        </div>
      `;

      return;
    }

    const sessions = Array.isArray(data) ? data : [];

    if (sessions.length === 0) {
      sessionsContainer.innerHTML = `
        <div style="padding: 18px; text-align: center; color: #6B7280;">
          ${businessSupportEscapeHtml(businessSupportText('لا توجد جلسات دعم حتى الآن', 'No support sessions yet'))}
        </div>
      `;

      return;
    }

    sessionsContainer.innerHTML = renderBusinessSupportSessionsCardsHtml(sessions, dateLocale);
    bindBusinessSupportSessionCards(sessionsContainer);

  } catch (err) {
    console.error('خطأ غير متوقع أثناء تحميل جلسات دعم المطعم:', err);

    sessionsContainer.innerHTML = `
      <div style="padding: 18px; text-align: center; color: #DC2626;">
        ${businessSupportEscapeHtml(businessSupportText('حدث خطأ أثناء تحميل جلسات الدعم', 'An error occurred while loading support sessions'))}
      </div>
    `;
  }
}

let currentBusinessSupportSessionId = null;

function renderBusinessSupportMessagesHtml(messages) {
  return messages.map(msg => {
    const isSystem = msg.message_type === 'system';
    const isBusiness = msg.sender_role !== 'super_admin';

    const safeMessageBody = businessSupportEscapeHtml(msg.message_body || '');

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
            white-space: pre-wrap;
            word-break: break-word;
          ">
            ${safeMessageBody}
          </span>
        </div>
      `;
    }

    const timeText = msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString(getBusinessSupportLang() === 'en' ? 'en-US' : 'ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    const safeTimeText = businessSupportEscapeHtml(timeText);

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
          ">${safeMessageBody}</span>

          <span style="
            display: block;
            align-self: flex-end;
            font-size: 8.5px;
            line-height: 1;
            margin-top: 2px;
            opacity: 0.55;
            color: ${isBusiness ? 'rgba(255,255,255,0.72)' : '#6B7280'};
          ">${safeTimeText}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function openBusinessSupportSession(sessionId) {
  const safeSessionIdValue = String(sessionId || '').trim();

  if (!safeSessionIdValue) {
    alert(businessSupportText(
      'لم يتم تحديد جلسة الدعم',
      'No support session was selected'
    ));
    return;
  }

  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  currentBusinessSupportSessionId = safeSessionIdValue;

  const header = document.getElementById('businessSupportChatHeader');
  const messagesContainer = document.getElementById('businessSupportMessagesList');
  const input = document.getElementById('businessSupportMessageInput');
  const sendBtn = document.getElementById('businessSendSupportMessageBtn');

  if (header) {
    header.textContent = businessSupportText(
      'جاري تحميل بيانات الجلسة...',
      'Loading session details...'
    );
  }

  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #6B7280;">
        ${businessSupportEscapeHtml(businessSupportText('جاري تحميل المحادثة...', 'Loading conversation...'))}
      </div>
    `;
  }

  try {
    try {
      await supabase.rpc('mark_support_session_read', {
        p_session_id: safeSessionIdValue
      });
    } catch (readErr) {
      console.warn('تعذر تعليم رسائل الدعم كمقروءة للمطعم:', readErr);
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .rpc('get_my_support_sessions');

    if (sessionsError) throw sessionsError;

    const sessions = Array.isArray(sessionsData) ? sessionsData : [];
    const session = sessions.find(item => {
      const itemId = item.session_id || item.id;
      return itemId === safeSessionIdValue;
    });

    const statusMeta = businessSupportGetStatusMeta(session?.status);
    const safeStatusLabel = businessSupportEscapeHtml(statusMeta.label);
    const safeSubject = businessSupportEscapeHtml(
      session?.subject || businessSupportText('طلب دعم', 'Support Request')
    );

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
              ${safeSubject}
            </div>

            <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
              ${businessSupportEscapeHtml(businessSupportText('حالة الجلسة:', 'Session status:'))} ${safeStatusLabel}
            </div>
          </div>

          <button type="button" id="businessSupportRefreshSessionBtn" style="
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
            ${businessSupportEscapeHtml(businessSupportText('تحديث', 'Refresh'))}
          </button>
        </div>
      `;

      document.getElementById('businessSupportRefreshSessionBtn')?.addEventListener('click', async function () {
        await openBusinessSupportSession(currentBusinessSupportSessionId);
      });
    }

    if (session?.status === 'closed') {
      if (input) {
        input.value = '';
        input.disabled = true;
        input.placeholder = businessSupportText(
          'لا يمكن الرد على جلسة مغلقة',
          'You cannot reply to a closed session'
        );
      }

      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';
        sendBtn.style.cursor = 'not-allowed';
      }
    } else {
      if (input) {
        input.disabled = false;
        input.placeholder = businessSupportText(
          'اكتب رسالتك هنا...',
          'Type your message here...'
        );
      }

      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        sendBtn.style.cursor = 'pointer';
        sendBtn.innerHTML = `
          <i class="fas fa-paper-plane"></i>
          ${businessSupportEscapeHtml(businessSupportText('إرسال', 'Send'))}
        `;
      }
    }

    const { data: messagesData, error: messagesError } = await supabase
      .rpc('get_support_session_messages', {
        p_session_id: safeSessionIdValue
      });

    if (messagesError) throw messagesError;

    const messages = Array.isArray(messagesData) ? messagesData : [];

    if (!messagesContainer) return;

    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #6B7280;">
          ${businessSupportEscapeHtml(
            businessSupportText(
              'لا توجد رسائل في هذه الجلسة حتى الآن',
              'There are no messages in this session yet'
            )
          )}
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
          ${businessSupportEscapeHtml(businessSupportText('فشل تحميل المحادثة', 'Failed to load conversation'))}
        </div>
      `;
    }

    if (header) {
      header.textContent = businessSupportText(
        'تعذر تحميل جلسة الدعم',
        'Could not load support session'
      );
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

  const toggleTicketBtn = document.getElementById('businessSupportToggleTicketFormBtn');

  if (toggleTicketBtn && toggleTicketBtn.dataset.bound !== 'true') {
    toggleTicketBtn.dataset.bound = 'true';

    toggleTicketBtn.addEventListener('click', function (event) {
      event.preventDefault();
      toggleBusinessSupportTicketForm();
    });
  }

  const cancelTicketBtn = document.getElementById('businessSupportCancelTicketBtn');

  if (cancelTicketBtn && cancelTicketBtn.dataset.bound !== 'true') {
    cancelTicketBtn.dataset.bound = 'true';

    cancelTicketBtn.addEventListener('click', function (event) {
      event.preventDefault();
      toggleBusinessSupportTicketForm(false);
    });
  }

  const submitTicketBtn = document.getElementById('businessSupportSubmitTicketBtn');

  if (submitTicketBtn && submitTicketBtn.dataset.bound !== 'true') {
    submitTicketBtn.dataset.bound = 'true';

    submitTicketBtn.addEventListener('click', async function (event) {
      event.preventDefault();
      await submitBusinessSupportTicket();
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
    alert(businessSupportText(
      'اختر جلسة دعم أولًا',
      'Select a support session first'
    ));
    return;
  }

  const input = document.getElementById('businessSupportMessageInput');
  const sendBtn = document.getElementById('businessSendSupportMessageBtn');

  if (!input) {
    alert(businessSupportText(
      'حقل الرسالة غير موجود',
      'Message field was not found'
    ));
    return;
  }

  const messageBody = input.value.trim();

  if (!messageBody) {
    alert(businessSupportText(
      'اكتب رسالة قبل الإرسال',
      'Type a message before sending'
    ));
    return;
  }

  try {
    input.disabled = true;

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        ${businessSupportText('جاري الإرسال...', 'Sending...')}
      `;
    }

    const { data, error } = await supabase.rpc('send_support_message', {
      p_session_id: currentBusinessSupportSessionId,
      p_message_body: messageBody,
      p_is_internal: false
    });

    if (error) {
      console.error('فشل إرسال رسالة الدعم من جهة المطعم:', error);

      alert(
        businessSupportText(
          'فشل إرسال الرسالة: ',
          'Failed to send message: '
        ) + error.message
      );

      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (row && row.success === false) {
      alert(row.message || businessSupportText(
        'فشل إرسال الرسالة',
        'Failed to send message'
      ));
      return;
    }

    input.value = '';

    await refreshBusinessSupportSessionSilently(currentBusinessSupportSessionId);

  } catch (err) {
    console.error('خطأ غير متوقع أثناء إرسال رسالة الدعم:', err);

    alert(businessSupportText(
      'حدث خطأ أثناء إرسال الرسالة',
      'An error occurred while sending the message'
    ));

  } finally {
    if (input) {
      input.disabled = false;
      input.focus();
      input.placeholder = businessSupportText(
        'اكتب رسالتك هنا...',
        'Type your message here...'
      );
    }

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = `
        <i class="fas fa-paper-plane"></i>
        ${businessSupportText('إرسال', 'Send')}
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
      input.placeholder = businessSupportText(
        'لا يمكن الرد على جلسة مغلقة',
        'You cannot reply to a closed session'
      );
    }

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.5';
      sendBtn.style.cursor = 'not-allowed';
    }
  } else {
    if (input) {
      input.disabled = false;
      input.placeholder = businessSupportText(
        'اكتب رسالتك هنا...',
        'Type your message here...'
      );
    }

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor = 'pointer';
      sendBtn.innerHTML = `
        <i class="fas fa-paper-plane"></i>
        ${businessSupportText('إرسال', 'Send')}
      `;
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
        ${businessSupportText(
          'لا توجد رسائل في هذه الجلسة حتى الآن',
          'There are no messages in this session yet'
        )}
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

  const isEnglish = getBusinessSupportLang() === 'en';
  const dateLocale = isEnglish ? 'en-US' : 'ar-SA';

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
        ${businessSupportEscapeHtml(businessSupportText('لا توجد جلسات دعم حتى الآن', 'No support sessions yet'))}
      </div>
    `;
    return;
  }

  sessionsContainer.innerHTML = renderBusinessSupportSessionsCardsHtml(sessions, dateLocale);
  bindBusinessSupportSessionCards(sessionsContainer);
}

async function createBusinessSupportVerificationCode() {
  if (document.body.classList.contains('super-admin-mode')) return;
  if (currentUser?.role === 'super_admin') return;

  const codeValueEl = document.getElementById('businessSupportCodeValue');
  const codeHintEl = document.getElementById('businessSupportCodeHint');
  const createCodeBtn = document.getElementById('businessCreateSupportCodeBtn');

  function applyCreateCodeButtonStyle() {
    if (!createCodeBtn) return;

    createCodeBtn.style.setProperty('width', '100%', 'important');
    createCodeBtn.style.setProperty('max-width', '100%', 'important');
    createCodeBtn.style.setProperty('min-width', '0', 'important');
    createCodeBtn.style.setProperty('padding', '9px 10px', 'important');
    createCodeBtn.style.setProperty('font-size', '12px', 'important');
    createCodeBtn.style.setProperty('line-height', '1.25', 'important');
    createCodeBtn.style.setProperty('white-space', 'normal', 'important');
    createCodeBtn.style.setProperty('text-align', 'center', 'important');
    createCodeBtn.style.setProperty('justify-content', 'center', 'important');
    createCodeBtn.style.setProperty('gap', '6px', 'important');

    const btnText = createCodeBtn.querySelector('span');
    if (btnText) {
      btnText.style.setProperty('white-space', 'normal', 'important');
      btnText.style.setProperty('line-height', '1.25', 'important');
      btnText.style.setProperty('min-width', '0', 'important');
    }
  }

  function applyCodeValueStyle() {
    if (!codeValueEl) return;

    codeValueEl.style.setProperty('font-size', '12px', 'important');
    codeValueEl.style.setProperty('line-height', '1.4', 'important');
    codeValueEl.style.setProperty('font-weight', '900', 'important');
    codeValueEl.style.setProperty('text-align', 'center', 'important');
    codeValueEl.style.setProperty('white-space', 'normal', 'important');
    codeValueEl.style.setProperty('word-break', 'break-word', 'important');
    codeValueEl.style.setProperty('overflow-wrap', 'anywhere', 'important');
    codeValueEl.style.setProperty('max-width', '100%', 'important');
  }

  try {
    if (createCodeBtn) {
      createCodeBtn.disabled = true;
      createCodeBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>${businessSupportText('جاري إنشاء الرمز...', 'Creating code...')}</span>
      `;
      applyCreateCodeButtonStyle();
    }

    if (codeValueEl) {
      codeValueEl.innerText = businessSupportText(
        'جاري إنشاء الرمز...',
        'Creating code...'
      );
      applyCodeValueStyle();
    }

    if (codeHintEl) {
      codeHintEl.innerText = businessSupportText(
        'يرجى الانتظار لحظات',
        'Please wait a moment'
      );
    }

    const { data, error } = await supabase.rpc('create_support_verification_code');

    if (error) {
      console.error('فشل إنشاء رمز الدعم:', error);

      if (codeValueEl) {
        codeValueEl.innerText = businessSupportText(
          'تعذر إنشاء الرمز',
          'Could not create code'
        );
        applyCodeValueStyle();
      }

      if (codeHintEl) {
        codeHintEl.innerText = error.message || businessSupportText(
          'تأكد أن حسابك يملك صلاحية طلب الدعم',
          'Make sure your account has permission to request support'
        );
      }

      if (typeof showAlert === 'function') {
        showAlert(businessSupportText(
          'فشل إنشاء رمز الدعم',
          'Failed to create support code'
        ));
      } else {
        alert(businessSupportText(
          'فشل إنشاء رمز الدعم',
          'Failed to create support code'
        ));
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
        codeValueEl.innerText = businessSupportText(
          'تم إنشاء الرمز ولكن لم يتم عرضه',
          'The code was created but could not be displayed'
        );
        applyCodeValueStyle();
      }

      if (codeHintEl) {
        codeHintEl.innerText = businessSupportText(
          'راجع نتيجة الدالة في Console',
          'Check the function result in the console'
        );
      }

      return;
    }

    if (codeValueEl) {
      codeValueEl.innerText = supportCode;
      applyCodeValueStyle();
    }

    if (codeHintEl) {
      const expiryText = expiresAt
        ? new Date(expiresAt).toLocaleString(getBusinessSupportLang() === 'en' ? 'en-US' : 'ar-SA')
        : businessSupportText('10 دقائق من الآن', '10 minutes from now');

      codeHintEl.innerText = businessSupportText(
        `أرسل هذا الرمز للسوبر أدمن. صالح حتى: ${expiryText}`,
        `Send this code to the super admin. Valid until: ${expiryText}`
      );
    }

    if (typeof showSuccessNotification === 'function') {
      showSuccessNotification(businessSupportText(
        'تم إنشاء رمز الدعم بنجاح',
        'Support code created successfully'
      ));
    }

  } catch (err) {
    console.error('خطأ غير متوقع أثناء إنشاء رمز الدعم:', err);

    if (codeValueEl) {
      codeValueEl.innerText = businessSupportText(
        'حدث خطأ غير متوقع',
        'An unexpected error occurred'
      );
      applyCodeValueStyle();
    }

    if (codeHintEl) {
      codeHintEl.innerText = err.message || businessSupportText(
        'حاول مرة أخرى',
        'Please try again'
      );
    }

    if (typeof showAlert === 'function') {
      showAlert(businessSupportText(
        'حدث خطأ أثناء إنشاء رمز الدعم',
        'An error occurred while creating the support code'
      ));
    } else {
      alert(businessSupportText(
        'حدث خطأ أثناء إنشاء رمز الدعم',
        'An error occurred while creating the support code'
      ));
    }

  } finally {
    if (createCodeBtn) {
      createCodeBtn.disabled = false;
      createCodeBtn.innerHTML = `
        <i class="fas fa-key"></i>
        <span>${businessSupportText('إنشاء رمز دعم', 'Create Support Code')}</span>
      `;
      applyCreateCodeButtonStyle();
    }
  }
}

function getMyAccountLang() {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    currentLang ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function myAccountText(arText, enText) {
  return getMyAccountLang() === 'en' ? enText : arText;
}

function toggleMyAccountPasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (!input) return;

  const shouldShow = input.type === 'password';
  input.type = shouldShow ? 'text' : 'password';

  if (icon) {
    icon.className = shouldShow ? 'fas fa-eye-slash' : 'fas fa-eye';
  }
}

function applyMyAccountModalText() {
  const modal = document.getElementById('myAccountModal');
  if (!modal) return;

  const isEnglish = getMyAccountLang() === 'en';

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const arToEn = {
    'حسابي': 'My Account',
    'تحديث الاسم الظاهر أو تغيير كلمة المرور': 'Update display name or change password',

    'بيانات الحساب': 'Account Details',
    'الاسم الظاهر': 'Display Name',
    'البريد الإلكتروني': 'Email Address',
    'البريد مرتبط بتسجيل الدخول ولا يمكن تعديله من هنا.': 'This email is linked to login and cannot be edited here.',

    'تغيير كلمة المرور': 'Change Password',
    'اترك حقول كلمة المرور فارغة إذا كنت تريد تحديث الاسم فقط.': 'Leave password fields blank if you only want to update the name.',
    'كلمة المرور الجديدة': 'New Password',
    'تأكيد كلمة المرور': 'Confirm Password',
    'تأكيد كلمة المرور الجديدة': 'Confirm New Password',

    'لا يمكن تغيير الدور أو الصلاحيات من هنا. هذه الصفحة مخصصة للاسم الظاهر وكلمة المرور فقط.': 'You cannot change your role or permissions here. This page is only for display name and password.',
    'لا يمكن تغيير المنصب أو الصلاحيات من هنا. هذه الصفحة مخصصة لبيانات حسابك الشخصي فقط.': 'You cannot change your role or permissions here. This page is only for your personal account details.',

    'حفظ': 'Save',
    'إلغاء': 'Cancel',
    'إغلاق': 'Close'
  };

  const enToAr = Object.fromEntries(
    Object.entries(arToEn).map(([ar, en]) => [en, ar])
  );

  const map = isEnglish ? arToEn : enToAr;

  // ترجمة النصوص حتى لو كانت داخل div مع أيقونة أو عناصر داخلية
  const walker = document.createTreeWalker(
    modal,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const text = node.nodeValue.trim();
        return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  let node;

  while ((node = walker.nextNode())) {
    const originalText = node.nodeValue;
    const cleanText = originalText.trim();

    if (map[cleanText]) {
      node.nodeValue = originalText.replace(cleanText, map[cleanText]);
    }
  }

  const displayNameInput = document.getElementById('myAccountDisplayName');
  const emailInput = document.getElementById('myAccountEmail');
  const newPasswordInput = document.getElementById('myAccountNewPassword');
  const confirmPasswordInput = document.getElementById('myAccountConfirmPassword');

  if (displayNameInput) {
    displayNameInput.placeholder = myAccountText('الاسم الظاهر', 'Display name');
  }

  if (emailInput) {
    emailInput.placeholder = myAccountText('البريد الإلكتروني', 'Email address');
  }

  if (newPasswordInput) {
    newPasswordInput.placeholder = myAccountText(
      'اتركها فارغة إذا لا تريد تغييرها',
      'Leave blank if you do not want to change it'
    );
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.placeholder = myAccountText(
      'تأكيد كلمة المرور',
      'Confirm password'
    );
  }

  // زر الإغلاق العلوي يكون × فقط
  const topCloseBtn = Array.from(modal.querySelectorAll('button')).find(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    const text = btn.textContent.trim();
    return onclick.includes('closeMyAccountModal') && (text === 'Close' || text === 'إغلاق' || text === '×');
  });

  if (topCloseBtn) {
    topCloseBtn.innerHTML = '&times;';
    topCloseBtn.setAttribute('aria-label', myAccountText('إغلاق', 'Close'));
    topCloseBtn.setAttribute('title', myAccountText('إغلاق', 'Close'));
  }

  // زر الحفظ السفلي
  const saveBtn = Array.from(modal.querySelectorAll('button')).find(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    return onclick.includes('saveMyAccount');
  });

  if (saveBtn) {
    saveBtn.textContent = myAccountText('حفظ', 'Save');
  }

  // زر الإلغاء السفلي
  const cancelBtn = Array.from(modal.querySelectorAll('button')).find(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    return onclick.includes('closeMyAccountModal') && btn !== topCloseBtn;
  });

  if (cancelBtn) {
    cancelBtn.textContent = myAccountText('إلغاء', 'X');
  }
}

function openMyAccountModal() {
  if (!currentUser) {
    showAlert(myAccountText(
      'لم يتم تحميل بيانات المستخدم',
      'User data has not been loaded'
    ));
    return;
  }

  // لا نفتح حسابي داخل وضع السوبر أدمن من لوحة المطعم
  if (currentUser.role === 'super_admin' || document.body.classList.contains('super-admin-mode')) {
    return;
  }

  const modal = document.getElementById('myAccountModal');
  const displayNameInput = document.getElementById('myAccountDisplayName');
  const emailInput = document.getElementById('myAccountEmail');
  const newPasswordInput = document.getElementById('myAccountNewPassword');
  const confirmPasswordInput = document.getElementById('myAccountConfirmPassword');

  if (!modal) {
    console.warn('myAccountModal غير موجود في index.html');
    return;
  }

  applyMyAccountModalText();

  if (displayNameInput) {
    displayNameInput.value = currentUser.display_name || '';
  }

  if (emailInput) {
    emailInput.value = currentUser.username || currentUser.email || '';
  }

  if (newPasswordInput) {
    newPasswordInput.value = '';
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.value = '';
  }

  modal.classList.add('show');
}

function closeMyAccountModal() {
  const modal = document.getElementById('myAccountModal');
  if (modal) modal.classList.remove('show');
}

async function saveMyAccount() {
  if (!currentUser) {
    showAlert(myAccountText(
      'لم يتم تحميل بيانات المستخدم',
      'User data has not been loaded'
    ));
    return;
  }

  if (currentUser.role === 'super_admin' || document.body.classList.contains('super-admin-mode')) {
    return;
  }

  const displayNameInput = document.getElementById('myAccountDisplayName');
  const newPasswordInput = document.getElementById('myAccountNewPassword');
  const confirmPasswordInput = document.getElementById('myAccountConfirmPassword');

  const newDisplayName = displayNameInput ? displayNameInput.value.trim() : '';
  const newPassword = newPasswordInput ? newPasswordInput.value.trim() : '';
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';

  if (!newDisplayName) {
    showAlert(myAccountText(
      'الاسم الظاهر مطلوب',
      'Display name is required'
    ));
    return;
  }

  if (newPassword || confirmPassword) {
    if (newPassword.length < 8) {
      showAlert(myAccountText(
        'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
        'Password must be at least 8 characters'
      ));
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert(myAccountText(
        'كلمة المرور وتأكيدها غير متطابقين',
        'Password and confirmation do not match'
      ));
      return;
    }
  }

  try {
    const { data: updatedUser, error: updateUserError } = await supabase
      .rpc('easyq_update_my_display_name', {
        p_display_name: newDisplayName
      });

    if (updateUserError || !updatedUser) {
      console.error('فشل تحديث الاسم الظاهر:', updateUserError);
      showAlert(myAccountText(
        'فشل تحديث الاسم الظاهر',
        'Failed to update display name'
      ));
      return;
    }

    if (newPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (passwordError) {
        console.error('فشل تغيير كلمة المرور:', passwordError);

        const passwordErrorMessage =
          passwordError.message ||
          passwordError.error_description ||
          passwordError.msg ||
          '';

        const translatedPasswordError =
          passwordErrorMessage.includes('New password should be different from the old password')
            ? myAccountText(
                'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور السابقة',
                'The new password must be different from the old password'
              )
            : passwordErrorMessage;

        showAlert(
          myAccountText(
            `تم تحديث الاسم، لكن فشل تغيير كلمة المرور: ${translatedPasswordError}`,
            `Display name was updated, but password change failed: ${translatedPasswordError}`
          )
        );

        return;
      }
    }

    currentUser = updatedUser;
    localStorage.setItem('easyq_user', JSON.stringify(updatedUser));

    updateTopbarUserIdentity(updatedUser);

    closeMyAccountModal();

    if (typeof showSuccessNotification === 'function') {
      showSuccessNotification(
        newPassword
          ? myAccountText('تم تحديث الحساب وكلمة المرور بنجاح', 'Account and password updated successfully')
          : myAccountText('تم تحديث بيانات الحساب بنجاح', 'Account details updated successfully')
      );
    } else {
      alert(myAccountText(
        'تم تحديث بيانات الحساب بنجاح',
        'Account details updated successfully'
      ));
    }

  } catch (err) {
    console.error('خطأ غير متوقع أثناء حفظ الحساب:', err);

    showAlert(myAccountText(
      'حدث خطأ أثناء حفظ بيانات الحساب',
      'An error occurred while saving account details'
    ));
  }
}

const EASYQ_REMEMBER_LOGIN_KEY = 'easyq_remember_login_email';

function saveRememberedLogin(email, shouldRemember) {
  if (!email) return;

  if (shouldRemember) {
    localStorage.setItem(EASYQ_REMEMBER_LOGIN_KEY, JSON.stringify({
      email: email,
      saved_at: new Date().toISOString()
    }));
  } else {
    localStorage.removeItem(EASYQ_REMEMBER_LOGIN_KEY);
  }
}

function getRememberedLoginEmail() {
  try {
    const raw = localStorage.getItem(EASYQ_REMEMBER_LOGIN_KEY);
    if (!raw) return '';

    const data = JSON.parse(raw);
    return data?.email || '';
  } catch (_) {
    localStorage.removeItem(EASYQ_REMEMBER_LOGIN_KEY);
    return '';
  }
}

function applyRememberedLogin() {
  const rememberedEmail = getRememberedLoginEmail();

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const rememberCheckbox = document.getElementById('rememberLogin');

  if (usernameInput && rememberedEmail) {
    usernameInput.value = rememberedEmail;
  }

  if (passwordInput) {
    passwordInput.value = '';
  }

  if (rememberCheckbox) {
    rememberCheckbox.checked = !!rememberedEmail;
  }
}

document.addEventListener('DOMContentLoaded', applyRememberedLogin);
window.addEventListener('load', applyRememberedLogin);

function setLoginLoading(isLoading) {
  const loginBtn = document.getElementById('premiumLoginBtn');
  const loginBtnText = document.getElementById('premiumLoginBtnText');
  const loginBtnSpinner = document.getElementById('premiumLoginBtnSpinner');

  if (!loginBtn || !loginBtnText || !loginBtnSpinner) return;

  if (isLoading) {
    loginBtn.disabled = true;
    loginBtn.style.opacity = '0.75';
    loginBtn.style.cursor = 'not-allowed';
    loginBtnText.innerText = 'جاري تسجيل الدخول';
    loginBtnSpinner.style.display = 'inline-block';
  } else {
    loginBtn.disabled = false;
    loginBtn.style.opacity = '1';
    loginBtn.style.cursor = 'pointer';
    loginBtnText.innerText = 'تسجيل الدخول';
    loginBtnSpinner.style.display = 'none';
  }
}

function getCurrentUserRoleLabel(role) {
  const labels = {
    admin: 'مدير النظام',
    manager: 'مدير',
    staff: 'موظف',
    super_admin: 'سوبر أدمن'
  };

  return labels[role] || role || 'غير محدد';
}

function updateTopbarUserIdentity(user) {
  const currentUserNameSpan = document.getElementById('currentUserName');

  if (!currentUserNameSpan || !user) return;

  const displayName = user.display_name || 'مستخدم';
  const roleLabel = getCurrentUserRoleLabel(user.role);

  currentUserNameSpan.innerHTML = `
    <span>${displayName}</span>
    <span style="
      display:inline-flex;
      align-items:center;
      justify-content:center;
      margin-right:6px;
      padding:3px 8px;
      border-radius:999px;
      background:rgba(255,255,255,0.14);
      color:#F4D28A;
      font-size:10px;
      font-weight:900;
      line-height:1;
      white-space:nowrap;
      vertical-align:middle;
    ">
      ${roleLabel}
    </span>
  `;
}

let currentUserProfileRefreshInterval = null;
let isRefreshingCurrentUserProfile = false;

async function refreshCurrentUserProfile() {
  if (!currentUser || currentUser.role === 'super_admin') return;
  if (document.body.classList.contains('super-admin-mode')) return;
  if (isRefreshingCurrentUserProfile) return;

  try {
    isRefreshingCurrentUserProfile = true;

    const { data: freshUser, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', currentUser.id)
      .eq('is_active', true)
      .single();

    if (error || !freshUser) {
      console.warn('تعذر تحديث بيانات المستخدم الحالي:', error);

      // إذا تم إيقاف الحساب من الأدمن لاحقًا، نسجل خروج
      if (error?.code === 'PGRST116') {
        showAlert('تم إيقاف هذا الحساب أو لم يعد متاحًا. سيتم تسجيل الخروج.');
        setTimeout(() => logoutAndClean(), 1200);
      }

      return;
    }

    const oldRole = currentUser.role;
    const oldDisplayName = currentUser.display_name;

    currentUser = freshUser;
    localStorage.setItem('easyq_user', JSON.stringify(freshUser));

    if (
      freshUser.role !== oldRole ||
      freshUser.display_name !== oldDisplayName
    ) {
      updateTopbarUserIdentity(freshUser);

      if (typeof loadUserPermissions === 'function') {
        await loadUserPermissions();
      }

      if (typeof showSuccessNotification === 'function') {
        showSuccessNotification('تم تحديث بيانات حسابك وصلاحياتك');
      }
    }

  } catch (err) {
    console.warn('خطأ غير متوقع أثناء تحديث بيانات المستخدم الحالي:', err);

  } finally {
    isRefreshingCurrentUserProfile = false;
  }
}

function startCurrentUserProfileAutoRefresh() {
  stopCurrentUserProfileAutoRefresh();

  currentUserProfileRefreshInterval = setInterval(() => {
    refreshCurrentUserProfile();
  }, 30000);
}

function stopCurrentUserProfileAutoRefresh() {
  if (currentUserProfileRefreshInterval) {
    clearInterval(currentUserProfileRefreshInterval);
    currentUserProfileRefreshInterval = null;
  }
}

// عند رجوع المستخدم للتبويب يحدث بياناته فورًا
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    refreshCurrentUserProfile();
  }
});

window.addEventListener('focus', function () {
  refreshCurrentUserProfile();
});

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
const errorEl = document.getElementById('loginError');
if (errorEl) {
  errorEl.classList.remove('show');
  errorEl.style.display = '';
  errorEl.innerText = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
}
  setLoginLoading(true);
  
if (!username || !password) {
  if (errorEl) errorEl.classList.add('show');
  setLoginLoading(false);
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
  setLoginLoading(false);
  return;
}

const rememberCheckbox = document.getElementById('rememberLogin');
saveRememberedLogin(email, rememberCheckbox?.checked === true);
    
    // جلب بيانات المستخدم
const { data: user, error: userError } = await supabase
  .from('app_users')
  .select('*')
  .eq('auth_id', authData.user.id)
  .single();

if (userError || !user) {
  console.error("User data error:", userError);

  if (errorEl) {
    errorEl.innerText = 'لم يتم العثور على حساب مرتبط بهذا البريد. يرجى التواصل مع إدارة EASY-Q.';
    errorEl.classList.add('show');
  }

  await supabase.auth.signOut();
  setLoginLoading(false);
  return;
}

if (user.is_active === false) {
  if (errorEl) {
    errorEl.innerText = 'تم إيقاف هذا الحساب من قبل المدير . يرجى التواصل مع الإدارة .';
    errorEl.classList.add('show');
  }

  await supabase.auth.signOut();
  setLoginLoading(false);
  return;
}
    
    // 🔥 الشرط هنا بعد جلب user (المكان الصحيح)
if (user.role === 'super_admin') {
  currentUser = user;
  localStorage.setItem('easyq_user', JSON.stringify(user));

  // إعادة زر تسجيل الدخول لحالته الطبيعية بعد نجاح دخول السوبر أدمن
  setLoginLoading(false);

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

  setLoginLoading(false);
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

  setLoginLoading(false);
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

  setLoginLoading(false);
  return;
}

// حفظ بيانات المستخدم والاشتراك بعد نجاح الفحص
currentUser = user;
localStorage.setItem('easyq_user', JSON.stringify(user));
localStorage.setItem('easyq_license_status', JSON.stringify(licenseStatus));

await logBusinessActivitySafe(
  'user_logged_in',
  'تسجيل دخول',
  'app_user',
  user.id,
  user.display_name || user.username || 'مستخدم',
  {
    username: user.username || '',
    login_method: 'email_password'
  }
);

// إعادة زر تسجيل الدخول لحالته الطبيعية بعد نجاح الدخول
setLoginLoading(false);

const loginOverlay = document.getElementById('loginOverlay');
if (loginOverlay) loginOverlay.style.display = 'none';

document.body.classList.add('logged-in');

await loadUserPermissions();
startCurrentUserProfileAutoRefresh();
/* تحميل بيانات المطعم الحالي بعد تسجيل الدخول */
await loadSettings();
await loadActiveSettings();

/* تحميل إعدادات الدولة الافتراضية للهاتف */
if (typeof easyqLoadPhoneSettings === 'function') {
  await easyqLoadPhoneSettings(user.business_id || null);
}

if (typeof loadTopbarBusinessIdentity === 'function') {
  await loadTopbarBusinessIdentity();
}

// إضافة زر الدعم الحي داخل السايدبار بعد جاهزية الواجهة
if (typeof addBusinessSupportSidebarButton === 'function') {
  setTimeout(addBusinessSupportSidebarButton, 500);
}

await loadAll();

updateTopbarUserIdentity(user);

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
  setLoginLoading(false);
}
}

// ============================================================
// SUBSCRIPTION NOTICE UI - EASY-Q
// عرض تنبيه الاشتراك بجوار اسم المستخدم داخل الواجهة
// ============================================================

function getBranchAccountLang() {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    currentLang ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function branchAccountText(arText, enText) {
  return getBranchAccountLang() === 'en' ? enText : arText;
}

function formatEasyQDate(dateValue) {
  if (!dateValue) return '-';

  try {
    return new Date(dateValue).toLocaleDateString(
      getBranchAccountLang() === 'en' ? 'en-US' : 'ar-SA',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    );
  } catch (err) {
    return '-';
  }
}

function getEasyQPlanLabel(planType) {
  const lang = getBranchAccountLang();

  const labels = {
    trial: {
      ar: 'تجربة',
      en: 'Trial'
    },
    basic: {
      ar: 'أساسية',
      en: 'Basic'
    },
    pro: {
      ar: 'احترافية',
      en: 'Pro'
    },
    enterprise: {
      ar: 'مؤسسية',
      en: 'Enterprise'
    }
  };

  return labels[planType]?.[lang] || planType || '-';
}

function getEasyQSubscriptionStatusLabel(status) {
  const lang = getBranchAccountLang();

  const labels = {
    trial: {
      ar: 'تجريبي',
      en: 'Trial'
    },
    active: {
      ar: 'نشط',
      en: 'Active'
    },
    grace: {
      ar: 'فترة سماح',
      en: 'Grace Period'
    },
    expired: {
      ar: 'منتهي',
      en: 'Expired'
    },
    suspended: {
      ar: 'موقوف',
      en: 'Suspended'
    },
    cancelled: {
      ar: 'ملغي',
      en: 'Cancelled'
    }
  };

  return labels[status]?.[lang] || status || '-';
}

function formatEasyQLimit(value) {
  if (value === null || value === undefined) {
    return branchAccountText('غير محدود', 'Unlimited');
  }

  return String(value);
}

function getEasyQDaysText(value) {
  const days = Number(value || 0);

  return branchAccountText(
    `${days} يوم`,
    `${days} ${days === 1 ? 'day' : 'days'}`
  );
}

function applyBranchAccountModalText() {
  const modal = document.getElementById('branchAccountModal');
  if (!modal) return;

  const isEnglish = getBranchAccountLang() === 'en';

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const title = modal.querySelector('h3');
  if (title) {
    title.textContent = branchAccountText(
      'إدارة الحساب والاشتراك',
      'Account & Subscription'
    );

    const titleBox = title.parentElement;
    const subtitle = titleBox
      ? Array.from(titleBox.children).find(el => el !== title && el.tagName === 'DIV')
      : null;

    if (subtitle) {
      subtitle.textContent = branchAccountText(
        'تفاصيل الباقة، الحالة، والحدود الحالية',
        'Plan details, status, and current limits'
      );
    }
  }
}

async function openBranchAccountModal() {
  const modal = document.getElementById('branchAccountModal');

  if (!modal) {
    showAlert(branchAccountText(
      'مودل الاشتراك غير موجود في الصفحة',
      'Subscription modal was not found on the page'
    ));
    return;
  }

  applyBranchAccountModalText();

  modal.classList.add('show');
  await renderBranchAccountSubscription();
}

function closeBranchAccountModal() {
  const modal = document.getElementById('branchAccountModal');
  if (modal) modal.classList.remove('show');
}

async function getBranchAccountBusinessProfile() {
  try {
    if (window.currentBusinessProfile?.support_ref) {
      return window.currentBusinessProfile;
    }

    if (window.currentBusiness?.support_ref) {
      return window.currentBusiness;
    }

    const { data, error } = await supabase.rpc('get_my_business_profile_secure');

    if (error) {
      console.warn('تعذر جلب معرف الدعم:', error);
      return null;
    }

    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.warn('خطأ أثناء جلب معرف الدعم:', err);
    return null;
  }
}

function copyBranchAccountSupportRef() {
  const refEl = document.getElementById('branchAccountSupportRefValue');
  const supportRef = refEl ? refEl.textContent.trim() : '';

  if (!supportRef || supportRef === '-') {
    showAlert(branchAccountText(
      'لا يوجد معرف دعم لنسخه',
      'There is no support ID to copy'
    ));
    return;
  }

  navigator.clipboard.writeText(supportRef)
    .then(() => {
      showSuccessNotification(branchAccountText(
        '✅ تم نسخ معرف الدعم',
        '✅ Support ID copied'
      ));
    })
    .catch(() => {
      const tempInput = document.createElement('input');
      tempInput.value = supportRef;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      tempInput.remove();

      showSuccessNotification(branchAccountText(
        '✅ تم نسخ معرف الدعم',
        '✅ Support ID copied'
      ));
    });
}

async function renderBranchAccountSubscription() {
  const box = document.getElementById('branchAccountSubscriptionBox');

  if (!box) return;

  box.innerHTML = `
    <div style="
      padding: 22px;
      text-align: center;
      color: #64748B;
      font-weight: 800;
    ">
      <i class="fas fa-spinner fa-spin"></i>
      ${branchAccountText('جاري تحميل بيانات الاشتراك...', 'Loading subscription details...')}
    </div>
  `;

  try {
    const { data, error } = await supabase.rpc('get_my_license_status');

    if (error) {
      console.error('فشل تحميل بيانات الاشتراك:', error);

      box.innerHTML = `
        <div style="
          padding: 18px;
          border-radius: 14px;
          background: #FEF2F2;
          color: #DC2626;
          font-weight: 900;
          text-align: center;
        ">
          ${branchAccountText('فشل تحميل بيانات الاشتراك', 'Failed to load subscription details')}
        </div>
      `;

      return;
    }

    const license = Array.isArray(data) ? data[0] : null;

    if (!license) {
      box.innerHTML = `
        <div style="
          padding: 18px;
          border-radius: 14px;
          background: #FFF7ED;
          color: #C2410C;
          font-weight: 900;
          text-align: center;
        ">
          ${branchAccountText('لا توجد بيانات اشتراك لهذا المطعم', 'No subscription details were found for this restaurant')}
        </div>
      `;

      return;
    }

    localStorage.setItem('easyq_license_status', JSON.stringify(license));

    const businessProfile = await getBranchAccountBusinessProfile();

    const supportRef =
      businessProfile?.support_ref ||
      window.currentBusinessProfile?.support_ref ||
      window.currentBusiness?.support_ref ||
      license.support_ref ||
      '-';

    const statusLabel = getEasyQSubscriptionStatusLabel(
      license.effective_status || license.subscription_status
    );

    const planLabel = getEasyQPlanLabel(license.plan_type);

    const statusColor =
      license.access_allowed === false ? '#DC2626' :
      license.effective_status === 'grace' ? '#F59E0B' :
      license.effective_status === 'active' ? '#059669' :
      '#64748B';

    const daysText =
      license.access_allowed === false
        ? branchAccountText('غير متاح', 'Not available')
        : getEasyQDaysText(license.days_remaining);

    const analyticsText = license.analytics_enabled
      ? branchAccountText('مفعلة ضمن الباقة', 'Enabled in this plan')
      : branchAccountText('غير مفعلة ضمن الباقة', 'Not enabled in this plan');

    box.innerHTML = `
      <div style="
        display: grid;
        gap: 14px;
      ">
        <div style="
          border-radius: 18px;
          padding: 18px;
          background: linear-gradient(135deg, #0E146D, #060427);
          color: #FFFFFF;
          box-shadow: 0 14px 30px rgba(14,20,109,0.18);
        ">
          <div style="
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:12px;
            flex-wrap:wrap;
          ">
            <div>
              <div style="font-size:13px; opacity:0.78; font-weight:800; margin-bottom:6px;">
                ${branchAccountText('الباقة الحالية', 'Current Plan')}
              </div>

              <div style="font-size:26px; font-weight:1000; line-height:1.2;">
                ${planLabel}
              </div>
            </div>

            <div style="
              display:inline-flex;
              align-items:center;
              gap:7px;
              padding:8px 12px;
              border-radius:999px;
              background:rgba(255,255,255,0.12);
              color:#F4D28A;
              font-weight:1000;
              font-size:13px;
            ">
              <span style="
                width:9px;
                height:9px;
                border-radius:50%;
                background:${statusColor};
                display:inline-block;
              "></span>
              ${statusLabel}
            </div>
          </div>

          <div style="
            margin-top:18px;
            display:grid;
            grid-template-columns:repeat(3, minmax(0, 1fr));
            gap:10px;
          ">
            <div style="background:rgba(255,255,255,0.1); border-radius:14px; padding:12px;">
              <div style="font-size:11px; opacity:0.75; margin-bottom:5px;">
                ${branchAccountText('تاريخ البداية', 'Start Date')}
              </div>
              <div style="font-weight:900; font-size:13px;">${formatEasyQDate(license.starts_at)}</div>
            </div>

            <div style="background:rgba(255,255,255,0.1); border-radius:14px; padding:12px;">
              <div style="font-size:11px; opacity:0.75; margin-bottom:5px;">
                ${branchAccountText('تاريخ الانتهاء', 'Expiry Date')}
              </div>
              <div style="font-weight:900; font-size:13px;">${formatEasyQDate(license.expires_at)}</div>
            </div>

            <div style="background:rgba(255,255,255,0.1); border-radius:14px; padding:12px;">
              <div style="font-size:11px; opacity:0.75; margin-bottom:5px;">
                ${branchAccountText('الأيام المتبقية', 'Days Remaining')}
              </div>
              <div style="font-weight:1000; font-size:17px; color:#F4D28A;">${daysText}</div>
            </div>
          </div>
        </div>

        <div style="
          border:1px solid #E5E7EB;
          border-radius:16px;
          padding:14px;
          background:#FFFFFF;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        ">
          <div>
            <div style="color:#64748B; font-size:12px; font-weight:900; margin-bottom:6px;">
              ${branchAccountText('معرف الدعم الموحد', 'Unified Support ID')}
            </div>

            <div
              id="branchAccountSupportRefValue"
              style="
                font-size:18px;
                font-weight:1000;
                color:#0E146D;
                direction:ltr;
                text-align:left;
                letter-spacing:0.5px;
              "
            >
              ${supportRef}
            </div>
          </div>

          <button
            type="button"
            onclick="copyBranchAccountSupportRef()"
            style="
              border:none;
              border-radius:12px;
              padding:10px 14px;
              background:#0E146D;
              color:#FFFFFF;
              font-weight:1000;
              cursor:pointer;
              display:inline-flex;
              align-items:center;
              gap:7px;
            "
          >
            <i class="fas fa-copy"></i>
            ${branchAccountText('نسخ', 'Copy')}
          </button>
        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:12px;
        ">
          <div style="border:1px solid #E5E7EB; border-radius:16px; padding:14px; background:#FFFFFF;">
            <div style="color:#64748B; font-size:12px; font-weight:900; margin-bottom:6px;">
              ${branchAccountText('حد الطاولات', 'Tables Limit')}
            </div>
            <div style="font-size:22px; font-weight:1000; color:#0E146D;">
              ${formatEasyQLimit(license.max_tables)}
            </div>
          </div>

          <div style="border:1px solid #E5E7EB; border-radius:16px; padding:14px; background:#FFFFFF;">
            <div style="color:#64748B; font-size:12px; font-weight:900; margin-bottom:6px;">
              ${branchAccountText('حد المستخدمين', 'Users Limit')}
            </div>
            <div style="font-size:22px; font-weight:1000; color:#0E146D;">
              ${formatEasyQLimit(license.max_users)}
            </div>
          </div>

          <div style="border:1px solid #E5E7EB; border-radius:16px; padding:14px; background:#FFFFFF;">
            <div style="color:#64748B; font-size:12px; font-weight:900; margin-bottom:6px;">
              ${branchAccountText('حد المناطق', 'Zones Limit')}
            </div>
            <div style="font-size:22px; font-weight:1000; color:#0E146D;">
              ${formatEasyQLimit(license.max_zones)}
            </div>
          </div>

          <div style="border:1px solid #E5E7EB; border-radius:16px; padding:14px; background:#FFFFFF;">
            <div style="color:#64748B; font-size:12px; font-weight:900; margin-bottom:6px;">
              ${branchAccountText('حد الطوابق', 'Floors Limit')}
            </div>
            <div style="font-size:22px; font-weight:1000; color:#0E146D;">
              ${formatEasyQLimit(license.max_floors)}
            </div>
          </div>
        </div>

        <div style="
          border:1px solid #E5E7EB;
          border-radius:16px;
          padding:14px;
          background:#F8FAFC;
          display:grid;
          gap:8px;
        ">
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <span style="color:#64748B; font-weight:800;">
              ${branchAccountText('التحليلات', 'Analytics')}
            </span>

            <strong style="color:${license.analytics_enabled ? '#059669' : '#DC2626'};">
              ${analyticsText}
            </strong>
          </div>

          ${
            license.is_in_grace_period
              ? `<div style="
                  margin-top:8px;
                  background:#FFFBEB;
                  color:#92400E;
                  border:1px solid #FDE68A;
                  border-radius:12px;
                  padding:10px;
                  font-weight:900;
                ">
                  ${branchAccountText(
                    `الاشتراك في فترة السماح، متبقي ${license.grace_days_remaining || 0} يوم.`,
                    `Subscription is in grace period, ${Number(license.grace_days_remaining || 0)} day(s) remaining.`
                  )}
                </div>`
              : ''
          }

          ${
            license.suspension_reason
              ? `<div style="
                  margin-top:8px;
                  background:#FEF2F2;
                  color:#991B1B;
                  border:1px solid #FECACA;
                  border-radius:12px;
                  padding:10px;
                  font-weight:900;
                ">
                  ${branchAccountText('سبب الإيقاف: ', 'Suspension reason: ')}${license.suspension_reason}
                </div>`
              : ''
          }
        </div>

        <button
          type="button"
          onclick="openSubscriptionRenewalRequest()"
          style="
            border:none;
            border-radius:16px;
            padding:14px 16px;
            background:linear-gradient(135deg, #F4D28A, #D9A441);
            color:#111827;
            font-weight:1000;
            font-size:14px;
            cursor:pointer;
            box-shadow:0 10px 22px rgba(217,164,65,0.22);
          "
        >
          <i class="fas fa-sync-alt"></i>
          ${branchAccountText('طلب تجديد أو ترقية الاشتراك', 'Request Renewal or Upgrade')}
        </button>
      </div>
    `;

  } catch (err) {
    console.error('خطأ غير متوقع أثناء عرض بيانات الاشتراك:', err);

    box.innerHTML = `
      <div style="
        padding: 18px;
        border-radius: 14px;
        background: #FEF2F2;
        color: #DC2626;
        font-weight: 900;
        text-align: center;
      ">
        ${branchAccountText('حدث خطأ أثناء عرض بيانات الاشتراك', 'An error occurred while displaying subscription details')}
      </div>
    `;
  }
}

function openSubscriptionRenewalRequest() {
  let license = null;

  try {
    const savedLicense = localStorage.getItem('easyq_license_status');
    license = savedLicense ? JSON.parse(savedLicense) : null;
  } catch (err) {
    console.warn('تعذر قراءة بيانات الاشتراك من التخزين المحلي:', err);
  }

  const planLabel = getEasyQPlanLabel(license?.plan_type);
  const statusLabel = getEasyQSubscriptionStatusLabel(
    license?.effective_status || license?.subscription_status
  );

  const daysRemaining =
    license?.access_allowed === false
      ? branchAccountText('غير متاح', 'Not available')
      : getEasyQDaysText(license?.days_remaining);

  const message = branchAccountText(
    `
طلب تجديد أو ترقية الاشتراك

الباقة الحالية: ${planLabel}
حالة الاشتراك: ${statusLabel}
الأيام المتبقية: ${daysRemaining}

لطلب التجديد أو الترقية، يرجى التواصل مع إدارة EASY-Q عبر قسم الدعم الحي، وسيتم مراجعة طلبك من السوبر أدمن.
    `.trim(),
    `
Subscription renewal or upgrade request

Current plan: ${planLabel}
Subscription status: ${statusLabel}
Days remaining: ${daysRemaining}

To request renewal or upgrade, please contact EASY-Q management through Live Support. Your request will be reviewed by the super admin.
    `.trim()
  );

  showAlert(message);
}

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
  startCurrentUserProfileAutoRefresh();

updateTopbarUserIdentity(validUser);

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
  const loggingOutUser = currentUser ? { ...currentUser } : null;

  if (
    loggingOutUser &&
    loggingOutUser.role !== 'super_admin' &&
    !document.body.classList.contains('super-admin-mode')
  ) {
    await logBusinessActivitySafe(
      'user_logged_out',
      'تسجيل خروج',
      'app_user',
      loggingOutUser.id,
      loggingOutUser.display_name || loggingOutUser.username || 'مستخدم',
      {
        username: loggingOutUser.username || '',
        logout_method: 'manual'
      }
    );
  }

  // 1. تسجيل الخروج من Supabase Auth
  await supabase.auth.signOut();
  
  // 2. مسح بيانات المستخدم من الذاكرة
  currentUser = null;
  
  // 3. مسح التخزين المحلي
  localStorage.removeItem('easyq_user');
  
  // 4. إظهار شاشة تسجيل الدخول
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'flex';

  // تأكيد إعادة زر تسجيل الدخول لحالته الطبيعية عند ظهور شاشة الدخول
  if (typeof setLoginLoading === 'function') {
    setLoginLoading(false);
  }
  
  // 5. مسح كلمة المرور فقط، مع إبقاء البريد إذا كان "تذكرني" مفعّلًا
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const rememberCheckbox = document.getElementById('rememberLogin');

  const rememberedEmail = getRememberedLoginEmail();

  if (usernameInput) {
    usernameInput.value = rememberedEmail || '';
  }

  if (passwordInput) {
    passwordInput.value = '';
  }

  if (rememberCheckbox) {
    rememberCheckbox.checked = !!rememberedEmail;
  }

  // إعادة تطبيق تذكرني بعد ظهور مودل الدخول لضمان عدم مسح البريد من أي كود متأخر
  if (typeof applyRememberedLogin === 'function') {
    applyRememberedLogin();
    setTimeout(applyRememberedLogin, 50);
  }

  if (typeof setLoginLoading === 'function') {
    setLoginLoading(false);
  }

  // إعادة زر تسجيل الدخول لحالته الطبيعية بعد تسجيل الخروج
  const loginBtn = document.getElementById('premiumLoginBtn');
  const loginBtnText = document.getElementById('premiumLoginBtnText');
  const loginBtnSpinner = document.getElementById('premiumLoginBtnSpinner');
  const loginError = document.getElementById('loginError');

  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.style.opacity = '';
    loginBtn.style.cursor = '';
  }

  if (loginBtnText) {
    loginBtnText.textContent = 'تسجيل الدخول';
  }

  if (loginBtnSpinner) {
    loginBtnSpinner.style.display = 'none';
  }

  if (loginError) {
    loginError.classList.remove('show');
    loginError.style.display = 'none';
  }
  
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

async function refreshCurrentUserPermissions() {
  if (!currentUser || !currentUser.role) return;

  const oldPermissions = JSON.stringify(userPermissions || {});

  await loadUserPermissions();

  const newPermissions = JSON.stringify(userPermissions || {});

  if (oldPermissions !== newPermissions) {
    console.log('🔄 تم تحديث صلاحيات المستخدم تلقائيًا');

    if (typeof updateUIBasedOnPermissions === 'function') {
      updateUIBasedOnPermissions();
    }

    if (typeof renderTables === 'function') {
      renderTables();
    }
  }
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
  
  // قسم الموظفين يظهر فقط لمالك الحساب admin
  const staffMenuSection = document
    .querySelector('.main-menu-item[data-menu="staff"]')
    ?.closest('.sidebar-nav-section');

  if (staffMenuSection) {
    staffMenuSection.style.display = currentUser?.role === 'admin' ? 'block' : 'none';
  }

  // زر الصلاحيات يظهر فقط للأدمن داخل قسم الموظفين
  const permissionsItems = document.querySelectorAll('[onclick="openPermissionsModal()"]');

  permissionsItems.forEach(item => {
    item.style.display = currentUser?.role === 'admin' ? 'flex' : 'none';
  });
  
// عناصر قسم إدارة الفرع
const businessProfileItem = document.querySelector('[onclick="openBusinessProfileModal()"]');
if (businessProfileItem) {
  businessProfileItem.style.display = canDo('manage_business_profile') ? 'flex' : 'none';
}

const bookingSettingsItem = document.querySelector('[onclick="openBookingSettingsModal()"]');
if (bookingSettingsItem) {
  bookingSettingsItem.style.display = canDo('manage_booking_page') ? 'flex' : 'none';
}

const zonesItem = document.querySelector('[onclick="openZonesModal()"]');
if (zonesItem) {
  zonesItem.style.display = canDo('manage_zones') ? 'flex' : 'none';
}

const floorsItem = document.querySelector('[onclick="openFloorsModal()"]');
if (floorsItem) {
  floorsItem.style.display = canDo('manage_floors') ? 'flex' : 'none';
}

const bookingQrItem = document.querySelector('[onclick="openBookingPage()"]');
if (bookingQrItem) {
  bookingQrItem.style.display = canDo('open_booking_qr') ? 'flex' : 'none';
}

const subscriptionItem = document.querySelector('[data-view="branch-account"]');
if (subscriptionItem) {
  subscriptionItem.style.display = canDo('manage_subscription') ? 'flex' : 'none';
}

const supportItem = document.getElementById('businessSupportSidebarBtn');
const supportSection =
  document.getElementById('businessSupportSidebarSection') ||
  supportItem?.closest('.sidebar-nav-section');

if (supportSection) {
  supportSection.style.display = canDo('use_live_support') ? 'block' : 'none';
} else if (supportItem) {
  supportItem.style.display = canDo('use_live_support') ? 'flex' : 'none';
}

const reportsSection = document.querySelector('[data-menu="reports"]');
  if (reportsSection) {
    reportsSection.style.display = canDo('view_reports') ? 'block' : 'none';
  }
  
const settingsSection = document.querySelector('[data-menu="settings"]');
if (settingsSection) {
  const canSeeAnySettingsItem =
    canDo('manage_business_profile') ||
    canDo('manage_booking_page') ||
    canDo('open_booking_qr') ||
    canDo('manage_zones') ||
    canDo('manage_floors') ||
    canDo('manage_timers') ||
    canDo('manage_alerts') ||
    canDo('manage_subscription');

  settingsSection.style.display = canSeeAnySettingsItem ? 'block' : 'none';
}

// ربط زر الدعم الحي كبند أساسي مستقل بعد ضبط الصلاحيات
if (canDo('use_live_support') && typeof addBusinessSupportSidebarButton === 'function') {
  setTimeout(addBusinessSupportSidebarButton, 300);
}

if (typeof startAdminNotificationsAutoRefresh === 'function') {
  setTimeout(startAdminNotificationsAutoRefresh, 600);
}
}

// ============================================================
// ACTIVITY LOG MODAL
// ============================================================

function activityLogText(arText, enText) {
  if (typeof permissionsModalText === 'function') {
    return permissionsModalText(arText, enText);
  }

  if (typeof usersModalText === 'function') {
    return usersModalText(arText, enText);
  }

  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? enText : arText;
}

function getActivityLogLang() {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function applyActivityLogStaticText() {
  const modal = document.getElementById('activityLogModal');
  if (!modal) return;

  const isEnglish = getActivityLogLang() === 'en';

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const title = modal.querySelector('h3');
  if (title) {
    title.textContent = activityLogText('سجل النشاط', 'Activity Log');
  }

  const headerSub = title?.parentElement?.querySelector('div');
  if (headerSub) {
    headerSub.textContent = activityLogText(
      'آخر العمليات التي تمت داخل المطعم',
      'Latest actions performed inside the restaurant'
    );
  }

  const sectionTitle = Array.from(modal.querySelectorAll('div')).find(el => {
    return String(el.textContent || '').trim() === 'آخر الأنشطة' ||
           String(el.textContent || '').trim() === 'Recent Activities';
  });

  if (sectionTitle) {
    sectionTitle.textContent = activityLogText('آخر الأنشطة', 'Recent Activities');
  }

  const refreshBtn = modal.querySelector('button[onclick="loadActivityLogs()"]');
  if (refreshBtn) {
    refreshBtn.innerHTML = `
      <i class="fas fa-sync-alt"></i>
      ${activityLogText('تحديث', 'Refresh')}
    `;
  }

  const closeBtn = modal.querySelector('button[onclick="closeActivityLogModal()"]');
  if (closeBtn) {
    closeBtn.title = activityLogText('إغلاق', 'Close');
    closeBtn.setAttribute('aria-label', activityLogText('إغلاق', 'Close'));
  }
}

function openActivityLogModal() {
  if (!canDo('manage_users')) {
    showAlert(activityLogText(
      'ليس لديك صلاحية لعرض سجل النشاط',
      'You do not have permission to view the activity log'
    ));
    return;
  }

  const modal = document.getElementById('activityLogModal');

  if (!modal) {
    showAlert(activityLogText(
      'مودل سجل النشاط غير موجود في الصفحة',
      'Activity log modal was not found on this page'
    ));
    return;
  }

  applyActivityLogStaticText();

  modal.classList.add('show');
  loadActivityLogs();
}

function closeActivityLogModal() {
  const modal = document.getElementById('activityLogModal');
  if (modal) modal.classList.remove('show');
}

function formatActivityLogDate(dateValue) {
  if (!dateValue) return '-';

  try {
    const isEnglish = getActivityLogLang() === 'en';

    return new Date(dateValue).toLocaleString(isEnglish ? 'en-US' : 'ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    return '-';
  }
}

function getActivityRoleLabel(role) {
  const labels = {
    admin: activityLogText('مدير النظام', 'Admin'),
    owner: activityLogText('مالك الحساب', 'Owner'),
    manager: activityLogText('مشرف', 'Manager'),
    staff: activityLogText('موظف', 'Staff'),
    employee: activityLogText('موظف', 'Employee'),
    host: activityLogText('استقبال', 'Host'),
    super_admin: activityLogText('سوبر أدمن', 'Super Admin')
  };

  return labels[role] || role || '-';
}

function getActivityActionLabel(log) {
  const actionKey = log?.action_key || '';

  const labels = {
    user_logged_in: activityLogText('تسجيل دخول مستخدم', 'User signed in'),
    user_logged_out: activityLogText('تسجيل خروج مستخدم', 'User signed out'),
    user_created: activityLogText('إضافة موظف', 'Staff member added'),
    user_updated: activityLogText('تعديل موظف', 'Staff member updated'),
    user_activated: activityLogText('تفعيل موظف', 'Staff member activated'),
    user_deactivated: activityLogText('تعطيل موظف', 'Staff member deactivated'),
    user_archived: activityLogText('أرشفة موظف', 'Staff member archived'),
    password_changed: activityLogText('تغيير كلمة المرور', 'Password changed'),
    permissions_updated: activityLogText('تعديل الصلاحيات', 'Permissions updated')
  };

  if (labels[actionKey]) return labels[actionKey];

  if (getActivityLogLang() === 'ar') {
    return log?.action_label || 'نشاط';
  }

  return log?.action_label || 'Activity';
}

async function loadActivityLogs() {
  if (!canDo('manage_users')) {
    showAlert(activityLogText(
      'ليس لديك صلاحية لعرض سجل النشاط',
      'You do not have permission to view the activity log'
    ));
    return;
  }

  applyActivityLogStaticText();

  const list = document.getElementById('activityLogList');

  if (!list) return;

  list.innerHTML = `
    <div style="
      padding: 22px;
      text-align: center;
      color: #64748B;
      font-weight: 800;
    ">
      <i class="fas fa-spinner fa-spin"></i>
      ${activityLogText('جاري تحميل سجل النشاط...', 'Loading activity log...')}
    </div>
  `;

  try {
    const { data: logs, error } = await supabase.rpc('get_my_business_activity_logs', {
      p_limit: 50
    });

    if (error) {
      console.error('فشل تحميل سجل النشاط:', error);

      list.innerHTML = `
        <div style="
          padding: 18px;
          border-radius: 14px;
          background: #FEF2F2;
          color: #DC2626;
          font-weight: 900;
          text-align: center;
        ">
          ${activityLogText('فشل تحميل سجل النشاط', 'Failed to load activity log')}
        </div>
      `;
      return;
    }

    const rows = Array.isArray(logs) ? logs : [];

    if (rows.length === 0) {
      list.innerHTML = `
        <div style="
          padding: 22px;
          text-align: center;
          color: #64748B;
          font-weight: 800;
        ">
          <i class="fas fa-clock-rotate-left"></i>
          ${activityLogText('لا توجد أنشطة مسجلة حتى الآن', 'No recorded activities yet')}
        </div>
      `;
      return;
    }

    list.innerHTML = rows.map(log => {
      const details = log.details || {};

      const detailLabels = {
        username: activityLogText('البريد / اسم المستخدم', 'Email / Username'),
        old_display_name: activityLogText('الاسم السابق', 'Old display name'),
        new_display_name: activityLogText('الاسم الجديد', 'New display name'),
        old_role: activityLogText('الدور السابق', 'Old role'),
        new_role: activityLogText('الدور الجديد', 'New role'),
        old_status: activityLogText('الحالة السابقة', 'Old status'),
        new_status: activityLogText('الحالة الجديدة', 'New status'),
        password_changed: activityLogText('تغيير كلمة المرور', 'Password changed'),
        login_method: activityLogText('طريقة الدخول', 'Login method'),
        logout_method: activityLogText('طريقة الخروج', 'Logout method'),
        source: activityLogText('المصدر', 'Source')
      };

      const detailValueLabels = {
        admin: activityLogText('مدير النظام', 'Admin'),
        owner: activityLogText('مالك الحساب', 'Owner'),
        manager: activityLogText('مشرف', 'Manager'),
        staff: activityLogText('موظف', 'Staff'),
        employee: activityLogText('موظف', 'Employee'),
        host: activityLogText('استقبال', 'Host'),
        active: activityLogText('نشط', 'Active'),
        inactive: activityLogText('موقوف', 'Inactive'),
        archived: activityLogText('مؤرشف', 'Archived'),
        true: activityLogText('تم', 'Yes'),
        false: activityLogText('لا', 'No'),
        email_password: activityLogText('البريد وكلمة المرور', 'Email and password'),
        manual: activityLogText('يدوي', 'Manual'),
        console_test: activityLogText('اختبار من Console', 'Console test')
      };

      const detailsText = Object.keys(details).length > 0
        ? Object.entries(details)
            .map(([key, value]) => {
              const label = detailLabels[key] || key;
              const cleanValue = detailValueLabels[String(value)] || value || '-';
              return `${label}: ${cleanValue}`;
            })
            .join(' | ')
        : '';

      return `
        <div style="
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 10px;
          background: #FFFFFF;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: flex-start;
            flex-wrap: wrap;
          ">
            <div style="min-width: 0;">
              <div style="
                color: #111827;
                font-weight: 1000;
                font-size: 14px;
                margin-bottom: 5px;
              ">
                ${getActivityActionLabel(log)}
              </div>

              <div style="
                color: #64748B;
                font-size: 12px;
                line-height: 1.6;
              ">
                ${activityLogText('بواسطة:', 'By:')}
                <strong>${log.actor_display_name || activityLogText('مستخدم', 'User')}</strong>
                -
                ${getActivityRoleLabel(log.actor_role)}
              </div>

              ${
                log.target_label
                  ? `<div style="
                      color: #475569;
                      font-size: 12px;
                      margin-top: 5px;
                    ">
                      ${activityLogText('الهدف:', 'Target:')} ${log.target_label}
                    </div>`
                  : ''
              }

              ${
                detailsText
                  ? `<div style="
                      color: #64748B;
                      font-size: 11px;
                      margin-top: 7px;
                      background: #F8FAFC;
                      border-radius: 10px;
                      padding: 7px 9px;
                      direction: ltr;
                      text-align: left;
                      overflow-wrap: anywhere;
                    ">
                      ${detailsText}
                    </div>`
                  : ''
              }
            </div>

            <div style="
              color: #94A3B8;
              font-size: 11px;
              font-weight: 800;
              white-space: nowrap;
            ">
              ${formatActivityLogDate(log.created_at)}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('خطأ غير متوقع أثناء تحميل سجل النشاط:', err);

    list.innerHTML = `
      <div style="
        padding: 18px;
        border-radius: 14px;
        background: #FEF2F2;
        color: #DC2626;
        font-weight: 900;
        text-align: center;
      ">
        ${activityLogText('حدث خطأ أثناء تحميل سجل النشاط', 'An error occurred while loading the activity log')}
      </div>
    `;
  }
}

// ============================================================
// BUSINESS ACTIVITY LOG HELPER
// ============================================================

async function logBusinessActivitySafe(actionKey, actionLabel, targetType = null, targetId = null, targetLabel = null, details = {}) {
  try {
    if (!currentUser || currentUser.role === 'super_admin') return;
    if (document.body.classList.contains('super-admin-mode')) return;

    const { error } = await supabase.rpc('log_business_activity', {
      p_action_key: actionKey,
      p_action_label: actionLabel,
      p_target_type: targetType,
      p_target_id: targetId,
      p_target_label: targetLabel,
      p_details: details || {}
    });

    if (error) {
      console.warn('تعذر تسجيل النشاط:', error);
    }
  } catch (err) {
    console.warn('خطأ غير متوقع أثناء تسجيل النشاط:', err);
  }
}

// ============================================================
// USER MANAGEMENT MODALS
// ============================================================

function getUsersModalLang() {
  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function usersModalText(arText, enText) {
  return getUsersModalLang() === 'ar' ? arText : enText;
}

function applyUsersModalStyle() {
  let style = document.getElementById('eqUsersModalStyle');

  if (!style) {
    style = document.createElement('style');
    style.id = 'eqUsersModalStyle';
    document.head.appendChild(style);
  }

  style.textContent = `
    #usersModal .modal {
      max-width: 620px !important;
      width: calc(100vw - 34px) !important;
      max-height: 88vh !important;
      border-radius: 24px !important;
      padding: 18px !important;
      background: #FFFFFF !important;
      box-shadow: 0 24px 70px rgba(6, 4, 39, 0.22) !important;
      border: 1px solid rgba(14, 20, 109, 0.10) !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }

    #usersModal .modal-title {
      display: none !important;
    }

    #usersModal .modal-sub {
      display: none !important;
    }

    #usersModal .eq-users-hero {
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 34%),
        linear-gradient(135deg, #070219 0%, #060427 52%, #0E146D 100%);
      color: #FFFFFF;
      border-radius: 20px;
      padding: 14px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      box-shadow: 0 14px 32px rgba(6, 4, 39, 0.20);
      overflow: hidden;
      position: relative;
      margin-bottom: 12px;
      flex-shrink: 0;
    }

    #usersModal .eq-users-hero::after {
      content: "";
      position: absolute;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      inset-inline-end: -80px;
      top: -95px;
      background: rgba(255, 255, 255, 0.10);
      pointer-events: none;
    }

    #usersModal .eq-users-hero > * {
      position: relative;
      z-index: 1;
    }

    #usersModal .eq-users-hero-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 1000;
      line-height: 1.35;
    }

    #usersModal .eq-users-hero-title i {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.12);
      color: #DDE7FF;
      flex-shrink: 0;
    }

    #usersModal .eq-users-hero-sub {
      margin-top: 6px;
      color: rgba(255,255,255,0.76);
      font-size: 11.5px;
      font-weight: 800;
      line-height: 1.7;
    }

    #usersModal .eq-users-hero-count {
      min-width: 76px;
      height: 58px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.10);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }

    #usersModal .eq-users-hero-count strong {
      font-size: 22px;
      font-weight: 1000;
      line-height: 1;
    }

    #usersModal .eq-users-hero-count span {
      font-size: 10px;
      font-weight: 850;
      color: rgba(255,255,255,0.72);
    }

    #usersModal .eq-users-body {
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    #usersList {
      max-height: min(43vh, 355px) !important;
      overflow-y: auto !important;
      padding: 10px !important;
      border: 1px solid #E5E7EB;
      border-radius: 18px;
      background: #F8FAFC;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    #usersList::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none;
    }

    #addUserForm {
      margin-top: 0 !important;
      padding: 12px !important;
      border: 1px solid #E5E7EB !important;
      border-radius: 18px !important;
      background: #F8FAFC !important;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
      flex-shrink: 0;
    }

    #addUserForm .walkin-input {
      height: 42px !important;
      border-radius: 12px !important;
      font-size: 13px !important;
      font-weight: 800 !important;
      background: #FFFFFF !important;
      border: 1px solid #E5E7EB !important;
    }

    #usersModal .eq-users-footer-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-shrink: 0;
    }

    #usersModal .eq-user-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 11px;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      margin-bottom: 9px;
      background: #FFFFFF;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.035);
      transition: transform .16s ease, border-color .16s ease, background .16s ease;
    }

    #usersModal .eq-user-card:hover {
      transform: translateY(-1px);
      border-color: rgba(14, 20, 109, 0.22);
      background: #FFFFFF;
    }

    #usersModal .eq-user-card:last-child {
      margin-bottom: 0;
    }

    #usersModal .eq-user-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }

    #usersModal .eq-user-name {
      color: #111827;
      font-size: 13.5px;
      font-weight: 1000;
      max-width: 205px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #usersModal .eq-user-email {
      color: #6B7280;
      font-size: 11.5px;
      direction: ltr;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 255px;
      font-weight: 800;
    }

    #usersModal .eq-user-badge {
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 1000;
      line-height: 1.3;
      white-space: nowrap;
    }

    #usersModal .eq-user-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    #usersModal .eq-user-action-btn {
      border: none;
      width: 32px;
      height: 32px;
      min-height: 32px;
      border-radius: 11px;
      color: #FFFFFF;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform .15s ease, opacity .15s ease;
    }

    #usersModal .eq-user-action-btn:hover {
      transform: translateY(-1px);
      opacity: 0.92;
    }

    #usersModal .eq-users-empty,
    #usersModal .eq-users-loading,
    #usersModal .eq-users-error {
      padding: 18px;
      text-align: center;
      font-weight: 900;
      border-radius: 16px;
      background: #FFFFFF;
      border: 1px dashed #CBD5E1;
      color: #64748B;
    }

    #usersModal .eq-users-error {
      color: #DC2626;
      border-color: #FECACA;
      background: #FEF2F2;
    }

    @media (max-width: 680px) {
      #usersModal .modal {
        max-width: calc(100vw - 22px) !important;
      }

      #usersModal .eq-users-hero {
        grid-template-columns: 1fr;
      }

      #usersModal .eq-users-hero-count {
        width: 100%;
        height: 48px;
        flex-direction: row;
      }

      #usersModal .eq-user-card {
        grid-template-columns: 1fr;
      }

      #usersModal .eq-user-actions {
        width: 100%;
        justify-content: stretch;
      }

      #usersModal .eq-user-action-btn {
        flex: 1;
      }
    }
  `;
}

function renderUsersModalStaticText() {
  const modal = document.getElementById('usersModal');
  if (!modal) return;

  const isArabic = getUsersModalLang() === 'ar';
  modal.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
  modal.style.direction = isArabic ? 'rtl' : 'ltr';

  const title = document.getElementById('usersModalTitle');
  if (title) {
    title.textContent = usersModalText('قائمة الموظفين', 'Staff List');
  }

  const sub = modal.querySelector('.modal-sub');
  if (sub) {
    sub.textContent = usersModalText(
      'إدارة موظفي المطعم وحالات الدخول والصلاحيات الأساسية',
      'Manage restaurant staff, access status, and basic roles'
    );
  }

  let hero = modal.querySelector('.eq-users-hero');
  const usersList = document.getElementById('usersList');

  if (!hero && usersList) {
    hero = document.createElement('div');
    hero.className = 'eq-users-hero';
    usersList.parentNode.insertBefore(hero, usersList);
  }

  if (hero) {
    const totalUsers = Array.isArray(window.currentBusinessUsersList)
      ? window.currentBusinessUsersList.length
      : 0;

    hero.innerHTML = `
      <div>
        <div class="eq-users-hero-title">
          <i class="fas fa-users-gear"></i>
          <span>${usersModalText('مركز إدارة الموظفين', 'Staff Management Center')}</span>
        </div>
        <div class="eq-users-hero-sub">
          ${usersModalText(
            'إدارة حسابات الموظفين، الأدوار، وحالة الدخول.',
            'Manage staff accounts, roles, and access status from one place without changing system logic.'
          )}
        </div>
      </div>

      <div class="eq-users-hero-count">
        <strong>${totalUsers}</strong>
        <span>${usersModalText('موظف', 'staff')}</span>
      </div>
    `;
  }

  const newUsername = document.getElementById('newUsername');
  if (newUsername) {
    newUsername.placeholder = usersModalText('البريد الإلكتروني', 'Email address');
  }

  const newDisplayName = document.getElementById('newDisplayName');
  if (newDisplayName) {
    newDisplayName.placeholder = usersModalText('الاسم الظاهر', 'Display name');
  }

  const newPassword = document.getElementById('newPassword');
  if (newPassword) {
    newPassword.placeholder = usersModalText('كلمة المرور', 'Password');
  }

  const newRole = document.getElementById('newRole');
  if (newRole) {
    const roleOptions = {
      staff: usersModalText('موظف', 'Staff'),
      employee: usersModalText('موظف', 'Employee'),
      manager: usersModalText('مدير', 'Manager'),
      admin: usersModalText('مدير النظام', 'Admin'),
      host: usersModalText('استقبال', 'Host')
    };

    Array.from(newRole.options || []).forEach(option => {
      option.textContent = roleOptions[option.value] || option.textContent;
    });
  }

  const saveBtn = document.getElementById('saveUserBtn');
  if (saveBtn) {
    saveBtn.innerHTML = `
      <i class="fas fa-save"></i>
      ${usersModalText('حفظ', 'Save')}
    `;
  }

  const addForm = document.getElementById('addUserForm');
  if (addForm) {
    const cancelBtn = addForm.querySelector('.settings-close');
    if (cancelBtn) {
      cancelBtn.textContent = usersModalText('إلغاء', 'Cancel');
    }
  }

  let footer = modal.querySelector('.eq-users-footer-actions');
  const oldFooter = modal.querySelector('#addUserForm + div');

  if (oldFooter && !oldFooter.classList.contains('eq-users-footer-actions')) {
    oldFooter.classList.add('eq-users-footer-actions');
    footer = oldFooter;
  }

  if (footer) {
    const addBtn = footer.querySelector('.settings-save');
    const closeBtn = footer.querySelector('.settings-close');

    if (addBtn) {
      addBtn.innerHTML = `
        <i class="fas fa-user-plus"></i>
        ${usersModalText('إضافة موظف', 'Add Staff')}
      `;
    }

    if (closeBtn) {
      closeBtn.textContent = usersModalText('إغلاق', 'Close');
    }
  }
}

function openUsersModal() {
  if (!canDo('manage_users')) {
    showAlert(usersModalText(
      'ليس لديك صلاحية لإدارة الموظفين',
      'You do not have permission to manage staff'
    ));
    return;
  }

  applyUsersModalStyle();
  renderUsersModalStaticText();

  const modal = document.getElementById('usersModal');
  if (modal) modal.classList.add('show');

  loadUsers();
}

function closeUsersModal() {
  const modal = document.getElementById('usersModal');
  if (modal) modal.classList.remove('show');

  const addUserForm = document.getElementById('addUserForm');
  if (addUserForm) addUserForm.style.display = 'none';
}

function showAddUserForm() {
  renderUsersModalStaticText();

  const addUserForm = document.getElementById('addUserForm');
  if (addUserForm) addUserForm.style.display = 'block';

  const newUsername = document.getElementById('newUsername');
  const newDisplayName = document.getElementById('newDisplayName');
  const newPassword = document.getElementById('newPassword');

  if (newUsername) newUsername.value = '';
  if (newDisplayName) newDisplayName.value = '';
  if (newPassword) newPassword.value = '';
}

function cancelAddUser() {
  const addUserForm = document.getElementById('addUserForm');
  if (addUserForm) addUserForm.style.display = 'none';
}

async function loadUsers() {
  if (!canDo('manage_users')) {
    showAlert(usersModalText(
      'ليس لديك صلاحية لعرض الموظفين',
      'You do not have permission to view staff'
    ));
    return;
  }

  const businessId = currentUser?.business_id;
  
  if (!businessId) {
    console.warn('لا يمكن تحديد المطعم للمستخدم الحالي');
    showAlert(usersModalText(
      'لا يمكن تحديد المطعم الحالي',
      'Unable to identify the current restaurant'
    ));
    return;
  }

  applyUsersModalStyle();
  renderUsersModalStaticText();

  const container = document.getElementById('usersList');
  if (!container) return;

container.innerHTML = `
    <div class="eq-users-loading">
      <i class="fas fa-spinner fa-spin"></i>
      ${usersModalText('جاري تحميل الموظفين...', 'Loading staff...')}
    </div>
  `;
  
  const { data: users, error } = await supabase
    .from('app_users')
    .select('id, username, display_name, role, is_active, business_id, auth_id, created_at')
    .eq('business_id', businessId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('فشل تحميل الموظفين:', error);

container.innerHTML = `
      <div class="eq-users-error">
        <i class="fas fa-triangle-exclamation"></i>
        ${usersModalText('فشل تحميل قائمة الموظفين', 'Failed to load staff list')}
      </div>
    `;

    return;
  }

  const list = Array.isArray(users) ? users : [];
  window.currentBusinessUsersList = list;
  renderUsersModalStaticText();

  if (list.length === 0) {
container.innerHTML = `
      <div class="eq-users-empty">
        <i class="fas fa-user-slash"></i>
        ${usersModalText('لا يوجد موظفون حتى الآن', 'No staff members yet')}
      </div>
    `;
    return;
  }

  const roleLabels = {
    admin: usersModalText('مدير النظام', 'Admin'),
    manager: usersModalText('مدير', 'Manager'),
    staff: usersModalText('موظف', 'Staff'),
    employee: usersModalText('موظف', 'Employee'),
    host: usersModalText('استقبال', 'Host')
  };

  const roleColors = {
    admin: '#0E146D',
    manager: '#7C3AED',
    staff: '#059669',
    employee: '#059669',
    host: '#D97706'
  };

  container.innerHTML = list.map(u => {
    const isSelf = String(u.id) === String(currentUser.id);
    const isActive = u.is_active !== false;

    const safeName = u.display_name || usersModalText('مستخدم بدون اسم', 'Unnamed user');
    const roleLabel = roleLabels[u.role] || u.role || usersModalText('غير محدد', 'Unknown');
    const roleColor = roleColors[u.role] || '#64748B';

    return `
      <div class="eq-user-card">
        <div style="min-width:0;">
          <div class="eq-user-name-row">
            <strong class="eq-user-name" title="${safeName}">
              ${safeName}
            </strong>

            ${
              isSelf
                ? `<span class="eq-user-badge" style="background:#EEF2FF;color:#0E146D;">
                    ${usersModalText('أنت', 'You')}
                  </span>`
                : ''
            }

            <span class="eq-user-badge" style="background:${roleColor}15;color:${roleColor};">
              ${roleLabel}
            </span>

            <span class="eq-user-badge" style="
              background:${isActive ? '#ECFDF5' : '#FEF2F2'};
              color:${isActive ? '#059669' : '#DC2626'};
            ">
              ${isActive ? usersModalText('نشط', 'Active') : usersModalText('موقوف', 'Disabled')}
            </span>
          </div>

          <div class="eq-user-email" title="${u.username || '—'}">
            ${u.username || '—'}
          </div>
        </div>

        <div class="eq-user-actions">
          <button
            class="eq-user-action-btn"
            style="background:#0E146D;"
            title="${usersModalText('تعديل الموظف', 'Edit staff member')}"
            onclick="openEditUserModal('${u.id}')"
          >
            <i class="fas fa-edit"></i>
          </button>

          <button
            class="eq-user-action-btn"
            style="background:${isActive ? '#F59E0B' : '#059669'};"
            title="${isActive ? usersModalText('إيقاف الموظف', 'Disable staff member') : usersModalText('تفعيل الموظف', 'Enable staff member')}"
            onclick="setBusinessUserActive('${u.id}', ${isActive ? 'false' : 'true'})"
          >
            <i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
          </button>

          ${
            !isSelf
              ? `<button
                  class="eq-user-action-btn"
                  style="background:#DC2626;"
                  onclick="archiveBusinessUser('${u.id}')"
                  title="${usersModalText('حذف الموظف من الواجهة', 'Remove staff member from list')}"
                >
                  <i class="fas fa-trash"></i>
                </button>`
              : ''
          }
        </div>
      </div>
    `;
  }).join('');
}

let currentEditingBusinessUserId = null;


function editUserModalText(arText, enText) {
  if (typeof usersModalText === 'function') {
    return usersModalText(arText, enText);
  }

  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? enText : arText;
}

function applyEditUserModalStyle() {
  if (document.getElementById('eqEditUserModalStyle')) return;

  const style = document.createElement('style');
  style.id = 'eqEditUserModalStyle';
  style.textContent = `
    #editUserModal .modal {
      max-width: 460px !important;
      border-radius: 22px !important;
      padding: 20px !important;
      background: #FFFFFF !important;
      box-shadow: 0 24px 70px rgba(6, 4, 39, 0.22) !important;
      border: 1px solid rgba(14, 20, 109, 0.10) !important;
    }

    #editUserModal .modal-title {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #0E146D;
      font-size: 19px;
      font-weight: 1000;
      margin-bottom: 6px;
    }

    #editUserModal .modal-title i {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #EEF2FF;
      color: #0E146D;
      font-size: 14px;
      flex-shrink: 0;
    }

    #editUserModal .modal-sub {
      color: #64748B;
      font-size: 12.5px;
      font-weight: 800;
      line-height: 1.7;
      margin-bottom: 14px;
      direction: ltr;
      text-align: left;
      word-break: break-word;
    }

    #editUserModal .walkin-form {
      gap: 10px !important;
    }

    #editUserModal .guest-label {
      display: block;
      color: #111827;
      font-size: 12px;
      font-weight: 1000;
      margin-bottom: 6px;
    }

    #editUserModal .walkin-input {
      height: 42px !important;
      border-radius: 12px !important;
      font-size: 13px !important;
      font-weight: 800 !important;
      background: #FFFFFF !important;
      border: 1px solid #E5E7EB !important;
    }

    #editUserPasswordBox {
      margin-top: 12px !important;
      padding: 12px !important;
      border: 1px solid #E5E7EB !important;
      border-radius: 16px !important;
      background: #F8FAFC !important;
    }

    #editUserPasswordBox .eq-edit-password-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 1000 !important;
      color: #111827 !important;
      margin-bottom: 8px !important;
      font-size: 13px !important;
    }

    #editUserPasswordBox .eq-edit-password-title i {
      color: #0E146D;
    }

    #editUserPasswordBox .eq-edit-password-hint {
      margin-top: 7px !important;
      color: #64748B !important;
      font-size: 11px !important;
      line-height: 1.6 !important;
      font-weight: 800;
    }

    #editUserSelfWarning {
      border-radius: 14px !important;
      font-weight: 850 !important;
      line-height: 1.7 !important;
    }
  `;

  document.head.appendChild(style);
}

function renderEditUserModalStaticText() {
  const modal = document.getElementById('editUserModal');
  if (!modal) return;

  const isEnglish = String(
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar'
  ).toLowerCase().startsWith('en');

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const title = modal.querySelector('.modal-title');
  if (title) {
    title.innerHTML = `
      <i class="fas fa-user-edit"></i>
      ${editUserModalText('تعديل الموظف', 'Edit Staff Member')}
    `;
  }

  const labels = modal.querySelectorAll('.guest-label');

  if (labels[0]) {
    labels[0].textContent = editUserModalText('الاسم الظاهر', 'Display Name');
  }

  if (labels[1]) {
    labels[1].textContent = editUserModalText('الدور / المنصب', 'Role / Position');
  }

  const displayNameInput = document.getElementById('editUserDisplayName');
  if (displayNameInput) {
    displayNameInput.placeholder = editUserModalText('الاسم الظاهر', 'Display name');
  }

  const roleSelect = document.getElementById('editUserRole');
  if (roleSelect) {
    const roleOptions = {
      staff: editUserModalText('موظف', 'Staff'),
      employee: editUserModalText('موظف', 'Employee'),
      manager: editUserModalText('مدير', 'Manager'),
      admin: editUserModalText('مدير النظام', 'Admin'),
      host: editUserModalText('استقبال', 'Host')
    };

    Array.from(roleSelect.options || []).forEach(option => {
      option.textContent = roleOptions[option.value] || option.textContent;
    });
  }

  const passwordBox = document.getElementById('editUserPasswordBox');
  if (passwordBox) {
    const passwordTitle = passwordBox.querySelector('div');
    if (passwordTitle) {
      passwordTitle.classList.add('eq-edit-password-title');
      passwordTitle.innerHTML = `
        <i class="fas fa-key"></i>
        ${editUserModalText('تغيير كلمة المرور', 'Change Password')}
      `;
    }

    const passwordHint = Array.from(passwordBox.querySelectorAll('div')).find(el => {
      return el !== passwordTitle;
    });

    if (passwordHint) {
      passwordHint.classList.add('eq-edit-password-hint');
      passwordHint.textContent = editUserModalText(
        'اترك الحقول فارغة إذا كنت لا تريد تغيير كلمة المرور.',
        'Leave these fields empty if you do not want to change the password.'
      );
    }
  }

  const newPasswordInput = document.getElementById('editUserNewPassword');
  if (newPasswordInput) {
    newPasswordInput.placeholder = editUserModalText(
      'كلمة مرور جديدة 8 أحرف على الأقل',
      'New password, at least 8 characters'
    );
  }

  const confirmPasswordInput = document.getElementById('editUserConfirmPassword');
  if (confirmPasswordInput) {
    confirmPasswordInput.placeholder = editUserModalText(
      'تأكيد كلمة المرور',
      'Confirm password'
    );
  }

  const warning = document.getElementById('editUserSelfWarning');
  if (warning) {
    warning.textContent = editUserModalText(
      'لا يمكنك تغيير دور حسابك الحالي من هنا. يمكنك تعديل الاسم فقط.',
      'You cannot change your own role here. You can only edit the display name.'
    );
  }

  const saveBtn = modal.querySelector('.settings-save[onclick="saveEditedUser()"]');
  if (saveBtn) {
    saveBtn.innerHTML = `
      <i class="fas fa-save"></i>
      ${editUserModalText('حفظ التعديل', 'Save Changes')}
    `;
  }

  const closeBtn = modal.querySelector('.settings-close[onclick="closeEditUserModal()"]');
  if (closeBtn) {
    closeBtn.textContent = editUserModalText('إلغاء', 'Cancel');
  }
}

function openEditUserModal(userId) {
  if (!canDo('manage_users')) {
    showAlert(editUserModalText(
      'ليس لديك صلاحية لتعديل الموظفين',
      'You do not have permission to edit staff members'
    ));
    return;
  }

  if (!userId) {
    showAlert(editUserModalText(
      'معرف الموظف غير موجود',
      'Staff member ID is missing'
    ));
    return;
  }

  const users = Array.isArray(window.currentBusinessUsersList)
    ? window.currentBusinessUsersList
    : [];

  const user = users.find(item => String(item.id) === String(userId));

  if (!user) {
    showAlert(editUserModalText(
      'لم يتم العثور على بيانات الموظف. حدّث القائمة وحاول مرة أخرى.',
      'Staff member data was not found. Refresh the list and try again.'
    ));
    return;
  }

  currentEditingBusinessUserId = user.id;

  const modal = document.getElementById('editUserModal');
  const idInput = document.getElementById('editUserId');
  const displayNameInput = document.getElementById('editUserDisplayName');
  const roleSelect = document.getElementById('editUserRole');
  const passwordBox = document.getElementById('editUserPasswordBox');
  const newPasswordInput = document.getElementById('editUserNewPassword');
  const confirmPasswordInput = document.getElementById('editUserConfirmPassword');
  const warning = document.getElementById('editUserSelfWarning');
  const sub = document.getElementById('editUserModalSub');

  if (!modal || !idInput || !displayNameInput || !roleSelect) {
    console.warn('editUserModal elements are missing in index.html');
    showAlert(editUserModalText(
      'واجهة تعديل الموظف غير مكتملة',
      'The staff edit interface is incomplete'
    ));
    return;
  }

  applyEditUserModalStyle();
  renderEditUserModalStaticText();

  const isSelf = String(user.id) === String(currentUser?.id);

  idInput.value = user.id;
  displayNameInput.value = user.display_name || '';
  roleSelect.value = user.role || 'staff';

  if (newPasswordInput) newPasswordInput.value = '';
  if (confirmPasswordInput) confirmPasswordInput.value = '';

  if (passwordBox) {
    passwordBox.style.display = user.auth_id ? 'block' : 'none';
  }

  roleSelect.disabled = isSelf;

  if (warning) {
    warning.style.display = isSelf ? 'block' : 'none';
  }

  if (sub) {
    sub.innerText = user.username || editUserModalText(
      'تعديل بيانات الموظف',
      'Edit staff member details'
    );
  }

  modal.classList.add('show');
}

function closeEditUserModal() {
  const modal = document.getElementById('editUserModal');
  if (modal) modal.classList.remove('show');

  currentEditingBusinessUserId = null;
}

async function saveEditedUser() {
  if (!canDo('manage_users')) {
    showAlert('ليس لديك صلاحية لتعديل الموظفين');
    return;
  }

  const userId = document.getElementById('editUserId')?.value;
  const displayName = document.getElementById('editUserDisplayName')?.value.trim();
  const roleSelect = document.getElementById('editUserRole');
  const newRole = roleSelect?.value;

  if (!userId) {
    showAlert('معرف الموظف غير موجود');
    return;
  }

  if (!displayName) {
    showAlert('الاسم الظاهر مطلوب');
    return;
  }

  const users = Array.isArray(window.currentBusinessUsersList)
    ? window.currentBusinessUsersList
    : [];

  const oldUser = users.find(item => String(item.id) === String(userId));

  if (!oldUser) {
    showAlert('لم يتم العثور على بيانات الموظف');
    return;
  }

  const isSelf = String(userId) === String(currentUser?.id);
  const finalRole = isSelf ? oldUser.role : newRole;

  if (!finalRole) {
    showAlert('الدور غير محدد');
    return;
  }

  // حماية: لا تسمح بإزالة آخر أدمن في المطعم
  if (oldUser.role === 'admin' && finalRole !== 'admin') {
    const { data: admins, error: adminsError } = await supabase
      .from('app_users')
      .select('id')
      .eq('business_id', currentUser.business_id)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (adminsError) {
      console.error('فشل التحقق من عدد المدراء:', adminsError);
      showAlert('تعذر التحقق من عدد المدراء');
      return;
    }

    const activeAdmins = Array.isArray(admins) ? admins : [];
    const otherActiveAdmins = activeAdmins.filter(admin => String(admin.id) !== String(userId));

    if (otherActiveAdmins.length === 0) {
      showAlert('لا يمكن تغيير دور آخر مدير نظام في المطعم');
      return;
    }
  }

  const saveBtn = event?.target;
  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.75';
      saveBtn.style.cursor = 'not-allowed';
      saveBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        جاري الحفظ...
      `;
    }

const { data: updatedRows, error } = await supabase.rpc('admin_update_business_user', {
  p_user_id: userId,
  p_display_name: displayName,
  p_role: finalRole
});

if (error) {
  console.error('فشل تعديل الموظف عبر RPC:', error);
  showAlert('فشل تعديل الموظف: ' + error.message);
  return;
}

const updatedUser = Array.isArray(updatedRows) ? updatedRows[0] : null;

if (!updatedUser) {
  showAlert('لم يتم إرجاع بيانات الموظف بعد التعديل');
  return;
}

await logBusinessActivitySafe(
  'user_updated',
  'تعديل بيانات موظف',
  'app_user',
  updatedUser.id,
  updatedUser.display_name || updatedUser.username || 'موظف',
  {
    username: updatedUser.username,
    old_display_name: oldUser.display_name,
    new_display_name: updatedUser.display_name,
    old_role: oldUser.role,
    new_role: updatedUser.role
  }
);

// إذا كان المستخدم يعدل اسمه هو، حدّث الاسم في الواجهة والتخزين
if (isSelf) {
  currentUser = updatedUser;
  localStorage.setItem('easyq_user', JSON.stringify(updatedUser));

updateTopbarUserIdentity(updatedUser);
}


    const newPasswordInput = document.getElementById('editUserNewPassword');
    const confirmPasswordInput = document.getElementById('editUserConfirmPassword');

    const newPassword = newPasswordInput ? newPasswordInput.value.trim() : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';

    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        showAlert('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        return;
      }

      if (newPassword !== confirmPassword) {
        showAlert('كلمة المرور وتأكيدها غير متطابقين');
        return;
      }

      const { data: passwordResult, error: passwordError } = await supabase.functions.invoke('update-user-password', {
        body: {
          target_user_id: userId,
          new_password: newPassword
        }
      });

      if (passwordError) {
        let message = 'فشل تغيير كلمة مرور الموظف';

        try {
          if (passwordError.context) {
            const errorBody = await passwordError.context.json();
            message = errorBody?.message || message;
          }
        } catch (parseErr) {
          console.warn('تعذر قراءة رسالة خطأ تغيير كلمة المرور:', parseErr);
        }

        showAlert(message);
        return;
      }

      if (passwordResult?.success === false) {
        showAlert(passwordResult.message || 'فشل تغيير كلمة مرور الموظف');
        return;
      }
    }

    if (typeof showSuccessNotification === 'function') {
      showSuccessNotification(
        newPassword
          ? 'تم تعديل بيانات الموظف وتغيير كلمة المرور بنجاح'
          : 'تم تعديل بيانات الموظف بنجاح'
      );
    } else {
      alert(
        newPassword
          ? 'تم تعديل بيانات الموظف وتغيير كلمة المرور بنجاح'
          : 'تم تعديل بيانات الموظف بنجاح'
      );
    }

    closeEditUserModal();
    await loadUsers();

  } catch (err) {
    console.error('خطأ غير متوقع أثناء تعديل الموظف:', err);
    showAlert('حدث خطأ أثناء تعديل الموظف');

  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
      saveBtn.innerHTML = originalBtnHtml || 'حفظ التعديل';
    }
  }
}

async function setBusinessUserActive(userId, nextActive) {
  if (!canDo('manage_users')) {
    showAlert('ليس لديك صلاحية لإدارة الموظفين');
    return;
  }

  if (!userId) {
    showAlert('معرف الموظف غير موجود');
    return;
  }

  if (String(userId) === String(currentUser?.id)) {
    showAlert('لا يمكنك إيقاف حسابك الحالي');
    return;
  }

  const users = Array.isArray(window.currentBusinessUsersList)
    ? window.currentBusinessUsersList
    : [];

  const targetUser = users.find(item => String(item.id) === String(userId));

  if (!targetUser) {
    showAlert('لم يتم العثور على بيانات الموظف');
    return;
  }

  const actionText = nextActive ? 'تفعيل' : 'إيقاف';

  const confirmed = confirm(`هل أنت متأكد من ${actionText} حساب الموظف: ${targetUser.display_name || targetUser.username}؟`);
  if (!confirmed) return;

  const actionBtn = Array.from(document.querySelectorAll('[onclick^="setBusinessUserActive"]'))
    .find(btn => btn.getAttribute('onclick')?.includes(userId));

  const originalBtnHtml = actionBtn ? actionBtn.innerHTML : '';

  try {
    if (actionBtn) {
      actionBtn.disabled = true;
      actionBtn.style.opacity = '0.75';
      actionBtn.style.cursor = 'not-allowed';
      actionBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
      `;
    }

    const { data, error } = await supabase.rpc('admin_set_business_user_active', {
      p_user_id: userId,
      p_is_active: nextActive
    });

    if (error) {
      console.error(`فشل ${actionText} الموظف:`, error);
      showAlert(`فشل ${actionText} الموظف: ${error.message}`);
      return;
    }

    const updatedUser = Array.isArray(data) ? data[0] : null;

    if (!updatedUser) {
      showAlert('لم يتم إرجاع بيانات الموظف بعد العملية');
      return;
    }

await logBusinessActivitySafe(
  nextActive ? 'user_activated' : 'user_deactivated',
  nextActive ? 'تفعيل موظف' : 'إيقاف موظف',
  'app_user',
  updatedUser.id,
  updatedUser.display_name || updatedUser.username || targetUser.display_name || targetUser.username || 'موظف',
  {
    username: updatedUser.username || targetUser.username || '',
    old_status: nextActive ? 'inactive' : 'active',
    new_status: nextActive ? 'active' : 'inactive'
  }
);

if (typeof showSuccessNotification === 'function') {
  showSuccessNotification(`تم ${actionText} الموظف بنجاح`);
} else {
  alert(`تم ${actionText} الموظف بنجاح`);
}

await loadUsers();

  } catch (err) {
    console.error(`خطأ غير متوقع أثناء ${actionText} الموظف:`, err);
    showAlert(`حدث خطأ أثناء ${actionText} الموظف`);

  } finally {
    if (actionBtn) {
      actionBtn.disabled = false;
      actionBtn.style.opacity = '1';
      actionBtn.style.cursor = 'pointer';
      actionBtn.innerHTML = originalBtnHtml || `<i class="fas ${nextActive ? 'fa-user-check' : 'fa-user-slash'}"></i>`;
    }
  }
}

async function archiveBusinessUser(userId) {
  if (!canDo('manage_users')) {
    showAlert('ليس لديك صلاحية لإدارة الموظفين');
    return;
  }

  if (!userId) {
    showAlert('معرف الموظف غير موجود');
    return;
  }

  if (String(userId) === String(currentUser?.id)) {
    showAlert('لا يمكنك حذف حسابك الحالي من الواجهة');
    return;
  }

  const users = Array.isArray(window.currentBusinessUsersList)
    ? window.currentBusinessUsersList
    : [];

  const targetUser = users.find(item => String(item.id) === String(userId));

  if (!targetUser) {
    showAlert('لم يتم العثور على بيانات الموظف');
    return;
  }

  const confirmed = confirm(
    `سيتم حذف الموظف "${targetUser.display_name || targetUser.username}" من الواجهة وإيقاف دخوله، مع الاحتفاظ بسجلاته. هل تريد المتابعة؟`
  );

  if (!confirmed) return;

  const actionBtn = Array.from(document.querySelectorAll('[onclick^="archiveBusinessUser"]'))
    .find(btn => btn.getAttribute('onclick')?.includes(userId));

  const originalBtnHtml = actionBtn ? actionBtn.innerHTML : '';

  try {
    if (actionBtn) {
      actionBtn.disabled = true;
      actionBtn.style.opacity = '0.75';
      actionBtn.style.cursor = 'not-allowed';
      actionBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    }

    const { data, error } = await supabase.rpc('admin_archive_business_user', {
      p_user_id: userId
    });

    if (error) {
      console.error('فشل أرشفة الموظف:', error);
      showAlert('فشل حذف الموظف من الواجهة: ' + error.message);
      return;
    }

    const archivedUser = Array.isArray(data) ? data[0] : null;

    if (!archivedUser) {
      showAlert('لم يتم إرجاع بيانات الموظف بعد الأرشفة');
      return;
    }

await logBusinessActivitySafe(
  'user_archived',
  'أرشفة موظف',
  'app_user',
  archivedUser?.id || userId,
  archivedUser?.display_name || archivedUser?.username || targetUser?.display_name || targetUser?.username || 'موظف',
  {
    username: archivedUser?.username || targetUser?.username || '',
    old_status: targetUser?.is_active ? 'active' : 'inactive',
    new_status: 'archived'
  }
);

if (typeof showSuccessNotification === 'function') {
  showSuccessNotification('تم حذف الموظف من القائمة بنجاح');
} else {
  alert('تم حذف الموظف من القائمة بنجاح');
}

await loadUsers();

  } catch (err) {
    console.error('خطأ غير متوقع أثناء أرشفة الموظف:', err);
    showAlert('حدث خطأ أثناء حذف الموظف من الواجهة');

  } finally {
    if (actionBtn) {
      actionBtn.disabled = false;
      actionBtn.style.opacity = '1';
      actionBtn.style.cursor = 'pointer';
      actionBtn.innerHTML = originalBtnHtml || `<i class="fas fa-trash"></i>`;
    }
  }
}

async function saveUser() {
  if (!currentUser || currentUser.role !== 'admin') {
    showAlert('ليس لديك صلاحية لإضافة موظفين');
    return;
  }

  const email = document.getElementById('newUsername')?.value.trim();
  const displayName = document.getElementById('newDisplayName')?.value.trim();
  const password = document.getElementById('newPassword')?.value;
  const role = document.getElementById('newRole')?.value;

  const saveBtn = document.getElementById('saveUserBtn');
  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';

  if (!email || !displayName || !password) {
    showAlert('جميع الحقول مطلوبة');
    return;
  }

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.75';
      saveBtn.style.cursor = 'not-allowed';
      saveBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        جاري إضافة الموظف...
      `;
    }

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

    if (!data?.success) {
      throw new Error(data?.message || 'فشل إنشاء المستخدم');
    }

    showSuccessNotification('تم إضافة الموظف بنجاح');
    cancelAddUser();

    // لا نغلق المودل، فقط نحدث القائمة
    await loadUsers();

  } catch (err) {
    console.error(err);
    showAlert('فشل إضافة الموظف: ' + err.message);

  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
      saveBtn.innerHTML = originalBtnHtml || 'حفظ';
    }
  }
}

async function deleteUser(userId) {
  if (!currentUser || currentUser.role !== 'admin') {
    showAlert('ليس لديك صلاحية لحذف الموظفين');
    return;
  }

  if (!userId) {
    showAlert('معرف الموظف غير موجود');
    return;
  }

  if (userId === currentUser.id) {
    showAlert('لا يمكنك حذف حسابك الحالي');
    return;
  }

  const confirmed = confirm('هل أنت متأكد من حذف هذا الموظف بالكامل؟');
  if (!confirmed) return;

  const deleteBtn = Array.from(document.querySelectorAll('[onclick^="deleteUser"]'))
    .find(btn => btn.getAttribute('onclick')?.includes(userId));

  const originalBtnHtml = deleteBtn ? deleteBtn.innerHTML : '';

  try {
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.style.opacity = '0.75';
      deleteBtn.style.cursor = 'not-allowed';
      deleteBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        جاري الحذف...
      `;
    }

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: {
        user_id: userId
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (error) {
      console.error('Delete user edge function error:', error);

      let edgeMessage = error.message || 'فشل استدعاء دالة حذف المستخدم';

      try {
        if (error.context && typeof error.context.json === 'function') {
          const errorBody = await error.context.json();
          console.error('Delete user edge function error body:', errorBody);

          edgeMessage =
            errorBody?.message ||
            errorBody?.error ||
            JSON.stringify(errorBody);
        }
      } catch (parseErr) {
        console.warn('Could not parse delete-user error body:', parseErr);
      }

      throw new Error(edgeMessage);
    }

    if (!data?.success) {
      throw new Error(data?.message || 'فشل حذف الموظف بالكامل');
    }

    showSuccessNotification('تم حذف الموظف بالكامل بنجاح');
    await loadUsers();

  } catch (err) {
    console.error('❌ فشل حذف الموظف بالكامل:', err);
    showAlert('فشل حذف الموظف بالكامل: ' + err.message);

    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.style.opacity = '1';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.innerHTML = originalBtnHtml || 'حذف';
    }
  }
}
// ============================================================
// PERMISSIONS MODAL
// مودل صلاحيات الموظفين بتبويبات المناصب
// ============================================================

let permissionsDraft = {};
let activePermissionsRole = 'manager';

const EASYQ_PERMISSION_ROLES = [
  {
    key: 'manager',
    ar: 'مشرف',
    en: 'Manager',
    icon: 'fa-user-tie',
    desc: 'صلاحيات تشغيل وإشراف يحددها مالك الحساب'
  },
  {
    key: 'staff',
    ar: 'موظف',
    en: 'Staff',
    icon: 'fa-user',
    desc: 'صلاحيات التشغيل اليومية التي يمنحها مالك الحساب'
  }
];


function permissionsModalText(arText, enText) {
  if (typeof usersModalText === 'function') {
    return usersModalText(arText, enText);
  }

  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? enText : arText;
}

function applyPermissionsModalStaticText() {
  const modal = document.getElementById('permissionsModal');
  if (!modal) return;

  const isEnglish = String(
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar'
  ).toLowerCase().startsWith('en');

  modal.setAttribute('dir', isEnglish ? 'ltr' : 'rtl');
  modal.style.direction = isEnglish ? 'ltr' : 'rtl';

  const title = modal.querySelector('.modal-title');
  if (title) {
    title.innerHTML = `
      <i class="fas fa-lock"></i>
      ${permissionsModalText('إدارة الصلاحيات', 'Permissions Management')}
    `;
  }

  const sub = modal.querySelector('.modal-sub');
  if (sub) {
    sub.textContent = permissionsModalText(
      'تحديد صلاحيات كل دور في النظام',
      'Define permissions for each role in the system'
    );
  }

  const saveBtn = modal.querySelector('.settings-save[onclick="savePermissions()"]');
  if (saveBtn) {
    saveBtn.innerHTML = `
      <i class="fas fa-save"></i>
      ${permissionsModalText('حفظ الصلاحيات', 'Save Permissions')}
    `;
  }

  const closeBtn = modal.querySelector('.settings-close[onclick="closePermissionsModal()"]');
  if (closeBtn) {
    closeBtn.textContent = permissionsModalText('إغلاق', 'Close');
  }
}

function openPermissionsModal() {
  // مودل الصلاحيات خاص بمالك الحساب فقط
  // المشرف والموظف لا يملكون حق تعديل صلاحيات الآخرين
  if (!currentUser || currentUser.role !== 'admin') {
    showAlert(permissionsModalText(
      'ليس لديك صلاحية لإدارة صلاحيات الموظفين',
      'You do not have permission to manage staff permissions'
    ));
    return;
  }

  const permissionsModal = document.getElementById('permissionsModal');

  if (!permissionsModal) {
    console.warn('permissionsModal غير موجود');
    return;
  }

  applyPermissionsModalStaticText();

  permissionsModal.classList.add('show');
  activePermissionsRole = 'manager';
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

  if (error) {
    console.error('Permissions load error:', error);
    showAlert('فشل تحميل الصلاحيات');
    return;
  }

  permissionsDraft = {};

  EASYQ_PERMISSION_ROLES.forEach(role => {
    permissionsDraft[role.key] = {};

    PERMISSION_KEYS.forEach(permissionItem => {
      const found = (permissions || []).find(row =>
        row.role === role.key &&
        row.permission_key === permissionItem.key
      );

      permissionsDraft[role.key][permissionItem.key] = found
        ? found.is_enabled === true
        : false;
    });
  });

  renderPermissionsTabs();
  renderPermissionsRolePanel(activePermissionsRole);
}

function renderPermissionsTabs() {
  const container = document.getElementById('permissionsList');
  if (!container) return;

  applyPermissionsModalStaticText();
  applyPermissionsDesignerStyle();

  container.innerHTML = `
    <div class="eq-permissions-tabs">
      ${EASYQ_PERMISSION_ROLES.map(role => {
        const enabledCount = PERMISSION_KEYS.filter(item => {
          return permissionsDraft?.[role.key]?.[item.key] === true;
        }).length;

        return `
          <button
            type="button"
            class="eq-permissions-role-tab ${activePermissionsRole === role.key ? 'active' : ''}"
            onclick="switchPermissionsRole('${role.key}')"
          >
            <span class="eq-permissions-role-main">
              <i class="fas ${role.icon}"></i>
              <span>${permissionsModalText(role.ar, role.en)}</span>
            </span>

            <span class="eq-permissions-role-count">
              ${enabledCount}/${PERMISSION_KEYS.length}
            </span>
          </button>
        `;
      }).join('')}
    </div>

    <div id="permissionsRolePanel"></div>
  `;

  renderPermissionsRolePanel(activePermissionsRole);
}

function applyPermissionsDesignerStyle() {
  let style = document.getElementById('eqPermissionsDesignerStyle');

  if (!style) {
    style = document.createElement('style');
    style.id = 'eqPermissionsDesignerStyle';
    document.head.appendChild(style);
  }

  style.textContent = `
    /* ============================================================
       CLEAN FULL PAGE PERMISSIONS UI
       نفس فكرة صفحات السايد بار الكبيرة بدون هيرو وبدون تنبيه طويل
       ============================================================ */

    #permissionsModal.modal-backdrop {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100dvh !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #F5F7FF !important;
      z-index: 999999 !important;
      align-items: stretch !important;
      justify-content: stretch !important;
      overflow: hidden !important;
    }

    #permissionsModal.show {
      display: flex !important;
    }

    #permissionsModal .modal {
      width: 100vw !important;
      height: 100dvh !important;
      max-width: none !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 16px 18px !important;
      border-radius: 0 !important;
      background: #F5F7FF !important;
      border: none !important;
      box-shadow: none !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }

    #permissionsModal .modal-title {
      flex: 0 0 auto !important;
      width: min(1180px, 100%) !important;
      margin: 0 auto 4px !important;
      padding: 0 !important;
      min-height: 38px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      color: #0E146D !important;
      font-size: 20px !important;
      font-weight: 1000 !important;
      line-height: 1.3 !important;
    }

    #permissionsModal .modal-title i {
      width: 36px !important;
      height: 36px !important;
      border-radius: 12px !important;
      background: #0E146D !important;
      color: #FFFFFF !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 15px !important;
      flex-shrink: 0 !important;
    }

    #permissionsModal .modal-sub {
      flex: 0 0 auto !important;
      width: min(1180px, 100%) !important;
      margin: 0 auto 12px !important;
      padding: 0 !important;
      color: #64748B !important;
      font-size: 13px !important;
      font-weight: 800 !important;
      line-height: 1.5 !important;
    }

    #permissionsList {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      width: min(1180px, 100%) !important;
      margin: 0 auto !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    }

    #permissionsList .eq-permissions-tabs {
      flex: 0 0 auto !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
      background: #E9ECF8 !important;
      border: 1px solid #DDE3F5 !important;
      border-radius: 18px !important;
      padding: 8px !important;
    }

    #permissionsList .eq-permissions-role-tab {
      min-height: 48px !important;
      border: 1px solid transparent !important;
      background: #FFFFFF !important;
      color: #111827 !important;
      border-radius: 14px !important;
      cursor: pointer !important;
      padding: 0 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      transition: .16s ease !important;
      font-size: 13px !important;
      font-weight: 1000 !important;
    }

    #permissionsList .eq-permissions-role-tab:hover {
      border-color: rgba(14, 20, 109, 0.18) !important;
      transform: translateY(-1px) !important;
    }

    #permissionsList .eq-permissions-role-tab.active {
      background: #0E146D !important;
      color: #FFFFFF !important;
      border-color: #0E146D !important;
      box-shadow: 0 10px 22px rgba(14,20,109,0.18) !important;
    }

    #permissionsList .eq-permissions-role-main {
      min-width: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
      white-space: nowrap !important;
    }

    #permissionsList .eq-permissions-role-main i {
      width: 28px !important;
      height: 28px !important;
      border-radius: 10px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #EEF2FF !important;
      color: #0E146D !important;
      font-size: 13px !important;
      flex-shrink: 0 !important;
    }

    #permissionsList .eq-permissions-role-tab.active .eq-permissions-role-main i {
      background: rgba(255,255,255,0.14) !important;
      color: #FFFFFF !important;
    }

    #permissionsList .eq-permissions-role-count {
      flex: 0 0 auto !important;
      min-width: 52px !important;
      height: 26px !important;
      border-radius: 999px !important;
      background: #F4F6FF !important;
      color: #0E146D !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 11px !important;
      font-weight: 1000 !important;
    }

    #permissionsList .eq-permissions-role-tab.active .eq-permissions-role-count {
      background: rgba(255,255,255,0.16) !important;
      color: #FFFFFF !important;
    }

    #permissionsRolePanel {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow: hidden !important;
      border: 1px solid #E5E7F2 !important;
      border-radius: 20px !important;
      background: #FFFFFF !important;
      display: flex !important;
      flex-direction: column !important;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045) !important;
    }

    #permissionsRolePanel .eq-permissions-panel-top {
      flex: 0 0 auto !important;
      padding: 12px 14px !important;
      background: #FFFFFF !important;
      border-bottom: 1px solid #E5E7F2 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
    }

    #permissionsRolePanel .eq-permissions-panel-title {
      min-width: 0 !important;
      color: #111827 !important;
      font-size: 14px !important;
      font-weight: 1000 !important;
      line-height: 1.35 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    #permissionsRolePanel .eq-permissions-panel-title i {
      color: #0E146D !important;
    }

    #permissionsRolePanel .eq-permissions-panel-sub {
      margin-top: 3px !important;
      color: #64748B !important;
      font-size: 11.5px !important;
      font-weight: 850 !important;
      line-height: 1.4 !important;
    }

    #permissionsRolePanel .eq-permissions-all-btn {
      border: none !important;
      background: #EEF2FF !important;
      color: #0E146D !important;
      min-height: 36px !important;
      padding: 0 12px !important;
      border-radius: 12px !important;
      cursor: pointer !important;
      font-weight: 1000 !important;
      font-size: 12px !important;
      white-space: nowrap !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      flex-shrink: 0 !important;
    }

    #permissionsRolePanel .eq-permissions-all-btn:hover {
      background: #E0E7FF !important;
    }

    #permissionsRolePanel .eq-permissions-scroll {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow-y: auto !important;
      padding: 12px !important;
      scrollbar-width: thin !important;
    }

    #permissionsRolePanel .eq-permissions-grid {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }

    #permissionsRolePanel .eq-permission-card {
      min-height: 54px !important;
      background: #FFFFFF !important;
      border: 1px solid #E5E7EB !important;
      border-radius: 15px !important;
      padding: 9px 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      box-shadow: 0 5px 13px rgba(15, 23, 42, 0.03) !important;
      transition: border-color .16s ease, background .16s ease, transform .16s ease !important;
    }

    #permissionsRolePanel .eq-permission-card.is-on {
      background: #F4F6FF !important;
      border-color: rgba(14, 20, 109, 0.18) !important;
    }

    #permissionsRolePanel .eq-permission-card:hover {
      transform: translateY(-1px) !important;
      border-color: rgba(14, 20, 109, 0.24) !important;
    }

    #permissionsRolePanel .eq-permission-name {
      font-size: 12px !important;
      font-weight: 950 !important;
      color: #111827 !important;
      line-height: 1.45 !important;
      min-width: 0 !important;
    }

    #permissionsRolePanel .eq-permission-state {
      display: block !important;
      margin-top: 2px !important;
      font-size: 10px !important;
      font-weight: 850 !important;
      color: #64748B !important;
    }

    #permissionsRolePanel .eq-permission-card.is-on .eq-permission-state {
      color: #0E146D !important;
    }

    #permissionsRolePanel .toggle-switch {
      flex-shrink: 0 !important;
      transform: scale(0.9) !important;
      transform-origin: center !important;
    }

    #permissionsModal .modal > div:last-child {
      flex: 0 0 auto !important;
      width: min(1180px, 100%) !important;
      margin: 10px auto 0 !important;
      padding: 10px 0 0 !important;
      border-top: 1px solid rgba(14, 20, 109, 0.10) !important;
      display: flex !important;
      gap: 10px !important;
      background: transparent !important;
    }

    #permissionsModal .settings-save,
    #permissionsModal .settings-close {
      min-height: 44px !important;
      border-radius: 14px !important;
      font-size: 14px !important;
      font-weight: 1000 !important;
    }

    @media (max-width: 1180px) {
      #permissionsRolePanel .eq-permissions-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 860px) {
      #permissionsRolePanel .eq-permissions-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 620px) {
      #permissionsModal .modal {
        padding: 12px !important;
      }

      #permissionsModal .modal-title {
        font-size: 17px !important;
      }

      #permissionsList .eq-permissions-tabs {
        grid-template-columns: 1fr !important;
      }

      #permissionsRolePanel .eq-permissions-grid {
        grid-template-columns: 1fr !important;
      }

      #permissionsRolePanel .eq-permissions-panel-top {
        align-items: stretch !important;
        flex-direction: column !important;
      }

      #permissionsRolePanel .eq-permissions-all-btn {
        width: 100% !important;
      }

      #permissionsModal .modal > div:last-child {
        flex-direction: column !important;
      }
    }
  `;
}

function renderPermissionsRolePanel(roleKey) {
  const panel = document.getElementById('permissionsRolePanel');
  if (!panel) return;

  applyPermissionsDesignerStyle();

  const roleInfo = EASYQ_PERMISSION_ROLES.find(role => role.key === roleKey);

  const roleName = permissionUiText(
    roleInfo?.ar || 'الدور',
    roleInfo?.en || 'Role'
  );

  const enabledCount = PERMISSION_KEYS.filter(item => {
    return permissionsDraft?.[roleKey]?.[item.key] === true;
  }).length;

  panel.innerHTML = `
    <div class="eq-permissions-panel-top">
      <div style="min-width:0;">
        <div class="eq-permissions-panel-title">
          <i class="fas ${roleInfo?.icon || 'fa-user-shield'}"></i>
          <span>${roleName}</span>
        </div>

        <div class="eq-permissions-panel-sub">
          ${enabledCount}/${PERMISSION_KEYS.length}
          ${permissionUiText('صلاحية مفعلة', 'permissions enabled')}
        </div>
      </div>

      <button
        type="button"
        class="eq-permissions-all-btn"
        onclick="toggleAllPermissionsForRole('${roleKey}')"
      >
        <i class="fas fa-check-double"></i>
        ${permissionUiText('تحديد / إلغاء الكل', 'Toggle All')}
      </button>
    </div>

    <div class="eq-permissions-scroll">
      <div class="eq-permissions-grid">
        ${PERMISSION_KEYS.map(permissionItem => {
          const isEnabled = permissionsDraft?.[roleKey]?.[permissionItem.key] === true;

          return `
            <div class="eq-permission-card ${isEnabled ? 'is-on' : ''}">
              <div class="eq-permission-name">
                ${permissionUiText(permissionItem.ar, permissionItem.en)}
                <span class="eq-permission-state">
                  ${isEnabled
                    ? permissionUiText('مفعلة', 'Enabled')
                    : permissionUiText('معطلة', 'Disabled')
                  }
                </span>
              </div>

              <button
                type="button"
                class="toggle-switch ${isEnabled ? 'active' : ''}"
                onclick="togglePermissionDraft('${roleKey}', '${permissionItem.key}')"
                data-role="${roleKey}"
                data-key="${permissionItem.key}"
                title="${isEnabled
                  ? permissionUiText('اضغط للتعطيل', 'Click to disable')
                  : permissionUiText('اضغط للتفعيل', 'Click to enable')
                }">
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function switchPermissionsRole(roleKey) {
  activePermissionsRole = roleKey;
  renderPermissionsTabs();
  renderPermissionsRolePanel(roleKey);
}

function permissionUiText(arText, enText) {
  if (typeof permissionsModalText === 'function') {
    return permissionsModalText(arText, enText);
  }

  const lang =
    window.currentLang ||
    localStorage.getItem('hajzak_lang') ||
    localStorage.getItem('easyq_lang') ||
    'ar';

  return String(lang).toLowerCase().startsWith('en') ? enText : arText;
}

function applyPermissionsDesignerStyle() {
  let style = document.getElementById('eqPermissionsDesignerStyle');

  if (!style) {
    style = document.createElement('style');
    style.id = 'eqPermissionsDesignerStyle';
    document.head.appendChild(style);
  }

  style.textContent = `
    #permissionsModal .modal {
      max-width: 620px !important;
      width: calc(100vw - 34px) !important;
      max-height: 88vh !important;
      border-radius: 24px !important;
      padding: 18px !important;
      background: #FFFFFF !important;
      box-shadow: 0 24px 70px rgba(6, 4, 39, 0.22) !important;
      border: 1px solid rgba(14, 20, 109, 0.10) !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }

    #permissionsModal .modal-title {
      margin-bottom: 5px !important;
    }

    #permissionsModal .modal-sub {
      margin-bottom: 12px !important;
    }

    #permissionsList {
      min-height: 0 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    }

    #permissionsList .eq-permissions-hero {
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 34%),
        linear-gradient(135deg, #070219 0%, #060427 52%, #0E146D 100%);
      color: #FFFFFF;
      border-radius: 20px;
      padding: 14px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      box-shadow: 0 14px 32px rgba(6, 4, 39, 0.20);
      overflow: hidden;
      position: relative;
    }

    #permissionsList .eq-permissions-hero::after {
      content: "";
      position: absolute;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      inset-inline-end: -80px;
      top: -95px;
      background: rgba(255, 255, 255, 0.10);
      pointer-events: none;
    }

    #permissionsList .eq-permissions-hero > * {
      position: relative;
      z-index: 1;
    }

    #permissionsList .eq-permissions-hero-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 1000;
      line-height: 1.35;
    }

    #permissionsList .eq-permissions-hero-title i {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.12);
      color: #DDE7FF;
      flex-shrink: 0;
    }

    #permissionsList .eq-permissions-hero-sub {
      margin-top: 6px;
      color: rgba(255,255,255,0.76);
      font-size: 11.5px;
      font-weight: 800;
      line-height: 1.7;
    }

    #permissionsList .eq-permissions-hero-count {
      min-width: 76px;
      height: 58px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.10);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }

    #permissionsList .eq-permissions-hero-count strong {
      font-size: 22px;
      font-weight: 1000;
      line-height: 1;
    }

    #permissionsList .eq-permissions-hero-count span {
      font-size: 10px;
      font-weight: 850;
      color: rgba(255,255,255,0.72);
    }

    #permissionsList .eq-permissions-note {
      padding: 10px 12px;
      border-radius: 16px;
      background: #FFFBEB;
      border: 1px solid #F4D28A;
      color: #6B4E00;
      font-size: 11.5px;
      line-height: 1.7;
      font-weight: 800;
    }

    #permissionsList .eq-permissions-note i {
      color: #B45309;
      margin-inline-end: 5px;
    }

    #permissionsList .eq-permissions-tabs {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      background: #F3F4F6;
      padding: 8px;
      border-radius: 18px;
    }

    #permissionsList .eq-permissions-role-tab {
      border: 1px solid transparent;
      background: #FFFFFF;
      color: #111827;
      min-height: 42px;
      padding: 0 12px;
      border-radius: 14px;
      cursor: pointer;
      font-weight: 1000;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      white-space: nowrap;
      transition: .16s ease;
    }

    #permissionsList .eq-permissions-role-tab:hover {
      transform: translateY(-1px);
      border-color: rgba(14, 20, 109, 0.15);
    }

    #permissionsList .eq-permissions-role-tab.active {
      background: #0E146D;
      color: #FFFFFF;
      box-shadow: 0 10px 22px rgba(14,20,109,0.18);
    }

    #permissionsRolePanel {
      min-height: 0 !important;
      overflow: hidden !important;
      border: 1px solid #E5E7EB;
      border-radius: 18px;
      background: #F8FAFC;
    }

    #permissionsRolePanel .eq-permissions-panel-top {
      padding: 10px 12px;
      background: #FFFFFF;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    #permissionsRolePanel .eq-permissions-panel-title {
      min-width: 0;
      color: #111827;
      font-size: 13px;
      font-weight: 1000;
      line-height: 1.35;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    #permissionsRolePanel .eq-permissions-panel-title i {
      color: #0E146D;
    }

    #permissionsRolePanel .eq-permissions-panel-sub {
      margin-top: 3px;
      color: #64748B;
      font-size: 10.8px;
      font-weight: 800;
      line-height: 1.45;
    }

    #permissionsRolePanel .eq-permissions-all-btn {
      border: none;
      background: #EEF2FF;
      color: #0E146D;
      min-height: 34px;
      padding: 0 10px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 1000;
      font-size: 11px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-shrink: 0;
    }

    #permissionsRolePanel .eq-permissions-all-btn:hover {
      background: #E0E7FF;
    }

    #permissionsRolePanel .eq-permissions-scroll {
      max-height: min(44vh, 360px);
      overflow-y: auto;
      padding: 10px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    #permissionsRolePanel .eq-permissions-scroll::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none;
    }

    #permissionsRolePanel .eq-permissions-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    #permissionsRolePanel .eq-permission-card {
      min-height: 48px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      padding: 8px 9px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      box-shadow: 0 5px 13px rgba(15, 23, 42, 0.03);
      transition: border-color .16s ease, background .16s ease, transform .16s ease;
    }

    #permissionsRolePanel .eq-permission-card.is-on {
      background: #F4F6FF;
      border-color: rgba(14, 20, 109, 0.18);
    }

    #permissionsRolePanel .eq-permission-card:hover {
      transform: translateY(-1px);
      border-color: rgba(14, 20, 109, 0.24);
    }

    #permissionsRolePanel .eq-permission-name {
      font-size: 11.8px;
      font-weight: 950;
      color: #111827;
      line-height: 1.45;
      min-width: 0;
    }

    #permissionsRolePanel .eq-permission-state {
      display: block;
      margin-top: 2px;
      font-size: 10px;
      font-weight: 850;
      color: #64748B;
    }

    #permissionsRolePanel .eq-permission-card.is-on .eq-permission-state {
      color: #0E146D;
    }

    #permissionsRolePanel .toggle-switch {
      flex-shrink: 0;
      transform: scale(0.92);
      transform-origin: center;
    }

    @media (max-width: 680px) {
      #permissionsModal .modal {
        max-width: calc(100vw - 22px) !important;
      }

      #permissionsList .eq-permissions-hero {
        grid-template-columns: 1fr;
      }

      #permissionsList .eq-permissions-hero-count {
        width: 100%;
        height: 48px;
        flex-direction: row;
      }

      #permissionsRolePanel .eq-permissions-grid {
        grid-template-columns: 1fr;
      }

      #permissionsRolePanel .eq-permissions-panel-top {
        align-items: stretch;
        flex-direction: column;
      }

      #permissionsRolePanel .eq-permissions-all-btn {
        width: 100%;
      }
    }
  `;
}

function renderPermissionsRolePanel(roleKey) {
  const panel = document.getElementById('permissionsRolePanel');
  if (!panel) return;

  applyPermissionsDesignerStyle();

  const roleInfo = EASYQ_PERMISSION_ROLES.find(role => role.key === roleKey);

  const roleName = permissionUiText(
    roleInfo?.ar || 'الدور',
    roleInfo?.en || 'Role'
  );

  const roleDesc = roleKey === 'manager'
    ? permissionUiText(
        'صلاحيات تشغيل وإشراف يحددها مالك الحساب',
        'Operational and supervision permissions set by the account owner'
      )
    : permissionUiText(
        'صلاحيات التشغيل اليومية التي يمنحها مالك الحساب',
        'Daily operation permissions granted by the account owner'
      );

  const enabledCount = PERMISSION_KEYS.filter(item => {
    return permissionsDraft?.[roleKey]?.[item.key] === true;
  }).length;

  panel.innerHTML = `
    <div class="eq-permissions-panel-top">
      <div style="min-width:0;">
        <div class="eq-permissions-panel-title">
          <i class="fas ${roleInfo?.icon || 'fa-user-shield'}"></i>
          <span>${roleName}</span>
        </div>
        <div class="eq-permissions-panel-sub">
          ${roleDesc}
          ·
          ${enabledCount}/${PERMISSION_KEYS.length}
          ${permissionUiText('مفعلة', 'enabled')}
        </div>
      </div>

      <button
        type="button"
        class="eq-permissions-all-btn"
        onclick="toggleAllPermissionsForRole('${roleKey}')"
      >
        <i class="fas fa-check-double"></i>
        ${permissionUiText('تحديد / إلغاء الكل', 'Toggle All')}
      </button>
    </div>

    <div class="eq-permissions-scroll">
      <div class="eq-permissions-grid">
        ${PERMISSION_KEYS.map(permissionItem => {
          const isEnabled = permissionsDraft?.[roleKey]?.[permissionItem.key] === true;

          return `
            <div class="eq-permission-card ${isEnabled ? 'is-on' : ''}">
              <div class="eq-permission-name">
                ${permissionUiText(permissionItem.ar, permissionItem.en)}
                <span class="eq-permission-state">
                  ${isEnabled
                    ? permissionUiText('مفعلة', 'Enabled')
                    : permissionUiText('معطلة', 'Disabled')
                  }
                </span>
              </div>

              <button
                type="button"
                class="toggle-switch ${isEnabled ? 'active' : ''}"
                onclick="togglePermissionDraft('${roleKey}', '${permissionItem.key}')"
                data-role="${roleKey}"
                data-key="${permissionItem.key}"
                title="${isEnabled
                  ? permissionUiText('اضغط للتعطيل', 'Click to disable')
                  : permissionUiText('اضغط للتفعيل', 'Click to enable')
                }">
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function togglePermissionDraft(roleKey, permissionKey) {
  const scrollBox = document.querySelector('#permissionsRolePanel .eq-permissions-scroll');
  const previousScrollTop = scrollBox ? scrollBox.scrollTop : 0;

  if (!permissionsDraft[roleKey]) {
    permissionsDraft[roleKey] = {};
  }

  permissionsDraft[roleKey][permissionKey] = !permissionsDraft[roleKey][permissionKey];

  renderPermissionsRolePanel(roleKey);

  requestAnimationFrame(() => {
    const newScrollBox = document.querySelector('#permissionsRolePanel .eq-permissions-scroll');

    if (newScrollBox) {
      newScrollBox.scrollTop = previousScrollTop;
    }

    const toggledButton = document.querySelector(
      `#permissionsRolePanel .toggle-switch[data-role="${roleKey}"][data-key="${permissionKey}"]`
    );

    if (toggledButton) {
      try {
        toggledButton.focus({ preventScroll: true });
      } catch (e) {
        toggledButton.focus();
      }
    }
  });
}

function toggleAllPermissionsForRole(roleKey) {
  if (!permissionsDraft[roleKey]) {
    permissionsDraft[roleKey] = {};
  }

  const currentValues = PERMISSION_KEYS.map(item => permissionsDraft[roleKey][item.key] === true);
  const shouldEnableAll = currentValues.some(value => value === false);

  PERMISSION_KEYS.forEach(item => {
    permissionsDraft[roleKey][item.key] = shouldEnableAll;
  });

  renderPermissionsRolePanel(roleKey);
}

async function savePermissions() {
  if (!currentUser || currentUser.role !== 'admin') {
    showAlert('ليس لديك صلاحية لحفظ الصلاحيات');
    return;
  }

  const saveBtn = document.querySelector('#permissionsModal .settings-save');

  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.75';
      saveBtn.style.cursor = 'not-allowed';
      saveBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
       ${permissionsModalText('جاري حفظ الصلاحيات...', 'Saving permissions...')}
      `;
    }

    const rowsToSave = [];

    EASYQ_PERMISSION_ROLES.forEach(role => {
      PERMISSION_KEYS.forEach(permission => {
        rowsToSave.push({
          role: role.key,
          permission_key: permission.key,
          is_enabled: permissionsDraft?.[role.key]?.[permission.key] === true
        });
      });
    });

    const { error } = await supabase
      .from('role_permissions')
      .upsert(rowsToSave, {
        onConflict: 'role,permission_key'
      });

    if (error) throw error;

    await loadUserPermissions();

    showSuccessNotification(permissionsModalText(
  'تم حفظ الصلاحيات بنجاح',
  'Permissions saved successfully'
));
    closePermissionsModal();

  } catch (error) {
    console.error('❌ فشل حفظ الصلاحيات:', error);
    showAlert(permissionsModalText(
  'فشل حفظ الصلاحيات: ',
  'Failed to save permissions: '
) + error.message);

  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
    saveBtn.innerHTML = originalBtnHtml || `
  <i class="fas fa-save"></i>
  ${permissionsModalText('حفظ الصلاحيات', 'Save Permissions')}
`;
    }
  }
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

        <button type="button" id="superAdminSupportReplyBtn" style="
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
bindSuperAdminSupportControls();

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

  bindSuperAdminSupportControls();

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

            <button type="button" id="superAdminVerifySupportCodeBtn" style="
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

function bindSuperAdminSupportControls() {
  const replyBtn = document.getElementById('superAdminSupportReplyBtn');

  if (replyBtn && replyBtn.dataset.bound !== 'true') {
    replyBtn.dataset.bound = 'true';

    replyBtn.addEventListener('click', async function (event) {
      event.preventDefault();
      await sendSuperAdminSupportReply();
    });
  }

  const replyInput = document.getElementById('supportReplyInput');

  if (replyInput && replyInput.dataset.bound !== 'true') {
    replyInput.dataset.bound = 'true';

    replyInput.addEventListener('keydown', async function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        await sendSuperAdminSupportReply();
      }
    });
  }

  const verifyCodeBtn = document.getElementById('superAdminVerifySupportCodeBtn');

  if (verifyCodeBtn && verifyCodeBtn.dataset.bound !== 'true') {
    verifyCodeBtn.dataset.bound = 'true';

    verifyCodeBtn.addEventListener('click', async function (event) {
      event.preventDefault();
      await verifySuperAdminSupportCodeFromUI();
    });
  }
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

    container.innerHTML = renderSuperAdminSupportSessionsCardsHtml(sessions);
    bindSuperAdminSupportSessionCards(container);

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
    const safeMessageBody = businessSupportEscapeHtml(msg.message_body || '');

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
            white-space: pre-wrap;
            word-break: break-word;
          ">
            ${safeMessageBody}
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

    const safeTimeText = businessSupportEscapeHtml(timeText);

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
          ">${safeMessageBody}</span>

          <span style="
            display: block;
            align-self: flex-end;
            font-size: 8.5px;
            line-height: 1;
            margin-top: 3px;
            opacity: 0.55;
            color: ${isSuperAdmin ? 'rgba(255,255,255,0.72)' : '#6B7280'};
          ">${safeTimeText}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function openSuperAdminSupportSession(sessionId) {
  try {
    const safeSessionIdValue = String(sessionId || '').trim();

    if (!safeSessionIdValue) {
      alert('لم يتم تحديد جلسة الدعم');
      return;
    }

    currentSupportSessionId = safeSessionIdValue;

    try {
      await supabase.rpc('mark_support_session_read', {
        p_session_id: safeSessionIdValue
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
    const session = sessions.find(item => item.session_id === safeSessionIdValue);

    if (header && session) {
      const statusMeta = superAdminSupportGetStatusMeta(session.status);
      const safeBusinessName = businessSupportEscapeHtml(session.business_name || '-');
      const safeSubject = businessSupportEscapeHtml(session.subject || 'طلب دعم');
      const safeStatusLabel = businessSupportEscapeHtml(statusMeta.label);
      const closeControl = renderSuperAdminSupportCloseControl(session);

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
              ${safeBusinessName}
            </div>
            <div style="font-size:12px; color:#6B7280; margin-top:4px;">
              ${safeSubject} · ${safeStatusLabel}
            </div>
          </div>

          ${closeControl}
        </div>
      `;

      bindSuperAdminSupportHeaderButtons(header);
    }

    const replyInput = document.getElementById('supportReplyInput');
    const replyButton = document.getElementById('superAdminSupportReplyBtn');

    if (session?.status === 'closed') {
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
        p_session_id: safeSessionIdValue
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
    } else {
      messagesContainer.innerHTML = renderSuperAdminSupportMessagesHtml(messages);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    await refreshSuperAdminSupportSessionsListSilently();

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
  const safeSessionIdValue = String(sessionId || '').trim();

  if (!safeSessionIdValue) return;
  if (currentUser?.role !== 'super_admin') return;

  const header = document.getElementById('supportChatHeader');
  const messagesContainer = document.getElementById('supportMessagesList');
  const replyInput = document.getElementById('supportReplyInput');
  const replyButton = document.getElementById('superAdminSupportReplyBtn');

  if (!messagesContainer) return;

  const { data: sessionsData, error: sessionsError } = await supabase
    .rpc('super_admin_list_support_sessions');

  if (sessionsError) {
    console.warn('تعذر تحديث حالة جلسة الدعم للسوبر أدمن صامتًا:', sessionsError);
    return;
  }

  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  const session = sessions.find(item => item.session_id === safeSessionIdValue);

  if (!session) return;

  const statusMeta = superAdminSupportGetStatusMeta(session.status);
  const safeBusinessName = businessSupportEscapeHtml(session.business_name || '-');
  const safeSubject = businessSupportEscapeHtml(session.subject || 'طلب دعم');
  const safeStatusLabel = businessSupportEscapeHtml(statusMeta.label);
  const closeControl = renderSuperAdminSupportCloseControl(session);

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
            ${safeBusinessName}
          </div>
          <div style="font-size:12px; color:#6B7280; margin-top:4px;">
            ${safeSubject} · ${safeStatusLabel}
          </div>
        </div>

        ${closeControl}
      </div>
    `;

    bindSuperAdminSupportHeaderButtons(header);
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
      p_session_id: safeSessionIdValue
    });
  } catch (readErr) {
    console.warn('تعذر تعليم رسائل المطعم كمقروءة أثناء تحديث السوبر أدمن:', readErr);
  }

  const { data: messagesData, error: messagesError } = await supabase
    .rpc('get_support_session_messages', {
      p_session_id: safeSessionIdValue
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
      subject: session.subject,
      business_name: session.business_name,
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

  container.innerHTML = renderSuperAdminSupportSessionsCardsHtml(sessions);
  bindSuperAdminSupportSessionCards(container);
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
  const loggingOutUser = currentUser ? { ...currentUser } : null;

  if (
    loggingOutUser &&
    loggingOutUser.role !== 'super_admin' &&
    !document.body.classList.contains('super-admin-mode')
  ) {
    await logBusinessActivitySafe(
      'user_logged_out',
      'تسجيل خروج',
      'app_user',
      loggingOutUser.id,
      loggingOutUser.display_name || loggingOutUser.username || 'مستخدم',
      {
        username: loggingOutUser.username || '',
        logout_method: 'manual'
      }
    );
  }

  await supabase.auth.signOut();

  if (window.subscriptionRefreshInterval) {
    clearInterval(window.subscriptionRefreshInterval);
    window.subscriptionRefreshInterval = null;
  }

  if (typeof stopCurrentUserProfileAutoRefresh === 'function') {
    stopCurrentUserProfileAutoRefresh();
  }

  currentUser = null;

  localStorage.removeItem('easyq_user');
  localStorage.removeItem('easyq_license_status');

  settings = {
    ready_mode: 'any_match',
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
  const rememberCheckbox = document.getElementById('rememberLogin');

  const rememberedEmail =
    typeof getRememberedLoginEmail === 'function'
      ? getRememberedLoginEmail()
      : '';

  if (usernameInput) {
    usernameInput.value = rememberedEmail || '';
  }

  if (passwordInput) {
    passwordInput.value = '';
  }

  if (rememberCheckbox) {
    rememberCheckbox.checked = !!rememberedEmail;
  }

  if (typeof setLoginLoading === 'function') {
    setLoginLoading(false);
  }

  const loginError = document.getElementById('loginError');
  if (loginError) {
    loginError.classList.remove('show');
    loginError.style.display = 'none';
  }

  document.body.classList.remove('logged-in');
  document.body.classList.remove('super-admin-mode');

  showSuccessNotification('تم تسجيل الخروج بنجاح');
}

// تحديث صلاحيات المستخدم تلقائيًا بدون تحديث الصفحة
let permissionsRefreshInterval = null;

function startPermissionsAutoRefresh() {
  if (permissionsRefreshInterval) return;

  permissionsRefreshInterval = setInterval(() => {
    refreshCurrentUserPermissions();
  }, 60000);

  window.addEventListener('focus', () => {
    refreshCurrentUserPermissions();
  });
}

startPermissionsAutoRefresh();