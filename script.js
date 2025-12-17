/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (Autosave + nav + ghost placeholders + cloning + support tickets
    + dealership map + stacked-cards compact toggle)
   ======================================================= */

/* ---------------------------
   Tiny helpers
--------------------------- */
const qs  = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function safeId(el){
  return el?.id ? `#${el.id}` : "";
}

function isField(el){
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return true;
  return false;
}

function getFieldKey(el){
  // Prefer stable keys: id > name > data-key > fallback path-ish
  if (el.id) return `mkc:${el.id}`;
  if (el.name) return `mkc:${el.name}`;
  const dk = el.getAttribute("data-key");
  if (dk) return `mkc:${dk}`;

  // fallback: try to include section id + index
  const sec = el.closest(".page-section");
  const secId = sec?.id || "unknown";
  const all = qsa("input, select, textarea", sec || document);
  const idx = Math.max(0, all.indexOf(el));
  return `mkc:${secId}:field:${idx}`;
}

function setSelectByValue(selectEl, val){
  if (!selectEl) return;
  const opt = Array.from(selectEl.options).find(o => o.value === val || o.text === val);
  if (opt) selectEl.value = opt.value;
  else selectEl.value = "";
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
  } catch (e){
    // ignore storage errors
  }
}

function loadField(el){
  try{
    const key = getFieldKey(el);
    const val = localStorage.getItem(key);
    if (val === null) return;

    if (el.type === "checkbox"){
      el.checked = val === "1";
      return;
    }

    if (el.tagName === "SELECT"){
      setSelectByValue(el, val);
      return;
    }

    el.value = val;
  } catch (e){
    // ignore
  }
}

function loadAll(root=document){
  qsa("input, select, textarea", root).forEach(loadField);
  refreshGhostSelects(root);
  refreshDateGhost(root);
  refreshTicketBadges();
}

function clearAll(){
  if (!confirm("Clear ALL saved data for this checklist?")) return;
  // Only wipe keys we own
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("mkc:")) localStorage.removeItem(k);
    if (k === "stackedCompact") localStorage.removeItem(k);
  });
  // reset UI
  qsa(".page-section").forEach(clearSection);
  refreshGhostSelects(document);
  refreshDateGhost(document);
  refreshTicketBadges();
}

function clearSection(sectionEl){
  if (!sectionEl) return;

  // Remove cloned rows/cards first
  // Tables: remove cloned rows
  qsa("tr[data-clone='true'], tr[data-clone='1'], tr[data-clone='yes'], tr[data-clone='true']", sectionEl)
    .forEach(tr => tr.remove());

  // Non-table cloned blocks (support tickets, trainers, etc.)
  qsa("[data-clone='true'], [data-clone='1']", sectionEl).forEach(node => node.remove());

  // Reset fields
  qsa("input, select, textarea", sectionEl).forEach(el => {
    const key = getFieldKey(el);
    try{ localStorage.removeItem(key); } catch(e){}

    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  refreshGhostSelects(sectionEl);
  refreshDateGhost(sectionEl);
  refreshTicketBadges();
}

/* ---------------------------
   Navigation
--------------------------- */
function showSectionById(id){
  const target = qs(`#${CSS.escape(id)}`);
  if (!target) return;

  qsa(".page-section").forEach(sec => sec.classList.remove("active"));
  target.classList.add("active");

  // mark active nav
  qsa(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = qsa(".nav-btn").find(b => (b.dataset.target || b.getAttribute("data-target")) === id);
  if (activeBtn) activeBtn.classList.add("active");

  // scroll to top of main
  try{
    const main = qs("main");
    (main || window).scrollTo({ top: 0, behavior: "smooth" });
  } catch(e){}
}

function initNavigation(){
  // click handlers
  qsa(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.target || btn.getAttribute("data-target");
      if (!id) return;
      showSectionById(id);
      history.replaceState(null, "", `#${id}`);
    });
  });

  // initial section: hash > first nav btn
  const hash = (location.hash || "").replace("#", "");
  if (hash && qs(`#${CSS.escape(hash)}`)){
    showSectionById(hash);
  } else {
    const first = qs(".nav-btn");
    const id = first?.dataset.target || first?.getAttribute("data-target");
    if (id) showSectionById(id);
    else {
      const firstSec = qs(".page-section");
      if (firstSec) firstSec.classList.add("active");
    }
  }

  // back/forward hash
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
    // tables never get ghost styling
    if (sel.closest(".training-table")) {
      sel.classList.remove("is-placeholder");
      return;
    }
    const first = sel.options?.[0];
    const isGhost = first?.dataset?.ghost === "true";
    const empty = (sel.value === "" || sel.selectedIndex === 0 && isGhost);
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

function initTrainingDates(){
  // no-op placeholder: your CSS handles stacking via .date-stack
  refreshDateGhost(document);
}

/* ---------------------------
   Dealership map
--------------------------- */
function updateDealershipMap(address){
  const frame = qs("#dealershipMapFrame") || qs("#dealership-address-card .map-frame") || qs(".map-frame");
  if (!frame) return;

  const q = encodeURIComponent(address.trim());
  // Embed-style URL (no API key required)
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

  // remove the "+" on clones
  const plus = qs(".add-row", clone);
  if (plus) plus.remove();

  // clear values
  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
    // prevent duplicate IDs
    if (el.id) el.removeAttribute("id");
    if (el.name) el.removeAttribute("name");
  });

  row.insertAdjacentElement("afterend", clone);
  refreshGhostSelects(clone);
  refreshDateGhost(clone);
}

/* ---------------------------
   Trainers — add row (if used)
--------------------------- */
function handleTrainerAdd(btn){
  // Works like cloneIntegratedRow but keeps indent rules as your CSS expects
  cloneIntegratedRow(btn);
}

/* ---------------------------
   Additional POC — add ENTIRE new card (if used)
--------------------------- */
function handleAdditionalPOCAdd(btn){
  const card = btn.closest(".mini-card") || btn.closest(".section-block");
  if (!card) return;

  const clone = card.cloneNode(true);
  clone.dataset.clone = "true";
  clone.dataset.base = "false";

  // Remove any add button on cloned cards
  qsa(".additional-poc-add, .add-row", clone).forEach(b => b.remove());

  // Clear fields + strip IDs/names
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
   Support tickets
--------------------------- */
function getStatusContainerId(status){
  const s = (status || "").toLowerCase();
  if (s.includes("tier") || s.includes("t2") || s.includes("tier 2")) return "tierTwoTicketsContainer";
  if (s.includes("feature")) return "closedFeatureTicketsContainer";
  if (s.includes("closed") || s.includes("resolved")) return "closedResolvedTicketsContainer";
  // default open
  return "openTicketsContainer";
}

function refreshTicketBadges(){
  const sections = [
    "openTicketsContainer",
    "tierTwoTicketsContainer",
    "closedResolvedTicketsContainer",
    "closedFeatureTicketsContainer"
  ];

  sections.forEach(id => {
    const wrap = qs(`#${id}`);
    if (!wrap) return;

    const cards = qsa(".ticket-group", wrap);
    cards.forEach((card, i) => {
      let badge = qs(".ticket-count-badge", card);
      if (!badge){
        badge = document.createElement("div");
        badge.className = "ticket-count-badge";
        card.prepend(badge);
        card.classList.add("has-badge");
      }
      badge.textContent = String(i + 1);
    });
  });
}

function moveTicketCardToStatus(card, statusValue){
  const containerId = getStatusContainerId(statusValue);
  const dest = qs(`#${containerId}`);
  if (!dest) return;

  dest.appendChild(card);
  refreshTicketBadges();
}

function handleAddTicket(btn){
  const card = btn.closest(".ticket-group");
  if (!card) return;

  const clone = card.cloneNode(true);
  clone.dataset.clone = "true";
  clone.dataset.base = "false";

  // remove "+" on clone
  qsa(".add-ticket-btn", clone).forEach(b => b.remove());

  // clear fields
  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
    if (el.id) el.removeAttribute("id");
    if (el.name) el.removeAttribute("name");
  });

  // place it in Open by default
  const open = qs("#openTicketsContainer");
  (open || card.parentElement)?.appendChild(clone);

  refreshGhostSelects(clone);
  refreshDateGhost(clone);
  refreshTicketBadges();
}

/* ===========================================================
   DOM READY
=========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  try{
    initNavigation();
    initStackedCompactToggle();
    loadAll();
    initTrainingDates();
    refreshGhostSelects();
    refreshDateGhost(); // ✅ make empty dates look like placeholders on load
    refreshTicketBadges();
  } catch (err){
    console.error("Init error:", err);
  }

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
          if (el.id) el.removeAttribute("id");
          if (el.name) el.removeAttribute("name");
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

    // MAP button (forces map refresh from whatever is typed)
    if (btn.id === "showDealershipMapBtn"){
      const input = qs("#dealershipAddressInput");
      if (input?.value) updateDealershipMap(input.value);
      return;
    }
  });

  // Live update map when address changes (optional, safe)
  const addr = qs("#dealershipAddressInput");
  if (addr){
    addr.addEventListener("change", () => {
      if (addr.value) updateDealershipMap(addr.value);
    });
  }
});
