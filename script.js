/* =========================================================
   myKaarma Interactive Training Checklist — script.js (FULL)
   GLOBAL + SAFE FOR ALL PAGES
   ========================================================= */

/* ---------------------------
   Helpers
--------------------------- */
function qs(sel, root = document){ return root.querySelector(sel); }
function qsa(sel, root = document){ return Array.from(root.querySelectorAll(sel)); }

function isField(el){
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

/* ---------------------------
   Ghost / placeholder selects
--------------------------- */
function refreshGhostSelects(root = document){
  qsa("select", root).forEach(sel => {
    const opt = sel.options[sel.selectedIndex];
    const ghost = !sel.value && opt?.dataset?.ghost === "true";
    sel.classList.toggle("is-placeholder", ghost);
  });
}

/* ---------------------------
   Date placeholder styling helper (optional)
   NOTE: input[type="date"] doesn't support true placeholder text,
   but this lets you style empty dates if you add CSS for .is-placeholder
--------------------------- */
function refreshDateGhost(root = document){
  qsa('input[type="date"]', root).forEach(inp => {
    const ghost = !inp.value;
    inp.classList.toggle("is-placeholder", ghost);
  });
}

/* ---------------------------
   Autosave (localStorage)
--------------------------- */
const STORAGE_KEY = "myKaarmaChecklist:v1";

function getKey(el){
  if (el.id) return "id:" + el.id;
  if (el.name) return "name:" + el.name;
  return null;
}

function saveField(el){
  const k = getKey(el);
  if (!k) return;

  let data = {};
  try{ data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch{ data = {}; }

  data[k] = el.type === "checkbox" ? el.checked : el.value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadAll(){
  let data = {};
  try{ data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch{ data = {}; }

  qsa("input, textarea, select").forEach(el => {
    const k = getKey(el);
    if (!k || data[k] === undefined) return;

    if (el.type === "checkbox") el.checked = data[k];
    else el.value = data[k];
  });

  refreshGhostSelects();
  refreshDateGhost();
}

/* ---------------------------
   Clear / Reset
--------------------------- */
function clearSection(section){
  qsa("input, textarea, select", section).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    saveField(el);
  });
  refreshGhostSelects(section);
  refreshDateGhost(section);
}

function clearAll(){
  localStorage.removeItem(STORAGE_KEY);
  qsa(".page-section").forEach(sec => {
    qsa("input, textarea, select", sec).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });
  });
  refreshGhostSelects();
  refreshDateGhost();
}

/* ---------------------------
   Navigation (single source of truth)
--------------------------- */
function setActivePage(id){
  const target = document.getElementById(id);
  if (!target){
    console.warn("Page not found:", id);
    return;
  }

  qsa(".page-section").forEach(p => p.classList.remove("active"));
  target.classList.add("active");

  qsa(".nav-btn").forEach(b => b.classList.remove("active"));
  qs(`.nav-btn[data-target="${id}"]`)?.classList.add("active");

  try{ history.replaceState(null, "", "#" + id); } catch {}
}

function initNavigation(){
  const nav = qs("#sidebar-nav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn[data-target]");
    if (!btn) return;
    e.preventDefault();
    setActivePage(btn.dataset.target);
  });

  const hashId = (location.hash || "").replace("#","");
  if (hashId && document.getElementById(hashId)){
    setActivePage(hashId);
    return;
  }

  const alreadyActive = qs(".page-section.active");
  if (alreadyActive){
    setActivePage(alreadyActive.id);
    return;
  }

  const firstBtn = qs(".nav-btn[data-target]");
  if (firstBtn?.dataset?.target){
    setActivePage(firstBtn.dataset.target);
  }
}

/* ---------------------------
   Integrated "+" rows (non-table)
--------------------------- */
function resetClonedFields(clone){
  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });
  refreshGhostSelects(clone);
  refreshDateGhost(clone);
}

function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row");
  if (!row || !row.parentElement) return;

  const clone = row.cloneNode(true);
  resetClonedFields(clone);
  clone.querySelector(".add-row")?.remove();

  row.parentElement.insertBefore(clone, row.nextSibling);
}

/* ---------------------------
   Trainers – Additional Trainers
--------------------------- */
function handleTrainerAdd(btn){
  const row = btn.closest(".checklist-row");
  const container = qs("#additionalTrainersContainer");
  if (!row || !container) return;

  const clone = row.cloneNode(true);
  resetClonedFields(clone);
  clone.querySelector(".add-row")?.remove();

  container.appendChild(clone);
}

/* ---------------------------
   Onsite Training Dates
--------------------------- */
function addDaysISO(iso, days){
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function initTrainingDates(){
  const start = qs("#onsiteStartDate");
  const end = qs("#onsiteEndDate");
  if (!start || !end) return;

  end.addEventListener("input", () => {
    end.dataset.userEdited = "1";
    saveField(end);
    refreshDateGhost();
  });

  start.addEventListener("input", () => {
    if (!start.value || end.dataset.userEdited === "1"){
      refreshDateGhost();
      return;
    }
    end.value = addDaysISO(start.value, 2);
    saveField(end);
    refreshDateGhost();
  });

  // set initial ghost state
  refreshDateGhost();
}

/* ---------------------------
   Support Tickets
--------------------------- */
let ticketCount = 0;

function addTicketBadge(card){
  ticketCount++;
  const badge = document.createElement("div");
  badge.className = "ticket-count-badge";
  badge.textContent = ticketCount;
  card.prepend(badge);
  card.classList.add("has-badge");
}

/* ✅ NEW: Warning helpers */
function setTicketWarning(fieldEl, msg){
  const row = fieldEl.closest(".ticket-row");
  if (!row) return;

  // remove existing warning in this row
  row.querySelectorAll(".field-warning").forEach(n => n.remove());

  const p = document.createElement("p");
  p.className = "field-warning";
  p.textContent = msg;

  row.appendChild(p);
}

function clearTicketWarnings(card){
  card.querySelectorAll(".field-warning").forEach(n => n.remove());
  card.querySelectorAll(".field-error").forEach(n => n.classList.remove("field-error"));
}

/* ✅ REPLACED: handleAddTicket with per-field red warnings */
function handleAddTicket(btn){
  const base = btn.closest(".ticket-group[data-base='true']");
  if (!base) return;

  const num = qs(".ticket-number-input", base);
  const link = qs(".ticket-zendesk-input", base);
  const sum = qs(".ticket-summary-input", base);

  clearTicketWarnings(base);

  let ok = true;

  if (!num.value.trim()){
    num.classList.add("field-error");
    setTicketWarning(num, "Ticket Number is required.");
    ok = false;
  }

  if (!link.value.trim()){
    link.classList.add("field-error");
    setTicketWarning(link, "Zendesk URL is required.");
    ok = false;
  }

  if (!sum.value.trim()){
    sum.classList.add("field-error");
    setTicketWarning(sum, "Short summary is required.");
    ok = false;
  }

  if (!ok) return;

  // clone AFTER validation passes
  const clone = base.cloneNode(true);
  clone.removeAttribute("data-base");

  clone.querySelector(".add-ticket-btn")?.remove();
  clone.querySelector(".ticket-disclaimer")?.remove();

  addTicketBadge(clone);
  qs("#openTicketsContainer")?.appendChild(clone);

  num.value = "";
  link.value = "";
  sum.value = "";
}

/* ---------------------------
   Support Ticket Status Move (optional — requires moveTicketCardToStatus)
   If you already have a moveTicketCardToStatus implementation, keep it.
--------------------------- */
function moveTicketCardToStatus(card, status){
  const map = {
    "Open": "#openTicketsContainer",
    "Tier Two": "#tierTwoTicketsContainer",
    "Closed - Resolved": "#closedResolvedTicketsContainer",
    "Closed - Feature Not Supported": "#closedFeatureTicketsContainer"
  };
  const targetSel = map[status];
  const target = targetSel ? qs(targetSel) : null;
  if (!target) return;

  target.appendChild(card);
}

/* ---------------------------
   Google Maps (Autocomplete + Map Preview)
--------------------------- */
function initAddressAutocomplete(){
  const input = qs("#dealershipAddressInput");
  if (!input || !window.google?.maps?.places) return;

  const ac = new google.maps.places.Autocomplete(input, { types:["address"] });

  ac.addListener("place_changed", () => {
    const place = ac.getPlace();
    if (!place?.formatted_address) return;

    input.value = place.formatted_address;
    saveField(input);
    updateDealershipMap(place.formatted_address);
  });
}
window.initAddressAutocomplete = initAddressAutocomplete;

function updateDealershipMap(address){
  const frame = qs("#dealershipMapFrame");
  if (!frame) return;

  frame.src =
    "https://www.google.com/maps?q=" +
    encodeURIComponent(address) +
    "&output=embed";
}

/* ---------------------------
   DOM READY
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  try{
    initNavigation();
    loadAll();
    initTrainingDates();
    refreshGhostSelects();
    refreshDateGhost();
  } catch (err){
    console.error("Init error:", err);
  }

  // autosave on input/change
  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost();
  });

  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost();

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

    // "+" buttons (integrated rows and tables)
    if (btn.classList.contains("add-row")){
      // table add-row
      const table = btn.closest(".table-container")?.querySelector("table");
      if (table && table.tBodies?.[0]){
        const tbody = table.tBodies[0];
        const last = tbody.rows[tbody.rows.length - 1];
        if (!last) return;

        const clone = last.cloneNode(true);

        // clear fields in cloned table row
        qsa("input, select, textarea", clone).forEach(el => {
          if (el.type === "checkbox") el.checked = false;
          else if (el.tagName === "SELECT") el.selectedIndex = 0;
          else el.value = "";
        });

        tbody.appendChild(clone);
        refreshGhostSelects(clone);
        refreshDateGhost(clone);
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
  });
});
