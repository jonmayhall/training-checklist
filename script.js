/* ============================================================
   myKaarma Interactive Training Checklist — script.js (FULL)
   Fixes:
   - Pages 8–11 not showing (nav selector + section activation)
   - Add (+) buttons not working (delegation + table/integrated)
   - Reset This Page
   - Dropdown ghost styling matches CSS: select.is-placeholder
============================================================ */

(function () {
  "use strict";

  /* -----------------------------
     Helpers
  ----------------------------- */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function isInsideTable(el) {
    return !!el.closest("table");
  }

  function setSelectPlaceholderState(selectEl) {
    if (!selectEl) return;

    // Only apply to non-table selects (you said no table ghost text)
    if (isInsideTable(selectEl)) return;

    const ghostOption = selectEl.querySelector('option[data-ghost="true"]');
    if (!ghostOption) {
      // If no ghost option exists, never apply placeholder class
      selectEl.classList.remove("is-placeholder");
      return;
    }

    const selected = selectEl.options[selectEl.selectedIndex];
    const isGhost =
      !selectEl.value ||
      (selected && selected.hasAttribute("data-ghost"));

    if (isGhost) selectEl.classList.add("is-placeholder");
    else selectEl.classList.remove("is-placeholder");
  }

  function initAllSelectPlaceholderStates() {
    qsa("select").forEach(setSelectPlaceholderState);
  }

  function clearField(el) {
    if (!el) return;

    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute("type") || "").toLowerCase();

    if (tag === "input") {
      if (type === "checkbox" || type === "radio") el.checked = false;
      else el.value = "";
    } else if (tag === "textarea") {
      el.value = "";
    } else if (tag === "select") {
      el.selectedIndex = 0;
      setSelectPlaceholderState(el);
    }
  }

  function clearContainer(container) {
    if (!container) return;
    qsa("input, textarea, select", container).forEach(clearField);
  }

  function getAllPageSections() {
    // Do NOT assume inside <main> — your CSS/HTML can vary
    return qsa(".page-section");
  }

  function showSectionById(targetId) {
    const target = document.getElementById(targetId);
    if (!target) {
      console.warn("Sidebar target not found:", targetId);
      return;
    }

    getAllPageSections().forEach((sec) => sec.classList.remove("active"));
    target.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setActiveNavButton(clickedBtn) {
    // Clear active on ALL nav buttons in the UI (wherever they live)
    qsa(".nav-btn").forEach((b) => b.classList.remove("active"));
    clickedBtn.classList.add("active");
  }

  function ensureInitialActivePage() {
    const sections = getAllPageSections();
    if (!sections.length) return;

    const existing = sections.find((s) => s.classList.contains("active"));
    if (existing) return;

    const activeBtn = qs(".nav-btn.active");
    if (activeBtn && activeBtn.dataset.target) {
      showSectionById(activeBtn.dataset.target);
      return;
    }

    sections[0].classList.add("active");
  }

  /* -----------------------------
     Add Row: TABLE (+)
     - Button is typically: .table-footer .add-row
  ----------------------------- */
  function addTableRow(addBtn) {
    const tableContainer = addBtn.closest(".table-container");
    if (!tableContainer) return;

    const tbody = qs("table tbody", tableContainer);
    if (!tbody) return;

    const baseRow = tbody.querySelector("tr") || tbody.lastElementChild;
    if (!baseRow) return;

    const clone = baseRow.cloneNode(true);

    // Clear all fields in cloned row
    qsa("input, textarea, select", clone).forEach((el) => clearField(el));

    // IMPORTANT: Do NOT add placeholder styling inside tables
    // (CSS already forces table selects to normal ink)

    tbody.appendChild(clone);
  }

  /* -----------------------------
     Add Row: INTEGRATED PLUS (+)
     - For rows like phone/additional field lines
     - Structure: .checklist-row.integrated-plus > input + button.add-row
  ----------------------------- */
  function addIntegratedPlusRow(addBtn) {
    const row = addBtn.closest(".checklist-row.integrated-plus");
    if (!row) return;

    const clone = row.cloneNode(true);

    // Remove any existing values in inputs/selects
    qsa("input, textarea, select", clone).forEach((el) => clearField(el));

    // Put clone right after current row
    row.insertAdjacentElement("afterend", clone);
  }

  /* -----------------------------
     Support Ticket Add (+)
  ----------------------------- */
  function addSupportTicket(addBtn) {
    const openContainer = qs("#openTicketsContainer");
    if (!openContainer) return;

    const baseGroup = openContainer.querySelector(".ticket-group[data-base='true']");
    if (!baseGroup) return;

    const clone = baseGroup.cloneNode(true);
    clone.removeAttribute("data-base");

    clearContainer(clone);

    // Default status to Open
    const statusSel = qs(".ticket-status-select", clone);
    if (statusSel) statusSel.value = "Open";

    openContainer.appendChild(clone);
  }

  /* -----------------------------
     Reset This Page
  ----------------------------- */
  function resetPage(sectionEl) {
    if (!sectionEl) return;

    // Clear inputs/selects/textareas
    clearContainer(sectionEl);

    // Reset tables to first row only
    qsa("table.training-table tbody", sectionEl).forEach((tbody) => {
      const rows = qsa("tr", tbody);
      if (rows.length > 1) rows.slice(1).forEach((r) => r.remove());
      if (rows[0]) clearContainer(rows[0]);
    });

    // Reset support tickets containers
    const open = qs("#openTicketsContainer", sectionEl);
    if (open) {
      qsa(".ticket-group", open).forEach((group) => {
        if (group.getAttribute("data-base") === "true") {
          clearContainer(group);
          const statusSel = qs(".ticket-status-select", group);
          if (statusSel) statusSel.value = "Open";
        } else {
          group.remove();
        }
      });
    }

    ["tierTwoTicketsContainer", "closedResolvedTicketsContainer", "closedFeatureTicketsContainer"].forEach((id) => {
      const c = qs(`#${id}`, sectionEl);
      if (c) c.innerHTML = "";
    });

    // Re-apply dropdown placeholder styling
    initAllSelectPlaceholderStates();
  }

  /* -----------------------------
     Delegated Events (KEY FIX)
  ----------------------------- */
  function bindDelegatedEvents() {
    document.addEventListener("click", (e) => {
      // NAV
      const navBtn = e.target.closest(".nav-btn");
      if (navBtn && navBtn.dataset && navBtn.dataset.target) {
        setActiveNavButton(navBtn);
        showSectionById(navBtn.dataset.target);
        return;
      }

      // RESET THIS PAGE
      const resetBtn = e.target.closest(".clear-page-btn");
      if (resetBtn) {
        const section = resetBtn.closest(".page-section");
        resetPage(section);
        return;
      }

      // SUPPORT TICKETS ADD (+)
      const addTicketBtn = e.target.closest(".add-ticket-btn");
      if (addTicketBtn) {
        addSupportTicket(addTicketBtn);
        return;
      }

      // ADD ROW (+) — handle both table-footer and integrated-plus
      const addRowBtn = e.target.closest("button.add-row");
      if (addRowBtn) {
        if (addRowBtn.closest(".table-footer")) addTableRow(addRowBtn);
        else if (addRowBtn.closest(".checklist-row.integrated-plus")) addIntegratedPlusRow(addRowBtn);
        else if (addRowBtn.closest(".table-container")) addTableRow(addRowBtn); // fallback
        return;
      }
    });

    // SELECT placeholder styling
    document.addEventListener("change", (e) => {
      const sel = e.target.closest("select");
      if (!sel) return;
      setSelectPlaceholderState(sel);
    });
  }

  /* -----------------------------
     Google Places callback safety
  ----------------------------- */
  window.initAddressAutocomplete = function () {
    try {
      if (!window.google || !google.maps || !google.maps.places) return;
      // Hook up specific inputs here if needed
    } catch (err) {
      console.warn("initAddressAutocomplete error:", err);
    }
  };

  /* -----------------------------
     Init
  ----------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindDelegatedEvents();
    initAllSelectPlaceholderStates();
    ensureInitialActivePage();
  });
})();
