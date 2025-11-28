/* =======================================================
   myKaarma Interactive Training Checklist – FULL JS
   Nav + Clear + Dynamic Rows + Support Tickets +
   Additional Trainers & Additional POC
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearButtons();
  initTableAddRowButtons();
  initSupportTickets();
  initAdditionalTrainers();
  initAdditionalPocCards();
});

/* --------------- NAVIGATION --------------- */

function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page-section');

  if (!navButtons.length || !pages.length) return;

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;

      // toggle active nav button
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // toggle page sections
      pages.forEach(page => {
        if (page.id === targetId) {
          page.classList.add('active');
        } else {
          page.classList.remove('active');
        }
      });
    });
  });
}

/* --------------- CLEAR BUTTONS --------------- */

function clearSection(sectionEl) {
  if (!sectionEl) return;

  const inputs = sectionEl.querySelectorAll('input, select, textarea');
  inputs.forEach(el => {
    const type = el.type ? el.type.toLowerCase() : '';
    if (type === 'checkbox' || type === 'radio') {
      el.checked = false;
    } else if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else {
      el.value = '';
    }
  });
}

function initClearButtons() {
  const clearPageButtons = document.querySelectorAll('.clear-page-btn');
  clearPageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      clearSection(section);
    });
  });

  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const pages = document.querySelectorAll('.page-section');
      pages.forEach(page => clearSection(page));
    });
  }
}

/* --------------- TABLES – ADD ROW BUTTONS --------------- */

function initTableAddRowButtons() {
  // Only table footer "+" buttons
  const addRowButtons = document.querySelectorAll('.table-footer .add-row');

  addRowButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tableContainer = btn.closest('.table-container');
      if (!tableContainer) return;

      const table = tableContainer.querySelector('table.training-table');
      if (!table) return;

      const tbody = table.querySelector('tbody');
      if (!tbody || !tbody.rows.length) return;

      const lastRow = tbody.rows[tbody.rows.length - 1];
      const newRow = lastRow.cloneNode(true);

      // Clear values in cloned row
      newRow.querySelectorAll('input, select').forEach(el => {
        const type = el.type ? el.type.toLowerCase() : '';
        if (type === 'checkbox' || type === 'radio') {
          el.checked = false;
        } else if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      });

      tbody.appendChild(newRow);
    });
  });
}

/* --------------- SUPPORT TICKETS --------------- */

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = template.cloneNode(true);
      newCard.classList.remove('ticket-group-template');
      newCard.dataset.template = 'false';

      // clear values
      newCard.querySelectorAll('input').forEach(input => input.value = '');
      const statusSelect = newCard.querySelector('.ticket-status-select');
      if (statusSelect) statusSelect.value = 'Open';

      // remove + button from clones
      const extraAddBtn = newCard.querySelector('.add-ticket-btn');
      if (extraAddBtn) extraAddBtn.remove();

      attachTicketStatusWatcher(newCard, {
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer
      });

      openContainer.appendChild(newCard);
    });
  }

  // template status watcher
  attachTicketStatusWatcher(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });
}

function attachTicketStatusWatcher(card, containers) {
  const statusSelect = card.querySelector('.ticket-status-select');
  if (!statusSelect) return;

  statusSelect.addEventListener('change', () => {
    const val = statusSelect.value;
    if (val === 'Open') {
      containers.openContainer.appendChild(card);
    } else if (val === 'Tier Two') {
      containers.tierTwoContainer && containers.tierTwoContainer.appendChild(card);
    } else if (val === 'Closed - Resolved') {
      containers.closedResolvedContainer && containers.closedResolvedContainer.appendChild(card);
    } else if (val === 'Closed – Feature Not Supported' || val === 'Closed - Feature Not Supported') {
      containers.closedFeatureContainer && containers.closedFeatureContainer.appendChild(card);
    }
  });
}

/* --------------- ADDITIONAL TRAINERS --------------- */

function initAdditionalTrainers() {
  const baseRow = document.querySelector('.additional-trainers-row');
  if (!baseRow) return;

  const addBtn = baseRow.querySelector('.add-trainer-btn');
  const baseInput = baseRow.querySelector('input[type="text"]');
  const container = document.getElementById('additionalTrainersContainer');

  if (!addBtn || !baseInput || !container) return;

  addBtn.addEventListener('click', () => {
    // create a new "plain" row for another trainer
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub';

    const label = document.createElement('label');
    label.textContent = 'Additional Trainer';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'additionalTrainersExtra';

    newRow.appendChild(label);
    newRow.appendChild(input);
    container.appendChild(newRow);

    // remove + button from the original row so it becomes a normal text box
    addBtn.remove();
    baseRow.classList.remove('integrated-plus');
  });
}

/* --------------- ADDITIONAL POC CARDS --------------- */

function initAdditionalPocCards() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  // template card is the one that has the "+"" button
  const templateCard = grid.querySelector('.additional-poc-card');
  if (!templateCard) return;

  const addBtn = templateCard.querySelector('.additional-poc-add');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const clone = templateCard.cloneNode(true);

    // clear values in inputs
    clone.querySelectorAll('input').forEach(input => {
      input.value = '';
    });

    // remove + button from clones so they are plain POC cards
    const cloneBtn = clone.querySelector('.additional-poc-add');
    if (cloneBtn) cloneBtn.remove();

    // ensure clones don't all have the template marker class
    clone.classList.remove('additional-poc-card');

    grid.appendChild(clone);
  });
}
