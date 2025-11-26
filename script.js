// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Training Tables, Support Tickets, Clear Page, Clear All, PDF
// + Training Start/End date auto logic
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

  /* === SUPPORT TICKETS SETUP === */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  const STATUS_TARGETS = {
    'Open': openTicketsContainer,
    'Tier Two': tierTwoTicketsContainer,
    'Closed - Resolved': closedResolvedTicketsContainer,
    'Closed – Feature Not Supported': closedFeatureTicketsContainer, // en dash
    'Closed - Feature Not Supported': closedFeatureTicketsContainer  // safety (hyphen)
  };

  function moveTicketToContainer(select) {
    if (!select) return;
    const group = select.closest('.ticket-group');
    if (!group) return;

    const status = select.value;
    const targetContainer = STATUS_TARGETS[status];
    if (!targetContainer) return;

    targetContainer.appendChild(group);
  }

  function attachTicketStatusHandlers(scope) {
    if (!scope) return;

    scope.querySelectorAll('.ticket-status-select').forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      select.addEventListener('change', () => {
        moveTicketToContainer(select);
      });
    });
  }

  if (supportSection) {
    attachTicketStatusHandlers(supportSection);
  }

  /* === ADDITIONAL TRAINERS / POC / SUPPORT TICKETS / OTHER + BUTTONS === */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) Support Ticket page – clone whole ticket-group into Open
      if (btn.closest('#support-ticket')) {
        if (!openTicketsContainer) return;
        const group = btn.closest('.ticket-group');
        if (!group) return;

        const newGroup = group.cloneNode(true);

        // Clear all text inputs and textareas
        newGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
          el.value = '';
        });
        // Reset selects to default (Open)
        newGroup.querySelectorAll('select.ticket-status-select').forEach(sel => {
          sel.value = 'Open';
        });

        // In cloned tickets, remove the + button from Support Ticket Number row
        const numberRowClone = newGroup.querySelector('.checklist-row.integrated-plus');
        if (numberRowClone) {
          const addBtnClone = numberRowClone.querySelector('.add-row');
          if (addBtnClone) addBtnClone.remove();
        }

        openTicketsContainer.appendChild(newGroup);
        attachTicketStatusHandlers(newGroup);
        return;
      }

      // 2) Additional POC – clone entire contact card (Name/Cell/Email)
      const pocCard = btn.closest('.poc-card');
      const pocContainer = document.getElementById('additionalPocContainer');
      if (pocCard && pocContainer && btn.closest('#dealership-info')) {
        const newCard = pocCard.cloneNode(true);

        // Clear values
        newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
          el.value = '';
        });

        // In cloned POC cards, remove the + button
        const pocAddBtn = newCard.querySelector('.add-row');
        if (pocAddBtn) pocAddBtn.remove();

        pocContainer.appendChild(newCard);
        return;
      }

      // 3) Default behavior for other integrated-plus buttons:
      //    clone the entire checklist-row, remove the + in the clone,
      //    and insert it BELOW the current row.
      const row = btn.closest('.checklist-row');
      if (!row) return;

      const cloneRow = row.cloneNode(true);

      // Clear text/email inputs in the new row
      cloneRow.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
        el.value = '';
      });

      // Remove the + button from the cloned row
      const addInClone = cloneRow.querySelector('.add-row');
      if (addInClone) addInClone.remove();

      row.parentNode.insertBefore(cloneRow, row.nextSibling);
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
      // keep only the first ticket-group in Open, empty the others
      if (page.id === 'support-ticket') {
        if (openTicketsContainer) {
          const groups = openTicketsContainer.querySelectorAll('.ticket-group');
          groups.forEach((group, index) => {
            if (index > 0) group.remove();
          });
        }
        if (tierTwoTicketsContainer) {
          tierTwoTicketsContainer.innerHTML = '';
        }
        if (closedResolvedTicketsContainer) {
          closedResolvedTicketsContainer.innerHTML = '';
        }
        if (closedFeatureTicketsContainer) {
          closedFeatureTicketsContainer.innerHTML = '';
        }

        // Reattach handlers to the remaining default group
        if (supportSection) {
          attachTicketStatusHandlers(supportSection);
        }
      }

      // If this reset is on the Trainers page, also clear Training End if you want
      // (Already handled above by input clearing.)
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

      // 4) Support ticket groups – keep only first ticket-group in Open, none in others
      if (openTicketsContainer) {
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index > 0) group.remove();
        });
      }
      if (tierTwoTicketsContainer) {
        tierTwoTicketsContainer.innerHTML = '';
      }
      if (closedResolvedTicketsContainer) {
        closedResolvedTicketsContainer.innerHTML = '';
      }
      if (closedFeatureTicketsContainer) {
        closedFeatureTicketsContainer.innerHTML = '';
      }

      // Optional: jump back to first page after clear-all
      if (sections.length) {
        sections.forEach(sec => sec.classList.remove('active'));
        sections[0].classList.add('active');
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

  /* === TRAINING START / END DATE AUTO-LOGIC === */
  const trainingStart = document.getElementById('trainingStart');
  const trainingEnd = document.getElementById('trainingEnd');

  if (trainingStart && trainingEnd) {
    trainingStart.addEventListener('change', () => {
      const value = trainingStart.value;
      if (!value) {
        trainingEnd.value = '';
        return;
      }
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return;
      d.setDate(d.getDate() + 2);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      // Auto-fill, but user can still override
      trainingEnd.value = `${yyyy}-${mm}-${dd}`;
    });
  }
});
