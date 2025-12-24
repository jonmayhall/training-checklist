/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Fixes / Adds:
   - ✅ Additional Trainers (+) works reliably (no fragile selector)
   - ✅ Placeholder/ghost/date styling handled via CSS (see snippet)
   - ✅ Table Expand (⤢) opens SAME table layout + adds related Notes card below
        (moves real DOM nodes into modal; no cloning; preserves data/inputs)
   - ✅ Notes icon behavior (📝):
        - Training tables insert bullets using Name
        - Opcodes inserts bullets using Opcode
        - Keeps bullets in the SAME ORDER as table rows (even if clicked out of order)
        - Clear blank-line spacing between bullet sections
        - Works identically inside popups
   - Nav clicks, table add-row, POCs, Support Tickets, Autosave, Reset/Clear, Dates, PDF
======================================================= */

(() => {
  "use strict";

  /* =========================
     CONFIG
  ========================= */
  const STORAGE_KEY = "mkInteractiveChecklist_v2";
  const STORAGE_META_KEY = "mkInteractiveChecklist_meta_v2";
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
    initNotesIconLinkingAndBullets(); // upgraded notes system

    initSupportTickets();

    initResetPageButtons();
    initClearAllButton();

    initAutosave();
    restoreFromAutosave(); // restore after handlers exist

    initPdfExportButton();

    initTableExpandFeature(); // upgraded: includes notes card
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

      nav.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".page-section").forEach((sec) => sec.classList.remove("active"));
      const section = document.getElementById(targetId);
      if (section) section.classList.add("active");

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
      display.textContent = (input.value || "").trim();
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
      el.classList.toggle("is-placeholder", !el.value);
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
     Additional Trainers (+) — FIXED
     - Your HTML puts #additionalTrainersContainer RIGHT AFTER the base row
     - So we anchor baseRow off that container (no selector guessing)
  ====================================================== */
  function initDynamicAdditionalTrainers() {
    const container = document.getElementById("additionalTrainersContainer");
    if (!container) return;

    // base row should be directly before container
    const baseRow = container.previousElementSibling;
    if (!baseRow || !baseRow.classList.contains("checklist-row")) return;

    // delegated click on base row only
    baseRow.addEventListener("click", (e) => {
      const plusBtn = e.target.closest("button.add-row");
      if (!plusBtn) return;

      const baseInput = baseRow.querySelector('input[type="text"]');
      if (!baseInput) return;

      // require base filled before adding
      if (!baseInput.value.trim()) {
        baseInput.focus();
        return;
      }

      const clone = baseRow.cloneNode(true);
      clone.removeAttribute("data-base");
      clone.classList.add("is-clone");

      // change + to remove
      const btn = clone.querySelector("button.add-row");
      if (btn) {
        btn.textContent = "–";
        btn.title = "Remove trainer";
        btn.classList.remove("add-row");
        btn.classList.add("remove-trainer-row");
      }

      // clear clone input
      const input = clone.querySelector('input[type="text"]');
      if (input) input.value = "";

      container.appendChild(clone);
      triggerAutosaveSoon();
    });

    // remove trainer rows (delegated on container)
    container.addEventListener("click", (e) => {
      const rm = e.target.closest(".remove-trainer-row");
      if (!rm) return;
      const row = rm.closest(".checklist-row");
      if (row) row.remove();
      triggerAutosaveSoon();
    });
  }

  /* ======================================================
     Additional POC (+)
  ====================================================== */
  function initDynamicAdditionalPOCs() {
    const base = document.querySelector('.additional-poc-card[data-base="true"]');
    const grid = document.querySelector(".primary-contacts-grid");
    if (!base || !grid) return;

    base.addEventListener("click", (e) => {
      const btn = e.target.closest(".additional-poc-add");
      if (!btn) return;

      const nameInput = base.querySelector('.checklist-row.integrated-plus input[type="text"]');
      if (nameInput && !nameInput.value.trim()) {
        nameInput.focus();
        return;
      }

      const clone = base.cloneNode(true);
      clone.removeAttribute("data-base");
      clone.classList.add("is-clone");

      const plus = clone.querySelector(".additional-poc-add");
      if (plus) {
        plus.textContent = "–";
        plus.title = "Remove contact";
        plus.classList.add("remove-poc");
        plus.classList.remove("additional-poc-add");
      }

      clone.querySelectorAll("input").forEach((i) => (i.value = ""));
      grid.appendChild(clone);
      triggerAutosaveSoon();
    });

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

      newRow.querySelectorAll("input, textarea, select").forEach((el) => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
      });

      tbody.appendChild(newRow);
      triggerAutosaveSoon();

      // if table has notes target, keep notes order consistent after adding row
      const notesTarget = getNotesTargetIdFromTable(table);
      if (notesTarget) reorderNotesToMatchTable(table, notesTarget);
    });
  }

  /* ======================================================
     NOTES: linking + bullet insertion + ordered reflow
     - Works for any .notes-icon-btn with data-notes-target
     - Inserts bullet header for the row, then reorders headers
       to match table row order (top->bottom)
     - Ensures blank line spacing between bullet sections
  ====================================================== */
  function initNotesIconLinkingAndBullets() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".notes-icon-btn");
      if (!btn) return;

      const targetId = btn.getAttribute("data-notes-target");
      if (!targetId) return;

      const notesBlock = document.getElementById(targetId);
      const textarea = notesBlock?.querySelector("textarea");
      if (!textarea) return;

      // always scroll/focus
      notesBlock.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => textarea.focus(), 220);

      // if this notes icon is in a TABLE row, insert bullet and reorder
      const row = btn.closest("tr");
      const table = btn.closest("table");
      if (row && table) {
        const header = buildHeaderForRow(table, row, targetId);
        if (header) {
          ensureHeaderExists(textarea, header);
          reorderNotesToMatchTable(table, targetId);
          triggerAutosaveSoon();
        }
      }
    });
  }

  function buildHeaderForRow(table, row, targetId) {
    // Training tables: use Name (first text input)
    // Opcodes: use Opcode (first text input in row, typically opcode column)
    const firstText = row.querySelector('input[type="text"]');
    const token = (firstText?.value || "").trim();

    if (targetId === "notes-opcodes") {
      return token ? `• ${token}:` : "• Opcode:";
    }

    // default role notes blocks (techs/advisors/parts/etc.)
    if (targetId && targetId.startsWith("notes-")) {
      return token ? `• ${token}:` : "• Name:";
    }

    return "";
  }

  function ensureHeaderExists(textarea, headerLine) {
    const current = textarea.value || "";

    // already present
    if (current.includes(headerLine)) return;

    const trimmed = current.replace(/\s+$/g, "");
    const prefix = trimmed.length ? "\n\n" : "";
    textarea.value = trimmed + prefix + headerLine + "\n";
  }

  function reorderNotesToMatchTable(table, notesTargetId) {
    const notesBlock = document.getElementById(notesTargetId);
    const textarea = notesBlock?.querySelector("textarea");
    if (!textarea) return;

    // expected headers in row order
    const expectedHeaders = [];
    const rows = [...table.querySelectorAll("tbody tr")];

    rows.forEach((r) => {
      // only tables that have notes icons should be processed
      const icon = r.querySelector(".notes-icon-btn[data-notes-target]");
      if (!icon) return;

      // build header for each row in order using current tokens
      const hdr = buildHeaderForRow(table, r, notesTargetId);
      if (hdr) expectedHeaders.push(hdr);
    });

    // parse textarea into blocks keyed by header
    const blocks = parseNotesBlocks(textarea.value);

    // ensure blocks exist for any header that was created by click
    expectedHeaders.forEach((h) => {
      if (!blocks.has(h) && textarea.value.includes(h)) blocks.set(h, h + "\n");
    });

    // rebuild notes in correct order with spacing
    const orderedParts = [];
    expectedHeaders.forEach((h) => {
      if (blocks.has(h)) orderedParts.push(normalizeBlock(blocks.get(h)));
    });

    // keep any "extra" blocks (headers that no longer exist in table) at bottom
    const extras = [];
    blocks.forEach((val, key) => {
      if (!expectedHeaders.includes(key)) extras.push(normalizeBlock(val));
    });

    const rebuilt = [...orderedParts, ...extras]
      .filter(Boolean)
      .map((b) => b.trimEnd())
      .join("\n\n") // clear spacing between bullet sections
      .trimEnd();

    textarea.value = rebuilt ? rebuilt + "\n" : "";
  }

  function parseNotesBlocks(text) {
    // A block starts at a header like: "• Something:"
    // and continues until next header or end.
    const blocks = new Map();
    if (!text) return blocks;

    const lines = text.split("\n");
    let currentHeader = null;
    let currentBuf = [];

    const headerRegex = /^•\s.+:\s*$/;

    const flush = () => {
      if (currentHeader) {
        blocks.set(currentHeader, currentBuf.join("\n").trimEnd() + "\n");
      }
    };

    for (const line of lines) {
      if (headerRegex.test(line.trim())) {
        flush();
        currentHeader = line.trim();
        currentBuf = [currentHeader];
      } else {
        if (currentHeader) currentBuf.push(line);
        else {
          // text before first header becomes an "extra" block
          const k = "__preface__";
          const prev = blocks.get(k) || "";
          blocks.set(k, prev + line + "\n");
        }
      }
    }
    flush();
    return blocks;
  }

  function normalizeBlock(blockText) {
    if (!blockText) return "";
    // ensure a header line + content, and no huge trailing whitespace
    return blockText.trimEnd();
  }

  function getNotesTargetIdFromTable(table) {
    const btn = table.querySelector(".notes-icon-btn[data-notes-target]");
    return btn ? btn.getAttribute("data-notes-target") : "";
  }

  /* ======================================================
     SUPPORT TICKETS
  ====================================================== */
  function initSupportTickets() {
    const openC = document.getElementById("openTicketsContainer");
    const tierTwoC = document.getElementById("tierTwoTicketsContainer");
    const closedResC = document.getElementById("closedResolvedTicketsContainer");
    const closedFeatC = document.getElementById("closedFeatureTicketsContainer");
    if (!openC || !tierTwoC || !closedResC || !closedFeatC) return;

    const base = openC.querySelector('.ticket-group[data-base="true"]');
    if (base) {
      const status = base.querySelector(".ticket-status-select");
      if (status) {
        status.value = "Open";
        status.disabled = true;
      }
    }

    openC.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".add-ticket-btn");
      if (!addBtn) return;

      const group = addBtn.closest(".ticket-group");
      if (!group) return;

      if (group.getAttribute("data-base") === "true") {
        const ok = isTicketCardComplete(group);
        if (!ok) {
          focusFirstMissingTicketField(group);
          return;
        }
      }

      const newCard = (base || group).cloneNode(true);
      newCard.removeAttribute("data-base");

      const status = newCard.querySelector(".ticket-status-select");
      if (status) {
        status.disabled = false;
        status.value = "Open";
      }

      const disc = newCard.querySelector(".ticket-disclaimer");
      if (disc) disc.remove();

      const plus = newCard.querySelector(".add-ticket-btn");
      if (plus) {
        plus.textContent = "–";
        plus.title = "Remove Ticket";
        plus.classList.add("remove-ticket-btn");
        plus.classList.remove("add-ticket-btn");
      }

      newCard.querySelectorAll("input, textarea").forEach((el) => (el.value = ""));
      openC.appendChild(newCard);
      triggerAutosaveSoon();
    });

    document.addEventListener("click", (e) => {
      const rm = e.target.closest(".remove-ticket-btn");
      if (!rm) return;
      const card = rm.closest(".ticket-group");
      if (card) card.remove();
      triggerAutosaveSoon();
    });

    document.addEventListener("change", (e) => {
      const sel = e.target.closest(".ticket-status-select");
      if (!sel) return;

      const card = sel.closest(".ticket-group");
      if (!card) return;

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
     RESET PAGE
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
    section.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
    });

    const addTrainers = section.querySelector("#additionalTrainersContainer");
    if (addTrainers) addTrainers.innerHTML = "";

    section
      .querySelectorAll(".additional-poc-card.is-clone, .additional-poc-card:not([data-base='true'])")
      .forEach((c) => c.remove());

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

      const disp = document.getElementById("dealershipNameDisplay");
      if (disp) disp.textContent = "";

      triggerAutosaveSoon();
    });
  }

  /* ======================================================
     AUTOSAVE
  ====================================================== */
  let autosaveTimer = null;

  function initAutosave() {
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
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ savedAt: new Date().toISOString() }));
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

    const addTrainers = document.getElementById("additionalTrainersContainer");
    if (addTrainers) state.html.additionalTrainers = addTrainers.innerHTML;

    const pocGrid = document.querySelector(".primary-contacts-grid");
    if (pocGrid) {
      const clones = [...pocGrid.querySelectorAll(".additional-poc-card:not([data-base='true'])")];
      state.html.additionalPOCs = clones.map((c) => c.outerHTML).join("");
    }

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

    const all = [...document.querySelectorAll("main input, main textarea, main select")];
    state.nodes = all.map((el) => serializeEl(el));

    return state;
  }

  function applyState(state) {
    if (!state) return;

    if (state.ids) {
      Object.entries(state.ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) deserializeEl(el, val);
      });
    }

    const addTrainers = document.getElementById("additionalTrainersContainer");
    if (addTrainers && state.html?.additionalTrainers != null) {
      addTrainers.innerHTML = state.html.additionalTrainers;
      // normalize restored trainer clone buttons
      addTrainers.querySelectorAll(".checklist-row").forEach((row) => {
        if (row.getAttribute("data-base") === "true") return;
        const btn = row.querySelector("button");
        if (btn && btn.textContent.trim() === "+") {
          btn.textContent = "–";
          btn.classList.add("remove-trainer-row");
          btn.classList.remove("add-row");
        }
      });
    }

    const pocGrid = document.querySelector(".primary-contacts-grid");
    if (pocGrid && state.html?.additionalPOCs != null) {
      pocGrid.querySelectorAll(".additional-poc-card:not([data-base='true'])").forEach((c) => c.remove());
      const temp = document.createElement("div");
      temp.innerHTML = state.html.additionalPOCs;
      temp.querySelectorAll(".additional-poc-card").forEach((card) => {
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

    normalizeTicketsAfterRestore();

    if (Array.isArray(state.nodes)) {
      const all = [...document.querySelectorAll("main input, main textarea, main select")];
      for (let i = 0; i < Math.min(all.length, state.nodes.length); i++) {
        deserializeEl(all[i], state.nodes[i]);
      }
    }

    const dn = document.getElementById("dealershipNameInput");
    const disp = document.getElementById("dealershipNameDisplay");
    if (dn && disp) disp.textContent = (dn.value || "").trim();

    const s = document.getElementById("onsiteStartDate");
    const e = document.getElementById("onsiteEndDate");
    if (s) s.classList.toggle("is-placeholder", !s.value);
    if (e) e.classList.toggle("is-placeholder", !e.value);
  }

  function normalizeTicketsAfterRestore() {
    const openC = document.getElementById("openTicketsContainer");
    if (!openC) return;

    const base = openC.querySelector('.ticket-group[data-base="true"]');
    if (base) {
      const status = base.querySelector(".ticket-status-select");
      if (status) {
        status.value = "Open";
        status.disabled = true;
      }
    }

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
    else if (data.t === "radio") el.checked = !!data.v;
  }

  /* ======================================================
     PDF EXPORT (unchanged)
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

      for (let i = 0; i < sections.length; i++) {
        sections.forEach((s) => s.classList.remove("active"));
        sections[i].classList.add("active");

        await wait(120);

        const canvas = await html2canvas(sections[i], { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");

        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const imgW = canvas.width * ratio;
        const imgH = canvas.height * ratio;

        if (i > 0) doc.addPage();
        doc.addImage(imgData, "PNG", (pageW - imgW) / 2, 24, imgW, imgH);
      }

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
     TABLE EXPAND (⤢) — upgraded:
     - Moves the REAL .table-container (so it looks identical)
     - Also finds the related Notes block (by notes target id)
       and moves that Notes card below in the popup
  ====================================================== */
  function initTableExpandFeature() {
    ensureTableExpandStyles();
    const overlay = ensureTableExpandModal();

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

      btn.addEventListener("click", () => openExpanded(container, overlay));
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
          <div class="table-expand-stack" id="tableExpandStack"></div>
        </div>
        <div class="table-expand-footer">
          <button type="button" class="table-expand-close secondary">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeExpanded(overlay);
    });
    overlay.querySelectorAll(".table-expand-close").forEach((b) => {
      b.addEventListener("click", () => closeExpanded(overlay));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeExpanded(overlay);
    });

    return overlay;
  }

  function openExpanded(tableContainer, overlay) {
    if (overlay.__active) return;

    const table = tableContainer.querySelector("table");
    if (!table) return;

    const titleEl = overlay.querySelector("#tableExpandTitle");
    const stack = overlay.querySelector("#tableExpandStack");

    // Title guess
    const sectionHeader =
      tableContainer.closest(".section")?.querySelector(".section-header span")?.textContent?.trim() ||
      tableContainer.closest(".section-block")?.querySelector("h2")?.textContent?.trim() ||
      "Expanded Table";
    titleEl.textContent = sectionHeader;

    // Find related notes block via notes target id on the table
    const notesTargetId = getNotesTargetIdFromTable(table);
    const notesBlock = notesTargetId ? document.getElementById(notesTargetId) : null;

    // Save original positions (so we can put them back exactly)
    overlay.__active = {
      tableContainer,
      tableParent: tableContainer.parentNode,
      tableNext: tableContainer.nextSibling,

      notesBlock,
      notesParent: notesBlock?.parentNode || null,
      notesNext: notesBlock?.nextSibling || null,
    };

    // Move REAL nodes into modal stack
    stack.innerHTML = "";
    stack.appendChild(tableContainer);
    if (notesBlock) stack.appendChild(notesBlock);

    overlay.classList.add("open");
    document.body.classList.add("no-scroll");
    overlay.querySelector(".table-expand-close")?.focus();
  }

  function closeExpanded(overlay) {
    if (!overlay.__active) {
      overlay.classList.remove("open");
      document.body.classList.remove("no-scroll");
      return;
    }

    const a = overlay.__active;

    // restore table container
    if (a.tableNext && a.tableNext.parentNode === a.tableParent) {
      a.tableParent.insertBefore(a.tableContainer, a.tableNext);
    } else {
      a.tableParent.appendChild(a.tableContainer);
    }

    // restore notes block if it existed
    if (a.notesBlock && a.notesParent) {
      if (a.notesNext && a.notesNext.parentNode === a.notesParent) {
        a.notesParent.insertBefore(a.notesBlock, a.notesNext);
      } else {
        a.notesParent.appendChild(a.notesBlock);
      }
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
        height: min(900px, 92vh);
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
        overflow: auto;
        padding: 14px;
      }

      /* stack table + notes card */
      .table-expand-stack{
        display: flex;
        flex-direction: column;
        gap: 14px;
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
