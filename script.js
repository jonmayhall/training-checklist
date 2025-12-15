/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   GLOBAL + SAFE FOR ALL PAGES
   ========================================================= */

function bindNavigation() {
  const sections = Array.from(document.querySelectorAll(".page-section"));
  const navButtons = Array.from(document.querySelectorAll(".nav-btn"));

  function showSection(id) {
    const target = document.getElementById(id);
    if (!target) {
      console.warn("No section found for id:", id);
      return;
    }

    sections.forEach(s => s.classList.remove("active"));
    target.classList.add("active");

    navButtons.forEach(b => b.classList.remove("active"));
    const activeBtn = navButtons.find(b => b.dataset.target === id);
    if (activeBtn) activeBtn.classList.add("active");
  }

  // Bind buttons that use data-target
  navButtons.forEach(btn => {
    btn.type = "button"; // prevents form-submit issues
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.target;
      if (id) showSection(id);
    });
  });

  // Ensure something shows on load
  const alreadyActive = document.querySelector(".page-section.active");
  if (!alreadyActive && sections[0]) {
    sections[0].classList.add("active");
  }

  // Optional: if you want first nav button to match on load
  const activeSection = document.querySelector(".page-section.active");
  if (activeSection) {
    navButtons.forEach(b => b.classList.toggle("active", b.dataset.target === activeSection.id));
  }
}

document.addEventListener("DOMContentLoaded", bindNavigation);

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
}

/* ---------------------------
   Navigation (CRITICAL)
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
}

/* ---------------------------
   Integrated "+" rows (non-table)
--------------------------- */
function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row");
  if (!row) return;

  const clone = row.cloneNode(true);
  clone.querySelector("input")?.value = "";

  const plus = clone.querySelector(".add-row");
  if (plus) plus.remove();

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
  clone.querySelector("input").value = "";
  clone.querySelector(".add-row")?.remove();

  container.appendChild(clone);
}

/* ---------------------------
   Onsite Training Dates (PAGE 2)
--------------------------- */
function initTrainingDates(){
  const start = qs("#onsiteStartDate");
  const end = qs("#onsiteEndDate");

  if (!start || !end) return;

  start.addEventListener("change", () => {
    if (!start.value) return;

    const d = new Date(start.value);
    d.setDate(d.getDate() + 2);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    end.value = `${yyyy}-${mm}-${dd}`;
    saveField(end);
  });
}

/* ---------------------------
   Support Tickets (SAFE + COMPLETE)
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

function handleAddTicket(btn){
  const base = btn.closest(".ticket-group[data-base='true']");
  if (!base) return;

  const num = qs(".ticket-number-input", base);
  const link = qs(".ticket-zendesk-input", base);
  const sum = qs(".ticket-summary-input", base);

  if (!num.value || !link.value || !sum.value) return;

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
   Google Maps (safe)
--------------------------- */
function initAddressAutocomplete(){
  const input = qs(".address-input");
  if (!input || !window.google) return;

  const ac = new google.maps.places.Autocomplete(input, {
    types:["address"]
  });

  ac.addListener("place_changed", () => {});
}
window.initAddressAutocomplete = initAddressAutocomplete;

/* ---------------------------
   DOM READY
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();

  /* autosave */
  document.addEventListener("input", e => {
    if (!isField(e.target)) return;
    saveField(e.target);
    if (e.target.tagName === "SELECT") refreshGhostSelects();
  });

  /* change handlers */
  document.addEventListener("change", e => {
    if (!isField(e.target)) return;
    saveField(e.target);
    if (e.target.tagName === "SELECT") refreshGhostSelects();
  });

  /* clicks */
  document.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.classList.contains("add-row")){
      cloneIntegratedRow(btn);
      return;
    }

    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }
  });

  /* reset page */
  qsa(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = btn.closest(".page-section");
      if (sec) clearSection(sec);
    });
  });

  /* clear all */
  qs("#clearAllBtn")?.addEventListener("click", clearAll);

  /* nav */
  qsa(".nav-btn[data-target]").forEach(btn => {
    btn.addEventListener("click", () => setActivePage(btn.dataset.target));
  });

  initTrainingDates();
  refreshGhostSelects();
});
