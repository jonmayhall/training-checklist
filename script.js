// =====================================================================
// MAIN JS INIT
// =====================================================================
window.addEventListener('DOMContentLoaded', () => {
  /* ======================================================
     SIDEBAR NAVIGATION (uses #sidebar-nav .nav-btn)
  ====================================================== */
  const nav = document.getElementById('sidebar-nav');
  const sections = document.querySelectorAll('.page-section');

  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const targetId = btn.dataset.target;
      const target = document.getElementById(targetId);
      if (!target) return;

      // Highlight active nav button
      nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Swap pages
      sections.forEach(sec => sec.classList.remove('active'));
      target.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ======================================================
     TRAINING DATES – AUTO-FILL END DATE (+2 DAYS)
  ====================================================== */
  const startDateEl = document.getElementById('trainingStartDate');
  const endDateEl = document.getElementById('trainingEndDate');

  if (startDateEl && endDateEl) {
    startDateEl.addEventListener('change', () => {
      if (!startDateEl.value) return;
      const start = new Date(startDateEl.value + 'T00:00:00');
      if (isNaN(start.getTime())) return;

      // +2 days
      start.setDate(start.getDate() + 2);
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      endDateEl.value = `${yyyy}-${mm}-${dd}`;
    });
  }

  /* ======================================================
     ADD ROW HANDLER FOR TRAINING TABLES (table footer +)
  ====================================================== */
  document.querySelectorAll('.table-footer .add-row').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.closest('.section');
      if (!section) return;
      const table = section.querySelector('table.training-table');
      if (!table) return;

      const tbody = table.tBodies[0];
      if (!tbody || !tbody.rows.length) return;

      // Clone the last row
      const rowToClone = tbody.rows[tbody.rows.length - 1];
      const newRow = rowToClone.cloneNode(true);

      // Reset inputs/selects
      newRow.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
    });
  });

  /* ======================================================
     SUPPORT TICKETS – CONTAINERS & MOVEMENT
  ====================================================== */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  function getTicketContainerByStatus(status) {
    if (!status) return openTicketsContainer;

    const normalized = status.replace(/\s+/g, ' ').trim();

    if (normalized === 'Open') return openTicketsContainer;
    if (normalized === 'Tier Two') return tierTwoTicketsContainer;
    if (normalized.startsWith('Closed - Resolved')) return closedResolvedTicketsContainer;
    if (normalized.startsWith('Closed – Feature Not Supported') ||
        normalized.startsWith('Closed - Feature Not Supported')) {
      return closedFeatureTicketsContainer;
    }
    return openTicketsContainer;
  }

  function createDefaultOpenTicket() {
    if (!openTicketsContainer) return;

    // If there is already at least one ticket in Open, do nothing
    if (openTicketsContainer.querySelector('.ticket-group')) return;

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

    openTicketsContainer.appendChild(group);

    // Attach the + behavior for the Support Ticket Number row
    const plusBtn = group.querySelector('.integrated-plus .add-row');
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        const row = plusBtn.closest('.checklist-row');
        if (!row) return;
        const clone = row.cloneNode(true);
        const cloneBtn = clone.querySelector('.add-row');
        if (cloneBtn) cloneBtn.remove();
        const input = clone.querySelector('input[type="text"]');
        if (input) input.value = '';
        row.insertAdjacentElement('afterend', clone);
      });
    }

    attachTicketStatusHandlers(group);
  }

  function attachTicketStatusHandlers(scope) {
    if (!scope) return;
    scope.querySelectorAll('.ticket-status-select').forEach(select => {
      // To avoid double binding in case of clones
      if (select.dataset.bound === '1') return;
      select.dataset.bound = '1';

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        if (!group) return;

        const container = getTicketContainerByStatus(select.value);
        if (!container) return;

        container.appendChild(group);

        // If we moved a ticket out of Open, ensure a blank ticket remains in Open
        if (container !== openTicketsContainer) {
          createDefaultOpenTicket();
        }
      });
    });
  }

  if (supportSection) {
    attachTicketStatusHandlers(supportSection);
    createDefaultOpenTicket(); // in case there somehow isn't one
  }

  /* ======================================================
     SECTION-BLOCK ADD BUTTONS (single-line clones)
  ====================================================== */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // Special case: Support Ticket page – handled above when creating default
      if (btn.closest('#support-ticket') && btn.closest('.integrated-plus')) {
        const row = btn.closest('.checklist-row');
        if (!row) return;
        const clone = row.cloneNode(true);
        const cloneBtn = clone.querySelector('.add-row');
        if (cloneBtn) cloneBtn.remove();
        clone.querySelectorAll('input, select, textarea').forEach(el => (el.value = ''));
        row.insertAdjacentElement('afterend', clone);
        return;
      }

      // Special case: Additional POC – clone the entire contact card
      const pocCard = btn.closest('.poc-card');
      const pocContainer = document.getElementById('additionalPocContainer');
      if (pocCard && pocContainer && btn.closest('#dealership-contacts')) {
        const newCard = pocCard.cloneNode(true);
        newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
          el.value = '';
        });
        pocContainer.appendChild(newCard);
        return;
      }

      // Default: clone just the row under the current one
      const row = btn.closest('.checklist-row');
      if (!row) return;
      const clone = row.cloneNode(true);

      // Remove + from cloned row
      const cloneBtn = clone.querySelector('.add-row');
      if (cloneBtn) cloneBtn.remove();

      // Clear values
      clone.querySelectorAll('input, select, textarea').forEach(el => (el.value = ''));

      // Insert right below the original
      row.insertAdjacentElement('afterend', clone);
    });
  });

  /* ======================================================
     CLEAR PAGE (Reset This Page)
  ====================================================== */
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.closest('.page-section');
      if (!page) return;

      // Clear all inputs/selects/textareas on this page
      page.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox') {
          el.checked = false;
        } else if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      });

      // Special handling for Support Ticket page: reset containers and recreate default open
      if (page.id === 'support-ticket') {
        if (openTicketsContainer) openTicketsContainer.innerHTML = '';
        if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
        if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.innerHTML = '';
        if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.innerHTML = '';
        createDefaultOpenTicket();
      }
    });
  });

  /* ======================================================
     CLEAR ALL (GLOBAL) – IF YOU HAVE A #clearAllBtn
  ====================================================== */
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

      // Clear every input/select/textarea
      document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox') {
          el.checked = false;
        } else if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      });

      // Reset support ticket containers entirely
      if (openTicketsContainer) openTicketsContainer.innerHTML = '';
      if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
      if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.innerHTML = '';
      if (closedFeatureTicketsContainer) closedFeatureTicketsContainer.innerHTML = '';
      createDefaultOpenTicket();
    });
  }

  /* ======================================================
     SAVE AS PDF (Training Summary page)
  ====================================================== */
  const saveBtn = document.getElementById('savePDF');
  if (saveBtn && window.jspdf) {
    saveBtn.addEventListener('click', () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const pages = document.querySelectorAll('.page-section');

      const marginX = 30, marginY = 30, maxWidth = 535;
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
