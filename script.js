/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Fix: NO screen “shift down then back up” on Notes clicks
      - activatePage() no longer forces scroll-to-top when opened from Notes
      - scroll happens once (after layout), then we update textarea
   ✅ Bullets are spaced out (blank line between bullets)
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v8";
  const AUTO_ID_ATTR = "data-mk-id";
  const AUTO_ROW_ATTR = "data-mk-row";
  const AUTO_CARD_ATTR = "data-mk-card";

  /* =======================
     HELPERS
  ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const uid = (() => {
    let n = 0;
    return (prefix = "mk") =>
      `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}-${++n}`;
  })();

  const isEl = (x) => x && x.nodeType === 1;
  const isCheckbox = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "checkbox";
  const isRadio = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "radio";
  const isDate = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "date";

  const safeText = (str) => (str || "").toString().replace(/\s+/g, " ").trim();
  const normalizeKey = (str) => safeText(str).toLowerCase();

  function flash(el, cls = "mk-flash", ms = 800) {
    if (!isEl(el)) return;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  }

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

  /* =======================
     GHOST / PLACEHOLDER STYLING
  ======================= */
  function applyGhostStyling(root = document) {
    $$("select", root).forEach((sel) => {
      const update = () => sel.classList.toggle("is-placeholder", !sel.value);
      sel.addEventListener("change", update);
      update();
    });

    $$("input[type='date']", root).forEach((inp) => {
      const update = () => inp.classList.toggle("is-placeholder", !inp.value);
      inp.addEventListener("change", update);
      update();
    });
  }

  /* =======================
     NOTES BUTTON NORMALIZATION
  ======================= */
  function normalizeNotesButtons(root = document) {
    $$("button[data-notes-target]", root).forEach((btn) => {
      if (!btn.hasAttribute("data-notes-btn")) btn.setAttribute("data-notes-btn", "");
      btn.type = "button";
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Add/View Notes");
    });
  }

  /* =======================
     PERSISTENT ID SYSTEM
  ======================= */
  function ensureStableFieldIds(root = document) {
    $$("tr", root).forEach((tr) => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });

    $$(".ticket-group, .card, .section-block, .dms-card", root).forEach((card) => {
      if (!card.getAttribute(AUTO_CARD_ATTR)) card.setAttribute(AUTO_CARD_ATTR, uid("card"));
    });

    $$("input, select, textarea", root).forEach((el) => {
      if (el.tagName === "INPUT") {
        const type = (el.type || "").toLowerCase();
        if (["button", "submit", "reset", "file"].includes(type)) return;
      }

      if (el.id) {
        if (!el.getAttribute(AUTO_ID_ATTR)) el.setAttribute(AUTO_ID_ATTR, el.id);
        return;
      }

      if (el.getAttribute(AUTO_ID_ATTR)) return;

      const page = el.closest(".page-section");
      const pageId = page?.id || "no-page";

      const table = el.closest("table");
      const tr = el.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || "";

      let colIndex = "";
      if (tr) {
        const cell = el.closest("td,th");
        if (cell) {
          const cells = Array.from(tr.children);
          colIndex = String(cells.indexOf(cell));
        }
      }

      const scope = el.closest("td,th") || tr || el.parentElement || document.body;
      const siblings = $$("input, select, textarea", scope);
      const idx = siblings.indexOf(el);

      const mkid = `${pageId}::${table ? "table" : "form"}::${rowKey}::c${colIndex}::i${idx}`;
      el.setAttribute(AUTO_ID_ATTR, mkid);
    });
  }

  /* =======================
     AUTOSAVE / RESTORE
  ======================= */
  function readState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function getFieldKey(el) {
    return el?.getAttribute?.(AUTO_ID_ATTR) || el?.id || "";
  }

  function captureState(root = document) {
    ensureStableFieldIds(root);
    const state = readState();

    $$("input, select, textarea", root).forEach((el) => {
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

    $$("input, select, textarea", root).forEach((el) => {
      const key = getFieldKey(el);
      if (!key || !(key in state)) return;

      if (isCheckbox(el)) el.checked = !!state[key];
      else if (isRadio(el)) el.checked = el.value === state[key];
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
  const navButtons = $$(".nav-btn");

  // ✅ change: allow preserving scroll when opening page from Notes click
  function activatePage(sectionId, opts = {}) {
    if (!sectionId) return;

    pageSections.forEach((sec) => sec.classList.remove("active"));
    navButtons.forEach((btn) => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    if (!opts.preserveScroll) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target, { preserveScroll: false }));
  });

  /* =======================
     RESET THIS PAGE BUTTONS
  ======================= */
  $$(".clear-page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      $$("input, select, textarea", page).forEach((el) => {
        if (isCheckbox(el) || isRadio(el)) el.checked = false;
        else el.value = "";
      });

      applyGhostStyling(page);

      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach((el) => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });
      writeState(state);
    });
  });

  /* =======================
     TABLE ADD ROW (+)
  ======================= */
  function clearControls(root) {
    $$("input, select, textarea", root).forEach((el) => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });
    applyGhostStyling(root);
  }

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

    clearControls(clone);

    $$("[id]", clone).forEach((el) => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach((el) => el.removeAttribute(AUTO_ID_ATTR));

    normalizeNotesButtons(clone);

    tbody.appendChild(clone);

    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     NOTES BULLETS (ORDERED + SPACED)
  ======================= */
  function getNotesBlock(targetId) {
    if (!targetId) return null;
    return document.getElementById(targetId) || $(`#${CSS.escape(targetId)}`);
  }
  function getTextarea(notesBlock) {
    return notesBlock ? $("textarea", notesBlock) : null;
  }
  function getAllNotesButtonsForTarget(targetId) {
    if (!targetId) return [];
    return $$(`[data-notes-btn][data-notes-target="${CSS.escape(targetId)}"]`);
  }
  function getOrderIndex(clickedBtn, targetId) {
    const all = getAllNotesButtonsForTarget(targetId);
    const idx = all.indexOf(clickedBtn);
    return idx >= 0 ? idx : 999999;
  }

  // remove existing bullet header section (• lines + blank lines right after)
  function stripLeadingBullets(text) {
    const lines = (text || "").split("\n");
    let i = 0;

    // consume bullets and any blank lines between bullets
    while (i < lines.length) {
      const t = lines[i].trim();
      if (t.startsWith("•") || t === "") {
        // keep consuming until we hit first non-bullet non-empty after we've started
        i++;
        continue;
      }
      break;
    }

    // remove extra blank lines at the very top of the remaining content
    const rest = lines.slice(i).join("\n").replace(/^\n+/, "");
    return rest;
  }

  function ensureNotesMeta(state) {
    if (!state.__notesBullets || typeof state.__notesBullets !== "object") {
      state.__notesBullets = {};
    }
    return state.__notesBullets;
  }

  function getTableContext(btn) {
    const tr = btn.closest("tr");
    const table = btn.closest("table");
    if (!tr || !table) return null;

    if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    const rowId = tr.getAttribute(AUTO_ROW_ATTR);

    const ths = $$("thead th", table).map((th) => safeText(th.textContent));
    const tds = $$("td", tr);

    const notesCell = btn.closest("td");
    const notesColIndex = notesCell ? tds.indexOf(notesCell) : -1;

    function getCellTextAt(idx) {
      if (idx < 0 || idx >= tds.length) return "";
      const cell = tds[idx];

      const sel = cell.querySelector("select");
      if (sel) return safeText(sel.options[sel.selectedIndex]?.textContent || sel.value);

      const inp = cell.querySelector("input[type='text'], input:not([type])");
      if (inp) return safeText(inp.value);

      return safeText(cell.textContent);
    }

    // Name
    let name = "";
    const nameIdx = ths.findIndex((t) => normalizeKey(t) === "name");
    if (nameIdx >= 0) {
      const cell = tds[nameIdx];
      const nameInput = cell ? cell.querySelector("input[type='text'], input:not([type])") : null;
      name = safeText(nameInput ? nameInput.value : getCellTextAt(nameIdx));
    } else {
      const anyText = tr.querySelector("input[type='text'], input:not([type])");
      name = safeText(anyText ? anyText.value : "");
    }

    // Opcode (page 6)
    let opcode = "";
    const opcodeIdx = ths.findIndex((t) => normalizeKey(t) === "opcode");
    if (opcodeIdx >= 0) opcode = getCellTextAt(opcodeIdx);

    // Column header immediately LEFT of Notes column
    let colHeader = "Note";
    if (notesColIndex > 0 && ths[notesColIndex - 1]) colHeader = ths[notesColIndex - 1];

    const tableId = table.id ? `table:${table.id}` : "table";
    return { tableId, rowId, name, opcode, colHeader };
  }

  function buildBulletText(btn) {
    const ctx = getTableContext(btn);
    if (ctx) {
      const n = ctx.name ? `Name: ${ctx.name}` : "Name:";
      const o = ctx.opcode ? `Opcode: ${ctx.opcode}` : "Opcode:";
      return `${n} | ${o} | ${ctx.colHeader}`; // ✅ no "Question:"
    }
    const row = btn.closest(".checklist-row");
    const lbl = row ? $("label", row) : null;
    return safeText(lbl ? lbl.textContent : "Note");
  }

  function buildBulletKey(btn, targetId) {
    const ctx = getTableContext(btn);
    if (ctx) return `target:${targetId}|${ctx.tableId}|row:${ctx.rowId}|h:${normalizeKey(ctx.colHeader)}`;
    const row = btn.closest(".checklist-row");
    const lbl = row ? $("label", row) : null;
    return `target:${targetId}|h:${normalizeKey(lbl ? lbl.textContent : "note")}`;
  }

  function upsertBullet(targetId, bulletKey, bulletText, orderIndex) {
    const state = readState();
    const meta = ensureNotesMeta(state);

    if (!Array.isArray(meta[targetId])) meta[targetId] = [];
    const list = meta[targetId];

    const existing = list.find((b) => b.key === bulletKey);
    if (existing) {
      existing.text = bulletText;
      if (!Number.isFinite(existing.order)) existing.order = 999999;
      if (Number.isFinite(orderIndex) && orderIndex < existing.order) existing.order = orderIndex;
    } else {
      list.push({ key: bulletKey, text: bulletText, order: orderIndex, createdAt: Date.now() });
    }

    writeState(state);
  }

  function rebuildNotesTextareaForTarget(targetId) {
    const notesBlock = getNotesBlock(targetId);
    const ta = getTextarea(notesBlock);
    if (!ta) return;

    const state = readState();
    const meta = ensureNotesMeta(state);
    const list = Array.isArray(meta[targetId]) ? meta[targetId] : [];

    list.sort((a, b) => {
      const oa = Number.isFinite(a.order) ? a.order : 999999;
      const ob = Number.isFinite(b.order) ? b.order : 999999;
      if (oa !== ob) return oa - ob;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    const rest = stripLeadingBullets(ta.value);

    // ✅ spaced bullets: blank line between each bullet
    const bulletLines = list.map((b) => `• ${b.text}`).join("\n\n");

    ta.value = bulletLines + (rest ? `\n\n${rest}` : "");
    ta.dispatchEvent(new Event("input", { bubbles: true }));

    writeState(state);
  }

  // ✅ one scroll only, after layout has settled, to prevent “shift”
  function scrollToNotesBlockStable(notesBlock) {
    if (!notesBlock) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        notesBlock.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  normalizeNotesButtons(document);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-notes-btn][data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    const notesBlock = getNotesBlock(targetId);
    if (!notesBlock) return;

    // ✅ If we need to activate another page, do NOT force scroll-to-top
    const page = notesBlock.closest(".page-section");
    if (page && !page.classList.contains("active")) {
      activatePage(page.id, { preserveScroll: true });
    }

    const orderIndex = getOrderIndex(btn, targetId);
    const bulletText = buildBulletText(btn);
    const bulletKey = buildBulletKey(btn, targetId);

    upsertBullet(targetId, bulletKey, bulletText, orderIndex);

    scrollToNotesBlockStable(notesBlock);

    // ✅ Update textarea AFTER scroll kicks off; no second scroll or offset
    setTimeout(() => {
      rebuildNotesTextareaForTarget(targetId);
      const ta = getTextarea(notesBlock);
      if (ta) {
        flash(notesBlock);
        ta.focus({ preventScroll: true });
      }
    }, 250);
  });

  /* =======================
     SUPPORT TICKETS (unchanged)
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
      flash(group, "mk-flash", 700);
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    const clone = group.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, uid("ticket"));

    $$("input, textarea", clone).forEach((el) => (el.value = ""));
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
    $$("input, select, textarea", group).forEach((el) => {
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
    normalizeNotesButtons(document);
    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    // Rebuild bullet lists for any targets already stored
    const state = readState();
    const meta =
      state.__notesBullets && typeof state.__notesBullets === "object" ? state.__notesBullets : {};
    Object.keys(meta).forEach((targetId) => rebuildNotesTextareaForTarget(targetId));

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active, { preserveScroll: false });

    captureState(document);
  }

  init();
})();
