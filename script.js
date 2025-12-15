/* =========================================================
   myKaarma Interactive Training Checklist — FULL script.js
   CLEAN + FIXED
   Includes:
   - Autosave (localStorage)
   - Reset This Page + Clear All
   - Add Row buttons (tables + integrated-plus)
   - Support Tickets:
       * Base card stays in Open, status locked to Open
       * Add card ONLY when all fields complete
       * Inline errors snug under correct field
       * Added cards get numbered badge (1,2,3...) and can move by status
   - Google Maps Places Autocomplete + map update (no “search as you type”)
   - Nav buttons (menu)
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
   Select “ghost” text styling
   (only for non-table selects)
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

  // Force base support ticket status locked to Open (always)
  lockBaseSupportTicketStatus();

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

  refreshGhostSelects(sectionEl);
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

  qsa("input, textarea, select", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });

  tbody.appendChild(clone);
  refreshGhostSelects(clone);
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
let __ticketCounter = 0;

function lockBaseSupportTicketStatus(){
  const base = qs('#support-tickets .ticket-group[data-base="true"]');
  if (!base) return;

  const sel = qs(".ticket-status-select", base);
  if (sel){
    sel.value = "Open";
    sel.disabled = true;
    sel.classList.add("is-locked");
  }
}

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
    // Clear base fields (ticket #, zendesk, summary) — keep status Open locked
    qsa("input, textarea", base).forEach(el => { el.value = ""; });
    clearTicketErrors(base);
    openWrap.appendChild(base);
    lockBaseSupportTicketStatus();
  }

  if (tierWrap) tierWrap.innerHTML = "";
  if (resolvedWrap) resolvedWrap.innerHTML = "";
  if (featureWrap) featureWrap.innerHTML = "";

  __ticketCounter = 0;
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

function validateBaseTicketCard(baseCard){
  clearTicketErrors(baseCard);

  const ticketNumberInput = qs(".ticket-number-input", baseCard);
  const zendeskInput = qs(".ticket-zendesk-input", baseCard);
  const summary = qs(".ticket-summary-input", baseCard);

  let ok = true;

  // Ticket number
  if (!ticketNumberInput || !ticketNumberInput.value.trim()){
    ok = false;
    ticketNumberInput?.classList.add("field-error");
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
  return {
    ticketNumber: (qs(".ticket-number-input", card)?.value || "").trim(),
    status: (qs(".ticket-status-select", card)?.value || "Open"),
    zendeskLink: (qs(".ticket-zendesk-input", card)?.value || "").trim(),
    summary: (qs(".ticket-summary-input", card)?.value || "").trim()
  };
}

function writeTicketCardData(card, data){
  const num = qs(".ticket-number-input", card);
  const status = qs(".ticket-status-select", card);
  const link = qs(".ticket-zendesk-input", card);
  const sum = qs(".ticket-summary-input", card);

  if (num) num.value = data.ticketNumber || "";
  if (status) status.value = data.status || "Open";
  if (link) link.value = data.zendeskLink || "";
  if (sum) sum.value = data.summary || "";
}

function setTicketCardNonBase(card){
  card.removeAttribute("data-base");

  // Remove + button (added cards should not have it)
  qs(".add-ticket-btn", card)?.remove();

  // Remove disclaimer on added cards
  qs(".ticket-disclaimer", card)?.remove();

  // Enable status on non-base cards
  const status = qs(".ticket-status-select", card);
  if (status){
    status.disabled = false;
    status.classList.remove("is-locked");
  }
}

function addTicketBadge(card){
  __ticketCounter += 1;
  const badge = document.createElement("div");
  badge.className = "ticket-count-badge";
  badge.textContent = String(__ticketCounter);
  card.insertAdjacentElement("afterbegin", badge);
  card.classList.add("has-badge");
}

function getTicketsContainerForStatus(status){
  const openWrap = qs("#openTicketsContainer");
  const tierWrap = qs("#tierTwoTicketsContainer");
  const resolvedWrap = qs("#closedResolvedTicketsContainer");
  const featureWrap = qs("#closedFeatureTicketsContainer");

  if (status === "Tier Two") return tierWrap || openWrap;
  if (status === "Closed - Resolved") return resolvedWrap || openWrap;
  if (status === "Closed - Feature Not Supported") return featureWrap || openWrap;
  return openWrap;
}

function moveTicketCardToStatusContainer(card){
  const statusSelect = qs(".ticket-status-select", card);
  const status = statusSelect ? statusSelect.value : "Open";
  const dest = getTicketsContainerForStatus(status);
  if (dest) dest.appendChild(card);
}

function handleSupportTicketAdd(btn){
  const baseCard = btn.closest('.ticket-group[data-base="true"]');
  if (!baseCard) return;

  if (!validateBaseTicketCard(baseCard)) return;

  const data = readTicketCardData(baseCard);

  // Clone, convert to non-base, badge, move
  const newCard = baseCard.cloneNode(true);
  setTicketCardNonBase(newCard);
  clearTicketErrors(newCard);
  addTicketBadge(newCard);

  // New cards start in Open by default
  const statusSel = qs(".ticket-status-select", newCard);
  if (statusSel) statusSel.value = "Open";

  writeTicketCardData(newCard, data);
  moveTicketCardToStatusContainer(newCard);

  // Clear base for next entry (keep locked status Open)
  qsa("input, textarea", baseCard).forEach(el => { el.value = ""; });
  clearTicketErrors(baseCard);
  lockBaseSupportTicketStatus();
}

function handleSupportTicketStatusChange(selectEl){
  const card = selectEl.closest(".ticket-group");
  if (!card) return;

  // Base never moves
  if (card.dataset && card.dataset.base === "true"){
    selectEl.value = "Open";
    lockBaseSupportTicketStatus();
    return;
  }

  moveTicketCardToStatusContainer(card);
}

function supportTicketLiveCleanup(el){
  if (!el.closest("#support-tickets")) return;

  // Clear field error
  el.classList.remove("field-error");

  // Remove warning directly after the input/textarea
  const next = el.nextElementSibling;
  if (next && next.classList.contains("field-warning")) next.remove();

  // Ticket number warning lives after the wrap
  if (el.classList.contains("ticket-number-input")){
    const wrap = qs(".ticket-number-wrap", el.closest(".ticket-group"));
    const w = wrap?.nextElementSibling;
    if (w && w.classList.contains("field-warning")) w.remove();
  }
}

/* ---------------------------
   Google Maps Places Autocomplete
--------------------------- */
let __selectedPlace = null;

function initAddressAutocomplete(){
  const addressInput =
    qs("#dealership-info input.address-input") ||
    qs("#dealership-info input[type='text']");

  if (!addressInput || !window.google || !google.maps || !google.maps.places) return;

  const autocomplete = new google.maps.places.Autocomplete(addressInput, {
    fields: ["formatted_address", "geometry", "name"],
    types: ["address"]
  });

  autocomplete.addListener("place_changed", () => {
    __selectedPlace = autocomplete.getPlace();
    // DO NOT update map here (prevents “searching as you type”)
  });

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
   Page navigation
--------------------------- */
function setActivePage(sectionId){
  const id = (sectionId || "").replace("#", "");
  const target = document.getElementById(id);

  // If target doesn't exist, do NOT blank the app
  if (!target){
    console.warn("[Nav] No page-section found with id:", id);
    return;
  }

  document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
  target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const navBtn = document.querySelector(`.nav-btn[data-target="${id}"]`);
  if (navBtn) navBtn.classList.add("active");
}
function initOnsiteTrainingDates() {
  const start = document.getElementById("onsiteStartDate");
  const end = document.getElementById("onsiteEndDate");
  if (!start || !end) return;

  // Turns a text input into a date picker on focus (keeps placeholder behavior)
  const attachPickerBehavior = (el) => {
    el.addEventListener("focus", () => {
      // Switch to date so browser shows calendar picker
      if (el.type !== "date") el.type = "date";
      // Open picker when supported (Chrome)
      if (typeof el.showPicker === "function") {
        try { el.showPicker(); } catch (e) {}
      }
    });

    el.addEventListener("blur", () => {
      // If empty, switch back to text so placeholder shows
      if (!el.value) el.type = "text";
      updateGhostState(el);
    });

    el.addEventListener("change", () => {
      updateGhostState(el);
    });

    // initial state
    if (!el.value) el.type = "text";
    updateGhostState(el);
  };

  const updateGhostState = (el) => {
    if (!el.value) el.classList.add("is-placeholder");
    else el.classList.remove("is-placeholder");
  };

  const addDaysISO = (isoDateStr, days) => {
    // isoDateStr = "YYYY-MM-DD"
    const [y, m, d] = isoDateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  attachPickerBehavior(start);
  attachPickerBehavior(end);

  // Auto-set End = Start + 2 days whenever Start changes
  start.addEventListener("change", () => {
    if (!start.value) return;

    const autoEnd = addDaysISO(start.value, 2);
    end.value = autoEnd;

    // Keep end as a date input once it has a value
    end.type = "date";
    updateGhostState(end);
  });

  // End remains editable; just update ghost style when edited
  end.addEventListener("input", () => updateGhostState(end));
}

/* ---------------------------
   Wiring / Event delegation
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();

  /* Autosave + ghost selects + support ticket live cleanup */
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!isTextLike(t)) return;

    saveField(t);

    if (t.closest("#support-tickets")) supportTicketLiveCleanup(t);
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

  /* Reset This Page buttons */
  qsa(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = btn.closest(".page-section");
      clearSection(sec);
    });
  });

  /* Clear All button */
  const clearAllBtn = qs("#clearAllBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);

  /* Click delegation: support ticket add + row add */
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

  /* Nav buttons */
  qsa(".nav-btn[data-target]").forEach(btn => {
    btn.addEventListener("click", () => setActivePage(btn.dataset.target));
  });

  // Ensure base support ticket status stays locked Open
  lockBaseSupportTicketStatus();

  refreshGhostSelects();
});

/* Needed for Google Maps callback */
window.initAddressAutocomplete = initAddressAutocomplete;
