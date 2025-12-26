/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Page nav (sidebar)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons
   ✅ Add Row (+) for all tables (keeps notes buttons working)
   ✅ Notes buttons (Pages 3–6 consistent) -> scroll + focus notes textarea
   ✅ Optional bullet insertion into notes (if you add data-insert-bullet)
   ✅ Support Tickets: base locked to Open, clones enforced, move by status
   ✅ Dealership Map update helper (if #dealershipMapFrame exists)
   ✅ Defensive: won’t crash if some elements/sections don’t exist
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v3";
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
     - select empty => .is-placeholder
     - date empty => .is-placeholder
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
     -------------------------------------------------------
     Your project has tons of inputs without ids (tables esp.).
     This system assigns a stable id to every field using:
       - page id
       - table index / row index
       - cell element order
     and stores it in data-mk-id.
     That makes autosave/restore actually work across the whole app.
  ======================= */

  function ensureStableFieldIds(root = document) {
    // Mark rows and cards so dynamic clones are stable
    $$("tr", root).forEach(tr => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });

    $$(".ticket-group, .card, .section-block, .dms-card", root).forEach(card => {
      // Only mark things that look like repeatables
      if (!card.getAttribute(AUTO_CARD_ATTR)) card.setAttribute(AUTO_CARD_ATTR, uid("card"));
    });

    // Assign stable IDs for form controls if missing
    $$("input, select, textarea", root).forEach(el => {
      // Skip buttons and non-form inputs
      if (el.tagName === "INPUT") {
        const type = (el.type || "").toLowerCase();
        if (["button", "submit", "reset", "file"].includes(type)) return;
      }

      // If element already has an explicit id, use it as the persistence key
      if (el.id) {
        if (!el.getAttribute(AUTO_ID_ATTR)) el.setAttribute(AUTO_ID_ATTR, el.id);
        return;
      }

      // If already has a mk-id, keep it
      if (el.getAttribute(AUTO_ID_ATTR)) return;

      const page = el.closest(".page-section");
      const pageId = page?.id || "no-page";

      // Build a structured locator
      const table = el.closest("table");
      const tr = el.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || "";

      // Column index (td) if any
      let colIndex = "";
      if (tr) {
        const cell = el.closest("td,th");
        if (cell) {
          const cells = Array.from(tr.children);
          colIndex = String(cells.indexOf(cell));
        }
      }

      // Position among same-tag controls in the same cell (or row)
      const scope = el.closest("td,th") || tr || el.parentElement || document.body;
      const siblings = $$("input, select, textarea", scope);
      const idx = siblings.indexOf(el);

      const mkid = `${pageId}::${table ? "table" : "form"}::${rowKey}::c${colIndex}::i${idx}`;
      el.setAttribute(AUTO_ID_ATTR, mkid);
    });
  }

  /* =======================
     AUTOSAVE / RESTORE
     - uses data-mk-id as the key
     - works for dynamically added rows/cards
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
     - expects .nav-btn[data-target="sectionId"]
     - expects .page-section
  ======================= */
  const pageSections = $$(".page-section");
  const navButtons = $$(".nav-btn");

  function activatePage(sectionId) {
    if (!sectionId) return;

    pageSections.forEach(sec => sec.classList.remove("active"));
    navButtons.forEach(btn => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target));
  });

  /* =======================
     RESET THIS PAGE BUTTONS
     - .clear-page-btn inside .page-section
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

      // Also clear state entries for keys that belong to this page
      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach(el => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });
      writeState(state);
    });
  });

  /* =======================
     GLOBAL CLEAR ALL (optional)
     - supports any button with:
         data-clear-all="true"
  ======================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-clear-all="true"]');
    if (!btn) return;
    if (!confirm("Clear ALL saved data for this checklist?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  /* =======================
     TABLE ADD ROW (+)
     - button.add-row inside .table-footer
     - clones FIRST tbody row as template
     - clears controls
     - preserves notes buttons and data-notes-target
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

    // mark row id
    clone.setAttribute(AUTO_ROW_ATTR, uid("row"));

    // Clear values
    clearControls(clone);

    // Remove any duplicate explicit ids inside cloned row (keep AUTO_ID_ATTR rebuilt)
    $$("[id]", clone).forEach(el => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach(el => el.removeAttribute(AUTO_ID_ATTR));

    tbody.appendChild(clone);

    // Rebuild stable ids and autosave
    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     NOTES BUTTONS (Pages 3–6 consistent)
     -------------------------------------------------------
     Buttons:
       <button class="notes-btn" data-notes-target="notes-techs"></button>
     Targets:
       <div id="notes-techs"><textarea></textarea></div>
  ======================= */
  // Make sure all notes buttons have aria-label
  $$(".notes-btn").forEach(b => {
    if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", "Notes");
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".notes-btn,[data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return;

    // Activate the page containing the notes block if it’s on a different page
    const page = notesBlock.closest(".page-section");
    if (page && !page.classList.contains("active")) activatePage(page.id);

    scrollToEl(notesBlock, -12);
    flash(notesBlock);

    const ta = $("textarea", notesBlock);
    if (ta) setTimeout(() => ta.focus({ preventScroll: true }), 250);
  });

  /* =======================
     OPTIONAL: INSERT BULLET INTO NOTES
     -------------------------------------------------------
     If you add buttons like:
       <button data-notes-target="notes-techs" data-insert-bullet="• John Doe:">Add</button>
  ======================= */
  function appendBullet(textarea, bulletLine) {
    if (!textarea || !bulletLine) return;

    const current = textarea.value || "";
    const trimmed = current.replace(/\s+$/g, "");
    const needsBlankLine = trimmed.length > 0 && !trimmed.endsWith("\n\n");

    textarea.value =
      trimmed +
      (trimmed.length ? (needsBlankLine ? "\n\n" : "\n") : "") +
      bulletLine +
      "\n";

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-insert-bullet][data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    const bullet = btn.getAttribute("data-insert-bullet");
    if (!targetId || !bullet) return;

    const block = document.getElementById(targetId);
    const ta = block ? $("textarea", block) : null;
    if (!ta) return;

    appendBullet(ta, bullet);
    flash(block);
    ta.focus({ preventScroll: true });
  });

  /* =======================
     SUPPORT TICKETS (your structure)
     -------------------------------------------------------
     Containers expected by id:
       #openTicketsContainer
       #tierTwoTicketsContainer
       #closedResolvedTicketsContainer
       #closedFeatureTicketsContainer
     Base card:
       .ticket-group[data-base="true"] inside Open
     Base rules:
       - status locked to Open
       - must fill ticket number, url, summary before adding new
     Clones:
       - can change status; moved automatically
       - removable
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

    // Base must stay open
    if (ticketIsBase(groupEl)) {
      setTicketStatus(groupEl, "Open", true);
      return;
    }

    // Enable select for non-base
    const sel = $(".ticket-status-select", groupEl);
    if (sel) sel.disabled = false;

    // Remove disclaimer from clones if it exists
    const disc = $(".ticket-disclaimer", groupEl);
    if (disc) disc.remove();

    dest.appendChild(groupEl);
  }

  // Initialize base lock
  if (ticketContainers.Open) {
    const base = $('.ticket-group[data-base="true"]', ticketContainers.Open);
    if (base) setTicketStatus(base, "Open", true);
  }

  // Add ticket (+) from base
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

    // Clear ticket values
    $$("input, textarea", clone).forEach(el => (el.value = ""));
    // Unlock select on clone
    setTicketStatus(clone, "Open", false);

    // Add remove button if not present
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

    // Rebuild IDs and persist
    ensureStableFieldIds(clone);
    captureState(document);
  });

  // Remove ticket (clones only)
  document.addEventListener("click", (e) => {
    const rm = e.target.closest(".remove-ticket-btn");
    if (!rm) return;

    const group = rm.closest(".ticket-group");
    if (!group || ticketIsBase(group)) return;

    // remove its persisted keys
    ensureStableFieldIds(group);
    const state = readState();
    $$("input, select, textarea", group).forEach(el => {
      const k = getFieldKey(el);
      if (k && k in state) delete state[k];
    });
    writeState(state);

    group.remove();
  });

  // Status change moves tickets
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
     -------------------------------------------------------
     If you have:
       <iframe id="dealershipMapFrame"></iframe>
     then updateDealershipMap(address) will update it.
  ======================= */
  window.updateDealershipMap = function updateDealershipMap(address) {
    const frame = $("#dealershipMapFrame");
    if (!frame) return;

    const q = encodeURIComponent(address || "");
    // Embed search (no key required for basic embed)
    frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
  };

  /* =======================
     OPTIONAL: ONSITE DATE DEFAULT
     -------------------------------------------------------
     If you have start/end ids, we’ll auto-set end = start + 2.
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
    // Ensure IDs exist before restore
    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    // Activate first page
    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // Save once after init to “lock in” ids
    captureState(document);
  }

  init();

})();
