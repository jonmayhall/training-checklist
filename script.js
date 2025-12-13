/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   - Sidebar nav (Pages 1–11)
   - Add row buttons (tables + integrated-plus rows)
   - Additional POC: adds ENTIRE mini-card (NO +/- on added cards)
   - Additional Trainer: adds another ROW (NO +/- on added rows)
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

     RULES:
     - Only the TEMPLATE row/card has the "+" button.
     - Added rows/cards have NO buttons at all.
     - Additional Trainer: adds another ROW (no button on added rows)
     - Additional POC: adds another MINI-CARD (no button on added cards)
     ========================================================= */

  function addAdditionalPocCard(addBtn) {
    // Base card is marked data-base="true" in your HTML
    const baseCard = addBtn.closest('.additional-poc-card[data-base="true"]');
    if (!baseCard) return;

    const clone = baseCard.cloneNode(true);

    // Not base anymore
    clone.removeAttribute("data-base");

    // Clear inputs/selects/etc
    clearInputsInContainer(clone);

    // Remove any + / – buttons from the clone entirely
    clone.querySelectorAll(".add-row, .remove-row, .additional-poc-add").forEach((b) => b.remove());

    // Make the first row normal so the textbox is fully rounded (no integrated-plus styling)
    const firstRow = qs(".checklist-row", clone);
    if (firstRow) firstRow.classList.remove("integrated-plus");

    // Insert after the last Additional POC card in the grid
    const grid = qs("#primaryContactsGrid") || baseCard.parentElement;
    if (!grid) return;

    const cards = qsa(".additional-poc-card", grid);
    const last = cards[cards.length - 1] || baseCard;
    last.insertAdjacentElement("afterend", clone);
  }

  function addAdditionalTrainerRow(row) {
    // row is the template .checklist-row.integrated-plus for "Additional Trainer"
    const clone = row.cloneNode(true);

    // Remove buttons from the clone entirely
    clone.querySelectorAll(".add-row, .remove-row").forEach((b) => b.remove());

    // Remove integrated-plus so the textbox becomes fully rounded (normal row)
    clone.classList.remove("integrated-plus");

    // Clear cloned inputs
    clearInputsInContainer(clone);

    // Prefer the dedicated container if present
    const container = qs("#additionalTrainersContainer");
    if (container) {
      container.appendChild(clone);
      return;
    }

    // Fallback: insert after last additional trainer row near this section
    const parent = row.parentElement;
    if (!parent) return;

    const allTrainerRows = qsa(".checklist-row", parent).filter((r) => {
      const lab = qs("label", r);
      return lab && lab.textContent.trim().toLowerCase() === "additional trainer";
    });
    const last = allTrainerRows[allTrainerRows.length - 1] || row;
    last.insertAdjacentElement("afterend", clone);
  }

  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    // Additional POC button adds a whole card
    if (addBtn.classList.contains("additional-poc-add")) {
      addAdditionalPocCard(addBtn);
      return;
    }

    // Additional Trainer row adds another row
    const label = qs("label", row);
    const labelText = (label?.textContent || "").trim().toLowerCase();
    if (labelText === "additional trainer") {
      addAdditionalTrainerRow(row);
      return;
    }

    // Generic integrated-plus row: clone as a normal row (no buttons)
    const clone = row.cloneNode(true);
    clone.querySelectorAll(".add-row, .remove-row").forEach((b) => b.remove());
    clone.classList.remove("integrated-plus");
    clearInputsInContainer(clone);
    row.insertAdjacentElement("afterend", clone);
  }

  /* -------------------------
     Table “+” Row Buttons
     - expects button inside .table-footer .add-row
     - clones last tbody row
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

    // Re-apply dropdown placeholder style (non-table handler exits early, but safe)
    qsa("select", clone).forEach(setSelectPlaceholderState);
  }

  /* -------------------------
     Support Tickets
     - Add ticket card
     - Move card by status dropdown
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

    // Ensure only ONE badge at the top
    const existingBadge = qs(".ticket-badge", ticketGroup);
    if (existingBadge) existingBadge.remove();

    const badge = buildTicketBadge(`Status: ${ticketBadgeTextForStatus(status)}`);
    ticketGroup.insertAdjacentElement("afterbegin", badge);

    if (status === "Tier Two") {
      tierTwo?.appendChild(ticketGroup);
    } else if (status === "Closed - Resolved") {
      closedResolved?.appendChild(ticketGroup);
    } else if (status === "Closed – Feature Not Supported") {
      closedFeature?.appendChild(ticketGroup);
    } else {
      open?.appendChild(ticketGroup);
    }
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

    // Remove + button from cloned card
    const plus = qs(".add-ticket-btn", clone);
    if (plus) plus.remove();

    clearInputsInContainer(clone);

    // Default status to Open
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

    // Special: support tickets
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

    // Special: Additional POC cards — keep base, remove extras
    if (section.id === "dealership-info") {
      const grid = qs("#primaryContactsGrid", section);
      if (grid) {
        const pocCards = qsa(".additional-poc-card", grid);
        pocCards.forEach((card) => {
          if (card.dataset.base === "true") clearInputsInContainer(card);
          else card.remove();
        });
      }
    }

    // Special: Additional Trainers — clear added rows in container if present
    if (section.id === "onsite-trainers-cem") {
      qs("#additionalTrainersContainer", section)?.replaceChildren();
    }

    initAllSelectPlaceholders();
  }

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

      // Integrated-plus add (+)
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

      // Placeholder styling for dropdowns
      if (sel && sel.tagName === "SELECT") {
        setSelectPlaceholderState(sel);
      }

      // Ticket status changes → move card
      if (sel && sel.classList && sel.classList.contains("ticket-status-select")) {
        const group = sel.closest(".ticket-group");
        const status = sel.value;
        moveTicketGroupByStatus(group, status);
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
