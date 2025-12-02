/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS
   With Google Maps Autocomplete + Map Button
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initAddressAutocomplete();        // ⭐ NEW
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
      if (section.id === 'dealership-info') updateDealershipNameDisplay();
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
  display.textContent = txt?.value?.trim() || 'Dealership Name';
}

/* -------------------------------------
   ⭐ GOOGLE MAPS AUTOCOMPLETE / MAP BUTTON
------------------------------------- */
let googleAutocomplete;

function initAddressAutocomplete() {
  const addressInput = document.getElementById('dealershipAddressInput');
  const mapFrame = document.getElementById('dealershipMapFrame');
  const openBtn = document.getElementById('openAddressInMapsBtn');

  if (!addressInput) return;

  // Load Google Places Autocomplete
  function loadGoogleMaps() {
    const script = document.createElement('script');
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initAutocompleteInternal";
    script.async = true;
    document.head.appendChild(script);
  }

  window.initAutocompleteInternal = () => {
    googleAutocomplete = new google.maps.places.Autocomplete(addressInput, {
      types: ['geocode']
    });

    googleAutocomplete.addListener('place_changed', () => {
      const place = googleAutocomplete.getPlace();
      if (!place?.formatted_address) return;

      const encoded = encodeURIComponent(place.formatted_address);
      mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    });
  };

  loadGoogleMaps();

  // Open Google Maps in new tab
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

  row.querySelector('.add-row')?.addEventListener('click', () => {
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
function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  const template = openContainer?.querySelector('.ticket-group-template');
  if (!template) return;

  // Template always stays Open
  const statusSelect = template.querySelector('.ticket-status-select');
  if (statusSelect) statusSelect.value = 'Open';

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(template, { copy: false });
      openContainer.appendChild(newCard);
    });
  }

  wireTicketStatus(template, {
    openContainer, tierTwoContainer,
    closedResolvedContainer, closedFeatureContainer,
    isTemplate: true
  });
}

function createTicketCard(source, opts = {}) {
  const card = source.cloneNode(true);
  const copy = opts.copy ?? false;

  card.classList.remove('ticket-group-template');
  card.querySelector('.add-ticket-btn')?.remove();

  const fields = card.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (!copy) {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    }
  });

  wireTicketStatus(card, {
    openContainer: document.getElementById('openTicketsContainer'),
    tierTwoContainer: document.getElementById('tierTwoTicketsContainer'),
    closedResolvedContainer: document.getElementById('closedResolvedTicketsContainer'),
    closedFeatureContainer: document.getElementById('closedFeatureTicketsContainer'),
    isTemplate: false
  });

  return card;
}

function resetTicketTemplate(card) {
  card.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.tagName === 'SELECT') el.value = (el.classList.contains('ticket-status-select') ? 'Open' : '');
    else el.value = '';
  });
}

function wireTicketStatus(card, ctx) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const status = select.value;

    let target =
      status === 'Tier Two' ? ctx.tierTwoContainer :
      status === 'Closed - Resolved' ? ctx.closedResolvedContainer :
      status === 'Closed – Feature Not Supported' ? ctx.closedFeatureContainer :
      ctx.openContainer;

    if (ctx.isTemplate) {
      if (status === 'Open') return;

      const newCard = createTicketCard(card, { copy: true });
      newCard.querySelector('.ticket-status-select').value = status;

      target.appendChild(newCard);
      resetTicketTemplate(card);
      return;
    }

    if (card.parentElement !== target) target.appendChild(card);
  });
}

/* -------------------------------------
   TABLE ADD-ROW BUTTONS
------------------------------------- */
function initTableAddRowButtons() {
  document.querySelectorAll('.table-footer .add-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const table = btn.closest('.table-footer')
                       ?.previousElementSibling
                       ?.querySelector('table');

      if (!table) return;

      const tbody = table.querySelector('tbody') || table.createTBody();
      const last = tbody.lastElementChild;
      if (!last) return;

      const clone = last.cloneNode(true);
      clone.querySelectorAll('input, select').forEach((el) => {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
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
   DMS CARDS (placeholder)
------------------------------------- */
function initDmsCards() {
  // Future dynamic actions go here
}
