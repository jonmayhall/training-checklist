/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS (CLEAN FIX)
   ✅ Fixes broken init (no missing function calls)
   ✅ Tables add-row (+) works
   ✅ Cards add-row clone works (non-table)
   ✅ Trainers Additional Trainer (+) works (NO remove button)
   ✅ Notes buttons (table + question)
   ✅ Table expand ⤢
   ✅ Row popup modal (mkRowModal)
   ✅ Support tickets add/move/reset
   ✅ Reset This Page (clears dynamic rows + tickets)
   ✅ Autosave/restore (localStorage)
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
  const DEBUG = false;

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

  function focusNoScroll(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
  }

  function asButton(el) {
    if (!isEl(el)) return;
    if (el.tagName === "BUTTON") {
      el.type = el.getAttribute("type") || "button";
      return;
    }
    if (["A", "DIV", "SPAN"].includes(el.tagName)) {
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
  const NOTES_SVG = `
    <svg class="notes-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3v3a1 1 0 0 0 1.64.77L13.5 18H20a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 13h-6.85a1 1 0 0 0-.64.23L9 19.1V17a1 1 0 0 0-1-1H4V5h16v11Z"/>
    </svg>
  `;

  function isTableNotesButton(btn) {
    return !!btn.closest("table.training-table");
  }

  function normalizeNotesButtons(root = document) {
    $$("[data-notes-target], [data-notes-btn][data-notes-target]", root).forEach((btn) => {
      asButton(btn);
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Notes");

      const inTable = isTableNotesButton(btn);

      btn.classList.remove("notes-btn", "notes-icon-btn");

      if (inTable) {
        btn.classList.add("notes-btn");
        btn.innerHTML = "";
      } else {
        btn.classList.add("notes-icon-btn");
        btn.innerHTML = NOTES_SVG;
      }
    });
  }

  /* =======================
     PERSISTENT ID SYSTEM
  ======================= */
  function ensureStableFieldIds(root = document) {
    $$("tr", root).forEach((tr) => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });

    $$(".ticket-group, .card, .section-block, .dms-card, .additional-poc-card, .additional-trainer-card, .trainer-card", root)
      .forEach((card) => {
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
    try { return JSON.parse(raw) || {}; } catch { return {}; }
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
     PAGE NAV
  ======================= */
  function activatePage(sectionId) {
    if (!sectionId) return;

    $$(".page-section").forEach((sec) => sec.classList.remove("active"));
    $$(".nav-btn").forEach((btn) => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");
  }

  function initNav() {
    $$(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => activatePage(btn.dataset.target));
    });
  }

  /* =======================
     RESET THIS PAGE
  ======================= */
  function clearControlsIn(root) {
    $$("input, select, textarea", root).forEach((el) => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });
    applyGhostStyling(root);
  }

  function resetSupportTickets() {
    // defined later; guard
  }

  function initResetButtons() {
    $$(".clear-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = btn.closest(".page-section");
        if (!page) return;

        clearControlsIn(page);

        $$("table.training-table tbody", page).forEach((tbody) => {
          const rows = $$("tr", tbody);
          const keep = Math.min(2, rows.length);
          rows.slice(keep).forEach((r) => r.remove());
        });

        if (page.id === "trainers-deployment") {
          const c = $("#additionalTrainersContainer");
          if (c) c.innerHTML = "";
        }

        if (page.id === "support-tickets" && typeof window.__mkResetTickets === "function") {
          window.__mkResetTickets();
        }

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
  }

  /* =======================
     TABLE ADD ROW (+)
  ======================= */
  function initAddRowTables() {
    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".table-footer .add-row");
      if (!addBtn) return;

      // stop other .add-row systems from also firing
      e.preventDefault();
      e.stopPropagation();

      const tableContainer = addBtn.closest(".table-container");
      const table = tableContainer ? $("table.training-table", tableContainer) : null;
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

      flash(clone);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const addBtn = e.target.closest(".table-footer .add-row");
      if (!addBtn) return;
      e.preventDefault();
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  /* =======================
     NOTES BUTTONS
  ======================= */
  function getNotesTargetIdFromButton(btn) {
    return btn.getAttribute("data-notes-target") || btn.dataset.notesTarget || "";
  }

  function getContextLabel(btn) {
    const row = btn.closest("tr");
    if (row) {
      const texts = $$('input[type="text"]', row).map((i) => (i.value || "").trim());
      return texts.find((v) => v.length) || "";
    }
    const rowWrap = btn.closest(".checklist-row, .indent-sub");
    if (rowWrap) {
      const label = $("label", rowWrap);
      return (label?.textContent || "").trim();
    }
    return "";
  }

  function getQuestionText(btn) {
    const rowWrap = btn.closest(".checklist-row, .indent-sub");
    if (rowWrap) {
      const label = $("label", rowWrap);
      return (label?.textContent || "").trim();
    }
    const td = btn.closest("td");
    const tr = btn.closest("tr");
    const table = btn.closest("table");
    if (td && tr && table) {
      const colIndex = Array.from(tr.children).indexOf(td);
      const th = table.tHead?.rows?.[0]?.children?.[colIndex];
      return (th?.textContent || "").trim();
    }
    return "";
  }

  function ensureBulletStub(textarea, titleLine) {
    const current = textarea.value || "";
    if (current.includes(`• ${titleLine}`)) return;

    const spacer = current.trim().length ? "\n\n" : "";
    textarea.value =
      current.replace(/\s+$/g, "") +
      spacer +
      `• ${titleLine}\n` +
      `        ◦ \n`;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function initNotesButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-notes-target], [data-notes-btn][data-notes-target]");
      if (!btn) return;
      e.preventDefault();

      const targetId = getNotesTargetIdFromButton(btn);
      if (!targetId) return;

      const notesBlock = document.getElementById(targetId);
      if (!notesBlock) return;

      const ta = $("textarea", notesBlock);
      if (!ta) return;

      const context = (getContextLabel(btn) || "").trim();
      const q = (getQuestionText(btn) || "").trim();

      const title = btn.closest("tr")
        ? [context, q].filter(Boolean).join("  ").trim()
        : (q || context || "Notes").trim();

      ensureBulletStub(ta, title);
      focusNoScroll(ta);
      flash(notesBlock);
    });
  }

  /* =======================
     TABLE EXPAND (⤢)
  ======================= */
  function ensureTableExpandButtons(root = document) {
    $$(".table-container", root).forEach((container) => {
      const footer = $(".table-footer", container);
      const table = $("table.training-table", container);
      if (!footer || !table) return;

      if (footer.querySelector(".mk-table-expand-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-table-expand-btn";
      btn.textContent = "⤢";
      btn.setAttribute("aria-label", "Expand table");
      btn.title = "Expand table";
      footer.appendChild(btn);
    });
  }

  function initExpandButtons() {
    document.addEventListener("click", (e) => {
      const expandBtn = e.target.closest(".mk-table-expand-btn");
      if (!expandBtn) return;

      const tableContainer = expandBtn.closest(".table-container");
      if (!tableContainer) return;

      // If you have mkTableModal shell, it will be handled by your existing modal logic.
      // Fallback: open first row modal
      const firstRow = tableContainer.querySelector("table.training-table tbody tr");
      if (firstRow) firstRow.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      else flash(tableContainer);
    });
  }

  /* =======================
     ROW MODAL (uses your existing markup if present)
  ======================= */
  const rowModal = document.getElementById("mkRowModal");
  const tableHost = document.getElementById("mkModalTableHost");
  const notesHost = document.getElementById("mkModalNotesHost");
  let activeModal = null;

  function openRowModal() {
    if (!rowModal) return;
    rowModal.setAttribute("aria-hidden", "false");
  }
  function closeRowModal() {
    if (!rowModal) return;
    rowModal.setAttribute("aria-hidden", "true");
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

    tbody.appendChild(row);
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

    const btn = row.querySelector("[data-notes-target], [data-notes-btn][data-notes-target]");
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

  function restoreRowModal() {
    if (!activeModal) return;

    if (activeModal.notesEl && activeModal.notesPH && activeModal.notesParent) {
      activeModal.notesParent.insertBefore(activeModal.notesEl, activeModal.notesPH);
      activeModal.notesPH.remove();
    }

    if (activeModal.row && activeModal.rowPH && activeModal.rowParent) {
      activeModal.rowParent.insertBefore(activeModal.row, activeModal.rowPH);
      activeModal.rowPH.remove();
    }

    if (tableHost) tableHost.innerHTML = "";
    if (notesHost) notesHost.innerHTML = "";

    closeRowModal();
    activeModal = null;
  }

  function initRowModal() {
    if (!(rowModal && tableHost && notesHost)) return;

    rowModal.addEventListener("click", (e) => {
      if (e.target && e.target.hasAttribute("data-mk-modal-close")) restoreRowModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && rowModal.getAttribute("aria-hidden") === "false") restoreRowModal();
    });

    document.addEventListener("click", (e) => {
      const t = e.target;

      if (
        t.closest("button") ||
        t.closest("a") ||
        t.matches("input, select, textarea, option") ||
        t.closest(".table-footer") ||
        t.closest(".mk-table-expand-btn")
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

      openRowModal();
    });
  }

  /* =======================
     TRAINERS: ADDITIONAL TRAINER (+)  (NO REMOVE BUTTON)
     Supports BOTH patterns:
       A) explicit [data-add-trainer] + #additionalTrainerInput
       B) base row: #trainers-deployment .checklist-row.integrated-plus[data-base="true"] .add-row
     Injects a NEW ROW BELOW as a standalone rounded input.
  ======================= */
  function initAdditionalTrainerAdder() {
    function findTrainerAddButton(target) {
      const a = target.closest("[data-add-trainer]");
      const b = target.closest("#trainers-deployment .checklist-row.integrated-plus[data-base='true'] .add-row");
      return a || b;
    }

    function getBaseInputFromAddButton(addBtn) {
      let baseInput = $("#additionalTrainerInput");
      if (baseInput) return baseInput;

      const baseRow = addBtn.closest("#trainers-deployment .checklist-row.integrated-plus[data-base='true']");
      if (!baseRow) return null;

      return $("input[type='text']", baseRow);
    }

    document.addEventListener("click", (e) => {
      const addBtn = findTrainerAddButton(e.target);
      if (!addBtn) return;

      // prevent any other .add-row logic from firing
      e.preventDefault();
      e.stopPropagation();

      const container = $("#additionalTrainersContainer");
      if (!container) return;

      const baseInput = getBaseInputFromAddButton(addBtn);
      if (!baseInput) return;

      const name = (baseInput.value || "").trim();
      if (!name) {
        flash(baseInput.closest(".checklist-row") || baseInput);
        focusNoScroll(baseInput);
        return;
      }

      const row = document.createElement("div");
      row.className = "checklist-row indent-sub added-trainer-row";

      // IMPORTANT: standalone input only (no buttons)
      row.innerHTML = `
        <label></label>
        <input type="text" value="${escapeHtml(name)}" />
      `;

      container.appendChild(row);

      baseInput.value = "";
      baseInput.dispatchEvent(new Event("input", { bubbles: true }));
      focusNoScroll(baseInput);

      ensureStableFieldIds(row);
      captureState(document);
      flash(row);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const addBtn = findTrainerAddButton(e.target);
      if (!addBtn) return;
      e.preventDefault();
      addBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  /* =======================
     CARD CLONER (+) (non-table only)
  ======================= */
  function initCloneAddButtons() {
    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".add-row");
      if (!addBtn) return;

      // table add handled elsewhere
      if (addBtn.closest(".table-footer")) return;

      // trainers add handled elsewhere
      if (addBtn.closest("[data-add-trainer]")) return;
      if (addBtn.closest("#trainers-deployment .checklist-row.integrated-plus[data-base='true']")) return;

      e.preventDefault();
      e.stopPropagation();

      const baseCard = addBtn.closest(
        ".additional-poc-card[data-base='true'], .additional-trainer-card[data-base='true'], .trainer-card[data-base='true']"
      );
      if (!baseCard) return;

      const container = baseCard.parentElement;
      if (!container) return;

      const clone = baseCard.cloneNode(true);
      clone.setAttribute("data-base", "false");
      clone.setAttribute("data-clone", "true");
      clone.setAttribute(AUTO_CARD_ATTR, uid("clone"));

      clone.querySelectorAll(".add-row").forEach((b) => b.remove());
      clearControlsIn(clone);

      clone.querySelectorAll("[id]").forEach((el) => (el.id = ""));
      clone.querySelectorAll(`[${AUTO_ID_ATTR}]`).forEach((el) => el.removeAttribute(AUTO_ID_ATTR));

      container.insertBefore(clone, baseCard.nextSibling);

      normalizeNotesButtons(clone);
      ensureStableFieldIds(container);
      captureState(document);
      flash(clone);
    });
  }

  /* =======================
     SUPPORT TICKETS (unchanged logic, kept compact)
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
    return !!(f.num?.value?.trim() && f.url?.value?.trim() && f.summary?.value?.trim());
  }

  function setTicketStatus(groupEl, status, lock = false) {
    const sel = $(".ticket-status-select", groupEl);
    if (!sel) return;
    sel.value = status;
    sel.disabled = !!lock;
    sel.style.color = "#111";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function ensureOnlyBaseHasDisclaimerAndAdd(groupEl) {
    const isBase = ticketIsBase(groupEl);
    $$(".remove-ticket-btn", groupEl).forEach((b) => b.remove());
    const add = $(".add-ticket-btn", groupEl);
    if (add && !isBase) add.remove();
    const disc = $(".ticket-disclaimer", groupEl);
    if (disc && !isBase) disc.remove();
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

    ensureOnlyBaseHasDisclaimerAndAdd(groupEl);
    dest.appendChild(groupEl);
  }

  function __resetSupportTickets() {
    const open = ticketContainers.Open;
    if (!open) return;

    const base = $('.ticket-group[data-base="true"]', open);
    if (!base) return;

    Object.values(ticketContainers).forEach((c) => {
      if (!c) return;
      $$(".ticket-group", c).forEach((g) => { if (g !== base) g.remove(); });
    });

    clearControlsIn(base);
    setTicketStatus(base, "Open", true);
    ensureOnlyBaseHasDisclaimerAndAdd(base);
  }
  window.__mkResetTickets = __resetSupportTickets;

  function initSupportTickets() {
    if (ticketContainers.Open) {
      const base = $('.ticket-group[data-base="true"]', ticketContainers.Open);
      if (base) {
        setTicketStatus(base, "Open", true);
        ensureOnlyBaseHasDisclaimerAndAdd(base);
      }
    }

    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".add-ticket-btn");
      if (!addBtn) return;

      const baseGroup = addBtn.closest(".ticket-group");
      if (!baseGroup || !ticketIsBase(baseGroup)) return;

      e.preventDefault();
      e.stopPropagation();

      if (!requiredTicketFieldsFilled(baseGroup)) {
        flash(baseGroup, "mk-flash", 700);
        alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another card.");
        return;
      }

      const baseF = ticketFields(baseGroup);
      const clone = baseGroup.cloneNode(true);
      clone.setAttribute("data-base", "false");
      clone.setAttribute(AUTO_CARD_ATTR, uid("ticket"));

      setTicketStatus(clone, baseF.status?.value || "Open", false);
      ensureOnlyBaseHasDisclaimerAndAdd(clone);

      const st = $(".ticket-status-select", clone)?.value || "Open";
      (ticketContainers[st] || ticketContainers.Open)?.appendChild(clone);

      if (baseF.num) baseF.num.value = "";
      if (baseF.url) baseF.url.value = "";
      if (baseF.summary) baseF.summary.value = "";
      setTicketStatus(baseGroup, "Open", true);

      ensureOnlyBaseHasDisclaimerAndAdd(baseGroup);
      ensureStableFieldIds(clone);
      ensureStableFieldIds(baseGroup);
      captureState(document);
    });

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
  }

  /* =======================
     MAP HELPER
  ======================= */
  window.updateDealershipMap = function updateDealershipMap(address) {
    const frame = $("#dealershipMapFrame");
    if (!frame) return;
    const q = encodeURIComponent(address || "");
    frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
  };

  /* =======================
     ONSITE DATE DEFAULT (end = start + 2)
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
  function initOnsiteDateHelper() {
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
  }

  /* =======================
     INIT
  ======================= */
  function init() {
    if (DEBUG) console.log("[myKaarma] init OK");

    initNav();

    normalizeNotesButtons(document);
    ensureTableExpandButtons(document);

    initRowModal();
    initExpandButtons();

    initResetButtons();
    initAddRowTables();
    initNotesButtons();

    // Trainers: Additional Trainer (+)
    initAdditionalTrainerAdder();

    // Other card clone +
    initCloneAddButtons();

    initSupportTickets();
    initOnsiteDateHelper();

    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    captureState(document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
