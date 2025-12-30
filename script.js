/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (SINGLE SCRIPT / HARDENED / DROP-IN)

   ✅ Sidebar/menu nav works (sections toggle .active)
   ✅ Clear All works (#clearAllBtn)
   ✅ Reset This Page works (.clear-page-btn)  (supports with/without data-clear-page)
   ✅ Add Trainer (+) works (adds row even if blank; no remove buttons)
   ✅ Add POC (+) works (adds ONE card even if blank; moves ALL fields; resets base)
   ✅ Table Add Row (+) works (only when inside .table-footer)
   ✅ Support Tickets: add gating + status routing + status disabled until # entered
   ✅ LocalStorage save/restore (including dynamic clones: trainers, POCs, tables, tickets)

   ✅ NOTES (YOUR REQUEST):
   - Click a Notes button ➜ inserts into the EXISTING big textarea for that card:
       • <Question text>
         ◦  (cursor starts here)
     - Adds a blank line between entries
     - De-dupes: if that • line already exists, it jumps you to its ◦ line instead of adding again
     - Works for normal Q&A rows AND table notes buttons (derives Name/Opcode if possible)
     - ENTER inside that notes textarea inserts a new hollow bullet: "\n  ◦ "
     - Maintains QUESTION ORDER always (inserts into the correct slot by DOM order)

   ✅ NO PAGE SHIFT on notes click:
   - Does NOT scroll to target
   - Preserves scroll position even if focus would normally jump

   ✅ Notes buttons DO NOT stay orange after Reset/Clear:
   - Clears .has-notes in clearSection() and clearAll()

   ✅ Removes the visible internal IDs in notes (no more “[mk:…]”)
   - Uses an INVISIBLE marker to keep stable ordering internally

   ✅ Optional: Table Expand button (.mk-table-expand-btn) opens #mkTableModal if it exists
   ✅ Optional: Map button (.small-map-btn / [data-map-btn]) updates iframe if present
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

  // Preserve scroll position (prevents “page shifting” when focusing/selection changes)
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
        trainers: [], // [{ value }]
        pocs: [], // [{ name, role, cell, email }]
        tables: {}, // { tableKey: [ rows ] }
        tickets: [], // [{ status, num, url, sum }]
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
      .querySelectorAll(".notes-btn.has-notes, .notes-icon-btn.has-notes")
      .forEach((btn) => btn.classList.remove("has-notes"));
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
   NOTES (BULLET INSERT INTO EXISTING BIG TEXTAREA)
   ✅ Maintains QUESTION ORDER always
   ✅ No visible keys (uses zero-width encoding only)
======================= */

// IMPORTANT: DO NOT use data-target fallback here (collides with menu nav buttons).
const getNotesTargetId = (btn) =>
  btn.getAttribute("data-notes-target") || btn.getAttribute("href")?.replace("#", "") || "";

const normalizeNL = (s) => String(s ?? "").replace(/\r\n/g, "\n");

// ---------------------------
// ZERO-WIDTH KEY ENCODING
// (marker contains ONLY invisible chars)
// ---------------------------
const ZW0 = "\u200B"; // zero width space
const ZW1 = "\u200C"; // zero width non-joiner
const ZW_WRAP = "\u2060"; // word joiner (also invisible)

// Encode a plain string into only ZW0/ZW1
const zwEncode = (plain) => {
  const bytes = new TextEncoder().encode(String(plain));
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  return bits.replace(/0/g, ZW0).replace(/1/g, ZW1);
};

const zwDecode = (zw) => {
  const bits = zw.replace(new RegExp(ZW0, "g"), "0").replace(new RegExp(ZW1, "g"), "1");
  const bytes = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  try {
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return "";
  }
};

const makeKeyMarker = (key) => `${ZW_WRAP}${zwEncode(key)}${ZW_WRAP}`;

const extractKeyFromLine = (line) => {
  const s = String(line || "");
  const start = s.indexOf(ZW_WRAP);
  if (start < 0) return null;
  const end = s.indexOf(ZW_WRAP, start + 1);
  if (end < 0) return null;
  const payload = s.slice(start + 1, end); // only zw chars
  const decoded = zwDecode(payload);
  return decoded || null;
};

const stripMarkersFromText = (text) => {
  // 1) Remove any old visible mk tags from earlier builds
  let v = normalizeNL(text || "");
  v = v.replace(/\s*\[mk:[^\]]+\]\s*/g, "");                  // " [mk:...]" style
  v = v.replace(/\bmk:[A-Za-z0-9:_-]+/g, "");                 // "mk:notes-..." style
  // 2) Remove our zero-width markers (keep prompt visible)
  // Remove everything between WRAPs (inclusive)
  const re = new RegExp(`${ZW_WRAP}[\\s\\S]*?${ZW_WRAP}`, "g");
  v = v.replace(re, "");
  // Clean any double spaces created
  v = v.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ");
  return v;
};

// ---------------------------
// Stable key for a question "slot"
// ---------------------------
const getNotesSlotKey = (btn) => {
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

  const row = btn.closest(".checklist-row") || btn.closest(".section-block") || btn;
  const all = Array.from(document.querySelectorAll(`[data-notes-target="${CSS.escape(hostId)}"]`));
  const idx = all.indexOf(btn);

  const labelText =
    (row.querySelector?.("label")?.textContent || btn.textContent || "notes").trim();

  let h = 5381;
  for (let i = 0; i < labelText.length; i++) h = (h * 33) ^ labelText.charCodeAt(i);
  const labelHash = (h >>> 0).toString(16);

  return `${hostId}::q::${idx >= 0 ? idx : "x" + labelHash}`;
};

const findOrDerivePromptText = (btn) => {
  const tr = btn.closest("tr");
  const table = btn.closest("table");
  const section = getSection(btn);
  const secId = section?.id || "";

  if (tr && table) {
    const ths = $$("thead th", table).map((th) => (th.textContent || "").trim().toLowerCase());
    const idxOf = (needle) => ths.findIndex((t) => t.includes(needle));
    let idx = -1;

    if (secId === "training-checklist") idx = idxOf("name");
    if (secId === "opcodes-pricing") idx = idxOf("opcode");

    if (idx < 0 && $$("td", tr).length >= 2) idx = 1;

    if (idx < 0) {
      const tds = $$("td", tr);
      for (let i = 0; i < tds.length; i++) {
        const field = $("input[type='text'], input:not([type]), textarea, select", tds[i]);
        if (field) {
          idx = i;
          break;
        }
      }
    }

    const tds = $$("td", tr);
    const cell = idx >= 0 ? tds[idx] : null;
    let val = "";

    if (cell) {
      const field = $("input, textarea, select", cell);
      if (field) val = (field.value || "").trim();
      else val = (cell.textContent || "").trim();
    }

    const label =
      secId === "training-checklist" ? "Name" : secId === "opcodes-pricing" ? "Opcode" : "Item";

    return val ? `${label}: ${val}` : `${label}: (blank)`;
  }

  const row = btn.closest(".checklist-row");
  const label = row ? row.querySelector("label") : null;
  const labelText = (label?.textContent || "").trim();
  return labelText || "Notes";
};

// ---------------------------
// Parse blocks (main line must contain our invisible marker)
// ---------------------------
const parseNotesBlocks = (value) => {
  const v = normalizeNL(value || "");
  const lines = v.split("\n");

  const blocks = [];
  let cur = null;

  const isMain = (line) => {
    const s = String(line || "");
    return s.trim().startsWith("•") && s.includes(ZW_WRAP);
  };

  const flush = () => {
    if (cur) {
      blocks.push(cur);
      cur = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isMain(line)) {
      flush();
      const key = extractKeyFromLine(line) || "__unknown__";
      cur = { key, lines: [line] };
      continue;
    }

    if (!cur) cur = { key: "__misc__", lines: [] };
    cur.lines.push(line);
  }
  flush();

  return blocks.filter((b) => !(b.key === "__misc__" && b.lines.join("\n").trim() === ""));
};

const buildBlockLines = (promptText, key) => {
  // Visible: • PromptText
  // Invisible: key marker at end of line
  const main = `• ${promptText}${makeKeyMarker(key)}`;
  const sub = `  ◦ `;
  return [main, sub];
};

const rebuildInCanonicalOrder = (targetId, blocks, newlyAddedKey) => {
  const btns = Array.from(document.querySelectorAll(`[data-notes-target="${CSS.escape(targetId)}"]`));
  const wantedKeys = btns.map((b) => getNotesSlotKey(b));

  const map = new Map();
  blocks.forEach((b) => {
    if (b.key && b.key !== "__misc__") map.set(b.key, b);
  });

  const out = [];
  for (const k of wantedKeys) {
    if (map.has(k)) out.push(map.get(k).lines.join("\n"));
  }

  if (newlyAddedKey && !wantedKeys.includes(newlyAddedKey) && map.has(newlyAddedKey)) {
    out.push(map.get(newlyAddedKey).lines.join("\n"));
  }

  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trimEnd();
};

const findCaretForKey = (text, key) => {
  const v = normalizeNL(text || "");
  const marker = makeKeyMarker(key);

  // Find the exact main line containing this invisible marker
  const idx = v.indexOf(marker);
  if (idx < 0) return v.length;

  // Go back to start of the line
  const lineStart = v.lastIndexOf("\n", idx) + 1;
  const lineEnd = v.indexOf("\n", idx);
  const afterMainLinePos = lineEnd >= 0 ? lineEnd + 1 : v.length;

  // Now find the next "◦" after the main line
  const after = v.slice(afterMainLinePos);
  const rel = after.indexOf("◦");
  if (rel < 0) return afterMainLinePos;
  return afterMainLinePos + rel + 2; // after "◦ "
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
  const slotKey = getNotesSlotKey(btn);

  preserveScroll(() => {
    // ONE-TIME CLEANUP of old visible mk junk + strip any old markers
    ta.value = stripMarkersFromText(ta.value);

    // Parse blocks from current content (after cleanup, none will match "isMain" yet)
    // So we rebuild from scratch using storage-inside-text via invisible markers going forward.
    let blocks = parseNotesBlocks(ta.value);

    // If no blocks exist (likely right after cleanup), we treat ta as empty blocks:
    // We only add blocks via notes clicks.
    const exists = blocks.some((b) => b.key === slotKey);

    if (!exists) {
      const lines = buildBlockLines(promptText, slotKey);
      blocks.push({ key: slotKey, lines });
    }

    // Rebuild in canonical order
    const rebuilt = rebuildInCanonicalOrder(targetId, blocks, slotKey);
    ta.value = rebuilt ? rebuilt + "\n" : "";

    // Focus caret at this slot’s hollow bullet
    const caret = findCaretForKey(ta.value, slotKey);
    try {
      ta.focus({ preventScroll: true });
    } catch {
      ta.focus();
    }
    try {
      ta.setSelectionRange(caret, caret);
    } catch {}

    // Visual state
    btn.classList.add("has-notes");

    // Persist
    ensureId(ta);
    saveField(ta);
    triggerInputChange(ta);
  });
};

// Detect if a textarea is a “notes big textbox” target (only ones referenced by notes buttons)
const isNotesTargetTextarea = (ta) => {
  if (!ta || !ta.matches || !ta.matches("textarea")) return false;
  const host = ta.closest("[id]");
  if (!host || !host.id) return false;
  return !!document.querySelector(`[data-notes-target="${CSS.escape(host.id)}"]`);
};

  // Parse existing notes blocks into {key, lines[]}
  // Supports BOTH:
  //   old: "• Prompt [mk:key]"
  //   new: "• Prompt<INVISIBLE mk:key>"
  const parseNotesBlocks = (value) => {
    const v = normalizeNL(value || "");
    const lines = v.split("\n");

    const blocks = [];
    let cur = null;

    const oldKeyRe = /^\s*•\s*(.*?)\s*\[mk:(.+?)\]\s*$/;
    const newKeyRe = new RegExp(
      `^\\s*•\\s*(.*?)\\s*${MK_MARK}mk:(.+?)${MK_MARK}\\s*$`
    );

    const isMain = (line) => oldKeyRe.test(line) || newKeyRe.test(line);

    const extractKey = (line) => {
      const m1 = line.match(oldKeyRe);
      if (m1) return { prompt: m1[1], key: m1[2] };
      const m2 = line.match(newKeyRe);
      if (m2) return { prompt: m2[1], key: m2[2] };
      return null;
    };

    const flush = () => {
      if (cur) {
        blocks.push(cur);
        cur = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isMain(line)) {
        flush();
        const ex = extractKey(line);
        cur = { key: ex ? ex.key : "__unknown__", lines: [line] };
        continue;
      }

      if (!cur) cur = { key: "__misc__", lines: [] };
      cur.lines.push(line);
    }
    flush();

    return blocks.filter((b) => !(b.key === "__misc__" && b.lines.join("\n").trim() === ""));
  };

  const buildBlock = (promptText, key) => {
    // ✅ NO visible [mk:...] — marker is invisible but parseable
    const main = `• ${stripKeyMarkers(promptText)}${makeKeyMarker(key)}`;
    const sub = `  ◦ `;
    return `${main}\n${sub}`;
  };

  const rebuildInCanonicalOrder = (targetId, blocks, newlyAddedKey) => {
    const btns = Array.from(document.querySelectorAll(`[data-notes-target="${CSS.escape(targetId)}"]`));
    const wantedKeys = btns.map((b) => getNotesSlotKey(b));

    const map = new Map();
    blocks.forEach((b) => {
      if (b.key && b.key !== "__misc__") map.set(b.key, b);
    });

    const out = [];
    for (const k of wantedKeys) {
      if (map.has(k)) out.push(map.get(k).lines.join("\n"));
    }

    if (newlyAddedKey && !wantedKeys.includes(newlyAddedKey) && map.has(newlyAddedKey)) {
      out.push(map.get(newlyAddedKey).lines.join("\n"));
    }

    return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  };

  const findCaretForKey = (text, key) => {
    const v = normalizeNL(text || "");

    // match either old bracket style OR new invisible marker style
    const re = new RegExp(
      `^\\s*•.*(?:\\[mk:${escapeRegex(key)}\\]|${MK_MARK}mk:${escapeRegex(key)}${MK_MARK})\\s*$`,
      "m"
    );

    const m = v.match(re);
    if (!m || typeof m.index !== "number") return v.length;

    const mainStart = m.index;
    const mainEnd = mainStart + m[0].length;

    // look for the next "◦" after the main line
    const after = v.slice(mainEnd);
    const nextNl = after.indexOf("\n");
    if (nextNl < 0) return v.length;

    const rest = after.slice(nextNl + 1);
    const rel = rest.indexOf("◦");
    if (rel < 0) return mainEnd + 1;

    return mainEnd + 1 + nextNl + 1 + rel + 2; // after "◦ "
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
    const slotKey = getNotesSlotKey(btn);

    preserveScroll(() => {
      const blocks = parseNotesBlocks(ta.value);
      const exists = blocks.some((b) => b.key === slotKey);

      if (!exists) {
        blocks.push({ key: slotKey, lines: buildBlock(promptText, slotKey).split("\n") });
        btn.classList.add("has-notes");
      }

      const rebuilt = rebuildInCanonicalOrder(targetId, blocks, slotKey);
      ta.value = rebuilt ? rebuilt + "\n" : "";

      const caret = findCaretForKey(ta.value, slotKey);

      try {
        ta.focus({ preventScroll: true });
      } catch {
        ta.focus();
      }
      try {
        ta.setSelectionRange(caret, caret);
      } catch {}

      ensureId(ta);
      saveField(ta);
      triggerInputChange(ta);
    });
  };

  // Detect if a textarea is the “notes big textbox” target (ones referenced by notes buttons)
  const isNotesTargetTextarea = (ta) => {
    if (!ta || !ta.matches || !ta.matches("textarea")) return false;
    const host = ta.closest("[id]");
    if (!host || !host.id) return false;
    return !!document.querySelector(`[data-notes-target="${CSS.escape(host.id)}"]`);
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
     DEALERSHIP NAME DISPLAY (top bar)
  ======================= */
  const syncDealershipName = () => {
    const input = $("#dealershipNameInput");
    const display = $("#dealershipNameDisplay");
    if (!input || !display) return;
    display.textContent = (input.value || "").trim();
  };

  /* =======================
     DEALERSHIP MAP BUTTON (optional)
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
     TABLE EXPAND MODAL (optional)
  ======================= */
  const tableModal = {
    modal: null,
    content: null,
    title: null,
    closeBtn: null,
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
    const backdrop = $(".mk-modal-backdrop", modal);

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
    tableModal.backdrop = backdrop;

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

    // RESET THIS PAGE (supports with/without data-clear-page)
    const resetBtn = t.closest(".clear-page-btn");
    if (resetBtn) {
      e.preventDefault();
      const section =
        (resetBtn.dataset.clearPage && document.getElementById(resetBtn.dataset.clearPage)) ||
        resetBtn.closest(".page-section");
      clearSection(section);
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
    const pocBtn = t.closest("[data-add-poc], .additional-poc-add, .poc-add-btn");
    if (pocBtn) {
      e.preventDefault();
      e.stopPropagation();
      addPocCard(pocBtn);
      return;
    }

    // TABLE ADD ROW: ONLY inside footer
    const addRowBtn = t.closest("button.add-row");
    if (addRowBtn && addRowBtn.closest(".table-footer")) {
      e.preventDefault();
      cloneTableRow(addRowBtn);
      return;
    }

    // NOTES buttons (ONLY those with data-notes-target)
    const notesBtn = t.closest("[data-notes-target], .notes-btn, .notes-icon-btn");
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

    // DEALERSHIP MAP BTN
    const mapBtn = t.closest(".small-map-btn, [data-map-btn]");
    if (mapBtn) {
      e.preventDefault();
      const wrap = mapBtn.closest(".address-input-wrap") || mapBtn.parentElement;
      const inp =
        $("input[type='text']", wrap) || $("#dealershipAddressInput") || $("#dealershipAddress");
      updateDealershipMap(inp ? inp.value : "");
      return;
    }

    // TABLE EXPAND BTN
    const expandBtn = t.closest(".mk-table-expand-btn[data-mk-table-expand='1'], .mk-table-expand-btn");
    if (expandBtn) {
      const modal = $("#mkTableModal");
      if (modal) {
        e.preventDefault();
        openTableModalFor(expandBtn);
        return;
      }
    }

    // TABLE MODAL close (backdrop or close button)
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

    // persist trainers on changes
    if (el.closest("#additionalTrainersContainer")) {
      const clones = cloneState.get();
      clones.trainers = $$("#additionalTrainersContainer input[type='text']").map((i) => ({
        value: (i.value || "").trim(),
      }));
      cloneState.set(clones);
    }

    // persist pocs on changes (non-base)
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

    if (el.matches(".ticket-number-input")) onTicketNumberChange(el);

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

    if (el.matches(".ticket-status-select")) onTicketStatusChange(el);
  });

  document.addEventListener("keydown", (e) => {
    const el = e.target;
    if (!isEl(el)) return;

    // ENTER in Notes textarea => auto hollow bullet
    if (
      e.key === "Enter" &&
      isNotesTargetTextarea(el) &&
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

    // Enter adds Trainer row
    if (el.id === "additionalTrainerInput" && e.key === "Enter") {
      e.preventDefault();
      addTrainerRow();
      return;
    }

    // Enter on POC name adds POC card
    if (el.id === "additionalPocInput" && e.key === "Enter") {
      e.preventDefault();
      const btn = el
        .closest(".additional-poc-card")
        ?.querySelector("[data-add-poc], .additional-poc-add, .poc-add-btn");
      if (btn) addPocCard(btn);
      return;
    }

    // Esc closes table modal if open
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

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
