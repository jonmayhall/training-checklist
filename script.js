/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Page nav (sidebar)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons (also clears notes-order memory for that page)
   ✅ Add Row (+) for all tables (keeps notes buttons working)
   ✅ Notes buttons:
        - Cards (Pages 3–4) + Tables (Pages 5–6)
        - Clicking a notes button inserts a structured bullet into the target textarea
        - Bullets stay in DOM order even if clicked out-of-order
        - NO screen “shift down then up” when clicking notes buttons
   ✅ Support Tickets:
        - Base ticket locked to Open
        - Adding a ticket TRANSFERS base values into the new ticket (clone)
        - Base is cleared for the next entry
        - NO injected Remove buttons
        - NO injected Add buttons
        - Only BASE shows disclaimer (tight spacing) and card shrinks to fit
        - Status dropdown font set to black

   Defensive: won’t crash if some elements/sections don’t exist
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

  // Notes ordering memory (stored inside STORAGE_KEY payload)
  const NOTES_ORDER_KEY = "__mk_notes_order_v1";

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

  function getPageIdForEl(el) {
    return el?.closest?.(".page-section")?.id || "";
  }

  function safeText(s) {
    return String(s ?? "").replace(/\s+/g, " ").trim();
  }

  /* =======================
     STORAGE
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

  function getNotesOrderState(state) {
    if (!state[NOTES_ORDER_KEY] || typeof state[NOTES_ORDER_KEY] !== "object") {
      state[NOTES_ORDER_KEY] = {};
    }
    return state[NOTES_ORDER_KEY];
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
     PERSISTENT ID SYSTEM
  ======================= */
  function ensureStableFieldIds(root = document) {
    // rows
    $$("tr", root).forEach(tr => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });

    // cards
    $$(".ticket-group, .card, .section-block, .dms-card", root).forEach(card => {
      if (!card.getAttribute(AUTO_CARD_ATTR)) card.setAttribute(AUTO_CARD_ATTR, uid("card"));
    });

    // form controls
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

      const pageId = getPageIdForEl(el) || "no-page";
      const table = el.closest("table");
      const tr = el.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || "";

      let colIndex = "";
      if (tr) {
        const cell = el.closest("td,th");
        if (cell) colIndex = String(Array.from(tr.children).indexOf(cell));
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
     PAGE NAVIGATION (NO SHIFT ON NOTES)
  ======================= */
  const pageSections = $$(".page-section");
  const navButtons = $$(".nav-btn");

  function activatePage(sectionId, opts = { scrollTop: true }) {
    if (!sectionId) return;

    pageSections.forEach(sec => sec.classList.remove("active"));
    navButtons.forEach(btn => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    // ✅ Only nav clicks should scroll to top. Notes clicks must NOT.
    if (opts.scrollTop) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target, { scrollTop: true }));
  });

  /* =======================
     RESET THIS PAGE BUTTONS
     - clears inputs/selects/textareas in that page
     - removes saved fields for that page
     - clears notes-order memory for that page’s notes targets
  ======================= */
  function clearPageNotesOrder(pageEl) {
    const state = readState();
    const notesOrder = getNotesOrderState(state);

    const targets = new Set(
      $$("[data-notes-target]", pageEl)
        .map(b => b.getAttribute("data-notes-target"))
        .filter(Boolean)
    );

    Object.keys(notesOrder).forEach(targetId => {
      if (targets.has(targetId)) delete notesOrder[targetId];
    });

    writeState(state);
  }

  $$(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      // Clear UI
      $$("input, select, textarea", page).forEach(el => {
        if (isCheckbox(el) || isRadio(el)) el.checked = false;
        else el.value = "";
      });

      applyGhostStyling(page);

      // Remove saved field values for this page
      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach(el => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });

      // Also clear ordering memory for notes targets on that page
      clearPageNotesOrder(page);

      writeState(state);
    });
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

  // Normalize table notes buttons to match the rest: class "notes-btn", icon-only
  function normalizeTableNotesButtons(root = document) {
    // Accept either already .notes-btn or anything using data-notes-target
    $$("button[data-notes-target]", root).forEach(btn => {
      btn.type = "button";
      btn.classList.add("notes-btn");
      btn.textContent = ""; // icon-only (CSS handles icon)
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Notes");
    });
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

    // Remove IDs inside clone (avoid dup IDs)
    $$("[id]", clone).forEach(el => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach(el => el.removeAttribute(AUTO_ID_ATTR));

    tbody.appendChild(clone);

    normalizeTableNotesButtons(clone);
    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     NOTES SYSTEM
     -------------------------------------------------------
     GOALS:
       - Clicking notes button inserts bullet + hollow sub-bullet
       - Bullets stay in DOM order even if clicked out-of-order
       - Tables: bullet should be "• Name" OR "• Opcode" only (no dash)
       - No bold formatting added (no **)
       - No screen “shift down then up” on click
  ======================= */

  const BULLET_MAIN = "• ";
  const BULLET_SUB  = "    ◦ "; // more indent + hollow bullet

  function getNotesTextareaByTargetId(targetId) {
    const block = document.getElementById(targetId);
    if (!block) return null;
    return block.querySelector("textarea");
  }

  function parseNotesSections(text) {
    // Sections start with "• "
    const lines = String(text || "").split("\n");
    const sections = [];
    let current = null;

    function pushCurrent() {
      if (current) sections.push(current);
      current = null;
    }

    for (const line of lines) {
      if (line.startsWith(BULLET_MAIN)) {
        pushCurrent();
        current = { heading: line.trimEnd(), body: [] };
      } else {
        if (!current) {
          // keep leading stray text as a pseudo-section
          current = { heading: "", body: [] };
        }
        current.body.push(line);
      }
    }
    pushCurrent();
    return sections;
  }

  function buildNotesTextFromSections(sections) {
    const out = [];
    sections.forEach((sec, idx) => {
      if (sec.heading) out.push(sec.heading);
      // Keep body exactly
      if (sec.body && sec.body.length) out.push(...sec.body);
      if (idx !== sections.length - 1) out.push(""); // blank line between sections
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n");
  }

  function ensureSectionBodyHasSubBullet(section) {
    const body = section.body || [];
    const hasSub = body.some(l => l.trimStart().startsWith("◦") || l.startsWith(BULLET_SUB));
    if (!hasSub) {
      // Put one empty sub-bullet line directly under heading
      section.body = [BULLET_SUB, ...body.filter((_, i) => i !== 0)];
    }
  }

  function getNotesTargetOrder(targetId) {
    // DOM order index list: all buttons pointing to this target
    // Each button yields an entry string (used as heading)
    const btns = $$(`[data-notes-target="${CSS.escape(targetId)}"]`);
    return btns.map(btn => makeEntryHeading(btn)).filter(Boolean);
  }

  function makeEntryHeading(btn) {
    // Determine if table row note or card/row question note

    // TABLE ROW: use first text input in the row (Name) OR opcode cell for opcode tables
    const tr = btn.closest("tr");
    if (tr) {
      // opcode table: likely has inputs; choose 2nd cell input as opcode if present and looks like opcode column
      // Prefer: if row has many inputs and an input[type="text"] in early columns, choose the first non-empty in first 3 cells
      const cells = Array.from(tr.children);
      const earlyInputs = [];
      for (let i = 0; i < Math.min(cells.length, 4); i++) {
        earlyInputs.push(...Array.from(cells[i].querySelectorAll('input[type="text"]')));
      }
      const val = safeText(earlyInputs.find(i => safeText(i.value))?.value || earlyInputs[0]?.value || "");

      // Also try: name field might be in first cell (checkbox + text)
      if (val) return `${BULLET_MAIN}${val}`;

      // fallback: any text input anywhere in row
      const anyText = tr.querySelector('input[type="text"]');
      const anyVal = safeText(anyText?.value || "");
      if (anyVal) return `${BULLET_MAIN}${anyVal}`;

      return `${BULLET_MAIN}Row`;
    }

    // CARD/ROW QUESTION: use the label text for that checklist-row
    const row = btn.closest(".checklist-row");
    if (row) {
      const label = row.querySelector("label");
      const labelText = safeText(label?.innerText || "");
      if (labelText) return `${BULLET_MAIN}${labelText}`;
    }

    // Generic fallback
    return `${BULLET_MAIN}Notes`;
  }

  function reorderAndInsertNotes(targetId, headingToEnsure) {
    const ta = getNotesTextareaByTargetId(targetId);
    if (!ta) return;

    const currentText = ta.value || "";
    const sections = parseNotesSections(currentText);

    // map existing by heading
    const map = new Map();
    sections.forEach(sec => {
      if (sec.heading) map.set(sec.heading, sec);
    });

    // desired order based on DOM order
    const desired = getNotesTargetOrder(targetId);

    // if we have an ensured heading not present in DOM order (rare), append it
    if (headingToEnsure && !desired.includes(headingToEnsure)) desired.push(headingToEnsure);

    // build ordered sections
    const ordered = [];
    desired.forEach(h => {
      let sec = map.get(h);
      if (!sec) {
        sec = { heading: h, body: [BULLET_SUB] };
      } else {
        ensureSectionBodyHasSubBullet(sec);
      }
      ordered.push(sec);
      map.delete(h);
    });

    // Append any leftover sections (user custom headings) at the end, preserving them
    for (const sec of map.values()) {
      if (sec.heading) ordered.push(sec);
    }

    ta.value = buildNotesTextFromSections(ordered);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function rememberNotesOrder(targetId) {
    const state = readState();
    const notesOrder = getNotesOrderState(state);
    notesOrder[targetId] = getNotesTargetOrder(targetId);
    writeState(state);
  }

  // Initial normalization for table notes buttons
  normalizeTableNotesButtons(document);

  // Notes click handler: NO scroll, NO jump. Just activate page without scroll.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return;

    // If notes block is on a different page, activate that page but DO NOT scroll to top
    const page = notesBlock.closest(".page-section");
    if (page && !page.classList.contains("active")) {
      activatePage(page.id, { scrollTop: false });
    }

    // Build heading for this button
    const heading = makeEntryHeading(btn);

    // Persist desired order (based on DOM)
    rememberNotesOrder(targetId);

    // Ensure heading exists and text is ordered
    reorderAndInsertNotes(targetId, heading);

    // Focus textarea without scrolling
    const ta = notesBlock.querySelector("textarea");
    if (ta) {
      // no scroll shifting
      setTimeout(() => ta.focus({ preventScroll: true }), 0);
    }

    flash(notesBlock);
  });

  /* =======================
     SUPPORT TICKETS
     -------------------------------------------------------
     - Base ticket locked to Open
     - "Add ticket" transfers entered values into new ticket
     - Base clears for next ticket
     - NO remove button injection
     - Strip Add button from clones
     - Only base shows disclaimer (tight) and card shrinks
     - Status select font black
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

  function setSelectBlack(sel) {
    if (!sel) return;
    sel.style.color = "#000";
  }

  function requiredTicketFieldsFilled(groupEl) {
    const ticketNum = groupEl.querySelector(".ticket-number-input")?.value?.trim();
    const url = groupEl.querySelector(".ticket-zendesk-input")?.value?.trim();
    const summary = groupEl.querySelector(".ticket-summary-input")?.value?.trim();
    return !!(ticketNum && url && summary);
  }

  function setTicketStatus(groupEl, status, lock = false) {
    const sel = groupEl.querySelector(".ticket-status-select");
    if (!sel) return;
    sel.value = status;
    sel.disabled = !!lock;
    setSelectBlack(sel);
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function stripTicketButtons(groupEl, opts = { keepAddOnBase: true }) {
    if (!groupEl) return;

    // Remove any injected remove buttons (or any remove buttons)
    groupEl.querySelectorAll(".remove-ticket-btn, [data-ticket-remove], .ticket-remove").forEach(b => b.remove());

    // Remove Add button from clones
    if (!ticketIsBase(groupEl) || !opts.keepAddOnBase) {
      groupEl.querySelectorAll(".add-ticket-btn, [data-ticket-add], .ticket-add").forEach(b => b.remove());
    }
  }

  function normalizeTicketDisclaimer(groupEl) {
    if (!groupEl) return;

    const isBase = ticketIsBase(groupEl);
    const disc = groupEl.querySelector(".ticket-disclaimer");

    if (!isBase) {
      if (disc) disc.remove();
      // shrink clones too
      groupEl.style.height = "auto";
      groupEl.style.minHeight = "unset";
      groupEl.style.paddingBottom = "10px";
      return;
    }

    // Base must have disclaimer
    let d = disc;
    if (!d) {
      d = document.createElement("div");
      d.className = "ticket-disclaimer";
      d.textContent = "Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.";
      groupEl.appendChild(d);
    }

    // Place disclaimer directly under short summary
    const summary = groupEl.querySelector(".ticket-summary-input");
    if (summary) {
      const wrap =
        summary.closest(".checklist-row") ||
        summary.closest(".field") ||
        summary.parentElement;

      if (wrap && wrap.parentElement) {
        wrap.insertAdjacentElement("afterend", d);
      }
    }

    // Tight spacing + shrink
    d.style.marginTop = "6px";
    d.style.paddingTop = "0px";
    d.style.paddingBottom = "0px";
    groupEl.style.height = "auto";
    groupEl.style.minHeight = "unset";
    groupEl.style.paddingBottom = "10px";
  }

  function moveTicketGroup(groupEl, status) {
    const dest = ticketContainers[status] || ticketContainers.Open;
    if (!dest) return;

    if (ticketIsBase(groupEl)) {
      setTicketStatus(groupEl, "Open", true);
      return;
    }

    const sel = groupEl.querySelector(".ticket-status-select");
    if (sel) {
      sel.disabled = false;
      setSelectBlack(sel);
    }

    stripTicketButtons(groupEl, { keepAddOnBase: false });
    dest.appendChild(groupEl);

    normalizeTicketDisclaimer(groupEl);
  }

  function copyTicketFields(fromEl, toEl) {
    if (!fromEl || !toEl) return;

    const fields = [
      [".ticket-number-input", "value"],
      [".ticket-zendesk-input", "value"],
      [".ticket-summary-input", "value"],
    ];

    fields.forEach(([sel, prop]) => {
      const a = fromEl.querySelector(sel);
      const b = toEl.querySelector(sel);
      if (a && b) b[prop] = a[prop] || "";
    });

    // Copy status selection value too (but clones remain editable)
    const aStatus = fromEl.querySelector(".ticket-status-select");
    const bStatus = toEl.querySelector(".ticket-status-select");
    if (aStatus && bStatus) {
      bStatus.value = aStatus.value || "Open";
      bStatus.disabled = false;
      setSelectBlack(bStatus);
    }
  }

  function clearTicketFields(groupEl) {
    if (!groupEl) return;
    groupEl.querySelectorAll("input, textarea").forEach(el => (el.value = ""));
    const sel = groupEl.querySelector(".ticket-status-select");
    if (sel) {
      sel.value = "Open";
      setSelectBlack(sel);
    }
    groupEl.querySelectorAll("input, textarea, select").forEach(el => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  // Init: lock base ticket
  if (ticketContainers.Open) {
    const base = ticketContainers.Open.querySelector('.ticket-group[data-base="true"]');
    if (base) {
      setTicketStatus(base, "Open", true);
      stripTicketButtons(base, { keepAddOnBase: true });
      normalizeTicketDisclaimer(base);

      // Ensure select font black even when disabled
      const sel = base.querySelector(".ticket-status-select");
      if (sel) setSelectBlack(sel);
    }

    // Normalize any existing clones (remove disclaimer/buttons)
    $$(".ticket-group", ticketContainers.Open).forEach(g => {
      stripTicketButtons(g, { keepAddOnBase: true });
      normalizeTicketDisclaimer(g);
      const sel = g.querySelector(".ticket-status-select");
      if (sel) setSelectBlack(sel);
    });
  }

  // Add ticket: transfers base info into a new clone, then clears base
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const baseGroup = addBtn.closest(".ticket-group");
    if (!baseGroup || !ticketIsBase(baseGroup)) return;

    if (!requiredTicketFieldsFilled(baseGroup)) {
      flash(baseGroup, "mk-flash", 700);
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    const clone = baseGroup.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, uid("ticket"));

    // Transfer values from base into clone, then clear base
    copyTicketFields(baseGroup, clone);

    // Clones must not have add/remove and must not have disclaimer
    stripTicketButtons(clone, { keepAddOnBase: false });
    normalizeTicketDisclaimer(clone);

    // Base stays locked Open and keeps disclaimer, then clear inputs for next entry
    clearTicketFields(baseGroup);
    setTicketStatus(baseGroup, "Open", true);
    stripTicketButtons(baseGroup, { keepAddOnBase: true });
    normalizeTicketDisclaimer(baseGroup);

    ticketContainers.Open?.appendChild(clone);

    ensureStableFieldIds(clone);
    captureState(document);
  });

  // Status changes move clones only
  document.addEventListener("change", (e) => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    const group = sel.closest(".ticket-group");
    if (!group) return;

    setSelectBlack(sel);

    if (ticketIsBase(group)) {
      sel.value = "Open";
      sel.disabled = true;
      setSelectBlack(sel);
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
    normalizeTableNotesButtons(document);
    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    // Activate initial page (do not force scroll that causes “shift”)
    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active, { scrollTop: false });

    // Save once after init to lock IDs
    captureState(document);
  }

  init();

})();
