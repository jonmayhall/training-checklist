/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Sidebar page nav
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page (clears saved state for that page)
   ✅ Add Row (+) for all tables
   ✅ Notes buttons (Pages 3–6 + tables) -> INSERTS BULLET BLOCKS
      - keeps bullets in DOM order even if clicked out of order
      - NO page shifting / NO scrolling
      - creates a spaced block:
          • Title
                ◦ 
   ✅ Tables: bullet is ONLY the Name or Opcode value (no “Technicians – Checklist”, no hyphen)
   ✅ Support Tickets:
      - Only base card shows disclaimer
      - + button only on base card
      - NO remove button
      - Adding a ticket COPIES base inputs into a new card, then clears base inputs
      - Base ticket must be complete before adding another
   ✅ Defensive: won’t crash if sections don’t exist

   NOTES / BULLETS:
   - Uses invisible order markers (no visible **, no visible extra text)
   - Re-sorts bullet blocks in textarea by DOM order on each insert
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v3";
  const AUTO_ID_ATTR = "data-mk-id";
  const AUTO_ROW_ATTR = "data-mk-row";
  const AUTO_CARD_ATTR = "data-mk-card";

  // Invisible marker to preserve DOM order in notes without showing extra text
  const INV = "\u2063"; // invisible separator
  const marker = (n) => `${INV}${n}${INV}`;
  const markerRe = new RegExp(`${INV}(\\d+)${INV}$`);

  /* =======================
     HELPERS
  ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
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
     STABLE IDS (autosave-safe)
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
     PAGE NAVIGATION (no jump)
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
    // IMPORTANT: no scrollTo here (prevents shifting)
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target));
  });

  /* =======================
     RESET THIS PAGE
     - Clears fields AND clears saved state keys for that page
     - Prevents “old notes” reappearing later
  ======================= */
  function clearControls(root) {
    $$("input, select, textarea", root).forEach((el) => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });
    applyGhostStyling(root);
  }

  function clearSavedStateForRoot(root) {
    ensureStableFieldIds(root);
    const state = readState();

    $$("input, select, textarea", root).forEach((el) => {
      const k = getFieldKey(el);
      if (k && k in state) delete state[k];
    });

    writeState(state);
  }

  $$(".clear-page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      clearControls(page);
      clearSavedStateForRoot(page);
    });
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-clear-all="true"]');
    if (!btn) return;
    if (!confirm("Clear ALL saved data for this checklist?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  /* =======================
     ADD ROW (+) for tables
  ======================= */
  function scrubCloneIds(node) {
    $$("[id]", node).forEach((el) => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, node).forEach((el) => el.removeAttribute(AUTO_ID_ATTR));
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
    scrubCloneIds(clone);

    // Ensure notes buttons exist + are normalized
    normalizeNotesButtons(clone);
    assignNotesOrder(document);

    tbody.appendChild(clone);

    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     NOTES BUTTONS — NORMALIZE
     Supports:
       - data-notes-target (tables + pages 3–6)
       - data-notes-btn (pages 3–4)
  ======================= */
  function normalizeNotesButtons(root = document) {
    $$("button[data-notes-target], button[data-notes-btn]", root).forEach((btn) => {
      btn.type = "button";
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Notes");
      // do NOT force innerHTML/text: pages 3/4 use SVG buttons.
      // tables use icon via CSS; leaving content alone is safest.
    });
  }

  /* =======================
     NOTES ORDER (DOM order)
  ======================= */
  function assignNotesOrder(root = document) {
    let i = 1;
    $$("button[data-notes-target], button[data-notes-btn]", root).forEach((btn) => {
      btn.dataset.mkOrder = String(i++);
      // unify target attr
      if (!btn.getAttribute("data-notes-target") && btn.getAttribute("data-notes-btn")) {
        const t = btn.getAttribute("data-notes-target");
        if (!t) {
          // pages 3/4 already have data-notes-target in your HTML
          // if any are missing, they won't work anyway
        }
      }
    });
  }

  /* =======================
     NOTES: Build bullet text
     Requirements:
       - No markdown **, no “question” word
       - Spaced blocks for readability
       - Indented hollow bullet line beneath (more indent)
       - Tables: ONLY actual Name or Opcode value (no section titles, no hyphens)
  ======================= */
  function getClosestLabelText(btn) {
    // For pages 3/4: button is in .row-actions next to select/input and label is in same .checklist-row
    const row = btn.closest(".checklist-row");
    if (!row) return "";
    const label = $("label", row);
    return (label?.textContent || "").trim();
  }

  function getTablePrimaryValue(btn) {
    const tr = btn.closest("tr");
    if (!tr) return "";

    const table = btn.closest("table");
    if (!table) return "";

    // Find the column index for Notes
    const ths = $$("thead th", table);
    const notesIdx = ths.findIndex((th) => (th.textContent || "").trim().toLowerCase() === "notes");
    if (notesIdx < 0) return "";

    // Prefer “Opcode” column (page 6) if present, else “Name” (page 5)
    const opcodeIdx = ths.findIndex((th) => (th.textContent || "").trim().toLowerCase() === "opcode");
    const nameIdx = ths.findIndex((th) => (th.textContent || "").trim().toLowerCase() === "name");

    const getCellValue = (idx) => {
      if (idx < 0) return "";
      const td = tr.children[idx];
      if (!td) return "";
      const inp = $("input[type='text']", td);
      const sel = $("select", td);
      const val =
        (inp && (inp.value || "").trim()) ||
        (sel && (sel.value || "").trim()) ||
        (td.textContent || "").trim();
      return val;
    };

    // If opcode exists on the table, use opcode value (only)
    if (opcodeIdx >= 0) {
      return getCellValue(opcodeIdx);
    }

    // Otherwise, use name column value (only).
    // Name cell often contains a checkbox + text input; grab the text input.
    if (nameIdx >= 0) {
      const td = tr.children[nameIdx];
      if (!td) return "";
      const nameInput = $$("input[type='text']", td)[0];
      return (nameInput?.value || "").trim();
    }

    return "";
  }

  function buildBulletHeader(btn) {
    const inTable = !!btn.closest("table");

    if (inTable) {
      const primary = getTablePrimaryValue(btn);
      return primary ? `• ${primary}` : `•`; // keep minimal
    }

    // Non-table: use the label text only
    const label = getClosestLabelText(btn);
    return label ? `• ${label}` : `•`;
  }

  function buildIndentedLine() {
    // more indent + hollow bullet
    return `        ◦ `;
  }

  function parseBlocks(text) {
    const lines = (text || "").split("\n");
    const blocks = [];
    let current = null;

    const startRe = /^•\s?.*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (startRe.test(line)) {
        if (current) blocks.push(current);
        current = { lines: [line] };
      } else {
        if (!current) {
          // preamble lines (rare) -> keep as a block with order 0
          current = { lines: [line], preamble: true };
        } else {
          current.lines.push(line);
        }
      }
    }
    if (current) blocks.push(current);

    return blocks;
  }

  function extractOrderFromHeaderLine(line) {
    const m = line.match(markerRe);
    if (!m) return null;
    return Number(m[1]);
  }

  function stripMarkerFromLine(line) {
    return line.replace(markerRe, "");
  }

  function ensureBlockHasIndent(block) {
    // If the block doesn't already have an indented hollow line, add it.
    const hasIndented = block.lines.some((l) => l.trimStart().startsWith("◦") || l.includes("◦"));
    if (!hasIndented) {
      block.lines.push(buildIndentedLine());
    }
    return block;
  }

  function sortAndRebuildTextarea(ta) {
    const blocks = parseBlocks(ta.value);

    // Separate preamble (non-bullet) block(s)
    const pre = blocks.filter((b) => b.preamble);
    const bullets = blocks.filter((b) => !b.preamble);

    // Sort bullet blocks by embedded order marker if present
    bullets.sort((a, b) => {
      const oa = extractOrderFromHeaderLine(a.lines[0]) ?? 999999;
      const ob = extractOrderFromHeaderLine(b.lines[0]) ?? 999999;
      return oa - ob;
    });

    // Make sure all bullet blocks have spaced separation and indent line
    const normalized = bullets.map((b) => {
      b.lines[0] = stripMarkerFromLine(b.lines[0]); // marker is invisible anyway; stripping is safe
      // re-add invisible marker at end if it was there (keeps sorting stable)
      // (we preserve by reading it before stripping)
      return b;
    });

    // rebuild: preamble first, then blocks separated by blank line
    const out = [];
    pre.forEach((b) => out.push(...b.lines));

    normalized.forEach((b, idx) => {
      ensureBlockHasIndent(b);
      if (out.length && out[out.length - 1].trim() !== "") out.push("");
      out.push(...b.lines);
      // extra blank line between entries for readability
      if (idx !== normalized.length - 1) out.push("");
    });

    ta.value = out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  }

  function insertBulletBlock(ta, header, orderNum) {
    const headerWithOrder = `${header}${marker(orderNum)}`; // invisible marker

    const current = ta.value || "";
    // If an exact header already exists (ignoring marker), do nothing
    const exists = current.split("\n").some((l) => stripMarkerFromLine(l).trim() === header.trim());
    if (exists) return;

    const block = [headerWithOrder, buildIndentedLine(), ""].join("\n");
    ta.value = (current.trimEnd() ? current.trimEnd() + "\n\n" : "") + block;

    // reorder to DOM order
    sortAndRebuildTextarea(ta);

    // trigger autosave
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* =======================
     NOTES CLICK HANDLER
     - NO scroll
     - NO activatePage (no shift)
     - Inserts bullet blocks into target textarea
  ======================= */
  normalizeNotesButtons(document);
  assignNotesOrder(document);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-notes-target], button[data-notes-btn]");
    if (!btn) return;

    // Must have a target
    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return;

    const ta = $("textarea", notesBlock);
    if (!ta) return;

    // Build header + insert (no bold, no “question” word, no hyphen)
    const header = buildBulletHeader(btn);
    const orderNum = Number(btn.dataset.mkOrder || 999999);

    insertBulletBlock(ta, header, orderNum);

    // focus without scrolling (prevents page shifting)
    try {
      ta.focus({ preventScroll: true });
    } catch {
      ta.focus();
    }
  });

  /* =======================
     SUPPORT TICKETS
     - Only base shows disclaimer
     - + only on base
     - no remove button (no creation + no handler)
     - Add copies base values into new ticket, then clears base
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

    // base is locked to Open
    if (ticketIsBase(groupEl)) {
      setTicketStatus(groupEl, "Open", true);
      return;
    }

    const sel = $(".ticket-status-select", groupEl);
    if (sel) sel.disabled = false;

    // ensure disclaimer is removed from non-base
    const disc = $(".ticket-disclaimer", groupEl);
    if (disc) disc.remove();

    // ensure any add button is removed from non-base
    const addBtn = $(".add-ticket-btn", groupEl);
    if (addBtn) addBtn.remove();

    // ensure any remove button is removed (no remove tickets)
    const rmBtn = $(".remove-ticket-btn", groupEl);
    if (rmBtn) rmBtn.remove();

    dest.appendChild(groupEl);
  }

  // lock base status to Open on load
  if (ticketContainers.Open) {
    const base = $('.ticket-group[data-base="true"]', ticketContainers.Open);
    if (base) setTicketStatus(base, "Open", true);
  }

  // Add ticket: copy base into new card, then clear base
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const group = addBtn.closest(".ticket-group");
    if (!group || !ticketIsBase(group)) return;

    if (!requiredTicketFieldsFilled(group)) {
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    // Collect base values
    const baseTicketNum = $(".ticket-number-input", group)?.value ?? "";
    const baseUrl = $(".ticket-zendesk-input", group)?.value ?? "";
    const baseSummary = $(".ticket-summary-input", group)?.value ?? "";

    // Clone base structure
    const clone = group.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, uid("ticket"));

    // Remove disclaimer from clone
    const disc = $(".ticket-disclaimer", clone);
    if (disc) disc.remove();

    // Remove add button from clone
    const add = $(".add-ticket-btn", clone);
    if (add) add.remove();

    // Remove remove button if any exists
    const rm = $(".remove-ticket-btn", clone);
    if (rm) rm.remove();

    // Unlock status dropdown for clone and keep black text via CSS
    setTicketStatus(clone, "Open", false);

    // Put copied values into clone
    const cNum = $(".ticket-number-input", clone);
    const cUrl = $(".ticket-zendesk-input", clone);
    const cSum = $(".ticket-summary-input", clone);
    if (cNum) cNum.value = baseTicketNum;
    if (cUrl) cUrl.value = baseUrl;
    if (cSum) cSum.value = baseSummary;

    // Clear base fields for the next entry
    const bNum = $(".ticket-number-input", group);
    const bUrl = $(".ticket-zendesk-input", group);
    const bSum = $(".ticket-summary-input", group);
    if (bNum) bNum.value = "";
    if (bUrl) bUrl.value = "";
    if (bSum) bSum.value = "";

    // Ensure Open container exists and append there
    (ticketContainers.Open || group.parentElement || document.body).appendChild(clone);

    // Ensure stable IDs + save
    scrubCloneIds(clone);
    ensureStableFieldIds(clone);
    ensureStableFieldIds(group);
    captureState(document);
  });

  // Status changes move ticket cards (base stays Open locked)
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
     DEALERSHIP MAP HELPER (safe)
  ======================= */
  window.updateDealershipMap = function updateDealershipMap(address) {
    const frame = $("#dealershipMapFrame");
    if (!frame) return;
    const q = encodeURIComponent(address || "");
    frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
  };

  /* =======================
     OPTIONAL: onsite date default
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
    assignNotesOrder(document);

    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // Save once after init to lock IDs
    captureState(document);
  }

  init();
})();
