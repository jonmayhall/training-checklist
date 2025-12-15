/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   GLOBAL + SAFE FOR ALL PAGES (single-init, no duplicate nav)
   ========================================================= */

/* ---------------------------
   Helpers
--------------------------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
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
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { data = {}; }

  data[k] = (el.type === "checkbox") ? el.checked : el.value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadAll(){
  let data = {};
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { data = {}; }

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
   Navigation (ONE binding only)
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

function bindNavigation(){
  const navButtons = qsa(".nav-btn[data-target]");
  navButtons.forEach(btn => {
    btn.type = "button";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      setActivePage(btn.dataset.target);
    });
  });

  // Ensure one page is visible on load
  const active = qs(".page-section.active");
  if (active) {
    setActivePage(active.id);
  } else {
    const firstBtn = navButtons[0];
    if (firstBtn?.dataset?.target) setActivePage(firstBtn.dataset.target);
  }
}

/* ---------------------------
   Integrated "+" rows (non-table)
   Default behavior: clone inline and remove +
--------------------------- */
function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row");
  if (!row) return;

  const clone = row.cloneNode(true);

  // clear common fields
  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });

  // remove the + button in clones
  clone.querySelector(".add-row")?.remove();

  row.parentElement.insertBefore(clone, row.nextSibling);

  // keep placeholder styling correct
  refreshGhostSelects(clone);
}

/* ---------------------------
   Trainers – Additional Trainers
   If the + is on the trainers page, append into #additionalTrainersContainer
--------------------------- */
function addAdditionalTrainerRow(btn){
  const row = btn.closest(".checklist-row");
  const page = btn.closest("#trainers-deployment");
  const container = qs("#additionalTrainersContainer");

  if (!row || !page || !container) return false;

  const clone = row.cloneNode(true);

  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });

  clone.querySelector(".add-row")?.remove();
  container.appendChild(clone);

  refreshGhostSelects(clone);
  return true;
}

/* ---------------------------
   Onsite Training Dates (Page 2)
   Normal-looking text boxes (type=text) with placeholder,
   switch to type=date on focus to show calendar.
   End auto-fills +2 days, still editable.
--------------------------- */
function formatYYYYMMDD(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function enableTextToDateBehavior(input){
  if (!input) return;

  // If empty, keep it as text so placeholder shows
  if (!input.value) input.type = "text";

  input.addEventListener("focus", () => {
    input.type = "date";
    // force picker on some browsers
    try { input.showPicker?.(); } catch {}
  });

  input.addEventListener("blur", () => {
    if (!input.value) input.type = "text";
  });
}

function initOnsiteTrainingDates(){
  const start = qs("#onsiteStartDate");
  const end = qs("#onsiteEndDate");

  if (!start || !end) return;

  enableTextToDateBehavior(start);
  enableTextToDateBehavior(end);

  start.addEventListener("change", () => {
    if (!start.value) return;

    const d = new Date(start.value);
    if (isNaN(d.getTime())) return;

    d.setDate(d.getDate() + 2);
    end.type = "date";
    end.value = formatYYYYMMDD(d);

    saveField(end);
    refreshGhostSelects();
  });
}

/* ---------------------------
   Support Tickets (SAFE)
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

  if (!num?.value || !link?.value || !sum?.value) return;

  const clone = base.cloneNode(true);
  clone.removeAttribute("data-base");
  clone.querySelector(".add-ticket-btn")?.remove();
  clone.querySelector(".ticket-disclaimer")?.remove();

  addTicketBadge(clone);

  // Put new tickets into Open by default (same as before)
  qs("#openTicketsContainer")?.appendChild(clone);

  num.value = "";
  link.value = "";
  sum.value = "";
}

/* ---------------------------
   DOM READY (single init)
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();
  bindNavigation();
  initOnsiteTrainingDates();
  refreshGhostSelects();

  // autosave
  document.addEventListener("input", e => {
    if (!isField(e.target)) return;
    saveField(e.target);
    if (e.target.tagName === "SELECT") refreshGhostSelects();
  });

  document.addEventListener("change", e => {
    if (!isField(e.target)) return;
    saveField(e.target);
    if (e.target.tagName === "SELECT") refreshGhostSelects();
  });

  // page reset buttons
  qsa(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = btn.closest(".page-section");
      if (sec) clearSection(sec);
    });
  });

  // clear all
  qs("#clearAllBtn")?.addEventListener("click", clearAll);

  // button clicks (+ rows, tickets)
  document.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // support tickets +
    if (btn.classList.contains("add-ticket-btn")){
      e.preventDefault();
      handleAddTicket(btn);
      return;
    }

    // integrated +
    if (btn.classList.contains("add-row")){
      e.preventDefault();

      // if it's trainers additional trainer +, append to container
      const handled = addAdditionalTrainerRow(btn);
      if (!handled) cloneIntegratedRow(btn);
      return;
    }
  });
});
