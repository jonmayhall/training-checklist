// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// - Sidebar nav
// - Dealership name mirror
// - Clear page / Clear all
// - Add row for all tables
// - Additional POC mini-card add
// - Support Tickets logic (permanent template card + moves)
// - Simple PDF export for all pages
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initDealershipNameBinding();
  initClearPageButtons();
  initClearAllButton();
  initTableAddRowButtons();
  initAdditionalPocCardAdd();     // NEW
  initSupportTickets();
  initPDFExport();
});

// ---------------- NAVIGATION ----------------
function initNav() {
  const navButtons = document.querySelectorAll("#sidebar-nav .nav-btn");
  const sections = document.querySelectorAll(".page-section");

  if (!navButtons.length || !sections.length) return;

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      let targetSection = document.getElementById(target);

      // Fallback for the first page if ID is trainers-page
      if (!targetSection && target === "onsite-trainers") {
        targetSection = document.getElementById("trainers-page");
      }

      if (!targetSection) return;

      // Active button
      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Active section
      sections.forEach((sec) => sec.classList.remove("active"));
      targetSection.classList.add("active");
    });
  });
}

// ---------------- DEALERSHIP NAME MIRROR ----------------
function initDealershipNameBinding() {
  const input = document.getElementById("dealershipNameInput");
  const display = document.getElementById("dealershipNameDisplay");

  if (!input || !display) return;

  const updateDisplay = () => {
    const val = input.value.trim();
    display.textContent = val || "Dealership Name";
  };

  input.addEventListener("input", updateDisplay);
  updateDisplay();
}

// ---------------- CLEAR PAGE BUTTONS ----------------
function initClearPageButtons() {
  const clearButtons = document.querySelectorAll(".clear-page-btn");

  clearButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".page-section");
      if (!section) return;
      clearFieldsInElement(section);
    });
  });
}

function clearFieldsInElement(root) {
  if (!root) return;

  const inputs = root.querySelectorAll("input");
  const textareas = root.querySelectorAll("textarea");
  const selects = root.querySelectorAll("select");

  inputs.forEach((input) => {
    const type = input.type;
    if (type === "checkbox" || type === "radio") {
      input.checked = false;
    } else {
      input.value = "";
    }
  });

  textareas.forEach((ta) => {
    ta.value = "";
  });

  selects.forEach((sel) => {
    sel.selectedIndex = 0;
  });
}

// ---------------- CLEAR ALL (SIDEBAR BUTTON) ----------------
function initClearAllButton() {
  const btn = document.getElementById("clearAllBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const app = document.getElementById("app");
    if (!app) return;
    clearFieldsInElement(app);

    // Reset dealership display text after clearing
    const display = document.getElementById("dealershipNameDisplay");
    if (display) {
      display.textContent = "Dealership Name";
    }
  });
}

// ---------------- TABLE ADD-ROW BUTTONS ----------------
function initTableAddRowButtons() {
  const addButtons = document.querySelectorAll(".table-footer .add-row");

  addButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tableContainer = btn.closest(".table-container");
      if (!tableContainer) return;

      const table = tableContainer.querySelector("table");
      if (!table) return;

      const tbody = table.querySelector("tbody");
      if (!tbody) return;

      const lastRow = tbody.querySelector("tr:last-child");
      if (!lastRow) return;

      const newRow = lastRow.cloneNode(true);

      // Clear values in new row
      const inputs = newRow.querySelectorAll("input");
      const selects = newRow.querySelectorAll("select");
      const textareas = newRow.querySelectorAll("textarea");

      inputs.forEach((input) => {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });

      selects.forEach((sel) => {
        sel.selectedIndex = 0;
      });

      textareas.forEach((ta) => {
        ta.value = "";
      });

      tbody.appendChild(newRow);
    });
  });
}

// ---------------- ADDITIONAL POC MINI-CARD ADD ----------------
function initAdditionalPocCardAdd() {
  const container = document.getElementById("additionalPocContainer");
  if (!container) return;

  const templateCard = container.querySelector(".additional-poc-card");
  if (!templateCard) return;

  const addBtn = templateCard.querySelector(".additional-poc-add");
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    const newCard = templateCard.cloneNode(true);

    // Remove the + button on cloned cards
    const clonedAddBtn = newCard.querySelector(".additional-poc-add");
    if (clonedAddBtn) clonedAddBtn.remove();

    // Remove integrated-plus on cloned card so the first input has rounded right side
    const firstRow = newCard.querySelector(".checklist-row.integrated-plus");
    if (firstRow) {
      firstRow.classList.remove("integrated-plus");
    }

    // Clear all fields in the new card
    const fields = newCard.querySelectorAll("input, select, textarea");
    fields.forEach((el) => {
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else {
        el.value = "";
      }
      if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
      }
    });

    container.appendChild(newCard);
  });
}

// ---------------- SUPPORT TICKETS ----------------
function initSupportTickets() {
  const openContainer = document.getElementById("openTicketsContainer");
  const tierTwoContainer = document.getElementById("tierTwoTicketsContainer");
  const closedResolvedContainer = document.getElementById("closedResolvedTicketsContainer");
  const closedFeatureContainer = document.getElementById("closedFeatureTicketsContainer");

  if (!openContainer || !tierTwoContainer || !closedResolvedContainer || !closedFeatureContainer) {
    return;
  }

  const templateGroup = openContainer.querySelector(".ticket-group");
  if (!templateGroup) return;

  // Mark this as the permanent template card
  templateGroup.dataset.permanent = "true";

  const addBtn = templateGroup.querySelector(".add-row");
  if (!addBtn) return;

  // Wire up status select for the permanent template (special behavior)
  wireStatusListeners(templateGroup, true);

  // "+" button: create a brand new Open card under the template
  addBtn.addEventListener("click", () => {
    const newGroup = templateGroup.cloneNode(true);
    newGroup.dataset.permanent = "false";

    // Remove the + button from the cloned card
    const newAddBtn = newGroup.querySelector(".add-row");
    if (newAddBtn) {
      newAddBtn.remove();
    }

    // Remove integrated-plus layout so ticket number field is a normal full-width text box
    const integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
    if (integratedRow) {
      integratedRow.classList.remove("integrated-plus");
    }

    // Clear all fields in the new card
    clearTicketGroupFields(newGroup);

    // Ensure status is Open
    const statusSelect = newGroup.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.value = "Open";
    }

    // Append directly under the template in Open Tickets
    openContainer.appendChild(newGroup);

    // Wire up status change for the new (movable) card
    wireStatusListeners(newGroup, false);
  });

  // --- helpers ---

  function clearTicketGroupFields(group) {
    const inputs = group.querySelectorAll('input[type="text"], input[type="date"], textarea');
    const selects = group.querySelectorAll("select");

    inputs.forEach((inp) => {
      inp.value = "";
    });

    selects.forEach((sel) => {
      sel.selectedIndex = 0;
    });
  }

  function resetTemplateGroup(group) {
    clearTicketGroupFields(group);
    const statusSelect = group.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.value = "Open";
    }
  }

  /**
   * wireStatusListeners
   * @param {HTMLElement} group - the .ticket-group card
   * @param {boolean} isPermanent - true for the master template that should never move
   */
  function wireStatusListeners(group, isPermanent) {
    const statusSelects = group.querySelectorAll(".ticket-status-select");
    statusSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const value = select.value;
        const card = select.closest(".ticket-group");
        if (!card) return;

        // Permanent template:
        // When status changes away from Open:
        //  - clone current values into a new movable card
        //  - send that card to the right container
        //  - reset the template back to blank + Open
        if (isPermanent) {
          if (value === "Open") return;

          // Clone the filled-out template
          const newGroup = card.cloneNode(true);
          newGroup.dataset.permanent = "false";

          // Remove + button & integrated-plus layout from the new card
          const newAddBtn = newGroup.querySelector(".add-row");
          if (newAddBtn) {
            newAddBtn.remove();
          }
          const integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
          if (integratedRow) {
            integratedRow.classList.remove("integrated-plus");
          }

          // This new card keeps all field values, including the chosen status
          wireStatusListeners(newGroup, false);

          // Place new card into the appropriate container
          if (value === "Open") {
            openContainer.appendChild(newGroup);
          } else if (value === "Tier Two") {
            tierTwoContainer.appendChild(newGroup);
          } else if (value === "Closed - Resolved") {
            closedResolvedContainer.appendChild(newGroup);
          } else if (
            value === "Closed – Feature Not Supported" ||
            value === "Closed - Feature Not Supported"
          ) {
            closedFeatureContainer.appendChild(newGroup);
          } else {
            // Fallback: keep it under Open if some new value shows up
            openContainer.appendChild(newGroup);
          }

          // Reset the permanent template to blank + Open
          resetTemplateGroup(card);
          return;
        }

        // Movable cards: just move them between sections based on status
        if (value === "Open") {
          openContainer.appendChild(card);
        } else if (value === "Tier Two") {
          tierTwoContainer.appendChild(card);
        } else if (value === "Closed - Resolved") {
          closedResolvedContainer.appendChild(card);
        } else if (
          value === "Closed – Feature Not Supported" ||
          value === "Closed - Feature Not Supported"
        ) {
          closedFeatureContainer.appendChild(card);
        }
      });
    });
  }
}

// ---------------- PDF EXPORT ----------------
function initPDFExport() {
  const btn = document.getElementById("savePDF");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!window.jspdf) {
      alert("PDF library not loaded.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");

    // Simple approach: render the main content (all pages) into the PDF.
    // This won't be pixel perfect but will capture all sections for now.
    doc.html(document.body, {
      callback: function (doc) {
        doc.save("myKaarma_Training_Checklist.pdf");
      },
      x: 10,
      y: 10,
      margin: [10, 10, 10, 10],
      autoPaging: "text"
    });
  });
}
