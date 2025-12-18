/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (Autosave + nav + ghost placeholders + cloning + support tickets
    + dealership map)
   UPDATES:
   - Support ticket badge numbers are PERSISTENT (do not renumber by status)
   - Add Ticket copies base card values into new card, then clears base inputs
   - Ticket ID counter stored in localStorage for persistence across reloads
   - Reset This Page on Support Tickets resets ticket counter
   ======================================================= */

/* ---------------------------
   Tiny helpers
--------------------------- */
const qs  = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function isField(el){
  if (!el) return false;
  const tag = el.tagName;
  return (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA");
}

function getFieldKey(el){
  if (el.id) return `mkc:${el.id}`;
  if (el.name) return `mkc:${el.name}`;
  const dk = el.getAttribute("data-key");
  if (dk) return `mkc:${dk}`;

  const sec = el.closest(".page-section");
  const secId = sec?.id || "unknown";
  const all = qsa("input, select, textarea", sec || document);
  const idx = Math.max(0, all.indexOf(el));
  return `mkc:${secId}:field:${idx}`;
}

function setSelectByValue(selectEl, val){
  if (!selectEl) return;
  const opt = Array.from(selectEl.options).find(o => o.value === val || o.text === val);
  selectEl.value = opt ? opt.value : "";
}

/* ---------------------------
   Save / Load
--------------------------- */
function saveField(el){
  try{
    const key = getFieldKey(el);
    if (el.type === "checkbox") {
      localStorage.setItem(key, el.checked ? "1" : "0");
      return;
    }
    localStorage.setItem(key, el.value ?? "");
  } catch (_) {}
}

function loadField(el){
  try{
    const key = getFieldKey(el);
    const val = localStorage.getItem(key);
    if (val === null) return;

    if (el.type === "checkbox"){
      el.checked = (val === "1");
      return;
    }
    if (el.tagName === "SELECT"){
      setSelectByValue(el, val);
      return;
    }
    el.value = val;
  } catch (_) {}
}

function loadAll(root=document){
  qsa("input, select, textarea", root).forEach(loadField);
  refreshGhostSelects(root);
  refreshDateGhost(root);
  ensureTicketIds();          // ✅ make sure all existing cards have permanent IDs
  refreshTicketBadges();      // ✅ show those IDs
}

/* ---------------------------
   Clear logic
--------------------------- */
function clearSection(sectionEl){
  if (!sectionEl) return;

  // Remove cloned table rows
  qsa("tr[data-clone='true'], tr[data-clone='1'], tr[data-clone='yes']", sectionEl)
    .forEach(tr => tr.remove());

  // Remove cloned blocks/cards
  qsa("[data-clone='true'], [data-clone='1']", sectionEl).forEach(node => node.remove());

  // Reset fields + storage
  qsa("input, select, textarea", sectionEl).forEach(el => {
    try{ localStorage.removeItem(getFieldKey(el)); } catch(_){}

    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  // ✅ If clearing Support Tickets page, reset ticket counter too
  if (sectionEl.id === "support-tickets"){
    try{ localStorage.removeItem("mkc:ticketCounter"); } catch(_){}
  }

  refreshGhostSelects(sectionEl);
  refreshDateGhost(sectionEl);
  refreshTicketBadges();
}

function clearAll(){
  if (!confirm("Clear ALL saved data for this checklist?")) return;

  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("mkc:")) localStorage.removeItem(k);
  });

  qsa(".page-section").forEach(clearSection);
}

/* ---------------------------
   Navigation
--------------------------- */
function showSectionById(id){
  const target = qs(`#${CSS.escape(id)}`);
  if (!target) return;

  qsa(".page-section").forEach(sec => sec.classList.remove("active"));
  target.classList.add("active");

  qsa(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = qsa(".nav-btn").find(b => (b.dataset.target || b.getAttribute("data-target")) === id);
  if (activeBtn) activeBtn.classList.add("active");

  try{
    const main = qs("main");
    (main || window).scrollTo({ top: 0, behavior: "smooth" });
  } catch(_) {}
}

function initNavigation(){
  qsa(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.target || btn.getAttribute("data-target");
      if (!id) return;
      showSectionById(id);
      history.replaceState(null, "", `#${id}`);
    });
  });

  const hash = (location.hash || "").replace("#", "");
  if (hash && qs(`#${CSS.escape(hash)}`)){
    showSectionById(hash);
  } else {
    const first = qs(".nav-btn");
    const id = first?.dataset.target || first?.getAttribute("data-target");
    if (id) showSectionById(id);
    else qs(".page-section")?.classList.add("active");
  }

  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace("#", "");
    if (h) showSectionById(h);
  });
}

/* ---------------------------
   Ghost placeholders
--------------------------- */
function refreshGhostSelects(root=document){
  qsa("select", root).forEach(sel => {
    if (sel.closest(".training-table")) {
      sel.classList.remove("is-placeholder");
      return;
    }
    const first = sel.options?.[0];
    const isGhost = first?.dataset?.ghost === "true";
    const empty = (sel.value === "" || (sel.selectedIndex === 0 && isGhost));
    if (isGhost && empty) sel.classList.add("is-placeholder");
    else sel.classList.remove("is-placeholder");
  });
}

function refreshDateGhost(root=document){
  qsa("input[type='date']", root).forEach(inp => {
    if (!inp.value) inp.classList.add("is-placeholder");
    else inp.classList.remove("is-placeholder");
  });
}

function updateDealershipMap(address){
  const frame =
    qs("#dealershipMapFrame") ||
    qs("#dealership-address-card .map-frame") ||
    qs("#dealership-address-card iframe.map-frame") ||
    qs(".map-frame");

  if (!frame) return;

  const q = encodeURIComponent((address || "").trim());
  if (!q) return;

  frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
}

/* ---------------------------
   Integrated “+” row cloning (non-table)
--------------------------- */
function cloneIntegratedRow(btn){
  const row = btn.closest(".checklist-row");
  if (!row) return;

  const clone = row.cloneNode(true);
  clone.dataset.clone = "true";

  const plus = qs(".add-row", clone);
  if (plus) plus.remove();

  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
    if (el.id) el.removeAttribute("id");
    if (el.name) el.removeAttribute("name");
  });

  row.insertAdjacentElement("afterend", clone);
  refreshGhostSelects(clone);
  refreshDateGhost(clone);
}

function handleTrainerAdd(btn){
  cloneIntegratedRow(btn);
}

function handleAdditionalPOCAdd(btn){
  const card = btn.closest(".mini-card") || btn.closest(".section-block");
  if (!card) return;

  const clone = card.cloneNode(true);
  clone.dataset.clone = "true";
  clone.dataset.base = "false";

  qsa(".additional-poc-add, .add-row", clone).forEach(b => b.remove());

  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
    if (el.id) el.removeAttribute("id");
    if (el.name) el.removeAttribute("name");
  });

  card.insertAdjacentElement("afterend", clone);
  refreshGhostSelects(clone);
  refreshDateGhost(clone);
}

/* ---------------------------
   Support tickets — persistent numbering
--------------------------- */
function getStatusContainerId(status){
  const s = (status || "").toLowerCase();
  if (s.includes("tier") || s.includes("t2") || s.includes("tier 2")) return "tierTwoTicketsContainer";
  if (s.includes("feature")) return "closedFeatureTicketsContainer";
  if (s.includes("closed") || s.includes("resolved")) return "closedResolvedTicketsContainer";
  return "openTicketsContainer";
}

function getNextTicketId(){
  const key = "mkc:ticketCounter";
  let n = 0;
  try{ n = parseInt(localStorage.getItem(key) || "0", 10) || 0; } catch(_){}
  n += 1;
  try{ localStorage.setItem(key, String(n)); } catch(_){}
  return String(n);
}

function ensureTicketIds(){
  const allCards = qsa(".ticket-group");
  allCards.forEach(card => {
    if (card.dataset.base === "true") return; // base card never gets an ID badge
    if (!card.dataset.ticketId){
      card.dataset.ticketId = getNextTicketId(); // ✅ permanent ID assigned once
    }
  });
}

function refreshTicketBadges(){
  // Make sure every non-base card has an ID
  ensureTicketIds();

  const allCards = qsa(".ticket-group");

  // Remove any badge from base cards
  allCards
    .filter(c => c.dataset.base === "true")
    .forEach(baseCard => {
      const b = qs(".ticket-count-badge", baseCard);
      if (b) b.remove();
      baseCard.classList.remove("has-badge");
    });

  // For non-base cards, show THEIR permanent ID (not renumbered by container)
  allCards
    .filter(c => c.dataset.base !== "true")
    .forEach(card => {
      let badge = qs(".ticket-count-badge", card);
      if (!badge){
        badge = document.createElement("div");
        badge.className = "ticket-count-badge";
        card.prepend(badge);
      }
      card.classList.add("has-badge");
      badge.textContent = card.dataset.ticketId || "";
    });
}

function moveTicketCardToStatus(card, statusValue){
  const containerId = getStatusContainerId(statusValue);
  const dest = qs(`#${containerId}`);
  if (!dest) return;
  dest.appendChild(card);

  // ✅ do NOT renumber; just refresh display
  refreshTicketBadges();
}

/* ---------------------------
   Support tickets — Add Ticket behavior
   REQUIREMENT:
   - Clone should copy whatever is in BASE fields
   - Then BASE resets to blank fields
--------------------------- */
function handleAddTicket(btn){
  const baseCard = btn.closest(".ticket-group");
  if (!baseCard) return;

  // Grab base values (so clone inherits them)
  const baseTicketNumber = qs(".ticket-number-input", baseCard)?.value || "";
  const baseZendeskUrl   = qs(".ticket-zendesk-input", baseCard)?.value || "";
  const baseSummary      = qs(".ticket-summary-input", baseCard)?.value || "";

  // Optional: enforce base completion before allowing add
  // (You had a disclaimer; uncomment if you want to hard-block)
  /*
  if (!baseTicketNumber.trim() || !baseSummary.trim()){
    alert("Complete the ticket number and summary before adding another card.");
    return;
  }
  */

  // Clone the base card
  const clone = baseCard.cloneNode(true);
  clone.dataset.clone = "true";
  clone.dataset.base = "false";
  clone.dataset.ticketId = getNextTicketId(); // ✅ permanent number assigned NOW

  // Remove "+" button on clone
  qsa(".add-ticket-btn", clone).forEach(b => b.remove());

  // Remove disclaimer on clone (base-only)
  qsa(".ticket-disclaimer", clone).forEach(p => p.remove());

  // Ensure clone status select is enabled/unlocked and starts Open
  const cloneStatus = qs(".ticket-status-select", clone);
  if (cloneStatus){
    cloneStatus.disabled = false;
    cloneStatus.classList.remove("is-locked");
    setSelectByValue(cloneStatus, "Open");
  }

  // Set clone field values from base
  const cloneTicketNumber = qs(".ticket-number-input", clone);
  const cloneZendeskUrl   = qs(".ticket-zendesk-input", clone);
  const cloneSummary      = qs(".ticket-summary-input", clone);

  if (cloneTicketNumber) cloneTicketNumber.value = baseTicketNumber;
  if (cloneZendeskUrl)   cloneZendeskUrl.value   = baseZendeskUrl;
  if (cloneSummary)      cloneSummary.value      = baseSummary;

  // Strip ids/names so autosave keys don’t collide
  qsa("input, select, textarea", clone).forEach(el => {
    if (el.id) el.removeAttribute("id");
    if (el.name) el.removeAttribute("name");
  });

  // Append clone into OPEN by default
  const open = qs("#openTicketsContainer");
  (open || baseCard.parentElement)?.appendChild(clone);

  // ✅ Reset base card inputs after cloning
  const baseTicketNumberEl = qs(".ticket-number-input", baseCard);
  const baseZendeskUrlEl   = qs(".ticket-zendesk-input", baseCard);
  const baseSummaryEl      = qs(".ticket-summary-input", baseCard);

  if (baseTicketNumberEl) baseTicketNumberEl.value = "";
  if (baseZendeskUrlEl)   baseZendeskUrlEl.value   = "";
  if (baseSummaryEl)      baseSummaryEl.value      = "";

  // Save reset (so refresh doesn’t bring old values back)
  [baseTicketNumberEl, baseZendeskUrlEl, baseSummaryEl].forEach(el => {
    if (el) saveField(el);
  });

  refreshGhostSelects(clone);
  refreshDateGhost(clone);
  refreshTicketBadges();
}

/* ---------------------------
   No-op (prevents old “compact toggle” init crashes)
--------------------------- */
function initStackedCompactToggle(){ /* intentionally disabled */ }

/* ===========================================================
   DOM READY
=========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initStackedCompactToggle(); // no-op
  loadAll();
  refreshGhostSelects();
  refreshDateGhost();
  refreshTicketBadges();

  // autosave on input/change
  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects(e.target.closest(".page-section") || document);
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);
  });

  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects(e.target.closest(".page-section") || document);
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);

    // Support ticket status move (ONLY non-base cards)
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

    if (btn.classList.contains("additional-poc-add")){
      handleAdditionalPOCAdd(btn);
      return;
    }

    // "+" buttons (integrated rows and tables)
    if (btn.classList.contains("add-row")){
      const table = btn.closest(".table-container")?.querySelector("table");
      if (table && table.tBodies?.[0]){
        const tbody = table.tBodies[0];
        const last = tbody.rows[tbody.rows.length - 1];
        if (!last) return;

        const clone = last.cloneNode(true);
        clone.dataset.clone = "true";

        qsa("input, select, textarea", clone).forEach(el => {
          if (el.type === "checkbox") el.checked = false;
          else if (el.tagName === "SELECT") el.selectedIndex = 0;
          else el.value = "";
          if (el.id) el.removeAttribute("id");
          if (el.name) el.removeAttribute("name");
        });

        tbody.appendChild(clone);
        refreshGhostSelects(clone);
        refreshDateGhost(clone);
        return;
      }

      if (btn.closest("#trainers-deployment")) handleTrainerAdd(btn);
      else cloneIntegratedRow(btn);

      return;
    }

    // Support ticket + button
    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }

   // Dealership map button (supports old + new button styles)
if (btn.id === "showDealershipMapBtn" || btn.classList.contains("small-map-btn")){
  const input = qs("#dealershipAddressInput");
  if (input?.value) updateDealershipMap(input.value);
  return;
}
  });

  // Live update map when address changes
  const addr = qs("#dealershipAddressInput");
  if (addr){
    addr.addEventListener("change", () => {
      if (addr.value) updateDealershipMap(addr.value);
    });
  }
});

  /* ============================
     Onsite Training Dates
     Auto-populate End Date (+2 days)
     ============================ */
  const onsiteStart = document.getElementById("onsiteStartDate");
  const onsiteEnd   = document.getElementById("onsiteEndDate");

  if (onsiteStart && onsiteEnd){
    onsiteStart.addEventListener("change", () => {
      if (!onsiteStart.value) return;

      const d = new Date(onsiteStart.value);
      d.setDate(d.getDate() + 2);

      onsiteEnd.value = d.toISOString().slice(0,10);
      onsiteEnd.classList.remove("is-placeholder");

      // persist value (matches your autosave system)
      saveField(onsiteEnd);
    });
  }

