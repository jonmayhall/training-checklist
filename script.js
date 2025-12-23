/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Stable, single-file, no dependencies
   - Sidebar nav (page switching)
   - Autosave (localStorage) for inputs/selects/textareas
   - Clear All (global) + Reset This Page (per section)
   - Add Row (+) for ALL tables (.training-table) using last row as template
   - Additional Trainers (+)
   - Additional POC (+)
   - Support Tickets: add/remove, move by status, base locked to Open
   - Onsite dates: end defaults to start + 2 days
   - Dealership name mirrors into topbar display
   - Notes icon (📝): scroll to target notes, insert bullet (• Name: / • Opcode: / • Question:)
   ======================================================= */

(() => {
  "use strict";

  /* ---------------------------
     Helpers
  --------------------------- */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEY = "mk_training_checklist_autosave_v1";

  const isTextLike = (el) =>
    el &&
    (el.tagName === "INPUT" &&
      ["text", "email", "number", "date", "tel", "url", "search", "password"].includes(el.type)) ||
    el.tagName === "TEXTAREA";

  const isCheckbox = (el) => el && el.tagName === "INPUT" && el.type === "checkbox";
  const isSelect = (el) => el && el.tagName === "SELECT";

  const uid = () => Math.random().toString(36).slice(2, 10);

  function safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function addDaysToISODate(iso, days) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function normalizeValueForSave(el) {
    if (isCheckbox(el)) return el.checked ? "1" : "0";
    if (isSelect(el)) return el.value ?? "";
    if (isTextLike(el)) return el.value ?? "";
    return "";
  }

  function applyValueFromSave(el, saved) {
    if (saved == null) return;
    if (isCheckbox(el)) el.checked = saved === "1";
    else if (isSelect(el) || isTextLike(el)) el.value = saved;
  }

  function setPlaceholderClassForDate(el) {
    if (!el) return;
    const has = !!el.value;
    el.classList.toggle("is-placeholder", !has);
  }

  /* ---------------------------
     Autosave system
  --------------------------- */
  function ensureAutosaveId(el) {
    if (!el) return null;
    // Prefer existing id/name; otherwise assign a stable data-id
    if (el.id) return `#${el.id}`;
    if (el.name) return `name:${el.name}`;

    if (!el.dataset.autosaveId) {
      el.dataset.autosaveId = "asv_" + uid();
    }
    return `data:${el.dataset.autosaveId}`;
  }

  function getAllSavableFields(root = document) {
    const fields = qsa("input, select, textarea", root).filter((el) => {
      // Skip buttons and non-value inputs
      if (el.tagName === "INPUT") {
        if (["button", "submit", "reset", "file"].includes(el.type)) return false;
      }
      // Skip disabled (except ticket status select might be disabled, we still want to store it)
      // But disabled fields are generally derived; ignore unless needed:
      if (el.disabled && !el.classList.contains("ticket-status-select")) return false;
      return true;
    });
    return fields;
  }

  function loadAutosave() {
    const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
    if (!data || typeof data !== "object") return;

    // Apply in document
    const fields = getAllSavableFields(document);
    fields.forEach((el) => {
      const key = ensureAutosaveId(el);
      if (!key) return;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        applyValueFromSave(el, data[key]);
      }
    });

    // Update topbar dealership name display after restore
    syncDealershipNameToTopbar();

    // Update date placeholder classes
    setPlaceholderClassForDate(qs("#onsiteStartDate"));
    setPlaceholderClassForDate(qs("#onsiteEndDate"));

    // After restore, re-evaluate tickets (move cards to correct columns)
    reconcileTicketsFromDOM();
  }

  function saveAutosave() {
    const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), {}) || {};
    const fields = getAllSavableFields(document);

    fields.forEach((el) => {
      const key = ensureAutosaveId(el);
      if (!key) return;
      data[key] = normalizeValueForSave(el);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearAutosave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function resetFieldsInRoot(root) {
    const fields = getAllSavableFields(root);

    fields.forEach((el) => {
      if (isCheckbox(el)) el.checked = false;
      else if (isSelect(el)) {
        // Prefer ghost option
        const ghost = qsa("option", el).find((o) => o.dataset.ghost === "true");
        el.value = ghost ? ghost.value : "";
      } else if (isTextLike(el)) {
        el.value = "";
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Date placeholders
    setPlaceholderClassForDate(qs("#onsiteStartDate"));
    setPlaceholderClassForDate(qs("#onsiteEndDate"));

    // Clear dynamic rows that are not base
    cleanupDynamicClones(root);

    // Tickets re-lock base status
    reconcileTicketsFromDOM();

    // Sync topbar display
    syncDealershipNameToTopbar();

    saveAutosave();
  }

  function cleanupDynamicClones(root) {
    // Remove Additional Trainers clones
    qsa("#additionalTrainersContainer .checklist-row", root).forEach((row) => row.remove());

    // Remove additional POC clones (anything with data-base not true, but class additional-poc-card)
    qsa(".additional-poc-card", root).forEach((card) => {
      if (card.dataset.base === "true") return;
      card.remove();
    });

    // Remove table added rows beyond first baseline (we keep whatever is in HTML baseline)
    // NOTE: We only remove rows marked as data-added="true"
    qsa("tr[data-added='true']", root).forEach((tr) => tr.remove());

    // Support tickets: remove non-base cards
    qsa(".ticket-group", root).forEach((g) => {
      if (g.dataset.base === "true") return;
      g.remove();
    });
  }

  /* ---------------------------
     Sidebar Nav
  --------------------------- */
  function showSection(sectionId) {
    qsa(".page-section").forEach((sec) => sec.classList.remove("active"));
    const sec = qs(`#${CSS.escape(sectionId)}`);
    if (sec) sec.classList.add("active");

    qsa(".nav-btn").forEach((b) => b.classList.remove("active"));
    const btn = qs(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    // Scroll main to top for consistency (if layout allows)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initNav() {
    qsa(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        if (target) showSection(target);
      });
    });
  }

  /* ---------------------------
     Dealership name → topbar
  --------------------------- */
  function syncDealershipNameToTopbar() {
    const input = qs("#dealershipNameInput");
    const display = qs("#dealershipNameDisplay");
    if (!display) return;

    const name = input ? (input.value || "").trim() : "";
    display.textContent = name || "";
  }

  function initDealershipNameSync() {
    const input = qs("#dealershipNameInput");
    if (!input) return;
    input.addEventListener("input", () => {
      syncDealershipNameToTopbar();
      saveAutosave();
    });
  }

  /* ---------------------------
     Onsite dates end = start + 2 days
  --------------------------- */
  function initOnsiteDates() {
    const start = qs("#onsiteStartDate");
    const end = qs("#onsiteEndDate");
    if (!start || !end) return;

    const onUpdate = () => {
      setPlaceholderClassForDate(start);
      setPlaceholderClassForDate(end);

      if (start.value) {
        // If end empty OR end earlier than start, set to start + 2
        const desired = addDaysToISODate(start.value, 2);
        const endVal = end.value || "";
        if (!endVal) {
          end.value = desired;
        } else {
          // If end < start, bump it
          if (new Date(endVal + "T00:00:00") < new Date(start.value + "T00:00:00")) {
            end.value = desired;
          }
        }
        setPlaceholderClassForDate(end);
      }

      saveAutosave();
    };

    start.addEventListener("change", onUpdate);
    start.addEventListener("input", onUpdate);
    end.addEventListener("change", () => {
      setPlaceholderClassForDate(end);
      saveAutosave();
    });
    end.addEventListener("input", () => {
      setPlaceholderClassForDate(end);
      saveAutosave();
    });
  }

  /* ---------------------------
     Reset page + Clear all
  --------------------------- */
  function initResetButtons() {
    // Reset This Page
    qsa(".clear-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sec = btn.closest(".page-section");
        if (!sec) return;
        resetFieldsInRoot(sec);
      });
    });

    // Clear All
    const clearAllBtn = qs("#clearAllBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => {
        // Clear stored data and reset entire app
        clearAutosave();
        resetFieldsInRoot(document);
        // Ensure first page is visible
        const first = qs(".nav-btn[data-target]")?.getAttribute("data-target");
        if (first) showSection(first);
      });
    }
  }

  /* ---------------------------
     Generic Add Row (+) for tables
     - Works for any .training-table with a footer button .add-row
     - Clones LAST row of tbody to preserve Notes icon cell too
  --------------------------- */
  function clearInputsInRow(tr) {
    qsa("input, select, textarea", tr).forEach((el) => {
      if (isCheckbox(el)) el.checked = false;
      else if (isSelect(el)) {
        el.value = "";
      } else if (isTextLike(el)) {
        el.value = "";
      }
    });
  }

  function normalizeRowAfterClone(tr) {
    // Remove any saved autosave ids to avoid collisions
    qsa("[data-autosave-id]", tr).forEach((el) => delete el.dataset.autosaveId);

    // Clear values
    clearInputsInRow(tr);

    // Mark as added so page reset can remove extras
    tr.dataset.added = "true";
  }

  function initTableAddRow() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".table-footer .add-row");
      if (!btn) return;

      const container = btn.closest(".table-container");
      const table = container ? qs("table.training-table", container) : null;
      if (!table) return;

      const tbody = qs("tbody", table);
      if (!tbody) return;

      const rows = qsa("tr", tbody);
      if (!rows.length) return;

      const template = rows[rows.length - 1];
      const clone = template.cloneNode(true);

      normalizeRowAfterClone(clone);
      tbody.appendChild(clone);

      saveAutosave();
    });
  }

  /* ---------------------------
     Additional Trainers (+)
  --------------------------- */
  function buildAdditionalTrainerRow() {
    const row = document.createElement("div");
    row.className = "checklist-row integrated-plus indent-sub";
    row.innerHTML = `
      <label>Additional Trainer</label>
      <input type="text" placeholder="Enter additional trainer name">
      <button type="button" class="remove-row" title="Remove trainer">–</button>
    `;
    // New autosave ids will be assigned automatically on save
    return row;
  }

  function initAdditionalTrainers() {
    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".checklist-row[data-base='true'] .add-row");
      if (!addBtn) return;

      // Only for the Additional Trainer base row (page 1)
      const baseRow = addBtn.closest(".checklist-row");
      if (!baseRow || baseRow.querySelector("label")?.textContent?.trim() !== "Additional Trainer") return;

      const input = qs("input[type='text']", baseRow);
      const val = (input?.value || "").trim();

      // Optional gating: if base is empty, don't add
      if (!val) {
        input?.focus();
        return;
      }

      const container = qs("#additionalTrainersContainer");
      if (!container) return;

      const newRow = buildAdditionalTrainerRow();
      // Put value into the newly created row and clear base input
      const newInput = qs("input[type='text']", newRow);
      if (newInput) newInput.value = val;
      if (input) input.value = "";

      container.appendChild(newRow);
      saveAutosave();
    });

    // Remove trainer row
    document.addEventListener("click", (e) => {
      const rm = e.target.closest(".remove-row");
      if (!rm) return;
      const row = rm.closest(".checklist-row");
      if (!row) return;
      row.remove();
      saveAutosave();
    });
  }

  /* ---------------------------
     Additional POC (+)
  --------------------------- */
  function cloneAdditionalPOC(baseCard) {
    const clone = baseCard.cloneNode(true);
    clone.dataset.base = "false";

    // Remove the + button and replace with remove
    const plus = qs(".additional-poc-add", clone);
    if (plus) {
      plus.classList.remove("additional-poc-add");
      plus.classList.remove("add-row");
      plus.classList.add("remove-poc-btn");
      plus.textContent = "–";
      plus.title = "Remove contact";
    }

    // Clear values
    qsa("input, select, textarea", clone).forEach((el) => {
      if (isCheckbox(el)) el.checked = false;
      else if (isSelect(el)) el.value = "";
      else if (isTextLike(el)) el.value = "";
      // Clear autosave ids
      if (el.dataset.autosaveId) delete el.dataset.autosaveId;
    });

    return clone;
  }

  function initAdditionalPOC() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".additional-poc-add");
      if (!btn) return;

      const baseCard = btn.closest(".additional-poc-card");
      if (!baseCard || baseCard.dataset.base !== "true") return;

      // Gate: require name, role, and email/cell at least? (light gate: require name)
      const nameInput = qs('input[type="text"]', baseCard);
      if (nameInput && !nameInput.value.trim()) {
        nameInput.focus();
        return;
      }

      const grid = baseCard.parentElement; // primary-contacts-grid
      if (!grid) return;

      const newCard = cloneAdditionalPOC(baseCard);
      grid.appendChild(newCard);
      saveAutosave();
    });

    document.addEventListener("click", (e) => {
      const rm = e.target.closest(".remove-poc-btn");
      if (!rm) return;
      const card = rm.closest(".additional-poc-card");
      if (!card || card.dataset.base === "true") return;
      card.remove();
      saveAutosave();
    });
  }

  /* ---------------------------
     Support Tickets
     - Base card stays in Open only
     - "+" duplicates to a new Open ticket card (requires base to be filled)
     - Status select for non-base cards is enabled; moving columns happens on change
     - Remove button on non-base cards
  --------------------------- */
  const ticketContainers = {
    Open: () => qs("#openTicketsContainer"),
    "Tier Two": () => qs("#tierTwoTicketsContainer"),
    "Closed - Resolved": () => qs("#closedResolvedTicketsContainer"),
    "Closed - Feature Not Supported": () => qs("#closedFeatureTicketsContainer"),
  };

  function isTicketBaseComplete(baseGroup) {
    const num = qs(".ticket-number-input", baseGroup)?.value?.trim();
    const url = qs(".ticket-zendesk-input", baseGroup)?.value?.trim();
    const sum = qs(".ticket-summary-input", baseGroup)?.value?.trim();
    return !!(num && url && sum);
  }

  function createRemoveTicketBtn() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-ticket-btn";
    btn.title = "Remove Ticket";
    btn.textContent = "–";
    return btn;
  }

  function cloneTicketGroupFromBase(baseGroup) {
    const clone = baseGroup.cloneNode(true);
    clone.dataset.base = "false";

    // Enable status select for clone
    const statusSel = qs(".ticket-status-select", clone);
    if (statusSel) statusSel.disabled = false;

    // Remove disclaimer in clone
    const disclaimer = qs(".ticket-disclaimer", clone);
    if (disclaimer) disclaimer.remove();

    // Change "+" button to remove button
    const addBtn = qs(".add-ticket-btn", clone);
    if (addBtn) {
      addBtn.replaceWith(createRemoveTicketBtn());
    }

    // Keep values from base (we intentionally copy filled base into new card),
    // then clear base fields after adding
    return clone;
  }

  function moveTicketGroupToStatus(ticketGroup, status) {
    const containerGetter = ticketContainers[status];
    const container = containerGetter ? containerGetter() : null;
    if (!container) return;

    container.appendChild(ticketGroup);
  }

  function lockBaseTicketStatus() {
    const base = qs("#openTicketsContainer .ticket-group[data-base='true']");
    if (!base) return;
    const sel = qs(".ticket-status-select", base);
    if (!sel) return;
    sel.value = "Open";
    sel.disabled = true;
  }

  function initSupportTickets() {
    // Add ticket from base (Open)
    document.addEventListener("click", (e) => {
      const add = e.target.closest(".add-ticket-btn");
      if (!add) return;

      const baseGroup = add.closest(".ticket-group");
      if (!baseGroup || baseGroup.dataset.base !== "true") return;

      if (!isTicketBaseComplete(baseGroup)) {
        // Gate: must complete base before adding
        // (No alert to keep UX clean; focus first missing)
        const num = qs(".ticket-number-input", baseGroup);
        const url = qs(".ticket-zendesk-input", baseGroup);
        const sum = qs(".ticket-summary-input", baseGroup);

        if (num && !num.value.trim()) return num.focus();
        if (url && !url.value.trim()) return url.focus();
        if (sum && !sum.value.trim()) return sum.focus();
        return;
      }

      const clone = cloneTicketGroupFromBase(baseGroup);
      // Ensure clone status defaults to Open
      const statusSel = qs(".ticket-status-select", clone);
      if (statusSel) statusSel.value = "Open";

      // Append clone into Open container
      moveTicketGroupToStatus(clone, "Open");

      // Clear base fields for next ticket
      qsa("input, textarea", baseGroup).forEach((el) => {
        if (isTextLike(el)) el.value = "";
      });
      lockBaseTicketStatus();

      saveAutosave();
    });

    // Remove non-base ticket
    document.addEventListener("click", (e) => {
      const rm = e.target.closest(".remove-ticket-btn");
      if (!rm) return;
      const group = rm.closest(".ticket-group");
      if (!group || group.dataset.base === "true") return;
      group.remove();
      saveAutosave();
    });

    // Change status → move ticket to correct column (non-base only)
    document.addEventListener("change", (e) => {
      const sel = e.target.closest(".ticket-status-select");
      if (!sel) return;

      const group = sel.closest(".ticket-group");
      if (!group || group.dataset.base === "true") {
        lockBaseTicketStatus();
        return;
      }

      const val = sel.value || "Open";
      moveTicketGroupToStatus(group, val);
      saveAutosave();
    });

    lockBaseTicketStatus();
  }

  function reconcileTicketsFromDOM() {
    // After load/reset: enforce base status and move non-base groups according to their select value
    lockBaseTicketStatus();

    qsa(".ticket-group").forEach((group) => {
      if (group.dataset.base === "true") return;

      const sel = qs(".ticket-status-select", group);
      if (!sel) return;

      // Ensure enabled
      sel.disabled = false;

      // Replace any lingering add button with remove button
      const addBtn = qs(".add-ticket-btn", group);
      if (addBtn) addBtn.replaceWith(createRemoveTicketBtn());

      // Remove disclaimer if present
      const disclaimer = qs(".ticket-disclaimer", group);
      if (disclaimer) disclaimer.remove();

      const status = sel.value || "Open";
      moveTicketGroupToStatus(group, status);
    });
  }

  /* ---------------------------
     Notes Icon Buttons (📝)
     - Scroll to target notes block
     - Insert bullet template into textarea
       • If row has name/opcode → "• <value>:"
       • Else → "• Question:"
  --------------------------- */
  function getRowLabelForNotes(btn) {
    const row = btn.closest("tr");
    if (!row) return "";

    // Prefer "Opcode" table: second column text input commonly in row
    // But we can just take first text input in the row
    const textInputs = qsa('input[type="text"]', row);
    if (textInputs.length) return (textInputs[0].value || "").trim();

    // If there are no text inputs, fallback empty
    return "";
  }

  function insertAtCursor(textarea, insertText) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;

    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);

    const needsNL = before.length && !before.endsWith("\n");
    const text = (needsNL ? "\n" : "") + insertText;

    textarea.value = before + text + after;

    const newPos = (before + text).length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function initNotesIcons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".notes-icon-btn");
      if (!btn) return;

      const targetId = btn.getAttribute("data-notes-target");
      if (!targetId) return;

      const block = qs(`#${CSS.escape(targetId)}`);
      if (!block) return;

      const textarea = qs("textarea", block);
      if (!textarea) return;

      const label = getRowLabelForNotes(btn);
      const bullet = label ? `• ${label}:\n` : `• Question:\n`;

      block.scrollIntoView({ behavior: "smooth", block: "start" });
      insertAtCursor(textarea, bullet);

      saveAutosave();
    });
  }

  /* ---------------------------
     Global autosave listeners
  --------------------------- */
  function initAutosaveListeners() {
    // Save on input/change for all fields
    document.addEventListener("input", (e) => {
      const el = e.target;
      if (!el) return;

      if (el.id === "dealershipNameInput") {
        syncDealershipNameToTopbar();
      }

      // Date placeholder class updates
      if (el.id === "onsiteStartDate" || el.id === "onsiteEndDate") {
        setPlaceholderClassForDate(el);
      }

      // If user edits base ticket fields, nothing special—just save
      saveAutosave();
    });

    document.addEventListener("change", (e) => {
      const el = e.target;
      if (!el) return;

      if (el.id === "dealershipNameInput") {
        syncDealershipNameToTopbar();
      }

      if (el.id === "onsiteStartDate" || el.id === "onsiteEndDate") {
        setPlaceholderClassForDate(el);
      }

      saveAutosave();
    });
  }

  /* ---------------------------
     Map "Map" button (fallback)
     - If your Google Maps autocomplete is present, it will update iframe elsewhere
     - This button just opens the typed address in a new tab (Google Maps)
  --------------------------- */
  function initMapButtonFallback() {
    const btn = qs("#openAddressInMapsBtn");
    const input = qs("#dealershipAddressInput");
    if (!btn || !input) return;

    btn.addEventListener("click", () => {
      const addr = (input.value || "").trim();
      if (!addr) return input.focus();
      const url = "https://www.google.com/maps?q=" + encodeURIComponent(addr);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  /* ---------------------------
     Init
  --------------------------- */
  function init() {
    initNav();
    initResetButtons();
    initTableAddRow();
    initAdditionalTrainers();
    initAdditionalPOC();
    initSupportTickets();
    initOnsiteDates();
    initDealershipNameSync();
    initNotesIcons();
    initAutosaveListeners();
    initMapButtonFallback();

    // Restore values last
    loadAutosave();

    // Ensure base ticket status always Open
    lockBaseTicketStatus();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
