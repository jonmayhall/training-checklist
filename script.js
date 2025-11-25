// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Training Tables, Add Buttons, Support Tickets,
// Clear Page, Clear All, PDF, and Reset Logic
// =======================================================

window.addEventListener('DOMContentLoaded', () => {
  /* =====================================================
     SNAPSHOT ORIGINAL PAGE CONTENT FOR RESETS
  ===================================================== */
  const originalSections = {};
  document.querySelectorAll('.page-section').forEach(sec => {
    if (sec.id) {
      originalSections[sec.id] = sec.innerHTML;
    }
  });

  /* =====================================================
     SIDEBAR NAVIGATION
  ===================================================== */
  const nav = document.getElementById('sidebar-nav');

  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;

      const targetId = btn.dataset.target;
      const targetSection = document.getElementById(targetId);
      if (!targetSection) return;

      // Update active nav styling
      nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Swap visible page
      document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
      targetSection.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =====================================================
     SUPPORT TICKET HEADER COUNT HANDLING
  ===================================================== */
  const ticketHeaders = {
    open: document.querySelector('#openTicketsContainer')?.closest('.section-block')?.querySelector('h2') || null,
    tierTwo: document.querySelector('#tierTwoTicketsContainer')?.closest('.section-block')?.querySelector('h2') || null,
    closedResolved: document.querySelector('#closedResolvedTicketsContainer')?.closest('.section-block')?.querySelector('h2') || null,
    closedFeature: document.querySelector('#closedFeatureTicketsContainer')?.closest('.section-block')?.querySelector('h2') || null
  };

  const ticketHeaderBase = {};
  Object.keys(ticketHeaders).forEach(key => {
    if (ticketHeaders[key]) {
      ticketHeaderBase[key] = ticketHeaders[key].textContent.trim();
    }
  });

  function updateTicketCounts() {
    const openContainer = document.getElementById('openTicketsContainer');
    const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
    const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
    const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

    if (ticketHeaders.open && ticketHeaderBase.open) {
      const count = openContainer ? openContainer.querySelectorAll('.ticket-group').length : 0;
      ticketHeaders.open.textContent = `${ticketHeaderBase.open} (${count})`;
    }

    if (ticketHeaders.tierTwo && ticketHeaderBase.tierTwo) {
      const count = tierTwoContainer ? tierTwoContainer.querySelectorAll('.ticket-group').length : 0;
      ticketHeaders.tierTwo.textContent = `${ticketHeaderBase.tierTwo} (${count})`;
    }

    if (ticketHeaders.closedResolved && ticketHeaderBase.closedResolved) {
      const count = closedResolvedContainer ? closedResolvedContainer.querySelectorAll('.ticket-group').length : 0;
      ticketHeaders.closedResolved.textContent = `${ticketHeaderBase.closedResolved} (${count})`;
    }

    if (ticketHeaders.closedFeature && ticketHeaderBase.closedFeature) {
      const count = closedFeatureContainer ? closedFeatureContainer.querySelectorAll('.ticket-group').length : 0;
      ticketHeaders.closedFeature.textContent = `${ticketHeaderBase.closedFeature} (${count})`;
    }
  }

  // Capture a default ticket template for re-creating blank open tickets
  let defaultOpenTicketTemplate = null;
  const initialOpenTicket = document.querySelector('#openTicketsContainer .ticket-group');
  if (initialOpenTicket) {
    defaultOpenTicketTemplate = initialOpenTicket.cloneNode(true);
  }

  function normalizeOpenTicketAddButtons() {
    const openContainer = document.getElementById('openTicketsContainer');
    if (!openContainer) return;

    const groups = openContainer.querySelectorAll('.ticket-group');
    groups.forEach((group, index) => {
      const plusBtn = group.querySelector('.checklist-row.integrated-plus .add-row');
      if (plusBtn) {
        if (index === 0) {
          plusBtn.style.display = '';
          plusBtn.disabled = false;
        } else {
          plusBtn.remove();
        }
      }
    });
  }

  function ensureDefaultOpenTicket() {
    const openContainer = document.getElementById('openTicketsContainer');
    if (!openContainer) return;

    const existing = openContainer.querySelectorAll('.ticket-group');
    if (existing.length === 0 && defaultOpenTicketTemplate) {
      const newGroup = defaultOpenTicketTemplate.cloneNode(true);

      // Clear inputs
      newGroup.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => {
        el.value = '';
      });

      const select = newGroup.querySelector('.ticket-status-select');
      if (select) {
        select.value = 'Open';
      }

      openContainer.appendChild(newGroup);
    }
  }

  function handleTicketStatusChange(select) {
    const group = select.closest('.ticket-group');
    if (!group) return;

    const status = select.value;
    const openContainer = document.getElementById('openTicketsContainer');
    const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
    const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
    const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

    let target = openContainer;

    if (status === 'Tier Two') {
      target = tierTwoContainer;
    } else if (status === 'Closed - Resolved') {
      target = closedResolvedContainer;
    } else if (status === 'Closed – Feature Not Supported') {
      target = closedFeatureContainer;
    }

    if (target) {
      target.appendChild(group);
    }

    ensureDefaultOpenTicket();
    normalizeOpenTicketAddButtons();
    updateTicketCounts();
  }

  // Run once on load
  ensureDefaultOpenTicket();
  normalizeOpenTicketAddButtons();
  updateTicketCounts();

  /* =====================================================
     TRAINING TABLE: ADD ROW (+) via DELEGATION
  ===================================================== */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.table-footer .add-row');
    if (!btn) return;

    const section = btn.closest('.section');
    if (!section) return;
    const table = section.querySelector('table.training-table');
    if (!table || !table.tBodies.length) return;

    const tbody = table.tBodies[0];
    if (!tbody.rows.length) return;

    const lastRow = tbody.rows[tbody.rows.length - 1];
    const newRow = lastRow.cloneNode(true);

    // Clear all fields in the cloned row
    newRow.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'checkbox') {
        el.checked = false;
      } else {
        el.value = '';
      }
    });

    tbody.appendChild(newRow);
  });

  /* =====================================================
     GENERIC + BUTTONS FOR TEXT ROWS (INTEGRATED-PLUS)
  ===================================================== */
  function handleGenericPlusRow(plusBtn) {
    const row = plusBtn.closest('.checklist-row.integrated-plus');
    if (!row) return;

    // Clone the entire row so label + input + styling remain
    const rowClone = row.cloneNode(true);

    // Clear values in the clone
    rowClone.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'checkbox') {
        el.checked = false;
      } else {
        el.value = '';
      }
    });

    // Remove the plus button from the new row so only the original row keeps "+";
    const clonePlus = rowClone.querySelector('.add-row');
    if (clonePlus) clonePlus.remove();

    // Insert new row AFTER the current row so it becomes a new line under it
    row.parentNode.insertBefore(rowClone, row.nextSibling);
  }

  /* =====================================================
     SUPPORT TICKET: ADD NEW TICKET FROM OPEN CARD
  ===================================================== */
  function handleAddSupportTicket(plusBtn) {
    const group = plusBtn.closest('.ticket-group');
    const openContainer = document.getElementById('openTicketsContainer');
    if (!group || !openContainer) return;

    const newGroup = group.cloneNode(true);

    // Clear values in the clone
    newGroup.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => {
      el.value = '';
    });
    const select = newGroup.querySelector('.ticket-status-select');
    if (select) {
      select.value = 'Open';
    }

    // Remove the "+" in the cloned group – only top / original has it
    const newPlus = newGroup.querySelector('.checklist-row.integrated-plus .add-row');
    if (newPlus) {
      newPlus.remove();
    }

    openContainer.appendChild(newGroup);
    normalizeOpenTicketAddButtons();
    updateTicketCounts();
  }

  /* =====================================================
     CLICK DELEGATION FOR ALL .add-row BUTTONS
  ===================================================== */
  document.addEventListener('click', (e) => {
    const plusBtn = e.target.closest('.add-row');
    if (!plusBtn) return;

    // 1) Support Tickets – Open card "Support Ticket Number" +
    if (plusBtn.closest('#support-ticket') && plusBtn.closest('.ticket-group')) {
      handleAddSupportTicket(plusBtn);
      return;
    }

    // 2) Everything else that uses integrated-plus rows (Trainers, POC, Champions etc.)
    handleGenericPlusRow(plusBtn);
  });

  /* =====================================================
     SUPPORT TICKET STATUS CHANGE (MOVE BETWEEN CARDS)
  ===================================================== */
  document.addEventListener('change', (e) => {
    const select = e.target.closest('.ticket-status-select');
    if (!select) return;
    handleTicketStatusChange(select);
  });

  /* =====================================================
     CLEAR PAGE BUTTONS (RESET THIS PAGE)
  ===================================================== */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.clear-page-btn');
    if (!btn) return;

    const page = btn.closest('.page-section');
    if (!page || !page.id) return;

    const confirmReset = window.confirm(
      'This will clear all fields on this page and reset it to the default layout. This cannot be undone. Continue?'
    );
    if (!confirmReset) return;

    const originalHTML = originalSections[page.id];
    if (originalHTML != null) {
      page.innerHTML = originalHTML;
    }

    // After replacing innerHTML, make sure support ticket counts stay correct
    if (page.id === 'support-ticket') {
      // Re-establish default ticket template from the reset content
      const newInitial = document.querySelector('#openTicketsContainer .ticket-group');
      if (newInitial) {
        defaultOpenTicketTemplate = newInitial.cloneNode(true);
      }
      ensureDefaultOpenTicket();
      normalizeOpenTicketAddButtons();
      updateTicketCounts();
    }
  });

  /* =====================================================
     CLEAR ALL BUTTON (GLOBAL RESET)
  ===================================================== */
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const first = window.confirm(
        'This will clear ALL fields on ALL pages and reset everything to the default layout. This cannot be undone. Continue?'
      );
      if (!first) return;

      const second = window.confirm(
        'Last check: Are you sure you want to erase EVERYTHING and reset all pages?'
      );
      if (!second) return;

      // Reset every page-section to its original HTML snapshot
      Object.keys(originalSections).forEach(id => {
        const sec = document.getElementById(id);
        if (sec && originalSections[id] != null) {
          sec.innerHTML = originalSections[id];
        }
      });

      // Rebuild default ticket template & counts
      const newInitial = document.querySelector('#openTicketsContainer .ticket-group');
      if (newInitial) {
        defaultOpenTicketTemplate = newInitial.cloneNode(true);
      }
      ensureDefaultOpenTicket();
      normalizeOpenTicketAddButtons();
      updateTicketCounts();

      // Return user to first page
      const allSections = document.querySelectorAll('.page-section');
      const firstSection = allSections[0];
      if (firstSection) {
        allSections.forEach(sec => sec.classList.remove('active'));
        firstSection.classList.add('active');
      }

      if (nav) {
        const firstBtn = nav.querySelector('.nav-btn');
        if (firstBtn) {
          nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          firstBtn.classList.add('active');
        }
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =====================================================
     SAVE AS PDF (TRAINING SUMMARY)
  ===================================================== */
  const saveBtn = document.getElementById('savePDF');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');

      const marginX = 30;
      const marginY = 30;
      const maxWidth = 535;

      const pages = document.querySelectorAll('.page-section');
      let firstPage = true;

      pages.forEach(page => {
        if (!firstPage) {
          doc.addPage();
        }
        firstPage = false;

        const title = page.querySelector('h1')?.innerText || 'Section';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, marginX, marginY);

        const text = page.innerText.replace(/\s+\n/g, '\n').trim();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, marginX, marginY + 24);
      });

      doc.save('Training_Summary.pdf');
    });
  }
});
