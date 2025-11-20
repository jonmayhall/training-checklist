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

      nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      sections.forEach(sec => sec.classList.remove('active'));
      targetSection.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =========================================
     TRAINING TABLE "+" BUTTONS
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

      newRow.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
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
  ========================================= */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    // skip support-ticket page (custom logic)
    if (btn.closest('#support-ticket')) return;
    // skip Additional POC cards (custom logic)
    if (btn.closest('.poc-card')) return;
    // skip table footers (handled above)
    if (btn.closest('.table-footer')) return;

    if (btn.dataset.boundGenericPlus) return;
    btn.dataset.boundGenericPlus = '1';

    btn.addEventListener('click', () => {
      const sourceRow = btn.closest('.checklist-row');
      if (!sourceRow) return;

      const parent = sourceRow.parentElement;
      if (!parent) return;

      const srcInput = sourceRow.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      if (!srcInput) return;

      // Clone the row, remove the +, and treat it as a plain text row
      const newRow = sourceRow.cloneNode(true);
      newRow.classList.remove('integrated-plus');

      const clonedBtn = newRow.querySelector('.add-row');
      if (clonedBtn) clonedBtn.remove();

      newRow.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      const label = newRow.querySelector('label');
      if (label) label.textContent = '';

      parent.appendChild(newRow);
    });
  });

  /* =========================================
     SUPPORT TICKETS
     - Move cards between four sections based on dropdown
     - Always keep at least one Open ticket
  ========================================= */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  let baseTicketTemplate = null;

  if (supportSection && openTicketsContainer) {
    const firstTicket = openTicketsContainer.querySelector('.ticket-group');
    if (firstTicket) {
      baseTicketTemplate = firstTicket.cloneNode(true);
      baseTicketTemplate.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      const statusSelect = baseTicketTemplate.querySelector('.ticket-status-select');
      if (statusSelect) statusSelect.value = 'Open';
    }

    // Normalize value (deal with different dash types etc.)
    function normalizeStatusValue(str) {
      if (!str) return '';
      let s = String(str).trim();

      // Replace en dash / em dash with hyphen
      s = s.replace(/\u2013|\u2014/g, '-');
      // Collapse multiple spaces around hyphens
      s = s.replace(/\s*-\s*/g, ' - ');
      return s;
    }

    function attachTicketStatusHandlers(scope) {
      if (!scope) return;
      scope.querySelectorAll('.ticket-status-select').forEach(select => {
        if (select.dataset.boundTicketStatus) return;
        select.dataset.boundTicketStatus = '1';

        select.addEventListener('change', () => {
          const group = select.closest('.ticket-group');
          if (!group) return;

          const raw = select.value;
          const norm = normalizeStatusValue(raw);

          if (norm === 'Tier Two') {
            if (tierTwoTicketsContainer) tierTwoTicketsContainer.appendChild(group);
          } else if (norm === 'Closed - Resolved') {
            if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.appendChild(group);
          } else if (norm === 'Closed - Feature Not Supported') {
            if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.appendChild(group);
          } else {
            if (openTicketsContainer) openTicketsContainer.appendChild(group);
          }

          ensureDefaultOpenTicket();
        });
      });
    }

    function createNewTicketGroup() {
      if (!baseTicketTemplate) return null;
      const clone = baseTicketTemplate.cloneNode(true);

      clone.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      const statusSelect = clone.querySelector('.ticket-status-select');
      if (statusSelect) statusSelect.value = 'Open';

      attachTicketStatusHandlers(clone);
      return clone;
    }

    function ensureDefaultOpenTicket() {
      if (!openTicketsContainer) return;
      const groups = openTicketsContainer.querySelectorAll('.ticket-group');
      if (groups.length === 0) {
        const fresh = createNewTicketGroup();
        if (fresh) openTicketsContainer.appendChild(fresh);
      }
    }

    // Initial binding + default open ticket
    attachTicketStatusHandlers(supportSection);
    ensureDefaultOpenTicket();

    // "+" inside Open Support Tickets → add ONE new ticket in Open
    openTicketsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-row');
      if (!btn) return;

      const group = btn.closest('.ticket-group');
      if (!group) return;

      const newGroup = group.cloneNode(true);
      newGroup.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      const statusSelect = newGroup.querySelector('.ticket-status-select');
      if (statusSelect) statusSelect.value = 'Open';

      openTicketsContainer.appendChild(newGroup);
      attachTicketStatusHandlers(newGroup);
    });
  }

  /* =========================================
     CLEAR PAGE BUTTONS
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

      page.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
      });

      page.querySelectorAll('select').forEach(sel => { sel.selectedIndex = 0; });

      page.querySelectorAll('textarea').forEach(area => { area.value = ''; });

      if (page.id === 'support-ticket' && openTicketsContainer) {
        openTicketsContainer.innerHTML = '';
        if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
        if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.innerHTML = '';
        if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.innerHTML = '';

        if (baseTicketTemplate) {
          const fresh = createNewTicketGroup();
          if (fresh) openTicketsContainer.appendChild(fresh);
        }
      }
    });
  });

  /* =========================================
     CLEAR ALL BUTTON
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

      document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
      });

      document.querySelectorAll('select').forEach(sel => { sel.selectedIndex = 0; });

      document.querySelectorAll('textarea').forEach(area => { area.value = ''; });

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
