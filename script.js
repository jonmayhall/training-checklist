/* =========================================================
   myKaarma Interactive Training Checklist — script.js
   Updates included:
   - Sidebar nav now supports Pages 1–11 (any .page-section with matching id)
   - Prevents “double add” issues by using event delegation (single listener)
   - Add-row cloning for tables (+)
   - Support Tickets: add new ticket group (+), move tickets by Status
   - Reset This Page clears inputs/selects/textareas and removes added rows/groups
   - Ghost/grey dropdown behavior ONLY for selects that have data-ghost options
     (and it skips all selects inside tables to honor “no ghost text on tables”)
   - Google Places address autocomplete hook (safe/no-op if not available)
========================================================= */

(() => {
  "use strict";

  /* -----------------------------
     Helpers
  ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const isInTable = (el) => !!el.closest("table");

  const clearControl = (el) => {
    if (!el) return;

    const tag = el.tagName?.toLowerCase();

    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox" || type === "radio") el.checked = false;
      else el.value = "";
      return;
    }

    if (tag === "textarea") {
      el.value = "";
      return;
    }

    if (tag === "select") {
      // Reset to first option
      el.selectedIndex = 0;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
  };

  const sectionFromButton = (btn) => {
    const targetId = btn?.dataset?.target;
    if (!targetId) return null;
    return document.getElementById(targetId) || null;
  };

  /* -----------------------------
     Sidebar Navigation (Pages 1–11)
  ----------------------------- */
  const setActiveSection = (targetId) => {
    const targetSection = document.getElementById(targetId);
    if (!targetSection) {
      console.warn("Sidebar target not found:", targetId);
      return;
    }

    // Buttons
    $$("#sidebar .nav-btn").forEach((b) => b.classList.remove("active"));
    const matchingBtn = $(`#sidebar .nav-btn[data-target="${CSS.escape(targetId)}"]`);
    if (matchingBtn) matchingBtn.classList.add("active");

    // Sections
    $$("main .page-section").forEach((sec) => sec.classList.remove("active"));
    targetSection.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const initSidebarNav = () => {
    const sidebar = $("#sidebar");
    if (!sidebar) return;

    // Single delegated listener prevents duplicate bindings
    sidebar.addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-btn");
      if (!btn) return;

      const targetId = btn.dataset.target;
      if (!targetId) return;

      setActiveSection(targetId);
    });

    // Initial active: if there is already an active button, honor it; else first button
    const activeBtn = $("#sidebar .nav-btn.active") || $("#sidebar .nav-btn");
    const activeSection = sectionFromButton(activeBtn);
    if (activeBtn && activeSection) setActiveSection(activeSection.id);
  };

  /* -----------------------------
     Ghost/Grey Dropdown Text (no tables)
     Rule: Only selects that have <option data-ghost="true"> should get ghost styling.
           And we skip all selects inside tables.
  ----------------------------- */
  const syncGhostSelect = (selectEl) => {
    if (!selectEl || selectEl.tagName.toLowerCase() !== "select") return;
    if (isInTable(selectEl)) return;

    const ghostOption = selectEl.querySelector('option[data-ghost="true"]');
    if (!ghostOption) return;

    const isGhostSelected =
      selectEl.selectedIndex === 0 &&
      selectEl.options[0] &&
      selectEl.options[0].hasAttribute("data-ghost");

    selectEl.classList.toggle("is-ghost", isGhostSelected);
    selectEl.classList.toggle("has-value", !isGhostSelected);
  };

  const initGhostSelects = () => {
    $$("select").forEach((sel) => syncGhostSelect(sel));

    document.addEventListener("change", (e) => {
      const sel = e.target.closest("select");
      if (!sel) return;
      syncGhostSelect(sel);
    });
  };

  /* -----------------------------
     Add Row (+) for tables
     - clones last row in tbody of the nearest .table-container
     - clears all inputs/selects/textareas in that cloned row
  ----------------------------- */
  const cloneTableRow = (btn) => {
    const container = btn.closest(".table-container");
    if (!container) return;

    const table = $("table", container);
    const tbody = table ? $("tbody", table) : null;
    if (!tbody) return;

    const rows = $$("tr", tbody);
    if (rows.length === 0) return;

    const sourceRow = rows[rows.length - 1];
    const newRow = sourceRow.cloneNode(true);

    // Clear cloned row controls
    $$("input, textarea, select", newRow).forEach((el) => clearControl(el));

    tbody.appendChild(newRow);
  };

  /* -----------------------------
     Reset This Page
     - clears all inputs/selects/textareas in the section
     - resets selects to first option
     - removes extra rows (keeps the first 1 row in each table body)
     - support tickets: keeps base group only in Open container
  ----------------------------- */
  const resetSection = (sectionEl) => {
    if (!sectionEl) return;

    // Clear all controls
    $$("input, textarea, select", sectionEl).forEach((el) => clearControl(el));

    // Remove extra table rows (keep first row)
    $$("table.training-table tbody", sectionEl).forEach((tbody) => {
      const rows = $$("tr", tbody);
      rows.slice(1).forEach((r) => r.remove());
    });

    // Support tickets reset behavior
    const open = $("#openTicketsContainer", sectionEl);
    const tier2 = $("#tierTwoTicketsContainer", sectionEl);
    const closedResolved = $("#closedResolvedTicketsContainer", sectionEl);
    const closedFeature = $("#closedFeatureTicketsContainer", sectionEl);

    if (tier2) tier2.innerHTML = "";
    if (closedResolved) closedResolved.innerHTML = "";
    if (closedFeature) closedFeature.innerHTML = "";

    if (open) {
      // Keep only the base group, remove the rest
      const groups = $$(".ticket-group", open);
      groups.forEach((g) => {
        if (g.dataset.base === "true") return;
        g.remove();
      });

      // Ensure base group fields are cleared and status is Open
      const base = $('.ticket-group[data-base="true"]', open);
      if (base) {
        $$("input, textarea, select", base).forEach((el) => clearControl(el));
        const status = $(".ticket-status-select", base);
        if (status) {
          status.value = "Open";
          status.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }

    // Re-sync ghost selects in this section
    $$("select", sectionEl).forEach((sel) => syncGhostSelect(sel));
  };

  const initResetButtons = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".clear-page-btn");
      if (!btn) return;

      const section = btn.closest(".page-section");
      resetSection(section);
    });
  };

  /* -----------------------------
     Support Tickets
     - Add ticket group (+ button) in Open Tickets
     - Move ticket groups between containers when Status changes
  ----------------------------- */
  const getTicketContainers = () => ({
    open: $("#openTicketsContainer"),
    tier2: $("#tierTwoTicketsContainer"),
    closedResolved: $("#closedResolvedTicketsContainer"),
    closedFeature: $("#closedFeatureTicketsContainer"),
  });

  const destinationForStatus = (statusValue) => {
    const c = getTicketContainers();
    if (!c.open) return null;

    if (statusValue === "Tier Two") return c.tier2 || c.open;
    if (statusValue === "Closed - Resolved") return c.closedResolved || c.open;
    if (statusValue === "Closed – Feature Not Supported") return c.closedFeature || c.open;

    // Default: Open
    return c.open;
  };

  const addSupportTicketGroup = (btn) => {
    const c = getTicketContainers();
    if (!c.open) return;

    const base = $('.ticket-group[data-base="true"]', c.open);
    if (!base) {
      console.warn("Base ticket group not found in openTicketsContainer");
      return;
    }

    const clone = base.cloneNode(true);
    clone.dataset.base = "false";

    // Clear fields
    $$("input, textarea, select", clone).forEach((el) => clearControl(el));

    // Default status Open
    const status = $(".ticket-status-select", clone);
    if (status) status.value = "Open";

    // Append to Open container
    c.open.appendChild(clone);

    // Re-sync ghost selects in clone (if any)
    $$("select", clone).forEach((sel) => syncGhostSelect(sel));
  };

  const initSupportTickets = () => {
    // One delegated click handler for add-ticket-btn prevents “adds two”
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-ticket-btn");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      addSupportTicketGroup(btn);
    });

    // Move tickets based on Status selection
    document.addEventListener("change", (e) => {
      const sel = e.target.closest(".ticket-status-select");
      if (!sel) return;

      const group = sel.closest(".ticket-group");
      if (!group) return;

      const dest = destinationForStatus(sel.value);
      if (!dest) return;

      dest.appendChild(group);
    });
  };

  /* -----------------------------
     Google Places Autocomplete (safe/no-op)
     - Attaches to any input with class "address-autocomplete"
       OR any input with data-address-autocomplete="true"
  ----------------------------- */
  window.initAddressAutocomplete = function initAddressAutocomplete() {
    try {
      if (!window.google?.maps?.places?.Autocomplete) return;

      const inputs = [
        ...$$('input.address-autocomplete'),
        ...$$('input[data-address-autocomplete="true"]'),
      ];

      inputs.forEach((input) => {
        // prevent double-binding
        if (input.dataset.placesBound === "true") return;

        const ac = new google.maps.places.Autocomplete(input, {
          types: ["address"],
          componentRestrictions: { country: "us" },
        });

        // If you want formatted address on selection:
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (place?.formatted_address) input.value = place.formatted_address;
        });

        input.dataset.placesBound = "true";
      });
    } catch (err) {
      console.warn("initAddressAutocomplete error:", err);
    }
  };

  /* -----------------------------
     Global delegated handler for table add-row (+)
     (single listener = no duplicates)
  ----------------------------- */
  const initAddRowButtons = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button.add-row");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      cloneTableRow(btn);
    });
  };

  /* -----------------------------
     Init
  ----------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initSidebarNav();
    initResetButtons();
    initAddRowButtons();
    initSupportTickets();
    initGhostSelects();

    // If any section is already marked active in HTML, ensure sidebar button matches
    const activeSection = $("main .page-section.active");
    if (activeSection) {
      const btn = $(`#sidebar .nav-btn[data-target="${CSS.escape(activeSection.id)}"]`);
      if (btn) {
        $$("#sidebar .nav-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
    }
  });
})();
