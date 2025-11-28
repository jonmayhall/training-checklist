// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupClearAll();
  setupPageResetButtons();
  initAdditionalTrainers();
  initTrainingTablesAddRow();
  initSupportTickets();
  initAdditionalPoc();
  initDealershipMap();
  initDealershipNameMirror();
  initSavePDF();
});

// --------------- NAVIGATION ---------------
function setupNav() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  function showSection(targetId) {
    sections.forEach(sec => {
      sec.classList.toggle('active', sec.id === targetId);
    });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (!target) return;
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showSection(target);
    });
  });

  // Ensure at least one section is active on load
  const anyActive = document.querySelector('.page-section.active');
  if (!anyActive && sections.length > 0) {
    sections[0].classList.add('active');
    const firstId = sections[0].id;
    const firstBtn = document.querySelector(`.nav-btn[data-target="${firstId}"]`);
    if (firstBtn) firstBtn.classList.add('active');
  }
}

// --------------- CLEAR ALL (SIDEBAR) ---------------
function setupClearAll() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;

  clearAllBtn.addEventListener('click', () => {
    const ok = confirm('Clear all fields on all pages?');
    if (!ok) return;

    const allFields = document.querySelectorAll('input, select, textarea');
    allFields.forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else {
        el.value = '';
      }
    });

    // Reset the dealership map iframe
    const mapFrame = document.getElementById('dealershipMap');
    if (mapFrame) {
      mapFrame.src = '';
    }
  });
}

// --------------- PER-PAGE RESET BUTTONS ---------------
function setupPageResetButtons() {
  const buttons = document.querySelectorAll('.clear-page-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      if (!section) return;
      const ok = confirm('Clear all fields on this page?');
      if (!ok) return;

      const fields = section.querySelectorAll('input, select, textarea');
      fields.forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = false;
        } else {
          el.value = '';
        }
      });

      // If they reset Dealership Info page, also clear the map
      if (section.id === 'dealership-info') {
        const mapFrame = document.getElementById('dealershipMap');
        if (mapFrame) {
          mapFrame.src = '';
        }
      }
    });
  });
}

// --------------- ADDITIONAL TRAINERS (PAGE 1) ---------------
function initAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');
  if (!row || !container) return;

  const addBtn = row.querySelector('button.add-row');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    // Create one extra "Additional trainers" row directly below
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub';
    const lbl = document.createElement('label');
    lbl.textContent = 'Additional trainers';
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'additionalTrainersExtra';
    newRow.appendChild(lbl);
    newRow.appendChild(input);
    container.appendChild(newRow);

    // Remove the + button and integrated-plus styling from the original row
    row.classList.remove('integrated-plus');
    addBtn.remove();
  });
}

// --------------- ADD ROW TO TRAINING TABLES ---------------
function initTrainingTablesAddRow() {
  const addButtons = document.querySelectorAll('.table-container .table-footer .add-row');

  addButtons.forEach(button => {
    button.addEventListener('click', () => {
      const table = button.closest('.table-container')?.querySelector('table.training-table tbody');
      if (!table) return;

      const lastRow = table.querySelector('tr:last-child');
      if (!lastRow) return;

      const clone = lastRow.cloneNode(true);

      // Clear values in cloned row
      const fields = clone.querySelectorAll('input, select');
      fields.forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = false;
        } else {
          el.value = '';
        }
      });

      table.appendChild(clone);
    });
  });
}

// --------------- SUPPORT TICKETS (PAGE 7) ---------------
function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  if (!openContainer) return;

  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  function moveTicketGroup(group, status) {
    switch (status) {
      case 'Open':
        openContainer.appendChild(group);
        break;
      case 'Tier Two':
        if (tierTwoContainer) tierTwoContainer.appendChild(group);
        break;
      case 'Closed - Resolved':
        if (closedResolvedContainer) closedResolvedContainer.appendChild(group);
        break;
      case 'Closed – Feature Not Supported':
        if (closedFeatureContainer) closedFeatureContainer.appendChild(group);
        break;
      default:
        openContainer.appendChild(group);
    }
  }

  function attachTicketHandlers(group) {
    const statusSelect = group.querySelector('.ticket-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        moveTicketGroup(group, statusSelect.value);
      });
    }

    const addBtn = group.querySelector('.add-ticket-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const clone = createTicketGroup();
        openContainer.appendChild(clone);
      });
    }
  }

  function createTicketGroup() {
    const clone = template.cloneNode(true);
    clone.classList.remove('ticket-group-template');
    clone.removeAttribute('data-template');

    const inputs = clone.querySelectorAll('input');
    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });

    const statusSelect = clone.querySelector('.ticket-status-select');
    if (statusSelect) {
      statusSelect.value = 'Open';
    }

    // Only the template card has the + button
    const addBtn = clone.querySelector('.add-ticket-btn');
    if (addBtn) {
      addBtn.remove();
    }

    attachTicketHandlers(clone);
    return clone;
  }

  // Initialize handlers on template card
  attachTicketHandlers(template);
}

// --------------- ADDITIONAL POC CARDS (PAGE 2) ---------------
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  function attachToAddButton(btn) {
    btn.addEventListener('click', () => {
      const card = btn.closest('.additional-poc-card');
      if (!card) return;

      // Turn this card into a normal Additional POC card
      const topRow = card.querySelector('.checklist-row');
      if (topRow) {
        topRow.classList.remove('integrated-plus');
        btn.remove();
      }

      // Create a new template card and append it
      const newCard = createAdditionalPocTemplateCard();
      grid.appendChild(newCard);
    });
  }

  function createAdditionalPocTemplateCard() {
    const card = document.createElement('div');
    card.className = 'mini-card contact-card additional-poc-card';
    card.innerHTML = `
      <div class="checklist-row integrated-plus">
        <label>Additional POC</label>
        <input type="text" class="additional-poc-name">
        <button type="button" class="add-row additional-poc-add">+</button>
      </div>
      <div class="checklist-row indent-sub">
        <label>Role</label>
        <input type="text" class="additional-poc-role">
      </div>
      <div class="checklist-row indent-sub">
        <label>Cell</label>
        <input type="text" class="additional-poc-cell">
      </div>
      <div class="checklist-row indent-sub">
        <label>Email</label>
        <input type="email" class="additional-poc-email">
      </div>
    `;
    const btn = card.querySelector('.additional-poc-add');
    if (btn) attachToAddButton(btn);
    return card;
  }

  // Attach listener to the first Additional POC + button in existing HTML
  const firstBtn = grid.querySelector('.additional-poc-add');
  if (firstBtn) attachToAddButton(firstBtn);
}

// --------------- DEALERSHIP MAP (PAGE 2) ---------------
function initDealershipMap() {
  const addressInput = document.getElementById('dealerAddress');
  const dealerNameInput = document.getElementById('dealershipNameInput');
  const updateBtn = document.getElementById('updateMapBtn');
  const iframe = document.getElementById('dealershipMap');

  if (!addressInput || !updateBtn || !iframe) return;

  function buildMapUrl() {
    const name = dealerNameInput ? dealerNameInput.value.trim() : '';
    const addr = addressInput.value.trim();
    const query = (name ? name + ' ' : '') + addr;

    if (!query) return '';

    const base = 'https://www.google.com/maps?q=';
    return base + encodeURIComponent(query) + '&output=embed';
  }

  function updateMap() {
    const url = buildMapUrl();
    if (url) {
      iframe.src = url;
    }
  }

  updateBtn.addEventListener('click', updateMap);

  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateMap();
    }
  });
}

// --------------- DEALERSHIP NAME → TOP BAR MIRROR ---------------
function initDealershipNameMirror() {
  const input = document.getElementById('dealershipNameInput');
  const display = document.getElementById('dealershipNameDisplay');
  if (!input || !display) return;

  function sync() {
    const val = input.value.trim();
    display.textContent = val || 'Dealership Name';
  }

  input.addEventListener('input', sync);
  sync();
}

// --------------- SAVE ALL PAGES AS PDF (simple) ---------------
function initSavePDF() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library not loaded.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    // Simple full-page capture; not pixel-perfect but works
    doc.html(document.body, {
      callback: function (doc) {
        doc.save('myKaarma-training-checklist.pdf');
      },
      margin: [20, 20, 20, 20],
      autoPaging: 'text'
    });
  });
}
