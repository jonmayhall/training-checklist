/* ============================================================
   myKaarma Interactive Training Checklist - script.js
   Single initialization guard so we never double-bind events
   ============================================================ */
if (!window.__MK_APP_INITIALIZED__) {
  window.__MK_APP_INITIALIZED__ = true;

  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initPageClearButtons();
    initGlobalClearAll();
    initTableAddRows();
    initIntegratedPlusRows();
    initAdditionalPOC();
    initSupportTickets();
    initMapButton(); // click handler for MAP button
  });

  /* ========================= NAVIGATION ========================= */
  function initNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn[data-target]");
    const sections = document.querySelectorAll(".page-section");

    if (!navButtons.length || !sections.length) return;

    function showSection(targetId) {
      sections.forEach(sec => {
        sec.classList.toggle("active", sec.id === targetId);
      });
      navButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.target === targetId);
      });
    }

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        if (target) showSection(target);
      });
    });

    // Show the first section by default, if none active
    const firstSection = document.querySelector(".page-section");
    if (firstSection && !document.querySelector(".page-section.active")) {
      showSection(firstSection.id);
    }
  }

  /* ========================= PAGE RESET BUTTONS ========================= */
  function initPageClearButtons() {
    const clearBtns = document.querySelectorAll(".clear-page-btn");

    clearBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const section = btn.closest(".page-section");
        if (!section) return;
        clearSectionInputs(section);
      });
    });
  }

  function clearSectionInputs(root) {
    const inputs = root.querySelectorAll("input, select, textarea");
    inputs.forEach(el => {
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else if (el.tagName.toLowerCase() === "select") {
        el.selectedIndex = 0;
      } else {
        el.value = "";
      }
    });
  }

  /* ========================= CLEAR ALL PAGES ========================= */
  function initGlobalClearAll() {
    const btn = document.getElementById("clearAllBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const sections = document.querySelectorAll(".page-section");
      sections.forEach(clearSectionInputs);
    });
  }

  /* ========================= TABLE ADD ROWS ========================= */
  function initTableAddRows() {
    // For each table footer "+" button, clone the last tbody row
    const addButtons = document.querySelectorAll(".table-footer .add-row");
    addButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const table = btn.closest(".table-container")?.querySelector(".training-table");
        if (!table) return;
        const tbody = table.querySelector("tbody");
        if (!tbody || !tbody.rows.length) return;

        const lastRow = tbody.rows[tbody.rows.length - 1];
        const newRow = lastRow.cloneNode(true);

        // Clear text/select/checkbox values in cloned row
        newRow.querySelectorAll("input, select").forEach(el => {
          if (el.type === "checkbox" || el.type === "radio") {
            el.checked = false;
          } else if (el.tagName.toLowerCase() === "select") {
            el.selectedIndex = 0;
          } else {
            el.value = "";
          }
        });

        tbody.appendChild(newRow);
      });
    });
  }

  /* ========================= GENERIC INTEGRATED PLUS ROWS ========================= */
  function initIntegratedPlusRows() {
    // Handles rows like "Additional Trainer", etc.
    const plusButtons = document.querySelectorAll(
      ".checklist-row.integrated-plus > .add-row"
    );

    plusButtons.forEach(btn => {
      // Skip Additional POC – handled in initAdditionalPOC()
      if (btn.classList.contains("additional-poc-add")) return;

      btn.addEventListener("click", () => {
        const row = btn.closest(".checklist-row.integrated-plus");
        if (!row) return;

        const parentBlock = row.parentElement;
        const newRow = row.cloneNode(true);

        // Clear text inputs in the cloned row
        newRow.querySelectorAll("input[type='text'], input[type='tel'], input[type='email']").forEach(i => {
          i.value = "";
        });

        parentBlock.insertBefore(newRow, row.nextSibling);
      });
    });
  }

  /* ========================= ADDITIONAL POC CARD CLONE ========================= */
  function initAdditionalPOC() {
    const grid = document.getElementById("primaryContactsGrid");
    if (!grid) return;

    const templateCard = grid.querySelector(".additional-poc-card");
    if (!templateCard) return;

    const addBtn = templateCard.querySelector(".additional-poc-add");
    if (!addBtn) return;

    addBtn.addEventListener("click", () => {
      const newCard = templateCard.cloneNode(true);

      // Clear all inputs in new card
      newCard.querySelectorAll("input").forEach(i => (i.value = ""));

      // Re-wire the + button in the new card to clone again
      const newAddBtn = newCard.querySelector(".additional-poc-add");
      if (newAddBtn) {
        newAddBtn.addEventListener("click", (e) => {
          e.preventDefault();
          // Delegate to original init logic by cloning template again
          const anotherCard = templateCard.cloneNode(true);
          anotherCard.querySelectorAll("input").forEach(i => (i.value = ""));
          const anotherAdd = anotherCard.querySelector(".additional-poc-add");
          if (anotherAdd) {
            // simple recursion: clicking new + should add more cards
            anotherAdd.addEventListener("click", (e2) => {
              e2.preventDefault();
              const more = templateCard.cloneNode(true);
              more.querySelectorAll("input").forEach(i => (i.value = ""));
              grid.appendChild(more);
            });
          }
          grid.appendChild(anotherCard);
        });
      }

      grid.appendChild(newCard);
    });
  }

  /* ========================= SUPPORT TICKETS ========================= */
  function initSupportTickets() {
    const openContainer = document.getElementById("openTicketsContainer");
    const tierTwoContainer = document.getElementById("tierTwoTicketsContainer");
    const closedResolvedContainer = document.getElementById("closedResolvedTicketsContainer");
    const closedFeatureContainer = document.getElementById("closedFeatureTicketsContainer");

    if (!openContainer) return;

    const baseCard = openContainer.querySelector(".ticket-group[data-base='true']");
    if (!baseCard) return;

    const addBtn = baseCard.querySelector(".add-ticket-btn");
    let ticketCounter = 0;

    function moveCard(card, status) {
      if (!card) return;

      switch (status) {
        case "Tier Two":
          tierTwoContainer?.appendChild(card);
          break;
        case "Closed - Resolved":
          closedResolvedContainer?.appendChild(card);
          break;
        case "Closed – Feature Not Supported":
        case "Closed - Feature Not Supported":
          closedFeatureContainer?.appendChild(card);
          break;
        default:
          openContainer.appendChild(card);
      }
    }

    function wireStatusListener(card) {
      const select = card.querySelector(".ticket-status-select");
      if (!select) return;
      select.addEventListener("change", () => {
        moveCard(card, select.value);
      });
    }

    // Wire the base card (it can move, but does not get numbered)
    wireStatusListener(baseCard);

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        ticketCounter += 1;
        const newCard = baseCard.cloneNode(true);
        newCard.removeAttribute("data-base");

        // Remove any existing badge, then create a new one
        const oldBadge = newCard.querySelector(".ticket-badge");
        if (oldBadge) oldBadge.remove();
        const badge = document.createElement("div");
        badge.className = "ticket-badge";
        badge.textContent = `Ticket # ${ticketCounter}`;
        newCard.insertBefore(badge, newCard.firstChild);

        // Clear inputs
        newCard.querySelectorAll("input[type='text']").forEach(i => (i.value = ""));
        const statusSelect = newCard.querySelector(".ticket-status-select");
        if (statusSelect) statusSelect.value = "Open";

        // New cards should NOT have an add button
        const newAddBtn = newCard.querySelector(".add-ticket-btn");
        if (newAddBtn) newAddBtn.remove();

        // Append to Open tickets & wire status listener
        openContainer.appendChild(newCard);
        wireStatusListener(newCard);
      });
    }

    // Also wire any pre-existing non-base cards (if you ever add them manually)
    openContainer.querySelectorAll(".ticket-group:not([data-base='true'])").forEach(card => {
      wireStatusListener(card);
    });
  }

  /* ========================= MAP BUTTON CLICK ========================= */
  function initMapButton() {
    const addressInput = document.getElementById("dealershipAddressInput");
    const mapBtn = document.getElementById("openAddressInMapsBtn");

    if (!addressInput || !mapBtn) return;

    mapBtn.addEventListener("click", () => {
      const text = addressInput.value.trim();
      if (!text) return;
      const encoded = encodeURIComponent(text);
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        "_blank"
      );
    });
  }
}

/* ============================================================
   GOOGLE MAPS PLACES AUTOCOMPLETE + EMBED PREVIEW
   Called via: &callback=initAddressAutocomplete
   ============================================================ */
function initAddressAutocomplete() {
  const input = document.getElementById("dealershipAddressInput");
  const mapFrame = document.getElementById("dealershipMapFrame");
  const mapWrapper = document.getElementById("mapPreviewWrapper") ||
                     document.querySelector(".map-wrapper");

  if (!input || !window.google || !google.maps || !google.maps.places) return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ["geocode"]
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place || !place.geometry) return;

    const address = place.formatted_address || input.value.trim();
    const encoded = encodeURIComponent(address);

    if (mapWrapper) mapWrapper.style.display = "block";
    if (mapFrame) {
      mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    }
  });
}
