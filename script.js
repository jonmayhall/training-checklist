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
function refreshAfterClone(clone){
  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });
  refreshGhostSelects(clone);
}

function cloneIntegratedRow(btn){
  // ✅ SPECIAL CASE: Additional POC button should clone the ENTIRE CARD
  if (btn.classList.contains("additional-poc-add") || btn.closest(".additional-poc-card")) {
    const baseCard = btn.closest(".additional-poc-card");
    const grid = qs("#primaryContactsGrid");
    if (!baseCard || !grid) return;

    const clone = baseCard.cloneNode(true);

    // make it a real clone (NOT base)
    clone.removeAttribute("data-base");

    // clear fields
    qsa("input, textarea, select", clone).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });

    // remove the + button so only the base has it
    clone.querySelector(".additional-poc-add")?.remove();
    clone.querySelector(".add-row")?.remove();

    refreshGhostSelects(clone);

    // append as a brand new card in the grid
    grid.appendChild(clone);
    return;
  }

  // ✅ DEFAULT: normal “integrated +” rows (non-table)
  const row = btn.closest(".checklist-row");
  if (!row || !row.parentElement) return;

  const clone = row.cloneNode(true);

  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  clone.querySelector(".add-row")?.remove();
  refreshGhostSelects(clone);

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
  refreshAfterClone(clone);
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
  });

  start.addEventListener("input", () => {
    if (!start.value || end.dataset.userEdited === "1") return;
    end.value = addDaysISO(start.value, 2);
    saveField(end);
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

function handleAddTicket(btn){
  const base = btn.closest(".ticket-group[data-base='true']");
  if (!base) return;

  const num = qs(".ticket-number-input", base);
  const link = qs(".ticket-zendesk-input", base);
  const sum = qs(".ticket-summary-input", base);
  if (!num?.value || !link?.value || !sum?.value) return;

  const clone = base.cloneNode(true);

  // ✅ make it a real ticket card (NOT base)
  clone.removeAttribute("data-base");

  // remove base-only UI
  clone.querySelector(".add-ticket-btn")?.remove();
  clone.querySelector(".ticket-disclaimer")?.remove();

  // ✅ unlock status on clones (only base stays locked)
  const statusSel = qs(".ticket-status-select", clone);
  if (statusSel){
    statusSel.disabled = false;
    statusSel.classList.remove("is-locked");
    statusSel.value = "Open";
  }

  addTicketBadge(clone);

  // append to Open by default
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
function refreshDateGhost(){
  qsa(".training-dates-row input[type='date']").forEach(d => {
    d.classList.toggle("is-placeholder", !d.value);
  });
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
    refreshDateGhost(); // initial sync on page load
  } catch (err){
    console.error("Init error:", err);
  }

  // autosave on input
  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost(); // ✅ HERE (1 of 2)
  });

  // autosave on change
  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost(); // ✅ HERE (2 of 2)

    // Support ticket status move
    const sel = e.target.closest(".ticket-status-select");
    if (sel){
      const card = sel.closest(".ticket-group");
      if (!card) return;
      if (card.dataset.base === "true") return;
      moveTicketCardToStatus(card, sel.value);
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

    if (btn.classList.contains("add-row")){
      const table = btn.closest(".table-container")?.querySelector("table");
      if (table && table.tBodies?.[0]){
        const tbody = table.tBodies[0];
        const last = tbody.rows[tbody.rows.length - 1];
        if (!last) return;

        const clone = last.cloneNode(true);
        qsa("input, select, textarea", clone).forEach(el => {
          if (el.type === "checkbox") el.checked = false;
          else if (el.tagName === "SELECT") el.selectedIndex = 0;
          else el.value = "";
        });

        tbody.appendChild(clone);
        refreshGhostSelects(clone);
        return;
      }

      if (btn.closest("#trainers-deployment")){
        handleTrainerAdd(btn);
      } else {
        cloneIntegratedRow(btn);
      }
      return;
    }

    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
    }
  });
});
