/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS
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

  // Ensure one page is visible on load
  const anyActive = document.querySelector('.page-section.active');
  if (!anyActive && sections[0]) {
    sections[0].classList.add('active');
    if (navButtons[0]) navButtons[0].classList.add('active');
  }
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
   GOOGLE MAPS AUTOCOMPLETE (ADDRESS)
   (Google script should call initAddressAutocomplete)
------------------------------------- */
let addressAutocomplete;

function initAddressAutocomplete() {
  const input = document.getElementById('dealershipAddressInput');
  const mapFrame = document.getElementById('dealershipMapFrame');
  const mapBtn = document.getElementById('openAddressInMapsBtn');

  if (!input || !mapFrame) return;

  // Autocomplete for the address field
  if (window.google && google.maps && google.maps.places) {
    addressAutocomplete = new google.maps.places.Autocomplete(input, {
      types: ['geocode']
    });

    addressAutocomplete.addListener('place_changed', () => {
      const place = addressAutocomplete.getPlace();
      if (!place || !place.formatted_address) return;

      const encoded = encodeURIComponent(place.formatted_address);
      mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    });
  }

  // MAP button opens Google Maps in a new tab with current text
  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
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
  const baseRow = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');
  if (!baseRow || !container) return;

  const addBtn = baseRow.querySelector('.add-row');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub';

    const label = document.createElement('label');
    label.textContent = 'Additional Trainer';
    label.style.flex = '1 1 auto';
    label.style.paddingRight = '16px';

    const input = document.createElement('input');
    input.type = 'text';

    newRow.append(label, input);
    container.appendChild(newRow);
  });
}

/* -------------------------------------
   ADDITIONAL POC (PAGE 2)
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const template = grid.querySelector('.additional-poc-card');
  const addBtn = template?.querySelector('.additional-poc-add');
  if (!template || !addBtn) return;

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
let ticketCounter = 0;

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const baseCard = openContainer.querySelector('.ticket-group[data-base="true"]');
  if (!baseCard) return;

  // Base card has integrated "+" in Support Ticket Number row
  const addBtn = baseCard.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(baseCard, {
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer
      });
      openContainer.appendChild(newCard);
    });
  }

  // Wire status changes for base card as well
  wireTicketStatus(baseCard, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });
}

function createTicketCard(baseCard, containers) {
  const {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  } = containers;

  const card = baseCard.cloneNode(true);
  card.removeAttribute('data-base');

  // Remove any existing badge then create a new one
  let badge = card.querySelector('.ticket-badge');
  if (badge) badge.remove();

  ticketCounter += 1;
  badge = document.createElement('div');
  badge.className = 'ticket-badge';
  badge.textContent = `Ticket # ${ticketCounter}`;

  let inner = card.querySelector('.ticket-group-inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'ticket-group-inner';
    while (card.firstChild) {
      inner.appendChild(card.firstChild);
    }
    card.appendChild(inner);
  }
  card.insertBefore(badge, inner);

  // Remove the + button on cloned cards
  const addBtn = card.querySelector('.add-ticket-btn');
  if (addBtn) addBtn.remove();

  // Reset all fields
  card.querySelectorAll('input, textarea').forEach((el) => {
    el.value = '';
  });
  const statusSelect = card.querySelector('.ticket-status-select');
  if (statusSelect) statusSelect.value = 'Open';

  // Wire status change for this cloned card
  wireTicketStatus(card, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });

  return card;
}

function wireTicketStatus(card, containers) {
  const {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  } = containers;

  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const status = select.value;
    let target = openContainer;

    if (status === 'Tier Two') {
      target = tierTwoContainer || openContainer;
    } else if (status === 'Closed - Resolved') {
      target = closedResolvedContainer || openContainer;
    } else if (status === 'Closed – Feature Not Supported') {
      target = closedFeatureContainer || openContainer;
    }

    if (target && card.parentElement !== target) {
      target.appendChild(card);
    }
  });
}

/* -------------------------------------
   TABLE ADD-ROW BUTTONS
------------------------------------- */
function initTableAddRowButtons() {
  const addButtons = document.querySelectorAll('.table-footer .add-row');
  if (!addButtons.length) return;

  addButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const footer = e.currentTarget.closest('.table-footer');
      if (!footer) return;

      const table = footer.previousElementSibling
        ? footer.previousElementSibling.querySelector('table')
        : null;
      if (!table) return;

      const tbody = table.querySelector('tbody');
      const lastRow = tbody ? tbody.lastElementChild : null;
      if (!tbody || !lastRow) return;

      const clone = lastRow.cloneNode(true);

      // Clear values in cloned row
      clone.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = false;
        } else {
          el.value = '';
        }
      });

      tbody.appendChild(clone);
    });
  });
}

/* -------------------------------------
   PDF EXPORT
------------------------------------- */
function initPdfExport() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!window.jspdf || !window.jspdf.jsPDF) return;
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
  // Reserved for future dynamic DMS behavior
}
