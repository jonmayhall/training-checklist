/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Includes:
   - LocalStorage save/restore for inputs/selects/textareas
   - Sidebar navigation + dealership name display
   - Reset This Page + Clear All
   - Dynamic "Add Row" (tables + trainer + additional POC)
   - Support Tickets add/move by status
   - ✅ NEW: Adds "Notes" icon column to:
       - ALL Training Checklist tables
       - Opcodes table
     And clicking the icon scrolls to the correct Notes section
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

  // Fallback: stable-ish key using section + index
  const sec = el.closest(".page-section");
  const secId = sec?.id || "unknown";
  const fields = qsa("input, select, textarea", sec || document);
  const idx = fields.indexOf(el);
  return `mkc:${secId}:${idx}`;
}

function setDealershipNameDisplay(){
  const src = qs("#dealershipNameInput");
  const out = qs("#dealershipNameDisplay");
  if (!out) return;
  out.textContent = (src?.value || "").trim();
}

/* ---------------------------
   LocalStorage persistence
--------------------------- */
function saveField(el){
  if (!isField(el)) return;

  // Skip disabled selects we "lock" (ticket status)
  if (el.disabled && el.classList.contains("ticket-status-select")) return;

  const key = getFieldKey(el);
  const val = (el.type === "checkbox") ? (el.checked ? "1" : "0") : el.value;
  localStorage.setItem(key, val);
}

function loadField(el){
  if (!isField(el)) return;

  const key = getFieldKey(el);
  const saved = localStorage.getItem(key);
  if (saved === null) return;

  if (el.type === "checkbox"){
    el.checked = (saved === "1");
  } else {
    el.value = saved;
  }

  // Dealership name topbar sync
  if (el.id === "dealershipNameInput") setDealershipNameDisplay();

  // Date placeholder class
  if (el.type === "date"){
    if (el.value) el.classList.remove("is-placeholder");
    else el.classList.add("is-placeholder");
  }
}

function restoreAllFields(){
  qsa("input, select, textarea").forEach(loadField);
  setDealershipNameDisplay();
}

function wireAutosave(){
  document.addEventListener("input", (e)=>{
    const el = e.target;
    if (!isField(el)) return;

    // Date placeholder class
    if (el.type === "date"){
      if (el.value) el.classList.remove("is-placeholder");
      else el.classList.add("is-placeholder");
    }

    saveField(el);

    if (el.id === "dealershipNameInput") setDealershipNameDisplay();
  });

  document.addEventListener("change", (e)=>{
    const el = e.target;
    if (!isField(el)) return;
    saveField(el);

    if (el.id === "dealershipNameInput") setDealershipNameDisplay();
  });
}

/* ---------------------------
   Page Navigation
--------------------------- */
function showSection(id){
  const sections = qsa(".page-section");
  sections.forEach(s => s.classList.remove("active"));
  const target = qs(`#${id}`);
  if (target) target.classList.add("active");

  qsa(".nav-btn").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.target === id);
  });

  // Run height sync if your CSS uses two-col grids
  syncTwoColHeights();

  // Tiny scroll reset
  window.scrollTo({ top: 0, behavior: "instant" });
}

function wireNav(){
  qsa(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.target;
      if (id) showSection(id);
    });
  });
}

/* ---------------------------
   Reset functions
--------------------------- */
function clearSection(sectionEl){
  if (!sectionEl) return;

  const fields = qsa("input, select, textarea", sectionEl);

  fields.forEach(el=>{
    const key = getFieldKey(el);
    localStorage.removeItem(key);

    if (el.type === "checkbox"){
      el.checked = false;
    } else if (el.tagName === "SELECT"){
      // prefer ghost option if present
      const ghost = qsa("option", el).find(o => o.dataset.ghost === "true");
      el.value = ghost ? ghost.value : "";
    } else {
      el.value = "";
    }

    if (el.type === "date"){
      el.classList.add("is-placeholder");
    }
  });

  // Remove dynamically injected rows/cards inside this page
  qsa("[data-injected='true']", sectionEl).forEach(n => n.remove());
  qsa("[data-cloned='true']", sectionEl).forEach(n => n.remove());

  // Support tickets: clear all non-base tickets in this page
  qsa(".ticket-group", sectionEl).forEach(group=>{
    if (!group.hasAttribute("data-base")) group.remove();
  });

  // Reset dealership name display if we are on dealership page
  if (sectionEl.id === "dealership-info") setDealershipNameDisplay();

  // Rebuild notes columns after clearing dynamic rows
  addNotesColumnsEverywhere();

  // Re-sync heights
  syncTwoColHeights();
}

function clearAll(){
  // Remove only our keys
  Object.keys(localStorage).forEach(k=>{
    if (k.startsWith("mkc:")) localStorage.removeItem(k);
  });

  // Clear UI
  qsa(".page-section").forEach(sec=> clearSection(sec));

  // Return to first page
  showSection("trainers-deployment");
}

/* ---------------------------
   Optional 2-col height sync
--------------------------- */
function syncTwoColHeights(){
  const grids = qsa(".cards-grid.two-col, .two-col-grid");
  grids.forEach(grid=>{
    const cards = qsa(":scope > .section-block", grid);
    if (cards.length < 2) return;

    cards.forEach(c=> c.style.minHeight = "");

    for (let i=0; i<cards.length; i+=2){
      const a = cards[i];
      const b = cards[i+1];
      if (!a || !b) continue;
      const h = Math.max(a.offsetHeight, b.offsetHeight);
      a.style.minHeight = h + "px";
      b.style.minHeight = h + "px";
    }
  });
}

/* ---------------------------
   Dynamic add-row: Trainers
--------------------------- */
function wireAdditionalTrainers(){
  const baseRow = qs("#trainers-deployment .checklist-row[data-base='true']");
  const container = qs("#additionalTrainersContainer");
  if (!baseRow || !container) return;

  const addBtn = qs(".add-row", baseRow);
  if (!addBtn) return;

  addBtn.addEventListener("click", ()=>{
    const input = qs("input", baseRow);
    const name = (input?.value || "").trim();

    if (!name){
      input?.focus();
      return;
    }

    const row = baseRow.cloneNode(true);
    row.removeAttribute("data-base");
    row.setAttribute("data-injected", "true");

    const rowInput = qs("input", row);
    if (rowInput) rowInput.value = name;

    // Remove + button from cloned rows
    const btn = qs(".add-row", row);
    if (btn) btn.remove();

    container.appendChild(row);

    // clear base input
    input.value = "";
    saveField(input);
  });
}

/* ---------------------------
   Dynamic add-row: Additional POC cards
--------------------------- */
function wireAdditionalPOC(){
  const baseCard = qs(".additional-poc-card[data-base='true']");
  if (!baseCard) return;

  const btn = qs(".additional-poc-add", baseCard);
  if (!btn) return;

  btn.addEventListener("click", ()=>{
    const clone = baseCard.cloneNode(true);
    clone.removeAttribute("data-base");
    clone.setAttribute("data-injected", "true");
    clone.classList.add("is-added");

    // remove + button on clone
    const plus = qs(".additional-poc-add", clone);
    if (plus) plus.remove();

    // clear fields in clone
    qsa("input, select, textarea", clone).forEach(el=>{
      if (el.type === "checkbox") el.checked = false;
      else if (el.tagName === "SELECT") el.value = "";
      else el.value = "";
    });

    baseCard.parentElement.appendChild(clone);
  });
}

/* ---------------------------
   Dynamic add-row: Tables (+ buttons)
--------------------------- */
function wireTableAddRowButtons(){
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".table-footer .add-row");
    if (!btn) return;

    const container = btn.closest(".table-container");
    const table = qs("table", container);
    const tbody = qs("tbody", table);
    if (!table || !tbody) return;

    const rows = qsa("tr", tbody);
    const template = rows[rows.length - 1];
    if (!template) return;

    const clone = template.cloneNode(true);
    clone.setAttribute("data-injected", "true");

    // clear inputs/selects in the new row
    qsa("input, select, textarea", clone).forEach(el=>{
      if (el.type === "checkbox") el.checked = false;
      else if (el.tagName === "SELECT") el.value = "";
      else el.value = "";
    });

    tbody.appendChild(clone);

    // Ensure notes column exists + correct cell exists in new row
    ensureNotesColumnForTable(table);

    // Re-apply persistence keys will be generated on save (fallback index changes are okay)
  });
}

/* ---------------------------
   Support Tickets
--------------------------- */
function getTicketContainers(){
  return {
    Open: qs("#openTicketsContainer"),
    "Tier Two": qs("#tierTwoTicketsContainer"),
    "Closed - Resolved": qs("#closedResolvedTicketsContainer"),
    "Closed - Feature Not Supported": qs("#closedFeatureTicketsContainer"),
  };
}

function lockTicketStatus(selectEl, value){
  if (!selectEl) return;
  selectEl.value = value;
  selectEl.disabled = true;
  selectEl.setAttribute("aria-disabled", "true");
}

function isTicketCardComplete(card){
  const num = qs(".ticket-number-input", card)?.value?.trim();
  const url = qs(".ticket-zendesk-input", card)?.value?.trim();
  const summary = qs(".ticket-summary-input", card)?.value?.trim();
  return !!(num && url && summary);
}

function wireSupportTickets(){
  const openBase = qs("#openTicketsContainer .ticket-group[data-base='true']");
  if (!openBase) return;

  // Ensure base status is locked to Open
  lockTicketStatus(qs(".ticket-status-select", openBase), "Open");

  document.addEventListener("click", (e)=>{
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const card = addBtn.closest(".ticket-group");
    if (!card) return;

    // Only allow add if current card is complete
    if (!isTicketCardComplete(card)){
      // focus first missing
      const n = qs(".ticket-number-input", card);
      const u = qs(".ticket-zendesk-input", card);
      const s = qs(".ticket-summary-input", card);
      if (!n?.value?.trim()) n?.focus();
      else if (!u?.value?.trim()) u?.focus();
      else s?.focus();
      return;
    }

    // Create new ticket card in OPEN section
    const clone = card.cloneNode(true);
    clone.removeAttribute("data-base");
    clone.setAttribute("data-injected", "true");

    // Clear fields
    qsa("input, textarea, select", clone).forEach(el=>{
      if (el.tagName === "SELECT") el.value = "Open";
      else el.value = "";
    });

    // Lock status select to Open
    lockTicketStatus(qs(".ticket-status-select", clone), "Open");

    // Remove disclaimer from clones
    const disclaimer = qs(".ticket-disclaimer", clone);
    if (disclaimer) disclaimer.remove();

    // Add clone after current
    const openContainer = qs("#openTicketsContainer");
    openContainer.appendChild(clone);
  });

  // If you ever decide to allow changing status later, you can unlock + move cards here.
}

/* ---------------------------
   Google Map helpers (address)
--------------------------- */
function updateDealershipMap(address){
  const frame = qs("#dealershipMapFrame");
  if (!frame) return;

  const encoded = encodeURIComponent(address);
  frame.src = `https://www.google.com/maps?q=${encoded}&z=14&output=embed`;
}

function wireMapButton(){
  const btn = qs("#openAddressInMapsBtn");
  const input = qs("#dealershipAddressInput");
  if (!btn || !input) return;

  btn.addEventListener("click", ()=>{
    const addr = (input.value || "").trim();
    if (!addr) return;
    updateDealershipMap(addr);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, "_blank");
  });
}

/* =======================================================
   ✅ NOTES ICON COLUMN (NEW)
   - Adds a Notes header + icon cell to the end of each row
   - Clicking icon navigates to that table’s Notes block
======================================================= */

/** Map tables -> notes target ids (add these ids in HTML if possible) */
const NOTES_TARGETS_BY_SECTION_TITLE = {
  "Technicians – Checklist": "notes-techs",
  "Service Advisors – Checklist": "notes-advisors",
  "Parts Representatives – Checklist": "notes-parts",
  "Shop Foreman / Shop Dispatcher – Checklist": "notes-foreman",
  "BDC / Scheduler – Checklist": "notes-bdc",
  "PU&D Drivers – Checklist": "notes-pud-drivers",
  "PU&D Dispatcher – Checklist": "notes-pud-dispatch",
};

function getSectionHeaderTitleForTable(table){
  const section = table.closest(".section");
  const titleEl = section ? qs(".section-header span, .section-header", section) : null;
  if (!titleEl) return "";
  return (titleEl.textContent || "").trim();
}

/** Fallback: locate the closest Notes block inside the same page-section */
function findFallbackNotesBlockId(table){
  const page = table.closest(".page-section");
  if (!page) return "";

  // If table is in Opcodes page, prefer "Notes — Opcodes & Pricing"
  if (page.id === "opcodes-pricing"){
    const block = qsa(".section-block", page).find(b=>{
      const h = qs("h2", b);
      return h && (h.textContent || "").trim().toLowerCase().includes("notes — opcodes");
    });
    if (block){
      if (!block.id) block.id = "notes-opcodes";
      return block.id;
    }
    return "notes-opcodes";
  }

  // In Training Checklist page, find a Notes block below the table’s section
  if (page.id === "training-checklist"){
    const section = table.closest(".section");
    if (section){
      // find next sibling section-block with h2 containing "Notes"
      let node = section.nextElementSibling;
      while (node){
        if (node.classList?.contains("section-block")){
          const h2 = qs("h2", node);
          if (h2 && (h2.textContent || "").trim().toLowerCase().startsWith("notes")){
            if (!node.id){
              // best effort id
              node.id = "notes-" + Math.random().toString(16).slice(2);
            }
            return node.id;
          }
          // If it’s a section-block but not notes, break (we passed it)
          break;
        }
        node = node.nextElementSibling;
      }
    }
  }

  // Absolute fallback: first notes block in page
  const firstNotes = qsa(".section-block", page).find(b=>{
    const h2 = qs("h2", b);
    return h2 && (h2.textContent || "").trim().toLowerCase().startsWith("notes");
  });
  if (firstNotes){
    if (!firstNotes.id) firstNotes.id = "notes-" + Math.random().toString(16).slice(2);
    return firstNotes.id;
  }

  return "";
}

function getNotesTargetIdForTable(table){
  const page = table.closest(".page-section");
  const pageId = page?.id || "";

  // Opcodes table -> notes-opcodes
  if (pageId === "opcodes-pricing"){
    // Use explicit id if you added it; otherwise create it on the notes block
    const explicit = qs("#notes-opcodes");
    if (explicit) return "notes-opcodes";
    return findFallbackNotesBlockId(table) || "notes-opcodes";
  }

  // Training Checklist tables -> map by section title
  if (pageId === "training-checklist"){
    const title = getSectionHeaderTitleForTable(table);
    const target = NOTES_TARGETS_BY_SECTION_TITLE[title];
    if (target) return target;
    return findFallbackNotesBlockId(table);
  }

  return findFallbackNotesBlockId(table);
}

/** Use the "same icon style as other pages" — safest is a button with 📝 and shared classes.
    If you already have an icon class elsewhere, keep these class names and style them in CSS. */
function buildNotesIconButton(targetId){
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "notes-icon-btn";
  btn.setAttribute("aria-label", "Open Notes");
  if (targetId) btn.dataset.notesTarget = targetId;

  // Icon (simple, reliable). If you have an existing SVG elsewhere, swap it here.
  const span = document.createElement("span");
  span.className = "notes-icon";
  span.setAttribute("aria-hidden", "true");
  span.textContent = "📝";

  btn.appendChild(span);
  return btn;
}

function ensureNotesColumnForTable(table){
  if (!table) return;

  const theadRow = qs("thead tr", table);
  const tbody = qs("tbody", table);
  if (!theadRow || !tbody) return;

  // Do we already have a Notes column?
  const ths = qsa("th", theadRow).map(th => (th.textContent || "").trim().toLowerCase());
  const hasNotes = ths.includes("notes");
  if (!hasNotes){
    const th = document.createElement("th");
    th.textContent = "Notes";
    th.className = "notes-col-head";
    theadRow.appendChild(th);
  }

  // Ensure each row has the td + button
  const targetId = getNotesTargetIdForTable(table);
  qsa("tr", tbody).forEach(tr=>{
    // If already has a notes cell (by class), skip
    const existing = qs("td.notes-col-cell", tr);
    if (existing) return;

    const td = document.createElement("td");
    td.className = "notes-col-cell";

    const btn = buildNotesIconButton(targetId);
    td.appendChild(btn);

    tr.appendChild(td);
  });
}

function addNotesColumnsEverywhere(){
  // Training Checklist tables
  qsa("#training-checklist table.training-table").forEach(ensureNotesColumnForTable);

  // Opcodes table(s)
  qsa("#opcodes-pricing table.training-table").forEach(ensureNotesColumnForTable);
}

function flashTarget(el){
  if (!el) return;
  el.classList.add("notes-jump-flash");
  setTimeout(()=> el.classList.remove("notes-jump-flash"), 900);
}

function scrollToNotesTarget(targetId){
  if (!targetId) return;

  // If target is not on current page, still works after showSection sets it active.
  const el = qs(`#${CSS.escape(targetId)}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  flashTarget(el);

  // focus first textarea if present
  const ta = qs("textarea", el);
  ta?.focus?.();
}

function wireNotesIconClicks(){
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".notes-icon-btn");
    if (!btn) return;

    const targetId = btn.dataset.notesTarget || "";
    const page = btn.closest(".page-section");
    const pageId = page?.id || "";

    // Make sure we are on the correct page section
    if (pageId && !page.classList.contains("active")){
      showSection(pageId);
    }

    // If your Notes blocks are on the same page, this will work immediately.
    // If ids aren't present, scrollToNotesTarget will no-op; add ids for best result.
    scrollToNotesTarget(targetId);
  });
}

/* ---------------------------
   Reset buttons wiring
--------------------------- */
function wireResetButtons(){
  // Reset This Page buttons
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".clear-page-btn");
    if (!btn) return;
    const page = btn.closest(".page-section");
    clearSection(page);
  });

  // Clear all
  const clearBtn = qs("#clearAllBtn");
  clearBtn?.addEventListener("click", clearAll);
}

/* ---------------------------
   Init
--------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  wireAutosave();
  restoreAllFields();

  wireNav();
  wireResetButtons();
  wireAdditionalTrainers();
  wireAdditionalPOC();
  wireTableAddRowButtons();
  wireSupportTickets();
  wireMapButton();

  // ✅ Notes column + clicking behavior
  addNotesColumnsEverywhere();
  wireNotesIconClicks();

  // Initial sync
  syncTwoColHeights();

  // Default active section safety
  const active = qs(".page-section.active")?.id;
  if (active) showSection(active);
});
