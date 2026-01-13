/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (SINGLE SCRIPT / HARDENED / DROP-IN)
   CONSISTENT ADD BUTTONS (v8.3.3)

   ✅ Fixes in THIS build:
   - Trainer "+" works with:
       [data-add-trainer] OR .trainer-add-btn
   - Enter on #additionalTrainerInput adds the trainer
   - POC "+" works with:
       [data-add-poc] OR .poc-add-btn (and appends into #additionalPocsContainer)
   - Ticket "+" works (base card only)
   - Table "+ Add Row" works
   - Clear All / Clear Page works
   - State save/restore works (stable keys)
   - Ghost placeholder styles for selects + dates
   - End date auto-set (+3 days from onsite start when empty)
   - Expand buttons injected (events fired: mk:expandTable / mk:expandNotes)

======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v8_3_3";
  const AUTO_ID_ATTR = "data-mk-id";
  const AUTO_ROW_ATTR = "data-mk-row";
  const AUTO_CARD_ATTR = "data-mk-card";

  const DEBUG = false;
  const log = (...args) => (DEBUG ? console.log("[mk]", ...args) : void 0);

  // ====== TOPBAR + SUMMARY SOURCE FIELD IDS ======
  const MK_IDS = {
    dealershipName: ["dealershipNameInput"],
    did: ["dealershipDidInput"],
    dealerGroup: ["dealerGroupInput"],

    onsiteDate: ["onsiteStartDate", "onsiteTrainingDate", "onsiteDate", "onsiteTrainingStartDate", "trainingStartDate"],
    trainingEndDate: ["onsiteEndDate", "trainingEndDate", "endDate", "onsiteTrainingEndDate"],

    leadTrainer: [
      "leadTrainerSelect",
      "leadTrainerInput",
      "leadTrainer",
      "trainerLeadInput",
      "primaryTrainerInput",
    ],
  };

  // ====== SUMMARY PAGE IDS (Engagement Snapshot) ======
  const MK_SUMMARY_IDS = {
    did: "mkSum_did_2",
    dealership: "mkSum_dealership_2",
    dealerGroup: "mkSum_dealerGroup_2",
    dateStart: "mkSum_dateStart",
    dateEnd: "mkSum_dateEnd",
    leadTrainer: "mkSum_leadTrainer",

    addlStack: "mkSum_addlTrainersStack",
    addlBase: "mkSum_addTrainer_0",
    addlRow: "mkSum_addlTrainersRow",
  };

  /* =======================
     HELPERS
  ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const isEl = (x) => x && x.nodeType === 1;
  const getSection = (el) => el?.closest?.(".page-section") || el?.closest?.("section") || null;

  const isFormField = (el) =>
    isEl(el) && (el.matches("input, select, textarea") || el.matches("[contenteditable='true']"));

  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_:-]/g, "")
      .slice(0, 80);

  const getIndexWithin = (el, selector, root) => {
    try {
      const list = Array.from((root || document).querySelectorAll(selector));
      return Math.max(0, list.indexOf(el));
    } catch {
      return 0;
    }
  };

  const mkDomPath = (el, maxDepth = 5) => {
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < maxDepth && cur !== document.body) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (!parent) break;

      const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
      const idx = sibs.indexOf(cur);
      parts.push(`${tag}:nth-of-type(${idx + 1})`);
      cur = parent;
      depth++;
    }
    return parts.reverse().join(">");
  };

  const inDynamicClone = (el) => {
    if (!el) return false;

    if (el.closest("#additionalTrainersContainer") || el.closest("[data-mk-addl-trainers-container]")) return true;

    const pocCard = el.closest(".additional-poc-card");
    if (pocCard && pocCard.getAttribute("data-base") !== "true") return true;

    const tr = el.closest("tr");
    if (tr && tr.getAttribute(AUTO_ROW_ATTR) === "cloned") return true;

    const ticket = el.closest(".ticket-group");
    if (ticket && ticket.getAttribute("data-base") !== "true") return true;

    return false;
  };

  const stableFieldKey = (el) => {
    if (!isEl(el)) return "";
    if (el.id) return `id:${el.id}`;

    const sectionId = getSection(el)?.id || "root";

    const table = el.closest("table.training-table");
    if (table) {
      const key =
        table.getAttribute("data-table-key") ||
        table.id ||
        `table-${getIndexWithin(table, "table.training-table", document)}`;

      const td = el.closest("td, th");
      const tr = el.closest("tr");
      const tbody = tr?.parentElement;

      const rowIndex = tr && tbody ? Array.from(tbody.querySelectorAll("tr")).indexOf(tr) : 0;
      const colIndex = td && tr ? Array.from(tr.children).indexOf(td) : 0;

      const withinCell = td
        ? Array.from(td.querySelectorAll("input,select,textarea,[contenteditable='true']")).indexOf(el)
        : 0;

      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();

      return `sec:${sectionId}|tbl:${key}|r:${rowIndex}|c:${colIndex}|f:${withinCell}|${tag}|${type}`;
    }

    const row = el.closest(".checklist-row");
    if (row) {
      const lab = row.querySelector("label");
      const labelSlug = slug(lab?.textContent || "row");
      const fields = Array.from(row.querySelectorAll("input,select,textarea,[contenteditable='true']"));
      const idx = Math.max(0, fields.indexOf(el));
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute("type") || "").toLowerCase();
      const ph = slug(el.getAttribute("placeholder") || "");
      return `sec:${sectionId}|row:${labelSlug}|i:${idx}|${tag}|${type}|ph:${ph}`;
    }

    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute("type") || "").toLowerCase();
    return `sec:${sectionId}|path:${mkDomPath(el)}|${tag}|${type}`;
  };

  const ensureId = (el) => {
    if (!isEl(el)) return null;
    if (!el.getAttribute(AUTO_ID_ATTR)) {
      const key = stableFieldKey(el);
      if (key) el.setAttribute(AUTO_ID_ATTR, key);
    }
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
    if (inDynamicClone(el)) return;
    ensureId(el);
    const id = el.getAttribute(AUTO_ID_ATTR);
    if (!id) return;

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
      if (!isFormField(el)) return;
      if (inDynamicClone(el)) return;

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
      const isGhost = !sel.value || (first && first.dataset?.ghost === "true" && sel.value === "");
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

  const mkFirstValueByIds = (...ids) => {
    for (const id of ids.flat()) {
      const el = document.getElementById(id);
      if (!el) continue;
      const v = (el.value || "").trim();
      if (v) return v;
    }
    return "";
  };

  const mkFormatTopbarTitle = ({ did, dealerGroup, dealership }) => {
    const d = String(did || "").trim();
    const g = String(dealerGroup || "").trim();
    const n = String(dealership || "").trim();

    if (!d && !n) return "";
    if (!d) return n;
    if (g) return `DID - ${d} ${g} ${n}`.replace(/\s+/g, " ").trim();
    return `DID - ${d} ${n}`.replace(/\s+/g, " ").trim();
  };

  const mkSyncTopbarTitle = () => {
    const display = document.getElementById("dealershipNameDisplay");
    if (!display) return;

    const dealership = mkFirstValueByIds(MK_IDS.dealershipName);
    const did = mkFirstValueByIds(MK_IDS.did);
    const dealerGroup = mkFirstValueByIds(MK_IDS.dealerGroup);

    display.textContent = mkFormatTopbarTitle({ did, dealerGroup, dealership });
  };

  /* =======================
     POPUP (tiny)
  ======================= */
  const mkPopup = (() => {
    const STYLE_ID = "mk-popup-style-v1";
    let active = null;

    const ensureStyles = () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-pop-backdrop{position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:100000;
          display:flex; align-items:flex-start; justify-content:center; padding-top:110px;}
        .mk-pop-box{width:min(520px, calc(100vw - 28px)); background:#fff; border:1px solid rgba(0,0,0,.10);
          border-radius:18px; box-shadow:0 18px 50px rgba(0,0,0,.25); overflow:hidden;}
        .mk-pop-head{background:#EF6D22; color:#fff; padding:10px 16px; font-weight:900;
          display:flex; align-items:center; justify-content:space-between;}
        .mk-pop-title{font-size:15px;}
        .mk-pop-body{padding:14px 16px 8px; color:#111827; font-size:13px; line-height:1.45; white-space:pre-wrap;}
        .mk-pop-actions{padding:12px 16px 14px; display:flex; justify-content:flex-end; gap:10px;}
        .mk-pop-btn{border:none; cursor:pointer; height:34px; padding:0 16px; border-radius:999px; font-weight:900;
          font-size:12px; letter-spacing:.08em; text-transform:uppercase; display:inline-flex; align-items:center; justify-content:center;}
        .mk-pop-btn--ok{background:#EF6D22; color:#fff; box-shadow:0 3px 10px rgba(239,109,34,.35);}
        .mk-pop-btn--ok:hover{background:#ff8b42;}
        .mk-pop-btn--cancel{background:#f3f4f6; color:#111827; border:1px solid rgba(0,0,0,.10);}
        .mk-pop-btn--cancel:hover{background:#e5e7eb;}
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

    const open = ({ title = "Notice", message = "", okText = "OK", cancelText = "", onOk, onCancel } = {}) => {
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

      head.appendChild(t);
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

    const ok = (message, opts = {}) => open({ title: opts.title || "Notice", message, okText: opts.okText || "OK" });

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

  try {
    window.mkPopup = mkPopup;
  } catch {}

  /* =======================
     CLONE STATE
  ======================= */
  const cloneState = {
    get() {
      const state = readState();
      state.__clones = state.__clones || { trainers: [], pocs: [], tables: {}, tickets: [] };
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
     CLEAR HELPERS
  ======================= */
  const clearAllNotesButtonStates = (root = document) => {
    root
      .querySelectorAll(
        ".notes-btn.has-notes, .notes-icon-btn.has-notes, .notes-btn.is-notes-active, .notes-icon-btn.is-notes-active"
      )
      .forEach((btn) => {
        btn.classList.remove("has-notes");
        btn.classList.remove("is-notes-active");
      });
  };

  const removeDynamicClonesIn = (root = document) => {
    const trainerContainer = $("#additionalTrainersContainer", root) || $("[data-mk-addl-trainers-container]", root);
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

    enforceBaseTicketStatusLock();
    mkSyncTopbarTitle();
    mkSyncSummaryEngagementSnapshot();

    log("Cleared section:", sectionEl.id);
  };

  /* =======================
   ADD TRAINER (+)
   ✅ Updated behavior:
   - Clicking + ALWAYS adds a row (blank allowed)
   - If the input has text, it uses it and clears the input
   - Works with BOTH:
       - #additionalTrainerInput (old)
       - [data-mk-addl-trainer-input] (your current HTML)
   - Works with BOTH containers:
       - #additionalTrainersContainer (old)
       - [data-mk-addl-trainers-container] (your current HTML)
======================= */
const buildTrainerRow = (value = "") => {
  const wrap = document.createElement("div");
  wrap.className = "checklist-row integrated-plus indent-sub";
  wrap.setAttribute(AUTO_ROW_ATTR, "cloned");

  const label = document.createElement("label");
  label.textContent = "Additional Trainer";

  const inputPlus = document.createElement("div");
  inputPlus.className = "input-plus mk-solo-input";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter additional trainer name";
  input.autocomplete = "off";
  input.value = value;

  inputPlus.appendChild(input);
  wrap.appendChild(label);
  wrap.appendChild(inputPlus);

  input.removeAttribute(AUTO_ID_ATTR);
  ensureId(input);

  return wrap;
};

const addTrainerRow = (fromEl = null) => {
  const root =
    (fromEl && fromEl.closest && fromEl.closest("#trainers-deployment")) ||
    document.getElementById("trainers-deployment") ||
    document;

  const input =
    root.querySelector("#additionalTrainerInput") ||
    root.querySelector("[data-mk-addl-trainer-input]") ||
    document.querySelector("#additionalTrainerInput") ||
    document.querySelector("[data-mk-addl-trainer-input]") ||
    null;

  const container =
    root.querySelector("#additionalTrainersContainer") ||
    root.querySelector("[data-mk-addl-trainers-container]") ||
    document.querySelector("#additionalTrainersContainer") ||
    document.querySelector("[data-mk-addl-trainers-container]") ||
    null;

  if (!container) return;

  const name = (input?.value || "").trim();

  // ✅ ALWAYS add a row (blank allowed)
  const row = buildTrainerRow(name);
  container.appendChild(row);

  // persist clone state (blank ok)
  const clones = cloneState.get();
  clones.trainers = clones.trainers || [];
  clones.trainers.push({ value: name });
  cloneState.set(clones);

  // clear only if we have an input field
  if (input) {
    input.value = "";
    input.removeAttribute(AUTO_ID_ATTR);
    ensureId(input);
    saveField(input);
    input.focus();
  } else {
    row.querySelector("input")?.focus?.();
  }

  mkSyncSummaryEngagementSnapshot();
};

try {
  window.mkAddTrainerRow = addTrainerRow;
} catch {}

/* =======================
   ADD POC (+)
   ✅ Updated behavior:
   - Clicking + ALWAYS adds a new POC card
   - New cards append into #additionalPocsContainer (preferred)
   - Clone strips the + button so only base card has it
   - Clears all values, re-IDs fields for state saving
======================= */
const readPocCardValues = (card) => ({
  name: (card.querySelector('input[name="additionalPocInput"], #additionalPocInput, input[placeholder="Enter name"]')?.value || "").trim(),
  role: (card.querySelector('input[name="additionalPocRoleBase"], input[placeholder="Enter role"]')?.value || "").trim(),
  cell: (card.querySelector('input[name="additionalPocCellBase"], input[placeholder="Enter cell"]')?.value || "").trim(),
  email: (card.querySelector('input[name="additionalPocEmailBase"], input[type="email"]')?.value || "").trim(),
});

const writePocCardValues = (card, p) => {
  const name = card.querySelector('input[name="additionalPocInput"], #additionalPocInput, input[placeholder="Enter name"]');
  const role = card.querySelector('input[name="additionalPocRoleBase"], input[placeholder="Enter role"]');
  const cell = card.querySelector('input[name="additionalPocCellBase"], input[placeholder="Enter cell"]');
  const email = card.querySelector('input[name="additionalPocEmailBase"], input[type="email"]');

  if (name) name.value = p?.name || "";
  if (role) role.value = p?.role || "";
  if (cell) cell.value = p?.cell || "";
  if (email) email.value = p?.email || "";

  [name, role, cell, email].forEach((el) => {
    if (!el) return;
    el.removeAttribute(AUTO_ID_ATTR);
    ensureId(el);
    triggerInputChange(el);
  });
};

const buildPocCard = (p = null) => {
  const base = document.querySelector('.additional-poc-card[data-base="true"]');
  if (!base) return null;

  const clone = base.cloneNode(true);
  clone.setAttribute("data-base", "false");
  clone.setAttribute(AUTO_CARD_ATTR, "poc");

  // ✅ remove add button inside clones
  clone.querySelectorAll("[data-add-poc], .additional-poc-add, .poc-add-btn").forEach((btn) => btn.remove());

  // ✅ clear values + re-id fields
  $$("input, textarea, select", clone).forEach((el) => {
    if (el.matches("input[type='checkbox']")) el.checked = false;
    else el.value = "";

    el.removeAttribute(AUTO_ID_ATTR);
    ensureId(el);
    triggerInputChange(el);
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

  // ✅ always append into the container if present
  const container = document.getElementById("additionalPocsContainer");
  if (container) container.appendChild(newCard);
  else base.insertAdjacentElement("afterend", newCard);

  persistAllPocs();

  const first = newCard.querySelector('input[type="text"], input[type="email"], input, textarea, select');
  first?.focus?.();
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
      if (el.matches("input[type='checkbox'], input[type='radio']")) el.checked = false;
      else if (el.matches("[contenteditable='true']")) el.textContent = "";
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
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
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
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

  function seedStarterRowsToThree() {
    document.querySelectorAll("table.training-table").forEach((table) => {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;

      const existing = Array.from(tbody.querySelectorAll("tr")).filter(
        (tr) => tr.getAttribute(AUTO_ROW_ATTR) !== "cloned"
      );
      if (existing.length >= 3) return;

      const baseRow = tbody.querySelector('tr[data-base="true"]') || existing[0];
      if (!baseRow) return;

      const needed = 3 - existing.length;
      for (let i = 0; i < needed; i++) {
        const clone = baseRow.cloneNode(true);
        clone.removeAttribute(AUTO_ROW_ATTR);
        clone.removeAttribute("data-base");

        clone.querySelectorAll("input, select, textarea").forEach((el) => {
          if (el.type === "checkbox" || el.type === "radio") el.checked = false;
          else el.value = "";
          el.removeAttribute(AUTO_ID_ATTR);
          ensureId(el);
        });

        tbody.appendChild(clone);
      }
    });
  }

  /* =======================
     SUPPORT TICKETS
  ======================= */
  const ticketContainersByStatus = () => ({
    Open: $("#openTicketsContainer"),
    "Tier Two": $("#tierTwoTicketsContainer"),
    "Closed - Resolved": $("#closedResolvedTicketsContainer"),
    "Closed - Feature Not Supported": $("#closedFeatureTicketsContainer"),
  });

  const getOpenBaseTicketCard = () => {
    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return null;
    return $(".ticket-group[data-base='true']", openContainer);
  };

  const enforceBaseTicketStatusLock = () => {
    const base = getOpenBaseTicketCard();
    if (!base) return;
    const status = $(".ticket-status-select", base);
    if (!status) return;
    status.value = "Open";
    status.disabled = true;
    ensureId(status);
    saveField(status);
  };

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

    clone.querySelectorAll(".add-ticket-btn").forEach((b) => b.remove());

    $$("input, textarea, select", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
    });

    const status = $(".ticket-status-select", clone);
    if (status) {
      status.disabled = true;
      ensureId(status);
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

  const setTicketCardValues = (card, data) => {
    const num = $(".ticket-number-input", card);
    const url = $(".ticket-zendesk-input", card);
    const sum = $(".ticket-summary-input", card);
    const status = $(".ticket-status-select", card);

    if (num) num.value = data?.num || "";
    if (url) url.value = data?.url || "";
    if (sum) sum.value = data?.sum || "";

    if (card.getAttribute("data-base") === "true") {
      if (status) {
        status.value = "Open";
        status.disabled = true;
      }
    } else {
      if (status) {
        status.value = data?.status || "Open";
        status.disabled = !(data?.num || "").trim().length;
      }
    }

    [num, url, sum, status].forEach((el) => {
      if (!el) return;
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      triggerInputChange(el);
    });
  };

  const resetBaseTicketCard = (baseCard) => {
    if (!baseCard) return;
    const num = $(".ticket-number-input", baseCard);
    const url = $(".ticket-zendesk-input", baseCard);
    const sum = $(".ticket-summary-input", baseCard);
    if (num) num.value = "";
    if (url) url.value = "";
    if (sum) sum.value = "";
    [num, url, sum].forEach((el) => {
      if (!el) return;
      ensureId(el);
      saveField(el);
      triggerInputChange(el);
    });
    enforceBaseTicketStatusLock();
    num?.focus?.();
  };

  const addTicketCard = () => {
    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const base = getOpenBaseTicketCard();
    if (!base) return;

    if (!isTicketCardComplete(base)) {
      markTicketCardErrors(base);
      mkPopup.ok(
        "Please fill out Ticket Number, Zendesk Ticket URL, and Short Summary on the BASE card before adding a new ticket card.",
        { title: "Ticket not complete" }
      );
      return;
    }

    const baseVals = readTicketValues(base);

    const clone = buildTicketCloneFromBase(base);
    setTicketCardValues(clone, {
      num: baseVals.num,
      url: baseVals.url,
      sum: baseVals.sum,
      status: "Open",
    });

    openContainer.appendChild(clone);

    persistAllTickets();
    resetBaseTicketCard(base);
  };

  const onTicketNumberInput = (inputEl) => {
    const card = inputEl.closest(".ticket-group");
    if (!card) return;

    const status = $(".ticket-status-select", card);
    if (!status) return;

    const isBase = card.getAttribute("data-base") === "true";
    if (isBase) {
      enforceBaseTicketStatusLock();
      saveField(inputEl);
      return;
    }

    const hasNum = (inputEl.value || "").trim().length > 0;
    status.disabled = !hasNum;

    persistAllTickets();
  };

  const onTicketStatusChange = (selectEl) => {
    const card = selectEl.closest(".ticket-group");
    if (!card) return;

    if (card.getAttribute("data-base") === "true") {
      enforceBaseTicketStatusLock();
      return;
    }

    const statusVal = selectEl.value;
    const containers = ticketContainersByStatus();
    const dest = containers[statusVal] || containers.Open;
    if (dest) dest.appendChild(card);

    persistAllTickets();
  };

  const rebuildTicketClones = () => {
    const clones = cloneState.get();
    const list = clones.tickets || [];
    if (!list.length) {
      enforceBaseTicketStatusLock();
      return;
    }

    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const base = $(".ticket-group[data-base='true']", openContainer);
    if (!base) return;

    $$(".ticket-group", document).forEach((g) => {
      if (g.getAttribute("data-base") !== "true") g.remove();
    });

    list.forEach((t) => {
      const clone = buildTicketCloneFromBase(base);

      setTicketCardValues(clone, {
        num: t.num || "",
        url: t.url || "",
        sum: t.sum || "",
        status: t.status || "Open",
      });

      const containers = ticketContainersByStatus();
      const dest = containers[t.status] || containers.Open || openContainer;
      dest.appendChild(clone);
    });

    enforceBaseTicketStatusLock();
  };

  /* =======================
     TRAINER + POC RESTORE
  ======================= */
  const rebuildPocClones = () => {
    const clones = cloneState.get();
    if (!clones.pocs || !clones.pocs.length) return;

    // remove existing clones
    $$(".additional-poc-card").forEach((c) => {
      if (c.getAttribute("data-base") !== "true") c.remove();
    });

    const container = document.getElementById("additionalPocsContainer");
    const base = document.querySelector('.additional-poc-card[data-base="true"]');
    if (!base) return;

    clones.pocs.forEach((p) => {
      const card = buildPocCard(p);
      if (!card) return;
      if (container) container.appendChild(card);
      else base.insertAdjacentElement("afterend", card);
    });
  };

  const rebuildTrainerClones = () => {
    const clones = cloneState.get();
    const container =
      $("#additionalTrainersContainer") || $("[data-mk-addl-trainers-container]");
    if (!container) return;

    container.innerHTML = "";
    (clones.trainers || []).forEach((t) => {
      const row = buildTrainerRow(t.value || "");
      container.appendChild(row);
    });
  };

  /* =======================
     MAP BTN
  ======================= */
  const updateDealershipMap = (address) => {
    const frame = $("#dealershipMapFrame") || $(".map-frame iframe") || $(".map-wrapper iframe");
    if (!frame) return;

    const a = String(address || "").trim();
    const q = a ? encodeURIComponent(a) : "United%20States";
    frame.src = `https://www.google.com/maps?q=${q}&z=${a ? 14 : 4}&output=embed`;
  };

  /* =======================
     END DATE AUTO-SET (+3)
  ======================= */
  const mkAutoSetTrainingEndDate = () => {
    const start =
      document.getElementById("onsiteStartDate") ||
      MK_IDS.onsiteDate.map((id) => document.getElementById(id)).find(Boolean);

    const end =
      document.getElementById("onsiteEndDate") ||
      MK_IDS.trainingEndDate.map((id) => document.getElementById(id)).find(Boolean);

    if (!start || !end) return;

    const compute = () => {
      if (!start.value) return;
      if (end.value) return;

      const d = new Date(start.value);
      if (Number.isNaN(d.getTime())) return;
      d.setDate(d.getDate() + 3);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      end.value = `${yyyy}-${mm}-${dd}`;
      triggerInputChange(end);
    };

    start.addEventListener("change", compute);
    setTimeout(compute, 0);
    setTimeout(compute, 300);
  };

  /* =======================
     TRAINING SUMMARY SYNC (safe)
  ======================= */
  const mkGetTrainerCloneValues = () => {
    const clones = cloneState.get();
    const arr = (clones.trainers || [])
      .map((t) => String(t?.value || "").trim())
      .filter(Boolean);

    if (!arr.length) {
      const container = $("#additionalTrainersContainer") || $("[data-mk-addl-trainers-container]");
      if (container) {
        return $$("input[type='text']", container)
          .map((i) => (i.value || "").trim())
          .filter(Boolean);
      }
    }
    return arr;
  };

  const mkSyncAdditionalTrainersToSummary = () => {
    const stack = document.getElementById(MK_SUMMARY_IDS.addlStack);
    const base = document.getElementById(MK_SUMMARY_IDS.addlBase);
    const row = document.getElementById(MK_SUMMARY_IDS.addlRow);

    if (!stack || !base) return;

    $$(`input[id^="mkSum_addTrainer_"]`, stack).forEach((el) => {
      if (el.id !== MK_SUMMARY_IDS.addlBase) el.remove();
    });

    const values = mkGetTrainerCloneValues();

    base.value = values[0] || "";
    ensureId(base);
    saveField(base);

    for (let i = 1; i < values.length; i++) {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.id = `mkSum_addTrainer_${i}`;
      inp.placeholder = "Additional trainer";
      inp.value = values[i];
      stack.appendChild(inp);

      ensureId(inp);
      saveField(inp);
    }

    if (row) row.style.display = "flex";
    setGhostStyles(document);
  };

  const mkSyncSummaryEngagementSnapshot = () => {
    const summarySection = document.getElementById("training-summary");
    if (!summarySection) return;

    const didEl = document.getElementById(MK_SUMMARY_IDS.did);
    const dealerEl = document.getElementById(MK_SUMMARY_IDS.dealership);
    const groupEl = document.getElementById(MK_SUMMARY_IDS.dealerGroup);

    const startEl = document.getElementById(MK_SUMMARY_IDS.dateStart);
    const endEl = document.getElementById(MK_SUMMARY_IDS.dateEnd);

    const leadEl = document.getElementById(MK_SUMMARY_IDS.leadTrainer);

    const did = mkFirstValueByIds(MK_IDS.did);
    const dealerGroup = mkFirstValueByIds(MK_IDS.dealerGroup);
    const dealership = mkFirstValueByIds(MK_IDS.dealershipName);

    if (didEl && (didEl.value || "").trim() !== did) didEl.value = did || "";
    if (dealerEl && (dealerEl.value || "").trim() !== dealership) dealerEl.value = dealership || "";
    if (groupEl && (groupEl.value || "").trim() !== dealerGroup) groupEl.value = dealerGroup || "";

    const startSrc =
      document.getElementById("onsiteStartDate") ||
      MK_IDS.onsiteDate.map((id) => document.getElementById(id)).find(Boolean);

    const endSrc =
      document.getElementById("onsiteEndDate") ||
      MK_IDS.trainingEndDate.map((id) => document.getElementById(id)).find(Boolean);

    if (startEl && startSrc && (startEl.value || "").trim() !== (startSrc.value || "").trim()) {
      startEl.value = startSrc.value || "";
    }
    if (endEl && endSrc && (endEl.value || "").trim() !== (endSrc.value || "").trim()) {
      endEl.value = endSrc.value || "";
    }

    const lead = mkFirstValueByIds(MK_IDS.leadTrainer);
    if (leadEl && (leadEl.value || "").trim() !== lead) leadEl.value = lead || "";

    [didEl, dealerEl, groupEl, startEl, endEl, leadEl].forEach((el) => {
      if (!el) return;
      ensureId(el);
      saveField(el);
    });

    mkSyncAdditionalTrainersToSummary();
  };

  /* =======================
     EXPAND BUTTONS (inject)
  ======================= */
  const ensureExpandStyles = (() => {
    const STYLE_ID = "mk-expand-style-v8_3_3";
    return () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-field-error{box-shadow:0 0 0 3px rgba(239,109,34,.35) !important; border-color:#EF6D22 !important;}
      `;
      document.head.appendChild(s);
    };
  })();

  const ensureTableExpandButtons = () => {
    ensureExpandStyles();
    document.querySelectorAll(".table-footer").forEach((footer) => {
      if (footer.querySelector(".mk-table-expand-btn")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-table-expand-btn";
      btn.title = "Expand";
      btn.textContent = "⤢";
      footer.appendChild(btn);
    });
  };

  const ensureNotesExpandButtons = () => {
    ensureExpandStyles();
    const textareas = Array.from(document.querySelectorAll(".section-block textarea"));
    textareas.forEach((ta) => {
      if (ta.closest("table")) return;
      if (ta.closest("#support-tickets")) return;
      if (ta.classList.contains("ticket-summary-input")) return;
      if (ta.closest(".ticket-group")) return;

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
      btn.title = "Expand Notes";
      btn.textContent = "⤢";
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

    const navBtn = t.closest(".nav-btn[data-target]");
    if (navBtn) {
      e.preventDefault();
      const targetId = navBtn.getAttribute("data-target");
      setActiveSection(targetId);

      setTimeout(() => {
        ensureTableExpandButtons();
        ensureNotesExpandButtons();
        if (targetId === "training-summary") mkSyncSummaryEngagementSnapshot();
      }, 0);
      return;
    }

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

    const resetBtn = t.closest(".clear-page-btn");
    if (resetBtn) {
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

    // ✅ TRAINER "+"
    const trainerBtn = t.closest("[data-add-trainer], .trainer-add-btn");
    if (trainerBtn) {
      e.preventDefault();
      e.stopPropagation();
      addTrainerRow(trainerBtn);
      return;
    }

    // ✅ POC "+"
    const pocBtn = t.closest("[data-add-poc], .poc-add-btn, .additional-poc-add");
    if (pocBtn) {
      e.preventDefault();
      e.stopPropagation();
      addPocCard();
      return;
    }

    // ✅ Table Add Row
    const addRowBtn = t.closest("button.add-row");
    if (addRowBtn && addRowBtn.closest(".table-footer")) {
      e.preventDefault();
      cloneTableRow(addRowBtn);
      return;
    }

    // ✅ Tickets "+"
    const ticketAddBtn = t.closest(".add-ticket-btn");
    if (ticketAddBtn) {
      e.preventDefault();
      addTicketCard();
      return;
    }

    // ✅ Map button
    const mapBtn = t.closest(".small-map-btn, [data-map-btn]");
    if (mapBtn) {
      e.preventDefault();
      const wrap = mapBtn.closest(".address-input-wrap") || mapBtn.parentElement;
      const inp = $("input[type='text']", wrap) || $("#dealershipAddressInput") || $("#dealershipAddress");
      updateDealershipMap(inp ? inp.value : "");
      return;
    }

    // Expand buttons (events only)
    const tableExpand = t.closest(".mk-table-expand-btn");
    if (tableExpand) {
      document.dispatchEvent(new CustomEvent("mk:expandTable", { detail: { button: tableExpand } }));
      return;
    }

    const taExpand = t.closest(".mk-ta-expand");
    if (taExpand) {
      document.dispatchEvent(new CustomEvent("mk:expandNotes", { detail: { button: taExpand } }));
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

    if (el.id === "dealershipNameInput" || el.id === "dealershipDidInput" || el.id === "dealerGroupInput") {
      mkSyncTopbarTitle();
      mkSyncSummaryEngagementSnapshot();
    }

    // Keep trainer clone state synced if user edits cloned trainer fields
    if (el.closest("#additionalTrainersContainer") || el.closest("[data-mk-addl-trainers-container]")) {
      const container =
        $("#additionalTrainersContainer") || $("[data-mk-addl-trainers-container]");
      const clones = cloneState.get();
      clones.trainers = container
        ? $$("input[type='text']", container).map((i) => ({ value: (i.value || "").trim() }))
        : [];
      cloneState.set(clones);
      mkSyncSummaryEngagementSnapshot();
    }

    if (el.closest(".additional-poc-card") && el.closest(".additional-poc-card")?.getAttribute("data-base") !== "true") {
      persistAllPocs();
    }

    if (el.matches(".ticket-number-input")) onTicketNumberInput(el);
    if (el.closest(".ticket-group") && el.closest(".ticket-group")?.getAttribute("data-base") !== "true") {
      persistAllTickets();
    }

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

    if (el.matches('input[type="date"]')) {
      mkSyncSummaryEngagementSnapshot();
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

    // ✅ Enter adds trainer
    if (el && el.id === "additionalTrainerInput" && e.key === "Enter") {
      e.preventDefault();
      addTrainerRow(el);
      return;
    }

    if (e.key === "Escape") {
      mkPopup.close();
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

    seedStarterRowsToThree();

    restoreAllFields();
    setGhostStyles(document);

    mkSyncTopbarTitle();
    mkSyncSummaryEngagementSnapshot();

    mkAutoSetTrainingEndDate();

    ensureTableExpandButtons();
    ensureNotesExpandButtons();
    startExpandObserver();

    enforceBaseTicketStatusLock();

    log("Initialized v8.3.3.");
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
