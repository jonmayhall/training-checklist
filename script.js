/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initAddressMapEmbed();        // Map button + iframe update (no API key)
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

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;

      sections.forEach((sec) =>
        sec.classList.toggle('active', sec.id === targetId)
      );

      navButtons.forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
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
   ADDRESS + SIMPLE GOOGLE MAP EMBED
   (No API key needed)
------------------------------------- */
function initAddressMapEmbed() {
  const addressInput = document.getElementById('dealershipAddressInput');
  const mapFrame = document.getElementById('dealershipMapFrame');
  const openBtn = document.getElementById('openAddressInMapsBtn');

  if (!addressInput || !mapFrame) return;

  // Update embedded map whenever the address input loses focus
  addressInput.addEventListener('change', () => {
    const text = addressInput.value.trim();
    if (!text) return;
    const encoded = encodeURIComponent(text);
    mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
  });

  // “Map” button opens Google Maps in a new tab
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const text = addressInput.value.trim();
      if (!text) return;
      const encoded = encodeURIComponent(text);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
    });
  }
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

  if (addBtn.dataset.bound === 'true') return;
  addBtn.dataset.bound = 'true';

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
   ADDITIONAL POC ON PAGE 2
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const templateCard = grid.querySelector('.additional-poc-card');
  if (!templateCard) return;

  const addBtn = templateCard.querySelector('.additional-poc-add');
  if (!addBtn) return;

  if (addBtn.dataset.bound === 'true') return;
  addBtn.dataset.bound = 'true';

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

//* -------------------------------------
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

  // Template should always say "Ticket # 1" on load
  const label = template.querySelector('.ticket-label');
  if (label) label.textContent = 'Ticket # 1';

  // Template status default is Open
  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) {
    templateStatus.value = 'Open';
  }

  // "+" in the template creates a NEW open ticket card
  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(template, { copy: false });
      openContainer.appendChild(newCard);
      renumberTickets();
    });
  }

  // Wire template status changes (special behavior)
  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: true
  });

  // First-pass numbering
  renumberTickets();
}

/**
 * Creates a new ticket card cloned from the template.
 * @param {HTMLElement} source - usually the template card
 * @param {Object} opts
 *   - copy: if true, keep existing values; if false, blank them
 */
function createTicketCard(source, opts = {}) {
  const { copy = false } = opts;

  const card = source.cloneNode(true);
  card.classList.remove('ticket-group-template');

  // Remove the + button from cloned cards
  const addBtn = card.querySelector('.add-ticket-btn');
  if (addBtn) addBtn.remove();

  // For cloned cards we want the Support Ticket Number field
  // to behave like a normal rounded textbox (no integrated +)
  const numRow = card.querySelector('.ticket-number-row');
  if (numRow) {
    numRow.classList.remove('integrated-plus');
  }

  const fields = card.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (!copy) {
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else {
        el.value = '';
      }
    }
  });

  // Wire up status logic for this new card
  wireTicketStatus(card, {
    openContainer: document.getElementById('openTicketsContainer'),
    tierTwoContainer: document.getElementById('tierTwoTicketsContainer'),
    closedResolvedContainer: document.getElementById('closedResolvedTicketsContainer'),
    closedFeatureContainer: document.getElementById('closedFeatureTicketsContainer'),
    isTemplate: false
  });

  return card;
}

/**
 * Clears all fields in the template and resets status to Open.
 */
function resetTicketTemplate(template) {
  const fields = template.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (el.tagName === 'SELECT') {
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
}

/**
 * Wires status change for a ticket card.
 * If isTemplate is true, changing status away from "Open" creates a new
 * card with the template's data and moves that card into the correct container,
 * then resets the template.
 * If isTemplate is false, the card itself moves between containers.
 */
function wireTicketStatus(card, containers) {
  const {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate = false
  } = containers;

  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const value = select.value;

    let targetContainer = openContainer;
    if (value === 'Tier Two') {
      targetContainer = tierTwoContainer;
    } else if (value === 'Closed - Resolved') {
      targetContainer = closedResolvedContainer;
    } else if (value === 'Closed – Feature Not Supported') {
      // EN DASH in this label
      targetContainer = closedFeatureContainer;
    } else if (value === 'Open') {
      targetContainer = openContainer;
    }

    if (isTemplate) {
      // Template stays put; use its data to create a new card
      if (value === 'Open' || !targetContainer) return;

      const newCard = createTicketCard(card, { copy: true });
      const newStatus = newCard.querySelector('.ticket-status-select');
      if (newStatus) newStatus.value = value;

      targetContainer.appendChild(newCard);
      resetTicketTemplate(card);
      renumberTickets();
      return;
    }

    // Normal (non-template) cards just move between containers
    if (targetContainer && targetContainer !== card.parentElement) {
      targetContainer.appendChild(card);
    }
    renumberTickets();
  });
}

/**
 * Renumber all ticket cards so labels show:
 * Ticket # 1, Ticket # 2, Ticket # 3, ...
 * (ordered by appearance in the DOM)
 */
function renumberTickets() {
  const cards = document.querySelectorAll('.ticket-group');
  let index = 1;
  cards.forEach((card) => {
    const label = card.querySelector('.ticket-label');
    if (label) {
      label.textContent = `Ticket # ${index}`;
      index += 1;
    }
  });
}

/* -------------------------------------
   TABLE "+" BUTTONS (append empty row)
------------------------------------- */
function initTableAddRowButtons() {
  const tableFooters = document.querySelectorAll('.table-footer .add-row');

  tableFooters.forEach((btn) => {
    if (btn.dataset.bound === 'true') return; // prevent duplicate bindings
    btn.dataset.bound = 'true';

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
   DMS CARDS (optional extension hook)
------------------------------------- */
function initDmsCards() {
  // No dynamic DMS behavior required yet.
}
