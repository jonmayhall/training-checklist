// =========================================================
// myKaarma Interactive Training Checklist – Main JS
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearAll();
  initPageReset();
  initAdditionalTrainers();
  initAdditionalPoc();
  initSupportTickets();
  initPdfStub();
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
        page.classList.toggle('active', page.id === targetId);
      });
    });
  });

  // Safety: ensure at least one page is active
  const anyActive = Array.from(pages).some(p => p.classList.contains('active'));
  if (!anyActive && navButtons[0]) {
    const firstTarget = navButtons[0].getAttribute('data-target');
    navButtons[0].classList.add('active');
    pages.forEach(page => {
      page.classList.toggle('active', page.id === firstTarget);
    });
  }
}

/* --------------- CLEAR ALL --------------- */

function initClearAll() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;

  clearAllBtn.addEventListener('click', () => {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
  });
}

/* --------------- PER-PAGE RESET BUTTONS --------------- */

function initPageReset() {
  const resetButtons = document.querySelectorAll('.clear-page-btn');
  if (!resetButtons.length) return;

  resetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pageSection = btn.closest('.page-section');
      if (!pageSection) return;

      const inputs = pageSection.querySelectorAll('input, select, textarea');
      inputs.forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = false;
        } else if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      });
    });
  });
}

/* --------------- ADDITIONAL TRAINERS (PAGE 1) --------------- */

function initAdditionalTrainers() {
  const baseRow = document.querySelector('.additional-trainers-row');
  if (!baseRow) return;

  const addBtn = baseRow.querySelector('.add-trainer-btn, .add-row');
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

/* --------------- ADDITIONAL POC (PAGE 2) --------------- */
/* This assumes:
   - A template card with class "additional-poc-template" inside #primaryContactsGrid
   - The template has:
       .checklist-row.integrated-plus
          input[type="text"] (name)
          button.additional-poc-add
     and following rows for Role / Cell / Email
*/

function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const template = grid.querySelector('.additional-poc-template');
  if (!template) return;

  const addBtn = template.querySelector('.additional-poc-add');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const clone = template.cloneNode(true);
    clone.classList.remove('additional-poc-template');

    // in clones, remove the + button so they are normal cards
    const integratedRow = clone.querySelector('.checklist-row.integrated-plus');
    if (integratedRow) {
      const btn = integratedRow.querySelector('.additional-poc-add');
      if (btn) btn.remove();
      integratedRow.classList.remove('integrated-plus');
    }

    // clear all inputs in the cloned card
    const inputs = clone.querySelectorAll('input');
    inputs.forEach(input => {
      input.value = '';
    });

    // insert clone right after the last POC card
    grid.appendChild(clone);
  });
}

/* --------------- SUPPORT TICKETS (PAGE 7) --------------- */

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  // wire up the template itself
  wireTicketGroup(template);

  // Add button on template for cloning
  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const clone = template.cloneNode(true);
      clone.classList.remove('ticket-group-template');
      const addBtnClone = clone.querySelector('.add-ticket-btn');
      if (addBtnClone) addBtnClone.remove();
      clone.dataset.template = 'false';

      // clear inputs
      const inputs = clone.querySelectorAll('input[type="text"]');
      inputs.forEach(i => i.value = '');
      const select = clone.querySelector('.ticket-status-select');
      if (select) select.value = 'Open';

      wireTicketGroup(clone);
      openContainer.appendChild(clone);
    });
  }

  function wireTicketGroup(group) {
    const statusSelect = group.querySelector('.ticket-status-select');
    if (!statusSelect) return;

    statusSelect.addEventListener('change', () => {
      const value = statusSelect.value;
      if (value === 'Open') {
        openContainer.appendChild(group);
      } else if (value === 'Tier Two' && tierTwoContainer) {
        tierTwoContainer.appendChild(group);
      } else if (value === 'Closed - Resolved' && closedResolvedContainer) {
        closedResolvedContainer.appendChild(group);
      } else if (value === 'Closed – Feature Not Supported' && closedFeatureContainer) {
        closedFeatureContainer.appendChild(group);
      }
    });
  }
}

/* --------------- PDF STUB (PAGE 10) --------------- */

function initPdfStub() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Placeholder: hook your jsPDF multi-page logic here
    alert('PDF export will be implemented here.');
  });
}
