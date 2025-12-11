/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS (Updated)
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
  initTrainingAcceptanceDropdowns();   // <--- NEW COLOR LOGIC ENABLED
});

/* -------------------------------------
   SMALL HELPER – BIND EVENT ONCE
------------------------------------- */
function bindOnce(el, event, handler, key) {
  if (!el) return;
  const flag = `__bound_${key}`;
  if (el[flag]) return;
  el.addEventListener(event, handler);
  el[flag] = true;
}

/* -------------------------------------
   NAVIGATION
------------------------------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  navButtons.forEach(btn => {
    bindOnce(btn, 'click', () => {
      const targetId = btn.dataset.target;

      sections.forEach(sec =>
        sec.classList.toggle('active', sec.id === targetId)
      );
      navButtons.forEach(b =>
        b.classList.toggle('active', b === btn)
      );
    }, `nav_${btn.dataset.target}`);
  });
}

/* -------------------------------------
   CLEAR PAGE / CLEAR ALL
------------------------------------- */
function clearSection(section) {
  const inputs = section.querySelectorAll('input, select, textarea');
  inputs.forEach(el => {
    if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else el.value = '';
  });
}

function initClearPageButtons() {
  document.querySelectorAll('.clear-page-btn').forEach((btn, i) => {
    bindOnce(btn, 'click', () => {
      const section = btn.closest('.page-section');
      clearSection(section);
      if (section.id === 'dealership-info') updateDealershipNameDisplay();
    }, `clearPage_${i}`);
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

  bindOnce(input, 'input', updateDealershipNameDisplay, 'dName');
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const inp = document.getElementById('dealershipNameInput');
  const out = document.getElementById('dealershipNameDisplay');
  out.textContent = inp?.value.trim() || 'Dealership Name';
}

/* -------------------------------------
   GOOGLE MAPS AUTOCOMPLETE
------------------------------------- */
function initAddressAutocomplete() {
  const input = document.getElementById('dealershipAddressInput');
  const mapFrame = document.getElementById('dealershipMapFrame');
  const mapBtn = document.getElementById('openAddressInMapsBtn');

  if (!input || !window.google?.maps?.places) return;

  const ac = new google.maps.places.Autocomplete(input, { types: ['geocode'] });

  ac.addListener('place_changed', () => {
    const place = ac.getPlace();
    const addr = place?.formatted_address || input.value.trim();
    if (!addr) return;

    const encoded = encodeURIComponent(addr);
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
   ADDITIONAL TRAINERS
------------------------------------- */
function initAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');

  if (!row || !container) return;

  const addBtn = row.querySelector('.add-row');
  bindOnce(addBtn, 'click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub additional-trainer-row';
    newRow.innerHTML = `
      <label>Additional Trainer</label>
      <input type="text">
    `;
    container.appendChild(newRow);
  }, 'addTrainer');
}

/* -------------------------------------
   ADDITIONAL POC CARDS
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const template = grid.querySelector('.additional-poc-card');
  const addBtn = template?.querySelector('.additional-poc-add');
  if (!template || !addBtn) return;

  function makeCard() {
    const c = document.createElement('div');
    c.className = 'mini-card contact-card';
    c.innerHTML = `
      <div class="checklist-row"><label>Additional POC</label><input type="text"></div>
      <div class="checklist-row indent-sub"><label>Role</label><input type="text"></div>
      <div class="checklist-row indent-sub"><label>Cell</label><input type="text"></div>
      <div class="checklist-row indent-sub"><label>Email</label><input type="email"></div>
    `;
    return c;
  }

  bindOnce(addBtn, 'click', () => {
    grid.appendChild(makeCard());
  }, 'addPOC');
}

/* -------------------------------------
   SUPPORT TICKETS
------------------------------------- */
function initSupportTickets() {
  const openC = document.getElementById('openTicketsContainer');
  const tierC = document.getElementById('tierTwoTicketsContainer');
  const resC = document.getElementById('closedResolvedTicketsContainer');
  const featC = document.getElementById('closedFeatureTicketsContainer');

  const base = openC?.querySelector('.ticket-group[data-base="true"]');
  if (!base) return;

  // Disable status selection on base card
  const baseStatus = base.querySelector('.ticket-status-select');
  if (baseStatus) {
    baseStatus.disabled = true;
    baseStatus.style.opacity = "0.6";
    baseStatus.style.pointerEvents = "none";
  }

  wireTicketStatus(base, { openC, tierC, resC, featC, isBase: true });

  const addBtn = base.querySelector('.add-ticket-btn');
  bindOnce(addBtn, 'click', () => {
    const newCard = createTicketCard(base, { openC, tierC, resC, featC });
    openC.appendChild(newCard);
    renumberTicketBadges();
  }, 'ticketAdd');

  renumberTicketBadges();
}

function createTicketCard(template, ctx) {
  const card = template.cloneNode(true);
  card.removeAttribute('data-base');
  card.classList.add('ticket-group-clone');

  const addBtn = card.querySelector('.add-ticket-btn');
  if (addBtn) addBtn.remove();

  card.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.tagName === 'SELECT') {
      el.value = el.classList.contains('ticket-status-select') ? 'Open' : '';
    } else el.value = '';
  });

  let badge = card.querySelector('.ticket-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'ticket-badge';
    card.insertBefore(badge, card.firstChild);
  }

  wireTicketStatus(card, ctx);

  const summary = card.querySelector('.ticket-summary-input');
  if (summary) hookAutoGrow(summary);

  return card;
}

function wireTicketStatus(card, ctx) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  bindOnce(select, 'change', () => {
    const val = select.value;

    if (ctx.isBase) {
      select.value = 'Open';
      return;
    }

    let target = ctx.openC;
    if (val === 'Tier Two') target = ctx.tierC;
    else if (val === 'Closed - Resolved') target = ctx.resC;
    else if (val === 'Closed – Feature Not Supported') target = ctx.featC;

    if (target && card.parentElement !== target) {
      target.appendChild(card);
      renumberTicketBadges();
    }
  }, `status_${Math.random()}`);
}

function renumberTicketBadges() {
  const all = document.querySelectorAll(
    '#openTicketsContainer .ticket-group:not([data-base="true"]), ' +
    '#tierTwoTicketsContainer .ticket-group, ' +
    '#closedResolvedTicketsContainer .ticket-group, ' +
    '#closedFeatureTicketsContainer .ticket-group'
  );

  let n = 1;
  all.forEach(card => {
    let badge = card.querySelector('.ticket-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ticket-badge';
      card.insertBefore(badge, card.firstChild);
    }
    badge.textContent = `Ticket # ${n++}`;
  });
}

/* -------------------------------------
   AUTO-GROW FOR SHORT SUMMARY
------------------------------------- */
function initAutoGrowTicketSummary() {
  document.querySelectorAll('.ticket-summary-input').forEach(hookAutoGrow);
}

function hookAutoGrow(el) {
  function resize() {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }
  bindOnce(el, 'input', resize, `grow_${Math.random()}`);
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

      const tbody = table.querySelector('tbody');
      const last = tbody.lastElementChild;
      const clone = last.cloneNode(true);

      clone.querySelectorAll('input, select').forEach(el => {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(clone);

      // Apply color logic to new dropdowns
      initTrainingAcceptanceDropdowns();
    }, `tblAdd_${idx}`);
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
      callback: d => d.save('myKaarma_Training_Checklist.pdf'),
      margin: [20, 20, 20, 20],
      html2canvas: { scale: 0.6 }
    });
  }, 'pdfSave');
}

/* -------------------------------------
   DMS CARDS (placeholder)
------------------------------------- */
function initDmsCards() {}

/* -------------------------------------
   TRAINING CHECKLIST – DROPDOWN COLOR LOGIC
------------------------------------- */
function initTrainingAcceptanceDropdowns() {
  const section = document.getElementById('training-checklist');
  if (!section) return;

  const selects = section.querySelectorAll('.training-table select');

  const GREEN = ['Yes', 'Web & Mobile', 'Fully Adopted'];
  const YELLOW = ['Web', 'Mobile', 'Neutral / Mixed', 'Mostly Adopted'];
  const RED = ['No', 'Not Trained', 'Needs Support', 'Not Accepted'];
  const GRAY = ['N/A', 'NA'];

  function applyColor(sel) {
    const v = sel.value.trim();
    sel.classList.remove('accept-green', 'accept-yellow', 'accept-red', 'accept-gray');

    if (GREEN.includes(v)) sel.classList.add('accept-green');
    else if (YELLOW.includes(v)) sel.classList.add('accept-yellow');
    else if (RED.includes(v)) sel.classList.add('accept-red');
    else if (GRAY.includes(v)) sel.classList.add('accept-gray');
  }

  selects.forEach((sel, i) => {
    applyColor(sel);
    bindOnce(sel, 'change', () => applyColor(sel), `trainColor_${i}`);
  });
}
