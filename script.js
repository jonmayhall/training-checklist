/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   - Sidebar nav (Pages 1–11)
   - Add row buttons (tables + integrated-plus rows)
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
    qsa('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="date"]', container)
      .forEach((i) => {
        // Keep hidden/system inputs untouched if any
        if (i.type === "date") i.value = "";
        else i.value = "";
      });

    // Textareas
    qsa("textarea", container).forEach((t) => (t.value = ""));

    // Selects
    qsa("select", container).forEach((s) => {
      // If you have a ghost option with value="", this will select it
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

  /* -------------------------
     Integrated “+” Rows (non-table)
     - clones the checklist-row.integrated-plus
  ------------------------- */
  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    const clone = row.cloneNode(true);

     // In the cloned row, REMOVE any add/remove buttons (no + or – on added rows)
    clone.querySelectorAll(".add-row, .remove-row").forEach(btn => btn.remove());

    // Clear clone input values
    clearInputsInContainer(clone);

    // Insert after the last integrated-plus row in this section-block
    const parent = row.parentElement;
    if (!parent) return;

    const siblings = qsa(".checklist-row.integrated-plus", parent);
    const last = siblings[siblings.length - 1] || row;
    last.insertAdjacentElement("afterend", clone);
  }

  /* -------------------------
     Table “+” Row Buttons
     - expects button inside .table-footer .add-row
     - clones last tbody row
  ------------------------- */
  function addTableRow(addBtn) {
    const footer = addBtn.closest(".table-footer");
    if (!footer) return;

    // Look upward for the nearest table-container, then find tbody
    const tableContainer = footer.closest(".table-container");
    if (!tableContainer) return;

    const table = qs("table.training-table", tableContainer);
    const tbody = table ? qs("tbody", table) : null;
    if (!tbody) return;

    const rows = qsa("tr", tbody);
    if (rows.length === 0) return;

    const lastRow = rows[rows.length - 1];
    const clone = lastRow.cloneNode(true);

    // Clear inputs/selects/checkboxes inside cloned row
    clearInputsInContainer(clone);

    tbody.appendChild(clone);

    // Re-apply dropdown placeholder style
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

    // Ensure there is only ONE badge at the top
    const existingBadge = qs(".ticket-badge", ticketGroup);
    if (existingBadge) existingBadge.remove();

    const badge = buildTicketBadge(`Status: ${ticketBadgeTextForStatus(status)}`);
    ticketGroup.insertAdjacentElement("afterbegin", badge);

    // Move to correct container
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

  function addSupportTicketCard(addBtn) {
    const baseGroup = addBtn.closest(".ticket-group");
    if (!baseGroup) return;

    const containers = getTicketContainers();
    if (!containers.open) return;

    // Clone base group
    const clone = baseGroup.cloneNode(true);
    clone.removeAttribute("data-base");

    // Remove the + button from cloned card (only base card should have +)
    const plus = qs(".add-ticket-btn", clone);
    if (plus) plus.remove();

    // Clear inputs
    clearInputsInContainer(clone);

    // Default status to Open if present
    const statusSelect = qs(".ticket-status-select", clone);
    if (statusSelect) {
      statusSelect.value = "Open";
      setSelectPlaceholderState(statusSelect);
    }

    // Add badge + remove button
    const badge = buildTicketBadge("Status: Open");
    clone.insertAdjacentElement("afterbegin", badge);
    addRemoveTicketBtn(clone);

    // Append to open container
    containers.open.appendChild(clone);

    // Auto-size summary textarea
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

    // Clear the section inputs
    clearInputsInContainer(section);

    // Special: support tickets — remove all extra cards and clear base card fields
    if (section.id === "support-tickets") {
      // Remove all ticket-group except base group
      const allGroups = qsa(".ticket-group", section);
      allGroups.forEach((g) => {
        if (g.dataset.base === "true") {
          clearInputsInContainer(g);
          // reset base status to Open if present
          const s = qs(".ticket-status-select", g);
          if (s) s.value = "Open";
        } else {
          g.remove();
        }
      });

      // Clear other containers
      qs("#tierTwoTicketsContainer")?.replaceChildren();
      qs("#closedResolvedTicketsContainer")?.replaceChildren();
      qs("#closedFeatureTicketsContainer")?.replaceChildren();
    }

    // Re-init placeholder states
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

      // Integrated-plus add
      const addRowBtn = e.target.closest(".checklist-row.integrated-plus .add-row");
      if (addRowBtn) {
        addIntegratedPlusRow(addRowBtn);
        return;
      }

       function removeIntegratedRow(removeBtn) {
    const row = removeBtn.closest(".checklist-row.integrated-plus");
    if (row) row.remove();
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
     Init (must run after DOM)
  ------------------------- */
  function init() {
    bindDelegatedEvents();
    initAllSelectPlaceholders();

    // Ensure one section is visible on load (first .nav-btn.active or first section)
    const activeBtn = qs("#sidebar .nav-btn.active") || qs("#sidebar .nav-btn");
    if (activeBtn) handleSidebarClick(activeBtn);

    // Autosize any existing ticket summary textareas
    qsa(".ticket-summary-input").forEach(autosizeTextarea);
  }

  // IMPORTANT: ensure JS runs AFTER HTML exists
  document.addEventListener("DOMContentLoaded", init);
})();
