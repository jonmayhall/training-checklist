/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS (CLEAN)
   ========================================================== */

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
  initDmsCards();
});

/* -------------------------------------
   NAVIGATION
------------------------------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  if (!navButtons.length || !sections.length) return;

  // Ensure one section + one button are active on load
  let activeSection = document.querySelector('.page-section.active');
  let activeButton = document.querySelector('.nav-btn.active');

  if (!activeSection) {
    activeSection = sections[0];
    activeSection.classList.add('active');
  }

  if (!activeButton) {
    const match = Array.from(navButtons).find(
      (btn) => btn.dataset.target === activeSection.id
    );
    (match || navButtons[0]).classList.add('active');
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;

      sections.forEach((sec) => {
        sec.classList.toggle('active', sec.id === targetId);
      });

      navButtons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
}

/* -------------------------------------
   CLEAR PAGE / CLEAR ALL
------------------------------------- */
function clearSection(section) {
  if (!section) return;
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
}

function initClearPageButtons() {
  const buttons = document.querySelectorAll('.clear-page-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      clearSection(section);
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

/* -------------------------------------
   DEALERSHIP NAME TOPBAR SYNC
------------------------------------- */
function initDealershipNameBinding() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  if (!dealershipNameInput) return;

  dealershipNameInput.addEventListener('input', updateDealershipNameDisplay);
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  const dealershipNameDisplay = document.getElementById('dealershipNameDisplay');
  if (!dealershipNameDisplay) return;

  const val = dealershipNameInput ? dealershipNameInput.value.trim() : '';
  dealershipNameDisplay.textContent = val || 'Dealership Name';
}

/* -------------------------------------
   ADDITIONAL TRAINERS (PAGE 1)
------------------------------------- */
function initAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');
  if (!row || !container) return;

  const addBtn = row.querySelector('.add-row');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub';

    const label = document.createElement('label');
    label.textContent = 'Additional Trainer';
    label.style.flex = '0 0 36%';
    label.style.paddingRight = '12px';

    const input = document.createElement('input');
    input.type = 'text';

    newRow.appendChild(label);
    newRow.appendChild(input);

    container.appendChild(newRow);
  });
}

/* -------------------------------------
   ADDITIONAL POC CARDS (PAGE 2)
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const templateCard = grid.querySelector('.additional-poc-card');
  if (!templateCard) return;

  const addBtn = templateCard.querySelector('.additional-poc-add');
  if (!addBtn) return;

  function createNormalPocCard() {
    const card = document.createElement('div');
    card.className = 'mini-card contact-card';

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

/* -------------------------------------
   SUPPORT TICKETS
------------------------------------- */
function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  // Template stays un-numbered.
  let ticketCounter = 0;

  // Wire status movement for the template card
  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });

  // Add button on the template card – prevent double binding
  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = 'true';
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(template);

      // Increment counter and label this new card
      ticketCounter += 1;
      setTicketNumberLabel(newCard, ticketCounter);

      // New cards live in Open by default
      openContainer.appendChild(newCard);

      // Wire status movement on this new card
      wireTicketStatus(newCard, {
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer
      });
    });
  }
}

/**
 * Create a clean ticket card from the template.
 */
function createTicketCard(template) {
  const card = template.cloneNode(true);

  // Remove template-only class
  card.classList.remove('ticket-group-template');

  // Clear header label text
  const label = card.querySelector('.ticket-card-number');
  if (label) label.textContent = '';

  // Remove the + button from cloned cards
  const addBtn = card.querySelector('.add-ticket-btn');
  if (addBtn) addBtn.remove();

  // Reset fields
  card.querySelectorAll('input, textarea').forEach(el => {
    el.value = '';
  });

  // Default status back to Open
  const status = card.querySelector('.ticket-status-select');
  if (status) status.value = 'Open';

  return card;
}

/**
 * Set the visible Ticket # label on a card.
 */
function setTicketNumberLabel(card, number) {
  const label = card.querySelector('.ticket-card-number');
  if (label) {
    label.textContent = `Ticket # ${number}`;
  }
}

/**
 * Move cards between Open / Tier Two / Closed containers
 * when the Status dropdown changes.
 */
function wireTicketStatus(card, containers) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    let target = containers.openContainer;

    if (select.value === 'Tier Two') {
      target = containers.tierTwoContainer || containers.openContainer;
    } else if (select.value === 'Closed - Resolved') {
      target = containers.closedResolvedContainer || containers.openContainer;
    } else if (select.value === 'Closed – Feature Not Supported') {
      target = containers.closedFeatureContainer || containers.openContainer;
    }

    if (target && card.parentElement !== target) {
      target.appendChild(card);
    }
  });
}

/* -------------------------------------
   TABLE "+" BUTTONS (append empty row)
------------------------------------- */
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

/* -------------------------------------
   PDF EXPORT (Summary page)
------------------------------------- */
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

/* -------------------------------------
   DMS CARDS (placeholder)
------------------------------------- */
function initDmsCards() {
  // No dynamic DMS behavior required yet.
}
