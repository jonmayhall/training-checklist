/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   FIXES:
   - Add Trainer (+) works (matches Support Ticket pattern)
   - Add POC (+) works (same pattern)
   - Add Row buttons for tables
   - Notes buttons (open/scroll)
   - Support Tickets add card gating
   - Reset This Page buttons
   - LocalStorage save/restore for everything
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
    return (prefix = "mk") => `${prefix}-${Date.now()}-${(n++).toString(16)}-${Math.random().toString(16).slice(2)}`;
  })();

  const isEl = (x) => x && x.nodeType === 1;

  const getSection = (el) => el?.closest?.(".page-section") || el?.closest?.("section") || null;

  const ensureId = (el) => {
    if (!isEl(el)) return null;
    if (!el.getAttribute(AUTO_ID_ATTR)) el.setAttribute(AUTO_ID_ATTR, uid("fld"));
    return el.getAttribute(AUTO_ID_ATTR);
  };

  const isFormField = (el) =>
    isEl(el) &&
    (el.matches("input, select, textarea") ||
      el.matches("[contenteditable='true']"));

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

  const assignIdsToAllFields = () => {
    // assign IDs to existing fields so we can persist them
    const fields = $$("input, select, textarea, [contenteditable='true']");
    fields.forEach((el) => ensureId(el));
  };

  const clearSectionState = (sectionEl) => {
    if (!sectionEl) return;

    const state = readState();

    // clear values in DOM + remove keys from storage for fields in this section
    const fields = $$(`[${AUTO_ID_ATTR}]`, sectionEl);
    fields.forEach((el) => {
      const id = el.getAttribute(AUTO_ID_ATTR);
      delete state[id];

      // clear DOM
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else if (el.matches("input[type='radio']")) el.checked = false;
      else if (el.matches("input, select, textarea")) el.value = "";
      else if (el.matches("[contenteditable='true']")) el.textContent = "";
    });

    writeState(state);

    // If the section has dynamic containers (trainers/POCs/tickets/tables), optionally trim to base.
    trimDynamicToBase(sectionEl);
  };

  const trimDynamicToBase = (sectionEl) => {
    // 1) Additional Trainers container: remove added rows
    const trainerContainer = $("#additionalTrainersContainer", sectionEl);
    if (trainerContainer) trainerContainer.innerHTML = "";

    // 2) Additional POCs container: remove added rows
    const pocContainer = $("#additionalPocsContainer", sectionEl);
    if (pocContainer) pocContainer.innerHTML = "";

    // 3) Tables: keep first 1–3 template rows? (we’ll keep whatever is already there in HTML and remove rows added by JS cloning)
    $$("table.training-table tbody", sectionEl).forEach((tb) => {
      const rows = $$("tr", tb);
      rows.forEach((tr) => {
        if (tr.getAttribute(AUTO_ROW_ATTR) === "cloned") tr.remove();
      });
    });

    // 4) Support tickets: keep only base card in Open container
    const open = $("#openTicketsContainer", sectionEl);
    if (open) {
      const groups = $$(".ticket-group", open);
      groups.forEach((g) => {
        if (g.getAttribute("data-base") !== "true") g.remove();
      });
      // Clear base fields
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

    // Also clear saved keys for any removed nodes? (We cleared by section fields already.)
  };

  const scrollIntoViewNice = (el) => {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      el.scrollIntoView(true);
    }
  };

  /* =======================
     DYNAMIC: ADD TRAINER / ADD POC
     (matches the Support Ticket approach: gated add, create row, append)
  ======================= */

  const buildIntegratedRow = ({ labelText, placeholder, inputIdPrefix }) => {
    const wrap = document.createElement("div");
    wrap.className = "checklist-row integrated-plus indent-sub";
    wrap.setAttribute(AUTO_ROW_ATTR, "cloned");

    const label = document.createElement("label");
    label.textContent = labelText;

    const inputPlus = document.createElement("div");
    inputPlus.className = "input-plus";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.id = `${inputIdPrefix}-${uid("row")}`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-inline-btn";
    removeBtn.textContent = "–";
    removeBtn.title = "Remove";
    removeBtn.setAttribute("aria-label", "Remove");

    inputPlus.appendChild(input);
    inputPlus.appendChild(removeBtn);

    wrap.appendChild(label);
    wrap.appendChild(inputPlus);

    // persist new input
    ensureId(input);

    return wrap;
  };

  const addTrainerRow = () => {
    const input = $("#additionalTrainerInput");
    const container = $("#additionalTrainersContainer");
    if (!input || !container) return;

    const name = (input.value || "").trim();

    // Gate: require something in the input before adding
    if (!name) {
      input.focus();
      input.classList.add("mk-field-error");
      setTimeout(() => input.classList.remove("mk-field-error"), 600);
      return;
    }

    const row = buildIntegratedRow({
      labelText: "Additional Trainer",
      placeholder: "Enter additional trainer name",
      inputIdPrefix: "additionalTrainer",
    });

    const rowInput = $("input", row);
    rowInput.value = name;

    container.appendChild(row);

    // clear base input
    input.value = "";
    saveField(input);
    saveField(rowInput);
  };

  const addPocRow = () => {
    // These IDs are expected for POC. If yours are different, tell me and I’ll change it.
    const input = $("#additionalPocInput");
    const container = $("#additionalPocsContainer");
    if (!input || !container) return;

    const name = (input.value || "").trim();

    if (!name) {
      input.focus();
      input.classList.add("mk-field-error");
      setTimeout(() => input.classList.remove("mk-field-error"), 600);
      return;
    }

    const row = buildIntegratedRow({
      labelText: "Additional POC",
      placeholder: "Enter additional POC name",
      inputIdPrefix: "additionalPoc",
    });

    const rowInput = $("input", row);
    rowInput.value = name;

    container.appendChild(row);

    input.value = "";
    saveField(input);
    saveField(rowInput);
  };

  const removeIntegratedRow = (btn) => {
    const row = btn.closest(".checklist-row");
    if (!row) return;

    // remove saved key for the input in this row
    const input = $("input, textarea, select", row);
    if (input?.getAttribute(AUTO_ID_ATTR)) {
      const state = readState();
      delete state[input.getAttribute(AUTO_ID_ATTR)];
      writeState(state);
    }
    row.remove();
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

    const template = rows[rows.length - 1]; // clone last visible row
    const clone = template.cloneNode(true);
    clone.setAttribute(AUTO_ROW_ATTR, "cloned");

    // clear inputs/selects/checkboxes in clone + assign new mk ids
    $$("input, select, textarea", clone).forEach((el) => {
      // clear value
      if (el.matches("input[type='checkbox']")) el.checked = false;
      else el.value = "";

      // new id for persistence
      el.removeAttribute(AUTO_ID_ATTR);
      ensureId(el);
      saveField(el);
    });

    // Notes button target stays the same; OK.

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

    // If your CSS uses hidden class, toggle it. Otherwise just scroll.
    const isHidden =
      target.classList.contains("is-hidden") ||
      target.hasAttribute("hidden") ||
      getComputedStyle(target).display === "none";

    // Show if hidden
    if (target.classList.contains("is-hidden")) target.classList.remove("is-hidden");
    if (target.hasAttribute("hidden")) target.removeAttribute("hidden");

    // If display none by default and you use a class like .collapsed, try toggling
    if (isHidden) target.classList.add("mk-notes-open");

    scrollIntoViewNice(target);

    // focus textarea if present
    const ta = $("textarea", target);
    if (ta) ta.focus();
  };

  /* =======================
     SUPPORT TICKETS
     - Add ticket card only if current card is complete
     - Enable Status select once ticket number entered
     - Move cards between containers based on status
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

    // Match your disclaimer intent: require these before adding a new card
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

    // Must be complete before adding another
    if (!isTicketCardComplete(currentCard)) {
      markTicketCardErrors(currentCard);
      return;
    }

    // Clone BASE card if present, otherwise clone current
    const base = $(".ticket-group[data-base='true']", openContainer) || currentCard;
    const clone = base.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, "ticket");

    // Clear fields
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

    // append into Open container
    openContainer.appendChild(clone);

    // focus ticket number
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
     RESET THIS PAGE BUTTONS
  ======================= */
  const onResetPage = (btn) => {
    const section = getSection(btn);
    clearSectionState(section);
  };

  /* =======================
     EVENT DELEGATION (ONE LISTENER)
  ======================= */
  document.addEventListener("click", (e) => {
    const t = e.target;

    // Add Trainer
    if (t.closest("[data-add-trainer]")) {
      e.preventDefault();
      addTrainerRow();
      return;
    }

    // Add POC
    if (t.closest("[data-add-poc]")) {
      e.preventDefault();
      addPocRow();
      return;
    }

    // Remove integrated (trainer/poc) row (the "–" button we create)
    if (t.closest(".remove-inline-btn")) {
      e.preventDefault();
      removeIntegratedRow(t.closest(".remove-inline-btn"));
      return;
    }

    // Table add row
    if (t.closest("button.add-row")) {
      e.preventDefault();
      cloneTableRow(t.closest("button.add-row"));
      return;
    }

    // Notes
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

    // Support tickets add (+)
    if (t.closest(".add-ticket-btn")) {
      e.preventDefault();
      addTicketCard(t.closest(".add-ticket-btn"));
      return;
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;

    // Save any normal field
    if (isFormField(el)) {
      ensureId(el);
      saveField(el);
    }

    // Ticket number enables status
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

    // Move ticket card on status change
    if (el.matches(".ticket-status-select")) {
      onTicketStatusChange(el);
    }
  });

  /* =======================
     ENTER KEY BEHAVIOR
     - Press Enter in Additional Trainer / POC input triggers add
  ======================= */
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
      addPocRow();
      return;
    }
  });

  /* =======================
     INIT
  ======================= */
  const init = () => {
    assignIdsToAllFields();

    // Ensure the base support ticket status is disabled until ticket number entered
    $$(".ticket-group").forEach((card) => {
      const num = $(".ticket-number-input", card);
      const status = $(".ticket-status-select", card);
      if (num && status) status.disabled = !(num.value || "").trim();
      if (num) ensureId(num);
      if (status) ensureId(status);
    });

    restoreAllFields();

    log("Initialized.");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
