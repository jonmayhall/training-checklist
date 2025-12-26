/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ FIXED / RESTORED (MASK ICON VERSION)
   - Menu + buttons working again (event delegation; no dead bindings after restore)
   - No double-add / no double-binding
   - ✅ Notes icon-only button uses YOUR PNG mask via CSS (.notes-icon-btn)
   - ✅ Turns orange when notes exist (.has-notes)
   - Notes buttons ONLY added where there is an input/select/textarea (no blank label rows)
   - Training tables bullet label = Name (first text input in row)
   - Opcode tables bullet label = Opcode (2nd column text input)
   - Notes buttons work in tables + popup tables
   - Popup table is inside a real-looking card, never runs off right side
   - Popup keeps Add Row (+) and it adds to the REAL table and refreshes popup
   - Notes card never scrolls left/right (no horizontal)
   - No page “jump” when clicking notes buttons
   - Fix phantom white header row / textbox: sanitizeTableHeaders()
   - Clearing page clears table + notes state for that page (prevents “old bullets” returning)
======================================================= */

(() => {
  "use strict";

  /* -----------------------------
     CONFIG / KEYS
  ----------------------------- */
  const LS_KEY = "mk_training_checklist_v2";
  const NOTES_KEY = "mk_training_notes_v2";

  /* -----------------------------
     DOM HELPERS
  ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const safeJSONParse = (str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const debounce = (fn, wait = 250) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  const closestSectionId = (el) => el?.closest?.(".page-section")?.id || "unknown-section";

  const bindOnce = (el, key) => {
    if (!el) return false;
    const k = `bound_${key}`;
    if (el.dataset[k] === "true") return false;
    el.dataset[k] = "true";
    return true;
  };

  /* -----------------------------
     NOTES BUTTON (ICON MASK)
     - CSS provides icon via mask on .notes-icon-btn
     - JS toggles .has-notes (orange)
  ----------------------------- */
  function makeNotesButton(targetId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "notes-icon-btn mk-table-note-btn";
    btn.dataset.notesTarget = targetId;
    btn.setAttribute("aria-label", "Add notes");
    // no inner SVG/img/text — CSS mask renders icon
    return btn;
  }

  /* -----------------------------
     PLACEHOLDER / GHOST CLASSING
  ----------------------------- */
  function applyPlaceholderClassToSelect(sel) {
    const opt = sel.selectedOptions?.[0];
    const isGhost = !!opt?.dataset?.ghost || sel.value === "" || opt?.value === "";
    sel.classList.toggle("is-placeholder", isGhost);
  }
  function applyPlaceholderClassToInput(inp) {
    if (inp.type === "date") {
      inp.classList.toggle("is-placeholder", !inp.value);
      return;
    }
    const hasPh = !!inp.getAttribute("placeholder");
    if (hasPh) inp.classList.toggle("is-placeholder", !inp.value);
  }
  function applyPlaceholderClassToTextarea(ta) {
    const hasPh = !!ta.getAttribute("placeholder");
    if (hasPh) ta.classList.toggle("is-placeholder", !ta.value);
  }

  function initPlaceholderStyling(root = document) {
    $$("select", root).forEach(applyPlaceholderClassToSelect);
    $$("input", root).forEach(applyPlaceholderClassToInput);
    $$("textarea", root).forEach(applyPlaceholderClassToTextarea);
  }

  /* -----------------------------
     AUTOSAVE / RESTORE
  ----------------------------- */
  function loadState() {
    return safeJSONParse(localStorage.getItem(LS_KEY), {}) || {};
  }
  function saveState(state) {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function snapshotTables(state) {
    state.__tables = state.__tables || {};
    $$(".table-container").forEach((tc, idx) => {
      const sectionId = closestSectionId(tc);
      const table = $("table", tc);
      if (!table) return;
      const key = `${sectionId}::table::${idx}`;
      const tbody = table.tBodies?.[0];
      if (tbody) state.__tables[key] = tbody.innerHTML;
    });
  }

  function restoreTables(state) {
    const map = state.__tables || {};
    $$(".table-container").forEach((tc, idx) => {
      const sectionId = closestSectionId(tc);
      const table = $("table", tc);
      if (!table) return;
      const key = `${sectionId}::table::${idx}`;
      const tbody = table.tBodies?.[0];
      if (tbody && map[key]) tbody.innerHTML = map[key];
    });
  }

  function snapshotDynamicBlocks(state) {
    state.__ticketsHTML = {
      open: $("#openTicketsContainer")?.innerHTML || "",
      tierTwo: $("#tierTwoTicketsContainer")?.innerHTML || "",
      closedResolved: $("#closedResolvedTicketsContainer")?.innerHTML || "",
      closedFeature: $("#closedFeatureTicketsContainer")?.innerHTML || ""
    };
  }

  function restoreDynamicBlocks(state) {
    const t = state.__ticketsHTML;
    if (!t) return;
    if ($("#openTicketsContainer") && t.open) $("#openTicketsContainer").innerHTML = t.open;
    if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = t.tierTwo || "";
    if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = t.closedResolved || "";
    if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = t.closedFeature || "";
  }

  function snapshotFormControls(state) {
    state.__controls = state.__controls || {};
    $$(".page-section").forEach((sec) => {
      const sectionId = sec.id;
      const controls = $$("input, select, textarea", sec);

      controls.forEach((el, i) => {
        const inTable = !!el.closest("table");
        const inTickets = !!el.closest("#support-tickets");
        if (inTable || inTickets) return;

        const key = `${sectionId}::ctrl::${i}`;
        if (el.type === "checkbox") state.__controls[key] = !!el.checked;
        else state.__controls[key] = el.value ?? "";
      });
    });
  }

  function restoreFormControls(state) {
    const map = state.__controls || {};
    $$(".page-section").forEach((sec) => {
      const sectionId = sec.id;
      const controls = $$("input, select, textarea", sec);

      controls.forEach((el, i) => {
        const inTable = !!el.closest("table");
        const inTickets = !!el.closest("#support-tickets");
        if (inTable || inTickets) return;

        const key = `${sectionId}::ctrl::${i}`;
        if (!(key in map)) return;

        if (el.type === "checkbox") el.checked = !!map[key];
        else el.value = map[key];
      });
    });
  }

  const persistAllDebounced = debounce(() => {
    const state = loadState();
    snapshotTables(state);
    snapshotDynamicBlocks(state);
    snapshotFormControls(state);
    saveState(state);
  }, 300);

  function initAutosave() {
    if (!bindOnce(document.body, "autosave")) return;

    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.matches("input, textarea")) persistAllDebounced();
    });

    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.matches("select, input[type='checkbox'], input[type='date']")) {
        if (t.tagName === "SELECT") applyPlaceholderClassToSelect(t);
        if (t.tagName === "INPUT") applyPlaceholderClassToInput(t);
        persistAllDebounced();
      }
    });

    window.addEventListener("beforeunload", () => {
      const state = loadState();
      snapshotTables(state);
      snapshotDynamicBlocks(state);
      snapshotFormControls(state);
      saveState(state);
    });
  }

  function restoreAll() {
    const state = loadState();
    restoreTables(state);
    restoreDynamicBlocks(state);
    restoreFormControls(state);
  }

  /* -----------------------------
     NAV
  ----------------------------- */
  function initNav() {
    const navButtons = $$("#sidebar-nav .nav-btn");
    const sections = $$(".page-section");

    const showSection = (id) => {
      sections.forEach((s) => s.classList.toggle("active", s.id === id));
      navButtons.forEach((b) => b.classList.toggle("active", b.dataset.target === id));
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    navButtons.forEach((btn) => {
      if (!bindOnce(btn, "nav")) return;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.dataset.target;
        if (!target) return;
        showSection(target);

        const state = loadState();
        state.__lastPage = target;
        saveState(state);
      });
    });

    const state = loadState();
    if (state.__lastPage && $("#" + state.__lastPage)) showSection(state.__lastPage);
    else if (navButtons[0]?.dataset?.target) showSection(navButtons[0].dataset.target);
  }

  /* -----------------------------
     SANITIZE TABLE HEADERS
     - fixes phantom white row + textbox in headers
  ----------------------------- */
  function sanitizeTableHeaders(root = document) {
    $$(".training-table", root).forEach((table) => {
      const thead = table.tHead;
      if (!thead) return;

      // remove any header rows polluted with inputs/buttons
      $$("tr", thead).forEach((tr) => {
        if (tr.querySelector("input, select, textarea, button")) tr.remove();
      });

      // ensure header cells are TH (not TD)
      $$("tr", thead).forEach((tr) => {
        tr.querySelectorAll("td").forEach((td) => {
          const th = document.createElement("th");
          th.innerHTML = td.innerHTML;
          td.replaceWith(th);
        });
      });
    });
  }

  /* -----------------------------
     NOTES STATE
  ----------------------------- */
  function loadNotesState() {
    return safeJSONParse(localStorage.getItem(NOTES_KEY), {}) || {};
  }
  function saveNotesState(state) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(state));
  }

  function ensureNotesBlock(targetId) {
    const s = loadNotesState();
    s[targetId] = s[targetId] || { items: {} };
    saveNotesState(s);
    return s;
  }

  function ensureNotesItem(targetId, sigIndex, label) {
    const s = ensureNotesBlock(targetId);
    const itemId = String(sigIndex);
    s[targetId].items[itemId] = s[targetId].items[itemId] || { label, text: "" };
    s[targetId].items[itemId].label = label;
    saveNotesState(s);
  }

  function buttonIsActive(targetId, sigIndex) {
    const s = loadNotesState();
    return !!s?.[targetId]?.items?.[String(sigIndex)];
  }

  function refreshAllNotesButtons(root = document) {
    $$(".notes-icon-btn[data-notes-target]", root).forEach((btn) => {
      const targetId = btn.dataset.notesTarget;
      if (!targetId) return;
      const sig = getRowSignature(btn);
      btn.classList.toggle("has-notes", buttonIsActive(targetId, sig.index));
    });
  }

  /* -----------------------------
     NOTES TEXTAREA: insert bullet header (no reflow/jump)
  ----------------------------- */
  function findNotesTextareaById(notesId) {
    const block = $("#" + notesId);
    return block ? $("textarea", block) : null;
  }

  function insertBulletHeaderIfMissing(notesId, label) {
    const ta = findNotesTextareaById(notesId);
    if (!ta) return;

    const header = `• ${label}:`;
    const existing = ta.value || "";
    if (existing.includes(header)) return;

    const trimmed = existing.replace(/\s+$/, "");
    const add = (trimmed.length ? `${trimmed}\n\n${header}\n` : `${header}\n`);
    ta.value = add;

    applyPlaceholderClassToTextarea(ta);
    persistAllDebounced();
  }

  /* -----------------------------
     SIGNATURES + LABELS
  ----------------------------- */
  function getRowSignature(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      const tbody = tr.parentElement;
      const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
      const idx = rows.indexOf(tr);
      return { kind: "table", index: idx >= 0 ? idx : 9999 };
    }

    const row = btn.closest(".checklist-row");
    if (row) {
      const sec = row.closest(".page-section") || document;
      const all = $$(".notes-icon-btn", sec).filter((b) => !b.closest("table"));
      const idx = all.indexOf(btn);
      return { kind: "question", index: idx >= 0 ? idx : 9999 };
    }

    return { kind: "unknown", index: 9999 };
  }

  function getBulletLabel(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      const table = tr.closest("table");
      const headers = table ? $$("thead th", table).map((th) => th.textContent.trim().toLowerCase()) : [];
      const hasOpcodeHeader = headers.includes("opcode");

      if (hasOpcodeHeader) {
        const opcodeInput = tr.querySelector("td:nth-child(2) input[type='text']");
        const opcode = opcodeInput?.value?.trim();
        return opcode || "Opcode";
      }

      // training tables: first text input in the row = Name
      const nameInput = tr.querySelector("input[type='text']");
      const name = nameInput?.value?.trim();
      return name || "Name";
    }

    // question rows: use label text
    const row = btn.closest(".checklist-row");
    const label = row?.querySelector("label")?.textContent?.trim();
    return label ? label.replace(/\s+/g, " ") : "Note";
  }

  /* -----------------------------
     NOTES BUTTON PLACEMENT (TABLES)
     - Only in Notes column
     - Only on rows that have input/select/textarea (ignoring notes cell)
     - Remove duplicates
  ----------------------------- */
  function getNotesColumnIndex(table) {
    const headCells = $$("thead th", table).map((th) => th.textContent.trim().toLowerCase());
    return headCells.lastIndexOf("notes");
  }

  function rowHasControls(tr, notesIdx) {
    const cloned = tr.cloneNode(true);
    const clonedCells = Array.from(cloned.cells);
    if (notesIdx >= 0 && clonedCells[notesIdx]) clonedCells[notesIdx].innerHTML = "";
    return !!cloned.querySelector("input, select, textarea");
  }

  function normalizeNotesColumns(root = document) {
    $$(".training-table", root).forEach((table) => {
      const notesIdx = getNotesColumnIndex(table);
      if (notesIdx < 0) return;

      const tbody = table.tBodies?.[0];
      if (!tbody) return;

      Array.from(tbody.rows).forEach((tr) => {
        while (tr.cells.length <= notesIdx) tr.insertCell(-1);

        const notesCell = tr.cells[notesIdx];
        notesCell.classList.add("notes-col", "notes-col-cell");

        const allBtns = $$(".notes-icon-btn", tr);
        if (allBtns.length) {
          allBtns.forEach((b) => {
            if (b.closest("td") !== notesCell) notesCell.appendChild(b);
          });

          const keep = $(".notes-icon-btn", notesCell);
          $$(".notes-icon-btn", notesCell).forEach((b) => { if (b !== keep) b.remove(); });
        }
      });
    });
  }

  function ensureElementId(el, prefix = "notes-card") {
    if (el.id) return el.id;
    el.id = `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    return el.id;
  }

  function findRelatedNotesBlock(tableContainer) {
    const btn = $(".notes-icon-btn[data-notes-target]", tableContainer);
    const id = btn?.dataset?.notesTarget;
    if (id && $("#" + id)) return $("#" + id);

    const section = tableContainer.closest(".page-section");
    if (!section) return null;
    const all = $$("[id^='notes-'].section-block, [id^='notes-card-'].section-block", section);
    return all[0] || null;
  }

  function injectTableNotesButtons(root = document) {
    $$(".training-table", root).forEach((table) => {
      const notesIdx = getNotesColumnIndex(table);
      if (notesIdx < 0) return;

      const tc = table.closest(".table-container");
      const notesBlock = tc ? findRelatedNotesBlock(tc) : null;
      const notesId = notesBlock ? ensureElementId(notesBlock, "notes-card") : null;
      if (!notesId) return;

      const tbody = table.tBodies?.[0];
      if (!tbody) return;

      Array.from(tbody.rows).forEach((tr) => {
        if (!rowHasControls(tr, notesIdx)) return;

        while (tr.cells.length <= notesIdx) tr.insertCell(-1);
        const cell = tr.cells[notesIdx];
        cell.classList.add("notes-col", "notes-col-cell");

        const existing = $(".notes-icon-btn", cell);
        if (existing) {
          $$(".notes-icon-btn", tr).forEach((b) => { if (!cell.contains(b)) b.remove(); });
          return;
        }

        $$(".notes-icon-btn", tr).forEach((b) => b.remove());
        const btn = makeNotesButton(notesId);
        cell.appendChild(btn);
      });
    });

    normalizeNotesColumns(root);
  }

  /* -----------------------------
     NOTES BUTTON PLACEMENT (TWO-COL CARDS)
  ----------------------------- */
  function injectNotesButtonsIntoTwoColCards(root = document) {
    $$(".cards-grid.two-col", root).forEach((grid) => {
      const blocks = $$(".section-block", grid);
      if (blocks.length < 2) return;

      const notesBlock = blocks.find((b) => {
        const h2 = b.querySelector("h2")?.textContent?.trim().toLowerCase() || "";
        return h2.startsWith("notes");
      });
      if (!notesBlock) return;

      const notesId = ensureElementId(notesBlock, "notes-card");
      const notesTA = $("textarea", notesBlock);
      if (!notesTA) return;

      const questionBlock = blocks.find((b) => b !== notesBlock);
      if (!questionBlock) return;

      $$(".checklist-row", questionBlock).forEach((row) => {
        const hasControl = row.querySelector("input, select, textarea");
        if (!hasControl) return;

        if (row.querySelector(".notes-icon-btn")) return;

        const btn = makeNotesButton(notesId);

        let actions = row.querySelector(".row-actions");
        if (!actions) {
          actions = document.createElement("div");
          actions.className = "row-actions";
          row.appendChild(actions);
        }
        actions.appendChild(btn);
      });
    });
  }

  /* -----------------------------
     NOTES TEXTAREA PARSING
  ----------------------------- */
  function parseNotesTextareaToState(notesId, text) {
    const s = ensureNotesBlock(notesId);

    const lines = (text || "").split("\n");
    let currentKey = null;
    let currentLabel = null;
    let buf = [];

    const flush = () => {
      if (currentKey == null) return;
      s[notesId].items[String(currentKey)] =
        s[notesId].items[String(currentKey)] || { label: currentLabel || "Note", text: "" };
      s[notesId].items[String(currentKey)].label = currentLabel || "Note";
      s[notesId].items[String(currentKey)].text = buf.join("\n").trim();
    };

    const labelToKey = new Map();
    Object.entries(s[notesId].items || {}).forEach(([k, v]) => {
      if (v?.label) labelToKey.set(v.label, Number(k));
    });

    let nextKey = Math.max(
      -1,
      ...Object.keys(s[notesId].items || {})
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n))
    );

    for (const line of lines) {
      const m = line.match(/^•\s(.+):\s*$/);
      if (m) {
        flush();
        buf = [];
        currentLabel = m[1];

        const existingKey = labelToKey.get(currentLabel);
        if (existingKey != null) currentKey = existingKey;
        else { nextKey += 1; currentKey = nextKey; }
      } else if (currentKey != null) {
        buf.push(line);
      }
    }
    flush();

    saveNotesState(s);
  }

  function initNotesTextareaParsing(root = document) {
    $$("textarea", root).forEach((ta) => {
      const block = ta.closest(".section-block");
      const id = block?.id;
      if (!id) return;
      if (!id.startsWith("notes-") && !id.startsWith("notes-card-")) return;

      if (!bindOnce(ta, "notes_parse")) return;

      const run = debounce(() => {
        parseNotesTextareaToState(id, ta.value || "");
        persistAllDebounced();
        refreshAllNotesButtons();
      }, 200);

      ta.addEventListener("input", run);
      ta.addEventListener("change", run);
    });
  }

  /* -----------------------------
     TABLE ADD ROW (+)
  ----------------------------- */
  function clearRowControls(row) {
    $$("input, select, textarea", row).forEach((el) => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";

      if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
      if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
      if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
    });
  }

  function cloneLastRow(table) {
    const tbody = table.tBodies?.[0];
    if (!tbody || !tbody.rows.length) return null;
    const last = tbody.rows[tbody.rows.length - 1];
    const clone = last.cloneNode(true);
    clearRowControls(clone);
    tbody.appendChild(clone);
    return clone;
  }

  /* -----------------------------
     TABLE POPUP MODAL
  ----------------------------- */
  let modalEl = null;

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement("div");
    modalEl.id = "mkTableModal";
    modalEl.style.position = "fixed";
    modalEl.style.inset = "0";
    modalEl.style.zIndex = "99998";
    modalEl.style.display = "none";
    modalEl.style.background = "rgba(0,0,0,0.55)";
    modalEl.style.padding = "18px";
    modalEl.style.overflow = "hidden";

    modalEl.innerHTML = `
      <div id="mkTableModalShell" style="max-width:1400px; margin:0 auto; width:100%; height:100%; display:flex; flex-direction:column;">
        <div id="mkTableModalBar" style="
          background:#fff;
          border-radius:16px;
          padding:14px 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.22);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:14px;
          flex:0 0 auto;
        ">
          <div id="mkTableModalTitle" style="font-weight:800; font-size:22px;"></div>
          <div style="display:flex; gap:10px;">
            <button type="button" id="mkTableModalExpand" title="Expand" style="
              width:40px;height:40px;border-radius:12px;
              border:1px solid rgba(0,0,0,0.12);
              background:#fff;cursor:pointer;
              font-size:18px;
            ">↗</button>
            <button type="button" id="mkTableModalClose" title="Close" style="
              width:40px;height:40px;border-radius:12px;
              border:1px solid rgba(0,0,0,0.12);
              background:#fff;cursor:pointer;
              font-size:22px; line-height:1;
            ">×</button>
          </div>
        </div>

        <div id="mkTableModalCards" style="display:flex; flex-direction:column; gap:16px; width:100%; overflow:auto; padding-bottom:10px;"></div>
      </div>
    `;

    document.body.appendChild(modalEl);

    $("#mkTableModalClose", modalEl).addEventListener("click", closeModal);

    $("#mkTableModalExpand", modalEl).addEventListener("click", () => {
      const shell = $("#mkTableModalShell", modalEl);
      if (!shell) return;
      const full = shell.dataset.full === "true";
      shell.dataset.full = (!full).toString();
      shell.style.maxWidth = full ? "1400px" : "96vw";
    });

    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalEl?.style?.display === "block") closeModal();
    });

    return modalEl;
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.style.display = "none";
    modalEl.dataset.activeTableKey = "";
    const cards = $("#mkTableModalCards", modalEl);
    if (cards) cards.innerHTML = "";
  }

  function tableKeyForContainer(tableContainer) {
    const sectionId = closestSectionId(tableContainer);
    const all = $$(".table-container");
    const idx = all.indexOf(tableContainer);
    return `${sectionId}::tc::${idx >= 0 ? idx : 0}`;
  }

  function realContainerFromKey(key) {
    if (!key) return null;
    const m = key.match(/::tc::(\d+)$/);
    const idx = m ? Number(m[1]) : -1;
    const all = $$(".table-container");
    return idx >= 0 ? all[idx] : null;
  }

  function openTablePopup(tableContainer) {
    const modal = ensureModal();
    const cards = $("#mkTableModalCards", modal);
    const titleEl = $("#mkTableModalTitle", modal);
    if (!cards || !titleEl) return;

    const header =
      tableContainer.closest(".section")?.querySelector(".section-header span")?.textContent?.trim() ||
      tableContainer.closest(".section")?.querySelector(".section-header")?.textContent?.trim() ||
      tableContainer.closest(".page-section")?.querySelector("h1")?.textContent?.trim() ||
      "Table";

    titleEl.textContent = header;

    modal.dataset.activeTableKey = tableKeyForContainer(tableContainer);

    const notesBlock = findRelatedNotesBlock(tableContainer);

    const tableCard = document.createElement("div");
    tableCard.className = "section-block";
    tableCard.style.width = "100%";
    tableCard.style.overflow = "hidden";
    tableCard.innerHTML = `<h2>${header}</h2>`;

    const tableCloneContainer = tableContainer.cloneNode(true);

    const footer = $(".table-footer", tableCloneContainer);
    if (footer) $$(".mk-table-expand-btn, .expand-table-btn", footer).forEach((b) => b.remove());

    const scrollWrap = $(".scroll-wrapper", tableCloneContainer);
    if (scrollWrap) {
      scrollWrap.style.maxHeight = "52vh";
      scrollWrap.style.overflow = "auto";
      scrollWrap.style.maxWidth = "100%";
    }

    tableCard.appendChild(tableCloneContainer);

    let notesCard = null;
    if (notesBlock) {
      notesCard = notesBlock.cloneNode(true);
      notesCard.style.width = "100%";
      notesCard.style.overflow = "hidden";

      const realTA = $("textarea", notesBlock);
      const modalTA = $("textarea", notesCard);
      if (realTA && modalTA) {
        modalTA.value = realTA.value || "";
        modalTA.style.width = "100%";
        modalTA.style.maxWidth = "100%";
        modalTA.style.overflowX = "hidden";
        modalTA.style.minHeight = "240px";

        const syncToReal = () => {
          realTA.value = modalTA.value;
          applyPlaceholderClassToTextarea(realTA);
          parseNotesTextareaToState(notesBlock.id, realTA.value);
          persistAllDebounced();
          refreshAllNotesButtons();
        };
        modalTA.addEventListener("input", syncToReal);
        modalTA.addEventListener("change", syncToReal);

        const syncToModal = () => {
          if (modalTA.value !== realTA.value) modalTA.value = realTA.value;
        };
        realTA.addEventListener("input", syncToModal);
        realTA.addEventListener("change", syncToModal);
      }
    }

    cards.innerHTML = "";
    cards.appendChild(tableCard);
    if (notesCard) cards.appendChild(notesCard);

    sanitizeTableHeaders(tableCard);

    injectTableNotesButtons(tableCard);
    refreshAllNotesButtons(tableCard);

    modal.style.display = "block";
  }

  function initTableExpandButtons() {
    $$(".table-container").forEach((tc) => {
      const footer = $(".table-footer", tc);
      if (!footer) return;

      let expandBtn = $(".mk-table-expand-btn", footer) || $(".expand-table-btn", footer);
      if (!expandBtn) {
        expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "mk-table-expand-btn expand-table-btn";
        expandBtn.title = "Expand table";
        expandBtn.textContent = "⤢";
        footer.appendChild(expandBtn);
      } else {
        expandBtn.classList.add("mk-table-expand-btn", "expand-table-btn");
      }
    });
  }

  /* -----------------------------
     SUPPORT TICKETS
  ----------------------------- */
  function ticketIsComplete(groupEl) {
    const num = $(".ticket-number-input", groupEl)?.value?.trim();
    const url = $(".ticket-zendesk-input", groupEl)?.value?.trim();
    const summary = $(".ticket-summary-input", groupEl)?.value?.trim();
    return !!num && (!!url || !!summary);
  }

  function lockBaseOpenStatus(openBaseGroup) {
    const status = $(".ticket-status-select", openBaseGroup);
    if (status) {
      status.value = "Open";
      status.disabled = true;
    }
  }

  function moveTicketGroup(groupEl, statusVal) {
    const open = $("#openTicketsContainer");
    const t2 = $("#tierTwoTicketsContainer");
    const cr = $("#closedResolvedTicketsContainer");
    const cf = $("#closedFeatureTicketsContainer");
    if (!open || !t2 || !cr || !cf) return;

    if (statusVal === "Open") open.appendChild(groupEl);
    else if (statusVal === "Tier Two") t2.appendChild(groupEl);
    else if (statusVal === "Closed - Resolved") cr.appendChild(groupEl);
    else if (statusVal === "Closed - Feature Not Supported") cf.appendChild(groupEl);

    persistAllDebounced();
  }

  function initSupportTickets() {
    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const base = $(".ticket-group[data-base='true']", openContainer);
    if (base) lockBaseOpenStatus(base);

    [openContainer, $("#tierTwoTicketsContainer"), $("#closedResolvedTicketsContainer"), $("#closedFeatureTicketsContainer")]
      .filter(Boolean)
      .forEach((cont) => {
        $$(".ticket-group", cont).forEach((g) => {
          if (g.dataset.base === "true") lockBaseOpenStatus(g);
          else {
            const status = $(".ticket-status-select", g);
            if (status) status.disabled = false;
          }
        });
      });
  }

  /* -----------------------------
     ADDITIONAL TRAINERS / ADDITIONAL POC (+)
  ----------------------------- */
  function cloneAndClear(el) {
    const c = el.cloneNode(true);
    $$("input, select, textarea", c).forEach((x) => {
      if (x.type === "checkbox") x.checked = false;
      else x.value = "";
      if (x.tagName === "SELECT") applyPlaceholderClassToSelect(x);
      if (x.tagName === "INPUT") applyPlaceholderClassToInput(x);
      if (x.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(x);
    });
    return c;
  }

  function handleIntegratedPlusClick(plusBtn) {
    const pocCardBase = plusBtn.closest(".additional-poc-card[data-base='true']");
    if (pocCardBase) {
      const clone = cloneAndClear(pocCardBase);
      clone.dataset.base = "false";
      clone.dataset.clone = "true";
      $$(".add-row", clone).forEach((b) => b.remove());
      pocCardBase.parentElement?.insertBefore(clone, pocCardBase.nextSibling);
      initPlaceholderStyling(clone);
      persistAllDebounced();
      return true;
    }

    const trainersContainer = plusBtn.closest("#additionalTrainersContainer");
    if (trainersContainer) {
      const baseRow = plusBtn.closest(".checklist-row.integrated-plus");
      if (!baseRow) return true;

      const clone = cloneAndClear(baseRow);
      clone.classList.add("trainer-clone");
      clone.dataset.base = "false";
      $$(".add-row", clone).forEach((b) => b.remove());
      trainersContainer.appendChild(clone);
      initPlaceholderStyling(clone);
      persistAllDebounced();
      return true;
    }

    return false;
  }

  /* -----------------------------
     RESET PAGE / CLEAR ALL
  ----------------------------- */
  function clearNotesForSection(sectionEl) {
    const notesIds = $$(".section-block[id^='notes-'], .section-block[id^='notes-card-']", sectionEl)
      .map((b) => b.id)
      .filter(Boolean);

    if (!notesIds.length) return;

    const notesState = loadNotesState();
    notesIds.forEach((id) => { delete notesState[id]; });
    saveNotesState(notesState);
  }

  function clearSection(sectionEl) {
    if (!sectionEl) return;

    $$("input, select, textarea", sectionEl).forEach((el) => {
      const inTable = !!el.closest("table");
      const inTickets = !!el.closest("#support-tickets");
      if (inTable || inTickets) return;

      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
      if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
      if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
      if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
    });

    $$(".table-container", sectionEl).forEach((tc) => {
      const table = $("table", tc);
      const tbody = table?.tBodies?.[0];
      if (!tbody) return;

      const rows = Array.from(tbody.rows);
      const keep = Math.max(1, Math.min(3, rows.length));
      rows.forEach((r, idx) => {
        if (idx >= keep) r.remove();
        else clearRowControls(r);
      });
    });

    if (sectionEl.id === "support-tickets") {
      const open = $("#openTicketsContainer");
      const base = $(".ticket-group[data-base='true']", open);
      if (open && base) open.innerHTML = base.outerHTML;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = "";
    }

    clearNotesForSection(sectionEl);

    initPlaceholderStyling(sectionEl);
    persistAllDebounced();

    injectNotesButtonsIntoTwoColCards(sectionEl);
    injectTableNotesButtons(sectionEl);
    refreshAllNotesButtons(sectionEl);
  }

  function initResetButtons() {
    $$(".clear-page-btn").forEach((btn) => {
      if (!bindOnce(btn, "reset_page")) return;
      btn.addEventListener("click", () => {
        const sec = btn.closest(".page-section");
        clearSection(sec);
      });
    });

    const clearAllBtn = $("#clearAllBtn");
    if (clearAllBtn && bindOnce(clearAllBtn, "clear_all")) {
      clearAllBtn.addEventListener("click", () => {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(NOTES_KEY);
        closeModal();
        $$(".page-section").forEach(clearSection);
        saveState({});
      });
    }
  }

  /* -----------------------------
     GLOBAL CLICK HANDLER
  ----------------------------- */
  function initGlobalClicks() {
    if (!bindOnce(document.body, "global_clicks")) return;

    document.addEventListener("click", (e) => {
      const t = e.target;

      // Expand table
      const expandBtn = t.closest?.(".expand-table-btn, .mk-table-expand-btn");
      if (expandBtn) {
        const tc = expandBtn.closest(".table-container");
        if (tc) openTablePopup(tc);
        return;
      }

      // Add row (+) in table footer (page or popup)
      const addRowBtn = t.closest?.(".table-footer .add-row");
      if (addRowBtn) {
        const inModal = !!addRowBtn.closest("#mkTableModal");

        if (inModal && modalEl?.dataset?.activeTableKey) {
          const realTc = realContainerFromKey(modalEl.dataset.activeTableKey);
          const realTable = realTc ? $("table", realTc) : null;
          if (realTable) {
            const newRow = cloneLastRow(realTable);
            if (newRow) {
              persistAllDebounced();
              injectTableNotesButtons();
              refreshAllNotesButtons();
              openTablePopup(realTc);
            }
          }
          return;
        }

        const tc = addRowBtn.closest(".table-container");
        const table = tc ? $("table", tc) : null;
        if (table) {
          const newRow = cloneLastRow(table);
          if (newRow) {
            persistAllDebounced();
            injectTableNotesButtons();
            refreshAllNotesButtons();
          }
        }
        return;
      }

      // Integrated plus rows (Additional Trainers / Additional POC)
      const plusBtn = t.closest?.(".checklist-row.integrated-plus > .add-row");
      if (plusBtn) {
        if (handleIntegratedPlusClick(plusBtn)) return;
      }

      // Notes icon click
      const notesBtn = t.closest?.(".notes-icon-btn");
      if (notesBtn) {
        const targetId = notesBtn.dataset.notesTarget;
        if (!targetId) return;

        const sig = getRowSignature(notesBtn);
        const label = getBulletLabel(notesBtn);

        ensureNotesItem(targetId, sig.index, label);
        insertBulletHeaderIfMissing(targetId, label);

        refreshAllNotesButtons();
        return;
      }

      // Support tickets: add (+)
      const addTicketBtn = t.closest?.(".add-ticket-btn");
      if (addTicketBtn) {
        const openContainer = $("#openTicketsContainer");
        if (!openContainer) return;

        const baseGroup = $(".ticket-group[data-base='true']", openContainer);
        if (!baseGroup) return;

        if (!ticketIsComplete(baseGroup)) {
          $(".ticket-number-input", baseGroup)?.focus();
          return;
        }

        const clone = baseGroup.cloneNode(true);
        clone.dataset.base = "false";
        $$(".ticket-disclaimer", clone).forEach((el) => el.remove());

        const status = $(".ticket-status-select", clone);
        if (status) {
          status.disabled = false;
          status.value = "Open";
        }

        if (!$(".remove-ticket-btn", clone)) {
          const wrap = $(".ticket-number-wrap", clone);
          if (wrap) {
            const rm = document.createElement("button");
            rm.type = "button";
            rm.className = "remove-ticket-btn";
            rm.textContent = "–";
            wrap.appendChild(rm);
          }
        }

        openContainer.appendChild(clone);

        $$("input, textarea", baseGroup).forEach((el) => (el.value = ""));
        persistAllDebounced();
        return;
      }

      // Support tickets: remove (–)
      const removeTicketBtn = t.closest?.(".remove-ticket-btn");
      if (removeTicketBtn) {
        const group = removeTicketBtn.closest(".ticket-group");
        if (!group) return;
        if (group.dataset.base === "true") return;
        group.remove();
        persistAllDebounced();
        return;
      }
    });

    // ticket status mover (delegated)
    document.addEventListener("change", (e) => {
      const sel = e.target;
      if (!sel) return;
      if (!sel.classList?.contains("ticket-status-select")) return;

      const group = sel.closest(".ticket-group");
      if (!group) return;

      if (group.dataset.base === "true") {
        sel.value = "Open";
        sel.disabled = true;
        return;
      }

      moveTicketGroup(group, sel.value);
    });
  }

  /* -----------------------------
     BOOT
  ----------------------------- */
  function boot() {
    restoreAll();

    sanitizeTableHeaders();
    initNav();
    initAutosave();
    initResetButtons();
    initSupportTickets();

    initTableExpandButtons();

    injectNotesButtonsIntoTwoColCards();
    injectTableNotesButtons();
    normalizeNotesColumns();

    initNotesTextareaParsing();

    refreshAllNotesButtons();
    initPlaceholderStyling();

    initGlobalClicks();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
