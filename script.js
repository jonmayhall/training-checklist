/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   FIXES INCLUDED:
   ✅ Additional Trainer: added lines become normal rounded textboxes (no +)
   ✅ Additional POC: clones the ENTIRE mini-card, removes + completely (no white +)
   ✅ Integrated-plus clones: remove integrated-plus class so right side is rounded
   ✅ Google Places address autocomplete restored (global callback)
   ✅ Sidebar nav, table add rows, support tickets, page resets, dropdown ghost styling
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

  function initAllSelectPlaceholders() {
    qsa("select").forEach(setSelectPlaceholderState);
  }

  function clearInputsInContainer(container) {
    if (!container) return;

    // text-like inputs
    qsa(
      'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="date"]',
      container
    ).forEach((i) => (i.value = ""));

    // textareas
    qsa("textarea", container).forEach((t) => (t.value = ""));

    // selects
    qsa("select", container).forEach((s) => {
      const ghost = qs('option[value=""][data-ghost="true"], option[value=""]', s);
      if (ghost) s.value = "";
      else s.selectedIndex = 0;
      setSelectPlaceholderState(s);
    });

    // checkboxes
    qsa('input[type="checkbox"]', container).forEach((c) => (c.checked = false));
  }

  function ensureOnlyOneActiveSection(targetSection) {
    qsa("main .page-section").forEach((sec) => sec.classList.remove("active"));
    if (targetSection) targetSection.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function ensureOnlyOneActiveNav(btn) {
    qsa("#sidebar .nav-btn").forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  /* -------------------------
     Sidebar Nav (Pages 1–11)
  ------------------------- */
  function handleSidebarClick(btn) {
    const targetId = btn?.dataset?.target;
    if (!targetId) return;

    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    ensureOnlyOneActiveNav(btn);
    ensureOnlyOneActiveSection(targetSection);
  }

  /* =========================================================
     INTEGRATED “+” LINE ROWS (non-table)
     (Example: Additional Trainer line)
     RULE:
       - Base row has + and is integrated-plus
       - Cloned rows become NORMAL checklist-row (fully rounded)
       - Cloned rows have NO + and NO integrated-plus class
  ========================================================= */
  function addIntegratedPlusLine(addBtn) {
    const baseRow = addBtn.closest(".checklist-row.integrated-plus");
    if (!baseRow) return;

    const clone = baseRow.cloneNode(true);
    clone.dataset.clone = "true";

    // Remove any add/remove buttons from the clone
    qsa(".add-row, .remove-row", clone).forEach((b) => b.remove());

    // IMPORTANT: remove integrated-plus so the textbox becomes fully rounded
    clone.classList.remove("integrated-plus");

    // Clear values
    clearInputsInContainer(clone);

    // Insert after last clone that belongs to this same baseRow area
    const parent = baseRow.parentElement;
    if (!parent) return;

    // Put it right after the last cloned row that follows this base row
    // (but still within the same section-block)
    const rows = qsa(".checklist-row", parent);
    const baseIndex = rows.indexOf(baseRow);
    let insertAfter = baseRow;

    for (let i = baseIndex + 1; i < rows.length; i++) {
      if (rows[i].dataset.clone === "true") insertAfter = rows[i];
      else break;
    }

    insertAfter.insertAdjacentElement("afterend", clone);
  }

  /* =========================================================
     ADDITIONAL POC — CLONE ENTIRE MINI-CARD
     RULE:
       - Base card has + inside first row
       - Cloned cards:
          ✅ NO + button at all
          ✅ first row becomes NORMAL (not integrated-plus)
          ✅ textbox is fully rounded (because row is no longer integrated-plus)
  ========================================================= */
  function addAdditionalPocCard(addBtn) {
    const baseCard = addBtn.closest(".additional-poc-card[data-base='true']");
    if (!baseCard) return;

    const clone = baseCard.cloneNode(true);
    clone.removeAttribute("data-base");
    clone.dataset.clone = "true";

    // Remove the + button completely in cloned card
    qsa(".additional-poc-add, .add-row", clone).forEach((b) => b.remove());

    // Convert first row from integrated-plus to normal checklist-row
    const firstRow = qs(".checklist-row", clone);
    if (firstRow) firstRow.classList.remove("integrated-plus");

    // Clear values in the cloned card
    clearInputsInContainer(clone);

    // Insert clone AFTER the base card (and after any existing cloned cards)
    const parent = baseCard.parentElement;
    if (!parent) return;

    const cards = qsa(".additional-poc-card", parent);
    const baseIndex = cards.indexOf(baseCard);
    let insertAfter = baseCard;

    for (let i = baseIndex + 1; i < cards.length; i++) {
      if (cards[i].dataset.clone === "true") insertAfter = cards[i];
      else break;
    }

    insertAfter.insertAdjacentElement("afterend", clone);
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

    const clone = rows[rows.length - 1].cloneNode(true);
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

    // remove + from clone (base only keeps +)
    const plus = qs(".add-ticket-btn", clone);
    if (plus) plus.remove();

    clearInputsInContainer(clone);

    const statusSelect = qs(".ticket-status-select", clone);
    if (statusSelect) statusSelect.value = "Open";

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

    // Remove any cloned integrated-line rows inside this page
    qsa('.checklist-row[data-clone="true"]', section).forEach((r) => r.remove());

    // Remove any cloned Additional POC cards inside this page
    qsa('.additional-poc-card[data-clone="true"]', section).forEach((c) => c.remove());

    // Clear everything else
    clearInputsInContainer(section);

    // Support tickets: remove extra cards + clear other containers
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

  /* =========================================================
     GOOGLE MAPS / PLACES — MUST BE GLOBAL CALLBACK
     Your HTML loads:
       ...&libraries=places&callback=initAddressAutocomplete
     So this MUST exist on window.
  ========================================================= */
  window.initAddressAutocomplete = function initAddressAutocomplete() {
    const addressInput = qs("#dealershipAddressInput");
    if (!addressInput || !window.google || !google.maps || !google.maps.places) return;

    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
      types: ["geocode"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place) return;

      // Prefer formatted address if available
      const address =
        (place.formatted_address || addressInput.value || "").trim();

      if (address) {
        addressInput.value = address;
        updateMapPreview(address);
      }
    });

    // If user types manually, still allow map preview when they blur
    addressInput.addEventListener("blur", () => {
      const val = (addressInput.value || "").trim();
      if (val) updateMapPreview(val);
    });

    // Map button click
    const mapBtn = qs("#openAddressInMapsBtn");
    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        const val = (addressInput.value || "").trim();
        if (!val) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      });
    }
  };

  function updateMapPreview(address) {
    const frame = qs("#dealershipMapFrame");
    const wrap = qs("#mapPreviewWrapper");
    if (!frame) return;

    // Embed does NOT require Places; it’s just a URL
    frame.src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    if (wrap) wrap.style.display = "block";
  }

  /* -------------------------
     Global Click + Change Delegation
  ------------------------- */
  function bindDelegatedEvents() {
    document.addEventListener("click", (e) => {
      // Sidebar nav
      const navBtn = e.target.closest("#sidebar .nav-btn");
      if (navBtn) return void handleSidebarClick(navBtn);

      // Reset page
      const resetBtn = e.target.closest(".clear-page-btn");
      if (resetBtn) return void resetThisPage(resetBtn);

      // Additional POC card add (clone whole card)
      const addPocBtn = e.target.closest(".additional-poc-add");
      if (addPocBtn) return void addAdditionalPocCard(addPocBtn);

      // Integrated-plus line add (Additional Trainer, etc.)
      const addLineBtn = e.target.closest(".checklist-row.integrated-plus > .add-row");
      if (addLineBtn) return void addIntegratedPlusLine(addLineBtn);

      // Support tickets add
      const addTicketBtn = e.target.closest(".add-ticket-btn");
      if (addTicketBtn) return void addSupportTicketCard(addTicketBtn);

      // Support tickets remove
      const removeTicketBtn = e.target.closest(".remove-ticket-btn");
      if (removeTicketBtn) {
        const group = removeTicketBtn.closest(".ticket-group");
        if (group) group.remove();
        return;
      }

      // Table add-row
      const tableAddBtn = e.target.closest(".table-footer .add-row");
      if (tableAddBtn) return void addTableRow(tableAddBtn);
    });

    document.addEventListener("change", (e) => {
      const el = e.target;

      // Dropdown placeholder styling
      if (el && el.tagName === "SELECT") setSelectPlaceholderState(el);

      // Ticket status changes → move card
      if (el && el.classList && el.classList.contains("ticket-status-select")) {
        const group = el.closest(".ticket-group");
        moveTicketGroupByStatus(group, el.value);
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

    const activeBtn = qs("#sidebar .nav-btn.active") || qs("#sidebar .nav-btn");
    if (activeBtn) handleSidebarClick(activeBtn);

    qsa(".ticket-summary-input").forEach(autosizeTextarea);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
