// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Add Row, Integrated "+", Support Tickets, Clear, PDF
// =======================================================

window.addEventListener('DOMContentLoaded', () => {
  /* === SIDEBAR NAVIGATION === */
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

  // Ensure first page is visible on load
  if (sections.length) {
    sections.forEach(sec => sec.classList.remove('active'));
    sections[0].classList.add('active');
    if (nav) {
      const firstBtn = nav.querySelector('.nav-btn');
      if (firstBtn) firstBtn.classList.add('active');
    }
  }

  /* === SUPPORT TICKET HANDLES & HELPERS === */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  function createDefaultTicketGroup() {
    const group = document.createElement('div');
    group.className = 'ticket-group';
    group.innerHTML = `
      <div class="checklist-row integrated-plus">
        <label>Support Ticket Number</label>
        <input type="text" placeholder="Ticket #">
        <button class="add-row" type="button">+</button>
      </div>

      <div class="checklist-row">
        <label>Issue Summary</label>
        <input type="text" placeholder="Short summary of the issue">
      </div>

      <div class="checklist-row">
        <label>Ticket Status</label>
        <select class="ticket-status-select">
          <option>Open</option>
          <option>Tier Two</option>
          <option>Closed - Resolved</option>
          <option>Closed – Feature Not Supported</option>
        </select>
      </div>

      <div class="checklist-row">
        <label>Zendesk link</label>
        <input type="text" placeholder="Paste Zendesk link">
      </div>
    `;
    return group;
  }

  function ensureDefaultOpenTicket() {
    if (!openTicketsContainer) return;
    const groups = openTicketsContainer.querySelectorAll('.ticket-group');
    if (!groups.length) {
      const def = createDefaultTicketGroup();
      openTicketsContainer.appendChild(def);
    }
  }

  function normalizeStatus(value) {
    if (!value) return '';
    return value
      .replace(/–/g, '-')        // en dash => hyphen
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function moveTicketGroup(selectEl) {
    if (!selectEl) return;
    const group = selectEl.closest('.ticket-group');
    if (!group) return;

    const value = normalizeStatus(selectEl.value);

    let targetContainer = null;
    if (value === 'open') {
      targetContainer = openTicketsContainer;
    } else if (value === 'tier two') {
      targetContainer = tierTwoTicketsContainer;
    } else if (value === 'closed - resolved') {
      targetContainer = closedResolvedTicketsContainer;
    } else if (value === 'closed - feature not supported') {
      targetContainer = closedFeatureTicketsContainer;
    }

    if (!targetContainer) return;

    // If moving away from the default open stub and it has the + button:
    // we still want a default open stub left behind.
    targetContainer.appendChild(group);
    ensureDefaultOpenTicket();
  }

  function resetSupportTicketsPage() {
    if (!supportSection) return;
    if (openTicketsContainer) openTicketsContainer.innerHTML = '';
    if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
    if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.innerHTML = '';
    if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.innerHTML = '';

    ensureDefaultOpenTicket();
  }

  // On initial load ensure there is at least one default open ticket
  if (supportSection) {
    ensureDefaultOpenTicket();
  }

  /* === GLOBAL CLICK HANDLER FOR ALL "+"/ADD BUTTONS === */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-row');
    if (!btn) return;

    // 1) TABLE FOOTER "+" – Training tables
    const tableFooter = btn.closest('.table-footer');
    if (tableFooter) {
      const section = btn.closest('.section');
      if (!section) return;
      const table = section.querySelector('table.training-table');
      if (!table || !table.tBodies[0] || !table.tBodies[0].rows.length) return;

      const tbody = table.tBodies[0];
      const lastRow = tbody.rows[tbody.rows.length - 1];
      const newRow = lastRow.cloneNode(true);

      newRow.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
      return;
    }

    // 2) SUPPORT TICKET "+" – only in Open Support Tickets
    if (btn.closest('#support-ticket') && btn.closest('#openTicketsContainer')) {
      const group = btn.closest('.ticket-group');
      if (!group || !openTicketsContainer) return;

      const newGroup = group.cloneNode(true);

      // Clear text fields
      newGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
        el.value = '';
      });

      // Reset dropdown
      const statusSelect = newGroup.querySelector('.ticket-status-select');
      if (statusSelect) statusSelect.value = 'Open';

      // Remove "+" from the cloned group's Support Ticket Number row
      const ticketNumRow = newGroup.querySelector('.checklist-row.integrated-plus');
      if (ticketNumRow) {
        const addBtn = ticketNumRow.querySelector('.add-row');
        if (addBtn) addBtn.remove();
        ticketNumRow.classList.remove('integrated-plus');
        const input = ticketNumRow.querySelector('input[type="text"]');
        if (input) {
          input.style.width = '';
          input.style.flex = '';
        }
      }

      openTicketsContainer.appendChild(newGroup);
      return;
    }

    // 3) Additional POC card "+" – clone entire POC card with orange border
    const pocCard = btn.closest('.poc-card');
    const pocContainer = document.getElementById('additionalPocContainer');
    if (pocCard && pocContainer && btn.closest('#dealership-info')) {
      const newCard = pocCard.cloneNode(true);
      newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
        el.value = '';
      });
      pocContainer.appendChild(newCard);
      return;
    }

    // 4) DEFAULT integrated-plus behavior for single text boxes
    const row = btn.closest('.checklist-row.integrated-plus');
    if (!row) return;

    const textInput = row.querySelector('input[type="text"]');
    if (!textInput) return;

    // Create a "normal" row directly underneath, no plus button, full width
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row';

    const newLabel = document.createElement('label');
    newLabel.textContent = row.querySelector('label') ? row.querySelector('label').textContent : '';

    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.placeholder = textInput.placeholder || '';

    newRow.appendChild(newLabel);
    newRow.appendChild(newInput);

    // Insert after the current row
    row.parentNode.insertBefore(newRow, row.nextSibling);
  });

  /* === SUPPORT TICKET STATUS CHANGE (MOVE CARDS) === */
  document.addEventListener('change', (e) => {
    const select = e.target.closest('.ticket-status-select');
    if (!select) return;
    moveTicketGroup(select);
  });

  /* === CLEAR PAGE BUTTONS (per-page reset) === */
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.closest('.page-section');
      if (!page) return;

      const confirmReset = window.confirm(
        'This will clear all fields on this page and reset layout where applicable. Continue?'
      );
      if (!confirmReset) return;

      if (page.id === 'support-ticket') {
        resetSupportTicketsPage();
        return;
      }

      // Generic clear for non-support pages: clear all inputs + selects + textareas
      page.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });
      page.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });
      page.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });
    });
  });

  /* === CLEAR ALL BUTTON (global reset with double confirmation) === */
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

      // 4) Reset Support Tickets layout specifically
      resetSupportTicketsPage();

      // 5) Navigate back to first page
      if (sections.length) {
        sections.forEach(sec => sec.classList.remove('active'));
        sections[0].classList.add('active');
      }
      if (nav) {
        nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const firstBtn = nav.querySelector('.nav-btn');
        if (firstBtn) firstBtn.classList.add('active');
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* === SAVE AS PDF (Training Summary Page) === */
  const saveBtn = document.getElementById('savePDF');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!window.jspdf) {
        alert('jsPDF not loaded.');
        return;
      }
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
