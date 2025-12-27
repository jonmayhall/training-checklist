/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   -------------------------------------------------------
   ✅ Page nav (sidebar)
   ✅ Autosave/Restore (supports dynamically added rows/cards)
   ✅ Reset This Page buttons
   ✅ Add Row (+) for all tables (keeps notes buttons working)
   ✅ Notes buttons — ONE consistent style everywhere:
        - EXACTLY like Pages 3 & 4:
          button.notes-icon-btn.notes-icon-btn--sm + inline SVG
          data-notes-btn + data-notes-target
   ✅ Optional bullet insertion into notes (if you add data-insert-bullet)
   ✅ Support Tickets: base locked to Open, clones enforced, move by status
   ✅ Dealership Map update helper (if #dealershipMapFrame exists)
   ✅ Defensive: won’t crash if some elements/sections don’t exist
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

  // ✅ Exact SVG used on Pages 3/4
  const NOTES_SVG = `
    <svg class="notes-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 14.5c0 1.9-1.6 3.5-3.5 3.5H9l-4.2 2.6c-.5.3-1.1-.1-1.1-.7V18c-1-.6-1.7-1.8-1.7-3.1V7.5C2 5.6 3.6 4 5.5 4h11C18.4 4 20 5.6 20 7.5v7z"></path>
      <path d="M22 9.2v6.1c0 2.4-2 4.4-4.4 4.4H10.7" opacity=".35"></path>
    </svg>
  `.trim();

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
     NOTES BUTTONS — FORCE PAGES 3/4 STYLE EVERYWHERE
     -------------------------------------------------------
     Any button that targets notes MUST become:
       <button type="button"
               class="notes-icon-btn notes-icon-btn--sm"
               data-notes-btn
               data-notes-target="...">
         [inline SVG]
       </button>
  ======================= */
  function forceNotesBtnStyle(btn) {
    if (!btn) return;
    btn.type = "button";
    btn.setAttribute("data-notes-btn", "");

    // Ensure classes match Pages 3/4
    btn.classList.remove("notes-btn"); // in case old table-style existed
    btn.classList.add("notes-icon-btn", "notes-icon-btn--sm");

    if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Add/View Notes");

    // Ensure EXACT SVG exists
    const hasSvg = !!btn.querySelector("svg.notes-svg");
    if (!hasSvg) btn.innerHTML = NOTES_SVG;
  }

  function normalizeAllNotesButtons(root = document) {
    // Only normalize buttons that actually target notes
    $$("button[data-notes-target]", root).forEach(forceNotesBtnStyle);

    // Also catch any legacy markers
    $$("button[data-notes-btn]:not([data-notes-target])", root).forEach(btn => {
      // if it has data-notes-btn but no target, do nothing
    });
  }

  /* =======================
     PERSISTENT ID SYSTEM
  ======================= */
  function ensureStableFieldIds(root = document) {
    $$("tr", root).forEach(tr => {
      if (!tr.getAttribute(AUTO_ROW_ATTR)) tr.setAttribute(AUTO_ROW_ATTR, uid("row"));
    });

    $$(".ticket-group, .card, .section-block, .dms-card", root).forEach(card => {
      if (!card.getAttribute(AUTO_CARD_ATTR)) card.setAttribute(AUTO_CARD_ATTR, uid("card"));
    });

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
        if (cell) {
          const cells = Array.from(tr.children);
          colIndex = String(cells.indexOf(cell));
        }
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
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
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

    const btn = $(`.nav-btn[data-target="${CSS.escape(sectionId)}"]`);
    if (btn) btn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "auto" });
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
     GLOBAL CLEAR ALL (optional)
  ======================= */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-clear-all="true"]');
    if (!btn) return;
    if (!confirm("Clear ALL saved data for this checklist?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
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

    // Remove duplicated IDs + stored mk-ids in clones
    $$("[id]", clone).forEach(el => (el.id = ""));
    $$(`[${AUTO_ID_ATTR}]`, clone).forEach(el => el.removeAttribute(AUTO_ID_ATTR));

    // ✅ IMPORTANT: make sure cloned row notes buttons match Pages 3/4 exactly
    normalizeAllNotesButtons(clone);

    tbody.appendChild(clone);

    ensureStableFieldIds(tbody);
    captureState(document);
  });

  /* =======================
     NOTES BUTTONS (click -> scroll/focus)
  ======================= */
  // ✅ Force all existing notes buttons to Pages 3/4 style (including tables)
  normalizeAllNotesButtons(document);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    if (!targetId) return;

    const notesBlock = document.getElementById(targetId);
    if (!notesBlock) return;

    const page = notesBlock.closest(".page-section");
    if (page && !page.classList.contains("active")) activatePage(page.id);

    scrollToEl(notesBlock, -12);
    flash(notesBlock);

    const ta = $("textarea", notesBlock);
    if (ta) setTimeout(() => ta.focus({ preventScroll: true }), 250);
  });

  /* =======================
     OPTIONAL: INSERT BULLET INTO NOTES
  ======================= */
  function appendBullet(textarea, bulletLine) {
    if (!textarea || !bulletLine) return;

    const current = textarea.value || "";
    const trimmed = current.replace(/\s+$/g, "");
    const needsBlankLine = trimmed.length > 0 && !trimmed.endsWith("\n\n");

    textarea.value =
      trimmed +
      (trimmed.length ? (needsBlankLine ? "\n\n" : "\n") : "") +
      bulletLine +
      "\n";

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-insert-bullet][data-notes-target]");
    if (!btn) return;

    const targetId = btn.getAttribute("data-notes-target");
    const bullet = btn.getAttribute("data-insert-bullet");
    if (!targetId || !bullet) return;

    const block = document.getElementById(targetId);
    const ta = block ? $("textarea", block) : null;
    if (!ta) return;

    appendBullet(ta, bullet);
    flash(block);
    ta.focus({ preventScroll: true });
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

   function repairTableRowColumns(root = document) {
  $$("table", root).forEach(table => {
    const ths = $$("thead th", table);
    if (!ths.length) return;

    const idxByHeader = (regex) =>
      ths.findIndex(th => regex.test((th.textContent || "").trim().toLowerCase()));

    const notesIdx = idxByHeader(/\bnotes?\b/);
    const notifIdx = idxByHeader(/\bnotification(s)?\b/);

    const tbody = $("tbody", table);
    if (!tbody) return;

    $$("tr", tbody).forEach(tr => {
      const tds = $$("td", tr);

      // If row is short, pad it so indices exist
      while (tds.length < ths.length) {
        tr.appendChild(document.createElement("td"));
        tds.push(tr.lastElementChild);
      }

      // --- Move notes button into the Notes column
      if (notesIdx >= 0) {
        const btn = tr.querySelector("button[data-notes-target]");
        if (btn) {
          const currentCell = btn.closest("td");
          const targetCell = tds[notesIdx];
          if (currentCell && targetCell && currentCell !== targetCell) {
            targetCell.appendChild(btn);
          }
        }
      }

      // --- Ensure Notifications dropdown exists in Notifications column
      if (notifIdx >= 0) {
        const notifCell = tds[notifIdx];
        if (notifCell) {
          const hasSelect = !!notifCell.querySelector("select");
          if (!hasSelect) {
            const sel = document.createElement("select");
            sel.className = "notification-select";
            sel.innerHTML = `
              <option value="" data-ghost="true">Notification</option>
              <option>Yes</option>
              <option>No</option>
              <option>N/A</option>
            `;
            notifCell.appendChild(sel);
          }
        }
      }
    });
  });
}

  /* =======================
     INIT
  ======================= */
  function init() {
    // ✅ Make notes buttons consistent everywhere (including tables)
    normalizeAllNotesButtons(document);

    ensureStableFieldIds(document);
    restoreState(document);
    applyGhostStyling(document);

    const active = $(".page-section.active")?.id || $(".page-section")?.id;
    if (active) activatePage(active);

    captureState(document);
  }

  init();
})();
