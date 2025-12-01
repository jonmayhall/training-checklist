/* =======================================================
   myKaarma Interactive Training Checklist – Main JS
   Nav + Clear + Additional Trainers + Additional POC + Tickets + PDF
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initAddressMap();
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
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  const dealershipNameDisplay = document.getElementById('dealershipNameDisplay');
  if (!dealershipNameDisplay) return;

  const val = dealershipNameInput ? dealershipNameInput.value.trim() : '';
  dealershipNameDisplay.textContent = val || 'Dealership Name';
}

/* --------------- MAP ADDRESS BUTTON --------------- */
function initAddressMap() {
  const btn = document.getElementById("updateMapBtn");
  const iframe = document.getElementById("dealershipMap");
  const addressInput = document.getElementById("dealerAddress");

  if (!btn || !iframe || !addressInput) return;

  btn.addEventListener("click", () => {
    const address = addressInput.value.trim();
    if (!address) return;

    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  });
}

/* --------------- ADDITIONAL TRAINERS (PAGE 1) --------------- */
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

/* --------------- ADDITIONAL POC CARDS (PAGE 2) --------------- */
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

/* ============================================================
   SUPPORT TICKETS — TEMPLATE CARD ALWAYS FIRST IN OPEN
   - First Open card has "+" button
   - Changing its status moves THAT card
   - A new empty template card is created in Open
   - Only the first Open card ever has "+"
   ============================================================ */

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  const containers = {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  };

  // Save a pristine copy of the template to use when we need a fresh one
  const pristineTemplate = template.cloneNode(true);
  clearTicketTemplate(pristineTemplate);
  clearTicketTemplate(template);

  setupTemplateBehavior(template, containers, pristineTemplate);
}

/**
 * Wire up the special behavior for the template card:
 * - "+" creates a real ticket card from the template (without moving the template)
 * - Changing status converts this node into a real ticket and moves it,
 *   then inserts a fresh empty template at the top of Open.
 */
function setupTemplateBehavior(template, containers, pristineTemplate) {
  // Make sure it's marked as template
  template.classList.add('ticket-group-template');
  template.setAttribute('data-template', 'true');

  // Ensure it stays at the top of Open container
  if (containers.openContainer.firstChild !== template) {
    containers.openContainer.insertBefore(template, containers.openContainer.firstChild);
  }

  // "+" button behavior
  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketFromTemplate(template, containers);

      // Use current status value to decide where new card goes
      const statusSelect = template.querySelector('.ticket-status-select');
      const statusValue = statusSelect ? statusSelect.value : 'Open';
      const targetContainer = getTicketTargetContainer(statusValue, containers);

      targetContainer.appendChild(newCard);

      // Clear template for next ticket entry
      clearTicketTemplate(template);
    });
  }

  // Status change behavior — converts THIS template node into a real card
  const statusSelect = template.querySelector('.ticket-status-select');
  if (statusSelect) {
    const onTemplateStatusChange = () => {
      // Remove this special handler so it doesn't run again on this card
      statusSelect.removeEventListener('change', onTemplateStatusChange);

      const value = statusSelect.value;
      const targetContainer = getTicketTargetContainer(value, containers);

      // Convert current template node into a normal ticket card
      convertTemplateToReal(template, containers);

      // Move it to the chosen status container
      if (targetContainer && targetContainer !== template.parentElement) {
        targetContainer.appendChild(template);
      }

      // Create a brand-new, empty template and put it at the top of Open
      const newTemplate = pristineTemplate.cloneNode(true);
      clearTicketTemplate(newTemplate);
      containers.openContainer.insertBefore(newTemplate, containers.openContainer.firstChild);
      setupTemplateBehavior(newTemplate, containers, pristineTemplate);
    };

    statusSelect.addEventListener('change', onTemplateStatusChange);
  }
}

/* Determine which container to use based on status value */
function getTicketTargetContainer(value, containers) {
  if (value === 'Tier Two') return containers.tierTwoContainer;
  if (value === 'Closed - Resolved') return containers.closedResolvedContainer;
  if (value === 'Closed – Feature Not Supported') return containers.closedFeatureContainer;
  return containers.openContainer;
}

/* Clear inputs / selects / textareas in a ticket card */
function clearTicketTemplate(card) {
  const fields = card.querySelectorAll('input, select, textarea');

  fields.forEach((el) => {
    if (el.tagName === 'SELECT') {
      if (el.classList.contains('ticket-status-select')) {
        el.value = 'Open'; // default status for the template
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

/* Convert a template-like card (or clone) into a real ticket card */
function convertTemplateToReal(card, containers) {
  card.classList.remove('ticket-group-template');
  card.removeAttribute('data-template');

  // Remove the "+" button
  const addBtn = card.querySelector('.add-ticket-btn');
  if (addBtn) addBtn.remove();

  // Top row becomes normal row (no integrated-plus styling)
  const topRow = card.querySelector('.checklist-row.integrated-plus');
  if (topRow) topRow.classList.remove('integrated-plus');

  // Wire normal status-change movement
  wireTicketStatus(card, containers);
}

/* Clone from the template to create a real ticket card */
function createTicketFromTemplate(template, containers) {
  const clone = template.cloneNode(true);
  convertTemplateToReal(clone, containers);
  return clone;
}

/* Normal ticket cards: when status changes, move between containers */
function wireTicketStatus(card, containers) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const value = select.value;
    const targetContainer = getTicketTargetContainer(value, containers);

    if (targetContainer && targetContainer !== card.parentElement) {
      targetContainer.appendChild(card);
    }
  });
}

/* --------------- TABLE "+" BUTTONS --------------- */
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

      const fields = newRow.querySelectorAll('input, select, textarea');
      fields.forEach((el) => {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
    });
  });
}

/* --------------- PDF EXPORT --------------- */
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
      html2canvas: { scale: 0.6 }
    });
  });
}
