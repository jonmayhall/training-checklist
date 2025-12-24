/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ FIXED / RESTORED
   - Menu + buttons working again (event delegation; no dead bindings after restore)
   - No double-add / no double-binding
   - Notes bubble icon (circle-only) turns orange when notes exist (has-notes)
   - Notes buttons ONLY added where there is an input/select/textarea (no blank label rows)
   - Training tables bullet label = Name (first text input)
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
     NOTES BUBBLE ICON (circle-only)
  ----------------------------- */
  const NOTES_SVG = `
    <svg class="notes-bubble" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5c0 1.2-.7 2.2-1.8 2.7-.3.1-.5.4-.5.7v2.1l-2.2-1.3c-.2-.1-.4-.1-.6 0-1 .4-2.1.6-3.3.6H8c-2.8 0-5-2.1-5-4.7V7.5C3 5 5.2 3 8 3h7c2.8 0 5 2.1 5 4.5v7z"/>
      <g class="dots">
        <path d="M9 11.2h0"/>
        <path d="M12 11.2h0"/>
        <path d="M15 11.2h0"/>
      </g>
    </svg>
  `.trim();

  function makeNotesButton(targetId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "notes-icon-btn";
    btn.dataset.notesTarget = targetId;
    btn.setAttribute("aria-label", "Add/View Notes");
    btn.innerHTML = NOTES_SVG;
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

  function initPlaceholderStyling() {
    $$("select").forEach(applyPlaceholderClassToSelect);
    $$("input").forEach(applyPlaceholderClassToInput);
    $$("textarea").forEach(applyPlaceholderClassToTextarea);
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
     NAV (works again)
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
  }

  /* -----------------------------
     SANITIZE TABLE HEADERS
     - fixes phantom white row + textbox in headers
  ----------------------------- */
  function sanitizeTableHeaders() {
    $$(".training-table").forEach((table) => {
      const thead = table.tHead;
      if (!thead) return;

      $$("tr", thead).forEach((tr) => {
        if (tr.querySelector("input, select, textarea, button")) tr.remove();
      });

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
     NOTES STATE + ACTIVE BUTTONS
  ----------------------------- */
  function loadNotesState() {
    return safeJSONParse(localStorage.getItem(NOTES_KEY), {}) || {};
  }
  function saveNotesState(state) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(state));
  }

  function ensureNotesItem(targetId, sigIndex, label) {
    const notesState = loadNotesState();
    notesState[targetId] = notesState[targetId] || { items: {} };

    const itemId = String(sigIndex);
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
    for (const { v } of entries) {
      parts.push(`• ${v.label}:`);
      const body = (v.text || "").trim();
      if (body) parts.push(body);
      parts.push(""); // blank line between bullets
    }
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

      const nameInput = tr.querySelector("td input[type='text']");
      const name = nameInput?.value?.trim();
      return name || "Name";
    }

    const row = btn.closest(".checklist-row");
    const label = row?.querySelector("label")?.textContent?.trim();
    return label ? label.replace(/\s+/g, " ") : "Note";
  }

  function buttonHasNotes(targetId, sigIndex) {
    const s = loadNotesState();
    const item = s?.[targetId]?.items?.[String(sigIndex)];
    if (!item) return false;
    return (item.text || "").trim().length > 0 || (item.label || "").trim().length > 0;
  }

  function refreshAllNotesButtons(root = document) {
    $$(".notes-icon-btn[data-notes-target]", root).forEach((btn) => {
      const targetId = btn.dataset.notesTarget;
      if (!targetId) return;
      const sig = getRowSignature(btn);
      const has = buttonHasNotes(targetId, sig.index);
      btn.classList.toggle("has-notes", !!has);
    });
  }

  /* -----------------------------
     NOTES BUTTON PLACEMENT
     - Ensure notes button is inside the Notes column cell (td.notes-col-cell)
     - Prevent notes buttons showing in first column, etc.
  ----------------------------- */
  function normalizeNotesColumns() {
    $$(".training-table").forEach((table) => {
      const headCells = $$("thead th", table).map((th) => th.textContent.trim().toLowerCase());
      const notesIdx = headCells.lastIndexOf("notes");
      if (notesIdx < 0) return;

      const tbody = table.tBodies?.[0];
      if (!tbody) return;

      Array.from(tbody.rows).forEach((tr) => {
        const tds = Array.from(tr.cells);
        if (!tds.length) return;

        // Find any notes button wrongly placed
        const wrongBtn = tr.querySelector(".notes-icon-btn");
        if (!wrongBtn) return;

        // Ensure the notes cell exists
        let notesCell = tds[notesIdx];
        if (!notesCell) {
          // pad cells to match header count
          while (tr.cells.length <= notesIdx) tr.insertCell(-1);
          notesCell = tr.cells[notesIdx];
        }

        notesCell.classList.add("notes-col-cell");

        // If button already in notes cell, ok
        if (notesCell.contains(wrongBtn)) return;

        // Move it into notes cell
        notesCell.innerHTML = "";
        notesCell.appendChild(wrongBtn);
      });
    });
  }

  /* -----------------------------
     AUTO-INJECT NOTES BUTTONS INTO:
     A) tables (last Notes column)
     B) 2x2 question cards rows (only if row has input/select/textarea)
  ----------------------------- */
  function injectTableNotesButtons() {
    $$(".training-table").forEach((table) => {
      const headCells = $$("thead th", table).map((th) => th.textContent.trim().toLowerCase());
      const notesIdx = headCells.lastIndexOf("notes");
      if (notesIdx < 0) return;

      // Find related notes block via any data-notes-target already in table
      const tc = table.closest(".table-container");
      const notesBlock = tc ? findRelatedNotesBlock(tc) : null;
      const notesId = notesBlock?.id;
      if (!notesId) return;

      const tbody = table.tBodies?.[0];
      if (!tbody) return;

      Array.from(tbody.rows).forEach((tr) => {
        while (tr.cells.length <= notesIdx) tr.insertCell(-1);
        const cell = tr.cells[notesIdx];
        cell.classList.add("notes-col-cell");

        if (cell.querySelector(".notes-icon-btn")) return;

        const btn = makeNotesButton(notesId);
        cell.appendChild(btn);
      });
    });

    normalizeNotesColumns();
  }

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

      const questionBlock = blocks.find((b) => b !== notesBlock);
      if (!questionBlock) return;

      $$(".checklist-row", questionBlock).forEach((row) => {
        // Only rows that actually have a control need notes
        const hasControl = row.querySelector("input, select, textarea");
        if (!hasControl) return;

        if (row.querySelector(".notes-icon-btn")) return;

        const btn = makeNotesButton(notesId);
        row.appendChild(btn);
      });
    });
  }

  /* -----------------------------
     NOTES TEXTAREA PARSING (keeps orange state)
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

        // map existing labels to keys
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
        refreshAllNotesButtons();
      }, 250);

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
     (keep ensureModal() + modalEl = null as requested)
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
    modalEl.style.overflow = "hidden"; // ✅ prevent page/right overflow

    modalEl.innerHTML = `
      <div id="mkTableModalShell" style="max-width:1400px; margin:0 auto; width:100%;">
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

        <div id="mkTableModalCards" style="display:grid; gap:16px; width:100%;"></div>
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

  function findRelatedNotesBlock(tableContainer) {
    const btn = $(".notes-icon-btn[data-notes-target]", tableContainer);
    const id = btn?.dataset?.notesTarget;
    if (id && $("#" + id)) return $("#" + id);

    const section = tableContainer.closest(".page-section");
    if (!section) return null;
    const all = $$("[id^='notes-'].section-block", section);
    return all[0] || null;
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

    // remember which table is open so popup "+" adds to REAL table
    modal.dataset.activeTableKey = tableKeyForContainer(tableContainer);

    const notesBlock = findRelatedNotesBlock(tableContainer);
    const notesClone = notesBlock ? notesBlock.cloneNode(true) : null;

    // TABLE CARD
    const tableCard = document.createElement("div");
    tableCard.className = "section-block";
    tableCard.style.width = "100%";
    tableCard.style.overflow = "hidden";
    tableCard.innerHTML = `<h2>${header}</h2>`;

    const tableClone = tableContainer.cloneNode(true);

    // Keep footer (+) but remove expand inside popup clone
    const footer = $(".table-footer", tableClone);
    if (footer) $$(".expand-table-btn", footer).forEach((b) => b.remove());

    // force original-like table scrolling
    const scrollWrap = $(".scroll-wrapper", tableClone);
    if (scrollWrap) {
      scrollWrap.style.maxHeight = "52vh";
      scrollWrap.style.overflow = "auto";
      scrollWrap.style.maxWidth = "100%";
    }

    tableCard.appendChild(tableClone);

    // NOTES CARD
    if (notesClone) {
      notesClone.style.width = "100%";
      notesClone.style.overflow = "hidden";
      const modalTA = $("textarea", notesClone);
      if (modalTA) {
        modalTA.style.width = "100%";
        modalTA.style.maxWidth = "100%";
        modalTA.style.overflowX = "hidden";
        modalTA.style.minHeight = "220px"; // ✅ bigger notes box
      }

      // 2-way sync with real textarea
      const realTA = $("textarea", notesBlock);
      if (realTA && modalTA) {
        modalTA.value = realTA.value;

        modalTA.addEventListener("input", () => {
          realTA.value = modalTA.value;
          applyPlaceholderClassToTextarea(realTA);
          persistAllDebounced();
          refreshAllNotesButtons();
        });

        const syncBack = () => {
          if (modalTA.value !== realTA.value) modalTA.value = realTA.value;
        };
        realTA.addEventListener("input", syncBack);
        realTA.addEventListener("change", syncBack);
      }
    }

    cards.innerHTML = "";
    cards.appendChild(tableCard);
    if (notesClone) cards.appendChild(notesClone);

    // Fix any polluted header rows in clone too
    sanitizeTableHeaders();

    // Ensure notes buttons exist in the popup table clone
    injectTableNotesButtons();
    refreshAllNotesButtons(tableCard);

    modal.style.display = "block";
  }

  function initTableExpandButtons() {
    // Create expand buttons once (per table footer)
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
    });
  }

  /* -----------------------------
     SUPPORT TICKETS (restore + move)
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

    // ensure restored groups have correct disabled/enabled status
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
     RESET PAGE / CLEAR ALL
     - clears notes state for that page to prevent “old bullets” coming back
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

    // clear normal controls (not tables / not tickets)
    $$("input, select, textarea", sectionEl).forEach((el) => {
      const inTable = !!el.closest("table");
      const inTickets = !!el.closest("#support-tickets");
      if (inTable || inTickets) return;

      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // clear tables (keep first 3 rows max)
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

    // support tickets reset
    if (sectionEl.id === "support-tickets") {
      const open = $("#openTicketsContainer");
      const base = $(".ticket-group[data-base='true']", open);
      if (open && base) open.innerHTML = base.outerHTML;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = "";
    }

    // ✅ clear notes state for this page so old bullets don’t return
    clearNotesForSection(sectionEl);

    initPlaceholderStyling();
    persistAllDebounced();

    // rebuild notes buttons + refresh orange state
    injectTableNotesButtons();
    injectNotesButtonsIntoTwoColCards();
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
     GLOBAL CLICK HANDLER (fixes “buttons stopped working”)
     - works after restore() because it doesn’t rely on per-row listeners
  ----------------------------- */
  function initGlobalClicks() {
    if (!bindOnce(document.body, "global_clicks")) return;

    document.addEventListener("click", (e) => {
      const t = e.target;

      // Expand table
      const expandBtn = t.closest?.(".expand-table-btn");
      if (expandBtn) {
        const tc = expandBtn.closest(".table-container");
        if (tc) openTablePopup(tc);
        return;
      }

      // Add row (+) in table footer (page or popup)
      const addRowBtn = t.closest?.(".table-footer .add-row");
      if (addRowBtn) {
        // If inside modal, add to REAL table of active key
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
              // refresh popup view
              openTablePopup(realTc);
            }
          }
          return;
        }

        // Normal page add row
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

      // Notes bubble click
      const notesBtn = t.closest?.(".notes-icon-btn");
      if (notesBtn) {
        const targetId = notesBtn.dataset.notesTarget;
        if (!targetId) return;

        const sig = getRowSignature(notesBtn);
        const label = getBulletLabel(notesBtn);

        ensureNotesItem(targetId, sig.index, label);
        hydrateNotesTextarea(targetId);

        // ✅ NO scrolling / NO page shifting
        persistAllDebounced();
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

        openContainer.appendChild(clone);

        // reset base fields
        $$("input, textarea", baseGroup).forEach((el) => (el.value = ""));
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

      // base must stay locked open
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

    // fix phantom header pollution
    sanitizeTableHeaders();

    initNav();
    initAutosave();
    initResetButtons();
    initSupportTickets();

    // make sure expand buttons exist
    initTableExpandButtons();

    // inject/normalize notes buttons everywhere
    injectNotesButtonsIntoTwoColCards();
    injectTableNotesButtons();
    normalizeNotesColumns();

    // parse notes + set orange state
    initNotesTextareaParsing();
    refreshAllNotesButtons();

    // placeholder styling
    initPlaceholderStyling();

    // ✅ brings all buttons back to life (after restore, cloning, etc.)
    initGlobalClicks();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
