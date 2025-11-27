// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// - Sidebar nav
// - Dealership name mirror
// - Clear page / Clear all
// - Add row for all tables
// - Support Tickets logic (permanent template card + moves)
// - Additional Contacts (Additional POC cards)
// - Simple PDF export for all pages
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initDealershipNameBinding();
  initClearPageButtons();
  initClearAllButton();
  initTableAddRowButtons();
  initSupportTickets();
  initAdditionalContacts();   // handles Additional Point of Contact cards
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

      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

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

  templateGroup.dataset.permanent = "true";

  const addBtn = templateGroup.querySelector(".add-row");
  if (!addBtn) return;

  wireStatusListeners(templateGroup, true);

  addBtn.addEventListener("click", () => {
    const newGroup = templateGroup.cloneNode(true);
    newGroup.dataset.permanent = "false";

    const newAddBtn = newGroup.querySelector(".add-row");
    if (newAddBtn) {
      newAddBtn.remove();
    }

    const integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
    if (integratedRow) {
      integratedRow.classList.remove("integrated-plus");
    }

    clearTicketGroupFields(newGroup);

    const statusSelect = newGroup.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.value = "Open";
    }

    openContainer.appendChild(newGroup);
    wireStatusListeners(newGroup, false);
  });

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

  function wireStatusListeners(group, isPermanent) {
    const statusSelects = group.querySelectorAll(".ticket-status-select");
    statusSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const value = select.value;
        const card = select.closest(".ticket-group");
        if (!card) return;

        if (isPermanent) {
          if (value === "Open") return;

          const newGroup = card.cloneNode(true);
          newGroup.dataset.permanent = "false";

          const newAddBtn = newGroup.querySelector(".add-row");
          if (newAddBtn) {
            newAddBtn.remove();
          }
          const integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
          if (integratedRow) {
            integratedRow.classList.remove("integrated-plus");
          }

          wireStatusListeners(newGroup, false);

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
            openContainer.appendChild(newGroup);
          }

          resetTemplateGroup(card);
          return;
        }

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

// ---------------- ADDITIONAL CONTACTS (Additional POC) ----------------
function initAdditionalContacts() {
  const container = document.getElementById("additionalPocCardsContainer");
  if (!container) return;

  const template = container.querySelector(".additional-poc-template");
  if (!template) return;

  const addBtn = template.querySelector(".add-additional-poc");
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    const newCard = template.cloneNode(true);

    const cloneAddBtn = newCard.querySelector(".add-additional-poc");
    if (cloneAddBtn) {
      cloneAddBtn.remove();
    }

    const firstRow = newCard.querySelector(".checklist-row.integrated-plus");
    if (firstRow) {
      firstRow.classList.remove("integrated-plus");
    }

    newCard.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });

    container.appendChild(newCard);
  });
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
