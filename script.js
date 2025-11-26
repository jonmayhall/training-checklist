// script.js
// myKaarma – Interactive Training Checklist
// Navigation, clear buttons, dynamic rows, support tickets routing, PDF export

// Map sidebar button targets to actual section IDs where needed
const PAGE_ID_MAP = {
  'onsite-trainers': 'trainers-page' // first button -> trainers page
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupClearButtons();
  setupDynamicTables();
  setupSupportTickets();
  setupPDFExport();
});

/* -----------------------------
   NAVIGATION
----------------------------- */
function setupNavigation() {
  const navButtons = document.querySelectorAll('#sidebar-nav .nav-btn');
  const sections = document.querySelectorAll('.page-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const rawTargetId = btn.dataset.target;
      const targetId = PAGE_ID_MAP[rawTargetId] || rawTargetId;

      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });

      // scroll main content to top when switching pages
      const main = document.querySelector('main');
      if (main) main.scrollTop = 0;
    });
  });
}

/* -----------------------------
   CLEAR BUTTONS
----------------------------- */
function clearInputsInScope(scope) {
  const inputs = scope.querySelectorAll('input');
  const selects = scope.querySelectorAll('select');
  const textareas = scope.querySelectorAll('textarea');

  inputs.forEach(input => {
    const type = input.type ? input.type.toLowerCase() : '';
    if (type === 'checkbox' || type === 'radio') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });

  selects.forEach(sel => {
    sel.selectedIndex = 0;
  });

  textareas.forEach(area => {
    area.value = '';
  });
}

function setupClearButtons() {
  // Per-page "Reset This Page"
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      if (section) clearInputsInScope(section);
    });
  });

  // Global "Clear All"
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.page-section').forEach(section => {
        clearInputsInScope(section);
      });
    });
  }
}

/* -----------------------------
   DYNAMIC TABLE ROWS
----------------------------- */
function setupDynamicTables() {
  document.addEventListener('click', event => {
    const target = event.target;
    if (!target.matches('button.add-row')) return;

    // If this is inside the Support Tickets open container, let the ticket logic handle it
    if (target.closest('#openTicketsContainer')) {
      handleSupportTicketAdd(target);
      return;
    }

    // Otherwise treat as table row add
    const tableContainer = target.closest('.table-container');
    if (!tableContainer) return;

    const table = tableContainer.querySelector('table');
    if (!table || !table.tBodies.length) return;

    const tbody = table.tBodies[0];
    const lastRow = tbody.rows[tbody.rows.length - 1];
    if (!lastRow) return;

    const newRow = lastRow.cloneNode(true);

    // Clear values in cloned row
    newRow.querySelectorAll('input').forEach(input => {
      const type = input.type ? input.type.toLowerCase() : '';
      if (type === 'checkbox' || type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });

    newRow.querySelectorAll('select').forEach(sel => {
      sel.selectedIndex = 0;
    });

    tbody.appendChild(newRow);
  });
}

/* -----------------------------
   SUPPORT TICKETS
   - "+" in the permanent card adds a NEW card directly under it
   - New card has no "+" button
   - New card moves between Open / Tier Two / Closed sections based on dropdown
----------------------------- */
function setupSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer || !tierTwoContainer || !closedResolvedContainer || !closedFeatureContainer) {
    return; // if the page isn't present, bail
  }

  // The first ticket-group inside Open is the permanent template
  const templateCard = openContainer.querySelector('.ticket-group');
  if (!templateCard) return;

  // IMPORTANT: Do NOT attach move logic to the template, only to cloned cards
  // The template stays under "Open Support Tickets" and keeps the "+"

  // Delegate clicks for "+" (add-row) inside the Open container
  openContainer.addEventListener('click', event => {
    const btn = event.target;
    if (!btn.matches('button.add-row')) return;
    // This call is also used in dynamic tables logic to make sure we only handle tickets here
    handleSupportTicketAdd(btn);
  });

  // Helper for attaching status-change listener to cloned cards
  function attachStatusListener(card) {
    const statusSelect = card.querySelector('.ticket-status-select');
    if (!statusSelect) return;

    statusSelect.addEventListener('change', () => {
      const value = statusSelect.value || '';

      let targetContainer = null;

      if (value === 'Open') {
        targetContainer = openContainer;
      } else if (value === 'Tier Two') {
        targetContainer = tierTwoContainer;
      } else if (value === 'Closed - Resolved') {
        targetContainer = closedResolvedContainer;
      } else if (value.indexOf('Feature Not Supported') !== -1) {
        // Handles "Closed – Feature Not Supported" with different dash characters
        targetContainer = closedFeatureContainer;
      }

      if (targetContainer) {
        targetContainer.appendChild(card);
      }
    });
  }

  // Expose helper so handleSupportTicketAdd can use it
  setupSupportTickets.attachStatusListener = attachStatusListener;
  setupSupportTickets.templateCard = templateCard;
}

function handleSupportTicketAdd(btn) {
  const openContainer = document.getElementById('openTicketsContainer');
  if (!openContainer) return;

  const templateCard = setupSupportTickets.templateCard;
  const attachStatusListener = setupSupportTickets.attachStatusListener;

  if (!templateCard || !attachStatusListener) return;

  // Clone the permanent card
  const newCard = templateCard.cloneNode(true);

  // Remove the "+" button from the cloned card
  const clonedAddBtn = newCard.querySelector('button.add-row');
  if (clonedAddBtn) clonedAddBtn.remove();

  // Clear all inputs/selects in cloned card
  newCard.querySelectorAll('input').forEach(input => {
    const type = input.type ? input.type.toLowerCase() : '';
    if (type === 'checkbox' || type === 'radio') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });

  newCard.querySelectorAll('select').forEach(sel => {
    // default status for new card is "Open"
    if (sel.classList.contains('ticket-status-select')) {
      sel.value = 'Open';
    } else {
      sel.selectedIndex = 0;
    }
  });

  // Insert new card directly under the permanent card
  if (templateCard.nextSibling) {
    openContainer.insertBefore(newCard, templateCard.nextSibling);
  } else {
    openContainer.appendChild(newCard);
  }

  // Attach status-change handler so THIS card moves between lists
  attachStatusListenerToTicket(newCard, attachStatusListener);
}

function attachStatusListenerToTicket(card, attachStatusListener) {
  // In case we are calling from outside setupSupportTickets
  if (typeof attachStatusListener === 'function') {
    attachStatusListener(card);
  } else if (typeof setupSupportTickets.attachStatusListener === 'function') {
    setupSupportTickets.attachStatusListener(card);
  }
}

/* -----------------------------
   PDF EXPORT (simple version)
----------------------------- */
function setupPDFExport() {
  const saveBtn = document.getElementById('savePDF');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    // Simple, reliable fallback: use browser's print-to-PDF
    // (keeps your layout and tables intact without heavy custom jsPDF logic)
    window.print();
  });
}
