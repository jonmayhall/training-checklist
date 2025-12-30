/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (SINGLE SCRIPT / HARDENED / DROP-IN)

   ✅ POC FIX:
   - Cloned/added POC cards DO NOT include the (+) add button
   - Cloned/added POC cards get a “right-rounded” look
     (adds classes + inline right-side radius as a safe fallback)

   ✅ NOTES:
   - Table notes bullets include the row's Name/Opcode value (no prefixes)
   - Cursor lands at the hollow bullet (◦)

   ✅ SERVICE ADVISORS:
   - 3 total rows (template + 2 clones), using the same table clone logic
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
     NOTES BUTTON VISUAL RESET
  ======================= */
  const clearAllNotesButtonStates = (root = document) => {
    root
      .querySelectorAll(".notes-btn.has-notes, .notes-icon-btn.has-notes, .notes-btn.is-notes-active, .notes-icon-btn.is-notes-active")
      .forEach((btn) => {
        btn.classList.remove("has-notes");
        btn.classList.remove("is-notes-active");
      });
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

    clearAllNotesButtonStates(document);
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
    clearAllNotesButtonStates(sectionEl);

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
     ADD POC (+)
  ======================= */
  const readPocCardValues = (card) => ({
    name: (card.querySelector('input[placeholder="Enter name"]')?.value || "").trim(),
    role: (card.querySelector('input[placeholder="Enter role"]')?.value || "").trim(),
    cell: (card.querySelector('input[placeholder="Enter cell"]')?.value || "").trim(),
    email: (card.querySelector('input[type="email"]')?.value || "").trim(),
  });

  const writePocCardValues = (card, p) => {
    const name = card.querySelector('input[placeholder="Enter name"]');
    const role = card.querySelector('input[placeholder="Enter role"]');
    const cell = card.querySelector('input[placeholder="Enter cell"]');
    const email = card.querySelector('input[type="email"]');

    if (name) name.value = p?.name || "";
    if (role) role.value = p?.role || "";
    if (cell) cell.value = p?.cell || "";
    if (email) email.value = p?.email || "";

    [name, role, cell, email].forEach((el) => {
      if (!el) return;
      ensureId(el);
      saveField(el);
      triggerInputChange(el);
    });
  };

  const buildPocCard = (p = null) => {
    const base = document.querySelector('.additional-poc-card[data-base="true"]');
    if (!base) return null;

    const clone = base.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, "poc");

    // remove add (+) button from clones
    clone
      .querySelectorAll("[data-add-poc], .additional-poc-add, .poc-add-btn")
      .forEach((btn) => btn.remove());

    // stop integrated-plus square-right behavior on clones
    const row = clone.querySelector(".checklist-row.integrated-plus");
    if (row) row.classList.remove("integrated-plus");

    const ip = clone.querySelector(".input-plus");
    if (ip) ip.classList.add("mk-solo-input");

    // right-rounded look (safe fallback)
    clone.classList.add("mk-poc-clone", "mk-round-right");
    clone.style.borderTopRightRadius = clone.style.borderTopRightRadius || "18px";
    clone.style.borderBottomRightRadius = clone.style.borderBottomRightRadius || "18px";

    // reset fields + ids
    $$("input, textarea, select", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      saveField(el);
    });

    if (p) writePocCardValues(clone, p);
    return clone;
  };

  const persistAllPocs = () => {
    const clones = cloneState.get();
    clones.pocs = $$(".additional-poc-card")
      .filter((c) => c.getAttribute("data-base") !== "true")
      .map((c) => readPocCardValues(c));
    cloneState.set(clones);
  };

  const addPocCard = () => {
    const base = document.querySelector('.additional-poc-card[data-base="true"]');
    if (!base) return;

    const newCard = buildPocCard(null);
    if (!newCard) return;

    const allCards = $$(".additional-poc-card");
    const last = allCards[allCards.length - 1] || base;
    last.insertAdjacentElement("afterend", newCard);

    persistAllPocs();

    const first = newCard.querySelector(
      'input[placeholder="Enter name"], input, textarea, select'
    );
    if (first) first.focus();
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
    if (!fields.length) {
      return $$("td", tr).map((td) => (td.textContent || "").trim());
    }
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
    const container = footer?.closest(".section-block") || footer?.parentElement;
    const table =
      container?.querySelector?.("table.training-table") || btn.closest("table.training-table");
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

  /* =======================
     NOTES (working version)
  ======================= */
  const Notes = (() => {
    const normalizeNL = (s) => String(s ?? "").replace(/\r\n/g, "\n");
    const getNotesTargetId = (btn) =>
      btn.getAttribute("data-notes-target") ||
      btn.getAttribute("href")?.replace("#", "") ||
      "";

    const ZW0 = "\u200B";
    const ZW1 = "\u200C";
    const WRAP = "\u2060";

    const zwEncode = (plain) => {
      const bytes = new TextEncoder().encode(String(plain));
      let bits = "";
      for (const b of bytes) bits += b.toString(2).padStart(8, "0");
      return bits.replace(/0/g, ZW0).replace(/1/g, ZW1);
    };

    const zwDecode = (zw) => {
      const bits = zw.replaceAll(ZW0, "0").replaceAll(ZW1, "1");
      const bytes = [];
      for (let i = 0; i + 7 < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
      try {
        return new TextDecoder().decode(new Uint8Array(bytes));
      } catch {
        return "";
      }
    };

    const makeMarker = (key) => `${WRAP}${zwEncode(key)}${WRAP}`;

    const extractKeyFromLine = (line) => {
      const s = String(line || "");
      const a = s.indexOf(WRAP);
      if (a < 0) return null;
      const b = s.indexOf(WRAP, a + 1);
      if (b < 0) return null;
      const payload = s.slice(a + 1, b);
      const decoded = zwDecode(payload);
      return decoded || null;
    };

    const cleanupLegacyVisibleKeys = (text) => {
      let v = normalizeNL(text || "");
      v = v.replace(/\s*\[mk:[^\]]+\]\s*/g, "");
      v = v.replace(/\bmk:[A-Za-z0-9:_-]+/g, "");
      return v;
    };

    const getSlotKey = (btn) => {
      const hostId = getNotesTargetId(btn) || "notes";
      const tr = btn.closest("tr");
      if (tr) {
        const table = btn.closest("table") || tr.closest("table");
        const tb = tr.parentElement;
        const rows = tb ? Array.from(tb.querySelectorAll("tr")) : [];
        const idx = rows.indexOf(tr);
        const tKey = table?.getAttribute("data-table-key") || table?.id || "table";
        return `${hostId}::tbl::${tKey}::r${idx}`;
      }
      const all = Array.from(
        document.querySelectorAll(`[data-notes-target="${CSS.escape(hostId)}"]`)
      );
      const idx = all.indexOf(btn);
      return `${hostId}::q::${idx >= 0 ? idx : "x"}`;
    };

    // ✅ Derive prompt text for table rows (Name/Opcode/etc) — no "Name:" prefixes
    const findOrDerivePromptText = (btn) => {
      const tr = btn.closest("tr");
      const table = btn.closest("table");
      const section = getSection(btn);
      const secId = section?.id || "";

      // ===== TABLE ROW NOTES =====
      if (tr && table) {
        // Training Checklist: name input is usually in first cell (checkbox + text)
        if (secId === "training-checklist") {
          const nameInput =
            tr.querySelector('td:first-child input[type="text"]') ||
            tr.querySelector('td:nth-child(2) input[type="text"]');
          const v = (nameInput?.value || "").trim();
          return v || "(blank)";
        }

        // Opcodes: opcode typically in 2nd cell
        if (secId === "opcodes-pricing") {
          const opcodeInput =
            tr.querySelector('td:nth-child(2) input[type="text"]') ||
            tr.querySelector(
              'td:nth-child(2) input:not([type="checkbox"]):not([type="radio"]), td:nth-child(2) select, td:nth-child(2) textarea'
            );
          const v = (opcodeInput?.value || opcodeInput?.textContent || "").trim();
          return v || "(blank)";
        }

        // Generic training tables (Service Advisors, Technicians, Parts, etc):
        // prefer the first text input/select/textarea in the row (usually Name)
        const field =
          tr.querySelector('input[type="text"], input:not([type="checkbox"]):not([type="radio"]), select, textarea') ||
          null;
        const value = (field?.value || field?.textContent || "").trim();
        return value || "Item";
      }

      // ===== NON-TABLE QUESTIONS =====
      const row = btn.closest(".checklist-row");
      const label = row?.querySelector("label");
      return (label?.textContent || "").trim() || "Notes";
    };

    const parseBlocks = (text) => {
      const lines = normalizeNL(text || "").split("\n");
      const blocks = [];
      let cur = null;

      const isMain = (line) => String(line || "").trim().startsWith("•");

      const flush = () => {
        if (cur) blocks.push(cur);
        cur = null;
      };

      for (const line of lines) {
        if (isMain(line)) {
          flush();
          const key = extractKeyFromLine(line);
          cur = { key: key || "__misc__", lines: [line] };
        } else {
          if (!cur) cur = { key: "__misc__", lines: [] };
          cur.lines.push(line);
        }
      }
      flush();
      return blocks;
    };

    const buildBlockLines = (promptText, key) => {
      const main = `• ${promptText}${makeMarker(key)}`;
      const sub = `  ◦ `;
      return [main, sub];
    };

    const rebuildInCanonicalOrder = (targetId, blocks, newlyAddedKey) => {
      const btns = Array.from(
        document.querySelectorAll(`[data-notes-target="${CSS.escape(targetId)}"]`)
      );
      const wanted = btns.map(getSlotKey);

      const map = new Map();
      const miscChunks = [];

      blocks.forEach((b) => {
        if (!b || !b.lines) return;
        if (b.key && b.key !== "__misc__") map.set(b.key, b);
        else miscChunks.push(b.lines.join("\n"));
      });

      const out = [];
      for (const k of wanted) {
        if (map.has(k)) out.push(map.get(k).lines.join("\n"));
      }

      if (newlyAddedKey && !wanted.includes(newlyAddedKey) && map.has(newlyAddedKey)) {
        out.push(map.get(newlyAddedKey).lines.join("\n"));
      }

      const rebuilt = out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
      const miscText = miscChunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();

      if (rebuilt && miscText) return (rebuilt + "\n\n" + miscText).trimEnd();
      if (rebuilt) return rebuilt.trimEnd();
      return miscText.trimEnd();
    };

    const caretAtHollowForKey = (text, key) => {
      const v = normalizeNL(text || "");
      const marker = makeMarker(key);
      const idx = v.indexOf(marker);
      if (idx < 0) return v.length;

      const lineEnd = v.indexOf("\n", idx);
      const afterMain = lineEnd >= 0 ? lineEnd + 1 : v.length;

      const after = v.slice(afterMain);
      const rel = after.indexOf("◦");
      if (rel < 0) return afterMain;
      return afterMain + rel + 2;
    };

    const handleNotesClick = (btn) => {
      const targetId = getNotesTargetId(btn);
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      if (target.classList.contains("is-hidden")) target.classList.remove("is-hidden");
      if (target.hasAttribute("hidden")) target.removeAttribute("hidden");

      const ta = $("textarea", target);
      if (!ta) return;

      const promptText = findOrDerivePromptText(btn);
      const slotKey = getSlotKey(btn);

      preserveScroll(() => {
        ta.value = cleanupLegacyVisibleKeys(ta.value);

        const blocks = parseBlocks(ta.value);
        const exists = blocks.some((b) => b.key === slotKey);

        if (!exists) {
          blocks.push({ key: slotKey, lines: buildBlockLines(promptText, slotKey) });
        }

        ta.value = rebuildInCanonicalOrder(targetId, blocks, slotKey).trimEnd() + "\n";

        const caret = caretAtHollowForKey(ta.value, slotKey);

        try {
          ta.focus({ preventScroll: true });
        } catch {
          ta.focus();
        }
        try {
          ta.setSelectionRange(caret, caret);
        } catch {}

        // visual state
        btn.classList.add("has-notes");
        btn.classList.add("is-notes-active");

        ensureId(ta);
        saveField(ta);
        triggerInputChange(ta);
      });
    };

    const isNotesTargetTextarea = (ta) => {
      if (!ta || !ta.matches || !ta.matches("textarea")) return false;
      const host = ta.closest("[id]");
      if (!host || !host.id) return false;
      return !!document.querySelector(`[data-notes-target="${CSS.escape(host.id)}"]`);
    };

    return { handleNotesClick, isNotesTargetTextarea };
  })();

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
     POC / TRAINER CLONE RESTORE
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
      if (card) base.insertAdjacentElement("afterend", card);
    });
  };

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
     MAP BTN
  ======================= */
  const updateDealershipMap = (address) => {
    const frame =
      $("#dealershipMapFrame") || $(".map-frame iframe") || $(".map-wrapper iframe");
    if (!frame) return;

    const a = String(address || "").trim();
    const q = a ? encodeURIComponent(a) : "United%20States";
    frame.src = `https://www.google.com/maps?q=${q}&z=${a ? 14 : 4}&output=embed`;
  };

  /* =======================
     TABLE EXPAND MODAL
  ======================= */
  const tableModal = {
    modal: null,
    content: null,
    title: null,
    backdrop: null,
    placeholder: null,
    movedNode: null,
    bodyOverflow: "",
  };

  const ensureTableExpandButtons = () => {
    const modal = $("#mkTableModal");
    if (!modal) return;

    $$("div.table-container").forEach((tc) => {
      const footer = tc.parentElement?.querySelector?.(".table-footer");
      const existing =
        $(".mk-table-expand-btn", tc) ||
        (footer ? $(".mk-table-expand-btn", footer) : null);
      if (existing) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-table-expand-btn";
      btn.setAttribute("data-mk-table-expand", "1");
      btn.title = "Expand table";
      btn.textContent = "⤢";

      if (footer) footer.appendChild(btn);
      else tc.appendChild(btn);
    });
  };

  const openTableModalFor = (anyInsideTableContainer) => {
    const modal = $("#mkTableModal");
    if (!modal) return;

    const panel = $(".mk-modal-panel", modal) || modal;
    const content = $(".mk-modal-content", modal);
    const titleEl = $(".mk-modal-title", modal);

    if (!content) return;

    const tableContainer =
      anyInsideTableContainer?.closest?.(".table-container") || $(".table-container");
    if (!tableContainer) return;

    const sectionWrap =
      tableContainer.closest(".section") ||
      tableContainer.closest(".section-block") ||
      tableContainer.parentElement ||
      tableContainer;

    tableModal.modal = modal;
    tableModal.content = content;
    tableModal.title = titleEl;
    tableModal.backdrop = $(".mk-modal-backdrop", modal);

    const header =
      sectionWrap.querySelector?.(".section-header") ||
      (sectionWrap.previousElementSibling?.classList?.contains("section-header")
        ? sectionWrap.previousElementSibling
        : null);

    if (titleEl) titleEl.textContent = (header?.textContent || "Table").trim();

    tableModal.placeholder = document.createComment("mk-table-modal-placeholder");
    sectionWrap.parentNode.insertBefore(tableModal.placeholder, sectionWrap);
    tableModal.movedNode = sectionWrap;

    content.innerHTML = "";
    content.appendChild(sectionWrap);

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    tableModal.bodyOverflow = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";

    try {
      panel.scrollTop = 0;
    } catch {}
  };

  const closeTableModal = () => {
    const modal = tableModal.modal;
    if (!modal) return;

    if (tableModal.movedNode && tableModal.placeholder && tableModal.placeholder.parentNode) {
      tableModal.placeholder.parentNode.insertBefore(tableModal.movedNode, tableModal.placeholder);
      tableModal.placeholder.parentNode.removeChild(tableModal.placeholder);
    }

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = tableModal.bodyOverflow || "";

    tableModal.modal = null;
    tableModal.content = null;
    tableModal.title = null;
    tableModal.backdrop = null;
    tableModal.placeholder = null;
    tableModal.movedNode = null;
  };

  /* =======================
     EVENT DELEGATION
  ======================= */
  document.addEventListener("click", (e) => {
    const t = e.target;

    const navBtn = t.closest(".nav-btn[data-target]");
    if (navBtn) {
      e.preventDefault();
      setActiveSection(navBtn.getAttribute("data-target"));
      return;
    }

    const clearAllBtn = t.closest("#clearAllBtn");
    if (clearAllBtn) {
      e.preventDefault();
      clearAll();
      return;
    }

    const resetBtn = t.closest(".clear-page-btn");
    if (resetBtn) {
      e.preventDefault();
      const section =
        (resetBtn.dataset.clearPage && document.getElementById(resetBtn.dataset.clearPage)) ||
        resetBtn.closest(".page-section");
      clearSection(section);
      return;
    }

    const addTrainerBtn =
      t.closest("[data-add-trainer]") || t.closest("#trainers-deployment .trainer-add-btn");
    if (addTrainerBtn) {
      e.preventDefault();
      addTrainerRow();
      return;
    }

    const pocBtn = t.closest("[data-add-poc], .additional-poc-add, .poc-add-btn");
    if (pocBtn) {
      e.preventDefault();
      e.stopPropagation();
      addPocCard();
      return;
    }

    const addRowBtn = t.closest("button.add-row");
    if (addRowBtn && addRowBtn.closest(".table-footer")) {
      e.preventDefault();
      cloneTableRow(addRowBtn);
      return;
    }

    const notesBtn = t.closest("[data-notes-target], .notes-btn, .notes-icon-btn");
    if (notesBtn && notesBtn.getAttribute("data-notes-target")) {
      e.preventDefault();
      Notes.handleNotesClick(notesBtn);
      return;
    }

    const ticketAddBtn = t.closest(".add-ticket-btn");
    if (ticketAddBtn) {
      e.preventDefault();
      addTicketCard(ticketAddBtn);
      return;
    }

    const mapBtn = t.closest(".small-map-btn, [data-map-btn]");
    if (mapBtn) {
      e.preventDefault();
      const wrap = mapBtn.closest(".address-input-wrap") || mapBtn.parentElement;
      const inp =
        $("input[type='text']", wrap) || $("#dealershipAddressInput") || $("#dealershipAddress");
      updateDealershipMap(inp ? inp.value : "");
      return;
    }

    const expandBtn = t.closest(
      ".mk-table-expand-btn[data-mk-table-expand='1'], .mk-table-expand-btn"
    );
    if (expandBtn) {
      const modal = $("#mkTableModal");
      if (modal) {
        e.preventDefault();
        openTableModalFor(expandBtn);
        return;
      }
    }

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

    if (el.id === "dealershipNameInput") syncDealershipName();

    if (el.closest("#additionalTrainersContainer")) {
      const clones = cloneState.get();
      clones.trainers = $$("#additionalTrainersContainer input[type='text']").map((i) => ({
        value: (i.value || "").trim(),
      }));
      cloneState.set(clones);
    }

    if (
      el.closest(".additional-poc-card") &&
      el.closest(".additional-poc-card")?.getAttribute("data-base") !== "true"
    ) {
      persistAllPocs();
    }

    if (el.matches(".ticket-number-input")) onTicketNumberChange(el);

    const tr = el.closest("tr");
    const table = el.closest("table.training-table");
    if (tr && table && tr.getAttribute(AUTO_ROW_ATTR) === "cloned") {
      persistTable(table);
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;

    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
      setGhostStyles(document);
    }

    if (el.matches(".ticket-status-select")) onTicketStatusChange(el);

    const tr = el.closest("tr");
    const table = el.closest("table.training-table");
    if (tr && table && tr.getAttribute(AUTO_ROW_ATTR) === "cloned") {
      persistTable(table);
    }
  });

  document.addEventListener("keydown", (e) => {
    const el = e.target;

    if (
      e.key === "Enter" &&
      Notes.isNotesTargetTextarea(el) &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.isComposing
    ) {
      e.preventDefault();
      preserveScroll(() => {
        const insert = "\n  ◦ ";
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        el.value = before + insert + after;

        const caret = start + insert.length;
        try {
          el.focus({ preventScroll: true });
          el.setSelectionRange(caret, caret);
        } catch {}

        ensureId(el);
        saveField(el);
        triggerInputChange(el);
      });
      return;
    }

    if (el.id === "additionalTrainerInput" && e.key === "Enter") {
      e.preventDefault();
      addTrainerRow();
      return;
    }

    if (e.key === "Escape") {
      const mkTableModal = $("#mkTableModal");
      if (mkTableModal && mkTableModal.classList.contains("open")) {
        e.preventDefault();
        closeTableModal();
      }
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
    ensureTableExpandButtons();

    /* =======================
       SERVICE ADVISORS TABLE — 3 TOTAL ROWS
       (template row + 2 clones)
    ======================= */
    (() => {
      const section = document.getElementById("service-advisors");
      if (!section) return;

      const addBtn = section.querySelector(".table-footer .add-row");
      const table = section.querySelector("table.training-table");
      const tbody = table?.querySelector("tbody");
      if (!addBtn || !table || !tbody) return;

      // If user already has cloned rows (saved state), do nothing.
      const existingClones = tbody.querySelectorAll(`tr[${AUTO_ROW_ATTR}="cloned"]`).length;
      if (existingClones > 0) return;

      // Add 2 cloned rows => template + 2 = 3 total rows
      addBtn.click();
      addBtn.click();
    })();

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
