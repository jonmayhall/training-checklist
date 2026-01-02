/* =======================================================
   myKaarma Interactive Training Checklist — FULL PROJECT JS
   (SINGLE SCRIPT / HARDENED / DROP-IN) — FIXED BUILD

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
      - Training table expand buttons (⤢) in EVERY .table-footer (catch-all)
      - Notes expand buttons (⤢) in the bottom-right of EVERY notes textarea
        (stacked + side-by-side, even without data-notes-target)
      - Expand works even if buttons are injected by JS
      - MutationObserver re-injects expand buttons after page changes / clones

   ✅ NEW REQUESTS INCLUDED (this build):
      - Training End Date auto-sets to Onsite Date + 2 days (only if End Date empty)
      - Service Advisors table seeds to 3 starter rows (scoped to that section only)
      - Notes expand button is NOT added inside Support Tickets section
      - Stacked Notes cards/textareas are forced taller (2x min-height) via JS hook

   NOTE:
   - Table/Notes expand uses #mkTableModal.
   - If modal missing, shows mkPopup warning instead of failing.
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

     /* =======================
   TRAINING SUMMARY — EXEC SUMMARY (AI-STYLE)
======================= */
const ExecSummary = (() => {
  const norm = (s) => String(s || "").replace(/\r\n/g, "\n").trim();

  const uniq = (arr) => {
    const seen = new Set();
    return arr.filter((x) => {
      const k = String(x || "").trim().toLowerCase();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const takeTop = (arr, n = 6) => uniq(arr).slice(0, n);

  const collectAllNotesText = () => {
    // Only notes blocks that are actually "used" by notes buttons
    const targets = new Set();
    document.querySelectorAll("[data-notes-target]").forEach((b) => {
      const id = b.getAttribute("data-notes-target");
      if (id) targets.add(id);
    });

    const chunks = [];
    targets.forEach((id) => {
      const host = document.getElementById(id);
      const ta = host ? host.querySelector("textarea") : null;
      if (ta && !ta.closest("table")) {
        const t = norm(ta.value);
        if (t) chunks.push(`### ${id}\n${t}`);
      }
    });

    // Also include any other "notes-only" textareas in cards (not tables)
    document.querySelectorAll(".section-block textarea").forEach((ta) => {
      if (ta.closest("table")) return;
      // avoid double-counting ones already in targets
      const hostId = ta.closest("[id]")?.id;
      if (hostId && targets.has(hostId)) return;
      const t = norm(ta.value);
      if (t) chunks.push(`### ${hostId || "notes"}\n${t}`);
    });

    return norm(chunks.join("\n\n"));
  };

  const collectKeyContext = () => {
    const dealership =
      (document.getElementById("dealershipNameInput")?.value || "").trim() ||
      (document.getElementById("dealershipNameDisplay")?.textContent || "").trim();

    const onsite =
      (document.getElementById("onsiteTrainingDate")?.value || "").trim() ||
      (document.getElementById("onsiteDate")?.value || "").trim();

    const end =
      (document.getElementById("trainingEndDate")?.value || "").trim() ||
      (document.getElementById("endDate")?.value || "").trim();

    const parts = [];
    if (dealership) parts.push(`Dealership: ${dealership}`);
    if (onsite) parts.push(`Onsite date: ${onsite}`);
    if (end) parts.push(`Training end: ${end}`);
    return parts.join(" | ");
  };

  const scoreLine = (line) => {
    // Light weighting to surface more useful statements
    const s = line.toLowerCase();
    let score = 0;
    if (s.includes("completed") || s.includes("success") || s.includes("working")) score += 3;
    if (s.includes("issue") || s.includes("problem") || s.includes("broken")) score += 3;
    if (s.includes("need") || s.includes("next") || s.includes("follow")) score += 2;
    if (line.length > 40) score += 1;
    if (line.length > 90) score += 1;
    return score;
  };

  const extractCandidates = (notesText) => {
    const lines = norm(notesText)
      .split("\n")
      .map((l) => l.replace(/\u2060/g, "").trim()) // remove invisible marker wrapper if present
      .filter((l) => l && !l.startsWith("###"));

    // Remove your bullet scaffolding characters and empties like "◦"
    const cleaned = lines
      .map((l) =>
        l
          .replace(/^•\s*/g, "")
          .replace(/^◦\s*/g, "")
          .replace(/^\-\s*/g, "")
          .trim()
      )
      .filter((l) => l && l !== "◦");

    return cleaned;
  };

  const classify = (candidates) => {
    const wins = [];
    const risks = [];
    const next = [];

    candidates.forEach((l) => {
      const s = l.toLowerCase();

      const isNext =
        s.startsWith("next") ||
        s.includes("next step") ||
        s.includes("follow up") ||
        s.includes("follow-up") ||
        s.includes("recommend") ||
        s.includes("should") ||
        s.includes("needs to") ||
        s.includes("need to") ||
        s.includes("action") ||
        s.includes("schedule") ||
        s.includes("train") ||
        s.includes("verify") ||
        s.includes("confirm");

      const isRisk =
        s.includes("risk") ||
        s.includes("concern") ||
        s.includes("blocker") ||
        s.includes("issue") ||
        s.includes("problem") ||
        s.includes("not working") ||
        s.includes("broken") ||
        s.includes("missing") ||
        s.includes("stuck") ||
        s.includes("unable") ||
        s.includes("fails") ||
        s.includes("error");

      const isWin =
        s.includes("win") ||
        s.includes("success") ||
        s.includes("completed") ||
        s.includes("resolved") ||
        s.includes("working") ||
        s.includes("live") ||
        s.includes("configured") ||
        s.includes("trained") ||
        s.includes("implemented") ||
        s.includes("good");

      if (isNext) next.push(l);
      else if (isRisk) risks.push(l);
      else if (isWin) wins.push(l);
      else {
        // neutral: push to wins if it reads positive, else risks if it reads negative, else ignore
        if (/(good|great|done|completed|working|resolved)/i.test(l)) wins.push(l);
        else if (/(issue|problem|not|missing|broken|error|fail)/i.test(l)) risks.push(l);
      }
    });

    // Sort by usefulness
    const byScore = (a, b) => scoreLine(b) - scoreLine(a);

    return {
      wins: wins.sort(byScore),
      risks: risks.sort(byScore),
      next: next.sort(byScore),
    };
  };

  const buildOutput = ({ outcome, wins, risks, nextSteps, context }) => {
    const fmt = (title, items) =>
      `${title}\n` + (items.length ? items.map((x) => `• ${x}`).join("\n") : "• (None captured)");

    const parts = [];
    if (context) parts.push(context);
    parts.push(`Overall training outcome: ${outcome || "Select outcome"}`);
    parts.push("");
    parts.push(fmt("Key wins", wins));
    parts.push("");
    parts.push(fmt("Key risks or concerns", risks));
    parts.push("");
    parts.push(fmt("Recommended next steps", nextSteps));
    return parts.join("\n");
  };

  const generate = () => {
    const outcomeSel = document.getElementById("overallTrainingOutcome");
    const outcome = outcomeSel ? outcomeSel.value : "";

    const notes = collectAllNotesText();
    const context = collectKeyContext();

    const candidates = extractCandidates(notes);
    const { wins, risks, next } = classify(candidates);

    // If the notes are thin, give default scaffolding
    const topWins = takeTop(wins, 6);
    const topRisks = takeTop(risks, 6);
    const topNext = takeTop(next, 6);

    return {
      outcome,
      wins: topWins,
      risks: topRisks,
      nextSteps: topNext.length
        ? topNext
        : takeTop(
            [
              "Confirm remaining open items and assign owners (Advisor / Parts / Tech / Manager).",
              "Verify DMS integration items and retest affected workflows.",
              "Schedule a follow-up check-in to confirm adoption and resolve blockers.",
            ],
            6
          ),
      context,
    };
  };

  const fill = (data) => {
    const winsTa = document.getElementById("execKeyWins");
    const risksTa = document.getElementById("execKeyRisks");
    const nextTa = document.getElementById("execNextSteps");
    const out = document.getElementById("execSummaryOutput");

    const toText = (arr) => (arr || []).map((x) => `• ${x}`).join("\n");

    if (winsTa) winsTa.value = toText(data.wins);
    if (risksTa) risksTa.value = toText(data.risks);
    if (nextTa) nextTa.value = toText(data.nextSteps);

    const formatted = buildOutput({
      outcome: data.outcome,
      wins: data.wins,
      risks: data.risks,
      nextSteps: data.nextSteps,
      context: data.context,
    });

    if (out) out.textContent = formatted;

    // Persist with your existing save system if present
    try {
      if (winsTa) { ensureId(winsTa); saveField(winsTa); }
      if (risksTa) { ensureId(risksTa); saveField(risksTa); }
      if (nextTa) { ensureId(nextTa); saveField(nextTa); }
      const sel = document.getElementById("overallTrainingOutcome");
      if (sel) { ensureId(sel); saveField(sel); }
    } catch {}
  };

  const copy = () => {
    const out = document.getElementById("execSummaryOutput");
    const txt = out ? out.textContent : "";
    if (!txt) return;

    navigator.clipboard?.writeText(txt).then(
      () => mkPopup?.ok?.("Executive Summary copied to clipboard.", { title: "Copied" }),
      () => mkPopup?.ok?.("Could not copy automatically. Please copy manually.", { title: "Copy failed" })
    );
  };

  const bind = () => {
    const genBtn = document.getElementById("generateExecSummaryBtn");
    const copyBtn = document.getElementById("copyExecSummaryBtn");

    if (genBtn) {
      genBtn.addEventListener("click", () => {
        const data = generate();
        fill(data);
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", () => copy());
    }
  };

  return { bind };
})();

// Call this inside your init() after DOM is ready:
try { ExecSummary.bind(); } catch {}
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

    clone
      .querySelectorAll("[data-add-poc], .additional-poc-add, .poc-add-btn")
      .forEach((btn) => btn.remove());

    const row = clone.querySelector(".checklist-row.integrated-plus");
    if (row) row.classList.remove("integrated-plus");

    const ip = clone.querySelector(".input-plus");
    if (ip) ip.classList.add("mk-solo-input");

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
    const table =
      footer?.closest(".section")?.querySelector("table.training-table") ||
      footer?.closest(".section-block")?.querySelector("table.training-table") ||
      footer?.parentElement?.querySelector("table.training-table") ||
      footer?.closest(".table-container")?.querySelector("table.training-table") ||
      footer?.closest("table.training-table");
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

  /* =========================================================
     Service Advisors — ensure 3 starter rows (ONLY there)
     - Looks for section id containing "service" + "advisor"
     - Adds starter rows ONLY if fewer than 3 non-cloned rows exist
  ========================================================= */
  function seedServiceAdvisorsStarterRowsToThree() {
    const sections = $$(".page-section").filter((s) => {
      const id = (s.id || "").toLowerCase();
      return id.includes("service") && id.includes("advisor");
    });

    sections.forEach((sec) => {
      $$("table.training-table", sec).forEach((table) => {
        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        const allRows = Array.from(tbody.querySelectorAll("tr"));
        const starterRows = allRows.filter(
          (tr) => tr.getAttribute(AUTO_ROW_ATTR) !== "cloned"
        );

        if (starterRows.length >= 3) return;

        const baseRow =
          tbody.querySelector('tr[data-base="true"]') ||
          starterRows[0];

        if (!baseRow) return;

        const needed = 3 - starterRows.length;

        for (let i = 0; i < needed; i++) {
          const clone = baseRow.cloneNode(true);

          // starter row (NOT "added row")
          clone.removeAttribute(AUTO_ROW_ATTR);
          clone.removeAttribute("data-base");

          // clear inputs
          clone.querySelectorAll("input, select, textarea").forEach((el) => {
            if (el.type === "checkbox" || el.type === "radio") el.checked = false;
            else el.value = "";
          });

          tbody.appendChild(clone);
        }
      });
    });
  }

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
     EXPAND BUTTONS (TABLES + NOTES) — FIXED CATCH-ALL
========================================================= */

  const ensureExpandStyles = (() => {
    const STYLE_ID = "mk-expand-style-v3";
    return () => {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        .mk-table-expand-btn,
        .mk-ta-expand{
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

  const openModalWithNodes = (nodes, titleText) => {
    const modal = $("#mkTableModal");
    if (!modal) {
      mkPopup.ok(
        "Your expand buttons need the #mkTableModal HTML block on the page. Add it near the bottom of your HTML (before </body>).",
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
    try { panel.scrollTop = 0; } catch {}
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

  const getExpandBundleNodes = (anyInside) => {
    const footer = anyInside?.closest?.(".table-footer");
    const sectionCard =
      footer?.closest(".section") ||
      footer?.closest(".section-block") ||
      footer?.parentElement ||
      anyInside?.closest?.(".section-block") ||
      anyInside?.closest?.(".page-section") ||
      document.body;

    const tableBlock =
      footer?.closest(".section-block") ||
      footer?.closest(".section") ||
      null;

    const nodes = [];
    if (tableBlock) nodes.push(tableBlock);

    const targets = new Set();
    $$("[data-notes-target]", sectionCard).forEach((btn) => {
      const id = btn.getAttribute("data-notes-target");
      if (id) targets.add(id);
    });
    targets.forEach((id) => {
      const block = document.getElementById(id);
      if (block) nodes.push(block);
    });

    if (!nodes.length) nodes.push(sectionCard);

    const uniq = [];
    const seen = new Set();
    nodes.forEach((n) => {
      if (!n || seen.has(n)) return;
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

  const openTableModalFor = (anyInside) => {
    const bundle = getExpandBundleNodes(anyInside);
    const header =
      bundle[0].querySelector?.(".section-header") ||
      bundle[0].querySelector?.("h2");
    const title = (header?.textContent || "Expanded View").trim();
    openModalWithNodes(bundle, title);
  };

  const openNotesModalFor = (notesHostEl) => {
    if (!notesHostEl) return;
    const h =
      notesHostEl.querySelector("h2") ||
      notesHostEl.querySelector(".section-header") ||
      null;
    const title = (h?.textContent || "Notes").trim();
    openModalWithNodes([notesHostEl], title);
  };

  // TABLE: add ⤢ to EVERY footer
  const ensureTableExpandButtons = () => {
    ensureExpandStyles();
    document.querySelectorAll(".table-footer").forEach((footer) => {
      if (footer.querySelector(".mk-table-expand-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-table-expand-btn";
      btn.setAttribute("data-mk-table-expand", "1");
      btn.title = "Expand";
      btn.textContent = "⤢";

      footer.appendChild(btn);
    });
  };

  /* =========================================================
     NOTES EXPAND RULES (IMPORTANT)
     - Add ⤢ to notes textareas across cards
     - BUT: DO NOT add expand in Support Tickets section
       (your “Short Summary of the Issue” request)
     - Also allows opt-out with:
       - textarea[data-no-expand="true"] or .no-expand
  ========================================================= */
  const shouldSkipNotesExpand = (ta) => {
    if (!ta || !ta.closest) return true;
    if (ta.closest("table")) return true;                 // never inside table cells
    if (ta.closest("#support-tickets")) return true;      // ✅ no expand in support tickets
    if (ta.matches("[data-no-expand='true'], .no-expand")) return true;
    return false;
  };

  const ensureNotesExpandButtons = () => {
    ensureExpandStyles();

    const textareas = Array.from(document.querySelectorAll(".section-block textarea"));
    textareas.forEach((ta) => {
      if (shouldSkipNotesExpand(ta)) return;

      let wrap = ta.closest(".mk-ta-wrap");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "mk-ta-wrap";
        ta.parentNode.insertBefore(wrap, ta);
        wrap.appendChild(ta);
      }

      if (wrap.querySelector(".mk-ta-expand")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mk-ta-expand";
      btn.setAttribute("data-mk-notes-expand", "1");
      btn.title = "Expand Notes";
      btn.textContent = "⤢";

      const hostId = ta.closest("[id]")?.id || "";
      if (hostId) btn.setAttribute("data-notes-id", hostId);

      wrap.appendChild(btn);
    });
  };

  /* =========================================================
     STACKED NOTES: force taller (2x)
     - Applies to notes-style textareas that are NOT in two-col grids
     - Doesn’t affect table cells or support tickets
  ========================================================= */
  const enforceStackedNotesTall = () => {
    const tas = $$(".section-block textarea").filter((ta) => !shouldSkipNotesExpand(ta));
    tas.forEach((ta) => {
      const card = ta.closest(".section-block");
      if (!card) return;

      const isTwoCol = !!card.closest(".cards-grid.two-col, .two-col-grid, .grid-2");
      if (isTwoCol) return; // user asked "stacked notes" to be taller

      // Force a taller minimum height (2x typical)
      // (If your CSS sets min-height already, this guarantees it)
      ta.style.minHeight = "380px";
    });
  };

  // Observer re-inject for nav swaps + clones
  const startExpandObserver = () => {
    const obs = new MutationObserver(() => {
      ensureTableExpandButtons();
      ensureNotesExpandButtons();
      enforceStackedNotesTall();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      ensureTableExpandButtons();
      ensureNotesExpandButtons();
      enforceStackedNotesTall();
    }, 250);
    setTimeout(() => {
      ensureTableExpandButtons();
      ensureNotesExpandButtons();
      enforceStackedNotesTall();
    }, 900);
  };

  /* =======================
     TRAINING END DATE AUTO (Onsite + 2 days)
  ======================= */
function autoSetTrainingEndDate() {
  const onsiteInput =
    document.getElementById("onsiteTrainingDate") ||
    document.getElementById("onsiteDate") ||
    document.querySelector('input[type="date"][name*="onsite" i]') ||
    document.querySelector('input[type="date"][id*="onsite" i]');

  const endInput =
    document.getElementById("trainingEndDate") ||
    document.getElementById("endDate") ||
    document.querySelector('input[type="date"][name*="end" i]') ||
    document.querySelector('input[type="date"][id*="end" i]');

  if (!onsiteInput || !endInput) return;

  const computePlusDays = (yyyyMMdd, days) => {
    const d = new Date(yyyyMMdd);
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // If user manually edits End Date, stop auto-overwriting
  const markManual = () => endInput.dataset.mkManual = "true";
  endInput.addEventListener("input", markManual);
  endInput.addEventListener("change", markManual);

  const applyAutoEnd = () => {
    if (!onsiteInput.value) return;

    const autoVal = computePlusDays(onsiteInput.value, 3);
    if (!autoVal) return;

    const isManual = endInput.dataset.mkManual === "true";

    // Set if empty OR if user hasn't manually overridden it
    if (!endInput.value || !isManual) {
      endInput.value = autoVal;
      endInput.dispatchEvent(new Event("input", { bubbles: true }));
      endInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  // Run when onsite changes
  onsiteInput.addEventListener("input", applyAutoEnd);
  onsiteInput.addEventListener("change", applyAutoEnd);

  // Backfill on load (if onsite already has a value)
  setTimeout(applyAutoEnd, 0);
}
   
  /* =======================
     EVENT DELEGATION
  ======================= */
  document.addEventListener("click", (e) => {
    const t = e.target;

    const navBtn = t.closest(".nav-btn[data-target]");
    if (navBtn) {
      e.preventDefault();
      setActiveSection(navBtn.getAttribute("data-target"));
      setTimeout(() => {
        ensureTableExpandButtons();
        ensureNotesExpandButtons();
        enforceStackedNotesTall();
      }, 0);
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
    const tableExpandBtn = t.closest(".mk-table-expand-btn");
    if (tableExpandBtn) {
      e.preventDefault();
      openTableModalFor(tableExpandBtn);
      return;
    }

    // NOTES EXPAND
    const notesExpandBtn = t.closest(".mk-ta-expand");
    if (notesExpandBtn) {
      e.preventDefault();
      const id = notesExpandBtn.getAttribute("data-notes-id");
      const block = id ? document.getElementById(id) : null;
      if (block) openNotesModalFor(block);
      else openModalWithNodes([notesExpandBtn.closest(".section-block")], "Notes");
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

    // ✅ Service Advisors should show 3 starter rows (not 1)
    seedServiceAdvisorsStarterRowsToThree();

    // ✅ Training End Date = Onsite + 2 days
    autoSetTrainingEndDate();

    restoreAllFields();

    setGhostStyles(document);
    syncDealershipName();

    // ✅ Expand buttons + stacked notes height enforcement
    ensureTableExpandButtons();
    ensureNotesExpandButtons();
    enforceStackedNotesTall();
    startExpandObserver();

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
