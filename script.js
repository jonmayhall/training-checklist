// =======================================================
// myKaarma Interactive Training Checklist – JS
// Nav, Training Tables, Support Tickets, Add Buttons, Clear Page, Clear All, PDF
// =======================================================

window.addEventListener('DOMContentLoaded', () => {
  initSidebarNav();
  initTrainingTableAddRows();
  initGenericAddButtons();
  initClearPageButtons();
  initClearAllButton();
  initSaveAsPDF();

  try {
    initSupportTickets();
  } catch (err) {
    console.error('Support ticket init error:', err);
  }
});

/* =====================================================
   SIDEBAR NAVIGATION
   ===================================================== */
function initSidebarNav() {
  const nav = document.getElementById('sidebar-nav');
  const sections = document.querySelectorAll('.page-section');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;

    nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    sections.forEach(sec => sec.classList.remove('active'));
    target.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* =====================================================
   TRAINING TABLE – ADD ROW BUTTONS
   ===================================================== */
function initTrainingTableAddRows() {
  document.querySelectorAll('.table-footer .add-row').forEach(button => {
    if (button.dataset.boundAdd === '1') return;
    button.dataset.boundAdd = '1';

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
}

/* =====================================================
   SUPPORT TICKETS – MOVEMENT & COUNTS
   ===================================================== */

function initSupportTickets() {
  const supportSection = document.getElementById('support-ticket');
  if (!supportSection) return;

  const openContainer   = document.getElementById('openTicketsContainer');
  const tierContainer   = document.getElementById('tierTwoTicketsContainer');
  const closedResCont   = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatCont  = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer || !tierContainer || !closedResCont || !closedFeatCont) {
    console.warn('Support ticket containers missing.');
    return;
  }

  // Grab headers for counts (assumes order: Open, Tier Two, Closed-Resolved, Closed-Feature)
  const headers = supportSection.querySelectorAll('h2');
  let openHeader = null, tierHeader = null, closedResHeader = null, closedFeatHeader = null;
  if (headers.length >= 4) {
    [openHeader, tierHeader, closedResHeader, closedFeatHeader] = headers;
    [openHeader, tierHeader, closedResHeader, closedFeatHeader].forEach(h => {
      if (h && !h.dataset.baseTitle) {
        h.dataset.baseTitle = h.textContent.replace(/\s*\(\d+\)\s*$/, '');
      }
    });
  }

  // Save a clean template for new tickets
  let ticketTemplate = null;

  function normalizeStatus(value) {
    if (!value) return 'open';
    const t = value.toLowerCase().replace(/\s+/g, ' ').trim();
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

    const addBtn = group.querySelector('.checklist-row.integrated-plus .add-row');
    if (addBtn) {
      addBtn.style.display = isDefaultOpen ? 'inline-flex' : 'none';
    }
  }

  function updateCounts() {
    const openCount  = openContainer.querySelectorAll('.ticket-group').length;
    const tierCount  = tierContainer.querySelectorAll('.ticket-group').length;
    const resCount   = closedResCont.querySelectorAll('.ticket-group').length;
    const featCount  = closedFeatCont.querySelectorAll('.ticket-group').length;

    if (openHeader && openHeader.dataset.baseTitle) {
      openHeader.textContent = `${openHeader.dataset.baseTitle} (${openCount})`;
    }
    if (tierHeader && tierHeader.dataset.baseTitle) {
      tierHeader.textContent = `${tierHeader.dataset.baseTitle} (${tierCount})`;
    }
    if (closedResHeader && closedResHeader.dataset.baseTitle) {
      closedResHeader.textContent = `${closedResHeader.dataset.baseTitle} (${resCount})`;
    }
    if (closedFeatHeader && closedFeatHeader.dataset.baseTitle) {
      closedFeatHeader.textContent = `${closedFeatHeader.dataset.baseTitle} (${featCount})`;
    }
  }

  function attachStatusHandlers(scope) {
    if (!scope) return;
    const selects = scope.querySelectorAll('.ticket-status-select');
    selects.forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        if (!group) return;

        const statusKey = normalizeStatus(select.value);
        const hasAdd = !!group.querySelector('.checklist-row.integrated-plus .add-row');

        let target = openContainer;
        if (statusKey === 'tierTwo')        target = tierContainer;
        else if (statusKey === 'closedResolved') target = closedResCont;
        else if (statusKey === 'closedFeature')  target = closedFeatCont;

        // If this is the main Open card (has +), create a fresh one in Open
        if (hasAdd && statusKey !== 'open') {
          if (!ticketTemplate) {
            ticketTemplate = group.cloneNode(true);
          }
          if (ticketTemplate) {
            const replacement = ticketTemplate.cloneNode(true);
            resetTicketGroup(replacement, true);
            openContainer.insertBefore(replacement, openContainer.firstChild);
            attachStatusHandlers(replacement);
          }

          const btn = group.querySelector('.checklist-row.integrated-plus .add-row');
          if (btn) btn.style.display = 'none';
        }

        if (target && target !== group.parentElement) {
          target.appendChild(group);
        }

        updateCounts();
      });
    });
  }

  function initSupportPage() {
    let first = openContainer.querySelector('.ticket-group');
    if (!ticketTemplate && first) {
      ticketTemplate = first.cloneNode(true);
    }

    if (!first && ticketTemplate) {
      first = ticketTemplate.cloneNode(true);
      openContainer.appendChild(first);
    }

    if (first) {
      resetTicketGroup(first, true);
      attachStatusHandlers(first);
    }

    attachStatusHandlers(tierContainer);
    attachStatusHandlers(closedResCont);
    attachStatusHandlers(closedFeatCont);

    updateCounts();
  }

  function addNewTicket() {
    if (!ticketTemplate) {
      const base = openContainer.querySelector('.ticket-group') || supportSection.querySelector('.ticket-group');
      if (!base) return;
      ticketTemplate = base.cloneNode(true);
    }
    const newGroup = ticketTemplate.cloneNode(true);
    resetTicketGroup(newGroup, false); // new ones have no visible +
    openContainer.appendChild(newGroup);
    attachStatusHandlers(newGroup);
    updateCounts();
  }

  function resetSupportTicketsPage() {
    [openContainer, tierContainer, closedResCont, closedFeatCont].forEach(c => {
      if (c) c.innerHTML = '';
    });
    initSupportPage();
  }

  // expose helpers
  window.__supportAddNewTicket = addNewTicket;
  window.__resetSupportTicketsPage = resetSupportTicketsPage;

  initSupportPage();
}

/* =====================================================
   GENERIC ADD BUTTONS (integrated-plus rows)
   - Handles:
     • Open Support Tickets (+)  → new ticket card
     • Additional POC           → new bordered POC card
     • All other integrated-plus → clone row under as normal text row
   ===================================================== */
function initGenericAddButtons() {
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    if (btn.dataset.boundAdd === '1') return;
    btn.dataset.boundAdd = '1';

    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');

      /* 1) SUPPORT TICKETS – Open Support Tickets card */
      if (section && section.id === 'support-ticket' && btn.closest('#openTicketsContainer')) {
        if (typeof window.__supportAddNewTicket === 'function') {
          window.__supportAddNewTicket();
        }
        return;
      }

      /* 2) ADDITIONAL POC – clone entire POC card with border */
      const pocCard = btn.closest('.poc-card');
      const pocContainer = document.getElementById('additionalPocContainer');
      if (pocCard && pocContainer) {
        const newCard = pocCard.cloneNode(true);

        // clear values
        newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
          el.value = '';
        });

        // In the cloned card, remove the + button (only the first card has +)
        const newBtn = newCard.querySelector('.add-row');
        if (newBtn) newBtn.remove();

        pocContainer.appendChild(newCard);
        return;
      }

      /* 3) DEFAULT – for all other integrated-plus text boxes */
      const row = btn.closest('.checklist-row');
      if (!row) return;

      const originalInput = row.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      if (!originalInput) return;

      const newRow = row.cloneNode(true);

      // Remove add button from cloned row
      const newBtn = newRow.querySelector('.add-row');
      if (newBtn) newBtn.remove();

      // Remove integrated-plus so CSS treats it as full-width, normal row
      newRow.classList.remove('integrated-plus');

      newRow.querySelectorAll('input[type="text"], input[type="number"], input[type="email"]').forEach(el => {
        el.value = '';
        el.style.marginTop = '6px';
        el.style.borderTopRightRadius = '14px';
        el.style.borderBottomRightRadius = '14px';
        el.style.width = '';  // let CSS apply normal width
      });

      // Insert exactly ONE new line under the current one
      row.insertAdjacentElement('afterend', newRow);
    });
  });
}

/* =====================================================
   CLEAR PAGE BUTTONS (per-page reset)
   ===================================================== */
function initClearPageButtons() {
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    if (btn.dataset.boundClear === '1') return;
    btn.dataset.boundClear = '1';

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

      page.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      page.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });

      if (page.id === 'support-ticket' && typeof window.__resetSupportTicketsPage === 'function') {
        window.__resetSupportTicketsPage();
      }
    });
  });
}

/* =====================================================
   CLEAR ALL BUTTON (global reset)
   ===================================================== */
function initClearAllButton() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;
  if (clearAllBtn.dataset.boundClearAll === '1') return;
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

    document.querySelectorAll('select').forEach(select => {
      select.selectedIndex = 0;
    });

    document.querySelectorAll('textarea').forEach(area => {
      area.value = '';
    });

    if (typeof window.__resetSupportTicketsPage === 'function') {
      window.__resetSupportTicketsPage();
    }
  });
}

/* =====================================================
   SAVE AS PDF (Training Summary Page)
   ===================================================== */
function initSaveAsPDF() {
  const saveBtn = document.getElementById('savePDF');
  if (!saveBtn) return;

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
