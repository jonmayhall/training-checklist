/* ============================================================
   myKaarma Interactive Training Checklist — script.js
   Fixes:
   - Sidebar nav Pages 1–11 not showing
   - Add-row (+) buttons not working
   - Reset This Page
   - Grey ghost text on NON-table dropdowns only
   - Google Places init safety
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

  function setSelectGhostState(selectEl) {
    // Only applies to selects that have an option marked data-ghost="true"
    if (!selectEl) return;
    const ghostOption = selectEl.querySelector('option[data-ghost="true"]');
    if (!ghostOption) return;

    // If current value is empty or selected option is the ghost option
    const selected = selectEl.options[selectEl.selectedIndex];
    const isGhost = !selectEl.value || (selected && selected.hasAttribute("data-ghost"));

    if (isGhost) selectEl.classList.add("is-ghost");
    else selectEl.classList.remove("is-ghost");
  }

  function initGhostSelects() {
    // Apply to selects OUTSIDE tables only
    qsa("select").forEach((sel) => {
      if (isInsideTable(sel)) return; // your rule: no ghost styling in tables
      setSelectGhostState(sel);
    });
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
      // Reset to first option (usually blank/ghost)
      el.selectedIndex = 0;
      // Apply ghost style if relevant and not in table
      if (!isInsideTable(el)) setSelectGhostState(el);
    }
  }

  function clearContainer(container) {
    if (!container) return;
    qsa("input, textarea, select", container).forEach(clearField);
  }

  function getAllPageSections() {
    // Don’t assume they’re inside <main>
    return qsa(".page-section");
  }

  function showSectionById(targetId) {
    const sections = getAllPageSections();
    const target = document.getElementById(targetId);

    if (!target) {
      console.warn("Section not found for id:", targetId);
      return;
    }

    sections.forEach((sec) => sec.classList.remove("active"));
    target.classList.add("active");

    // scroll to top so it feels consistent
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setActiveNavButton(btn) {
    // Works for any sidebar container
    qsa("#sidebar .nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }

  function ensureInitialActivePage() {
    const sections = getAllPageSections();
    if (!sections.length) return;

    const alreadyActive = sections.find((s) => s.classList.contains("active"));
    if (alreadyActive) return;

    // If a nav button is active, use it
    const activeBtn = qs("#sidebar .nav-btn.active");
    if (activeBtn && activeBtn.dataset.target) {
      showSectionById(activeBtn.dataset.target);
      return;
    }

    // Otherwise show the first section
    sections[0].classList.add("active");
  }

  /* -----------------------------
     Add Row (+) for tables
     - Works via event delegation
  ----------------------------- */
  function handleAddRowClick(buttonEl) {
    const tableContainer = buttonEl.closest(".table-container");
    if (!tableContainer) return;

    const table = qs("table", tableContainer);
    const tbody = table ? qs("tbody", table) : null;
    if (!tbody) return;

    // Choose a base row to clone:
    // Prefer first row in tbody (stable), otherwise last row
    const baseRow = tbody.querySelector("tr") || tbody.lastElementChild;
    if (!baseRow) return;

    const clone = baseRow.cloneNode(true);

    // Clear all fields in the cloned row
    qsa("input, textarea, select", clone).forEach((el) => {
      clearField(el);

      // IMPORTANT: No table ghost placeholders — so do NOT add class is-ghost here.
      // (We also don’t run ghost logic inside tables)
    });

    tbody.appendChild(clone);
  }

  /* -----------------------------
     Support Ticket "Add" (+)
  ----------------------------- */
  function handleAddTicketClick(btn) {
    const openContainer = qs("#openTicketsContainer");
    if (!openContainer) return;

    const baseGroup = openContainer.querySelector(".ticket-group[data-base='true']");
    if (!baseGroup) return;

    const clone = baseGroup.cloneNode(true);
    clone.removeAttribute("data-base");

    // Clear fields inside clone
    qsa("input, textarea, select", clone).forEach((el) => {
      clearField(el);
    });

    // Default status to Open if that select exists
    const statusSel = qs(".ticket-status-select", clone);
    if (statusSel) statusSel.value = "Open";

    openContainer.appendChild(clone);
  }

  /* -----------------------------
     Reset This Page
     - Clears inputs/selects/textareas
     - Removes extra cloned rows in tables
     - Keeps first row in each table
     - Resets support tickets containers to base only
  ----------------------------- */
  function resetPage(sectionEl) {
    if (!sectionEl) return;

    // 1) Clear all standard inputs
    clearContainer(sectionEl);

    // 2) Reset each table body to only its first row
    qsa("table.training-table tbody", sectionEl).forEach((tbody) => {
      const rows = qsa("tr", tbody);
      if (rows.length <= 1) return;

      // Keep first row, remove the rest
      rows.slice(1).forEach((r) => r.remove());

      // Clear first row too
      clearContainer(rows[0]);
    });

    // 3) Support tickets: keep only base group in Open, clear other status containers
    const open = qs("#openTicketsContainer", sectionEl);
    if (open) {
      qsa(".ticket-group", open).forEach((group) => {
        if (group.getAttribute("data-base") === "true") {
          clearContainer(group);
          // restore default status
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

    // 4) Re-apply ghost styling on non-table selects
    initGhostSelects();
  }

  /* -----------------------------
     Event Delegation (KEY FIX)
     - Makes nav + add buttons work always
  ----------------------------- */
  function bindDelegatedEvents() {
    document.addEventListener("click", (e) => {
      const navBtn = e.target.closest("#sidebar .nav-btn");
      if (navBtn) {
        const targetId = navBtn.dataset.target;

        if (!targetId) {
          console.warn("Nav button missing data-target:", navBtn);
          return;
        }

        setActiveNavButton(navBtn);
        showSectionById(targetId);
        return;
      }

      const addRowBtn = e.target.closest("button.add-row");
      if (addRowBtn) {
        handleAddRowClick(addRowBtn);
        return;
      }

      const addTicketBtn = e.target.closest("button.add-ticket-btn");
      if (addTicketBtn) {
        handleAddTicketClick(addTicketBtn);
        return;
      }

      const resetBtn = e.target.closest("button.clear-page-btn");
      if (resetBtn) {
        const section = resetBtn.closest(".page-section");
        resetPage(section);
        return;
      }
    });

    // Dropdown ghost styling: delegated change
    document.addEventListener("change", (e) => {
      const sel = e.target.closest("select");
      if (!sel) return;
      if (isInsideTable(sel)) return; // no table ghost behavior
      setSelectGhostState(sel);
    });
  }

  /* -----------------------------
     Google Places Autocomplete
     (safe/no-crash if missing)
  ----------------------------- */
  window.initAddressAutocomplete = function () {
    try {
      if (!window.google || !google.maps || !google.maps.places) return;

      // If you have specific address inputs, target them here by id/class
      // Example:
      // const addr = document.getElementById("dealershipAddress");
      // if (addr) new google.maps.places.Autocomplete(addr);

    } catch (err) {
      console.warn("initAddressAutocomplete error:", err);
    }
  };

  /* -----------------------------
     Init
  ----------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindDelegatedEvents();
    initGhostSelects();
    ensureInitialActivePage();

    // IMPORTANT: If your CSS hides all .page-section by default and only shows .active,
    // this guarantees at least one page shows.
  });
})();
