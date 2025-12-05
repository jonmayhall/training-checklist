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
   SMALL HELPERS – prevent double-binding
------------------------------------- */
function bindClickOnce(el, handler) {
  if (!el) return;
  if (el.dataset.boundClick === 'true') return;
  el.addEventListener('click', handler);
  el.dataset.boundClick = 'true';
}

function bindChangeOnce(el, handler) {
  if (!el) return;
  if (el.dataset.boundChange === 'true') return;
  el.addEventListener('change', handler);
  el.dataset.boundChange = 'true';
}

/* -------------------------------------
   NAVIGATION
------------------------------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  if (!navButtons.length || !sections.length) return;

  navButtons.forEach((btn) => {
    bindClickOnce(btn, () => {
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
  const buttons = document.querySelectorAll('.clear-page-btn');
  buttons.forEach((btn) => {
    bindClickOnce(btn, () => {
      const section = btn.closest('.page-section');
      clearSection(section);
      if (section && section.id === 'dealership-info') {
        updateDealershipNameDisplay();
      }
    });
  });
}

function initClearAllButton() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;

  bindClickOnce(clearAllBtn, () => {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(clearSection);
    updateDealershipNameDisplay();
  });
}

/* -------------------------------------
   DEALERSHIP NAME TOPBAR SYNC
------------------------------------- */
function initDealershipNameBinding() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  if (!dealershipNameInput) return;

  dealershipNameInput.addEventListener('input', updateDealershipNameDisplay);
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  const dealershipNameDisplay = document.getElementById('dealershipNameDisplay');
  if (!dealershipNameDisplay) return;

  const val = dealershipNameInput ? dealershipNameInput.value.trim() : '';
  dealershipNameDisplay.textContent = val || 'Dealership Name';
}

/* -------------------------------------
   GOOGLE MAPS AUTOCOMPLETE + MAP BUTTON
   (keep YOUR real API key where you already set it)
------------------------------------- */
let googleAutocomplete;

function initAddressAutocomplete() {
  const addressInput = document.getElementById('dealershipAddressInput');
  const mapFrame = document.getElementById('dealershipMapFrame');
  const openBtn = document.getElementById('openAddressInMapsBtn');

  if (!addressInput) return;

  function loadGoogleMaps() {
    // If already loaded, just init
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocompleteInternal();
      return;
    }

    const existing = document.getElementById('gmaps-places-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'gmaps-places-script';
    script.src =
      'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY_HERE&libraries=places&callback=initAutocompleteInternal';
    script.async = true;
    document.head.appendChild(script);
  }

  window.initAutocompleteInternal = function () {
    if (!window.google || !google.maps || !google.maps.places) return;

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
    bindClickOnce(openBtn, () => {
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

  bindClickOnce(addBtn, () => {
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub';

    const label = document.createElement('label');
    label.textContent = 'Additional Trainer';
    label.style.flex = '0 0 36%';
    label.style.paddingRight = '12px';

    const input = document.createElement('input');
    input.type = 'text';

    newRow.appendChild(label);
    newRow.appendChild(input);

    container.appendChild(newRow);
  });
}

/* -------------------------------------
   ADDITIONAL POC CARDS (PAGE 2)
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById('primaryContactsGrid');
  if (!grid) return;

  const templateCard = grid.querySelector('.additional-poc-card');
  if (!templateCard) return;

  const addBtn = templateCard.querySelector('.additional-poc-add');
  if (!addBtn) return;

  function createNormalPocCard() {
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

  bindClickOnce(addBtn, () => {
    const newCard = createNormalPocCard();
    grid.appendChild(newCard);
  });
}

/* -------------------------------------
   SUPPORT TICKETS (PAGE 7)
------------------------------------- */

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  // Ensure template status default is Open
  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) {
    templateStatus.value = 'Open';
  }

  // Template label always "Ticket # 1"
  const templateLabel = template.querySelector('.ticket-number-label');
  if (templateLabel) {
    templateLabel.textContent = 'Ticket # 1';
  }

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    bindClickOnce(addBtn, () => {
      const newCard = createTicketCard(template, {
        copyValues: false
      });
      openContainer.appendChild(newCard);
    });
  }

  // Wire up template itself for status changes (special behavior)
  wireTicketStatus(template, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: true
  });
}

/**
 * Gets next ticket number based on existing labels.
 */
function getNextTicketNumber() {
  const cards = document.querySelectorAll('.ticket-group');
  let maxNum = 1;

  cards.forEach((card) => {
    const label = card.querySelector('.ticket-number-label');
    if (!label) return;
    const match = label.textContent.match(/(\d+)/);
    if (!match) return;
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  return maxNum + 1;
}

/**
 * Creates a new ticket card cloned from the template.
 * @param {HTMLElement} sourceCard
 * @param {Object} options
 *   - copyValues: if true, keep existing input/select values.
 */
function createTicketCard(sourceCard, options = {}) {
  const { copyValues = false } = options;

  const clone = sourceCard.cloneNode(true);

  // No longer the template
  clone.classList.remove('ticket-group-template');
  clone.removeAttribute('data-template');

  // Remove the add button from clones
  const addBtn = clone.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.remove();
  }

  // Remove integrated-plus class so additional Ticket # inputs
  // are full-width and rounded on the right like normal text boxes
  const integratedRow = clone.querySelector('.checklist-row.integrated-plus');
  if (integratedRow) {
    integratedRow.classList.remove('integrated-plus');
  }

  const fields = clone.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (!copyValues) {
      if (el.tagName === 'SELECT') {
        if (el.classList.contains('ticket-status-select')) {
          el.value = 'Open';
        } else {
          el.selectedIndex = 0;
        }
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else {
        el.value = '';
      }
    }
  });

  // Ticket # label for this new card
  const label = clone.querySelector('.ticket-number-label');
  if (label) {
    const next = getNextTicketNumber();
    label.textContent = `Ticket # ${next}`;
  }

  // Wire up status logic for this new card
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  wireTicketStatus(clone, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate: false
  });

  return clone;
}

/**
 * Clears all fields in the template and resets status to Open.
 */
function resetTicketTemplate(template) {
  const fields = template.querySelectorAll('input, select, textarea');
  fields.forEach((el) => {
    if (el.tagName === 'SELECT') {
      if (el.classList.contains('ticket-status-select')) {
        el.value = 'Open';
      } else {
        el.selectedIndex = 0;
      }
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });

  const label = template.querySelector('.ticket-number-label');
  if (label) {
    label.textContent = 'Ticket # 1';
  }
}

/**
 * Wires status change for a ticket card.
 */
function wireTicketStatus(card, containers) {
  const {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer,
    isTemplate = false
  } = containers;

  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  bindChangeOnce(select, () => {
    const value = select.value;

    let targetContainer = openContainer;
    if (value === 'Tier Two') {
      targetContainer = tierTwoContainer;
    } else if (value === 'Closed - Resolved') {
      targetContainer = closedResolvedContainer;
    } else if (value === 'Closed – Feature Not Supported') {
      // Note: EN DASH in "Closed – Feature Not Supported"
      targetContainer = closedFeatureContainer;
    } else if (value === 'Open') {
      targetContainer = openContainer;
    }

    if (isTemplate) {
      // Template should never actually leave the Open container.
      if (value === 'Open' || !targetContainer) {
        return;
      }

      // Create a new card WITH the template's data and status.
      const newCard = createTicketCard(card, { copyValues: true });
      const newStatus = newCard.querySelector('.ticket-status-select');
      if (newStatus) {
        newStatus.value = value;
      }

      targetContainer.appendChild(newCard);

      // Reset the template back to a blank Open card.
      resetTicketTemplate(card);
      return;
    }

    // Normal (non-template) cards just move between containers.
    if (!targetContainer || targetContainer === card.parentElement) {
      return;
    }

    targetContainer.appendChild(card);
  });
}

/* -------------------------------------
   TABLE "+" BUTTONS (append empty row)
------------------------------------- */
function initTableAddRowButtons() {
  const tableButtons = document.querySelectorAll('.table-footer .add-row');

  tableButtons.forEach((btn) => {
    bindClickOnce(btn, () => {
      const footer = btn.closest('.table-footer');
      if (!footer) return;

      const container = footer.previousElementSibling;
      if (!container) return;

      const table = container.querySelector('table');
      if (!table) return;

      const tbody = table.querySelector('tbody') || table.createTBody();
      const lastRow = tbody.lastElementChild;
      if (!lastRow) return;

      const newRow = lastRow.cloneNode(true);

      // Clear values in cloned row
      const fields = newRow.querySelectorAll('input, select, textarea');
      fields.forEach((el) => {
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

/* -------------------------------------
   PDF EXPORT (Summary page)
------------------------------------- */
function initPdfExport() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  bindClickOnce(btn, () => {
    if (!window.jspdf) {
      console.warn('jsPDF not available.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    doc.html(document.body, {
      callback: (docInstance) => {
        docInstance.save('myKaarma_Training_Checklist.pdf');
      },
      margin: [20, 20, 20, 20],
      autoPaging: 'text',
      html2canvas: {
        scale: 0.6
      }
    });
  });
}

/* -------------------------------------
   DMS CARDS (placeholder)
------------------------------------- */
function initDmsCards() {
  // Future dynamic DMS behavior can go here.
}
