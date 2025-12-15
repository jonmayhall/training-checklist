/* =======================================================
   myKaarma Interactive Training Checklist — FULL JS
   SAFE BUILD + Support Ticket Validation + Trainer Add Fix
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initResetButtons();
  initClearAll();
  initGhostSelects();
  initTopbarDealershipDisplay();
  initAddressMap();                 // map preview updates only on blur/change
  initIntegratedAddButtons();       // fixes Additional Trainer "+"
  initTableAddButtons();
  initSupportTickets();             // REQUIRED fields + move ticket into correct column
});

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
   ADDRESS → GOOGLE MAPS
   (IMPORTANT: map updates ONLY on blur/change, not while typing)
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

  // Only update when user finishes (no "as you type")
  addressInput.addEventListener("change", updateMap);
  addressInput.addEventListener("blur", updateMap);

  mapBtn.addEventListener("click", () => {
    const addr = addressInput.value.trim();
    if (!addr) return;
    window.open(`https://www.google.com/maps?q=${encodeURIComponent(addr)}`, "_blank");
  });
}

/* =======================================================
   GOOGLE MAPS PLACES CALLBACK (prevents console errors)
   You included a callback=initAddressAutocomplete in HTML.
   We keep it "no-op" so it does NOT search as you type.
   ======================================================= */
function initAddressAutocomplete() {
  // Intentionally empty to avoid "search as you type" behavior.
  // Your map preview is handled in initAddressMap() on blur/change.
}

/* =======================================================
   INTEGRATED “+” INPUT ROWS
   - Additional POC: clones the whole card (existing behavior)
   - Additional Trainer: clones ONE row into #additionalTrainersContainer
   ======================================================= */
function initIntegratedAddButtons() {
  document.addEventListener("click", e => {
    const addBtn = e.target.closest(".add-row, .additional-poc-add");
    if (!addBtn) return;

    // --- CASE A: Additional POC cards (clone entire card) ---
    const pocCard = addBtn.closest(".additional-poc-card");
    if (pocCard) {
      const clone = pocCard.cloneNode(true);
      clone.removeAttribute("data-base");

      // Remove add button from cloned card
      clone.querySelectorAll(".add-row, .additional-poc-add").forEach(b => b.remove());

      // Clear cloned values
      clone.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
      });

      pocCard.parentNode.insertBefore(clone, pocCard.nextSibling);
      return;
    }

    // --- CASE B: Generic integrated-plus row (Additional Trainer, etc.) ---
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    const labelText = row.querySelector("label")?.textContent?.trim().toLowerCase() || "";

    // Clone the ROW (not the whole section)
    const cloneRow = row.cloneNode(true);

    // Remove the + button in the clone
    cloneRow.querySelectorAll(".add-row, .additional-poc-add").forEach(b => b.remove());

    // Clear the cloned input
    cloneRow.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
      el.dispatchEvent(new Event("change"));
    });

    // Additional Trainer goes into your container
    if (labelText.includes("additional trainer")) {
      const container = document.getElementById("additionalTrainersContainer");
      if (container) {
        container.appendChild(cloneRow);
        return;
      }
    }

    // Default: insert right under the row
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
   - Base card requires ALL fields before add
   - Missing fields get .field-error + a warning message
   - If valid: moves ticket into correct status column and clears base
   ======================================================= */
function initSupportTickets() {
  const openWrap = document.getElementById("openTicketsContainer");
  const tierTwoWrap = document.getElementById("tierTwoTicketsContainer");
  const closedResolvedWrap = document.getElementById("closedResolvedTicketsContainer");
  const closedFeatureWrap = document.getElementById("closedFeatureTicketsContainer");
  if (!openWrap) return;

  const base = openWrap.querySelector('.ticket-group[data-base="true"]');
  if (!base) return;

  const addBtn = base.querySelector(".add-ticket-btn");
  if (!addBtn) return;

  const getBaseFields = () => {
    const numberInput = base.querySelector(".ticket-number-input");
    const statusSelect = base.querySelector(".ticket-status-select");
    const linkInput = base.querySelector('input[type="text"][placeholder*="Zendesk"]');
    const summaryTextarea = base.querySelector(".ticket-summary-input");

    return { numberInput, statusSelect, linkInput, summaryTextarea };
  };

  const clearErrors = (scopeEl) => {
    scopeEl.querySelectorAll(".field-error").forEach(el => el.classList.remove("field-error"));
    scopeEl.querySelectorAll(".field-warning").forEach(el => el.remove());
  };

  const markError = (fieldEl, message) => {
    if (!fieldEl) return;
    fieldEl.classList.add("field-error");

    const warn = document.createElement("div");
    warn.className = "field-warning";
    warn.textContent = message;

    // Put warning right after the input/select/textarea
    fieldEl.insertAdjacentElement("afterend", warn);
  };

  const getTargetContainer = (statusValue) => {
    const v = (statusValue || "").trim();

    if (v === "Tier Two") return tierTwoWrap || openWrap;
    if (v === "Closed - Resolved") return closedResolvedWrap || openWrap;
    if (v.includes("Feature Not Supported")) return closedFeatureWrap || openWrap;

    // Default "Open"
    return openWrap;
  };

  const createTicketCardFromBase = () => {
    // Clone the base group
    const clone = base.cloneNode(true);
    clone.removeAttribute("data-base");

    // Remove add button from clone (this is a finalized ticket card)
    clone.querySelectorAll(".add-ticket-btn").forEach(b => b.remove());

    // Remove disclaimer on cloned tickets (base-only)
    clone.querySelectorAll(".ticket-disclaimer").forEach(p => p.remove());

    // Remove any validation artifacts if present
    clearErrors(clone);

    return clone;
  };

  const resetBase = () => {
    const { numberInput, statusSelect, linkInput, summaryTextarea } = getBaseFields();
    if (numberInput) numberInput.value = "";
    if (linkInput) linkInput.value = "";
    if (summaryTextarea) summaryTextarea.value = "";
    if (statusSelect) statusSelect.value = "Open";

    base.querySelectorAll("input, textarea, select").forEach(el => {
      el.dispatchEvent(new Event("change"));
    });
  };

  addBtn.addEventListener("click", () => {
    clearErrors(base);

    const { numberInput, statusSelect, linkInput, summaryTextarea } = getBaseFields();

    const missing = [];

    if (!numberInput || !numberInput.value.trim()) {
      missing.push(() => markError(numberInput, "Ticket number is required."));
    }
    if (!statusSelect || !statusSelect.value.trim()) {
      missing.push(() => markError(statusSelect, "Status is required."));
    }
    if (!linkInput || !linkInput.value.trim()) {
      missing.push(() => markError(linkInput, "Zendesk link is required."));
    } else {
      // Light URL sanity check (not strict)
      const val = linkInput.value.trim();
      if (!/^https?:\/\//i.test(val)) {
        missing.push(() => markError(linkInput, "Please paste a full URL (starts with http:// or https://)."));
      }
    }
    if (!summaryTextarea || !summaryTextarea.value.trim()) {
      missing.push(() => markError(summaryTextarea, "Short summary is required."));
    }

    if (missing.length) {
      missing.forEach(fn => fn());
      // Optional: jump to first error field for “credit card form” feel
      const firstErr = base.querySelector(".field-error");
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      firstErr?.focus?.();
      return;
    }

    // Valid: create new card, move it into correct column based on status
    const statusValue = statusSelect.value;
    const target = getTargetContainer(statusValue);

    const card = createTicketCardFromBase();

    // Append to target container (keeps base in Open container)
    if (target === openWrap) {
      // Insert after base so base stays first
      base.parentNode.insertBefore(card, base.nextSibling);
    } else {
      target.appendChild(card);
    }

    resetBase();
  });
}
