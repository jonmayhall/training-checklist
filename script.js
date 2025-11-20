// =======================================================
// myKaarma Interactive Training Checklist – FULL JS (Hardened)
// Nav, Training Tables, Support Tickets, Clear Page, Clear All, PDF
// =======================================================

window.addEventListener('DOMContentLoaded', () => {
  initSidebarNav();
  initTrainingTableAddRows();
  initGenericAddButtons();
  initClearPageButtons();
  initClearAllButton();
  initSaveAsPDF();

  // Support Tickets are the most complex – keep them isolated
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
   SUPPORT TICKETS – SETUP + MOVEMENT
   ===================================================== */

function initSupportTickets() {
  const supportSection = document.getElementById('support-ticket');
  if (!supportSection) return;

  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openTicketsContainer || !tierTwoTicketsContainer || !closedResolvedTicketsContainer || !closedFeatureTicketsContainer) {
    console.warn('One or more support ticket containers missing.');
    return;
  }

  // Grab h2 headers in order
  const headers = supportSection.querySelectorAll('h2');
  let openHeader = null, tierHeader = null, closedResolvedHeader = null, closedFeatureHeader = null;
  if (headers.length >= 4) {
    [openHeader, tierHeader, closedResolvedHeader, closedFeatureHeader] = headers;
    [openHeader, tierHeader, closedResolvedHeader, closedFeatureHeader].forEach(h => {
      if (h && !h.dataset.baseTitle) {
        h.dataset.baseTitle = h.textContent.replace(/\s*\(\d+\)\s*$/, '');
      }
    });
  }

  let ticketTemplate = null;

  // Normalize status text into keys
  function normalizeTicketStatus(text) {
    if (!text) return 'open';
    let t = text.toLowerCase().trim();
    t = t.replace(/\s+/g, ' '); // collapse spaces
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

  function updateTicketCounts() {
    const openCount = openTicketsContainer.querySelectorAll('.ticket-group').length;
    const tierCount = tierTwoTicketsContainer.querySelectorAll('.ticket-group').length;
    const closedResCount = closedResolvedTicketsContainer.querySelectorAll('.ticket-group').length;
    const closedFeatCount = closedFeatureTicketsContainer.querySelectorAll('.ticket-group').length;

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
            resetTicketGroup(replacement, true);
            openTicketsContainer.insertBefore(replacement, openTicketsContainer.firstChild);
            attachTicketStatusHandlers(replacement);
          }

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

  function initSupportPage() {
    let first = openTicketsContainer.querySelector('.ticket-group');
    if (!ticketTemplate && first) {
      ticketTemplate = first.cloneNode(true);
    }

    if (!first && ticketTemplate) {
      first = ticketTemplate.cloneNode(true);
      openTicketsContainer.appendChild(first);
    }

    if (first) {
      resetTicketGroup(first, true);
      attachTicketStatusHandlers(first);
    }

    // In case anything already exists in other containers
    attachTicketStatusHandlers(tierTwoTicketsContainer);
    attachTicketStatusHandlers(closedResolvedTicketsContainer);
    attachTicketStatusHandlers(closedFeatureTicketsContainer);

    updateTicketCounts();
  }

  function supportAddNewTicket() {
    if (!openTicketsContainer) return;

    if (!ticketTemplate) {
      const base = openTicketsContainer.querySelector('.ticket-group') || supportSection.querySelector('.ticket-group');
      if (!base) return;
      ticketTemplate = base.cloneNode(true);
    }

    const newGroup = ticketTemplate.cloneNode(true);
    resetTicketGroup(newGroup, false); // new ones do NOT show + button
    openTicketsContainer.appendChild(newGroup);
    attachTicketStatusHandlers(newGroup);
    updateTicketCounts();
  }

  function resetSupportTicketsPage() {
    [openTicketsContainer, tierTwoTicketsContainer, closedResolvedTicketsContainer, closedFeatureTicketsContainer]
      .forEach(container => {
        if (container) container.innerHTML = '';
      });

    initSupportPage();
  }

  // expose helper so Clear Page & Clear All can use it
  window.__resetSupportTicketsPage = resetSupportTicketsPage;
  window.__supportAddNewTicket = supportAddNewTicket;

  initSupportPage();
}

/* =====================================================
   GENERIC ADD BUTTONS (integrated-plus rows)
   - Special case for OPEN SUPPORT TICKETS
   ===================================================== */
function initGenericAddButtons() {
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) Support Tickets – only Open Support Tickets container uses + to create a new ticket
      if (btn.closest('#support-ticket') && btn.closest('#openTicketsContainer')) {
        if (typeof window.__supportAddNewTicket === 'function') {
          window.__supportAddNewTicket();
        }
        return;
      }

      // 2) Everything else – clone row below and remove + from new row
      const row = btn.closest('.checklist-row');
      const block = btn.closest('.section-block');
      if (!row || !block) return;

      const originalInput = row.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      if (!originalInput) return;

      const newRow = row.cloneNode(true);

      const newBtn = newRow.querySelector('.add-row');
      if (newBtn) newBtn.remove();

      newRow.classList.remove('integrated-plus');

      newRow.querySelectorAll('input[type="text"], input[type="number"], input[type="email"]').forEach(el => {
        el.value = '';
        el.style.marginTop = '6px';
        el.style.borderTopRightRadius = '14px';
        el.style.borderBottomRightRadius = '14px';
      });

      row.insertAdjacentElement('afterend', newRow);
    });
  });
}

/* =====================================================
   CLEAR PAGE BUTTONS (per-page reset)
   ===================================================== */
function initClearPageButtons() {
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
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

      // special handling for Support Ticket page
      if (page.id === 'support-ticket' && typeof window.__resetSupportTicketsPage === 'function') {
        window.__resetSupportTicketsPage();
      }
    });
  });
}

/* =====================================================
   CLEAR ALL BUTTON (global reset with double confirmation)
   ===================================================== */
function initClearAllButton() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;

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
