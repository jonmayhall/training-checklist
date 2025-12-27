/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS (CLEAN + WORKING)
   -------------------------------------------------------
   ✅ Page nav (sidebar)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons (also clears saved state for that page)
   ✅ Add Row (+) for all tables
   ✅ Notes buttons (questions + tables):
      - Questions: .notes-icon-btn with inline SVG
      - Tables: .notes-btn (CSS bubble mask / P3-P4 style)
      - Appends a clean bullet stub into correct Notes textarea
      - No page jump/shift
      - Format:
          • Title
              ◦
   ✅ Table Expand (⤢) injected into table footers + opens TABLE modal (mkTableModal) if present
   ✅ Row Popup Modal (mkRowModal) supported (row click)
   ✅ Additional POC (+) restored
   ✅ Support Tickets rules preserved (base-only disclaimer/+)
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

  /* =========================================================
     NOTES BUTTON NORMALIZATION (CORRECT)
     - Table notes buttons must be `.notes-btn` (CSS bubble mask)
     - Question notes buttons must be `.notes-icon-btn` with SVG
  ========================================================= */

  const NOTES_SVG = `
    <svg class="notes-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3v3a1 1 0 0 0 1.64.77L13.5 18H20a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 13h-6.85a1 1 0 0 0-.64.23L9 19.1V17a1 1 0 0 0-1-1H4V5h16v11Z"/>
    </svg>
  `;

  function isTableNotesButton(btn) {
    return !!btn.closest("table.training-table");
  }

  function normalizeNotesButtons(root = document) {
    $$(
      "button[data-notes-target], button[data-notes-btn][data-notes-target]",
      root
    ).forEach((btn) => {
      btn.type = "button";
      if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Notes");

      const inTable = isTableNotesButton(btn);

      // Strip both classes first
      btn.classList.remove("notes-btn", "notes-icon-btn");

      if (inTable) {
        btn.classList.add("notes-btn");
        btn.innerHTML = ""; // table buttons rely on CSS ::before
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

      clearControls(page);

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
     Additional POC (+)
  ======================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(
      "#dealership-info .additional-poc-card[data-base='true'] .add-row"
    );
    if (!btn) return;

    const baseCard = btn.closest(".additional-poc-card");
    if (!baseCard) return;

    const container =
      baseCard.closest("#dealership-info .primary-contacts-grid") || baseCard.parentElement;

    const clone = baseCard.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute("data-clone", "true");
    clone.setAttribute(AUTO_CARD_ATTR, uid("poc"));

    $$(".add-row", clone).forEach((b) => b.remove());
    clearControlsIn(clone);

    $$("[id]", clone).forEach((el) => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach((el) => el.removeAttribute(AUTO_ID_ATTR));

    container.insertBefore(clone, baseCard.nextSibling);

    normalizeNotesButtons(clone);
    ensureStableFieldIds(container);
    captureState(document);
  });

  /* =======================
     NOTES BULLETS (NO SCROLL SHIFT)
  ======================= */
  function getNotesTargetIdFromButton(btn) {
    return btn.getAttribute("data-notes-target") || btn.dataset.notesTarget || "";
  }

  function getContextLabel(btn) {
    const row = btn.closest("tr");
    if (row) {
      const texts = $$('input[type="text"]', row).map((i) => (i.value || "").trim());
      const firstNonEmpty = texts.find((v) => v.length);
      return firstNonEmpty || "";
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

  function focusNoScroll(el) {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(
      "button[data-notes-target], button[data-notes-btn][data-notes-target]"
    );
    if (!btn) return;

    const targetId = getNotesTargetIdFromButton(btn);
    if (!targetId) return;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return;

    const ta = $("textarea", notesBlock);
    if (!ta) return;

    const context = (getContextLabel(btn) || "").trim();
    const q = (getQuestionText(btn) || "").trim();

    let title = "";
    if (btn.closest("tr")) title = [context, q].filter(Boolean).join("  ").trim();
    else title = (q || context || "Notes").trim();

    ensureBulletStub(ta, title);
    focusNoScroll(ta);
    flash(notesBlock);
  });

  /* =========================================================
     TABLE EXPAND (⤢) — injected into table footers
  ========================================================= */

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

  /* =======================
     TABLE MODAL (mkTableModal)
  ======================= */
  const mkTableModal = document.getElementById("mkTableModal");
  const mkTableModalCards = document.getElementById("mkTableModalCards");
  let activeTableModal = null; // { tableCard, tablePH, tableParent, notesCard, notesPH, notesParent }

  function openTableModalShell(title = "Table") {
    if (!mkTableModal) return;
    mkTableModal.classList.add("open");
    mkTableModal.setAttribute("aria-hidden", "false");

    const titleEl = mkTableModal.querySelector(".mk-modal-title");
    if (titleEl) titleEl.textContent = title;
  }

  function closeTableModalShell() {
    if (!mkTableModal) return;
    mkTableModal.classList.remove("open");
    mkTableModal.setAttribute("aria-hidden", "true");
  }

  function restoreTableModal() {
    if (!activeTableModal) return;

    if (activeTableModal.notesCard && activeTableModal.notesPH && activeTableModal.notesParent) {
      activeTableModal.notesParent.insertBefore(activeTableModal.notesCard, activeTableModal.notesPH);
      activeTableModal.notesPH.remove();
    }

    if (activeTableModal.tableCard && activeTableModal.tablePH && activeTableModal.tableParent) {
      activeTableModal.tableParent.insertBefore(activeTableModal.tableCard, activeTableModal.tablePH);
      activeTableModal.tablePH.remove();
    }

    if (mkTableModalCards) mkTableModalCards.innerHTML = "";
    closeTableModalShell();
    activeTableModal = null;
  }

  function getNotesCardForTable(tableContainer) {
    const firstNotesBtn = tableContainer.querySelector(
      "button[data-notes-target], button[data-notes-btn][data-notes-target]"
    );
    const targetId = firstNotesBtn?.getAttribute("data-notes-target") || "";
    return targetId ? document.getElementById(targetId) : null;
  }

  function openTableModalFromContainer(tableContainer) {
    if (!mkTableModal || !mkTableModalCards) return;

    const section = tableContainer.closest(".section") || tableContainer;
    const sectionHeader = section.querySelector(".section-header");
    const title = (sectionHeader?.textContent || "Table").trim();

    mkTableModalCards.innerHTML = "";
    const outer = document.createElement("div");
    outer.className = "mk-modal__outer-card";
    mkTableModalCards.appendChild(outer);

    const tablePH = document.createElement("div");
    tablePH.className = "mk-table-placeholder";

    const tableParent = section.parentElement;
    tableParent.insertBefore(tablePH, section);
    tableParent.removeChild(section);

    const notesCard = getNotesCardForTable(tableContainer);
    let notesPH = null;
    let notesParent = null;

    if (notesCard) {
      notesPH = document.createElement("div");
      notesPH.className = "mk-notes-placeholder";
      notesParent = notesCard.parentElement;
      notesParent.insertBefore(notesPH, notesCard);
      notesParent.removeChild(notesCard);
    }

    outer.appendChild(section);

    if (notesCard) {
      const notesWrap = document.createElement("div");
      notesWrap.className = "mk-modal__notes-host";
      notesWrap.appendChild(notesCard);
      outer.appendChild(notesWrap);
    }

    activeTableModal = {
      tableCard: section,
      tablePH,
      tableParent,
      notesCard,
      notesPH,
      notesParent,
    };

    openTableModalShell(title);
  }

  if (mkTableModal) {
    mkTableModal.addEventListener("click", (e) => {
      const closeBtn = e.target.closest(".mk-modal-close,[data-mk-modal-close]");
      const backdrop = e.target.closest(".mk-modal-backdrop");
      if (closeBtn || backdrop) restoreTableModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mkTableModal.classList.contains("open")) restoreTableModal();
    });
  }

  document.addEventListener("click", (e) => {
    const expandBtn = e.target.closest(".mk-table-expand-btn");
    if (!expandBtn) return;

    const tableContainer = expandBtn.closest(".table-container");
    if (!tableContainer) return;

    if (mkTableModal && mkTableModalCards) openTableModalFromContainer(tableContainer);
    else flash(tableContainer);
  });

  /* =======================
     ROW POPUP MODAL (mkRowModal)
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

    const btn = row.querySelector(
      "button[data-notes-target], button[data-notes-btn][data-notes-target]"
    );
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

    document.addEventListener("click", (e) => {
      const t = e.target;

      if (
        t.closest("button") ||
        t.closest("a") ||
        t.matches("input, select, textarea, option") ||
        t.closest(".table-footer")
      )
        return;

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
    if (sel) {
      sel.disabled = false;
      sel.style.color = "#111";
    }

    ensureOnlyBaseHasDisclaimerAndAdd(groupEl);
    dest.appendChild(groupEl);
  }

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

    const bf = ticketFields(baseGroup);
    if (bf.num) bf.num.value = "";
    if (bf.url) bf.url.value = "";
    if (bf.summary) bf.summary.value = "";
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

  /* =======================
     INIT
  ======================= */
  function init() {
    normalizeNotesButtons(document);
    ensureTableExpandButtons(document);

    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // Save once to lock IDs
    captureState(document);

    // Tickets UI rules on load
    if (ticketsRoot) {
      $$(".ticket-group", ticketsRoot).forEach((g) => ensureOnlyBaseHasDisclaimerAndAdd(g));
      $$(".ticket-status-select", ticketsRoot).forEach((s) => (s.style.color = "#111"));
    }

    // Onsite date auto-fill (if present)
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

    // Debounced observer: re-normalize ONLY when new nodes are added (prevents churn)
    let rafPending = false;
    const mo = new MutationObserver(() => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        normalizeNotesButtons(document);
        ensureTableExpandButtons(document);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // Run at the right time
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
