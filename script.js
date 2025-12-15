/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (Autosave, Reset Page, Clear All, Add Row buttons,
    Support Tickets: add card only when complete + inline errors
    + status-based moving, Google Maps Places Autocomplete + map update)
   ========================================================= */

/* ---------------------------
   Helpers
--------------------------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function isTextLike(el){
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

function getFieldValue(el){
  if (!el) return "";
  if (el.type === "checkbox") return el.checked ? "1" : "0";
  return (el.value ?? "").toString();
}

function setFieldValue(el, val){
  if (!el) return;
  if (el.type === "checkbox") el.checked = (val === "1" || val === true);
  else el.value = val ?? "";
}

/* A stable-ish key for autosave */
function getFieldKey(el){
  if (!el) return null;
  if (el.id) return `id:${el.id}`;
  if (el.name) return `name:${el.name}`;

  // Fallback: use a DOM path (good enough for static layout)
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
   Autosave (localStorage)
--------------------------- */
function loadAll(){
  let data = {};
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch(e){ data = {}; }

  qsa("input, textarea, select").forEach(el => {
    if (!isTextLike(el)) return;
    const k = getFieldKey(el);
    if (!k) return;
    if (data[k] !== undefined) setFieldValue(el, data[k]);
  });

  refreshGhostSelects();
}

function saveField(el){
  if (!isTextLike(el)) return;
  const k = getFieldKey(el);
  if (!k) return;

  let data = {};
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch(e){ data = {}; }

  data[k] = getFieldValue(el);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------------------------
   Reset / Clear
--------------------------- */
function clearSection(sectionEl){
  if (!sectionEl) return;
  qsa("input, textarea, select", sectionEl).forEach(el => {
    if (!isTextLike(el)) return;
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    saveField(el);
  });

  if (sectionEl.id === "support-tickets"){
    resetSupportTicketsUI();
  }

  refreshGhostSelects();
}

function clearAll(){
  localStorage.removeItem(STORAGE_KEY);

  qsa(".page-section").forEach(sec => {
    qsa("input, textarea, select", sec).forEach(el => {
      if (!isTextLike(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });
  });

  resetSupportTicketsUI();
  refreshGhostSelects();
}

/* ---------------------------
   Select “ghost” text styling
   (only for non-table selects)
--------------------------- */
function refreshGhostSelects(root = document){
  qsa("select", root).forEach(sel => {
    if (sel.closest(".training-table")) return; // never ghost inside tables
    const opt = sel.options[sel.selectedIndex];
    const isGhost = !sel.value && opt && opt.dataset && opt.dataset.ghost === "true";
    sel.classList.toggle("is-placeholder", !!isGhost);
  });
}

/* ---------------------------
   Add Row buttons
--------------------------- */
function cloneTableRow(btn){
  const footer = btn.closest(".table-footer");
  const table = footer ? footer.previousElementSibling?.querySelector("table") : null;
  if (!table) return;

  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  const lastRow = tbody.querySelector("tr:last-child");
  if (!lastRow) return;

  const clone = lastRow.cloneNode(true);

  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });

  tbody.appendChild(clone);
}

function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row.integrated-plus");
  if (!row) return;

  const miniCard = row.closest(".mini-card");
  const isAdditionalPOC = miniCard && miniCard.classList.contains("additional-poc-card");

  if (isAdditionalPOC){
    const baseCard = miniCard;
    const clone = baseCard.cloneNode(true);
    clone.removeAttribute("data-base");

    qsa("input, textarea, select", clone).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    baseCard.parentElement.insertBefore(clone, baseCard.nextElementSibling);
    refreshGhostSelects(clone);
    return;
  }

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

/* ---------------------------
   Support Tickets (dynamic)
--------------------------- */
function resetSupportTicketsUI(){
  const openWrap = qs("#openTicketsContainer");
  const tierWrap = qs("#tierTwoTicketsContainer");
  const resolvedWrap = qs("#closedResolvedTicketsContainer");
  const featureWrap = qs("#closedFeatureTicketsContainer");
  if (!openWrap) return;

  const base = openWrap.querySelector('.ticket-group[data-base="true"]');
  openWrap.innerHTML = "";

  if (base){
    qsa("input, textarea, select", base).forEach(el => {
      if (!isTextLike(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else {
        if (el.classList.contains("ticket-status-select")) el.value = "Open";
        else el.value = "";
      }
    });
    clearTicketErrors(base);
    openWrap.appendChild(base);
  }

  if (tierWrap) tierWrap.innerHTML = "";
  if (resolvedWrap) resolvedWrap.innerHTML = "";
  if (featureWrap) featureWrap.innerHTML = "";
}

function clearTicketErrors(card){
  qsa(".field-error", card).forEach(el => el.classList.remove("field-error"));
  qsa(".field-warning", card).forEach(w => w.remove());
}

function ensureWarningUnder(targetEl, msg){
  if (!targetEl) return;

  const next = targetEl.nextElementSibling;
  if (next && next.classList.contains("field-warning")) next.remove();

  const warn = document.createElement("div");
  warn.className = "field-warning";
  warn.textContent = msg;
  targetEl.insertAdjacentElement("afterend", warn);
}

function findZendeskInput(card){
  // Prefer a class if you add it later:
  const byClass = qs(".ticket-zendesk-input", card);
  if (byClass) return byClass;

  // Otherwise find by placeholder text (works with your current HTML)
  return qsa('input[type="text"]', card)
    .find(i => (i.placeholder || "").toLowerCase().includes("zendesk ticket url")) || null;
}

function validateBaseTicketCard(baseCard){
  clearTicketErrors(baseCard);

  const ticketNumberInput = qs(".ticket-number-input", baseCard);
  const zendeskInput = findZendeskInput(baseCard);
  const summary = qs(".ticket-summary-input", baseCard);

  let ok = true;

  // Ticket number (warning under .ticket-number-wrap so it doesn't mess layout)
  if (!ticketNumberInput || !ticketNumberInput.value.trim()){
    ok = false;
    ticketNumberInput?.classList.add("field-error");
    const wrap = qs(".ticket-number-wrap", baseCard);
    ensureWarningUnder(wrap || ticketNumberInput, "Ticket number is required.");
  }

  // Zendesk link (warning under the input)
  if (!zendeskInput || !zendeskInput.value.trim()){
    ok = false;
    zendeskInput?.classList.add("field-error");
    ensureWarningUnder(zendeskInput, "Zendesk link is required.");
  }

  // Summary (warning under textarea)
  if (!summary || !summary.value.trim()){
    ok = false;
    summary?.classList.add("field-error");
    ensureWarningUnder(summary, "Short summary is required.");
  }

  return ok;
}

function readTicketCardData(card){
  const ticketNumberInput = qs(".ticket-number-input", card);
  const statusSelect = qs(".ticket-status-select", card);
  const zendeskInput = findZendeskInput(card);
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
  const zendeskInput = findZendeskInput(card);
  const summary = qs(".ticket-summary-input", card);

  if (ticketNumberInput) ticketNumberInput.value = data.ticketNumber || "";
  if (statusSelect) statusSelect.value = data.status || "Open";
  if (zendeskInput) zendeskInput.value = data.zendeskLink || "";
  if (summary) summary.value = data.summary || "";

  refreshGhostSelects(card);
}

function setTicketCardNonBase(card){
  card.removeAttribute("data-base");
  const addBtn = qs(".add-ticket-btn", card);
  if (addBtn) addBtn.remove();
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

  const ok = validateBaseTicketCard(baseCard);
  if (!ok) return;

  const data = readTicketCardData(baseCard);

  const newCard = baseCard.cloneNode(true);
  setTicketCardNonBase(newCard);
  clearTicketErrors(newCard);
  writeTicketCardData(newCard, data);

  moveTicketCardToStatusContainer(newCard);

  // Clear base for next entry
  qsa("input, textarea", baseCard).forEach(el => { el.value = ""; });
  const status = qs(".ticket-status-select", baseCard);
  if (status) status.value = "Open";
  clearTicketErrors(baseCard);
  refreshGhostSelects(baseCard);
}

function handleSupportTicketStatusChange(selectEl){
  const card = selectEl.closest(".ticket-group");
  if (!card) return;

  const isBase = card.dataset && card.dataset.base === "true";
  if (isBase){
    selectEl.value = "Open";
    return;
  }

  moveTicketCardToStatusContainer(card);
}

/* Clear warning directly under the field the user is fixing */
function clearInlineWarningFor(el){
  if (!el) return;

  // ticket number uses wrap
  if (el.classList.contains("ticket-number-input")){
    el.classList.remove("field-error");
    const wrap = qs(".ticket-number-wrap", el.closest(".ticket-group"));
    if (wrap){
      const next = wrap.nextElementSibling;
      if (next && next.classList.contains("field-warning")) next.remove();
    }
    return;
  }

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA"){
    el.classList.remove("field-error");
    const next = el.nextElementSibling;
    if (next && next.classList.contains("field-warning")) next.remove();
  }
}

/* ---------------------------
   Google Maps Places Autocomplete
--------------------------- */
let __selectedPlace = null;

function initAddressAutocomplete(){
  const addressInput = qs("#dealership-info input[type='text']");
  if (!addressInput || !window.google || !google.maps || !google.maps.places) return;

  const autocomplete = new google.maps.places.Autocomplete(addressInput, {
    fields: ["formatted_address", "geometry", "name"],
    types: ["address"]
  });

  autocomplete.addListener("place_changed", () => {
    __selectedPlace = autocomplete.getPlace();
    // Do NOT update map here
  });

  addressInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      updateDealershipMapFromAddress(addressInput.value);
    }
  });

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
   Page navigation
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
   Wiring / Event delegation
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();

  // Autosave + remove inline warnings as user fixes fields
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!isTextLike(t)) return;

    saveField(t);

    if (t.tagName === "SELECT"){
      refreshGhostSelects(t.closest(".page-section") || document);
    }

    // Support-ticket inline cleanup
    if (t.closest("#support-tickets")){
      clearInlineWarningFor(t);
    }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!isTextLike(t)) return;

    saveField(t);

    if (t.tagName === "SELECT"){
      refreshGhostSelects(t.closest(".page-section") || document);
    }

    if (t.classList.contains("ticket-status-select")){
      handleSupportTicketStatusChange(t);
    }
  });

  // Reset This Page buttons
  qsa(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = btn.closest(".page-section");
      clearSection(sec);
    });
  });

  // Clear All
  const clearAllBtn = qs("#clearAllBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

  // Click delegation (add-row + tickets)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.classList.contains("add-ticket-btn")){
      e.preventDefault();
      handleSupportTicketAdd(btn);
      return;
    }

    if (btn.classList.contains("add-row") && btn.closest(".table-footer")){
      e.preventDefault();
      cloneTableRow(btn);
      return;
    }

    if (btn.classList.contains("add-row") && btn.closest(".checklist-row.integrated-plus")){
      e.preventDefault();
      cloneIntegratedRow(btn);
      return;
    }
  });

  // Menu/nav buttons
  qsa(".nav-btn[data-target]").forEach(btn => {
    btn.addEventListener("click", () => setActivePage(btn.dataset.target));
  });

  refreshGhostSelects();
});

/* Needed for Google Maps callback */
window.initAddressAutocomplete = initAddressAutocomplete;
