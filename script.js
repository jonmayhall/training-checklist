// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Clear, Dynamic Rows, Support Tickets, PDF
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  setupSidebarNav();
  setupClearButtons();
  setupTableAddRow();
  setupAdditionalTrainers();
  setupAdditionalPocCloning();
  setupSupportTickets();
  setupPdfExport();
  setupDealershipNameBinding();
});

// --------------- SIDEBAR NAVIGATION ---------------
function setupSidebarNav() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  if (!navButtons.length || !sections.length) return;

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;

      sections.forEach(sec => {
        sec.classList.toggle('active', sec.id === targetId);
      });

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  });
}

// --------------- CLEAR BUTTONS (PAGE + ALL) ---------------
function setupClearButtons() {
  const clearPageButtons = document.querySelectorAll('.clear-page-btn');
  clearPageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      if (section) {
        clearInputsInRoot(section);
      }
    });
  });

  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const app = document.getElementById('app');
      if (app) {
        clearInputsInRoot(app);
      }
    });
  }
}

function clearInputsInRoot(root) {
  if (!root) return;

  const inputs = root.querySelectorAll(
    'input[type="text"], input[type="number"], input[type="email"], input[type="date"], input[type="search"], input[type="tel"]'
  );
  inputs.forEach(input => {
    input.value = '';
  });

  const checkboxes = root.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = false;
  });

  const textareas = root.querySelectorAll('textarea');
  textareas.forEach(ta => {
    ta.value = '';
  });

  const selects = root.querySelectorAll('select');
  selects.forEach(sel => {
    sel.selectedIndex = 0;
  });
}

// --------------- TABLE "+ ROW" HANDLER ---------------
function setupTableAddRow() {
  const addButtons = document.querySelectorAll('.table-footer .add-row');
  if (!addButtons.length) return;

  addButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tableContainer = btn.closest('.table-container');
      if (!tableContainer) return;

      const table = tableContainer.querySelector('table.training-table');
      if (!table) return;

      const tbody = table.querySelector('tbody');
      if (!tbody || !tbody.rows.length) return;

      const lastRow = tbody.rows[tbody.rows.length - 1];
      const newRow = lastRow.cloneNode(true);

      // Clear values in cloned row
      newRow.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });
      newRow.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      tbody.appendChild(newRow);
    });
  });
}

// --------------- ADDITIONAL TRAINERS (PAGE 1) ---------------
function setupAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  if (!row) return;

  const addBtn = row.querySelector('.add-row');
  const container = document.getElementById('additionalTrainersContainer');

  if (!addBtn || !container) return;

  addBtn.addEventListener('click', () => {
    // Convert the original row to a normal row (no +)
    row.classList.remove('integrated-plus');
    addBtn.remove();

    // Create new textbox directly below
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub';

    const label = document.createElement('label');
    label.textContent = 'Additional trainer';

    const input = document.createElement('input');
    input.type = 'text';

    newRow.appendChild(label);
    newRow.appendChild(input);

    container.appendChild(newRow);
  }, { once: true });
}

// --------------- ADDITIONAL POC CARDS (PAGE 2) ---------------
function setupAdditionalPocCloning() {
  document.addEventListener('click', function (e) {
    if (!e.target.classList.contains('additional-poc-add')) return;

    const templateCard = e.target.closest('.additional-poc-card');
    const container = document.getElementById('additionalPocContainer');
    if (!templateCard || !container) return;

    const newCard = templateCard.cloneNode(true);

    // Clear values
    newCard.querySelectorAll('input').forEach(input => {
      input.value = '';
    });

    // First row: drop integrated-plus class & remove + button on clones
    const firstRow = newCard.querySelector('.checklist-row');
    if (firstRow) {
      firstRow.classList.remove('integrated-plus');

      const addBtn = firstRow.querySelector('.additional-poc-add');
      if (addBtn) {
        addBtn.remove();
      }
    }

    container.appendChild(newCard);
  });
}

// --------------- SUPPORT TICKETS (PAGE 7) ---------------
function setupSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  // Add new ticket from template
  document.addEventListener('click', function (e) {
    if (!e.target.classList.contains('add-ticket-btn')) return;

    const templateGroup = e.target.closest('.ticket-group');
    if (!templateGroup) return;

    const newGroup = templateGroup.cloneNode(true);

    // Remove template-specific attributes/classes
    if (newGroup.dataset) {
      delete newGroup.dataset.template;
    }
    newGroup.classList.remove('ticket-group-template');

    // Clear inputs
    newGroup.querySelectorAll('input[type="text"]').forEach(input => {
      input.value = '';
    });

    // Set status back to "Open"
    const statusSelect = newGroup.querySelector('.ticket-status-select');
    if (statusSelect) {
      statusSelect.value = 'Open';
    }

    // On clones: remove the + button and integrated-plus layout
    const firstRow = newGroup.querySelector('.checklist-row');
    if (firstRow) {
      firstRow.classList.remove('integrated-plus');
      const addBtn = firstRow.querySelector('.add-ticket-btn');
      if (addBtn) addBtn.remove();
    }

    openContainer.appendChild(newGroup);
  });

  // Move tickets between sections based on status
  document.addEventListener('change', function (e) {
    if (!e.target.classList.contains('ticket-status-select')) return;

    const card = e.target.closest('.ticket-group');
    if (!card) return;

    const status = e.target.value;
    let destination = null;

    switch (status) {
      case 'Open':
        destination = openContainer;
        break;
      case 'Tier Two':
        destination = tierTwoContainer;
        break;
      case 'Closed - Resolved':
        destination = closedResolvedContainer;
        break;
      case 'Closed – Feature Not Supported':
      case 'Closed - Feature Not Supported':
        destination = closedFeatureContainer;
        break;
      default:
        destination = openContainer;
        break;
    }

    if (destination && destination !== card.parentElement) {
      destination.appendChild(card);
    }
  });
}

// --------------- PDF EXPORT (PAGE 10) ---------------
function setupPdfExport() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library not loaded.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    const root = document.body;

    doc.html(root, {
      callback: function (pdf) {
        pdf.save('myKaarma_Training_Checklist.pdf');
      },
      margin: [20, 20, 20, 20],
      autoPaging: 'text',
      html2canvas: {
        scale: 0.6,
        useCORS: true
      }
    });
  });
}

// --------------- DEALERSHIP NAME DISPLAY ---------------
function setupDealershipNameBinding() {
  const display = document.getElementById('dealershipNameDisplay');
  const input = document.getElementById('dealershipNameInput');

  if (!display || !input) return;

  const sync = () => {
    const value = input.value.trim();
    display.textContent = value || 'Dealership Name';
  };

  input.addEventListener('input', sync);
  sync();
}
