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

/* -------------------------------------
   SUPPORT TICKETS (PAGE 7)
------------------------------------- */
/*
  Behavior:
  - Template card in "Open Support Tickets" is the ONLY card with the + button.
  - Clicking + creates ONE new blank card in Open (no + button).
  - Changing Status on template:
      * If changed away from "Open" => clone with data, move clone, reset template.
  - Changing Status on non-template:
      * Moves that card between containers.
  - Cards are auto-numbered: Ticket # 1, Ticket # 2, ... across all containers.
*/

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template =
    openContainer.querySelector('.ticket-group-template') ||
    openContainer.querySelector('.ticket-group');

  if (!template) return;

  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) {
    templateStatus.value = 'Open';
  }

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = 'true';
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(template, { copyValues: false });
      openContainer.appendChild(newCard);
      renumberSupportTickets();
    });
  }

  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: true
  });

  // Initial numbering
  renumberSupportTickets();
}

/**
 * Creates a new ticket card cloned from the template.
 * @param {HTMLElement} sourceCard - the card to clone (usually the template)
 * @param {Object} options
 *   - copyValues: if true, keep existing input/select values. If false, clear them.
 */
function createTicketCard(sourceCard, options = {}) {
  const { copyValues = false } = options;

  const clone = sourceCard.cloneNode(true);

  // No longer the template
  clone.classList.remove('ticket-group-template');
  clone.removeAttribute('data-template');

  // Remove the add button from clones
  const addBtn = clone.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.remove();
  }

  // Clear or keep values
  const fields = clone.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (!copyValues) {
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
    }
  });

  // Wire up status logic for this new card
  wireTicketStatus(clone, {
    openContainer: document.getElementById('openTicketsContainer'),
    tierTwoContainer: document.getElementById('tierTwoTicketsContainer'),
    closedResolvedContainer: document.getElementById('closedResolvedTicketsContainer'),
    closedFeatureContainer: document.getElementById('closedFeatureTicketsContainer'),
    isTemplate: false
  });

  return clone;
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
      targetContainer = closedFeatureContainer;
    } else if (value === 'Open') {
      targetContainer = openContainer;
    }

    if (isTemplate) {
      // Template should never leave Open container.
      if (value === 'Open' || !targetContainer) {
        return;
      }

      // Create a new card WITH the template's data and status.
      const newCard = createTicketCard(card, { copyValues: true });
      const newStatus = newCard.querySelector('.ticket-status-select');
      if (newStatus) {
        newStatus.value = value;
      }

      targetContainer.appendChild(newCard);
      resetTicketTemplate(card);
      renumberSupportTickets();
      return;
    }

    // Normal (non-template) cards just move between containers.
    if (!targetContainer || targetContainer === card.parentElement) {
      renumberSupportTickets();
      return;
    }

    targetContainer.appendChild(card);
    renumberSupportTickets();
  });
}

/**
 * Renumber all support tickets across all containers.
 * Looks for an element with .ticket-number-label inside each .ticket-group
 * and sets its text to "Ticket # N".
 */
function renumberSupportTickets() {
  const containerIds = [
    'openTicketsContainer',
    'tierTwoTicketsContainer',
    'closedResolvedTicketsContainer',
    'closedFeatureTicketsContainer'
  ];

  let counter = 1;

  containerIds.forEach((id) => {
    const container = document.getElementById(id);
    if (!container) return;

    const cards = container.querySelectorAll('.ticket-group');
    cards.forEach((card) => {
      if (card.classList.contains('ticket-group-template')) return;
      const label = card.querySelector('.ticket-number-label');
      if (label) {
        label.textContent = `Ticket # ${counter}`;
      }
      counter++;
    });
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
