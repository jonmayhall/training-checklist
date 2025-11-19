// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Training Tables, Support Tickets Buckets, Clear Page, Clear All, PDF
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

      const rowToClone = tbody.rows[tbody.rows.length - 1];
      const newRow = rowToClone.cloneNode(true);

      newRow.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
    });
  });

  // =====================================================
  // SUPPORT TICKETS – MULTI-BUCKET LOGIC
  // =====================================================
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedUnsupportedTicketsContainer = document.getElementById('closedUnsupportedTicketsContainer');

  let openTicketTemplate = null; // pristine blank open ticket card

  function normalizeStatus(val) {
    if (!val) return '';
    return val.toString().trim().toLowerCase();
  }

  function initOpenTicketTemplate() {
    if (!openTicketsContainer) return;
    const first = openTicketsContainer.querySelector('.ticket-group');
    if (!first) return;

    // Clone a pristine version of an open ticket card
    openTicketTemplate = first.cloneNode(true);

    // Clear values on the template
    openTicketTemplate.querySelectorAll('input[type="text"], textarea').forEach(el => {
      el.value = '';
    });
    openTicketTemplate.querySelectorAll('select').forEach(sel => {
      const hasOpen = Array.from(sel.options).some(
        o => normalizeStatus(o.value) === 'open'
      );
      if (hasOpen) {
        sel.value = 'Open';
      } else {
        sel.selectedIndex = 0;
      }
    });
  }

  function ensureOneBlankOpenTicket() {
    if (!openTicketsContainer || !openTicketTemplate) return;
    const groups = openTicketsContainer.querySelectorAll('.ticket-group');
    if (groups.length === 0) {
      const newGroup = openTicketTemplate.cloneNode(true);
      openTicketsContainer.appendChild(newGroup);
      attachTicketStatusHandlers(newGroup);
      attachTicketAddButtonHandlers(newGroup);
    }
  }

  function moveTicketToBucket(group, statusVal) {
    if (!group) return;
    const v = normalizeStatus(statusVal);

    // If set back to Open, just move it to Open bucket
    if (v === 'open') {
      if (openTicketsContainer) openTicketsContainer.appendChild(group);
      return;
    }

    // Tier Two
    if (v.startsWith('tier')) {
      if (tierTwoTicketsContainer) tierTwoTicketsContainer.appendChild(group);
    }
    // Closed – Feature Not Supported (we look for "feature" in the string)
    else if (v.includes('feature')) {
      if (closedUnsupportedTicketsContainer) {
        closedUnsupportedTicketsContainer.appendChild(group);
      }
    }
    // Everything else that's "closed" → Closed – Resolved
    else {
      if (closedResolvedTicketsContainer) {
        closedResolvedTicketsContainer.appendChild(group);
      }
    }

    // After moving OUT of Open, make sure there is always at least one blank open card
    ensureOneBlankOpenTicket();
  }

  function attachTicketStatusHandlers(scope) {
    if (!scope) return;
    // Treat any <select> inside a .ticket-group on this page as a status dropdown
    const selects = scope.querySelectorAll('.ticket-group select');
    selects.forEach(sel => {
      if (sel.dataset.boundStatus === '1') return;
      sel.dataset.boundStatus = '1';

      // Default status to Open if empty
      if (!sel.value) {
        const hasOpen = Array.from(sel.options).some(
          o => normalizeStatus(o.value) === 'open'
        );
        if (hasOpen) sel.value = 'Open';
      }

      sel.addEventListener('change', () => {
        const grp = sel.closest('.ticket-group');
        moveTicketToBucket(grp, sel.value);
      });
    });
  }

  function attachTicketAddButtonHandlers(scope) {
    if (!scope || !openTicketsContainer) return;

    // Only handle the + on Support Ticket Number rows INSIDE the Open bucket
    const addBtns = scope.querySelectorAll(
      '#openTicketsContainer .ticket-group .checklist-row.integrated-plus > .add-row'
    );

    addBtns.forEach(btn => {
      if (btn.dataset.boundAdd === '1') return;
      btn.dataset.boundAdd = '1';

      btn.addEventListener('click', () => {
        if (!openTicketTemplate) initOpenTicketTemplate();
        const base = openTicketTemplate || btn.closest('.ticket-group');
        if (!base) return;

        const newGroup = base.cloneNode(true);

        // Clear values in the new card
        newGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
          el.value = '';
        });
        newGroup.querySelectorAll('select').forEach(sel => {
          const hasOpen = Array.from(sel.options).some(
            o => normalizeStatus(o.value) === 'open'
          );
          if (hasOpen) sel.value = 'Open';
          else sel.selectedIndex = 0;
        });

        openTicketsContainer.appendChild(newGroup);
        attachTicketStatusHandlers(newGroup);
        attachTicketAddButtonHandlers(newGroup);
      });
    });
  }

  if (supportSection && openTicketsContainer) {
    initOpenTicketTemplate();
    attachTicketStatusHandlers(supportSection);
    attachTicketAddButtonHandlers(supportSection);
    ensureOneBlankOpenTicket();
  }

  // =====================================================
  // GENERIC + BUTTONS FOR OTHER TEXT INPUTS (non-support)
  // =====================================================
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    // Skip support-ticket section; it's handled above
    if (btn.closest('#support-ticket')) return;

    btn.addEventListener('click', () => {
      // Additional POC card behavior (if present)
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

      // Default behavior: clone the associated text input as a NEW ROW under the current line
      const parentRow = btn.closest('.checklist-row');
      if (!parentRow) return;

      const input = parentRow.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      if (!input) return;

      const newRow = parentRow.cloneNode(true);
      // clear values & REMOVE add-btn from the cloned line
      newRow.querySelectorAll('input[type="text"], input[type="number"], input[type="email"]').forEach(el => {
        el.value = '';
      });
      const clonedAddBtn = newRow.querySelector('.add-row');
      if (clonedAddBtn) clonedAddBtn.remove();

      // insert AFTER the current row
      parentRow.parentNode.insertBefore(newRow, parentRow.nextSibling);
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
        if (openTicketsContainer) {
          openTicketsContainer.innerHTML = '';
        }
        if (tierTwoTicketsContainer) {
          tierTwoTicketsContainer.innerHTML = '';
        }
        if (closedResolvedTicketsContainer) {
          closedResolvedTicketsContainer.innerHTML = '';
        }
        if (closedUnsupportedTicketsContainer) {
          closedUnsupportedTicketsContainer.innerHTML = '';
        }

        // Rebuild a fresh default open ticket card
        initOpenTicketTemplate();
        ensureOneBlankOpenTicket();
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

      // 4) Reset Support Tickets buckets
      if (openTicketsContainer) openTicketsContainer.innerHTML = '';
      if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
      if (closedResolvedTicketsContainer) closedResolvedTicketsContainer.innerHTML = '';
      if (closedUnsupportedTicketsContainer) closedUnsupportedTicketsContainer.innerHTML = '';

      initOpenTicketTemplate();
      ensureOneBlankOpenTicket();
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
