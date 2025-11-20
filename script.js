// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Training Tables, Support Tickets, Clear Page, Clear All, PDF
// =======================================================

window.addEventListener('DOMContentLoaded', () => {
  /* =====================================================
     SIDEBAR NAVIGATION
     ===================================================== */
  const nav = document.getElementById('sidebar-nav');
  const sections = document.querySelectorAll('.page-section');

  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;

      // Highlight active nav
      nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Swap page
      sections.forEach(sec => sec.classList.remove('active'));
      target.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =====================================================
     TRAINING TABLE – ADD ROW BUTTONS
     ===================================================== */
  document.querySelectorAll('.table-footer .add-row').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.closest('.section');
      if (!section) return;
      const table = section.querySelector('table.training-table');
      if (!table) return;

      const tbody = table.tBodies[0];
      if (!tbody || !tbody.rows.length) return;

      const rowToClone = tbody.rows[tbody.rows.length - 1];
      const newRow = rowToClone.cloneNode(true);

      newRow.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
    });
  });

  /* =====================================================
     SUPPORT TICKETS – SETUP
     ===================================================== */

  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  // Headers for counts
  let openHeader, tierHeader, closedResolvedHeader, closedFeatureHeader;
  let ticketTemplate = null; // base template for new tickets

  if (supportSection) {
    const headers = supportSection.querySelectorAll('h2');
    if (headers.length >= 4) {
      [openHeader, tierHeader, closedResolvedHeader, closedFeatureHeader] = headers;
      [openHeader, tierHeader, closedResolvedHeader, closedFeatureHeader].forEach(h => {
        if (h && !h.dataset.baseTitle) {
          h.dataset.baseTitle = h.textContent.replace(/\s*\(\d+\)\s*$/, '');
        }
      });
    }
  }

  function normalizeTicketStatus(text) {
    if (!text) return 'open';
    let t = text.toLowerCase().trim();
    t = t.replace(/\s+/g, ' ');
    // Robust mapping: just look for keywords
    if (t.includes('tier two')) return 'tierTwo';
    if (t.includes('feature')) return 'closedFeature';
    if (t.includes('resolved')) return 'closedResolved';
    return 'open';
  }

  function resetTicketGroup(group, isDefaultOpen) {
    if (!group) return;
    group.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], textarea')
      .forEach(el => { el.value = ''; });

    const statusSelect = group.querySelector('.ticket-status-select');
    if (statusSelect) {
      statusSelect.value = 'Open';
    }

    // Add-button visibility: only the main default Open ticket shows the +
    const addBtn = group.querySelector('.checklist-row.integrated-plus .add-row');
    if (addBtn) {
      addBtn.style.display = isDefaultOpen ? 'inline-flex' : 'none';
    }
  }

  function updateTicketCounts() {
    if (!supportSection) return;

    const openCount = openTicketsContainer
      ? openTicketsContainer.querySelectorAll('.ticket-group').length
      : 0;
    const tierCount = tierTwoTicketsContainer
      ? tierTwoTicketsContainer.querySelectorAll('.ticket-group').length
      : 0;
    const closedResCount = closedResolvedTicketsContainer
      ? closedResolvedTicketsContainer.querySelectorAll('.ticket-group').length
      : 0;
    const closedFeatCount = closedFeatureTicketsContainer
      ? closedFeatureTicketsContainer.querySelectorAll('.ticket-group').length
      : 0;

    if (openHeader && openHeader.dataset.baseTitle) {
      openHeader.textContent = `${openHeader.dataset.baseTitle} (${openCount})`;
    }
    if (tierHeader && tierHeader.dataset.baseTitle) {
      tierHeader.textContent = `${tierHeader.dataset.baseTitle} (${tierCount})`;
    }
    if (closedResolvedHeader && closedResolvedHeader.dataset.baseTitle) {
      closedResolvedHeader.textContent = `${closedResolvedHeader.dataset.baseTitle} (${closedResCount})`;
    }
    if (closedFeatureHeader && closedFeatureHeader.dataset.baseTitle) {
      closedFeatureHeader.textContent = `${closedFeatureHeader.dataset.baseTitle} (${closedFeatCount})`;
    }
  }

  function attachTicketStatusHandlers(scope) {
    if (!scope) return;
    const selects = scope.querySelectorAll('.ticket-status-select');
    selects.forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        if (!group) return;

        const statusKey = normalizeTicketStatus(select.value);
        const hasAddButton = !!group.querySelector('.checklist-row.integrated-plus .add-row');

        let targetContainer = openTicketsContainer;
        if (statusKey === 'tierTwo') {
          targetContainer = tierTwoTicketsContainer;
        } else if (statusKey === 'closedResolved') {
          targetContainer = closedResolvedTicketsContainer;
        } else if (statusKey === 'closedFeature') {
          targetContainer = closedFeatureTicketsContainer;
        }

        // If moving the main Open card that has the + button, create a fresh default in Open
        if (hasAddButton && statusKey !== 'open') {
          if (openTicketsContainer) {
            const replacement = group.cloneNode(true);
            resetTicketGroup(replacement, true); // new default Open with +
            openTicketsContainer.insertBefore(replacement, openTicketsContainer.firstChild);
            attachTicketStatusHandlers(replacement);
          }

          // Hide + on the moved card
          const btn = group.querySelector('.checklist-row.integrated-plus .add-row');
          if (btn) btn.style.display = 'none';
        }

        if (targetContainer && targetContainer !== group.parentElement) {
          targetContainer.appendChild(group);
        }

        updateTicketCounts();
      });
    });
  }

  function initSupportTickets() {
    if (!supportSection || !openTicketsContainer) return;

    let first = openTicketsContainer.querySelector('.ticket-group');
    if (!ticketTemplate && first) {
      ticketTemplate = first.cloneNode(true);
    }

    if (!first && ticketTemplate) {
      first = ticketTemplate.cloneNode(true);
      openTicketsContainer.appendChild(first);
    }

    if (first) {
      resetTicketGroup(first, true); // default Open card with +
      attachTicketStatusHandlers(first);
    }

    // Attach handlers to any existing groups in other containers (just in case)
    if (tierTwoTicketsContainer) attachTicketStatusHandlers(tierTwoTicketsContainer);
    if (closedResolvedTicketsContainer) attachTicketStatusHandlers(closedResolvedTicketsContainer);
    if (closedFeatureTicketsContainer) attachTicketStatusHandlers(closedFeatureTicketsContainer);

    updateTicketCounts();
  }

  function supportAddNewTicket() {
    if (!openTicketsContainer) return;

    // Ensure we have a template
    if (!ticketTemplate) {
      const base = openTicketsContainer.querySelector('.ticket-group')
        || supportSection?.querySelector('.ticket-group');
      if (!base) return;
      ticketTemplate = base.cloneNode(true);
    }

    const newGroup = ticketTemplate.cloneNode(true);
    // New tickets created by + are regular tickets (no + button visible)
    resetTicketGroup(newGroup, false);
    openTicketsContainer.appendChild(newGroup);
    attachTicketStatusHandlers(newGroup);
    updateTicketCounts();
  }

  function resetSupportTicketsPage() {
    if (!supportSection) return;

    // Clear containers
    [openTicketsContainer, tierTwoTicketsContainer,
     closedResolvedTicketsContainer, closedFeatureTicketsContainer]
      .forEach(container => {
        if (container) container.innerHTML = '';
      });

    // Re-init a single fresh Open card
    initSupportTickets();
  }

  if (supportSection) {
    initSupportTickets();
  }

  /* =====================================================
     GENERIC ADD BUTTONS (integrated-plus rows)
     - Special case for OPEN SUPPORT TICKETS
     ===================================================== */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) SUPPORT TICKETS – only Open Support Tickets card has + behavior
      if (btn.closest('#support-ticket') && btn.closest('#openTicketsContainer')) {
        supportAddNewTicket();
        return;
      }

      // 2) All other integrated-plus text boxes:
      //    clone the row, remove + on the clone, insert BELOW as full-width rounded field
      const row = btn.closest('.checklist-row');
      const block = btn.closest('.section-block');
      if (!row || !block) return;

      const originalInput = row.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      if (!originalInput) return;

      const newRow = row.cloneNode(true);

      // Remove add button from the new row
      const newBtn = newRow.querySelector('.add-row');
      if (newBtn) newBtn.remove();

      // Remove integrated-plus class so CSS treats it as a normal row
      newRow.classList.remove('integrated-plus');

      // Clear and restore input style (full rounded right side)
      newRow.querySelectorAll('input[type="text"], input[type="number"], input[type="email"]').forEach(el => {
        el.value = '';
        el.style.marginTop = '6px';
        el.style.borderTopRightRadius = '14px';
        el.style.borderBottomRightRadius = '14px';
      });

      // Insert new row directly after current row
      row.insertAdjacentElement('afterend', newRow);
    });
  });

  /* =====================================================
     CLEAR PAGE BUTTONS (per-page reset)
     ===================================================== */
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.closest('.page-section');
      if (!page) return;

      const confirmReset = window.confirm(
        'This will clear all fields on this page. This cannot be undone. Continue?'
      );
      if (!confirmReset) return;

      // Clear all inputs
      page.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      // Clear all selects
      page.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      // Clear all textareas
      page.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });

      // Special handling for Support Ticket page:
      if (page.id === 'support-ticket') {
        resetSupportTicketsPage();
      }
    });
  });

  /* =====================================================
     CLEAR ALL BUTTON (global reset with double confirmation)
     ===================================================== */
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const first = window.confirm(
        'This will clear ALL fields on ALL pages of this checklist. This cannot be undone. Continue?'
      );
      if (!first) return;

      const second = window.confirm(
        'Last check: Are you sure you want to erase EVERYTHING on all pages?'
      );
      if (!second) return;

      // 1) Clear every input
      document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      // 2) Clear every select
      document.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      // 3) Clear every textarea
      document.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });

      // 4) Reset Support Tickets separately
      if (supportSection) {
        resetSupportTicketsPage();
      }

      // NOTE: we do NOT remove extra rows from training tables;
      // we only clear their contents to avoid breaking structure.
    });
  }

  /* =====================================================
     SAVE AS PDF (Training Summary Page)
     ===================================================== */
  const saveBtn = document.getElementById('savePDF');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const pages = document.querySelectorAll('.page-section');

      const marginX = 30, marginY = 30, maxWidth = 535;
      let first = true;

      for (const page of pages) {
        if (!first) doc.addPage();
        first = false;

        const title = page.querySelector('h1')?.innerText || 'Section';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, marginX, marginY);

        const text = page.innerText.replace(/\s+\n/g, '\n').trim();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, marginX, marginY + 24);
      }

      doc.save('Training_Summary.pdf');
    });
  }
});
