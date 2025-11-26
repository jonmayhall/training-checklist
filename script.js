document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initDealershipNameMirror();
  initClearPageButtons();
  initClearAllButton();
  initDynamicTables();
  initSupportTickets();
  initPDFExport();
});

/* NAVIGATION */

function initNav() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      let targetSection = document.getElementById(targetId);

      // Fallback for first button: data-target="onsite-trainers" → id="trainers-page"
      if (!targetSection && targetId === 'onsite-trainers') {
        targetSection = document.getElementById('trainers-page');
      }
      if (!targetSection) return;

      navButtons.forEach((b) => b.classList.remove('active'));
      sections.forEach((s) => s.classList.remove('active'));

      btn.classList.add('active');
      targetSection.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Ensure at least one section is active
  const anyActive = document.querySelector('.page-section.active');
  if (!anyActive && sections[0]) {
    sections[0].classList.add('active');
  }
}

/* DEALERSHIP NAME → TOP BAR MIRROR */

function initDealershipNameMirror() {
  const input = document.getElementById('dealershipNameInput');
  const display = document.getElementById('dealershipNameDisplay');
  if (!input || !display) return;

  const update = () => {
    const value = input.value.trim();
    display.textContent = value || 'Dealership Name';
  };

  input.addEventListener('input', update);
  update();
}

/* CLEAR PAGE / CLEAR ALL */

function initClearPageButtons() {
  const clearPageButtons = document.querySelectorAll('.clear-page-btn');
  clearPageButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      if (!section) return;
      resetSection(section);
    });
  });
}

function initClearAllButton() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;

  clearAllBtn.addEventListener('click', () => {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach((section) => resetSection(section));
  });
}

/**
 * Reset a single page-section: inputs, textareas, selects,
 * plus special handling for Support Tickets.
 */
function resetSection(section) {
  // Special case: support tickets
  if (section.id === 'support-ticket') {
    const openContainer = document.getElementById('openTicketsContainer');
    const tierTwo = document.getElementById('tierTwoTicketsContainer');
    const closedResolved = document.getElementById('closedResolvedTicketsContainer');
    const closedFeature = document.getElementById('closedFeatureTicketsContainer');

    if (tierTwo) tierTwo.innerHTML = '';
    if (closedResolved) closedResolved.innerHTML = '';
    if (closedFeature) closedFeature.innerHTML = '';

    if (openContainer) {
      // Keep only the template card
      openContainer
        .querySelectorAll('.ticket-group:not(.ticket-group-template)')
        .forEach((card) => card.remove());

      const template = openContainer.querySelector('.ticket-group-template');
      if (template) {
        template.querySelectorAll('input').forEach((input) => {
          input.value = '';
        });
        const statusSelect = template.querySelector('.ticket-status-select');
        if (statusSelect) {
          statusSelect.value = 'Open';
        }
      }
    }
  }

  // Generic reset for inputs / textareas / selects
  const inputs = section.querySelectorAll('input');
  const textareas = section.querySelectorAll('textarea');
  const selects = section.querySelectorAll('select');

  inputs.forEach((input) => {
    const type = input.type;
    if (type === 'checkbox' || type === 'radio') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });

  textareas.forEach((ta) => (ta.value = ''));

  selects.forEach((sel) => {
    // For support ticket status in template, use Open
    if (sel.classList.contains('ticket-status-select') && section.id === 'support-ticket') {
      sel.value = 'Open';
    } else {
      sel.selectedIndex = 0;
    }
  });

  // Re-sync top bar dealership name if this section had the input
  if (section.querySelector('#dealershipNameInput')) {
    const input = document.getElementById('dealershipNameInput');
    const display = document.getElementById('dealershipNameDisplay');
    if (input && display) {
      display.textContent = 'Dealership Name';
    }
  }
}

/* DYNAMIC TABLE ROWS (ALL TABLES WITH .add-row, EXCEPT SUPPORT TICKET TEMPLATE) */

function initDynamicTables() {
  // Only buttons inside .table-container are for rows
  const addRowButtons = document.querySelectorAll('.table-container .add-row');

  addRowButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const table = btn.closest('.table-container')?.querySelector('table');
      if (!table) return;

      const tbody = table.querySelector('tbody');
      if (!tbody || !tbody.rows.length) return;

      const lastRow = tbody.rows[tbody.rows.length - 1];
      const newRow = lastRow.cloneNode(true);

      // Clear values
      newRow.querySelectorAll('input').forEach((input) => {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      newRow.querySelectorAll('select').forEach((sel) => {
        sel.selectedIndex = 0;
      });

      tbody.appendChild(newRow);
    });
  });
}

/* SUPPORT TICKETS LOGIC */

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  // Use the FIRST .ticket-group as the permanent template
  const templateCard = openContainer.querySelector('.ticket-group');
  if (!templateCard) return;

  // Mark it so resetSection can keep it
  templateCard.classList.add('ticket-group-template');
  templateCard.dataset.template = 'true';

  // Wire status behavior for the template (but it never moves)
  wireTicketCard(templateCard, {
    isTemplate: true,
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
  });

  // The "+" button on the template (inside the integrated-plus row)
  const addBtn = templateCard.querySelector('.integrated-plus .add-row');
  if (addBtn) {
    addBtn.classList.add('add-ticket-btn'); // purely semantic, not used by table logic

    addBtn.addEventListener('click', () => {
      const newCard = templateCard.cloneNode(true);

      // New card is not a template
      newCard.classList.remove('ticket-group-template');
      newCard.removeAttribute('data-template');

      // Remove the + button from cloned card
      const clonedAdd = newCard.querySelector('.add-ticket-btn');
      if (clonedAdd) {
        clonedAdd.remove();
      }

      // Clear inputs
      newCard.querySelectorAll('input').forEach((input) => {
        input.value = '';
      });

      // Reset selects (status goes to Open by default)
      newCard.querySelectorAll('select').forEach((sel) => {
        if (sel.classList.contains('ticket-status-select')) {
          sel.value = 'Open';
        } else {
          sel.selectedIndex = 0;
        }
      });

      // Insert directly under the template card
      const nextSibling = templateCard.nextElementSibling;
      if (nextSibling) {
        openContainer.insertBefore(newCard, nextSibling);
      } else {
        openContainer.appendChild(newCard);
      }

      // Wire status change for the new card
      wireTicketCard(newCard, {
        isTemplate: false,
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer,
      });
    });
  }
}

function wireTicketCard(card, containers) {
  const {
    isTemplate,
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
  } = containers;

  const statusSelect = card.querySelector('.ticket-status-select');
  if (!statusSelect) return;

  statusSelect.addEventListener('change', () => {
    const value = statusSelect.value;

    // Template card never moves – force status Open
    if (isTemplate) {
      if (value !== 'Open') {
        statusSelect.value = 'Open';
      }
      return;
    }

    let targetContainer = openContainer;

    if (value === 'Tier Two') {
      targetContainer = tierTwoContainer;
    } else if (value === 'Closed - Resolved') {
      targetContainer = closedResolvedContainer;
    } else if (value.includes('Feature Not Supported')) {
      targetContainer = closedFeatureContainer;
    } else if (value === 'Open') {
      targetContainer = openContainer;
    }

    if (targetContainer) {
      targetContainer.appendChild(card);
    }
  });
}

/* PDF EXPORT (OUTLINE VERSION) */

function initPDFExport() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library (jsPDF) is not available.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    const sections = document.querySelectorAll('.page-section');
    let pageIndex = 0;

    sections.forEach((section) => {
      const titleEl = section.querySelector('h1');
      if (!titleEl) return;

      if (pageIndex > 0) {
        doc.addPage();
      }

      let y = 50;
      doc.setFontSize(16);
      doc.text(titleEl.textContent.trim(), 40, y);
      y += 22;

      const subtitleEl = section.querySelector('.page-subtitle');
      if (subtitleEl) {
        doc.setFontSize(10);
        const text = doc.splitTextToSize(subtitleEl.textContent.trim(), 520);
        doc.text(text, 40, y);
      }

      pageIndex++;
    });

    doc.save('myKaarma_Training_Checklist.pdf');
  });
}
