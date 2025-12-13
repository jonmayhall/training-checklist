/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
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
    if (!targetSection) return;

    ensureOnlyOneActiveNav(btn);
    ensureOnlyOneActiveSection(targetSection);
  }

  /* -------------------------
     Integrated “+” Rows (non-table)
  ------------------------- */

  function getPlaceholderTextFromRow(row) {
    const field =
      qs('input[type="text"], input[type="tel"], textarea', row) ||
      qs("select", row);
    return (field?.getAttribute("placeholder") || "").toLowerCase();
  }

  function isAdditionalPocRow(row) {
    const ph = getPlaceholderTextFromRow(row);
    return ph.includes("additional poc");
  }

  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    // ✅ SPECIAL CASE: "Additional POC" clones the ENTIRE mini-card
    if (isAdditionalPocRow(row) && row.closest(".mini-card")) {
      addAdditionalPocCard(addBtn);
      return;
    }

    // Default behavior: clone just the row and turn + into –
    const clone = row.cloneNode(true);
    clearInputsInContainer(clone);

    const cloneBtn = qs(".add-row", clone);
    if (cloneBtn) {
      cloneBtn.textContent = "–";
      cloneBtn.title = "Remove";
      cloneBtn.classList.add("remove-row");
      // keep .add-row for styling if you want; remove logic keys off .remove-row
    }

    const parent = row.parentElement;
    if (!parent) return;

    const siblings = qsa(".checklist-row.integrated-plus", parent);
    const last = siblings[siblings.length - 1] || row;
    last.insertAdjacentElement("afterend", clone);
  }

  function removeIntegratedRow(removeBtn) {
    // If the remove button is inside a mini-card "Additional POC", remove the whole card
    const mini = removeBtn.closest(".mini-card");
    const row = removeBtn.closest(".checklist-row.integrated-plus");
    const ph = row ? getPlaceholderTextFromRow(row) : "";

    if (mini && ph.includes("additional poc")) {
      mini.remove();
      return;
    }

    // Otherwise remove just the row
    const r = removeBtn.closest(".checklist-row.integrated-plus");
    if (r) r.remove();
  }

  // ✅ Clone entire Additional POC mini-card
  function addAdditionalPocCard(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    const miniCard = row?.closest(".mini-card");
    if (!miniCard) return;

    const clone = miniCard.cloneNode(true);
    clearInputsInContainer(clone);

    // In cloned mini-card: convert the top "+" button into a "–" remove button
    const topRow = qs(".checklist-row.integrated-plus", clone);
    const btn = topRow ? qs(".add-row, .remove-row", topRow) : null;
    if (btn) {
      btn.textContent = "–";
      btn.title = "Remove";
      btn.classList.add("remove-row");
      btn.classList.remove("add-row"); // optional
    }

    // Insert cloned mini-card after this one
    miniCard.insertAdjacentElement("afterend", clone);
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

  function autosizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.max(textarea.scrollHeight, 34) + "px";
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
      default:
        return "Open";
    }
  }

  function moveTicketGroupByStatus(ticketGroup, status) {
    const { open, tierTwo, closedResolved, closedFeature } = getTicketContainers();
    if (!ticketGroup) return;

    qs(".ticket-badge", ticketGroup)?.remove();
    ticketGroup.insertAdjacentElement(
      "afterbegin",
      buildTicketBadge(`Status: ${ticketBadgeTextForStatus(status)}`)
    );

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

    qs(".add-ticket-btn", clone)?.remove();
    clearInputsInContainer(clone);

    const statusSelect = qs(".ticket-status-select", clone);
    if (statusSelect) statusSelect.value = "Open";

    clone.insertAdjacentElement("afterbegin", buildTicketBadge("Status: Open"));
    addRemoveTicketBtn(clone);

    containers.open.appendChild(clone);

    const summary = qs(".ticket-summary-input", clone);
    if (summary) autosizeTextarea(summary);
  }

  /* -------------------------
     Reset Page
  ------------------------- */
  function resetThisPage(btn) {
    const section = btn.closest(".page-section");
    if (!section) return;

    clearInputsInContainer(section);

    if (section.id === "support-tickets") {
      qsa(".ticket-group", section).forEach((g) => {
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
      if (navBtn) return void handleSidebarClick(navBtn);

      const resetBtn = e.target.closest(".clear-page-btn");
      if (resetBtn) return void resetThisPage(resetBtn);

      const addTicketBtn = e.target.closest(".add-ticket-btn");
      if (addTicketBtn) return void addSupportTicketCard(addTicketBtn);

      const removeTicketBtn = e.target.closest(".remove-ticket-btn");
      if (removeTicketBtn) return void removeTicketBtn.closest(".ticket-group")?.remove();

      const removeRowBtn = e.target.closest(".remove-row");
      if (removeRowBtn) return void removeIntegratedRow(removeRowBtn);

      const addRowBtn = e.target.closest(".checklist-row.integrated-plus .add-row");
      if (addRowBtn) return void addIntegratedPlusRow(addRowBtn);

      const tableAddBtn = e.target.closest(".table-footer .add-row");
      if (tableAddBtn) return void addTableRow(tableAddBtn);
    });

    document.addEventListener("change", (e) => {
      const sel = e.target;

      if (sel && sel.tagName === "SELECT") setSelectPlaceholderState(sel);

      if (sel && sel.classList && sel.classList.contains("ticket-status-select")) {
        moveTicketGroupByStatus(sel.closest(".ticket-group"), sel.value);
      }
    });

    document.addEventListener("input", (e) => {
      const ta = e.target;
      if (ta && ta.classList && ta.classList.contains("ticket-summary-input")) {
        autosizeTextarea(ta);
      }
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
