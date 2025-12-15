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
   Ghost / placeholder selects + date inputs
--------------------------- */
function refreshGhostSelects(root = document){
  // selects
  qsa("select", root).forEach(sel => {
    const opt = sel.options[sel.selectedIndex];
    const ghost = !sel.value && opt?.dataset?.ghost === "true";
    sel.classList.toggle("is-placeholder", ghost);
  });

  // date inputs (so empty dates show gray like placeholders)
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
   ✅ TABLE "+" rows (works for all tables)
--------------------------- */
function cloneTableRow(btn){
  const footer = btn.closest(".table-footer");
  if (!footer) return;

  const container = btn.closest(".table-container");
  const table = qs("table.training-table", container);
  const tbody = qs("tbody", table);
  if (!tbody) return;

  const rows = qsa("tr", tbody);
  const baseRow = rows[rows.length - 1];
  if (!baseRow) return;

  const clone = baseRow.cloneNode(true);

  // clear inputs/selects in the cloned row
  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  tbody.appendChild(clone);
  refreshGhostSelects(clone);
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
   ✅ Additional POC — ADD A NEW CARD (not a single line)
--------------------------- */
function handleAdditionalPOCAdd(btn){
  const baseCard = btn.closest(".mini-card.additional-poc-card");
  if (!baseCard) return;

  const parentGrid = baseCard.parentElement; // usually .primary-contacts-grid
  if (!parentGrid) return;

  const clone = baseCard.cloneNode(true);
  clone.removeAttribute("data-base");

  // remove + button in cloned card
  clone.querySelector(".add-row")?.remove();
  clone.querySelector(".additional-poc-add")?.remove();

  resetClonedFields(clone);

  parentGrid.insertBefore(clone, baseCard.nextSibling);
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
    refreshGhostSelects();
  });

  start.addEventListener("input", () => {
    if (!start.value || end.dataset.userEdited === "1") return;
    end.value = addDaysISO(start.value, 2);
    saveField(end);
    refreshGhostSelects();
  });
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

function unlockTicketStatus(card){
  const sel = qs(".ticket-status-select", card);
  if (!sel) return;

  sel.disabled = false;
  sel.classList.remove("is-locked");
}

function handleAddTicket(btn){
  const base = btn.closest(".ticket-group[data-base='true']");
  if (!base) return;

   function getTicketContainerByStatus(status){
  const map = {
    "Open": "#openTicketsContainer",
    "Tier Two": "#tierTwoTicketsContainer",
    "Closed - Resolved": "#closedResolvedTicketsContainer",
    "Closed - Feature Not Supported": "#closedFeatureTicketsContainer"
  };
  return qs(map[status] || "");
}

function moveTicketCardToStatus(card, status){
  const dest = getTicketContainerByStatus(status);
  if (!dest) return;
  dest.appendChild(card);
}

  const num = qs(".ticket-number-input", base);
  const link = qs(".ticket-zendesk-input", base);
  const sum = qs(".ticket-summary-input", base);
  if (!num?.value || !link?.value || !sum?.value) return;

  const clone = base.cloneNode(true);
  clone.removeAttribute("data-base");

  // remove add button + disclaimer on clones
  clone.querySelector(".add-ticket-btn")?.remove();
  clone.querySelector(".ticket-disclaimer")?.remove();

  // ✅ unlock status on cloned tickets
  unlockTicketStatus(clone);

  addTicketBadge(clone);
  qs("#openTicketsContainer")?.appendChild(clone);

  // clear base inputs
  num.value = "";
  link.value = "";
  sum.value = "";
}

/* ---------------------------
   Google Maps (Autocomplete + Map Preview)
--------------------------- */
function initAddressAutocomplete(){
  const input = qs("#dealershipAddressInput");
  if (!input || !window.google?.maps?.places) return;

  const ac = new google.maps.places.Autocomplete(input, {
    types: ["address"]
  });

  ac.addListener("place_changed", () => {
    const place = ac.getPlace();
    if (!place || !place.formatted_address) return;

    input.value = place.formatted_address;
    saveField(input);

    updateDealershipMap(place.formatted_address);
  });
}

// MUST be global for Google callback
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
  } catch (err){
    console.error("Init error:", err);
  }

  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    // keep placeholder styling live for selects + dates
    if (e.target.tagName === "SELECT" || e.target.type === "date") refreshGhostSelects();
  });

  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT" || e.target.type === "date") refreshGhostSelects();
  });

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

    // ✅ "+” buttons
    if (btn.classList.contains("add-row")){
      // 1) table add-row
      if (btn.closest(".table-footer")){
        cloneTableRow(btn);
        return;
      }

      // 2) additional POC card add
      if (btn.closest(".mini-card.additional-poc-card")){
        handleAdditionalPOCAdd(btn);
        return;
      }

      // 3) trainers page add
      if (btn.closest("#trainers-deployment")){
        handleTrainerAdd(btn);
        return;
      }

      // 4) default integrated row add
      cloneIntegratedRow(btn);
      return;
    }

    // support tickets
    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }
  });
});
