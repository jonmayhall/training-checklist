/* =======================================================
   myKaarma Interactive Training Checklist — script.js (FULL)
   ✅ RESTORES ALL BUTTONS + FIXES NOTES + POPUPS
   - Nav/menu buttons work
   - Reset page + Clear all work
   - Autosave/restore works
   - Add row (+) tables works (no double add)
   - Support tickets add/move works
   - ✅ Notes bubbles everywhere (questions + tables + popups)
   - ✅ Bubble turns ORANGE when notes exist
   - ✅ Training tables: bullet label = Name
   - ✅ Opcode tables: bullet label = Opcode
   - ✅ Table popups include Add Row button (adds to real table + rerenders popup)
   - ✅ Uses delegated notes click handler so it still works after restore/clone
======================================================= */

(() => {
  "use strict";

  /* -----------------------------
     KEYS + HELPERS
  ----------------------------- */
  const LS_KEY = "mk_training_checklist_v2";
  const NOTES_KEY = "mk_training_notes_v2";

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
    // do not bindOnce here; we want to re-run styling on restore
    $$("select").forEach(applyPlaceholderClassToSelect);
    $$("input").forEach(applyPlaceholderClassToInput);
    $$("textarea").forEach(applyPlaceholderClassToTextarea);

    if (!bindOnce(document.body, "placeholder_events")) return;

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
     NAV (menu buttons)
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
     RESET PAGE / CLEAR ALL
  ----------------------------- */
  function clearSection(sectionEl) {
    if (!sectionEl) return;

    // clear non-table, non-dynamic
    $$("input, select, textarea", sectionEl).forEach((el) => {
      const inTable = !!el.closest("table");
      const inTickets = !!el.closest("#support-tickets");
      const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
      const inAdditionalPoc = !!el.closest(".additional-poc-card");
      if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // tables keep first 1–3 rows
    $$(".table-container", sectionEl).forEach((tc) => {
      const table = $("table", tc);
      const tbody = table?.tBodies?.[0];
      if (!tbody) return;

      const rows = Array.from(tbody.rows);
      const keep = Math.max(1, Math.min(3, rows.length));
      rows.forEach((r, idx) => {
        if (idx >= keep) r.remove();
        else {
          $$("input, select, textarea", r).forEach((el) => {
            if (el.type === "checkbox") el.checked = false;
            else el.value = "";
          });
        }
      });
    });

    // Support tickets reset
    if (sectionEl.id === "support-tickets") {
      const open = $("#openTicketsContainer");
      const base = $(".ticket-group[data-base='true']", open);
      if (open && base) open.innerHTML = base.outerHTML;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = "";
    }

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
          persistAllDebounced();
          refreshAllNotesButtons();
        }
      });
    });
  }

  /* -----------------------------
     NOTES STATE + ORANGE BUBBLES
  ----------------------------- */
  function loadNotesState() { return safeJSONParse(localStorage.getItem(NOTES_KEY), {}) || {}; }
  function saveNotesState(state) { localStorage.setItem(NOTES_KEY, JSON.stringify(state)); }

  function setNotesButtonVisual(btn, filled) {
    if (!btn) return;
    btn.dataset.filled = filled ? "true" : "false";
    btn.classList.toggle("notes-filled", !!filled);

    const icon = btn.querySelector(".notes-icon");
    if (filled) {
      btn.style.borderColor = "#f57c00";
      btn.style.background = "rgba(245, 124, 0, 0.14)";
      if (icon) icon.style.color = "#f57c00";
    } else {
      btn.style.borderColor = "";
      btn.style.background = "";
      if (icon) icon.style.color = "";
    }
  }

  function makeBubbleButton(notesTargetId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "notes-icon-btn notes-bubble-btn";
    btn.dataset.notesTarget = notesTargetId;
    btn.setAttribute("aria-label", "Open Notes");
    btn.innerHTML = `<span class="notes-icon" aria-hidden="true">💬</span>`;
    setNotesButtonVisual(btn, false);
    return btn;
  }

  function getRowSignatureIndex(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      const tbody = tr.parentElement;
      const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
      const idx = rows.indexOf(tr);
      return idx >= 0 ? idx : 9999;
    }
    const sec = btn.closest(".page-section") || document;
    const all = $$(".notes-icon-btn", sec).filter((b) => !b.closest("table"));
    const idx = all.indexOf(btn);
    return idx >= 0 ? idx : 9999;
  }

  function isOpcodeTableRow(tr) {
    const table = tr?.closest?.("table");
    if (!table) return false;
    const headers = $$("thead th", table).map((th) => th.textContent.trim().toLowerCase());
    return headers.includes("opcode");
  }

  function getBulletLabelForButton(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      if (isOpcodeTableRow(tr)) {
        const opcodeInput = tr.querySelector("td:nth-child(2) input[type='text']");
        return opcodeInput?.value?.trim() || "Opcode";
      }
      const nameInput = tr.querySelector("td input[type='text']");
      return nameInput?.value?.trim() || "Name";
    }

    const row = btn.closest(".checklist-row");
    const label = row?.querySelector("label")?.textContent?.trim();
    return label ? label.replace(/\s+/g, " ") : "Note";
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
    entries.forEach(({ v }) => {
      parts.push(`• ${v.label}:`);
      const body = (v.text || "").trim();
      if (body) parts.push(body);
      parts.push("");
    });

    while (parts.length && parts[parts.length - 1] === "") parts.pop();
    return parts.join("\n");
  }

  function hydrateNotesTextarea(targetId) {
    const ta = $("#" + targetId)?.querySelector?.("textarea");
    if (!ta) return;
    ta.value = buildNotesText(targetId);
    applyPlaceholderClassToTextarea(ta);
  }

  function bulletHasNotes(targetId, sigIndex) {
    const notesState = loadNotesState();
    const item = notesState?.[targetId]?.items?.[String(sigIndex)];
    return !!(item && (item.text || "").trim().length);
  }

  function refreshNotesButtonsForScope(root) {
    $$(".notes-icon-btn", root).forEach((btn) => {
      const targetId = btn.dataset.notesTarget;
      if (!targetId) return;
      const sigIndex = getRowSignatureIndex(btn);
      setNotesButtonVisual(btn, bulletHasNotes(targetId, sigIndex));
    });
  }

  function refreshAllNotesButtons() {
    refreshNotesButtonsForScope(document);
    if (modalEl && modalEl.style.display === "block") refreshNotesButtonsForScope(modalEl);
  }

  const parseAndStoreNotesFromTextarea = debounce((ta) => {
    const block = ta.closest(".section-block");
    const id = block?.id;
    if (!id) return;

    const raw = ta.value || "";
    const lines = raw.split("\n");
    const parsed = [];
    let current = null;

    for (const line of lines) {
      const m = line.match(/^•\s(.+):\s*$/);
      if (m) {
        if (current) parsed.push(current);
        current = { label: m[1], textLines: [] };
      } else if (current) {
        current.textLines.push(line);
      }
    }
    if (current) parsed.push(current);

    const notesState = loadNotesState();
    notesState[id] = notesState[id] || { items: {} };
    const existing = notesState[id].items || {};

    const labelToKey = new Map();
    Object.entries(existing).forEach(([k, v]) => { if (v?.label) labelToKey.set(v.label, k); });

    let maxKey = Math.max(-1, ...Object.keys(existing).map((k) => Number(k)).filter((n) => !Number.isNaN(n)));

    parsed.forEach((it) => {
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

  function initNotesTextareaParsing() {
    $$("textarea").forEach((ta) => {
      const block = ta.closest(".section-block");
      const id = block?.id;
      if (!id) return;
      if (!id.startsWith("notes-") && !id.startsWith("notes-auto-") && !id.startsWith("notes-card-")) return;
      if (!bindOnce(ta, "notes_parse")) return;

      ta.addEventListener("input", () => parseAndStoreNotesFromTextarea(ta));
      ta.addEventListener("change", () => parseAndStoreNotesFromTextarea(ta));
    });

    const notesState = loadNotesState();
    Object.keys(notesState).forEach((id) => {
      if ($("#" + id)?.querySelector?.("textarea")) hydrateNotesTextarea(id);
    });
  }

  function findNotesBlockInSection(sectionEl) {
    const explicit = $$("[id^='notes-'].section-block", sectionEl).find((b) => b.querySelector("textarea"));
    if (explicit) return explicit;

    return $$(".section-block", sectionEl).find((b) => {
      const h2 = b.querySelector("h2")?.textContent?.trim().toLowerCase() || "";
      return h2.startsWith("notes") && b.querySelector("textarea");
    }) || null;
  }

  function ensureElementId(el, prefix = "notes-auto") {
    if (el.id) return el.id;
    el.id = `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    return el.id;
  }

  // ✅ adds bubbles to the non-table questions across the right pages
  function injectNotesBubblesAcrossPages() {
    $$(".page-section").forEach((sec) => {
      const notesBlock = findNotesBlockInSection(sec);
      if (!notesBlock) return;

      const notesId = ensureElementId(notesBlock, "notes-auto");

      $$(".checklist-row", sec).forEach((row) => {
        if (row.closest("table")) return;
        if (row.closest(".section-block") === notesBlock) return;
        const hasControl = !!row.querySelector("input, select, textarea");
        if (!hasControl) return;
        if (row.querySelector(".notes-icon-btn")) return;

        row.appendChild(makeBubbleButton(notesId));
      });
    });
  }

  // ✅ KEY FIX: delegated handler so notes buttons still work after restore/clone/popup
  function initDelegatedNotesHandlers() {
    if (!bindOnce(document.body, "delegated_notes")) return;

    document.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".notes-icon-btn");
      if (!btn) return;

      const notesTarget = btn.dataset.notesTarget;
      if (!notesTarget) return;

      const sigIndex = getRowSignatureIndex(btn);
      const label = getBulletLabelForButton(btn);

      ensureNotesItem(notesTarget, sigIndex, label);
      hydrateNotesTextarea(notesTarget);

      // scroll only if not modal
      if (!btn.closest("#mkTableModal")) {
        const block = $("#" + notesTarget);
        if (block) block.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      persistAllDebounced();
      refreshAllNotesButtons();
    });

    // if user changes name/opcode after notes exist, keep bullet header synced
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!t || t.tagName !== "INPUT" || t.type !== "text") return;
      const tr = t.closest("tr");
      if (!tr) return;

      const btn = tr.querySelector(".notes-icon-btn[data-notes-target]");
      if (!btn) return;

      const targetId = btn.dataset.notesTarget;
      if (!targetId) return;

      const sigIndex = getRowSignatureIndex(btn);
      const label = getBulletLabelForButton(btn);

      const notesState = loadNotesState();
      const item = notesState?.[targetId]?.items?.[String(sigIndex)];
      if (item) {
        item.label = label;
        saveNotesState(notesState);
        hydrateNotesTextarea(targetId);
        refreshAllNotesButtons();
      }
    });
  }

  /* -----------------------------
     TABLE POPUP MODAL (KEEP YOUR PATTERN)
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
    modalEl.style.boxSizing = "border-box";

    modalEl.innerHTML = `
      <div style="width:100%; min-height: calc(100vh - 36px); display:flex; align-items:center; justify-content:center;">
        <div id="mkTableModalPanel" style="
          width: min(1400px, 96vw);
          max-height: 90vh;
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 18px 60px rgba(0,0,0,.35);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        ">
          <div style="padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,0.08);
                      display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div id="mkTableModalTitle" style="font-weight:800; font-size:20px;"></div>
            <div style="display:flex; gap:10px;">
              <button type="button" id="mkTableModalExpand" title="Expand" style="
                width:40px;height:40px;border-radius:12px;
                border:1px solid rgba(0,0,0,0.12);
                background:#fff;cursor:pointer;font-size:18px;">⤢</button>
              <button type="button" id="mkTableModalClose" title="Close" style="
                width:40px;height:40px;border-radius:12px;
                border:1px solid rgba(0,0,0,0.12);
                background:#fff;cursor:pointer;font-size:22px;line-height:1;">×</button>
            </div>
          </div>
          <div id="mkTableModalBody" style="padding:16px; overflow:auto; display:flex; flex-direction:column; gap:16px;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    $("#mkTableModalClose", modalEl).addEventListener("click", closeModal);
    $("#mkTableModalExpand", modalEl).addEventListener("click", () => {
      const panel = $("#mkTableModalPanel", modalEl);
      if (!panel) return;
      const full = panel.dataset.full === "true";
      panel.dataset.full = (!full).toString();
      panel.style.width = full ? "min(1400px, 96vw)" : "98vw";
      panel.style.maxHeight = full ? "90vh" : "95vh";
    });

    modalEl.addEventListener("click", (e) => { if (e.target === modalEl) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalEl?.style?.display === "block") closeModal();
    });

    return modalEl;
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.style.display = "none";
    const body = $("#mkTableModalBody", modalEl);
    if (body) body.innerHTML = "";
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

  function renderTablePopup(tableContainer) {
    const modal = ensureModal();
    const body = $("#mkTableModalBody", modal);
    const titleEl = $("#mkTableModalTitle", modal);
    if (!body || !titleEl) return;

    const header =
      tableContainer.closest(".section")?.querySelector(".section-header span")?.textContent?.trim() ||
      tableContainer.closest(".section")?.querySelector(".section-header")?.textContent?.trim() ||
      tableContainer.closest(".page-section")?.querySelector("h1")?.textContent?.trim() ||
      "Table";

    titleEl.textContent = header;

    const tableCard = document.createElement("div");
    tableCard.className = "section-block";
    tableCard.innerHTML = `<h2>${header}</h2>`;

    const tableClone = tableContainer.cloneNode(true);

    // remove expand button from inside clone
    $$(".expand-table-btn", tableClone).forEach((el) => el.remove());

    // tie popup row-note buttons to the real notes id
    const notesBlock = findRelatedNotesBlock(tableContainer);
    const realNotesId = notesBlock?.id;
    if (realNotesId) {
      $$(".notes-icon-btn", tableClone).forEach((b) => { b.dataset.notesTarget = realNotesId; });
    }

    // constrain scroll
    const scrollWrap = $(".scroll-wrapper", tableClone);
    if (scrollWrap) {
      scrollWrap.style.maxHeight = "44vh";
      scrollWrap.style.overflowY = "auto";
      scrollWrap.style.overflowX = "auto";
    }

    // ✅ Add Row in popup adds to REAL table then rerenders popup
    const modalAdd = $(".table-footer .add-row", tableClone);
    if (modalAdd) {
      modalAdd.textContent = "+";
      modalAdd.title = "Add Row";
      // do NOT bindOnce across rerenders by dataset key unique to this instance
      if (!modalAdd.dataset.modalAddBound) {
        modalAdd.dataset.modalAddBound = "true";
        modalAdd.addEventListener("click", () => {
          const realTable = $("table", tableContainer);
          if (!realTable) return;
          const newRow = cloneLastRow(realTable);
          if (newRow) {
            persistAllDebounced();
            refreshAllNotesButtons();
            renderTablePopup(tableContainer);
          }
        });
      }
    }

    tableCard.appendChild(tableClone);

    // notes card clone + sync textarea
    const notesClone = notesBlock ? notesBlock.cloneNode(true) : null;
    if (notesClone && notesBlock) {
      const realTA = $("textarea", notesBlock);
      const modalTA = $("textarea", notesClone);
      if (realTA && modalTA) {
        modalTA.value = realTA.value;
        if (!modalTA.dataset.modalSyncBound) {
          modalTA.dataset.modalSyncBound = "true";
          modalTA.addEventListener("input", () => {
            realTA.value = modalTA.value;
            parseAndStoreNotesFromTextarea(realTA);
          });
        }
      }
      // kill horizontal scroll in modal notes
      const ta = $("textarea", notesClone);
      if (ta) {
        ta.style.width = "100%";
        ta.style.maxWidth = "100%";
        ta.style.boxSizing = "border-box";
        ta.style.overflowX = "hidden";
        ta.style.whiteSpace = "pre-wrap";
        ta.style.wordBreak = "break-word";
      }
    }

    body.innerHTML = "";
    body.appendChild(tableCard);
    if (notesClone) body.appendChild(notesClone);

    refreshNotesButtonsForScope(tableCard);
  }

  function openTablePopup(tableContainer) {
    const modal = ensureModal();
    renderTablePopup(tableContainer);
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
        expandBtn.textContent = "⤢";
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
    restoreAll();

    initNav();                 // ✅ menu buttons back
    initPlaceholderStyling();
    initAutosave();
    initResetButtons();
    initOnsiteDates();

    initTableAddRowButtons();
    initTableExpandButtons();

    // Notes
    injectNotesBubblesAcrossPages();   // ✅ bubbles on question rows again
    initDelegatedNotesHandlers();      // ✅ makes notes work after restore/clone/popup
    initNotesTextareaParsing();

    initSupportTickets();

    // final
    initPlaceholderStyling();
    refreshAllNotesButtons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
