/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Sidebar page navigation
   ✅ Autosave/Restore (supports dynamic rows)
   ✅ Reset This Page (clears fields + notes storage for that page)
   ✅ Add Row (+) for all tables
   ✅ Notes buttons (pages 3–6 + tables)
   ✅ Notes bullets:
       • Title
             ◦
     (plain text; no bold; hollow sub-bullet; extra indent)
   ✅ Stable ordering (DOM order) even if clicked out of order
   ✅ NO screen shifting (no scroll, no jump)
   ✅ Support Tickets logic (base locked to Open; clones movable)
   ✅ Dealership map helper
   ✅ Ghost styling for selects/dates
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG / STORAGE
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v9";
  const NOTES_KEY   = "mykaarma_interactive_checklist__notes_v9";

  const AUTO_ID_ATTR  = "data-mk-id";
  const AUTO_ROW_ATTR = "data-mk-row";

  // Notes formatting (plain text)
  const SUB_INDENT = "              "; // more indent (per request)
  const BULLET_MAIN = "• ";
  const BULLET_SUB  = "◦ ";

  /* =======================
     HELPERS
  ======================= */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const uid = (() => {
    let n = 0;
    return (prefix = "mk") => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}-${++n}`;
  })();

  const isEl = (x) => x && x.nodeType === 1;
  const isCheckbox = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "checkbox";
  const isRadio    = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "radio";
  const isDate     = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "date";

  function safeJSONParse(raw, fallback) {
    try { return JSON.parse(raw) ?? fallback; } catch { return fallback; }
  }
  function readState() {
    return safeJSONParse(localStorage.getItem(STORAGE_KEY), {});
  }
  function writeState(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
  }
  function readNotes() {
    return safeJSONParse(localStorage.getItem(NOTES_KEY), {});
  }
  function writeNotes(obj) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(obj || {}));
  }

  /* =======================
     GHOST / PLACEHOLDER STYLING
  ======================= */
  function applyGhostStyling(root = document) {
    $$("select", root).forEach(sel => {
      const update = () => sel.classList.toggle("is-placeholder", !sel.value);
      sel.addEventListener("change", update);
      update();
    });

    $$("input[type='date']", root).forEach(inp => {
      const update = () => inp.classList.toggle("is-placeholder", !inp.value);
      inp.addEventListener("change", update);
      update();
    });
  }

  /* =======================
     STABLE IDs (for autosave + dynamic rows)
  ======================= */
  function ensureStableRowIds(root = document) {
    $$("tbody tr", root).forEach(tr => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });
  }

  function ensureStableFieldIds(root = document) {
    ensureStableRowIds(root);

    $$("input, select, textarea", root).forEach(el => {
      // ignore buttons
      if (el.tagName === "INPUT") {
        const type = (el.type || "").toLowerCase();
        if (["button", "submit", "reset", "file"].includes(type)) return;
      }

      // keep existing ids stable
      if (el.id && !el.getAttribute(AUTO_ID_ATTR)) el.setAttribute(AUTO_ID_ATTR, el.id);
      if (el.getAttribute(AUTO_ID_ATTR)) return;

      // deterministic-ish based on page + row + cell index
      const page = el.closest(".page-section");
      const pageId = page?.id || "no-page";
      const tr = el.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || "no-row";

      let colIndex = "x";
      if (tr) {
        const cell = el.closest("td,th");
        if (cell) colIndex = String(Array.from(tr.children).indexOf(cell));
      }

      // index within the cell (or row)
      const scope = el.closest("td,th") || tr || el.parentElement || document.body;
      const siblings = $$("input, select, textarea", scope);
      const idx = Math.max(0, siblings.indexOf(el));

      el.setAttribute(AUTO_ID_ATTR, `${pageId}::${rowKey}::c${colIndex}::i${idx}`);
    });
  }

  function getFieldKey(el) {
    return el?.getAttribute?.(AUTO_ID_ATTR) || el?.id || "";
  }

  /* =======================
     AUTOSAVE / RESTORE
  ======================= */
  function captureState(root = document) {
    ensureStableFieldIds(root);
    const state = readState();

    $$("input, select, textarea", root).forEach(el => {
      const key = getFieldKey(el);
      if (!key) return;

      if (isCheckbox(el)) state[key] = !!el.checked;
      else if (isRadio(el)) state[key] = el.checked ? el.value : (state[key] ?? "");
      else state[key] = el.value ?? "";
    });

    writeState(state);
  }

  function restoreState(root = document) {
    ensureStableFieldIds(root);

    const state = readState();
    if (!state || typeof state !== "object") return;

    $$("input, select, textarea", root).forEach(el => {
      const key = getFieldKey(el);
      if (!key || !(key in state)) return;

      if (isCheckbox(el)) el.checked = !!state[key];
      else if (isRadio(el)) el.checked = (el.value === state[key]);
      else el.value = state[key] ?? "";
    });

    applyGhostStyling(root);
  }

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!t || !t.matches("input, select, textarea")) return;
    captureState(document);
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!t || !t.matches("input, select, textarea")) return;
    captureState(document);
  });

  /* =======================
     PAGE NAVIGATION
  ======================= */
  const pageSections = $$(".page-section");
  const navButtons   = $$(".nav-btn");

  function activatePage(sectionId, { dontScroll = false } = {}) {
    if (!sectionId) return;

    pageSections.forEach(sec => sec.classList.remove("active"));
    navButtons.forEach(btn => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    // normal nav: go to top; but notes clicks will NOT call this at all
    if (!dontScroll) window.scrollTo({ top: 0, behavior: "instant" });
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target));
  });

  /* =======================
     RESET THIS PAGE
     - clears input/select/textarea values in that page
     - removes those keys from STORAGE_KEY
     - clears notes store entries for notes blocks inside that page
     - clears notes textarea content immediately
  ======================= */
  function clearControls(root) {
    $$("input, select, textarea", root).forEach(el => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });
    applyGhostStyling(root);
  }

  $$(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      // 1) clear UI values
      clearControls(page);

      // 2) remove state keys for this page
      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach(el => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });
      writeState(state);

      // 3) remove notes store entries for notes blocks in this page
      const notes = readNotes();
      const noteBlocks = $$("[id^='notes-']", page)
        .map(b => b.id)
        .filter(Boolean);

      noteBlocks.forEach(id => {
        delete notes[id];
        // clear textarea immediately
        const ta = $(`#${CSS.escape(id)} textarea`);
        if (ta) ta.value = "";
      });

      writeNotes(notes);
    });
  });

  /* =======================
     TABLE ADD ROW (+)
  ======================= */
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".table-footer .add-row");
    if (!addBtn) return;

    const tableContainer = addBtn.closest(".table-container");
    const table = tableContainer ? $("table", tableContainer) : null;
    const tbody = table ? $("tbody", table) : null;
    const firstRow = tbody ? $("tr", tbody) : null;
    if (!tbody || !firstRow) return;

    const clone = firstRow.cloneNode(true);
    clone.setAttribute(AUTO_ROW_ATTR, uid("row"));

    // clear values
    $$("input, select, textarea", clone).forEach(el => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });

    // remove ids so ensureStableFieldIds can re-key
    $$("[id]", clone).forEach(el => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach(el => el.removeAttribute(AUTO_ID_ATTR));

    tbody.appendChild(clone);

    ensureStableFieldIds(tbody);
    applyGhostStyling(clone);
    captureState(document);
  });

  /* =======================
     NOTES — BULLET SYSTEM (NO SCROLL / NO SHIFT)
     RULES:
       - Plain text
       - Main bullet: "• Title"
       - Next line: "              ◦ "
       - Titles:
           * tables: ONLY Name (page 5) OR Opcode (page 6)
           * non-tables: label text of the row (not bold)
       - Stable ordering: DOM index of row (or checklist-row)
       - Reset clears notes storage, so bullets won't resurrect
  ======================= */

  function getNotesTextarea(targetId) {
    const block = document.getElementById(targetId);
    if (!block) return null;
    return $("textarea", block);
  }

  function getChecklistRowIndex(btn) {
    const page = btn.closest(".page-section");
    if (!page) return 999999;
    const row = btn.closest(".checklist-row");
    if (!row) return 999999;
    const all = $$(".checklist-row", page);
    return all.indexOf(row);
  }

  function getTableRowIndex(btn) {
    const tr = btn.closest("tr");
    const tbody = tr?.parentElement;
    if (!tr || !tbody) return 999999;
    return Array.from(tbody.children).indexOf(tr);
  }

  function getNonTableTitle(btn) {
    const row = btn.closest(".checklist-row");
    const label = row ? $("label", row) : null;
    return (label?.textContent || "").trim() || "—";
  }

  function getTableTitle(btn) {
    const tr = btn.closest("tr");
    const pageId = btn.closest(".page-section")?.id || "";

    // Page 6 opcodes-pricing: Opcode column is 2nd column input text
    if (pageId === "opcodes-pricing") {
      const opcode = tr?.querySelector("td:nth-child(2) input[type='text']")?.value?.trim();
      return opcode || "—";
    }

    // Page 5 tables (training-checklist): Name text in first cell
    const name = tr?.querySelector("td:first-child input[type='text']")?.value?.trim();
    return name || "—";
  }

  function buildBulletBlock(title) {
    // no bold, no extra symbols
    return `${BULLET_MAIN}${title}\n${SUB_INDENT}${BULLET_SUB}`;
  }

  function rebuildNotes(targetId) {
    const ta = getNotesTextarea(targetId);
    if (!ta) return;

    const notesStore = readNotes();
    const arr = Array.isArray(notesStore[targetId]) ? notesStore[targetId] : [];

    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // spacing between blocks for readability
    ta.value = arr.map(x => x.text).join("\n\n");
  }

  function ensureNoteEntry(targetId, entryKey, order, text) {
    const notesStore = readNotes();
    if (!Array.isArray(notesStore[targetId])) notesStore[targetId] = [];

    const exists = notesStore[targetId].some(n => n.key === entryKey);
    if (!exists) {
      notesStore[targetId].push({ key: entryKey, order, text });
      writeNotes(notesStore);
    }
  }

  document.addEventListener("click", (e) => {
    // Accept BOTH styles:
    // - tables: <button class="notes-btn" data-notes-target="...">
    // - pages 3/4: <button data-notes-btn data-notes-target="...">
    const btn = e.target.closest("button[data-notes-target]");
    if (!btn) return;

    // absolutely prevent any default behavior that could move the page
    e.preventDefault();
    e.stopPropagation();

    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const inTable = !!btn.closest("table");
    const title = inTable ? getTableTitle(btn) : getNonTableTitle(btn);

    // key should be stable per row
    let key = `${targetId}::${title}`;
    let order = 999999;

    if (inTable) {
      const tr = btn.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || "";
      key = `${targetId}::row::${rowKey || title}`;
      order = getTableRowIndex(btn);
    } else {
      order = getChecklistRowIndex(btn);
    }

    ensureNoteEntry(targetId, key, order, buildBulletBlock(title));
    rebuildNotes(targetId);

    // Focus notes textarea WITHOUT scrolling
    const ta = getNotesTextarea(targetId);
    if (ta) ta.focus({ preventScroll: true });
  });

  /* =======================
     SUPPORT TICKETS
  ======================= */
  const ticketContainers = {
    Open: $("#openTicketsContainer"),
    "Tier Two": $("#tierTwoTicketsContainer"),
    "Closed - Resolved": $("#closedResolvedTicketsContainer"),
    "Closed - Feature Not Supported": $("#closedFeatureTicketsContainer"),
  };

  function ticketIsBase(groupEl) {
    return groupEl?.getAttribute?.("data-base") === "true";
  }

  function requiredTicketFieldsFilled(groupEl) {
    const ticketNum = $(".ticket-number-input", groupEl)?.value?.trim();
    const url = $(".ticket-zendesk-input", groupEl)?.value?.trim();
    const summary = $(".ticket-summary-input", groupEl)?.value?.trim();
    return !!(ticketNum && url && summary);
  }

  function setTicketStatus(groupEl, status, lock = false) {
    const sel = $(".ticket-status-select", groupEl);
    if (!sel) return;
    sel.value = status;
    sel.disabled = !!lock;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function moveTicketGroup(groupEl, status) {
    const dest = ticketContainers[status] || ticketContainers.Open;
    if (!dest) return;

    if (ticketIsBase(groupEl)) {
      setTicketStatus(groupEl, "Open", true);
      return;
    }

    const sel = $(".ticket-status-select", groupEl);
    if (sel) sel.disabled = false;

    const disc = $(".ticket-disclaimer", groupEl);
    if (disc) disc.remove();

    dest.appendChild(groupEl);
  }

  if (ticketContainers.Open) {
    const base = $('.ticket-group[data-base="true"]', ticketContainers.Open);
    if (base) setTicketStatus(base, "Open", true);
  }

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const group = addBtn.closest(".ticket-group");
    if (!group || !ticketIsBase(group)) return;

    if (!requiredTicketFieldsFilled(group)) {
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    const clone = group.cloneNode(true);
    clone.setAttribute("data-base", "false");

    $$("input, textarea", clone).forEach(el => (el.value = ""));
    setTicketStatus(clone, "Open", false);

    if (!$(".remove-ticket-btn", clone)) {
      const inner = $(".ticket-group-inner", clone) || clone;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "remove-ticket-btn";
      rm.textContent = "Remove";
      rm.title = "Remove Ticket";
      inner.prepend(rm);
    }

    ticketContainers.Open?.appendChild(clone);

    ensureStableFieldIds(clone);
    captureState(document);
  });

  document.addEventListener("click", (e) => {
    const rm = e.target.closest(".remove-ticket-btn");
    if (!rm) return;

    const group = rm.closest(".ticket-group");
    if (!group || ticketIsBase(group)) return;

    ensureStableFieldIds(group);
    const state = readState();
    $$("input, select, textarea", group).forEach(el => {
      const k = getFieldKey(el);
      if (k && k in state) delete state[k];
    });
    writeState(state);

    group.remove();
  });

  document.addEventListener("change", (e) => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    const group = sel.closest(".ticket-group");
    if (!group) return;

    if (ticketIsBase(group)) {
      sel.value = "Open";
      sel.disabled = true;
      return;
    }

    moveTicketGroup(group, sel.value || "Open");
    captureState(document);
  });

  /* =======================
     DEALERSHIP MAP HELPER
  ======================= */
  window.updateDealershipMap = function updateDealershipMap(address) {
    const frame = $("#dealershipMapFrame");
    if (!frame) return;
    const q = encodeURIComponent(address || "");
    frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
  };

  /* =======================
     OPTIONAL: ONSITE DATE DEFAULT
  ======================= */
  function formatDateYYYYMMDD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function addDays(dateStr, days) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    return formatDateYYYYMMDD(d);
  }

  const onsiteStart = $("#onsiteStartDate");
  const onsiteEnd = $("#onsiteEndDate");
  if (onsiteStart && onsiteEnd && isDate(onsiteStart) && isDate(onsiteEnd)) {
    onsiteStart.addEventListener("change", () => {
      if (!onsiteStart.value) return;
      if (!onsiteEnd.value) {
        onsiteEnd.value = addDays(onsiteStart.value, 2);
        onsiteEnd.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  /* =======================
     INIT
  ======================= */
  function init() {
    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    // activate first visible page on load
    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // rebuild notes textareas from store (no scrolling)
    const notesStore = readNotes();
    Object.keys(notesStore).forEach(targetId => rebuildNotes(targetId));

    // save once to lock ids
    captureState(document);
  }

  init();

})();
