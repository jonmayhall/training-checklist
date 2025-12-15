/* =======================================================
   myKaarma Interactive Training Checklist — FULL JS
   SAFE BUILD + FIXES
   - Additional Trainer “+” works (clones row)
   - Stops Google Places autocomplete searching while typing
   - Support tickets: “Add” moves filled base ticket into correct stack
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initResetButtons();
  initClearAll();
  initGhostSelects();
  initTopbarDealershipDisplay();
  initAddressMap();
  initIntegratedAddButtons();
  initTableAddButtons();
  initSupportTickets();
});

/* =======================================================
   Prevent Google Places Autocomplete from attaching
   (Your HTML loads Google Maps with callback=initAddressAutocomplete)
   ======================================================= */
window.initAddressAutocomplete = function () {
  // Intentionally empty: stops “search as you type” autocomplete behavior
};

/* =======================================================
   PAGE NAVIGATION
   ======================================================= */
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const pages = document.querySelectorAll(".page-section");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;

      navButtons.forEach(b => b.classList.remove("active"));
      pages.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  navButtons[0]?.click();
}

/* =======================================================
   RESET BUTTONS
   ======================================================= */
function initResetButtons() {
  document.querySelectorAll(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      page.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
        el.dispatchEvent(new Event("change"));
      });
    });
  });
}

/* =======================================================
   CLEAR ALL
   ======================================================= */
function initClearAll() {
  const btn = document.getElementById("clearAllBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!confirm("Clear ALL pages?")) return;

    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
      el.dispatchEvent(new Event("change"));
    });
  });
}

/* =======================================================
   GHOST SELECT TEXT
   ======================================================= */
function initGhostSelects() {
  document.querySelectorAll("select").forEach(select => {
    const update = () => {
      if (select.value === "") select.classList.add("is-placeholder");
      else select.classList.remove("is-placeholder");
    };
    select.addEventListener("change", update);
    update();
  });
}

/* =======================================================
   TOP BAR DEALERSHIP DISPLAY
   ======================================================= */
function initTopbarDealershipDisplay() {
  const out = document.getElementById("dealershipNameDisplay");
  if (!out) return;

  const groupEl = document.getElementById("dealerGroupInput");
  const nameEl  = document.getElementById("dealershipNameInput");
  const didEl   = document.getElementById("dealershipDidInput");

  const update = () => {
    const group = groupEl?.value.trim() || "";
    const name  = nameEl?.value.trim()  || "";
    const did   = didEl?.value.trim()   || "";

    let text = "";
    if (group) text += group + " ";
    if (name) text += name;
    text = text.trim();

    if (did) text = text ? `${text} - ${did}` : did;

    out.textContent = text || "Dealership Info";
  };

  [groupEl, nameEl, didEl].forEach(el => {
    el?.addEventListener("input", update);
    el?.addEventListener("change", update);
  });

  update();
}

/* =======================================================
   ADDRESS → GOOGLE MAPS (updates only on blur/change)
   ======================================================= */
function initAddressMap() {
  const addressInput = document.getElementById("dealershipAddressInput");
  const mapBtn = document.getElementById("openAddressInMapsBtn");
  const iframe = document.getElementById("dealershipMapFrame");

  if (!addressInput || !mapBtn) return;

  const updateMap = () => {
    const addr = addressInput.value.trim();
    if (!addr || !iframe) return;
    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;
  };

  addressInput.addEventListener("change", updateMap);
  addressInput.addEventListener("blur", updateMap);

  mapBtn.addEventListener("click", () => {
    const addr = addressInput.value.trim();
    if (!addr) return;
    window.open(`https://www.google.com/maps?q=${encodeURIComponent(addr)}`, "_blank");
  });
}

/* =======================================================
   INTEGRATED “+” INPUT ROWS
   - Additional POC: clones entire card (existing behavior)
   - Everything else (Additional Trainer, etc.): clones the row itself
   ======================================================= */
function initIntegratedAddButtons() {
  document.addEventListener("click", e => {
    const addBtn = e.target.closest(".add-row, .additional-poc-add");
    if (!addBtn) return;

    // CASE A: Additional POC card cloning (keep your current behavior)
    const pocCard = addBtn.closest(".additional-poc-card");
    if (pocCard) {
      const clone = pocCard.cloneNode(true);
      clone.removeAttribute("data-base");

      // Remove add button from cloned card
      clone.querySelectorAll(".add-row, .additional-poc-add").forEach(b => b.remove());

      // Clear inputs
      clone.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
        el.dispatchEvent(new Event("change"));
      });

      pocCard.parentNode.insertBefore(clone, pocCard.nextSibling);
      return;
    }

    // CASE B: Generic integrated-plus row cloning (Additional Trainer, etc.)
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    const cloneRow = row.cloneNode(true);

    // Remove the button from the cloned row (only the base keeps +)
    cloneRow.querySelectorAll(".add-row, .additional-poc-add").forEach(b => b.remove());

    // Clear inputs inside cloned row
    cloneRow.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
      el.dispatchEvent(new Event("change"));
    });

    // Insert clone directly after the base row
    row.parentNode.insertBefore(cloneRow, row.nextSibling);
  });
}

/* =======================================================
   TABLE ROW ADD
   ======================================================= */
function initTableAddButtons() {
  document.querySelectorAll(".table-footer .add-row").forEach(btn => {
    btn.addEventListener("click", () => {
      const table = btn.closest(".table-container")?.querySelector("table");
      if (!table) return;

      const tbody = table.querySelector("tbody");
      const rows = tbody.querySelectorAll("tr");
      if (!rows.length) return;

      const clone = rows[rows.length - 1].cloneNode(true);
      clone.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
        el.dispatchEvent(new Event("change"));
      });

      tbody.appendChild(clone);
    });
  });
}

/* =======================================================
   SUPPORT TICKETS
   - Base ticket is the only one with +
   - If filled out, clicking + creates a NEW ticket card and
     moves it into the correct status stack.
   ======================================================= */
function initSupportTickets() {
  const supportPage = document.getElementById("support-tickets");
  if (!supportPage) return;

  const openWrap   = document.getElementById("openTicketsContainer");
  const tierTwoWrap= document.getElementById("tierTwoTicketsContainer");
  const closedRes  = document.getElementById("closedResolvedTicketsContainer");
  const closedFeat = document.getElementById("closedFeatureTicketsContainer");

  const getBucket = (status) => {
    if (status === "Tier Two") return tierTwoWrap;
    if (status === "Closed - Resolved") return closedRes;
    if (status === "Closed – Feature Not Supported") return closedFeat;
    return openWrap; // Open default
  };

  const clearErrors = (root) => {
    root.querySelectorAll(".field-error").forEach(el => el.classList.remove("field-error"));
  };

  const markError = (el) => {
    el.classList.add("field-error");
  };

  const baseGroup = openWrap?.querySelector('.ticket-group[data-base="true"]');
  if (!baseGroup) return;

  // Handle Add Ticket (+)
  supportPage.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const group = addBtn.closest(".ticket-group");
    if (!group) return;

    clearErrors(group);

    const ticketNum = group.querySelector(".ticket-number-input");
    const statusSel = group.querySelector(".ticket-status-select");
    const linkInput = group.querySelector('input[placeholder*="Zendesk ticket URL"]');
    const summaryTx = group.querySelector(".ticket-summary-input");

    // Required: ticket number + summary (you can add more if you want)
    let ok = true;
    if (!ticketNum?.value.trim()) { markError(ticketNum); ok = false; }
    if (!summaryTx?.value.trim()) { markError(summaryTx); ok = false; }

    if (!ok) return;

    // Clone filled ticket
    const clone = group.cloneNode(true);
    clone.removeAttribute("data-base");

    // Remove + from clone
    clone.querySelectorAll(".add-ticket-btn").forEach(b => b.remove());

    // Move clone to correct bucket based on selected status
    const status = statusSel?.value || "Open";
    const bucket = getBucket(status);
    bucket?.appendChild(clone);

    // Reset base ticket fields
    group.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.classList.contains("ticket-status-select")) {
        el.value = "Open";
      } else {
        el.value = "";
      }
      el.dispatchEvent(new Event("change"));
    });
  });

  // If status changes on any ticket card, move it to correct bucket
  supportPage.addEventListener("change", (e) => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    const card = sel.closest(".ticket-group");
    if (!card) return;

    // Never move the base template out of Open
    if (card.getAttribute("data-base") === "true") {
      sel.value = "Open";
      return;
    }

    const bucket = getBucket(sel.value);
    bucket?.appendChild(card);
  });
}
