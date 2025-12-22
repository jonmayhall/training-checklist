/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Fixes:
   - Nav clicks work
   - Add Trainer (+) works
   - Support Tickets: add/remove, status move, validation scoped, base clears after add
   - Autosave + reset/clear + PDF + dates end defaults
   - ✅ NOTES LINKING: Option 2 ONLY (single 📝 icon)
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
--------------------------- */
function ensureUID(el){
  if (!el) return null;
  if (el.dataset && el.dataset.uid) return el.dataset.uid;
  const newId = uid();
  el.dataset.uid = newId;
  return newId;
}

function getFieldKey(el){
  if (el.id) return `mkc:${el.id}`;
  if (el.name) return `mkc:${el.name}`;
  const dk = el.getAttribute("data-key");
  if (dk) return `mkc:${dk}`;
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
  const opt = sel.selectedOptions && sel.selectedOptions[0];
  const ghost = (!sel.value) || (opt && opt.dataset && opt.dataset.ghost === "true");
  if (ghost) sel.classList.add("is-placeholder");
  else sel.classList.remove("is-placeholder");
}

function applyDateGhost(input){
  if (!input || input.type !== "date") return;
  if (!input.value) input.classList.add("is-placeholder");
  else input.classList.remove("is-placeholder");
}

/* ---------------------------
   Textarea auto-grow
--------------------------- */
function autoGrowTA(ta){
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = (ta.scrollHeight + 2) + "px";
}

function initTextareas(root=document){
  qsa("textarea", root).forEach(ta=>{
    autoGrowTA(ta);
    ta.addEventListener("input", ()=>{
      autoGrowTA(ta);
      saveField(ta);
      requestAnimationFrame(syncTwoColHeights);
      // keep note icons updated if user types into notes
      requestAnimationFrame(()=> updateNoteIconStates());
    });
  });
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
   Page Navigation
--------------------------- */
function showSection(id){
  const sections = qsa(".page-section");
  sections.forEach(s=> s.classList.remove("active"));
  const target = qs(`#${id}`);
  if (target) target.classList.add("active");

  qsa(".nav-btn").forEach(btn=>{
    const to = btn.getAttribute("data-target");
    btn.classList.toggle("active", to === id);
  });

  requestAnimationFrame(()=>{
    initTextareas(target || document);
    syncTwoColHeights();
    // ✅ ensure note icons exist on newly shown page
    initNotesLinkingOption2Only(target || document);
    updateNoteIconStates(target || document);
  });

  try{ localStorage.setItem("mkc:lastPage", id); }catch(e){}
}

function initNav(){
  qsa(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const target = btn.getAttribute("data-target");
      if (target) showSection(target);
    });
  });

  const last = localStorage.getItem("mkc:lastPage");
  if (last && qs(`#${last}`)) showSection(last);
  else{
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

  qsa("input, select, textarea", section).forEach(el=>{
    if (!isField(el)) return;

    clearFieldStorage(el);

    if (el.type === "checkbox") el.checked = false;
    else el.value = "";

    if (el.tagName === "SELECT"){
      if (el.options && el.options.length) el.selectedIndex = 0;
      applySelectGhost(el);
    }
    if (el.type === "date") applyDateGhost(el);
    if (el.tagName === "TEXTAREA") autoGrowTA(el);
  });

  qsa("[data-clone='true']", section).forEach(n=> n.remove());

  const atc = qs("#additionalTrainersContainer", section);
  if (atc) atc.innerHTML = "";

  if (section.id === "support-tickets"){
    ["tierTwoTicketsContainer","closedResolvedTicketsContainer","closedFeatureTicketsContainer"].forEach(id=>{
      const c = qs(`#${id}`, section);
      if (c) c.innerHTML = "";
    });

    const open = qs("#openTicketsContainer", section);
    if (open){
      qsa(".ticket-group", open).forEach(card=>{
        if (card.dataset.base === "true") return;
        card.remove();
      });

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

  requestAnimationFrame(()=>{
    initTextareas(section);
    syncTwoColHeights();
    updateNoteIconStates(section);
  });
}

function initResets(){
  qsa(".clear-page-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const sec = btn.closest(".page-section");
      if (!sec) return;
      resetSection(sec);
    });
  });

  const clearAll = qs("#clearAllBtn");
  if (clearAll){
    clearAll.addEventListener("click", ()=>{
      try{
        const keys = [];
        for (let i=0; i<localStorage.length; i++){
          const k = localStorage.key(i);
          if (k && k.startsWith("mkc:")) keys.push(k);
        }
        keys.forEach(k=> localStorage.removeItem(k));
      }catch(e){}

      qsa(".page-section").forEach(sec=> resetSection(sec));
      try{ localStorage.removeItem("mkc:lastPage"); }catch(e){}
    });
  }
}

/* ---------------------------
   Persistence
--------------------------- */
function initPersistence(){
  qsa("input, select, textarea").forEach(el=>{
    if (!isField(el)) return;
    ensureUID(el);
    loadField(el);
  });

  document.addEventListener("input", (e)=>{
    const el = e.target;
    if (!isField(el)) return;
    if (el.tagName === "TEXTAREA") autoGrowTA(el);
    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el);

    if (el.id === "dealershipNameInput"){
      updateDealershipNameDisplay(el.value);
    }

    // notes icon state
    requestAnimationFrame(()=> updateNoteIconStates());
  });

  document.addEventListener("change", (e)=>{
    const el = e.target;
    if (!isField(el)) return;
    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el);

    requestAnimationFrame(()=> updateNoteIconStates());
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

  qsa("input, select, textarea", clone).forEach(el=>{
    if (!isField(el)) return;
    el.value = "";
    if (el.type === "checkbox") el.checked = false;
    ensureUID(el);
    applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el);
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

    const last = tbody.querySelector("tr:last-child");
    if (!last) return;

    const clone = cloneTrainingRow(last);
    tbody.appendChild(clone);

    clone.scrollIntoView({ behavior:"smooth", block:"nearest" });

    requestAnimationFrame(()=>{
      initTextareas(container);
      syncTwoColHeights();
      // notes linking only applies to checklist rows, but safe:
      initNotesLinkingOption2Only(document);
      updateNoteIconStates(document);
    });
  });
}

/* ---------------------------
   Onsite Training Dates: end defaults to start + 2
--------------------------- */
function addDaysISO(iso, days){
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function initOnsiteTrainingDates(){
  const start = qs("#onsiteStartDate");
  const end   = qs("#onsiteEndDate");
  if (start && end){
    start.addEventListener("change", ()=>{
      if (!start.value) return;
      if (end.value) return;
      const v = addDaysISO(start.value, 2);
      if (v){
        end.value = v;
        applyDateGhost(end);
        saveField(end);
      }
    });
  }
}

/* ---------------------------
   Trainers page: Additional Trainers (+)
--------------------------- */
function initAdditionalTrainers(){
  document.addEventListener("click", (e)=>{
    const addBtn = e.target.closest(
      "#trainers-deployment .checklist-row.integrated-plus[data-base='true'] .add-row"
    );
    if (!addBtn) return;

    const page = qs("#trainers-deployment");
    if (!page) return;

    const baseRow = addBtn.closest(".checklist-row.integrated-plus[data-base='true']");
    if (baseRow) baseRow.classList.add("trainer-base");

    const container = qs("#additionalTrainersContainer", page);

    const newRow = document.createElement("div");
    newRow.className = "checklist-row integrated-plus indent-sub trainer-clone";
    newRow.dataset.clone = "true";
    newRow.innerHTML = `
      <label>Additional Trainer</label>
      <input type="text" placeholder="Enter additional trainer name">
    `;

    const input = qs("input", newRow);
    if (input){
      ensureUID(input);
      loadField(input);
    }

    if (container){
      container.appendChild(newRow);
    }else if (baseRow && baseRow.parentNode){
      baseRow.parentNode.insertBefore(newRow, baseRow.nextSibling);
    }

    if (input) input.focus();

    requestAnimationFrame(()=>{
      initNotesLinkingOption2Only(page);
      updateNoteIconStates(page);
      syncTwoColHeights();
    });
  });
}

/* ---------------------------
   Primary Contacts: Additional POC (+)
--------------------------- */
function initAdditionalPOC(){
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".additional-poc-card[data-base='true'] .additional-poc-add, .additional-poc-card[data-base='true'] .add-row");
    if (!btn) return;

    const baseCard = btn.closest(".additional-poc-card");
    if (!baseCard) return;

    const grid = baseCard.parentElement; // <-- .primary-contacts-grid
    if (!grid) return;

    const clone = baseCard.cloneNode(true);
    clone.dataset.clone = "true";
    clone.removeAttribute("data-base");

    const addBtn = qs(".additional-poc-add, .add-row", clone);
    if (addBtn) addBtn.remove();

    qsa("input, select, textarea", clone).forEach(el=>{
      if (!isField(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
      ensureUID(el);
      applySelectGhost(el);
      if (el.type === "date") applyDateGhost(el);
      saveField(el);
    });

    grid.appendChild(clone);

    const firstInput = qs("input, select, textarea", clone);
    if (firstInput) firstInput.focus();

    requestAnimationFrame(()=>{
      initNotesLinkingOption2Only(document);
      updateNoteIconStates(document);
      syncTwoColHeights();
    });
  });
}

/* ---------------------------
   Support Tickets
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
  if (!sel.value) sel.value = "Open";
  applySelectGhost(sel);
  saveField(sel);
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

  qsa("input, textarea, select", clone).forEach(el=>{
    if (!isField(el)) return;
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    ensureUID(el);
    applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el);
  });

  const disc = qs(".ticket-disclaimer", clone);
  if (disc) disc.remove();

  const addBtn = qs(".add-ticket-btn", clone);
  if (addBtn){
    addBtn.textContent = "×";
    addBtn.title = "Remove Ticket";
    addBtn.classList.add("remove-ticket-btn");
    addBtn.classList.remove("add-ticket-btn");
  }

  const sel = qs(".ticket-status-select", clone);
  if (sel){
    sel.value = "Open";
    applySelectGhost(sel);
    saveField(sel);
  }

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

  if (destId === "openTicketsContainer" && card.dataset.base === "true"){
    lockOpenSelect(card);
  }else{
    unlockStatusSelect(card);
  }
}

function initSupportTickets(){
  const page = qs("#support-tickets");
  if (!page) return;

  const openBase = qs("#openTicketsContainer .ticket-group[data-base='true']", page);
  if (openBase) lockOpenSelect(openBase);

  document.addEventListener("click", (e)=>{
    const addBtn = e.target.closest(".add-ticket-btn");
    const removeBtn = e.target.closest(".remove-ticket-btn");
    if (!addBtn && !removeBtn) return;

    const card = e.target.closest(".ticket-group");
    if (!card) return;

    e.preventDefault();
    e.stopPropagation();

    if (removeBtn){
      qsa("input, select, textarea", card).forEach(el=> clearFieldStorage(el));
      card.remove();
      return;
    }

    if (!isTicketCardComplete(card)){
      alert("Complete Ticket Number, Zendesk URL, and Summary before adding another ticket.");
      return;
    }

    const base = qs("#openTicketsContainer .ticket-group[data-base='true']", page) || card;
    const newCard = makeTicketCloneFromBase(base);

    const openContainer = qs("#openTicketsContainer", page);
    if (openContainer) openContainer.appendChild(newCard);

    if (card.dataset.base === "true"){
      const num = qs(".ticket-number-input", card);
      const url = qs(".ticket-zendesk-input", card);
      const sum = qs(".ticket-summary-input", card);

      [num, url, sum].forEach(el=>{
        if (!el) return;
        clearFieldStorage(el);
        el.value = "";
        saveField(el);
      });

      lockOpenSelect(card);
    }

    newCard.scrollIntoView({ behavior:"smooth", block:"center" });
  });

  document.addEventListener("change", (e)=>{
    const sel = e.target.closest("#support-tickets .ticket-status-select");
    if (!sel) return;

    const card = e.target.closest(".ticket-group");
    if (!card) return;

    const val = sel.value;

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
  const frame = qs("#dealershipMapFrame") || qs("iframe.map-frame");
  if (!frame) return;

  const q = encodeURIComponent(address);
  frame.src = `https://www.google.com/maps?q=${q}&output=embed`;

  try{ localStorage.setItem("mkc:dealershipMapAddress", address); }catch(e){}
}

function restoreDealershipMap(){
  const addr = localStorage.getItem("mkc:dealershipMapAddress");
  if (addr) updateDealershipMap(addr);
}

/* ---------------------------
   PDF Export
--------------------------- */
async function exportAllPagesPDF(){
  const btn = qs("#savePDF");
  if (btn){
    btn.disabled = true;
    btn.textContent = "Saving PDF...";
  }

  const sections = qsa(".page-section");
  const activeId = qs(".page-section.active")?.id;
  sections.forEach(s=> s.classList.add("active"));

  await new Promise(r=> setTimeout(r, 80));
  syncTwoColHeights();
  await new Promise(r=> setTimeout(r, 80));

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF || !window.html2canvas){
    alert("PDF tools missing. Make sure jsPDF and html2canvas are loaded.");
    sections.forEach(s=> s.classList.remove("active"));
    if (activeId) showSection(activeId);
    if (btn){
      btn.disabled = false;
      btn.textContent = "Save All Pages as PDF";
    }
    return;
  }

  const pdf = new jsPDF("p", "pt", "letter");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  let first = true;

  for (const sec of sections){
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

    if (imgH <= pageH){
      pdf.addImage(img, "PNG", 0, 0, imgW, imgH);
    }else{
      let remaining = imgH;
      let y = 0;

      const sliceCanvas = document.createElement("canvas");
      const ctx = sliceCanvas.getContext("2d");

      const pxPerPt = canvas.width / imgW;
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

/* ===========================================================
   NOTES LINKING ...
=========================================================== */

function findNotesTextareaForRow(row){
  const wrap =
    row.closest(".cards-grid.two-col") ||
    row.closest(".two-col-grid") ||
    row.closest(".grid-2");

  if (!wrap) return null;

  const notesCard = Array.from(wrap.querySelectorAll(".section-block"))
    .find(card => {
      const h2 = card.querySelector("h2");
      return h2 && h2.textContent.trim().toLowerCase().startsWith("notes");
    });

  return notesCard ? notesCard.querySelector("textarea") : null;
}

function getCardTitleForRow(row){
  const h2 = row.closest(".section-block")?.querySelector("h2");
  if (!h2) return "";
  return (h2.textContent || "")
    .replace(/^Notes\s*[—-]\s*/i, "")
    .trim();
}

function getCleanQuestionText(row){
  const label = row.querySelector("label");
  if (!label) return "";
  const clone = label.cloneNode(true);
  clone.querySelectorAll(".note-link-btn, .note-btn").forEach(n => n.remove());
  return (clone.textContent || "").replace(/\s+/g," ").trim();
}

function makeNoteLine(row){
  const q = getCleanQuestionText(row);
  const header = getCardTitleForRow(row);
  if (!q) return "";
  return header ? `• ${header}: ${q}: ` : `• ${q}: `;
}

function isInNotesCard(row){
  const h2 = row.closest(".section-block")?.querySelector("h2");
  return (h2?.textContent || "").toLowerCase().startsWith("notes");
}

function ensureRowActions(row){
  let actions = row.querySelector(":scope > .row-actions");
  if (actions) return actions;

  actions = document.createElement("div");
  actions.className = "row-actions";

  // ONLY move a direct child input/select (prevents layout breakage)
  const field = row.querySelector(":scope > input, :scope > select");
  if (field) actions.appendChild(field);

  row.appendChild(actions);
  return actions;
}

function initNotesLinkingOption2Only(root=document){
  // Hard cleanup: remove any old icons
  qsa(".note-btn, .note-link-btn", root).forEach(n => n.remove());

  qsa(".checklist-row", root).forEach(row=>{
    if (isInNotesCard(row)) return;

    const ta = findNotesTextareaForRow(row);
    if (!ta) return;

    const actions = ensureRowActions(row);
    if (actions.querySelector(".note-link-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "note-link-btn";
    btn.title = "Add this question to Notes";
    btn.textContent = "📝";

    btn.addEventListener("click", ()=>{
      const textarea = findNotesTextareaForRow(row);
      if (!textarea) return;

      const line = makeNoteLine(row);
      if (!line) return;

      const existing = textarea.value || "";
      if (existing.includes(line.trim())){
        textarea.focus();
        updateNoteIconStates(root);
        return;
      }

      textarea.value =
        (existing.trim() ? existing.trim() + "\n" : "") + line;

      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      saveField(textarea);
      updateNoteIconStates(root);
      requestAnimationFrame(syncTwoColHeights);
    });

    // ✅ RIGHT side of the field
    actions.appendChild(btn);
  });

  updateNoteIconStates(root);
}

function updateNoteIconStates(root=document){
  qsa(".checklist-row", root).forEach(row=>{
    const btn = row.querySelector(".note-link-btn");
    if (!btn) return;

    const ta = findNotesTextareaForRow(row);
    if (!ta) return;

    const line = makeNoteLine(row).trim();
    btn.classList.toggle(
      "has-note",
      !!line && (ta.value || "").includes(line)
    );
  });
}

/* ---------------------------
   Google Places callback (from your inline HTML)
--------------------------- */
window.updateDealershipMap = updateDealershipMap;
window.updateDealershipNameDisplay = updateDealershipNameDisplay;
