/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (SINGLE SCRIPT / HARDENED / DROP-IN)

   ✅ Sidebar/menu nav works (sections toggle .active)
   ✅ Clear All works (#clearAllBtn)
   ✅ Reset This Page works (.clear-page-btn[data-clear-page])
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

   ✅ Optional: Table Expand button (.mk-table-expand-btn) opens #mkTableModal if it exists
   ✅ Optional: Map button (.small-map-btn) updates iframe if present

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
        !sel.value ||
        (first && first.dataset?.ghost === "true" && sel.value === "");
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
    // Trainers added rows
    const trainerContainer = $("#additionalTrainersContainer", root);
    if (trainerContainer) trainerContainer.innerHTML = "";

    // POCs: remove non-base cards
    $$(".additional-poc-card", root).forEach((card) => {
      if (card.getAttribute("data-base") === "true") return;
      card.remove();
    });

    // Tables: remove cloned rows
    $$("table.training-table tbody", root).forEach((tb) => {
      $$("tr", tb).forEach((tr) => {
        if (tr.getAttribute(AUTO_ROW_ATTR) === "cloned") tr.remove();
      });
    });

    // Tickets: remove non-base
    $$(".ticket-group", root).forEach((g) => {
      if (g.getAttribute("data-base") === "true") return;
      g.remove();
    });
  };

  const clearFieldsIn = (root = document) => {
    // inputs
    root.querySelectorAll("input").forEach((inp) => {
      const type = (inp.type || "").toLowerCase();
      if (["button", "submit", "reset", "hidden"].includes(type)) return;
      if (type === "checkbox" || type === "radio") {
        inp.checked = false;
      } else {
        inp.value = "";
      }
      triggerInputChange(inp);
    });

    // textareas
    root.querySelectorAll("textarea").forEach((ta) => {
      ta.value = "";
      triggerInputChange(ta);
    });

    // selects
    root.querySelectorAll("select").forEach((sel) => {
      sel.selectedIndex = 0;
      triggerInputChange(sel);
    });

    // contenteditable
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

    // reset map
    const map = $("#dealershipMapFrame");
    if (map) map.src = "https://www.google.com/maps?q=United%20States&z=4&output=embed";

    // reset dealership name display
    const disp = $("#dealershipNameDisplay");
    if (disp) disp.textContent = "";

    cloneState.clearAll();

    log("Clear All complete");
  };

  const clearSection = (sectionEl) => {
    if (!sectionEl) return;

    // remove saved field keys for this section only
    const state = readState();
    state.__fields = state.__fields || {};
    $$(`[${AUTO_ID_ATTR}]`, sectionEl).forEach((el) => {
      const id = el.getAttribute(AUTO_ID_ATTR);
      delete state.__fields[id];
    });

    // remove clone state related to section
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

    // remove “has-notes” visual state for buttons inside this section (optional)
    $$(".notes-btn.has-notes, .notes-icon-btn.has-notes", sectionEl).forEach((b) =>
      b.classList.remove("has-notes")
    );

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

    const name = (input.value || "").trim(); // allowed blank
    const row = buildTrainerRow(name);
    container.appendChild(row);

    // persist clone
    const clones = cloneState.get();
    clones.trainers.push({ value: name });
    cloneState.set(clones);

    // reset base
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

    // assign IDs + save
    $$("input, select, textarea", newCard).forEach((el) => {
      ensureId(el);
      saveField(el);
    });

    return newCard;
  };

  const addPocCard = (btn) => {
    const baseCard = getBasePocCard(btn);
    if (!baseCard) return;

    // hard stop double-fire
    if (btn && btn.dataset.mkBusy === "1") return;
    if (btn) {
      btn.dataset.mkBusy = "1";
      setTimeout(() => (btn.dataset.mkBusy = "0"), 0);
    }

    const { els, values } = readPocBaseValues(baseCard);

    // insert after base card within same grid
    const newCard = buildPocCard(values);
    baseCard.insertAdjacentElement("afterend", newCard);

    // persist clone
    const clones = cloneState.get();
    clones.pocs.push(values);
    cloneState.set(clones);

    // reset base fields
    if (els.nameEl) els.nameEl.value = "";
    if (els.roleEl) els.roleEl.value = "";
    if (els.cellEl) els.cellEl.value = "";
    if (els.emailEl) els.emailEl.value = "";

    [els.nameEl, els.roleEl, els.cellEl, els.emailEl].forEach(triggerInputChange);

    // focus base name again
    if (els.nameEl) els.nameEl.focus();
  };

  /* =======================
     TABLE: ADD ROW (+) + RESTORE
  ======================= */
  const getTableKey = (table) => {
    // Prefer data-table-key if you have it; fallback to id; else stable-ish key from header text.
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
    if (!footer) return; // critical: prevents random buttons from triggering

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

    // clear values
    $$("input, select, textarea", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      saveField(el);
    });

    tbody.appendChild(clone);

    // persist clone row structure
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

      // Use last existing row as template
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
======================= */
  const getNotesTargetId = (btn) =>
    btn.getAttribute("data-notes-target") ||
    btn.getAttribute("data-target") ||
    btn.getAttribute("href")?.replace("#", "") ||
    "";

  const normalizeNL = (s) => String(s ?? "").replace(/\r\n/g, "\n");

  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const findOrDerivePromptText = (btn) => {
    // If inside a table row, try to derive Name/Opcode/etc.
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

      // fallback: use second column if it exists
      if (idx < 0 && $$("td", tr).length >= 2) idx = 1;

      // fallback: first cell with a text-ish field
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
        secId === "training-checklist"
          ? "Name"
          : secId === "opcodes-pricing"
          ? "Opcode"
          : "Item";

      return val ? `${label}: ${val}` : `${label}: (blank)`;
    }

    // Normal Q&A row label
    const row = btn.closest(".checklist-row");
    const label = row ? row.querySelector("label") : null;
    const labelText = (label?.textContent || "").trim();
    return labelText || "Notes";
  };

  const insertNotesTemplate = (ta, promptText) => {
    const mainLine = `• ${promptText}`;
    const subLine = `  ◦ `;

    let v = normalizeNL(ta.value || "");

    // If main bullet already exists, jump to its ◦ line (or create it)
    const mainRe = new RegExp(`^${escapeRegex(mainLine)}\\s*$`, "m");
    const mainMatch = v.match(mainRe);

    if (mainMatch && typeof mainMatch.index === "number") {
      // find where that line starts
      const startIdx = mainMatch.index;
      const afterMainIdx = startIdx + mainMatch[0].length;

      // look for the next line after main
      const tail = v.slice(afterMainIdx);
      const nextLineMatch = tail.match(/^\n([^\n]*)/);
      const nextLine = nextLineMatch ? nextLineMatch[1] : "";

      // if next line already starts with "  ◦", place cursor after it
      if (nextLine.trim().startsWith("◦")) {
        const pos = afterMainIdx + 1 + nextLine.length; // end of that line
        return { value: v, caret: pos };
      }

      // otherwise, inject a sub bullet line right after main line
      let insertAt = afterMainIdx;
      // ensure exactly one newline after main line
      if (!v.slice(insertAt).startsWith("\n")) {
        v = v.slice(0, insertAt) + "\n" + v.slice(insertAt);
        insertAt += 1;
      }
      v = v.slice(0, insertAt + 1) + subLine + "\n" + v.slice(insertAt + 1);
      const caret = insertAt + 1 + subLine.length;
      return { value: v, caret };
    }

    // Otherwise append at end with spacing
    if (v.trim().length > 0) {
      v = v.replace(/[ \t]+$/gm, "");
      if (!/\n\s*\n$/.test(v)) v = v.replace(/\s*$/, "") + "\n\n";
    } else {
      v = "";
    }

    v += `${mainLine}\n${subLine}`;
    return { value: v, caret: v.length };
  };

  const handleNotesClick = (btn) => {
    const targetId = getNotesTargetId(btn);
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    if (target.classList.contains("is-hidden")) target.classList.remove("is-hidden");
    if (target.hasAttribute("hidden")) target.removeAttribute("hidden");

    const ta = $("textarea", target);
    if (!ta) {
      scrollIntoViewNice(target);
      return;
    }

    const promptText = findOrDerivePromptText(btn);
    const res = insertNotesTemplate(ta, promptText);

    ta.value = res.value;

    // Focus + cursor
    scrollIntoViewNice(target);
    ta.focus();
    ta.setSelectionRange(res.caret, res.caret);

    // Persist
    ensureId(ta);
    saveField(ta);
    setGhostStyles(document);

    // Visual state (optional)
    btn.classList.add("has-notes");
  };

   /* =======================
   NOTES: Enter => auto hollow bullet
   - When typing inside a notes textarea (the big textbox inside the notes target card),
     pressing Enter inserts: "\n  ◦ " and places cursor after it.
======================= */

const isNotesTargetTextarea = (ta) => {
  if (!ta || !ta.matches || !ta.matches("textarea")) return false;

  // Primary: your notes target cards are referenced by data-notes-target on the button
  // This checks if the textarea is inside an element that is a notes target in your system.
  const notesTargetHost = ta.closest("[id]");
  if (!notesTargetHost) return false;

  // If ANY notes button points to this host id, treat this textarea as a notes textarea
  const hostId = notesTargetHost.id;
  if (!hostId) return false;

  return !!document.querySelector(`[data-notes-target="${CSS.escape(hostId)}"]`);
};

document.addEventListener("keydown", (e) => {
  const ta = e.target;
  if (!isNotesTargetTextarea(ta)) return;

  if (e.key !== "Enter") return;
  if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return; // keep Shift+Enter etc normal

  // Insert newline + hollow bullet at caret (not at end)
  e.preventDefault();

  const insert = "\n  ◦ ";
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;

  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);

  ta.value = before + insert + after;

  const caret = start + insert.length;
  ta.setSelectionRange(caret, caret);

  // Persist + trigger your existing save flows
  ensureId(ta);
  saveField(ta);
  triggerInputChange(ta);
});

/* =======================
   NOTES POPOVER HANDLING
   (NO LAYOUT SHIFT)
======================= */

document.addEventListener("click", (e) => {
  const notesBtn = e.target.closest("[data-notes-target]");
  if (!notesBtn) return;

  e.preventDefault();
  e.stopPropagation();

  const targetId = notesBtn.dataset.notesTarget;
  const panel = document.getElementById(targetId);
  if (!panel) return;

  // Close all other open notes panels
  document.querySelectorAll(".notes-panel.open").forEach((p) => {
    if (p !== panel) p.classList.remove("open");
  });

  panel.classList.toggle("open");
});

// Click anywhere else closes notes
document.addEventListener("click", () => {
  document
    .querySelectorAll(".notes-panel.open")
    .forEach((p) => p.classList.remove("open"));
});

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

    // persist
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

    // clear existing non-base
    $$(".ticket-group", document).forEach((g) => {
      if (g.getAttribute("data-base") !== "true") g.remove();
    });

    clones.tickets.forEach((t) => {
      const clone = buildTicketCloneFromBase(base);

      // fill values
      $(".ticket-number-input", clone).value = t.num || "";
      $(".ticket-zendesk-input", clone).value = t.url || "";
      $(".ticket-summary-input", clone).value = t.sum || "";

      const statusSel = $(".ticket-status-select", clone);
      if (statusSel) {
        statusSel.value = t.status || "Open";
        statusSel.disabled = !(t.num || "").trim();
        saveField(statusSel);
      }

      // save fields
      $$("input, textarea, select", clone).forEach((el) => saveField(el));

      // route
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

    // remove existing non-base
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
    const frame = $("#dealershipMapFrame") || $(".map-frame iframe") || $(".map-wrapper iframe");
    if (!frame) return;

    const a = String(address || "").trim();
    const q = a ? encodeURIComponent(a) : "United%20States";
    frame.src = `https://www.google.com/maps?q=${q}&z=${a ? 14 : 4}&output=embed`;
  };

  /* =======================
     TABLE EXPAND MODAL (optional)
     - Moves the closest .section containing the table into #mkTableModal
     - Restores it back on close (no clones, no state loss)
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
    if (!modal) return; // only inject if modal exists in HTML

    $$("div.table-container").forEach((tc) => {
      // prefer footer button
      const footer = tc.parentElement?.querySelector?.(".table-footer");
      const existing =
        $(".mk-table-expand-btn", tc) || (footer ? $(".mk-table-expand-btn", footer) : null);
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
    const closeBtn = $(".mk-modal-close", modal);
    const backdrop = $(".mk-modal-backdrop", modal);

    if (!content) return;

    const tableContainer =
      anyInsideTableContainer?.closest?.(".table-container") || $(".table-container");
    if (!tableContainer) return;

    // pick a stable “section” wrapper to move (keeps header + footer together if wrapped)
    const sectionWrap =
      tableContainer.closest(".section") ||
      tableContainer.closest(".section-block") ||
      tableContainer.parentElement ||
      tableContainer;

    // Store refs for close
    tableModal.modal = modal;
    tableModal.content = content;
    tableModal.title = titleEl;
    tableModal.closeBtn = closeBtn;
    tableModal.backdrop = backdrop;

    // Set title from nearest header
    const header =
      sectionWrap.querySelector?.(".section-header") ||
      sectionWrap.previousElementSibling?.classList?.contains("section-header")
        ? sectionWrap.previousElementSibling
        : null;

    if (titleEl) titleEl.textContent = (header?.textContent || "Table").trim();

    // Make placeholder and move
    tableModal.placeholder = document.createComment("mk-table-modal-placeholder");
    sectionWrap.parentNode.insertBefore(tableModal.placeholder, sectionWrap);
    tableModal.movedNode = sectionWrap;

    content.innerHTML = "";
    content.appendChild(sectionWrap);

    // open
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    tableModal.bodyOverflow = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";

    // scroll panel top
    try {
      panel.scrollTop = 0;
    } catch {}
  };

  const closeTableModal = () => {
    const modal = tableModal.modal;
    if (!modal) return;

    // move node back
    if (tableModal.movedNode && tableModal.placeholder && tableModal.placeholder.parentNode) {
      tableModal.placeholder.parentNode.insertBefore(tableModal.movedNode, tableModal.placeholder);
      tableModal.placeholder.parentNode.removeChild(tableModal.placeholder);
    }

    // close
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = tableModal.bodyOverflow || "";

    // cleanup
    tableModal.modal = null;
    tableModal.content = null;
    tableModal.title = null;
    tableModal.closeBtn = null;
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

    // NOTES buttons (Q&A + table notes)
    const notesBtn = t.closest("[data-notes-btn], [data-notes-target], .notes-btn, .notes-icon-btn");
    if (notesBtn) {
      const targetId = getNotesTargetId(notesBtn);
      if (targetId) {
        e.preventDefault();
        handleNotesClick(notesBtn);
        return;
      }
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
      if (t.closest("#mkTableModal .mk-modal-close") || t.closest("#mkTableModal .mk-modal-backdrop")) {
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
    if (el.closest(".additional-poc-card") && el.closest(".additional-poc-card")?.getAttribute("data-base") !== "true") {
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
    // IDs for existing fields
    assignIdsToAllFields();

    // NAV first
    initNav();

    // rebuild dynamic clones
    rebuildTrainerClones();
    rebuildPocClones();
    rebuildTableClones();
    rebuildTicketClones();

    // restore saved values (after clones)
    restoreAllFields();

    // ticket status disabled until number entered (base + clones)
    $$(".ticket-group").forEach((card) => {
      const num = $(".ticket-number-input", card);
      const status = $(".ticket-status-select", card);
      if (num && status) status.disabled = !(num.value || "").trim();
      if (num) ensureId(num);
      if (status) ensureId(status);
    });

    // ghost styles
    setGhostStyles(document);

    // initial dealership name display
    syncDealershipName();

    // inject table expand buttons if modal exists
    ensureTableExpandButtons();

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
