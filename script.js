// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// - Sidebar nav
// - Dealership name mirror
// - Clear page / Clear all
// - Add row for all tables
// - Support Tickets logic (permanent template card + moves)
// - Additional Trainers dynamic row (fully rounded fields)
// - Simple PDF export for all pages
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initDealershipNameBinding();
  initClearPageButtons();
  initClearAllButton();
  initTableAddRowButtons();
  initSupportTickets();
  initAdditionalTrainersDynamicRow();  // ⭐ NEW BEHAVIOR
  initPDFExport();
});

// ---------------- NAVIGATION ----------------
function initNav() {
  const navButtons = document.querySelectorAll("#sidebar-nav .nav-btn");
  const sections = document.querySelectorAll(".page-section");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      let targetSection = document.getElementById(target);

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
  const inputs = root.querySelectorAll("input");
  const textareas = root.querySelectorAll("textarea");
  const selects = root.querySelectorAll("select");

  inputs.forEach((input) => {
    if (input.type === "checkbox" || input.type === "radio") {
      input.checked = false;
    } else {
      input.value = "";
    }
  });

  textareas.forEach((ta) => (ta.value = ""));
  selects.forEach((sel) => (sel.selectedIndex = 0));
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
    if (display) display.textContent = "Dealership Name";
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

      inputs.forEach((input) =>
        input.type === "checkbox" ? (input.checked = false) : (input.value = "")
      );
      selects.forEach((sel) => (sel.selectedIndex = 0));
      textareas.forEach((ta) => (ta.value = ""));

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

  if (!openContainer || !tierTwoContainer || !closedResolvedContainer || !closedFeatureContainer)
    return;

  const templateGroup = openContainer.querySelector(".ticket-group");
  if (!templateGroup) return;

  templateGroup.dataset.permanent = "true";
  const addBtn = templateGroup.querySelector(".add-row");

  wireStatusListeners(templateGroup, true);

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const newGroup = templateGroup.cloneNode(true);
      newGroup.dataset.permanent = "false";

      const newAddBtn = newGroup.querySelector(".add-row");
      if (newAddBtn) newAddBtn.remove();

      const integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
      if (integratedRow) integratedRow.classList.remove("integrated-plus");

      clearTicketGroupFields(newGroup);

      const statusSelect = newGroup.querySelector(".ticket-status-select");
      if (statusSelect) statusSelect.value = "Open";

      openContainer.appendChild(newGroup);
      wireStatusListeners(newGroup, false);
    });
  }

  function clearTicketGroupFields(group) {
    const inputs = group.querySelectorAll('input[type="text"], input[type="date"], textarea');
    const selects = group.querySelectorAll("select");

    inputs.forEach((inp) => (inp.value = ""));
    selects.forEach((sel) => (sel.selectedIndex = 0));
  }

  function resetTemplateGroup(group) {
    clearTicketGroupFields(group);
    const statusSelect = group.querySelector(".ticket-status-select");
    if (statusSelect) statusSelect.value = "Open";
  }

  function wireStatusListeners(group, isPermanent) {
    const selects = group.querySelectorAll(".ticket-status-select");

    selects.forEach((select) => {
      select.addEventListener("change", () => {
        const value = select.value;
        const card = select.closest(".ticket-group");
        if (!card) return;

        if (isPermanent) {
          if (value === "Open") return;

          const newGroup = card.cloneNode(true);
          newGroup.dataset.permanent = "false";

          const newAddBtn = newGroup.querySelector(".add-row");
          if (newAddBtn) newAddBtn.remove();

          const integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
          if (integratedRow) integratedRow.classList.remove("integrated-plus");

          wireStatusListeners(newGroup, false);

          if (value === "Tier Two") tierTwoContainer.appendChild(newGroup);
          else if (value === "Closed - Resolved") closedResolvedContainer.appendChild(newGroup);
          else if (value.includes("Feature")) closedFeatureContainer.appendChild(newGroup);
          else openContainer.appendChild(newGroup);

          resetTemplateGroup(card);
          return;
        }

        if (value === "Open") openContainer.appendChild(card);
        else if (value === "Tier Two") tierTwoContainer.appendChild(card);
        else if (value === "Closed - Resolved") closedResolvedContainer.appendChild(card);
        else if (value.includes("Feature")) closedFeatureContainer.appendChild(card);
      });
    });
  }
}

// ---------------- ADDITIONAL TRAINERS DYNAMIC ROW ----------------
function initAdditionalTrainersDynamicRow() {
  const row = document.querySelector(".additional-trainers-row");
  if (!row) return;

  const addBtn = row.querySelector(".add-row");
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    const section = row.closest(".section-block") || row.parentElement;
    if (!section) return;

    const newRow = row.cloneNode(true);

    // Remove + button on cloned rows
    const clonedBtn = newRow.querySelector(".add-row");
    if (clonedBtn) clonedBtn.remove();

    // ⭐ FIX: remove integrated-plus so text boxes become full, rounded, proper width
    newRow.classList.remove("integrated-plus");

    // Clear input + remove duplicate IDs/names
    const input = newRow.querySelector("input[type='text']");
    if (input) {
      input.value = "";
      input.id = "";
      input.name = "";
    }

    newRow.id = "";

    section.insertBefore(newRow, row.nextSibling);
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
      callback: (doc) => {
        doc.save("myKaarma_Training_Checklist.pdf");
      },
      x: 10,
      y: 10,
      margin: [10, 10, 10, 10],
      autoPaging: "text",
    });
  });
}
