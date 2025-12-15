/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (Includes: autosave, Reset Page, Clear All, Add Row buttons,
    Support Tickets: add card only when complete + inline errors
    + status-based moving, Google Maps Places Autocomplete + map update)
   ========================================================= */

/* ---------------------------
   Helpers
--------------------------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function isTextLike(el){
  return el && (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
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

  // Fallback: use a DOM path (good enough for your static layout)
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
    // ignore buttons
    if (!isTextLike(el)) return;
    const k = getFieldKey(el);
    if (!k) return;
    if (data[k] !== undefined) setFieldValue(el, data[k]);
  });

  // After load: apply placeholder styling for selects (non-table)
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

  // Also clear support ticket dynamic cards if the section is support-tickets
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
    // Never ghost-color in tables
    if (sel.closest(".training-table")) return;

    const opt = sel.options[sel.selectedIndex];
    const isGhost = !sel.value && opt && opt.dataset && opt.dataset.ghost === "true";
    sel.classList.toggle("is-placeholder", !!isGhost);
  });
}

/* ---------------------------
   Add Row buttons
   - table footer "+" duplicates last row
   - integrated-plus "+" duplicates that row (non-table)
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

  // clear inputs/selects/checkboxes in clone
  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });

  tbody.appendChild(clone);

  // Autosave keys change because DOM path changes; save will happen on next input.
}

function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row.integrated-plus");
  if (!row) return;

  // If this row is inside an "Additional POC" mini-card system or similar,
  // you probably want to clone the whole mini-card. We'll detect that:
  const miniCard = row.closest(".mini-card");
  const isAdditionalPOC = miniCard && miniCard.classList.contains("additional-poc-card");

  if (isAdditionalPOC){
    const baseCard = miniCard;
    const clone = baseCard.cloneNode(true);

    // New card should NOT be base
    clone.removeAttribute("data-base");

    // clear fields in clone
    qsa("input, textarea, select", clone).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // insert after base card
    baseCard.parentElement.insertBefore(clone, baseCard.nextElementSibling);
    refreshGhostSelects(clone);
    return;
  }

  // Default: clone just the row and remove the "+" button in the clone
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

  // Keep ONLY the base card in Open container
  const base = openWrap.querySelector('.ticket-group[data-base="true"]');
  openWrap.innerHTML = "";
  if (base){
    // Clear base fields
    qsa("input, textarea, select", base).forEach(el => {
      if (!isTextLike(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else {
        // reset status to Open if present
        if (el.classList.contains("ticket-status-select")) el.value = "Open";
        else el.value = "";
      }
    });
    // Remove any warnings/errors
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
  // targetEl: input OR wrapper like .ticket-number-wrap
  if (!targetEl) return;

  // Remove existing warning right after this element (if present)
  const next = targetEl.nextElementSibling;
  if (next && next.classList.contains("field-warning")) next.remove();

  const warn = document.createElement("div");
  warn.className = "field-warning";
  warn.textContent = msg;
  targetEl.insertAdjacentElement("afterend", warn);
}

function validateBaseTicketCard(baseCard){
  // Required fields: ticket number, zendesk link, summary
  clearTicketErrors(baseCard);

  const ticketNumberInput = qs(".ticket-number-input", baseCard);
const zendeskInput = qs(".ticket-zendesk-input", baseCard);
    .find(i => (i.placeholder || "").toLowerCase().includes("zendesk ticket url")) || null;
  const summary = qs(".ticket-summary-input", baseCard);

  let ok = true;

  // Ticket number
  if (!ticketNumberInput || !ticketNumberInput.value.trim()){
    ok = false;
    ticketNumberInput?.classList.add("field-error");
    // Put warning directly under the textbox area (.ticket-number-wrap is the visible group)
    const wrap = qs(".ticket-number-wrap", baseCard);
    ensureWarningUnder(wrap || ticketNumberInput, "Ticket number is required.");
  }

  // Zendesk link
  if (!zendeskInput || !zendeskInput.value.trim()){
    ok = false;
    zendeskInput?.classList.add("field-error");
    ensureWarningUnder(zendeskInput, "Zendesk link is required.");
  }

  // Summary
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
  const zendeskInput = qsa('input[type="text"]', card)
    .find(i => (i.placeholder || "").toLowerCase().includes("zendesk ticket url")) || null;
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
  const zendeskInput = qsa('input[type="text"]', card)
    .find(i => (i.placeholder || "").toLowerCase().includes("zendesk ticket url")) || null;
  const summary = qs(".ticket-summary-input", card);

  if (ticketNumberInput) ticketNumberInput.value = data.ticketNumber || "";
  if (statusSelect) statusSelect.value = data.status || "Open";
  if (zendeskInput) zendeskInput.value = data.zendeskLink || "";
  if (summary) summary.value = data.summary || "";

  refreshGhostSelects(card);
}

function setTicketCardNonBase(card){
  card.removeAttribute("data-base");
  // Remove the + button from non-base cards (if present)
  const addBtn = qs(".add-ticket-btn", card);
  if (addBtn) addBtn.remove();

  // Ticket number input should become full width if your CSS expects it;
  // your CSS already handles non-base by selector, so just keep the class.
}

function getTicketsContainerForStatus(status){
  // Match your exact option values
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

  // Validate base card complete
  const ok = validateBaseTicketCard(baseCard);
  if (!ok) return;

  // Capture data from base
  const data = readTicketCardData(baseCard);

  // Create a NEW card with this data
  const newCard = baseCard.cloneNode(true);
  setTicketCardNonBase(newCard);
  clearTicketErrors(newCard);
  writeTicketCardData(newCard, data);

  // Place new card into the correct status column
  moveTicketCardToStatusContainer(newCard);

  // Clear base card for next entry
  qsa("input, textarea", baseCard).forEach(el => { el.value = ""; });
  const status = qs(".ticket-status-select", baseCard);
  if (status) status.value = "Open";
  clearTicketErrors(baseCard);
  refreshGhostSelects(baseCard);
}

/* When a ticket status changes, move that card to the correct column */
function handleSupportTicketStatusChange(selectEl){
  const card = selectEl.closest(".ticket-group");
  if (!card) return;

  // Base card always stays in Open
  const isBase = card.dataset && card.dataset.base === "true";
  if (isBase){
    // Force base status back to Open so it doesn't jump columns
    selectEl.value = "Open";
    return;
  }

  moveTicketCardToStatusContainer(card);
}

/* ---------------------------
   Google Maps Places Autocomplete
   - Autocomplete suggestions can show as you type,
     but we do NOT update your map while typing.
   - Map updates only on:
       1) clicking the small MAP button, or
       2) pressing Enter in the address field
--------------------------- */
let __selectedPlace = null;

function initAddressAutocomplete(){
  const addressInput = qs("#dealership-info input[type='text']"); // best-effort
  if (!addressInput || !window.google || !google.maps || !google.maps.places) return;

  const autocomplete = new google.maps.places.Autocomplete(addressInput, {
    fields: ["formatted_address", "geometry", "name"],
    types: ["address"]
  });

  autocomplete.addListener("place_changed", () => {
    __selectedPlace = autocomplete.getPlace();
    // Do NOT update map here (prevents “searching as you type” effect)
  });

  // Enter key updates map
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

  // Simple Google Maps embed search (no geocoding request needed)
  iframe.src = `https://www.google.com/maps?q=${q}&output=embed`;
}

/* ---------------------------
   Page navigation (if you use nav buttons)
   - Keeps “active” section in view
--------------------------- */
function setActivePage(sectionId){
  qsa(".page-section").forEach(sec => sec.classList.remove("active"));
  const target = qs(sectionId.startsWith("#") ? sectionId : `#${sectionId}`);
  if (target) target.classList.add("active");

  qsa(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const navBtn = qs(`.nav-btn[data-target="${sectionId.replace("#","")}"]`);
  if (navBtn) navBtn.classList.add("active");
}

/* ---------------------------
   Wiring / Event delegation
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();

  // Autosave
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!isTextLike(t)) return;
    saveField(t);

    // live ghost-select styling
    if (t.tagName === "SELECT") refreshGhostSelects(t.closest(".page-section") || document);
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!isTextLike(t)) return;
    saveField(t);

    if (t.tagName === "SELECT") refreshGhostSelects(t.closest(".page-section") || document);

    // Support ticket status change
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

  // Clear All button (sidebar)
  const clearAllBtn = qs("#clearAllBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

  // Add row buttons (tables + integrated-plus + support tickets)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // Support ticket add (+)
    if (btn.classList.contains("add-ticket-btn")){
      e.preventDefault();
      handleSupportTicketAdd(btn);
      return;
    }

    // Table footer add-row
    if (btn.classList.contains("add-row") && btn.closest(".table-footer")){
      e.preventDefault();
      cloneTableRow(btn);
      return;
    }

    // Integrated-plus add-row (non-table)
    if (btn.classList.contains("add-row") && btn.closest(".checklist-row.integrated-plus")){
      e.preventDefault();
      cloneIntegratedRow(btn);
      return;
    }
  });

  // Optional: nav buttons (if you use data-target)
  qsa(".nav-btn[data-target]").forEach(btn => {
    btn.addEventListener("click", () => setActivePage(btn.dataset.target));
  });

  // Support tickets: ensure base card disclaimer warning cleanup as user types
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.closest("#support-tickets")) return;

    // If user starts fixing a field, remove its warning immediately
    if (el.classList.contains("ticket-number-input")){
      el.classList.remove("field-error");
      const wrap = qs(".ticket-number-wrap", el.closest(".ticket-group"));
      if (wrap){
        const next = wrap.nextElementSibling;
        if (next && next.classList.contains("field-warning")) next.remove();
      }
    }

    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA"){
      el.classList.remove("field-error");
      const next = el.nextElementSibling;
      if (next && next.classList.contains("field-warning")) next.remove();
    }
  });

  refreshGhostSelects();
});

/* Needed for Google Maps callback */
window.initAddressAutocomplete = initAddressAutocomplete;
