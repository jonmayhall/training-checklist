// =====================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Clear, Additional Trainers, Additional POC, Tickets, PDF
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupClearAll();
  setupPageClearButtons();
  setupAdditionalTrainers();
  setupAdditionalPocCloning();
  setupSupportTickets();
  setupTableAddRowButtons();
  setupPdfExport();
});

/* ---------------- NAVIGATION ---------------- */
function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".page-section");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      if (!targetId) return;

      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });
    });
  });
}

/* ---------------- CLEAR ALL ---------------- */
function clearFields(root) {
  const inputs = root.querySelectorAll("input");
  const selects = root.querySelectorAll("select");
  const textareas = root.querySelectorAll("textarea");

  inputs.forEach(input => {
    if (input.type === "checkbox" || input.type === "radio") {
      input.checked = false;
    } else {
      input.value = "";
    }
  });

  selects.forEach(sel => {
    sel.selectedIndex = 0;
  });

  textareas.forEach(t => {
    t.value = "";
  });
}

function setupClearAll() {
  const clearAllBtn = document.getElementById("clearAllBtn");
  if (!clearAllBtn) return;

  clearAllBtn.addEventListener("click", () => {
    clearFields(document);
  });
}

/* ---------------- PER-PAGE RESET ---------------- */
function setupPageClearButtons() {
  const buttons = document.querySelectorAll(".clear-page-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".page-section");
      if (!section) return;

      clearFields(section);
    });
  });
}

/* ---------------- ADDITIONAL TRAINERS (Page 1) ---------------- */
/* 
   Behavior:
   - Integrated "+" row: label + textbox + plus
   - On first click:
     • remove the + button
     • keep the first textbox normal
     • add one extra textbox row directly below
*/
function setupAdditionalTrainers() {
  const row = document.querySelector(".additional-trainers-row");
  if (!row) return;

  const addBtn = row.querySelector(".add-row");
  const container = document.getElementById("additionalTrainersContainer");
  const input = row.querySelector("input[type='text']");

  if (!addBtn || !container || !input) return;

  addBtn.addEventListener(
    "click",
    () => {
      // Remove the "+" and integrated style from the original row
      addBtn.remove();
      row.classList.remove("integrated-plus");
      input.style.flex = "0 0 var(--input-width)";
      input.style.width = "var(--input-width)";

      // Create a new row immediately below
      const extraRow = document.createElement("div");
      extraRow.className = "checklist-row indent-sub";

      const extraLabel = document.createElement("label");
      extraLabel.textContent = "Additional trainer";

      const extraInput = document.createElement("input");
      extraInput.type = "text";

      extraRow.appendChild(extraLabel);
      extraRow.appendChild(extraInput);
      container.appendChild(extraRow);
    },
    { once: true }
  );
}

/* ---------------- ADDITIONAL POC CLONING (Page 2) ---------------- */
/*
   - Template Additional POC card lives in Primary Contacts grid.
   - Clicking "+":
     • Clones the template card
     • Clears its inputs
     • Removes the "+" button in the clone
     • Leaves template as the last card, so 2xN grid pattern is preserved
*/
function setupAdditionalPocCloning() {
  const grid = document.getElementById("primaryContactsGrid");
  if (!grid) return;

  const template = grid.querySelector(".additional-poc-card");
  if (!template) return;

  const addBtn = template.querySelector(".additional-poc-add");
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    const clone = template.cloneNode(true);

    // Clear values in clone
    clone.querySelectorAll("input").forEach(input => {
      input.value = "";
    });

    // Mark as cloned (for CSS if needed)
    clone.classList.add("cloned");

    // Remove the "+" button & integrated-plus styling
    const nameRow = clone.querySelector(".checklist-row.integrated-plus");
    if (nameRow) {
      nameRow.classList.remove("integrated-plus");
    }
    const cloneAdd = clone.querySelector(".additional-poc-add");
    if (cloneAdd) {
      cloneAdd.remove();
    }

    // Insert clone BEFORE template so template stays last in the grid
    grid.insertBefore(clone, template);
  });
}

/* ---------------- SUPPORT TICKETS (Page 7) ---------------- */
/*
  - One template ticket in "Open Support Tickets" with + in Ticket # row.
  - Clicking +:
    • Create a new ticket card in Open section (no + button)
    • Status dropdown moves card between Open / Tier Two / Closed groups
*/
function setupSupportTickets() {
  const openContainer = document.getElementById("openTicketsContainer");
  if (!openContainer) return;

  const template = openContainer.querySelector(".ticket-group-template");
  if (!template) return;

  const tierTwoContainer = document.getElementById("tierTwoTicketsContainer");
  const closedResolvedContainer = document.getElementById("closedResolvedTicketsContainer");
  const closedFeatureContainer = document.getElementById("closedFeatureTicketsContainer");

  function moveTicketToBucket(group, status) {
    if (!group) return;
    switch (status) {
      case "Tier Two":
        if (tierTwoContainer) tierTwoContainer.appendChild(group);
        break;
      case "Closed - Resolved":
        if (closedResolvedContainer) closedResolvedContainer.appendChild(group);
        break;
      case "Closed – Feature Not Supported":
        if (closedFeatureContainer) closedFeatureContainer.appendChild(group);
        break;
      default:
        openContainer.appendChild(group);
        break;
    }
  }

  function wireTicketGroup(group, isTemplate) {
    const statusSelect = group.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.addEventListener("change", () => {
        moveTicketToBucket(group, statusSelect.value);
      });
    }

    if (isTemplate) {
      const addTicketBtn = group.querySelector(".add-ticket-btn");
      if (!addTicketBtn) return;

      addTicketBtn.addEventListener("click", () => {
        const clone = group.cloneNode(true);
        clone.classList.remove("ticket-group-template");
        clone.dataset.template = "false";

        // Clear inputs in clone
        clone.querySelectorAll("input").forEach(input => {
          input.value = "";
        });

        // Reset status to Open
        const sel = clone.querySelector(".ticket-status-select");
        if (sel) sel.value = "Open";

        // Remove the + button from clone
        const cloneAddBtn = clone.querySelector(".add-ticket-btn");
        if (cloneAddBtn) cloneAddBtn.remove();

        // Wire up status change handling
        wireTicketGroup(clone, false);

        // Insert new ticket before template, so template stays last
        openContainer.insertBefore(clone, group);
      });
    }
  }

  wireTicketGroup(template, true);
}

/* ---------------- TABLE "+" BUTTONS (Training tables) ---------------- */
/*
  Generic handler:
  - Any .table-footer .add-row duplicates the last row in that table body
  - Clears inputs/selects in the new row
*/
function setupTableAddRowButtons() {
  const addButtons = document.querySelectorAll(".table-footer .add-row");

  addButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const footer = btn.closest(".table-footer");
      if (!footer) return;
      const container = footer.closest(".table-container");
      if (!container) return;
      const table = container.querySelector("table");
      if (!table) return;

      const tbody = table.querySelector("tbody");
      if (!tbody || !tbody.lastElementChild) return;

      const lastRow = tbody.lastElementChild;
      const newRow = lastRow.cloneNode(true);

      // Clear values in the cloned row
      newRow.querySelectorAll("input").forEach(input => {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });
      newRow.querySelectorAll("select").forEach(select => {
        select.selectedIndex = 0;
      });

      tbody.appendChild(newRow);
    });
  });
}

/* ---------------- PDF EXPORT (Page 10) ---------------- */
function setupPdfExport() {
  const btn = document.getElementById("savePDF");
  if (!btn || !window.jspdf) return;

  btn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");

    // Simple export: capture visible text as a basic record.
    // (You can customize layout later as needed.)
    const textLines = [];
    const inputs = document.querySelectorAll("input, select, textarea");
    inputs.forEach(el => {
      const id = el.id || "";
      const labelEl = el.closest(".checklist-row")?.querySelector("label");
      const labelText = labelEl ? labelEl.textContent.trim() : "";
      const value =
        el.tagName.toLowerCase() === "select"
          ? el.value
          : el.type === "checkbox"
          ? (el.checked ? "Yes" : "No")
          : el.value;

      if (labelText || value) {
        textLines.push(`${labelText}: ${value}`);
      }
    });

    let y = 40;
    doc.setFontSize(10);
    textLines.forEach(line => {
      if (y > 780) {
        doc.addPage();
        y = 40;
      }
      doc.text(line.substring(0, 110), 40, y);
      y += 14;
    });

    doc.save("myKaarma_Training_Checklist.pdf");
  });
}
