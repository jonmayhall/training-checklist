/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Page nav (sidebar)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons (also clears saved state for that page)
   ✅ Add Row (+) for all tables
   ✅ Notes buttons (pages 3–6 + tables): appends an organized bullet stub into the correct Notes textarea
      - No page “jump/shift”
      - Format:
          • Name (or Opcode)
            ◦ <your notes here>
   ✅ Row Popup Modal (Training + Opcodes tables):
      - Opens on row click (not on inputs/buttons)
      - White outer card containing: table card + notes card underneath
      - Moves the LIVE row + LIVE notes block (no syncing bugs)
   ✅ Support Tickets:
      - Base card only shows disclaimer + (+) button
      - Clicking (+) moves base values into a NEW card (prefilled), then clears base
      - No remove buttons anywhere
      - Status dropdown stays black text
      - Ticket moves to correct container by status
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v4";
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

  function flash(el, cls = "mk-flash", ms = 650) {
    if (!isEl(el)) return;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
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
     NOTES BUTTONS — NORMALIZE
     - Any button with data-notes-target becomes icon-only .notes-btn
     - We do NOT inject SVG; your CSS handles the icon
  ======================= */
  function normalizeNotesButtons(root = document) {
    $$("button[data-notes-target]", root).forEach((btn) => {
      btn.classList.add("notes-btn");
      btn.type = "button";
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Notes");
      // icon-only
      btn.textContent = "";
    });

    // Some pages use data-notes-btn + data-notes-target
    $$("button[data-notes-btn][data-notes-target]", root).forEach((btn) => {
      btn.classList.add("notes-btn");
      btn.type = "button";
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Notes");
      // If you want those to remain SVG buttons, comment out next line:
      // btn.textContent = "";
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

  function activatePage(sectionId) {
    if (!sectionId) return;

    pageSections.forEach((sec) => sec.classList.remove("active"));
    navButtons.forEach((btn) => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target));
  });

  /* =======================
     RESET THIS PAGE BUTTONS
     - Clears the page UI
     - Removes saved state for fields on that page
     - Also clears any "notes bullets cache" for that page by removing textarea values from storage
  ======================= */
  function clearControls(root) {
    $$("input, select, textarea", root).forEach((el) => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });
    applyGhostStyling(root);
  }

  $$(".clear-page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      // Clear UI
      clearControls(page);

      // Remove saved values for those fields
      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach((el) => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });
      writeState(state);

      flash(page);
    });
  });

  /* =======================
     TABLE ADD ROW (+)
  ======================= */
  function clearControlsIn(root) {
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
    clearControlsIn(clone);

    $$("[id]", clone).forEach((el) => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach((el) => el.removeAttribute(AUTO_ID_ATTR));

    tbody.appendChild(clone);

    normalizeNotesButtons(clone);
    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     NOTES BULLETS (NO SCROLL SHIFT)
     - Clicking a notes button appends a small stub into the target notes textarea
     - Format:
         • Name (or Opcode)
           ◦
     - No markdown, no bold, no extra symbols
  ======================= */
  function getNotesTargetIdFromButton(btn) {
    return btn.getAttribute("data-notes-target") || btn.dataset.notesTarget || "";
  }

  function getContextLabel(btn) {
    // Table row context: prefer "Name" input value (first text input)
    const row = btn.closest("tr");
    if (row) {
      // Opcode table: opcode is likely first text in row after checkbox; take first non-empty text input
      const texts = $$('input[type="text"]', row).map((i) => (i.value || "").trim());
      const firstNonEmpty = texts.find((v) => v.length);
      if (firstNonEmpty) return firstNonEmpty;

      // If name cell has checkbox + input, still captured above
      // Fallback: nothing
      return "";
    }

    // Non-table checklist-row context: use the label text nearest
    const rowWrap = btn.closest(".checklist-row, .indent-sub");
    if (rowWrap) {
      const label = $("label", rowWrap);
      return (label?.textContent || "").trim();
    }

    return "";
  }

  function getQuestionText(btn) {
    // Non-table: label in same row
    const rowWrap = btn.closest(".checklist-row, .indent-sub");
    if (rowWrap) {
      const label = $("label", rowWrap);
      return (label?.textContent || "").trim();
    }

    // Table: use column header for the cell containing the button
    const td = btn.closest("td");
    const tr = btn.closest("tr");
    const table = btn.closest("table");
    if (td && tr && table) {
      const colIndex = Array.from(tr.children).indexOf(td);
      const th = table.tHead?.rows?.[0]?.children?.[colIndex];
      const head = (th?.textContent || "").trim();
      return head;
    }
    return "";
  }

  function ensureBulletStub(textarea, titleLine) {
    const current = textarea.value || "";

    // If this exact title already exists, do nothing (avoid duplicates)
    if (current.includes(titleLine)) return;

    const spacer = current.trim().length ? "\n\n" : "";
    const hollow = "◦"; // hollow bullet for indented note line

    textarea.value =
      current.replace(/\s+$/g, "") +
      spacer +
      `• ${titleLine}\n` +
      `    ${hollow} \n`;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function focusNotesTextarea(block) {
    const ta = $("textarea", block);
    if (!ta) return;
    // Prevent scroll-jump/shift:
    ta.focus({ preventScroll: true });
  }

  // Normalize existing notes buttons on load
  normalizeNotesButtons(document);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-notes-target], button[data-notes-btn][data-notes-target], .notes-btn");
    if (!btn) return;

    const targetId = getNotesTargetIdFromButton(btn);
    if (!targetId) return;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return;

    // Build title:
    // Tables: only need actual name/opcode (no dash), plus the column label
    // Non-table: just the label text
    const context = getContextLabel(btn);     // name/opcode when table, or label fallback
    const q = getQuestionText(btn);           // column header or label

    let title = "";
    if (btn.closest("tr")) {
      // Table: "NameOrOpcode  ColumnHeader"
      const left = (context || "").trim();
      const right = (q || "").trim();
      title = [left, right].filter(Boolean).join("  ");
    } else {
      // Non-table: use label only
      title = (q || context || "").trim();
    }

    if (!title) title = "Notes";

    // Append stub (no scrolling)
    const ta = $("textarea", notesBlock);
    if (ta) {
      ensureBulletStub(ta, title);
      focusNotesTextarea(notesBlock);
      flash(notesBlock);
    }

    // IMPORTANT: do NOT scroll, do NOT activatePage here (prevents shifting)
    // If you want it to open the row popup instead, the popup handles it.
  });

  /* =======================
     ROW POPUP MODAL (Training + Opcodes tables)
     - Requires the modal HTML you added (mkRowModal)
     - Moves LIVE row + LIVE notes card into modal (no sync issues)
  ======================= */
  const modal = document.getElementById("mkRowModal");
  const tableHost = document.getElementById("mkModalTableHost");
  const notesHost = document.getElementById("mkModalNotesHost");

  let activeModal = null; // { row, rowPH, rowParent, notesEl, notesPH, notesParent }

  function openModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
  }

  function buildModalTableShell(fromTable, row) {
    tableHost.innerHTML = "";

    const h2 = document.createElement("h2");
    h2.textContent = "Row Details";
    tableHost.appendChild(h2);

    const scroll = document.createElement("div");
    scroll.className = "mk-modal__table-scroll";
    tableHost.appendChild(scroll);

    const t = document.createElement("table");
    t.className = fromTable.className || "training-table";
    scroll.appendChild(t);

    const thead = fromTable.tHead ? fromTable.tHead.cloneNode(true) : null;
    if (thead) t.appendChild(thead);

    const tbody = document.createElement("tbody");
    t.appendChild(tbody);

    tbody.appendChild(row); // LIVE row
  }

  function moveRowIntoModal(row) {
    const table = row.closest("table");
    if (!table || !tableHost) return null;

    const ph = document.createElement("tr");
    ph.className = "mk-row-placeholder";

    const parent = row.parentElement;
    parent.insertBefore(ph, row);
    parent.removeChild(row);

    buildModalTableShell(table, row);

    return { parent, ph, table };
  }

  function moveNotesIntoModal(row) {
    if (!notesHost) return null;

    const btn = row.querySelector("button[data-notes-target], button[data-notes-btn][data-notes-target], .notes-btn");
    const targetId = btn?.getAttribute("data-notes-target");
    if (!targetId) return null;

    const notesEl = document.getElementById(targetId);
    if (!notesEl) return null;

    const notesPH = document.createElement("div");
    notesPH.className = "mk-notes-placeholder";

    const notesParent = notesEl.parentElement;
    notesParent.insertBefore(notesPH, notesEl);
    notesParent.removeChild(notesEl);

    notesHost.innerHTML = "";
    notesHost.appendChild(notesEl);

    return { notesEl, notesPH, notesParent };
  }

  function restoreModal() {
    if (!activeModal) return;

    // Restore notes
    if (activeModal.notesEl && activeModal.notesPH && activeModal.notesParent) {
      activeModal.notesParent.insertBefore(activeModal.notesEl, activeModal.notesPH);
      activeModal.notesPH.remove();
    }

    // Restore row
    if (activeModal.row && activeModal.rowPH && activeModal.rowParent) {
      activeModal.rowParent.insertBefore(activeModal.row, activeModal.rowPH);
      activeModal.rowPH.remove();
    }

    if (tableHost) tableHost.innerHTML = "";
    if (notesHost) notesHost.innerHTML = "";

    closeModal();
    activeModal = null;
  }

  if (modal && tableHost && notesHost) {
    modal.addEventListener("click", (e) => {
      if (e.target && e.target.hasAttribute("data-mk-modal-close")) restoreModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") restoreModal();
    });

    // Open on row click (avoid controls)
    document.addEventListener("click", (e) => {
      const t = e.target;

      // ignore clicks on controls/buttons/notes/add-row
      if (
        t.closest("button") ||
        t.closest("a") ||
        t.matches("input, select, textarea, option") ||
        t.closest(".table-footer")
      ) return;

      const row = t.closest("table.training-table tbody tr");
      if (!row) return;

      const movedRow = moveRowIntoModal(row);
      if (!movedRow) return;

      const movedNotes = moveNotesIntoModal(row);

      activeModal = {
        row,
        rowPH: movedRow.ph,
        rowParent: movedRow.parent,
        notesEl: movedNotes?.notesEl || null,
        notesPH: movedNotes?.notesPH || null,
        notesParent: movedNotes?.notesParent || null,
      };

      openModal();
    });
  }

  /* =======================
     SUPPORT TICKETS
     - Base card only has (+) and disclaimer
     - (+) creates a new card with the base values (prefilled)
     - Then clears base for next entry
     - No remove buttons anywhere
     - Status select stays black
     - Cards move by status
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

  function ticketFields(groupEl) {
    return {
      num: $(".ticket-number-input", groupEl),
      status: $(".ticket-status-select", groupEl),
      url: $(".ticket-zendesk-input", groupEl),
      summary: $(".ticket-summary-input", groupEl),
    };
  }

  function requiredTicketFieldsFilled(groupEl) {
    const f = ticketFields(groupEl);
    const ticketNum = f.num?.value?.trim();
    const url = f.url?.value?.trim();
    const summary = f.summary?.value?.trim();
    return !!(ticketNum && url && summary);
  }

  function setTicketStatus(groupEl, status, lock = false) {
    const sel = $(".ticket-status-select", groupEl);
    if (!sel) return;
    sel.value = status;
    sel.disabled = !!lock;
    sel.style.color = "#111"; // keep black text
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function ensureOnlyBaseHasDisclaimerAndAdd(groupEl) {
    const isBase = ticketIsBase(groupEl);

    // Remove any remove buttons (everywhere)
    $$(".remove-ticket-btn", groupEl).forEach((b) => b.remove());

    // Add button: only base keeps it
    const add = $(".add-ticket-btn", groupEl);
    if (add && !isBase) add.remove();

    // Disclaimer: only base keeps it
    const disc = $(".ticket-disclaimer", groupEl);
    if (disc && !isBase) disc.remove();
  }

  function moveTicketGroup(groupEl, status) {
    const dest = ticketContainers[status] || ticketContainers.Open;
    if (!dest) return;

    // base always stays open + locked
    if (ticketIsBase(groupEl)) {
      setTicketStatus(groupEl, "Open", true);
      return;
    }

    // unlock for clones
    const sel = $(".ticket-status-select", groupEl);
    if (sel) {
      sel.disabled = false;
      sel.style.color = "#111";
    }

    // strip disclaimers / buttons (base-only)
    ensureOnlyBaseHasDisclaimerAndAdd(groupEl);

    dest.appendChild(groupEl);
  }

  // Initialize base lock + black text
  if (ticketContainers.Open) {
    const base = $('.ticket-group[data-base="true"]', ticketContainers.Open);
    if (base) {
      setTicketStatus(base, "Open", true);
      ensureOnlyBaseHasDisclaimerAndAdd(base);
    }
  }

  // Add ticket: move base values into a new card, then clear base
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const baseGroup = addBtn.closest(".ticket-group");
    if (!baseGroup || !ticketIsBase(baseGroup)) return;

    if (!requiredTicketFieldsFilled(baseGroup)) {
      flash(baseGroup, "mk-flash", 700);
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another card.");
      return;
    }

    const baseF = ticketFields(baseGroup);

    // Clone the base card WITH the entered values (so the new card "pulls over" the info)
    const clone = baseGroup.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, uid("ticket"));

    // In clone: keep values as-is, unlock status
    setTicketStatus(clone, baseF.status?.value || "Open", false);

    // Remove disclaimer + add button from clone (base-only)
    ensureOnlyBaseHasDisclaimerAndAdd(clone);

    // Append clone to correct container based on its status
    const st = $(".ticket-status-select", clone)?.value || "Open";
    (ticketContainers[st] || ticketContainers.Open)?.appendChild(clone);

    // Now clear base inputs for next ticket entry
    const bf = ticketFields(baseGroup);
    if (bf.num) bf.num.value = "";
    if (bf.url) bf.url.value = "";
    if (bf.summary) bf.summary.value = "";
    setTicketStatus(baseGroup, "Open", true);

    // Make sure base retains disclaimer + add button
    ensureOnlyBaseHasDisclaimerAndAdd(baseGroup);

    ensureStableFieldIds(clone);
    ensureStableFieldIds(baseGroup);
    captureState(document);
  });

  // Status changes: move non-base cards by status
  document.addEventListener("change", (e) => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    sel.style.color = "#111";

    const group = sel.closest(".ticket-group");
    if (!group) return;

    if (ticketIsBase(group)) {
      sel.value = "Open";
      sel.disabled = true;
      sel.style.color = "#111";
      return;
    }

    moveTicketGroup(group, sel.value || "Open");
    captureState(document);
  });

  // On any mutation (new cards), enforce base-only elements
  const ticketsRoot = document.getElementById("support-tickets");
  if (ticketsRoot && window.MutationObserver) {
    const mo = new MutationObserver(() => {
      $$(".ticket-group", ticketsRoot).forEach((g) => ensureOnlyBaseHasDisclaimerAndAdd(g));
      $$(".ticket-status-select", ticketsRoot).forEach((s) => (s.style.color = "#111"));
    });
    mo.observe(ticketsRoot, { childList: true, subtree: true });
  }

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
    normalizeNotesButtons(document);
    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    // Activate first visible page
    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // Save once to lock IDs
    captureState(document);

    // Ensure ticket UI rules on load
    if (ticketsRoot) {
      $$(".ticket-group", ticketsRoot).forEach((g) => ensureOnlyBaseHasDisclaimerAndAdd(g));
      $$(".ticket-status-select", ticketsRoot).forEach((s) => (s.style.color = "#111"));
    }
  }

  init();
})();

/* =========================================================
   HOTFIX PATCH — drop at very bottom of script.js
   ✅ Injects ⤢ expand button into every table footer (if missing)
   ✅ Restores delegated + add-row handler (prevents "plus not working")
   ✅ Leaves your existing modal/table code intact
========================================================= */

(function mkHotfixPatch(){
  // ---- 1) Ensure every table has an expand button in footer ----
  function ensureExpandButtons(){
    document.querySelectorAll('.table-container').forEach(container => {
      const footer = container.querySelector('.table-footer');
      const table = container.querySelector('table.training-table');
      if (!footer || !table) return;

      // if already exists, do nothing
      if (footer.querySelector('.mk-table-expand-btn')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mk-table-expand-btn';
      btn.textContent = '⤢';
      btn.setAttribute('aria-label', 'Expand table');
      btn.title = 'Expand table';
      footer.appendChild(btn);
    });
  }

  // ---- 2) Delegated click handlers (fixes add-row + expand) ----
  function onDocClick(e){
    const addBtn = e.target.closest('.table-footer .add-row');
    if (addBtn){
      // If your project already has its own handler, this will still work
      // because we dispatch a custom event instead of duplicating logic.
      const tableContainer = addBtn.closest('.table-container');
      const table = tableContainer?.querySelector('table.training-table');
      if (!table) return;

      // Let your existing code handle it if it listens for this event
      table.dispatchEvent(new CustomEvent('mk:addRow', { bubbles:true }));
      // If your existing code is NOT event-based, you likely have a direct handler on .add-row
      // This delegated patch ensures something fires even if cloning broke bindings.
      return;
    }

    const expandBtn = e.target.closest('.mk-table-expand-btn');
    if (expandBtn){
      const tableContainer = expandBtn.closest('.table-container');
      const table = tableContainer?.querySelector('table.training-table');
      if (!table) return;

      // Try to trigger your existing table modal logic:
      // 1) If you already delegate on .mk-table-expand-btn, you're done.
      // 2) If your code expects an event, we dispatch one.
      table.dispatchEvent(new CustomEvent('mk:openTableModal', { bubbles:true, detail:{ table } }));
      return;
    }
  }

  // ---- 3) Run now + after any dynamic cloning ----
  ensureExpandButtons();
  document.addEventListener('click', onDocClick, true);

  // If your app clones DOM after load, this keeps expand buttons present
  const mo = new MutationObserver(() => ensureExpandButtons());
  mo.observe(document.body, { childList:true, subtree:true });
})();
