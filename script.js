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

  // optional: keep hash in URL (nice for refresh)
  try{ history.replaceState(null, "", "#" + id); } catch {}
}

function initNavigation(){
  const nav = qs("#sidebar-nav");
  if (!nav) return;

  // delegated click for ALL nav buttons
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn[data-target]");
    if (!btn) return;
    e.preventDefault();
    setActivePage(btn.dataset.target);
  });

  // initial page
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
   (generic clone)
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

  // remove the "+" button from the clone
  clone.querySelector(".add-row")?.remove();

  row.parentElement.insertBefore(clone, row.nextSibling);
}

/* ---------------------------
   Trainers – Additional Trainers
   (append into #additionalTrainersContainer)
--------------------------- */
function handleTrainerAdd(btn){
  const row = btn.closest(".checklist-row");
  const page = btn.closest("#trainers-deployment");
  const container = qs("#additionalTrainersContainer");
  if (!row || !page || !container) return;

  const clone = row.cloneNode(true);
  resetClonedFields(clone);

  // remove the "+" button from the clone
  clone.querySelector(".add-row")?.remove();

  container.appendChild(clone);
}

/* ---------------------------
   Onsite Training Dates (PAGE 2)
   - input type="date" shows native picker
   - end auto-fills +2 days after start
   - end is editable (won’t get overwritten if user edits)
--------------------------- */
function addDaysISO(iso, days){
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function initTrainingDates(){
  const start = qs("#onsiteStartDate");
  const end = qs("#onsiteEndDate");
  if (!start || !end) return;

  // make picker pop on click where supported
  [start, end].forEach(inp => {
    inp.addEventListener("click", () => {
      try{ inp.showPicker?.(); } catch {}
    });
  });

  // mark manual edits on end date
  end.addEventListener("input", () => {
    end.dataset.userEdited = end.value ? "1" : "0";
    saveField(end);
  });

  start.addEventListener("input", () => {
    if (!start.value) return;

    // Only overwrite end if user hasn't manually edited it
    if (end.dataset.userEdited === "1") return;

    end.value = addDaysISO(start.value, 2);
    end.dataset.userEdited = "0";
    saveField(end);
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

  // don’t crash if markup changed
  if (!num || !link || !sum) return;
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

    // update embedded map preview
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
   DOM READY (single init)
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

  // autosave
  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);
    if (e.target.tagName === "SELECT") refreshGhostSelects();
  });

  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);
    if (e.target.tagName === "SELECT") refreshGhostSelects();
  });

  // clicks (delegated)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // Clear all
    if (btn.id === "clearAllBtn"){
      clearAll();
      return;
    }

    // Per-page reset
    if (btn.classList.contains("clear-page-btn")){
      const sec = btn.closest(".page-section");
      if (sec) clearSection(sec);
      return;
    }

    // "+" rows
    if (btn.classList.contains("add-row")){
      // Trainers additional trainer "+" should append into container
      if (btn.closest("#trainers-deployment") && qs("#additionalTrainersContainer")){
        handleTrainerAdd(btn);
      } else {
        cloneIntegratedRow(btn);
      }
      return;
    }

    // Support ticket "+"
    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }
  });
});
