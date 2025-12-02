/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS (FINAL)
   No placeholders. No stubs. Fully implemented.
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initAddressMapSystem();
  initAdditionalTrainers();
  initAdditionalPoc();
  initSupportTickets();
  initTableAddRowButtons();
  initPdfExport();
});

/* -------------------------------------
   NAVIGATION
------------------------------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;

      sections.forEach(sec => sec.classList.toggle('active', sec.id === target));
      navButtons.forEach(b => b.classList.toggle('active', b === btn));
    });
  });
}

/* -------------------------------------
   CLEAR PAGE / CLEAR ALL
------------------------------------- */
function clearSection(section) {
  section.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
    else el.value = '';
  });
}

function initClearPageButtons() {
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
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
   DEALERSHIP NAME: TOPBAR LIVE SYNC
------------------------------------- */
function initDealershipNameBinding() {
  const input = document.getElementById('dealershipNameInput');
  if (!input) return;
  input.addEventListener('input', updateDealershipNameDisplay);
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const input = document.getElementById('dealershipNameInput');
  const display = document.getElementById('dealershipNameDisplay');
  display.textContent = input.value.trim() || "Dealership Name";
}

/* -------------------------------------
   ADDRESS ENTRY → MAP (NO API KEY)
------------------------------------- */
function initAddressMapSystem() {
  const input = document.getElementById('dealershipAddressInput');
  const frame = document.getElementById('dealershipMapFrame');
  const btn = document.getElementById('openAddressInMapsBtn');
  if (!input || !frame) return;

  function updateMap() {
    const text = input.value.trim();
    if (!text) return;
    const encoded = encodeURIComponent(text);
    frame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
  }

  input.addEventListener('blur', updateMap);

  input.addEventListener('keydown', e => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateMap();
    }
  });

  if (btn) {
    btn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      const encoded = encodeURIComponent(text);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
      frame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    });
  }
}

/* -------------------------------------
   ADDITIONAL TRAINERS
------------------------------------- */
function initAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');
  if (!row || !container) return;

  const add = row.querySelector('.add-row');
  if (!add) return;

  add.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = "checklist-row indent-sub";
    div.innerHTML = `
      <label style="flex:0 0 36%;padding-right:12px;">Additional Trainer</label>
      <input type="text">
    `;
    container.appendChild(div);
  });
}

/* -------------------------------------
   ADDITIONAL POC (PAGE 2)
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const template = grid.querySelector('.additional-poc-card');
  const button = template?.querySelector('.additional-poc-add');
  if (!template || !button) return;

  button.addEventListener('click', () => {
    const card = document.createElement('div');
    card.className = "mini-card contact-card";
    card.innerHTML = `
      <div class="checklist-row"><label>Additional POC</label><input type="text"></div>
      <div class="checklist-row indent-sub"><label>Role</label><input type="text"></div>
      <div class="checklist-row indent-sub"><label>Cell</label><input type="text"></div>
      <div class="checklist-row indent-sub"><label>Email</label><input type="email"></div>
    `;
    grid.appendChild(card);
  });
}

/* -------------------------------------
   SUPPORT TICKETS
------------------------------------- */
function initSupportTickets() {
  const open = document.getElementById('openTicketsContainer');
  const tier2 = document.getElementById('tierTwoTicketsContainer');
  const closedResolved = document.getElementById('closedResolvedTicketsContainer');
  const closedFeature = document.getElementById('closedFeatureTicketsContainer');

  const template = open?.querySelector('.ticket-group-template');
  if (!template) return;

  template.querySelector('.ticket-status-select').value = "Open";

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const card = createTicket(template, false);
      open.appendChild(card);
    });
  }

  attachTicketLogic(template, {
    isTemplate: true,
    open, tier2, closedResolved, closedFeature
  });
}

function createTicket(source, copyValues) {
  const card = source.cloneNode(true);
  card.classList.remove('ticket-group-template');
  card.querySelector('.add-ticket-btn')?.remove();

  const fields = card.querySelectorAll('input, select, textarea');
  fields.forEach(el => {
    if (!copyValues) {
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    }
  });

  attachTicketLogic(card, {
    isTemplate: false,
    open: document.getElementById('openTicketsContainer'),
    tier2: document.getElementById('tierTwoTicketsContainer'),
    closedResolved: document.getElementById('closedResolvedTicketsContainer'),
    closedFeature: document.getElementById('closedFeatureTicketsContainer')
  });

  return card;
}

function resetTicketTemplate(card) {
  card.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.tagName === "SELECT") el.value = "Open";
    else el.value = "";
  });
}

function attachTicketLogic(card, ctx) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const val = select.value;

    let container =
      val === "Tier Two" ? ctx.tier2 :
      val === "Closed - Resolved" ? ctx.closedResolved :
      val === "Closed – Feature Not Supported" ? ctx.closedFeature :
      ctx.open;

    if (ctx.isTemplate) {
      if (val === "Open") return;
      const newCard = createTicket(card, true);
      newCard.querySelector('.ticket-status-select').value = val;
      container.appendChild(newCard);
      resetTicketTemplate(card);
      return;
    }

    if (card.parentElement !== container) container.appendChild(card);
  });
}

/* -------------------------------------
   TABLES: ADD NEW ROW
------------------------------------- */
function initTableAddRowButtons() {
  document.querySelectorAll('.table-footer .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const table = btn.closest('.table-footer')
        ?.previousElementSibling
        ?.querySelector('table');
      if (!table) return;

      const tbody = table.querySelector('tbody') || table.createTBody();
      const lastRow = tbody.lastElementChild;
      if (!lastRow) return;

      const clone = lastRow.cloneNode(true);
      clone.querySelectorAll('input, select').forEach(el => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
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
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF('p', 'pt', 'a4');
    doc.html(document.body, {
      callback: d => d.save("myKaarma_Training_Checklist.pdf"),
      margin: [20,20,20,20],
      html2canvas: { scale: 0.6 }
    });
  });
}
