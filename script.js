// =======================================================
// myKaarma Interactive Training Checklist – FULL JS (Safe)
// =======================================================

document.addEventListener("DOMContentLoaded", function () {
  try {
    initNav();
    initDealershipNameBinding();
    initClearPageButtons();
    initClearAllButton();
    initTableAddRowButtons();
    initSupportTickets();
    initAdditionalTrainersDynamicRow();
    initPDFExport();
  } catch (e) {
    console.error("Initialization error:", e);
  }
});

// ---------------- NAVIGATION ----------------
function initNav() {
  var navButtons = document.querySelectorAll("#sidebar-nav .nav-btn");
  var sections = document.querySelectorAll(".page-section");

  if (!navButtons.length || !sections.length) return;

  function findSectionForTarget(targetId) {
    if (!targetId) return null;

    // 1) Direct match
    var sec = document.getElementById(targetId);
    if (sec) return sec;

    // 2) Known aliases / fallbacks
    if (targetId === "onsite-trainers") {
      sec = document.getElementById("trainers-page");
      if (sec) return sec;
    }

    // Page 2 common mismatch: dealership-info vs dealership-info-page
    if (targetId === "dealership-info") {
      sec = document.getElementById("dealership-info-page");
      if (sec) return sec;
    }
    if (targetId === "dealership-info-page") {
      sec = document.getElementById("dealership-info");
      if (sec) return sec;
    }

    // Page 3: pretraining vs pretraining-page (in case we ever mismatched)
    if (targetId === "pretraining") {
      sec = document.getElementById("pretraining-page");
      if (sec) return sec;
    }
    if (targetId === "pretraining-page") {
      sec = document.getElementById("pretraining");
      if (sec) return sec;
    }

    // Page 4: monday-visit vs monday-visit-page (future proof)
    if (targetId === "monday-visit") {
      sec = document.getElementById("monday-visit-page");
      if (sec) return sec;
    }
    if (targetId === "monday-visit-page") {
      sec = document.getElementById("monday-visit");
      if (sec) return sec;
    }

    return null;
  }

  function showSection(targetId) {
    var targetSection = findSectionForTarget(targetId);
    if (!targetSection) return;

    // Deactivate everything
    for (var i = 0; i < navButtons.length; i++) {
      navButtons[i].classList.remove("active");
    }
    for (var j = 0; j < sections.length; j++) {
      sections[j].classList.remove("active");
    }

    // Activate the target section
    targetSection.classList.add("active");
  }

  for (var i = 0; i < navButtons.length; i++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-target");
        showSection(target);
        btn.classList.add("active");
      });
    })(navButtons[i]);
  }
}

// ---------------- DEALERSHIP NAME MIRROR ----------------
function initDealershipNameBinding() {
  var input = document.getElementById("dealershipNameInput");
  var display = document.getElementById("dealershipNameDisplay");

  if (!input || !display) return;

  function updateDisplay() {
    var val = (input.value || "").trim();
    display.textContent = val || "Dealership Name";
  }

  input.addEventListener("input", updateDisplay);
  updateDisplay();
}

// ---------------- CLEAR PAGE BUTTONS ----------------
function initClearPageButtons() {
  var clearButtons = document.querySelectorAll(".clear-page-btn");

  for (var i = 0; i < clearButtons.length; i++) {
    clearButtons[i].addEventListener("click", function () {
      var section = this.closest(".page-section");
      if (!section) return;
      clearFieldsInElement(section);
    });
  }
}

function clearFieldsInElement(root) {
  if (!root) return;

  var inputs = root.querySelectorAll("input");
  var textareas = root.querySelectorAll("textarea");
  var selects = root.querySelectorAll("select");

  for (var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    if (input.type === "checkbox" || input.type === "radio") {
      input.checked = false;
    } else {
      input.value = "";
    }
  }

  for (var j = 0; j < textareas.length; j++) {
    textareas[j].value = "";
  }

  for (var k = 0; k < selects.length; k++) {
    selects[k].selectedIndex = 0;
  }
}

// ---------------- CLEAR ALL (SIDEBAR BUTTON) ----------------
function initClearAllButton() {
  var btn = document.getElementById("clearAllBtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var app = document.getElementById("app");
    if (!app) return;

    clearFieldsInElement(app);

    var display = document.getElementById("dealershipNameDisplay");
    if (display) display.textContent = "Dealership Name";
  });
}

// ---------------- TABLE ADD-ROW BUTTONS ----------------
function initTableAddRowButtons() {
  var addButtons = document.querySelectorAll(".table-footer .add-row");

  for (var i = 0; i < addButtons.length; i++) {
    addButtons[i].addEventListener("click", function () {
      var tableContainer = this.closest(".table-container");
      if (!tableContainer) return;

      var table = tableContainer.querySelector("table");
      if (!table) return;

      var tbody = table.querySelector("tbody");
      if (!tbody) return;

      var lastRow = tbody.querySelector("tr:last-child");
      if (!lastRow) return;

      var newRow = lastRow.cloneNode(true);

      var inputs = newRow.querySelectorAll("input");
      var selects = newRow.querySelectorAll("select");
      var textareas = newRow.querySelectorAll("textarea");

      for (var a = 0; a < inputs.length; a++) {
        if (inputs[a].type === "checkbox" || inputs[a].type === "radio") {
          inputs[a].checked = false;
        } else {
          inputs[a].value = "";
        }
      }

      for (var b = 0; b < selects.length; b++) {
        selects[b].selectedIndex = 0;
      }

      for (var c = 0; c < textareas.length; c++) {
        textareas[c].value = "";
      }

      tbody.appendChild(newRow);
    });
  }
}

// ---------------- SUPPORT TICKETS ----------------
function initSupportTickets() {
  var openContainer = document.getElementById("openTicketsContainer");
  var tierTwoContainer = document.getElementById("tierTwoTicketsContainer");
  var closedResolvedContainer = document.getElementById("closedResolvedTicketsContainer");
  var closedFeatureContainer = document.getElementById("closedFeatureTicketsContainer");

  if (!openContainer || !tierTwoContainer || !closedResolvedContainer || !closedFeatureContainer) {
    return;
  }

  var templateGroup = openContainer.querySelector(".ticket-group");
  if (!templateGroup) return;

  templateGroup.setAttribute("data-permanent", "true");

  var addBtn = templateGroup.querySelector(".add-row");

  wireStatusListeners(templateGroup, true);

  if (addBtn) {
    addBtn.addEventListener("click", function () {
      var newGroup = templateGroup.cloneNode(true);
      newGroup.setAttribute("data-permanent", "false");

      var newAddBtn = newGroup.querySelector(".add-row");
      if (newAddBtn) {
        newAddBtn.parentNode.removeChild(newAddBtn);
      }

      var integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
      if (integratedRow) {
        integratedRow.classList.remove("integrated-plus");
      }

      clearTicketGroupFields(newGroup);

      var statusSelect = newGroup.querySelector(".ticket-status-select");
      if (statusSelect) {
        statusSelect.value = "Open";
      }

      openContainer.appendChild(newGroup);

      wireStatusListeners(newGroup, false);
    });
  }

  function clearTicketGroupFields(group) {
    var inputs = group.querySelectorAll('input[type="text"], input[type="date"], textarea');
    var selects = group.querySelectorAll("select");

    for (var i = 0; i < inputs.length; i++) {
      inputs[i].value = "";
    }
    for (var j = 0; j < selects.length; j++) {
      selects[j].selectedIndex = 0;
    }
  }

  function resetTemplateGroup(group) {
    clearTicketGroupFields(group);
    var statusSelect = group.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.value = "Open";
    }
  }

  function wireStatusListeners(group, isPermanent) {
    var statusSelects = group.querySelectorAll(".ticket-status-select");

    for (var i = 0; i < statusSelects.length; i++) {
      (function (select) {
        select.addEventListener("change", function () {
          var value = select.value;
          var card = select.closest(".ticket-group");
          if (!card) return;

          if (isPermanent) {
            if (value === "Open") return;

            var newGroup = card.cloneNode(true);
            newGroup.setAttribute("data-permanent", "false");

            var newAddBtn = newGroup.querySelector(".add-row");
            if (newAddBtn) {
              newAddBtn.parentNode.removeChild(newAddBtn);
            }

            var integratedRow = newGroup.querySelector(".checklist-row.integrated-plus");
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
          } else {
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
          }
        });
      })(statusSelects[i]);
    }
  }
}

// ---------------- ADDITIONAL TRAINERS DYNAMIC ROW ----------------
function initAdditionalTrainersDynamicRow() {
  var row = document.querySelector(".additional-trainers-row");

  if (!row) {
    var allRows = document.querySelectorAll("#trainers-page .checklist-row");
    for (var i = 0; i < allRows.length; i++) {
      var label = allRows[i].querySelector("label");
      if (label && label.textContent.trim().indexOf("Additional Trainers") === 0) {
        row = allRows[i];
        break;
      }
    }
  }

  if (!row) return;

  var addBtn = row.querySelector(".add-row");
  if (!addBtn) return;

  addBtn.addEventListener("click", function () {
    var section = row.closest(".section-block");
    if (!section) return;

    var newRow = row.cloneNode(true);

    var clonedBtn = newRow.querySelector(".add-row");
    if (clonedBtn) {
      clonedBtn.parentNode.removeChild(clonedBtn);
    }

    newRow.classList.remove("integrated-plus");

    var input = newRow.querySelector("input[type='text']");
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
  var btn = document.getElementById("savePDF");
  if (!btn) return;

  btn.addEventListener("click", function () {
    if (!window.jspdf) {
      alert("PDF library not loaded.");
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF("p", "pt", "a4");

    doc.html(document.body, {
      callback: function (docInst) {
        docInst.save("myKaarma_Training_Checklist.pdf");
      },
      x: 10,
      y: 10,
      margin: [10, 10, 10, 10],
      autoPaging: "text"
    });
  });
}
