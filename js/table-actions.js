/* ============================================================
   EASY-Q TABLE ACTIONS
   ملف مستقل لإدارة مظهر وسلوك مودل إجراءات الطاولة فقط

   مهم:
   - لا نستبدل manualStatusChange
   - لا نلمس changeTableStatus
   - لا نلمس renderFloorPlan
   - لا نغير المؤقتات
   - نترك مسار النظام الأصلي يعمل كما كان
   ============================================================ */

(function () {
  'use strict';

  const EQ_TABLE_ACTIONS = {
    allowedStatuses: [
      'available',
      'reserved',
      'occupied',
      'cleaning',
      'pending',
      'disabled'
    ],

    visibleButtonsByStatus: {
      available: [
        'btnPending',
        'btnDisabled'
      ],

      reserved: [
        'btnOccupied',
        'btnCleaning',
        'btnPending',
        'btnSwap'
      ],

      occupied: [
        'btnCleaning',
        'btnSwap'
      ],

      cleaning: [
        'btnAvailable',
        'btnDisabled',
        'btnPending'
      ],

      pending: [
        'btnSwap',
        'btnAssignReservation',
        'btnAvailable',
        'btnDisabled'
      ],

      disabled: [
        'btnAvailable',
        'btnPending'
      ]
    },

    buttonText: {
      btnAvailable: {
        ar: 'متاحة',
        en: 'Available',
        icon: 'fa-check-circle'
      },
      btnReserved: {
        ar: 'محجوزة',
        en: 'Reserved',
        icon: 'fa-clock'
      },
      btnOccupied: {
        ar: 'مشغولة',
        en: 'Occupied',
        icon: 'fa-chair'
      },
      btnCleaning: {
        ar: 'تنظيف',
        en: 'Cleaning',
        icon: 'fa-broom'
      },
      btnDisabled: {
        ar: 'مغلقة',
        en: 'Disabled',
        icon: 'fa-ban'
      },
      btnPending: {
        ar: 'تعليق',
        en: 'Hold',
        icon: 'fa-hourglass-half'
      },
      btnSwap: {
        ar: 'تبديل',
        en: 'Swap',
        icon: 'fa-exchange-alt'
      },
      btnAssignReservation: {
        ar: 'تعيين حجز',
        en: 'Assign Reservation',
        icon: 'fa-calendar-check'
      }
    }
  };

  function eqTableActionsLang() {
    return currentLang === 'ar' ? 'ar' : 'en';
  }

  function eqTableActionsText(arText, enText) {
    return eqTableActionsLang() === 'ar' ? arText : enText;
  }

  function eqTableActionsAlert(arText, enText) {
    if (typeof showAlert === 'function') {
      showAlert(eqTableActionsText(arText, enText));
    } else {
      alert(eqTableActionsText(arText, enText));
    }
  }

  function eqNormalizeStatus(status) {
    const cleanStatus = String(status || 'available').trim();

    return EQ_TABLE_ACTIONS.allowedStatuses.includes(cleanStatus)
      ? cleanStatus
      : 'available';
  }

  function eqUserCanUseTableActions() {
    if (!window.currentUser) return false;
    if (window.currentUser.role === 'super_admin') return false;

    if (typeof window.canDo === 'function') {
      return window.canDo('manage_tables') === true;
    }

    return false;
  }

  function eqSetModalTable(row) {
    if (typeof modalTable !== 'undefined') {
      modalTable = row;
    }

    window.modalTable = row;
  }

  function eqInjectTableActionsStyles() {
    if (document.getElementById('eqTableActionsStyles')) return;

    const style = document.createElement('style');
    style.id = 'eqTableActionsStyles';

    style.textContent = `
      #statusModal .modal-actions {
        gap: 10px !important;
      }

      #statusModal .modal-btn[data-eq-table-action] {
        min-height: 42px !important;
        padding: 9px 13px !important;
        border-radius: 12px !important;
        display: inline-flex;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1.2 !important;
        white-space: nowrap !important;
        position: relative !important;
        overflow: hidden !important;
      }

      #statusModal .modal-btn[data-eq-table-action] i {
        width: 22px !important;
        height: 22px !important;
        min-width: 22px !important;
        border-radius: 8px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(255, 255, 255, 0.92) !important;
        color: #0E146D !important;
        font-size: 12px !important;
        text-shadow: none !important;
        margin: 0 !important;
      }

      #statusModal .modal-btn[data-eq-table-action] span {
        color: #ffffff !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        text-shadow:
          0 1px 1px rgba(0, 0, 0, 0.95),
          1px 0 1px rgba(0, 0, 0, 0.95),
          -1px 0 1px rgba(0, 0, 0, 0.95),
          0 -1px 1px rgba(0, 0, 0, 0.75) !important;
      }

      #statusModal .modal-btn.eq-table-action-loading {
        pointer-events: none !important;
        opacity: 0.82 !important;
        transform: none !important;
      }

      #statusModal .eq-table-action-spinner {
        width: 17px !important;
        height: 17px !important;
        min-width: 17px !important;
        border-radius: 50% !important;
        border: 2px solid rgba(255, 255, 255, 0.55) !important;
        border-top-color: #0E146D !important;
        background: rgba(255, 255, 255, 0.92) !important;
        animation: eqTableActionSpin 0.75s linear infinite !important;
        display: inline-block !important;
      }

      @keyframes eqTableActionSpin {
        to {
          transform: rotate(360deg);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function eqCanShowButtonForStatus(buttonId, currentStatus) {
    const safeStatus = eqNormalizeStatus(currentStatus);
    const visibleButtons = EQ_TABLE_ACTIONS.visibleButtonsByStatus[safeStatus] || [];

    return visibleButtons.includes(buttonId);
  }

  function eqEnsureAssignReservationButton(modal) {
    let btn = document.getElementById('btnAssignReservation');

    if (btn) return btn;

    const actionsWrap = modal?.querySelector('.modal-actions');
    if (!actionsWrap) return null;

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnAssignReservation';
    btn.className = 'modal-btn';
    btn.onclick = function () {
      eqTableActionsAlert(
        'سيتم ربط تعيين الحجوزات في الخطوة التالية',
        'Reservation assignment will be connected in the next step'
      );
    };

    actionsWrap.appendChild(btn);

    return btn;
  }

  function eqSetButtonLoading(btn) {
    if (!btn || btn.classList.contains('eq-table-action-loading')) return;

    btn.classList.add('eq-table-action-loading');
    btn.setAttribute('disabled', 'disabled');

    const icon = btn.querySelector('i');
    if (icon) icon.style.display = 'none';

    const spinner = document.createElement('span');
    spinner.className = 'eq-table-action-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    btn.insertBefore(spinner, btn.firstChild);

    const visibleButtons = Array.from(
      document.querySelectorAll('#statusModal .modal-btn[data-eq-table-action]')
    ).filter(button => button.style.display !== 'none');

    visibleButtons.forEach(button => {
      if (button !== btn) {
        button.setAttribute('disabled', 'disabled');
      }
    });
  }

  function eqAttachLoadingOnly(btn) {
    if (!btn) return;
    if (btn.dataset.eqLoadingAttached === '1') return;

    btn.dataset.eqLoadingAttached = '1';

    btn.addEventListener('click', function () {
      /*
        سبنر بصري فقط.
        لا نمنع manualStatusChange ولا نغلفها.
        نترك onclick الأصلي الموجود في index.html يعمل كما كان.
      */
      eqSetButtonLoading(btn);
    }, true);
  }

  function eqApplyButtonTextsAndVisibility(currentStatus) {
    Object.entries(EQ_TABLE_ACTIONS.buttonText).forEach(([buttonId, config]) => {
      const btn = document.getElementById(buttonId);
      if (!btn) return;

      btn.innerHTML = `
        <i class="fas ${config.icon}"></i>
        <span>${eqTableActionsLang() === 'ar' ? config.ar : config.en}</span>
      `;

      btn.style.display = eqCanShowButtonForStatus(buttonId, currentStatus)
        ? 'inline-flex'
        : 'none';

      btn.removeAttribute('disabled');
      btn.classList.remove('eq-table-action-loading');
      btn.setAttribute('data-eq-table-action', buttonId);

      eqAttachLoadingOnly(btn);
    });
  }

  window.openStatusModal = function openStatusModal(row) {
    const modal = document.getElementById('statusModal');
    if (!modal) return;

    eqInjectTableActionsStyles();

    if (!eqUserCanUseTableActions()) {
      eqTableActionsAlert(
        'ليس لديك صلاحية لتنفيذ إجراءات الطاولة',
        'You do not have permission to use table actions'
      );
      return;
    }

    if (!row || !row.id) {
      eqTableActionsAlert(
        'لم يتم العثور على بيانات الطاولة',
        'Table data was not found'
      );
      return;
    }

    const currentStatus = eqNormalizeStatus(row.status);

    eqSetModalTable(row);
    eqEnsureAssignReservationButton(modal);
    eqApplyButtonTextsAndVisibility(currentStatus);

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
      modalTitle.textContent = eqTableActionsText('إجراءات الطاولة', 'Table Actions');
    }

    const modalSub = document.getElementById('modalSub');
    if (modalSub) {
      const tableName = row.table_name || '';
      const statusLabel = typeof getStatusLabel === 'function'
        ? getStatusLabel(currentStatus)
        : currentStatus;

      modalSub.textContent = `${tableName} - ${statusLabel}`;
    }

    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) {
      closeBtn.textContent = eqTableActionsText('إغلاق', 'Close');
    }

    modal.classList.add('show');
  };

  window.EQ_TABLE_ACTIONS = EQ_TABLE_ACTIONS;
})();