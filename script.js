/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (Single-file, hardened, event-delegated, stateful)
   - Sidebar navigation (data-target)
   - LocalStorage save/restore (inputs/selects/textareas + dynamic rows)
   - “Reset This Page” buttons
   - Add Row (+) for tables
   - Notes icon buttons (scroll + flash)
   - Support Tickets: add cards + move by status
   - Additional Trainer (+) — FIXED + persisted
   - Dealership name display
   - PDF button (safe: only runs if libs exist)
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v6";
  const DEBUG = false;

  const log = (...a) => DEBUG && console.log("[mk]", ...a);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const debounce = (fn, wait = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const uid = (() => {
    let n = 0;
    return (prefix = "mk") => `${prefix}-${Date.now()}-${++n}`;
  })();

  const isTextLike = (el) =>
    el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT");

  const safeTrim = (v) => (typeof v === "string" ? v.trim() : "");

  /* =======================
     PAGE NAVIGATION
  ======================= */
  function showSection(targetId) {
    const sections = $$(".page-section");
    const target = document.getElementById(targetId);

    if (!target) return;

    sections.forEach((s) => s.classList.remove("active"));
    target.classList.add("active");

    // Update nav active state
    $$(".nav-btn").forEach((b) => {
      const isActive = b.getAttribute("data-target") === targetId;
      b.classList.toggle("active", isActive);
    });

    // Scroll to top of main content container (optional)
    const main = $("#mainContent") || $("main");
    if (main) main.scrollTop = 0;
  }

  function initNav() {
    // If nothing is active, activate first section
    const active = $(".page-section.active");
    if (!active) {
      const first = $(".page-section");
      if (first?.id) first.classList.add("active");
    }

    // If a nav button is active, sync
    const activeSection = $(".page-section.active");
    if (activeSection?.id) {
      $$(".nav-btn").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-target") === activeSection.id);
      });
    }
  }

  /* =======================
     DEALERSHIP NAME DISPLAY
  ======================= */
  function syncDealershipName() {
    const input = $("#dealershipNameInput");
    const display = $("#dealershipNameDisplay");
    if (!input || !display) return;

    const val = safeTrim(input.value);
    display.textContent = val ? val : "";
  }

  /* =======================
     “GHOST” PLACEHOLDER OPTIONS
     (options like <option value="" data-ghost="true">Usage</option>)
  ======================= */
  function refreshGhostSelect(select) {
    if (!select || select.tagName !== "SELECT") return;
    const val = select.value;
    const hasValue = safeTrim(val) !== "";
    select.classList.toggle("has-value", hasValue);
  }

  function initGhostSelects() {
    $$("select").forEach(refreshGhostSelect);
  }

  /* =======================
     STATE SAVE/RESTORE
  ======================= */
  function getAllFields(root = document) {
    return $$("input, select, textarea", root).filter((el) => {
      // ignore buttons etc
      if (el.tagName === "INPUT") {
        const type = (el.getAttribute("type") || "").toLowerCase();
        // allowed: text, date, checkbox, number, etc.
        return type !== "button" && type !== "submit" && type !== "reset";
      }
      return true;
    });
  }

  function buildState() {
    // 1) basic fields (by stable selector)
    const fields = getAllFields();
    const fieldState = fields.map((el) => {
      // Prefer ID; else generate a stable data-key once.
      if (!el.dataset.mkKey) {
        el.dataset.mkKey = el.id ? `id:${el.id}` : `key:${uid("fld")}`;
      }

      let value;
      if (el.tagName === "INPUT") {
        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "checkbox") value = el.checked;
        else value = el.value;
      } else {
        value = el.value;
      }

      return { k: el.dataset.mkKey, v: value };
    });

    // 2) dynamic Additional Trainers
    const trainers = $$("#additionalTrainersContainer .trainer-row input").map((i) => i.value);

    // 3) dynamic tables (row counts only; values are already in fieldState)
    const tableRowCounts = $$(".training-table tbody").map((tb, i) => ({
      i,
      rows: tb.querySelectorAll("tr").length,
    }));

    // 4) support tickets cards (count per column)
    const tickets = {
      open: $("#openTicketsContainer")?.querySelectorAll(".ticket-group").length || 0,
      tierTwo: $("#tierTwoTicketsContainer")?.querySelectorAll(".ticket-group").length || 0,
      closedResolved: $("#closedResolvedTicketsContainer")?.querySelectorAll(".ticket-group").length || 0,
      closedFeature: $("#closedFeatureTicketsContainer")?.querySelectorAll(".ticket-group").length || 0,
    };

    return {
      version: 6,
      savedAt: new Date().toISOString(),
      fieldState,
      trainers,
      tableRowCounts,
      tickets,
      activeSectionId: $(".page-section.active")?.id || "",
    };
  }

  function applyState(state) {
    if (!state || typeof state !== "object") return;

    // 1) restore dynamic table rows by counts (then field values will apply)
    if (Array.isArray(state.tableRowCounts)) {
      const bodies = $$(".training-table tbody");
      state.tableRowCounts.forEach((rc) => {
        const tb = bodies[rc.i];
        if (!tb) return;

        const current = tb.querySelectorAll("tr").length;
        const desired = Math.max(1, Number(rc.rows || 1)); // never 0
        if (desired > current) {
          // clone last row to reach desired
          for (let n = current; n < desired; n++) {
            const last = tb.querySelector("tr:last-child");
            if (!last) break;
            const clone = last.cloneNode(true);
            clearRowInputs(clone);
            tb.appendChild(clone);
          }
        } else if (desired < current) {
          // remove from end, but keep at least 1
          for (let n = current; n > desired; n--) {
            const last = tb.querySelector("tr:last-child");
            if (last && tb.querySelectorAll("tr").length > 1) last.remove();
          }
        }
      });
    }

    // 2) restore additional trainers list
    if (Array.isArray(state.trainers)) {
      const container = $("#additionalTrainersContainer");
      if (container) {
        container.innerHTML = "";
        state.trainers
          .map((t) => safeTrim(t))
          .filter(Boolean)
          .forEach((name) => addTrainerRow(name));
      }
    }

    // 3) restore ticket card counts (best-effort)
    restoreTicketCounts(state.tickets);

    // 4) restore field values
    const map = new Map(Array.isArray(state.fieldState) ? state.fieldState.map((x) => [x.k, x.v]) : []);

    const fields = getAllFields();
    fields.forEach((el) => {
      if (!el.dataset.mkKey) {
        el.dataset.mkKey = el.id ? `id:${el.id}` : `key:${uid("fld")}`;
      }
      if (!map.has(el.dataset.mkKey)) return;

      const v = map.get(el.dataset.mkKey);
      if (el.tagName === "INPUT") {
        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "checkbox") el.checked = !!v;
        else el.value = v ?? "";
      } else {
        el.value = v ?? "";
      }

      if (el.tagName === "SELECT") refreshGhostSelect(el);
    });

    // 5) restore active section
    if (state.activeSectionId && document.getElementById(state.activeSectionId)) {
      showSection(state.activeSectionId);
    }

    // sync dealership display after restore
    syncDealershipName();
  }

  const saveState = debounce(() => {
    try {
      const state = buildState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      log("Saved", state);
    } catch (e) {
      console.warn("Could not save state:", e);
    }
  }, 250);

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Could not load state:", e);
      return null;
    }
  }

  /* =======================
     TABLE ADD ROW (+)
  ======================= */
  function clearRowInputs(rowEl) {
    if (!rowEl) return;
    const fields = getAllFields(rowEl);
    fields.forEach((el) => {
      if (el.tagName === "INPUT") {
        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "checkbox") el.checked = false;
        else el.value = "";
      } else if (el.tagName === "TEXTAREA") {
        el.value = "";
      } else if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
        refreshGhostSelect(el);
      }
    });
  }

  function handleAddRow(btn) {
    const tableContainer = btn.closest(".table-container");
    if (!tableContainer) return;

    const tbody = $("tbody", tableContainer);
    if (!tbody) return;

    const template = tbody.querySelector("tr:last-child") || tbody.querySelector("tr");
    if (!template) return;

    const clone = template.cloneNode(true);
    clearRowInputs(clone);
    tbody.appendChild(clone);

    saveState();
  }

  /* =======================
     NOTES BUTTONS (scroll to notes block)
  ======================= */
  function flash(el) {
    if (!el) return;
    el.classList.add("mk-flash");
    setTimeout(() => el.classList.remove("mk-flash"), 900);
  }

  function handleNotesButton(btn) {
    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    // ensure its page section is active (if notes block is on same page it will be visible)
    const section = btn.closest(".page-section");
    if (section?.id) showSection(section.id);

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    flash(target);

    // focus textarea if present
    const ta = $("textarea", target);
    if (ta) setTimeout(() => ta.focus(), 350);
  }

  /* =======================
     RESET PAGE
  ======================= */
  function resetPage(sectionEl) {
    if (!sectionEl) return;

    // Clear all fields in section
    getAllFields(sectionEl).forEach((el) => {
      if (el.tagName === "INPUT") {
        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "checkbox") el.checked = false;
        else el.value = "";
      } else if (el.tagName === "TEXTAREA") {
        el.value = "";
      } else if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
        refreshGhostSelect(el);
      }
    });

    // Reset dynamic tables to 1 row each (within this section only)
    $$(".training-table tbody", sectionEl).forEach((tb) => {
      const rows = tb.querySelectorAll("tr");
      rows.forEach((r, idx) => {
        if (idx === 0) clearRowInputs(r);
        else r.remove();
      });
    });

    // Reset support tickets within page
    if (sectionEl.id === "support-tickets") {
      resetTickets();
    }

    // Reset additional trainers within page (wherever that block lives)
    const trainersContainer = $("#additionalTrainersContainer", sectionEl) || $("#additionalTrainersContainer");
    if (trainersContainer) trainersContainer.innerHTML = "";
    const trainerInput = $("#additionalTrainerInput", sectionEl) || $("#additionalTrainerInput");
    if (trainerInput) trainerInput.value = "";

    // Re-sync dealership display if we cleared it
    syncDealershipName();

    saveState();
  }

  /* =======================
     SUPPORT TICKETS
  ======================= */
  function ticketTargetsByStatus(status) {
    switch (status) {
      case "Open":
        return $("#openTicketsContainer");
      case "Tier Two":
        return $("#tierTwoTicketsContainer");
      case "Closed - Resolved":
        return $("#closedResolvedTicketsContainer");
      case "Closed - Feature Not Supported":
        return $("#closedFeatureTicketsContainer");
      default:
        return $("#openTicketsContainer");
    }
  }

  function getTicketCardEls(card) {
    return {
      number: $(".ticket-number-input", card),
      status: $(".ticket-status-select", card),
      url: $(".ticket-zendesk-input", card),
      summary: $(".ticket-summary-input", card),
    };
  }

  function isTicketCardComplete(card) {
    const els = getTicketCardEls(card);
    const numOk = !!safeTrim(els.number?.value);
    const urlOk = !!safeTrim(els.url?.value);
    const sumOk = !!safeTrim(els.summary?.value);
    return numOk && urlOk && sumOk;
  }

  function cloneTicketCard(card) {
    const clone = card.cloneNode(true);

    // remove base flag
    clone.removeAttribute("data-base");

    // clear inputs
    const { number, status, url, summary } = getTicketCardEls(clone);
    if (number) number.value = "";
    if (url) url.value = "";
    if (summary) summary.value = "";
    if (status) {
      status.value = "Open";
      status.disabled = true; // stays disabled until number typed
    }

    // ensure plus button exists on the active card only (we keep it on clones too; harmless)
    return clone;
  }

  function handleAddTicket(btn) {
    const card = btn.closest(".ticket-group");
    if (!card) return;

    if (!isTicketCardComplete(card)) {
      alert("Please complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    const container = card.parentElement;
    if (!container) return;

    const newCard = cloneTicketCard(card);
    container.appendChild(newCard);

    saveState();
  }

  function handleTicketNumberInput(inputEl) {
    const card = inputEl.closest(".ticket-group");
    if (!card) return;
    const status = $(".ticket-status-select", card);
    if (!status) return;

    const hasNum = !!safeTrim(inputEl.value);
    status.disabled = !hasNum;

    saveState();
  }

  function moveTicketCardByStatus(card, statusValue) {
    const target = ticketTargetsByStatus(statusValue);
    if (!target) return;

    target.appendChild(card);
  }

  function resetTickets() {
    const open = $("#openTicketsContainer");
    if (!open) return;

    // find base card
    const base = open.querySelector(".ticket-group[data-base='true']") || open.querySelector(".ticket-group");
    open.innerHTML = "";
    if (base) {
      const cleanBase = base.cloneNode(true);
      // ensure base flag exists
      cleanBase.setAttribute("data-base", "true");

      // clear base
      const { number, status, url, summary } = getTicketCardEls(cleanBase);
      if (number) number.value = "";
      if (url) url.value = "";
      if (summary) summary.value = "";
      if (status) {
        status.value = "Open";
        status.disabled = true;
      }

      open.appendChild(cleanBase);
    }

    // clear other columns
    ["#tierTwoTicketsContainer", "#closedResolvedTicketsContainer", "#closedFeatureTicketsContainer"].forEach((sel) => {
      const c = $(sel);
      if (c) c.innerHTML = "";
    });
  }

  function restoreTicketCounts(tickets) {
    if (!tickets || typeof tickets !== "object") return;

    // We can only reliably restore by cloning the base card for OPEN.
    // The actual field values are restored by fieldState, once cards exist.
    // So: make sure each container has the right number of .ticket-group nodes.
    const open = $("#openTicketsContainer");
    const base = open?.querySelector(".ticket-group[data-base='true']") || open?.querySelector(".ticket-group");
    if (!open || !base) return;

    const ensureCount = (container, desired, fromCard) => {
      desired = Math.max(0, Number(desired || 0));
      const current = container.querySelectorAll(".ticket-group").length;

      if (desired > current) {
        for (let i = current; i < desired; i++) container.appendChild(cloneTicketCard(fromCard));
      } else if (desired < current) {
        // keep base in open, otherwise remove from end
        for (let i = current; i > desired; i--) {
          const last = container.querySelector(".ticket-group:last-child");
          if (!last) break;
          // don't remove base if in open
          if (container === open && last.getAttribute("data-base") === "true") break;
          last.remove();
        }
      }
    };

    ensureCount(open, tickets.open ?? 1, base);

    const tierTwo = $("#tierTwoTicketsContainer");
    const closedResolved = $("#closedResolvedTicketsContainer");
    const closedFeature = $("#closedFeatureTicketsContainer");

    if (tierTwo) ensureCount(tierTwo, tickets.tierTwo ?? 0, base);
    if (closedResolved) ensureCount(closedResolved, tickets.closedResolved ?? 0, base);
    if (closedFeature) ensureCount(closedFeature, tickets.closedFeature ?? 0, base);
  }

  /* =======================
     ADDITIONAL TRAINERS (FIXED)
  ======================= */
  function addTrainerRow(name = "") {
    const container = $("#additionalTrainersContainer");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "checklist-row integrated-plus indent-sub trainer-row";

    // keep consistent UI: input + remove button
    row.innerHTML = `
      <label>Trainer</label>
      <div class="input-plus">
        <input type="text" class="additional-trainer-input" placeholder="Trainer name" autocomplete="off" />
        <button type="button" class="trainer-remove-btn" data-remove-trainer aria-label="Remove trainer" title="Remove">×</button>
      </div>
    `;

    const input = $("input", row);
    if (input) input.value = name;

    container.appendChild(row);
  }

  function handleAddTrainer(btn) {
    const input = $("#additionalTrainerInput");
    if (!input) return;

    const name = safeTrim(input.value);
    if (!name) return;

    addTrainerRow(name);
    input.value = "";
    input.focus();

    saveState();
  }

  function handleRemoveTrainer(btn) {
    const row = btn.closest(".trainer-row");
    if (row) row.remove();
    saveState();
  }

  /* =======================
     PDF (safe)
  ======================= */
  async function saveAllPagesAsPDF() {
    // Only run if libraries exist (you likely already have this wired elsewhere)
    if (!window.html2canvas || !window.jspdf?.jsPDF) {
      alert("PDF export libraries not found (html2canvas / jsPDF). If you want, I can wire them cleanly.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "letter");

    const sections = $$(".page-section");
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];

      // temporarily show each section for capture
      const prevActive = sec.classList.contains("active");
      $$(".page-section").forEach((s) => s.classList.remove("active"));
      sec.classList.add("active");

      // capture
      // eslint-disable-next-line no-await-in-loop
      const canvas = await window.html2canvas(sec, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (i > 0) doc.addPage();
      doc.addImage(imgData, "PNG", 0, 0, imgW, Math.min(imgH, pageH));

      // restore active if needed
      sec.classList.toggle("active", prevActive);
    }

    // restore first active section if none
    const active = $(".page-section.active");
    if (!active) {
      const first = $(".page-section");
      if (first) first.classList.add("active");
    }

    doc.save("myKaarma-Training-Checklist.pdf");
  }

  /* =======================
     EVENT DELEGATION
  ======================= */
  function onClick(e) {
    const t = e.target;

    // nav
    const navBtn = t.closest(".nav-btn");
    if (navBtn) {
      const id = navBtn.getAttribute("data-target");
      if (id) showSection(id);
      saveState();
      return;
    }

    // add-row (+)
    const addRowBtn = t.closest(".add-row");
    if (addRowBtn) {
      handleAddRow(addRowBtn);
      return;
    }

    // notes buttons
    const notesBtn = t.closest("[data-notes-btn]");
    if (notesBtn) {
      handleNotesButton(notesBtn);
      return;
    }

    // reset page
    const resetBtn = t.closest(".clear-page-btn");
    if (resetBtn) {
      const section = resetBtn.closest(".page-section");
      resetPage(section);
      return;
    }

    // support tickets add card
    const addTicket = t.closest(".add-ticket-btn");
    if (addTicket) {
      handleAddTicket(addTicket);
      return;
    }

    // add trainer (FIXED)
    const addTrainer = t.closest("[data-add-trainer]");
    if (addTrainer) {
      handleAddTrainer(addTrainer);
      return;
    }

    // remove trainer
    const removeTrainer = t.closest("[data-remove-trainer]");
    if (removeTrainer) {
      handleRemoveTrainer(removeTrainer);
      return;
    }

    // PDF button
    if (t && t.id === "savePDF") {
      saveAllPagesAsPDF();
      return;
    }
  }

  function onInput(e) {
    const el = e.target;

    // ticket number enables status
    if (el.classList.contains("ticket-number-input")) {
      handleTicketNumberInput(el);
      return;
    }

    // dealership name display
    if (el.id === "dealershipNameInput") {
      syncDealershipName();
      saveState();
      return;
    }

    // any other field -> save
    if (isTextLike(el)) saveState();
  }

  function onChange(e) {
    const el = e.target;

    // ghost selects
    if (el && el.tagName === "SELECT") refreshGhostSelect(el);

    // ticket status moves card
    if (el.classList.contains("ticket-status-select")) {
      const card = el.closest(".ticket-group");
      if (card) {
        moveTicketCardByStatus(card, el.value);
        saveState();
      }
      return;
    }

    if (isTextLike(el) || el?.tagName === "INPUT") saveState();
  }

  /* =======================
     INIT
  ======================= */
  function ensureFlashCSS() {
    // Adds a tiny CSS helper if you didn’t already define it.
    if ($("#mkFlashStyle")) return;
    const style = document.createElement("style");
    style.id = "mkFlashStyle";
    style.textContent = `
      .mk-flash {
        outline: 2px solid rgba(255, 165, 0, .9);
        outline-offset: 3px;
        border-radius: 10px;
        transition: outline-color .25s ease;
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    ensureFlashCSS();
    initNav();
    initGhostSelects();

    // load state AFTER basic DOM is ready
    const state = loadState();
    if (state) applyState(state);

    // if still no active section, show first
    if (!$(".page-section.active")) {
      const first = $(".page-section");
      if (first?.id) showSection(first.id);
    }

    // sync dealership name display
    syncDealershipName();

    document.addEventListener("click", onClick, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onChange, true);

    log("init done");
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
