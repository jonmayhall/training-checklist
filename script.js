/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   (Autosave + nav + ghost placeholders + cloning + support tickets
    + dealership map)
   FIXES:
   - Removes/neutralizes compact toggle dependency (no init crash)
   - Ticket clones: status select is NOT disabled/locked
   - Ticket numbering badge stays consistent
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
  refreshTicketBadges();
}

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

/* ---------------------------
   Dealership map
--------------------------- */
function updateDealershipMap(address){
  const frame = qs("#dealershipMapFrame") || qs("#dealership-address-card .map-frame") || qs(".map-frame");
  if (!frame) return;
  const q = encodeURIComponent(address.trim());
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
   Support tickets
--------------------------- */
function getStatusContainerId(status){
  const s = (status || "").toLowerCase();
  if (s.includes("tier") || s.includes("t2") || s.includes("tier 2")) return "tierTwoTicketsContainer";
  if (s.includes("feature")) return "closedFeatureTicketsContainer";
  if (s.includes("closed") || s.includes("resolved")) return "closedResolvedTicketsContainer";
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

    // Only number NON-base cards
    const numberMe = cards.filter(c => c.dataset.base !== "true");

    // Remove badges from base cards (if any exist)
    cards
      .filter(c => c.dataset.base === "true")
      .forEach(baseCard => {
        const b = qs(".ticket-count-badge", baseCard);
        if (b) b.remove();
        baseCard.classList.remove("has-badge");
      });

    numberMe.forEach((card, i) => {
      let badge = qs(".ticket-count-badge", card);
      if (!badge){
        badge = document.createElement("div");
        badge.className = "ticket-count-badge";
        card.prepend(badge);
      }
      card.classList.add("has-badge");
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

  // clear + IMPORTANT: unlock status dropdown on clones
  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";

    // ✅ if base had disabled status, remove it on clone
    if (el.classList?.contains("ticket-status-select")){
      el.disabled = false;
      el.classList.remove("is-locked");
    }

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

    if (btn.classList.contains("add-ticket-btn")){
      handleAddTicket(btn);
      return;
    }

    if (btn.id === "showDealershipMapBtn"){
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
