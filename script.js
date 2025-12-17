/* =======================================================
   myKaarma Interactive Training Checklist — CLEAN script.js
   (Autosave + nav + ghost placeholders + cloning + support tickets
    + dealership map)
   ======================================================= */

/* ---------------------------
   Tiny helpers
--------------------------- */
const qs  = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function isField(el){
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
}

function getFieldKey(el){
  // Prefer stable keys: id > name > data-key > fallback section+index
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
      return;
    }
    localStorage.setItem(key, el.value ?? "");
  } catch (e){}
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
  } catch (e){}
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
  });

  // Reset UI
  qsa(".page-section").forEach(clearSection);
  refreshGhostSelects(document);
  refreshDateGhost(document);
  refreshTicketBadges();
}

function clearSection(sectionEl){
  if (!sectionEl) return;

  // Remove clones inside this section
  qsa("[data-clone='true'], [data-clone='1']", sectionEl).forEach(node => node.remove());

  // Reset fields + remove their saved values
  qsa("input, select, textarea", sectionEl).forEach(el => {
    try{ localStorage.removeItem(getFieldKey(el)); } catch(e){}

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

  qsa(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = qsa(".nav-btn").find(b => (b.dataset.target || b.getAttribute("data-target")) === id);
  if (activeBtn) activeBtn.classList.add("active");

  try{
    const main = qs("main");
    (main || window).scrollTo({ top: 0, behavior: "smooth" });
  } catch(e){}
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
    // tables never get ghost styling
    if (sel.closest(".training-table")){
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
    inp.classList.toggle("is-placeholder", !inp.value);
  });
}

/* ---------------------------
   Dealership map
--------------------------- */
function updateDealershipMap(address){
  const frame =
    qs("#dealershipMapFrame") ||
    qs("#dealership-address-card .map-frame") ||
    qs(".map-frame");

  if (!frame) return;

  const a = (address || "").trim();
  if (!a) return;

  const q = encodeURIComponent(a);
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

  // Remove "+" on clones
  qs(".add-row", clone)?.remove();

  // Clear fields + prevent duplicate ids/names
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

/* ---------------------------
   Additional POC — add ENTIRE new card (if used)
--------------------------- */
function handleAdditionalPOCAdd(btn){
  const card = btn.closest(".mini-card") || btn.closest(".section-block");
  if (!card) return;

  const clone = card.cloneNode(true);
  clone.dataset.clone = "true";
  clone.dataset.base = "false";

  // Remove add buttons on clones
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
   Support tickets
--------------------------- */
function getStatusContainerId(status){
  const s = String(status || "").toLowerCase();

  if (s.includes("tier 2") || s.includes("tier2") || s.includes("t2")) return "tierTwoTicketsContainer";
  if (s.includes("feature")) return "closedFeatureTicketsContainer";
  if (s.includes("closed") || s.includes("resolved")) return "closedResolvedTicketsContainer";
  return "openTicketsContainer";
}

function refreshTicketBadges(){
  const ids = [
    "openTicketsContainer",
    "tierTwoTicketsContainer",
    "closedResolvedTicketsContainer",
    "closedFeatureTicketsContainer"
  ];

  ids.forEach(id => {
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

  // Remove "+" on clone
  qsa(".add-ticket-btn", clone).forEach(b => b.remove());

  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";

    if (el.id) el.removeAttribute("id");
    if (el.name) el.removeAttribute("name");
  });

  // Place into Open by default
  (qs("#openTicketsContainer") || card.parentElement)?.appendChild(clone);

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
    loadAll();
    refreshGhostSelects();
    refreshDateGhost();
    refreshTicketBadges();
  } catch (err){
    console.error("Init error:", err);
  }

  // Autosave on input
  document.addEventListener("input", (e) => {
    if (!isField(e.target)) return;

    saveField(e.target);

    if (e.target.tagName === "SELECT"){
      refreshGhostSelects(e.target.closest(".page-section") || document);
    }
    if (e.target.type === "date"){
      refreshDateGhost(e.target.closest(".page-section") || document);
    }
  });

  // Change handler (for selects, etc.)
  document.addEventListener("change", (e) => {
    if (!isField(e.target)) return;

    saveField(e.target);

    if (e.target.tagName === "SELECT"){
      refreshGhostSelects(e.target.closest(".page-section") || document);
    }
    if (e.target.type === "date"){
      refreshDateGhost(e.target.closest(".page-section") || document);
    }

    // ✅ Support ticket status move (ONLY non-base cards)
    if (e.target.classList.contains("ticket-status-select")){
      const card = e.target.closest(".ticket-group");
      if (!card) return;
      if (card.dataset.base === "true") return; // don't move base
      moveTicketCardToStatus(card, e.target.value);
    }
  });

  // Click handlers
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

    // Additional POC: add ENTIRE NEW CARD
    if (btn.classList.contains("additional-poc-add")){
      handleAdditionalPOCAdd(btn);
      return;
    }

    // Support tickets "+"
    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }

    // MAP button (support both ids/classes)
    if (btn.id === "showDealershipMapBtn" || btn.classList.contains("small-map-btn")){
      const input = qs("#dealershipAddressInput") || qs("#dealership-address-card input[type='text']");
      if (input?.value) updateDealershipMap(input.value);
      return;
    }

    // "+" buttons (table add row OR integrated rows)
    if (btn.classList.contains("add-row")){
      // table add-row
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

      // non-table add-row
      if (btn.closest("#trainers-deployment")){
        handleTrainerAdd(btn);
      } else {
        cloneIntegratedRow(btn);
      }
      return;
    }
  });

  // Optional: update map when address changes
  const addr = qs("#dealershipAddressInput") || qs("#dealership-address-card input[type='text']");
  if (addr){
    addr.addEventListener("change", () => {
      if (addr.value) updateDealershipMap(addr.value);
    });
  }
});
