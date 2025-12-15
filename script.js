/* =========================================================
   myKaarma Interactive Training Checklist — script.js
   FULL / SAFE / FINAL
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
   Ghost / placeholder selects & dates
--------------------------- */
function refreshGhostSelects(root = document){
  qsa("select", root).forEach(sel => {
    const opt = sel.options[sel.selectedIndex];
    const ghost = !sel.value && opt?.dataset?.ghost === "true";
    sel.classList.toggle("is-placeholder", ghost);
  });
}

function refreshDateGhost(root = document){
  qsa("input[type='date']", root).forEach(inp => {
    inp.classList.toggle("is-placeholder", !inp.value);
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
   Navigation
--------------------------- */
function setActivePage(id){
  const target = document.getElementById(id);
  if (!target) return;

  qsa(".page-section").forEach(p => p.classList.remove("active"));
  target.classList.add("active");

  qsa(".nav-btn").forEach(b => b.classList.remove("active"));
  qs(`.nav-btn[data-target="${id}"]`)?.classList.add("active");

  try{ history.replaceState(null, "", "#" + id); } catch {}
}

function initNavigation(){
  qs("#sidebar-nav")?.addEventListener("click", e => {
    const btn = e.target.closest(".nav-btn[data-target]");
    if (!btn) return;
    e.preventDefault();
    setActivePage(btn.dataset.target);
  });

  const hash = location.hash.replace("#","");
  if (hash && document.getElementById(hash)) setActivePage(hash);
  else qs(".nav-btn")?.click();
}

/* ---------------------------
   Integrated rows
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
  if (!row) return;

  const clone = row.cloneNode(true);
  resetClonedFields(clone);
  clone.querySelector(".add-row")?.remove();
  row.after(clone);
}

/* ---------------------------
   Additional Trainers
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
   Training Dates
--------------------------- */
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
    if (!start.value || end.dataset.userEdited) return;
    const d = new Date(start.value);
    d.setDate(d.getDate() + 2);
    end.value = d.toISOString().split("T")[0];
    saveField(end);
    refreshDateGhost();
  });
}

/* ---------------------------
   Support Tickets
--------------------------- */
function lockOnlyBaseTicketStatus(){
  qsa("#support-tickets .ticket-group").forEach(card => {
    const sel = qs(".ticket-status-select", card);
    if (!sel) return;

    if (card.dataset.base === "true"){
      sel.value = "Open";
      sel.disabled = true;
      sel.classList.add("is-locked");
    } else {
      sel.disabled = false;
      sel.classList.remove("is-locked");
    }
  });
}

function moveTicketCardToStatus(card, status){
  const map = {
    "Open":"#openTicketsContainer",
    "Tier 2":"#tierTwoTicketsContainer",
    "Closed - Resolved":"#closedResolvedTicketsContainer",
    "Closed - Feature":"#closedFeatureTicketsContainer"
  };
  qs(map[status])?.appendChild(card);
}

function addTicketBadge(card){
  const badge = document.createElement("div");
  badge.className = "ticket-count-badge";
  badge.textContent = qsa(".ticket-group:not([data-base='true'])").length;
  card.prepend(badge);
  card.classList.add("has-badge");
}

function showTicketWarnings(base){
  qsa(".field-warning", base).forEach(w => w.remove());
  qsa(".field-error", base).forEach(f => f.classList.remove("field-error"));

  let valid = true;

  qsa("input, textarea", base).forEach(f => {
    if (!f.value){
      valid = false;
      f.classList.add("field-error");
      const warn = document.createElement("div");
      warn.className = "field-warning";
      warn.textContent = "Required";
      f.closest(".ticket-row")?.append(warn);
    }
  });

  return valid;
}

function handleAddTicket(btn){
  const base = btn.closest(".ticket-group[data-base='true']");
  if (!base) return;

  if (!showTicketWarnings(base)) return;

  const clone = base.cloneNode(true);
  clone.removeAttribute("data-base");
  clone.querySelector(".add-ticket-btn")?.remove();
  clone.querySelector(".ticket-disclaimer")?.remove();

  qs(".ticket-status-select", clone).disabled = false;
  addTicketBadge(clone);

  qs("#openTicketsContainer")?.appendChild(clone);
  qsa("input, textarea", base).forEach(f => f.value = "");
}

/* ---------------------------
   Google Maps
--------------------------- */
function initAddressAutocomplete(){
  const input = qs("#dealershipAddressInput");
  if (!input || !window.google?.maps?.places) return;

  const ac = new google.maps.places.Autocomplete(input,{types:["address"]});
  ac.addListener("place_changed",()=>{
    const p = ac.getPlace();
    if (!p?.formatted_address) return;
    input.value = p.formatted_address;
    saveField(input);
    updateDealershipMap(p.formatted_address);
  });
}
window.initAddressAutocomplete = initAddressAutocomplete;

function updateDealershipMap(addr){
  const f = qs("#dealershipMapFrame");
  if (f) f.src = "https://www.google.com/maps?q="+encodeURIComponent(addr)+"&output=embed";
}

/* ---------------------------
   DOM READY
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  loadAll();
  initTrainingDates();
  lockOnlyBaseTicketStatus();

  document.addEventListener("input", e => {
    if (!isField(e.target)) return;
    saveField(e.target);
    refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost();
  });

  document.addEventListener("change", e => {
    if (!isField(e.target)) return;
    saveField(e.target);
    refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost();

    const sel = e.target.closest(".ticket-status-select");
    if (sel){
      const card = sel.closest(".ticket-group");
      if (card?.dataset.base !== "true") moveTicketCardToStatus(card, sel.value);
    }
  });

  document.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.id === "clearAllBtn") localStorage.clear();

    if (btn.classList.contains("clear-page-btn"))
      clearSection(btn.closest(".page-section"));

    if (btn.classList.contains("add-row")){
      const table = btn.closest(".table-container")?.querySelector("tbody");
      if (table){
        const clone = table.lastElementChild.cloneNode(true);
        resetClonedFields(clone);
        table.appendChild(clone);
      } else if (btn.closest("#trainers-deployment")){
        handleTrainerAdd(btn);
      } else cloneIntegratedRow(btn);
    }

    if (btn.classList.contains("add-ticket-btn")) handleAddTicket(btn);
  });
});
