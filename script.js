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
   SUPPORT TICKETS (PAGE 7)
------------------------------------- */
/*
  Behavior:
  - The template card in "Open Support Tickets" (ticket-group-template) always stays first
    and is the ONLY card with the + button.
  - When the template's status is changed away from "Open", its data is copied into
    a new ticket card which moves to the correct status container,
    and the template is reset to blank Open.
  - Clicking the + button creates a NEW empty Open ticket card (no + button).
  - Non-template cards can change status and will simply move between containers.
*/

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  // Ensure template status default is Open
  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) {
    templateStatus.value = 'Open';
  }

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(template, { copyValues: false });
      openContainer.appendChild(newCard);
      renumberTickets();
    });
  }

  // Wire up template itself for status changes (special behavior)
  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: true
  });

  renumberTickets();
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
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  wireTicketStatus(clone, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
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
 * If isTemplate is true, changing status away from "Open" creates a new card with
 * the template's data and status, moves it, then resets the template.
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
      targetContainer = closedFeatureContainer;
    } else if (value === 'Open') {
      targetContainer = openContainer;
    }

    if (isTemplate) {
      // Template should never actually leave the Open container.
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
      renumberTickets();
      return;
    }

    // Normal (non-template) cards just move between containers.
    if (!targetContainer || targetContainer === card.parentElement) {
      return;
    }

    targetContainer.appendChild(card);
    renumberTickets();
  });
}

/* Renumber Ticket # labels on all ticket-group cards (excluding template) */
function renumberTickets() {
  const allTickets = document.querySelectorAll('.ticket-group');
  let count = 1;
  allTickets.forEach((card) => {
    // Skip template if present
    if (card.classList.contains('ticket-group-template')) return;
    let label = card.querySelector('.ticket-label');
    if (!label) {
      // If label not present, create it at the top
      const header = document.createElement('div');
      header.className = 'ticket-header';
      label = document.createElement('div');
      label.className = 'ticket-label';
      header.appendChild(label);
      card.insertBefore(header, card.firstChild);
    }
    label.textContent = `Ticket # ${count}`;
    count += 1;
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
