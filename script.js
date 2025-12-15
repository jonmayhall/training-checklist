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
   Date ghost / placeholder (for type="date")
   ✅ makes empty dates look like placeholders (grey)
--------------------------- */
function refreshDateGhost(root = document){
  qsa('input[type="date"]', root).forEach(inp => {
    const isEmpty = !inp.value;
    inp.classList.toggle("is-placeholder", isEmpty);
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
   Clear / Reset helpers
   ✅ also removes cloned rows/cards
--------------------------- */
function resetTablesInSection(section){
  qsa("table", section).forEach(table => {
    const tbody = table.tBodies?.[0];
    if (!tbody) return;

    // remove cloned rows we add (we tag them)
    qsa("tr[data-clone='true']", tbody).forEach(tr => tr.remove());

    // clear base rows
    qsa("tr", tbody).forEach(tr => {
      qsa("input, select, textarea", tr).forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
      });
    });
  });
}

function resetIntegratedRowsInSection(section){
  // Remove cloned checklist rows that were created by "+" (we tag them)
  qsa(".checklist-row[data-clone='true']", section).forEach(r => r.remove());
}

function clearTicketWarnings(baseCard){
  qsa(".field-warning", baseCard).forEach(n => n.remove());
  qsa(".field-error", baseCard).forEach(el => el.classList.remove("field-error"));
}

function resetSupportTicketsInSection(section){
  if (!section || section.id !== "support-tickets") return;

  // remove all non-base cards in every container
  qsa(".ticket-group", section).forEach(card => {
    if (card.dataset.base === "true") return;
    card.remove();
  });

  // reset base card values + warnings
  const base = qs(".ticket-group[data-base='true']", section);
  if (base){
    clearTicketWarnings(base);

    qsa("input, textarea, select", base).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });

    // base status should remain locked/disabled (as in your HTML)
    const status = qs(".ticket-status-select", base);
    if (status){
      status.value = "Open";
      status.disabled = true;
      status.classList.add("is-locked");
    }
  }

  // reset ticket badge counter
  ticketCount = 0;
}

function resetAdditionalPOCCardsInSection(section){
  // Looks for mini-card.additional-poc-card and removes cloned cards (we tag them)
  qsa(".additional-poc-card[data-clone='true']", section).forEach(card => card.remove());

  // Clear fields in base additional POC cards
  qsa(".additional-poc-card[data-base='true']", section).forEach(base => {
    qsa("input, textarea, select", base).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });
  });
}

function resetDynamicInSection(section){
  resetTablesInSection(section);
  resetIntegratedRowsInSection(section);
  resetAdditionalPOCCardsInSection(section);
  resetSupportTicketsInSection(section);

  refreshGhostSelects(section);
  refreshDateGhost(section);
}

function clearSection(section){
  // clear stored values for elements WITH a key
  qsa("input, textarea, select", section).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    saveField(el);
  });

  // ✅ remove cloned/dynamic items too
  resetDynamicInSection(section);
}

function clearAll(){
  localStorage.removeItem(STORAGE_KEY);

  qsa(".page-section").forEach(sec => {
    qsa("input, textarea, select", sec).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });

    // ✅ remove cloned/dynamic items too
    resetDynamicInSection(sec);
  });

  refreshGhostSelects();
  refreshDateGhost();
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
  refreshDateGhost(clone);
}

function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row");
  if (!row || !row.parentElement) return;

  const clone = row.cloneNode(true);
  clone.dataset.clone = "true";
  resetClonedFields(clone);
  clone.querySelector(".add-row")?.remove();

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
  clone.dataset.clone = "true";
  resetClonedFields(clone);
  clone.querySelector(".add-row")?.remove();

  container.appendChild(clone);
}

/* ---------------------------
   Additional POC — ADD ENTIRE NEW CARD (not a line)
   ✅ clones the whole .additional-poc-card
--------------------------- */
function handleAdditionalPOCAdd(btn){
  const baseCard = btn.closest(".additional-poc-card[data-base='true']");
  if (!baseCard) return;

  const clone = baseCard.cloneNode(true);
  clone.dataset.base = ""; // remove base flag
  clone.removeAttribute("data-base");
  clone.dataset.clone = "true";

  // clear cloned card fields
  resetClonedFields(clone);

  // remove any + button inside cloned cards (your CSS hides it, but this makes it bulletproof)
  clone.querySelector(".add-row")?.remove();
  clone.querySelector(".additional-poc-add")?.remove();

  // place after the base card in the same grid/parent
  baseCard.parentElement?.insertBefore(clone, baseCard.nextSibling);
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
    refreshDateGhost(end.closest(".page-section") || document);
  });

  start.addEventListener("input", () => {
    if (!start.value || end.dataset.userEdited === "1") return;
    end.value = addDaysISO(start.value, 2);
    saveField(end);
    refreshDateGhost(end.closest(".page-section") || document);
  });
}

/* ---------------------------
   Support Tickets
   ✅ warnings + moving cards by status
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
  if (status === "Open") return qs("#openTicketsContainer");
  if (status === "Tier Two") return qs("#tierTwoTicketsContainer");
  if (status === "Closed - Resolved") return qs("#closedResolvedTicketsContainer");
  if (status === "Closed - Feature Not Supported") return qs("#closedFeatureTicketsContainer");
  return qs("#openTicketsContainer");
}

function moveTicketCardToStatus(card, status){
  const target = getTicketContainerByStatus(status);
  if (!target) return;

  // keep select value synced
  const sel = qs(".ticket-status-select", card);
  if (sel) sel.value = status;

  target.appendChild(card);
}

function setTicketFieldWarning(fieldEl, msg){
  const row = fieldEl.closest(".ticket-row") || fieldEl.parentElement;
  if (!row) return;

  // remove existing warning in this row
  qsa(".field-warning", row).forEach(n => n.remove());

  const warn = document.createElement("p");
  warn.className = "field-warning";
  warn.textContent = msg;

  // place right after the field so it sits directly under it
  if (fieldEl.classList.contains("ticket-number-wrap")){
    fieldEl.insertAdjacentElement("afterend", warn);
  } else {
    fieldEl.insertAdjacentElement("afterend", warn);
  }
}

function validateBaseTicketCard(base){
  clearTicketWarnings(base);

  const numWrap = qs(".ticket-number-wrap", base);
  const num = qs(".ticket-number-input", base);
  const link = qs(".ticket-zendesk-input", base);
  const sum = qs(".ticket-summary-input", base);

  let ok = true;

  // Ticket Number
  if (!num?.value?.trim()){
    ok = false;
    num?.classList.add("field-error");
    if (numWrap) setTicketFieldWarning(numWrap, "Required");
  }

  // Zendesk URL
  if (!link?.value?.trim()){
    ok = false;
    link?.classList.add("field-error");
    setTicketFieldWarning(link, "Required");
  }

  // Summary
  if (!sum?.value?.trim()){
    ok = false;
    sum?.classList.add("field-error");
    setTicketFieldWarning(sum, "Required");
  }

  return ok;
}

function handleAddTicket(btn){
  const base = btn.closest(".ticket-group[data-base='true']");
  if (!base) return;

  // ✅ show red warnings under each missing field
  if (!validateBaseTicketCard(base)) return;

  const clone = base.cloneNode(true);
  clone.removeAttribute("data-base");

  // remove + and disclaimer from cloned cards
  clone.querySelector(".add-ticket-btn")?.remove();
  clone.querySelector(".ticket-disclaimer")?.remove();

  // ✅ unlock status on cloned cards
  const status = qs(".ticket-status-select", clone);
  if (status){
    status.disabled = false;
    status.classList.remove("is-locked");
  }

  // cleanup any warnings/errors carried into the clone
  clearTicketWarnings(clone);

  addTicketBadge(clone);

  // default status for new cards should be Open
  if (status) status.value = "Open";
  qs("#openTicketsContainer")?.appendChild(clone);

  // reset base fields
  const num = qs(".ticket-number-input", base);
  const link = qs(".ticket-zendesk-input", base);
  const sum = qs(".ticket-summary-input", base);
  if (num) num.value = "";
  if (link) link.value = "";
  if (sum) sum.value = "";

  clearTicketWarnings(base);
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

/* ---------------------------
   DOM READY
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  try{
    initNavigation();
    loadAll();
    initTrainingDates();
    refreshGhostSelects();
    refreshDateGhost(); // ✅ make empty dates look like placeholders on load
  } catch (err){
    console.error("Init error:", err);
  }

  // autosave on input/change
  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);
  });

  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects();
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);

    // ✅ Support ticket status move (ONLY non-base cards)
    const sel = e.target.closest(".ticket-status-select");
    if (sel){
      const card = sel.closest(".ticket-group");
      if (!card) return;
      if (card.dataset.base === "true") return; // don't move base
      moveTicketCardToStatus(card, sel.value);
      return;
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

    // ✅ Additional POC: add ENTIRE NEW CARD
    if (btn.classList.contains("additional-poc-add")){
      handleAdditionalPOCAdd(btn);
      return;
    }

    // "+" buttons (integrated rows and tables)
    if (btn.classList.contains("add-row")){
      // ✅ table add-row
      const table = btn.closest(".table-container")?.querySelector("table");
      if (table && table.tBodies?.[0]){
        const tbody = table.tBodies[0];
        const last = tbody.rows[tbody.rows.length - 1];
        if (!last) return;

        const clone = last.cloneNode(true);
        clone.dataset.clone = "true";

        // clear fields in cloned table row
        qsa("input, select, textarea", clone).forEach(el => {
          if (el.type === "checkbox") el.checked = false;
          else if (el.tagName === "SELECT") el.selectedIndex = 0;
          else el.value = "";
        });

        tbody.appendChild(clone);
        refreshGhostSelects(clone);
        refreshDateGhost(clone);
        return;
      }

      // non-table add-row
      if (btn.closest("#trainers-deployment")){
        handleTrainerAdd(btn);
      } else {
        cloneIntegratedRow(btn);
      }
      return;
    }

    // support tickets "+"
    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }
  });
});
