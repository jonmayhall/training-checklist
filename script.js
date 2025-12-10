/* ==========================================================
   myKaarma Interactive Training Checklist – FULL JS
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();

  initAdditionalTrainers();
  initAdditionalPoc();
  initSupportTickets();
  initTrainingTableAddButtons();

  initDealershipAddressMap();
  initAddressAutocomplete();

  initPdfExport();
  initDmsCards();
});

/* -------------------------------------
   NAVIGATION
------------------------------------- */
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".page-section");

  if (!navButtons.length || !sections.length) return;

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;

      sections.forEach((sec) => {
        sec.classList.toggle("active", sec.id === targetId);
      });

      navButtons.forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
    });
  });
}

/* -------------------------------------
   CLEAR PAGE / CLEAR ALL
------------------------------------- */
function clearSection(section) {
  if (!section) return;

  const inputs = section.querySelectorAll("input, select, textarea");
  inputs.forEach((el) => {
    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else if (el.type === "checkbox" || el.type === "radio") {
      el.checked = false;
    } else {
      el.value = "";
    }
  });
}

function initClearPageButtons() {
  const buttons = document.querySelectorAll(".clear-page-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".page-section");
      clearSection(section);

      // keep top bar in sync if user clears Dealership Info page
      if (section && section.id === "dealership-info") {
        updateDealershipNameDisplay();
      }
    });
  });
}

function initClearAllButton() {
  const btn = document.getElementById("clearAllBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    document.querySelectorAll(".page-section").forEach(clearSection);
    updateDealershipNameDisplay();
  });
}

/* -------------------------------------
   DEALERSHIP NAME TOPBAR SYNC
------------------------------------- */
function initDealershipNameBinding() {
  const input = document.getElementById("dealershipNameInput");
  if (!input) return;

  input.addEventListener("input", updateDealershipNameDisplay);
  updateDealershipNameDisplay();
}

function updateDealershipNameDisplay() {
  const txt = document.getElementById("dealershipNameInput");
  const display = document.getElementById("dealershipNameDisplay");
  if (!display) return;

  const value = txt && txt.value ? txt.value.trim() : "";
  display.textContent = value || "Dealership Name";
}

/* -------------------------------------
   ADDITIONAL TRAINERS (PAGE 1)
------------------------------------- */
function initAdditionalTrainers() {
  const baseRow = document.querySelector(".additional-trainers-row");
  const container = document.getElementById("additionalTrainersContainer");

  if (!baseRow || !container) return;

  const addBtn = baseRow.querySelector(".add-row");
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    const newRow = document.createElement("div");
    newRow.className = "checklist-row indent-sub";

    const label = document.createElement("label");
    label.textContent = "Additional Trainer";
    label.style.flex = "0 0 36%";
    label.style.paddingRight = "12px";

    const input = document.createElement("input");
    input.type = "text";

    newRow.appendChild(label);
    newRow.appendChild(input);
    container.appendChild(newRow);
  });
}

/* -------------------------------------
   ADDITIONAL POC (PAGE 2 – DEALERSHIP INFO)
------------------------------------- */
function initAdditionalPoc() {
  const grid = document.getElementById("primaryContactsGrid");
  if (!grid) return;

  const template = grid.querySelector(".additional-poc-card");
  if (!template) return;

  const addBtn = template.querySelector(".additional-poc-add");
  if (!addBtn) return;

  function createNormalCard() {
    const card = document.createElement("div");
    card.className = "mini-card contact-card";

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

  addBtn.addEventListener("click", () => {
    grid.appendChild(createNormalCard());
  });
}

/* -------------------------------------
   SUPPORT TICKETS (PAGE 7)
------------------------------------- */
function initSupportTickets() {
  const openContainer = document.getElementById("openTicketsContainer");
  const tierTwoContainer = document.getElementById("tierTwoTicketsContainer");
  const closedResolvedContainer = document.getElementById("closedResolvedTicketsContainer");
  const closedFeatureContainer = document.getElementById("closedFeatureTicketsContainer");

  if (
    !openContainer ||
    !tierTwoContainer ||
    !closedResolvedContainer ||
    !closedFeatureContainer
  ) {
    return;
  }

  const baseCard = openContainer.querySelector('.ticket-group[data-base="true"]');
  if (!baseCard) return;

  const baseStatusSelect = baseCard.querySelector(".ticket-status-select");
  if (baseStatusSelect) {
    baseStatusSelect.value = "Open";
  }

  let ticketCounter = 0;

  function resetBaseCard() {
    const inputs = baseCard.querySelectorAll("input[type='text']");
    inputs.forEach((i) => {
      i.value = "";
    });

    const statusSelect = baseCard.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.value = "Open";
    }
  }

  function createTicketCardFromBase() {
    const card = baseCard.cloneNode(true);

    // cloned cards are not base cards
    card.removeAttribute("data-base");

    // make sure cloned card has no + button (only base card can add)
    const clonedAddBtn = card.querySelector(".add-ticket-btn");
    if (clonedAddBtn) {
      clonedAddBtn.remove();
    }

    // clear all text inputs
    card.querySelectorAll("input[type='text']").forEach((i) => {
      i.value = "";
    });

    // set status to Open by default
    const statusSelect = card.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.value = "Open";
    }

    // remove any existing badge and add a fresh one
    const oldBadge = card.querySelector(".ticket-badge");
    if (oldBadge) oldBadge.remove();

    ticketCounter += 1;
    const badge = document.createElement("div");
    badge.className = "ticket-badge";
    badge.textContent = `Ticket # ${ticketCounter}`;
    card.insertBefore(badge, card.firstChild);

    wireTicketStatus(card, false);
    return card;
  }

  function moveCardToContainer(card, status) {
    let target = openContainer;

    if (status === "Tier Two") {
      target = tierTwoContainer;
    } else if (status === "Closed - Resolved") {
      target = closedResolvedContainer;
    } else if (status === "Closed – Feature Not Supported") {
      target = closedFeatureContainer;
    }

    if (card.parentElement !== target) {
      target.appendChild(card);
    }
  }

  function wireTicketStatus(card, isBase) {
    const select = card.querySelector(".ticket-status-select");
    if (!select) return;

    select.addEventListener("change", () => {
      const status = select.value;

      if (isBase) {
        // base card never leaves Open – changing status creates a new card
        if (status === "Open") return;

        const newCard = createTicketCardFromBase();
        const newStatusSelect = newCard.querySelector(".ticket-status-select");
        if (newStatusSelect) {
          newStatusSelect.value = status;
        }

        moveCardToContainer(newCard, status);
        resetBaseCard();
        if (baseStatusSelect) {
          baseStatusSelect.value = "Open";
        }
      } else {
        moveCardToContainer(card, status);
      }
    });
  }

  // Add button on base card (only one)
  const addBtn = baseCard.querySelector(".add-ticket-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const newCard = createTicketCardFromBase();
      openContainer.appendChild(newCard);
    });
  }

  // wire base card
  wireTicketStatus(baseCard, true);
}

/* -------------------------------------
   TABLE ADD-ROW BUTTONS
------------------------------------- */
function initTrainingTableAddButtons() {
  const addButtons = document.querySelectorAll(".table-footer .add-row");
  if (!addButtons.length) return;

  addButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const footer = btn.closest(".table-footer");
      if (!footer) return;

      const wrapper = footer.previousElementSibling;
      if (!wrapper) return;

      const table = wrapper.querySelector("table");
      if (!table) return;

      const tbody = table.querySelector("tbody") || table.createTBody();
      const lastRow = tbody.lastElementChild;
      if (!lastRow) return;

      const clone = lastRow.cloneNode(true);
      clone.querySelectorAll("input, select").forEach((el) => {
        if (el.tagName === "SELECT") {
          el.selectedIndex = 0;
        } else {
          el.value = "";
        }
      });

      tbody.appendChild(clone);
    });
  });
}

/* -------------------------------------
   DEALERSHIP ADDRESS – MAP EMBED
------------------------------------- */
function initDealershipAddressMap() {
  const addressInput = document.getElementById("dealershipAddressInput");
  const mapFrame = document.getElementById("dealershipMapFrame");
  const mapButton = document.getElementById("openAddressInMapsBtn");

  if (!addressInput || !mapFrame) return;

  function updateMap() {
    const value = addressInput.value.trim();
    if (!value) {
      mapFrame.src = "";
      return;
    }
    const encoded = encodeURIComponent(value);
    mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
  }

  // Enter key – update map
  addressInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateMap();
    }
  });

  // Blur – also update map
  addressInput.addEventListener("blur", () => {
    updateMap();
  });

  // "Map" button – open Google Maps + update embed
  if (mapButton && mapButton.dataset.bound !== "true") {
    mapButton.dataset.bound = "true";
    mapButton.addEventListener("click", () => {
      const value = addressInput.value.trim();
      if (!value) return;

      const encoded = encodeURIComponent(value);
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        "_blank"
      );

      mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    });
  }
}

/* -------------------------------------
   GOOGLE PLACES AUTOCOMPLETE – ADDRESS
------------------------------------- */
function initAddressAutocomplete() {
  const addressInput = document.getElementById("dealershipAddressInput");
  const mapFrame = document.getElementById("dealershipMapFrame");
  if (!addressInput) return;

  // If Places is already there (page re-visit), attach immediately
  if (window.google && google.maps && google.maps.places) {
    attachAutocomplete();
    return;
  }

  // Load Google Maps JS + Places library
  const script = document.createElement("script");
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=AIzaSyDU60-nQCusNisxhqSp-6vDow5meFKUaOA&libraries=places&callback=attachAutocomplete";
  script.async = true;
  document.head.appendChild(script);

  // global callback for the script
  window.attachAutocomplete = function () {
    if (!window.google || !google.maps || !google.maps.places) return;

    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
      types: ["geocode"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place || !place.formatted_address) return;

      // put full address into the field
      addressInput.value = place.formatted_address;

      // and update the embedded map
      if (mapFrame) {
        const encoded = encodeURIComponent(place.formatted_address);
        mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
      }
    });
  };
}

/* -------------------------------------
   PDF EXPORT (SUMMARY PAGE)
------------------------------------- */
function initPdfExport() {
  const btn = document.getElementById("savePDF");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF library not loaded.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");

      doc.html(document.body, {
        callback: (instance) => instance.save("myKaarma_Training_Checklist.pdf"),
        margin: [20, 20, 20, 20],
        html2canvas: { scale: 0.6 },
      });
  });
}

/* -------------------------------------
   DMS CARDS (placeholder for future logic)
------------------------------------- */
function initDmsCards() {
  // reserved for any future interactive DMS card behavior
}
