/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (Autosave + nav + ghost placeholders + cloning + support tickets
    + dealership map)
   FIXES:
   - Ticket badges increment correctly (1,2,3…)
   - Base ticket never shows badge
   - Cloned tickets never inherit old badges
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
  refreshTicketBadges();
}

function clearSection(sectionEl){
  if (!sectionEl) return;

  qsa("[data-clone='true'], [data-clone='1']").forEach(n => n.remove());

  qsa("input, select, textarea", sectionEl).forEach(el => {
    try{ localStorage.removeItem(getFieldKey(el)); } catch(_){}
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  refreshGhostSelects(sectionEl);
  refreshDateGhost(sectionEl);
  refreshTicketBadges();
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

  qsa(".page-section").forEach(sec => sec.classList.remove("active"));
  target.classList.add("active");

  qsa(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = qsa(".nav-btn").find(b => b.dataset.target === id);
  if (activeBtn) activeBtn.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initNavigation(){
  qsa(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showSectionById(btn.dataset.target));
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
    const ghost = sel.options?.[0]?.dataset?.ghost === "true";
    const empty = sel.value === "" || sel.selectedIndex === 0;
    sel.classList.toggle("is-placeholder", ghost && empty);
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
  const frame = qs("#dealershipMapFrame");
  if (!frame) return;
  frame.src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/* ---------------------------
   Support Tickets — BADGE FIX
--------------------------- */
function getStatusContainerId(status){
  const s = (status || "").toLowerCase();
  if (s.includes("tier")) return "tierTwoTicketsContainer";
  if (s.includes("feature")) return "closedFeatureTicketsContainer";
  if (s.includes("closed") || s.includes("resolved")) return "closedResolvedTicketsContainer";
  return "openTicketsContainer";
}

function refreshTicketBadges(){
  const containers = [
    "openTicketsContainer",
    "tierTwoTicketsContainer",
    "closedResolvedTicketsContainer",
    "closedFeatureTicketsContainer"
  ];

  containers.forEach(id => {
    const wrap = qs(`#${id}`);
    if (!wrap) return;

    const cards = qsa(".ticket-group", wrap);

    // Remove ALL badges first
    cards.forEach(card => {
      qsa(".ticket-count-badge", card).forEach(b => b.remove());
      card.classList.remove("has-badge");
    });

    // Number non-base cards only
    cards.filter(c => c.dataset.base !== "true")
      .forEach((card, i) => {
        const badge = document.createElement("div");
        badge.className = "ticket-count-badge";
        badge.textContent = String(i + 1);
        card.prepend(badge);
        card.classList.add("has-badge");
      });
  });
}

function moveTicketCardToStatus(card, status){
  const dest = qs(`#${getStatusContainerId(status)}`);
  if (dest) dest.appendChild(card);
  refreshTicketBadges();
}

function handleAddTicket(btn){
  const card = btn.closest(".ticket-group");
  if (!card) return;

  const clone = card.cloneNode(true);
  clone.dataset.clone = "true";
  clone.dataset.base = "false";

  qsa(".add-ticket-btn", clone).forEach(b => b.remove());
  qsa(".ticket-count-badge", clone).forEach(b => b.remove());

  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
    el.disabled = false;
    el.classList?.remove("is-locked");
    el.removeAttribute("id");
    el.removeAttribute("name");
  });

  qs("#openTicketsContainer")?.appendChild(clone);
  refreshGhostSelects(clone);
  refreshDateGhost(clone);
  refreshTicketBadges();
}

/* ---------------------------
   DOM READY
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  loadAll();

  document.addEventListener("input", e => isField(e.target) && saveField(e.target));
  document.addEventListener("change", e => {
    if (!isField(e.target)) return;
    saveField(e.target);

    if (e.target.classList.contains("ticket-status-select")){
      const card = e.target.closest(".ticket-group");
      if (card && card.dataset.base !== "true"){
        moveTicketCardToStatus(card, e.target.value);
      }
    }
  });

  document.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.id === "clearAllBtn") clearAll();
    if (btn.classList.contains("clear-page-btn")) clearSection(btn.closest(".page-section"));
    if (btn.classList.contains("add-ticket-btn")) handleAddTicket(btn);
  });

  const addr = qs("#dealershipAddressInput");
  addr?.addEventListener("change", () => addr.value && updateDealershipMap(addr.value));
});
