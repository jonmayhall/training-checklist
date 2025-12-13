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

    qsa(
      'input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="date"]',
      container
    ).forEach((i) => (i.value = ""));

    qsa("textarea", container).forEach((t) => (t.value = ""));

    qsa("select", container).forEach((s) => {
      const ghost = qs('option[value=""][data-ghost="true"], option[value=""]', s);
      if (ghost) s.value = "";
      else s.selectedIndex = 0;
      setSelectPlaceholderState(s);
    });

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

  // Decide if THIS integrated-plus row should clone as a NORMAL row (no button)
  // We key off the placeholder text so you don't have to change HTML.
  function shouldCloneAsPlainRow(row) {
    const input = qs('input[type="text"], input[type="tel"], textarea', row);
    const ph = (input?.getAttribute("placeholder") || "").toLowerCase();

    // Add any other phrases you want treated as "plain clones"
    if (ph.includes("additional trainer")) return true;
    if (ph.includes("additional poc")) return true;

    return false;
  }

  function forceFullyRoundedInputs(container) {
    // Hard reset corners so nothing stays "flat"
    qsa('input[type="text"], input[type="tel"], textarea', container).forEach((el) => {
      el.style.borderRadius = "999px";
      el.style.borderTopLeftRadius = "999px";
      el.style.borderBottomLeftRadius = "999px";
      el.style.borderTopRightRadius = "999px";
      el.style.borderBottomRightRadius = "999px";
    });
  }

  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    const clone = row.cloneNode(true);
    clearInputsInContainer(clone);

    // If this row should produce a NORMAL textbox (no + / –)
    if (shouldCloneAsPlainRow(row)) {
      // Remove any integrated button(s)
      clone.querySelectorAll(".add-row, .remove-row").forEach((btn) => btn.remove());

      // CRITICAL: stop integrated-plus styling in CSS
      clone.classList.remove("integrated-plus");

      // Ensure textbox is fully rounded
      forceFullyRoundedInputs(clone);
    } else {
      // Normal behavior: swap + to –
      const cloneBtn = qs(".add-row", clone);
      if (cloneBtn) {
        cloneBtn.textContent = "–";
        cloneBtn.title = "Remove";
        cloneBtn.classList.add("remove-row");
        // Keep .add-row for your orange styling; remove handler keys off .remove-row
      }
    }

    const parent = row.parentElement;
    if (!parent) return;

    const siblings = qsa(".checklist-row", parent);
    const last = siblings[siblings.length - 1] || row;
    last.insertAdjacentElement("afterend", clone);
  }

  function removeIntegratedRow(removeBtn) {
    // Remove only the row that has the remove button
    const row = removeBtn.closest(".checklist-row");
    if (row) row.remove();
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
     Global Click + Change Delegation
  ------------------------- */
  function bindDelegatedEvents() {
    document.addEventListener("click", (e) => {
      const navBtn = e.target.closest("#sidebar .nav-btn");
      if (navBtn) return void handleSidebarClick(navBtn);

      const resetBtn = e.target.closest(".clear-page-btn");
      if (resetBtn) return void resetThisPage(resetBtn);

      const addTicketBtn = e.target.closest(".add-ticket-btn");
      if (addTicketBtn) return void addSupportTicketCard(addTicketBtn);

      const removeTicketBtn = e.target.closest(".remove-ticket-btn");
      if (removeTicketBtn) {
        removeTicketBtn.closest(".ticket-group")?.remove();
        return;
      }

      // Integrated-plus remove (the "–" button)
      const removeRowBtn = e.target.closest(".checklist-row .remove-row");
      if (removeRowBtn) {
        removeIntegratedRow(removeRowBtn);
        return;
      }

      // Integrated-plus add (the "+" button)
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
