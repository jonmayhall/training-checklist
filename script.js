/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (Autosave + nav + cloning + support tickets + maps
    + notes auto-expand + card height sync)
   ======================================================= */

/* ---------------------------
   Tiny helpers
--------------------------- */
const qs  = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function isField(el){
  if (!el) return false;
  return ["INPUT","SELECT","TEXTAREA"].includes(el.tagName);
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
    if (el.type === "checkbox"){
      localStorage.setItem(key, el.checked ? "1" : "0");
    } else {
      localStorage.setItem(key, el.value ?? "");
    }
  } catch(_){}
}

function loadField(el){
  try{
    const key = getFieldKey(el);
    const val = localStorage.getItem(key);
    if (val === null) return;

    if (el.type === "checkbox"){
      el.checked = (val === "1");
    } else if (el.tagName === "SELECT"){
      setSelectByValue(el, val);
    } else {
      el.value = val;
    }
  } catch(_){}
}

function loadAll(root=document){
  qsa("input, select, textarea", root).forEach(loadField);
  refreshGhostSelects(root);
  refreshDateGhost(root);
  ensureTicketIds();
  refreshTicketBadges();
  initAutoGrowTextareas();   // ✅ ensure restored notes size correctly
}

/* ---------------------------
   Clear logic
--------------------------- */
function clearSection(sectionEl){
  if (!sectionEl) return;

  qsa("[data-clone='true'], [data-clone='1']", sectionEl).forEach(n => n.remove());

  qsa("input, select, textarea", sectionEl).forEach(el => {
    try{ localStorage.removeItem(getFieldKey(el)); } catch(_){}
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  if (sectionEl.id === "support-tickets"){
    localStorage.removeItem("mkc:ticketCounter");
  }

  refreshGhostSelects(sectionEl);
  refreshDateGhost(sectionEl);
  refreshTicketBadges();
  initAutoGrowTextareas();
}

function clearAll(){
  if (!confirm("Clear ALL saved data for this checklist?")) return;
  Object.keys(localStorage).forEach(k => k.startsWith("mkc:") && localStorage.removeItem(k));
  qsa(".page-section").forEach(clearSection);
}

/* ---------------------------
   Navigation
--------------------------- */
function showSectionById(id){
  const target = qs(`#${CSS.escape(id)}`);
  if (!target) return;

  qsa(".page-section").forEach(s => s.classList.remove("active"));
  target.classList.add("active");

  qsa(".nav-btn").forEach(b => b.classList.remove("active"));
  const btn = qsa(".nav-btn").find(b => b.dataset.target === id);
  if (btn) btn.classList.add("active");

  window.scrollTo({ top:0, behavior:"smooth" });
}

function initNavigation(){
  qsa(".nav-btn").forEach(btn => {
    btn.type = "button";
    btn.addEventListener("click", e => {
      e.preventDefault();
      showSectionById(btn.dataset.target);
      history.replaceState(null,"",`#${btn.dataset.target}`);
    });
  });

  const hash = location.hash.replace("#","");
  if (hash && qs(`#${hash}`)) showSectionById(hash);
  else showSectionById(qs(".nav-btn")?.dataset.target);
}

/* ---------------------------
   Ghost placeholders
--------------------------- */
function refreshGhostSelects(root=document){
  qsa("select", root).forEach(sel => {
    if (sel.closest(".training-table")) return;
    const first = sel.options?.[0];
    const ghost = first?.dataset?.ghost === "true";
    sel.classList.toggle("is-placeholder", ghost && sel.selectedIndex === 0);
  });
}

function refreshDateGhost(root=document){
  qsa("input[type='date']", root).forEach(inp => {
    inp.classList.toggle("is-placeholder", !inp.value);
  });
}

/* ---------------------------
   Dealership map
--------------------------- */
function updateDealershipMap(address){
  const frame = qs(".map-frame");
  if (!frame || !address) return;
  frame.src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/* ---------------------------
   Notes auto-grow (KEY FEATURE)
--------------------------- */
function autoGrowTextarea(el){
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function initAutoGrowTextareas(){
  qsa(".cards-grid.two-col textarea").forEach(t => {
    autoGrowTextarea(t);
    t.removeEventListener("input", t._growHandler);
    t._growHandler = () => autoGrowTextarea(t);
    t.addEventListener("input", t._growHandler);
  });
}

/* ---------------------------
   Support Tickets (unchanged logic)
--------------------------- */
function getStatusContainerId(status){
  const s = status.toLowerCase();
  if (s.includes("tier")) return "tierTwoTicketsContainer";
  if (s.includes("feature")) return "closedFeatureTicketsContainer";
  if (s.includes("closed")) return "closedResolvedTicketsContainer";
  return "openTicketsContainer";
}

function getNextTicketId(){
  let n = parseInt(localStorage.getItem("mkc:ticketCounter") || "0",10)+1;
  localStorage.setItem("mkc:ticketCounter",n);
  return String(n);
}

function ensureTicketIds(){
  qsa(".ticket-group").forEach(c=>{
    if (c.dataset.base==="true") return;
    if (!c.dataset.ticketId) c.dataset.ticketId = getNextTicketId();
  });
}

function refreshTicketBadges(){
  ensureTicketIds();
  qsa(".ticket-group").forEach(card=>{
    if (card.dataset.base==="true") return;
    let badge = qs(".ticket-count-badge", card);
    if (!badge){
      badge = document.createElement("div");
      badge.className="ticket-count-badge";
      card.prepend(badge);
    }
    badge.textContent = card.dataset.ticketId;
  });
}

/* ===========================================================
   DOM READY
=========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  loadAll();
  initAutoGrowTextareas();

  document.addEventListener("input", e=>{
    if (!isField(e.target)) return;
    saveField(e.target);
    if (e.target.tagName==="TEXTAREA") autoGrowTextarea(e.target);
    if (e.target.tagName==="SELECT") refreshGhostSelects();
    if (e.target.type==="date") refreshDateGhost();
  });

  document.addEventListener("change", e=>{
    if (!isField(e.target)) return;
    saveField(e.target);
  });

  document.addEventListener("click", e=>{
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.id==="clearAllBtn") clearAll();
    if (btn.classList.contains("clear-page-btn"))
      clearSection(btn.closest(".page-section"));

    if (btn.classList.contains("small-map-btn")){
      const addr = qs("#dealershipAddressInput");
      if (addr?.value) updateDealershipMap(addr.value);
    }
  });
});

