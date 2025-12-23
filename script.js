/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   “Full JS + fixes” (drop-in)
   ✅ Nav clicks work + URL hash support
   ✅ Add Row (+) for ALL .training-table tables
   ✅ Support Tickets: add/remove, move by status, base locked to Open
   ✅ Notes icons (📝) jump to correct Notes block + inserts bullets:
      - Checklist rows: "• Question:"
      - Training tables: "• <Name>:"
      - Opcodes table: "• <Opcode>:"
   ✅ Notes textarea expander (⤢) + Notes modal
   ✅ Table expand (⤢) to modal + keeps horizontal scroll
   ✅ Autosave (localStorage) + Restore on load
   ✅ Reset Page + Clear All
   ✅ Ghost placeholders for selects (data-ghost="true")
   ✅ Date helper: end defaults to start + 2 days (for common ids)
   ✅ PDF export (all pages) if jsPDF + html2canvas are present
   ======================================================= */

(() => {
  "use strict";

  /* ---------------------------
     Tiny helpers
  --------------------------- */
  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const STORAGE_KEY = "mk_interactive_checklist_v1";

  const debounce = (fn, wait=250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const safeJsonParse = (s, fallback=null) => {
    try { return JSON.parse(s); } catch { return fallback; }
  };

  const todayISO = () => {
    const d = new Date();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  const addDaysISO = (iso, days) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  const scrollToEl = (el) => {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("mk-note-jump");
    setTimeout(() => el.classList.remove("mk-note-jump"), 900);
  };

  /* ---------------------------
     Ghost placeholders (selects)
  --------------------------- */
  function applyGhostPlaceholder(el) {
    if (!el || el.tagName !== "SELECT") return;
    const first = el.options?.[0];
    const hasGhost = first && first.getAttribute("data-ghost") === "true";
    if (!hasGhost) return;

    // If value empty -> placeholder style
    if (!el.value) el.classList.add("is-placeholder");
    else el.classList.remove("is-placeholder");

    // Ensure first option doesn't become a valid "selected" value silently
    // (We keep it empty string in HTML.)
  }

  function initGhostSelects(root=document) {
    qsa("select", root).forEach(sel => {
      applyGhostPlaceholder(sel);
      sel.addEventListener("change", () => applyGhostPlaceholder(sel));
    });
  }

  /* ---------------------------
     Nav + pages
  --------------------------- */
  function setActiveSection(sectionId) {
    const pages = qsa(".page-section");
    pages.forEach(p => p.classList.remove("active"));

    const target = qs(`#${CSS.escape(sectionId)}`);
    if (target && target.classList.contains("page-section")) {
      target.classList.add("active");
    } else {
      // fallback to first section
      const first = pages[0];
      if (first) first.classList.add("active");
      sectionId = first?.id || sectionId;
    }

    // nav buttons
    qsa("#sidebar-nav .nav-btn").forEach(btn => {
      const id = btn.getAttribute("data-target");
      btn.classList.toggle("active", id === sectionId);
    });

    // update hash (no jump)
    if (sectionId) history.replaceState(null, "", `#${sectionId}`);
  }

  function initNav() {
    qsa("#sidebar-nav .nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-target");
        if (id) setActiveSection(id);
        // Save on nav to be safe
        scheduleSave();
      });
    });

    const initial = (location.hash || "").replace("#", "");
    if (initial) setActiveSection(initial);
    else {
      const first = qs(".page-section")?.id;
      if (first) setActiveSection(first);
    }

    window.addEventListener("hashchange", () => {
      const id = (location.hash || "").replace("#", "");
      if (id) setActiveSection(id);
    });
  }

  /* ---------------------------
     Autosave / restore
  --------------------------- */
  function buildKeyForEl(el) {
    // Prefer stable IDs / names.
    if (el.id) return `id:${el.id}`;
    if (el.name) return `name:${el.name}`;

    // Otherwise: path key by DOM position within page
    // (Reasonable for a single-file app; dynamic rows are handled by saving after create.)
    const section = el.closest(".page-section");
    const sectionId = section?.id || "no-section";

    // Create a selector-ish signature
    const parts = [];
    let node = el;
    while (node && node !== section && node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      const cls = (node.className && typeof node.className === "string")
        ? node.className.trim().split(/\s+/).slice(0,2).join(".")
        : "";
      const idx = node.parentElement
        ? Array.from(node.parentElement.children).indexOf(node)
        : 0;
      parts.push(`${tag}${cls ? "."+cls : ""}[${idx}]`);
      node = node.parentElement;
    }
    return `path:${sectionId}:${parts.reverse().join(">")}`;
  }

  function collectState() {
    const data = {};
    const els = qsa("input, select, textarea");

    for (const el of els) {
      // Skip buttons
      if (el.tagName === "INPUT") {
        const t = (el.getAttribute("type") || "").toLowerCase();
        if (t === "button" || t === "submit" || t === "reset") continue;
      }

      const key = buildKeyForEl(el);

      if (el.tagName === "INPUT") {
        const t = (el.type || "").toLowerCase();
        if (t === "checkbox") data[key] = !!el.checked;
        else data[key] = el.value ?? "";
      } else if (el.tagName === "SELECT") {
        data[key] = el.value ?? "";
      } else if (el.tagName === "TEXTAREA") {
        data[key] = el.value ?? "";
      }
    }
    return data;
  }

  function applyState(saved) {
    if (!saved || typeof saved !== "object") return;

    const els = qsa("input, select, textarea");
    for (const el of els) {
      // Skip buttons
      if (el.tagName === "INPUT") {
        const t = (el.getAttribute("type") || "").toLowerCase();
        if (t === "button" || t === "submit" || t === "reset") continue;
      }

      const key = buildKeyForEl(el);
      if (!(key in saved)) continue;

      const val = saved[key];

      if (el.tagName === "INPUT") {
        const t = (el.type || "").toLowerCase();
        if (t === "checkbox") el.checked = !!val;
        else el.value = String(val ?? "");
      } else {
        el.value = String(val ?? "");
      }
    }

    // Re-apply ghost placeholder class
    initGhostSelects(document);
    // Re-apply acceptance coloring (optional helper)
    applyAcceptanceColors(document);
    // Re-apply note indicators
    refreshNoteIndicators();
  }

  function saveNow() {
    const state = collectState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  const scheduleSave = debounce(saveNow, 250);

  function initAutosave() {
    // Restore first
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = safeJsonParse(raw, null);
    if (saved) applyState(saved);

    // Save on any interaction
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.matches("input, textarea")) scheduleSave();
    }, true);

    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.matches("select, input[type='checkbox'], input[type='date']")) {
        // Update ghost placeholder
        if (t.tagName === "SELECT") applyGhostPlaceholder(t);
        scheduleSave();
      }
    }, true);
  }

  /* ---------------------------
     Clear All + Reset Page
  --------------------------- */
  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    // safest: reload so dynamic rows/tickets reset too
    location.reload();
  }

  function resetPage(sectionEl) {
    if (!sectionEl) return;

    // Clear inputs/selects/textarea within section
    qsa("input, select, textarea", sectionEl).forEach(el => {
      if (el.tagName === "INPUT") {
        const t = (el.type || "").toLowerCase();
        if (t === "checkbox") el.checked = false;
        else if (t !== "button" && t !== "submit" && t !== "reset") el.value = "";
      } else if (el.tagName === "SELECT") {
        el.value = "";
        applyGhostPlaceholder(el);
      } else {
        el.value = "";
      }
    });

    // Special: reset tickets containers to base only
    if (sectionEl.id === "support-tickets") resetTicketsToBase();

    // Special: remove dynamically added table rows (keep original 3 where present, or 1)
    qsa(".training-table", sectionEl).forEach(table => {
      const tbody = table.tBodies?.[0];
      if (!tbody) return;
      const rows = Array.from(tbody.rows);
      // Keep at least 1 row; if you have 3 starter rows, keep 3
      const keep = Math.min(3, rows.length);
      rows.slice(keep).forEach(r => r.remove());
      // Clear remaining rows
      rows.slice(0, keep).forEach(r => clearTableRow(r));
    });

    refreshNoteIndicators();
    applyAcceptanceColors(sectionEl);
    scheduleSave();
  }

  function initResetButtons() {
    // Clear All (left sidebar button)
    const clearAllBtn = qs("#clearAllBtn");
    if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

    // Reset This Page (per section)
    qsa(".page-section .clear-page-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const section = btn.closest(".page-section");
        resetPage(section);
      });
    });
  }

  /* ---------------------------
     Table Add Row (+)
  --------------------------- */
  function clearTableRow(tr) {
    qsa("input, select, textarea", tr).forEach(el => {
      if (el.tagName === "INPUT") {
        const t = (el.type || "").toLowerCase();
        if (t === "checkbox") el.checked = false;
        else el.value = "";
      } else if (el.tagName === "SELECT") {
        el.value = "";
      } else {
        el.value = "";
      }
    });
  }

  function cloneTableRow(table) {
    const tbody = table.tBodies?.[0];
    if (!tbody) return null;

    const rows = Array.from(tbody.rows);
    const template = rows[rows.length - 1] || rows[0];
    if (!template) return null;

    const clone = template.cloneNode(true);
    clearTableRow(clone);

    // Keep notes icon button in place; no special changes needed
    tbody.appendChild(clone);

    // Re-bind notes icon click inside new row
    bindNotesIconButtons(clone);

    scheduleSave();
    return clone;
  }

  function initTableAddRow() {
    qsa(".table-container").forEach(container => {
      const table = qs("table.training-table", container);
      const footerAdd = qs(".table-footer .add-row", container);

      if (!table || !footerAdd) return;

      footerAdd.addEventListener("click", () => {
        cloneTableRow(table);
      });
    });
  }

  /* ---------------------------
     Acceptance colors helper (optional)
     (Only applies if selects contain those labels)
  --------------------------- */
  function applyAcceptanceColors(root=document) {
    qsa(".training-table select", root).forEach(sel => {
      sel.classList.remove("accept-yes","accept-neutral","accept-no","accept-na");
      const v = (sel.value || "").toLowerCase();

      if (v.includes("fully adopted") || v.includes("mostly adopted")) sel.classList.add("accept-yes");
      else if (v.includes("neutral")) sel.classList.add("accept-neutral");
      else if (v.includes("needs support") || v.includes("not accepted")) sel.classList.add("accept-no");
      else if (v === "n/a") sel.classList.add("accept-na");
    });
  }

  /* ---------------------------
     Notes: checklist-row linking + table notes + fixes
     - HTML already includes:
       * .notes-icon-btn data-notes-target="notes-..."
       * Notes blocks with corresponding id="notes-..."
  --------------------------- */
  function ensureLineStartsWithBullet(line) {
    const trimmed = (line || "").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("•")) return trimmed;
    return `• ${trimmed}`;
  }

  function appendNoteLine(textarea, line) {
    if (!textarea) return;
    const txt = textarea.value || "";
    const safeLine = ensureLineStartsWithBullet(line);

    if (!txt.trim()) {
      textarea.value = safeLine;
    } else {
      const endsWithNL = txt.endsWith("\n");
      textarea.value = txt + (endsWithNL ? "" : "\n") + safeLine;
    }
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    scheduleSave();
    refreshNoteIndicators();
  }

  function getTableContextLine(btn) {
    // Determine which table this button belongs to
    const section = btn.closest(".page-section");
    const sectionId = section?.id || "";

    // Row context
    const tr = btn.closest("tr");
    const table = btn.closest("table.training-table");

    // Training Checklist tables: first cell has checkbox+name input
    if (sectionId === "training-checklist") {
      const nameInput = qs("td:first-child input[type='text']", tr);
      const name = (nameInput?.value || "").trim();
      return name ? `• ${name}:` : "• (Name):";
    }

    // Opcodes: opcode is in 2nd column input (after checkbox)
    if (sectionId === "opcodes-pricing") {
      // Find first text input after the checkbox column, usually opcode
      const opcodeInput = qs("td:nth-child(2) input[type='text']", tr) || qs("td input[type='text']", tr);
      const opcode = (opcodeInput?.value || "").trim();
      return opcode ? `• ${opcode}:` : "• (Opcode):";
    }

    // Generic fallback
    return "• Note:";
  }

  function bindNotesIconButtons(root=document) {
    qsa(".notes-icon-btn", root).forEach(btn => {
      if (btn.__mkBound) return;
      btn.__mkBound = true;

      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-notes-target");
        const notesBlock = targetId ? qs(`#${CSS.escape(targetId)}`) : null;
        const textarea = notesBlock ? qs("textarea", notesBlock) : null;

        if (!notesBlock || !textarea) return;

        // Jump to notes block
        scrollToEl(notesBlock);

        // Insert the right bullet line based on context:
        // - If this is a table notes icon button -> name/opcode line
        const inTable = !!btn.closest("table.training-table");
        if (inTable) {
          const line = getTableContextLine(btn);
          appendNoteLine(textarea, line);
          return;
        }

        // - Otherwise checklist-row note icon: Question bullet
        appendNoteLine(textarea, "• Question:");
      });
    });
  }

  function refreshNoteIndicators() {
    // Marks buttons orange if their target textarea has content
    qsa(".notes-icon-btn").forEach(btn => {
      const targetId = btn.getAttribute("data-notes-target");
      const notesBlock = targetId ? qs(`#${CSS.escape(targetId)}`) : null;
      const textarea = notesBlock ? qs("textarea", notesBlock) : null;
      const has = textarea ? !!(textarea.value || "").trim() : false;
      btn.classList.toggle("has-note", has);
      // For compatibility with your older CSS class name:
      // If you also have .note-link-btn, ignore here.
    });
  }

  /* ---------------------------
     Notes textarea expander (⤢) + modal
  --------------------------- */
  function ensureNotesModal() {
    let modal = qs("#mkNotesModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "mkNotesModal";
    modal.innerHTML = `
      <div class="mk-modal-backdrop" role="presentation"></div>
      <div class="mk-modal-panel" role="dialog" aria-modal="true" aria-label="Notes">
        <div class="mk-modal-header">
          <div class="mk-modal-title">Notes</div>
          <button type="button" class="mk-modal-close" aria-label="Close">×</button>
        </div>
        <textarea class="mk-modal-textarea"></textarea>
      </div>
    `;
    document.body.appendChild(modal);

    const backdrop = qs(".mk-modal-backdrop", modal);
    const closeBtn = qs(".mk-modal-close", modal);

    const close = () => {
      modal.classList.remove("open");
      modal.__activeTextarea = null;
    };

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    // Sync changes back to the active textarea
    const modalTa = qs(".mk-modal-textarea", modal);
    modalTa.addEventListener("input", () => {
      const active = modal.__activeTextarea;
      if (!active) return;
      active.value = modalTa.value;
      scheduleSave();
      refreshNoteIndicators();
    });

    return modal;
  }

  function wrapTextareasWithExpand(root=document) {
    qsa("textarea", root).forEach(ta => {
      // Skip if already wrapped or modal textarea
      if (ta.classList.contains("mk-modal-textarea")) return;
      if (ta.closest(".mk-ta-wrap")) return;

      const wrap = document.createElement("div");
      wrap.className = "mk-ta-wrap";

      const parent = ta.parentElement;
      parent.insertBefore(wrap, ta);
      wrap.appendChild(ta);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-ta-expand";
      btn.textContent = "⤢";
      btn.title = "Expand notes";
      wrap.appendChild(btn);

      btn.addEventListener("click", () => {
        const modal = ensureNotesModal();
        const modalTa = qs(".mk-modal-textarea", modal);
        const title = qs(".mk-modal-title", modal);

        // Title = nearest card header if available
        const block = ta.closest(".section-block");
        const h2 = block ? qs("h2", block) : null;
        title.textContent = h2 ? h2.textContent.trim() : "Notes";

        modal.__activeTextarea = ta;
        modalTa.value = ta.value || "";
        modal.classList.add("open");
        setTimeout(() => modalTa.focus(), 0);
      });
    });
  }

  /* ---------------------------
     Table expand modal (⤢)
  --------------------------- */
  function ensureTableModal() {
    let modal = qs("#mkTableModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "mkTableModal";
    modal.innerHTML = `
      <div class="mk-modal-backdrop" role="presentation"></div>
      <div class="mk-modal-panel" role="dialog" aria-modal="true" aria-label="Table">
        <div class="mk-modal-header">
          <div class="mk-modal-title">Table</div>
          <button type="button" class="mk-modal-close" aria-label="Close">×</button>
        </div>
        <div class="mk-table-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const backdrop = qs(".mk-modal-backdrop", modal);
    const closeBtn = qs(".mk-modal-close", modal);
    const body = qs(".mk-table-modal-body", modal);

    const close = () => {
      modal.classList.remove("open");
      // Return moved content
      if (modal.__moved && modal.__originalParent) {
        modal.__originalParent.appendChild(modal.__moved);
      }
      modal.__moved = null;
      modal.__originalParent = null;
      body.innerHTML = "";
    };

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    modal.__close = close;
    return modal;
  }

  function addExpandButtonsToTableFooters() {
    qsa(".table-container").forEach(container => {
      const footer = qs(".table-footer", container);
      const addBtn = qs(".add-row", footer);
      if (!footer || !addBtn) return;

      // Don’t double add
      if (qs(".mk-table-expand-btn", footer)) return;

      // Wrap left so Add Row stays left (CSS supports .footer-left)
      let left = qs(".footer-left", footer);
      if (!left) {
        left = document.createElement("div");
        left.className = "footer-left";
        // move existing children into left except expand (none yet)
        const kids = Array.from(footer.childNodes);
        kids.forEach(k => left.appendChild(k));
        footer.appendChild(left);
      }

      const expand = document.createElement("button");
      expand.type = "button";
      expand.className = "mk-table-expand-btn";
      expand.textContent = "⤢";
      expand.title = "Expand table";
      footer.appendChild(expand);

      expand.addEventListener("click", () => {
        const modal = ensureTableModal();
        const body = qs(".mk-table-modal-body", modal);
        const title = qs(".mk-modal-title", modal);

        // Title from nearest section header
        const sectionHeader = container.closest(".section")?.querySelector(".section-header");
        title.textContent = sectionHeader
          ? sectionHeader.textContent.trim()
          : "Table";

        // Move the container (so inputs keep bindings)
        modal.__moved = container;
        modal.__originalParent = container.parentElement;

        body.appendChild(container);
        modal.classList.add("open");

        // Make sure modal has expand wrap applied if needed
        wrapTextareasWithExpand(modal);
      });
    });
  }

  /* ---------------------------
     Support Tickets (Open/Tier Two/Closed...)
  --------------------------- */
  function getTicketContainers() {
    return {
      open: qs("#openTicketsContainer"),
      tier2: qs("#tierTwoTicketsContainer"),
      resolved: qs("#closedResolvedTicketsContainer"),
      feature: qs("#closedFeatureTicketsContainer"),
    };
  }

  function ticketStatusToContainerKey(status) {
    switch (status) {
      case "Open": return "open";
      case "Tier Two": return "tier2";
      case "Closed - Resolved": return "resolved";
      case "Closed - Feature Not Supported": return "feature";
      default: return "open";
    }
  }

  function makeRemoveBtn() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-ticket-btn";
    btn.title = "Remove Ticket";
    btn.textContent = "−";
    return btn;
  }

  function bindTicketCard(card) {
    if (!card || card.__mkBound) return;
    card.__mkBound = true;

    const isBase = card.getAttribute("data-base") === "true";

    const statusSel = qs(".ticket-status-select", card);
    const addBtn = qs(".add-ticket-btn", card);
    const numberInput = qs(".ticket-number-input", card);
    const urlInput = qs(".ticket-zendesk-input", card);
    const summaryTa = qs(".ticket-summary-input", card);

    // Base stays locked to Open
    if (isBase && statusSel) {
      statusSel.value = "Open";
      statusSel.disabled = true;
    }

    // Status change moves non-base cards
    if (statusSel && !isBase) {
      statusSel.disabled = false;
      statusSel.addEventListener("change", () => {
        const status = statusSel.value;
        const containers = getTicketContainers();
        const key = ticketStatusToContainerKey(status);
        const target = containers[key];
        if (target) target.appendChild(card);
        scheduleSave();
      });
    }

    // Add ticket: only from base card
    if (addBtn && isBase) {
      addBtn.addEventListener("click", () => {
        const num = (numberInput?.value || "").trim();
        const url = (urlInput?.value || "").trim();
        const sum = (summaryTa?.value || "").trim();

        // Require completion before cloning (matches your disclaimer)
        if (!num || !url || !sum) {
          alert("Please complete Ticket Number, Zendesk URL, and Summary before adding another ticket.");
          return;
        }

        const clone = card.cloneNode(true);
        clone.removeAttribute("data-base");
        clone.setAttribute("data-base", "false");

        // Remove disclaimer if present
        const disclaimer = qs(".ticket-disclaimer", clone);
        if (disclaimer) disclaimer.remove();

        // Add remove button next to the ticket number
        const wrap = qs(".ticket-number-wrap", clone);
        const addBtnClone = qs(".add-ticket-btn", clone);
        if (addBtnClone) addBtnClone.remove();

        const removeBtn = makeRemoveBtn();
        wrap?.appendChild(removeBtn);

        removeBtn.addEventListener("click", () => {
          clone.remove();
          scheduleSave();
        });

        // Enable status dropdown for clone
        const statusClone = qs(".ticket-status-select", clone);
        if (statusClone) {
          statusClone.disabled = false;
          // default clone stays in Open until user changes
          statusClone.value = "Open";
        }

        // Append into Open container (but not inside the base group’s inner)
        const containers = getTicketContainers();
        containers.open?.appendChild(clone);

        bindTicketCard(clone);

        // Clear base for next entry
        numberInput.value = "";
        urlInput.value = "";
        summaryTa.value = "";

        scheduleSave();
      });
    }
  }

  function initTickets() {
    // Bind base card
    qsa("#openTicketsContainer .ticket-group").forEach(bindTicketCard);

    // Bind any existing non-base cards (if restored)
    qsa("#tierTwoTicketsContainer .ticket-group, #closedResolvedTicketsContainer .ticket-group, #closedFeatureTicketsContainer .ticket-group")
      .forEach(bindTicketCard);
  }

  function resetTicketsToBase() {
    const containers = getTicketContainers();
    if (!containers.open) return;

    // Keep base card only
    const base = qs("#openTicketsContainer .ticket-group[data-base='true']");
    containers.tier2 && (containers.tier2.innerHTML = "");
    containers.resolved && (containers.resolved.innerHTML = "");
    containers.feature && (containers.feature.innerHTML = "");

    containers.open.innerHTML = "";
    if (base) containers.open.appendChild(base);

    // Clear base fields
    qsa("input, textarea", base).forEach(el => {
      if (el.tagName === "INPUT") el.value = "";
      else el.value = "";
    });
    const sel = qs(".ticket-status-select", base);
    if (sel) { sel.value = "Open"; sel.disabled = true; }

    scheduleSave();
  }

  /* ---------------------------
     Date helper: end = start + 2 days
     (Common ids used in your project)
  --------------------------- */
  function initDateHelpers() {
    const pairs = [
      ["onsiteStartDate", "onsiteEndDate"],
      ["trainingStartDate", "trainingEndDate"],
      ["onsiteTrainingStartDate", "onsiteTrainingEndDate"],
    ];

    pairs.forEach(([startId, endId]) => {
      const start = qs(`#${CSS.escape(startId)}`);
      const end   = qs(`#${CSS.escape(endId)}`);
      if (!start || !end) return;

      start.addEventListener("change", () => {
        if (!start.value) return;
        const suggested = addDaysISO(start.value, 2);
        // Only set if end empty or earlier than start
        if (!end.value || end.value < start.value) end.value = suggested;
        scheduleSave();
      });
    });
  }

  /* ---------------------------
     PDF export (all pages)
     Requires: window.jspdf?.jsPDF and window.html2canvas
  --------------------------- */
  async function exportAllPagesToPDF() {
    const jsPDF = window.jspdf?.jsPDF;
    const html2canvas = window.html2canvas;
    if (!jsPDF || !html2canvas) {
      alert("PDF export requires jsPDF + html2canvas to be loaded.");
      return;
    }

    const sections = qsa(".page-section");
    if (!sections.length) return;

    // Temporarily show all sections for capture
    const prev = sections.map(s => s.classList.contains("active"));
    sections.forEach(s => s.classList.add("active"));

    const pdf = new jsPDF("p", "pt", "letter");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < sections.length; i++) {
      const el = sections[i];

      // Scroll to top of element to ensure correct render
      el.scrollIntoView({ behavior: "auto", block: "start" });

      // canvas
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const img = canvas.toDataURL("image/png");
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      // Fit to page with simple pagination if too tall
      let remaining = imgH;
      let y = 0;

      if (i > 0) pdf.addPage();

      // If the section fits on one page:
      if (imgH <= pageH) {
        pdf.addImage(img, "PNG", 0, 0, imgW, imgH);
      } else {
        // Multi-page slice approach
        // Create a temp canvas to slice vertically
        const sliceCanvas = document.createElement("canvas");
        const ctx = sliceCanvas.getContext("2d");

        const pxPerPt = canvas.width / imgW;         // pixels per point
        const pagePxH = Math.floor(pageH * pxPerPt); // page height in pixels

        sliceCanvas.width = canvas.width;
        sliceCanvas.height = pagePxH;

        let sy = 0;
        let pageIndex = 0;

        while (sy < canvas.height) {
          ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, sy, canvas.width, pagePxH, 0, 0, canvas.width, pagePxH);

          const sliceImg = sliceCanvas.toDataURL("image/png");
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(sliceImg, "PNG", 0, 0, imgW, pageH);

          sy += pagePxH;
          pageIndex++;
        }
      }
    }

    // Restore previous active states
    sections.forEach((s, idx) => {
      s.classList.toggle("active", prev[idx]);
    });

    const filename = `myKaarma_Onsite_Training_${todayISO()}.pdf`;
    pdf.save(filename);
  }

  function initPDFButton() {
    const btn = qs("#savePDF");
    if (!btn) return;
    btn.addEventListener("click", exportAllPagesToPDF);
  }

  /* ---------------------------
     Init everything
  --------------------------- */
  function init() {
    initNav();
    initGhostSelects(document);
    initAutosave();
    initResetButtons();
    initTableAddRow();
    applyAcceptanceColors(document);

    // Notes + expanders + indicators
    bindNotesIconButtons(document);
    wrapTextareasWithExpand(document);
    refreshNoteIndicators();

    // Table expand buttons
    addExpandButtonsToTableFooters();

    // Tickets
    initTickets();

    // Dates
    initDateHelpers();

    // PDF
    initPDFButton();

    // Keep indicators accurate
    document.addEventListener("input", debounce(() => {
      refreshNoteIndicators();
      applyAcceptanceColors(document);
    }, 250), true);
  }

  // Run after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
