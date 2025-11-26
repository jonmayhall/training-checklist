// script.js – myKaarma Interactive Training Checklist
// Works with the CSS you pasted and the HTML structure you sent

document.addEventListener('DOMContentLoaded', () => {
  // ============================
  // NAVIGATION BETWEEN PAGES
  // ============================
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.page-section');

  function showSectionById(id) {
    sections.forEach(sec => {
      if (sec.id === id) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.target;
      // First button uses data-target="onsite-trainers" but section id="trainers-page"
      const targetId = target === 'onsite-trainers' ? 'trainers-page' : target;
      showSectionById(targetId);
    });
  });

  // Default: ensure the first section is visible if nothing is active
  if (!document.querySelector('.page-section.active')) {
    showSectionById('trainers-page');
    const firstNav = document.querySelector('.nav-btn[data-target="onsite-trainers"]');
    if (firstNav) firstNav.classList.add('active');
  }

  // ============================
  // CLEAR HELPERS
  // ============================

  function clearElements(root) {
    const inputs = root.querySelectorAll('input');
    const selects = root.querySelectorAll('select');
    const textareas = root.querySelectorAll('textarea');

    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });

    selects.forEach(sel => {
      sel.value = '';
    });

    textareas.forEach(t => {
      t.value = '';
    });
  }

  // ---------- Clear All (bottom of sidebar) ----------
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      clearElements(document);
      // Reset the dealership name display text
      const dealershipNameDisplay = document.getElementById('dealershipNameDisplay');
      if (dealershipNameDisplay) {
        dealershipNameDisplay.textContent = 'Dealership Name';
      }
    });
  }

  // ---------- Clear Page buttons (top-right of each page card) ----------
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.page-section');
      if (section) {
        clearElements(section);
      }
    });
  });

  // ============================
  // DEALERSHIP NAME LIVE SYNC
  // ============================

  const dealershipNameInput = document.getElementById('dealershipNameInput');
  const dealershipNameDisplay = document.getElementById('dealershipNameDisplay');
  if (dealershipNameInput && dealershipNameDisplay) {
    const syncName = () => {
      const val = dealershipNameInput.value.trim();
      dealershipNameDisplay.textContent = val || 'Dealership Name';
    };
    dealershipNameInput.addEventListener('input', syncName);
    // Initialize once on load
    syncName();
  }

  // ============================
  // TABLE FOOTER "+" ADD-ROW
  // (for all the training tables, opcodes table, etc.)
  // ============================

  document.querySelectorAll('.table-footer .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // Find nearest table
      const tableContainer = btn.closest('.table-container');
      if (!tableContainer) return;

      const table = tableContainer.querySelector('table');
      if (!table || !table.tBodies.length) return;

      const tbody = table.tBodies[0];
      const lastRow = tbody.rows[tbody.rows.length - 1];
      if (!lastRow) return;

      // Clone the last row
      const newRow = lastRow.cloneNode(true);

      // Clear inputs/selects in cloned row
      newRow.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      newRow.querySelectorAll('select').forEach(sel => {
        sel.value = '';
      });

      tbody.appendChild(newRow);
    });
  });

  // ============================
  // SUPPORT TICKETS BEHAVIOR
  // ============================

  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureTicketsContainer = document.getElementById('closedFeatureTicketsContainer');

  if (openTicketsContainer) {
    // Clear out text fields + reset status in a new ticket card
    function clearTicketCard(card) {
      // Clear all text inputs in the cloned card
      card.querySelectorAll('input[type="text"]').forEach(input => {
        input.value = '';
      });

      // Reset the status dropdown to "Open" (if it exists)
      const statusSelect = card.querySelector('.ticket-status-select');
      if (statusSelect) {
        statusSelect.value = 'Open';
      }
    }

    // Only the LAST open ticket card should display the "+" button
    function refreshAddButtons() {
      const cards = openTicketsContainer.querySelectorAll('.ticket-group');
      cards.forEach((card, index) => {
        const addBtn = card.querySelector('.add-row');
        if (!addBtn) return;

        if (index === cards.length - 1) {
          addBtn.style.display = 'inline-flex';
        } else {
          addBtn.style.display = 'none';
        }
      });
    }

    // "+" button inside Open Support Tickets card (integrated row)
    openTicketsContainer.addEventListener('click', (event) => {
      const addBtn = event.target.closest('.add-row');
      if (!addBtn) return;

      const currentCard = addBtn.closest('.ticket-group');
      if (!currentCard) return;

      // Clone the whole card (ticket-group)
      const newCard = currentCard.cloneNode(true);
      clearTicketCard(newCard);

      // Append the new card directly under the existing ones
      openTicketsContainer.appendChild(newCard);

      // Update which card shows the +
      refreshAddButtons();
    });

    // When Ticket Status changes, move the card to the appropriate section
    document.addEventListener('change', (event) => {
      const select = event.target.closest('.ticket-status-select');
      if (!select) return;

      const card = select.closest('.ticket-group');
      if (!card) return;

      let targetContainerRef = openTicketsContainer;

      switch (select.value) {
        case 'Open':
          targetContainerRef = openTicketsContainer;
          break;
        case 'Tier Two':
          targetContainerRef = tierTwoTicketsContainer || openTicketsContainer;
          break;
        case 'Closed - Resolved':
          targetContainerRef = closedResolvedTicketsContainer || openTicketsContainer;
          break;
        case 'Closed – Feature Not Supported':
        case 'Closed - Feature Not Supported':
          targetContainerRef = closedFeatureTicketsContainer || openTicketsContainer;
          break;
        default:
          targetContainerRef = openTicketsContainer;
      }

      if (targetContainerRef) {
        targetContainerRef.appendChild(card);
      }

      // After moving, fix which open card has the "+"
      refreshAddButtons();
    });

    // Initial state on load
    refreshAddButtons();
  }

  // ============================
  // SAVE ALL PAGES AS PDF (simple)
  // ============================

  const savePdfBtn = document.getElementById('savePDF');
  if (savePdfBtn && window.jspdf) {
    savePdfBtn.addEventListener('click', () => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');

        // Simple full-page export – not pixel-perfect, but gets everything into a PDF.
        doc.html(document.body, {
          callback: function (doc) {
            doc.save('myKaarma-Training-Checklist.pdf');
          },
          margin: [20, 20, 20, 20],
          autoPaging: 'text'
        });
      } catch (e) {
        console.error('PDF generation error:', e);
        alert('There was an issue generating the PDF. Please try again.');
      }
    });
  }
});
