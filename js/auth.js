

// ============================================================
// LOGIN SYSTEM
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
    // 1. تسجيل الدخول عبر Supabase Auth (بدلاً من قراءة app_users مباشرة)
    // نحتاج إلى تحويل username إلى email, نفترض أن username هو نفس البريد
    const email = username; // أو يمكن أن يكون username@domain.com حسب نظامك
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (authError) {
      console.error("Auth error:", authError);
      if (errorEl) errorEl.classList.add('show');
      return;
    }
    
    // 2. جلب بيانات المستخدم من app_users باستخدام auth_id
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
    
    // 3. ضبط business_id في جلسة قاعدة البيانات (لـ RLS)
    await supabase.rpc('set_current_business_id', { 
        p_business_id: user.business_id 
    });
    
    // 4. تعيين BUSINESS_ID العام في Frontend
    if (typeof setCurrentBusinessId === 'function') {
        setCurrentBusinessId(user.business_id);
    }
    
    // 5. حفظ بيانات المستخدم
    currentUser = user;
    localStorage.setItem('easyq_user', JSON.stringify(user));
    
    // 6. إخفاء شاشة الدخول وإظهار النظام
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'none';
    document.body.classList.add('logged-in');
    
    // 7. تحميل الصلاحيات
    await loadUserPermissions();
    
    // 8. عرض اسم المستخدم في الواجهة
    const currentUserNameSpan = document.getElementById('currentUserName');
    if (currentUserNameSpan) currentUserNameSpan.innerText = user.display_name;
    
    // 9. رسالة ترحيب
    showSuccessNotification(`مرحباً ${user.display_name}`);
    
  } catch (err) {
    console.error("Login error:", err);
    if (errorEl) errorEl.classList.add('show');
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
        currentUser = validUser;
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
        document.body.classList.add('logged-in');
        await loadUserPermissions();
        const currentUserNameSpan = document.getElementById('currentUserName');
        if (currentUserNameSpan) currentUserNameSpan.innerText = validUser.display_name;
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
  const { data: users, error } = await supabase
    .from('app_users')
    .select('*')
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
  const username = document.getElementById('newUsername').value.trim();
  const displayName = document.getElementById('newDisplayName').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;
  
  if (!username || !displayName || !password) {
    showAlert('جميع الحقول مطلوبة');
    return;
  }
  
  const hashedPassword = await hashPassword(password);
  
  const { error } = await supabase
    .from('app_users')
    .insert({
      username,
      password_hash: hashedPassword,
      display_name: displayName,
      role,
      business_id: BUSINESS_ID
    });
  
  if (error) {
    showAlert('فشل إضافة المستخدم: ' + error.message);
    return;
  }
  
  showSuccessNotification('تم إضافة المستخدم بنجاح');
  cancelAddUser();
  loadUsers();
}

async function deleteUser(userId, username) {
  if (username === 'admin') {
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

function logoutAndClean() {
  currentUser = null;
  localStorage.removeItem('easyq_user');
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.style.display = 'flex';
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  document.body.classList.remove('logged-in');
}