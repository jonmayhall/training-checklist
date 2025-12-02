document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initAdditionalTrainers();
  initAdditionalPoc();
  initMapUpdate(); // Corrected function for robust link handling
  initSupportTickets();
  initTableAddRowButtons();
  initPdfExport();
  initDmsCards();
});

/* --------------- UTILITY: GET CONTAINERS (For Support Tickets) --------------- */
function getTicketContainers() {
  return {
    openContainer: document.getElementById('openTicketsContainer'),
    tierTwoContainer: document.getElementById('tierTwoTicketsContainer'),
    closedResolvedContainer: document.getElementById('closedResolvedTicketsContainer'),
    closedFeatureContainer: document.getElementById('closedFeatureTicketsContainer')
  };
}

/* --------------- NAVIGATION --------------- */
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
      navButtons.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
}

/* --------------- CLEAR PAGE / CLEAR ALL --------------- */
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
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      clearSection(section);
      // If we cleared the dealership-info page, refresh topbar name.
      if (section && section.id === 'dealership-info') {
        updateDealershipNameDisplay();
      }
    });
  });
}

function initClearAllButton() {
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (!clearAllBtn) return;

  clearAllBtn.addEventListener('click', () => {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(clearSection);
    updateDealershipNameDisplay();
    // Clear dynamically added rows/cards
    document.getElementById('additionalTrainersContainer').innerHTML = '';
    const grid = document.getElementById('primaryContactsGrid');
    // Remove all but the first four fixed cards and the template card
    const cards = grid.querySelectorAll('.mini-card');
    for(let i = 5; i < cards.length; i++) {
      cards[i].remove();
    }
    // Reset the support ticket template and clear other containers
    const { tierTwoContainer, closedResolvedContainer, closedFeatureContainer } = getTicketContainers();
    tierTwoContainer.innerHTML = '';
    closedResolvedContainer.innerHTML = '';
    closedFeatureContainer.innerHTML = '';
  });
}

/* --------------- DEALERSHIP NAME BINDING --------------- */
function initDealershipNameBinding() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  if (!dealershipNameInput) return;

  dealershipNameInput.addEventListener('input', updateDealershipNameDisplay);
  // Initialize on load in case a value is pre-filled.
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const dealershipNameInput = document.getElementById('dealershipNameInput');
  const dealershipNameDisplay = document.getElementById('dealershipNameDisplay');
  if (!dealershipNameDisplay) return;

  const val = dealershipNameInput ? dealershipNameInput.value.trim() : '';
  dealershipNameDisplay.textContent = val || 'Dealership Name';
}

/* --------------- MAP EMBED ALTERNATIVE (PAGE 2) --------------- */
function initMapUpdate() {
    const mapBtn = document.getElementById('updateMapBtn');
    if (!mapBtn) return;

    mapBtn.addEventListener('click', () => {
        const addressInput = document.getElementById('dealerAddress');
        const mapFrame = document.getElementById('dealershipMap');
        
        if (!addressInput || !addressInput.value.trim()) {
            // Alert user if no address is entered but do not break if mapFrame is present
            if (mapFrame) {
                 mapFrame.src = ""; // Clear map if no address
            }
            alert('Please enter a Dealership Address first.');
            return;
        }
        
        const address = encodeURIComponent(addressInput.value.trim());
        
        // This opens a new tab/window to Google Maps with the address query,
        // which is the most reliable way to handle map lookups on static hosts.
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${address}&z=14`;
        
        // We still attempt to set the iframe src, but often fails on static pages.
        if (mapFrame) {
            mapFrame.src = mapUrl + "&output=embed";
        }
        
        // Open in a new tab for guaranteed success (optional, but highly recommended)
        window.open(mapUrl, '_blank');
    });
}


/* --------------- ADDITIONAL TRAINERS (PAGE 1) --------------- */
function initAdditionalTrainers() {
  const row = document.querySelector('.additional-trainers-row');
  const container = document.getElementById('additionalTrainersContainer');
  if (!row || !container) return;

  const addBtn = row.querySelector('.add-row');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    // Create a normal row directly below the integrated row.
    const newRow = document.createElement('div');
    newRow.className = 'checklist-row indent-sub';

    const label = document.createElement('label');
    label.textContent = 'Additional Trainer';
    // Match the indented label width/spacing
    label.style.flex = '0 0 36%';
    label.style.paddingRight = '12px';

    const input = document.createElement('input');
    input.type = 'text';

    newRow.appendChild(label);
    newRow.appendChild(input);

    container.appendChild(newRow);
  });
}

/* --------------- ADDITIONAL POC CARDS (PAGE 2) --------------- */
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

  addBtn.addEventListener('click', () => {
    const newCard = createNormalPocCard();
    grid.appendChild(newCard);
  });
}

/* --------------- SUPPORT TICKETS (PAGE 7) --------------- */
function initSupportTickets() {
  const { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer } = getTicketContainers();

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  // Ensure template status default is Open
  const templateStatus = template.querySelector('.ticket-status-select');
  if (templateStatus) {
    templateStatus.value = 'Open';
  }

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newCard = createTicketCard(template, {
        copyValues: false
      });
      openContainer.appendChild(newCard);
      updateTicketCounts();
    });
  }

  // Wire up template itself for status changes (special behavior)
  wireTicketStatus(template, {
    ...getTicketContainers(),
    isTemplate: true
  });

  // Run initial count update
  updateTicketCounts();
}

/**
 * Creates a new ticket card cloned from the template.
 * @param {HTMLElement} sourceCard - the card to clone (usually the template)
 * @param {Object} options
 *   - copyValues: if true, keep existing input/select values. If false, clear them.
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
    // if copyValues === true we keep existing values as-is
  });

  // Wire up status logic for this new card
  wireTicketStatus(clone, {
    ...getTicketContainers(),
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

  select.addEventListener('change', () => {
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
      // Template behavior: copy data to new card and move it, then reset template.
      if (value === 'Open' || !targetContainer) {
        return;
      }

      const newCard = createTicketCard(card, { copyValues: true });
      const newStatus = newCard.querySelector('.ticket-status-select');
      if (newStatus) {
        newStatus.value = value;
      }

      targetContainer.appendChild(newCard);
      resetTicketTemplate(card);
      updateTicketCounts();
      return;
    }

    // Normal card behavior: just move the card.
    if (targetContainer && targetContainer !== card.parentElement) {
      targetContainer.appendChild(card);
      updateTicketCounts();
    }
  });
}

/**
 * Updates the pill counts in the support ticket headers.
 */
function updateTicketCounts() {
  const { openContainer, tierTwoContainer, closedResolvedContainer, closedFeatureContainer } = getTicketContainers();

  const openCount = openContainer.querySelectorAll('.ticket-group:not(.ticket-group-template)').length;
  const tierTwoCount = tierTwoContainer.querySelectorAll('.ticket-group').length;
  const resolvedCount = closedResolvedContainer.querySelectorAll('.ticket-group').length;
  const featureCount = closedFeatureContainer.querySelectorAll('.ticket-group').length;

  document.getElementById('openTicketCount').textContent = openCount;
  document.getElementById('tierTwoTicketCount').textContent = tierTwoCount;
  document.getElementById('closedResolvedTicketCount').textContent = resolvedCount;
  document.getElementById('closedFeatureTicketCount').textContent = featureCount;
}

/* --------------- TABLE "+" BUTTONS (append empty row) --------------- */
function initTableAddRowButtons() {
  const tableFooters = document.querySelectorAll('.table-footer .add-row');

  tableFooters.forEach((btn) => {
    btn.addEventListener('click', () => {
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

      // Reset the row number if it's the opcode table
      if (table.closest('#opcodes-pricing')) {
        const firstCell = newRow.querySelector('td:first-child');
        if (firstCell) {
          firstCell.textContent = tbody.children.length + 1;
        }
      }

      tbody.appendChild(newRow);
    });
  });
}

/* --------------- PDF EXPORT (Summary page) --------------- */
function initPdfExport() {
  const btn = document.getElementById('savePDF');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!window.jspdf) {
      console.warn('jsPDF not available. Ensure the script tag is included.');
      return;
    }
    
    // Temporarily disable elements that shouldn't be in the PDF 
    const sidebar = document.getElementById('sidebar');
    const clearBtn = document.querySelector('#training-summary .clear-page-btn');
    let originalSidebarDisplay = '';
    let originalClearBtnDisplay = '';

    if (sidebar) {
        originalSidebarDisplay = sidebar.style.display;
        sidebar.style.display = 'none';
    }
    if (clearBtn) {
        originalClearBtnDisplay = clearBtn.style.display;
        clearBtn.style.display = 'none';
    }


    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    // Capture the entire body content
    doc.html(document.body, {
      callback: (docInstance) => {
        docInstance.save('myKaarma_Training_Checklist.pdf');
        // Restore elements after saving
        if (sidebar) {
            sidebar.style.display = originalSidebarDisplay;
        }
        if (clearBtn) {
            clearBtn.style.display = originalClearBtnDisplay;
        }
      },
      margin: [20, 20, 20, 20],
      autoPaging: 'text',
      html2canvas: {
        scale: 0.6
      }
    });
  });
}

/* --------------- DMS CARDS (optional extension hook) --------------- */
function initDmsCards() {
  // Set up listener to update the DMS name on the DMS Integration page
  const dmsInput = document.getElementById('dmsName');
  const dmsDisplay = document.getElementById('dmsNameDisplay');

  if (dmsInput && dmsDisplay) {
    const updateDmsName = () => {
      dmsDisplay.textContent = dmsInput.value.trim() || 'DMS';
    };
    dmsInput.addEventListener('input', updateDmsName);
    updateDmsName(); // Initial update
  }
}
