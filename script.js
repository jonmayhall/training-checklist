/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initAddressAutocomplete();
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
  const src = document.getElementById('dealershipNameInput');
  const display = document.getElementById('dealershipNameDisplay');
  if (!display) return;

  const value = src && src.value ? src.value.trim() : '';
  display.textContent = value || 'Dealership Name';
}

/* -------------------------------------
   GOOGLE MAPS AUTOCOMPLETE + MAP BUTTON
------------------------------------- */

let googleAutocomplete;

function initAddressAutocomplete() {
  const addressInput = document.getElementById('dealershipAddressInput');
  const mapFrame = document.getElementById('dealershipMapFrame');
  const openBtn = document.getElementById('openAddressInMapsBtn');

  if (!addressInput) return;

  // Load Google Maps Places library dynamically
  function loadGoogleMaps() {
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocompleteInternal();
      return;
    }

    const existing = document.querySelector('script[data-mk-maps="1"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src =
      'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initAutocompleteInternal';
    script.async = true;
    script.defer = true;
    script.dataset.mkMaps = '1';
    document.head.appendChild(script);
  }

  window.initAutocompleteInternal = () => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    googleAutocomplete = new google.maps.places.Autocomplete(addressInput, {
      types: ['geocode']
    });

    googleAutocomplete.addListener('place_changed', () => {
      const place = googleAutocomplete.getPlace();
      if (!place || !place.formatted_address) return;

      const encoded = encodeURIComponent(place.formatted_address);
      if (mapFrame) {
        mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
      }
    });
  };

  loadGoogleMaps();

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const text = addressInput.value.trim();
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
   ADDITIONAL POC (PAGE 2)
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

/* =====================================
   SUPPORT TICKETS
===================================== */

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const baseCard = openContainer.querySelector('.ticket-group[data-base="true"]');
  if (!baseCard) return;

  // Base card should never have an orange badge
  const baseBadge = baseCard.querySelector('.ticket-badge');
  if (baseBadge) baseBadge.remove();

  // Wire the "+" on the base card
  const addBtn = baseCard.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard({
        template: baseCard,
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer
      });

      openContainer.appendChild(newCard);
      renumberTicketBadges();
    });
  }

  // Wire status for base card
  wireTicketStatus(baseCard, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });

  renumberTicketBadges();
}

function createTicketCard(ctx) {
  const {
    template,
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  } = ctx;

  const card = template.cloneNode(true);
  card.dataset.base = 'false';

  // Remove any existing badge on clone
  const existingBadge = card.querySelector('.ticket-badge');
  if (existingBadge) existingBadge.remove();

  // Remove "+" from cloned cards
  const cloneAddBtn = card.querySelector('.add-ticket-btn');
  if (cloneAddBtn) cloneAddBtn.remove();

  resetTicketCardFields(card);

  // Create badge for this card
  const badge = document.createElement('div');
  badge.className = 'ticket-badge';
  card.appendChild(badge);

  wireTicketStatus(card, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });

  return card;
}

function resetTicketCardFields(card) {
  const textInputs = card.querySelectorAll('input[type="text"], input[type="email"], input[type="url"]');
  textInputs.forEach((input) => {
    input.value = '';
  });

  const statusSelect = card.querySelector('.ticket-status-select');
  if (statusSelect) {
    statusSelect.value = 'Open';
  }
}

function wireTicketStatus(card, containers) {
  const {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  } = containers;

  const statusSelect = card.querySelector('.ticket-status-select');
  if (!statusSelect) return;

  statusSelect.addEventListener('change', () => {
    const status = statusSelect.value;
    let target = openContainer;

    if (status === 'Tier Two') {
      target = tierTwoContainer;
    } else if (status === 'Closed - Resolved') {
      target = closedResolvedContainer;
    } else if (status === 'Closed – Feature Not Supported') {
      target = closedFeatureContainer;
    }

    if (target) {
      target.appendChild(card);
    }

    renumberTicketBadges();
  });
}

function renumberTicketBadges() {
  // Remove badges from base cards
  const baseCards = document.querySelectorAll('.ticket-group[data-base="true"]');
  baseCards.forEach((baseCard) => {
    const badge = baseCard.querySelector('.ticket-badge');
    if (badge) badge.remove();
  });

  // Number all non-base cards
  const numberedCards = document.querySelectorAll('.ticket-group:not([data-base="true"])');
  let counter = 1;
  numberedCards.forEach((card) => {
    let badge = card.querySelector('.ticket-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ticket-badge';
      card.appendChild(badge);
    }
    badge.textContent = `Ticket # ${counter++}`;
  });
}

/* -------------------------------------
   TABLE ADD-ROW BUTTONS (Checklists / Opcodes)
------------------------------------- */
function initTableAddRowButtons() {
  document.querySelectorAll('.table-footer .add-row').forEach((btn) => {
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

      const clone = lastRow.cloneNode(true);

      // Clear inputs/selects in the cloned row
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
   DMS CARDS (placeholder for future)
------------------------------------- */
function initDmsCards() {
  // Reserved for any future DMS card interactivity
}
