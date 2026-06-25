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

function eqEscapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function eqGetReservationDateTimeMs(row) {
    if (!row?.reservation_date || !row?.reservation_time) return NaN;

    const timeText = String(row.reservation_time).slice(0, 8);
    const localText = `${row.reservation_date}T${timeText}`;

    return new Date(localText).getTime();
  }

  function eqFormatReservationTime(row) {
    if (!row?.reservation_time) return '';
    return String(row.reservation_time).slice(0, 5);
  }

  function eqEnsureSeatReservationModal() {
    let modal = document.getElementById('seatReservationModal');

    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'seatReservationModal';
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div class="modal-title" id="seatReservationTitle">تعيين حجز</div>
        <div class="modal-sub" id="seatReservationSub"></div>

        <div
          id="seatReservationList"
          style="
            display:flex;
            flex-direction:column;
            gap:10px;
            max-height:55vh;
            overflow:auto;
            margin-top:14px;
          "
        ></div>

        <button
          type="button"
          class="modal-close"
          onclick="closeSeatReservationModal()"
        >
          إغلاق
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  window.closeSeatReservationModal = function closeSeatReservationModal() {
    const modal = document.getElementById('seatReservationModal');
    if (modal) modal.classList.remove('show');
  };

  window.openSeatReservationModal = async function openSeatReservationModal() {
    const table = window.modalTable || (typeof modalTable !== 'undefined' ? modalTable : null);

    if (!table?.id) {
      eqTableActionsAlert(
        'لم يتم العثور على الطاولة المحددة',
        'Selected table was not found'
      );
      return;
    }

    if (table.status !== 'pending') {
      eqTableActionsAlert(
        'تعيين الحجز متاح فقط للطاولات المعلقة',
        'Reservation assignment is only available for pending tables'
      );
      return;
    }

    const modal = eqEnsureSeatReservationModal();
    const titleEl = document.getElementById('seatReservationTitle');
    const subEl = document.getElementById('seatReservationSub');
    const listEl = document.getElementById('seatReservationList');

    if (titleEl) {
      titleEl.textContent = eqTableActionsText('تعيين حجز', 'Assign Reservation');
    }

    if (subEl) {
      subEl.textContent = eqTableActionsText(
        `الطاولة ${table.table_name || ''} — اختر حجزًا خلال ساعتين`,
        `Table ${table.table_name || ''} — choose a reservation within 2 hours`
      );
    }

    if (listEl) {
      listEl.innerHTML = `
        <div style="padding:14px;text-align:center;color:#64748b;font-weight:800;">
          ${eqTableActionsText('جاري تحميل الحجوزات...', 'Loading reservations...')}
        </div>
      `;
    }

    modal.classList.add('show');

    const businessId = window.currentUser?.business_id || table.business_id || null;

    if (!businessId) {
      if (listEl) {
        listEl.innerHTML = `
          <div style="padding:14px;text-align:center;color:#b91c1c;font-weight:900;">
            ${eqTableActionsText('لم يتم العثور على مطعم المستخدم الحالي', 'Current business was not found')}
          </div>
        `;
      }
      return;
    }

    try {
      const today = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const todayText = today.toISOString().slice(0, 10);
      const tomorrowText = tomorrow.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('restaurant_reservations')
        .select(`
          id,
          reservation_code,
          customer_name,
          phone,
          party_size,
          reservation_date,
          reservation_time,
          status,
          assigned_table_id
        `)
        .eq('business_id', businessId)
        .in('status', ['upcoming', 'confirmed', 'table_hold'])
        .is('assigned_table_id', null)
        .gte('reservation_date', todayText)
        .lte('reservation_date', tomorrowText)
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true });

      if (error) {
        console.error('Load reservations for table error:', error);
        if (listEl) {
          listEl.innerHTML = `
            <div style="padding:14px;text-align:center;color:#b91c1c;font-weight:900;">
              ${eqTableActionsText('فشل تحميل الحجوزات', 'Failed to load reservations')}
            </div>
          `;
        }
        return;
      }

      const nowMs = Date.now();
      const twoHoursMs = nowMs + (2 * 60 * 60 * 1000);
      const tableCapacity = Number(table.capacity || 0);

      const rows = (data || []).filter((row) => {
        const reservationMs = eqGetReservationDateTimeMs(row);
        const partySize = Number(row.party_size || 0);

        return (
          Number.isFinite(reservationMs) &&
          reservationMs >= nowMs &&
          reservationMs <= twoHoursMs &&
          partySize > 0 &&
          (!tableCapacity || partySize <= tableCapacity)
        );
      });

      if (!listEl) return;

      if (rows.length === 0) {
        listEl.innerHTML = `
          <div style="padding:14px;text-align:center;color:#64748b;font-weight:900;line-height:1.8;">
            ${eqTableActionsText(
              'لا توجد حجوزات مناسبة خلال الساعتين القادمة لهذه الطاولة',
              'No suitable reservations in the next 2 hours for this table'
            )}
          </div>
        `;
        return;
      }

      listEl.innerHTML = rows.map((row) => {
        const safeId = eqEscapeHtml(row.id);
        const safeName = eqEscapeHtml(row.customer_name || 'ضيف');
        const safeCode = eqEscapeHtml(row.reservation_code || '');
        const safeTime = eqEscapeHtml(eqFormatReservationTime(row));
        const safeParty = eqEscapeHtml(row.party_size || '');
        const safePhone = eqEscapeHtml(row.phone || '');

        return `
          <button
            type="button"
            class="modal-btn"
            onclick="seatReservationOnPendingTable('${safeId}')"
            style="
              width:100%;
              background:#0E146D;
              display:flex;
              flex-direction:column;
              align-items:stretch;
              gap:8px;
              text-align:inherit;
              padding:12px;
              border-radius:14px;
            "
          >
            <span style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
              <strong>${safeName}</strong>
              <strong style="direction:ltr;">${safeTime}</strong>
            </span>

            <span style="display:flex;justify-content:space-between;gap:10px;font-size:12px;opacity:.95;">
              <span><i class="fas fa-user-friends"></i> ${safeParty}</span>
              <span style="direction:ltr;">${safePhone}</span>
            </span>

            <span style="font-size:12px;opacity:.9;direction:ltr;text-align:center;">
              ${safeCode}
            </span>
          </button>
        `;
      }).join('');

    } catch (err) {
      console.error('Unexpected seat reservation modal error:', err);

      if (listEl) {
        listEl.innerHTML = `
          <div style="padding:14px;text-align:center;color:#b91c1c;font-weight:900;">
            ${eqTableActionsText('حدث خطأ أثناء تحميل الحجوزات', 'Unexpected error while loading reservations')}
          </div>
        `;
      }
    }
  };

  window.seatReservationOnPendingTable = async function seatReservationOnPendingTable(reservationId) {
    const table = window.modalTable || (typeof modalTable !== 'undefined' ? modalTable : null);

    if (!table?.id || !reservationId) {
      eqTableActionsAlert(
        'بيانات التعيين غير مكتملة',
        'Assignment data is incomplete'
      );
      return;
    }

    const listEl = document.getElementById('seatReservationList');

    if (listEl) {
      listEl.innerHTML = `
        <div style="padding:14px;text-align:center;color:#64748b;font-weight:900;">
          <i class="fas fa-spinner fa-spin"></i>
          ${eqTableActionsText('جاري تعيين الحجز...', 'Assigning reservation...')}
        </div>
      `;
    }

    const { data, error } = await supabase.rpc('easyq_seat_reservation_on_pending_table_v1', {
      p_table_id: table.id,
      p_reservation_id: reservationId,
      p_business_id: window.currentUser?.business_id || null
    });

    if (error || data?.success === false) {
      console.error('Seat reservation RPC error:', error || data);

      eqTableActionsAlert(
        data?.message || 'فشل تعيين الحجز على الطاولة',
        data?.message || 'Failed to assign reservation to table'
      );

      await window.openSeatReservationModal();
      return;
    }

    window.closeSeatReservationModal();

    if (typeof closeStatusModal === 'function') {
      closeStatusModal();
    } else {
      document.getElementById('statusModal')?.classList.remove('show');
    }

    if (typeof showSuccessNotification === 'function') {
      showSuccessNotification(
        eqTableActionsText('تم تعيين الحجز على الطاولة بنجاح', 'Reservation assigned successfully')
      );
    }

    if (typeof loadAll === 'function') {
      await loadAll();
    }
  };

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
      window.openSeatReservationModal();
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