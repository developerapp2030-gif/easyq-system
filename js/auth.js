

// ============================================================
// LOGIN SYSTEM 11
// ============================================================

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
  // إخفاء العناصر العادية
  const appContainer = document.querySelector('.app-container');
  const topbar = document.querySelector('.topbar');
  if (appContainer) appContainer.style.display = 'none';
  if (topbar) topbar.style.display = 'none';
  
  // إزالة أي داشبورد موجود مسبقاً
  const existingDashboard = document.getElementById('superAdminDashboard');
  if (existingDashboard) existingDashboard.remove();
  
  // إنشاء لوحة التحكم
  const dashboardHtml = `
    <div id="superAdminDashboard" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--gray-100); z-index: 10000; overflow-y: auto;">
      <div style="background: var(--primary); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="color: white; margin: 0;"><i class="fas fa-crown"></i> لوحة تحكم المدير العام</h2>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">مرحباً ${currentUser?.display_name || 'Super Admin'}</p>
        </div>
        <button onclick="logoutAndClean()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 10px 20px; border-radius: 10px; cursor: pointer;">
          <i class="fas fa-sign-out-alt"></i> تسجيل خروج
        </button>
      </div>
      
      <div style="padding: 24px;">
        <!-- الإحصائيات -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          <div style="background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <i class="fas fa-store" style="font-size: 40px; color: var(--primary);"></i>
            <h3 id="totalBusinesses">0</h3>
            <p style="color: var(--gray-500);">إجمالي المطاعم</p>
          </div>
          <div style="background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <i class="fas fa-users" style="font-size: 40px; color: var(--primary);"></i>
            <h3 id="totalUsers">0</h3>
            <p style="color: var(--gray-500);">إجمالي المستخدمين</p>
          </div>
          <div style="background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <i class="fas fa-check-circle" style="font-size: 40px; color: #10B981;"></i>
            <h3 id="activeLicenses">0</h3>
            <p style="color: var(--gray-500);">تراخيص نشطة</p>
          </div>
          <div style="background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <i class="fas fa-clock" style="font-size: 40px; color: #F59E0B;"></i>
            <h3 id="expiringSoon">0</h3>
            <p style="color: var(--gray-500);">تنتهي خلال 7 أيام</p>
          </div>
        </div>
        
        <!-- جدول المطاعم -->
        <div style="background: white; border-radius: 16px; overflow-x: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: var(--primary); color: white;">
              <tr>
                <th style="padding: 12px;">#</th>
                <th style="padding: 12px;">اسم المطعم</th>
                <th style="padding: 12px;">رقم الجوال</th>
                <th style="padding: 12px;">الخطة</th>
                <th style="padding: 12px;">تاريخ الانتهاء</th>
                <th style="padding: 12px;">المستخدمين</th>
                <th style="padding: 12px;">الحالة</th>
                <th style="padding: 12px;">إجراءات</th>
              </tr>
            </thead>
            <tbody id="businessesTable">
              <tr><td colspan="8" style="text-align: center; padding: 40px;">جاري التحميل...</td></tr>
            </tbody>
           </table>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', dashboardHtml);
  
  // تحميل البيانات
  loadSuperAdminData();
}

async function loadSuperAdminData() {
  try {
    // جلب جميع المطاعم مع التراخيص وعدد المستخدمين
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        *,
        licenses (plan_type, expires_at, is_active),
        app_users (count)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // تحديث الإحصائيات
    const totalBusinesses = businesses.length;
    let totalUsers = 0;
    let activeLicenses = 0;
    let expiringSoon = 0;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    businesses.forEach(b => {
      if (b.app_users && b.app_users.length) {
        totalUsers += b.app_users.length;
      }
      if (b.licenses && b.licenses.is_active) {
        activeLicenses++;
        if (new Date(b.licenses.expires_at) <= sevenDaysFromNow) {
          expiringSoon++;
        }
      }
    });
    
    const totalBusinessesEl = document.getElementById('totalBusinesses');
    const totalUsersEl = document.getElementById('totalUsers');
    const activeLicensesEl = document.getElementById('activeLicenses');
    const expiringSoonEl = document.getElementById('expiringSoon');
    
    if (totalBusinessesEl) totalBusinessesEl.innerText = totalBusinesses;
    if (totalUsersEl) totalUsersEl.innerText = totalUsers;
    if (activeLicensesEl) activeLicensesEl.innerText = activeLicenses;
    if (expiringSoonEl) expiringSoonEl.innerText = expiringSoon;
    
    // عرض الجدول
    const tableBody = document.getElementById('businessesTable');
    if (!tableBody) return;
    
    if (businesses.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">لا توجد مطاعم مسجلة بعد</td></tr>';
      return;
    }
    
    tableBody.innerHTML = businesses.map((b, index) => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 12px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; font-weight: 500;">${b.name || '-'}</td>
        <td style="padding: 12px;">${b.phone || '-'}</td>
        <td style="padding: 12px;">
          <span style="background: ${b.licenses?.plan_type === 'enterprise' ? '#8B5CF6' : b.licenses?.plan_type === 'pro' ? '#3B82F6' : '#10B981'}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
            ${b.licenses?.plan_type || 'بدون'}
          </span>
        </td>
        <td style="padding: 12px;">${b.licenses?.expires_at ? new Date(b.licenses.expires_at).toLocaleDateString('ar-EG') : '-'}</td>
        <td style="padding: 12px; text-align: center;">${b.app_users?.length || 0}</td>
        <td style="padding: 12px;">
          <span style="background: ${b.licenses?.is_active ? '#10B981' : '#EF4444'}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
            ${b.licenses?.is_active ? 'نشط' : 'منتهي'}
          </span>
        </td>
        <td style="padding: 12px;">
          <button onclick="viewBusinessDetails('${b.id}')" style="background: var(--primary); color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; margin-left: 8px;">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="toggleBusinessStatus('${b.id}')" style="background: #F59E0B; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer;">
            <i class="fas fa-power-off"></i>
          </button>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error('خطأ في تحميل بيانات super admin:', err);
    const tableBody = document.getElementById('businessesTable');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: red;">فشل تحميل البيانات</td></tr>';
    }
  }
}

async function viewBusinessDetails(businessId) {
  // يمكن تطويرها لاحقاً لعرض تفاصيل كاملة عن المطعم
  alert(`سيتم عرض تفاصيل المطعم (قيد التطوير): ${businessId}`);
}

async function toggleBusinessStatus(businessId) {
  if (!confirm('هل أنت متأكد من تغيير حالة هذا المطعم؟')) return;
  
  // جلب الترخيص الحالي
  const { data: license, error: fetchError } = await supabase
    .from('licenses')
    .select('is_active')
    .eq('business_id', businessId)
    .maybeSingle();
  
  if (fetchError) {
    console.error('خطأ في جلب الترخيص:', fetchError);
    alert('فشل تغيير حالة المطعم');
    return;
  }
  
  if (license) {
    const { error } = await supabase
      .from('licenses')
      .update({ is_active: !license.is_active })
      .eq('business_id', businessId);
    
    if (error) {
      console.error('خطأ في تحديث الترخيص:', error);
      alert('فشل تغيير حالة المطعم');
    } else {
      alert('✅ تم تغيير حالة المطعم بنجاح');
      loadSuperAdminData(); // إعادة تحميل البيانات
    }
  } else {
    // إذا لم يكن هناك ترخيص، ننشئ ترخيصاً جديداً
    const { error } = await supabase
      .from('licenses')
      .insert({
        business_id: businessId,
        license_key: 'TRIAL-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        plan_type: 'trial',
        max_tables: 20,
        max_users: 5,
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      });
    
    if (error) {
      console.error('خطأ في إنشاء الترخيص:', error);
      alert('فشل إنشاء ترخيص جديد للمطعم');
    } else {
      alert('✅ تم إنشاء ترخيص جديد للمطعم');
      loadSuperAdminData();
    }
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