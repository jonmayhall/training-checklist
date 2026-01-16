/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   UPDATED / HARDENED / DROP-IN — v8.3.2 (Updated)

   ✅ Updates in THIS version:
   - NEXT PAGE footer now renders correctly on ALL pages:
       • builds a .mk-next-footer inside each .page-section
       • button includes .mk-next-arrow for your CSS
       • no duplicates
   - NEXT PAGE click always scrolls to the TOP of the next page
     (fixed header offset, reliable even on Training Checklist)
   - Defines updateNextPageButtons() safely (alias)
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v8_3_2";
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

    onsiteDate: ["onsiteTrainingDate", "onsiteDate", "onsiteTrainingStartDate", "trainingStartDate"],
    trainingEndDate: ["trainingEndDate", "endDate", "onsiteTrainingEndDate"],

    leadTrainer: [
      "leadTrainerSelect", // Page 1
      "leadTrainerInput",
      "leadTrainer",
      "trainerLeadInput",
      "primaryTrainerInput",
    ],
  };

  // ====== SUMMARY PAGE 11 IDS (Engagement Snapshot) ======
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

    if (el.closest("#additionalTrainersContainer")) return true;

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
     LABEL + PLACEHOLDER FINDERS
  ======================= */
  const mkFindFieldByLabelText = (sectionEl, labelIncludes) => {
    if (!sectionEl) return null;
    const want = String(labelIncludes || "").toLowerCase().trim();
    if (!want) return null;

    const rows = $$(".checklist-row", sectionEl);
    for (const row of rows) {
      const lab = row.querySelector("label");
      const t = (lab?.textContent || "").toLowerCase().trim();
      if (!t) continue;
      if (!t.includes(want)) continue;

      const field =
        row.querySelector(
          "input:not([type='button']):not([type='submit']):not([type='reset']), select, textarea"
        ) || null;
      if (field) return field;
    }
    return null;
  };

  const mkFindDateInputByLabelOrId = (root, ids, labelIncludes) => {
    for (const id of ids || []) {
      const el = document.getElementById(id);
      if (el && el.matches('input[type="date"]')) return el;
    }
    const sections = $$(".page-section", root);
    for (const sec of sections) {
      const found = mkFindFieldByLabelText(sec, labelIncludes);
      if (found && found.matches('input[type="date"]')) return found;
    }
    const allDates = $$('input[type="date"]', root);
    for (const d of allDates) {
      const id = (d.id || "").toLowerCase();
      const nm = (d.name || "").toLowerCase();
      const want = String(labelIncludes || "").toLowerCase();
      if (want && (id.includes(want) || nm.includes(want))) return d;
    }
    return null;
  };

  /* =======================
     OS-STYLE POPUPS
  ======================= */
  const mkPopup = (() => {
    const STYLE_ID = "mk-popup-style-v1";
    let active = null;

    const ensureStyles = () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-pop-backdrop{position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:100000; display:flex; align-items:flex-start; justify-content:center; padding-top:110px;}
        .mk-pop-box{width:min(520px, calc(100vw - 28px)); background:#fff; border:1px solid rgba(0,0,0,.10); border-radius:18px; box-shadow:0 18px 50px rgba(0,0,0,.25); overflow:hidden;}
        .mk-pop-head{background:#EF6D22; color:#fff; padding:10px 16px; font-weight:900; letter-spacing:.2px; display:flex; align-items:center; justify-content:space-between;}
        .mk-pop-title{font-size:15px;}
        .mk-pop-body{padding:14px 16px 8px; color:#111827; font-size:13px; line-height:1.45; white-space:pre-wrap;}
        .mk-pop-actions{padding:12px 16px 14px; display:flex; justify-content:flex-end; gap:10px;}
        .mk-pop-btn{border:none; cursor:pointer; height:34px; padding:0 16px; border-radius:999px; font-weight:900; font-size:12px; letter-spacing:.08em; text-transform:uppercase; display:inline-flex; align-items:center; justify-content:center;}
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
     CLONE STATE (for restore)
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
     NAV  ✅ UPDATED scroll-to-top behavior
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

    // ✅ reliable top scroll w/ fixed topbar offset
    requestAnimationFrame(() => {
      const headerOffset = 86; // ~70px topbar + padding
      const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
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
      .querySelectorAll(
        ".notes-btn.has-notes, .notes-icon-btn.has-notes, .notes-btn.is-notes-active, .notes-icon-btn.is-notes-active"
      )
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

    enforceBaseTicketStatusLock();
    mkSyncTopbarTitle();
    mkSyncSummaryEngagementSnapshot();

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
    return wrap;
  };

  const addTrainerRow = (fromEl = null) => {
    const root =
      (fromEl && fromEl.closest && fromEl.closest("#trainers-deployment")) ||
      document.getElementById("trainers-deployment") ||
      document;

    const input =
      root.querySelector("#additionalTrainerInput") ||
      document.querySelector("#additionalTrainerInput");

    const container =
      root.querySelector("#additionalTrainersContainer") ||
      document.querySelector("#additionalTrainersContainer");

    if (!container) return;

    const name = (input?.value || "").trim();

    const row = buildTrainerRow(name);
    container.appendChild(row);

    const clones = cloneState.get();
    clones.trainers = clones.trainers || [];
    clones.trainers.push({ value: name });
    cloneState.set(clones);

    if (input && name) {
      input.value = "";
      saveField(input);
    }

    const newInput = row.querySelector("input[type='text']");
    if (newInput) newInput.focus();

    mkSyncSummaryEngagementSnapshot();
  };

  try {
    window.mkAddTrainerRow = addTrainerRow;
  } catch {}

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
      triggerInputChange(el);
    });
  };

  const buildPocCard = (p = null) => {
    const base = document.querySelector('.additional-poc-card[data-base="true"]');
    if (!base) return null;

    const clone = base.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, "poc");

    clone
      .querySelectorAll("[data-add-poc], .additional-poc-add, .poc-add-btn, .input-plus button")
      .forEach((btn) => btn.remove());

    const row = clone.querySelector(".checklist-row.integrated-plus");
    if (row) row.classList.remove("integrated-plus");

    const ip = clone.querySelector(".input-plus");
    if (ip) ip.classList.add("mk-solo-input");

    clone.classList.add("mk-poc-clone", "mk-round-right");

    $$("input, textarea, select", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
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

    const first = newCard.querySelector('input[placeholder="Enter name"], input, textarea, select');
    if (first) first.focus();
  };

  try {
    window.mkAddPocCard = addPocCard;
  } catch {}

  /* =======================
     ✅ HARD FIX: Additional POC (+) click hook (robust)
  ======================= */
  const shouldTreatAsAddPocBtn = (btn) => {
    if (!btn) return false;

    if (btn.matches("[data-add-poc], .additional-poc-add, .poc-add-btn")) return true;

    const baseCard = btn.closest('#dealership-info .additional-poc-card[data-base="true"]');
    if (!baseCard) return false;

    const ip = btn.closest(".input-plus");
    if (!ip) return false;

    const nameInput =
      ip.querySelector('input[type="text"][placeholder*="name" i]') || ip.querySelector('input[type="text"]');

    return !!nameInput;
  };

  try {
    window.shouldTreatAsAddPocBtn = shouldTreatAsAddPocBtn;
  } catch {}

  const hookAddPocButtonDirectly = () => {
    const page = document.getElementById("dealership-info");
    if (!page) return;

    const btns = Array.from(
      page.querySelectorAll(
        "[data-add-poc], .additional-poc-add, .poc-add-btn, .additional-poc-card[data-base='true'] .input-plus button"
      )
    );

    btns.forEach((b) => {
      if (!shouldTreatAsAddPocBtn(b)) return;
      if (b.__mkAddPocBound) return;
      b.__mkAddPocBound = true;

      if (b.tagName === "BUTTON" && !b.getAttribute("type")) b.type = "button";

      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addPocCard();
      });
    });
  };

  /* =======================
     TABLES: ADD ROW + PERSIST/RESTORE
  ======================= */
  const getTableKey = (table) =>
    table?.getAttribute("data-table-key") || table?.id || `table-${$$("table.training-table").indexOf(table)}`;

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
     NOTES  (unchanged from your build)
  ======================= */
  const Notes = (() => {
    const normalizeNL = (s) => String(s ?? "").replace(/\r\n/g, "\n");
    const getNotesTargetId = (btn) =>
      btn.getAttribute("data-notes-target") || btn.getAttribute("href")?.replace("#", "") || "";

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
      const all = Array.from(document.querySelectorAll(`[data-notes-target="${CSS.escape(hostId)}"]`));
      const idx = all.indexOf(btn);
      return `${hostId}::q::${idx >= 0 ? idx : "x"}`;
    };

    const findOrDerivePromptText = (btn) => {
      const tr = btn.closest("tr");
      const table = btn.closest("table");
      const section = getSection(btn);
      const secId = section?.id || "";

      if (tr && table) {
        if (secId === "training-checklist") {
          const nameInput =
            tr.querySelector('td:first-child input[type="text"]') ||
            tr.querySelector('td:nth-child(2) input[type="text"]');
          const v = (nameInput?.value || "").trim();
          return v || "(blank)";
        }

        if (secId === "opcodes-pricing") {
          const opcodeInput =
            tr.querySelector('td:nth-child(2) input[type="text"]') ||
            tr.querySelector(
              'td:nth-child(2) input:not([type="checkbox"]):not([type="radio"]), td:nth-child(2) select, td:nth-child(2) textarea'
            );
          const v = (opcodeInput?.value || opcodeInput?.textContent || "").trim();
          return v || "(blank)";
        }

        const field =
          tr.querySelector(
            'input[type="text"], input:not([type="checkbox"]):not([type="radio"]), select, textarea'
          ) || null;
        const value = (field?.value || field?.textContent || "").trim();
        return value || "Item";
      }

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
      const btns = Array.from(document.querySelectorAll(`[data-notes-target="${CSS.escape(targetId)}"]`));
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

      const markerIdx = v.indexOf(marker);
      if (markerIdx < 0) return { text: v, caret: v.length };

      const mainLineEnd = v.indexOf("\n", markerIdx);
      const afterMain = mainLineEnd < 0 ? v.length : mainLineEnd + 1;

      const nextMain = v.indexOf("\n• ", afterMain);
      const blockEnd = nextMain >= 0 ? nextMain : v.length;

      const hollowNoSpace = "  ◦";
      const hollowWithSpace = "  ◦ ";

      let out = v;

      let subIdx = out.indexOf(hollowWithSpace, afterMain);
      if (subIdx >= 0 && subIdx < blockEnd) return { text: out, caret: subIdx + hollowWithSpace.length };

      subIdx = out.indexOf(hollowNoSpace, afterMain);
      if (subIdx >= 0 && subIdx < blockEnd) {
        const insertAt = subIdx + hollowNoSpace.length;
        if (out[insertAt] !== " ") {
          out = out.slice(0, insertAt) + " " + out.slice(insertAt);
          return { text: out, caret: insertAt + 1 };
        }
        return { text: out, caret: insertAt + 1 };
      }

      const insertion = "  ◦ ";
      out = out.slice(0, afterMain) + insertion + out.slice(afterMain);
      return { text: out, caret: afterMain + insertion.length };
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

        if (!exists) blocks.push({ key: slotKey, lines: buildBlockLines(promptText, slotKey) });

        ta.value = rebuildInCanonicalOrder(targetId, blocks, slotKey).trimEnd() + "\n";

        const res = caretAtHollowForKey(ta.value, slotKey);
        ta.value = res.text;

        try {
          ta.focus({ preventScroll: true });
        } catch {
          ta.focus();
        }
        try {
          ta.setSelectionRange(res.caret, res.caret);
        } catch {}

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

  // ---------------------------
  // END OF "FIRST HALF"
  // Next message: I’ll send the SECOND HALF (Support Tickets -> Init)
  // ---------------------------

})();

/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   UPDATED / HARDENED / DROP-IN — v8.3.2 (Updated)

   ✅ Updates in THIS version:
   - NEXT PAGE footer now renders correctly on ALL pages:
       • builds a .mk-next-footer inside each .page-section
       • button includes .mk-next-arrow for your CSS
       • no duplicates
   - NEXT PAGE click always scrolls to the TOP of the next page
     (fixed header offset, reliable even on Training Checklist)
   - Defines updateNextPageButtons() safely (alias)
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v8_3_2";
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

    onsiteDate: ["onsiteTrainingDate", "onsiteDate", "onsiteTrainingStartDate", "trainingStartDate"],
    trainingEndDate: ["trainingEndDate", "endDate", "onsiteTrainingEndDate"],

    leadTrainer: [
      "leadTrainerSelect", // Page 1
      "leadTrainerInput",
      "leadTrainer",
      "trainerLeadInput",
      "primaryTrainerInput",
    ],
  };

  // ====== SUMMARY PAGE 11 IDS (Engagement Snapshot) ======
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

    if (el.closest("#additionalTrainersContainer")) return true;

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
     LABEL + PLACEHOLDER FINDERS
  ======================= */
  const mkFindFieldByLabelText = (sectionEl, labelIncludes) => {
    if (!sectionEl) return null;
    const want = String(labelIncludes || "").toLowerCase().trim();
    if (!want) return null;

    const rows = $$(".checklist-row", sectionEl);
    for (const row of rows) {
      const lab = row.querySelector("label");
      const t = (lab?.textContent || "").toLowerCase().trim();
      if (!t) continue;
      if (!t.includes(want)) continue;

      const field =
        row.querySelector(
          "input:not([type='button']):not([type='submit']):not([type='reset']), select, textarea"
        ) || null;
      if (field) return field;
    }
    return null;
  };

  const mkFindDateInputByLabelOrId = (root, ids, labelIncludes) => {
    for (const id of ids || []) {
      const el = document.getElementById(id);
      if (el && el.matches('input[type="date"]')) return el;
    }
    const sections = $$(".page-section", root);
    for (const sec of sections) {
      const found = mkFindFieldByLabelText(sec, labelIncludes);
      if (found && found.matches('input[type="date"]')) return found;
    }
    const allDates = $$('input[type="date"]', root);
    for (const d of allDates) {
      const id = (d.id || "").toLowerCase();
      const nm = (d.name || "").toLowerCase();
      const want = String(labelIncludes || "").toLowerCase();
      if (want && (id.includes(want) || nm.includes(want))) return d;
    }
    return null;
  };

  /* =======================
     OS-STYLE POPUPS
  ======================= */
  const mkPopup = (() => {
    const STYLE_ID = "mk-popup-style-v1";
    let active = null;

    const ensureStyles = () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-pop-backdrop{position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:100000; display:flex; align-items:flex-start; justify-content:center; padding-top:110px;}
        .mk-pop-box{width:min(520px, calc(100vw - 28px)); background:#fff; border:1px solid rgba(0,0,0,.10); border-radius:18px; box-shadow:0 18px 50px rgba(0,0,0,.25); overflow:hidden;}
        .mk-pop-head{background:#EF6D22; color:#fff; padding:10px 16px; font-weight:900; letter-spacing:.2px; display:flex; align-items:center; justify-content:space-between;}
        .mk-pop-title{font-size:15px;}
        .mk-pop-body{padding:14px 16px 8px; color:#111827; font-size:13px; line-height:1.45; white-space:pre-wrap;}
        .mk-pop-actions{padding:12px 16px 14px; display:flex; justify-content:flex-end; gap:10px;}
        .mk-pop-btn{border:none; cursor:pointer; height:34px; padding:0 16px; border-radius:999px; font-weight:900; font-size:12px; letter-spacing:.08em; text-transform:uppercase; display:inline-flex; align-items:center; justify-content:center;}
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
     CLONE STATE (for restore)
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
     NAV  ✅ UPDATED scroll-to-top behavior
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

    // ✅ reliable top scroll w/ fixed topbar offset
    requestAnimationFrame(() => {
      const headerOffset = 86; // ~70px topbar + padding
      const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
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
      .querySelectorAll(
        ".notes-btn.has-notes, .notes-icon-btn.has-notes, .notes-btn.is-notes-active, .notes-icon-btn.is-notes-active"
      )
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

    enforceBaseTicketStatusLock();
    mkSyncTopbarTitle();
    mkSyncSummaryEngagementSnapshot();

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
    return wrap;
  };

  const addTrainerRow = (fromEl = null) => {
    const root =
      (fromEl && fromEl.closest && fromEl.closest("#trainers-deployment")) ||
      document.getElementById("trainers-deployment") ||
      document;

    const input =
      root.querySelector("#additionalTrainerInput") ||
      document.querySelector("#additionalTrainerInput");

    const container =
      root.querySelector("#additionalTrainersContainer") ||
      document.querySelector("#additionalTrainersContainer");

    if (!container) return;

    const name = (input?.value || "").trim();

    const row = buildTrainerRow(name);
    container.appendChild(row);

    const clones = cloneState.get();
    clones.trainers = clones.trainers || [];
    clones.trainers.push({ value: name });
    cloneState.set(clones);

    if (input && name) {
      input.value = "";
      saveField(input);
    }

    const newInput = row.querySelector("input[type='text']");
    if (newInput) newInput.focus();

    mkSyncSummaryEngagementSnapshot();
  };

  try {
    window.mkAddTrainerRow = addTrainerRow;
  } catch {}

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
      triggerInputChange(el);
    });
  };

  const buildPocCard = (p = null) => {
    const base = document.querySelector('.additional-poc-card[data-base="true"]');
    if (!base) return null;

    const clone = base.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, "poc");

    clone
      .querySelectorAll("[data-add-poc], .additional-poc-add, .poc-add-btn, .input-plus button")
      .forEach((btn) => btn.remove());

    const row = clone.querySelector(".checklist-row.integrated-plus");
    if (row) row.classList.remove("integrated-plus");

    const ip = clone.querySelector(".input-plus");
    if (ip) ip.classList.add("mk-solo-input");

    clone.classList.add("mk-poc-clone", "mk-round-right");

    $$("input, textarea, select", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
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

    const first = newCard.querySelector('input[placeholder="Enter name"], input, textarea, select');
    if (first) first.focus();
  };

  try {
    window.mkAddPocCard = addPocCard;
  } catch {}

  /* =======================
     ✅ HARD FIX: Additional POC (+) click hook (robust)
  ======================= */
  const shouldTreatAsAddPocBtn = (btn) => {
    if (!btn) return false;

    if (btn.matches("[data-add-poc], .additional-poc-add, .poc-add-btn")) return true;

    const baseCard = btn.closest('#dealership-info .additional-poc-card[data-base="true"]');
    if (!baseCard) return false;

    const ip = btn.closest(".input-plus");
    if (!ip) return false;

    const nameInput =
      ip.querySelector('input[type="text"][placeholder*="name" i]') || ip.querySelector('input[type="text"]');

    return !!nameInput;
  };

  try {
    window.shouldTreatAsAddPocBtn = shouldTreatAsAddPocBtn;
  } catch {}

  const hookAddPocButtonDirectly = () => {
    const page = document.getElementById("dealership-info");
    if (!page) return;

    const btns = Array.from(
      page.querySelectorAll(
        "[data-add-poc], .additional-poc-add, .poc-add-btn, .additional-poc-card[data-base='true'] .input-plus button"
      )
    );

    btns.forEach((b) => {
      if (!shouldTreatAsAddPocBtn(b)) return;
      if (b.__mkAddPocBound) return;
      b.__mkAddPocBound = true;

      if (b.tagName === "BUTTON" && !b.getAttribute("type")) b.type = "button";

      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addPocCard();
      });
    });
  };

  /* =======================
     TABLES: ADD ROW + PERSIST/RESTORE
  ======================= */
  const getTableKey = (table) =>
    table?.getAttribute("data-table-key") || table?.id || `table-${$$("table.training-table").indexOf(table)}`;

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
     NOTES  (unchanged from your build)
  ======================= */
  const Notes = (() => {
    const normalizeNL = (s) => String(s ?? "").replace(/\r\n/g, "\n");
    const getNotesTargetId = (btn) =>
      btn.getAttribute("data-notes-target") || btn.getAttribute("href")?.replace("#", "") || "";

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
      const all = Array.from(document.querySelectorAll(`[data-notes-target="${CSS.escape(hostId)}"]`));
      const idx = all.indexOf(btn);
      return `${hostId}::q::${idx >= 0 ? idx : "x"}`;
    };

    const findOrDerivePromptText = (btn) => {
      const tr = btn.closest("tr");
      const table = btn.closest("table");
      const section = getSection(btn);
      const secId = section?.id || "";

      if (tr && table) {
        if (secId === "training-checklist") {
          const nameInput =
            tr.querySelector('td:first-child input[type="text"]') ||
            tr.querySelector('td:nth-child(2) input[type="text"]');
          const v = (nameInput?.value || "").trim();
          return v || "(blank)";
        }

        if (secId === "opcodes-pricing") {
          const opcodeInput =
            tr.querySelector('td:nth-child(2) input[type="text"]') ||
            tr.querySelector(
              'td:nth-child(2) input:not([type="checkbox"]):not([type="radio"]), td:nth-child(2) select, td:nth-child(2) textarea'
            );
          const v = (opcodeInput?.value || opcodeInput?.textContent || "").trim();
          return v || "(blank)";
        }

        const field =
          tr.querySelector(
            'input[type="text"], input:not([type="checkbox"]):not([type="radio"]), select, textarea'
          ) || null;
        const value = (field?.value || field?.textContent || "").trim();
        return value || "Item";
      }

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
      const btns = Array.from(document.querySelectorAll(`[data-notes-target="${CSS.escape(targetId)}"]`));
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

      const markerIdx = v.indexOf(marker);
      if (markerIdx < 0) return { text: v, caret: v.length };

      const mainLineEnd = v.indexOf("\n", markerIdx);
      const afterMain = mainLineEnd < 0 ? v.length : mainLineEnd + 1;

      const nextMain = v.indexOf("\n• ", afterMain);
      const blockEnd = nextMain >= 0 ? nextMain : v.length;

      const hollowNoSpace = "  ◦";
      const hollowWithSpace = "  ◦ ";

      let out = v;

      let subIdx = out.indexOf(hollowWithSpace, afterMain);
      if (subIdx >= 0 && subIdx < blockEnd) return { text: out, caret: subIdx + hollowWithSpace.length };

      subIdx = out.indexOf(hollowNoSpace, afterMain);
      if (subIdx >= 0 && subIdx < blockEnd) {
        const insertAt = subIdx + hollowNoSpace.length;
        if (out[insertAt] !== " ") {
          out = out.slice(0, insertAt) + " " + out.slice(insertAt);
          return { text: out, caret: insertAt + 1 };
        }
        return { text: out, caret: insertAt + 1 };
      }

      const insertion = "  ◦ ";
      out = out.slice(0, afterMain) + insertion + out.slice(afterMain);
      return { text: out, caret: afterMain + insertion.length };
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

        if (!exists) blocks.push({ key: slotKey, lines: buildBlockLines(promptText, slotKey) });

        ta.value = rebuildInCanonicalOrder(targetId, blocks, slotKey).trimEnd() + "\n";

        const res = caretAtHollowForKey(ta.value, slotKey);
        ta.value = res.text;

        try {
          ta.focus({ preventScroll: true });
        } catch {
          ta.focus();
        }
        try {
          ta.setSelectionRange(res.caret, res.caret);
        } catch {}

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

  // ---------------------------
  // END OF "FIRST HALF"
  // Next message: I’ll send the SECOND HALF (Support Tickets -> Init)
  // ---------------------------

})();
