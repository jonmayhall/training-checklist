// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Training Tables, Support Tickets, Clear Page, Clear All, PDF
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

  /* === ADD ROW HANDLER FOR TRAINING TABLES === */
  document.querySelectorAll('.table-footer .add-row').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.closest('.section');
      if (!section) return;
      const table = section.querySelector('table.training-table');
      if (!table) return;

      const tbody = table.tBodies[0];
      if (!tbody || !tbody.rows.length) return;

      // Clone the last actual row
      const rowToClone = tbody.rows[tbody.rows.length - 1];
      const newRow = rowToClone.cloneNode(true);

      // Reset inputs
      newRow.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
    });
  });

  /* =======================================================
     SUPPORT TICKETS – ALWAYS KEEP A DEFAULT OPEN CARD
     Four buckets:
       - Open
       - Tier Two
       - Closed - Resolved
       - Closed – Feature Not Supported
     ======================================================= */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedUnsupportedContainer = document.getElementById('closedUnsupportedTicketsContainer');

  let ticketTemplate = null; // base template for creating new open-ticket cards

  function resetTicketGroup(group) {
    if (!group) return;

    // Clear all text inputs and textareas
    group.querySelectorAll('input[type="text"], textarea').forEach(el => {
      el.value = '';
    });

    // Reset ALL selects inside ticket card
    group.querySelectorAll('select').forEach(sel => {
      // Try to set to "Open" by text, else first option
      const openOpt = Array.from(sel.options).find(o => /open/i.test(o.text));
      if (openOpt) {
        sel.value = openOpt.value;
      } else {
        sel.selectedIndex = 0;
      }
    });

    // Ensure the status select has our class for event binding
    let statusSelect = group.querySelector('.ticket-status-select');
    if (!statusSelect) {
      statusSelect = group.querySelector('select');
      if (statusSelect) statusSelect.classList.add('ticket-status-select');
    }
  }

  function initTicketTemplate() {
    if (!openTicketsContainer) return;
    const firstGroup = openTicketsContainer.querySelector('.ticket-group');
    if (!firstGroup) return;

    // Make sure the status dropdown has the class
    let statusSelect = firstGroup.querySelector('.ticket-status-select');
    if (!statusSelect) {
      statusSelect = firstGroup.querySelector('select');
      if (statusSelect) statusSelect.classList.add('ticket-status-select');
    }

    ticketTemplate = firstGroup.cloneNode(true);
    resetTicketGroup(ticketTemplate);
  }

  function ensureDefaultOpenTicket() {
    if (!openTicketsContainer || !ticketTemplate) return;
    const groups = openTicketsContainer.querySelectorAll('.ticket-group');
    if (groups.length === 0) {
      const newGroup = ticketTemplate.cloneNode(true);
      resetTicketGroup(newGroup);
      openTicketsContainer.appendChild(newGroup);
      attachTicketStatusHandlers(newGroup);
    }
  }

  function moveTicketGroup(group, newStatus) {
    if (!group) return;

    const val = (newStatus || '').toLowerCase();
    let targetContainer = openTicketsContainer;

    if (/tier/.test(val)) {
      if (tierTwoContainer) targetContainer = tierTwoContainer;
    } else if (/resolved/.test(val)) {
      if (closedResolvedContainer) targetContainer = closedResolvedContainer;
    } else if (/feature/.test(val) || /not supported/.test(val)) {
      if (closedUnsupportedContainer) targetContainer = closedUnsupportedContainer;
    } else {
      targetContainer = openTicketsContainer;
    }

    // Hide add button on tickets that are NOT in Open bucket
    const addBtn = group.querySelector('.add-row');
    if (addBtn) {
      if (targetContainer === openTicketsContainer) {
        addBtn.style.display = 'flex';
      } else {
        addBtn.style.display = 'none';
      }
    }

    if (targetContainer) {
      targetContainer.appendChild(group);
    }

    // After moving, make sure there is at least ONE default open ticket card
    ensureDefaultOpenTicket();
  }

  function attachTicketStatusHandlers(scope) {
    if (!scope) return;
    scope.querySelectorAll('.ticket-status-select').forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        moveTicketGroup(group, select.value);
      });
    });
  }

  if (supportSection && openTicketsContainer) {
    initTicketTemplate();
    attachTicketStatusHandlers(supportSection);

    // Make sure a default open ticket exists on load
    ensureDefaultOpenTicket();
  }

  /* === ADDITIONAL TRAINERS / POC / SUPPORT TICKETS / OTHER + BUTTONS === */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) SUPPORT TICKET PAGE – OPEN TICKETS ONLY:
      //    clicking + makes a NEW ticket card in Open bucket from template
      if (btn.closest('#support-ticket') && btn.closest('#openTicketsContainer')) {
        if (!ticketTemplate || !openTicketsContainer) return;
        const newGroup = ticketTemplate.cloneNode(true);
        resetTicketGroup(newGroup);
        openTicketsContainer.appendChild(newGroup);
        attachTicketStatusHandlers(newGroup);
        return;
      }

      // 2) Additional POC – clone entire contact card (Name/Cell/Email)
      //    Assumes markup with .poc-card and #additionalPocContainer
      const pocCard = btn.closest('.poc-card');
      const pocContainer = document.getElementById('additionalPocContainer');
      if (pocCard && pocContainer && btn.closest('#dealership-info')) {
        const newCard = pocCard.cloneNode(true);

        // clear values
        newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
          el.value = '';
        });

        pocContainer.appendChild(newCard);
        return;
      }

      // 3) DEFAULT BEHAVIOR FOR OTHER integrated-plus TEXT BOXES:
      //    Create a NEW ROW beneath current one (label once, multiple lines).
      const row = btn.closest('.checklist-row');
      if (!row) return;

      const parentBlock = row.parentElement;
      const input = row.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      if (!input) return;

      // Clone the row, but remove the add button so only the original row can spawn more
      const newRow = row.cloneNode(true);
      const newLabel = newRow.querySelector('label');
      if (newLabel) newLabel.textContent = ''; // no label on stacked rows

      // Remove add button from new row
      const newBtn = newRow.querySelector('.add-row');
      if (newBtn) newBtn.remove();

      // Clear values in the cloned inputs
      newRow.querySelectorAll('input[type="text"], input[type="number"], input[type="email"]').forEach(el => {
        el.value = '';
      });

      // Insert directly after the original row (so it appears BELOW)
      row.insertAdjacentElement('afterend', newRow);
    });
  });

  /* === CLEAR PAGE BUTTONS (per-page reset) === */
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
        if (openTicketsContainer && ticketTemplate) {
          // Remove all ticket groups, then add one default blank card
          openTicketsContainer.innerHTML = '';
          const newGroup = ticketTemplate.cloneNode(true);
          resetTicketGroup(newGroup);
          openTicketsContainer.appendChild(newGroup);
          attachTicketStatusHandlers(newGroup);
        }

        if (tierTwoContainer) tierTwoContainer.innerHTML = '';
        if (closedResolvedContainer) closedResolvedContainer.innerHTML = '';
        if (closedUnsupportedContainer) closedUnsupportedContainer.innerHTML = '';
      }
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

      // 4) Support ticket buckets – reset to one default open ticket
      if (openTicketsContainer && ticketTemplate) {
        openTicketsContainer.innerHTML = '';
        const newGroup = ticketTemplate.cloneNode(true);
        resetTicketGroup(newGroup);
        openTicketsContainer.appendChild(newGroup);
        attachTicketStatusHandlers(newGroup);
      }
      if (tierTwoContainer) tierTwoContainer.innerHTML = '';
      if (closedResolvedContainer) closedResolvedContainer.innerHTML = '';
      if (closedUnsupportedContainer) closedUnsupportedContainer.innerHTML = '';
    });
  }

  /* === SAVE AS PDF (Training Summary Page) === */
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

        // Simplified page content (plain text export)
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
