/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   - Sidebar nav (Pages 1–11)
   - Add row buttons (tables + integrated-plus rows)
   - Special-case: Additional Trainer row adds as NORMAL row (no button)
   - Special-case: Additional POC clones ENTIRE mini-card (with remove –)
   - Support tickets add/move by status
   - Page reset buttons
   - Dropdown ghost styling (non-table only)
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

    // Inputs
    qsa(
      'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="date"]',
      container
    ).forEach((i) => (i.value = ""));

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
    if (!targetSection) {
      console.warn("Sidebar target not found:", targetId);
      return;
    }

    ensureOnlyOneActiveNav(btn);
    ensureOnlyOneActiveSection(targetSection);
  }

  /* =========================================================
     Integrated “+” Rows (non-table)
     We support 2 behaviors:
       A) Default integrated-plus: clone row and turn + into – (remove-row)
       B) Additional Trainer: clone row but REMOVE the button entirely
          and make it a NORMAL checklist-row (no integrated-plus styling)
  ========================================================= */

  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row");
    if (!row) return;

    // SPECIAL CASE: Additional Trainer rows should add a NORMAL textbox row (no button)
    // We detect via button class OR input placeholder/class naming patterns.
    const isAdditionalTrainer =
      addBtn.classList.contains("additional-trainer-add") ||
      !!row.querySelector('input[placeholder*="additional trainer" i]') ||
      !!row.querySelector(".additional-trainer-name");

    if (isAdditionalTrainer) {
      addAdditionalTrainerRowAsNormal(row);
      return;
    }

    // DEFAULT: clone integrated-plus row and convert + to – (remove-row)
    const clone = row.cloneNode(true);

    // swap + => –
    const cloneBtn = qs(".add-row", clone);
    if (cloneBtn) {
      cloneBtn.textContent = "–";
      cloneBtn.title = "Remove";
      cloneBtn.classList.add("remove-row");
      cloneBtn.classList.remove("add-row");
    }

    clearInputsInContainer(clone);

    const parent = row.parentElement;
    if (!parent) return;

    // Insert after last checklist-row of same type in this parent
    const siblings = qsa(".checklist-row", parent);
    const last = siblings[siblings.length - 1] || row;
    last.insertAdjacentElement("afterend", clone);
  }

  function addAdditionalTrainerRowAsNormal(sourceRow) {
    // Clone the row
    const clone = sourceRow.cloneNode(true);

    // Remove the button entirely (no + or – on added rows)
    clone.querySelectorAll(".add-row, .remove-row").forEach((b) => b.remove());

    // Remove integrated-plus class so it styles as a normal row
    clone.classList.remove("integrated-plus");

    // Clear values
    clearInputsInContainer(clone);

    // Insert right after the last "Additional Trainer" row in the same block
    const parent = sourceRow.parentElement;
    if (!parent) return;

    const trainerRows = qsa(".checklist-row", parent).filter((r) => {
      const label = qs("label", r)?.textContent?.toLowerCase() || "";
      return label.includes("additional trainer");
    });

    const last = trainerRows[trainerRows.length - 1] || sourceRow;
    last.insertAdjacentElement("afterend", clone);
  }

  function removeIntegratedRow(removeBtn) {
    const row = removeBtn.closest(".checklist-row");
    if (row) row.remove();
  }

  /* =========================================================
     Additional POC — clone ENTIRE mini-card
     - Clones .mini-card.additional-poc-card
     - Clears values
     - Changes + to – and removes the whole card on click
  ========================================================= */

  function addAdditionalPocCard(addBtn) {
    const card = addBtn.closest(".mini-card.additional-poc-card");
    if (!card) return;

    const clone = card.cloneNode(true);

    // Clear all inputs/selects/textareas/checkboxes in the cloned card
    clearInputsInContainer(clone);

    // Convert the button to a remove button in the clone
    const btn = qs("button", clone);
    if (btn) {
      btn.textContent = "–";
      btn.title = "Remove this POC";
      btn.classList.remove("add-row", "additional-poc-add");
      btn.classList.add("remove-poc-card");
      btn.type = "button";
    }

    // Insert after the last additional POC card in the same grid/container
    const parent = card.parentElement;
    if (!parent) return;

    const siblings = qsa(".mini-card.additional-poc-card", parent);
    const last = siblings[siblings.length - 1] || card;
    last.insertAdjacentElement("afterend", clone);
  }

  function removeAdditionalPocCard(removeBtn) {
    const card = removeBtn.closest(".mini-card.additional-poc-card");
    if (card) card.remove();
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

  function autosizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.max(textarea.scrollHeight, 34) + "px";
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
     Global Delegation
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

      // Additional POC remove (remove whole card)
      const removePocBtn = e.target.closest(".remove-poc-card");
      if (removePocBtn) {
        removeAdditionalPocCard(removePocBtn);
        return;
      }

      // Integrated-plus add (default behavior; Additional Trainer is handled inside)
      const addRowBtn = e.target.closest(".checklist-row .add-row");
      if (addRowBtn) {
        addIntegratedPlusRow(addRowBtn);
        return;
      }

      // Integrated-plus remove (for default integrated-plus clones that become –)
      const removeRowBtn = e.target.closest(".checklist-row .remove-row");
      if (removeRowBtn) {
        removeIntegratedRow(removeRowBtn);
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

      if (sel && sel.tagName === "SELECT") setSelectPlaceholderState(sel);

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

    const activeBtn = qs("#sidebar .nav-btn.active") || qs("#sidebar .nav-btn");
    if (activeBtn) handleSidebarClick(activeBtn);

    qsa(".ticket-summary-input").forEach(autosizeTextarea);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
