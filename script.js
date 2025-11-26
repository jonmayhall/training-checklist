// =======================================================
// myKaarma Interactive Training Checklist – Script
// Navigation + Clear Buttons + Table Row Add + Support Tickets
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initDealershipName();
  initClearPageButtons();
  initClearAllButton();
  initTableRowAdd();
  initSupportTickets();
  initPdfButton();
});

// ---------------- NAVIGATION ----------------

function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  if (!navButtons.length || !sections.length) return;

  const specialMap = {
    'onsite-trainers': 'trainers-page'
  };

  function showSection(targetKey) {
    const mappedId = specialMap[targetKey] || targetKey;
    sections.forEach(sec => {
      sec.classList.toggle('active', sec.id === mappedId);
    });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      if (target) showSection(target);
    });
  });

  // Ensure one section is visible on load
  const active = document.querySelector('.page-section.active');
  if (!active) {
    const first = sections[0];
    if (first) first.classList.add('active');
  }
}

// ---------------- DEALERSHIP NAME DISPLAY ----------------

function initDealershipName() {
  const input = document.getElementById('dealershipNameInput');
  const display = document.getElementById('dealershipNameDisplay');

  if (!input || !display) return;

  const update = () => {
    const val = input.value.trim();
    display.textContent = val || 'Dealership Name';
  };

  input.addEventListener('input', update);
  update();
}

// ---------------- CLEAR PAGE ----------------

function clearElementsInside(root) {
  if (!root) return;

  const inputs = root.querySelectorAll('input');
  const selects = root.querySelectorAll('select');
  const textareas = root.querySelectorAll('textarea');

  inputs.forEach(inp => {
    if (inp.type === 'checkbox' || inp.type === 'radio') {
      inp.checked = false;
    } else {
      inp.value = '';
    }
  });

  selects.forEach(sel => {
    sel.selectedIndex = 0;
  });

  textareas.forEach(ta => {
    ta.value = '';
  });
}

function initClearPageButtons() {
  const buttons = document.querySelectorAll('.clear-page-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      if (!section) return;

      const confirmed = window.confirm('Reset all fields on this page?');
      if (!confirmed) return;

      clearElementsInside(section);
    });
  });
}

function initClearAllButton() {
  const btn = document.getElementById('clearAllBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const confirmed = window.confirm('Clear all pages in this checklist?');
    if (!confirmed) return;

    const app = document.getElementById('app');
    if (!app) return;

    clearElementsInside(app);
  });
}

// ---------------- TABLE ROW ADD (+) ----------------

function initTableRowAdd() {
  const addButtons = document.querySelectorAll('.table-footer .add-row');
  if (!addButtons.length) return;

  addButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Only work within this table container
      const container = btn.closest('.table-container');
      if (!container) return;

      const table = container.querySelector('table');
      if (!table || !table.tBodies.length) return;

      const tbody = table.tBodies[0];
      const lastRow = tbody.lastElementChild;
      if (!lastRow) return;

      const newRow = lastRow.cloneNode(true);

      // Clear contents in cloned row
      const fields = newRow.querySelectorAll('input, select, textarea');
      fields.forEach(el => {
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

// ---------------- SUPPORT TICKETS ----------------

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer || !tierTwoContainer || !closedResolvedContainer || !closedFeatureContainer) {
    return;
  }

  const templateGroup = openContainer.querySelector('.ticket-group');
  if (!templateGroup) return;

  const addBtn = templateGroup.querySelector('.add-row');
  if (!addBtn) return;

  // Wire up existing status selects (template + any existing)
  wireStatusListeners(templateGroup);

  addBtn.addEventListener('click', () => {
    const newGroup = templateGroup.cloneNode(true);

    // Remove the + button from the cloned card
    const newAddBtn = newGroup.querySelector('.add-row');
    if (newAddBtn) {
      newAddBtn.remove();
    }

    // Clear all text inputs + selects in the new card
    clearTicketGroupFields(newGroup);

    // Append directly under the template
    openContainer.appendChild(newGroup);

    // Wire up status change for the new card
    wireStatusListeners(newGroup);
  });

  // --- helpers ---

  function clearTicketGroupFields(group) {
    const inputs = group.querySelectorAll('input[type="text"], input[type="date"], textarea');
    const selects = group.querySelectorAll('select');

    inputs.forEach(inp => {
      inp.value = '';
    });

    selects.forEach(sel => {
      sel.selectedIndex = 0;
    });
  }

  function wireStatusListeners(group) {
    const statusSelects = group.querySelectorAll('.ticket-status-select');
    statusSelects.forEach(select => {
      select.addEventListener('change', () => {
        const value = select.value;
        const card = select.closest('.ticket-group');
        if (!card) return;

        // Move card based on status
        if (value === 'Open') {
          openContainer.appendChild(card);
        } else if (value === 'Tier Two') {
          tierTwoContainer.appendChild(card);
        } else if (value === 'Closed - Resolved') {
          closedResolvedContainer.appendChild(card);
        } else if (
          value === 'Closed – Feature Not Supported' ||
          value === 'Closed - Feature Not Supported'
        ) {
          closedFeatureContainer.appendChild(card);
        }
      });
    });
  }
}

// ---------------- PDF (simple: use browser print) ----------------

function initPdfButton() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Simple, reliable: user can "Save as PDF" from print dialog
    window.print();
  });
}
