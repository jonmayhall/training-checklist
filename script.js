/* =======================================================
   myKaarma Interactive Training Checklist — script.js
   ✅ FIXED + UPDATED (per your latest notes)
   - Restores ALL nav/buttons/menu (no crashes, no double-binding)
   - Notes buttons = bubble icon (turns orange when notes exist)
   - Notes buttons work on questions + tables + table popups
   - Training tables use Name as bullet label; Opcode tables use Opcode
   - Notes buttons stay in the Notes column (won’t show in first column)
   - Filters column dropdowns stay in Filters column (prevents mis-injection)
   - Table popups include Add Row (+) and keep clean “card” layout
   - Table notes textarea is bigger (popup + page stays consistent)
   - Support Tickets add button works
   - Notes click does NOT scroll / shift the page
   - Reset Page clears related Notes state so old bullets don’t come back
======================================================= */

(() => {
  "use strict";

  /* -----------------------------
     STORAGE KEYS
  ----------------------------- */
  const LS_KEY = "mk_training_checklist_v2";
  const NOTES_KEY = "mk_training_notes_v2";

  /* -----------------------------
     HELPERS
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

  const escapeHTML = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

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
    // Additional trainers (if present)
    const at = $("#additionalTrainersContainer");
    if (at) state.__additionalTrainersHTML = at.innerHTML;

    // Additional POCs (if present)
    const pcs = $$(".additional-poc-card");
    if (pcs.length) state.__additionalPocsHTML = pcs.map((c) => c.outerHTML).join("");

    // Tickets
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
      if ($("#openTicketsContainer") && t.open) $("#openTicketsContainer").innerHTML = t.open;
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

  // ✅ You asked about this: it IS here
  const persistAllDebounced = debounce(() => {
    const state = loadState();
    snapshotTables(state);
    snapshotDynamicBlocks(state);
    snapshotFormControls(state);
    saveState(state);
  }, 250);

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
     RESET PAGE / CLEAR ALL
     - clears Notes state so old bullets don’t come back
  ----------------------------- */
  function loadNotesState() {
    return safeJSONParse(localStorage.getItem(NOTES_KEY), {}) || {};
  }
  function saveNotesState(state) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(state));
  }

  function clearNotesForSection(sectionEl) {
    if (!sectionEl) return;
    const notesState = loadNotesState();

    // Remove any notes blocks that live in this section
    $$("[id^='notes-'], [id^='notes-card-']", sectionEl).forEach((block) => {
      if (block?.id && notesState[block.id]) delete notesState[block.id];
      const ta = $("textarea", block);
      if (ta) ta.value = "";
    });

    saveNotesState(notesState);
  }

  function clearSection(sectionEl) {
    if (!sectionEl) return;

    // Clear non-table/non-ticket controls
    $$("input, select, textarea", sectionEl).forEach((el) => {
      const inTable = !!el.closest("table");
      const inTickets = !!el.closest("#support-tickets");
      const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
      const inAdditionalPoc = !!el.closest(".additional-poc-card");
      if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // Reset tables: keep up to first 3 rows (or 1 if only 1 exists)
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

    // Tickets reset
    if (sectionEl.id === "support-tickets") {
      const open = $("#openTicketsContainer");
      const base = $(".ticket-group[data-base='true']", open);
      if (open && base) open.innerHTML = base.outerHTML;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = "";
    }

    // ✅ Clear notes state for this section (fixes “old bullets come back”)
    clearNotesForSection(sectionEl);

    // Refresh UI
    initPlaceholderStyling();
    persistAllDebounced();
    refreshAllNotesButtons();
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
     ADDITIONAL TRAINERS (+)
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
      clone.dataset.base = "false";

      const inp = $("input[type='text']", clone);
      if (inp) inp.value = "";

      // remove + button from clones
      $$(".add-row", clone).forEach((b) => b.remove());

      container.appendChild(clone);

      if (inp) applyPlaceholderClassToInput(inp);
      persistAllDebounced();
    });
  }

  /* -----------------------------
     ADDITIONAL POC (+)
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

    // ensure notes button is in notes column only
    normalizeNotesCellsInRow(row);
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

  function initTableAddRowButtons() {
    $$(".table-container").forEach((tc) => {
      const footerAdd = $(".table-footer .add-row", tc);
      const table = $("table", tc);
      if (!footerAdd || !table) return;

      if (!bindOnce(footerAdd, "table_add_row")) return;

      footerAdd.addEventListener("click", () => {
        const newRow = cloneLastRow(table);
        if (newRow) {
          bindNotesButtonsWithin(newRow);
          refreshAllNotesButtons();
          persistAllDebounced();
        }
      });
    });
  }

  /* -----------------------------
     NOTES BUTTON (bubble icon)
  ----------------------------- */
  const NOTES_SVG = `
    <svg class="notes-bubble" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-2 1z" />
      <path class="dots" d="M9 11h.01M12 11h.01M15 11h.01" />
    </svg>
  `;

  function ensureBubbleIcon(btn) {
    if (!btn) return;
    if (btn.querySelector("svg.notes-bubble")) return;
    btn.innerHTML = NOTES_SVG;
  }

  function normalizeNotesCellsInRow(tr) {
    if (!tr || tr.tagName !== "TR") return;

    const table = tr.closest("table");
    if (!table) return;

    const ths = $$("thead th", table);
    const notesIdx = ths.findIndex((th) => th.classList.contains("notes-col-head") || th.textContent.trim().toLowerCase() === "notes");
    if (notesIdx < 0) return;

    const tds = Array.from(tr.children);
    // If any notes buttons ended up in a non-notes cell, remove them
    tds.forEach((td, idx) => {
      if (!td) return;
      if (idx !== notesIdx) {
        $$(".notes-icon-btn", td).forEach((b) => b.remove());
      }
    });

    const notesTd = tds[notesIdx];
    if (!notesTd) return;

    notesTd.classList.add("notes-col-cell");

    // Ensure there is a notes button in the notes cell
    let btn = $(".notes-icon-btn", notesTd);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "notes-icon-btn";
      btn.setAttribute("aria-label", "Add note");

      // try to inherit target from any existing button in row/table
      const existing = $(".notes-icon-btn[data-notes-target]", tr.closest("tbody") || table);
      if (existing?.dataset?.notesTarget) btn.dataset.notesTarget = existing.dataset.notesTarget;

      notesTd.appendChild(btn);
    }

    ensureBubbleIcon(btn);
  }

  function normalizeAllTrainingTables() {
    $$("table.training-table tbody tr").forEach((tr) => normalizeNotesCellsInRow(tr));
  }

  /* -----------------------------
     NOTES SYSTEM
     - stores by LABEL (Name/Opcode/Question label)
     - keeps stable order + avoids “old bullets”
  ----------------------------- */
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

      // Training tables: Name is first text input in the row (name field)
      const nameInput = tr.querySelector("td input[type='text']");
      const name = nameInput?.value?.trim();
      return name || "Name";
    }

    const row = btn.closest(".checklist-row");
    const label = row?.querySelector("label")?.textContent?.trim();
    return label ? label.replace(/\s+/g, " ") : "Note";
  }

  function ensureNotesBlock(targetId) {
    const notesState = loadNotesState();
    if (!notesState[targetId]) notesState[targetId] = { order: [], items: {} };
    if (!Array.isArray(notesState[targetId].order)) notesState[targetId].order = [];
    if (!notesState[targetId].items) notesState[targetId].items = {};
    return notesState;
  }

  function ensureNotesItem(targetId, label) {
    const notesState = ensureNotesBlock(targetId);
    const block = notesState[targetId];

    const key = label.trim() || "Note";
    if (!block.items[key]) {
      block.items[key] = { text: "" };
      block.order.push(key);
    }

    saveNotesState(notesState);
  }

  function buildNotesText(targetId) {
    const notesState = loadNotesState();
    const block = notesState[targetId];
    if (!block) return "";

    const parts = [];
    const order = Array.isArray(block.order) ? block.order : Object.keys(block.items || {});
    order.forEach((label) => {
      if (!label) return;
      parts.push(`• ${label}:`);
      const body = (block.items?.[label]?.text || "").trim();
      if (body) parts.push(body);
      parts.push(""); // blank line between bullets
    });

    while (parts.length && parts[parts.length - 1] === "") parts.pop();
    return parts.join("\n");
  }

  function hydrateNotesTextarea(targetId) {
    const blockEl = $("#" + targetId);
    const ta = blockEl?.querySelector?.("textarea");
    if (!ta) return;

    ta.value = buildNotesText(targetId);
    applyPlaceholderClassToTextarea(ta);

    // Make table notes bigger (page + popup clones)
    ta.style.minHeight = ta.style.minHeight || "140px";
    ta.style.height = ta.style.height || "160px";

    persistAllDebounced();
  }

  function setNotesTextForLabel(targetId, label, text) {
    const notesState = ensureNotesBlock(targetId);
    const block = notesState[targetId];
    const key = label.trim() || "Note";

    if (!block.items[key]) {
      block.items[key] = { text: "" };
      block.order.push(key);
    }
    block.items[key].text = text ?? "";

    saveNotesState(notesState);
  }

  function buttonHasNotesForTarget(notesTarget, label) {
    const notesState = loadNotesState();
    const block = notesState?.[notesTarget];
    const key = (label || "").trim();
    const t = block?.items?.[key]?.text || "";
    return t.trim().length > 0;
  }

  function refreshNotesButton(btn, overrideTarget) {
    const notesTarget = overrideTarget || btn.dataset.notesTarget;
    if (!notesTarget) return;

    ensureBubbleIcon(btn);

    const label = getBulletLabel(btn);
    const hasNotes = buttonHasNotesForTarget(notesTarget, label);
    btn.classList.toggle("has-notes", hasNotes);
  }

  function refreshAllNotesButtons() {
    $$(".notes-icon-btn").forEach((btn) => refreshNotesButton(btn));
  }

  function bindNotesButton(btn, options = {}) {
    if (!btn) return;
    ensureBubbleIcon(btn);

    if (!bindOnce(btn, "notes_btn")) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const notesTarget = options.overrideNotesTarget || btn.dataset.notesTarget;
      if (!notesTarget) return;

      const label = getBulletLabel(btn);

      // Ensure exists, hydrate textarea (adds bullet header)
      ensureNotesItem(notesTarget, label);
      hydrateNotesTextarea(notesTarget);

      // ✅ DO NOT scroll / shift page
      // (No scrollIntoView here)

      // Orange state will turn on only when there is text;
      // BUT we still refresh to keep consistent.
      refreshNotesButton(btn, notesTarget);

      persistAllDebounced();
    });
  }

  function bindNotesButtonsWithin(root, opts = {}) {
    $$(".notes-icon-btn", root).forEach((btn) => bindNotesButton(btn, opts));
  }

  /* -----------------------------
     Notes textarea parsing
     - Saves text under the correct label
  ----------------------------- */
  function initNotesTextareaParsing() {
    $$("textarea").forEach((ta) => {
      const block = ta.closest(".section-block");
      const id = block?.id;
      if (!id) return;
      if (!id.startsWith("notes-") && !id.startsWith("notes-card-")) return;

      // Make notes bigger (tables + cards)
      ta.style.minHeight = ta.style.minHeight || "140px";
      ta.style.height = ta.style.height || "160px";

      if (!bindOnce(ta, "notes_parse")) return;

      const parseAndStore = debounce(() => {
        const raw = ta.value || "";
        const lines = raw.split("\n");

        let currentLabel = null;
        let currentLines = [];

        const flush = () => {
          if (!currentLabel) return;
          setNotesTextForLabel(id, currentLabel, currentLines.join("\n").trim());
        };

        // Reset block order based on appearance
        const notesState = ensureNotesBlock(id);
        notesState[id].order = [];
        notesState[id].items = notesState[id].items || {};

        for (const line of lines) {
          const m = line.match(/^•\s(.+):\s*$/);
          if (m) {
            flush();
            currentLabel = m[1].trim();
            currentLines = [];
            if (currentLabel) {
              if (!notesState[id].items[currentLabel]) notesState[id].items[currentLabel] = { text: "" };
              notesState[id].order.push(currentLabel);
            }
          } else if (currentLabel != null) {
            currentLines.push(line);
          }
        }
        flush();

        saveNotesState(notesState);

        // Refresh button orange states
        refreshAllNotesButtons();
        persistAllDebounced();
      }, 300);

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
     AUTO-ADD NOTES BUTTONS TO 2x2 CARDS
     - uses bubble icon, targets notes block in same row
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

      // left (questions)
      const questionBlock = blocks.find((b) => b !== notesBlock);
      if (!questionBlock) return;

      $$(".checklist-row", questionBlock).forEach((row) => {
        // skip table rows / weird nested
        if (row.closest("table")) return;

        if (row.querySelector(".notes-icon-btn")) {
          const existing = row.querySelector(".notes-icon-btn");
          existing.dataset.notesTarget = notesId;
          ensureBubbleIcon(existing);
          return;
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "notes-icon-btn";
        btn.dataset.notesTarget = notesId;
        btn.setAttribute("aria-label", "Add note");
        btn.innerHTML = NOTES_SVG;

        row.appendChild(btn);
      });
    });

    bindNotesButtonsWithin(document);
  }

  /* -----------------------------
     TABLE POPUP MODAL
     - clean layout, includes Add Row (+)
     - notes buttons work inside popup too
  ----------------------------- */
  let modalEl = null;

  // ✅ You asked to keep this function / let modalEl=null
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
          display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
          <div id="mkTableModalTitle" style="font-weight:800;font-size:22px;"></div>
          <div style="display:flex;gap:10px;">
            <button type="button" id="mkTableModalExpand" title="Expand" style="
              width:40px;height:40px;border-radius:12px;border:1px solid rgba(0,0,0,0.12);
              background:#fff;cursor:pointer;font-size:18px;">↗</button>
            <button type="button" id="mkTableModalClose" title="Close" style="
              width:40px;height:40px;border-radius:12px;border:1px solid rgba(0,0,0,0.12);
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
    const btn = $(".notes-icon-btn[data-notes-target]", tableContainer);
    const id = btn?.dataset?.notesTarget;
    if (id && $("#" + id)) return $("#" + id);

    const section = tableContainer.closest(".page-section");
    if (!section) return null;
    const all = $$("[id^='notes-'].section-block, [id^='notes-card-'].section-block", section);
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

    // Table card
    const tableCard = document.createElement("div");
    tableCard.className = "section-block";
    tableCard.innerHTML = `<h2>${escapeHTML(header)}</h2>`;

    const tableClone = tableContainer.cloneNode(true);

    // constrain scroll inside popup
    const scrollWrap = $(".scroll-wrapper", tableClone);
    if (scrollWrap) {
      scrollWrap.style.maxHeight = "42vh";
      scrollWrap.style.overflow = "auto";
    }

    tableCard.appendChild(tableClone);

    // Notes card
    const notesBlock = findRelatedNotesBlock(tableContainer);
    const notesClone = notesBlock ? notesBlock.cloneNode(true) : null;

    // Bigger notes in popup
    if (notesClone) {
      const ta = $("textarea", notesClone);
      if (ta) {
        ta.style.minHeight = "170px";
        ta.style.height = "190px";
      }
    }

    // 2-way binding notes textarea
    if (notesBlock && notesClone) {
      const realTA = $("textarea", notesBlock);
      const modalTA = $("textarea", notesClone);
      if (realTA && modalTA) {
        modalTA.value = realTA.value;

        modalTA.addEventListener("input", () => {
          realTA.value = modalTA.value;
          applyPlaceholderClassToTextarea(realTA);

          // parse + store for button states
          // (we reuse parsing by triggering change)
          realTA.dispatchEvent(new Event("input", { bubbles: true }));
          refreshAllNotesButtons();
          persistAllDebounced();
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

    // Notes buttons in popup should target real notes block id
    const realNotesId = notesBlock?.id;
    bindNotesButtonsWithin(tableCard, { overrideNotesTarget: realNotesId, fromModal: true });

    // Normalize notes column in popup rows
    $$("tbody tr", tableCard).forEach((tr) => normalizeNotesCellsInRow(tr));
    bindNotesButtonsWithin(tableCard, { overrideNotesTarget: realNotesId, fromModal: true });

    refreshAllNotesButtons();

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

    const addBtn = $(".add-ticket-btn", base || openContainer);
    if (addBtn && bindOnce(addBtn, "add_ticket")) {
      addBtn.addEventListener("click", () => {
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

        // clear base card inputs for next ticket
        $$("input, textarea", baseGroup).forEach((el) => (el.value = ""));

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
     BOOT
  ----------------------------- */
  function boot() {
    // Restore first so bindings are attached to restored DOM
    restoreAll();

    initNav();
    initPlaceholderStyling();
    initAutosave();
    initResetButtons();
    initOnsiteDates();

    initAdditionalTrainers();
    initAdditionalPOCs();

    // Normalize notes column on existing rows before binding notes buttons
    normalizeAllTrainingTables();

    // Table add row + expand popup
    initTableAddRowButtons();
    initTableExpandButtons();

    // Notes buttons in tables + questions
    bindNotesButtonsWithin(document);

    // Auto-add notes buttons to 2x2 cards
    injectNotesButtonsIntoTwoColCards();

    // Notes parsing (turns orange when text exists)
    initNotesTextareaParsing();

    // Tickets
    initSupportTickets();

    // Final refresh
    refreshAllNotesButtons();
    initPlaceholderStyling();
  }

  try {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  } catch (err) {
    console.error("mk checklist boot error:", err);
    // If something goes wrong, at least keep the app usable
  }
})();
