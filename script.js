/* =======================================================
   myKaarma Interactive Training Checklist — script.js
   ✅ FIXED
   - No double-binding (no "adds two" bug)
   - No delete buttons added
   - Table popups clone REAL table card + REAL notes card (same look)
   - Adds 📝 buttons to 2x2 checklist rows (auto)
   - Notes bullets ordered + spaced
   - Training tables: bullet label = Name
   - Opcodes table: bullet label = Opcode
======================================================= */

(() => {
  "use strict";

  /* -----------------------------
     UTIL
  ----------------------------- */
  const LS_KEY = "mk_training_checklist_v2";
  const NOTES_KEY = "mk_training_notes_v2";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const safeJSONParse = (str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const debounce = (fn, wait = 250) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  const closestSectionId = (el) => el?.closest?.(".page-section")?.id || "unknown-section";

  const bindOnce = (el, key) => {
    if (!el) return false;
    const k = `bound_${key}`;
    if (el.dataset[k] === "true") return false;
    el.dataset[k] = "true";
    return true;
  };

  /* -----------------------------
     NAV
  ----------------------------- */
  function initNav() {
    const navButtons = $$("#sidebar-nav .nav-btn");
    const sections = $$(".page-section");

    const showSection = (id) => {
      sections.forEach((s) => s.classList.toggle("active", s.id === id));
      navButtons.forEach((b) => b.classList.toggle("active", b.dataset.target === id));
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    navButtons.forEach((btn) => {
      if (!bindOnce(btn, "nav")) return;
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        if (!target) return;
        showSection(target);

        const state = loadState();
        state.__lastPage = target;
        saveState(state);
      });
    });

    const state = loadState();
    if (state.__lastPage && $("#" + state.__lastPage)) showSection(state.__lastPage);
  }

  /* -----------------------------
     PLACEHOLDER / GHOST CLASSING
     (Your CSS should style .is-placeholder light grey)
  ----------------------------- */
  function applyPlaceholderClassToSelect(sel) {
    const opt = sel.selectedOptions?.[0];
    const isGhost = !!opt?.dataset?.ghost || sel.value === "" || opt?.value === "";
    sel.classList.toggle("is-placeholder", isGhost);
  }

  function applyPlaceholderClassToInput(inp) {
    if (inp.type === "date") {
      inp.classList.toggle("is-placeholder", !inp.value);
      return;
    }
    const hasPh = !!inp.getAttribute("placeholder");
    if (hasPh) inp.classList.toggle("is-placeholder", !inp.value);
  }

  function applyPlaceholderClassToTextarea(ta) {
    const hasPh = !!ta.getAttribute("placeholder");
    if (hasPh) ta.classList.toggle("is-placeholder", !ta.value);
  }

  function initPlaceholderStyling() {
    $$("select").forEach(applyPlaceholderClassToSelect);
    $$("input").forEach(applyPlaceholderClassToInput);
    $$("textarea").forEach(applyPlaceholderClassToTextarea);

    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.tagName === "SELECT") applyPlaceholderClassToSelect(t);
      if (t.tagName === "INPUT") applyPlaceholderClassToInput(t);
      if (t.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(t);
    });

    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.tagName === "INPUT") applyPlaceholderClassToInput(t);
      if (t.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(t);
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
    const at = $("#additionalTrainersContainer");
    if (at) state.__additionalTrainersHTML = at.innerHTML;

    const pcs = $$(".additional-poc-card");
    if (pcs.length) state.__additionalPocsHTML = pcs.map((c) => c.outerHTML).join("");

    state.__ticketsHTML = {
      open: $("#openTicketsContainer")?.innerHTML || "",
      tierTwo: $("#tierTwoTicketsContainer")?.innerHTML || "",
      closedResolved: $("#closedResolvedTicketsContainer")?.innerHTML || "",
      closedFeature: $("#closedFeatureTicketsContainer")?.innerHTML || ""
    };
  }

  function restoreDynamicBlocks(state) {
    if (typeof state.__additionalTrainersHTML === "string" && $("#additionalTrainersContainer")) {
      $("#additionalTrainersContainer").innerHTML = state.__additionalTrainersHTML;
    }

    if (typeof state.__additionalPocsHTML === "string" && state.__additionalPocsHTML) {
      const grid = $(".primary-contacts-grid");
      if (grid) {
        $$(".additional-poc-card", grid).forEach((el) => el.remove());
        const wrapper = document.createElement("div");
        wrapper.innerHTML = state.__additionalPocsHTML;
        Array.from(wrapper.children).forEach((child) => grid.appendChild(child));
      }
    }

    const t = state.__ticketsHTML;
    if (t) {
      if ($("#openTicketsContainer") && t.open) $("#openTicketsContainer").innerHTML = t.open;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = t.tierTwo || "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = t.closedResolved || "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = t.closedFeature || "";
    }
  }

  function snapshotFormControls(state) {
    state.__controls = state.__controls || {};

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
        if (el.type === "checkbox") state.__controls[key] = !!el.checked;
        else state.__controls[key] = el.value ?? "";
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
    if (!bindOnce(document.body, "autosave")) return;

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

    window.addEventListener("beforeunload", () => {
      const state = loadState();
      snapshotTables(state);
      snapshotDynamicBlocks(state);
      snapshotFormControls(state);
      saveState(state);
    });
  }

  function restoreAll() {
    const state = loadState();
    restoreTables(state);
    restoreDynamicBlocks(state);
    restoreFormControls(state);
  }

  /* -----------------------------
     RESET PAGE / CLEAR ALL
  ----------------------------- */
  function clearSection(sectionEl) {
    if (!sectionEl) return;

    $$("input, select, textarea", sectionEl).forEach((el) => {
      const inTable = !!el.closest("table");
      const inTickets = !!el.closest("#support-tickets");
      const inAdditionalTrainer = !!el.closest("#additionalTrainersContainer");
      const inAdditionalPoc = !!el.closest(".additional-poc-card");
      if (inTable || inTickets || inAdditionalTrainer || inAdditionalPoc) return;

      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    $$(".table-container", sectionEl).forEach((tc) => {
      const table = $("table", tc);
      const tbody = table?.tBodies?.[0];
      if (!tbody) return;

      const rows = Array.from(tbody.rows);
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

    if (sectionEl.id === "trainers-deployment") {
      const at = $("#additionalTrainersContainer");
      if (at) at.innerHTML = "";
      const base = $(".checklist-row[data-base='true'] input[type='text']", sectionEl);
      if (base) base.value = "";
    }

    if (sectionEl.id === "dealership-info") {
      const grid = $(".primary-contacts-grid", sectionEl);
      if (grid) {
        const cards = $$(".additional-poc-card", grid);
        cards.forEach((c, idx) => {
          if (idx === 0) $$("input", c).forEach((inp) => (inp.value = ""));
          else c.remove();
        });
      }
    }

    if (sectionEl.id === "support-tickets") {
      const open = $("#openTicketsContainer");
      const base = $(".ticket-group[data-base='true']", open);
      if (open && base) open.innerHTML = base.outerHTML;
      if ($("#tierTwoTicketsContainer")) $("#tierTwoTicketsContainer").innerHTML = "";
      if ($("#closedResolvedTicketsContainer")) $("#closedResolvedTicketsContainer").innerHTML = "";
      if ($("#closedFeatureTicketsContainer")) $("#closedFeatureTicketsContainer").innerHTML = "";
    }

    $$("select", sectionEl).forEach(applyPlaceholderClassToSelect);
    $$("input", sectionEl).forEach(applyPlaceholderClassToInput);
    $$("textarea", sectionEl).forEach(applyPlaceholderClassToTextarea);

    persistAllDebounced();
  }

  function initResetButtons() {
    $$(".clear-page-btn").forEach((btn) => {
      if (!bindOnce(btn, "reset_page")) return;
      btn.addEventListener("click", () => {
        const sec = btn.closest(".page-section");
        clearSection(sec);
      });
    });

    const clearAllBtn = $("#clearAllBtn");
    if (clearAllBtn && bindOnce(clearAllBtn, "clear_all")) {
      clearAllBtn.addEventListener("click", () => {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(NOTES_KEY);
        closeModal();
        $$(".page-section").forEach(clearSection);
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
    if (!bindOnce(start, "onsite_date")) return;

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
     ADDITIONAL TRAINERS (+) — NO DELETE BUTTONS
  ----------------------------- */
  function initAdditionalTrainers() {
    const container = $("#additionalTrainersContainer");
    const baseRow = $(".checklist-row.integrated-plus[data-base='true']");
    if (!container || !baseRow) return;

    const addBtn = $(".add-row", baseRow);
    if (!addBtn) return;
    if (!bindOnce(addBtn, "add_trainer")) return;

    addBtn.addEventListener("click", () => {
      const clone = baseRow.cloneNode(true);
      clone.dataset.base = "false";

      const inp = $("input[type='text']", clone);
      if (inp) inp.value = "";

      // remove the + button from clones (only base has +)
      $$(".add-row", clone).forEach((b) => b.remove());

      container.appendChild(clone);

      if (inp) applyPlaceholderClassToInput(inp);
      persistAllDebounced();
    });
  }

  /* -----------------------------
     ADDITIONAL POC (+) — NO DELETE BUTTONS
  ----------------------------- */
  function initAdditionalPOCs() {
    const baseCard = $(".additional-poc-card[data-base='true']");
    const grid = $(".primary-contacts-grid");
    if (!baseCard || !grid) return;

    const addBtn = $(".additional-poc-add", baseCard);
    if (!addBtn) return;
    if (!bindOnce(addBtn, "add_poc")) return;

    addBtn.addEventListener("click", () => {
      const clone = baseCard.cloneNode(true);
      clone.dataset.base = "false";

      $$("input", clone).forEach((inp) => (inp.value = ""));

      // remove + button from clones
      $$(".additional-poc-add", clone).forEach((b) => b.remove());

      grid.appendChild(clone);

      $$("input, select, textarea", clone).forEach((el) => {
        if (el.tagName === "INPUT") applyPlaceholderClassToInput(el);
        if (el.tagName === "SELECT") applyPlaceholderClassToSelect(el);
        if (el.tagName === "TEXTAREA") applyPlaceholderClassToTextarea(el);
      });

      persistAllDebounced();
    });
  }

  /* -----------------------------
     TABLE: ADD ROW (+) — NO DOUBLE
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
    clearRowControls(clone);
    tbody.appendChild(clone);
    return clone;
  }

  function initTableAddRowButtons() {
    $$(".table-container").forEach((tc) => {
      const footerAdd = $(".table-footer .add-row", tc);
      const table = $("table", tc);
      if (!footerAdd || !table) return;

      if (!bindOnce(footerAdd, "table_add_row")) return;

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
     TABLE POPUP MODAL — CLONE REAL CARD LOOK
     - Clones the real .table-container and the real related notes .section-block
     - Uses your classes (so it matches exactly)
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
  modalEl.style.padding = "18px";
  modalEl.style.overflow = "auto";

  modalEl.innerHTML = `
    <div id="mkTableModalShell" style="
      max-width: 1400px;
      margin: 0 auto;
    ">
      <!-- Title bar (simple) -->
      <div id="mkTableModalBar" style="
        background:#fff;
        border-radius:16px;
        padding:14px 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:14px;
      ">
        <div id="mkTableModalTitle" style="font-weight:800; font-size:22px;"></div>
        <div style="display:flex; gap:10px;">
          <button type="button" id="mkTableModalExpand" title="Expand" style="
            width:40px;height:40px;border-radius:12px;
            border:1px solid rgba(0,0,0,0.12);
            background:#fff;cursor:pointer;
            font-size:18px;
          ">↗</button>
          <button type="button" id="mkTableModalClose" title="Close" style="
            width:40px;height:40px;border-radius:12px;
            border:1px solid rgba(0,0,0,0.12);
            background:#fff;cursor:pointer;
            font-size:22px; line-height:1;
          ">×</button>
        </div>
      </div>

      <!-- IMPORTANT: This is NOT a new “card”.
           We let your real .section-block cards be the UI. -->
      <div id="mkTableModalCards" style="display:grid; gap:16px;"></div>
    </div>
  `;

  document.body.appendChild(modalEl);

  $("#mkTableModalClose", modalEl).addEventListener("click", closeModal);

  $("#mkTableModalExpand", modalEl).addEventListener("click", () => {
    const shell = $("#mkTableModalShell", modalEl);
    if (!shell) return;
    const full = shell.dataset.full === "true";
    shell.dataset.full = (!full).toString();
    shell.style.maxWidth = full ? "1400px" : "96vw";
  });

  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
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

  function findRelatedNotesBlock(tableContainer) {
    // Prefer data-notes-target from the notes icon buttons in this table
    const btn = $(".notes-icon-btn[data-notes-target]", tableContainer);
    const id = btn?.dataset?.notesTarget;
    if (id && $("#" + id)) return $("#" + id);

    // fallback: within same page-section, pick the nearest notes block after this table
    const section = tableContainer.closest(".page-section");
    if (!section) return null;
    const all = $$("[id^='notes-'].section-block", section);
    return all[0] || null;
  }

 function openTablePopup(tableContainer) {
  const modal = ensureModal();
  const cards = $("#mkTableModalCards", modal);
  const titleEl = $("#mkTableModalTitle", modal);
  if (!cards || !titleEl) return;

  // Title = same label you see above the table on the page
  const header =
    tableContainer.closest(".section")?.querySelector(".section-header span")?.textContent?.trim() ||
    tableContainer.closest(".section")?.querySelector(".section-header")?.textContent?.trim() ||
    tableContainer.closest(".page-section")?.querySelector("h1")?.textContent?.trim() ||
    "Table";

  titleEl.textContent = header;

  // 1) Build a REAL "section-block" card for the TABLE (so it matches page)
  const tableCard = document.createElement("div");
  tableCard.className = "section-block";
  tableCard.innerHTML = `<h2>${header}</h2>`;

  // Clone the actual table-container (keeps your table styling)
  const tableClone = tableContainer.cloneNode(true);

  // Remove footer controls in popup (no add/expand inside popup)
  $$(".table-footer", tableClone).forEach((el) => el.remove());

  // Give scroll-wrapper a sane height in popup, but keep your styling
  const scrollWrap = $(".scroll-wrapper", tableClone);
  if (scrollWrap) {
    scrollWrap.style.maxHeight = "45vh";
    scrollWrap.style.overflow = "auto";
  }

  tableCard.appendChild(tableClone);

  // 2) Clone the REAL related notes card (your section-block already)
  const notesBlock = findRelatedNotesBlock(tableContainer);
  const notesClone = notesBlock ? notesBlock.cloneNode(true) : null;

  // Link popup notes textarea <-> real textarea (2-way)
  if (notesBlock && notesClone) {
    const realTA = $("textarea", notesBlock);
    const modalTA = $("textarea", notesClone);
    if (realTA && modalTA) {
      modalTA.value = realTA.value;

      modalTA.addEventListener("input", () => {
        realTA.value = modalTA.value;
        applyPlaceholderClassToTextarea(realTA);
        persistAllDebounced();
      });

      const syncBack = () => {
        if (modalTA.value !== realTA.value) modalTA.value = realTA.value;
      };
      realTA.addEventListener("input", syncBack);
      realTA.addEventListener("change", syncBack);
    }
  }

  // Render
  cards.innerHTML = "";
  cards.appendChild(tableCard);
  if (notesClone) cards.appendChild(notesClone);

  // Notes buttons in popup should still write to the REAL notes target
  const realNotesId = notesBlock?.id;
  bindNotesButtonsWithin(tableCard, { overrideNotesTarget: realNotesId, fromModal: true });

  modal.style.display = "block";
}

  function initTableExpandButtons() {
    $$(".table-container").forEach((tc) => {
      const footer = $(".table-footer", tc);
      if (!footer) return;

      // Add expand button only once
      let expandBtn = $(".expand-table-btn", footer);
      if (!expandBtn) {
        expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "expand-table-btn";
        expandBtn.title = "Expand table";
        expandBtn.textContent = "↗";
        footer.appendChild(expandBtn);
      }

      if (!bindOnce(expandBtn, "expand_table")) return;
      expandBtn.addEventListener("click", () => openTablePopup(tc));
    });
  }

  /* -----------------------------
     NOTES SYSTEM — ORDERED + SPACING
  ----------------------------- */
  function loadNotesState() {
    return safeJSONParse(localStorage.getItem(NOTES_KEY), {}) || {};
  }
  function saveNotesState(state) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(state));
  }

  function getRowSignature(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      const tbody = tr.parentElement;
      const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
      const idx = rows.indexOf(tr);
      return { kind: "table", index: idx >= 0 ? idx : 9999 };
    }

    const sec = btn.closest(".page-section") || document;
    const all = $$(".notes-icon-btn", sec).filter((b) => !b.closest("table"));
    const idx = all.indexOf(btn);
    return { kind: "question", index: idx >= 0 ? idx : 9999 };
  }

  function getBulletLabel(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      const table = tr.closest("table");
      const headers = table ? $$("thead th", table).map((th) => th.textContent.trim().toLowerCase()) : [];
      const hasOpcodeHeader = headers.includes("opcode");

      if (hasOpcodeHeader) {
        const opcodeInput = tr.querySelector("td:nth-child(2) input[type='text']");
        const opcode = opcodeInput?.value?.trim();
        return opcode || "Opcode";
      }

      // Training tables: Name is first text input in the row
      const nameInput = tr.querySelector("td input[type='text']");
      const name = nameInput?.value?.trim();
      return name || "Name";
    }

    const row = btn.closest(".checklist-row");
    const label = row?.querySelector("label")?.textContent?.trim();
    return label ? label.replace(/\s+/g, " ") : "Note";
  }

  function ensureNotesItem(targetId, sigIndex, label) {
    const notesState = loadNotesState();
    notesState[targetId] = notesState[targetId] || { items: {} };

    const itemId = `${sigIndex}`;
    if (!notesState[targetId].items[itemId]) {
      notesState[targetId].items[itemId] = { label, text: "" };
    } else {
      notesState[targetId].items[itemId].label = label;
    }
    saveNotesState(notesState);
  }

  function buildNotesText(targetId) {
    const notesState = loadNotesState();
    const block = notesState[targetId];
    if (!block?.items) return "";

    const entries = Object.entries(block.items)
      .map(([k, v]) => ({ k: Number(k), v }))
      .sort((a, b) => a.k - b.k);

    const parts = [];
    entries.forEach(({ v }) => {
      parts.push(`• ${v.label}:`);
      const body = (v.text || "").trim();
      if (body) parts.push(body);
      parts.push(""); // blank line between bullets
    });

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

  function bindNotesButton(btn, options = {}) {
    if (!btn) return;
    if (!bindOnce(btn, "notes_btn")) return;

    btn.addEventListener("click", () => {
      const notesTarget = options.overrideNotesTarget || btn.dataset.notesTarget;
      if (!notesTarget) return;

      const sig = getRowSignature(btn);
      const label = getBulletLabel(btn);

      ensureNotesItem(notesTarget, sig.index, label);
      hydrateNotesTextarea(notesTarget);

      const block = $("#" + notesTarget);
      if (block && !options.fromModal) block.scrollIntoView({ behavior: "smooth", block: "start" });

      persistAllDebounced();
    });
  }

  function bindNotesButtonsWithin(root, opts = {}) {
    $$(".notes-icon-btn", root).forEach((btn) => bindNotesButton(btn, opts));
  }

  /* -----------------------------
     AUTO-ADD 📝 BUTTONS TO 2x2 CARDS
     - Only for .checklist-row that are NOT tables and NOT inside notes cards
     - Targets the matching "Notes — ..." card in the same two-col grid
  ----------------------------- */
  function ensureElementId(el, prefix = "auto-notes") {
    if (el.id) return el.id;
    el.id = `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    return el.id;
  }

  function injectNotesButtonsIntoTwoColCards() {
    $$(".cards-grid.two-col").forEach((grid) => {
      const blocks = $$(".section-block", grid);
      if (blocks.length < 2) return;

      const notesBlock = blocks.find((b) => {
        const h2 = b.querySelector("h2")?.textContent?.trim().toLowerCase() || "";
        return h2.startsWith("notes");
      });
      if (!notesBlock) return;

      const notesId = ensureElementId(notesBlock, "notes-card");
      const notesTA = $("textarea", notesBlock);
      if (!notesTA) return;

      // Left block (questions) = first non-notes block
      const questionBlock = blocks.find((b) => b !== notesBlock);
      if (!questionBlock) return;

      $$(".checklist-row", questionBlock).forEach((row) => {
        if (row.querySelector(".notes-icon-btn")) return;       // already has
        if (row.closest("table")) return;                       // no tables
        if (row.closest(".notes-block")) return;                // don’t add inside notes
        // Insert a notes button at far right
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "notes-icon-btn";
        btn.dataset.notesTarget = notesId;
        btn.setAttribute("aria-label", "Open Notes");
        btn.innerHTML = `<span class="notes-icon" aria-hidden="true">📝</span>`;

        // Put at end of row
        row.appendChild(btn);
      });
    });

    // bind newly injected buttons
    bindNotesButtonsWithin(document);
  }

  function initNotesTextareaParsing() {
    $$("textarea").forEach((ta) => {
      const block = ta.closest(".section-block");
      const id = block?.id;
      if (!id) return;
      if (!id.startsWith("notes-") && !id.startsWith("notes-card-")) return;
      if (!bindOnce(ta, "notes_parse")) return;

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

        const notesState = loadNotesState();
        notesState[id] = notesState[id] || { items: {} };

        const existing = notesState[id].items || {};
        const labelToKey = new Map();
        Object.entries(existing).forEach(([k, v]) => {
          if (v?.label) labelToKey.set(v.label, k);
        });

        let maxKey = Math.max(-1, ...Object.keys(existing).map((k) => Number(k)).filter((n) => !Number.isNaN(n)));
        items.forEach((it) => {
          let key = labelToKey.get(it.label);
          if (key == null) {
            maxKey += 1;
            key = String(maxKey);
            notesState[id].items[key] = { label: it.label, text: "" };
          }
          notesState[id].items[key].label = it.label;
          notesState[id].items[key].text = it.textLines.join("\n").trim();
        });

        saveNotesState(notesState);
        hydrateNotesTextarea(id);
        persistAllDebounced();
      }, 350);

      ta.addEventListener("input", parseAndStore);
      ta.addEventListener("change", parseAndStore);
    });

    // hydrate from state on load
    const notesState = loadNotesState();
    Object.keys(notesState).forEach((id) => {
      if ($("#" + id)?.querySelector?.("textarea")) hydrateNotesTextarea(id);
    });
  }

  /* -----------------------------
     SUPPORT TICKETS (kept simple)
  ----------------------------- */
  function ticketIsComplete(groupEl) {
    const num = $(".ticket-number-input", groupEl)?.value?.trim();
    const url = $(".ticket-zendesk-input", groupEl)?.value?.trim();
    const summary = $(".ticket-summary-input", groupEl)?.value?.trim();
    return !!num && (!!url || !!summary);
  }

  function lockBaseOpenStatus(openBaseGroup) {
    const status = $(".ticket-status-select", openBaseGroup);
    if (status) {
      status.value = "Open";
      status.disabled = true;
    }
  }

  function bindTicketStatusMover(groupEl) {
    const status = $(".ticket-status-select", groupEl);
    if (!status) return;
    if (!bindOnce(status, "ticket_move")) return;

    status.addEventListener("change", () => {
      const val = status.value;
      const open = $("#openTicketsContainer");
      const t2 = $("#tierTwoTicketsContainer");
      const cr = $("#closedResolvedTicketsContainer");
      const cf = $("#closedFeatureTicketsContainer");
      if (!open || !t2 || !cr || !cf) return;

      if (val === "Open") open.appendChild(groupEl);
      else if (val === "Tier Two") t2.appendChild(groupEl);
      else if (val === "Closed - Resolved") cr.appendChild(groupEl);
      else if (val === "Closed - Feature Not Supported") cf.appendChild(groupEl);

      persistAllDebounced();
    });
  }

  function initSupportTickets() {
    const openContainer = $("#openTicketsContainer");
    if (!openContainer) return;

    const base = $(".ticket-group[data-base='true']", openContainer);
    if (base) lockBaseOpenStatus(base);

    const addBtn = $(".add-ticket-btn", base || openContainer);
    if (addBtn && bindOnce(addBtn, "add_ticket")) {
      addBtn.addEventListener("click", () => {
        const baseGroup = $(".ticket-group[data-base='true']", openContainer);
        if (!baseGroup) return;
        if (!ticketIsComplete(baseGroup)) {
          $(".ticket-number-input", baseGroup)?.focus();
          return;
        }

        const clone = baseGroup.cloneNode(true);
        clone.dataset.base = "false";
        $$(".ticket-disclaimer", clone).forEach((el) => el.remove());

        const status = $(".ticket-status-select", clone);
        if (status) {
          status.disabled = false;
          status.value = "Open";
        }

        openContainer.appendChild(clone);

        $$("input, textarea", baseGroup).forEach((el) => (el.value = ""));
        persistAllDebounced();

        bindTicketStatusMover(clone);
      });
    }

    [openContainer, $("#tierTwoTicketsContainer"), $("#closedResolvedTicketsContainer"), $("#closedFeatureTicketsContainer")]
      .filter(Boolean)
      .forEach((cont) => {
        $$(".ticket-group", cont).forEach((g) => {
          if (g.dataset.base === "true") lockBaseOpenStatus(g);
          else bindTicketStatusMover(g);
        });
      });
  }

  /* -----------------------------
     BOOT (IMPORTANT: restore first, then bind once)
  ----------------------------- */
  function boot() {
    restoreAll();                 // ✅ restore first
    initNav();
    initPlaceholderStyling();
    initAutosave();
    initResetButtons();
    initOnsiteDates();

    initAdditionalTrainers();
    initAdditionalPOCs();

    initTableAddRowButtons();
    initTableExpandButtons();

    bindNotesButtonsWithin(document);
    injectNotesButtonsIntoTwoColCards();   // ✅ adds missing 📝 on 2x2 cards
    initNotesTextareaParsing();

    initSupportTickets();

    // final placeholder refresh after restores/injections
    initPlaceholderStyling();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
