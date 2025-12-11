/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS (Guarded)
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
  initAutoGrowTicketSummary();
});

/* -------------------------------------
   SMALL HELPER – BIND EVENT ONCE
------------------------------------- */
function bindOnce(el, event, handler, key) {
  if (!el) return;
  const flag = `__bound_${key}`;
  if (el[flag]) return;          // already wired, do nothing
  el.addEventListener(event, handler);
  el[flag] = true;
}

/* -------------------------------------
   NAVIGATION
------------------------------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  if (!navButtons.length || !sections.length) return;

  navButtons.forEach((btn) => {
    bindOnce(btn, 'click', () => {
      const targetId = btn.dataset.target;

      sections.forEach((sec) =>
        sec.classList.toggle('active', sec.id === targetId)
      );

      navButtons.forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
    }, 'navClick');
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
  document.querySelectorAll('.clear-page-btn').forEach((btn, idx) => {
    bindOnce(btn, 'click', () => {
      const section = btn.closest('.page-section');
      clearSection(section);
      if (section && section.id === 'dealership-info') {
        updateDealershipNameDisplay();
      }
    }, `clearPage_${idx}`);
  });
}

function initClearAllButton() {
  const btn = document.getElementById('clearAllBtn');
  if (!btn) return;

  bindOnce(btn, 'click', () => {
    document.querySelectorAll('.page-section').forEach(clearSection);
    updateDealershipNameDisplay();
  }, 'clearAll');
}

/* -------------------------------------
   DEALERSHIP NAME TOPBAR SYNC
------------------------------------- */
function initDealershipNameBinding() {
  const input = document.getElementById('dealershipNameInput');
  if (!input) return;

  bindOnce(input, 'input', updateDealershipNameDisplay, 'dnameInput');
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
   GOOGLE MAPS AUTOCOMPLETE (DEALERSHIP ADDRESS)
   (Maps script should call: callback=initAddressAutocomplete)
------------------------------------- */
function initAddressAutocomplete() {
  const input    = document.getElementById('dealershipAddressInput');
  const mapFrame = document.getElementById('dealershipMapFrame');
  const mapBtn   = document.getElementById('openAddressInMapsBtn');

  if (!input || !window.google || !google.maps || !google.maps.places) return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['geocode']
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    const address = place && place.formatted_address
      ? place.formatted_address
      : input.value.trim();

    if (!address || !mapFrame) return;

    const encoded = encodeURIComponent(address);
    mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
  });

  if (mapBtn) {
    bindOnce(mapBtn, 'click', () => {
      const text = input.value.trim();
      if (!text) return;
      const encoded = encodeURIComponent(text);
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        '_blank'
      );
    }, 'mapBtn');
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

  bindOnce(addBtn, 'click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub additional-trainer-row';

    const label = document.createElement('label');
    label.textContent = 'Additional Trainer';
    label.style.flex = '1 1 auto';
    label.style.paddingRight = '16px';

    const input = document.createElement('input');
    input.type = 'text';

    newRow.append(label, input);
    container.appendChild(newRow);
  }, 'addTrainer');
}

/* -------------------------------------
   ADDITIONAL POC ON PAGE 2
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const template = grid.querySelector('.additional-poc-card');
  const addBtn = template ? template.querySelector('.additional-poc-add') : null;
  if (!template || !addBtn) return;

  function createAdditionalPocCard() {
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

  bindOnce(addBtn, 'click', () => {
    const newCard = createAdditionalPocCard();
    grid.appendChild(newCard);
  }, 'addPOC');
}

/* -------------------------------------
   SUPPORT TICKETS
   - Base card in Open section has data-base="true"
   - + button creates ONE new card
   - Status dropdown moves cards between sections
------------------------------------- */
function initSupportTickets() {
  const openContainer   = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer  = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const baseCard = openContainer.querySelector('.ticket-group[data-base="true"]');
  if (!baseCard) return;

  // Wire status change for base card
  wireTicketStatus(baseCard, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isBase: true
  });

  // + button on base card → add ONE new ticket card
  const addBtn = baseCard.querySelector('.add-ticket-btn');
  if (addBtn) {
    bindOnce(addBtn, 'click', () => {
      const newCard = createTicketCard(baseCard, {
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer
      });
      openContainer.appendChild(newCard);
      renumberTicketBadges();
    }, 'supportAdd');
  }

  // Make sure any existing cloned cards get badge numbers
  renumberTicketBadges();
}

function createTicketCard(template, ctx) {
  const card = template.cloneNode(true);
  card.removeAttribute('data-base');     // mark as normal card
  card.classList.add('ticket-group-clone');

  // Remove + button from cloned cards
  const addBtn = card.querySelector('.add-ticket-btn');
  if (addBtn) addBtn.remove();

  // Clear inputs/selects/textarea values
  card.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.tagName === 'SELECT') {
      if (el.classList.contains('ticket-status-select')) {
        el.value = 'Open'; // new card starts Open
      } else {
        el.selectedIndex = 0;
      }
    } else {
      el.value = '';
    }
  });

  // Ensure a badge element exists
  let badge = card.querySelector('.ticket-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'ticket-badge';
    card.insertBefore(badge, card.firstChild);
  }

  // Wire status change behavior
  wireTicketStatus(card, {
    openContainer: ctx.openContainer,
    tierTwoContainer: ctx.tierTwoContainer,
    closedResolvedContainer: ctx.closedResolvedContainer,
    closedFeatureContainer: ctx.closedFeatureContainer,
    isBase: false
  });

  // Wire auto-grow to the Short Summary textarea in this card
  const summary = card.querySelector('.ticket-summary-input');
  if (summary) hookAutoGrow(summary);

  return card;
}

function wireTicketStatus(card, ctx) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  bindOnce(select, 'change', () => {
    const status = select.value;
    let target = ctx.openContainer;

    if (status === 'Tier Two') {
      target = ctx.tierTwoContainer || ctx.openContainer;
    } else if (status === 'Closed - Resolved') {
      target = ctx.closedResolvedContainer || ctx.openContainer;
    } else if (status === 'Closed – Feature Not Supported') {
      target = ctx.closedFeatureContainer || ctx.openContainer;
    }

    // Base card never moves – it's just the template
    if (ctx.isBase) {
      if (status !== 'Open') {
        select.value = 'Open';
      }
      return;
    }

    if (target && card.parentElement !== target) {
      target.appendChild(card);
      renumberTicketBadges();
    }
  }, `status_${Math.random().toString(36).slice(2)}`);
}

function renumberTicketBadges() {
  const allCards = document.querySelectorAll(
    '#openTicketsContainer .ticket-group:not([data-base="true"]), ' +
    '#tierTwoTicketsContainer .ticket-group, ' +
    '#closedResolvedTicketsContainer .ticket-group, ' +
    '#closedFeatureTicketsContainer .ticket-group'
  );

  let counter = 1;
  allCards.forEach((card) => {
    let badge = card.querySelector('.ticket-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ticket-badge';
      card.insertBefore(badge, card.firstChild);
    }
    badge.textContent = `Ticket # ${counter}`;
    counter++;
  });
}

/* -------------------------------------
   AUTO-GROW SHORT SUMMARY TEXTAREA
------------------------------------- */
function initAutoGrowTicketSummary() {
  const all = document.querySelectorAll('.ticket-summary-input');
  all.forEach(hookAutoGrow);
}

function hookAutoGrow(el) {
  if (!el || el.tagName !== 'TEXTAREA') return;

  const resize = () => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  bindOnce(el, 'input', resize, 'summaryGrow');
  resize();
}

/* -------------------------------------
   TABLE ADD-ROW BUTTONS
------------------------------------- */
function initTableAddRowButtons() {
  const buttons = document.querySelectorAll('.table-footer .add-row');
  buttons.forEach((btn, idx) => {
    bindOnce(btn, 'click', () => {
      const table = btn.closest('.table-footer')
        ?.previousElementSibling
        ?.querySelector('table');

      if (!table) return;

      const tbody = table.querySelector('tbody') || table.createTBody();
      const last = tbody.lastElementChild;
      if (!last) return;

      const clone = last.cloneNode(true);

      clone.querySelectorAll('input, select').forEach((el) => {
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = false;
        } else {
          el.value = '';
        }
      });

      tbody.appendChild(clone);
    }, `tableAdd_${idx}`);
  });
}

/* -------------------------------------
   PDF EXPORT
------------------------------------- */
function initPdfExport() {
  const btn = document.getElementById('savePDF');
  if (!btn || !window.jspdf) return;

  bindOnce(btn, 'click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    doc.html(document.body, {
      callback: (instance) => instance.save('myKaarma_Training_Checklist.pdf'),
      margin: [20, 20, 20, 20],
      html2canvas: { scale: 0.6 }
    });
  }, 'pdfExport');
}

/* -------------------------------------
   DMS CARDS (placeholder for future logic)
------------------------------------- */
function initDmsCards() {
  // Reserved for future dynamic behaviors on the DMS page.
}
