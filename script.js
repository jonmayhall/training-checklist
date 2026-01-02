/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (SINGLE SCRIPT / HARDENED / DROP-IN) — EXEC SUMMARY BUILD

   ✅ Executive Summary Generator (Training Summary page)
      - Button at top: #generateExecSummaryBtn
      - Pulls from ALL pages (notes + key fields + tickets + tables)
      - Produces: Outcome helper text, Key Wins, Risks, Next Steps, Narrative
      - Editable outputs

   ✅ Training end date auto sets: onsite date + 2 days
      - Robust selectors
      - Won’t overwrite if user manually edits end date

   ✅ Service Advisors table shows 3 starter rows (robust)
      - Runs on init + nav swap

   ✅ Expand buttons remain (tables + notes)
      - Guardrails: won’t add expand to support ticket summary textarea

======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v6";
  const AUTO_ID_ATTR = "data-mk-id";
  const AUTO_ROW_ATTR = "data-mk-row";
  const AUTO_CARD_ATTR = "data-mk-card";

  const DEBUG = false;
  const log = (...args) => (DEBUG ? console.log("[mk]", ...args) : void 0);

  /* =======================
     HELPERS
  ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const uid = (() => {
    let n = 0;
    return (prefix = "mk") =>
      `${prefix}-${Date.now()}-${(n++).toString(16)}-${Math.random()
        .toString(16)
        .slice(2)}`;
  })();

  const isEl = (x) => x && x.nodeType === 1;

  const getSection = (el) =>
    el?.closest?.(".page-section") || el?.closest?.("section") || null;

  const isFormField = (el) =>
    isEl(el) &&
    (el.matches("input, select, textarea") ||
      el.matches("[contenteditable='true']"));

  const ensureId = (el) => {
    if (!isEl(el)) return null;
    if (!el.getAttribute(AUTO_ID_ATTR)) el.setAttribute(AUTO_ID_ATTR, uid("fld"));
    return el.getAttribute(AUTO_ID_ATTR);
  };

  const getFieldValue = (el) => {
    if (!isFormField(el)) return null;
    if (el.matches("input[type='checkbox']")) return !!el.checked;
    if (el.matches("input[type='radio']")) return el.checked ? el.value : null;
    if (el.matches("input, select, textarea")) return el.value;
    if (el.matches("[contenteditable='true']")) return el.textContent || "";
    return null;
  };

  const setFieldValue = (el, val) => {
    if (!isFormField(el)) return;
    if (el.matches("input[type='checkbox']")) {
      el.checked = !!val;
      return;
    }
    if (el.matches("input[type='radio']")) {
      el.checked = el.value === val;
      return;
    }
    if (el.matches("input, select, textarea")) {
      el.value = val ?? "";
      return;
    }
    if (el.matches("[contenteditable='true']")) {
      el.textContent = val ?? "";
      return;
    }
  };

  const readState = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const writeState = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save state:", e);
    }
  };

  const saveField = (el) => {
    if (!isFormField(el)) return;
    ensureId(el);
    const id = el.getAttribute(AUTO_ID_ATTR);
    const state = readState();
    state.__fields = state.__fields || {};
    state.__fields[id] = getFieldValue(el);
    writeState(state);
  };

  const restoreAllFields = () => {
    const state = readState();
    const fieldsState = state.__fields || {};
    const fields = $$(`[${AUTO_ID_ATTR}]`);
    fields.forEach((el) => {
      const id = el.getAttribute(AUTO_ID_ATTR);
      if (!(id in fieldsState)) return;
      setFieldValue(el, fieldsState[id]);
    });
  };

  const assignIdsToAllFields = (root = document) => {
    const fields = $$("input, select, textarea, [contenteditable='true']", root);
    fields.forEach((el) => ensureId(el));
  };

  const triggerInputChange = (el) => {
    if (!el) return;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setGhostStyles = (root = document) => {
    root.querySelectorAll("select").forEach((sel) => {
      const first = sel.options?.[0];
      const isGhost =
        !sel.value ||
        (first && first.dataset?.ghost === "true" && sel.value === "");
      sel.classList.toggle("is-placeholder", !!isGhost);
    });

    root.querySelectorAll('input[type="date"]').forEach((d) => {
      d.classList.toggle("is-placeholder", !d.value);
    });
  };

  const preserveScroll = (fn) => {
    const x = window.scrollX || 0;
    const y = window.scrollY || 0;
    fn();
    requestAnimationFrame(() => window.scrollTo(x, y));
  };

  /* =======================
     OS-STYLE POPUPS (OK + OK/CANCEL)
  ======================= */
  const mkPopup = (() => {
    const STYLE_ID = "mk-popup-style-v1";
    let active = null;

    const ensureStyles = () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-pop-backdrop{
          position:fixed; inset:0; background:rgba(0,0,0,.35);
          z-index:100000; display:flex; align-items:flex-start; justify-content:center;
          padding-top:110px;
        }
        .mk-pop-box{
          width:min(520px, calc(100vw - 28px));
          background:#fff; border:1px solid rgba(0,0,0,.10);
          border-radius:18px; box-shadow:0 18px 50px rgba(0,0,0,.25);
          overflow:hidden;
        }
        .mk-pop-head{
          background:#EF6D22; color:#fff;
          padding:10px 16px;
          font-weight:900; letter-spacing:.2px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .mk-pop-title{ font-size:15px; }
        .mk-pop-body{ padding:14px 16px 8px; color:#111827; font-size:13px; line-height:1.45; }
        .mk-pop-actions{
          padding:12px 16px 14px;
          display:flex; justify-content:flex-end; gap:10px;
        }
        .mk-pop-btn{
          border:none; cursor:pointer;
          height:34px; padding:0 16px;
          border-radius:999px; font-weight:900; font-size:12px;
          letter-spacing:.08em; text-transform:uppercase;
          display:inline-flex; align-items:center; justify-content:center;
        }
        .mk-pop-btn--ok{ background:#EF6D22; color:#fff; box-shadow:0 3px 10px rgba(239,109,34,.35); }
        .mk-pop-btn--ok:hover{ background:#ff8b42; }
        .mk-pop-btn--cancel{
          background:#f3f4f6; color:#111827; border:1px solid rgba(0,0,0,.10);
        }
        .mk-pop-btn--cancel:hover{ background:#e5e7eb; }
      `;
      document.head.appendChild(s);
    };

    const close = () => {
      if (!active) return;
      active.remove();
      active = null;
      document.removeEventListener("keydown", onKey);
    };

    const onKey = (e) => {
      if (!active) return;
      if (e.key === "Escape") close();
    };

    const open = ({
      title = "Notice",
      message = "",
      okText = "OK",
      cancelText = "",
      onOk,
      onCancel
    } = {}) => {
      ensureStyles();
      close();

      const back = document.createElement("div");
      back.className = "mk-pop-backdrop";

      const box = document.createElement("div");
      box.className = "mk-pop-box";

      const head = document.createElement("div");
      head.className = "mk-pop-head";

      const t = document.createElement("div");
      t.className = "mk-pop-title";
      t.textContent = title;

      head.appendChild(t);

      const body = document.createElement("div");
      body.className = "mk-pop-body";
      body.textContent = message;

      const actions = document.createElement("div");
      actions.className = "mk-pop-actions";

      if (cancelText) {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "mk-pop-btn mk-pop-btn--cancel";
        cancel.textContent = cancelText;
        cancel.addEventListener("click", () => {
          close();
          if (typeof onCancel === "function") onCancel();
        });
        actions.appendChild(cancel);
      }

      const ok = document.createElement("button");
      ok.type = "button";
      ok.className = "mk-pop-btn mk-pop-btn--ok";
      ok.textContent = okText;
      ok.addEventListener("click", () => {
        close();
        if (typeof onOk === "function") onOk();
      });
      actions.appendChild(ok);

      box.appendChild(head);
      box.appendChild(body);
      box.appendChild(actions);
      back.appendChild(box);

      back.addEventListener("click", (e) => {
        if (e.target === back) close();
      });

      document.body.appendChild(back);
      active = back;

      document.addEventListener("keydown", onKey);
      ok.focus();
    };

    const ok = (message, opts = {}) =>
      open({ title: opts.title || "Notice", message, okText: opts.okText || "OK" });

    const confirm = (message, opts = {}) =>
      open({
        title: opts.title || "Confirm",
        message,
        okText: opts.okText || "OK",
        cancelText: opts.cancelText || "Cancel",
        onOk: opts.onOk,
        onCancel: opts.onCancel,
      });

    return { ok, confirm, close };
  })();

  try { window.mkPopup = mkPopup; } catch {}

  /* =======================
     CLONE STATE (for restore)
  ======================= */
  const cloneState = {
    get() {
      const state = readState();
      state.__clones = state.__clones || {
        trainers: [],
        pocs: [],
        tables: {},
        tickets: [],
      };
      return state.__clones;
    },
    set(next) {
      const state = readState();
      state.__clones = next;
      writeState(state);
    },
    clearAll() {
      const state = readState();
      state.__clones = { trainers: [], pocs: [], tables: {}, tickets: [] };
      writeState(state);
    },
  };

  /* =======================
     NAV
  ======================= */
  const setActiveSection = (targetId) => {
    if (!targetId) return;

    const allSections = $$(".page-section");
    const target = document.getElementById(targetId);
    if (!target) return;

    allSections.forEach((s) => s.classList.remove("active"));
    target.classList.add("active");

    $$(".nav-btn").forEach((b) => b.classList.remove("active"));
    const activeBtn = $(`.nav-btn[data-target="${CSS.escape(targetId)}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    const state = readState();
    state.__activeSection = targetId;
    writeState(state);

    // after swap, ensure 3 starter rows + expand buttons
    setTimeout(() => {
      seedStarterRowsToThree();
      ensureTableExpandButtons();
      ensureNotesExpandButtons();
    }, 0);

    try {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      target.scrollIntoView(true);
    }
  };

  const initNav = () => {
    const state = readState();
    const remembered = state.__activeSection;
    const alreadyActive = $(".page-section.active")?.id;
    const first = $$(".page-section")[0]?.id;
    setActiveSection(alreadyActive || remembered || first);
  };

  /* =======================
     CLEAR ALL + RESET PAGE
  ======================= */
  const removeDynamicClonesIn = (root = document) => {
    const trainerContainer = $("#additionalTrainersContainer", root);
    if (trainerContainer) trainerContainer.innerHTML = "";

    $$(".additional-poc-card", root).forEach((card) => {
      if (card.getAttribute("data-base") === "true") return;
      card.remove();
    });

    $$("table.training-table tbody", root).forEach((tb) => {
      $$(`tr[${AUTO_ROW_ATTR}="cloned"]`, tb).forEach((tr) => tr.remove());
    });

    $$(".ticket-group", root).forEach((g) => {
      if (g.getAttribute("data-base") === "true") return;
      g.remove();
    });
  };

  const clearFieldsIn = (root = document) => {
    root.querySelectorAll("input").forEach((inp) => {
      const type = (inp.type || "").toLowerCase();
      if (["button", "submit", "reset", "hidden"].includes(type)) return;
      if (type === "checkbox" || type === "radio") inp.checked = false;
      else inp.value = "";
      triggerInputChange(inp);
    });

    root.querySelectorAll("textarea").forEach((ta) => {
      ta.value = "";
      triggerInputChange(ta);
    });

    root.querySelectorAll("select").forEach((sel) => {
      sel.selectedIndex = 0;
      triggerInputChange(sel);
    });

    root.querySelectorAll("[contenteditable='true']").forEach((ce) => {
      ce.textContent = "";
      triggerInputChange(ce);
    });

    setGhostStyles(root);
  };

  const clearAll = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    removeDynamicClonesIn(document);
    clearFieldsIn(document);

    const map = $("#dealershipMapFrame");
    if (map) map.src = "https://www.google.com/maps?q=United%20States&z=4&output=embed";

    const disp = $("#dealershipNameDisplay");
    if (disp) disp.textContent = "";

    cloneState.clearAll();
    log("Clear All complete");
  };

  const clearSection = (sectionEl) => {
    if (!sectionEl) return;

    const state = readState();
    state.__fields = state.__fields || {};
    $$(`[${AUTO_ID_ATTR}]`, sectionEl).forEach((el) => {
      const id = el.getAttribute(AUTO_ID_ATTR);
      delete state.__fields[id];
    });

    // clear clone state buckets if needed
    if (sectionEl.id === "trainers-deployment") {
      const clones = cloneState.get();
      clones.trainers = [];
      cloneState.set(clones);
    }
    if (sectionEl.id === "dealership-info") {
      const clones = cloneState.get();
      clones.pocs = [];
      cloneState.set(clones);

      const map = $("#dealershipMapFrame", sectionEl);
      if (map) map.src = "https://www.google.com/maps?q=United%20States&z=4&output=embed";
    }
    if ($("table.training-table", sectionEl)) {
      const clones = cloneState.get();
      clones.tables = {};
      cloneState.set(clones);
    }
    if ($(".ticket-group", sectionEl)) {
      const clones = cloneState.get();
      clones.tickets = [];
      cloneState.set(clones);
    }

    writeState(state);

    removeDynamicClonesIn(sectionEl);
    clearFieldsIn(sectionEl);

    // re-seed 3 starter rows after reset
    setTimeout(() => seedStarterRowsToThree(), 0);

    log("Cleared section:", sectionEl.id);
  };

  /* =======================
     TABLES: ADD ROW + PERSIST/RESTORE
  ======================= */
  const getTableKey = (table) =>
    table?.getAttribute("data-table-key") ||
    table?.id ||
    `table-${$$("table.training-table").indexOf(table)}`;

  const clearRowFields = (tr) => {
    $$("input, select, textarea, [contenteditable='true']", tr).forEach((el) => {
      if (el.matches("input[type='checkbox'], input[type='radio']")) {
        el.checked = false;
      } else if (el.matches("[contenteditable='true']")) {
        el.textContent = "";
      } else {
        el.value = "";
      }
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      saveField(el);
      triggerInputChange(el);
    });
  };

  const extractRowValues = (tr) => {
    const fields = $$("input, select, textarea, [contenteditable='true']", tr);
    if (!fields.length) return $$("td", tr).map((td) => (td.textContent || "").trim());
    return fields.map((el) => getFieldValue(el));
  };

  const applyRowValues = (tr, values) => {
    const fields = $$("input, select, textarea, [contenteditable='true']", tr);
    if (!fields.length) return;
    fields.forEach((el, i) => {
      setFieldValue(el, Array.isArray(values) ? values[i] : "");
      ensureId(el);
      saveField(el);
      triggerInputChange(el);
    });
  };

  const persistTable = (table) => {
    const key = getTableKey(table);
    const clones = cloneState.get();
    const tbody = $("tbody", table);
    if (!tbody) return;
    const clonedRows = $$(`tr[${AUTO_ROW_ATTR}="cloned"]`, tbody);
    clones.tables[key] = clonedRows.map((r) => extractRowValues(r));
    cloneState.set(clones);
  };

  const cloneTableRow = (btn) => {
    const footer = btn.closest(".table-footer");
    const table =
      footer?.closest(".section")?.querySelector("table.training-table") ||
      footer?.closest(".section-block")?.querySelector("table.training-table") ||
      footer?.parentElement?.querySelector("table.training-table") ||
      footer?.closest(".table-container")?.querySelector("table.training-table") ||
      footer?.closest("table.training-table");
    if (!table) return;

    const tbody = $("tbody", table);
    if (!tbody) return;

    const baseRow = tbody.querySelector('tr[data-base="true"]') || tbody.querySelector("tr");
    if (!baseRow) return;

    const clone = baseRow.cloneNode(true);
    clone.setAttribute(AUTO_ROW_ATTR, "cloned");
    clearRowFields(clone);

    tbody.appendChild(clone);
    persistTable(table);

    const first = $("input, textarea, select, [contenteditable='true']", clone);
    if (first) first.focus();
  };

  const rebuildTableClones = () => {
    const clones = cloneState.get();
    const tables = $$("table.training-table");

    tables.forEach((table) => {
      const key = getTableKey(table);
      const rows = clones.tables?.[key];
      if (!rows || !rows.length) return;

      const tbody = $("tbody", table);
      if (!tbody) return;

      $$(`tr[${AUTO_ROW_ATTR}="cloned"]`, tbody).forEach((tr) => tr.remove());

      const baseRow = tbody.querySelector('tr[data-base="true"]') || tbody.querySelector("tr");
      if (!baseRow) return;

      rows.forEach((vals) => {
        const tr = baseRow.cloneNode(true);
        tr.setAttribute(AUTO_ROW_ATTR, "cloned");
        clearRowFields(tr);
        applyRowValues(tr, vals);
        tbody.appendChild(tr);
      });
    });
  };

  /* =========================================================
     ✅ Ensure starter rows = 3 (for Service Advisors + similar)
     - Adds “starter” rows (NOT tagged as cloned) until there are 3
========================================================= */
  function seedStarterRowsToThree() {
    document.querySelectorAll("table.training-table").forEach((table) => {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;

      const existing = Array.from(tbody.querySelectorAll("tr")).filter(
        (tr) => tr.getAttribute(AUTO_ROW_ATTR) !== "cloned"
      );

      if (existing.length >= 3) return;

      const baseRow =
        tbody.querySelector('tr[data-base="true"]') ||
        existing[0];

      if (!baseRow) return;

      const needed = 3 - existing.length;
      for (let i = 0; i < needed; i++) {
        const clone = baseRow.cloneNode(true);

        // starter row, NOT added-row clone
        clone.removeAttribute(AUTO_ROW_ATTR);
        clone.removeAttribute("data-base");

        clone.querySelectorAll("input, select, textarea").forEach((el) => {
          if (el.type === "checkbox" || el.type === "radio") el.checked = false;
          else el.value = "";
          ensureId(el);
          saveField(el);
        });

        tbody.appendChild(clone);
      }
    });
  }

  /* =========================================================
     ✅ Training End Date Auto-Set = Onsite Date + 2 days
     - Robust selector list
     - Won’t overwrite if user manually edited end date
========================================================= */
  function autoSetTrainingEndDatePlus2() {
    // try common IDs you’ve used
    const onsiteInput =
      $("#onsiteTrainingDate") ||
      $("#onsiteTrainingStartDate") ||
      $("#onsiteDate") ||
      $("#trainingStartDate") ||
      $("#onsiteTraining") ||
      null;

    const endInput =
      $("#trainingEndDate") ||
      $("#onsiteTrainingEndDate") ||
      $("#endDate") ||
      $("#trainingEnd") ||
      null;

    if (!onsiteInput || !endInput) return;

    // mark manual edits
    if (!endInput.dataset.mkManualBound) {
      endInput.dataset.mkManualBound = "1";
      endInput.addEventListener("input", () => {
        // if user types/selects any date, we treat as manual
        if (endInput.value) endInput.dataset.mkManual = "1";
      });
      endInput.addEventListener("change", () => {
        if (endInput.value) endInput.dataset.mkManual = "1";
      });
    }

    const setEnd = () => {
      if (!onsiteInput.value) return;

      // if user manually set end date, don’t overwrite
      if (endInput.dataset.mkManual === "1") return;

      const start = new Date(onsiteInput.value);
      if (Number.isNaN(start.getTime())) return;

      start.setDate(start.getDate() + 2);

      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, "0");
      const dd = String(start.getDate()).padStart(2, "0");

      endInput.value = `${yyyy}-${mm}-${dd}`;
      ensureId(endInput);
      saveField(endInput);
      endInput.dispatchEvent(new Event("input", { bubbles: true }));
      endInput.dispatchEvent(new Event("change", { bubbles: true }));
    };

    // always update when onsite date changes
    if (!onsiteInput.dataset.mkBoundEndDate) {
      onsiteInput.dataset.mkBoundEndDate = "1";
      onsiteInput.addEventListener("input", setEnd);
      onsiteInput.addEventListener("change", setEnd);
    }

    // run once on load (if onsite already has value)
    setTimeout(setEnd, 50);
  }

  /* =======================
     SUPPORT TICKETS (lightweight read only for exec summary)
  ======================= */
  const readTicketsForSummary = () => {
    const groups = $$(".ticket-group");
    if (!groups.length) return { byStatus: {}, list: [] };

    const byStatus = {};
    const list = [];

    groups.forEach((card) => {
      const isBase = card.getAttribute("data-base") === "true";
      if (isBase) return;

      const num = $(".ticket-number-input", card)?.value?.trim() || "";
      const url = $(".ticket-zendesk-input", card)?.value?.trim() || "";
      const sum = $(".ticket-summary-input", card)?.value?.trim() || "";
      const status = $(".ticket-status-select", card)?.value || "Open";

      if (!num && !url && !sum) return;

      byStatus[status] = (byStatus[status] || 0) + 1;
      list.push({ status, num, url, sum });
    });

    return { byStatus, list };
  };

  /* =======================
     EXECUTIVE SUMMARY GENERATOR
  ======================= */

  const textTools = {
    normalize: (s) =>
      String(s || "")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),

    toSentences: (s) => {
      const v = textTools.normalize(s);
      if (!v) return [];
      // split on line breaks and sentence-ish punctuation
      const parts = v
        .split(/\n+/)
        .flatMap((line) => line.split(/(?<=[.?!])\s+/))
        .map((x) => x.trim())
        .filter(Boolean);
      return parts;
    },

    uniq: (arr) => {
      const seen = new Set();
      return arr.filter((x) => {
        const k = String(x).toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    },

    bulletize: (items, max = 8) => {
      const list = textTools.uniq(items).slice(0, max);
      if (!list.length) return "";
      return list.map((x) => `• ${x}`).join("\n");
    },

    firstNonEmpty: (...vals) => vals.find((v) => String(v || "").trim()) || "",
  };

  const gatherProjectSignals = () => {
    // Pull from ALL pages: all textareas except table cells + avoid ticket summary fields
    const allTextareas = $$("textarea").filter((ta) => {
      if (ta.closest("table")) return false;
      if (ta.closest("#support-tickets")) return true; // allow ticket notes if you ever add them
      // but exclude ticket short summary textareas by class if present
      if (ta.classList.contains("ticket-summary-input")) return false;
      return true;
    });

    const notesText = allTextareas
      .map((ta) => ta.value || "")
      .join("\n\n");

    // Grab key top fields
    const dealership =
      ($("#dealershipNameInput")?.value || "").trim() ||
      ($("#dealershipNameDisplay")?.textContent || "").trim();

    const onsite =
      $("#onsiteTrainingDate")?.value ||
      $("#onsiteTrainingStartDate")?.value ||
      $("#onsiteDate")?.value ||
      $("#trainingStartDate")?.value ||
      "";

    const end =
      $("#trainingEndDate")?.value ||
      $("#onsiteTrainingEndDate")?.value ||
      $("#endDate")?.value ||
      "";

    // Table coverage: count filled rows / selects (lightweight signal)
    const tableSignals = $$("table.training-table").map((tbl) => {
      const sec = tbl.closest(".page-section")?.id || "";
      const inputs = $$("input, select, textarea", tbl).filter((el) => {
        if (el.matches("input[type='checkbox'], input[type='radio']")) return el.checked;
        return String(el.value || "").trim().length > 0;
      });
      return { section: sec, filled: inputs.length };
    });

    const tickets = readTicketsForSummary();

    return {
      dealership,
      onsite,
      end,
      notesText: textTools.normalize(notesText),
      tableSignals,
      tickets,
    };
  };

  const classifyStatements = (statements) => {
    const wins = [];
    const risks = [];
    const next = [];
    const other = [];

    const WIN_RE = /(completed|fixed|resolved|enabled|trained|implemented|configured|successful|working|deployed|adopted|improved|standardized|aligned)/i;
    const RISK_RE = /(issue|problem|blocked|broken|missing|confusion|risk|concern|fragile|unstable|inconsistent|doesn'?t|unable|fail|error)/i;
    const NEXT_RE = /(next step|follow[- ]?up|verify|schedule|confirm|finalize|monitor|train|retrain|review|audit|coordinate|escalate|complete|deliver)/i;

    statements.forEach((s) => {
      const v = s.trim();
      if (!v) return;

      const isNext = NEXT_RE.test(v);
      const isRisk = RISK_RE.test(v);
      const isWin = WIN_RE.test(v);

      if (isNext) next.push(v);
      else if (isRisk) risks.push(v);
      else if (isWin) wins.push(v);
      else other.push(v);
    });

    return { wins, risks, next, other };
  };

  const generateNarrative = (signals, picks) => {
    const parts = [];

    const site = signals.dealership ? `at ${signals.dealership}` : "at the dealership";
    const dateSpan =
      signals.onsite && signals.end
        ? `from ${signals.onsite} through ${signals.end}`
        : signals.onsite
        ? `starting ${signals.onsite}`
        : "";

    parts.push(
      `Onsite training ${site}${dateSpan ? " " + dateSpan : ""} focused on operational workflow adoption across service, parts, and technician execution.`
    );

    if (picks.wins.length) {
      parts.push(
        `Key progress was made in ${picks.wins
          .slice(0, 3)
          .map((w) => w.replace(/^•\s*/g, ""))
          .join(", ")}.`
      );
    }

    if (signals.tickets.list.length) {
      const by = signals.tickets.byStatus || {};
      const open = by["Open"] || 0;
      const tier2 = by["Tier Two"] || 0;
      const closed = (by["Closed - Resolved"] || 0) + (by["Closed - Feature Not Supported"] || 0);
      parts.push(
        `Support follow-up items were captured through ticketing (${signals.tickets.list.length} total: ${open} open, ${tier2} tier two, ${closed} closed).`
      );
    }

    if (picks.risks.length) {
      parts.push(
        `Primary risks/constraints include ${picks.risks
          .slice(0, 2)
          .map((r) => r.replace(/^•\s*/g, ""))
          .join(" and ")}.`
      );
    }

    if (picks.next.length) {
      parts.push(
        `Recommended next steps prioritize ${picks.next
          .slice(0, 3)
          .map((n) => n.replace(/^•\s*/g, ""))
          .join(", ")}.`
      );
    }

    return parts.join(" ").replace(/\s{2,}/g, " ").trim();
  };

  const applyExecutiveSummaryToPage = (generated) => {
    const outcomeSel = $("#overallOutcomeSelect");
    const winsTa = $("#keyWinsText");
    const risksTa = $("#keyRisksText");
    const nextTa = $("#nextStepsText");
    const narrativeTa = $("#execNarrativeText");

    if (!winsTa || !risksTa || !nextTa || !narrativeTa) {
      mkPopup.ok("Training Summary fields are missing. Please paste the updated Training Summary HTML section.", {
        title: "Training Summary Missing Fields",
      });
      return;
    }

    // Only set outcome if blank
    if (outcomeSel && !outcomeSel.value && generated.suggestedOutcome) {
      outcomeSel.value = generated.suggestedOutcome;
      triggerInputChange(outcomeSel);
    }

    // Fill (but keep editable)
    winsTa.value = generated.wins || winsTa.value || "";
    risksTa.value = generated.risks || risksTa.value || "";
    nextTa.value = generated.next || nextTa.value || "";
    narrativeTa.value = generated.narrative || narrativeTa.value || "";

    [winsTa, risksTa, nextTa, narrativeTa].forEach((el) => {
      ensureId(el);
      saveField(el);
      triggerInputChange(el);
    });

    mkPopup.ok("Executive Summary generated. Review and edit as needed before exporting.", {
      title: "Executive Summary Ready",
    });
  };

  const suggestOutcomeFromSignals = (signals, winsCount, risksCount) => {
    // simple, predictable heuristic:
    // - more wins than risks => Met / Exceeded
    // - risks high => Partially Met
    if (winsCount >= 6 && risksCount <= 2) return "Exceeded Expectations";
    if (winsCount >= 3 && risksCount <= 3) return "Met Expectations";
    if (risksCount >= 5 && winsCount <= 2) return "Partially Met Expectations";
    if (risksCount >= 6 && winsCount === 0) return "Did Not Meet Expectations";
    return ""; // let user choose
  };

  const generateExecutiveSummary = () => {
    const signals = gatherProjectSignals();
    if (!signals.notesText && !signals.tickets.list.length) {
      mkPopup.ok(
        "I didn’t find any notes or ticket content to summarize yet. Add a few notes across the pages, then click Generate again.",
        { title: "Nothing to Summarize" }
      );
      return;
    }

    const statements = textTools.toSentences(signals.notesText);
    const classified = classifyStatements(statements);

    // Convert into bullets (keep tight + leadership readable)
    const wins = textTools.bulletize(classified.wins, 10);
    const risks = textTools.bulletize(classified.risks, 10);
    const next = textTools.bulletize(classified.next, 10);

    const suggestedOutcome = suggestOutcomeFromSignals(
      signals,
      classified.wins.length,
      classified.risks.length
    );

    const narrative = generateNarrative(signals, {
      wins: wins ? wins.split("\n") : [],
      risks: risks ? risks.split("\n") : [],
      next: next ? next.split("\n") : [],
    });

    applyExecutiveSummaryToPage({
      wins,
      risks,
      next,
      narrative,
      suggestedOutcome,
    });
  };

  /* =========================================================
     EXPAND BUTTONS (TABLES + NOTES) — CATCH-ALL + GUARDS
========================================================= */

  const ensureExpandStyles = (() => {
    const STYLE_ID = "mk-expand-style-v3";
    return () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-table-expand-btn,
        .mk-ta-expand{
          border:1px solid rgba(0,0,0,.15);
          background:rgba(255,255,255,.92);
          font-weight:900;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          line-height:1;
          user-select:none;
        }
      `;
      document.head.appendChild(s);
    };
  })();

  const tableModal = {
    modal: null,
    content: null,
    title: null,
    moved: [],
    bodyOverflow: "",
  };

  const openModalWithNodes = (nodes, titleText) => {
    const modal = $("#mkTableModal");
    if (!modal) {
      mkPopup.ok(
        "Your expand buttons need the #mkTableModal HTML block on the page. Add it near the bottom of your HTML (before </body>).",
        { title: "Missing Expand Modal" }
      );
      return;
    }

    const content = $(".mk-modal-content", modal);
    const titleEl = $(".mk-modal-title", modal);
    const panel = $(".mk-modal-panel", modal) || modal;
    if (!content) {
      mkPopup.ok("mkTableModal exists, but .mk-modal-content is missing inside it.", {
        title: "Modal Markup Issue",
      });
      return;
    }

    tableModal.modal = modal;
    tableModal.content = content;
    tableModal.title = titleEl;
    tableModal.moved = [];
    content.innerHTML = "";

    if (titleEl) titleEl.textContent = String(titleText || "Expanded View").trim();

    nodes.forEach((node) => {
      if (!node || !node.parentNode) return;
      const ph = document.createComment("mk-expand-placeholder");
      node.parentNode.insertBefore(ph, node);
      tableModal.moved.push({ node, placeholder: ph });
      content.appendChild(node);
    });

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    tableModal.bodyOverflow = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";
    try { panel.scrollTop = 0; } catch {}
  };

  const closeTableModal = () => {
    const modal = tableModal.modal;
    if (!modal) return;

    (tableModal.moved || []).forEach(({ node, placeholder }) => {
      if (!node || !placeholder || !placeholder.parentNode) return;
      placeholder.parentNode.insertBefore(node, placeholder);
      placeholder.parentNode.removeChild(placeholder);
    });

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = tableModal.bodyOverflow || "";

    tableModal.modal = null;
    tableModal.content = null;
    tableModal.title = null;
    tableModal.bodyOverflow = "";
    tableModal.moved = [];
  };

  const getExpandBundleNodes = (anyInside) => {
    const footer = anyInside?.closest?.(".table-footer");
    const sectionCard =
      footer?.closest(".section") ||
      footer?.closest(".section-block") ||
      footer?.parentElement ||
      anyInside?.closest?.(".section-block") ||
      anyInside?.closest?.(".page-section") ||
      document.body;

    const tableBlock =
      footer?.closest(".section-block") ||
      footer?.closest(".section") ||
      null;

    const nodes = [];
    if (tableBlock) nodes.push(tableBlock);

    const targets = new Set();
    $$("[data-notes-target]", sectionCard).forEach((btn) => {
      const id = btn.getAttribute("data-notes-target");
      if (id) targets.add(id);
    });
    targets.forEach((id) => {
      const block = document.getElementById(id);
      if (block) nodes.push(block);
    });

    if (!nodes.length) nodes.push(sectionCard);

    const uniq = [];
    const seen = new Set();
    nodes.forEach((n) => {
      if (!n || seen.has(n)) return;
      seen.add(n);
      uniq.push(n);
    });

    uniq.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    return uniq;
  };

  const openTableModalFor = (anyInside) => {
    const bundle = getExpandBundleNodes(anyInside);
    const header =
      bundle[0].querySelector?.(".section-header") ||
      bundle[0].querySelector?.("h2");
    const title = (header?.textContent || "Expanded View").trim();
    openModalWithNodes(bundle, title);
  };

  const openNotesModalFor = (notesHostEl) => {
    if (!notesHostEl) return;
    const h =
      notesHostEl.querySelector("h2") ||
      notesHostEl.querySelector(".section-header") ||
      null;
    const title = (h?.textContent || "Notes").trim();
    openModalWithNodes([notesHostEl], title);
  };

  const ensureTableExpandButtons = () => {
    ensureExpandStyles();
    document.querySelectorAll(".table-footer").forEach((footer) => {
      if (footer.querySelector(".mk-table-expand-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-table-expand-btn";
      btn.setAttribute("data-mk-table-expand", "1");
      btn.title = "Expand";
      btn.textContent = "⤢";

      footer.appendChild(btn);
    });
  };

  const shouldSkipNotesExpand = (ta) => {
    if (!ta) return true;
    if (ta.closest("table")) return true;
    // never add expand inside support ticket cards
    if (ta.closest("#support-tickets")) return true;
    // skip known support ticket summary fields if present
    if (ta.classList.contains("ticket-summary-input")) return true;
    const ph = (ta.getAttribute("placeholder") || "").toLowerCase();
    if (ph.includes("short summary")) return true;
    return false;
  };

  const ensureNotesExpandButtons = () => {
    ensureExpandStyles();

    const textareas = Array.from(document.querySelectorAll(".section-block textarea"));
    textareas.forEach((ta) => {
      if (shouldSkipNotesExpand(ta)) return;

      let wrap = ta.closest(".mk-ta-wrap");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "mk-ta-wrap";
        ta.parentNode.insertBefore(wrap, ta);
        wrap.appendChild(ta);
      }

      if (wrap.querySelector(".mk-ta-expand")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-ta-expand";
      btn.setAttribute("data-mk-notes-expand", "1");
      btn.title = "Expand Notes";
      btn.textContent = "⤢";

      const hostId = ta.closest("[id]")?.id || "";
      if (hostId) btn.setAttribute("data-notes-id", hostId);

      wrap.appendChild(btn);
    });
  };

  const startExpandObserver = () => {
    const obs = new MutationObserver(() => {
      ensureTableExpandButtons();
      ensureNotesExpandButtons();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      ensureTableExpandButtons();
      ensureNotesExpandButtons();
    }, 250);
    setTimeout(() => {
      ensureTableExpandButtons();
      ensureNotesExpandButtons();
    }, 900);
  };

  /* =======================
     EVENT DELEGATION
  ======================= */
  document.addEventListener("click", (e) => {
    const t = e.target;

    // NAV
    const navBtn = t.closest(".nav-btn[data-target]");
    if (navBtn) {
      e.preventDefault();
      setActiveSection(navBtn.getAttribute("data-target"));
      return;
    }

    // GENERATE EXEC SUMMARY
   const resetBtn = t.closest(".clear-page-btn");
if (resetBtn && !t.closest("#mkGenerateExecSummary") && !t.closest("#savePDF")) {

    // CLEAR ALL
    const clearAllBtn = t.closest("#clearAllBtn");
    if (clearAllBtn) {
      e.preventDefault();
      mkPopup.confirm("This will clear ALL pages and ALL saved data. Continue?", {
        title: "Clear All",
        okText: "Clear All",
        cancelText: "Cancel",
        onOk: clearAll,
      });
      return;
    }

    // RESET PAGE
    const resetBtn = t.closest(".clear-page-btn");
    if (resetBtn && resetBtn.hasAttribute("data-clear-page")) {
      e.preventDefault();
      const section =
        (resetBtn.dataset.clearPage && document.getElementById(resetBtn.dataset.clearPage)) ||
        resetBtn.closest(".page-section");

      mkPopup.confirm("Reset this page? This will clear only the fields on this page.", {
        title: "Reset This Page",
        okText: "Reset Page",
        cancelText: "Cancel",
        onOk: () => clearSection(section),
      });
      return;
    }

    // ADD ROW
    const addRowBtn = t.closest("button.add-row");
    if (addRowBtn && addRowBtn.closest(".table-footer")) {
      e.preventDefault();
      cloneTableRow(addRowBtn);
      return;
    }

    // TABLE EXPAND
    const tableExpandBtn = t.closest(".mk-table-expand-btn");
    if (tableExpandBtn) {
      e.preventDefault();
      openTableModalFor(tableExpandBtn);
      return;
    }

    // NOTES EXPAND
    const notesExpandBtn = t.closest(".mk-ta-expand");
    if (notesExpandBtn) {
      e.preventDefault();
      const id = notesExpandBtn.getAttribute("data-notes-id");
      const block = id ? document.getElementById(id) : null;
      if (block) openNotesModalFor(block);
      else openModalWithNodes([notesExpandBtn.closest(".section-block")], "Notes");
      return;
    }

    // MODAL CLOSE
    const mkTableModal = $("#mkTableModal");
    if (mkTableModal && mkTableModal.classList.contains("open")) {
      if (
        t.closest("#mkTableModal .mk-modal-close") ||
        t.closest("#mkTableModal .mk-modal-backdrop")
      ) {
        e.preventDefault();
        closeTableModal();
        return;
      }
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;

    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
      setGhostStyles(document);
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;

    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
      setGhostStyles(document);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const mkTableModal = $("#mkTableModal");
      if (mkTableModal && mkTableModal.classList.contains("open")) {
        e.preventDefault();
        closeTableModal();
      }
      mkPopup.close();
    }
  });

  /* =======================
     INIT / RESTORE
  ======================= */
  const init = () => {
    assignIdsToAllFields();
    initNav();

    // restore saved fields
    restoreAllFields();
    setGhostStyles(document);

    // table clone restore (if you’re using clone persistence elsewhere)
    rebuildTableClones();

    // enforce 3 starter rows (Service Advisors fix)
    seedStarterRowsToThree();

    // end date auto: onsite +2 days
    autoSetTrainingEndDatePlus2();

    // expand buttons
    ensureTableExpandButtons();
    ensureNotesExpandButtons();
    startExpandObserver();

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
