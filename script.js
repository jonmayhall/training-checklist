/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   FIXES:
   - Sidebar/menu nav works (sections toggle .active)
   - Add Trainer (+) works (no "required" input; no remove buttons)
   - Add POC (+) works (clones base mini-card; no remove buttons)
   - Add Row buttons for tables
   - Notes buttons scroll to notes
   - Support Tickets add card gating + status routing
   - Reset This Page buttons
   - LocalStorage save/restore for fields + dynamic clones
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
    state[id] = getFieldValue(el);
    writeState(state);
  };

  const restoreAllFields = () => {
    const state = readState();
    const fields = $$(`[${AUTO_ID_ATTR}]`);
    fields.forEach((el) => {
      const id = el.getAttribute(AUTO_ID_ATTR);
      if (!(id in state)) return;
      setFieldValue(el, state[id]);
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

  /* =======================
     NAV (MENU BUTTONS)
     - your CSS shows only .page-section.active
     - sidebar buttons are .nav-btn[data-target="section-id"]
  ======================= */
  const setActiveSection = (targetId) => {
    if (!targetId) return;

    const allSections = $$(".page-section");
    const target = document.getElementById(targetId);
    if (!target) return;

    allSections.forEach((s) => s.classList.remove("active"));
    target.classList.add("active");

    // update nav buttons
    $$(".nav-btn").forEach((b) => b.classList.remove("active"));
    const activeBtn = $(`.nav-btn[data-target="${CSS.escape(targetId)}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    // remember last page
    const state = readState();
    state.__activeSection = targetId;
    writeState(state);

    scrollIntoViewNice(target);
  };

  const initNav = () => {
    const state = readState();
    const remembered = state.__activeSection;

    // If something is already active in HTML, keep it; otherwise use remembered; otherwise first section.
    const alreadyActive = $(".page-section.active")?.id;
    const first = $$(".page-section")[0]?.id;

    setActiveSection(alreadyActive || remembered || first);
  };

  /* =======================
     RESET THIS PAGE BUTTONS
  ======================= */
  const trimDynamicToBase = (sectionEl) => {
    // Trainers: remove added rows
    const trainerContainer = $("#additionalTrainersContainer", sectionEl);
    if (trainerContainer) trainerContainer.innerHTML = "";

    // POCs: remove added mini-cards (keep base)
    $$(".additional-poc-card", sectionEl).forEach((card) => {
      if (card.getAttribute("data-base") === "true") return;
      card.remove();
    });

    // Tables: remove cloned rows
    $$("table.training-table tbody", sectionEl).forEach((tb) => {
      $$("tr", tb).forEach((tr) => {
        if (tr.getAttribute(AUTO_ROW_ATTR) === "cloned") tr.remove();
      });
    });

    // Tickets: keep only base in Open
    const open = $("#openTicketsContainer", sectionEl);
    if (open) {
      $$(".ticket-group", open).forEach((g) => {
        if (g.getAttribute("data-base") !== "true") g.remove();
      });

      const base = $(".ticket-group[data-base='true']", open);
      if (base) {
        $$("input, textarea", base).forEach((f) => {
          if (f.matches("input[type='checkbox']")) f.checked = false;
          else f.value = "";
          saveField(f);
        });
        const statusSel = $(".ticket-status-select", base);
        if (statusSel) {
          statusSel.value = "Open";
          statusSel.disabled = true;
          saveField(statusSel);
        }
      }
    }
  };

  const clearSectionState = (sectionEl) => {
    if (!sectionEl) return;
    const state = readState();

    // remove saved keys for fields inside section
    const fields = $$(`[${AUTO_ID_ATTR}]`, sectionEl);
    fields.forEach((el) => {
      const id = el.getAttribute(AUTO_ID_ATTR);
      delete state[id];

      if (el.matches("input[type='checkbox']")) el.checked = false;
      else if (el.matches("input[type='radio']")) el.checked = false;
      else if (el.matches("input, select, textarea")) el.value = "";
      else if (el.matches("[contenteditable='true']")) el.textContent = "";
    });

    writeState(state);
    trimDynamicToBase(sectionEl);
  };

  const onResetPage = (btn) => {
    const section = getSection(btn);
    clearSectionState(section);
  };

  /* =======================
     ADD TRAINER (+)
     - NO required input
     - NO remove button on added rows
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

  const addTrainerRow = () => {
    const input = $("#additionalTrainerInput");
    const container = $("#additionalTrainersContainer");
    if (!input || !container) return;

    const name = (input.value || "").trim(); // allowed to be blank if you want
    const row = buildTrainerRow(name);

    container.appendChild(row);

    // clear base input
    input.value = "";
    saveField(input);

    // save new field
    const rowInput = $("input", row);
    if (rowInput) saveField(rowInput);
  };

  /* =======================
     ADD POC (+)
     - Your HTML uses:
       .additional-poc-card[data-base="true"]
       button.additional-poc-add
     - We CLONE the base mini-card, clear fields, remove the + button on clones
     - NO required input
     - NO remove buttons
  ======================= */
  const addPocCard = (btn) => {
    const baseCard =
      btn?.closest?.(".additional-poc-card") ||
      $(".additional-poc-card[data-base='true']");
    if (!baseCard) return;

    const parent = baseCard.parentElement; // the grid wrapper
    if (!parent) return;

    const clone = baseCard.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, "poc");

    // remove the "+" button from clones
    const plus = $(".additional-poc-add", clone);
    if (plus) plus.remove();

    // clear fields + new ids
    $$("input, select, textarea", clone).forEach((el) => {
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";

      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      saveField(el);
    });

    parent.appendChild(clone);

    // focus first input if present
    const firstInput = $("input, textarea", clone);
    if (firstInput) firstInput.focus();
  };

  /* =======================
     TABLE: ADD ROW (+)
  ======================= */
  const cloneTableRow = (btn) => {
    const tableContainer = btn.closest(".table-container");
    if (!tableContainer) return;

    const table = $("table", tableContainer);
    const tbody = $("tbody", table);
    if (!tbody) return;

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
  };

  /* =======================
     NOTES ICON BUTTONS
  ======================= */
  const toggleNotes = (btn) => {
    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    // If hidden by your CSS classes, unhide best-effort
    if (target.classList.contains("is-hidden")) target.classList.remove("is-hidden");
    if (target.hasAttribute("hidden")) target.removeAttribute("hidden");

    scrollIntoViewNice(target);
    const ta = $("textarea", target);
    if (ta) ta.focus();
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

  const isTicketCardComplete = (card) => {
    const num = $(".ticket-number-input", card)?.value?.trim() || "";
    const url = $(".ticket-zendesk-input", card)?.value?.trim() || "";
    const sum = $(".ticket-summary-input", card)?.value?.trim() || "";
    return !!(num && url && sum);
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
    const clone = base.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, "ticket");

    $$("input, textarea", clone).forEach((el) => {
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
      status.removeAttribute(AUTO_ID_ATTR);
      ensureId(status);
      saveField(status);
    }

    openContainer.appendChild(clone);
    $(".ticket-number-input", clone)?.focus();
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
  };

  const onTicketStatusChange = (selectEl) => {
    const card = selectEl.closest(".ticket-group");
    if (!card) return;

    const statusVal = selectEl.value;
    const containers = ticketContainersByStatus();
    const dest = containers[statusVal] || containers.Open;

    if (dest) dest.appendChild(card);
    saveField(selectEl);
  };

  /* =======================
     EVENT DELEGATION
  ======================= */
  document.addEventListener("click", (e) => {
    const t = e.target;

    // NAV menu buttons
    const navBtn = t.closest(".nav-btn[data-target]");
    if (navBtn) {
      e.preventDefault();
      setActiveSection(navBtn.getAttribute("data-target"));
      return;
    }

    // Add Trainer (+)
    if (t.closest("[data-add-trainer]")) {
      e.preventDefault();
      addTrainerRow();
      return;
    }

    // Add POC (+) - your HTML uses .additional-poc-add
    const pocAdd = t.closest(".additional-poc-add");
    if (pocAdd) {
      e.preventDefault();
      addPocCard(pocAdd);
      return;
    }

    // Table add row (+)
    if (t.closest("button.add-row")) {
      e.preventDefault();
      cloneTableRow(t.closest("button.add-row"));
      return;
    }

    // Notes buttons
    if (t.closest("[data-notes-btn]")) {
      e.preventDefault();
      toggleNotes(t.closest("[data-notes-btn]"));
      return;
    }

    // Reset this page
    if (t.closest(".clear-page-btn")) {
      e.preventDefault();
      onResetPage(t.closest(".clear-page-btn"));
      return;
    }

    // Support ticket add (+)
    if (t.closest(".add-ticket-btn")) {
      e.preventDefault();
      addTicketCard(t.closest(".add-ticket-btn"));
      return;
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;

    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
    }

    if (el.matches(".ticket-number-input")) {
      onTicketNumberChange(el);
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;

    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
    }

    if (el.matches(".ticket-status-select")) {
      onTicketStatusChange(el);
    }
  });

  // Enter key adds Trainer row (no required input)
  document.addEventListener("keydown", (e) => {
    const el = e.target;
    if (!isEl(el)) return;

    if (el.id === "additionalTrainerInput" && e.key === "Enter") {
      e.preventDefault();
      addTrainerRow();
      return;
    }
  });

  /* =======================
     INIT
  ======================= */
  const init = () => {
    // ensure IDs on all existing fields
    assignIdsToAllFields();

    // support ticket status disabled until number entered
    $$(".ticket-group").forEach((card) => {
      const num = $(".ticket-number-input", card);
      const status = $(".ticket-status-select", card);
      if (num && status) status.disabled = !(num.value || "").trim();
      if (num) ensureId(num);
      if (status) ensureId(status);
    });

    // NAV must run BEFORE restore so correct section is visible
    initNav();

    // restore saved values
    restoreAllFields();

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
