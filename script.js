/* ===========================================================
   myKaarma Interactive Training Checklist — script.js
   Includes: autosave/load, navigation, ghost selects/dates,
   support tickets, integrated + rows, map, and:
   ✅ Stacked Cards Compact Toggle (SAFE)
   =========================================================== */

/* ---------------------------
   Helpers
--------------------------- */
const qs  = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function isField(el){
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA"
  );
}

function fieldKey(el){
  // stable-ish key: prefer id, else name, else data-key, else fallback to DOM path
  if (el.id) return `id:${el.id}`;
  if (el.name) return `name:${el.name}`;
  if (el.dataset && el.dataset.key) return `data:${el.dataset.key}`;

  // fallback: index within page
  const sec = el.closest(".page-section");
  const secId = sec?.id || "unknown";
  const all = qsa("input,select,textarea", sec || document);
  const idx = all.indexOf(el);
  return `sec:${secId}:idx:${idx}`;
}

function saveField(el){
  try{
    const key = fieldKey(el);
    let val;

    if (el.type === "checkbox") val = el.checked ? "1" : "0";
    else val = el.value ?? "";

    localStorage.setItem(`mk:${key}`, val);
  }catch(e){}
}

function loadField(el){
  try{
    const key = fieldKey(el);
    const saved = localStorage.getItem(`mk:${key}`);
    if (saved == null) return;

    if (el.type === "checkbox") el.checked = saved === "1";
    else el.value = saved;
  }catch(e){}
}

function loadAll(root=document){
  qsa("input,select,textarea", root).forEach(loadField);
}

/* ---------------------------
   Navigation
--------------------------- */
function initNavigation(){
  const btns = qsa(".nav-btn");
  const sections = qsa(".page-section");

  function show(id){
    sections.forEach(s => s.classList.toggle("active", s.id === id));
    btns.forEach(b => b.classList.toggle("active", b.dataset.target === id));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  btns.forEach(b => {
    b.addEventListener("click", () => show(b.dataset.target));
  });

  // default first section
  const first = btns[0]?.dataset?.target || sections[0]?.id;
  if (first) show(first);
}

/* ---------------------------
   Ghost Selects
--------------------------- */
function refreshGhostSelects(root=document){
  qsa("select", root).forEach(sel => {
    const opt = sel.options?.[sel.selectedIndex];
    const isGhost = opt && opt.dataset && opt.dataset.ghost === "true";
    sel.classList.toggle("is-placeholder", !!isGhost);
  });
}

/* ---------------------------
   Ghost Dates
--------------------------- */
function refreshDateGhost(root=document){
  const scope = root?.querySelectorAll ? root : document;
  qsa('input[type="date"]', scope).forEach(inp => {
    const empty = !inp.value;
    inp.classList.toggle("is-placeholder", empty);
  });
}

function initTrainingDates(){
  // if you have special date stack logic elsewhere, keep it there.
  // This just ensures ghost styling is correct on load.
  refreshDateGhost(document);
}

/* ---------------------------
   Clear
--------------------------- */
function clearAll(){
  if (!confirm("Clear all saved fields?")) return;
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("mk:")) localStorage.removeItem(k);
  });
  location.reload();
}

function clearSection(section){
  if (!section) return;
  qsa("input,select,textarea", section).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
    saveField(el);
  });
  refreshGhostSelects(section);
  refreshDateGhost(section);
}

/* ===========================================================
   ✅ STACKED CARDS COMPACT TOGGLE (SAFE)
   - Adds a switch to topbar
   - Adds body class "stacked-compact"
   - Marks ONLY stacked cards with .stacked-card
   =========================================================== */
const STACKED_COMPACT_LS_KEY = "mk:stackedCompact";

function injectCompactToggle(){
  const topbarRight = qs("#topbar .topbar-right");
  if (!topbarRight) return;

  // prevent duplicates
  if (qs("#stackedCompactToggle")) return;

  const wrap = document.createElement("div");
  wrap.className = "compact-toggle";
  wrap.innerHTML = `
    <div class="compact-toggle-label">Compact</div>
    <label class="switch" title="Toggle compact spacing for stacked cards only">
      <input id="stackedCompactToggle" type="checkbox" />
      <span class="slider"></span>
    </label>
  `;

  // put it BEFORE dealership name (feel free to change)
  topbarRight.prepend(wrap);

  const toggle = qs("#stackedCompactToggle");
  const saved = localStorage.getItem(STACKED_COMPACT_LS_KEY);
  const on = saved === "1";

  toggle.checked = on;
  document.body.classList.toggle("stacked-compact", on);

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    document.body.classList.toggle("stacked-compact", enabled);
    localStorage.setItem(STACKED_COMPACT_LS_KEY, enabled ? "1" : "0");
  });
}

function markStackedCards(){
  // remove old tags first
  qsa(".section-block.stacked-card").forEach(c => c.classList.remove("stacked-card"));

  qsa(".section-block").forEach(card => {
    // ❌ Exclusions — NEVER compact these
    if (
      card.closest(".cards-grid") ||
      card.closest(".two-col-grid") ||
      card.closest(".primary-contacts-grid") || // mini cards / POC grid
      card.closest(".table-container") ||
      card.closest(".training-table") ||
      card.closest("#support-tickets") ||
      card.closest("#dms-integration")
    ) return;

    // ✅ Only stacked cards
    card.classList.add("stacked-card");
  });
}

/* ---------------------------
   Integrated “+” row cloning
--------------------------- */
function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row");
  if (!row) return;

  const clone = row.cloneNode(true);
  clone.dataset.clone = "true";

  // remove the + button from cloned rows
  qsa(".add-row, .additional-poc-add, .add-ticket-btn", clone).forEach(b => b.remove());

  // clear fields
  qsa("input,select,textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  row.parentElement.insertBefore(clone, row.nextSibling);

  refreshGhostSelects(clone);
  refreshDateGhost(clone);
  markStackedCards();
}

/* ---------------------------
   Trainers page add (stub)
   If you already have a real version, keep yours.
--------------------------- */
function handleTrainerAdd(btn){
  // If your current project has a dedicated function already,
  // you can replace this with your existing one.
  cloneIntegratedRow(btn);
}

/* ---------------------------
   Additional POC add (stub)
   If you already have a real version, keep yours.
--------------------------- */
function handleAdditionalPOCAdd(btn){
  // Your current project likely clones a whole .mini-card.
  // This is a safe fallback if you don’t:
  const card = btn.closest(".mini-card");
  const grid = btn.closest(".primary-contacts-grid") || card?.parentElement;
  if (!card || !grid) return;

  const clone = card.cloneNode(true);
  clone.dataset.clone = "true";

  // remove + button on clones
  qsa(".additional-poc-add, .add-row", clone).forEach(b => b.remove());

  // clear fields
  qsa("input,select,textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  grid.appendChild(clone);

  refreshGhostSelects(clone);
  refreshDateGhost(clone);
  markStackedCards();
}

/* ---------------------------
   Support Tickets (stubs)
   Keep your existing versions if you already have them.
--------------------------- */
function handleAddTicket(btn){
  const baseCard = btn.closest(".ticket-group");
  if (!baseCard) return;

  // simple validation: require ticket # and URL and summary
  const num = qs(".ticket-number-input", baseCard)?.value?.trim();
  const url = qs(".ticket-zendesk-input", baseCard)?.value?.trim();
  const sum = qs(".ticket-summary-input", baseCard)?.value?.trim();
  if (!num || !url || !sum){
    alert("Complete Ticket Number, URL, and Summary before adding a new ticket.");
    return;
  }

  const clone = baseCard.cloneNode(true);
  clone.dataset.base = "false";
  clone.dataset.clone = "true";

  // remove + button from cloned cards
  qsa(".add-ticket-btn", clone).forEach(b => b.remove());

  // status should be enabled on clones
  const status = qs(".ticket-status-select", clone);
  if (status){
    status.disabled = false;
    status.classList.remove("is-locked");
  }

  // clear base fields for next entry (optional)
  qsa("input,textarea", baseCard).forEach(el => el.value = "");
  refreshGhostSelects(baseCard);
  refreshDateGhost(baseCard);

  // default destination: Open container
  const openWrap = qs("#openTicketsContainer");
  openWrap?.appendChild(clone);

  refreshGhostSelects(clone);
  refreshDateGhost(clone);
}

function moveTicketCardToStatus(card, statusValue){
  const map = {
    "Open": "#openTicketsContainer",
    "Tier Two": "#tierTwoTicketsContainer",
    "Closed - Resolved": "#closedResolvedTicketsContainer",
    "Closed - Feature Not Supported": "#closedFeatureTicketsContainer"
  };
  const targetSel = map[statusValue] || "#openTicketsContainer";
  const target = qs(targetSel);
  if (!target) return;
  target.appendChild(card);
}

/* ---------------------------
   Map (stub)
--------------------------- */
function updateDealershipMap(address){
  // If you already have real map logic, keep it.
  // This stub avoids breaking the click handler.
  console.log("Update map address:", address);
}

/* ===========================================================
   DOM READY
=========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  try{
    initNavigation();
    loadAll();

    // ✅ add switch + mark stacked cards
    injectCompactToggle();
    markStackedCards();

    initTrainingDates();
    refreshGhostSelects();
    refreshDateGhost(); // ✅ make empty dates look like placeholders on load
  } catch (err){
    console.error("Init error:", err);
  }

  // autosave on input/change
  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);
  });

  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);

    // ✅ Support ticket status move (ONLY non-base cards)
    const sel = e.target.closest(".ticket-status-select");
    if (sel){
      const card = sel.closest(".ticket-group");
      if (!card) return;
      if (card.dataset.base === "true") return; // don't move base
      moveTicketCardToStatus(card, sel.value);
      return;
    }
  });

  // clicks
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.id === "clearAllBtn"){
      clearAll();
      return;
    }

    if (btn.classList.contains("clear-page-btn")){
      const sec = btn.closest(".page-section");
      if (sec) clearSection(sec);
      return;
    }

    // ✅ Additional POC: add ENTIRE NEW CARD
    if (btn.classList.contains("additional-poc-add")){
      handleAdditionalPOCAdd(btn);
      return;
    }

    // "+" buttons (integrated rows and tables)
    if (btn.classList.contains("add-row")){
      // ✅ table add-row
      const table = btn.closest(".table-container")?.querySelector("table");
      if (table && table.tBodies?.[0]){
        const tbody = table.tBodies[0];
        const last = tbody.rows[tbody.rows.length - 1];
        if (!last) return;

        const clone = last.cloneNode(true);
        clone.dataset.clone = "true";

        // clear fields in cloned table row
        qsa("input, select, textarea", clone).forEach(el => {
          if (el.type === "checkbox") el.checked = false;
          else if (el.tagName === "SELECT") el.selectedIndex = 0;
          else el.value = "";
        });

        tbody.appendChild(clone);
        refreshGhostSelects(clone);
        refreshDateGhost(clone);
        // DO NOT mark stacked cards for table rows
        return;
      }

      // non-table add-row
      if (btn.closest("#trainers-deployment")){
        handleTrainerAdd(btn);
      } else {
        cloneIntegratedRow(btn);
      }
      return;
    }

    // support tickets "+"
    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }

    // MAP button (forces map refresh from whatever is typed)
    if (btn.id === "showDealershipMapBtn"){
      const input = qs("#dealershipAddressInput");
      if (input?.value) updateDealershipMap(input.value);
      return;
    }
  });
});
