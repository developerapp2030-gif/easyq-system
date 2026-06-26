// ============================================================
// EASY-Q BOOKING & QUEUE PAGE (Mobile First)
// ============================================================

// تعريف supabase مباشرة من window

// Global state
let currentRequestId = null;
let currentQueueNumber = null;
let currentPublicQueueText = "--";
let currentBusinessId = null;
let currentCustomerId = null;
let realtimeChannel = null;
let isGuestViewOnly = false;
let currentBusinessProfile = null;
let bookingPhoneInputInstance = null;
let restorePhoneInputInstance = null;
let pendingRestoredBooking = null;
// ============================================================
// إعدادات واجهة الحجز V2
// ============================================================

const EASYQ_BOOKING_SETTINGS_KEY = "booking_settings_v2";

const DEFAULT_EASYQ_BOOKING_SETTINGS = {
  welcome_message: "مرحباً بك، احجز دورك بسهولة وتابع حالة انتظارك مباشرة.",
  restore_hint_prefix: "إذا كان لديك حجز نشط",
  restore_hint_link: "اضغط هنا",
  restore_hint_suffix: "... ولحجز جديد املأ البيانات أدناه",
  current_queue_title: "الطابور الحالي",
  current_queue_sub: "يتم تحديث الرقم مباشرة",
  submit_button_text: "تأكيد الحجز",
  notification_button_text: "تفعيل إشعارات الدور",
  name_label_text: "الاسم",
  name_placeholder_text: "أدخل اسمك",
  phone_label_text: "رقم الجوال",
  phone_placeholder_text: "05xxxxxxxx",
  zone_label_text: "المنطقة",
  zone_no_preference_text: "بدون تفضيل",
  party_size_label_text: "عدد الأشخاص",
  name_required_alert_text: "الرجاء إدخال الاسم",
  phone_invalid_alert_text: "الرجاء إدخال رقم جوال صحيح (05xxxxxxxx)",
  checking_booking_text: "جاري التحقق...",
  creating_booking_text: "جاري الحجز...",
  booking_failed_text: "فشل الحجز:",

  share_hint_text: "شارك أصدقاءك ليتابعوا ويشاهدوا حجزك فقط، لن يتمكنوا من إلغاء الحجز.",
  guest_view_text: "يمكنك متابعة الحجز من هنا، والإلغاء متاح لصاحب الحجز فقط",
  reference_label_text: "رقم حجزك المرجعي:",
  reference_save_hint_text: "💡قم بحفظ رقم حجزك المرجعي لاستعراض صفحة انتظار حجزك من أي هاتف آخر أو في حال إغلاقها",
  cancel_waiting_text: "إلغاء الحجز",
  cannot_attend_title: "لا أستطيع الحضور",
  cannot_attend_sub: "اضغط هنا إذا لم تتمكن من الحضور، لتحرير الطاولة لعميل آخر.",
  exit_text: "خروج",

  share_booking_enabled: true,
  cancel_waiting_enabled: true,
  cannot_attend_enabled: true,
  show_current_queue: false,
  show_zone_selector: true,
  show_business_logo: true,
  show_business_info: true,
  show_restore_hint: true,
  show_reference_code: true,
  show_notification_button: true,

// الألوان
page_bg_start: "#0A0A0F",
page_bg_end: "#1A1A2A",
primary_color: "#8B0000",
primary_color_2: "#C62828",
accent_color: "#FFD700",
progress_color: "#D4AF37",
success_color: "#10B981",
text_color: "#FFFFFF",
muted_text_color: "rgba(255,255,255,0.65)",
card_bg_color: "rgba(255,255,255,0.05)",

welcome_bg_color: "rgba(255,255,255,0.08)",
welcome_text_color: "#FFFFFF",

restore_hint_bg_color: "rgba(255,255,255,0.05)",
restore_hint_text_color: "#FFFFFF",

booking_card_bg_color: "rgba(255,255,255,0.06)",
booking_card_text_color: "#FFFFFF",

button_text_color: "#FFFFFF"
};

let easyQBookingSettings = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };

// اللغة الافتراضية دائماً عربي عند فتح الصفحة
let bookingPageLang = "ar";

const EASYQ_BOOKING_EN_TEXTS = {
  welcome_message: "Welcome, book your turn easily and follow your waiting status live.",
  restore_hint_prefix: "If you already have an active booking",
  restore_hint_link: "click here",
  restore_hint_suffix: "... or fill the form below for a new booking",
  current_queue_title: "Current Queue",
  current_queue_sub: "The number updates live",
  submit_button_text: "Confirm Booking",
  notification_button_text: "Enable Turn Notifications",

  name_label_text: "Name",
  name_placeholder_text: "Enter your name",
  phone_label_text: "Mobile Number",
  phone_placeholder_text: "05xxxxxxxx",
  zone_label_text: "Area",
  zone_no_preference_text: "No preference",
  party_size_label_text: "Number of guests",

  name_required_alert_text: "Please enter your name",
  phone_invalid_alert_text: "Please enter a valid mobile number",
  checking_booking_text: "Checking...",
  creating_booking_text: "Booking...",
  booking_failed_text: "Booking failed:",

  status_page_title: "Booking Status",
  waiting_default_label: "Your waiting number",
  waiting_near_label: "Your turn is near",
  waiting_next_label: "You are next",
  ready_title_text: "It is your turn",
  table_ready_text: "Your table is ready",
  table_ready_with_number_text: "Your table {table} is ready",
  ready_sub_text: "Please arrive before the time expires",
  occupied_title_text: "Welcome, you have arrived",
  occupied_sub_text: "We are happy to have you",
  cleaning_title_text: "Thank you for your visit",
  cleaning_sub_text: "We hope to see you again soon",
  queue_status_waiting_text: "Thank you for your patience, your turn is moving forward",
  queue_status_offered_text: "We are waiting for you",

  share_hint_text: "Share this link so others can view your booking only. They cannot cancel it.",
  guest_view_text: "You can view the booking from here. Cancellation is only available to the booking owner.",
  reference_label_text: "Your booking reference:",
  reference_save_hint_text: "💡 Save your booking reference to view your waiting page from another phone or after closing the page",
  cancel_waiting_text: "Cancel Booking",
  cannot_attend_title: "I cannot attend",
  cannot_attend_sub: "Tap here if you cannot attend, so the table can be released for another guest.",
  exit_text: "Exit"
};

function bookingText(key) {
  if (bookingPageLang === "en" && EASYQ_BOOKING_EN_TEXTS[key]) {
    return EASYQ_BOOKING_EN_TEXTS[key];
  }

  return easyQBookingSettings?.[key] ?? DEFAULT_EASYQ_BOOKING_SETTINGS[key] ?? "";
}

function bookingEnabled(key) {
  return easyQBookingSettings?.[key] !== false;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeImageUrl(value) {
  const rawUrl = String(value ?? "").trim();

  if (!rawUrl) return "";

  try {
    const parsedUrl = new URL(rawUrl, window.location.origin);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "";
    }

    return escapeHtml(parsedUrl.href);
  } catch (err) {
    return "";
  }
}

function toggleBookingPageLanguage() {
  bookingPageLang = bookingPageLang === "ar" ? "en" : "ar";
  document.documentElement.lang = bookingPageLang;
  document.documentElement.dir = bookingPageLang === "ar" ? "rtl" : "ltr";

  if (currentRequestId) {
    renderStatusPage();
  } else {
    renderBookingForm();
  }
}

function initBookingPhoneInput() {
  const phoneInput = document.getElementById("customerPhone");

  if (!phoneInput || typeof window.intlTelInput !== "function") {
    return;
  }

  if (bookingPhoneInputInstance?.destroy) {
    bookingPhoneInputInstance.destroy();
  }

  const defaultCountry =
    typeof easyqGetDefaultPhoneCountry === "function"
      ? easyqGetDefaultPhoneCountry()
      : "sa";

  bookingPhoneInputInstance = window.intlTelInput(phoneInput, {
    initialCountry: defaultCountry,
    separateDialCode: false,
    nationalMode: true,
    autoPlaceholder: "off",
    strictMode: true,
    useFullscreenPopup: false
  });

  function updateBookingPhonePlaceholder() {
    const country = bookingPhoneInputInstance?.getSelectedCountryData?.();

    if (country?.iso2 === "sa") {
      phoneInput.placeholder =
        bookingPageLang === "en"
          ? "Enter 0512345678 or 512345678"
          : "اكتب 0512345678 أو 512345678";
    } else {
      phoneInput.placeholder =
        bookingPageLang === "en"
          ? "Enter number without country code"
          : "اكتب الرقم بدون مفتاح الدولة";
    }
  }

  updateBookingPhonePlaceholder();

  phoneInput.setAttribute("inputmode", "numeric");
  phoneInput.setAttribute("autocomplete", "tel");
  phoneInput.setAttribute("maxlength", "19");

  function formatBookingPhoneInput() {
    const country = bookingPhoneInputInstance?.getSelectedCountryData?.();
    let digits = phoneInput.value.replace(/\D/g, "");

    if (country?.iso2 === "sa") {
      if (digits.startsWith("00966")) {
        digits = digits.slice(5);
      }

      if (digits.startsWith("966")) {
        digits = digits.slice(3);
      }

      if (digits.startsWith("0")) {
        digits = digits.slice(0, 10);
      } else {
        digits = digits.slice(0, 9);
      }

      if (digits.startsWith("0")) {
        if (digits.length > 6) {
          phoneInput.value = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        } else if (digits.length > 3) {
          phoneInput.value = `${digits.slice(0, 3)} ${digits.slice(3)}`;
        } else {
          phoneInput.value = digits;
        }
      } else {
        if (digits.length > 6) {
          phoneInput.value = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        } else if (digits.length > 3) {
          phoneInput.value = `${digits.slice(0, 3)} ${digits.slice(3)}`;
        } else {
          phoneInput.value = digits;
        }
      }

      return;
    }

    digits = digits.slice(0, 15);
    phoneInput.value = digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }

  phoneInput.addEventListener("input", function () {
    formatBookingPhoneInput();

    const errorEl = document.getElementById("bookingPhoneInlineError");
    if (errorEl && errorEl.style.display !== "none") {
      const validation = validateAndNormalizeBookingPhone(phoneInput);

      if (validation.valid) {
        clearBookingPhoneError(phoneInput);
      }
    }
  });

  phoneInput.addEventListener("blur", function () {
    if (!phoneInput.value.trim()) {
      clearBookingPhoneError(phoneInput);
      return;
    }

    const validation = validateAndNormalizeBookingPhone(phoneInput);

    if (!validation.valid) {
      showBookingPhoneError(phoneInput, validation.message);
    } else {
      clearBookingPhoneError(phoneInput);
    }
  });

  phoneInput.addEventListener("countrychange", function () {
    phoneInput.value = "";
    clearBookingPhoneError(phoneInput);
    updateBookingPhonePlaceholder();
    phoneInput.setAttribute("maxlength", "19");
  });
}

function getBookingPhoneErrorMessage() {
  return bookingPageLang === "en"
    ? "Enter a valid mobile number, e.g. 0512345678 or 512345678"
    : "اكتب رقم جوال صحيح مثل 0512345678 أو 512345678";
}

function getBookingPhoneErrorEl(phoneInput) {
  let errorEl = document.getElementById("bookingPhoneInlineError");

  if (errorEl) {
    return errorEl;
  }

  errorEl = document.createElement("div");
  errorEl.id = "bookingPhoneInlineError";
  errorEl.setAttribute("role", "alert");

  errorEl.style.display = "none";
  errorEl.style.marginTop = "6px";
  errorEl.style.fontSize = "13px";
  errorEl.style.lineHeight = "1.5";
  errorEl.style.color = "#a40d02";
  errorEl.style.border = "none";
  errorEl.style.fontWeight = "700";
  errorEl.style.textShadow = "rgba(255, 255, 255, 0.88)";
  errorEl.style.borderRadius = "2px";
  errorEl.style.padding = "2px 2px";

  const inputWrapper = phoneInput?.closest(".iti") || phoneInput;

  if (inputWrapper?.insertAdjacentElement) {
    inputWrapper.insertAdjacentElement("afterend", errorEl);
  }

  return errorEl;
}

function showBookingPhoneError(phoneInput, message) {
  const errorEl = getBookingPhoneErrorEl(phoneInput);

  if (!errorEl) return;

  errorEl.textContent = message || getBookingPhoneErrorMessage();
  errorEl.style.display = "block";

  phoneInput?.setAttribute("aria-invalid", "true");
  phoneInput?.setAttribute("aria-describedby", "bookingPhoneInlineError");
}

function clearBookingPhoneError(phoneInput) {
  const errorEl = document.getElementById("bookingPhoneInlineError");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  phoneInput?.removeAttribute("aria-invalid");
  phoneInput?.removeAttribute("aria-describedby");
}

function validateAndNormalizeBookingPhone(phoneInput) {
  const rawPhone = phoneInput?.value?.trim() || "";
  const selectedCountry = bookingPhoneInputInstance?.getSelectedCountryData?.();

  const countryIso =
    selectedCountry?.iso2 ||
    (
      typeof easyqGetDefaultPhoneCountry === "function"
        ? easyqGetDefaultPhoneCountry()
        : "sa"
    );

  const dialCode =
    selectedCountry?.dialCode ||
    window.easyqPhoneSettings?.default_dial_code ||
    "966";

  let phoneDigits = rawPhone.replace(/\D/g, "");

  if (countryIso === "sa") {
    if (phoneDigits.startsWith("00966")) {
      phoneDigits = phoneDigits.slice(5);
    }

    if (phoneDigits.startsWith("966")) {
      phoneDigits = phoneDigits.slice(3);
    }

    phoneDigits = phoneDigits.replace(/^0+/, "");

    if (!/^5\d{8}$/.test(phoneDigits)) {
      return {
        valid: false,
        phone: "",
        digits: phoneDigits,
        message: getBookingPhoneErrorMessage()
      };
    }

    return {
      valid: true,
      phone: `+966${phoneDigits}`,
      digits: phoneDigits,
      message: ""
    };
  }

  if (!/^[0-9]{6,15}$/.test(phoneDigits)) {
    return {
      valid: false,
      phone: "",
      digits: phoneDigits,
      message: bookingPageLang === "en"
        ? "Enter a valid mobile number"
        : "رقم الجوال غير صحيح، تأكد من اختيار الدولة وكتابة الرقم بشكل صحيح"
    };
  }

  return {
    valid: true,
    phone: `+${dialCode}${phoneDigits}`,
    digits: phoneDigits,
    message: ""
  };
}

function getRestorePhoneErrorMessage() {
  return bookingPageLang === "en"
    ? "Enter a valid mobile number, e.g. 0512345678 or 512345678"
    : "اكتب رقم جوال صحيح مثل 0512345678 أو 512345678";
}

function getRestorePhoneErrorEl(phoneInput) {
  let errorEl = document.getElementById("restorePhoneInlineError");

  if (errorEl) {
    return errorEl;
  }

  errorEl = document.createElement("div");
  errorEl.id = "restorePhoneInlineError";
  errorEl.setAttribute("role", "alert");

  errorEl.style.display = "none";
  errorEl.style.marginTop = "6px";
  errorEl.style.fontSize = "13px";
  errorEl.style.lineHeight = "1.5";
  errorEl.style.color = "#b42318";
  errorEl.style.border = "none";
  errorEl.style.fontWeight = "700";
  errorEl.style.textShadow = "none";
  errorEl.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  errorEl.style.borderRadius = "8px";
  errorEl.style.padding = "7px 10px";

  const inputWrapper = phoneInput?.closest(".iti") || phoneInput;

  if (inputWrapper?.insertAdjacentElement) {
    inputWrapper.insertAdjacentElement("afterend", errorEl);
  }

  return errorEl;
}

function showRestorePhoneError(phoneInput, message) {
  const errorEl = getRestorePhoneErrorEl(phoneInput);

  if (!errorEl) return;

  errorEl.textContent = message || getRestorePhoneErrorMessage();
  errorEl.style.display = "block";

  phoneInput?.setAttribute("aria-invalid", "true");
  phoneInput?.setAttribute("aria-describedby", "restorePhoneInlineError");
}

function clearRestorePhoneError(phoneInput) {
  const errorEl = document.getElementById("restorePhoneInlineError");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  phoneInput?.removeAttribute("aria-invalid");
  phoneInput?.removeAttribute("aria-describedby");
}

function getRestorePhoneCountryHintEl(phoneInput) {
  let hintEl = document.getElementById("restorePhoneCountryHint");

  if (hintEl) {
    return hintEl;
  }

  hintEl = document.createElement("div");
  hintEl.id = "restorePhoneCountryHint";

  hintEl.style.display = "none";
  hintEl.style.marginTop = "6px";
  hintEl.style.fontSize = "12px";
  hintEl.style.lineHeight = "1.5";
  hintEl.style.color = "rgba(255, 255, 255, 0.9)";
  hintEl.style.background = "rgba(255, 255, 255, 0.12)";
  hintEl.style.border = "none";
  hintEl.style.borderRadius = "8px";
  hintEl.style.padding = "6px 10px";

  const inputWrapper = phoneInput?.closest(".iti") || phoneInput;

  if (inputWrapper?.insertAdjacentElement) {
    inputWrapper.insertAdjacentElement("afterend", hintEl);
  }

  return hintEl;
}

function updateRestorePhoneCountryHint(phoneInput) {
  const hintEl = getRestorePhoneCountryHintEl(phoneInput);
  const country = restorePhoneInputInstance?.getSelectedCountryData?.();

  if (!hintEl || !country) return;

  if (country.iso2 === "sa") {
    hintEl.textContent = "";
    hintEl.style.display = "none";
    return;
  }

  hintEl.textContent =
    bookingPageLang === "en"
      ? `Selected country code: +${country.dialCode}`
      : `مفتاح الدولة المحدد: +${country.dialCode}`;

  hintEl.style.display = "block";
}

function validateAndNormalizeRestorePhone(phoneInput) {
  const rawPhone = phoneInput?.value?.trim() || "";
  const selectedCountry = restorePhoneInputInstance?.getSelectedCountryData?.();

  const countryIso =
    selectedCountry?.iso2 ||
    (
      typeof easyqGetDefaultPhoneCountry === "function"
        ? easyqGetDefaultPhoneCountry()
        : "sa"
    );

  const dialCode =
    selectedCountry?.dialCode ||
    window.easyqPhoneSettings?.default_dial_code ||
    "966";

  let phoneDigits = rawPhone.replace(/\D/g, "");

  if (countryIso === "sa") {
    if (phoneDigits.startsWith("00966")) {
      phoneDigits = phoneDigits.slice(5);
    }

    if (phoneDigits.startsWith("966")) {
      phoneDigits = phoneDigits.slice(3);
    }

    phoneDigits = phoneDigits.replace(/^0+/, "");

    if (!/^5\d{8}$/.test(phoneDigits)) {
      return {
        valid: false,
        phone: "",
        digits: phoneDigits,
        message: getRestorePhoneErrorMessage()
      };
    }

    return {
      valid: true,
      phone: `+966${phoneDigits}`,
      digits: phoneDigits,
      message: ""
    };
  }

  if (!/^[0-9]{6,15}$/.test(phoneDigits)) {
    return {
      valid: false,
      phone: "",
      digits: phoneDigits,
      message: bookingPageLang === "en"
        ? "Enter a valid mobile number"
        : "رقم الجوال غير صحيح، تأكد من اختيار الدولة وكتابة الرقم بشكل صحيح"
    };
  }

  return {
    valid: true,
    phone: `+${dialCode}${phoneDigits}`,
    digits: phoneDigits,
    message: ""
  };
}

function initRestorePhoneInput() {
  const phoneInput = document.getElementById("restorePhone");

  if (!phoneInput || typeof window.intlTelInput !== "function") {
    return;
  }

  if (restorePhoneInputInstance?.destroy) {
    restorePhoneInputInstance.destroy();
  }

  const defaultCountry =
    typeof easyqGetDefaultPhoneCountry === "function"
      ? easyqGetDefaultPhoneCountry()
      : "sa";

  restorePhoneInputInstance = window.intlTelInput(phoneInput, {
    initialCountry: defaultCountry,
    separateDialCode: false,
    nationalMode: true,
    autoPlaceholder: "off",
    strictMode: true,
    useFullscreenPopup: false
  });

  function updateRestorePhonePlaceholder() {
    const country = restorePhoneInputInstance?.getSelectedCountryData?.();

    if (country?.iso2 === "sa") {
      phoneInput.placeholder =
        bookingPageLang === "en"
          ? "Enter 0512345678 or 512345678"
          : "اكتب 0512345678 أو 512345678";
    } else {
      phoneInput.placeholder =
        bookingPageLang === "en"
          ? "Enter number without country code"
          : "اكتب الرقم بدون مفتاح الدولة";
    }
  }

  function formatRestorePhoneInput() {
    const country = restorePhoneInputInstance?.getSelectedCountryData?.();
    let digits = phoneInput.value.replace(/\D/g, "");

    if (country?.iso2 === "sa") {
      if (digits.startsWith("00966")) {
        digits = digits.slice(5);
      }

      if (digits.startsWith("966")) {
        digits = digits.slice(3);
      }

      if (digits.startsWith("0")) {
        digits = digits.slice(0, 10);
      } else {
        digits = digits.slice(0, 9);
      }

      if (digits.length > 6) {
        phoneInput.value = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
      } else if (digits.length > 3) {
        phoneInput.value = `${digits.slice(0, 3)} ${digits.slice(3)}`;
      } else {
        phoneInput.value = digits;
      }

      return;
    }

    digits = digits.slice(0, 15);
    phoneInput.value = digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }

  updateRestorePhonePlaceholder();
  updateRestorePhoneCountryHint(phoneInput);

  phoneInput.setAttribute("inputmode", "numeric");
  phoneInput.setAttribute("autocomplete", "tel");
  phoneInput.setAttribute("maxlength", "19");

  phoneInput.addEventListener("input", function () {
    formatRestorePhoneInput();

    const errorEl = document.getElementById("restorePhoneInlineError");
    if (errorEl && errorEl.style.display !== "none") {
      const validation = validateAndNormalizeRestorePhone(phoneInput);

      if (validation.valid) {
        clearRestorePhoneError(phoneInput);
      }
    }
  });

  phoneInput.addEventListener("blur", function () {
    if (!phoneInput.value.trim()) {
      clearRestorePhoneError(phoneInput);
      return;
    }

    const validation = validateAndNormalizeRestorePhone(phoneInput);

    if (!validation.valid) {
      showRestorePhoneError(phoneInput, validation.message);
    } else {
      clearRestorePhoneError(phoneInput);
    }
  });

  phoneInput.addEventListener("countrychange", function () {
    phoneInput.value = "";
    clearRestorePhoneError(phoneInput);
    updateRestorePhonePlaceholder();
    updateRestorePhoneCountryHint(phoneInput);
    phoneInput.setAttribute("maxlength", "19");
  });
}

function getRestoreViewButtonDefaultText() {
  return bookingPageLang === "en" ? "View Booking" : "عرض الحجز";
}

function getRestoreContinueButtonText() {
  return bookingPageLang === "en" ? "Continue to Queue" : "متابعة الطابور";
}

function resetRestoreBookingPreview(clearStoredBooking = true) {
  const previewEl = document.getElementById("restoreBookingPreview");
  const viewBtn = document.getElementById("restoreViewBtn");

  if (clearStoredBooking) {
    pendingRestoredBooking = null;
  }

  if (previewEl) {
    previewEl.innerHTML = "";
    previewEl.style.display = "none";
  }

  if (viewBtn) {
    viewBtn.innerText = getRestoreViewButtonDefaultText();
  }
}

function renderRestoreBookingPreview(booking) {
  const previewEl = document.getElementById("restoreBookingPreview");
  const viewBtn = document.getElementById("restoreViewBtn");

  if (!previewEl || !booking) return;

  const customerName =
    booking.customer_name ||
    booking.customer_name_snapshot ||
    (bookingPageLang === "en" ? "Guest" : "ضيف");

  const queueNumber =
    booking.queue_position ||
    booking.original_queue_position ||
    "--";

  const restoreStatus = booking.status || "waiting";

  const restoreStatusLabels = bookingPageLang === "en"
    ? {
        waiting: "Waiting",
        restored: "Restored",
        offered: "Offered",
        reserved: "Reserved",
        occupied: "Seated",
        cleaning: "Cleaning"
      }
    : {
        waiting: "انتظار",
        restored: "مسترجع",
        offered: "معروض",
        reserved: "محجوز",
        occupied: "جالس",
        cleaning: "تنظيف"
      };

  const statusLabel = restoreStatusLabels[restoreStatus] || restoreStatus;

  previewEl.innerHTML = `
    <div class="restore-preview-found">
      <div class="restore-preview-icon">✓</div>
      <div class="restore-preview-content">
        <div class="restore-preview-title">
          ${bookingPageLang === "en" ? "Booking found" : "تم العثور على الحجز"}
        </div>

        <div class="restore-preview-row">
          <span>${bookingPageLang === "en" ? "Name" : "الاسم"}</span>
          <strong>${escapeHtml(customerName)}</strong>
        </div>

        <div class="restore-preview-row">
          <span>${bookingPageLang === "en" ? "Queue number" : "رقمك في الطابور"}</span>
          <strong>${escapeHtml(String(queueNumber))}</strong>
        </div>

        <div class="restore-preview-row">
          <span>${bookingPageLang === "en" ? "Status" : "الحالة"}</span>
          <strong>${escapeHtml(statusLabel)}</strong>
        </div>
      </div>
    </div>
  `;

  previewEl.style.display = "block";

  if (viewBtn) {
    viewBtn.innerText = getRestoreContinueButtonText();
  }
}

async function continueRestoredBooking() {
  if (!pendingRestoredBooking?.id) {
    return;
  }

  const booking = pendingRestoredBooking;

  currentRequestId = booking.id;
  currentQueueNumber = booking.queue_position;

  localStorage.setItem("current_booking_id", currentRequestId);
  sessionStorage.setItem("booking_cancelled", "false");

  closeRestoreModal();

  await renderStatusPage(booking);
  setupRealtime();
  startCustomerSafetyPolling();
  showAudioModal();
}

function bindRestorePreviewResetEvents() {
  const codeInput = document.getElementById("restoreCode");
  const phoneInput = document.getElementById("restorePhone");

  if (codeInput && codeInput.dataset.restorePreviewResetBound !== "true") {
    codeInput.dataset.restorePreviewResetBound = "true";

    codeInput.addEventListener("input", function () {
      resetRestoreBookingPreview(true);
    });
  }

  if (phoneInput && phoneInput.dataset.restorePreviewResetBound !== "true") {
    phoneInput.dataset.restorePreviewResetBound = "true";

    phoneInput.addEventListener("input", function () {
      resetRestoreBookingPreview(true);
    });

    phoneInput.addEventListener("countrychange", function () {
      resetRestoreBookingPreview(true);
    });
  }
}

function getBookingZoneLabel(zone) {
  const arZoneLabels = {
    Indoor: "داخلي",
    Outdoor: "خارجي",
    VIP: "VIP",
    Family: "عائلي",
    Smoking: "مدخنين",
    General: "عام"
  };

  const enZoneLabels = {
    Indoor: "Indoor",
    Outdoor: "Outdoor",
    VIP: "VIP",
    Family: "Family",
    Smoking: "Smoking",
    General: "General"
  };

  if (bookingPageLang === "en") {
    return enZoneLabels[zone] || zone;
  }

  return arZoneLabels[zone] || zone;
}

async function loadEasyQBookingSettings() {
  if (!currentBusinessId) {
    easyQBookingSettings = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };
    return easyQBookingSettings;
  }

  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("setting_value")
    .eq("business_id", currentBusinessId)
    .eq("setting_key", EASYQ_BOOKING_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.error("❌ فشل تحميل إعدادات واجهة الحجز:", error);
    easyQBookingSettings = { ...DEFAULT_EASYQ_BOOKING_SETTINGS };
    applyEasyQBookingTheme();
    return easyQBookingSettings;
  }

  let savedSettings = {};

  try {
    savedSettings = data?.setting_value ? JSON.parse(data.setting_value) : {};
  } catch (err) {
    console.warn("⚠️ booking_settings_v2 ليس JSON صالح:", err);
    savedSettings = {};
  }

  easyQBookingSettings = {
    ...DEFAULT_EASYQ_BOOKING_SETTINGS,
    ...savedSettings
  };

  applyEasyQBookingTheme();

  console.log("✅ تم تحميل إعدادات واجهة الحجز:", easyQBookingSettings);
  return easyQBookingSettings;
}

function applyEasyQBookingTheme() {
  const s = easyQBookingSettings || DEFAULT_EASYQ_BOOKING_SETTINGS;
  const root = document.documentElement;

  root.style.setProperty("--booking-bg-start", s.page_bg_start);
  root.style.setProperty("--booking-bg-end", s.page_bg_end);
  root.style.setProperty("--booking-primary", s.primary_color);
  root.style.setProperty("--booking-primary-2", s.primary_color_2);
  root.style.setProperty("--booking-accent", s.accent_color);
  root.style.setProperty("--booking-progress", s.progress_color);
  root.style.setProperty("--booking-success", s.success_color);
  root.style.setProperty("--booking-text", s.text_color);
  root.style.setProperty("--booking-muted-text", s.muted_text_color);
root.style.setProperty("--booking-card-bg", s.card_bg_color);
root.style.setProperty("--booking-welcome-bg", s.welcome_bg_color);
root.style.setProperty("--booking-welcome-text", s.welcome_text_color);

root.style.setProperty("--booking-restore-hint-bg", s.restore_hint_bg_color);
root.style.setProperty("--booking-restore-hint-text", s.restore_hint_text_color);

root.style.setProperty("--booking-form-card-bg", s.booking_card_bg_color);
root.style.setProperty("--booking-form-card-text", s.booking_card_text_color);

root.style.setProperty("--booking-button-text", s.button_text_color);
}
// ============================================================
// إعدادات Realtime Watchdog
// ============================================================
const MAX_SILENT_ATTEMPTS = 3;
const ZOMBIE_TIMEOUT = 30000; // 30 ثانية
let silentReconnectAttempts = 0;
let lastRealtimePulse = Date.now();
let showCurrentQueueConfig = false;
let zonesEnabled = false;
let availableZones = [];

// DOM Elements
let app = null;

let continuousAlertInterval = null;
let isAlertStopped = false;
let previousStatus = null;  // <--- أضف هذا السطر هنا
// ========== منع تكرار التنبيهات ==========
let lastCustomerAlertKey = null;
let hasInitialStatusLoaded = false;
let readyAlertStartedForRequestId = null;

// ========== كشف سرعة المتصفح ==========
let browserSpeedTested = false;
let isBrowserFast = true;

async function testBrowserSpeed() {
    if (browserSpeedTested) return isBrowserFast;
    
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        // اختبار WebSocket
        const ws = new WebSocket('wss://zjdfadkonftkgljvzxoy.supabase.co/realtime/v1/websocket?apikey=' + SUPABASE_ANON_KEY);
        let responded = false;
        
        const timeout = setTimeout(() => {
            if (!responded) {
                ws.close();
                isBrowserFast = false;
                browserSpeedTested = true;
                console.log('🐌 تم اكتشاف متصفح بطيء (WebSocket لم يستجب خلال 5 ثوانٍ)');
                resolve(false);
            }
        }, 5000);
        
        ws.onopen = () => {
            const elapsed = performance.now() - startTime;
            ws.close();
            clearTimeout(timeout);
            
            isBrowserFast = elapsed < 1500;
            browserSpeedTested = true;
            console.log(`⚡ سرعة الاتصال: ${elapsed.toFixed(0)}ms - ${isBrowserFast ? 'سريع ✅' : 'بطيء 🐌'}`);
            resolve(isBrowserFast);
        };
        
        ws.onerror = () => {
            clearTimeout(timeout);
            ws.close();
            isBrowserFast = false;
            browserSpeedTested = true;
            console.log('❌ فشل اتصال WebSocket، تفعيل وضع البطيء');
            resolve(false);
        };
    });
}

function shouldTriggerCustomerAlert(alertType, data = {}) {
    if (!hasInitialStatusLoaded) {
        console.log('🔕 منع التنبيه في أول تحميل');
        return false;
    }
    const requestId = currentRequestId || data.requestId || 'no-request';
    const queuePosition = data.queuePosition ?? currentQueueNumber ?? 'no-position';
    const status = data.status || 'no-status';
    const alertKey = `${requestId}:${alertType}:${status}:${queuePosition}`;
    if (lastCustomerAlertKey === alertKey) {
        console.log('🔕 تم منع تكرار التنبيه:', alertKey);
        return false;
    }
    lastCustomerAlertKey = alertKey;
    return true;
}

function resetCustomerAlertProtection() {
    lastCustomerAlertKey = null;
    hasInitialStatusLoaded = false;
}
// ========== الفحص الاحتياطي ==========
let customerSafetyPolling = null;
let isSafetyRefreshRunning = false;

// ========== الدوال المساعدة ==========


function requestNotificationPermission() {
    // سيتم تفعيلها لاحقاً
}



// ========== الدوال الأساسية ==========

async function loadBookingBusinessIdentity() {
  if (!currentBusinessId) {
    console.warn("⚠️ لا يوجد business_id لجلب بيانات المطعم");
    currentBusinessProfile = null;
    return null;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, branch_name, city, address, phone, logo_url, google_maps_url, instagram_url, website_url")
    .eq("id", currentBusinessId)
    .maybeSingle();

  if (error) {
    console.error("❌ فشل جلب بيانات المطعم:", error);
    currentBusinessProfile = null;
    return null;
  }

  currentBusinessProfile = data || null;
  console.log("✅ تم تحميل بيانات المطعم لصفحة الحجز:", currentBusinessProfile);

  return currentBusinessProfile;
}

async function getBusinessSettings() {
    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('business_id') || '5a2fd95a-0f88-4c70-89db-e6ee7ba8f49c';
    await loadBookingBusinessIdentity();
    await loadEasyQBookingSettings();

    const { data: queueSetting } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('business_id', currentBusinessId)
        .eq('setting_key', 'show_current_queue')
        .maybeSingle();
    
    showCurrentQueueConfig = easyQBookingSettings.show_current_queue === true;

    const { data: zonesSetting } = await supabase
        .from('restaurant_settings')
        .select('setting_value')
        .eq('business_id', currentBusinessId)
        .eq('setting_key', 'active_zones')
        .maybeSingle();
    
    if (zonesSetting?.setting_value) {
    zonesEnabled = bookingEnabled("show_zone_selector");
    availableZones = JSON.parse(zonesSetting.setting_value);
     console.log('✅ availableZones loaded:', availableZones);
    } else {
        console.log('⚠️ No zones setting found');
    }
}

async function getCurrentQueueNumber() {

    if (!currentRequestId) return;

    const { data, error } = await supabase.rpc(
        'easyq_public_view_booking_by_request_id_v1',
        {
            p_request_id: currentRequestId
        }
    );

    if (error) {
        console.error('Queue Fetch Error:', error);
        return;
    }

    const request = data?.booking;


    if (!data?.success || !request) return;

    currentQueueNumber =
        request?.queue_position ?? '--';

    const queueEl =
        document.getElementById('liveQueueNumber');

    if (queueEl) {
        queueEl.innerText = currentQueueNumber;
    }

    const servingEl =
        document.getElementById('currentServingNumber');

    if (servingEl) {
        servingEl.innerText = currentQueueNumber;
    }
}

async function loadPublicCurrentQueueCount() {
  if (!currentBusinessId) {
    currentPublicQueueText = "--";
    return currentPublicQueueText;
  }

  try {
    const { data, error } = await supabase.rpc(
      "easyq_public_current_queue_count_v1",
      {
        p_business_id: currentBusinessId
      }
    );

    if (error) {
      console.error("❌ فشل جلب الطابور الحالي العام:", error);
      currentPublicQueueText = "--";
      return currentPublicQueueText;
    }

    const count = Number(data || 0);

    currentPublicQueueText = count > 0
      ? String(count)
      : "لا يوجد انتظار";

    const queueEl = document.getElementById("liveQueueNumber");

    if (queueEl) {
      queueEl.innerText = currentPublicQueueText;
    }

    return currentPublicQueueText;

  } catch (err) {
    console.error("❌ خطأ غير متوقع أثناء جلب الطابور الحالي العام:", err);
    currentPublicQueueText = "--";
    return currentPublicQueueText;
  }
}

async function getRemainingHoldTime() {
    if (!currentRequestId) return null;
    
    const { data, error } = await supabase.rpc('get_remaining_hold_time', {
        p_request_id: currentRequestId
    });
    
    if (error || !data?.has_active_reservation) return null;
    return data.remaining_seconds;
}


async function renderUI() {
    console.log('🔍 renderUI - currentRequestId:', currentRequestId);
    const hasActiveBooking = currentRequestId && sessionStorage.getItem('booking_cancelled') !== 'true';
    
    if (hasActiveBooking) {
        const { data, error } = await supabase.rpc(
            'easyq_public_view_booking_by_request_id_v1',
            {
                p_request_id: currentRequestId
            }
        );

        const request = data?.booking || null;

        if (error || !data?.success || !request) {
            console.log('❌ Booking not found, clearing localStorage');
            localStorage.removeItem('current_booking_id');
            currentRequestId = null;
            await renderBookingForm();
            return;
        }
        
        if (request.status === 'cancelled' || request.status === 'expired') {
            console.log('❌ Booking is cancelled/expired, clearing localStorage');
            localStorage.removeItem('current_booking_id');
            currentRequestId = null;
            await renderBookingForm();
            return;
        }
        
        await renderStatusPage(request);
    } else {
        await renderBookingForm();
    }
}

function getEasyQPoweredByHtml() {
  const easyQBrandLink = "https://easyq-system.vercel.app";

  const easyTextColor = "#FFFFFF";
  const qTextColor = "#033ec6";
  const dashTextColor = "rgba(255,255,255,0.55)";
  const sloganTextColor = "#FFFFFF";

  const brandFontSize = "14px";
  const qFontSize = "14px";
  const sloganFontSize = "11px";

  return `
    <a
      href="${easyQBrandLink}"
      target="_blank"
      rel="noopener noreferrer"
      class="easyq-powered-link"
    >
      <span class="easyq-powered-brand" style="font-size:${brandFontSize};">
        <span style="color:${easyTextColor};">EASY</span><span style="color:${qTextColor}; font-size:${qFontSize};">Q</span>
      </span>

      <span class="easyq-powered-separator" style="color:${dashTextColor};">—</span>

      <span class="easyq-powered-slogan" style="color:${sloganTextColor}; font-size:${sloganFontSize};">
        نظام الطوابير وإدارة الطاولات باحترافية
      </span>
    </a>
  `;
}

function getBookingBusinessHeaderHtml() {
  const business = currentBusinessProfile || {};

  const businessName = escapeHtml(business.name || "EASY-Q");
  const branchName = escapeHtml(business.branch_name || "");
  const cityName = escapeHtml(business.city || "");
  const addressText = escapeHtml(business.address || "");
const logoUrl = safeImageUrl(business.logo_url || "");

  const showLogo = bookingEnabled("show_business_logo");
  const showBusinessInfo = bookingEnabled("show_business_info");

  const logoHtml = logoUrl
    ? `
      <div class="restaurant-logo has-logo">
        <img 
          src="${logoUrl}" 
          alt="${businessName}" 
          onerror="this.style.display='none'; this.parentElement.classList.remove('has-logo'); this.parentElement.innerHTML='<i class=&quot;fas fa-utensils&quot;></i>';"
        >
      </div>
    `
    : `
      <div class="restaurant-logo">
        <i class="fas fa-utensils"></i>
      </div>
    `;

  return `
    <div class="booking-header">

      ${showLogo ? logoHtml : ""}

      ${showBusinessInfo ? `
        <div class="restaurant-name">
          ${businessName}
        </div>

        ${branchName ? `
          <div class="restaurant-branch">
            ${branchName}
          </div>
        ` : ""}

        ${(cityName || addressText) ? `
          <div class="restaurant-address">
            ${cityName ? `<span>${cityName}</span>` : ""}
            ${(cityName && addressText) ? `<span class="address-separator"> - </span>` : ""}
            ${addressText ? `<span>${addressText}</span>` : ""}
          </div>
        ` : ""}
      ` : ""}

      <div class="datetime-row">
        <span id="currentDate"></span>
        <span id="currentTime"></span>
      </div>

      <button 
        type="button"
        class="booking-lang-toggle"
        onclick="toggleBookingPageLanguage()"
      >
        ${bookingPageLang === "ar" ? "EN" : "ع"}
      </button>

    </div>
  `;
}

async function renderBookingForm() {
  app.innerHTML = `
    <div class="container">
      ${getBookingBusinessHeaderHtml()}
      
      <div class="welcome-message">
        <i class="fas fa-hands-helping" style="margin-left: 9px; color: var(--booking-accent);"></i>
      ${escapeHtml(bookingText("welcome_message"))}
      </div>
                 <!-- سطر استعادة الحجز -->
      ${bookingEnabled("show_restore_hint") ? `
        <div class="restore-hint" style="text-align: center; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 20px; font-size: 13px;">
          <span style="color: rgba(255,255,255,0.8);">${escapeHtml(bookingText("restore_hint_prefix"))} </span>
          <span onclick="openRestoreModal()" style="color: var(--booking-success); font-weight: bold; cursor: pointer; text-decoration: underline;">${escapeHtml(bookingText("restore_hint_link"))}</span>
          <span style="color: rgba(255,255,255,0.8);"> ${escapeHtml(bookingText("restore_hint_suffix"))}</span>
        </div>
      ` : ""}
      
      ${showCurrentQueueConfig ? `
      <div class="current-queue-card" id="currentQueueCard">
      <div class="current-queue-title">${escapeHtml(bookingText("current_queue_title"))}</div>
        <div class="current-number-circle">
        <div class="current-number" id="liveQueueNumber">${escapeHtml(currentPublicQueueText || '--')}</div>
        </div>
         <div class="current-queue-sub">${escapeHtml(bookingText("current_queue_sub"))}</div>
      </div>
      ` : ''}
      
      <div class="booking-card">
        <div class="form-group">
<label class="form-label">${escapeHtml(bookingText("name_label_text"))}</label>
<input type="text" id="customerName" class="form-input" placeholder="${escapeHtml(bookingText("name_placeholder_text"))}">
        </div>
        
        <div class="form-group">
<label class="form-label">${escapeHtml(bookingText("phone_label_text"))}</label>
<input type="tel" id="customerPhone" class="form-input" placeholder="${escapeHtml(bookingText("phone_placeholder_text"))}" maxlength="10">
        </div>
        
        ${(zonesEnabled && bookingEnabled("show_zone_selector")) ? `
        <div class="form-group">
          <label class="form-label">${escapeHtml(bookingText("zone_label_text"))}</label>
<select id="customerZone" class="form-input">
  <option value="">${escapeHtml(bookingText("zone_no_preference_text"))}</option>
            ${availableZones.map(zone => {
              const safeZoneValue = escapeHtml(zone);
              const safeZoneLabel = escapeHtml(getBookingZoneLabel(zone));
              return `<option value="${safeZoneValue}">${safeZoneLabel}</option>`;
            }).join('')}
          </select>
        </div>
        ` : ''}
        
        <div class="form-group">
          <label class="form-label">${escapeHtml(bookingText("party_size_label_text"))}</label>
          <div class="party-stepper">
            <button class="stepper-btn" onclick="changePartySize(-1)">-</button>
            <span class="stepper-value" id="partySizeValue">2</span>
            <button class="stepper-btn" onclick="changePartySize(1)">+</button>
          </div>
        </div>
        
       <button class="submit-btn" id="submitBookingBtn">
              ${escapeHtml(bookingText("submit_button_text"))}
        </button>
      </div>
      
      ${bookingEnabled("show_notification_button") ? `
        <div id="notificationBtnContainer" class="hidden">
          <button class="notif-btn" id="enableNotifBtn">
       <i class="fas fa-bell"></i> ${escapeHtml(bookingText("notification_button_text"))}
          </button>
        </div>
      ` : ""}

      ${getEasyQPoweredByHtml()}
    </div>
  `;
  
  document.getElementById('submitBookingBtn')?.addEventListener('click', submitBooking);
  document.getElementById('enableNotifBtn')?.addEventListener('click', () => requestNotificationPermission(true));
  initBookingPhoneInput();
}


function getTimelineStatus(step, requestStatus, remainingCount, isFinished = false) {
  if (requestStatus === 'cancelled') return '';
  if (step === 0) return 'completed';
  if (step === 1) {
    if (remainingCount > 0) return 'active';
    if (isFinished) return 'completed';
    return '';
  }
  if (step === 2) {
    if (remainingCount === 1 && !isFinished) return 'active';
    if (isFinished) return 'completed';
    return '';
  }
  if (step === 3) {
    if (isFinished) return 'active completed';
    return '';
  }
  return '';
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

async function getBookingCustomerName(request) {
  // 1) إذا الاسم موجود داخل كائن الطلب نفسه
  if (request?.customer_name) {
    return request.customer_name;
  }

  // 2) إذا الاسم محفوظ كسنابشوت داخل table_requests
  if (request?.customer_name_snapshot) {
    return request.customer_name_snapshot;
  }

  // 3) إذا الاسم موجود مؤقتًا في نفس الجهاز
  if (window.currentCustomerName && window.currentCustomerName !== 'ضيف') {
    return window.currentCustomerName;
  }

  // 4) جلب الاسم الحقيقي من جدول customers عبر customer_id
  if (request?.customer_id) {
    const { data, error } = await supabase
      .from('customers')
      .select('name')
      .eq('id', request.customer_id)
      .maybeSingle();

    if (!error && data?.name) {
      return data.name;
    }
  }

  // 5) آخر حل
  return 'ضيف';
}

async function renderStatusPage(requestData = null) {
  let request = requestData;

  if (!request) {
    const { data, error } = await supabase.rpc(
      'easyq_public_view_booking_by_request_id_v1',
      {
        p_request_id: currentRequestId
      }
    );

    if (error || !data?.success || !data?.booking) return;

    request = data.booking;

    if (!hasInitialStatusLoaded) hasInitialStatusLoaded = true;
  }

  if (!request || request.status === 'cancelled' || request.status === 'expired') {
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    alert('تم إلغاء حجزك لانتهاء الوقت المحدد لتأكيد الحضور يمكنك معاودة الحجز مجددا');
    localStorage.removeItem('current_booking_id');
    sessionStorage.removeItem('current_booking_id');
    currentRequestId = null;
    await renderBookingForm();
    return;
  }

  window.currentCustomerName = await getBookingCustomerName(request);
  let customerName = window.currentCustomerName;
  let partySize = request.requested_party_size || 2;
  let bookingTime = formatTime(request.created_at);

  if (customerName.length > 15) {
      customerName = customerName.substring(0, 15) + '.';
  }

  const safeCustomerName = escapeHtml(customerName);
  const safeBookingCode = escapeHtml(request.booking_code || '---');
  const safeRequestId = escapeHtml(request.id || '');

  window.originalQueueNumber = window.originalQueueNumber || request.original_queue_position || request.queue_position || 1;
  const originalQueueNumber = window.originalQueueNumber;
  const currentQueueNumber = request?.queue_position || window.currentQueueNumber || originalQueueNumber;
  window.currentQueueNumber = currentQueueNumber;
    // جلب رقم الطاولة المعيّنة للعميل عند حالة "طاولتك جاهزة"
  let assignedTableName = "";

  if (request.status === "offered" || request.status === "reserved") {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from("table_assignments")
      .select(`
        table_id,
        status,
        dining_tables (
          table_name
        )
      `)
      .eq("request_id", request.id)
      .in("status", ["offered", "reserved"])
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assignmentError && assignmentData?.dining_tables?.table_name) {
      assignedTableName = escapeHtml(assignmentData.dining_tables.table_name);
    }
  }

  const isWaiting = request.status === 'waiting';
  const isOffered = request.status === 'offered';
  const isOccupied = request.status === 'occupied';
  const isCleaning = request.status === 'cleaning' || request.status === 'completed';
  const isFinished = isOffered || isOccupied || isCleaning;
  
  let remainingSeconds = null;
  if (isOffered) {
      remainingSeconds = await getRemainingHoldTime();
  }
  
  function formatCountdownTime(seconds) {
      if (seconds < 0) seconds = 0;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const circleLength = 578;
  let progressPercent = 100;
  if (isWaiting) {
    progressPercent = (currentQueueNumber / originalQueueNumber) * 100;
  } else {
    progressPercent = 100;
  }
  const dashOffset = circleLength - ((circleLength * progressPercent) / 100);

  console.log('🔍 Debug - currentQueueNumber:', currentQueueNumber, 'status:', request.status);
  
  let numberText = '';
  let labelText = '';
  let subText = '';
  let showTimer = false;
  let showCancelButton = true;
  let statusMessage = '';
  
if (isWaiting) {
      numberText = currentQueueNumber;

      if (currentQueueNumber === 2) {
          labelText = escapeHtml(bookingText("waiting_near_label"));
          statusMessage = '';
      } else if (currentQueueNumber === 1) {
          labelText = escapeHtml(bookingText("waiting_next_label"));
          statusMessage = '';
      } else {
          labelText = escapeHtml(bookingText("waiting_default_label"));
          statusMessage = '';
      }

      showCancelButton = true;
  }
else if (isOffered) {
      if (remainingSeconds !== null && remainingSeconds > 0) {
          numberText = formatCountdownTime(remainingSeconds);

          const tableReadyWithNumber = escapeHtml(bookingText("table_ready_with_number_text"))
            .replace("{table}", `<span class="assigned-table-number">${assignedTableName}</span>`);

          labelText = assignedTableName
            ? `
              <div class="turn-ready-title">${escapeHtml(bookingText("ready_title_text"))}</div>
              <div class="ready-table-line">${tableReadyWithNumber}</div>
            `
            : `
              <div class="turn-ready-title">${escapeHtml(bookingText("ready_title_text"))}</div>
              <div class="ready-table-line">${escapeHtml(bookingText("table_ready_text"))}</div>
            `;

          statusMessage = escapeHtml(bookingText("ready_sub_text"));
          showTimer = true;
      } else {
          numberText = '0';
          labelText = 'تم إلغاء حجزك';
          statusMessage = '';
          showCancelButton = false;
      }
  }
else if (isOccupied) {
      numberText = '🎉';
      labelText = escapeHtml(bookingText("occupied_title_text"));
      statusMessage = escapeHtml(bookingText("occupied_sub_text"));
      showCancelButton = false;
  }
else if (isCleaning) {
      numberText = '🙏';
      labelText = escapeHtml(bookingText("cleaning_title_text"));
      statusMessage = escapeHtml(bookingText("cleaning_sub_text"));
      showCancelButton = false;
  }
  else {
      numberText = currentQueueNumber;
      labelText = 'رقمك في الانتظار';
      statusMessage = 'نشكر لك صبرك';
      showCancelButton = true;
  }

  const previousQueueNumber = window.previousQueueNumber;
  const previousStatus = window.previousStatus;

  if (window.audioEnabled) {
    if (previousQueueNumber !== undefined && previousQueueNumber !== currentQueueNumber && isWaiting) {
      if (currentQueueNumber === 2 && shouldTriggerCustomerAlert('near')) {
        playBookingAlert('near');
      } else if (currentQueueNumber === 1 && shouldTriggerCustomerAlert('next')) {
        playBookingAlert('next');
      }
    }

    // تنبيه الطاولة الجاهزة:
    // يعمل مرة واحدة لكل حجز عندما تصبح الحالة offered
    // حتى لو فتحت الصفحة بعد أن أصبحت الطاولة جاهزة
    if (
      isOffered &&
      remainingSeconds !== null &&
      remainingSeconds > 0 &&
      readyAlertStartedForRequestId !== request.id
    ) {
      readyAlertStartedForRequestId = request.id;
      isAlertStopped = false;

      playBookingAlert('ready');
      startContinuousAlert();
      showStopAlertButton();
    }
  }

  window.previousQueueNumber = currentQueueNumber;
  window.previousStatus = request.status;

  app.innerHTML = `
    <div class="container">
      ${getBookingBusinessHeaderHtml()}

      <div class="premium-waiting-card">
        <div class="premium-waiting-header">
          <span class="premium-line"></span>
                    <h2>${escapeHtml(bookingText("status_page_title"))}</h2>
          <span class="premium-line"></span>
        </div>
        
        <div class="booking-details">
        <span class="customer-name"><i class="fas fa-user"></i> ${safeCustomerName}</span>
          <span class="separator">|</span>
          <span class="party-size"><i class="fas fa-user-friends"></i> ${partySize}</span>
          <span class="separator">|</span>
          <span class="booking-time"><i class="fas fa-clock"></i> ${bookingTime}</span>
        </div>
        
        <div class="premium-queue-wrapper">
          <div class="premium-queue-ring" style="--progress:${progressPercent};">
            <svg class="premium-ring-svg" viewBox="0 0 220 220">
              <circle class="premium-ring-bg" cx="110" cy="110" r="92" />
              <circle class="premium-ring-progress" cx="110" cy="110" r="92" 
                      stroke-dasharray="578" 
                      stroke-dashoffset="${dashOffset}"
                      style="stroke: ${isFinished ? '#10B981' : '#D4AF37'}; transition: stroke-dashoffset 0.6s ease-in-out;" />
            </svg>
            <div class="premium-ring-content">
              <div class="premium-ring-label">${labelText}</div>
              <div class="premium-ring-number" id="remainingCount" style="${showTimer ? 'font-size: 38px; font-family: monospace;' : ''}">
                ${numberText}
              </div>
              <div class="premium-ring-sub" style="${(isWaiting && statusMessage === '') ? 'display: none;' : ''}">${statusMessage}</div>
            </div>
          </div>
        </div>
        


${!isGuestViewOnly ? `
  ${bookingEnabled("show_reference_code") ? `
    <div class="booking-ref-code" style="text-align: center; margin: 10px 0;">

      ${bookingEnabled("share_booking_enabled") ? `
              <div class="share-booking-hint" id="shareBookingViewOnlyBtn" data-request-id="${safeRequestId}">
       <span>${escapeHtml(bookingText("share_hint_text"))}</span>
          <i class="fas fa-share-alt"></i>
        </div>
      ` : ""}

      <div style="color: #FF4444; font-weight: bold; font-size: 13px;">
      ${escapeHtml(bookingText("reference_label_text"))}
        <span style="font-size: 16px; background: rgba(255,68,68,0.2); padding: 4px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px;">
          ${safeBookingCode}
          <i id="copyBookingCodeBtn"
             data-code="${safeBookingCode}"
             style="cursor: pointer; font-size: 12px; color: #fffefe;" 
             class="fas fa-copy"></i>
        </span>
      </div>

      <div style="color: #918d8d; font-size: 12px; margin-top: 8px;">
       ${escapeHtml(bookingText("reference_save_hint_text"))}
      </div>

    </div>
  ` : ""}
` : `
<div class="guest-view-note">
  <i class="fas fa-eye"></i>
<span>${escapeHtml(bookingText("guest_view_text"))}</span>
</div>
`}
<div class="premium-queue-status">
          <span>
            ${isOccupied ? '' : (isOffered ? 'نحن بانتظارك' : (isWaiting ? 'نشكر لك صبرك دورك يتقدم' : ''))}
          </span>
        </div>
      </div>

${!isGuestViewOnly ? `
  ${showCancelButton ? `
    ${
      isOffered
        ? bookingEnabled("cannot_attend_enabled") ? `
          <div class="cannot-attend-card" id="cannotAttendLink">
            <div class="cannot-attend-title">${escapeHtml(bookingText("cannot_attend_title"))}</div>
            <div class="cannot-attend-sub">
              ${escapeHtml(bookingText("cannot_attend_sub"))}
            </div>
          </div>
        ` : ""
        : bookingEnabled("cancel_waiting_enabled") ? `
          <div class="cancel-link" id="cancelBookingLink">
         ${escapeHtml(bookingText("cancel_waiting_text"))}
          </div>
        ` : ""
    }
  ` : `
    <div class="exit-link" id="exitBookingLink" style="text-align: center; margin: 20px auto; padding: 12px 25px; background: rgba(16,185,129,0.15); color: var(--booking-success); border-radius: 50px; cursor: pointer; font-weight: bold; font-size: 16px; width: fit-content;">
     ${escapeHtml(bookingText("exit_text"))}
    </div>
  `}
` : ``}

      ${getEasyQPoweredByHtml()}
    </div>
  `;

  if (window.countdownInterval) clearInterval(window.countdownInterval);
  
  if (isOffered && remainingSeconds !== null && remainingSeconds > 0) {
      let currentSeconds = remainingSeconds;
      window.countdownInterval = setInterval(() => {
          currentSeconds--;
          const timerEl = document.getElementById('remainingCount');
          if (currentSeconds <= 0) {
              clearInterval(window.countdownInterval);
              if (timerEl) timerEl.innerText = "0:00";
          } else {
              if (timerEl) timerEl.innerText = formatCountdownTime(currentSeconds);
              if (document.getElementById('countdownTimer')) {
                  document.getElementById('countdownTimer').innerText = formatCountdownTime(currentSeconds);
              }
          }
      }, 1000);
  }

  document.getElementById('cancelBookingLink')?.addEventListener('click', cancelBooking);
  document.getElementById('copyBookingCodeBtn')?.addEventListener('click', function () {
    copyBookingCode(this.dataset.code || '', this);
  });
    document.getElementById('shareBookingViewOnlyBtn')?.addEventListener('click', function () {
    shareBookingViewOnly(this.dataset.requestId || '');
  });
  document.getElementById('cannotAttendLink')?.addEventListener('click', cannotAttendBooking);
  document.getElementById('exitBookingLink')?.addEventListener('click', async () => {
      await supabase
          .from('table_requests')
          .update({ status: 'completed' })
          .eq('id', currentRequestId);
      
      localStorage.removeItem('current_booking_id');
      sessionStorage.removeItem('current_booking_id');
      currentRequestId = null;
      await renderBookingForm();
  });
  
  updateDateTime();
  console.log('✅ renderStatusPage finished - status:', request.status);
}

async function submitBooking() {
  const name = document.getElementById('customerName')?.value.trim();
  window.currentCustomerName = name;

  const phoneInputEl = document.getElementById('customerPhone');
  const phoneValidation = validateAndNormalizeBookingPhone(phoneInputEl);
  const phone = phoneValidation.phone;

  const partySize = parseInt(document.getElementById('partySizeValue')?.innerText || '2');
  const zone = document.getElementById('customerZone')?.value || null;

  if (!name) {
    alert(bookingText("name_required_alert_text"));
    return;
  }

  if (!phoneValidation.valid) {
    showBookingPhoneError(phoneInputEl, phoneValidation.message);
    phoneInputEl?.focus();
    return;
  }

  clearBookingPhoneError(phoneInputEl);

  const submitBtn = document.getElementById('submitBookingBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<div class="spinner"></div> ${escapeHtml(bookingText("checking_booking_text"))}`;

  try {
    // ✅ 1) منع إنشاء حجز جديد إذا نفس الجوال موجود حاليًا في قائمة الانتظار waiting
    const { data: activeCheck, error: checkError } = await supabase
      .rpc('check_active_booking_by_phone', {
        p_phone: phone,
        p_business_id: currentBusinessId
      });

    if (checkError) throw new Error(checkError.message);

    if (activeCheck?.has_active === true) {
      console.log('🔄 Active booking found:', activeCheck);

      currentRequestId = activeCheck.request_id;
      currentQueueNumber = activeCheck.queue_position;

      localStorage.setItem('current_booking_id', currentRequestId);
      sessionStorage.setItem('booking_cancelled', 'false');
      sessionStorage.setItem('current_booking_id', currentRequestId);

      const { data: existingBookingData, error: existingBookingError } = await supabase.rpc(
        'easyq_public_view_booking_by_request_id_v1',
        {
          p_request_id: currentRequestId
        }
      );

      const existingRequest = existingBookingData?.booking || null;

      if (existingBookingError || !existingBookingData?.success || !existingRequest) {
        throw new Error('تعذر استعادة الحجز النشط');
      }

      alert(`⚠️ لديك حجز نشط بالفعل!\nرقمك في الانتظار: ${existingRequest.queue_position}\nسيتم استعادة الحجز الحالي.`);

      await renderStatusPage(existingRequest);
      setupRealtime();
      startCustomerSafetyPolling();
      return;
    }

    // ✅ 2) فحص حد الحجوزات السلبية قبل إنشاء العميل أو إظهار رسالة التأكيد
    const { data: negativeLimitRows, error: negativeLimitError } = await supabase
      .rpc('easyq_check_online_booking_negative_limit_v1', {
        p_business_id: currentBusinessId,
        p_phone: phone
      });

    if (negativeLimitError) {
      throw new Error(negativeLimitError.message);
    }

    const negativeLimit = Array.isArray(negativeLimitRows)
      ? negativeLimitRows[0]
      : negativeLimitRows;

    if (negativeLimit?.should_block === true) {
      alert(
        negativeLimit.message ||
        (
          bookingPageLang === "en"
            ? "Sorry, you cannot create a new booking for this number at the moment due to repeated incomplete bookings. Please try again after 12 hours or contact the restaurant directly."
            : "نعتذر، لا يمكن إنشاء حجز جديد حاليًا لهذا الرقم بسبب تكرار حجوزات غير مكتملة . يمكنك معاودة الحجز بعد 12 ساعة أو يمكنك التواصل مع المطعم مباشرة."
        )
      );

      submitBtn.disabled = false;
      submitBtn.innerHTML = escapeHtml(bookingText("submit_button_text"));
      return;
    }

    // ✅ 3) لا يوجد منع نهائي، نبدأ إنشاء/تحديث العميل
    submitBtn.innerHTML = `<div class="spinner"></div> ${escapeHtml(bookingText("creating_booking_text"))}`;

    const { data: customerId, error: customerError } = await supabase.rpc('create_customer_safe', {
      p_name: name,
      p_phone: phone,
      p_business_id: currentBusinessId
    });

    if (customerError) throw new Error(customerError.message);
    if (!customerId) throw new Error('فشل إنشاء العميل');

    // ✅ دالة داخلية لإنشاء الحجز، مع دعم تأكيد آخر 12 ساعة
    const createBooking = async (confirmRecentBooking = false) => {
      return await supabase.rpc('create_booking_safe', {
        p_customer_id: customerId,
        p_business_id: currentBusinessId,
        p_party_size: partySize,
        p_zone_name: zone,
        p_confirm_recent_booking: confirmRecentBooking
      });
    };

    // ✅ 3) المحاولة الأولى بدون تأكيد
    let { data: booking, error: bookingError } = await createBooking(false);

    if (bookingError) throw new Error(bookingError.message);

    // ✅ 4) إذا وجد النظام حجز أونلاين سلبي خلال آخر 12 ساعة، نطلب تأكيد العميل
    if (booking?.needs_recent_confirmation === true) {
      const confirmMessage =
        bookingPageLang === "en"
          ? "There is a previous booking with the same mobile number within the last 12 hours.\n\nYou can confirm a new booking now, but if you cancel this booking or do not show up, you will not be able to create another booking with the same number until 12 hours have passed.\n\nDo you want to continue?"
          : "يوجد حجز سابق بنفس رقم الجوال خلال آخر 12 ساعة.\n\nيمكنك تأكيد حجزك الجديد الآن، لكن في حال إلغاء هذا الحجز أو عدم الحضور، فلن تتمكن من إنشاء حجز آخر بنفس الرقم إلا بعد مرور 12 ساعة.\n\nهل تريد تأكيد حجزك؟";

      const confirmedRecentBooking = confirm(confirmMessage);

      if (!confirmedRecentBooking) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = escapeHtml(bookingText("submit_button_text"));
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="spinner"></div> ${escapeHtml(bookingText("creating_booking_text"))}`;

      const confirmedResult = await createBooking(true);
      booking = confirmedResult.data;
      bookingError = confirmedResult.error;

      if (bookingError) throw new Error(bookingError.message);

      if (booking?.needs_recent_confirmation === true) {
        throw new Error(
          bookingPageLang === "en"
            ? "Could not confirm the new booking. Please try again."
            : "تعذر تأكيد الحجز الجديد، حاول مرة أخرى"
        );
      }
    }

    if (!booking?.success || !booking?.id) {
      throw new Error(
        booking?.message ||
        (bookingPageLang === "en" ? "Booking was not created" : "لم يتم إنشاء الحجز")
      );
    }

    // ✅ 5) نجاح إنشاء الحجز
    currentRequestId = booking.id;
    currentQueueNumber = booking.queue_position;
    window.originalQueueNumber = booking.original_queue_position || booking.queue_position;

    localStorage.setItem('current_booking_id', currentRequestId);
    sessionStorage.setItem('booking_cancelled', 'false');
    sessionStorage.setItem('current_booking_id', currentRequestId);

    console.log('✅ currentRequestId:', currentRequestId);
    console.log('✅ queue_position:', currentQueueNumber);
    console.log('✅ booking_code:', booking.booking_code);

    resetCustomerAlertProtection();
    await renderStatusPage(booking);
    await setupRealtime();
    showAudioModal();
    startCustomerSafetyPolling();

  } catch (err) {
    alert(`${bookingText("booking_failed_text")} ${err.message}`);
    submitBtn.disabled = false;
    submitBtn.innerHTML = escapeHtml(bookingText("submit_button_text"));
  }
}

async function cancelBooking() {
    if (!bookingEnabled("cancel_waiting_enabled")) {
    alert("إلغاء الحجز غير متاح حاليًا من قبل المطعم.");
    return;
  }
  // ✅ تأكد من وجود requestId
  if (!currentRequestId) {
    currentRequestId = localStorage.getItem('current_booking_id');
  }
  
  const requestId = currentRequestId;
  
  if (!requestId) {
    alert('لا يوجد حجز نشط للإلغاء');
    return;
  }
  
  console.log('🆔 Cancelling request ID:', requestId);
  
  const confirmed = confirm('هل أنت متأكد من إلغاء الحجز؟');
  if (!confirmed) return;
  
  try {
    const { data, error } = await supabase.rpc('delete_booking', {
      p_request_id: requestId
    });
    
    if (error) throw error;
    
    console.log('✅ تم حذف الحجز بنجاح');
    
    localStorage.removeItem('current_booking_id');
    sessionStorage.removeItem('current_booking_id');
    sessionStorage.setItem('booking_cancelled', 'true');
    currentRequestId = null;
    await cleanupRealtime();
    stopCustomerSafetyPolling();
    await renderBookingForm();
    
  } catch (err) {
    console.error('❌ فشل إلغاء الحجز:', err);
    alert('لم يتم إلغاء الحجز: ' + err.message);
  }
}

async function cannotAttendBooking() {
    if (!bookingEnabled("cannot_attend_enabled")) {
    alert("خيار لا أستطيع الحضور غير متاح حاليًا من قبل المطعم.");
    return;
  }
  if (!currentRequestId) {
    currentRequestId = localStorage.getItem('current_booking_id');
  }

  const requestId = currentRequestId;

  if (!requestId) {
    alert('لا يوجد حجز نشط');
    return;
  }

  const confirmed = confirm('هل أنت متأكد أنك لا تستطيع الحضور؟ سيتم تحرير الطاولة لعميل آخر.');
  if (!confirmed) return;

  try {
    // إيقاف التنبيه المستمر إن كان يعمل
    if (typeof stopContinuousAlert === 'function') {
      stopContinuousAlert();
    }

    const { data, error } = await supabase.rpc('customer_cannot_attend', {
      p_request_id: requestId
    });

    if (error) throw error;

    if (data?.success === false) {
      alert(data.message || 'لم يتم تنفيذ العملية');
      return;
    }

    localStorage.removeItem('current_booking_id');
    sessionStorage.removeItem('current_booking_id');
    sessionStorage.setItem('booking_cancelled', 'true');

    currentRequestId = null;

    await cleanupRealtime();
    stopCustomerSafetyPolling();

    alert('تم تحرير الطاولة بنجاح، شكرًا لإبلاغنا.');
    await renderBookingForm();

  } catch (err) {
    console.error('❌ فشل تحرير الطاولة:', err);
    alert('لم يتم تحرير الطاولة: ' + err.message);
  }
}



function changePartySize(delta) {
  const span = document.getElementById('partySizeValue');
  let val = parseInt(span.innerText);
  val = Math.max(1, Math.min(20, val + delta));
  span.innerText = val;
}

function copyBookingCode(code, btn = null) {
  if (!code) return;

  navigator.clipboard.writeText(code);

  if (btn) {
    const originalClass = btn.className;
    btn.className = 'fas fa-check';

    setTimeout(() => {
      btn.className = originalClass;
    }, 1500);
  }

  const oldToast = document.getElementById('bookingCopyToast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'bookingCopyToast';
  toast.innerText = `✅ تم نسخ الرقم المرجعي: ${code}`;
  toast.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    background: rgba(5, 5, 5, 0.95);
    color: #fff;
    padding: 10px 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    z-index: 99999;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 1800);
}

async function shareBookingViewOnly(requestId) {
    if (!bookingEnabled("share_booking_enabled")) {
    alert("مشاركة الحجز غير متاحة حاليًا من قبل المطعم.");
    return;
  }
  if (!requestId) return;

  const shareUrl = `${window.location.origin}${window.location.pathname}?view=guest&request_id=${requestId}`;

  const shareText = `تابع حالة حجزي في EASY-Q للمشاهدة فقط:\n${shareUrl}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'متابعة الحجز',
        text: 'تابع حالة حجزي للمشاهدة فقط',
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('✅ تم نسخ رابط المشاركة');
    }
  } catch (err) {
    console.log('Share cancelled or failed:', err);
  }
}

function showAudioModal() {
  const modal = document.getElementById('audioModal');
  if (modal) modal.classList.add('show');
}

function hideAudioModal() {
  const modal = document.getElementById('audioModal');
  if (modal) modal.classList.remove('show');
}

function enableAudio() {
  window.audioEnabled = true;
  hideAudioModal();
  playBookingAlert('near');
}

function disableAudio() {
  window.audioEnabled = false;
  hideAudioModal();
}

function playBookingAlert(type = 'near') {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const duration = 0.3;
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    let repeatCount = 1;
    let frequency = 800;
    
switch(type) {
    case 'near':      // اقترب دورك (رقم 2)
        repeatCount = 2;
        frequency = 700;
        vibrateDevice(200);
        break;
    case 'next':      // أنت التالي (رقم 1)
        repeatCount = 2;
        frequency = 900;
        vibrateDevice(300);
        break;
    case 'ready':     // طاولتك جاهزة (offered)
        repeatCount = 2;
        frequency = 1200;
        vibrateDevice(500);
        break;
    default:
        repeatCount = 1;
        frequency = 600;
        vibrateDevice(100);
}
    
    for (let i = 0; i < repeatCount; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
      }, i * 400);
    }
  } catch(e) {
    console.log('Audio not supported:', e);
  }
}

function vibrateDevice(duration = 200) {
    if (window.audioEnabled && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// ========== دوال الفحص الاحتياطي ==========
function startCustomerSafetyPolling() {
    if (customerSafetyPolling) clearInterval(customerSafetyPolling);

    testBrowserSpeed().then(isFast => {
        const intervalTime = isFast ? 10000 : 4000;
        console.log(`🔄 بدء الفحص الاحتياطي والـ Watchdog كل ${intervalTime / 1000} ثانية`);
        
        customerSafetyPolling = setInterval(async () => {
            if (document.hidden) return; 
            if (!currentRequestId) return; 
            if (isSafetyRefreshRunning) return; 

            isSafetyRefreshRunning = true;

            try {
                const { data, error } = await supabase.rpc(
                    'easyq_public_view_booking_by_request_id_v1',
                    {
                        p_request_id: currentRequestId
                    }
                );

                const request = data?.booking || null;
                
                if (error) throw error;
                
                if (!data?.success || !request) {
                    console.log('⚠️ لم يتم العثور على الحجز في السيرفر، إنهاء الجلسة والعودة للنموذج');
                    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
                    stopCustomerSafetyPolling();
                    await renderBookingForm();
                    return;
                }
                
                const localStatus = window.previousStatus;
const localQueueNumber = window.currentQueueNumber;

const isDataStaleLocally =
    String(request.status) !== String(localStatus) ||
    String(request.queue_position) !== String(localQueueNumber);
                const isTimeExceeded = (Date.now() - lastRealtimePulse) > ZOMBIE_TIMEOUT;

                if (isDataStaleLocally && isTimeExceeded && realtimeChannel) {
                    console.warn('🚨 [Watchdog] تم اكتشاف اتصال زومبي ميت! جاري الإنعاش صامتاً...');
                    lastRealtimePulse = Date.now(); 
                    handleSilentReconnect(); 
                }

                if (isDataStaleLocally || !hasInitialStatusLoaded) {
                    console.log('🔄 تحديث واجهة المستخدم لوجود تغيير حقيقي في البيانات أو تحميل أول مرة');
                    await renderStatusPage(request);
                } else {
                    lastRealtimePulse = Date.now();
                }
                
            } catch (err) {
                console.error('❌ فشل الفحص الدوري المساعد عبر HTTP:', err);
            } finally {
                isSafetyRefreshRunning = false;
            }
        }, intervalTime);
    });
}
function stopCustomerSafetyPolling() {
    if (customerSafetyPolling) {
        clearInterval(customerSafetyPolling);
        customerSafetyPolling = null;
    }
    isSafetyRefreshRunning = false;
}

// ========== دالة تنظيف Realtime ==========
async function cleanupRealtime() {
    if (realtimeChannel) {
        try {
            await supabase.removeChannel(realtimeChannel);
            console.log('🧹 تم تنظيف قناة Realtime بنجاح');
        } catch (err) {
            console.error('❌ خطأ في تنظيف قناة Realtime:', err);
        }
        realtimeChannel = null;
    }
    
    // إعادة تعيين العدادات
    silentReconnectAttempts = 0;
    lastRealtimePulse = Date.now();
}

// ========== إعادة الاتصال الصامتة ==========
async function handleSilentReconnect() {
    if (!currentRequestId) {
        await cleanupRealtime();
        return;
    }
    
    if (silentReconnectAttempts >= MAX_SILENT_ATTEMPTS) {
        console.error(`🚨 فشلت ${MAX_SILENT_ATTEMPTS} محاولات اتصال. الاعتماد على Polling فقط.`);
        return;
    }
    
    silentReconnectAttempts++;
    const delay = 2000 * silentReconnectAttempts;
    console.log(`🔄 محاولة إعادة اتصال ${silentReconnectAttempts}/${MAX_SILENT_ATTEMPTS} خلال ${delay/1000} ثانية`);
    
    setTimeout(async () => {
        await setupRealtime();
    }, delay);
}

// ========== تحديث عند الرجوع للصفحة ==========
async function safeRefreshCustomerStatus(reason = 'unknown') {
    if (!currentRequestId) return;
    
    console.log(`🔄 تحديث فوري لحالة العميل بسبب: [${reason}]`);
    
    try {
        const { data, error } = await supabase.rpc(
            'easyq_public_view_booking_by_request_id_v1',
            {
                p_request_id: currentRequestId
            }
        );

        const request = data?.booking || null;

        if (error) throw error;

        if (data?.success && request) {
            await renderStatusPage(request);
            lastRealtimePulse = Date.now();
            silentReconnectAttempts = 0;
            console.log('✅ تم تحديث الشاشة وتغذية نبض الحارس الصامت بنجاح');
        } else {
            console.warn('⚠️ لم يتم العثور على بيانات هذا الحجز أثناء التحديث الفوري');
        }
        
    } catch (err) {
        console.error('❌ فشل التحديث الفوري لحالة العميل عبر safeRefreshCustomerStatus:', err);
    }
}

function reconnectRealtimeIfNeeded() {
    if (!currentRequestId) return;
    if (!realtimeChannel || realtimeChannel.state !== 'SUBSCRIBED') {
        console.log('🔌 Realtime غير متصل، إعادة الاشتراك');
        setupRealtime();
    }
}

function startContinuousAlert() {
    if (continuousAlertInterval) clearInterval(continuousAlertInterval);
    isAlertStopped = false;
    
    continuousAlertInterval = setInterval(() => {
        if (!isAlertStopped && window.audioEnabled) {
            // اهتزاز
            if (navigator.vibrate) navigator.vibrate(500);
            // صوت
            playBookingAlert('ready');
        }
    }, 2000);
}

function stopContinuousAlert() {
    if (continuousAlertInterval) {
        clearInterval(continuousAlertInterval);
        continuousAlertInterval = null;
    }
    isAlertStopped = true;
}

function showStopAlertButton() {
    // إزالة الزر القديم إذا وجد
    const oldBtn = document.getElementById('stopAlertBtn');
    if (oldBtn) oldBtn.remove();
    
    const btn = document.createElement('div');
    btn.id = 'stopAlertBtn';
    btn.innerHTML = `
        <div style="background: #8B0000; color: white; padding: 15px 25px; border-radius: 50px; font-size: 18px; font-weight: bold; display: flex; align-items: center; gap: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
            <i class="fas fa-bell-slash"></i>
            إيقاف التنبيه
        </div>
    `;
    btn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        cursor: pointer;
        animation: pulse 0.5s infinite;
    `;
    btn.onclick = () => {
        stopContinuousAlert();
        btn.remove();
    };
    document.body.appendChild(btn);
}

function updateDateTime() {
  const now = new Date();
  const dateEl = document.getElementById('currentDate');
  const timeEl = document.getElementById('currentTime');
  if (dateEl) dateEl.innerText = now.toLocaleDateString('ar-SA');
  if (timeEl) timeEl.innerText = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function showNotificationPermissionButton() {
  if (Notification.permission === 'default') {
    const container = document.getElementById('notificationBtnContainer');
    if (container) container.classList.remove('hidden');
  }
}

async function requestNotificationPermission(showAlert = false) {
  if (!('Notification' in window)) {
    if (showAlert) alert('المتصفح لا يدعم الإشعارات');
    return;
  }
  
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    if (showAlert) alert('✅ تم تفعيل الإشعارات');
    const container = document.getElementById('notificationBtnContainer');
    if (container) container.classList.add('hidden');
  } else if (showAlert) {
    alert('لم يتم تفعيل الإشعارات');
  }
}


function setupRealtime() {
    console.log('📡 setupRealtime started');

    // 1️⃣ منع تشغيل الريل تايم تماماً إذا لم يكن هناك حجز نشط بعد
    if (!currentRequestId) {
        console.log('⏸️ لا يوجد حجز نشط، لن يتم تشغيل Realtime');
        return;
    }

    // دالة داخلية معزولة لبناء القناة والاشتراك بها بعد التأكد من حذف القديمة
    const initializeNewChannel = () => {
        // إنشاء قناة فريدة برقم حجز العميل لضمان الفصل الكامل للاتصالات
        realtimeChannel = supabase.channel(`booking-realtime-${currentRequestId}`);

        // 2️⃣ المستمع المفلتر من جهة السيرفر لجدول الطلبات (تحديثاتك أنت فقط)
        realtimeChannel.on(
            'postgres_changes',
            {
                event: 'UPDATE', 
                schema: 'public',
                table: 'table_requests',
                filter: `id=eq.${currentRequestId}` // 🔥 سرعة فائقة وحماية تامة للبيانات
            },
            async function(payload) {
                console.log('🔥 EVENT RECEIVED VIA REALTIME (table_requests):', payload);
                
                if (payload.new && payload.new.id === currentRequestId) {
                    // تغذية نبض الحارس الصامت وتصفير عداد محاولات الفشل فوراً
                    lastRealtimePulse = Date.now();
                    silentReconnectAttempts = 0;
                    
                    await renderStatusPage(payload.new);
                }
            }
        );

        // 3️⃣ المستمع الخاص بجدول تعيين الطاولات (جلس الحجز أم لا)
        realtimeChannel.on(
            'postgres_changes',
            {
                event: 'UPDATE', 
                schema: 'public',
                table: 'table_assignments'
            },
            async function(payload) {
                console.log('🎯 EVENT RECEIVED VIA REALTIME (table_assignments):', payload);
                
                if (payload.new?.request_id === currentRequestId || payload.old?.request_id === currentRequestId) {
                    console.log('🎯 تحديث في التعيين يخص حجزك');
                    lastRealtimePulse = Date.now();
                    silentReconnectAttempts = 0;
                    await renderStatusPage();
                }
            }
        );

        // 4️⃣ إدارة حالات الاشتراك (تغذية الـ Watchdog ومعالجة الأخطاء)
        realtimeChannel.subscribe(function(status, error) {
            console.log('📡 Realtime status callback:', status);
            
            if (status === 'SUBSCRIBED') {
                console.log('✅ تم الاشتراك بنجاح في الريل تايم للعميل');
                lastRealtimePulse = Date.now();
                silentReconnectAttempts = 0;
            }
            
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn(`⚠️ مشكلة في اتصال الريل تايم [${status}]، بدء محاولة صامتة...`);
                handleSilentReconnect(); // دالة إعادة الاتصال مع الـ Backoff التضاعفي
            }
        });
    };

    // 5️⃣ تفكيك وإغلاق القناة القديمة بشكل متزامن وآمن قبل بدء الجديدة
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
            .then(() => {
                console.log('🗑️ القناة القديمة تم حذفها بنجاح قبل التجديد');
                realtimeChannel = null;
                initializeNewChannel(); // بناء القناة الجديدة فور انتهاء الحذف
            })
            .catch((chErr) => {
                console.error('خطأ أثناء حذف القناة القديمة، المتابعة للبناء على أي حال:', chErr);
                realtimeChannel = null;
                initializeNewChannel(); // المتابعة حتى لو فشل الحذف لضمان عدم توقف الصفحة
            });
    } else {
        // إذا لم تكن هناك قناة مفتوحة أصلاً، نبدأ البناء فوراً
        initializeNewChannel();
    }
}

function updateRestoreModalLanguage() {
  const isEn = bookingPageLang === "en";

  const titleEl = document.getElementById("restoreModalTitle");
  const subEl = document.getElementById("restoreModalSub");
  const codeInput = document.getElementById("restoreCode");
  const phoneInput = document.getElementById("restorePhone");
  const andText = document.getElementById("restoreModalAndText");
  const viewBtn = document.getElementById("restoreViewBtn");
  const closeBtn = document.getElementById("restoreCloseBtn");

  if (titleEl) titleEl.innerText = isEn ? "View Active Booking" : "عرض حجز نشط";
  if (subEl) subEl.innerText = isEn ? "Enter your booking reference and mobile number" : "أدخل رقم الحجز المرجعي و رقم الجوال";
  if (codeInput) codeInput.placeholder = isEn ? "Booking reference, e.g. A4821" : "رقم الحجز المرجعي (مثال: A4821)";
  if (phoneInput) {
    const selectedCountry = restorePhoneInputInstance?.getSelectedCountryData?.();

    if (selectedCountry?.iso2 === "sa") {
      phoneInput.placeholder = isEn
        ? "Enter 0512345678 or 512345678"
        : "اكتب 0512345678 أو 512345678";
    } else {
      phoneInput.placeholder = isEn
        ? "Enter number without country code"
        : "اكتب الرقم بدون مفتاح الدولة";
    }
  }

  updateRestorePhoneCountryHint(phoneInput);
  if (andText) andText.innerText = isEn ? "and" : "و";
  if (viewBtn) viewBtn.innerText = isEn ? "View Booking" : "عرض الحجز";
  if (closeBtn) closeBtn.innerText = isEn ? "Close" : "إغلاق";
}

function openRestoreModal() {
  updateRestoreModalLanguage();
  document.getElementById('restoreModal').classList.add('show');

  setTimeout(function () {
    initRestorePhoneInput();
    bindRestorePreviewResetEvents();
    resetRestoreBookingPreview(true);
    updateRestoreModalLanguage();
  }, 0);
}

function closeRestoreModal() {
  const phoneInput = document.getElementById('restorePhone');

  document.getElementById('restoreModal').classList.remove('show');
  document.getElementById('restoreCode').value = '';

  if (phoneInput) {
    phoneInput.value = '';
    clearRestorePhoneError(phoneInput);
  }

  const hintEl = document.getElementById("restorePhoneCountryHint");
  if (hintEl) {
    hintEl.textContent = "";
    hintEl.style.display = "none";
  }

  resetRestoreBookingPreview(true);
}

async function viewBooking() {
  if (pendingRestoredBooking?.id) {
    await continueRestoredBooking();
    return;
  }

  const bookingCode = document.getElementById('restoreCode')?.value.trim().toUpperCase();
  const phoneInputEl = document.getElementById('restorePhone');
  const phoneValidation = validateAndNormalizeRestorePhone(phoneInputEl);
  const phone = phoneValidation.phone;

  if (!bookingCode) {
    alert(
      bookingPageLang === "en"
        ? "Please enter the booking reference"
        : "الرجاء إدخال رقم الحجز المرجعي"
    );
    return;
  }

  if (!phoneValidation.valid) {
    showRestorePhoneError(phoneInputEl, phoneValidation.message);
    phoneInputEl?.focus();
    return;
  }

  clearRestorePhoneError(phoneInputEl);
  resetRestoreBookingPreview(true);

  const viewBtn = document.getElementById("restoreViewBtn");
  const originalBtnText = viewBtn?.innerText || getRestoreViewButtonDefaultText();

  if (viewBtn) {
    viewBtn.disabled = true;
    viewBtn.innerHTML = `<div class="spinner"></div> ${
      bookingPageLang === "en" ? "Checking..." : "جاري التحقق..."
    }`;
  }

  const { data, error } = await supabase.rpc('view_booking_by_code_and_phone', {
    p_booking_code: bookingCode,
    p_phone: phone,
    p_business_id: currentBusinessId
  });

  if (viewBtn) {
    viewBtn.disabled = false;
    viewBtn.innerText = originalBtnText;
  }

  if (error || !data?.success || !data?.booking) {
    alert(data?.message || '❌ لم يتم العثور على حجز نشط');
    return;
  }

  pendingRestoredBooking = data.booking;
  renderRestoreBookingPreview(pendingRestoredBooking);
}

// Start
async function startBookingPage() {
    app = document.getElementById('app');

    if (!app) {
        console.error("❌ app container not found");
        return;
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);
        // ✅ وضع المشاهدة فقط عبر رابط المشاركة
    const initialUrlParams = new URLSearchParams(window.location.search);
    const viewMode = initialUrlParams.get('view');
    const sharedRequestId = initialUrlParams.get('request_id');

    if (viewMode === 'guest' && sharedRequestId) {
        isGuestViewOnly = true;
        currentRequestId = sharedRequestId;

        console.log('👀 Guest view only mode:', currentRequestId);

        await getBusinessSettings();

        const { data, error } = await supabase.rpc(
            'easyq_public_view_booking_by_request_id_v1',
            {
                p_request_id: currentRequestId
            }
        );

        const request = data?.booking;

        if (
            error ||
            !data?.success ||
            !request ||
            !['waiting', 'offered', 'occupied', 'cleaning', 'completed'].includes(request.status)
        ) {
            console.error('❌ لم يتم العثور على الحجز المشترك:', error || data);
            await renderBookingForm();
            return;
        }

        await renderStatusPage(request);

        setupRealtime();
        startCustomerSafetyPolling();

        return;
    }

    /*
      ✅ أولوية رابط QR / المتابعة:
      إذا الرابط يحتوي ?code=U2481 يجب تجاهل أي حجز قديم محفوظ في localStorage.
      هذا يمنع فتح نموذج الحجز بدل صفحة المتابعة بسبب حجز قديم مخزن.
    */
    const urlParams = new URLSearchParams(window.location.search);
    const bookingCode = String(urlParams.get('code') || '').trim().toUpperCase();

    if (bookingCode) {
        console.log('🔍 محاولة استعادة حجز عبر QR Code:', bookingCode);

        currentRequestId = null;
        currentQueueNumber = null;

        localStorage.removeItem('current_booking_id');
        sessionStorage.removeItem('current_booking_id');
        sessionStorage.setItem('booking_cancelled', 'false');

        const qrBusinessId = String(urlParams.get('business_id') || '').trim();

        if (!qrBusinessId) {
            console.log('⚠️ رابط المتابعة لا يحتوي على business_id');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        currentBusinessId = qrBusinessId;

        if (typeof setCurrentBusinessId === 'function') {
            setCurrentBusinessId(qrBusinessId);
        }

        const { data, error } = await supabase.rpc(
            'easyq_public_view_booking_by_code_v1',
            {
                p_booking_code: bookingCode,
                p_business_id: qrBusinessId
            }
        );

        const request = data?.booking || null;

        if (!error && data?.success && request) {
            currentRequestId = request.id;
            currentQueueNumber = request.queue_position;

            localStorage.setItem('current_booking_id', currentRequestId);
            sessionStorage.setItem('current_booking_id', currentRequestId);
            sessionStorage.setItem('booking_cancelled', 'false');

            console.log('✅ تم استعادة الحجز عبر QR:', currentRequestId);
        } else {
            console.log('⚠️ لم يتم العثور على حجز نشط لهذا الرمز:', {
                bookingCode,
                error,
                data
            });

            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } else {
        // ✅ استعادة الحجز من localStorage فقط إذا لا يوجد code في الرابط
        const savedBookingId = localStorage.getItem('current_booking_id');

        if (savedBookingId && !currentRequestId) {
            currentRequestId = savedBookingId;
            sessionStorage.setItem('booking_cancelled', 'false');
            console.log('🔄 Restored booking ID from localStorage:', currentRequestId);
        }
    }

    await getBusinessSettings();

    if (showCurrentQueueConfig && !currentRequestId) {
        await loadPublicCurrentQueueCount();
    }

    if (currentRequestId) {
        await getCurrentQueueNumber();
    }

    await renderUI();
    // ✅ المكان الموحد والآمن لتشغيل منظومة المزامنة بالكامل بعد اكتمال بناء الصفحة
    if (currentRequestId) {
        setupRealtime();               // استدعاء عادي بدون await لأنها دالة عادية
        startCustomerSafetyPolling();  // تشغيل الحارس الاحتياطي الذكي هنا فوراً وبأمان
    }
    

}
// ========== مستمعي الأحداث ==========
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && currentRequestId) {
        await safeRefreshCustomerStatus('رجوع العميل للصفحة');
        reconnectRealtimeIfNeeded();
    }
});

window.addEventListener('online', async () => {
    if (currentRequestId) {
        await safeRefreshCustomerStatus('عودة الإنترنت');
        reconnectRealtimeIfNeeded();
    }
});
// تأكد من جاهزية الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startBookingPage);
} else {
    startBookingPage();
}


// ========== ربط أزرار مودال التنبيهات ==========
function bindAudioModalButtons() {
    const yesBtn = document.getElementById('enableAudioYes');
    const noBtn = document.getElementById('enableAudioNo');
    
    if (yesBtn) {
        // إزالة أي مستمعين قديمين
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        
        newYesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 تم الضغط على زر نعم (حدث مربوط)');
            window.audioEnabled = true;
            localStorage.setItem('audioEnabled', 'true');
            hideAudioModal();
            playBookingAlert('near');
        });
        console.log('✅ تم ربط زر نعم');
    } else {
        console.log('⚠️ زر نعم غير موجود بعد');
    }
    
    if (noBtn) {
        // إزالة أي مستمعين قديمين
        const newNoBtn = noBtn.cloneNode(true);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);
        
        newNoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 تم الضغط على زر لا (حدث مربوط)');
            window.audioEnabled = false;
            localStorage.setItem('audioEnabled', 'false');
            hideAudioModal();
        });
        console.log('✅ تم ربط زر لا');
    } else {
        console.log('⚠️ زر لا غير موجود بعد');
    }
}

// ========== تحسين دوال المودال ==========
const originalShowAudioModal = showAudioModal;
window.showAudioModal = function() {
    console.log('🔊 showAudioModal تم استدعاؤها');
    bindAudioModalButtons(); // إعادة ربط الأزرار قبل العرض
    originalShowAudioModal();
};

showAudioModal = window.showAudioModal;

// ========== ربط الأزرار عند تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(bindAudioModalButtons, 100);
});

// ========== ربط الأزرار أيضاً عند كل ظهور للمودال ==========
if (typeof showAudioModal === 'function') {
    const originalShow = showAudioModal;
    showAudioModal = function() {
        setTimeout(bindAudioModalButtons, 50);
        originalShow();
    };
}