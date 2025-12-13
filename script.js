/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   - Sidebar nav (Pages 1–11)
   - Add row buttons (tables)
   - Integrated-plus (ONLY for simple single-field lines)
   - Additional Trainer: clones a NORMAL rounded line (no +, no flat edges)
   - Additional POC: clones ENTIRE mini-card (no + on clones)
   - Support tickets add/move by status
   - Page reset buttons
   - Dropdown ghost styling (non-table only)
   - Google Places Address Autocomplete + Map preview + Map button
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
    if (!select || select.tagName !== "SELECT") return;
    if (isInTrainingTable(select)) return; // never ghost-style table selects
    const isPlaceholder = !select.value || select.value === "";
    select.classList.toggle("is-placeholder", isPlaceholder);
  }

  function initAllSelectPlaceholders() {
    qsa("select").forEach(setSelectPlaceholderState);
  }

  function clearInputsInContainer(container) {
    if (!container) return;

    // text/number/email/tel/date
    qsa('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="date"]', container)
      .forEach((i) => {
        i.value = "";
      });

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
     Sidebar Nav
  ------------------------- */
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

  /* =========================================================
     ADDITIONAL TRAINER (YOUR EXACT HTML ON PAGE 1)

     Base row is:
       <div class="checklist-row integrated-plus">
         <label>Additional Trainer</label>
         <input type="text" ...>
         <button class="add-row">+</button>
       </div>
       <div id="additionalTrainersContainer"></div>

     Behavior:
       - Click + : create a NORMAL checklist-row (NOT integrated-plus)
       - New row has ONLY label + rounded input (no button)
       - Insert into #additionalTrainersContainer
  ========================================================= */
  function addAdditionalTrainerLine(addBtn) {
    const baseRow = addBtn.closest(".checklist-row.integrated-plus");
    if (!baseRow) return;

    const container = qs("#additionalTrainersContainer", baseRow.closest(".section-block")) || qs("#additionalTrainersContainer");
    if (!container) return;

    const input = qs('input[type="text"]', baseRow);
    const placeholder = input?.getAttribute("placeholder") || "Enter additional trainer name";

    const row = document.createElement("div");
    row.className = "checklist-row"; // IMPORTANT: NOT integrated-plus

    // Build label + input (no button)
    row.innerHTML = `
      <label>Additional Trainer</label>
      <input type="text" placeholder="${escapeHtml(placeholder)}">
    `;

    container.appendChild(row);
  }

  /* =========================================================
     ADDITIONAL POC (CLONE ENTIRE CARD)

     Base card:
       <div class="mini-card contact-card additional-poc-card" data-base="true"> ... </div>

     Behavior:
       - Click + on base card only
       - Clone the entire card
       - Remove the + button from the clone
       - Convert the name line to NORMAL (remove integrated-plus so it rounds)
       - Add a "Remove POC" button on the clone
  ========================================================= */
  function addAdditionalPocCard(addBtn) {
    const baseCard = addBtn.closest(".additional-poc-card");
    if (!baseCard) return;

    // Only base card should spawn clones
    const isBase = baseCard.dataset.base === "true";
    if (!isBase) return;

    const clone = baseCard.cloneNode(true);

    // Clone is NOT base
    clone.dataset.base = "false";

    // Remove the + button from the clone completely
    qsa(".additional-poc-add, .add-row", clone).forEach((b) => b.remove());

    // IMPORTANT: remove integrated-plus styling from the name row so it becomes rounded
    const nameRow = qs(".checklist-row.integrated-plus", clone);
    if (nameRow) nameRow.classList.remove("integrated-plus");

    // Clear all fields in clone
    clearInputsInContainer(clone);

    // Add a remove button at bottom of the clone card
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-poc-card-btn";
    removeBtn.textContent = "Remove POC";
    removeBtn.style.marginTop = "10px";
    removeBtn.style.padding = "6px 10px";
    removeBtn.style.borderRadius = "999px";
    removeBtn.style.border = "1px solid #bbb";
    removeBtn.style.background = "#f7f7f7";
    removeBtn.style.cursor = "pointer";
    removeBtn.style.fontSize = "11px";
    removeBtn.style.textTransform = "uppercase";
    removeBtn.style.letterSpacing = "0.08em";

    clone.appendChild(removeBtn);

    // Insert clone AFTER the last additional-poc-card in the same grid
    const grid = baseCard.closest(".primary-contacts-grid") || baseCard.parentElement;
    const cards = qsa(".additional-poc-card", grid);
    const last = cards[cards.length - 1] || baseCard;
    last.insertAdjacentElement("afterend", clone);
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
    if (rows.length === 0) return;

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

    // Remove additional trainers that were added (keep base line intact)
    if (section.id === "onsite-trainers-cem") {
      const container = qs("#additionalTrainersContainer", section);
      if (container) container.replaceChildren();
    }

    // Remove cloned additional POC cards (keep base)
    if (section.id === "dealership-info") {
      const cards = qsa(".additional-poc-card", section);
      cards.forEach((c) => {
        if (c.dataset.base === "true") clearInputsInContainer(c);
        else c.remove();
      });
    }

    // Support tickets special reset
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
     GOOGLE ADDRESS AUTOCOMPLETE + MAP PREVIEW + MAP BUTTON
     - Restores your "Dealership Address" workflow
  ========================================================= */
  let addressAutocomplete = null;

  function updateMapPreviewFromAddress(address) {
    const frame = qs("#dealershipMapFrame");
    const wrapper = qs("#mapPreviewWrapper");
    if (!frame) return;

    if (!address) {
      frame.src = "";
      if (wrapper) wrapper.style.display = "none";
      return;
    }

    // Use Maps embed "search" URL (no extra key required for iframe)
    const url = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    frame.src = url;
    if (wrapper) wrapper.style.display = "block";
  }

  function openAddressInGoogleMaps(address) {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function wireMapButton() {
    const btn = qs("#openAddressInMapsBtn");
    const input = qs("#dealershipAddressInput");
    if (!btn || !input) return;

    btn.addEventListener("click", () => {
      const address = input.value?.trim();
      openAddressInGoogleMaps(address);
    });
  }

  // Must be global for Google callback
  window.initAddressAutocomplete = function initAddressAutocomplete() {
    try {
      const input = document.getElementById("dealershipAddressInput");
      if (!input || !window.google || !google.maps || !google.maps.places) return;

      addressAutocomplete = new google.maps.places.Autocomplete(input, {
        types: ["address"],
        fields: ["formatted_address"],
      });

      addressAutocomplete.addListener("place_changed", () => {
        const place = addressAutocomplete.getPlace();
        const address = place?.formatted_address || input.value?.trim() || "";
        updateMapPreviewFromAddress(address);
      });

      // If user pastes/types without selecting a place:
      input.addEventListener("blur", () => {
        const address = input.value?.trim() || "";
        updateMapPreviewFromAddress(address);
      });

      // ensure map btn works
      wireMapButton();

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

      // Additional Trainer add (your Page 1 base line)
      const addTrainerBtn = e.target.closest(
        '#onsite-trainers-cem .checklist-row.integrated-plus .add-row'
      );
      if (addTrainerBtn) {
        addAdditionalTrainerLine(addTrainerBtn);
        return;
      }

      // Additional POC add (clone the whole card)
      const addPocBtn = e.target.closest(".additional-poc-add");
      if (addPocBtn) {
        addAdditionalPocCard(addPocBtn);
        return;
      }

      // Remove POC clone card
      const removePocBtn = e.target.closest(".remove-poc-card-btn");
      if (removePocBtn) {
        const card = removePocBtn.closest(".additional-poc-card");
        if (card) card.remove();
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
      const el = e.target;

      // Placeholder styling for dropdowns
      if (el && el.tagName === "SELECT") {
        setSelectPlaceholderState(el);
      }

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

    // Ensure one section is visible on load
    const activeBtn = qs("#sidebar .nav-btn.active") || qs("#sidebar .nav-btn");
    if (activeBtn) handleSidebarClick(activeBtn);

    // Autosize any existing ticket summary textareas
    qsa(".ticket-summary-input").forEach(autosizeTextarea);

    // Wire map button even if google hasn't loaded yet
    wireMapButton();
  }

  document.addEventListener("DOMContentLoaded", init);

  /* -------------------------
     Small util
  ------------------------- */
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
