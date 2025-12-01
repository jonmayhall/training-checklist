/* =======================================================
   myKaarma Interactive Training Checklist – Main JS
   Nav + Clear + Additional Trainers + Additional POC
   + Tickets (with persistent + card) + Tables + PDF
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
}

/* --------------- CLEAR PAGE / CLEAR ALL --------------- */
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
    newRow.className = 'checklist-row indent-sub';

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

/* --------------- SUPPORT TICKETS (PAGE 7) --------------- */
/*
  Requirements:
  - There is ONE special "template" open ticket card in #openTicketsContainer
    with class .ticket-group-template and a + button (.add-ticket-btn).
  - That template card:
      * ALWAYS stays in the Open container as the first card.
      * ALWAYS is the ONLY card with a "+" button.
  - When user changes the status on the template card (Open -> Tier Two / Closed etc.):
      * The filled info should "move" into the chosen status section.
      * The template card should be cleared and remain in Open, ready for the next ticket.
  - Clicking the + button creates a normal open ticket card (without + button).
  - Non-template cards move between sections when their status changes.
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
      // Create a NEW Open ticket card based on the template, but without + button
      const newCard = cloneTicketFromTemplate(false);
      clearTicketCard(newCard, { resetStatusToOpen: true });
      wireTicketStatus(
        newCard,
        {
          openContainer,
          tierTwoContainer,
          closedResolvedContainer,
          closedFeatureContainer
        },
        { isTemplate: false }
      );
      openContainer.appendChild(newCard);
    });
  }

  // Ensure template status is "Open"
  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) {
    templateStatus.value = 'Open';
  }

  // Wire up template itself for special status changes
  wireTicketStatus(
    template,
    {
      openContainer,
      tierTwoContainer,
      closedResolvedContainer,
      closedFeatureContainer
    },
    { isTemplate: true }
  );
}

/**
 * Clone the template card.
 * @param {boolean} includeAddButton - if true, keep the + button (for template scenarios).
 */
function cloneTicketFromTemplate(includeAddButton) {
  const template = document.querySelector('#openTicketsContainer .ticket-group-template');
  if (!template) return null;

  const clone = template.cloneNode(true);

  // It's no longer the template
  clone.classList.remove('ticket-group-template');
  clone.removeAttribute('data-template');

  // Remove the add button for normal cards
  if (!includeAddButton) {
    const addBtn = clone.querySelector('.add-ticket-btn');
    if (addBtn) {
      addBtn.remove();
    }
  }

  return clone;
}

/**
 * Clear all fields in a ticket card.
 * @param {HTMLElement} card
 * @param {{resetStatusToOpen:boolean}} options
 */
function clearTicketCard(card, { resetStatusToOpen } = { resetStatusToOpen: false }) {
  const fields = card.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (el.tagName === 'SELECT') {
      if (el.classList.contains('ticket-status-select') && resetStatusToOpen) {
        el.value = 'Open';
      } else if (!el.classList.contains('ticket-status-select')) {
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
 * Copy values from one ticket card into another
 */
function copyTicketValues(sourceCard, targetCard) {
  const srcFields = sourceCard.querySelectorAll('input, select, textarea');
  const tgtFields = targetCard.querySelectorAll('input, select, textarea');

  const len = Math.min(srcFields.length, tgtFields.length);
  for (let i = 0; i < len; i++) {
    const s = srcFields[i];
    const t = tgtFields[i];

    if (s.tagName === 'SELECT') {
      t.value = s.value;
    } else if (s.type === 'checkbox' || s.type === 'radio') {
      t.checked = s.checked;
    } else {
      t.value = s.value;
    }
  }
}

/**
 * Wire up status logic for a ticket card.
 * @param {HTMLElement} card
 * @param {*} containers
 * @param {{isTemplate:boolean}} options
 */
function wireTicketStatus(card, containers, options = { isTemplate: false }) {
  const { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer } = containers;
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

    // Special handling for the template card
    if (options.isTemplate) {
      if (value !== 'Open' && targetContainer) {
        // 1) Clone the template (without + button)
        const movedCard = cloneTicketFromTemplate(false);
        if (!movedCard) return;

        // 2) Copy current values into the cloned card
        copyTicketValues(card, movedCard);

        // 3) Wire up the cloned card like a normal card
        wireTicketStatus(
          movedCard,
          {
            openContainer,
            tierTwoContainer,
            closedResolvedContainer,
            closedFeatureContainer
          },
          { isTemplate: false }
        );

        // 4) Append cloned card to the target container
        targetContainer.appendChild(movedCard);

        // 5) Clear the template and reset its status to Open
        clearTicketCard(card, { resetStatusToOpen: true });
      } else if (value === 'Open') {
        // If they flip it back to Open, just keep it in Open container and do nothing else
        clearTicketCard(card, { resetStatusToOpen: true });
      }
      return;
    }

    // Normal (non-template) cards: move the card between containers.
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

    // Simple whole-page capture.
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
