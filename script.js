/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Includes:
   - Sidebar navigation (show/hide page sections + active button)
   - LocalStorage autosave for inputs/selects/textarea (incl. dynamic rows)
   - “Reset This Page” + “Clear All” behaviors
   - Ghost placeholder styling for selects + date placeholders
   - Training tables: Add Row (+) clones for all .training-table tables
   - Additional Trainers (+) row: clones w/ proper classes + rounded input
   - Primary Contacts: Additional POC (+) clone support (if present)
   - Support Tickets: Add/Remove cards + FIXED validation (scoped to clicked card)
   - Support Tickets: Auto-move cards to correct status column on status change
   - Dealership name display + map iframe update + places autocomplete hook
   - Notes: textarea auto-grow + optional 2-col card height sync (safe)
   - Save All Pages as PDF (jsPDF + html2canvas)
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

function uid(){
  return "id_" + Math.random().toString(36).slice(2,10) + "_" + Date.now().toString(36);
}

function safeTrim(v){ return (v ?? "").toString().trim(); }

/* ---------------------------
   Storage keying
   - stable if element has id/name/data-key
   - otherwise assign persistent data-uid
--------------------------- */
function ensureUID(el){
  if (!el) return null;
  if (el.dataset && el.dataset.uid) return el.dataset.uid;
  const newId = uid();
  el.dataset.uid = newId;
  return newId;
}

function getFieldKey(el){
  // Prefer explicit identifiers
  if (el.id) return `mkc:${el.id}`;
  if (el.name) return `mkc:${el.name}`;
  const dk = el.getAttribute("data-key");
  if (dk) return `mkc:${dk}`;

  // Otherwise ensure a persistent uid on element
  const u = ensureUID(el);
  return `mkc:uid:${u}`;
}

function saveField(el){
  try{
    const key = getFieldKey(el);
    let val = "";
    if (el.type === "checkbox") val = el.checked ? "1" : "0";
    else val = el.value ?? "";
    localStorage.setItem(key, val);
  }catch(e){}
}

function loadField(el){
  try{
    const key = getFieldKey(el);
    const stored = localStorage.getItem(key);
    if (stored === null) return;

    if (el.type === "checkbox") el.checked = (stored === "1");
    else el.value = stored;

    // refresh placeholder styling
    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
  }catch(e){}
}

function clearFieldStorage(el){
  try{
    const key = getFieldKey(el);
    localStorage.removeItem(key);
  }catch(e){}
}

/* ---------------------------
   Ghost placeholder support
--------------------------- */
function applySelectGhost(sel){
  if (!sel || sel.tagName !== "SELECT") return;

  // Ghost if:
  // - value empty OR selected option has data-ghost="true"
  const opt = sel.selectedOptions && sel.selectedOptions[0];
  const ghost = (!sel.value) || (opt && opt.dataset && opt.dataset.ghost === "true");
  if (ghost) sel.classList.add("is-placeholder");
  else sel.classList.remove("is-placeholder");
}

function applyDateGhost(input){
  if (!input || input.type !== "date") return;
  // If empty show placeholder color class; your CSS handles .is-placeholder
  if (!input.value) input.classList.add("is-placeholder");
  else input.classList.remove("is-placeholder");
}

/* ---------------------------
   Textarea auto-grow
--------------------------- */
function autoGrowTA(ta){
  if (!ta) return;
  // auto-grow without jumping
  ta.style.height = "auto";
  ta.style.height = (ta.scrollHeight + 2) + "px";
}

function initTextareas(root=document){
  qsa("textarea", root).forEach(ta=>{
    autoGrowTA(ta);
    ta.addEventListener("input", ()=>{
      autoGrowTA(ta);
      saveField(ta);
      // optional card height sync after growth
      requestAnimationFrame(syncTwoColHeights);
    });
  });
}

/* ---------------------------
   Optional 2-col height sync (safe)
   - only for .cards-grid.two-col and .two-col-grid rows
--------------------------- */
function syncTwoColHeights(){
  // You said you already have JS-driven height sync elsewhere — this is safe
  // and will not fight your CSS because cards are flex columns.
  const grids = qsa(".cards-grid.two-col, .two-col-grid");
  grids.forEach(grid=>{
    const cards = qsa(":scope > .section-block", grid);
    if (cards.length < 2) return;

    // reset
    cards.forEach(c=> c.style.minHeight = "");

    // pair up by row: 2 columns layout
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
   Page Navigation
--------------------------- */
function showSection(id){
  const sections = qsa(".page-section");
  sections.forEach(s=> s.classList.remove("active"));
  const target = qs(`#${id}`);
  if (target) target.classList.add("active");

  // update nav
  qsa(".nav-btn").forEach(btn=>{
    const to = btn.getAttribute("data-target");
    btn.classList.toggle("active", to === id);
  });

  // re-sync heights for visible section
  requestAnimationFrame(()=>{
    initTextareas(target || document);
    syncTwoColHeights();
  });

  // remember last page
  try{ localStorage.setItem("mkc:lastPage", id); }catch(e){}
}

function initNav(){
  qsa(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const target = btn.getAttribute("data-target");
      if (target) showSection(target);
    });
  });

  // default to last page if present
  const last = localStorage.getItem("mkc:lastPage");
  if (last && qs(`#${last}`)) showSection(last);
  else{
    // if one is already active, keep it; otherwise show first
    const active = qs(".page-section.active");
    if (!active){
      const first = qs(".page-section");
      if (first && first.id) showSection(first.id);
    }
  }
}

/* ---------------------------
   Reset This Page / Clear All
--------------------------- */
function resetSection(section){
  if (!section) return;

  // Clear all fields in section
  qsa("input, select, textarea", section).forEach(el=>{
    if (!isField(el)) return;

    // clear storage key
    clearFieldStorage(el);

    if (el.type === "checkbox") el.checked = false;
    else el.value = "";

    if (el.tagName === "SELECT"){
      // set to first option if exists
      if (el.options && el.options.length) el.selectedIndex = 0;
      applySelectGhost(el);
    }

    if (el.type === "date") applyDateGhost(el);
    if (el.tagName === "TEXTAREA") autoGrowTA(el);
  });

  // Remove dynamic rows/cards inside section (keep base rows/cards)
  // Training tables: keep first 3 rows if you authored them, remove anything with data-clone
  qsa("[data-clone='true']", section).forEach(n=> n.remove());

  // Additional trainers container: remove everything
  const atc = qs("#additionalTrainersContainer", section);
  if (atc) atc.innerHTML = "";

  // Support tickets: keep base card in Open, wipe other containers
  if (section.id === "support-tickets"){
    ["tierTwoTicketsContainer","closedResolvedTicketsContainer","closedFeatureTicketsContainer"].forEach(id=>{
      const c = qs(`#${id}`, section);
      if (c) c.innerHTML = "";
    });

    // open container: remove all non-base cards
    const open = qs("#openTicketsContainer", section);
    if (open){
      qsa(".ticket-group", open).forEach(card=>{
        if (card.dataset.base === "true") return;
        card.remove();
      });
      // clear base card fields
      const base = qs(".ticket-group[data-base='true']", open);
      if (base){
        qsa("input, textarea, select", base).forEach(el=>{
          clearFieldStorage(el);
          if (el.type === "checkbox") el.checked = false;
          else el.value = "";
          if (el.tagName === "SELECT") applySelectGhost(el);
        });
      }
    }
  }

  // DMS: nothing special to remove

  requestAnimationFrame(()=>{
    initTextareas(section);
    syncTwoColHeights();
  });
}

function initResets(){
  // Reset this page (per section)
  qsa(".clear-page-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const sec = btn.closest(".page-section");
      if (!sec) return;
      resetSection(sec);
    });
  });

  // Clear All (sidebar button)
  const clearAll = qs("#clearAllBtn");
  if (clearAll){
    clearAll.addEventListener("click", ()=>{
      // clear all mkc:* keys
      try{
        const keys = [];
        for (let i=0; i<localStorage.length; i++){
          const k = localStorage.key(i);
          if (k && k.startsWith("mkc:")) keys.push(k);
        }
        keys.forEach(k=> localStorage.removeItem(k));
      }catch(e){}

      // full DOM reset
      qsa(".page-section").forEach(sec=> resetSection(sec));

      // also clear last page
      try{ localStorage.removeItem("mkc:lastPage"); }catch(e){}
    });
  }
}

/* ---------------------------
   Load/save all static fields
--------------------------- */
function initPersistence(){
  // Ensure every field has stable uid if needed + load stored values
  qsa("input, select, textarea").forEach(el=>{
    if (!isField(el)) return;
    // create UID early for dynamic clones too
    ensureUID(el);
    loadField(el);
  });

  // Save on input/change
  document.addEventListener("input", (e)=>{
    const el = e.target;
    if (!isField(el)) return;
    if (el.tagName === "TEXTAREA") autoGrowTA(el);
    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el);

    // dealership name display (if field exists)
    if (el.id === "dealershipNameInput"){
      updateDealershipNameDisplay(el.value);
    }
  });

  document.addEventListener("change", (e)=>{
    const el = e.target;
    if (!isField(el)) return;
    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el);
  });
}

function initGhosts(){
  qsa("select").forEach(applySelectGhost);
  qsa("input[type='date']").forEach(applyDateGhost);
}

/* ---------------------------
   Training tables: Add Row (+)
--------------------------- */
function cloneTrainingRow(row){
  const clone = row.cloneNode(true);
  clone.dataset.clone = "true";

  // clear & re-uid all fields
  qsa("input, select, textarea", clone).forEach(el=>{
    if (!isField(el)) return;
    // remove old id/name? keep structure; we rely on data-uid
    el.value = "";
    if (el.type === "checkbox") el.checked = false;
    ensureUID(el);
    applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el); // saves blank (optional)
  });

  return clone;
}

function initTableAddRow(){
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".table-footer .add-row");
    if (!btn) return;

    const container = btn.closest(".table-container");
    const table = qs("table.training-table", container);
    const tbody = qs("tbody", table);
    if (!tbody) return;

    // Use last row as template
    const last = tbody.querySelector("tr:last-child");
    if (!last) return;

    const clone = cloneTrainingRow(last);
    tbody.appendChild(clone);

    // Scroll to show new row
    clone.scrollIntoView({ behavior:"smooth", block:"nearest" });

    requestAnimationFrame(()=>{
      initTextareas(container);
      syncTwoColHeights();
    });
  });
}

/* ---------------------------
   Trainers page: Additional Trainers (+)
   HTML base row has:
   <div class="checklist-row integrated-plus indent-sub" data-base="true"> ... <button class="add-row">+</button>
   and a container: #additionalTrainersContainer
--------------------------- */
function createAdditionalTrainerRow(){
  const row = document.createElement("div");
  row.className = "checklist-row integrated-plus indent-sub trainer-clone";
  row.dataset.clone = "true";
  row.innerHTML = `
    <label>Additional Trainer</label>
    <input type="text" placeholder="Enter additional trainer name">
  `;

  // UID for input
  const input = qs("input", row);
  if (input){
    ensureUID(input);
    loadField(input);
  }
  return row;
}

function initAdditionalTrainers(){
  // Use document-level delegation so it works even if the section is re-rendered
  document.addEventListener("click", (e)=>{
    const addBtn = e.target.closest(
      "#trainers-deployment .checklist-row.integrated-plus[data-base='true'] .add-row"
    );
    if (!addBtn) return;

    const page = qs("#trainers-deployment");
    if (!page) return;

    const baseRow = addBtn.closest(".checklist-row.integrated-plus[data-base='true']");
    if (baseRow) baseRow.classList.add("trainer-base"); // for your CSS sizing

    // Find the container; if missing, fallback to inserting after the base row
    let container = qs("#additionalTrainersContainer", page);

    const newRow = document.createElement("div");
    newRow.className = "checklist-row integrated-plus indent-sub trainer-clone";
    newRow.dataset.clone = "true";
    newRow.innerHTML = `
      <label>Additional Trainer</label>
      <input type="text" placeholder="Enter additional trainer name">
    `;

    // storage + ghost handling
    const input = qs("input", newRow);
    if (input){
      ensureUID(input);
      loadField(input);
    }

    if (container){
      container.appendChild(newRow);
    } else if (baseRow && baseRow.parentNode){
      baseRow.parentNode.insertBefore(newRow, baseRow.nextSibling);
    }

    // focus
    if (input) input.focus();
  });
}

/* ---------------------------
   Primary Contacts: Additional POC (+) (if present)
   Looks for .mini-card.additional-poc-card and a base integrated-plus row.
--------------------------- */
function initAdditionalPOC(){
  // Event delegation: any .additional-poc-card base row + button
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".additional-poc-card[data-base='true'] .additional-poc-add, .additional-poc-card[data-base='true'] .add-row");
    if (!btn) return;

    const baseCard = btn.closest(".additional-poc-card");
    if (!baseCard) return;

    // Find the list/container this card lives in
    const grid = baseCard.parentElement;
    if (!grid) return;

    // Clone the card
    const clone = baseCard.cloneNode(true);
    clone.dataset.clone = "true";
    clone.removeAttribute("data-base");

    // Remove + button row button inside clone
    const addBtn = qs(".additional-poc-add, .add-row", clone);
    if (addBtn) addBtn.remove();

    // Clear all inputs in clone and assign uids
    qsa("input, select, textarea", clone).forEach(el=>{
      if (!isField(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
      ensureUID(el);
      applySelectGhost(el);
      if (el.type === "date") applyDateGhost(el);
    });

    grid.appendChild(clone);
    const firstInput = qs("input, select, textarea", clone);
    if (firstInput) firstInput.focus();
  });
}

/* ---------------------------
   Support Tickets
   - Add/Remove
   - Validation FIX (scoped to clicked card)
   - Status change moves card between columns
--------------------------- */
function statusToContainerId(status){
  switch(status){
    case "Open": return "openTicketsContainer";
    case "Tier Two": return "tierTwoTicketsContainer";
    case "Closed - Resolved": return "closedResolvedTicketsContainer";
    case "Closed - Feature Not Supported": return "closedFeatureTicketsContainer";
    default: return "openTicketsContainer";
  }
}

function lockOpenSelect(card){
  const sel = qs(".ticket-status-select", card);
  if (!sel) return;
  sel.value = "Open";
  sel.disabled = true;
}

function unlockStatusSelect(card){
  const sel = qs(".ticket-status-select", card);
  if (!sel) return;
  sel.disabled = false;
}

function isTicketCardComplete(card){
  const num = safeTrim(qs(".ticket-number-input", card)?.value);
  const url = safeTrim(qs(".ticket-zendesk-input", card)?.value);
  const sum = safeTrim(qs(".ticket-summary-input", card)?.value);
  return !!(num && url && sum);
}

function makeTicketCloneFromBase(baseCard){
  const clone = baseCard.cloneNode(true);
  clone.dataset.clone = "true";
  clone.removeAttribute("data-base");

  // clear values
  qsa("input, textarea, select", clone).forEach(el=>{
    if (!isField(el)) return;
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    ensureUID(el);
    applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
  });

  // remove disclaimer from clones
  const disc = qs(".ticket-disclaimer", clone);
  if (disc) disc.remove();

  // convert + to X
  const addBtn = qs(".add-ticket-btn", clone);
  if (addBtn){
    addBtn.textContent = "×";
    addBtn.title = "Remove Ticket";
    addBtn.classList.add("remove-ticket-btn");
    addBtn.classList.remove("add-ticket-btn");
  }

  // status select should be editable on clones
  unlockStatusSelect(clone);

  return clone;
}

function moveTicketCard(card, newStatus){
  const page = qs("#support-tickets");
  if (!page || !card) return;

  const destId = statusToContainerId(newStatus);
  const dest = qs(`#${destId}`, page);
  if (!dest) return;

  dest.appendChild(card);

  // lock Open base card select
  if (destId === "openTicketsContainer" && card.dataset.base === "true"){
    lockOpenSelect(card);
  }else{
    unlockStatusSelect(card);
  }
}

function initSupportTickets(){
  const page = qs("#support-tickets");
  if (!page) return;

  // Ensure base "Open" card is locked Open
  const openBase = qs("#openTicketsContainer .ticket-group[data-base='true']", page);
  if (openBase) lockOpenSelect(openBase);

  // Delegated click handler for add/remove
  document.addEventListener("click", (e)=>{
    const addBtn = e.target.closest(".add-ticket-btn");
    const removeBtn = e.target.closest(".remove-ticket-btn");
    if (!addBtn && !removeBtn) return;

    const card = e.target.closest(".ticket-group");
    if (!card) return;

    e.preventDefault();
    e.stopPropagation();

    // REMOVE
    if (removeBtn){
      // also clear stored values for fields inside removed card
      qsa("input, select, textarea", card).forEach(el=> clearFieldStorage(el));
      card.remove();
      return;
    }

    // ADD — validate only this card (FIX)
    if (!isTicketCardComplete(card)){
      alert("Complete Ticket Number, Zendesk URL, and Summary before adding another ticket.");
      return;
    }

    // base card to clone from (always use the Open base if present)
    const base = qs("#openTicketsContainer .ticket-group[data-base='true']", page) || card;

    const newCard = makeTicketCloneFromBase(base);

    // append to Open by default
    const openContainer = qs("#openTicketsContainer", page);
    if (openContainer) openContainer.appendChild(newCard);

    newCard.scrollIntoView({ behavior:"smooth", block:"center" });
  });

  // Delegated change handler for status moves
  document.addEventListener("change", (e)=>{
    const sel = e.target.closest("#support-tickets .ticket-status-select");
    if (!sel) return;

    const card = e.target.closest(".ticket-group");
    if (!card) return;

    const val = sel.value;

    // If base card, keep it Open + locked
    if (card.dataset.base === "true"){
      lockOpenSelect(card);
      return;
    }

    moveTicketCard(card, val);
  });
}

/* ---------------------------
   Dealership Name display + Map
--------------------------- */
function updateDealershipNameDisplay(name){
  const display = qs("#dealershipNameDisplay");
  if (!display) return;
  display.textContent = safeTrim(name);
  try{ localStorage.setItem("mkc:dealershipNameDisplay", display.textContent); }catch(e){}
}

function restoreDealershipNameDisplay(){
  const v = localStorage.getItem("mkc:dealershipNameDisplay");
  if (!v) return;
  updateDealershipNameDisplay(v);
}

function updateDealershipMap(address){
  // If you have an iframe with id="dealershipMapFrame" or similar
  const frame = qs("#dealershipMapFrame") || qs("iframe.map-frame");
  if (!frame) return;

  const q = encodeURIComponent(address);
  // Uses Google Maps embed "search" style
  frame.src = `https://www.google.com/maps?q=${q}&output=embed`;

  // persist last map address
  try{ localStorage.setItem("mkc:dealershipMapAddress", address); }catch(e){}
}

function restoreDealershipMap(){
  const addr = localStorage.getItem("mkc:dealershipMapAddress");
  if (addr) updateDealershipMap(addr);
}

/* ---------------------------
   PDF Export (Save All Pages)
   Requires:
   - html2canvas
   - jsPDF
--------------------------- */
async function exportAllPagesPDF(){
  const btn = qs("#savePDF");
  if (btn){
    btn.disabled = true;
    btn.textContent = "Saving PDF...";
  }

  // Snapshot each page section in order
  const sections = qsa(".page-section");

  // Temporarily show all sections for capture
  const activeId = qs(".page-section.active")?.id;
  sections.forEach(s=> s.classList.add("active"));

  // Ensure layout settled
  await new Promise(r=> setTimeout(r, 80));
  syncTwoColHeights();
  await new Promise(r=> setTimeout(r, 80));

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF || !window.html2canvas){
    alert("PDF tools missing. Make sure jsPDF and html2canvas are loaded.");
    // restore
    sections.forEach(s=> s.classList.remove("active"));
    if (activeId) showSection(activeId);
    if (btn){
      btn.disabled = false;
      btn.textContent = "Save All Pages as PDF";
    }
    return;
  }

  const pdf = new jsPDF("p", "pt", "letter"); // 612x792
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  let first = true;

  for (const sec of sections){
    // skip empty hidden sections? capture all
    // Slight padding so shadow isn’t clipped
    const canvas = await window.html2canvas(sec, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY
    });

    const img = canvas.toDataURL("image/png");
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (!first) pdf.addPage();

    // If content taller than one PDF page, slice it
    if (imgH <= pageH){
      pdf.addImage(img, "PNG", 0, 0, imgW, imgH);
    }else{
      // slice canvas into multiple pages
      let remaining = imgH;
      let y = 0;

      // Create a helper canvas for slicing
      const sliceCanvas = document.createElement("canvas");
      const ctx = sliceCanvas.getContext("2d");

      const pxPerPt = canvas.width / imgW; // pixels per point
      const pagePxH = Math.floor(pageH * pxPerPt);

      sliceCanvas.width = canvas.width;
      sliceCanvas.height = pagePxH;

      while (remaining > 0){
        ctx.clearRect(0,0,sliceCanvas.width,sliceCanvas.height);
        ctx.drawImage(canvas, 0, y * pxPerPt, canvas.width, pagePxH, 0, 0, canvas.width, pagePxH);
        const sliceImg = sliceCanvas.toDataURL("image/png");
        pdf.addImage(sliceImg, "PNG", 0, 0, imgW, pageH);

        remaining -= pageH;
        y += pageH;

        if (remaining > 0) pdf.addPage();
      }
    }

    first = false;
  }

  pdf.save("myKaarma_Interactive_Training_Checklist.pdf");

  // Restore only active section
  sections.forEach(s=> s.classList.remove("active"));
  if (activeId) showSection(activeId);

  if (btn){
    btn.disabled = false;
    btn.textContent = "Save All Pages as PDF";
  }
}

function initPDF(){
  const btn = qs("#savePDF");
  if (!btn) return;
  btn.addEventListener("click", exportAllPagesPDF);
}

/* ---------------------------
   Ensure support tickets + DMS integration aren't "broken"
   (CSS issues are separate, but JS here prevents logic breakage)
--------------------------- */
function initDMSIntegration(){
  // Nothing required for the DMS cards (static),
  // but we’ll ensure any selects inside get ghost styling
  const page = qs("#dms-integration");
  if (!page) return;
  qsa("select", page).forEach(applySelectGhost);
}

/* ---------------------------
   Init on DOM ready
--------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  // Nav + active page
  initNav();

  // Ghost text
  initGhosts();

  // Persistence
  initPersistence();

  // Textareas + card height sync
  initTextareas(document);
  syncTwoColHeights();
  window.addEventListener("resize", ()=> requestAnimationFrame(syncTwoColHeights));

  // Reset behaviors
  initResets();

  // Training tables add row
  initTableAddRow();

  // Trainers additional trainers
  initAdditionalTrainers();

  // Primary contacts additional POC (if present)
  initAdditionalPOC();

  // Support tickets logic + validation fix + move cards by status
  initSupportTickets();

  // DMS integration hook
  initDMSIntegration();

  // Dealership display + map restore
  restoreDealershipNameDisplay();
  restoreDealershipMap();

  // PDF
  initPDF();

  // Any date inputs should get placeholder style on load
  qsa("input[type='date']").forEach(applyDateGhost);

  // If you have a dealership name input, sync display on load
  const dn = qs("#dealershipNameInput");
  if (dn && safeTrim(dn.value)) updateDealershipNameDisplay(dn.value);
});

/* ---------------------------
   Google Places callback (from your inline HTML)
   NOTE: your HTML calls initAutocomplete() in global scope.
   Leaving that in HTML is fine. This file does not override it.
--------------------------- */
window.updateDealershipMap = updateDealershipMap;
window.updateDealershipNameDisplay = updateDealershipNameDisplay;
