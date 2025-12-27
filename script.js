/* =======================================================
   myKaarma Interactive Training Checklist — ENTIRE PROJECT script.js
   -------------------------------------------------------
   ✅ Sidebar nav (page sections)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons (clears + removes saved keys for that page)
   ✅ Add Row (+) for ALL tables (keeps notes buttons working)
   ✅ NOTES SYSTEM (FULL):
        - Pages 3–6 notes buttons all work the same (icon-only, same markup)
        - Clicking table Notes button:
            -> jumps to the right Notes block
            -> inserts a bullet header:
               • <Tech/Advisor/Parts Name>:
               • <Opcode>:
            -> adds spacing (blank line) so new notes are obvious
        - Clicking non-table notes button just scrolls + focuses
   ✅ Support Tickets: base locked to Open, clones enforced, move by status, remove clones
   ✅ Dealership Map helper (updateDealershipMap)
   ✅ Optional onsite date default (end = start + 2)
   ✅ Save All Pages as PDF (if html2canvas + jsPDF present)
   ✅ Defensive: won’t crash if some sections don’t exist
======================================================= */

(() => {
  "use strict";

  /* =======================
     CONFIG
  ======================= */
  const STORAGE_KEY = "mykaarma_interactive_checklist__state_v3";
  const AUTO_ID_ATTR = "data-mk-id";      // persistent identity marker
  const AUTO_ROW_ATTR = "data-mk-row";    // stable row marker for cloned rows
  const AUTO_CARD_ATTR = "data-mk-card";  // stable card marker for cloned cards

  /* =======================
     HELPERS
  ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const uid = (() => {
    let n = 0;
    return (prefix = "mk") => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}-${++n}`;
  })();

  const isEl = (x) => x && x.nodeType === 1;
  const isCheckbox = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "checkbox";
  const isRadio = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "radio";
  const isDate = (el) => isEl(el) && el.tagName === "INPUT" && el.type === "date";

  function safeEscape(val) {
    try { return CSS.escape(val); } catch { return String(val).replace(/[^a-zA-Z0-9_-]/g, ""); }
  }

  function flash(el, cls = "mk-flash", ms = 800) {
    if (!isEl(el)) return;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  }

  function scrollToEl(el, offset = -10) {
    if (!isEl(el)) return;
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function formatDateYYYYMMDD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function addDays(dateStr, days) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    return formatDateYYYYMMDD(d);
  }

  /* =======================
     GHOST / PLACEHOLDER STYLING
  ======================= */
  function applyGhostStyling(root = document) {
    $$("select", root).forEach(sel => {
      const update = () => sel.classList.toggle("is-placeholder", !sel.value);
      sel.addEventListener("change", update);
      update();
    });

    $$("input[type='date']", root).forEach(inp => {
      const update = () => inp.classList.toggle("is-placeholder", !inp.value);
      inp.addEventListener("change", update);
      update();
    });
  }

  /* =======================
     PERSISTENT ID SYSTEM
  ======================= */
  function ensureStableFieldIds(root = document) {
    // mark table rows
    $$("tr", root).forEach(tr => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });

    // mark repeatable blocks/cards
    $$(".ticket-group, .card, .section-block, .dms-card", root).forEach(card => {
      if (!card.getAttribute(AUTO_CARD_ATTR)) card.setAttribute(AUTO_CARD_ATTR, uid("card"));
    });

    // assign mk-id to every form control (unless it has a real id)
    $$("input, select, textarea", root).forEach(el => {
      if (el.tagName === "INPUT") {
        const type = (el.type || "").toLowerCase();
        if (["button", "submit", "reset", "file"].includes(type)) return;
      }

      if (el.id) {
        if (!el.getAttribute(AUTO_ID_ATTR)) el.setAttribute(AUTO_ID_ATTR, el.id);
        return;
      }

      if (el.getAttribute(AUTO_ID_ATTR)) return;

      const page = el.closest(".page-section");
      const pageId = page?.id || "no-page";

      const table = el.closest("table");
      const tr = el.closest("tr");
      const rowKey = tr?.getAttribute(AUTO_ROW_ATTR) || "";

      let colIndex = "";
      if (tr) {
        const cell = el.closest("td,th");
        if (cell) colIndex = String(Array.from(tr.children).indexOf(cell));
      }

      const scope = el.closest("td,th") || tr || el.parentElement || document.body;
      const siblings = $$("input, select, textarea", scope);
      const idx = siblings.indexOf(el);

      const mkid = `${pageId}::${table ? "table" : "form"}::${rowKey}::c${colIndex}::i${idx}`;
      el.setAttribute(AUTO_ID_ATTR, mkid);
    });
  }

  /* =======================
     AUTOSAVE / RESTORE
  ======================= */
  function readState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getFieldKey(el) {
    return el?.getAttribute?.(AUTO_ID_ATTR) || el?.id || "";
  }

  function captureState(root = document) {
    ensureStableFieldIds(root);
    const state = readState();

    $$("input, select, textarea", root).forEach(el => {
      const key = getFieldKey(el);
      if (!key) return;

      if (isCheckbox(el)) state[key] = !!el.checked;
      else if (isRadio(el)) state[key] = el.checked ? el.value : (state[key] ?? "");
      else state[key] = el.value ?? "";
    });

    writeState(state);
  }

  function restoreState(root = document) {
    ensureStableFieldIds(root);
    const state = readState();
    if (!state || typeof state !== "object") return;

    $$("input, select, textarea", root).forEach(el => {
      const key = getFieldKey(el);
      if (!key || !(key in state)) return;

      if (isCheckbox(el)) el.checked = !!state[key];
      else if (isRadio(el)) el.checked = (el.value === state[key]);
      else el.value = state[key] ?? "";
    });

    applyGhostStyling(root);
  }

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!t || !t.matches("input, select, textarea")) return;
    captureState(document);
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!t || !t.matches("input, select, textarea")) return;
    captureState(document);
  });

  /* =======================
     PAGE NAVIGATION
  ======================= */
  const pageSections = $$(".page-section");
  const navButtons = $$(".nav-btn");

  function activatePage(sectionId) {
    if (!sectionId) return;

    pageSections.forEach(sec => sec.classList.remove("active"));
    navButtons.forEach(btn => btn.classList.remove("active"));

    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add("active");

    const btn = $(`.nav-btn[data-target="${safeEscape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    try { window.scrollTo({ top: 0, behavior: "instant" }); }
    catch { window.scrollTo(0, 0); }
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => activatePage(btn.dataset.target));
  });

  /* =======================
     RESET THIS PAGE BUTTONS
  ======================= */
  $$(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      $$("input, select, textarea", page).forEach(el => {
        if (isCheckbox(el) || isRadio(el)) el.checked = false;
        else el.value = "";
      });

      applyGhostStyling(page);

      ensureStableFieldIds(page);
      const state = readState();
      $$("input, select, textarea", page).forEach(el => {
        const k = getFieldKey(el);
        if (k && k in state) delete state[k];
      });
      writeState(state);
    });
  });

  /* =======================
     OPTIONAL: GLOBAL CLEAR ALL
  ======================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-clear-all="true"]');
    if (!btn) return;
    if (!confirm("Clear ALL saved data for this checklist?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  /* =======================
     NOTES BUTTONS — CANONICAL ICON + BEHAVIOR
     -------------------------------------------------------
     This enforces the *exact* same button markup/icon as Pages 3 & 4.
     It does it by cloning a canonical notes button (not in a table),
     then replacing ALL table-notes buttons on pages 5 & 6 with it.
  ======================= */
  function ensureNotesBtnBasics(root = document) {
    $$(".notes-btn,[data-notes-target]", root).forEach(b => {
      if (!b.classList.contains("notes-btn")) b.classList.add("notes-btn");
      if (!b.getAttribute("aria-label")) b.setAttribute("aria-label", "Notes");
      // keep icon-only: do NOT inject text
    });
  }

  function getCanonicalNotesButtonTemplate() {
    // canonical = first notes button NOT inside a table (your Pages 3/4 style)
    const candidates = Array.from(document.querySelectorAll(".notes-btn,[data-notes-target]"));
    const canonical = candidates.find(btn => !btn.closest("table") && btn.getAttribute("data-notes-target"));
    return canonical ? canonical.cloneNode(true) : null;
  }

  function replaceTableNotesButtonsOnPages5And6() {
    const template = getCanonicalNotesButtonTemplate();
    if (!template) return;

    const pagesToFix = ["training-checklist", "opcodes-pricing"]; // Page 5 & 6 IDs
    pagesToFix.forEach(pageId => {
      const page = document.getElementById(pageId);
      if (!page) return;

      const tableBtns = page.querySelectorAll("table .notes-btn, table [data-notes-target]");
      tableBtns.forEach(oldBtn => {
        const target = oldBtn.getAttribute("data-notes-target");
        if (!target) return;

        const fresh = template.cloneNode(true);
        fresh.setAttribute("data-notes-target", target);
        if (!fresh.classList.contains("notes-btn")) fresh.classList.add("notes-btn");
        if (!fresh.getAttribute("aria-label")) fresh.setAttribute("aria-label", "Notes");

        oldBtn.replaceWith(fresh);
      });
    });
  }

  /* =======================
     NOTES — BULLET INSERTION + SCROLL/FOCUS
     -------------------------------------------------------
     Table notes buttons insert:
       - Training Checklist (page 5): • <Name>:
       - Opcodes (page 6): • <Opcode>:
     And always adds a blank line between bullet headers.
  ======================= */
  function getRowDisplayValueForTrainingChecklist(btn) {
    const tr = btn.closest("tr");
    if (!tr) return "";
    // first cell in those tables is "Name" with checkbox + text input
    const nameInput = tr.querySelector("td:first-child input[type='text']");
    return (nameInput?.value || "").trim();
  }

  function getRowDisplayValueForOpcodes(btn) {
    const tr = btn.closest("tr");
    if (!tr) return "";
    // opcode column is 2nd cell (index 1) with text input
    const tds = tr.querySelectorAll("td");
    const opcodeCell = tds[1];
    const opcodeInput = opcodeCell ? opcodeCell.querySelector("input[type='text']") : null;
    return (opcodeInput?.value || "").trim();
  }

  function appendBulletWithSpacing(textarea, bulletLine) {
    if (!textarea || !bulletLine) return;

    const current = textarea.value || "";
    const trimmed = current.replace(/\s+$/g, "");

    // spacing rules:
    // - if empty: just bullet
    // - else: ensure there is a blank line before the new bullet
    const needsBlankLine = trimmed.length > 0 && !trimmed.endsWith("\n\n");

    textarea.value =
      trimmed +
      (trimmed.length ? (needsBlankLine ? "\n\n" : "\n") : "") +
      bulletLine +
      "\n";

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function openNotesTarget(targetId) {
    if (!targetId) return null;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return null;

    const page = notesBlock.closest(".page-section");
    if (page && !page.classList.contains("active")) activatePage(page.id);

    scrollToEl(notesBlock, -12);
    flash(notesBlock);

    const ta = $("textarea", notesBlock);
    if (ta) setTimeout(() => ta.focus({ preventScroll: true }), 250);
    return notesBlock;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".notes-btn,[data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const notesBlock = openNotesTarget(targetId);
    if (!notesBlock) return;

    // If it's a table notes button, insert the proper bullet header
    const inTable = !!btn.closest("table");
    if (!inTable) return;

    const page = btn.closest(".page-section");
    const pageId = page?.id || "";

    const ta = $("textarea", notesBlock);
    if (!ta) return;

    let label = "";

    // Page 5: training checklist tables -> name-based bullets
    if (pageId === "training-checklist") {
      const name = getRowDisplayValueForTrainingChecklist(btn);
      label = name ? `• ${name}:` : "• (Name):";
    }

    // Page 6: opcodes table -> opcode-based bullets
    if (pageId === "opcodes-pricing") {
      const opcode = getRowDisplayValueForOpcodes(btn);
      label = opcode ? `• ${opcode}:` : "• (Opcode):";
    }

    if (label) {
      appendBulletWithSpacing(ta, label);
      flash(notesBlock);
      ta.focus({ preventScroll: true });
    }
  });

  /* =======================
     OPTIONAL: GENERIC BULLET INSERT BUTTONS
     (If you ever add data-insert-bullet)
  ======================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-insert-bullet][data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    const bullet = btn.getAttribute("data-insert-bullet");
    if (!targetId || !bullet) return;

    const block = openNotesTarget(targetId);
    const ta = block ? $("textarea", block) : null;
    if (!ta) return;

    appendBulletWithSpacing(ta, bullet);
    flash(block);
    ta.focus({ preventScroll: true });
  });

  /* =======================
     TABLE ADD ROW (+)
  ======================= */
  function clearControls(root) {
    $$("input, select, textarea", root).forEach(el => {
      if (isCheckbox(el) || isRadio(el)) el.checked = false;
      else el.value = "";
    });
    applyGhostStyling(root);
  }

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".table-footer .add-row");
    if (!addBtn) return;

    const tableContainer = addBtn.closest(".table-container");
    const table = tableContainer ? $("table", tableContainer) : null;
    const tbody = table ? $("tbody", table) : null;
    const firstRow = tbody ? $("tr", tbody) : null;
    if (!tbody || !firstRow) return;

    const clone = firstRow.cloneNode(true);
    clone.setAttribute(AUTO_ROW_ATTR, uid("row"));

    clearControls(clone);

    // prevent duplicate IDs, force new mk-ids
    $$("[id]", clone).forEach(el => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach(el => el.removeAttribute(AUTO_ID_ATTR));

    tbody.appendChild(clone);

    // Re-enforce notes buttons (icon markup) specifically on pages 5/6 tables
    replaceTableNotesButtonsOnPages5And6();
    ensureNotesBtnBasics(document);

    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     SUPPORT TICKETS
  ======================= */
  const ticketContainers = {
    Open: $("#openTicketsContainer"),
    "Tier Two": $("#tierTwoTicketsContainer"),
    "Closed - Resolved": $("#closedResolvedTicketsContainer"),
    "Closed - Feature Not Supported": $("#closedFeatureTicketsContainer"),
  };

  function ticketIsBase(groupEl) {
    return groupEl?.getAttribute?.("data-base") === "true";
  }

  function requiredTicketFieldsFilled(groupEl) {
    const ticketNum = $(".ticket-number-input", groupEl)?.value?.trim();
    const url = $(".ticket-zendesk-input", groupEl)?.value?.trim();
    const summary = $(".ticket-summary-input", groupEl)?.value?.trim();
    return !!(ticketNum && url && summary);
  }

  function setTicketStatus(groupEl, status, lock = false) {
    const sel = $(".ticket-status-select", groupEl);
    if (!sel) return;
    sel.value = status;
    sel.disabled = !!lock;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function moveTicketGroup(groupEl, status) {
    const dest = ticketContainers[status] || ticketContainers.Open;
    if (!dest) return;

    if (ticketIsBase(groupEl)) {
      setTicketStatus(groupEl, "Open", true);
      return;
    }

    const sel = $(".ticket-status-select", groupEl);
    if (sel) sel.disabled = false;

    const disc = $(".ticket-disclaimer", groupEl);
    if (disc) disc.remove();

    dest.appendChild(groupEl);
  }

  if (ticketContainers.Open) {
    const base = $('.ticket-group[data-base="true"]', ticketContainers.Open);
    if (base) setTicketStatus(base, "Open", true);
  }

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const group = addBtn.closest(".ticket-group");
    if (!group || !ticketIsBase(group)) return;

    if (!requiredTicketFieldsFilled(group)) {
      flash(group, "mk-flash", 700);
      alert("Complete Ticket Number, Zendesk URL, and Short Summary before adding another ticket.");
      return;
    }

    const clone = group.cloneNode(true);
    clone.setAttribute("data-base", "false");
    clone.setAttribute(AUTO_CARD_ATTR, uid("ticket"));

    $$("input, textarea", clone).forEach(el => (el.value = ""));
    setTicketStatus(clone, "Open", false);

    if (!$(".remove-ticket-btn", clone)) {
      const inner = $(".ticket-group-inner", clone) || clone;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "remove-ticket-btn";
      rm.textContent = "Remove";
      rm.title = "Remove Ticket";
      inner.prepend(rm);
    }

    ticketContainers.Open?.appendChild(clone);

    ensureStableFieldIds(clone);
    captureState(document);
  });

  document.addEventListener("click", (e) => {
    const rm = e.target.closest(".remove-ticket-btn");
    if (!rm) return;

    const group = rm.closest(".ticket-group");
    if (!group || ticketIsBase(group)) return;

    ensureStableFieldIds(group);
    const state = readState();
    $$("input, select, textarea", group).forEach(el => {
      const k = getFieldKey(el);
      if (k && k in state) delete state[k];
    });
    writeState(state);

    group.remove();
  });

  document.addEventListener("change", (e) => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    const group = sel.closest(".ticket-group");
    if (!group) return;

    if (ticketIsBase(group)) {
      sel.value = "Open";
      sel.disabled = true;
      return;
    }

    moveTicketGroup(group, sel.value || "Open");
    captureState(document);
  });

  /* =======================
     DEALERSHIP MAP HELPER
  ======================= */
  window.updateDealershipMap = function updateDealershipMap(address) {
    const frame = $("#dealershipMapFrame");
    if (!frame) return;
    const q = encodeURIComponent(address || "");
    frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
  };

  /* =======================
     OPTIONAL: ONSITE DATE DEFAULT
  ======================= */
  const onsiteStart = $("#onsiteStartDate");
  const onsiteEnd = $("#onsiteEndDate");
  if (onsiteStart && onsiteEnd && isDate(onsiteStart) && isDate(onsiteEnd)) {
    onsiteStart.addEventListener("change", () => {
      if (!onsiteStart.value) return;
      if (!onsiteEnd.value) {
        onsiteEnd.value = addDays(onsiteStart.value, 2);
        onsiteEnd.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  /* =======================
     SAVE ALL PAGES AS PDF
     -------------------------------------------------------
     Requires:
       - html2canvas (global)
       - jsPDF (global) OR window.jspdf.jsPDF
     Button:
       - #savePDF
  ======================= */
  function getJsPDFConstructor() {
    if (window.jspdf && typeof window.jspdf.jsPDF === "function") return window.jspdf.jsPDF;
    if (typeof window.jsPDF === "function") return window.jsPDF;
    return null;
  }

  function temporarilyActivate(section) {
    pageSections.forEach(sec => sec.classList.remove("active"));
    section.classList.add("active");
  }

  async function exportAllPagesToPDF() {
    const btn = $("#savePDF");
    if (btn) btn.disabled = true;

    try {
      if (typeof window.html2canvas !== "function") {
        alert("PDF export needs html2canvas loaded on the page.");
        return;
      }
      const JsPDF = getJsPDFConstructor();
      if (!JsPDF) {
        alert("PDF export needs jsPDF loaded on the page.");
        return;
      }

      captureState(document);

      const originalActive = $(".page-section.active");
      const sections = pageSections.length ? pageSections : $$(".page-section");

      const pdf = new JsPDF({ orientation: "p", unit: "pt", format: "letter" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        temporarilyActivate(sec);

        await new Promise(r => setTimeout(r, 90));

        const canvas = await window.html2canvas(sec, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: -window.scrollY,
          windowWidth: document.documentElement.clientWidth,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.92);

        const imgW = canvas.width;
        const imgH = canvas.height;

        const usableW = pageW - margin * 2;
        const usableH = pageH - margin * 2;

        const scale = Math.min(usableW / imgW, usableH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        const x = margin + (usableW - drawW) / 2;
        const y = margin;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", x, y, drawW, drawH);
      }

      if (originalActive) activatePage(originalActive.id);
      else if (sections[0]?.id) activatePage(sections[0].id);

      const name = `myKaarma-Training-Checklist-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(name);
    } catch (err) {
      console.error(err);
      alert("PDF export failed. Check console for details.");
    } finally {
      const btn = $("#savePDF");
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("#savePDF");
    if (!b) return;
    exportAllPagesToPDF();
  });

  /* =======================
     INIT
  ======================= */
  function init() {
    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    // Ensure notes buttons are correct everywhere
    ensureNotesBtnBasics(document);
    replaceTableNotesButtonsOnPages5And6();
    ensureNotesBtnBasics(document);

    // Activate first page
    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    // Lock IDs into storage once
    captureState(document);
  }

  init();
})();
