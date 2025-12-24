/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Stable Build Helpers + Fixes Requested
   - Nav clicks + active state
   - Autosave (localStorage) + Restore
   - Reset Page + Clear All
   - Onsite dates: end defaults to start + 2 days
   - Additional Trainers (+) + remove
   - Additional POC (+) + remove
   - Training / Opcode tables: Add Row (+)
   - Table Popups: WHITE modal, exact table clone + 2nd card for related Notes
   - Expand (⤢) button in each table footer (auto-injected if missing)
   - Notes buttons (📝): re-enabled everywhere; inserts ordered bullets with spacing
     * Training tables: bullet uses Name column
     * Opcodes table: bullet uses Opcode value
     * Any other notes icon: bullet uses the question label text
   - Placeholder/ghost text: JS adds `.is-placeholder` class consistently
     (CSS should style `.is-placeholder` to your light grey)
======================================================= */

(() => {
  "use strict";

  /* -----------------------------
     UTIL
  ----------------------------- */
  const LS_KEY = "mk_training_checklist_v1";
  const NOTES_KEY = "mk_training_notes_v1";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const safeJSONParse = (str, fallback) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const debounce = (fn, wait = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const uid = () =>
    (crypto?.randomUUID?.() || `uid_${Math.random().toString(16).slice(2)}_${Date.now()}`);

  const closestSectionId = (el) => el?.closest?.(".page-section")?.id || "unknown-section";

  /* -----------------------------
     NAV
  ----------------------------- */
  function initNav() {
    const navButtons = $$("#sidebar-nav .nav-btn");
    const sections = $$(".page-section");

    const showSection = (id) => {
      sections.forEach((s) => s.classList.toggle("active", s.id === id));
      navButtons.forEach((b) => b.classList.toggle("active", b.dataset.target === id));
      // Keep scroll predictable
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    };

    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        if (!target) return;
        showSection(target);
        // store last page
        const state = loadState();
        state.__lastPage = target;
        saveState(state);
      });
    });

    // restore last page if saved
    const state = loadState();
    if (state.__lastPage && $("#" + state.__lastPage)) showSection(state.__lastPage);
  }

  /* -----------------------------
     PLACEHOLDER / GHOST TEXT CLASSING
     (CSS should style .is-placeholder in light grey)
  ----------------------------- */
  function applyPlaceholderClassToSelect(sel) {
    const opt = sel.selectedOptions?.[0];
    const isGhost = !!opt?.dataset?.ghost || sel.value === "" || opt?.value === "";
    sel.classList.toggle("is-placeholder", isGhost);
  }

  function applyPlaceholderClassToInput(inp) {
    // For date: empty should be placeholder-style
    if (inp.type === "date") {
      inp.classList.toggle("is-placeholder", !inp.value);
      return;
    }
    // For text-like: empty + has placeholder => placeholder-style
    const hasPh = !!inp.getAttribute("placeholder");
    if (hasPh) inp.classList.toggle("is-placeholder", !inp.value);
  }

  function applyPlaceholderClassToTextarea(ta) {
    const hasPh = !!ta.getAttribute("placeholder");
    if (hasPh) ta.classList.toggle("is-placeholder", !ta.value);
  }

  function initPlaceholderStyling() {
    // initial pass
    $$("select").forEach(applyPlaceholderClassToSelect);
    $$("input").forEach(applyPlaceholderClassToInput);
    $$("textarea").forEach(applyPlaceholderClassToTextarea);

    // live updates
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (t?.tagName === "SELECT") applyPlaceholderClassToSelect(t);
      if (t?.tagName === "INPUT") applyPlaceholderClassToInput(t);
      if (t?.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(t);
    });

    document.addEventListener("input", (e) => {
      const t = e.target;
      if (t?.tagName === "INPUT") applyPlaceholderClassToInput(t);
      if (t?.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(t);
    });
  }

  /* -----------------------------
     AUTOSAVE / RESTORE
  ----------------------------- */
  function loadState() {
    return safeJSONParse(localStorage.getItem(LS_KEY), {}) || {};
  }

  function saveState(state) {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function snapshotTables(state) {
    state.__tables = state.__tables || {};
    $$(".table-container").forEach((tc, idx) => {
      const sectionId = closestSectionId(tc);
      const table = $("table", tc);
      if (!table) return;
      const key = `${sectionId}::table::${idx}`;
      // Save tbody only (keeps header stable)
      const tbody = table.tBodies?.[0];
      if (tbody) state.__tables[key] = tbody.innerHTML;
    });
  }

  function restoreTables(state) {
    const map = state.__tables || {};
    $$(".table-container").forEach((tc, idx) => {
      const sectionId = closestSectionId(tc);
      const table = $("table", tc);
      if (!table) return;
      const key = `${sectionId}::table::${idx}`;
      const tbody = table.tBodies?.[0];
      if (tbody && map[key]) tbody.innerHTML = map[key];
    });
  }

  function snapshotDynamicBlocks(state) {
    // Additional trainers container
    const at = $("#additionalTrainersContainer");
    if (at) state.__additionalTrainersHTML = at.innerHTML;

    // Additional POCs (all clones created)
    const pcs = $$(".additional-poc-card");
    if (pcs.length) {
      state.__additionalPocsHTML = pcs.map((c) => c.outerHTML).join("");
    }

    // Support tickets containers
    const tickets = {
      open: $("#openTicketsContainer")?.innerHTML || "",
      tierTwo: $("#tierTwoTicketsContainer")?.innerHTML || "",
      closedResolved: $("#closedResolvedTicketsContainer")?.innerHTML || "",
      closedFeature: $("#closedFeatureTicketsContainer")?.innerHTML || ""
    };
    state.__ticketsHTML = tickets;
  }

  function restoreDynamicBlocks(state) {
    if (typeof state.__additionalTrainersHTML === "string" && $("#additionalTrainersContainer")) {
      $("#additionalTrainersContainer").innerHTML = state.__additionalTrainersHTML;
    }

    // restore additional POC cards by replacing the whole grid segment
    if (typeof state.__additionalPocsHTML === "string" && state.__additionalPocsHTML) {
      // Find the primary contacts grid and remove existing additional POC cards then reinsert saved HTML
      const grid = $(".primary-contacts-grid");
      if (grid) {
        $$(".additional-poc-card", grid).forEach((el) => el.remove());
        // Insert saved cards at end (keeps primary cards intact)
        const wrapper = document.createElement("div");
        wrapper.innerHTML = state.__additionalPocsHTML;
        Array.from(wrapper.children).forEach((child) => grid.appendChild(child));
      }
    }

    if (state.__ticketsHTML) {
      if ($("#openTicketsContainer")) $("#openTicketsContainer").innerHTML = state.__ticketsHTML.open || $("#openTicketsContainer").innerHTML;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = state.__ticketsHTML.tierTwo || "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = state.__ticketsHTML.closedResolved || "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = state.__ticketsHTML.closedFeature || "";
    }
  }

  function snapshotFormControls(state) {
    state.__controls = state.__controls || {};

    // Save values by stable index within each section
    $$(".page-section").forEach((sec) => {
      const sectionId = sec.id;
      const controls = $$("input, select, textarea", sec);

      controls.forEach((el, i) => {
        // Skip table cells and dynamic clones handled via HTML snapshots (prevents mismatches)
        const inTable = !!el.closest("table");
        const inTickets = !!el.closest("#support-tickets");
        const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
        const inAdditionalPoc = !!el.closest(".additional-poc-card");
        if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

        const key = `${sectionId}::ctrl::${i}`;
        if (el.type === "checkbox") {
          state.__controls[key] = !!el.checked;
        } else {
          state.__controls[key] = el.value ?? "";
        }
      });
    });
  }

  function restoreFormControls(state) {
    const map = state.__controls || {};
    $$(".page-section").forEach((sec) => {
      const sectionId = sec.id;
      const controls = $$("input, select, textarea", sec);

      controls.forEach((el, i) => {
        const inTable = !!el.closest("table");
        const inTickets = !!el.closest("#support-tickets");
        const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
        const inAdditionalPoc = !!el.closest(".additional-poc-card");
        if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

        const key = `${sectionId}::ctrl::${i}`;
        if (!(key in map)) return;

        if (el.type === "checkbox") el.checked = !!map[key];
        else el.value = map[key];

        // ensure placeholder classes update
        if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
        if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
        if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
      });
    });
  }

  const persistAllDebounced = debounce(() => {
    const state = loadState();
    snapshotTables(state);
    snapshotDynamicBlocks(state);
    snapshotFormControls(state);
    saveState(state);
  }, 300);

  function initAutosave() {
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.matches("input, textarea")) persistAllDebounced();
    });

    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.matches("select, input[type='checkbox'], input[type='date']")) persistAllDebounced();
    });
  }

  function restoreAll() {
    const state = loadState();
    restoreTables(state);
    restoreDynamicBlocks(state);
    restoreFormControls(state);

    // after restore, re-bind dynamic handlers
    bindDynamicHandlers();
    initSupportTickets(); // rebuild status locks + handlers
    initTableFooters();   // reinject expand button if needed
    initNotesButtons();   // notes handlers
    initTrainingTableAddRow(); // add-row handlers
    initAdditionalTrainers();
    initAdditionalPOCs();

    // placeholder classes refresh
    initPlaceholderStyling();
  }

  /* -----------------------------
     RESET PAGE / CLEAR ALL
  ----------------------------- */
  function clearSection(sectionEl) {
    if (!sectionEl) return;

    // Reset non-table controls
    $$("input, select, textarea", sectionEl).forEach((el) => {
      const inTable = !!el.closest("table");
      const inTickets = !!el.closest("#support-tickets");
      const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
      const inAdditionalPoc = !!el.closest(".additional-poc-card");
      if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // Reset tables in that section: remove extra rows leaving the first 3 rows if present (or 1)
    $$(".table-container", sectionEl).forEach((tc) => {
      const table = $("table", tc);
      const tbody = table?.tBodies?.[0];
      if (!tbody) return;

      const rows = Array.from(tbody.rows);
      // Keep at least 1 row
      const keep = Math.max(1, Math.min(3, rows.length));
      rows.forEach((r, idx) => {
        if (idx >= keep) r.remove();
        else {
          $$("input, select, textarea", r).forEach((el) => {
            if (el.type === "checkbox") el.checked = false;
            else el.value = "";
          });
        }
      });
    });

    // Reset additional trainers if on that page
    if (sectionEl.id === "trainers-deployment") {
      const at = $("#additionalTrainersContainer");
      if (at) at.innerHTML = "";
      // Clear base additional trainer input
      const base = $(".checklist-row[data-base='true'] input[type='text']", sectionEl);
      if (base) base.value = "";
    }

    // Reset additional POCs if in dealership page
    if (sectionEl.id === "dealership-info") {
      const grid = $(".primary-contacts-grid", sectionEl);
      if (grid) {
        // remove all additional POC cards except the first base one (if present)
        const cards = $$(".additional-poc-card", grid);
        cards.forEach((c, idx) => {
          if (idx === 0) {
            $$("input", c).forEach((inp) => (inp.value = ""));
          } else {
            c.remove();
          }
        });
      }
    }

    // Reset support tickets page fully
    if (sectionEl.id === "support-tickets") {
      // Keep only base open card as provided
      const open = $("#openTicketsContainer");
      const base = $(".ticket-group[data-base='true']", open);
      if (open && base) open.innerHTML = base.outerHTML;
      const tierTwo = $("#tierTwoTicketsContainer");
      const closedResolved = $("#closedResolvedTicketsContainer");
      const closedFeature = $("#closedFeatureTicketsContainer");
      if (tierTwo) tierTwo.innerHTML = "";
      if (closedResolved) closedResolved.innerHTML = "";
      if (closedFeature) closedFeature.innerHTML = "";
    }

    // Re-apply placeholder classes
    $$("select", sectionEl).forEach(applyPlaceholderClassToSelect);
    $$("input", sectionEl).forEach(applyPlaceholderClassToInput);
    $$("textarea", sectionEl).forEach(applyPlaceholderClassToTextarea);

    // Persist
    persistAllDebounced();
  }

  function initResetButtons() {
    $$(".clear-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sec = btn.closest(".page-section");
        clearSection(sec);
      });
    });

    const clearAllBtn = $("#clearAllBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(NOTES_KEY);

        // Hard reset UI
        $$(".page-section").forEach(clearSection);

        // Also clear any modals
        closeModal();

        // Ensure autosave doesn’t re-save old state
        saveState({});
      });
    }
  }

  /* -----------------------------
     ONSITE DATES: end defaults to start + 2 days
  ----------------------------- */
  function initOnsiteDates() {
    const start = $("#onsiteStartDate");
    const end = $("#onsiteEndDate");
    if (!start || !end) return;

    const addDays = (yyyy_mm_dd, days) => {
      const d = new Date(yyyy_mm_dd + "T00:00:00");
      if (Number.isNaN(d.getTime())) return "";
      d.setDate(d.getDate() + days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    start.addEventListener("change", () => {
      if (!start.value) return;
      if (!end.value) {
        end.value = addDays(start.value, 2);
        applyPlaceholderClassToInput(end);
        persistAllDebounced();
      }
    });
  }

  /* -----------------------------
     ADDITIONAL TRAINERS (+) FIX
  ----------------------------- */
  function makeRemovableRow(rowEl, removeLabel = "Remove") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-row";
    btn.title = removeLabel;
    btn.textContent = "×";
    btn.addEventListener("click", () => {
      rowEl.remove();
      persistAllDebounced();
    });
    return btn;
  }

  function initAdditionalTrainers() {
    const container = $("#additionalTrainersContainer");
    const baseRow = $(".checklist-row.integrated-plus[data-base='true']");
    if (!container || !baseRow) return;

    // Ensure base add button works
    const addBtn = $(".add-row", baseRow);
    if (!addBtn) return;

    addBtn.addEventListener("click", () => {
      // Clone base row layout
      const clone = baseRow.cloneNode(true);
      clone.dataset.base = "false";
      // Clear input
      const inp = $("input[type='text']", clone);
      if (inp) inp.value = "";
      // Remove old add button, replace with remove button
      const oldAdd = $(".add-row", clone);
      if (oldAdd) oldAdd.remove();
      clone.appendChild(makeRemovableRow(clone, "Remove trainer"));
      container.appendChild(clone);

      // Reapply placeholder
      if (inp) applyPlaceholderClassToInput(inp);

      persistAllDebounced();
    });

    // Any restored clones should have remove buttons bound
    $$(".checklist-row.integrated-plus", container).forEach((row) => {
      if (row.dataset.base === "true") return;
      // If remove button missing, add it
      if (!$(".remove-row", row)) row.appendChild(makeRemovableRow(row, "Remove trainer"));
      // Ensure its input has placeholder class
      const inp = $("input[type='text']", row);
      if (inp) applyPlaceholderClassToInput(inp);
      // Strip any accidental add-row buttons inside clones
      $$(".add-row", row).forEach((b) => b.remove());
    });
  }

  /* -----------------------------
     ADDITIONAL POCs (+)
  ----------------------------- */
  function initAdditionalPOCs() {
    const baseCard = $(".additional-poc-card[data-base='true']");
    const addBtn = $(".additional-poc-add", baseCard || document);
    const grid = $(".primary-contacts-grid");
    if (!baseCard || !addBtn || !grid) return;

    addBtn.addEventListener("click", () => {
      const clone = baseCard.cloneNode(true);
      clone.dataset.base = "false";

      // Clear inputs
      $$("input", clone).forEach((inp) => (inp.value = ""));

      // Replace + button with remove button
      const plus = $(".additional-poc-add", clone);
      if (plus) plus.remove();

      // Add remove control (simple button in the top row)
      const topRow = $(".checklist-row.integrated-plus", clone) || clone;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "remove-row additional-poc-remove";
      rm.title = "Remove contact";
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        clone.remove();
        persistAllDebounced();
      });
      topRow.appendChild(rm);

      grid.appendChild(clone);

      // placeholder class
      $$("input, select, textarea", clone).forEach((el) => {
        if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
        if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
        if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
      });

      persistAllDebounced();
    });

    // Bind remove buttons for restored clones
    $$(".additional-poc-card", grid).forEach((card) => {
      if (card.dataset.base === "true") return;
      if (!$(".additional-poc-remove", card)) {
        const topRow = $(".checklist-row.integrated-plus", card) || card;
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "remove-row additional-poc-remove";
        rm.title = "Remove contact";
        rm.textContent = "×";
        rm.addEventListener("click", () => {
          card.remove();
          persistAllDebounced();
        });
        topRow.appendChild(rm);
      }
      // Remove any + buttons that got restored into clones
      $$(".additional-poc-add", card).forEach((b) => b.remove());
    });
  }

  /* -----------------------------
     TABLE: ADD ROW (+)
  ----------------------------- */
  function clearRowControls(row) {
    $$("input, select, textarea", row).forEach((el) => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
      if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
      if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
      if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
    });
  }

  function cloneLastRow(table) {
    const tbody = table.tBodies?.[0];
    if (!tbody || !tbody.rows.length) return null;
    const last = tbody.rows[tbody.rows.length - 1];
    const clone = last.cloneNode(true);

    // Keep any notes icon cell/button intact; just clear inputs/selects
    clearRowControls(clone);

    tbody.appendChild(clone);
    return clone;
  }

  function initTrainingTableAddRow() {
    // table footer "+" buttons already exist
    $$(".table-container").forEach((tc) => {
      const footerAdd = $(".table-footer .add-row", tc);
      const table = $("table", tc);
      if (!footerAdd || !table) return;

      // Avoid double-binding
      if (footerAdd.dataset.bound === "true") return;
      footerAdd.dataset.bound = "true";

      footerAdd.addEventListener("click", () => {
        const newRow = cloneLastRow(table);
        if (newRow) {
          bindNotesButtonsWithin(newRow);
          persistAllDebounced();
        }
      });
    });
  }

  /* -----------------------------
     TABLE POPUP MODAL (WHITE, 2 CARDS)
     - Card 1: exact cloned table container (header+body)
     - Card 2: related Notes section textarea (linked)
  ----------------------------- */
  let modalEl = null;

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement("div");
    modalEl.id = "mkTableModal";
    modalEl.style.position = "fixed";
    modalEl.style.inset = "0";
    modalEl.style.zIndex = "9999";
    modalEl.style.display = "none";
    modalEl.style.background = "rgba(0,0,0,0.55)";
    modalEl.style.padding = "24px";
    modalEl.style.overflow = "auto";

    modalEl.innerHTML = `
      <div id="mkTableModalInner" style="
        max-width: 1200px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 14px;
        padding: 18px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      ">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
          <div id="mkTableModalTitle" style="font-weight:700; font-size:18px;"></div>
          <div style="display:flex; gap:8px;">
            <button type="button" id="mkTableModalToggle" title="Toggle full width" style="
              border: 1px solid rgba(0,0,0,0.12);
              background: #fff;
              border-radius: 10px;
              padding: 8px 10px;
              cursor: pointer;
            ">⤢</button>
            <button type="button" id="mkTableModalClose" title="Close" style="
              border: 1px solid rgba(0,0,0,0.12);
              background: #fff;
              border-radius: 10px;
              padding: 8px 10px;
              cursor: pointer;
            ">✕</button>
          </div>
        </div>

        <div id="mkTableModalCards" style="display:grid; gap:14px;">
          <!-- cards injected -->
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    $("#mkTableModalClose", modalEl).addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

    $("#mkTableModalToggle", modalEl).addEventListener("click", () => {
      const inner = $("#mkTableModalInner", modalEl);
      if (!inner) return;
      const isFull = inner.dataset.full === "true";
      inner.dataset.full = (!isFull).toString();
      inner.style.maxWidth = isFull ? "1200px" : "96vw";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalEl?.style?.display === "block") closeModal();
    });

    return modalEl;
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.style.display = "none";
    const cards = $("#mkTableModalCards", modalEl);
    if (cards) cards.innerHTML = "";
  }

  function findRelatedNotesId(tableContainer) {
    // Preferred: any notes-icon-btn inside the table defines data-notes-target
    const btn = $(".notes-icon-btn[data-notes-target]", tableContainer);
    const direct = btn?.dataset?.notesTarget;
    if (direct && $("#" + direct)) return direct;

    // Otherwise: look for a notes block in same section after this table container
    const section = tableContainer.closest(".page-section");
    if (!section) return null;

    // Find nearest notes section-block following it
    const allNotes = $$("[id^='notes-'].section-block, .section-block[id^='notes-']", section);
    if (!allNotes.length) return null;

    // Choose the first one whose id matches section context loosely
    // fallback to first notes block
    return allNotes[0].id || null;
  }

  function openTablePopup(tableContainer) {
    const modal = ensureModal();
    const cards = $("#mkTableModalCards", modal);
    const title = $("#mkTableModalTitle", modal);
    if (!cards || !title) return;

    // Title: section header text if present
    const sectionHeader =
      tableContainer.closest(".section")?.querySelector(".section-header span")?.textContent?.trim() ||
      tableContainer.closest(".section")?.querySelector(".section-header")?.textContent?.trim() ||
      tableContainer.closest(".page-section")?.querySelector("h1")?.textContent?.trim() ||
      "Table";

    title.textContent = sectionHeader;

    // Card 1: Table clone inside a "section-block"-looking wrapper
    const card1 = document.createElement("div");
    card1.className = "section-block";
    card1.style.background = "#fff";
    card1.style.borderRadius = "14px";
    card1.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
    card1.style.padding = "14px";

    // Clone scroll-wrapper content so layout looks identical
    const scrollWrap = $(".scroll-wrapper", tableContainer);
    const clonedWrap = scrollWrap ? scrollWrap.cloneNode(true) : tableContainer.cloneNode(true);

    // Remove footer buttons from clone (we only want the table area)
    $$(".table-footer", clonedWrap).forEach((el) => el.remove());

    // Make sure it scrolls horizontally/vertically in modal
    clonedWrap.style.maxHeight = "55vh";
    clonedWrap.style.overflow = "auto";

    card1.appendChild(clonedWrap);

    // Card 2: Related notes textarea (live linked)
    const notesId = findRelatedNotesId(tableContainer);
    const notesBlock = notesId ? $("#" + notesId) : null;
    const notesTextarea = notesBlock ? $("textarea", notesBlock) : null;

    const card2 = document.createElement("div");
    card2.className = "section-block";
    card2.style.background = "#fff";
    card2.style.borderRadius = "14px";
    card2.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
    card2.style.padding = "14px";

    const notesTitle = document.createElement("div");
    notesTitle.style.fontWeight = "700";
    notesTitle.style.marginBottom = "8px";
    notesTitle.textContent = notesBlock?.querySelector("h2")?.textContent?.trim() || "Notes";
    card2.appendChild(notesTitle);

    const notesClone = document.createElement("textarea");
    notesClone.rows = 6;
    notesClone.style.width = "100%";
    notesClone.style.minHeight = "140px";

    // Mirror value + keep synced both ways
    notesClone.value = notesTextarea ? notesTextarea.value : "";
    notesClone.placeholder = notesTextarea?.placeholder || "Notes";

    notesClone.addEventListener("input", () => {
      if (notesTextarea) {
        notesTextarea.value = notesClone.value;
        applyPlaceholderClassToTextarea(notesTextarea);
        persistAllDebounced();
      }
    });

    if (notesTextarea) {
      // Also update the modal copy if outside changes occur
      const sync = () => {
        if (notesClone.value !== notesTextarea.value) notesClone.value = notesTextarea.value;
      };
      notesTextarea.addEventListener("input", sync);
      notesTextarea.addEventListener("change", sync);
    }

    card2.appendChild(notesClone);

    // Render
    cards.innerHTML = "";
    cards.appendChild(card1);
    cards.appendChild(card2);

    modal.style.display = "block";

    // Re-bind notes buttons inside cloned table to act on original notes target
    // (We bind within the modal clone so clicking 📝 still inserts bullets properly)
    bindNotesButtonsWithin(card1, { overrideNotesTarget: notesId, originalContainer: tableContainer });

    // Add-row buttons in modal should add to ORIGINAL table (not clone)
    // We'll intercept by creating a small + row button in the modal card header? Not requested.
    // The original add-row remains on the page; popup is for viewing/editing + notes.
  }

  function initTableFooters() {
    // Inject expand button if missing in each table footer, aligned right
    $$(".table-container").forEach((tc) => {
      const footer = $(".table-footer", tc);
      if (!footer) return;

      // Ensure footer layout supports right-side control
      footer.style.display = footer.style.display || "flex";
      footer.style.alignItems = footer.style.alignItems || "center";
      footer.style.justifyContent = footer.style.justifyContent || "space-between";
      footer.style.gap = footer.style.gap || "10px";

      let expandBtn = $(".expand-table-btn", footer);
      if (!expandBtn) {
        expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "expand-table-btn";
        expandBtn.title = "Expand table";
        expandBtn.textContent = "⤢";
        footer.appendChild(expandBtn);
      }

      if (expandBtn.dataset.bound === "true") return;
      expandBtn.dataset.bound = "true";

      expandBtn.addEventListener("click", () => openTablePopup(tc));
    });
  }

  /* -----------------------------
     NOTES (📝) — ORDERED BULLETS + SPACING
  ----------------------------- */
  function loadNotesState() {
    return safeJSONParse(localStorage.getItem(NOTES_KEY), {}) || {};
  }
  function saveNotesState(state) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(state));
  }

  function getRowSignature(btn) {
    // If inside a table row, use row index among tbody rows
    const tr = btn.closest("tr");
    if (tr) {
      const tbody = tr.parentElement;
      const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
      const idx = rows.indexOf(tr);
      return { kind: "table", index: idx >= 0 ? idx : 9999 };
    }

    // Otherwise use DOM order among notes-icon-btn in the section
    const sec = btn.closest(".page-section") || document;
    const all = $$(".notes-icon-btn", sec).filter((b) => !b.closest("table"));
    const idx = all.indexOf(btn);
    return { kind: "question", index: idx >= 0 ? idx : 9999 };
  }

  function getBulletLabel(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      // Training tables: first cell has checkbox + name input
      // Name = first text input in the row
      const nameInput = $("td input[type='text']", tr);
      const name = nameInput?.value?.trim();
      // Opcodes table: second column is opcode input
      // (We detect by presence of header "Opcode" in this table)
      const table = tr.closest("table");
      const headers = table ? $$("thead th", table).map((th) => th.textContent.trim().toLowerCase()) : [];
      const hasOpcodeHeader = headers.includes("opcode");
      if (hasOpcodeHeader) {
        // opcode input likely in second td
        const opcodeInput = tr.querySelector("td:nth-child(2) input[type='text']");
        const opcode = opcodeInput?.value?.trim();
        return opcode ? `${opcode}` : "Opcode";
      }

      return name ? `${name}` : "Name";
    }

    // Not in table: use the label text in same checklist-row
    const row = btn.closest(".checklist-row");
    const label = row?.querySelector("label")?.textContent?.trim();
    return label ? label.replace(/\s+/g, " ") : "Note";
  }

  function ensureNotesItem(targetId, sigIndex, label) {
    const notesState = loadNotesState();
    notesState[targetId] = notesState[targetId] || { items: {} };

    const itemId = `${sigIndex}`;
    if (!notesState[targetId].items[itemId]) {
      notesState[targetId].items[itemId] = {
        label,
        text: ""
      };
      saveNotesState(notesState);
    } else {
      // keep label updated if user later fills name/opcode
      notesState[targetId].items[itemId].label = label;
      saveNotesState(notesState);
    }
  }

  function buildNotesText(targetId) {
    const notesState = loadNotesState();
    const block = notesState[targetId];
    if (!block?.items) return "";

    // Sort by numeric key order
    const entries = Object.entries(block.items)
      .map(([k, v]) => ({ k: Number(k), v }))
      .sort((a, b) => a.k - b.k);

    // Clear spacing between bullets
    // Format:
    // • Label:
    // <text>
    //
    // • Label2:
    // <text>
    const parts = [];
    entries.forEach(({ v }) => {
      const header = `• ${v.label}:`;
      const body = (v.text || "").trim();
      parts.push(header);
      if (body) parts.push(body);
      parts.push(""); // blank line between bullet blocks
    });

    // remove trailing blank lines
    while (parts.length && parts[parts.length - 1] === "") parts.pop();

    return parts.join("\n");
  }

  function hydrateNotesTextarea(targetId) {
    const ta = $("#" + targetId)?.querySelector?.("textarea");
    if (!ta) return;

    ta.value = buildNotesText(targetId);
    applyPlaceholderClassToTextarea(ta);
    persistAllDebounced();
  }

  function focusNotesItem(targetId, sigIndex) {
    const notesBlock = $("#" + targetId);
    const ta = notesBlock?.querySelector?.("textarea");
    if (!ta) return;

    // Rebuild text first
    ta.value = buildNotesText(targetId);

    // Find caret position after the matching header line
    const label = loadNotesState()?.[targetId]?.items?.[String(sigIndex)]?.label || "";
    const header = `• ${label}:`;
    const lines = ta.value.split("\n");
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === header) {
        // place caret on next line (after header + newline)
        pos += line.length + 1;
        break;
      }
      pos += line.length + 1;
    }

    ta.focus();
    ta.setSelectionRange(pos, pos);
  }

  function bindNotesButton(btn, options = {}) {
    if (!btn || btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const notesTarget = options.overrideNotesTarget || btn.dataset.notesTarget;
      if (!notesTarget) return;

      const sig = getRowSignature(btn);
      const label = getBulletLabel(btn);
      ensureNotesItem(notesTarget, sig.index, label);

      // Scroll original notes block into view (unless clicked inside modal)
      const block = $("#" + notesTarget);
      if (block && !options.fromModal) {
        block.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // ensure textarea content is rebuilt with correct order + spacing
      hydrateNotesTextarea(notesTarget);
      focusNotesItem(notesTarget, sig.index);

      persistAllDebounced();
    });
  }

  function bindNotesButtonsWithin(root, modalCtx = null) {
    // root could be DOM element OR document
    const buttons = $$(".notes-icon-btn", root);
    buttons.forEach((btn) => {
      if (modalCtx?.overrideNotesTarget) {
        // In modal clone, we want clicks to target original notesId
        bindNotesButton(btn, { overrideNotesTarget: modalCtx.overrideNotesTarget, fromModal: true });
      } else {
        bindNotesButton(btn);
      }
    });
  }

  function initNotesButtons() {
    // Re-enable all notes buttons (including those restored from saved HTML)
    bindNotesButtonsWithin(document);

    // Also: when users type in notes textarea manually, capture back into per-item storage
    // We’ll parse "• Label:" blocks and store content so ordering remains stable.
    $$("textarea").forEach((ta) => {
      const block = ta.closest(".section-block");
      const id = block?.id;
      if (!id || !id.startsWith("notes-")) return;
      if (ta.dataset.notesParseBound === "true") return;
      ta.dataset.notesParseBound = "true";

      const parseAndStore = debounce(() => {
        const raw = ta.value || "";
        const lines = raw.split("\n");
        const items = [];
        let current = null;

        for (const line of lines) {
          const m = line.match(/^•\s(.+):\s*$/);
          if (m) {
            if (current) items.push(current);
            current = { label: m[1], textLines: [] };
          } else if (current) {
            current.textLines.push(line);
          }
        }
        if (current) items.push(current);

        // Write back to NOTES_KEY by matching labels to existing items (best-effort)
        const notesState = loadNotesState();
        notesState[id] = notesState[id] || { items: {} };

        // Map existing by label -> key
        const existing = notesState[id].items || {};
        const labelToKey = new Map();
        Object.entries(existing).forEach(([k, v]) => {
          if (v?.label) labelToKey.set(v.label, k);
        });

        // If we can’t match a label to a key, keep it but append after current max key
        let maxKey = Math.max(-1, ...Object.keys(existing).map((k) => Number(k)).filter((n) => !Number.isNaN(n)));
        items.forEach((it) => {
          let key = labelToKey.get(it.label);
          if (key == null) {
            maxKey += 1;
            key = String(maxKey);
            notesState[id].items[key] = { label: it.label, text: "" };
          }
          const txt = it.textLines.join("\n").trim();
          notesState[id].items[key].text = txt;
          notesState[id].items[key].label = it.label;
        });

        saveNotesState(notesState);
        // Rebuild to enforce spacing consistency
        hydrateNotesTextarea(id);
        persistAllDebounced();
      }, 350);

      ta.addEventListener("input", parseAndStore);
      ta.addEventListener("change", parseAndStore);
    });

    // Initial hydration: if we have note-state saved, apply it on load
    const notesState = loadNotesState();
    Object.keys(notesState).forEach((id) => {
      if ($("#" + id)?.querySelector?.("textarea")) hydrateNotesTextarea(id);
    });
  }

  /* -----------------------------
     SUPPORT TICKETS (minimal stable behavior)
     - Base Open card stays in Open
     - + adds a ticket ONLY when base card has ticket# + url or summary (basic completeness)
     - Status changes move card between columns
  ----------------------------- */
  function ticketIsComplete(groupEl) {
    const num = $(".ticket-number-input", groupEl)?.value?.trim();
    const url = $(".ticket-zendesk-input", groupEl)?.value?.trim();
    const summary = $(".ticket-summary-input", groupEl)?.value?.trim();
    // require ticket number + (url or summary)
    return !!num && (!!url || !!summary);
  }

  function lockBaseOpenStatus(openBaseGroup) {
    const status = $(".ticket-status-select", openBaseGroup);
    if (status) {
      status.value = "Open";
      status.disabled = true;
    }
  }

  function initSupportTickets() {
    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const base = $(".ticket-group[data-base='true']", openContainer);
    if (base) lockBaseOpenStatus(base);

    // Bind add button on base
    const addBtn = $(".add-ticket-btn", base || openContainer);
    if (addBtn && !addBtn.dataset.bound) {
      addBtn.dataset.bound = "true";
      addBtn.addEventListener("click", () => {
        const baseGroup = $(".ticket-group[data-base='true']", openContainer);
        if (!baseGroup) return;

        if (!ticketIsComplete(baseGroup)) {
          // Keep it simple: shake effect if CSS exists, otherwise focus
          $(".ticket-number-input", baseGroup)?.focus();
          return;
        }

        // Clone base group -> new group in Open (status editable)
        const clone = baseGroup.cloneNode(true);
        clone.dataset.base = "false";

        // Remove disclaimer (only base should show it)
        $$(".ticket-disclaimer", clone).forEach((el) => el.remove());

        // Enable status and set to Open
        const status = $(".ticket-status-select", clone);
        if (status) {
          status.disabled = false;
          status.value = "Open";
        }

        // Add remove button to clone
        const inner = $(".ticket-group-inner", clone) || clone;
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "remove-row ticket-remove-btn";
        rm.title = "Remove ticket";
        rm.textContent = "×";
        rm.style.marginLeft = "auto";
        rm.addEventListener("click", () => {
          clone.remove();
          persistAllDebounced();
        });
        inner.prepend(rm);

        // Append clone below base
        openContainer.appendChild(clone);

        // Clear base inputs for next entry
        $$("input, textarea", baseGroup).forEach((el) => (el.value = ""));
        persistAllDebounced();

        // Bind status mover
        bindTicketStatusMover(clone);
      });
    }

    // Bind movers for all non-base groups (in all containers)
    [
      openContainer,
      $("#tierTwoTicketsContainer"),
      $("#closedResolvedTicketsContainer"),
      $("#closedFeatureTicketsContainer")
    ].filter(Boolean).forEach((cont) => {
      $$(".ticket-group", cont).forEach((g) => {
        if (g.dataset.base === "true") lockBaseOpenStatus(g);
        else bindTicketStatusMover(g);
      });
    });
  }

  function bindTicketStatusMover(groupEl) {
    const status = $(".ticket-status-select", groupEl);
    if (!status || status.dataset.bound === "true") return;
    status.dataset.bound = "true";

    status.addEventListener("change", () => {
      const val = status.value;
      const open = $("#openTicketsContainer");
      const t2 = $("#tierTwoTicketsContainer");
      const cr = $("#closedResolvedTicketsContainer");
      const cf = $("#closedFeatureTicketsContainer");

      if (!open || !t2 || !cr || !cf) return;

      // Move group to container matching status
      if (val === "Open") open.appendChild(groupEl);
      else if (val === "Tier Two") t2.appendChild(groupEl);
      else if (val === "Closed - Resolved") cr.appendChild(groupEl);
      else if (val === "Closed - Feature Not Supported") cf.appendChild(groupEl);

      persistAllDebounced();
    });
  }

  /* -----------------------------
     BIND DYNAMIC HANDLERS (after restore)
  ----------------------------- */
  function bindDynamicHandlers() {
    // Re-bind add-row handlers for table rows restored from HTML
    initTrainingTableAddRow();
    initTableFooters();
    initNotesButtons();
  }

  /* -----------------------------
     BOOT
  ----------------------------- */
  function boot() {
    initNav();
    initPlaceholderStyling();
    initAutosave();
    initResetButtons();
    initOnsiteDates();

    // Core feature bindings
    initAdditionalTrainers();
    initAdditionalPOCs();
    initTrainingTableAddRow();
    initTableFooters();
    initNotesButtons();
    initSupportTickets();

    // Restore after bindings so UI comes back correctly
    restoreAll();

    // Persist on unload (extra safety)
    window.addEventListener("beforeunload", () => {
      const state = loadState();
      snapshotTables(state);
      snapshotDynamicBlocks(state);
      snapshotFormControls(state);
      saveState(state);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
