/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   FIXES:
   - Google Places callback works (initAddressAutocomplete is global)
   - Integrated-plus clones become NORMAL rows (no button + rounded right side)
   - Additional POC clones the ENTIRE mini-card and removes the add button entirely
   - Tables add-row still works
   - Support tickets still works
   - Non-table dropdown ghost styling still works
   ========================================================= */

(function () {
  "use strict";

  /* -------------------------
     Helpers
  ------------------------- */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function isInTrainingTable(el) {
    return !!el.closest(".training-table");
  }

  function setSelectPlaceholderState(select) {
    // Only apply placeholder styling for non-table dropdowns
    if (isInTrainingTable(select)) return;

    const isPlaceholder = !select.value || select.value === "";
    select.classList.toggle("is-placeholder", isPlaceholder);
  }

  function initAllSelectPlaceholders(root = document) {
    qsa("select", root).forEach(setSelectPlaceholderState);
  }

  function clearInputsInContainer(container) {
    if (!container) return;

    // Inputs
    qsa(
      'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="date"]',
      container
    ).forEach((i) => {
      i.value = "";
    });

    // Textareas
    qsa("textarea", container).forEach((t) => (t.value = ""));

    // Selects
    qsa("select", container).forEach((s) => {
      const ghost = qs('option[value=""][data-ghost="true"], option[value=""]', s);
      if (ghost) s.value = "";
      else s.selectedIndex = 0;
      setSelectPlaceholderState(s);
    });

    // Checkboxes
    qsa('input[type="checkbox"]', container).forEach((c) => (c.checked = false));
  }

  /* -------------------------
     Sidebar Nav
  ------------------------- */
  function ensureOnlyOneActiveSection(targetSection) {
    qsa("main .page-section").forEach((sec) => sec.classList.remove("active"));
    if (targetSection) targetSection.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function ensureOnlyOneActiveNav(btn) {
    qsa("#sidebar .nav-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  function handleSidebarClick(btn) {
    const targetId = btn?.dataset?.target;
    if (!targetId) return;

    const targetSection = document.getElementById(targetId);
    if (!targetSection) {
      console.warn("Sidebar target not found:", targetId);
      return;
    }

    ensureOnlyOneActiveNav(btn);
    ensureOnlyOneActiveSection(targetSection);
  }

  /* -------------------------
     Integrated “+” Rows (non-table)
     RULE:
     - BASE row has orange + button + flat right side
     - CLONED rows become NORMAL checklist-row:
       - remove the button
       - remove integrated-plus class
       - keep only the input/select/etc (rounded normally by your CSS)
  ------------------------- */
  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    const clone = row.cloneNode(true);

    // Remove any + / – buttons from the clone (no buttons on added rows)
    qsa(".add-row, .remove-row", clone).forEach((btn) => btn.remove());

    // CRITICAL: make clone a NORMAL row so it’s not flat on either side
    clone.classList.remove("integrated-plus");

    // Clear clone input values
    clearInputsInContainer(clone);

    // Insert after the last row of the same “block”
    const parent = row.parentElement;
    if (!parent) return;

    const siblings = qsa(".checklist-row", parent);
    const last = siblings[siblings.length - 1] || row;
    last.insertAdjacentElement("afterend", clone);

    // Re-apply placeholder states inside clone
    initAllSelectPlaceholders(clone);
  }

  /* -------------------------
     Additional POC (clone ENTIRE mini-card)
     - Base card has the orange + button
     - Cloned cards: NO button, and first row becomes NORMAL (not integrated-plus)
  ------------------------- */
  function addAdditionalPocCard(addBtn) {
    const baseCard = addBtn.closest(".additional-poc-card");
    if (!baseCard) return;

    const clone = baseCard.cloneNode(true);

    // Cloned cards are NOT base
    clone.removeAttribute("data-base");

    // Remove the add button entirely from the clone
    const plus = qs(".additional-poc-add", clone) || qs(".add-row", clone);
    if (plus) plus.remove();

    // Convert the first row to NORMAL so the input is rounded (no integrated-plus styling)
    const firstRow = qs(".checklist-row", clone);
    if (firstRow) firstRow.classList.remove("integrated-plus");

    // Clear all fields inside clone
    clearInputsInContainer(clone);

    // Insert clone right after the LAST additional-poc-card in the same grid
    const grid = baseCard.parentElement;
    if (!grid) return;

    const allCards = qsa(".additional-poc-card", grid);
    const lastCard = allCards[allCards.length - 1] || baseCard;
    lastCard.insertAdjacentElement("afterend", clone);

    initAllSelectPlaceholders(clone);
  }

  /* -------------------------
     Table “+” Row Buttons
  ------------------------- */
  function addTableRow(addBtn) {
    const footer = addBtn.closest(".table-footer");
    if (!footer) return;

    const tableContainer = footer.closest(".table-container");
    if (!tableContainer) return;

    const table = qs("table.training-table", tableContainer);
    const tbody = table ? qs("tbody", table) : null;
    if (!tbody) return;

    const rows = qsa("tr", tbody);
    if (!rows.length) return;

    const lastRow = rows[rows.length - 1];
    const clone = lastRow.cloneNode(true);

    clearInputsInContainer(clone);
    tbody.appendChild(clone);

    qsa("select", clone).forEach(setSelectPlaceholderState);
  }

  /* -------------------------
     Support Tickets
  ------------------------- */
  function getTicketContainers() {
    return {
      open: qs("#openTicketsContainer"),
      tierTwo: qs("#tierTwoTicketsContainer"),
      closedResolved: qs("#closedResolvedTicketsContainer"),
      closedFeature: qs("#closedFeatureTicketsContainer"),
    };
  }

  function buildTicketBadge(text) {
    const badge = document.createElement("div");
    badge.className = "ticket-badge";
    badge.textContent = text;
    return badge;
  }

  function addRemoveTicketBtn(ticketGroup) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-ticket-btn";
    btn.title = "Remove this ticket";
    btn.textContent = "Remove";
    btn.style.marginTop = "10px";
    btn.style.padding = "6px 10px";
    btn.style.borderRadius = "999px";
    btn.style.border = "1px solid #bbb";
    btn.style.background = "#f7f7f7";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "11px";
    btn.style.textTransform = "uppercase";
    btn.style.letterSpacing = "0.08em";
    ticketGroup.appendChild(btn);
  }

  function ticketBadgeTextForStatus(status) {
    switch (status) {
      case "Tier Two":
        return "Tier Two / Escalated";
      case "Closed - Resolved":
        return "Closed - Resolved";
      case "Closed – Feature Not Supported":
        return "Closed – Feature Not Supported";
      case "Open":
      default:
        return "Open";
    }
  }

  function moveTicketGroupByStatus(ticketGroup, status) {
    const { open, tierTwo, closedResolved, closedFeature } = getTicketContainers();
    if (!ticketGroup) return;

    const existingBadge = qs(".ticket-badge", ticketGroup);
    if (existingBadge) existingBadge.remove();

    const badge = buildTicketBadge(`Status: ${ticketBadgeTextForStatus(status)}`);
    ticketGroup.insertAdjacentElement("afterbegin", badge);

    if (status === "Tier Two") tierTwo?.appendChild(ticketGroup);
    else if (status === "Closed - Resolved") closedResolved?.appendChild(ticketGroup);
    else if (status === "Closed – Feature Not Supported") closedFeature?.appendChild(ticketGroup);
    else open?.appendChild(ticketGroup);
  }

  function autosizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.max(textarea.scrollHeight, 34) + "px";
  }

  function addSupportTicketCard(addBtn) {
    const baseGroup = addBtn.closest(".ticket-group");
    if (!baseGroup) return;

    const containers = getTicketContainers();
    if (!containers.open) return;

    const clone = baseGroup.cloneNode(true);
    clone.removeAttribute("data-base");

    const plus = qs(".add-ticket-btn", clone);
    if (plus) plus.remove();

    clearInputsInContainer(clone);

    const statusSelect = qs(".ticket-status-select", clone);
    if (statusSelect) {
      statusSelect.value = "Open";
      setSelectPlaceholderState(statusSelect);
    }

    const badge = buildTicketBadge("Status: Open");
    clone.insertAdjacentElement("afterbegin", badge);
    addRemoveTicketBtn(clone);

    containers.open.appendChild(clone);

    const summary = qs(".ticket-summary-input", clone);
    if (summary) autosizeTextarea(summary);
  }

  /* -------------------------
     Reset Page Button
  ------------------------- */
  function resetThisPage(btn) {
    const section = btn.closest(".page-section");
    if (!section) return;

    clearInputsInContainer(section);

    if (section.id === "support-tickets") {
      const allGroups = qsa(".ticket-group", section);
      allGroups.forEach((g) => {
        if (g.dataset.base === "true") {
          clearInputsInContainer(g);
          const s = qs(".ticket-status-select", g);
          if (s) s.value = "Open";
        } else {
          g.remove();
        }
      });

      qs("#tierTwoTicketsContainer")?.replaceChildren();
      qs("#closedResolvedTicketsContainer")?.replaceChildren();
      qs("#closedFeatureTicketsContainer")?.replaceChildren();
    }

    initAllSelectPlaceholders();
  }

  /* -------------------------
     Google Maps / Places (GLOBAL callback)
     IMPORTANT: must be on window for Google callback
  ------------------------- */
  function updateDealershipMapFromAddress(address) {
    const iframe = qs("#dealershipMapFrame");
    const wrapper = qs("#mapPreviewWrapper");
    if (!iframe || !wrapper) return;

    const q = encodeURIComponent(address);
    iframe.src = `https://www.google.com/maps?q=${q}&output=embed`;
  }

  function bindOpenInMapsButton() {
    const btn = qs("#openAddressInMapsBtn");
    const input = qs("#dealershipAddressInput");
    if (!btn || !input) return;

    btn.addEventListener("click", () => {
      const address = (input.value || "").trim();
      if (!address) return;
      const q = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener");
    });
  }

  // This MUST be global because your Google script uses callback=initAddressAutocomplete
  window.initAddressAutocomplete = function () {
    try {
      const input = qs("#dealershipAddressInput");
      if (!input || !window.google || !google.maps || !google.maps.places) return;

      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ["geocode"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const address =
          place?.formatted_address ||
          (place?.name ? place.name : "") ||
          (input.value || "").trim();

        if (address) updateDealershipMapFromAddress(address);
      });

      // If user manually types and leaves field, still update map
      input.addEventListener("blur", () => {
        const address = (input.value || "").trim();
        if (address) updateDealershipMapFromAddress(address);
      });

      // Map button behavior
      bindOpenInMapsButton();
    } catch (err) {
      console.warn("initAddressAutocomplete error:", err);
    }
  };

  /* -------------------------
     Global Click + Change Delegation
  ------------------------- */
  function bindDelegatedEvents() {
    document.addEventListener("click", (e) => {
      // Sidebar nav
      const navBtn = e.target.closest("#sidebar .nav-btn");
      if (navBtn) {
        handleSidebarClick(navBtn);
        return;
      }

      // Reset page
      const resetBtn = e.target.closest(".clear-page-btn");
      if (resetBtn) {
        resetThisPage(resetBtn);
        return;
      }

      // Support tickets add
      const addTicketBtn = e.target.closest(".add-ticket-btn");
      if (addTicketBtn) {
        addSupportTicketCard(addTicketBtn);
        return;
      }

      // Support tickets remove
      const removeTicketBtn = e.target.closest(".remove-ticket-btn");
      if (removeTicketBtn) {
        const group = removeTicketBtn.closest(".ticket-group");
        if (group) group.remove();
        return;
      }

      // Additional POC add (clone whole card)
      const addPocBtn = e.target.closest(".additional-poc-add");
      if (addPocBtn) {
        addAdditionalPocCard(addPocBtn);
        return;
      }

      // Integrated-plus add (generic lines like Additional Trainer)
      const addRowBtn = e.target.closest(".checklist-row.integrated-plus .add-row");
      if (addRowBtn) {
        addIntegratedPlusRow(addRowBtn);
        return;
      }

      // Table add-row
      const tableAddBtn = e.target.closest(".table-footer .add-row");
      if (tableAddBtn) {
        addTableRow(tableAddBtn);
        return;
      }
    });

    document.addEventListener("change", (e) => {
      const sel = e.target;

      if (sel && sel.tagName === "SELECT") {
        setSelectPlaceholderState(sel);
      }

      if (sel && sel.classList && sel.classList.contains("ticket-status-select")) {
        const group = sel.closest(".ticket-group");
        moveTicketGroupByStatus(group, sel.value);
      }
    });

    document.addEventListener("input", (e) => {
      const ta = e.target;
      if (ta && ta.classList && ta.classList.contains("ticket-summary-input")) {
        autosizeTextarea(ta);
      }
    });
  }

  /* -------------------------
     Init
  ------------------------- */
  function init() {
    bindDelegatedEvents();
    initAllSelectPlaceholders();

    // Ensure one section visible on load
    const activeBtn = qs("#sidebar .nav-btn.active") || qs("#sidebar .nav-btn");
    if (activeBtn) handleSidebarClick(activeBtn);

    qsa(".ticket-summary-input").forEach(autosizeTextarea);

    // Keep map button working even before Google loads
    bindOpenInMapsButton();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
