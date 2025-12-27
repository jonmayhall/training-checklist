/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Page nav (sidebar)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons (also clears NOTES bullets for that page)
   ✅ Add Row (+) for all tables (keeps notes buttons working)
   ✅ Notes buttons:
        - Pages 3/4 keep their SVG icon buttons as-is
        - Tables use your .notes-btn icon-only button styling
        - Clicking notes inserts a bullet into the target notes textarea
        - Bullets stay in the correct on-page order even if clicked out of order
        - TABLE bullets: ONLY actual Name or Opcode -> "• **Name** -"  (no “Technicians – Checklist”, etc.)
        - NON-TABLE bullets: "• **Prompt**" + indented bullet below for your notes
        - Spacing between entries for readability
   ✅ NO SCROLL SHIFT on notes clicks (locks scroll position)
   ✅ Support Tickets logic
   ✅ Dealership Map helper
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v3";
  const NOTES_KEY   = "mykaarma_interactive_checklist__notes_v3";

  const AUTO_ID_ATTR   = "data-mk-id";
  const AUTO_ROW_ATTR  = "data-mk-row";
  const AUTO_CARD_ATTR = "data-mk-card";

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
  const isRadio = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "radio";
  const isDate = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "date";

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

  function safeText(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  // Prevent scroll jumps caused by focus/layout updates
  function lockScrollWhile(fn) {
    const x = window.scrollX;
    const y = window.scrollY;

    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    fn();

    requestAnimationFrame(() => {
      window.scrollTo(x, y);
      requestAnimationFrame(() => {
        window.scrollTo(x, y);
        html.style.scrollBehavior = prevBehavior || "";
      });
    });
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
     NOTES STORAGE (bullets)
  ======================= */
  function readNotesState() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"); }
    catch { return {}; }
  }
  function writeNotesState(obj) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(obj || {}));
  }

  function getNotesItems(targetId) {
    const ns = readNotesState();
    return Array.isArray(ns[targetId]) ? ns[targetId] : [];
  }
  function setNotesItems(targetId, items) {
    const ns = readNotesState();
    ns[targetId] = Array.isArray(items) ? items : [];
    writeNotesState(ns);
  }

  function upsertBullet(targetId, bulletKey, bulletText, orderIndex) {
    const items = getNotesItems(targetId);
    const now = Date.now();
    const existing = items.find(it => it.key === bulletKey);

    if (existing) {
      existing.text  = bulletText;
      existing.index = Number.isFinite(orderIndex) ? orderIndex : existing.index;
      existing.ts    = now;
    } else {
      items.push({
        key: bulletKey,
        text: bulletText,
        index: Number.isFinite(orderIndex) ? orderIndex : 999999,
        ts: now
      });
    }

    items.sort((a, b) => {
      const ai = Number.isFinite(a.index) ? a.index : 999999;
      const bi = Number.isFinite(b.index) ? b.index : 999999;
      if (ai !== bi) return ai - bi;
      return (a.ts || 0) - (b.ts || 0);
    });

    setNotesItems(targetId, items);
  }

  function rebuildNotesTextareaForTarget(targetId) {
    const block = document.getElementById(targetId);
    if (!block) return;

    const ta = $("textarea", block);
    if (!ta) return;

    const items = getNotesItems(targetId);
    // spaced entries (blank line between each)
    ta.value = items.map(it => it.text).join("\n\n");

    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* =======================
     NOTES BUTTON NORMALIZATION
     - DO NOT wipe SVG buttons on pages 3/4 (.notes-icon-btn)
     - Ensure table notes buttons are icon-only .notes-btn
  ======================= */
  function normalizeNotesButtons(root = document) {
    $$("button[data-notes-target], button[data-notes-btn][data-notes-target]", root).forEach(btn => {
      btn.type = "button";
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Notes");

      // Keep pages 3/4 SVG buttons intact
      if (btn.classList.contains("notes-icon-btn")) return;

      // Table-style icon button
      btn.classList.add("notes-btn");
      if (!btn.querySelector("svg")) btn.textContent = "";
    });
  }

  /* =======================
     PERSISTENT ID SYSTEM (autosave)
  ======================= */
  function ensureStableFieldIds(root = document) {
    $$("tr", root).forEach(tr => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });

    $$(".ticket-group, .card, .section-block, .dms-card", root).forEach(card => {
      if (!card.getAttribute(AUTO_CARD_ATTR)) card.setAttribute(AUTO_CARD_ATTR, uid("card"));
    });

    $$("input, select, textarea", root).forEach(el => {
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
     AUTOSAVE / RESTORE (fields)
  ======================= */
  function readState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; }
    catch { return {}; }
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
  const navButtons = $$(".nav-btn");

  function activatePage(sectionId, opts = {}) {
    if (!sectionId) return;

    const preserveScroll = !!opts.preserveScroll;
    const x = window.scrollX;
    const y = window.scrollY;

    pageSections.forEach(sec => sec.classList.remove("active"));
    navButtons.forEach(btn => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    if (!preserveScroll) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else window.scrollTo(x, y);
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target, { preserveScroll: false }));
  });

  /* =======================
     RESET THIS PAGE BUTTONS
     - clears fields on that page
     - clears saved field state for that page
     - clears saved NOTES bullets for notes blocks on that page
  ======================= */
  $$(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      $$("input, select, textarea", page).forEach(el => {
        if (isCheckbox(el) || isRadio(el)) el.checked = false;
        else el.value = "";
      });

      applyGhostStyling(page);

      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach(el => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });
      writeState(state);

      const ns = readNotesState();
      $$(".section-block[id]", page).forEach(block => {
        const id = block.id || "";
        if (id.startsWith("notes-")) delete ns[id];
      });
      writeNotesState(ns);

      $$(".section-block[id^='notes-'] textarea", page).forEach(ta => {
        ta.value = "";
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  });

  /* =======================
     GLOBAL CLEAR ALL (optional)
  ======================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-clear-all="true"]');
    if (!btn) return;
    if (!confirm("Clear ALL saved data for this checklist?")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NOTES_KEY);
    location.reload();
  });

  /* =======================
     TABLE ADD ROW (+)
  ======================= */
  function clearControls(root) {
    $$("input, select, textarea", root).forEach(el => {
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

    $$("[id]", clone).forEach(el => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach(el => el.removeAttribute(AUTO_ID_ATTR));

    tbody.appendChild(clone);
    normalizeNotesButtons(clone);

    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     BULLET BUILDERS
     REQUIRED FORMAT:
       NON-TABLE:
         • **Prompt**
           •
       TABLE:
         • **Name** -
           •
         OR
         • **Opcode** -
           •
     (NO “Technicians – Checklist”, etc.)
  ======================= */

  function getOrderIndex(btn, targetId) {
    const all = $$(`[data-notes-target="${CSS.escape(targetId)}"]`);
    return all.indexOf(btn);
  }

  function getPromptFromLabel(btn) {
    const row = btn.closest(".checklist-row");
    if (!row) return "";
    const lab = $("label", row);
    return lab ? safeText(lab.textContent) : "";
  }

  function getTableName(btn) {
    const tr = btn.closest("tr");
    if (!tr) return "";
    const firstTd = tr.querySelector("td");
    if (!firstTd) return "";
    const nameInput = firstTd.querySelector('input[type="text"]');
    return nameInput ? safeText(nameInput.value) : "";
  }

  function getTableOpcode(btn) {
    const tr = btn.closest("tr");
    if (!tr) return "";
    const tds = Array.from(tr.querySelectorAll("td"));
    if (tds.length >= 2) {
      const opcodeInput = tds[1].querySelector('input[type="text"]');
      if (opcodeInput) return safeText(opcodeInput.value);
    }
    return "";
  }

  function buildBulletText(btn) {
    const inTable = !!btn.closest("table");

    if (inTable) {
      const name = getTableName(btn);
      const opcode = getTableOpcode(btn);
      const primary = name || opcode || "—";
      // table bullet: ONLY name OR opcode
      return `• **${primary}** -\n  •`;
    }

    // non-table bullet uses ONLY label prompt (no section headers)
    const prompt = getPromptFromLabel(btn) || "—";
    return `• **${prompt}**\n  •`;
  }

  function buildBulletKey(btn, targetId) {
    const inTable = !!btn.closest("table");
    if (inTable) {
      const tr = btn.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || uid("rowkey");
      return `${targetId}::table::${rowKey}`;
    }
    const idx = getOrderIndex(btn, targetId);
    const prompt = getPromptFromLabel(btn);
    return `${targetId}::row::${idx}::${prompt.slice(0, 40)}`;
  }

  /* =======================
     NOTES CLICK HANDLER (NO SHIFT)
  ======================= */
  normalizeNotesButtons(document);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-notes-btn][data-notes-target], .notes-btn[data-notes-target]");
    if (!btn) return;

    e.preventDefault();

    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return;

    const page = notesBlock.closest(".page-section");
    if (page && !page.classList.contains("active")) {
      activatePage(page.id, { preserveScroll: true });
    }

    lockScrollWhile(() => {
      ensureStableFieldIds(document);

      const orderIndex = getOrderIndex(btn, targetId);
      const bulletText = buildBulletText(btn);
      const bulletKey  = buildBulletKey(btn, targetId);

      upsertBullet(targetId, bulletKey, bulletText, orderIndex);
      rebuildNotesTextareaForTarget(targetId);

      captureState(document);
    });

    setTimeout(() => {
      const ta = notesBlock.querySelector("textarea");
      if (ta) ta.focus({ preventScroll: true });
    }, 30);
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
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    const clone = group.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, uid("ticket"));

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

    ticketContainers.Open.appendChild(clone);

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

    // rebuild notes textareas from saved bullets
    const notesState = readNotesState();
    Object.keys(notesState || {}).forEach(targetId => {
      if (document.getElementById(targetId)) rebuildNotesTextareaForTarget(targetId);
    });

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active, { preserveScroll: true });

    captureState(document);
  }

  init();

})();
