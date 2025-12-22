/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Includes:
   - 2x2 Notes: card height sync + textarea fill-remaining-space + auto-grow
   - HARD JS-injected CSS patch for the two “inputs too wide” issues
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
  ensureTicketIds();
  refreshTicketBadges();
}

/* ---------------------------
   Clear logic
--------------------------- */
function clearSection(sectionEl){
  if (!sectionEl) return;

  qsa("tr[data-clone='true'], tr[data-clone='1'], tr[data-clone='yes']", sectionEl)
    .forEach(tr => tr.remove());

  qsa("[data-clone='true'], [data-clone='1']", sectionEl).forEach(node => node.remove());

  qsa("input, select, textarea", sectionEl).forEach(el => {
    try{ localStorage.removeItem(getFieldKey(el)); } catch(_){}

    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  if (sectionEl.id === "support-tickets"){
    try{ localStorage.removeItem("mkc:ticketCounter"); } catch(_){}
  }

  refreshGhostSelects(sectionEl);
  refreshDateGhost(sectionEl);
  refreshTicketBadges();

  scheduleSideBySideSync(sectionEl);
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

  scheduleSideBySideSync(target);
}

function initNavigation(){
  qsa(".nav-btn").forEach(btn => {
    btn.type = "button";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const id = btn.dataset.target || btn.getAttribute("data-target");
      if (!id) return;

      showSectionById(id);
      history.replaceState(null, "", `#${id}`);
    }, true);
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

/* ---------------------------
   Dealership map
--------------------------- */
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

  bindAutoGrowTextareas(clone.closest(".page-section") || document);
  scheduleSideBySideSync(clone.closest(".page-section") || document);
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

  bindAutoGrowTextareas(clone.closest(".page-section") || document);
  scheduleSideBySideSync(clone.closest(".page-section") || document);
}

/* ===========================================================
   ✅ HARD JS-INJECTED CSS PATCH
   (beats caching / file-order problems)
=========================================================== */
function injectHardLayoutPatch(){
  if (qs("#mkc-hard-layout-patch")) return;

  const css = `
/* ===== mkc hard patch (injected) ===== */
.cards-grid.two-col > *, .two-col-grid > *, .primary-contacts-grid > *{
  min-width:0 !important;
  max-width:100% !important;
}
.cards-grid.two-col > .section-block,
.two-col-grid .section-block,
.primary-contacts-grid > .mini-card,
.primary-contacts-grid > .additional-poc-card{
  width:100% !important;
  max-width:100% !important;
  min-width:0 !important;
  overflow:hidden !important;
}
#trainers-deployment #additionalTrainersContainer *{
  min-width:0 !important;
  max-width:100% !important;
}
#trainers-deployment #additionalTrainersContainer .checklist-row.integrated-plus{
  display:flex !important; align-items:center !important; gap:0 !important; min-width:0 !important;
}
#trainers-deployment #additionalTrainersContainer .checklist-row.integrated-plus label{
  flex:0 0 36% !important; max-width:36% !important; min-width:0 !important;
}
#trainers-deployment #additionalTrainersContainer .checklist-row.integrated-plus input[type="text"]{
  flex:1 1 0 !important; width:0 !important; min-width:0 !important; max-width:100% !important;
  margin-left:0 !important; box-sizing:border-box !important;
}
#trainers-deployment #additionalTrainersContainer .checklist-row.integrated-plus .add-row{
  flex:0 0 34px !important; width:34px !important; min-width:34px !important;
}
.primary-contacts-grid .mini-card,
.primary-contacts-grid .additional-poc-card,
.primary-contacts-grid .mini-card *{
  min-width:0 !important; max-width:100% !important;
}
.mini-card.additional-poc-card .checklist-row.integrated-plus input[type="text"]{
  flex:1 1 0 !important; width:0 !important; min-width:0 !important; max-width:100% !important;
  margin-left:0 !important; box-sizing:border-box !important;
}
.cards-grid.two-col textarea, .two-col-grid textarea{
  width:100% !important; max-width:100% !important; box-sizing:border-box !important;
}
`;

  const style = document.createElement("style");
  style.id = "mkc-hard-layout-patch";
  style.type = "text/css";
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

/* ===========================================================
   ✅ 2x2 NOTES: paired card height sync + textarea fill/grow
=========================================================== */
let _syncTimer = null;

function scheduleSideBySideSync(root=document){
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    syncSideBySideCardHeights(root);
    refreshNotesTextareaBaselines(root);
  }, 40);
}

function getRowCards(rowEl){
  if (!rowEl) return [];
  if (rowEl.classList.contains("cards-grid")){
    return qsa(":scope > .section-block", rowEl);
  }
  return qsa(".section-block", rowEl).filter(Boolean).slice(0, 2);
}

function syncSideBySideCardHeights(root=document){
  const scope = root || document;
  const rows = [
    ...qsa(".cards-grid.two-col", scope),
    ...qsa(".two-col-grid", scope),
  ];

  rows.forEach(row => {
    const cards = getRowCards(row);
    if (cards.length < 2) return;

    cards.forEach(c => { c.style.minHeight = ""; });

    const heights = cards.map(c => c.getBoundingClientRect().height || 0);
    const maxH = Math.max(...heights);

    cards.forEach(c => { c.style.minHeight = `${maxH}px`; });
  });
}

function isNotesTextarea(t){
  return !!t?.closest(".cards-grid.two-col, .two-col-grid");
}

function computeFillHeightForTextarea(t){
  const card = t.closest(".section-block");
  if (!card) return 0;

  const cardRect = card.getBoundingClientRect();
  const tRect = t.getBoundingClientRect();
  const cs = getComputedStyle(card);

  const padTop = parseFloat(cs.paddingTop || "0") || 0;
  const padBot = parseFloat(cs.paddingBottom || "0") || 0;

  const contentTopY = cardRect.top + padTop;
  const dist = Math.max(0, tRect.top - contentTopY);

  const available = Math.max(60, (cardRect.height - padTop - padBot - dist));
  return Math.floor(available);
}

function autoGrowTextarea(t){
  if (!t) return;

  const fill = computeFillHeightForTextarea(t);
  if (fill > 0) t.dataset.baseHeight = String(fill);

  const base = parseInt(t.dataset.baseHeight || "0", 10) || 0;

  t.style.height = "auto";
  const needed = t.scrollHeight || 0;
  t.style.height = Math.max(base, needed) + "px";

  t.style.maxWidth = "100%";
  t.style.boxSizing = "border-box";
}

function bindAutoGrowTextareas(root=document){
  const scope = root || document;
  qsa("textarea", scope).forEach(t => {
    if (!isNotesTextarea(t)) return;
    if (t.dataset.autogrowBound === "1") return;
    t.dataset.autogrowBound = "1";

    t.addEventListener("input", () => {
      autoGrowTextarea(t);
      scheduleSideBySideSync(t.closest(".page-section") || document);
    });
  });
}

function refreshNotesTextareaBaselines(root=document){
  const scope = root || document;
  qsa(".cards-grid.two-col textarea, .two-col-grid textarea", scope).forEach(t => {
    t.dataset.baseHeight = "0";
    autoGrowTextarea(t);
  });
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
    if (card.dataset.base === "true") return;
    if (!card.dataset.ticketId){
      card.dataset.ticketId = getNextTicketId();
    }
  });
}

function refreshTicketBadges(){
  ensureTicketIds();

  const allCards = qsa(".ticket-group");

  allCards
    .filter(c => c.dataset.base === "true")
    .forEach(baseCard => {
      const b = qs(".ticket-count-badge", baseCard);
      if (b) b.remove();
      baseCard.classList.remove("has-badge");
    });

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
  refreshTicketBadges();
}

/* ---------------------------
   Support tickets — Add Ticket behavior
--------------------------- */
function handleAddTicket(btn){
  const baseCard = btn.closest(".ticket-group");
  if (!baseCard) return;

  const baseTicketNumber = qs(".ticket-number-input", baseCard)?.value || "";
  const baseZendeskUrl   = qs(".ticket-zendesk-input", baseCard)?.value || "";
  const baseSummary      = qs(".ticket-summary-input", baseCard)?.value || "";

  const clone = baseCard.cloneNode(true);
  clone.dataset.clone = "true";
  clone.dataset.base = "false";
  clone.dataset.ticketId = getNextTicketId();

  qsa(".add-ticket-btn", clone).forEach(b => b.remove());
  qsa(".ticket-disclaimer", clone).forEach(p => p.remove());

  const cloneStatus = qs(".ticket-status-select", clone);
  if (cloneStatus){
    cloneStatus.disabled = false;
    cloneStatus.classList.remove("is-locked");
    setSelectByValue(cloneStatus, "Open");
  }

  const cloneTicketNumber = qs(".ticket-number-input", clone);
  const cloneZendeskUrl   = qs(".ticket-zendesk-input", clone);
  const cloneSummary      = qs(".ticket-summary-input", clone);

  if (cloneTicketNumber) cloneTicketNumber.value = baseTicketNumber;
  if (cloneZendeskUrl)   cloneZendeskUrl.value   = baseZendeskUrl;
  if (cloneSummary)      cloneSummary.value      = baseSummary;

  qsa("input, select, textarea", clone).forEach(el => {
    if (el.id) el.removeAttribute("id");
    if (el.name) el.removeAttribute("name");
  });

  const open = qs("#openTicketsContainer");
  (open || baseCard.parentElement)?.appendChild(clone);

  const baseTicketNumberEl = qs(".ticket-number-input", baseCard);
  const baseZendeskUrlEl   = qs(".ticket-zendesk-input", baseCard);
  const baseSummaryEl      = qs(".ticket-summary-input", baseCard);

  if (baseTicketNumberEl) baseTicketNumberEl.value = "";
  if (baseZendeskUrlEl)   baseZendeskUrlEl.value   = "";
  if (baseSummaryEl)      baseSummaryEl.value      = "";

  [baseTicketNumberEl, baseZendeskUrlEl, baseSummaryEl].forEach(el => {
    if (el) saveField(el);
  });

  refreshGhostSelects(clone);
  refreshDateGhost(clone);
  refreshTicketBadges();
}

/* ---------------------------
   No-op
--------------------------- */
function initStackedCompactToggle(){}

/* ===========================================================
   DOM READY
=========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  injectHardLayoutPatch();

  initNavigation();
  initStackedCompactToggle();

  loadAll();
  refreshGhostSelects();
  refreshDateGhost();
  refreshTicketBadges();

  bindAutoGrowTextareas(document);
  scheduleSideBySideSync(document);

  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects(e.target.closest(".page-section") || document);
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);

    if (e.target.tagName === "TEXTAREA" && isNotesTextarea(e.target)){
      autoGrowTextarea(e.target);
      scheduleSideBySideSync(e.target.closest(".page-section") || document);
    }
  });

  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.tagName === "SELECT") refreshGhostSelects(e.target.closest(".page-section") || document);
    if (e.target.type === "date") refreshDateGhost(e.target.closest(".page-section") || document);

    const sel = e.target.closest(".ticket-status-select");
    if (sel){
      const card = sel.closest(".ticket-group");
      if (!card) return;
      if (card.dataset.base === "true") return;
      moveTicketCardToStatus(card, sel.value);
    }

    scheduleSideBySideSync(e.target.closest(".page-section") || document);
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

    if (btn.classList.contains("additional-poc-add")){
      handleAdditionalPOCAdd(btn);
      return;
    }

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

        bindAutoGrowTextareas(clone.closest(".page-section") || document);
        scheduleSideBySideSync(clone.closest(".page-section") || document);
        return;
      }

      if (btn.closest("#trainers-deployment")) handleTrainerAdd(btn);
      else cloneIntegratedRow(btn);

      return;
    }

    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }

    if (btn.id === "showDealershipMapBtn" || btn.classList.contains("small-map-btn")){
      const input = qs("#dealershipAddressInput");
      if (input?.value) updateDealershipMap(input.value);
      return;
    }
  });

  const addr = qs("#dealershipAddressInput");
  if (addr){
    addr.addEventListener("change", () => {
      if (addr.value) updateDealershipMap(addr.value);
    });
  }

  const onsiteStart = document.getElementById("onsiteStartDate");
  const onsiteEnd   = document.getElementById("onsiteEndDate");

  if (onsiteStart && onsiteEnd){
    onsiteStart.addEventListener("change", () => {
      if (!onsiteStart.value) return;

      const d = new Date(onsiteStart.value);
      d.setDate(d.getDate() + 2);

      onsiteEnd.value = d.toISOString().slice(0,10);
      onsiteEnd.classList.remove("is-placeholder");

      saveField(onsiteEnd);
      scheduleSideBySideSync(onsiteEnd.closest(".page-section") || document);
    });
  }

  window.addEventListener("resize", () => {
    const active = qs(".page-section.active") || document;
    scheduleSideBySideSync(active);
  });
});
