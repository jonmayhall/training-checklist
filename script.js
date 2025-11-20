// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Training Tables, Add Buttons, Support Tickets, Clear Page, Clear All, PDF
// =======================================================

window.addEventListener('DOMContentLoaded', () => {
  /* =========================================
     SIDEBAR NAVIGATION
  ========================================= */
  const nav = document.getElementById('sidebar-nav');
  const sections = document.querySelectorAll('.page-section');

  if (nav && sections.length) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;

      const targetId = btn.dataset.target;
      const targetSection = document.getElementById(targetId);
      if (!targetSection) return;

      // nav active state
      nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // section active state
      sections.forEach(sec => sec.classList.remove('active'));
      targetSection.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =========================================
     TABLE "+" BUTTONS (TRAINING TABLES)
  ========================================= */
  document.querySelectorAll('.table-footer .add-row').forEach(btn => {
    if (btn.dataset.boundAddRow) return;
    btn.dataset.boundAddRow = '1';

    btn.addEventListener('click', () => {
      const tableContainer = btn.closest('.table-container');
      if (!tableContainer) return;

      const table = tableContainer.querySelector('table.training-table');
      if (!table || !table.tBodies.length) return;

      const tbody = table.tBodies[0];
      if (!tbody.rows.length) return;

      const lastRow = tbody.rows[tbody.rows.length - 1];
      const newRow = lastRow.cloneNode(true);

      // reset inputs/selects
      newRow.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox') {
          el.checked = false;
        } else {
          el.value = '';
        }
      });

      tbody.appendChild(newRow);
    });
  });

  /* =========================================
     ADDITIONAL POC – CLONE ENTIRE CARD
  ========================================= */
  const additionalPocContainer = document.getElementById('additionalPocContainer');
  if (additionalPocContainer) {
    additionalPocContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-row');
      if (!btn) return;

      const card = btn.closest('.poc-card');
      if (!card) return;

      const newCard = card.cloneNode(true);
      newCard.querySelectorAll('input').forEach(inp => { inp.value = ''; });

      additionalPocContainer.appendChild(newCard);
    });
  }

  /* =========================================
     GENERIC INTEGRATED "+" BUTTONS
     (NOT Support Tickets, NOT Additional POC, NOT tables)
     - Adds ONE new row per click
     - New row is a normal rounded textbox the same width
  ========================================= */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    // skip support-ticket page (handled separately)
    if (btn.closest('#support-ticket')) return;
    // skip Additional POC card (handled above)
    if (btn.closest('.poc-card')) return;
    // skip table footers (already handled)
    if (btn.closest('.table-footer')) return;

    if (btn.dataset.boundGenericPlus) return;
    btn.dataset.boundGenericPlus = '1';

    btn.addEventListener('click', () => {
      const sourceRow = btn.closest('.checklist-row');
      if (!sourceRow) return;

      const parent = sourceRow.parentElement;
      if (!parent) return;

      // find the main input in this integrated row
      const srcInput = sourceRow.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      if (!srcInput) return;

      // clone the row but strip the "+" button & "integrated-plus" styling
      const newRow = sourceRow.cloneNode(true);
      newRow.classList.remove('integrated-plus');

      // remove the cloned add button
      const clonedBtn = newRow.querySelector('.add-row');
      if (clonedBtn) clonedBtn.remove();

      // clear inputs/selects/textarea
      newRow.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      // remove label text so additional lines are visually "under" the main label
      const label = newRow.querySelector('label');
      if (label) label.textContent = '';

      // append at the end of this block, so new lines are stacked under
      parent.appendChild(newRow);
    });
  });

  /* =========================================
     SUPPORT TICKETS – MOVE BETWEEN CARDS
     & "+" TO ADD NEW TICKET
  ========================================= */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  let baseTicketTemplate = null;

  if (supportSection && openTicketsContainer) {
    // Capture a clean template from the first ticket group
    const firstTicket = openTicketsContainer.querySelector('.ticket-group');
    if (firstTicket) {
      baseTicketTemplate = firstTicket.cloneNode(true);
      // clear template values
      baseTicketTemplate.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      const statusSelect = baseTicketTemplate.querySelector('.ticket-status-select');
      if (statusSelect) statusSelect.value = 'Open';
    }

    // helper to attach change handler for status dropdowns
    function attachTicketStatusHandlers(scope) {
      if (!scope) return;
      scope.querySelectorAll('.ticket-status-select').forEach(select => {
        if (select.dataset.boundTicketStatus) return;
        select.dataset.boundTicketStatus = '1';

        select.addEventListener('change', () => {
          const group = select.closest('.ticket-group');
          if (!group) return;

          const value = select.value;

          if (value === 'Tier Two') {
            if (tierTwoTicketsContainer) tierTwoTicketsContainer.appendChild(group);
          } else if (value === 'Closed - Resolved') {
            if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.appendChild(group);
          } else if (value === 'Closed – Feature Not Supported') { // NOTE: en dash
            if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.appendChild(group);
          } else {
            if (openTicketsContainer) openTicketsContainer.appendChild(group);
          }

          ensureDefaultOpenTicket();
        });
      });
    }

    // create a new ticket group from template
    function createNewTicketGroup() {
      if (!baseTicketTemplate) return null;
      const clone = baseTicketTemplate.cloneNode(true);

      // clear values again just to be safe
      clone.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      const statusSelect = clone.querySelector('.ticket-status-select');
      if (statusSelect) statusSelect.value = 'Open';

      attachTicketStatusHandlers(clone);
      return clone;
    }

    // Ensure at least one open ticket exists at all times
    function ensureDefaultOpenTicket() {
      if (!openTicketsContainer) return;
      const groups = openTicketsContainer.querySelectorAll('.ticket-group');
      if (groups.length === 0) {
        const fresh = createNewTicketGroup();
        if (fresh) openTicketsContainer.appendChild(fresh);
      }
    }

    // Initial binding for existing tickets
    attachTicketStatusHandlers(supportSection);
    ensureDefaultOpenTicket();

    // "+" on the Support Ticket Number row should add ONE new ticket to Open
    if (openTicketsContainer) {
      openTicketsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-row');
        if (!btn) return;

        const group = btn.closest('.ticket-group');
        if (!group) return;

        const newGroup = group.cloneNode(true);
        // clear text fields in the clone
        newGroup.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
        const statusSelect = newGroup.querySelector('.ticket-status-select');
        if (statusSelect) statusSelect.value = 'Open';

        openTicketsContainer.appendChild(newGroup);
        attachTicketStatusHandlers(newGroup);
      });
    }
  }

  /* =========================================
     CLEAR PAGE BUTTONS (PER PAGE)
  ========================================= */
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    if (btn.dataset.boundClearPage) return;
    btn.dataset.boundClearPage = '1';

    btn.addEventListener('click', () => {
      const page = btn.closest('.page-section');
      if (!page) return;

      const confirmReset = window.confirm(
        'This will clear all fields on this page. This cannot be undone. Continue?'
      );
      if (!confirmReset) return;

      // clear inputs
      page.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
      });

      // clear selects
      page.querySelectorAll('select').forEach(sel => { sel.selectedIndex = 0; });

      // clear textareas
      page.querySelectorAll('textarea').forEach(area => { area.value = ''; });

      // special reset for support ticket page
      if (page.id === 'support-ticket' && openTicketsContainer) {
        // remove all ticket-groups
        openTicketsContainer.innerHTML = '';
        if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
        if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.innerHTML = '';
        if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.innerHTML = '';

        // recreate default open ticket
        const fresh = baseTicketTemplate ? createNewTicketGroup() : null;
        if (fresh) openTicketsContainer.appendChild(fresh);
      }
    });
  });

  /* =========================================
     CLEAR ALL BUTTON (GLOBAL)
  ========================================= */
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn && !clearAllBtn.dataset.boundClearAll) {
    clearAllBtn.dataset.boundClearAll = '1';

    clearAllBtn.addEventListener('click', () => {
      const first = window.confirm(
        'This will clear ALL fields on ALL pages of this checklist. This cannot be undone. Continue?'
      );
      if (!first) return;

      const second = window.confirm(
        'Last check: Are you sure you want to erase EVERYTHING on all pages?'
      );
      if (!second) return;

      // clear all inputs
      document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
      });

      // clear all selects
      document.querySelectorAll('select').forEach(sel => { sel.selectedIndex = 0; });

      // clear all textareas
      document.querySelectorAll('textarea').forEach(area => { area.value = ''; });

      // reset support tickets containers
      if (openTicketsContainer) openTicketsContainer.innerHTML = '';
      if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
      if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.innerHTML = '';
      if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.innerHTML = '';

      if (openTicketsContainer && baseTicketTemplate) {
        const fresh = createNewTicketGroup();
        if (fresh) openTicketsContainer.appendChild(fresh);
      }
    });
  }

  /* =========================================
     SAVE AS PDF (TRAINING SUMMARY)
  ========================================= */
  const saveBtn = document.getElementById('savePDF');
  if (saveBtn && !saveBtn.dataset.boundSavePdf) {
    saveBtn.dataset.boundSavePdf = '1';

    saveBtn.addEventListener('click', async () => {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        alert('PDF library not loaded.');
        return;
      }
      const doc = new jsPDF('p', 'pt', 'a4');
      const pages = document.querySelectorAll('.page-section');

      const marginX = 30;
      const marginY = 30;
      const maxWidth = 535;
      let first = true;

      pages.forEach(page => {
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
      });

      doc.save('Training_Summary.pdf');
    });
  }
});
