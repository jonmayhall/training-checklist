/* =========================================================
   MAIN INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initClearPageButtons();
  initClearAllButton();
  initDealershipNameBinding();
  initPOCAddButtons();
  initSupportTicketSystem();
  initTrainingTableAddButtons();
  initDealershipAddressMap();   // map embed wiring
});

/* =========================================================
   NAVIGATION  (uses data-target like your HTML)
========================================================= */
function initNavigation() {
  const pages = document.querySelectorAll(".page-section");
  const navButtons = document.querySelectorAll(".nav-btn");

  function showPage(id) {
    if (!id) return;

    // Show the correct page
    pages.forEach(p => {
      p.classList.toggle("active", p.id === id);
    });

    // Highlight correct nav button
    navButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.target === id);
    });
  }

  // Click handlers on nav buttons
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      showPage(targetId);
      localStorage.setItem("activePage", targetId);
    });
  });

  // Restore last page or default to first nav's target
  const saved = localStorage.getItem("activePage");
  const defaultId = saved || (navButtons[0] && navButtons[0].dataset.target) || "dealership-info";
  showPage(defaultId);
}

/* =========================================================
   CLEAR PAGE BUTTONS
========================================================= */
function initClearPageButtons() {
  const buttons = document.querySelectorAll(".clear-page-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".page-section");
      if (!section) return;

      const inputs = section.querySelectorAll("input, select, textarea");
      inputs.forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
      });
    });
  });
}

function initClearAllButton() {
  const btn = document.getElementById("clearAllBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    localStorage.clear();
    location.reload();
  });
}

/* =========================================================
   DEALERSHIP NAME → TOP BAR BINDING
========================================================= */
function initDealershipNameBinding() {
  const input = document.getElementById("dealershipNameInput");
  const display = document.getElementById("dealershipNameDisplay");

  if (!input || !display) return;

  input.addEventListener("input", () => {
    display.textContent = input.value || "";
  });
}

/* =========================================================
   ADDITIONAL POC BUTTONS (Page 2)
========================================================= */
function initPOCAddButtons() {
  document.querySelectorAll(".additional-poc-add").forEach(btn => {
    // avoid double-binding if this runs again
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const card = btn.closest(".contact-card");
      if (!card) return;

      const clone = card.cloneNode(true);
      clone.querySelectorAll("input").forEach(i => (i.value = ""));

      card.after(clone);

      // Bind the + button inside the newly created card
      initPOCAddButtons();
    });
  });
}

/* =========================================================
   SUPPORT TICKET SYSTEM (Page 7)
========================================================= */
function initSupportTicketSystem() {
  const openContainer = document.getElementById("openTicketsContainer");
  const tierTwoContainer = document.getElementById("tierTwoTicketsContainer");
  const closedResolvedContainer = document.getElementById("closedResolvedTicketsContainer");
  const closedFeatureContainer = document.getElementById("closedFeatureTicketsContainer");

  if (!openContainer) return;

  const baseCard = openContainer.querySelector("[data-base='true']");
  if (!baseCard) return;

  // -------- Add Ticket from base card --------
  const baseAddBtn = baseCard.querySelector(".add-ticket-btn");
  if (baseAddBtn && baseAddBtn.dataset.bound !== "true") {
    baseAddBtn.dataset.bound = "true";
    baseAddBtn.addEventListener("click", () => {
      const newCard = cloneSupportTicketCard();
      openContainer.appendChild(newCard);
    });
  }

  // Attach listeners so tickets move when status changes
  function attachStatusListener(card) {
    const select = card.querySelector(".ticket-status-select");
    if (!select) return;

    if (select.dataset.bound === "true") return;
    select.dataset.bound = "true";

    select.addEventListener("change", () => {
      moveCard(card, select.value);
    });
  }

  // Moves ticket to correct section
  function moveCard(card, status) {
    // Remove any older badge
    card.querySelector(".ticket-badge")?.remove();

    if (status === "Open") {
      setBadge(card, "Ticket");
      openContainer.appendChild(card);
    } else if (status === "Tier Two") {
      setBadge(card, "Tier 2");
      tierTwoContainer.appendChild(card);
    } else if (status === "Closed - Resolved") {
      setBadge(card, "Resolved");
      closedResolvedContainer.appendChild(card);
    } else if (status === "Closed – Feature Not Supported") {
      setBadge(card, "Unsupported");
      closedFeatureContainer.appendChild(card);
    }
  }

  // Orange badge
  function setBadge(card, text) {
    const badge = document.createElement("div");
    badge.className = "ticket-badge";
    badge.textContent = text;
    card.insertBefore(badge, card.firstChild);
  }

  // Clone card WITHOUT base behavior
  function cloneSupportTicketCard() {
    const template = baseCard.cloneNode(true);
    template.removeAttribute("data-base");

    // Remove + from clone
    const addBtn = template.querySelector(".add-ticket-btn");
    if (addBtn) addBtn.remove();

    // Clear values
    template.querySelectorAll("input").forEach(i => (i.value = ""));
    const statusSelect = template.querySelector(".ticket-status-select");
    if (statusSelect) statusSelect.value = "Open";

    attachStatusListener(template);
    setBadge(template, "Ticket");

    return template;
  }

  attachStatusListener(baseCard);
}

/* =========================================================
   TRAINING TABLE: ADD ROW
========================================================= */
function initTrainingTableAddButtons() {
  document.querySelectorAll(".table-footer .add-row").forEach(btn => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const container = btn.closest(".table-container");
      if (!container) return;

      const tbody = container.querySelector(".training-table tbody");
      if (!tbody) return;

      const firstRow = tbody.querySelector("tr");
      if (!firstRow) return;

      const clone = firstRow.cloneNode(true);
      clone.querySelectorAll("input, select").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
      });

      tbody.appendChild(clone);
    });
  });
}

/* =========================================================
   SIMPLE ADDRESS → EMBEDDED MAP (NO API KEY)
========================================================= */
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

  // Hit Enter in the address field → update map
  addressInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateMap();
    }
  });

  // Leaving the field also updates map
  addressInput.addEventListener("blur", () => {
    updateMap();
  });

  // Map button opens full Google Maps AND updates embed
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
