/* =======================================================
   myKaarma Interactive Training Checklist — script.js
   ✅ FIXED + RESTORED
   - ✅ Nav + all buttons working (no broken bindings)
   - ✅ No double-binding / no “adds two” bug
   - ✅ Notes bubble icon (SVG), icon-only button
     - turns orange once a bullet is added (and stays orange)
     - works on questions + 2x2 cards + tables + table popups
     - DOES NOT scroll / DOES NOT shift page on click
     - DOES NOT show on label-only rows (no inputs/selects/textarea)
   - ✅ Tables:
     - Notes buttons stay in Notes column (never first column)
     - Training tables bullet label = Name
     - Opcodes bullet label = Opcode
     - Filters column preserved (we do not touch its cells)
   - ✅ Table popup:
     - Uses real card look (section-block)
     - Includes Add Row + Expand + Notes buttons that work
   - ✅ Notes textarea bigger in popups (via inline style)
   - ✅ Reset page clears stored notes bullets for that page
   - ✅ Support tickets add button works after restore
======================================================= */

(() => {
  "use strict";

  /* -----------------------------
     STORAGE KEYS
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

  // Bind-once guard (prevents double addEventListener)
  const bindOnce = (el, key) => {
    if (!el) return false;
    const k = `bound_${key}`;
    if (el.dataset[k] === "true") return false;
    el.dataset[k] = "true";
    return true;
  };

  // IMPORTANT: cloned nodes copy dataset flags; scrub them so rebind works
  function scrubBoundFlags(root) {
    if (!root) return;
    const nodes = [root, ...$$("*", root)];
    nodes.forEach((n) => {
      if (!n.dataset) return;
      Object.keys(n.dataset).forEach((k) => {
        if (k.startsWith("bound_")) delete n.dataset[k];
      });
    });
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

  function initPlaceholderStyling() {
    $$("select").forEach(applyPlaceholderClassToSelect);
    $$("input").forEach(applyPlaceholderClassToInput);
    $$("textarea").forEach(applyPlaceholderClassToTextarea);

    if (!bindOnce(document.body, "ph_events")) return;

    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.tagName === "SELECT") applyPlaceholderClassToSelect(t);
      if (t.tagName === "INPUT") applyPlaceholderClassToInput(t);
      if (t.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(t);
    });

    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.tagName === "INPUT") applyPlaceholderClassToInput(t);
      if (t.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(t);
    });
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
    const at = $("#additionalTrainersContainer");
    if (at) state.__additionalTrainersHTML = at.innerHTML;

    const pcs = $$(".additional-poc-card");
    if (pcs.length) state.__additionalPocsHTML = pcs.map((c) => c.outerHTML).join("");

    state.__ticketsHTML = {
      open: $("#openTicketsContainer")?.innerHTML || "",
      tierTwo: $("#tierTwoTicketsContainer")?.innerHTML || "",
      closedResolved: $("#closedResolvedTicketsContainer")?.innerHTML || "",
      closedFeature: $("#closedFeatureTicketsContainer")?.innerHTML || ""
    };
  }

  function restoreDynamicBlocks(state) {
    if (typeof state.__additionalTrainersHTML === "string" && $("#additionalTrainersContainer")) {
      $("#additionalTrainersContainer").innerHTML = state.__additionalTrainersHTML;
    }

    if (typeof state.__additionalPocsHTML === "string" && state.__additionalPocsHTML) {
      const grid = $(".primary-contacts-grid");
      if (grid) {
        $$(".additional-poc-card", grid).forEach((el) => el.remove());
        const wrapper = document.createElement("div");
        wrapper.innerHTML = state.__additionalPocsHTML;
        Array.from(wrapper.children).forEach((child) => grid.appendChild(child));
      }
    }

    const t = state.__ticketsHTML;
    if (t) {
      if ($("#openTicketsContainer") && typeof t.open === "string") $("#openTicketsContainer").innerHTML = t.open;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = t.tierTwo || "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = t.closedResolved || "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = t.closedFeature || "";
    }
  }

  function snapshotFormControls(state) {
    state.__controls = state.__controls || {};

    $$(".page-section").forEach((sec) => {
      const sectionId = sec.id;
      const controls = $$("input, select, textarea", sec);

      controls.forEach((el, i) => {
        const inTable = !!el.closest("table");
        const inTickets = !!el.closest("#support-tickets");
        const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
        const inAdditionalPoc = !!el.closest(".additional-poc-card");
        if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

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
        const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
        const inAdditionalPoc = !!el.closest(".additional-poc-card");
        if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

        const key = `${sectionId}::ctrl::${i}`;
        if (!(key in map)) return;

        if (el.type === "checkbox") el.checked = !!map[key];
        else el.value = map[key];

        if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
        if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
        if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
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
      if (t.matches("select, input[type='checkbox'], input[type='date']")) persistAllDebounced();
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
      btn.addEventListener("click", () => {
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
  }

  /* -----------------------------
     NOTES ICON (SVG) + BUTTON LOOK
     (No extra chrome; turns orange via .is-active class in your CSS)
  ----------------------------- */
  function notesIconSVG() {
    return `
      <svg class="notes-bubble-ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H10l-3 2z"
          fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9 10h.01M12 10h.01M15 10h.01"
          fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    `;
  }

  function rowHasAnyField(row) {
    if (!row) return false;
    const has = row.querySelector("input:not([type='button']):not([type='submit']):not([type='reset']), select, textarea");
    return !!has;
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

  function getRowSignature(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      const tbody = tr.parentElement;
      const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
      const idx = rows.indexOf(tr);
      return { kind: "table", index: idx >= 0 ? idx : 9999 };
    }

    const sec = btn.closest(".page-section") || document;
    const all = $$(".notes-bubble-btn", sec).filter((b) => !b.closest("table"));
    const idx = all.indexOf(btn);
    return { kind: "question", index: idx >= 0 ? idx : 9999 };
  }

  function getBulletLabel(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      const table = tr.closest("table");
      const headers = table ? $$("thead th", table).map((th) => th.textContent.trim().toLowerCase()) : [];
      const hasOpcodeHeader = headers.includes("opcode");

      if (hasOpcodeHeader) {
        // Opcodes table: 2nd cell text input = opcode
        const opcodeInput = tr.querySelector("td:nth-child(2) input[type='text']");
        const opcode = opcodeInput?.value?.trim();
        return opcode || "Opcode";
      }

      // Training tables: first text input in row = name
      const nameInput = tr.querySelector("td input[type='text']");
      const name = nameInput?.value?.trim();
      return name || "Name";
    }

    const row = btn.closest(".checklist-row");
    const label = row?.querySelector("label")?.textContent?.trim();
    return label ? label.replace(/\s+/g, " ") : "Note";
  }

  function ensureNotesItem(targetId, sigIndex, label) {
    const notesState = loadNotesState();
    notesState[targetId] = notesState[targetId] || { items: {} };

    const itemId = `${sigIndex}`;
    if (!notesState[targetId].items[itemId]) {
      notesState[targetId].items[itemId] = { label, text: "" };
    } else {
      notesState[targetId].items[itemId].label = label;
    }
    saveNotesState(notesState);
  }

  function buildNotesText(targetId) {
    const notesState = loadNotesState();
    const block = notesState[targetId];
    if (!block?.items) return "";

    const entries = Object.entries(block.items)
      .map(([k, v]) => ({ k: Number(k), v }))
      .sort((a, b) => a.k - b.k);

    const parts = [];
    entries.forEach(({ v }) => {
      parts.push(`• ${v.label}:`);
      const body = (v.text || "").trim();
      if (body) parts.push(body);
      parts.push(""); // spacing
    });

    while (parts.length && parts[parts.length - 1] === "") parts.pop();
    return parts.join("\n");
  }

  function hydrateNotesTextarea(targetId) {
    const block = $("#" + targetId);
    const ta = block?.querySelector?.("textarea");
    if (!ta) return;
    ta.value = buildNotesText(targetId);
    applyPlaceholderClassToTextarea(ta);
  }

  function refreshNotesButtonState(btn) {
    const targetId = btn?.dataset?.notesTarget;
    if (!targetId) return;

    const sig = getRowSignature(btn);
    const notesState = loadNotesState();
    const item = notesState?.[targetId]?.items?.[String(sig.index)];
    btn.classList.toggle("is-active", !!item);
  }

  function refreshAllNotesButtons(root = document) {
    $$(".notes-bubble-btn", root).forEach(refreshNotesButtonState);
  }

  function bindNotesButton(btn, options = {}) {
    if (!btn) return;
    if (!bindOnce(btn, "notes_btn")) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const notesTarget = options.overrideNotesTarget || btn.dataset.notesTarget;
      if (!notesTarget) return;

      // Skip label-only rows (non-table)
      const row = btn.closest(".checklist-row");
      if (row && !row.closest("table") && !rowHasAnyField(row)) return;

      const sig = getRowSignature(btn);
      const label = getBulletLabel(btn);

      ensureNotesItem(notesTarget, sig.index, label);
      hydrateNotesTextarea(notesTarget);

      // NO scrollIntoView, NO page movement
      persistAllDebounced();

      refreshNotesButtonState(btn);
    });
  }

  function bindNotesButtonsWithin(root, opts = {}) {
    $$(".notes-bubble-btn", root).forEach((btn) => bindNotesButton(btn, opts));
    refreshAllNotesButtons(root);
  }

  /* -----------------------------
     AUTO-INJECT 🗨️ BUTTONS INTO 2x2 CARDS
     - Only for rows with a field
     - Targets the Notes card in that 2-col grid
  ----------------------------- */
  function ensureElementId(el, prefix = "notes-card") {
    if (el.id) return el.id;
    el.id = `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    return el.id;
  }

  function injectNotesButtonsIntoTwoColCards() {
    $$(".cards-grid.two-col").forEach((grid) => {
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

      // question block = first non-notes block
      const questionBlock = blocks.find((b) => b !== notesBlock);
      if (!questionBlock) return;

      $$(".checklist-row", questionBlock).forEach((row) => {
        if (!rowHasAnyField(row)) return;                 // ✅ skip label-only
        if (row.querySelector(".notes-bubble-btn")) return;
        if (row.closest("table")) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "notes-bubble-btn";
        btn.dataset.notesTarget = notesId;
        btn.setAttribute("aria-label", "Add note");
        btn.innerHTML = notesIconSVG();

        row.appendChild(btn);
      });
    });

    bindNotesButtonsWithin(document);
  }

  /* -----------------------------
     TABLE NOTES BUTTONS
     - Ensure button exists ONLY in Notes column
  ----------------------------- */
  function findNotesColumnIndex(table) {
    const ths = $$("thead th", table);
    const idx = ths.findIndex((th) => th.textContent.trim().toLowerCase() === "notes");
    return idx; // 0-based, -1 if not found
  }

  function ensureTableNotesCell(tr, notesTargetId) {
    if (!tr) return;
    const table = tr.closest("table");
    if (!table) return;

    const idx = findNotesColumnIndex(table);
    let td = null;

    if (idx >= 0) td = tr.children[idx];
    if (!td) td = tr.querySelector("td.notes-col-cell") || tr.lastElementChild;
    if (!td) return;

    let btn = td.querySelector(".notes-bubble-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "notes-bubble-btn";
      btn.setAttribute("aria-label", "Add note");
      btn.innerHTML = notesIconSVG();
      td.textContent = "";
      td.appendChild(btn);
    }

    btn.dataset.notesTarget = notesTargetId;
  }

  function wireAllTableRowsNotes() {
    $$(".table-container").forEach((tc) => {
      const table = $("table", tc);
      if (!table) return;

      // Determine target notes block for this table (from any existing dataset)
      const existingBtn = $(".notes-icon-btn[data-notes-target], .notes-bubble-btn[data-notes-target]", tc);
      const notesTarget = existingBtn?.dataset?.notesTarget || existingBtn?.dataset?.notesTarget || null;

      // If table has notes icons in markup as .notes-icon-btn, convert them to bubble buttons
      $$("tbody tr", table).forEach((tr) => {
        // If your HTML uses data-notes-target per row button, keep it; otherwise use table target
        const rowBtn = tr.querySelector(".notes-icon-btn[data-notes-target], .notes-bubble-btn[data-notes-target]");
        const target = rowBtn?.dataset?.notesTarget || notesTarget;

        if (!target) return;
        ensureTableNotesCell(tr, target);
      });

      // Bind after we ensured
      bindNotesButtonsWithin(tc);
    });
  }

  /* -----------------------------
     TABLE: ADD ROW (+)
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
    scrubBoundFlags(clone); // IMPORTANT
    clearRowControls(clone);
    tbody.appendChild(clone);
    return clone;
  }

  function initTableAddRowButtons(root = document) {
    $$(".table-container", root).forEach((tc) => {
      const footerAdd = $(".table-footer .add-row", tc);
      const table = $("table", tc);
      if (!footerAdd || !table) return;

      if (!bindOnce(footerAdd, "table_add_row")) return;

      footerAdd.addEventListener("click", () => {
        const newRow = cloneLastRow(table);
        if (!newRow) return;

        // Ensure notes button stays in Notes column and works
        const anyNotesBtn = $(".notes-bubble-btn[data-notes-target], .notes-icon-btn[data-notes-target]", tc);
        const target = anyNotesBtn?.dataset?.notesTarget;
        if (target) ensureTableNotesCell(newRow, target);

        bindNotesButtonsWithin(newRow);
        persistAllDebounced();
      });
    });
  }

  /* -----------------------------
     TABLE POPUP MODAL
     - Uses real card style
     - Includes ADD ROW buttons (requested)
  ----------------------------- */
  let modalEl = null;

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement("div");
    modalEl.id = "mkTableModal";
    modalEl.style.position = "fixed";
    modalEl.style.inset = "0";
    modalEl.style.zIndex = "9999";
    modalEl.style.display = "none";
    modalEl.style.background = "rgba(0,0,0,0.55)";
    modalEl.style.padding = "18px";
    modalEl.style.overflow = "auto";

    modalEl.innerHTML = `
      <div id="mkTableModalShell" style="max-width:1400px;margin:0 auto;">
        <div id="mkTableModalBar" style="
          background:#fff;border-radius:16px;padding:14px 16px;
          box-shadow:0 10px 30px rgba(0,0,0,0.22);
          display:flex;align-items:center;justify-content:space-between;
          gap:12px;margin-bottom:14px;">
          <div id="mkTableModalTitle" style="font-weight:800;font-size:22px;"></div>
          <div style="display:flex;gap:10px;">
            <button type="button" id="mkTableModalExpand" title="Expand" style="
              width:40px;height:40px;border-radius:12px;
              border:1px solid rgba(0,0,0,0.12);
              background:#fff;cursor:pointer;font-size:18px;">↗</button>
            <button type="button" id="mkTableModalClose" title="Close" style="
              width:40px;height:40px;border-radius:12px;
              border:1px solid rgba(0,0,0,0.12);
              background:#fff;cursor:pointer;font-size:22px;line-height:1;">×</button>
          </div>
        </div>

        <div id="mkTableModalCards" style="display:grid;gap:16px;"></div>
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
    const cards = $("#mkTableModalCards", modalEl);
    if (cards) cards.innerHTML = "";
  }

  function findRelatedNotesBlock(tableContainer) {
    const btn = $(".notes-bubble-btn[data-notes-target], .notes-icon-btn[data-notes-target]", tableContainer);
    const id = btn?.dataset?.notesTarget;
    if (id && $("#" + id)) return $("#" + id);

    const section = tableContainer.closest(".page-section");
    if (!section) return null;
    const all = $$("[id^='notes-'].section-block", section);
    return all[0] || null;
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

    // TABLE CARD
    const tableCard = document.createElement("div");
    tableCard.className = "section-block";
    tableCard.innerHTML = `<h2>${header}</h2>`;

    const tableClone = tableContainer.cloneNode(true);
    scrubBoundFlags(tableClone);

    // In popup, keep footer + add-row + expand (requested)
    // But we remove any existing "expand" button duplicates we add ourselves
    // (initTableExpandButtons handles real page only)

    const scrollWrap = $(".scroll-wrapper", tableClone);
    if (scrollWrap) {
      scrollWrap.style.maxHeight = "45vh";
      scrollWrap.style.overflow = "auto";
    }

    tableCard.appendChild(tableClone);

    // NOTES CARD
    const notesBlock = findRelatedNotesBlock(tableContainer);
    const notesClone = notesBlock ? notesBlock.cloneNode(true) : null;

    if (notesClone) {
      // Make popup notes bigger + no horizontal scroll
      const ta = $("textarea", notesClone);
      if (ta) {
        ta.style.minHeight = "220px";
        ta.style.resize = "vertical";
        ta.style.overflowX = "hidden";
      }
    }

    // 2-way link real notes <-> modal notes
    if (notesBlock && notesClone) {
      const realTA = $("textarea", notesBlock);
      const modalTA = $("textarea", notesClone);
      if (realTA && modalTA) {
        modalTA.value = realTA.value;

        modalTA.addEventListener("input", () => {
          realTA.value = modalTA.value;
          applyPlaceholderClassToTextarea(realTA);
          persistAllDebounced();
        });

        const syncBack = () => {
          if (modalTA.value !== realTA.value) modalTA.value = realTA.value;
        };
        realTA.addEventListener("input", syncBack);
        realTA.addEventListener("change", syncBack);
      }
    }

    // Render
    cards.innerHTML = "";
    cards.appendChild(tableCard);
    if (notesClone) cards.appendChild(notesClone);

    // Notes buttons in popup table must still target the REAL notes block id
    const realNotesId = notesBlock?.id;

    // Ensure the cloned table rows have bubble buttons in Notes column
    // (convert any legacy .notes-icon-btn too)
    $$("table", tableCard).forEach((tbl) => {
      $$("tbody tr", tbl).forEach((tr) => {
        if (!realNotesId) return;
        ensureTableNotesCell(tr, realNotesId);
      });
    });

    bindNotesButtonsWithin(tableCard, { overrideNotesTarget: realNotesId });
    bindNotesButtonsWithin(notesClone || tableCard);

    // Bind add-row in popup clone (so + works in popup)
    initTableAddRowButtons(tableCard);

    modal.style.display = "block";
  }

  function initTableExpandButtons() {
    $$(".table-container").forEach((tc) => {
      const footer = $(".table-footer", tc);
      if (!footer) return;

      let expandBtn = $(".expand-table-btn", footer);
      if (!expandBtn) {
        expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "expand-table-btn";
        expandBtn.title = "Expand table";
        expandBtn.textContent = "↗";
        footer.appendChild(expandBtn);
      }

      if (!bindOnce(expandBtn, "expand_table")) return;
      expandBtn.addEventListener("click", () => openTablePopup(tc));
    });
  }

  /* -----------------------------
     NOTES TEXTAREA PARSING (keeps your bullets organized)
  ----------------------------- */
  function initNotesTextareaParsing() {
    $$("textarea").forEach((ta) => {
      const block = ta.closest(".section-block");
      const id = block?.id;
      if (!id) return;
      if (!id.startsWith("notes-") && !id.startsWith("notes-card-")) return;
      if (!bindOnce(ta, "notes_parse")) return;

      const parseAndStore = debounce(() => {
        const raw = ta.value || "";
        const lines = raw.split("\n");
        const items = [];
        let current = null;

        for (const line of lines) {
          const m = line.match(/^•\s(.+):\s*$/);
          if (m) {
            if (current) items.push(current);
            current = { label: m[1], textLines: [] };
          } else if (current) {
            current.textLines.push(line);
          }
        }
        if (current) items.push(current);

        const notesState = loadNotesState();
        notesState[id] = notesState[id] || { items: {} };

        const existing = notesState[id].items || {};
        const labelToKey = new Map();
        Object.entries(existing).forEach(([k, v]) => {
          if (v?.label) labelToKey.set(v.label, k);
        });

        let maxKey = Math.max(-1, ...Object.keys(existing).map((k) => Number(k)).filter((n) => !Number.isNaN(n)));
        items.forEach((it) => {
          let key = labelToKey.get(it.label);
          if (key == null) {
            maxKey += 1;
            key = String(maxKey);
            notesState[id].items[key] = { label: it.label, text: "" };
          }
          notesState[id].items[key].label = it.label;
          notesState[id].items[key].text = it.textLines.join("\n").trim();
        });

        saveNotesState(notesState);
        hydrateNotesTextarea(id);
        persistAllDebounced();
        refreshAllNotesButtons(document);
      }, 350);

      ta.addEventListener("input", parseAndStore);
      ta.addEventListener("change", parseAndStore);
    });

    // hydrate from state on load
    const notesState = loadNotesState();
    Object.keys(notesState).forEach((id) => {
      if ($("#" + id)?.querySelector?.("textarea")) hydrateNotesTextarea(id);
    });
  }

  /* -----------------------------
     RESET PAGE / CLEAR ALL
     - Also clears NOTES_KEY entries for notes blocks in that page
  ----------------------------- */
  function clearNotesForSection(sectionEl) {
    if (!sectionEl) return;
    const notesBlocks = $$("[id^='notes-'].section-block, [id^='notes-card-'].section-block", sectionEl);
    if (!notesBlocks.length) return;

    const notesState = loadNotesState();
    notesBlocks.forEach((b) => {
      const id = b.id;
      if (id && notesState[id]) delete notesState[id];
      const ta = $("textarea", b);
      if (ta) ta.value = "";
    });
    saveNotesState(notesState);
  }

  function clearSection(sectionEl) {
    if (!sectionEl) return;

    // clear non-table / non-ticket controls
    $$("input, select, textarea", sectionEl).forEach((el) => {
      const inTable = !!el.closest("table");
      const inTickets = !!el.closest("#support-tickets");
      const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
      const inAdditionalPoc = !!el.closest(".additional-poc-card");
      if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // tables: keep first 3 rows, wipe values
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

    // tickets: reset stacks
    if (sectionEl.id === "support-tickets") {
      const open = $("#openTicketsContainer");
      const base = $(".ticket-group[data-base='true']", open);
      if (open && base) open.innerHTML = base.outerHTML;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = "";
    }

    // ✅ clear stored notes for this page (prevents “old bullets come back”)
    clearNotesForSection(sectionEl);

    // refresh styling + saves
    $$("select", sectionEl).forEach(applyPlaceholderClassToSelect);
    $$("input", sectionEl).forEach(applyPlaceholderClassToInput);
    $$("textarea", sectionEl).forEach(applyPlaceholderClassToTextarea);

    persistAllDebounced();
    refreshAllNotesButtons(document);
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
     ONSITE DATES: end defaults to start + 2 days
  ----------------------------- */
  function initOnsiteDates() {
    const start = $("#onsiteStartDate");
    const end = $("#onsiteEndDate");
    if (!start || !end) return;
    if (!bindOnce(start, "onsite_date")) return;

    const addDays = (yyyy_mm_dd, days) => {
      const d = new Date(yyyy_mm_dd + "T00:00:00");
      if (Number.isNaN(d.getTime())) return "";
      d.setDate(d.getDate() + days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    start.addEventListener("change", () => {
      if (!start.value) return;
      if (!end.value) {
        end.value = addDays(start.value, 2);
        applyPlaceholderClassToInput(end);
        persistAllDebounced();
      }
    });
  }

  /* -----------------------------
     ADDITIONAL TRAINERS (+) — NO DELETE BUTTONS
  ----------------------------- */
  function initAdditionalTrainers() {
    const container = $("#additionalTrainersContainer");
    const baseRow = $(".checklist-row.integrated-plus[data-base='true']");
    if (!container || !baseRow) return;

    const addBtn = $(".add-row", baseRow);
    if (!addBtn) return;
    if (!bindOnce(addBtn, "add_trainer")) return;

    addBtn.addEventListener("click", () => {
      const clone = baseRow.cloneNode(true);
      scrubBoundFlags(clone);
      clone.dataset.base = "false";

      const inp = $("input[type='text']", clone);
      if (inp) inp.value = "";

      $$(".add-row", clone).forEach((b) => b.remove()); // only base has +
      container.appendChild(clone);

      if (inp) applyPlaceholderClassToInput(inp);
      persistAllDebounced();
    });
  }

  /* -----------------------------
     ADDITIONAL POC (+) — NO DELETE BUTTONS
  ----------------------------- */
  function initAdditionalPOCs() {
    const baseCard = $(".additional-poc-card[data-base='true']");
    const grid = $(".primary-contacts-grid");
    if (!baseCard || !grid) return;

    const addBtn = $(".additional-poc-add", baseCard);
    if (!addBtn) return;
    if (!bindOnce(addBtn, "add_poc")) return;

    addBtn.addEventListener("click", () => {
      const clone = baseCard.cloneNode(true);
      scrubBoundFlags(clone);
      clone.dataset.base = "false";
      $$("input", clone).forEach((inp) => (inp.value = ""));
      $$(".additional-poc-add", clone).forEach((b) => b.remove());
      grid.appendChild(clone);

      $$("input, select, textarea", clone).forEach((el) => {
        if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
        if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
        if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
      });

      persistAllDebounced();
    });
  }

  /* -----------------------------
     SUPPORT TICKETS (add button restored)
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

  function bindTicketStatusMover(groupEl) {
    const status = $(".ticket-status-select", groupEl);
    if (!status) return;
    if (!bindOnce(status, "ticket_move")) return;

    status.addEventListener("change", () => {
      const val = status.value;
      const open = $("#openTicketsContainer");
      const t2 = $("#tierTwoTicketsContainer");
      const cr = $("#closedResolvedTicketsContainer");
      const cf = $("#closedFeatureTicketsContainer");
      if (!open || !t2 || !cr || !cf) return;

      if (val === "Open") open.appendChild(groupEl);
      else if (val === "Tier Two") t2.appendChild(groupEl);
      else if (val === "Closed - Resolved") cr.appendChild(groupEl);
      else if (val === "Closed - Feature Not Supported") cf.appendChild(groupEl);

      persistAllDebounced();
    });
  }

  function initSupportTickets() {
    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const base = $(".ticket-group[data-base='true']", openContainer);
    if (base) lockBaseOpenStatus(base);

    // Always re-grab add button AFTER restore (HTML replaced)
    const baseGroup = $(".ticket-group[data-base='true']", openContainer);
    const addBtn = $(".add-ticket-btn", baseGroup || openContainer);

    if (addBtn && bindOnce(addBtn, "add_ticket")) {
      addBtn.addEventListener("click", () => {
        const base = $(".ticket-group[data-base='true']", openContainer);
        if (!base) return;

        if (!ticketIsComplete(base)) {
          $(".ticket-number-input", base)?.focus();
          return;
        }

        const clone = base.cloneNode(true);
        scrubBoundFlags(clone);
        clone.dataset.base = "false";
        $$(".ticket-disclaimer", clone).forEach((el) => el.remove());

        const status = $(".ticket-status-select", clone);
        if (status) {
          status.disabled = false;
          status.value = "Open";
        }

        openContainer.appendChild(clone);

        $$("input, textarea", base).forEach((el) => (el.value = ""));
        persistAllDebounced();

        bindTicketStatusMover(clone);
      });
    }

    [openContainer, $("#tierTwoTicketsContainer"), $("#closedResolvedTicketsContainer"), $("#closedFeatureTicketsContainer")]
      .filter(Boolean)
      .forEach((cont) => {
        $$(".ticket-group", cont).forEach((g) => {
          if (g.dataset.base === "true") lockBaseOpenStatus(g);
          else bindTicketStatusMover(g);
        });
      });
  }

  /* -----------------------------
     BOOT + REBIND AFTER RESTORE
     (This is what prevents “all buttons stopped working”)
  ----------------------------- */
  function rebindAfterRestore() {
    // Tables
    wireAllTableRowsNotes();
    initTableAddRowButtons(document);
    initTableExpandButtons();

    // Notes
    injectNotesButtonsIntoTwoColCards();
    bindNotesButtonsWithin(document);
    refreshAllNotesButtons(document);

    // Tickets
    initSupportTickets();
  }

  function boot() {
    restoreAll();

    initNav();
    initPlaceholderStyling();
    initAutosave();
    initResetButtons();
    initOnsiteDates();

    initAdditionalTrainers();
    initAdditionalPOCs();

    // Notes system
    initNotesTextareaParsing();

    // Rebind anything that depends on restored innerHTML
    rebindAfterRestore();

    // Final placeholder refresh
    initPlaceholderStyling();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
