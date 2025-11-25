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

  /* === SUPPORT TICKET – MOVE TICKETS BETWEEN CARDS === */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  // Use the first ticket in Open as the template for new default cards
  const ticketTemplate =
    openTicketsContainer && openTicketsContainer.querySelector('.ticket-group')
      ? openTicketsContainer.querySelector('.ticket-group')
      : null;

  function getContainerForStatus(status) {
    if (!status) return openTicketsContainer;
    const val = status.trim().toLowerCase();
    if (val === 'tier two') return tierTwoTicketsContainer;
    if (val === 'closed - resolved') return closedResolvedTicketsContainer;
    if (val === 'closed – feature not supported' || val === 'closed - feature not supported') {
      return closedFeatureTicketsContainer;
    }
    // default to Open
    return openTicketsContainer;
  }

  function clearTicketFields(group) {
    if (!group) return;
    group.querySelectorAll('input[type="text"], textarea').forEach(el => { el.value = ''; });
    group.querySelectorAll('select').forEach(sel => {
      // Ticket Status default = "Open"
      if (sel.classList.contains('ticket-status-select')) {
        // find the "Open" option
        let found = false;
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.trim().toLowerCase() === 'open') {
            sel.selectedIndex = i;
            found = true;
            break;
          }
        }
        if (!found) sel.selectedIndex = 0;
      } else {
        sel.selectedIndex = 0;
      }
    });
  }

  function ensureDefaultOpenTicket() {
    if (!openTicketsContainer || !ticketTemplate) return;
    const hasOpenWithPlus = openTicketsContainer.querySelector(
      '.ticket-group .checklist-row.integrated-plus .add-row'
    );
    if (!hasOpenWithPlus) {
      const newGroup = ticketTemplate.cloneNode(true);
      clearTicketFields(newGroup);
      // make sure the default Open card keeps the + button
      const plus = newGroup.querySelector('.checklist-row.integrated-plus .add-row');
      if (plus) plus.style.display = ''; // visible
      openTicketsContainer.insertBefore(newGroup, openTicketsContainer.firstChild);
      attachTicketStatusHandlers(newGroup); // bind dropdown for new card
    }
    updateTicketCounts();
  }

  function updateTicketCounts() {
    function setCount(container, titleText) {
      if (!container) return;
      const sectionBlock = container.closest('.section-block');
      if (!sectionBlock) return;
      const h2 = sectionBlock.querySelector('h2');
      if (!h2) return;
      const count = container.querySelectorAll('.ticket-group').length;
      // Base title without old "(x)" suffix
      h2.textContent = `${titleText} (${count})`;
    }

    setCount(openTicketsContainer, 'Open Support Tickets');
    setCount(tierTwoTicketsContainer, 'Tier Two Support Tickets');
    setCount(closedResolvedTicketsContainer, 'Closed - Resolved Support Tickets');
    setCount(closedFeatureTicketsContainer, 'Closed – Feature Not Supported Support Tickets');
  }

  function attachTicketStatusHandlers(scope) {
    if (!scope) return;
    scope.querySelectorAll('.ticket-status-select').forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        if (!group) return;

        const status = select.value || 'Open';
        const destContainer = getContainerForStatus(status);
        if (!destContainer) return;

        // If this group is in Open and has the + button, we still move it,
        // and then ensureDefaultOpenTicket() will create a fresh default one.
        destContainer.appendChild(group);

        // In non-Open buckets, remove the + button so those cards can't spawn more
        if (destContainer !== openTicketsContainer) {
          const plus = group.querySelector('.checklist-row.integrated-plus .add-row');
          if (plus) plus.remove();
        }

        ensureDefaultOpenTicket();
        updateTicketCounts();
      });
    });
  }

  if (supportSection) {
    attachTicketStatusHandlers(supportSection);
    ensureDefaultOpenTicket();
  }

  /* === ADDITIONAL TRAINERS / POC / OTHER + BUTTONS === */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) Support Ticket page – clone whole ticket-group into Open
      if (btn.closest('#support-ticket')) {
        if (!openTicketsContainer) return;
        const group = btn.closest('.ticket-group');
        if (!group) return;

        const newGroup = group.cloneNode(true);

        // Clear all fields in the cloned ticket
        clearTicketFields(newGroup);

        // Only the card in Open gets the + button; remove from clones in other containers
        const plusButtons = newGroup.querySelectorAll('.checklist-row.integrated-plus .add-row');
        plusButtons.forEach((p, idx) => {
          if (idx > 0) p.remove();
        });

        openTicketsContainer.appendChild(newGroup);
        attachTicketStatusHandlers(newGroup);
        updateTicketCounts();
        return;
      }

      // 2) Additional POC – clone entire contact card (Name/Cell/Email)
      const pocCard = btn.closest('.poc-card');
      const pocContainer = document.getElementById('additionalPocContainer');
      if (pocCard && pocContainer && btn.closest('#dealership-info')) {
        const newCard = pocCard.cloneNode(true);

        // clear values
        newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
          el.value = '';
        });

        // remove "+" on cloned POC cards so only the first card spawns new ones
        const addBtn = newCard.querySelector('.add-row');
        if (addBtn) addBtn.remove();

        pocContainer.appendChild(newCard);
        return;
      }

      // 3) Default behavior for other integrated-plus buttons:
      //    clone the entire checklist row below the current row, with no "+" on the new row.
      const row = btn.closest('.checklist-row');
      if (!row) return;

      const newRow = row.cloneNode(true);

      // Clear any input/select/textarea values
      newRow.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      // Remove add button in the cloned row so only the original row keeps the +
      const clonedAdd = newRow.querySelector('.add-row');
      if (clonedAdd) clonedAdd.remove();

      row.parentNode.insertBefore(newRow, row.nextSibling);
    });
  });

  /* === CLEAR PAGE BUTTONS (per-page reset) === */
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.closest('.page-section');
      if (!page) return;

      const confirmReset = window.confirm(
        'This will clear all fields on this page and restore default layout. This cannot be undone. Continue?'
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
      // keep only the first ticket-group in Open, empty Tier Two & Closed buckets
      if (page.id === 'support-ticket' && ticketTemplate && openTicketsContainer) {
        // Remove all ticket-groups in containers
        [openTicketsContainer, tierTwoTicketsContainer, closedResolvedTicketsContainer, closedFeatureTicketsContainer]
          .forEach(container => {
            if (!container) return;
            container.querySelectorAll('.ticket-group').forEach(g => g.remove());
          });

        // Re-add a fresh default ticket based on the template
        const fresh = ticketTemplate.cloneNode(true);
        clearTicketFields(fresh);
        const plus = fresh.querySelector('.checklist-row.integrated-plus .add-row');
        if (plus) plus.style.display = '';
        openTicketsContainer.appendChild(fresh);
        attachTicketStatusHandlers(fresh);
        updateTicketCounts();
      }
    });
  });

  /* === CLEAR ALL BUTTON (global reset with double confirmation) === */
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const first = window.confirm(
        'This will clear ALL fields on ALL pages of this checklist and restore default layouts. This cannot be undone. Continue?'
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

      // 4) Reset Support Ticket layout to default
      if (supportSection && ticketTemplate && openTicketsContainer) {
        [openTicketsContainer, tierTwoTicketsContainer, closedResolvedTicketsContainer, closedFeatureTicketsContainer]
          .forEach(container => {
            if (!container) return;
            container.innerHTML = '';
          });

        const fresh = ticketTemplate.cloneNode(true);
        clearTicketFields(fresh);
        const plus = fresh.querySelector('.checklist-row.integrated-plus .add-row');
        if (plus) plus.style.display = '';
        openTicketsContainer.appendChild(fresh);
        attachTicketStatusHandlers(fresh);
        updateTicketCounts();
      }

      // After clearing, send user back to first page
      if (nav && sections.length > 0) {
        const firstBtn = nav.querySelector('.nav-btn[data-target]');
        if (firstBtn) {
          nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          firstBtn.classList.add('active');
          const firstSection = document.getElementById(firstBtn.dataset.target);
          if (firstSection) {
            sections.forEach(sec => sec.classList.remove('active'));
            firstSection.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }
    });
  }

  /* === SAVE AS PDF (Training Summary Page) === */
  const saveBtn = document.getElementById('savePDF');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library (jsPDF) not loaded.');
        return;
      }

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

  // Initial ticket count update if support section exists
  if (supportSection) {
    updateTicketCounts();
  }
});
