/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   VERSION: 2025-12-12A (integrated-plus fixed)
   ========================================================= */

(function () {
  "use strict";

  console.log("script.js loaded — VERSION 2025-12-12A");

  /* -------------------------
     Helpers
  ------------------------- */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function isInTrainingTable(el) {
    return !!el.closest(".training-table");
  }

  function setSelectPlaceholderState(select) {
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

  /* -------------------------
     Integrated “+” Rows (non-table)

     RULES:
     - Lead & Additional Trainers: cloned rows get NO button (normal textbox)
     - Everywhere else: cloned rows convert + → – BUT keep .add-row for orange styling
  ------------------------- */
  function isLeadAdditionalTrainersBlock(rowEl) {
    // Put your trainer section container class/id here if you have one.
    // This safely detects the section by the header text you showed: "Lead & Additional Trainers"
    const block = rowEl.closest(".section-block, .section, .card, .orange-outline-card") || rowEl.parentElement;
    const headerText = (block?.innerText || "").toLowerCase();
    return headerText.includes("lead & additional trainers") || headerText.includes("lead and additional trainers");
  }

  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    const clone = row.cloneNode(true);

    if (isLeadAdditionalTrainersBlock(row)) {
      // ✅ Additional Trainer clones should be NORMAL textboxes: remove any buttons completely
      qsa(".add-row, .remove-row, button", clone).forEach((b) => {
        // only remove buttons that are part of the integrated-plus UI
        if (b.classList.contains("add-row") || b.classList.contains("remove-row") || b.type === "button") {
          b.remove();
        }
      });
    } else {
      // ✅ Default integrated-plus behavior: swap + to – on clone but KEEP .add-row for styling
      const cloneBtn = qs(".add-row", clone);
      if (cloneBtn) {
        cloneBtn.textContent = "–";
        cloneBtn.title = "Remove";
        cloneBtn.classList.add("remove-row");
        // DO NOT remove .add-row (styling depends on it)
      }
    }

    clearInputsInContainer(clone);

    const parent = row.parentElement;
    if (!parent) return;

    const siblings = qsa(".checklist-row.integrated-plus", parent);
    const last = siblings[siblings.length - 1] || row;
    last.insertAdjacentElement("afterend", clone);
  }

  function removeIntegratedRow(removeBtn) {
    const row = removeBtn.closest(".checklist-row.integrated-plus");
    if (row) row.remove();
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

    qs(".ticket-badge", ticketGroup)?.remove();

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

    qs(".add-ticket-btn", clone)?.remove();

    clearInputsInContainer(clone);

    const statusSelect = qs(".ticket-status-select", clone);
    if (statusSelect) {
      statusSelect.value = "Open";
      setSelectPlaceholderState(statusSelect);
    }

    clone.insertAdjacentElement("afterbegin", buildTicketBadge("Status: Open"));
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
     Delegated Events
  ------------------------- */
  function bindDelegatedEvents() {
    document.addEventListener("click", (e) => {
      const navBtn = e.target.closest("#sidebar .nav-btn");
      if (navBtn) return handleSidebarClick(navBtn);

      const resetBtn = e.target.closest(".clear-page-btn");
      if (resetBtn) return resetThisPage(resetBtn);

      const addTicketBtn = e.target.closest(".add-ticket-btn");
      if (addTicketBtn) return addSupportTicketCard(addTicketBtn);

      const removeTicketBtn = e.target.closest(".remove-ticket-btn");
      if (removeTicketBtn) {
        removeTicketBtn.closest(".ticket-group")?.remove();
        return;
      }

      // ✅ Integrated-plus remove FIRST (remove buttons still have .add-row for styling)
      const removeRowBtn = e.target.closest(".checklist-row.integrated-plus .remove-row");
      if (removeRowBtn) return removeIntegratedRow(removeRowBtn);

      // Integrated-plus add
      const addRowBtn = e.target.closest(".checklist-row.integrated-plus .add-row");
      if (addRowBtn) return addIntegratedPlusRow(addRowBtn);

      // Table add-row
      const tableAddBtn = e.target.closest(".table-footer .add-row");
      if (tableAddBtn) return addTableRow(tableAddBtn);
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
      if (ta && ta.classList && ta.classList.contains("ticket-summary-input")) autosizeTextarea(ta);
    });
  }

  function init() {
    bindDelegatedEvents();
    initAllSelectPlaceholders();

    const activeBtn = qs("#sidebar .nav-btn.active") || qs("#sidebar .nav-btn");
    if (activeBtn) handleSidebarClick(activeBtn);

    qsa(".ticket-summary-input").forEach(autosizeTextarea);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
