// ============================================================
// SUPABASE CLIENT CONFIGURATION
// ============================================================

const SUPABASE_URL = 'https://zjdfadkonftkgljvzxoy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZGZhZGtvbmZ0a2dsanZ6eG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTQ3NTQsImV4cCI6MjA4ODMzMDc1NH0.XZaHGtz3PdBh08m2P9ZM7Xsg3tCG4nskzsoc3wPT-_Q';
let BUSINESS_ID = null;

// تعريف Supabase Client - جعله عاماً
if (typeof window._supabaseClient === 'undefined') {
    window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
var supabase = window._supabaseClient;

function setCurrentBusinessId(businessId) {
    BUSINESS_ID = businessId;
}

// ============================================================
// GLOBAL VARIABLES - جعلها عامة باستخدام window
// ============================================================

window.editModeActive = false;
window.currentFloor = 1;
window.pendingPositionUpdates = {};
window.moveModeActive = false;
window.selectedTableForMove = null;

window.tableEditMode = false;
window.tableDeleteMode = false;
window.selectedTableId = null;
window.currentPartySize = 2;
window.currentEditingRequest = null;
window.currentEditPartySize = 2;

window.floorData = [];
window.waitingData = [];
window.expiredData = [];
window.settings = {};
window.settingsDraft = {};

window.selectedRequestId = null;
window.selectedPartySize = null;
window.currentZone = "all";
window.draggedRequestId = null;
window.draggedPartySize = null;
window.modalTable = null;

window.readyAlerted = new Set();
window.expiredAlerted = new Set();

window.globalActiveFloors = ['1', '2', '3'];
window.globalActiveZones = ['Indoor', 'Outdoor', 'VIP', 'Family', 'Smoking'];

window.occupiedTimers = {};
window.cleaningTimers = {};
window.reservationTimers = {};

window.currentUser = null;
window.userPermissions = {};

window.supabaseChannel = null;

// Current Language
window.currentLang = (() => {
    const saved = localStorage.getItem("hajzak_lang");
    if (saved === "ar") return "ar";
    return "en";
})();

// إنشاء متغيرات محلية تشير إلى العامة (لتوافق الكود القديم)
var editModeActive = window.editModeActive;
var currentFloor = window.currentFloor;
var pendingPositionUpdates = window.pendingPositionUpdates;
var moveModeActive = window.moveModeActive;
var selectedTableForMove = window.selectedTableForMove;
var tableEditMode = window.tableEditMode;
var tableDeleteMode = window.tableDeleteMode;
var selectedTableId = window.selectedTableId;
var currentPartySize = window.currentPartySize;
var currentEditingRequest = window.currentEditingRequest;
var currentEditPartySize = window.currentEditPartySize;
var floorData = window.floorData;
var waitingData = window.waitingData;
var expiredData = window.expiredData;
var settings = window.settings;
var settingsDraft = window.settingsDraft;
var selectedRequestId = window.selectedRequestId;
var selectedPartySize = window.selectedPartySize;
var currentZone = window.currentZone;
var draggedRequestId = window.draggedRequestId;
var draggedPartySize = window.draggedPartySize;
var modalTable = window.modalTable;
var readyAlerted = window.readyAlerted;
var expiredAlerted = window.expiredAlerted;
var globalActiveFloors = window.globalActiveFloors;
var globalActiveZones = window.globalActiveZones;
var occupiedTimers = window.occupiedTimers;
var cleaningTimers = window.cleaningTimers;
var reservationTimers = window.reservationTimers;
var currentUser = window.currentUser;
var userPermissions = window.userPermissions;
var supabaseChannel = window.supabaseChannel;
var currentLang = window.currentLang;

// ============================================================
// CONSTANTS
// ============================================================

const PERMISSION_KEYS = [
    // الطاولات
    { key: 'manage_tables', ar: 'إدارة الطاولات', en: 'Manage Tables' },
    { key: 'add_tables', ar: 'إضافة طاولات', en: 'Add Tables' },
    { key: 'edit_tables', ar: 'تعديل الطاولات', en: 'Edit Tables' },
    { key: 'delete_tables', ar: 'حذف الطاولات', en: 'Delete Tables' },
    { key: 'move_tables', ar: 'تحريك الطاولات', en: 'Move Tables' },

    // الطابور والعملاء
    { key: 'manage_queue', ar: 'إدارة الطابور', en: 'Manage Queue' },
    { key: 'add_walkin', ar: 'إضافة عميل داخلي', en: 'Add Walk-in Customer' },
    { key: 'edit_requests', ar: 'تعديل طلبات العملاء', en: 'Edit Customer Requests' },
    { key: 'assign_tables', ar: 'تعيين العملاء على الطاولات', en: 'Assign Tables' },

    // الإدارة
    { key: 'manage_users', ar: 'إدارة الموظفين', en: 'Manage Staff' },
    { key: 'manage_zones', ar: 'إدارة المناطق', en: 'Manage Zones' },
    { key: 'manage_floors', ar: 'إدارة الطوابق', en: 'Manage Floors' },
    { key: 'manage_settings', ar: 'إدارة الإعدادات العامة', en: 'Manage Settings' },
    { key: 'manage_timers', ar: 'إدارة المؤقتات', en: 'Manage Timers' },
    { key: 'manage_alerts', ar: 'إدارة التنبيهات', en: 'Manage Alerts' },

    // بيانات الفرع وواجهة الحجز
    { key: 'manage_business_profile', ar: 'إعداد بيانات المطعم / الفرع', en: 'Manage Business Profile' },
    { key: 'manage_booking_page', ar: 'إعدادات واجهة الحجز', en: 'Manage Booking Page' },
    { key: 'open_booking_qr', ar: 'فتح واجهة الحجز QR', en: 'Open Booking QR Page' },

    // الاشتراك والدعم
    { key: 'manage_subscription', ar: 'إدارة الحساب والاشتراكات', en: 'Manage Subscription' },
    { key: 'use_live_support', ar: 'استخدام الدعم الحي', en: 'Use Live Support' },

    // التقارير
    { key: 'view_reports', ar: 'عرض التقارير', en: 'View Reports' }
];

const DEFAULT_ZONES = [
    { id: 'Indoor', nameAr: 'داخلي', nameEn: 'Indoor' },
    { id: 'Outdoor', nameAr: 'خارجي', nameEn: 'Outdoor' },
    { id: 'VIP', nameAr: 'VIP', nameEn: 'VIP' },
    { id: 'Family', nameAr: 'عائلي', nameEn: 'Family' },
    { id: 'Smoking', nameAr: 'مدخنين', nameEn: 'Smoking' }
];

const DEFAULT_FLOORS = [
    { id: '1', nameAr: 'أرضي', nameEn: 'Ground' },
    { id: '2', nameAr: 'أول', nameEn: 'First' },
    { id: '3', nameAr: 'ثاني', nameEn: 'Second' }
];

const ZONE_NAMES = {
    'Indoor': { ar: 'داخلي', en: 'Indoor', icon: '🍽️' },
    'Outdoor': { ar: 'خارجي', en: 'Outdoor', icon: '🌿' },
    'VIP': { ar: 'VIP', en: 'VIP', icon: '👑' },
    'Family': { ar: 'عائلي', en: 'Family', icon: '👨‍👩‍👧‍👦' },
    'Smoking': { ar: 'مدخنين', en: 'Smoking', icon: '🚬' }
};

const FLOOR_NAMES = {
    '1': { ar: 'أرضي', en: 'Ground', icon: '🏠' },
    '2': { ar: 'أول', en: 'First', icon: '🔼' },
    '3': { ar: 'ثاني', en: 'Second', icon: '🔽' }
};



console.log("✅ config.js loaded, supabase.from =", typeof supabase.from);