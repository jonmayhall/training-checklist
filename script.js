/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (SINGLE SCRIPT / HARDENED / DROP-IN)

   ✅ OS-style OK popup (upper-middle) with orange pill button
   ✅ OK/Cancel confirm popups for:
      - Clear All
      - Reset This Page

   ✅ Support Tickets FIXES:
      - Base card stays in place (left) and NEVER becomes selectable status
      - Base Status dropdown always disabled (greyed out, not selectable)
      - Clicking + transfers BASE values into the NEW card
      - BASE card resets after adding (clears Ticket # / URL / Summary)
      - If base incomplete: shows popup with OK (no browser alert)
      - Status changes move the correct card to the correct container

   ✅ Keeps the rest of your project logic:
      - Nav
      - Field persistence
      - Trainers + POCs
      - Table add-row clone persistence
      - Notes bullets + caret behavior
      - Map update

   ✅ FIXED / RESTORED:
      - Training table expand buttons (⤢) in every table footer
      - Notes expand buttons (⤢) in the bottom-right of EVERY notes box
        (only for notes boxes referenced by data-notes-target buttons)
      - Expand works even if buttons are injected by JS
      - If modal missing, shows mkPopup warning instead of failing

   NOTE:
   - Table/Notes expand uses #mkTableModal (same modal for both).
   - If your modal is missing in HTML, add it back or expand will show a warning.
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

  // Optional: expose for debugging / reuse
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

    // ticket base card status must be disabled after reset
    enforceBaseTicketStatusLock();

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

    const first = newCard.querySelector('input[placeholder="Enter name"], input, textarea, select');
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
    const container = footer?.closest(".section-block") || footer?.parentElement;
    const table =
      container?.querySelector?.("table.training-table") ||
      btn.closest("table.training-table");
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
     SUPPORT TICKETS (FIXED)
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
      saveField(el);
    });

    const status = $(".ticket-status-select", clone);
    if (status) {
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
      ensureId(el);
      saveField(el);
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

    saveField(inputEl);
    saveField(status);

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

    saveField(selectEl);
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

    let anchor = base;
    clones.pocs.forEach((p) => {
      const card = buildPocCard(p);
      if (!card) return;
      anchor.insertAdjacentElement("afterend", card);
      anchor = card;
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
    const frame = $("#dealershipMapFrame") || $(".map-frame iframe") || $(".map-wrapper iframe");
    if (!frame) return;

    const a = String(address || "").trim();
    const q = a ? encodeURIComponent(a) : "United%20States";
    frame.src = `https://www.google.com/maps?q=${q}&z=${a ? 14 : 4}&output=embed`;
  };

  /* =========================================================
     EXPAND BUTTONS (TABLES + NOTES)
     - Uses #mkTableModal (same modal)
     - Injects ⤢ into:
        1) Every .table-footer (table expand)
        2) Every notes block referenced by [data-notes-target] (notes expand)
========================================================= */

  const ensureExpandStyles = (() => {
    const STYLE_ID = "mk-expand-style-v2";
    return () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-table-expand-btn,
        .mk-notes-expand-btn{
          width:30px; height:30px;
          border-radius:10px;
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
        .mk-table-expand-btn:hover,
        .mk-notes-expand-btn:hover{
          transform: translateY(-1px);
        }
        .mk-notes-footer{
          display:flex;
          justify-content:flex-end;
          gap:10px;
          padding-top:10px;
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

  const getExpandBundleNodes = (anyInside) => {
    const tc = anyInside?.closest?.(".table-container") || anyInside;
    if (!tc) return [];

    // IMPORTANT: your page 5 uses .section wrapping the table container
    const tableCard =
      tc.closest(".section") ||
      tc.closest(".section-block") ||
      tc.parentElement ||
      tc;

    const targets = new Set();
    $$("[data-notes-target]", tableCard).forEach((btn) => {
      const id = btn.getAttribute("data-notes-target");
      if (id) targets.add(id);
    });

    const notesBlocks = [];
    targets.forEach((id) => {
      const block = document.getElementById(id);
      if (block) notesBlocks.push(block);
    });

    const all = [tableCard, ...notesBlocks].filter(Boolean);
    const uniq = [];
    const seen = new Set();
    all.forEach((n) => {
      if (seen.has(n)) return;
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

  const openModalWithNodes = (nodes, titleText) => {
    const modal = $("#mkTableModal");
    if (!modal) {
      mkPopup.ok(
        "Your expand buttons need the #mkTableModal HTML block back on the page. Add it near the bottom of your HTML (before </body>).",
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
    try {
      panel.scrollTop = 0;
    } catch {}
  };

  const openTableModalFor = (anyInside) => {
    const bundle = getExpandBundleNodes(anyInside);
    if (!bundle.length) return;
    const header =
      bundle[0].querySelector?.(".section-header") ||
      bundle[0].querySelector?.("h2");
    const title = (header?.textContent || "Expanded View").trim();
    openModalWithNodes(bundle, title);
  };

  const openNotesModalFor = (notesBlock) => {
    if (!notesBlock) return;
    const h =
      notesBlock.querySelector("h2") ||
      notesBlock.querySelector(".section-header") ||
      null;
    const title = (h?.textContent || "Notes").trim();
    openModalWithNodes([notesBlock], title);
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

  const ensureTableExpandButtons = () => {
    ensureExpandStyles();

    $$(".table-container").forEach((tc) => {
      const footer = tc.querySelector(".table-footer") || tc.parentElement?.querySelector?.(".table-footer");
      if (!footer) return;

      if ($(".mk-table-expand-btn", footer)) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-table-expand-btn";
      btn.setAttribute("data-mk-table-expand", "1");
      btn.title = "Expand";
      btn.textContent = "⤢";

      footer.appendChild(btn);
    });
  };

  const ensureNotesExpandButtons = () => {
    ensureExpandStyles();

    // Find every notes block that is referenced by any button using data-notes-target
    const targetIds = new Set(
      $$("[data-notes-target]")
        .map((b) => b.getAttribute("data-notes-target"))
        .filter(Boolean)
    );

    targetIds.forEach((id) => {
      const block = document.getElementById(id);
      if (!block) return;

      // only add if it's a notes block with textarea (matches your notes sections)
      const ta = $("textarea", block);
      if (!ta) return;

      // create/ensure footer
      let footer = $(".mk-notes-footer", block);
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "mk-notes-footer";
        block.appendChild(footer);
      }

      if ($(".mk-notes-expand-btn", footer)) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-notes-expand-btn";
      btn.setAttribute("data-mk-notes-expand", "1");
      btn.setAttribute("data-notes-id", id);
      btn.title = "Expand Notes";
      btn.textContent = "⤢";

      footer.appendChild(btn);
    });
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
      addTicketCard();
      return;
    }

    const mapBtn = t.closest(".small-map-btn, [data-map-btn]");
    if (mapBtn) {
      e.preventDefault();
      const wrap = mapBtn.closest(".address-input-wrap") || mapBtn.parentElement;
      const inp =
        $("input[type='text']", wrap) ||
        $("#dealershipAddressInput") ||
        $("#dealershipAddress");
      updateDealershipMap(inp ? inp.value : "");
      return;
    }

    // TABLE EXPAND
    const expandBtn = t.closest(".mk-table-expand-btn[data-mk-table-expand='1'], .mk-table-expand-btn");
    if (expandBtn) {
      e.preventDefault();
      openTableModalFor(expandBtn);
      return;
    }

    // NOTES EXPAND
    const notesExpandBtn = t.closest(".mk-notes-expand-btn[data-mk-notes-expand='1']");
    if (notesExpandBtn) {
      e.preventDefault();
      const id = notesExpandBtn.getAttribute("data-notes-id");
      const block = id ? document.getElementById(id) : null;
      openNotesModalFor(block);
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

    restoreAllFields();

    setGhostStyles(document);
    syncDealershipName();

    // ✅ Restore expand buttons (tables + notes)
    ensureTableExpandButtons();
    ensureNotesExpandButtons();

    // Ensure base support ticket card is always locked
    enforceBaseTicketStatusLock();

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
