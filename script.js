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
  initDealershipAddressMap();   // NEW — map embed wiring
});

/* =========================================================
   NAVIGATION
========================================================= */
function initNavigation() {
  const pages = document.querySelectorAll(".page-section");
  const navButtons = document.querySelectorAll(".nav-btn");

  function showPage(id) {
    pages.forEach(p => p.classList.remove("active"));
    const page = document.getElementById(id);
    if (page) page.classList.add("active");

    navButtons.forEach(b => b.classList.remove("active"));
    document.querySelector(`[data-page='${id}']`)?.classList.add("active");
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      showPage(page);
      localStorage.setItem("activePage", page);
    });
  });

  const saved = localStorage.getItem("activePage");
  showPage(saved || "dealership-info");
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
    btn.addEventListener("click", () => {
      const card = btn.closest(".contact-card");
      if (!card) return;

      const clone = card.cloneNode(true);
      clone.querySelectorAll("input").forEach(i => (i.value = ""));

      card.after(clone);

      initPOCAddButtons(); // rebind new + buttons
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

  // -------- Add Ticket --------
  baseCard.querySelector(".add-ticket-btn").addEventListener("click", () => {
    const newCard = cloneSupportTicketCard();
    openContainer.appendChild(newCard);
  });

  // Attach listeners to moves
  function attachStatusListener(card) {
    const select = card.querySelector(".ticket-status-select");
    select.addEventListener("change", () => {
      moveCard(card, select.value);
    });
  }

  // Moves ticket to correct section
  function moveCard(card, status) {
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

  // Assistive badge
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

    template.querySelector(".add-ticket-btn").remove();

    template.querySelectorAll("input").forEach(i => (i.value = ""));
    template.querySelector(".ticket-status-select").value = "Open";

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
    btn.addEventListener("click", () => {
      const table = btn.closest(".table-container").querySelector(".training-table tbody");
      if (!table) return;

      const firstRow = table.querySelector("tr");
      const clone = firstRow.cloneNode(true);

      clone.querySelectorAll("input, select").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
      });

      table.appendChild(clone);
    });
  });
}

/* =========================================================
   SIMPLE ADDRESS → EMBEDDED MAP (NO API KEY NEEDED)
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

  addressInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateMap();
    }
  });

  addressInput.addEventListener("blur", () => {
    updateMap();
  });

  if (mapButton) {
    mapButton.addEventListener("click", () => {
      const value = addressInput.value.trim();
      if (!value) return;

      const encoded = encodeURIComponent(value);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");

      mapFrame.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    });
  }
}
