/* =======================================================
   myKaarma Interactive Training Checklist – Main JS
   Nav + Clear + Additional Trainers + Additional POC + Tickets + PDF
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initAdditionalTrainers();
  initAdditionalPoc();
  initSupportTickets();
  initTableAddRowButtons();
  initPdfExport();
});

/* --------------- NAVIGATION --------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  if (!navButtons.length || !sections.length) return;

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      sections.forEach((sec) => {
        sec.classList.toggle('active', sec.id === targetId);
      });
      navButtons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // If nothing is active yet, activate the first section & first nav button
  const anyActive = Array.from(sections).some(sec => sec.classList.contains('active'));
  if (!anyActive) {
    sections[0].classList.add('active');
    if (navButtons[0]) {
      navButtons[0].classList.add('active');
    }
  }
}

/* --------------- CLEAR PAGE / CLEAR ALL --------------- */
function clearSection(section) {
  if (!section) return;

  // 1) Clear all inputs/selects/textareas
  const inputs = section.querySelectorAll('input, select, textarea');

  inputs.forEach((el) => {
    if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });

  // 2) Remove dynamically-added Additional Trainer rows
  const extraTrainerRows = section.querySelectorAll('.additional-trainer-row');
  extraTrainerRows.forEach(row => row.remove());

  // 3) Remove dynamically-added Additional POC cards
  const extraPocCards = section.querySelectorAll('.additional-poc-instance');
  extraPocCards.forEach(card => card.remove());

  // 4) Remove cloned ticket cards (keep the template)
  const extraTickets = section.querySelectorAll('.ticket-group-instance');
  extraTickets.forEach(card => card.remove());

  // 5) Reset the ticket template back to "Open" and move it to Open container
  const ticketTemplate = section.querySelector('.ticket-group-template');
  if (ticketTemplate) {
    const statusSelect = ticketTemplate.querySelector('.ticket-status-select');
    if (statusSelect) statusSelect.value = 'Open';

    const openContainer = document.getElementById('openTicketsContainer');
    if (openContainer && ticketTemplate.parentElement !== openContainer) {
      openContainer.appendChild(ticketTemplate);
    }
  }

  // 6) Reset table bodies to only one row
  const tables = section.querySelectorAll('.training-table');
  tables.forEach((table) => {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.children);
    if (rows.length > 1) {
      rows.slice(1).forEach(r => r.remove());
    }
  });
}

function initClearPageButtons() {
  const buttons = document.querySelectorAll('.clear-page-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      clearSection(section);
      // If we cleared the dealership-info page, refresh topbar name.
      if (section && section.id === 'dealership-info') {
        updateDealershipNameDisplay();
      }
    });
  });
}

function initClearAllButton() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;

  clearAllBtn.addEventListener('click', () => {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(clearSection);
    updateDealershipNameDisplay();
  });
}

/* --------------- DEALERSHIP NAME BINDING --------------- */
function initDealershipNameBinding() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  if (!dealershipNameInput) return;

  dealershipNameInput.addEventListener('input', updateDealershipNameDisplay);
  // Initialize on load in case a value is pre-filled.
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  const dealershipNameDisplay = document.getElementById('dealershipNameDisplay');
  if (!dealershipNameDisplay) return;

  const val = dealershipNameInput ? dealershipNameInput.value.trim() : '';
  dealershipNameDisplay.textContent = val || 'Dealership Name';
}

/* --------------- ADDITIONAL TRAINERS (PAGE 1) --------------- */
function initAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');
  if (!row || !container) return;

  const addBtn = row.querySelector('.add-row');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    // Create a normal row directly below the integrated row.
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub additional-trainer-row';

    const label = document.createElement('label');
    label.textContent = 'Additional Trainer';
    // Match the indented label width/spacing
    label.style.flex = '0 0 36%';
    label.style.paddingRight = '12px';

    const input = document.createElement('input');
    input.type = 'text';

    newRow.appendChild(label);
    newRow.appendChild(input);

    container.appendChild(newRow);
  });
}

/* --------------- ADDITIONAL POC CARDS (PAGE 2) --------------- */
/*
  Behavior:
  - The .additional-poc-card with the + button is permanent and ALWAYS stays first
    inside #primaryContactsGrid.
  - Clicking + keeps whatever text is in that card and appends a new normal
    Additional POC mini-card AFTER all existing POC cards.
  - New cards are normal mini-cards with a rounded name textbox (no + button).
*/
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const templateCard = grid.querySelector('.additional-poc-card');
  if (!templateCard) return;

  const addBtn = templateCard.querySelector('.additional-poc-add');
  if (!addBtn) return;

  function createNormalPocCard() {
    const card = document.createElement('div');
    card.className = 'mini-card contact-card additional-poc-instance';

    card.innerHTML = `
      <div class="checklist-row">
        <label>Additional POC</label>
        <input type="text">
      </div>
      <div class="checklist-row indent-sub">
        <label>Role</label>
        <input type="text">
      </div>
      <div class="checklist-row indent-sub">
        <label>Cell</label>
        <input type="text">
      </div>
      <div class="checklist-row indent-sub">
        <label>Email</label>
        <input type="email">
      </div>
    `;

    return card;
  }

  addBtn.addEventListener('click', () => {
    const newCard = createNormalPocCard();
    grid.appendChild(newCard);
  });
}

/* --------------- SUPPORT TICKETS (PAGE 7) --------------- */
/*
  - There is a single "template" open ticket card in #openTicketsContainer
    with class .ticket-group-template and a + button (.add-ticket-btn).
  - Clicking + clones that template into a new Open ticket card (without + button).
  - Each card's Ticket Status dropdown moves the card to the correct section:
      Open / Tier Two / Closed - Resolved / Closed – Feature Not Supported
*/

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketFromTemplate(template);
      openContainer.appendChild(newCard);
    });
  }

  // Wire up template itself for status changes
  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });
}

function createTicketFromTemplate(template) {
  const clone = template.cloneNode(true);

  // It's no longer the template
  clone.classList.remove('ticket-group-template');
  clone.classList.add('ticket-group-instance');
  clone.removeAttribute('data-template');

  // Remove the add button on clones
  const addBtn = clone.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.remove();
  }

  // Clear all inputs/selects/textarea in the clone
  const fields = clone.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (el.tagName === 'SELECT') {
      // Status defaults to Open
      if (el.classList.contains('ticket-status-select')) {
        el.value = 'Open';
      } else {
        el.selectedIndex = 0;
      }
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });

  // Wire up status logic
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  wireTicketStatus(clone, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });

  return clone;
}

function wireTicketStatus(card, containers) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const value = select.value;
    let targetContainer = containers.openContainer;

    if (value === 'Tier Two') {
      targetContainer = containers.tierTwoContainer;
    } else if (value === 'Closed - Resolved') {
      targetContainer = containers.closedResolvedContainer;
    } else if (value === 'Closed – Feature Not Supported') {
      targetContainer = containers.closedFeatureContainer;
    }

    if (targetContainer && targetContainer !== card.parentElement) {
      targetContainer.appendChild(card);
    }
  });
}

/* --------------- TABLE "+" BUTTONS (append empty row) --------------- */
function initTableAddRowButtons() {
  const tableFooters = document.querySelectorAll('.table-footer .add-row');

  tableFooters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const footer = btn.closest('.table-footer');
      if (!footer) return;

      const container = footer.previousElementSibling;
      if (!container) return;

      const table = container.querySelector('table');
      if (!table) return;

      const tbody = table.querySelector('tbody') || table.createTBody();
      const lastRow = tbody.lastElementChild;

      if (!lastRow) return;

      const newRow = lastRow.cloneNode(true);

      // Clear values in cloned row
      const fields = newRow.querySelectorAll('input, select, textarea');
      fields.forEach((el) => {
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = false;
        } else {
          el.value = '';
        }
      });

      tbody.appendChild(newRow);
    });
  });
}

/* --------------- PDF EXPORT (Summary page) --------------- */
function initPdfExport() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!window.jspdf) {
      console.warn('jsPDF not available.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    // This is a simple whole-page capture; styling may not be perfect but it works.
    doc.html(document.body, {
      callback: (docInstance) => {
        docInstance.save('myKaarma_Training_Checklist.pdf');
      },
      margin: [20, 20, 20, 20],
      autoPaging: 'text',
      html2canvas: {
        scale: 0.6
      }
    });
  });
}
