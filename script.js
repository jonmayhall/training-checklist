/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Page nav (sidebar)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons
   ✅ Add Row (+) for all tables (keeps dropdowns/notes working)
   ✅ Notes buttons (ALL pages + tables) -> bullet system + scroll + focus
   ✅ Bullets stay in correct on-page order (even if clicked out of order)
   ✅ Tables bullets pull Name + Opcode (when those columns exist)
   ✅ Support Tickets: base locked to Open, clones enforced, move by status
   ✅ Dealership Map update helper (if #dealershipMapFrame exists)
   ✅ Defensive: won’t crash if some elements/sections don’t exist
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v4";
  const AUTO_ID_ATTR = "data-mk-id";      // persistent identity marker
  const AUTO_ROW_ATTR = "data-mk-row";    // stable row marker for cloned rows
  const AUTO_CARD_ATTR = "data-mk-card";  // stable card marker for cloned cards

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

  function safeText(str) {
    return (str || "").toString().replace(/\s+/g, " ").trim();
  }
  function normalizeKey(str) {
    return safeText(str).toLowerCase();
  }

  function flash(el, cls = "mk-flash", ms = 800) {
    if (!isEl(el)) return;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  }

  function scrollToEl(el, offset = -10) {
    if (!isEl(el)) return;
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: "smooth" });
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
     - Make sure every notes button is:
       [data-notes-btn][data-notes-target]
     - We DO NOT inject SVG; your HTML/CSS controls the look.
  ======================= */
  function normalizeNotesButtons(root = document) {
    // Accept older markup and normalize it
    $$("button[data-notes-target]", root).forEach((btn) => {
      if (!btn.hasAttribute("data-notes-btn")) btn.setAttribute("data-notes-btn", "");
      btn.type = "button";
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Add/View Notes");
    });
  }

  /* =======================
     PERSISTENT ID SYSTEM
     (autosave/restore remains stable across dynamic rows/cards)
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

  // Save on changes
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

  function activatePage(sectionId) {
    if (!sectionId) return;

    pageSections.forEach((sec) => sec.classList.remove("active"));
    navButtons.forEach((btn) => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target));
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
     - Clones first row of tbody to preserve exact column structure
     - Clears values and removes saved ids so autosave assigns new stable ids
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

    // Clear values
    clearControls(clone);

    // Remove any explicit ids and prior stable keys
    $$("[id]", clone).forEach((el) => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach((el) => el.removeAttribute(AUTO_ID_ATTR));

    // Normalize any notes buttons inside row
    normalizeNotesButtons(clone);

    tbody.appendChild(clone);

    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     NOTES BULLETS SYSTEM
     - Clicking any [data-notes-btn][data-notes-target] button:
       ✅ creates (or reuses) a bullet inside the notes section
       ✅ bullets stay in DOM-order for that notes target
       ✅ tables bullets include Name + Opcode (if headers exist)
       ✅ scrolls to notes + focuses textarea
  ======================= */

  function getNotesBlock(targetId) {
    if (!targetId) return null;
    return document.getElementById(targetId) || $(`#${CSS.escape(targetId)}`);
  }

  function ensureBulletsUI(notesBlock) {
    if (!notesBlock) return null;

    let wrap = notesBlock.querySelector(".notes-bullets-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "notes-bullets-wrap";
      const h2 = notesBlock.querySelector("h2");
      if (h2) h2.insertAdjacentElement("afterend", wrap);
      else notesBlock.insertAdjacentElement("afterbegin", wrap);
    }

    let title = wrap.querySelector(".notes-bullets-title");
    if (!title) {
      title = document.createElement("div");
      title.className = "notes-bullets-title";
      title.textContent = "Bullet Points:";
      wrap.appendChild(title);
    }

    let ul = wrap.querySelector("ul.notes-bullets");
    if (!ul) {
      ul = document.createElement("ul");
      ul.className = "notes-bullets";
      wrap.appendChild(ul);
    }

    return ul;
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
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
  }

  function getClosestLabelText(btn) {
    const row = btn.closest(".checklist-row");
    if (row) {
      const lbl = $("label", row);
      if (lbl) return safeText(lbl.textContent);
    }
    return "Notes item";
  }

  function getTableContext(btn) {
    const tr = btn.closest("tr");
    const table = btn.closest("table");
    if (!tr || !table) return null;

    const ths = $$("thead th", table).map((th) => safeText(th.textContent));
    const tds = $$("td", tr);

    function findColIndex(headerName) {
      const hn = normalizeKey(headerName);
      return ths.findIndex((t) => normalizeKey(t) === hn);
    }

    function getCellTextAt(idx) {
      if (idx < 0 || idx >= tds.length) return "";
      const cell = tds[idx];

      // Prefer control values
      const control =
        cell.querySelector("input[type='text'], input:not([type]), select") || null;
      if (control) {
        if (control.tagName === "SELECT") {
          return safeText(control.options[control.selectedIndex]?.textContent || control.value);
        }
        return safeText(control.value);
      }
      return safeText(cell.textContent);
    }

    // Name column (often checkbox + text input)
    let name = "";
    const nameIdx = findColIndex("Name");
    if (nameIdx >= 0) {
      const cell = tds[nameIdx];
      const nameInput = cell
        ? cell.querySelector("input[type='text'], input:not([type])")
        : null;
      name = safeText(nameInput ? nameInput.value : getCellTextAt(nameIdx));
    } else {
      const anyText = tr.querySelector("input[type='text'], input:not([type])");
      name = safeText(anyText ? anyText.value : "");
    }

    // Opcode column
    let opcode = "";
    const opcodeIdx = findColIndex("Opcode");
    if (opcodeIdx >= 0) opcode = getCellTextAt(opcodeIdx);

    return { table, tr, name, opcode };
  }

  function buildBulletLabel(btn) {
    const ctx = getTableContext(btn);
    if (ctx) {
      const parts = [];
      if (ctx.name) parts.push(`Name: ${ctx.name}`);
      if (ctx.opcode) parts.push(`Opcode: ${ctx.opcode}`);
      return parts.length ? parts.join(" — ") : "Table row notes";
    }
    return getClosestLabelText(btn);
  }

  function buildBulletKey(btn, targetId) {
    const ctx = getTableContext(btn);
    if (ctx) {
      const tId = ctx.table.id ? `table:${ctx.table.id}` : "table";
      return [
        tId,
        `target:${targetId}`,
        `name:${normalizeKey(ctx.name)}`,
        `opcode:${normalizeKey(ctx.opcode)}`,
      ].join("|");
    }
    const label = buildBulletLabel(btn);
    return `target:${targetId}|label:${normalizeKey(label)}`;
  }

  function ensureBullet(notesUl, key, label, orderIndex) {
    if (!notesUl) return null;

    let existing = notesUl.querySelector(`li[data-note-key="${CSS.escape(key)}"]`);
    if (existing) return existing;

    const li = document.createElement("li");
    li.className = "notes-bullet-item";
    li.dataset.noteKey = key;
    li.dataset.orderIndex = String(orderIndex);

    const span = document.createElement("span");
    span.className = "notes-bullet-text";
    span.textContent = label;

    li.appendChild(span);

    const items = $$("li.notes-bullet-item", notesUl);
    const insertBefore = items.find((it) => {
      const i = parseInt(it.dataset.orderIndex || "999999", 10);
      return orderIndex < i;
    });

    if (insertBefore) notesUl.insertBefore(li, insertBefore);
    else notesUl.appendChild(li);

    return li;
  }

  function scrollToNotesBlock(notesBlock) {
    if (!notesBlock) return;
    notesBlock.scrollIntoView({ behavior: "smooth", block: "start" });

    // Small nudge for sticky headers/top bars
    setTimeout(() => {
      const offset = 90;
      window.scrollTo({ top: Math.max(0, window.scrollY - offset), behavior: "smooth" });
    }, 250);
  }

  // Normalize notes buttons now (including tables)
  normalizeNotesButtons(document);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-notes-btn][data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    const notesBlock = getNotesBlock(targetId);
    if (!notesBlock) return;

    const notesUl = ensureBulletsUI(notesBlock);
    const label = buildBulletLabel(btn);
    const key = buildBulletKey(btn, targetId);
    const orderIndex = getOrderIndex(btn, targetId);

    const li = ensureBullet(notesUl, key, label, orderIndex);

    // Activate notes page if notes block is on an inactive page
    const page = notesBlock.closest(".page-section");
    if (page && !page.classList.contains("active")) activatePage(page.id);

    // Scroll + focus
    scrollToNotesBlock(notesBlock);
    setTimeout(() => {
      if (li) {
        li.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(li, "flash-highlight", 900);
      }
      const ta = getTextarea(notesBlock);
      if (ta) ta.focus({ preventScroll: true });
    }, 450);
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
     MINIMAL CSS INJECTION (safe)
     - Bullets UI + flash highlight
  ======================= */
  function injectCss() {
    if (document.getElementById("mk-notes-bullets-css")) return;
    const style = document.createElement("style");
    style.id = "mk-notes-bullets-css";
    style.textContent = `
      .notes-bullets-wrap{
        margin:10px 0 12px;
        padding:10px 12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.08);
        background:rgba(255,255,255,.03);
      }
      .notes-bullets-title{font-size:12px;opacity:.75;margin-bottom:6px;}
      ul.notes-bullets{margin:0;padding-left:18px;}
      li.notes-bullet-item{margin:6px 0;line-height:1.25;}
      li.notes-bullet-item.flash-highlight{
        outline:2px solid rgba(255,165,0,.55);
        border-radius:10px;
        padding:4px 6px;
        margin-left:-6px;
      }
      .notes-bullet-text{font-size:13px;}
    `;
    document.head.appendChild(style);
  }

  /* =======================
     INIT
  ======================= */
  function init() {
    injectCss();
    normalizeNotesButtons(document);
    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // Save once after init to “lock in” ids
    captureState(document);
  }

  init();
})();
