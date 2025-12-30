/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   NOTES UPGRADE (NEW):
   - Notes buttons now CREATE structured notes items (bullet + hollow bullet)
   - Each notes item is tied to a specific question/row (stable key)
   - Order ALWAYS matches on-page question order
   - Cursor focuses the hollow-bullet textarea
   - Notes button turns myKaarma orange after adding
   - Tables: pulls Name column (Training page) / Opcode column (Opcodes page)
   - Works for regular rows AND popup/expanded tables (same logic)
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v5";
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
      `${prefix}-${Date.now()}-${(n++).toString(16)}-${Math.random().toString(16).slice(2)}`;
  })();

  const isEl = (x) => x && x.nodeType === 1;

  const getSection = (el) => el?.closest?.(".page-section") || el?.closest?.("section") || null;

  const isFormField = (el) =>
    isEl(el) && (el.matches("input, select, textarea") || el.matches("[contenteditable='true']"));

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

  const scrollIntoViewNice = (el) => {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      el.scrollIntoView(true);
    }
  };

  const triggerInputChange = (el) => {
    if (!el) return;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setGhostStyles = (root = document) => {
    // select ghost
    root.querySelectorAll("select").forEach((sel) => {
      const first = sel.options?.[0];
      const isGhost =
        !sel.value || (first && first.dataset?.ghost === "true" && sel.value === "");
      sel.classList.toggle("is-placeholder", !!isGhost);
    });

    // date ghost
    root.querySelectorAll('input[type="date"]').forEach((d) => {
      d.classList.toggle("is-placeholder", !d.value);
    });
  };

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
     NAV (MENU BUTTONS)
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

    scrollIntoViewNice(target);
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
      $$("tr", tb).forEach((tr) => {
        if (tr.getAttribute(AUTO_ROW_ATTR) === "cloned") tr.remove();
      });
    });

    $$(".ticket-group", root).forEach((g) => {
      if (g.getAttribute("data-base") === "true") return;
      g.remove();
    });

    // Notes lists inside notes targets
    $$(".mk-notes-list", root).forEach((list) => list.remove());
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

    // remove orange state on notes buttons in that section
    $$("[data-notes-btn].is-notes-active", sectionEl).forEach((b) => b.classList.remove("is-notes-active"));

    log("Cleared section:", sectionEl.id);
  };

  /* =======================
     ADD TRAINER (+)
  ======================= */
  const buildTrainerRow = (value = "") => {
    const wrap = document.createElement("div");
    wrap.className = "checklist-row integrated-plus indent-sub";
    wrap.setAttribute(AUTO_ROW_ATTR, "cloned");

    const label = document.createElement("label");
    label.textContent = "Additional Trainer";

    const inputPlus = document.createElement("div");
    inputPlus.className = "input-plus";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter additional trainer name";
    input.autocomplete = "off";
    input.value = value;

    inputPlus.appendChild(input);
    wrap.appendChild(label);
    wrap.appendChild(inputPlus);

    ensureId(input);
    saveField(input);
    return wrap;
  };

  const addTrainerRow = () => {
    const input = $("#additionalTrainerInput");
    const container = $("#additionalTrainersContainer");
    if (!input || !container) return;

    const name = (input.value || "").trim();
    const row = buildTrainerRow(name);
    container.appendChild(row);

    const clones = cloneState.get();
    clones.trainers.push({ value: name });
    cloneState.set(clones);

    input.value = "";
    saveField(input);
    input.focus();
  };

  /* =======================
     ADD POC (+) — SINGLE FIRE
  ======================= */
  const getBasePocCard = (btn) =>
    btn?.closest?.(".additional-poc-card[data-base='true']") ||
    $(".additional-poc-card[data-base='true']");

  const readPocBaseValues = (baseCard) => {
    const nameEl =
      baseCard.querySelector("#additionalPocInput") ||
      baseCard.querySelector(".input-plus input[type='text']") ||
      baseCard.querySelector('input[placeholder="Enter name"]');

    const roleEl =
      baseCard.querySelector('input[placeholder="Enter role"]') ||
      baseCard.querySelector('input[type="text"][data-field="role"]');

    const cellEl =
      baseCard.querySelector('input[placeholder="Enter cell"]') ||
      baseCard.querySelector('input[type="text"][data-field="cell"]');

    const emailEl =
      baseCard.querySelector('input[type="email"]') ||
      baseCard.querySelector('input[placeholder="Enter company email"]');

    return {
      els: { nameEl, roleEl, cellEl, emailEl },
      values: {
        name: (nameEl?.value ?? "").trim(),
        role: (roleEl?.value ?? "").trim(),
        cell: (cellEl?.value ?? "").trim(),
        email: (emailEl?.value ?? "").trim(),
      },
    };
  };

  const buildPocCard = ({ name = "", role = "", cell = "", email = "" } = {}) => {
    const newCard = document.createElement("div");
    newCard.className = "mini-card additional-poc-card";
    newCard.setAttribute(AUTO_CARD_ATTR, "poc");
    newCard.innerHTML = `
      <div class="checklist-row">
        <label>Additional POC</label>
        <input type="text" placeholder="Enter name" autocomplete="off" />
      </div>

      <div class="checklist-row indent-sub">
        <label>Role</label>
        <input type="text" placeholder="Enter role" autocomplete="off" />
      </div>

      <div class="checklist-row indent-sub">
        <label>Cell</label>
        <input type="text" placeholder="Enter cell" autocomplete="off" />
      </div>

      <div class="checklist-row indent-sub">
        <label>Email</label>
        <input type="email" placeholder="Enter company email" autocomplete="off" />
      </div>
    `;

    const nameNew = newCard.querySelector('input[placeholder="Enter name"]');
    const roleNew = newCard.querySelector('input[placeholder="Enter role"]');
    const cellNew = newCard.querySelector('input[placeholder="Enter cell"]');
    const emailNew = newCard.querySelector('input[type="email"]');

    if (nameNew) nameNew.value = name;
    if (roleNew) roleNew.value = role;
    if (cellNew) cellNew.value = cell;
    if (emailNew) emailNew.value = email;

    $$("input, select, textarea", newCard).forEach((el) => {
      ensureId(el);
      saveField(el);
    });

    return newCard;
  };

  const addPocCard = (btn) => {
    const baseCard = getBasePocCard(btn);
    if (!baseCard) return;

    // hard stop double-fire (click bubbling / double listeners)
    if (btn && btn.dataset.mkBusy === "1") return;
    if (btn) {
      btn.dataset.mkBusy = "1";
      setTimeout(() => (btn.dataset.mkBusy = "0"), 0);
    }

    const { els, values } = readPocBaseValues(baseCard);

    const newCard = buildPocCard(values);
    baseCard.insertAdjacentElement("afterend", newCard);

    const clones = cloneState.get();
    clones.pocs.push(values);
    cloneState.set(clones);

    if (els.nameEl) els.nameEl.value = "";
    if (els.roleEl) els.roleEl.value = "";
    if (els.cellEl) els.cellEl.value = "";
    if (els.emailEl) els.emailEl.value = "";

    [els.nameEl, els.roleEl, els.cellEl, els.emailEl].forEach(triggerInputChange);

    if (els.nameEl) els.nameEl.focus();
  };

  /* =======================
     TABLE: ADD ROW (+) + RESTORE
  ======================= */
  const getTableKey = (table) => {
    const k =
      table.getAttribute("data-table-key") ||
      table.id ||
      (() => {
        const h = table.closest(".table-container")?.previousElementSibling;
        const ht = h?.textContent?.trim();
        return ht ? `tbl:${ht}` : `tbl:${uid("t")}`;
      })();
    return k;
  };

  const extractRowValues = (tr) => {
    const cells = [];
    $$("input, select, textarea", tr).forEach((el) => {
      if (el.matches("input[type='checkbox']")) cells.push({ t: "cb", v: !!el.checked });
      else cells.push({ t: "v", v: el.value ?? "" });
    });
    return cells;
  };

  const applyRowValues = (tr, vals) => {
    const fields = $$("input, select, textarea", tr);
    fields.forEach((el, idx) => {
      const item = vals?.[idx];
      if (!item) return;
      if (el.matches("input[type='checkbox']")) el.checked = !!item.v;
      else el.value = item.v ?? "";
      ensureId(el);
      saveField(el);
    });
  };

  const cloneTableRow = (btn) => {
    const footer = btn.closest(".table-footer");
    if (!footer) return;

    const tableContainer = btn.closest(".table-container");
    if (!tableContainer) return;

    const table = $("table.training-table", tableContainer);
    const tbody = $("tbody", table);
    if (!table || !tbody) return;

    const rows = $$("tr", tbody);
    if (!rows.length) return;

    const template = rows[rows.length - 1];
    const clone = template.cloneNode(true);
    clone.setAttribute(AUTO_ROW_ATTR, "cloned");

    $$("input, select, textarea", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      saveField(el);
    });

    tbody.appendChild(clone);

    const tableKey = getTableKey(table);
    const clones = cloneState.get();
    clones.tables[tableKey] = clones.tables[tableKey] || [];
    clones.tables[tableKey].push(extractRowValues(clone));
    cloneState.set(clones);
  };

  const rebuildTableClones = () => {
    const clones = cloneState.get();
    const tables = $$("table.training-table");

    tables.forEach((table) => {
      const key = getTableKey(table);
      const rowsData = clones.tables[key];
      if (!rowsData || !rowsData.length) return;

      const tbody = $("tbody", table);
      if (!tbody) return;

      const existingRows = $$("tr", tbody);
      if (!existingRows.length) return;
      const template = existingRows[existingRows.length - 1];

      rowsData.forEach((rowVals) => {
        const clone = template.cloneNode(true);
        clone.setAttribute(AUTO_ROW_ATTR, "cloned");
        $$("input, select, textarea", clone).forEach((el) => el.removeAttribute(AUTO_ID_ATTR));
        applyRowValues(clone, rowVals);
        tbody.appendChild(clone);
      });
    });
  };

  /* =======================
     NOTES SYSTEM (NEW)
     - Builds a list UI inside the notes target card:
       • Question text
         ◦ [textarea for notes]
     - Keeps stable storage keys per question row
     - Keeps order matching on-page question order
     - Button turns orange when item exists
  ======================= */

  // tiny stable hash for deterministic IDs (no random, survives rebuild)
  const hashStr = (s) => {
    const str = String(s ?? "");
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  };

  const getOrCreateNotesList = (targetEl) => {
    if (!targetEl) return null;

    let list = $(".mk-notes-list", targetEl);
    if (list) return list;

    // If your HTML has a textarea, we keep it (for layout) but hide it
    // and replace with structured list. (No breaking your card sizing.)
    const existingTa = $("textarea", targetEl);
    if (existingTa) {
      existingTa.setAttribute("data-mk-notes-legacy", "true");
      existingTa.style.display = "none";
    }

    list = document.createElement("div");
    list.className = "mk-notes-list";
    // basic spacing without needing CSS edits
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "14px";
    list.style.marginTop = "10px";

    targetEl.appendChild(list);
    return list;
  };

  const getNotesSourceEl = (btn) => {
    // If button is in a table row (including popup tables)
    const tr = btn.closest("tr");
    if (tr) return tr;

    // Otherwise, normal checklist row
    const row = btn.closest(".checklist-row");
    if (row) return row;

    // Fallback: the closest section-block
    return btn.closest(".section-block") || btn;
  };

  const getNotesPromptText = (btn) => {
    const section = getSection(btn);
    const sourceEl = getNotesSourceEl(btn);

    // TABLE RULES
    const tr = btn.closest("tr");
    const table = btn.closest("table");
    if (tr && table) {
      // Determine which column to pull:
      // - Training page: "Name"
      // - Opcodes page: "Opcode"
      const secId = section?.id || "";
      const want =
        secId === "training-checklist"
          ? "name"
          : secId === "opcodes-pricing"
          ? "opcode"
          : null;

      const ths = $$("thead th", table).map((th) => (th.textContent || "").trim().toLowerCase());
      const findIdx = (needle) => ths.findIndex((t) => t.includes(needle));

      let idx = -1;
      if (want === "name") idx = findIdx("name");
      if (want === "opcode") idx = findIdx("opcode");

      // If we can’t find a header match, default to first column with a text input
      if (idx < 0) {
        const tds = $$("td", tr);
        for (let i = 0; i < tds.length; i++) {
          const inp = $("input[type='text'], input:not([type]), textarea, select", tds[i]);
          if (inp) {
            idx = i;
            break;
          }
        }
      }

      const cell = idx >= 0 ? $$("td", tr)[idx] : null;
      if (cell) {
        const field = $("input, textarea, select", cell);
        const val = field ? (field.value || "").trim() : (cell.textContent || "").trim();
        const label =
          want === "name" ? "Name" : want === "opcode" ? "Opcode" : "Item";
        return val ? `${label}: ${val}` : `${label}: (blank)`;
      }

      return "Table row note";
    }

    // NORMAL ROWS
    const label = $("label", sourceEl);
    const labelText = (label?.textContent || "").trim();
    return labelText || "Note";
  };

  const getNotesKey = (btn, targetId) => {
    const sourceEl = getNotesSourceEl(btn);
    const sourceId = ensureId(sourceEl) || uid("src");
    return `${targetId}::${sourceId}`;
  };

  const buildNotesItem = ({ targetId, key, promptText }) => {
    const wrap = document.createElement("div");
    wrap.className = "mk-notes-item";
    wrap.setAttribute("data-note-key", key);

    const q = document.createElement("div");
    q.className = "mk-note-question";
    q.textContent = `• ${promptText}`;
    q.style.fontWeight = "600";
    q.style.lineHeight = "1.25";

    const a = document.createElement("div");
    a.className = "mk-note-answer";
    a.style.display = "flex";
    a.style.gap = "10px";
    a.style.alignItems = "flex-start";

    const bullet = document.createElement("div");
    bullet.textContent = "◦";
    bullet.style.marginLeft = "18px";
    bullet.style.lineHeight = "1.2";
    bullet.style.paddingTop = "8px";

    const ta = document.createElement("textarea");
    ta.rows = 3;
    ta.placeholder = "Add notes here…";
    ta.style.width = "100%";
    ta.style.resize = "vertical";

    // deterministic id for this note textarea so it restores forever
    const stableId = `note-${hashStr(key)}`;
    ta.setAttribute(AUTO_ID_ATTR, stableId);

    // restore saved value if it exists
    const state = readState();
    const fieldsState = state.__fields || {};
    if (stableId in fieldsState) ta.value = fieldsState[stableId] ?? "";

    // make sure it’s tracked
    ensureId(ta);
    saveField(ta);

    // when typing notes, persist & keep button orange
    ta.addEventListener("input", () => {
      saveField(ta);
      markNotesButtonsActive(targetId, key, true);
    });

    a.appendChild(bullet);
    a.appendChild(ta);

    wrap.appendChild(q);
    wrap.appendChild(a);

    return { wrap, textarea: ta };
  };

  const collectAllSourcesForTarget = (targetId) => {
    // All notes buttons that point to this target, in DOM order
    const btns = $$(`[data-notes-target="${CSS.escape(targetId)}"]`);
    const items = btns.map((btn) => {
      const key = getNotesKey(btn, targetId);
      const text = getNotesPromptText(btn);
      return { btn, key, text };
    });

    // De-dupe by key while preserving first occurrence order
    const seen = new Set();
    const out = [];
    for (const it of items) {
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      out.push(it);
    }
    return out;
  };

  const renderNotesTarget = (targetId) => {
    const target = document.getElementById(targetId);
    if (!target) return null;

    if (target.classList.contains("is-hidden")) target.classList.remove("is-hidden");
    if (target.hasAttribute("hidden")) target.removeAttribute("hidden");

    const list = getOrCreateNotesList(target);
    if (!list) return null;

    const sources = collectAllSourcesForTarget(targetId);

    // Keep existing note items, rebuild in correct order:
    const existing = new Map();
    $$(".mk-notes-item", list).forEach((el) => {
      existing.set(el.getAttribute("data-note-key"), el);
    });

    // Clear and rebuild in correct order
    list.innerHTML = "";

    sources.forEach((s) => {
      let el = existing.get(s.key);
      let focusTa = null;

      if (!el) {
        const built = buildNotesItem({ targetId, key: s.key, promptText: s.text });
        el = built.wrap;
        focusTa = built.textarea;

        // Mark button orange because an item exists
        markNotesButtonsActive(targetId, s.key, true);
      } else {
        // If prompt text changed, update the display
        const q = $(".mk-note-question", el);
        if (q) q.textContent = `• ${s.text}`;
      }

      list.appendChild(el);

      // Keep buttons orange if there is any saved text
      const ta = $("textarea", el);
      if (ta && (ta.value || "").trim()) {
        markNotesButtonsActive(targetId, s.key, true);
      }
    });

    return target;
  };

  const markNotesButtonsActive = (targetId, key, isActive) => {
    // Add a marker on ALL buttons pointing to this target + key
    const btns = $$(`[data-notes-target="${CSS.escape(targetId)}"]`);
    btns.forEach((b) => {
      const k = getNotesKey(b, targetId);
      if (k !== key) return;
      b.classList.toggle("is-notes-active", !!isActive);
    });
  };

  const syncAllNotesButtonStates = () => {
    // After restore, ensure any buttons with saved notes are orange
    const targets = new Set($$("[data-notes-target]").map((b) => b.getAttribute("data-notes-target")));
    targets.forEach((targetId) => {
      if (!targetId) return;
      const sources = collectAllSourcesForTarget(targetId);
      sources.forEach((s) => {
        const stableId = `note-${hashStr(s.key)}`;
        const state = readState();
        const fields = state.__fields || {};
        const hasText = (fields[stableId] || "").trim().length > 0;
        if (hasText) markNotesButtonsActive(targetId, s.key, true);
      });
    });
  };

  const handleNotesClick = (btn) => {
    const targetId =
      btn.getAttribute("data-notes-target") ||
      btn.getAttribute("data-target") ||
      btn.getAttribute("href")?.replace("#", "");
    if (!targetId) return;

    const key = getNotesKey(btn, targetId);
    const promptText = getNotesPromptText(btn);

    const target = renderNotesTarget(targetId);
    if (!target) return;

    // Ensure THIS item exists (even if user never clicked other lines)
    const list = $(".mk-notes-list", target);
    if (!list) return;

    let item = $(`.mk-notes-item[data-note-key="${CSS.escape(key)}"]`, list);
    if (!item) {
      const built = buildNotesItem({ targetId, key, promptText });
      list.appendChild(built.wrap);
      item = built.wrap;
    } else {
      const q = $(".mk-note-question", item);
      if (q) q.textContent = `• ${promptText}`;
    }

    // Turn button orange immediately
    markNotesButtonsActive(targetId, key, true);

    // Focus the hollow bullet textarea
    const ta = $("textarea", item);
    if (ta) {
      scrollIntoViewNice(item);
      ta.focus();
    } else {
      scrollIntoViewNice(target);
    }
  };

  /* =======================
     SUPPORT TICKETS
  ======================= */
  const ticketContainersByStatus = () => ({
    Open: $("#openTicketsContainer"),
    "Tier Two": $("#tierTwoTicketsContainer"),
    "Closed - Resolved": $("#closedResolvedTicketsContainer"),
    "Closed - Feature Not Supported": $("#closedFeatureTicketsContainer"),
  });

  const readTicketValues = (card) => {
    const num = $(".ticket-number-input", card)?.value?.trim() || "";
    const url = $(".ticket-zendesk-input", card)?.value?.trim() || "";
    const sum = $(".ticket-summary-input", card)?.value?.trim() || "";
    const status = $(".ticket-status-select", card)?.value || "Open";
    return { num, url, sum, status };
  };

  const isTicketCardComplete = (card) => {
    const v = readTicketValues(card);
    return !!(v.num && v.url && v.sum);
  };

  const markTicketCardErrors = (card) => {
    const numEl = $(".ticket-number-input", card);
    const urlEl = $(".ticket-zendesk-input", card);
    const sumEl = $(".ticket-summary-input", card);
    [numEl, urlEl, sumEl].forEach((el) => {
      if (!el) return;
      const v = (el.value || "").trim();
      if (!v) {
        el.classList.add("mk-field-error");
        setTimeout(() => el.classList.remove("mk-field-error"), 700);
      }
    });
  };

  const buildTicketCloneFromBase = (baseCard) => {
    const clone = baseCard.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, "ticket");

    $$("input, textarea, select", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      saveField(el);
    });

    const status = $(".ticket-status-select", clone);
    if (status) {
      status.value = "Open";
      status.disabled = true;
      ensureId(status);
      saveField(status);
    }
    return clone;
  };

  const addTicketCard = (btn) => {
    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const currentCard = btn.closest(".ticket-group");
    if (!currentCard) return;

    if (!isTicketCardComplete(currentCard)) {
      markTicketCardErrors(currentCard);
      return;
    }

    const base = $(".ticket-group[data-base='true']", openContainer) || currentCard;
    const clone = buildTicketCloneFromBase(base);

    openContainer.appendChild(clone);
    $(".ticket-number-input", clone)?.focus();

    const clones = cloneState.get();
    clones.tickets.push({ status: "Open", num: "", url: "", sum: "" });
    cloneState.set(clones);
  };

  const onTicketNumberChange = (inputEl) => {
    const card = inputEl.closest(".ticket-group");
    if (!card) return;

    const status = $(".ticket-status-select", card);
    if (!status) return;

    const hasNum = (inputEl.value || "").trim().length > 0;
    status.disabled = !hasNum;

    saveField(inputEl);
    saveField(status);

    if (card.getAttribute("data-base") !== "true") persistAllTickets();
  };

  const onTicketStatusChange = (selectEl) => {
    const card = selectEl.closest(".ticket-group");
    if (!card) return;

    const statusVal = selectEl.value;
    const containers = ticketContainersByStatus();
    const dest = containers[statusVal] || containers.Open;
    if (dest) dest.appendChild(card);

    saveField(selectEl);

    if (card.getAttribute("data-base") !== "true") persistAllTickets();
  };

  const persistAllTickets = () => {
    const clones = cloneState.get();
    clones.tickets = [];

    const all = $$(".ticket-group").filter((g) => g.getAttribute("data-base") !== "true");
    all.forEach((card) => {
      const v = readTicketValues(card);
      clones.tickets.push({ status: v.status, num: v.num, url: v.url, sum: v.sum });
    });

    cloneState.set(clones);
  };

  const rebuildTicketClones = () => {
    const clones = cloneState.get();
    if (!clones.tickets || !clones.tickets.length) return;

    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const base = $(".ticket-group[data-base='true']", openContainer);
    if (!base) return;

    $$(".ticket-group", document).forEach((g) => {
      if (g.getAttribute("data-base") !== "true") g.remove();
    });

    clones.tickets.forEach((t) => {
      const clone = buildTicketCloneFromBase(base);

      $(".ticket-number-input", clone).value = t.num || "";
      $(".ticket-zendesk-input", clone).value = t.url || "";
      $(".ticket-summary-input", clone).value = t.sum || "";

      const statusSel = $(".ticket-status-select", clone);
      if (statusSel) {
        statusSel.value = t.status || "Open";
        statusSel.disabled = !(t.num || "").trim();
        saveField(statusSel);
      }

      $$("input, textarea, select", clone).forEach((el) => saveField(el));

      const containers = ticketContainersByStatus();
      const dest = containers[t.status] || containers.Open || openContainer;
      dest.appendChild(clone);
    });
  };

  /* =======================
     POC CLONE RESTORE
  ======================= */
  const rebuildPocClones = () => {
    const clones = cloneState.get();
    if (!clones.pocs || !clones.pocs.length) return;

    $$(".additional-poc-card").forEach((c) => {
      if (c.getAttribute("data-base") !== "true") c.remove();
    });

    const base = $(".additional-poc-card[data-base='true']");
    if (!base) return;

    clones.pocs.forEach((p) => {
      const card = buildPocCard(p);
      base.insertAdjacentElement("afterend", card);
    });
  };

  /* =======================
     TRAINER CLONE RESTORE
  ======================= */
  const rebuildTrainerClones = () => {
    const clones = cloneState.get();
    const container = $("#additionalTrainersContainer");
    if (!container) return;

    container.innerHTML = "";
    (clones.trainers || []).forEach((t) => {
      const row = buildTrainerRow(t.value || "");
      container.appendChild(row);
    });
  };

  /* =======================
     DEALERSHIP NAME DISPLAY
  ======================= */
  const syncDealershipName = () => {
    const input = $("#dealershipNameInput");
    const display = $("#dealershipNameDisplay");
    if (!input || !display) return;
    display.textContent = (input.value || "").trim();
  };

  /* =======================
     EVENT DELEGATION (SINGLE)
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

    // CLEAR ALL
    const clearAllBtn = t.closest("#clearAllBtn");
    if (clearAllBtn) {
      e.preventDefault();
      clearAll();
      return;
    }

    // RESET THIS PAGE
    const resetBtn = t.closest(".clear-page-btn[data-clear-page]");
    if (resetBtn) {
      e.preventDefault();
      const id = resetBtn.getAttribute("data-clear-page");
      if (id) clearSection(document.getElementById(id));
      return;
    }

    // ADD TRAINER (+)
    if (t.closest("[data-add-trainer]") || t.closest("#trainers-deployment .trainer-add-btn")) {
      const btn =
        t.closest("[data-add-trainer]") || t.closest("#trainers-deployment .trainer-add-btn");
      if (btn) {
        e.preventDefault();
        addTrainerRow();
        return;
      }
    }

    // ADD POC (+)
    const pocBtn = t.closest("[data-add-poc], .additional-poc-add");
    if (pocBtn) {
      e.preventDefault();
      e.stopPropagation();
      addPocCard(pocBtn);
      return;
    }

    // TABLE ADD ROW (only inside footer)
    const addRowBtn = t.closest("button.add-row");
    if (addRowBtn && addRowBtn.closest(".table-footer")) {
      e.preventDefault();
      cloneTableRow(addRowBtn);
      return;
    }

    // NOTES buttons
    const notesBtn = t.closest("[data-notes-btn], [data-notes-target]");
    if (notesBtn && notesBtn.getAttribute("data-notes-target")) {
      e.preventDefault();
      handleNotesClick(notesBtn);
      return;
    }

    // SUPPORT TICKET ADD (+)
    const ticketAddBtn = t.closest(".add-ticket-btn");
    if (ticketAddBtn) {
      e.preventDefault();
      addTicketCard(ticketAddBtn);
      return;
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;

    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
      setGhostStyles(document);
    }

    if (el.id === "dealershipNameInput") syncDealershipName();

    // persist trainers
    if (el.closest("#additionalTrainersContainer")) {
      const clones = cloneState.get();
      clones.trainers = $$("#additionalTrainersContainer input[type='text']").map((i) => ({
        value: (i.value || "").trim(),
      }));
      cloneState.set(clones);
    }

    // persist pocs (non-base)
    if (
      el.closest(".additional-poc-card") &&
      el.closest(".additional-poc-card")?.getAttribute("data-base") !== "true"
    ) {
      const clones = cloneState.get();
      clones.pocs = $$(".additional-poc-card")
        .filter((c) => c.getAttribute("data-base") !== "true")
        .map((c) => ({
          name: (c.querySelector('input[placeholder="Enter name"]')?.value || "").trim(),
          role: (c.querySelector('input[placeholder="Enter role"]')?.value || "").trim(),
          cell: (c.querySelector('input[placeholder="Enter cell"]')?.value || "").trim(),
          email: (c.querySelector('input[type="email"]')?.value || "").trim(),
        }));
      cloneState.set(clones);
    }

    if (el.matches(".ticket-number-input")) {
      onTicketNumberChange(el);
    }

    // table clone persistence
    const tr = el.closest("tr");
    const table = el.closest("table.training-table");
    if (tr && table && tr.getAttribute(AUTO_ROW_ATTR) === "cloned") {
      const key = getTableKey(table);
      const clones = cloneState.get();
      clones.tables[key] = clones.tables[key] || [];

      const tbody = $("tbody", table);
      const clonedRows = $$(`tr[${AUTO_ROW_ATTR}="cloned"]`, tbody);
      clones.tables[key] = clonedRows.map((r) => extractRowValues(r));
      cloneState.set(clones);
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;

    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
      setGhostStyles(document);
    }

    if (el.matches(".ticket-status-select")) {
      onTicketStatusChange(el);
    }
  });

  document.addEventListener("keydown", (e) => {
    const el = e.target;
    if (!isEl(el)) return;

    if (el.id === "additionalTrainerInput" && e.key === "Enter") {
      e.preventDefault();
      addTrainerRow();
      return;
    }

    if (el.id === "additionalPocInput" && e.key === "Enter") {
      e.preventDefault();
      const btn = el
        .closest(".additional-poc-card")
        ?.querySelector("[data-add-poc], .additional-poc-add");
      if (btn) addPocCard(btn);
      return;
    }
  });

  /* =======================
     INIT / RESTORE
  ======================= */
  const init = () => {
    assignIdsToAllFields();

    initNav();

    rebuildTrainerClones();
    rebuildPocClones();
    rebuildTableClones();
    rebuildTicketClones();

    // IMPORTANT: restore AFTER clones rebuild
    restoreAllFields();

    $$(".ticket-group").forEach((card) => {
      const num = $(".ticket-number-input", card);
      const status = $(".ticket-status-select", card);
      if (num && status) status.disabled = !(num.value || "").trim();
      if (num) ensureId(num);
      if (status) ensureId(status);
    });

    setGhostStyles(document);

    syncDealershipName();

    // Notes: after restore, make buttons orange if notes exist
    syncAllNotesButtonStates();

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
