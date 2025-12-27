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
   ✅ Support Tickets:
       - Base locked to Open
       - Add clones that KEEP base data
       - Base clears after add
       - Status dropdown font black
       - Remove button removed / never injected
       - Add button removed from clones
   ✅ Dealership map helper
   ✅ Ghost styling for selects/dates
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG / STORAGE
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v10";
  const NOTES_KEY   = "mykaarma_interactive_checklist__notes_v10";

  const AUTO_ID_ATTR  = "data-mk-id";
  const AUTO_ROW_ATTR = "data-mk-row";

  const SUB_INDENT = "              ";
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
     SELECT COLOR HELPERS
  ======================= */
  function forceSelectBlack(sel) {
    if (!sel) return;
    // Always black font per request
    sel.style.color = "#000";
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
      if (el.tagName === "INPUT") {
        const type = (el.type || "").toLowerCase();
        if (["button", "submit", "reset", "file"].includes(type)) return;
      }

      if (el.id && !el.getAttribute(AUTO_ID_ATTR)) el.setAttribute(AUTO_ID_ATTR, el.id);
      if (el.getAttribute(AUTO_ID_ATTR)) return;

      const page = el.closest(".page-section");
      const pageId = page?.id || "no-page";
      const tr = el.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || "no-row";

      let colIndex = "x";
      if (tr) {
        const cell = el.closest("td,th");
        if (cell) colIndex = String(Array.from(tr.children).indexOf(cell));
      }

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

    if (!dontScroll) window.scrollTo({ top: 0, behavior: "instant" });
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target));
  });

  /* =======================
     RESET THIS PAGE
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

      clearControls(page);

      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach(el => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });
      writeState(state);

      const notes = readNotes();
      const noteBlocks = $$("[id^='notes-']", page)
        .map(b => b.id)
        .filter(Boolean);

      noteBlocks.forEach(id => {
        delete notes[id];
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

    $$("input, select, textarea", clone).forEach(el => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });

    $$("[id]", clone).forEach(el => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach(el => el.removeAttribute(AUTO_ID_ATTR));

    tbody.appendChild(clone);

    ensureStableFieldIds(tbody);
    applyGhostStyling(clone);
    captureState(document);
  });

  /* =======================
     NOTES — BULLET SYSTEM (NO SCROLL / NO SHIFT)
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

    if (pageId === "opcodes-pricing") {
      const opcode = tr?.querySelector("td:nth-child(2) input[type='text']")?.value?.trim();
      return opcode || "—";
    }

    const name = tr?.querySelector("td:first-child input[type='text']")?.value?.trim();
    return name || "—";
  }

  function buildBulletBlock(title) {
    return `${BULLET_MAIN}${title}\n${SUB_INDENT}${BULLET_SUB}`;
  }

  function rebuildNotes(targetId) {
    const ta = getNotesTextarea(targetId);
    if (!ta) return;

    const notesStore = readNotes();
    const arr = Array.isArray(notesStore[targetId]) ? notesStore[targetId] : [];
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
    const btn = e.target.closest("button[data-notes-target]");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const inTable = !!btn.closest("table");
    const title = inTable ? getTableTitle(btn) : getNonTableTitle(btn);

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

    const ta = getNotesTextarea(targetId);
    if (ta) ta.focus({ preventScroll: true });
  });

  /* =======================
     SUPPORT TICKETS (UPDATED)
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
    forceSelectBlack(sel);
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function stripTicketButtons(groupEl, { keepAddOnBase = true } = {}) {
    // remove any remove buttons (existing in HTML or previously inserted)
    $$(".remove-ticket-btn", groupEl).forEach(b => b.remove());

    // remove add button from clones
    if (!ticketIsBase(groupEl) || !keepAddOnBase) {
      $$(".add-ticket-btn", groupEl).forEach(b => b.remove());
    }

    // status select always black
    const sel = $(".ticket-status-select", groupEl);
    if (sel) forceSelectBlack(sel);
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

    // remove disclaimers if any
    const disc = $(".ticket-disclaimer", groupEl);
    if (disc) disc.remove();

    dest.appendChild(groupEl);
  }

  // initialize base lock + black font
  if (ticketContainers.Open) {
    const base = $('.ticket-group[data-base="true"]', ticketContainers.Open);
    if (base) {
      setTicketStatus(base, "Open", true);
      stripTicketButtons(base, { keepAddOnBase: true });
    }
  }

  // ensure all current ticket groups have correct button rules + black font
  $$(".ticket-group").forEach(g => stripTicketButtons(g, { keepAddOnBase: true }));
  $$(".ticket-status-select").forEach(sel => forceSelectBlack(sel));

  // ADD ticket:
  // - clone base
  // - clone KEEPS the typed values
  // - clone is not base, no add button, no remove button
  // - base is cleared after add
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const baseGroup = addBtn.closest(".ticket-group");
    if (!baseGroup || !ticketIsBase(baseGroup)) return;

    if (!requiredTicketFieldsFilled(baseGroup)) {
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    const clone = baseGroup.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute("data-mk-ticket", uid("ticket"));

    // IMPORTANT: clone keeps entered values.
    // But we must unlock status select on clone.
    setTicketStatus(clone, "Open", false);

    // Remove buttons from clone (no remove, no add)
    stripTicketButtons(clone, { keepAddOnBase: false });

    // Append clone to Open container
    ticketContainers.Open?.appendChild(clone);

    // Clear base inputs after adding (so you can enter next ticket)
    $$("input, textarea", baseGroup).forEach(el => (el.value = ""));
    // keep base status locked to Open
    setTicketStatus(baseGroup, "Open", true);
    stripTicketButtons(baseGroup, { keepAddOnBase: true });

    ensureStableFieldIds(clone);
    ensureStableFieldIds(baseGroup);
    captureState(document);
  });

  // status change move
  document.addEventListener("change", (e) => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    forceSelectBlack(sel);

    const group = sel.closest(".ticket-group");
    if (!group) return;

    if (ticketIsBase(group)) {
      sel.value = "Open";
      sel.disabled = true;
      forceSelectBlack(sel);
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

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // rebuild notes textareas from store
    const notesStore = readNotes();
    Object.keys(notesStore).forEach(targetId => rebuildNotes(targetId));

    // make ticket status selects black on init
    $$(".ticket-status-select").forEach(sel => forceSelectBlack(sel));

    captureState(document);
  }

  init();

})();
