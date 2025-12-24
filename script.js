/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Stable + Clean + Fixed
   - Nav clicks work (sidebar -> section)
   - Add Row (+) for tables (clones last row, preserves Notes icon)
   - Additional Trainers (+)
   - Additional POC (+)
   - Support Tickets: add/remove, move by status, base locked to Open
   - Autosave (localStorage) + Reset Page + Clear All
   - Onsite dates: end defaults to start + 2 days
   - PDF export (all pages)  ⚠️ requires jsPDF/html2canvas on page
   - ✅ Notes Linking (📝 icon -> scroll/focus matching Notes block)
   - ✅ Notes bullet insert + spacing (tables + checklist rows)
   - ✅ Table Expand (⤢) opens modal with real table (no cloning)
======================================================= */

(() => {
  "use strict";

  /* =========================
     CONFIG
  ========================= */
  const STORAGE_KEY = "mkInteractiveChecklist_v1";
  const STORAGE_META_KEY = "mkInteractiveChecklist_meta_v1";
  const AUTOSAVE_DEBOUNCE_MS = 450;

  /* =========================
     BOOT
  ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    initSidebarNav();
    initDealershipNameMirror();
    initOnsiteDatesAutoEnd();

    initDynamicAdditionalTrainers();
    initDynamicAdditionalPOCs();

    initTablesAddRowButtons();
    initNotesIconLinking();
    initNotesBulletInsertForTables();

    initSupportTickets();

    initResetPageButtons();
    initClearAllButton();

    initAutosave();
    restoreFromAutosave(); // restore after handlers exist

    initPdfExportButton();

    initTableExpandFeature();
  });

  /* ======================================================
     NAV
  ====================================================== */
  function initSidebarNav() {
    const nav = document.getElementById("sidebar-nav");
    if (!nav) return;

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-btn");
      if (!btn) return;

      const targetId = btn.getAttribute("data-target");
      if (!targetId) return;

      // active button
      nav.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // show section
      document.querySelectorAll(".page-section").forEach((sec) => sec.classList.remove("active"));
      const section = document.getElementById(targetId);
      if (section) section.classList.add("active");

      // scroll top of main content on nav
      const main = document.querySelector("main");
      if (main) main.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ======================================================
     Dealership Name -> Topbar display
  ====================================================== */
  function initDealershipNameMirror() {
    const input = document.getElementById("dealershipNameInput");
    const display = document.getElementById("dealershipNameDisplay");
    if (!input || !display) return;

    const render = () => {
      const v = (input.value || "").trim();
      display.textContent = v ? v : "";
    };

    input.addEventListener("input", render);
    render();
  }

  /* ======================================================
     Onsite Dates: end defaults to start + 2 days
  ====================================================== */
  function initOnsiteDatesAutoEnd() {
    const start = document.getElementById("onsiteStartDate");
    const end = document.getElementById("onsiteEndDate");
    if (!start || !end) return;

    const setPlaceholderClass = (el) => {
      if (!el) return;
      if (el.value) el.classList.remove("is-placeholder");
      else el.classList.add("is-placeholder");
    };

    const addDays = (yyyyMmDd, days) => {
      if (!yyyyMmDd) return "";
      const [y, m, d] = yyyyMmDd.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + days);
      const pad = (n) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    };

    start.addEventListener("change", () => {
      setPlaceholderClass(start);

      // only auto-set end if empty or before start
      if (!end.value) {
        end.value = addDays(start.value, 2);
      } else {
        const s = new Date(start.value);
        const e = new Date(end.value);
        if (e < s) end.value = addDays(start.value, 2);
      }
      setPlaceholderClass(end);
      triggerAutosaveSoon();
    });

    end.addEventListener("change", () => {
      setPlaceholderClass(end);
      triggerAutosaveSoon();
    });

    setPlaceholderClass(start);
    setPlaceholderClass(end);
  }

  /* ======================================================
     Additional Trainers (+)
     Base row has: .checklist-row.integrated-plus.indent-sub[data-base="true"]
     Container: #additionalTrainersContainer
  ====================================================== */
  function initDynamicAdditionalTrainers() {
    const container = document.getElementById("additionalTrainersContainer");
    const baseRow = document.querySelector('#trainers-deployment .checklist-row[data-base="true"]');
    if (!container || !baseRow) return;

    baseRow.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-row");
      if (!btn) return;

      const input = baseRow.querySelector('input[type="text"]');
      if (!input) return;

      // Require base filled before adding
      if (!input.value.trim()) {
        input.focus();
        return;
      }

      const newRow = baseRow.cloneNode(true);
      newRow.removeAttribute("data-base");
      newRow.classList.add("is-clone");

      // remove + button from clones and replace with remove
      const plus = newRow.querySelector(".add-row");
      if (plus) {
        plus.textContent = "–";
        plus.title = "Remove trainer";
        plus.classList.add("remove-row");
        plus.classList.remove("add-row");
      }

      // Clear cloned input
      const newInput = newRow.querySelector('input[type="text"]');
      if (newInput) newInput.value = "";

      container.appendChild(newRow);
      triggerAutosaveSoon();
    });

    // delegated remove
    container.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".remove-row");
      if (!removeBtn) return;
      const row = removeBtn.closest(".checklist-row");
      if (row) row.remove();
      triggerAutosaveSoon();
    });
  }

  /* ======================================================
     Additional POC (+)
     Base card: .mini-card.additional-poc-card[data-base="true"]
     Button: .additional-poc-add (inside base)
  ====================================================== */
  function initDynamicAdditionalPOCs() {
    const base = document.querySelector('.additional-poc-card[data-base="true"]');
    const grid = document.querySelector(".primary-contacts-grid");
    if (!base || !grid) return;

    base.addEventListener("click", (e) => {
      const btn = e.target.closest(".additional-poc-add");
      if (!btn) return;

      // Require base name field filled before adding
      const nameInput = base.querySelector('.checklist-row input[type="text"]');
      if (nameInput && !nameInput.value.trim()) {
        nameInput.focus();
        return;
      }

      const clone = base.cloneNode(true);
      clone.removeAttribute("data-base");
      clone.classList.add("is-clone");

      // Change + to remove
      const plus = clone.querySelector(".additional-poc-add");
      if (plus) {
        plus.textContent = "–";
        plus.title = "Remove contact";
        plus.classList.add("remove-poc");
        plus.classList.remove("additional-poc-add");
      }

      // Clear inputs in clone
      clone.querySelectorAll("input").forEach((i) => (i.value = ""));
      grid.appendChild(clone);
      triggerAutosaveSoon();
    });

    // delegated remove
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".remove-poc");
      if (!btn) return;
      const card = btn.closest(".mini-card");
      if (card) card.remove();
      triggerAutosaveSoon();
    });
  }

  /* ======================================================
     TABLES: Add Row (+)
     - footer button: .table-footer .add-row
     - clones last <tr> in <tbody>
     - clears inputs/selects
     - keeps Notes icon cell
  ====================================================== */
  function initTablesAddRowButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".table-footer .add-row");
      if (!btn) return;

      const tableContainer = btn.closest(".table-container");
      const table = tableContainer?.querySelector("table");
      const tbody = table?.querySelector("tbody");
      if (!table || !tbody) return;

      const lastRow = tbody.querySelector("tr:last-child");
      if (!lastRow) return;

      const newRow = lastRow.cloneNode(true);

      // Clear values
      newRow.querySelectorAll("input, textarea, select").forEach((el) => {
        if (el.tagName === "SELECT") {
          el.selectedIndex = 0;
        } else if (el.type === "checkbox" || el.type === "radio") {
          el.checked = false;
        } else {
          el.value = "";
        }
      });

      tbody.appendChild(newRow);
      triggerAutosaveSoon();
    });
  }

  /* ======================================================
     Notes icon linking:
     button.notes-icon-btn[data-notes-target="notes-techs"]
     scroll to target and focus textarea
  ====================================================== */
  function initNotesIconLinking() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".notes-icon-btn");
      if (!btn) return;

      const targetId = btn.getAttribute("data-notes-target");
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "start" });

      // focus textarea after small delay
      setTimeout(() => {
        const ta = target.querySelector("textarea");
        if (ta) ta.focus();
      }, 250);
    });
  }

  /* ======================================================
     Notes bullet insert + spacing for TABLE notes icons
     - Inserts "• <Name>:" (Training tables)
     - Inserts "• <Opcode>:" (Opcodes table)
     - Adds a blank line between bullet headers
  ====================================================== */
  function initNotesBulletInsertForTables() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".notes-icon-btn");
      if (!btn) return;

      const targetId = btn.getAttribute("data-notes-target");
      const notesBlock = targetId ? document.getElementById(targetId) : null;
      const textarea = notesBlock?.querySelector("textarea");
      if (!textarea) return;

      const row = btn.closest("tr");
      if (!row) return;

      // Determine label from first text input cell (Name/Opcode)
      const firstText = row.querySelector('input[type="text"]');
      const token = (firstText?.value || "").trim();

      let header = "";
      if (targetId === "notes-opcodes") {
        header = token ? `• ${token}:` : "• Opcode:";
      } else if (targetId && targetId.startsWith("notes-")) {
        header = token ? `• ${token}:` : "• Name:";
      }

      if (!header) return;

      insertBulletHeaderWithSpacing(textarea, header);
      triggerAutosaveSoon();
    });
  }

  function insertBulletHeaderWithSpacing(textarea, headerLine) {
    const existing = textarea.value || "";
    const trimmed = existing.replace(/\s+$/g, "");

    // If already contains this exact header, just scroll caret there
    if (trimmed.includes(headerLine)) {
      const idx = trimmed.indexOf(headerLine);
      textarea.focus();
      textarea.setSelectionRange(idx, idx + headerLine.length);
      return;
    }

    // Ensure blank line separation between headers
    const needsBreak = trimmed.length ? "\n\n" : "";
    const newText = trimmed + needsBreak + headerLine + "\n";

    textarea.value = newText;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  /* ======================================================
     SUPPORT TICKETS
     - Base card stays in Open container
     - Base status locked to Open
     - Add Ticket (+) only works when base is completed
     - Status change moves cards between containers
  ====================================================== */
  function initSupportTickets() {
    const openC = document.getElementById("openTicketsContainer");
    const tierTwoC = document.getElementById("tierTwoTicketsContainer");
    const closedResC = document.getElementById("closedResolvedTicketsContainer");
    const closedFeatC = document.getElementById("closedFeatureTicketsContainer");
    if (!openC || !tierTwoC || !closedResC || !closedFeatC) return;

    // lock base status to Open
    const base = openC.querySelector('.ticket-group[data-base="true"]');
    if (base) {
      const status = base.querySelector(".ticket-status-select");
      if (status) {
        status.value = "Open";
        status.disabled = true;
      }
    }

    // Add ticket (+)
    openC.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".add-ticket-btn");
      if (!addBtn) return;

      const group = addBtn.closest(".ticket-group");
      if (!group) return;

      // Base card completion requirement
      if (group.getAttribute("data-base") === "true") {
        const ok = isTicketCardComplete(group);
        if (!ok) {
          // focus first missing field
          focusFirstMissingTicketField(group);
          return;
        }
      }

      const newCard = (base || group).cloneNode(true);
      newCard.removeAttribute("data-base");

      // unlock status on clones
      const status = newCard.querySelector(".ticket-status-select");
      if (status) {
        status.disabled = false;
        status.value = "Open";
      }

      // remove disclaimer on clones
      const disc = newCard.querySelector(".ticket-disclaimer");
      if (disc) disc.remove();

      // swap + button to remove button on clones
      const plus = newCard.querySelector(".add-ticket-btn");
      if (plus) {
        plus.textContent = "–";
        plus.title = "Remove Ticket";
        plus.classList.add("remove-ticket-btn");
        plus.classList.remove("add-ticket-btn");
      }

      // clear fields
      newCard.querySelectorAll("input, textarea").forEach((el) => (el.value = ""));

      openC.appendChild(newCard);
      triggerAutosaveSoon();
    });

    // Remove ticket
    document.addEventListener("click", (e) => {
      const rm = e.target.closest(".remove-ticket-btn");
      if (!rm) return;
      const card = rm.closest(".ticket-group");
      if (card) card.remove();
      triggerAutosaveSoon();
    });

    // Move cards by status
    document.addEventListener("change", (e) => {
      const sel = e.target.closest(".ticket-status-select");
      if (!sel) return;

      const card = sel.closest(".ticket-group");
      if (!card) return;

      // base cannot move
      if (card.getAttribute("data-base") === "true") {
        sel.value = "Open";
        return;
      }

      const v = sel.value;
      if (v === "Open") openC.appendChild(card);
      else if (v === "Tier Two") tierTwoC.appendChild(card);
      else if (v === "Closed - Resolved") closedResC.appendChild(card);
      else if (v === "Closed - Feature Not Supported") closedFeatC.appendChild(card);

      triggerAutosaveSoon();
    });
  }

  function isTicketCardComplete(card) {
    const num = card.querySelector(".ticket-number-input");
    const url = card.querySelector(".ticket-zendesk-input");
    const sum = card.querySelector(".ticket-summary-input");

    return (
      !!(num && num.value.trim()) &&
      !!(url && url.value.trim()) &&
      !!(sum && sum.value.trim())
    );
  }

  function focusFirstMissingTicketField(card) {
    const fields = [
      card.querySelector(".ticket-number-input"),
      card.querySelector(".ticket-zendesk-input"),
      card.querySelector(".ticket-summary-input"),
    ].filter(Boolean);

    for (const f of fields) {
      if (!f.value.trim()) {
        f.focus();
        return;
      }
    }
  }

  /* ======================================================
     RESET PAGE (Reset This Page)
  ====================================================== */
  function initResetPageButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".clear-page-btn");
      if (!btn) return;

      const section = btn.closest(".page-section");
      if (!section) return;

      resetSection(section);
      triggerAutosaveSoon();
    });
  }

  function resetSection(section) {
    // Reset form elements in this section
    section.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
      } else if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });

    // Remove cloned additional trainers
    const addTrainers = section.querySelector("#additionalTrainersContainer");
    if (addTrainers) addTrainers.innerHTML = "";

    // Remove cloned additional POCs (keep base)
    section
      .querySelectorAll(".additional-poc-card.is-clone, .additional-poc-card:not([data-base='true'])")
      .forEach((c) => c.remove());

    // Support tickets: remove all non-base ticket cards, clear base fields
    if (section.id === "support-tickets") {
      const openC = document.getElementById("openTicketsContainer");
      if (openC) {
        openC.querySelectorAll(".ticket-group:not([data-base='true'])").forEach((c) => c.remove());
        const base = openC.querySelector('.ticket-group[data-base="true"]');
        if (base) {
          base.querySelectorAll("input, textarea").forEach((el) => (el.value = ""));
          const status = base.querySelector(".ticket-status-select");
          if (status) {
            status.value = "Open";
            status.disabled = true;
          }
        }
      }
      ["tierTwoTicketsContainer", "closedResolvedTicketsContainer", "closedFeatureTicketsContainer"].forEach(
        (id) => {
          const c = document.getElementById(id);
          if (c) c.innerHTML = "";
        }
      );
    }
  }

  /* ======================================================
     CLEAR ALL
  ====================================================== */
  function initClearAllButton() {
    const btn = document.getElementById("clearAllBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".page-section").forEach((sec) => resetSection(sec));
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_META_KEY);
      // update topbar dealership name display
      const disp = document.getElementById("dealershipNameDisplay");
      if (disp) disp.textContent = "";
      triggerAutosaveSoon();
    });
  }

  /* ======================================================
     AUTOSAVE (localStorage)
  ====================================================== */
  let autosaveTimer = null;

  function initAutosave() {
    // Save on input/change in any form field
    document.addEventListener("input", (e) => {
      if (e.target.closest("input, textarea, select")) triggerAutosaveSoon();
    });
    document.addEventListener("change", (e) => {
      if (e.target.closest("input, textarea, select")) triggerAutosaveSoon();
    });
  }

  function triggerAutosaveSoon() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveToAutosave, AUTOSAVE_DEBOUNCE_MS);
  }

  function saveToAutosave() {
    const data = collectState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ savedAt: new Date().toISOString() })
    );
  }

  function restoreFromAutosave() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      applyState(data);
    } catch {
      // ignore
    }
  }

  function collectState() {
    // Store values by stable selector strategy:
    // 1) all inputs/textareas/selects with ids => {id: value}
    // 2) everything else by DOM path index (best-effort)
    const state = {
      ids: {},
      nodes: [],
      html: {
        additionalTrainers: "",
        additionalPOCs: "",
        ticketsTierTwo: "",
        ticketsClosedResolved: "",
        ticketsClosedFeature: "",
        ticketsOpenClones: "",
      },
    };

    document.querySelectorAll("input[id], textarea[id], select[id]").forEach((el) => {
      state.ids[el.id] = serializeEl(el);
    });

    // Capture dynamic containers HTML
    const addTrainers = document.getElementById("additionalTrainersContainer");
    if (addTrainers) state.html.additionalTrainers = addTrainers.innerHTML;

    const pocGrid = document.querySelector(".primary-contacts-grid");
    if (pocGrid) {
      // store only non-base additional POCs
      const clones = [...pocGrid.querySelectorAll(".additional-poc-card:not([data-base='true'])")];
      state.html.additionalPOCs = clones.map((c) => c.outerHTML).join("");
    }

    // Support ticket containers
    const openC = document.getElementById("openTicketsContainer");
    if (openC) {
      const clones = [...openC.querySelectorAll(".ticket-group:not([data-base='true'])")];
      state.html.ticketsOpenClones = clones.map((c) => c.outerHTML).join("");
    }
    const t2 = document.getElementById("tierTwoTicketsContainer");
    if (t2) state.html.ticketsTierTwo = t2.innerHTML;
    const cr = document.getElementById("closedResolvedTicketsContainer");
    if (cr) state.html.ticketsClosedResolved = cr.innerHTML;
    const cf = document.getElementById("closedFeatureTicketsContainer");
    if (cf) state.html.ticketsClosedFeature = cf.innerHTML;

    // Best-effort for other fields (index-based)
    const all = [...document.querySelectorAll("main input, main textarea, main select")];
    state.nodes = all.map((el) => serializeEl(el));

    return state;
  }

  function applyState(state) {
    if (!state) return;

    // Restore ID-bound fields first
    if (state.ids) {
      Object.entries(state.ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) deserializeEl(el, val);
      });
    }

    // Restore dynamic HTML containers then rebind behaviors automatically via delegation
    const addTrainers = document.getElementById("additionalTrainersContainer");
    if (addTrainers && state.html?.additionalTrainers != null) {
      addTrainers.innerHTML = state.html.additionalTrainers;
      // ensure remove buttons exist on restored clones
      addTrainers.querySelectorAll(".checklist-row").forEach((row) => {
        if (row.getAttribute("data-base") === "true") return;
        const btn = row.querySelector("button");
        if (btn && btn.textContent.trim() === "+") {
          btn.textContent = "–";
          btn.classList.add("remove-row");
          btn.classList.remove("add-row");
        }
      });
    }

    const pocGrid = document.querySelector(".primary-contacts-grid");
    if (pocGrid && state.html?.additionalPOCs != null) {
      // remove any existing non-base
      pocGrid.querySelectorAll(".additional-poc-card:not([data-base='true'])").forEach((c) => c.remove());
      // append restored
      const temp = document.createElement("div");
      temp.innerHTML = state.html.additionalPOCs;
      temp.querySelectorAll(".additional-poc-card").forEach((card) => {
        // normalize remove button
        const b = card.querySelector("button");
        if (b) {
          b.textContent = "–";
          b.title = "Remove contact";
          b.classList.add("remove-poc");
          b.classList.remove("additional-poc-add");
        }
        card.classList.add("is-clone");
        pocGrid.appendChild(card);
      });
    }

    // Support tickets restore
    const openC = document.getElementById("openTicketsContainer");
    if (openC && state.html?.ticketsOpenClones != null) {
      openC.querySelectorAll(".ticket-group:not([data-base='true'])").forEach((c) => c.remove());
      const temp = document.createElement("div");
      temp.innerHTML = state.html.ticketsOpenClones;
      temp.querySelectorAll(".ticket-group").forEach((card) => openC.appendChild(card));
    }
    const t2 = document.getElementById("tierTwoTicketsContainer");
    if (t2 && state.html?.ticketsTierTwo != null) t2.innerHTML = state.html.ticketsTierTwo;
    const cr = document.getElementById("closedResolvedTicketsContainer");
    if (cr && state.html?.ticketsClosedResolved != null) cr.innerHTML = state.html.ticketsClosedResolved;
    const cf = document.getElementById("closedFeatureTicketsContainer");
    if (cf && state.html?.ticketsClosedFeature != null) cf.innerHTML = state.html.ticketsClosedFeature;

    // Normalize ticket clone buttons + status locks
    normalizeTicketsAfterRestore();

    // Restore index-based values as fallback (keeps most things even without IDs)
    if (Array.isArray(state.nodes)) {
      const all = [...document.querySelectorAll("main input, main textarea, main select")];
      for (let i = 0; i < Math.min(all.length, state.nodes.length); i++) {
        deserializeEl(all[i], state.nodes[i]);
      }
    }

    // update dealership display
    const dn = document.getElementById("dealershipNameInput");
    const disp = document.getElementById("dealershipNameDisplay");
    if (dn && disp) disp.textContent = (dn.value || "").trim();

    // placeholder classes for dates
    const s = document.getElementById("onsiteStartDate");
    const e = document.getElementById("onsiteEndDate");
    if (s) s.classList.toggle("is-placeholder", !s.value);
    if (e) e.classList.toggle("is-placeholder", !e.value);
  }

  function normalizeTicketsAfterRestore() {
    const openC = document.getElementById("openTicketsContainer");
    if (!openC) return;

    // lock base
    const base = openC.querySelector('.ticket-group[data-base="true"]');
    if (base) {
      const status = base.querySelector(".ticket-status-select");
      if (status) {
        status.value = "Open";
        status.disabled = true;
      }
    }

    // normalize clones remove btn and disclaimer
    document.querySelectorAll(".ticket-group:not([data-base='true'])").forEach((card) => {
      const disc = card.querySelector(".ticket-disclaimer");
      if (disc) disc.remove();

      const plus = card.querySelector(".add-ticket-btn");
      if (plus) {
        plus.textContent = "–";
        plus.title = "Remove Ticket";
        plus.classList.add("remove-ticket-btn");
        plus.classList.remove("add-ticket-btn");
      }
      const status = card.querySelector(".ticket-status-select");
      if (status) status.disabled = false;
    });
  }

  function serializeEl(el) {
    if (!el) return null;
    if (el.tagName === "SELECT") return { t: "select", v: el.value };
    if (el.type === "checkbox") return { t: "checkbox", v: !!el.checked };
    if (el.type === "radio") return { t: "radio", v: !!el.checked, name: el.name, value: el.value };
    return { t: "value", v: el.value };
  }

  function deserializeEl(el, data) {
    if (!el || !data) return;

    if (data.t === "select") el.value = data.v ?? "";
    else if (data.t === "checkbox") el.checked = !!data.v;
    else if (data.t === "value") el.value = data.v ?? "";
    else if (data.t === "radio") {
      // best effort
      el.checked = !!data.v;
    }
  }

  /* ======================================================
     PDF EXPORT (Save All Pages as PDF)
     ⚠️ Requires:
        - jsPDF available as window.jspdf.jsPDF
        - html2canvas available as window.html2canvas
     If missing, shows an alert.
  ====================================================== */
  function initPdfExportButton() {
    const btn = document.getElementById("savePDF");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const jsPDF = window.jspdf?.jsPDF;
      const html2canvas = window.html2canvas;

      if (!jsPDF || !html2canvas) {
        alert("PDF export requires jsPDF + html2canvas to be loaded.");
        return;
      }

      const sections = [...document.querySelectorAll(".page-section")];
      if (!sections.length) return;

      const active = document.querySelector(".page-section.active");
      const doc = new jsPDF("p", "pt", "letter");
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // temporarily show each section to capture
      for (let i = 0; i < sections.length; i++) {
        sections.forEach((s) => s.classList.remove("active"));
        sections[i].classList.add("active");

        // allow layout settle
        await wait(120);

        const canvas = await html2canvas(sections[i], { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");

        // fit into page
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const imgW = canvas.width * ratio;
        const imgH = canvas.height * ratio;

        if (i > 0) doc.addPage();
        doc.addImage(imgData, "PNG", (pageW - imgW) / 2, 24, imgW, imgH);
      }

      // restore active
      sections.forEach((s) => s.classList.remove("active"));
      if (active) active.classList.add("active");
      else sections[0].classList.add("active");

      doc.save("myKaarma-Training-Checklist.pdf");
    });
  }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  /* ======================================================
     TABLE EXPAND (⤢) — moves real table into modal + back
     - Preserves all inputs/selects/checkboxes (no cloning)
     - Keeps horizontal/vertical scroll
  ====================================================== */
  function initTableExpandFeature() {
    ensureTableExpandStyles();
    const modal = ensureTableExpandModal();

    // Add expand buttons to every table footer (unless already present)
    document.querySelectorAll(".table-container").forEach((container) => {
      const footer = container.querySelector(".table-footer");
      if (!footer) return;

      let btn = footer.querySelector(".table-expand-btn");
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "table-expand-btn";
        btn.title = "Expand table";
        btn.setAttribute("aria-label", "Expand table");
        btn.textContent = "⤢";
        footer.appendChild(btn);
      }

      btn.addEventListener("click", () => openTableInModal(container, modal));
    });
  }

  function ensureTableExpandModal() {
    let overlay = document.getElementById("tableExpandOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "tableExpandOverlay";
    overlay.className = "table-expand-overlay";
    overlay.innerHTML = `
      <div class="table-expand-modal" role="dialog" aria-modal="true" aria-label="Expanded table">
        <div class="table-expand-header">
          <div class="table-expand-title" id="tableExpandTitle">Expanded Table</div>
          <button type="button" class="table-expand-close" aria-label="Close expanded table" title="Close">✕</button>
        </div>
        <div class="table-expand-body">
          <div class="table-expand-scroll"></div>
        </div>
        <div class="table-expand-footer">
          <button type="button" class="table-expand-close secondary">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // close handlers
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeExpandedTable(overlay);
    });
    overlay.querySelectorAll(".table-expand-close").forEach((b) => {
      b.addEventListener("click", () => closeExpandedTable(overlay));
    });

    // ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) {
        closeExpandedTable(overlay);
      }
    });

    return overlay;
  }

  function openTableInModal(tableContainer, overlay) {
    // Prevent double-open
    if (overlay.__active) return;

    const table = tableContainer.querySelector("table");
    if (!table) return;

    const titleEl = overlay.querySelector("#tableExpandTitle");

    // Try to pull a title: nearest .section-header or h2 above the table container
    const sectionHeader =
      tableContainer.closest(".section")?.querySelector(".section-header span")?.textContent?.trim() ||
      tableContainer.closest(".section-block")?.querySelector("h2")?.textContent?.trim() ||
      "Expanded Table";
    titleEl.textContent = sectionHeader;

    // Save where the table came from
    overlay.__active = {
      table,
      originalParent: table.parentNode,
      originalNextSibling: table.nextSibling,
    };

    // Move actual table into modal scroll area
    const scrollHost = overlay.querySelector(".table-expand-scroll");
    scrollHost.innerHTML = "";
    scrollHost.appendChild(table);

    overlay.classList.add("open");
    document.body.classList.add("no-scroll");

    overlay.querySelector(".table-expand-close")?.focus();
  }

  function closeExpandedTable(overlay) {
    if (!overlay.__active) {
      overlay.classList.remove("open");
      document.body.classList.remove("no-scroll");
      return;
    }

    const { table, originalParent, originalNextSibling } = overlay.__active;

    // Restore table exactly where it was
    if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
      originalParent.insertBefore(table, originalNextSibling);
    } else {
      originalParent.appendChild(table);
    }

    overlay.__active = null;
    overlay.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }

  function ensureTableExpandStyles() {
    if (document.getElementById("tableExpandStyles")) return;

    const style = document.createElement("style");
    style.id = "tableExpandStyles";
    style.textContent = `
      .table-expand-btn{
        margin-left: 10px;
        padding: 6px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.06);
        color: inherit;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      }
      .table-expand-btn:hover{ background: rgba(255,255,255,0.10); }

      .table-expand-overlay{
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.62);
        z-index: 9999;
        padding: 18px;
      }
      .table-expand-overlay.open{ display: flex; }

      .table-expand-modal{
        width: min(1400px, 96vw);
        height: min(820px, 92vh);
        background: rgba(13,18,32,0.98);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 18px;
        box-shadow: 0 20px 70px rgba(0,0,0,0.55);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .table-expand-header{
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.12);
      }
      .table-expand-title{
        font-weight: 700;
        font-size: 14px;
        opacity: 0.95;
      }
      .table-expand-close{
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: inherit;
        border-radius: 10px;
        padding: 6px 10px;
        cursor: pointer;
        line-height: 1;
      }
      .table-expand-close:hover{ background: rgba(255,255,255,0.10); }

      .table-expand-body{
        flex: 1;
        overflow: hidden;
        padding: 12px;
      }
      .table-expand-scroll{
        width: 100%;
        height: 100%;
        overflow: auto;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.03);
        padding: 10px;
      }

      .table-expand-footer{
        padding: 10px 14px;
        border-top: 1px solid rgba(255,255,255,0.12);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .table-expand-close.secondary{
        font-size: 13px;
        padding: 8px 12px;
      }

      body.no-scroll{ overflow: hidden !important; }
    `;
    document.head.appendChild(style);
  }
})();
