/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS
   ========================================================== */

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

      sections.forEach((sec) => {
        sec.classList.toggle('active', sec.id === targetId);
      });

      navButtons.forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
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
  if (!btn) return;

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
  if (!input) return;

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
   DEALERSHIP ADDRESS → SIMPLE MAP
   (no JS Maps API – just iframe & "Map" button)
------------------------------------- */
function initAddressMap() {
  const input = document.getElementById('dealershipAddressInput');
  const frame = document.getElementById('dealershipMapFrame');
  const btn = document.getElementById('openAddressInMapsBtn');

  if (!input) return;

  function updateIframe() {
    if (!frame) return;
    const text = input.value.trim();
    if (!text) {
      frame.src = '';
      return;
    }
    const encoded = encodeURIComponent(text);
    frame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
  }

  input.addEventListener('change', updateIframe);
  input.addEventListener('blur', updateIframe);

  if (btn) {
    btn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      const encoded = encodeURIComponent(text);
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        '_blank'
      );
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
  if (!addBtn) return;

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
   SUPPORT TICKETS (PAGE 7)
------------------------------------- */
/*
  Structure expected in HTML:

  <div id="openTicketsContainer">
    <div class="ticket-group ticket-group-template">
      <span class="ticket-pill">Ticket # 1</span>   <-- optional, JS will add if missing
      ...
      <div class="integrated-plus">
        <input class="ticket-number-input" ...>
        <button type="button" class="add-ticket-btn">+</button>
      </div>
      <select class="ticket-status-select">...</select>
      ...
    </div>
  </div>

  <div id="tierTwoTicketsContainer"></div>
  <div id="closedResolvedTicketsContainer"></div>
  <div id="closedFeatureTicketsContainer"></div>
*/

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  // Make sure template has a pill
  let templatePill = template.querySelector('.ticket-pill');
  if (!templatePill) {
    templatePill = document.createElement('span');
    templatePill.className = 'ticket-pill';
    templatePill.textContent = 'Ticket # 1';
    template.insertBefore(templatePill, template.firstChild);
  } else {
    templatePill.textContent = 'Ticket # 1';
  }

  // Template status default = Open
  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) templateStatus.value = 'Open';

  // + button only on template
  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketFromTemplate(template, 'Open', {
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer
      });
      openContainer.appendChild(newCard);
    });
  }

  // Wire template status-change logic
  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: true
  });
}

/**
 * Returns the next ticket number for cloned cards.
 * We only count cards with class .ticket-group-clone, so
 * template is always Ticket #1 and clones start at Ticket #2.
 */
function getNextTicketNumber() {
  const clones = document.querySelectorAll('.ticket-group-clone');
  return clones.length + 2; // 2, 3, 4, ...
}

/**
 * Creates a new ticket card from the template.
 * statusValue is the status to set on the new card ("Open", "Tier Two", etc.)
 */
function createTicketFromTemplate(template, statusValue, containers) {
  const { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer } = containers;

  const card = template.cloneNode(true);
  card.classList.remove('ticket-group-template');
  card.classList.add('ticket-group-clone');

  // Remove + button on clones (only template can create new tickets)
  const addBtnClone = card.querySelector('.add-ticket-btn');
  if (addBtnClone) addBtnClone.remove();

  // Clear fields on clone & set status
  const fields = card.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (el.tagName === 'SELECT') {
      if (el.classList.contains('ticket-status-select')) {
        el.value = statusValue || 'Open';
      } else {
        el.selectedIndex = 0;
      }
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });

  // Ensure each clone has its own pill with incrementing number
  let pill = card.querySelector('.ticket-pill');
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'ticket-pill';
    card.insertBefore(pill, card.firstChild);
  }
  pill.textContent = `Ticket # ${getNextTicketNumber()}`;

  // Wire status for new card
  wireTicketStatus(card, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: false
  });

  return card;
}

/**
 * Moves a non-template card into the correct container based on status.
 */
function moveTicketCard(card, containers, statusValue) {
  if (!card) return;

  const { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer } = containers;
  const status = (statusValue || '').toLowerCase();

  let target = openContainer;
  if (status.includes('tier two')) {
    target = tierTwoContainer;
  } else if (status.includes('resolved')) {
    target = closedResolvedContainer;
  } else if (status.includes('feature')) {
    target = closedFeatureContainer;
  }

  if (target && card.parentElement !== target) {
    target.appendChild(card);
  }
}

/**
 * Resets the template card back to a clean Open state.
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
 * Wires status-change behavior for a ticket card (template or clone).
 */
function wireTicketStatus(card, ctx) {
  const {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate
  } = ctx;

  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const status = select.value;

    if (isTemplate) {
      // Template never leaves Open; if status != Open, clone & reset
      if (!status || status === 'Open') return;

      const newCard = createTicketFromTemplate(
        card,
        status,
        { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer }
      );
      moveTicketCard(newCard, { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer }, status);
      resetTicketTemplate(card);
    } else {
      moveTicketCard(card, { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer }, status);
    }
  });
}

/* -------------------------------------
   TABLE "+" BUTTONS – only for tables
------------------------------------- */
function initTableAddRowButtons() {
  // Only look at + buttons inside .table-footer so we don't touch Support Tickets
  const tableAddButtons = document.querySelectorAll('.table-footer .add-row');

  tableAddButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const footer = btn.closest('.table-footer');
      if (!footer) return;

      const wrapper = footer.previousElementSibling;
      if (!wrapper) return;

      const table = wrapper.querySelector('table');
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
   PDF EXPORT
------------------------------------- */
function initPdfExport() {
  const btn = document.getElementById('savePDF');
  if (!btn || !window.jspdf) return;

  btn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    doc.html(document.body, {
      callback: (instance) => instance.save('myKaarma_Training_Checklist.pdf'),
      margin: [20, 20, 20, 20],
      html2canvas: { scale: 0.6 }
    });
  });
}

/* -------------------------------------
   DMS CARDS (placeholder for future logic)
------------------------------------- */
function initDmsCards() {
  // Future dynamic behavior for DMS Integration page
}
