/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS (clean)
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

  navButtons.forEach((btn) => {
    // prevent double-binding
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

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
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
    else el.value = '';
  });
}

function initClearPageButtons() {
  document.querySelectorAll('.clear-page-btn').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

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
  const btn = document.getElementById('clearAllBtn');
  if (!btn || btn.dataset.bound === 'true') return;
  btn.dataset.bound = 'true';

  btn.addEventListener('click', () => {
    document.querySelectorAll('.page-section').forEach(clearSection);
    updateDealershipNameDisplay();
  });
}

/* -------------------------------------
   DEALERSHIP NAME TOPBAR SYNC
------------------------------------- */
function initDealershipNameBinding() {
  const input = document.getElementById('dealershipNameInput');
  if (!input || input.dataset.bound === 'true') return;
  input.dataset.bound = 'true';

  input.addEventListener('input', updateDealershipNameDisplay);
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const txt = document.getElementById('dealershipNameInput');
  const display = document.getElementById('dealershipNameDisplay');
  if (!display) return;

  display.textContent = txt && txt.value.trim()
    ? txt.value.trim()
    : 'Dealership Name';
}

/* -------------------------------------
   ADDITIONAL TRAINERS (PAGE 1)
------------------------------------- */
function initAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');
  if (!row || !container) return;

  const addBtn = row.querySelector('.add-row');
  if (!addBtn || addBtn.dataset.bound === 'true') return;
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

    newRow.append(label, input);
    container.appendChild(newRow);
  });
}

/* -------------------------------------
   ADDITIONAL POC ON PAGE 2
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const template = grid.querySelector('.additional-poc-card');
  if (!template) return;

  const addBtn = template.querySelector('.additional-poc-add');
  if (!addBtn || addBtn.dataset.bound === 'true') return;
  addBtn.dataset.bound = 'true';

  function createNormalCard() {
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
    grid.appendChild(createNormalCard());
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

  // Template status should always default to Open
  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) {
    templateStatus.value = 'Open';
  }

  // + button on template: create ONE new ticket card in Open
  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(template, {
        copyValues: false
      });
      openContainer.appendChild(newCard);
      renumberTickets();
    });
  }

  // Wire the template itself as special behavior for status changes
  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: true
  });
}

/**
 * Creates a new ticket card cloned from the template.
 * - copyValues = true keeps existing values (for template hand-off)
 * - copyValues = false creates a blank card
 */
function createTicketCard(sourceCard, options = {}) {
  const { copyValues = false } = options;

  const clone = sourceCard.cloneNode(true);

  // No longer the template
  clone.classList.remove('ticket-group-template');

  // Remove the + button from clones
  const addBtn = clone.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.remove();
  }

  // Ensure we have a .ticket-group-inner wrapper
  let inner = clone.querySelector('.ticket-group-inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'ticket-group-inner';
    while (clone.firstChild) {
      inner.appendChild(clone.firstChild);
    }
    clone.appendChild(inner);
  }

  // Inject the Ticket # pill at the top of the inner content
  injectTicketBadge(inner);

  // Clear values if requested
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
 * Clears the template so it is a blank Open ticket again.
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
 * Attach status-change behavior:
 * - Template: change status to create a new card in target container, then reset template
 * - Normal card: move card to target container
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
    } else if (
      value === 'Closed – Feature Not Supported' || // EN dash
      value === 'Closed - Feature Not Supported'    // normal dash (just in case)
    ) {
      targetContainer = closedFeatureContainer;
    } else if (value === 'Open') {
      targetContainer = openContainer;
    }

    if (!targetContainer) return;

    if (isTemplate) {
      // Template should never leave the Open container
      if (value === 'Open') return;

      // Create card WITH template data and move it
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

    // Non-template cards simply move between containers
    if (card.parentElement !== targetContainer) {
      targetContainer.appendChild(card);
      renumberTickets();
    }
  });
}

/**
 * Adds / updates Ticket # pills in the order cards appear
 */
function renumberTickets() {
  const allCards = document.querySelectorAll(
    '#openTicketsContainer .ticket-group:not(.ticket-group-template), ' +
    '#tierTwoTicketsContainer .ticket-group, ' +
    '#closedResolvedTicketsContainer .ticket-group, ' +
    '#closedFeatureTicketsContainer .ticket-group'
  );

  let index = 1;
  allCards.forEach((card) => {
    const badge = card.querySelector('.ticket-badge');
    if (badge) {
      badge.textContent = `Ticket # ${index}`;
      index++;
    }
  });
}

/**
 * Injects a Ticket # pill at the top of a ticket-group-inner
 */
function injectTicketBadge(innerContainer) {
  // Remove any existing badge first
  const existing = innerContainer.querySelector('.ticket-badge');
  if (existing) existing.remove();

  const badge = document.createElement('div');
  badge.className = 'ticket-badge';
  badge.textContent = 'Ticket # ?'; // real number set by renumberTickets()
  innerContainer.insertBefore(badge, innerContainer.firstChild);
}

/* -------------------------------------
   TABLE "+" BUTTONS (append empty row)
------------------------------------- */
function initTableAddRowButtons() {
  const tableFooters = document.querySelectorAll('.table-footer .add-row');

  tableFooters.forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
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
  if (!btn || btn.dataset.bound === 'true') return;
  btn.dataset.bound = 'true';

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
      html2canvas: { scale: 0.6 }
    });
  });
}

/* -------------------------------------
   DMS CARDS (placeholder)
------------------------------------- */
function initDmsCards() {
  // no-op for now
}
