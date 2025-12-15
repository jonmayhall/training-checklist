/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (CLEAN + FIXED)
   Includes:
   - Autosave (localStorage)
   - Reset This Page / Clear All
   - Table "+" add row
   - Integrated-plus "+" add row (incl. Additional POC mini-cards)
   - Nav menu buttons (fixed)
   - Support Tickets:
       ✅ 4 status sections stacked (Open left, 3 stacked right)
       ✅ each status container shows ticket cards in 2x2 grid (CSS handles)
       ✅ base card Status locked to Open + greyed out
       ✅ Add button only works when base card complete
       ✅ Inline errors directly UNDER the correct textbox
       ✅ Added tickets get a corner badge number (1,2,3...)
       ✅ Badge persists when status changes
   - Google Maps Places Autocomplete (no “update while typing”; update only on Enter / Map button)
   ========================================================= */

/* ---------------------------
   Helpers
--------------------------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function isFormEl(el){
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

function getVal(el){
  if (!el) return "";
  if (el.type === "checkbox") return el.checked ? "1" : "0";
  return (el.value ?? "").toString();
}
function setVal(el, v){
  if (!el) return;
  if (el.type === "checkbox") el.checked = (v === "1" || v === true);
  else el.value = v ?? "";
}

/* stable-ish autosave key */
function getFieldKey(el){
  if (!el) return null;
  if (el.id) return `id:${el.id}`;
  if (el.name) return `name:${el.name}`;

  const parts = [];
  let node = el;
  while (node && node !== document.body){
    if (node.id) { parts.unshift(`#${node.id}`); break; }
    let idx = 0;
    let sib = node;
    while ((sib = sib.previousElementSibling)) idx++;
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${idx + 1})`);
    node = node.parentElement;
  }
  return `path:${parts.join(">")}`;
}

const STORAGE_KEY = "myKaarmaChecklist:v1";

/* ---------------------------
   Ghost placeholder selects (non-table only)
--------------------------- */
function refreshGhostSelects(root = document){
  qsa("select", root).forEach(sel => {
    if (sel.closest(".training-table")) return; // never ghost-color in tables
    const opt = sel.options[sel.selectedIndex];
    const isGhost = !sel.value && opt && opt.dataset && opt.dataset.ghost === "true";
    sel.classList.toggle("is-placeholder", !!isGhost);
  });
}

/* ---------------------------
   Autosave
--------------------------- */
function loadAll(){
  let data = {};
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch(e){ data = {}; }

  qsa("input, textarea, select").forEach(el => {
    if (!isFormEl(el)) return;
    const k = getFieldKey(el);
    if (!k) return;
    if (data[k] !== undefined) setVal(el, data[k]);
  });

  refreshGhostSelects();
}

function saveField(el){
  if (!isFormEl(el)) return;
  const k = getFieldKey(el);
  if (!k) return;

  let data = {};
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch(e){ data = {}; }

  data[k] = getVal(el);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------------------------
   Reset / Clear
--------------------------- */
function clearSection(sectionEl){
  if (!sectionEl) return;

  qsa("input, textarea, select", sectionEl).forEach(el => {
    if (!isFormEl(el)) return;
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    saveField(el);
  });

  if (sectionEl.id === "support-tickets"){
    resetSupportTicketsUI();
  }

  refreshGhostSelects(sectionEl);
}

function clearAll(){
  localStorage.removeItem(STORAGE_KEY);

  qsa(".page-section").forEach(sec => {
    qsa("input, textarea, select", sec).forEach(el => {
      if (!isFormEl(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });
  });

  resetSupportTicketsUI();
  refreshGhostSelects();
}

/* ---------------------------
   Table "+" cloning
--------------------------- */
function cloneTableRow(btn){
  const footer = btn.closest(".table-footer");
  const table = footer ? footer.previousElementSibling?.querySelector("table") : null;
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const lastRow = tbody?.querySelector("tr:last-child");
  if (!tbody || !lastRow) return;

  const clone = lastRow.cloneNode(true);
  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });

  tbody.appendChild(clone);
}

/* ---------------------------
   Integrated-plus "+" cloning
--------------------------- */
function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row.integrated-plus");
  if (!row) return;

  const miniCard = row.closest(".mini-card");
  const isAdditionalPOC = miniCard && miniCard.classList.contains("additional-poc-card");

  if (isAdditionalPOC){
    const baseCard = miniCard;
    const clone = baseCard.cloneNode(true);

    clone.removeAttribute("data-base"); // non-base
    qsa("input, textarea, select", clone).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    baseCard.parentElement.insertBefore(clone, baseCard.nextElementSibling);
    refreshGhostSelects(clone);
    return;
  }

  // default: clone row, remove "+" from clone
  const clone = row.cloneNode(true);
  const addBtn = qs(".add-row", clone);
  if (addBtn) addBtn.remove();

  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });

  row.parentElement.insertBefore(clone, row.nextElementSibling);
  refreshGhostSelects(clone);
}

/* =========================================================
   SUPPORT TICKETS (dynamic)
   IMPORTANT: This JS also “normalizes” your existing HTML
   by wrapping the right-side field in <div class="field-wrap">
   so warnings always sit directly under the correct textbox.
========================================================= */

let supportTicketCounter = 0;

function resetSupportTicketsUI(){
  const openWrap = qs("#openTicketsContainer");
  const tierWrap = qs("#tierTwoTicketsContainer");
  const resolvedWrap = qs("#closedResolvedTicketsContainer");
  const featureWrap = qs("#closedFeatureTicketsContainer");
  if (!openWrap) return;

  // keep only base card in Open container
  const base = openWrap.querySelector('.ticket-group[data-base="true"]');
  openWrap.innerHTML = "";
  if (base){
    // clear base fields
    qsa("input, textarea, select", base).forEach(el => {
      if (!isFormEl(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // force base status locked to Open
    lockBaseStatus(base);

    clearTicketErrors(base);
    normalizeSupportTicketCard(base);

    openWrap.appendChild(base);
  }

  if (tierWrap) tierWrap.innerHTML = "";
  if (resolvedWrap) resolvedWrap.innerHTML = "";
  if (featureWrap) featureWrap.innerHTML = "";

  supportTicketCounter = 0;
}

function lockBaseStatus(baseCard){
  const status = qs(".ticket-status-select", baseCard);
  if (!status) return;
  status.value = "Open";
  status.disabled = true; // greyed/locked
  status.classList.add("is-locked");
}

function clearTicketErrors(card){
  qsa(".field-error", card).forEach(el => el.classList.remove("field-error"));
  qsa(".field-warning", card).forEach(w => w.remove());
}

/* Wraps the input/select/number-wrap in .field-wrap so warnings go UNDER the field */
function ensureFieldWrap(row){
  if (!row) return null;

  // already has field-wrap?
  const existingWrap = qs(".field-wrap, .field-wrap-full", row);
  if (existingWrap) return existingWrap;

  // pick the “field element” in this row
  const numberWrap = qs(".ticket-number-wrap", row);
  const input = qs('input[type="text"]', row);
  const select = qs("select", row);

  const fieldEl = numberWrap || input || select;
  if (!fieldEl) return null;

  const wrap = document.createElement("div");
  wrap.className = "field-wrap";

  // if this row is the summary row OR row is column-ish, use full wrap
  if (row.classList.contains("ticket-summary-row")) wrap.classList.add("field-wrap-full");

  fieldEl.parentNode.insertBefore(wrap, fieldEl);
  wrap.appendChild(fieldEl);

  return wrap;
}

/* Ensure the support ticket card matches our validation layout rules */
function normalizeSupportTicketCard(card){
  if (!card) return;

  // For each “ticket-row” that has a right-side control, make sure it’s wrapped
  qsa(".ticket-row", card).forEach(row => {
    // summary row is handled separately by HTML/CSS already, but wrapping doesn't hurt
    ensureFieldWrap(row);
  });

  // make sure disclaimer ONLY exists on base (if you still have it in HTML)
  if (card.dataset.base === "true"){
    // (do nothing; user wants it visible on base only)
  } else {
    // remove disclaimer from cloned cards if it exists
    qsa(".ticket-disclaimer", card).forEach(d => d.remove());
  }
}

/* Always insert warning directly after the .field-wrap (so it sits under the input) */
function ensureWarningUnderWrap(rowOrWrap, msg){
  if (!rowOrWrap) return;

  // allow passing row OR wrap
  const wrap = rowOrWrap.classList?.contains("field-wrap") || rowOrWrap.classList?.contains("field-wrap-full")
    ? rowOrWrap
    : ensureFieldWrap(rowOrWrap);

  if (!wrap) return;

  // remove existing warning inside wrap
  const existing = qs(".field-warning", wrap);
  if (existing) existing.remove();

  const warn = document.createElement("div");
  warn.className = "field-warning";
  warn.textContent = msg;
  wrap.appendChild(warn); // inside wrap => always under the field
}

function getBaseCard(){
  return qs('#openTicketsContainer .ticket-group[data-base="true"]');
}

function getZendeskInput(card){
  // Prefer a class if you add it to HTML later
  const byClass = qs(".ticket-zendesk-input", card);
  if (byClass) return byClass;

  // Fallback: match by placeholder text
  return qsa('input[type="text"]', card).find(i =>
    (i.placeholder || "").toLowerCase().includes("zendesk ticket url")
  ) || null;
}

function validateBaseTicketCard(baseCard){
  clearTicketErrors(baseCard);

  const ticketRow = qs(".ticket-number-row", baseCard) || qs(".ticket-row", baseCard);
  const zendeskRow = qsa(".ticket-row", baseCard).find(r => (r.textContent || "").toLowerCase().includes("zendesk link")) || null;
  const summaryRow = qs(".ticket-summary-row", baseCard);

  const ticketNumberInput = qs(".ticket-number-input", baseCard);
  const zendeskInput = getZendeskInput(baseCard);
  const summary = qs(".ticket-summary-input", baseCard);

  let ok = true;

  if (!ticketNumberInput || !ticketNumberInput.value.trim()){
    ok = false;
    ticketNumberInput?.classList.add("field-error");
    ensureWarningUnderWrap(ticketRow, "Ticket number is required.");
  }

  if (!zendeskInput || !zendeskInput.value.trim()){
    ok = false;
    zendeskInput?.classList.add("field-error");
    ensureWarningUnderWrap(zendeskRow, "Zendesk link is required.");
  }

  if (!summary || !summary.value.trim()){
    ok = false;
    summary?.classList.add("field-error");
    ensureWarningUnderWrap(summaryRow, "Short summary is required.");
  }

  return ok;
}

function readTicketCardData(card){
  const ticketNumberInput = qs(".ticket-number-input", card);
  const statusSelect = qs(".ticket-status-select", card);
  const zendeskInput = getZendeskInput(card);
  const summary = qs(".ticket-summary-input", card);

  return {
    ticketNumber: ticketNumberInput ? ticketNumberInput.value.trim() : "",
    status: statusSelect ? statusSelect.value : "Open",
    zendeskLink: zendeskInput ? zendeskInput.value.trim() : "",
    summary: summary ? summary.value.trim() : ""
  };
}

function writeTicketCardData(card, data){
  const ticketNumberInput = qs(".ticket-number-input", card);
  const statusSelect = qs(".ticket-status-select", card);
  const zendeskInput = getZendeskInput(card);
  const summary = qs(".ticket-summary-input", card);

  if (ticketNumberInput) ticketNumberInput.value = data.ticketNumber || "";
  if (statusSelect) statusSelect.value = data.status || "Open";
  if (zendeskInput) zendeskInput.value = data.zendeskLink || "";
  if (summary) summary.value = data.summary || "";

  refreshGhostSelects(card);
}

function setTicketCardNonBase(card){
  card.removeAttribute("data-base");

  // remove + button
  const addBtn = qs(".add-ticket-btn", card);
  if (addBtn) addBtn.remove();

  // make sure status is NOT disabled on added cards
  const status = qs(".ticket-status-select", card);
  if (status){
    status.disabled = false;
    status.classList.remove("is-locked");
  }

  // remove disclaimer from cloned cards
  qsa(".ticket-disclaimer", card).forEach(d => d.remove());
}

function ensureTicketBadge(card){
  if (!card || card.dataset.base === "true") return;

  // already has a badge?
  if (qs(".ticket-count-badge", card)) return;

  supportTicketCounter += 1;
  card.dataset.ticketIndex = String(supportTicketCounter);

  const badge = document.createElement("div");
  badge.className = "ticket-count-badge";
  badge.textContent = String(supportTicketCounter);

  // badge should be the first child for clean positioning
  card.insertBefore(badge, card.firstChild);
}

function getTicketsContainerForStatus(status){
  const openWrap = qs("#openTicketsContainer");
  const tierWrap = qs("#tierTwoTicketsContainer");
  const resolvedWrap = qs("#closedResolvedTicketsContainer");
  const featureWrap = qs("#closedFeatureTicketsContainer");

  if (status === "Tier Two") return tierWrap || openWrap;
  if (status === "Closed - Resolved") return resolvedWrap || openWrap;
  if (status === "Closed – Feature Not Supported") return featureWrap || openWrap;
  return openWrap;
}

function moveTicketCardToStatusContainer(card){
  const statusSelect = qs(".ticket-status-select", card);
  const status = statusSelect ? statusSelect.value : "Open";
  const dest = getTicketsContainerForStatus(status);
  if (!dest) return;
  dest.appendChild(card);
}

function handleSupportTicketAdd(btn){
  const baseCard = btn.closest('.ticket-group[data-base="true"]');
  if (!baseCard) return;

  normalizeSupportTicketCard(baseCard);

  // validate base card
  const ok = validateBaseTicketCard(baseCard);
  if (!ok) return;

  // capture base data
  const data = readTicketCardData(baseCard);

  // create new card
  const newCard = baseCard.cloneNode(true);
  setTicketCardNonBase(newCard);

  // IMPORTANT: normalize + clear errors before writing data
  clearTicketErrors(newCard);
  normalizeSupportTicketCard(newCard);
  writeTicketCardData(newCard, data);

  // add badge + number
  ensureTicketBadge(newCard);

  // move into proper status bucket
  moveTicketCardToStatusContainer(newCard);

  // clear base fields for next entry
  qsa("input, textarea", baseCard).forEach(el => { if (isFormEl(el)) el.value = ""; });
  clearTicketErrors(baseCard);

  // force base status back to Open and locked
  lockBaseStatus(baseCard);

  refreshGhostSelects(baseCard);
}

function handleSupportTicketStatusChange(selectEl){
  const card = selectEl.closest(".ticket-group");
  if (!card) return;

  // base stays Open always
  if (card.dataset.base === "true"){
    selectEl.value = "Open";
    selectEl.disabled = true;
    return;
  }

  moveTicketCardToStatusContainer(card);
}

/* Cleanup warnings as user types (in support tickets only) */
function supportTicketLiveCleanup(e){
  const el = e.target;
  if (!el.closest("#support-tickets")) return;

  if (!isFormEl(el)) return;

  el.classList.remove("field-error");

  // remove warning in the same field-wrap
  const wrap = el.closest(".field-wrap, .field-wrap-full");
  if (wrap){
    const warn = qs(".field-warning", wrap);
    if (warn) warn.remove();
  }
}

/* ---------------------------
   Google Maps Places Autocomplete
--------------------------- */
function initAddressAutocomplete(){
  const addressInput =
    qs("#dealershipAddress") ||
    qs("#dealership-info input[type='text']");

  if (!addressInput || !window.google || !google.maps || !google.maps.places) return;

  const autocomplete = new google.maps.places.Autocomplete(addressInput, {
    fields: ["formatted_address", "geometry", "name"],
    types: ["address"]
  });

  // Do NOT update map on place_changed (prevents “searching as you type”)
  autocomplete.addListener("place_changed", () => { /* intentionally blank */ });

  // Enter updates map
  addressInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      updateDealershipMapFromAddress(addressInput.value);
    }
  });

  // Map button updates map
  const mapBtn = qs("#dealership-info .small-map-btn");
  if (mapBtn){
    mapBtn.addEventListener("click", () => {
      updateDealershipMapFromAddress(addressInput.value);
    });
  }
}

function updateDealershipMapFromAddress(addr){
  const iframe = qs("#dealership-info iframe.map-frame") || qs("#dealership-info .map-frame");
  if (!iframe) return;

  const q = encodeURIComponent((addr || "").trim());
  if (!q) return;

  iframe.src = `https://www.google.com/maps?q=${q}&output=embed`;
}

/* ---------------------------
   Navigation
--------------------------- */
function setActivePage(sectionId){
  const id = sectionId.startsWith("#") ? sectionId.slice(1) : sectionId;

  qsa(".page-section").forEach(sec => sec.classList.remove("active"));
  const target = qs(`#${id}`);
  if (target) target.classList.add("active");

  qsa(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const navBtn = qs(`.nav-btn[data-target="${id}"]`);
  if (navBtn) navBtn.classList.add("active");
}

/* ---------------------------
   DOM Ready Wiring
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();

  // menu buttons (fixed)
  qsa(".nav-btn[data-target]").forEach(btn => {
    btn.addEventListener("click", () => setActivePage(btn.dataset.target));
  });

  // autosave
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!isFormEl(t)) return;
    saveField(t);

    if (t.tagName === "SELECT") refreshGhostSelects(t.closest(".page-section") || document);
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!isFormEl(t)) return;
    saveField(t);

    if (t.tagName === "SELECT") refreshGhostSelects(t.closest(".page-section") || document);

    if (t.classList.contains("ticket-status-select")){
      handleSupportTicketStatusChange(t);
    }
  });

  // Reset This Page
  qsa(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => clearSection(btn.closest(".page-section")));
  });

  // Clear All
  const clearAllBtn = qs("#clearAllBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

  // click delegation for add buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // Support ticket add (+)
    if (btn.classList.contains("add-ticket-btn")){
      e.preventDefault();
      handleSupportTicketAdd(btn);
      return;
    }

    // Table footer +
    if (btn.classList.contains("add-row") && btn.closest(".table-footer")){
      e.preventDefault();
      cloneTableRow(btn);
      return;
    }

    // Integrated-plus +
    if (btn.classList.contains("add-row") && btn.closest(".checklist-row.integrated-plus")){
      e.preventDefault();
      cloneIntegratedRow(btn);
      return;
    }
  });

  // Support tickets: live cleanup
  document.addEventListener("input", supportTicketLiveCleanup);

  // Support tickets: normalize base card + lock status
  const base = getBaseCard();
  if (base){
    normalizeSupportTicketCard(base);
    lockBaseStatus(base);
  }

  refreshGhostSelects();
});

/* Needed for Google Maps callback (MUST be global) */
window.initAddressAutocomplete = initAddressAutocomplete;
