/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js (STABLE + FIXED NAV)
   ✅ Fixes:
   - Nav clicks work (inline onclick + data-section + href="#id")
   - Add Row (+) for tables
   - Additional Trainers (+)
   - Primary Contacts: Additional POC (+)
   - Support Tickets: add/remove, move by status, base locked to Open, validation
   - Autosave + Reset Page + Clear All
   - Onsite dates: end defaults to start + 2 days
   - PDF export (all pages)
   - ✅ NOTES LINKING: single Notes column w/ icon (speech bubble SVG)
   - ✅ TABLE NOTES JUMP: table icon scrolls to that table’s Notes card
   - ✅ NOTES POP-OUT: expander opens modal synced + saved
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
   Textarea auto-grow (non-modal use)
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
      requestAnimationFrame(()=> updateNoteIconStates());
    });
  });
}

/* ---------------------------
   Page Navigation
--------------------------- */
function showSection(id){
  const sections = qsa(".page-section");
  sections.forEach(s=> s.classList.remove("active"));
  const target = qs(`#${CSS.escape(id)}`);
  if (target) target.classList.add("active");

  qsa(".nav-btn").forEach(btn=>{
    const to =
      btn.getAttribute("data-section") ||
      btn.getAttribute("data-target") ||
      btn.getAttribute("href")?.replace("#","") ||
      btn.getAttribute("onclick")?.match(/showSection\(['"]([^'"]+)['"]\)/)?.[1];

    btn.classList.toggle("active", to === id);
  });

  try{ localStorage.setItem("mkc:lastPage", id); }catch(e){}
}

function initNav(){
  // Works for data-section/data-target/href nav buttons (and does not break inline onclick)
  qsa(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      // prevent anchors from jumping before our handler runs
      if (btn.tagName === "A" || btn.getAttribute("href")) e.preventDefault();

      const id =
        btn.getAttribute("data-section") ||
        btn.getAttribute("data-target") ||
        btn.getAttribute("href")?.replace("#","");

      if (id) showSection(id);
    });
  });

  const last = (()=>{ try{ return localStorage.getItem("mkc:lastPage"); }catch(e){ return null; } })();
  const first = qsa(".page-section")[0]?.id;
  showSection(last || first || "dealership-info");
}

// ✅ IMPORTANT: allow inline onclick="showSection('...')" to work
window.showSection = showSection;
window.initNav = initNav;

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
    ["tierTwoTicketsContainer","closedResolvedTicketsContainer","closedFeatureTicketsContainer"]
      .forEach(id=>{
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
    initNotesExpanders(section);
    initNotesLinkingOption2Only(section);
    initTableNotesButtons(section);
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
      initNotesExpanders(document);
      initNotesLinkingOption2Only(document);
      initTableNotesButtons(document);
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
  const end = qs("#onsiteEndDate");
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

    if (container) container.appendChild(newRow);
    else if (baseRow && baseRow.parentNode) baseRow.parentNode.insertBefore(newRow, baseRow.nextSibling);

    if (input) input.focus();

    requestAnimationFrame(()=>{
      initNotesLinkingOption2Only(page);
      initTableNotesButtons(page);
      updateNoteIconStates(page);
      syncTwoColHeights();
      initNotesExpanders(page);
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

    const grid = baseCard.parentElement;
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
      initTableNotesButtons(document);
      updateNoteIconStates(document);
      syncTwoColHeights();
      initNotesExpanders(document);
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

    // clear base fields after add
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
  try{
    const v = localStorage.getItem("mkc:dealershipNameDisplay");
    if (v) updateDealershipNameDisplay(v);
  }catch(e){}
}

function updateDealershipMap(address){
  const frame = qs("#dealershipMapFrame") || qs("iframe.map-frame");
  if (!frame) return;
  const q = encodeURIComponent(address);
  frame.src = `https://www.google.com/maps?q=${q}&output=embed`;
  try{ localStorage.setItem("mkc:dealershipMapAddress", address); }catch(e){}
}
function restoreDealershipMap(){
  try{
    const addr = localStorage.getItem("mkc:dealershipMapAddress");
    if (addr) updateDealershipMap(addr);
  }catch(e){}
}

// expose for inline html callbacks
window.updateDealershipMap = updateDealershipMap;
window.updateDealershipNameDisplay = updateDealershipNameDisplay;

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
        ctx.drawImage(
          canvas,
          0, y * pxPerPt,
          canvas.width, pagePxH,
          0, 0,
          canvas.width, pagePxH
        );

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
   NOTES LINKING — Option 2 ONLY (single icon on checklist rows)
   - Only rows that have a field (input/select/textarea)
   - Adds "• Question:" lines into the Notes textarea in that group
=========================================================== */
function isNotesCard(card){
  const h2 = card?.querySelector("h2");
  const t = (h2?.textContent || "").trim().toLowerCase();
  return t.startsWith("notes");
}
function isInNotesCard(row){
  const card = row.closest(".section-block");
  return isNotesCard(card);
}
function findNotesTextareaForRow(row){
  const wrap =
    row.closest(".cards-grid.two-col") ||
    row.closest(".two-col-grid") ||
    row.closest(".grid-2");

  if (!wrap) return null;

  const notesCard = Array.from(wrap.querySelectorAll(".section-block"))
    .find(card => isNotesCard(card));

  return notesCard ? notesCard.querySelector("textarea") : null;
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
  if (!q) return "";
  return `• ${q}: `;
}
function normalizeNoteKey(line){ return (line || "").trim(); }

function getAllRowsInThisNotesGroup(row){
  const wrap =
    row.closest(".cards-grid.two-col") ||
    row.closest(".two-col-grid") ||
    row.closest(".grid-2");
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll(".checklist-row"))
    .filter(r => !isInNotesCard(r))
    .filter(r => r.querySelector("input, select, textarea"));
}
function getRowOrderKey(row){
  return normalizeNoteKey(makeNoteLine(row));
}
function findExistingNoteLineIndex(lines, baseKey){
  const k = (baseKey || "").trim();
  return lines.findIndex(l => (l || "").trim().startsWith(k));
}
function insertNoteLineInOrder(textarea, clickedRow){
  const allRows = getAllRowsInThisNotesGroup(clickedRow);
  const orderedKeys = allRows.map(r => getRowOrderKey(r)).filter(Boolean);

  const baseLine = makeNoteLine(clickedRow);
  if (!baseLine) return { didInsert:false, lineStart:0 };

  const raw = textarea.value || "";
  const lines = raw.split("\n");

  const existingIdx = findExistingNoteLineIndex(lines, baseLine);
  if (existingIdx !== -1){
    return {
      didInsert:false,
      lineStart: lines.slice(0, existingIdx).join("\n").length + (existingIdx > 0 ? 1 : 0)
    };
  }

  const myOrder = orderedKeys.indexOf(getRowOrderKey(clickedRow));
  if (myOrder === -1){
    const startPos = raw.length ? raw.length + 1 : 0;
    textarea.value = raw.trim() ? raw.trim() + "\n" + baseLine : baseLine;
    return { didInsert:true, lineStart:startPos };
  }

  let insertBeforeLineIdx = -1;
  for (let i = 0; i < lines.length; i++){
    const t = (lines[i] || "").trim();
    if (!t.startsWith("•")) continue;
    const matchOrder = orderedKeys.findIndex(k => t.startsWith(k.trim()));
    if (matchOrder !== -1 && matchOrder > myOrder){
      insertBeforeLineIdx = i;
      break;
    }
  }

  if (insertBeforeLineIdx === -1){
    const startPos = raw.length ? raw.length + 1 : 0;
    textarea.value = raw.trim() ? raw.trim() + "\n" + baseLine : baseLine;
    return { didInsert:true, lineStart:startPos };
  }

  lines.splice(insertBeforeLineIdx, 0, baseLine);
  textarea.value = lines.join("\n");
  const startPos = lines.slice(0, insertBeforeLineIdx).join("\n").length + (insertBeforeLineIdx > 0 ? 1 : 0);
  return { didInsert:true, lineStart:startPos };
}
function jumpToNoteLine(textarea, lineStart){
  if (!textarea) return;
  textarea.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    textarea.focus();
    const v = textarea.value || "";
    const lineEnd = v.indexOf("\n", lineStart);
    const endPos = (lineEnd === -1) ? v.length : lineEnd;
    textarea.setSelectionRange(endPos, endPos);
    textarea.classList.add("mk-note-jump");
    setTimeout(() => textarea.classList.remove("mk-note-jump"), 700);
  }, 120);
}
function ensureRowActions(row){
  let actions = row.querySelector(":scope > .row-actions");
  if (actions) return actions;

  actions = document.createElement("div");
  actions.className = "row-actions";

  // do not restructure integrated-plus rows
  if (row.classList.contains("integrated-plus")){
    row.appendChild(actions);
    return actions;
  }

  const field = row.querySelector(":scope > input, :scope > select, :scope > textarea");
  if (field) actions.appendChild(field);
  row.appendChild(actions);
  return actions;
}

function initNotesLinkingOption2Only(root=document){
  qsa(".note-btn, .note-link-btn", root).forEach(n => n.remove());

  qsa(".checklist-row", root).forEach(row=>{
    if (isInNotesCard(row)) return;

    const field = row.querySelector("input, select, textarea");
    if (!field) return;

    const ta = findNotesTextareaForRow(row);
    if (!ta) return;

    const actions = ensureRowActions(row);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "note-link-btn";
    btn.title = "Add this question to Notes";
    btn.innerHTML = `
      <svg class="note-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h16v12H7l-3 3V4z" fill="none"
              stroke="currentColor" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    `;

    btn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();

      const textarea = findNotesTextareaForRow(row);
      if (!textarea) return;

      const { didInsert, lineStart } = insertNoteLineInOrder(textarea, row);

      if (didInsert){
        saveField(textarea);
        requestAnimationFrame(()=> updateNoteIconStates(document));
        requestAnimationFrame(syncTwoColHeights);
      }

      jumpToNoteLine(textarea, lineStart);
    });

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
    btn.classList.toggle("has-note", !!line && (ta.value || "").includes(line));
  });
}

/* ===========================================================
   TABLE NOTES BUTTONS (Training Checklist + Opcodes)
   - Adds a final "Notes" column to each .training-table on:
     #training-checklist, #opcodes-pricing
   - Clicking icon jumps to the Notes card directly BELOW that table
=========================================================== */
function getTableTitle(table){
  const section = table.closest(".section");
  const header = section?.querySelector(".section-header");
  const txt = (header?.textContent || "").replace(/\s+/g," ").trim();
  return txt || "Table Notes";
}

function findNotesBlockForTable(table){
  // expects: after table’s .section, the next .section-block "Notes — ..."
  const section = table.closest(".section");
  if (!section) return null;

  let node = section.nextElementSibling;
  while (node){
    if (node.classList?.contains("section-block")){
      const h2 = node.querySelector("h2");
      const t = (h2?.textContent || "").trim().toLowerCase();
      if (t.startsWith("notes")) return node;
      // if it’s a section-block but not notes, stop at first block
      // (keeps it tied to the correct table)
      return null;
    }
    // if we hit another .section, stop
    if (node.classList?.contains("section")) return null;
    node = node.nextElementSibling;
  }
  return null;
}

function ensureTableNotesColumn(table){
  const theadRow = table.querySelector("thead tr");
  if (!theadRow) return;

  // already added?
  if (theadRow.querySelector("th.mk-notes-col")) return;

  const th = document.createElement("th");
  th.className = "mk-notes-col";
  th.textContent = "Notes";
  theadRow.appendChild(th);

  // add td to each body row
  qsa("tbody tr", table).forEach(tr=>{
    const td = document.createElement("td");
    td.className = "mk-notes-col";
    td.innerHTML = `
      <button type="button" class="note-link-btn mk-table-note-btn" title="Jump to this table’s Notes">
        <svg class="note-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h16v12H7l-3 3V4z" fill="none"
                stroke="currentColor" stroke-width="2"
                stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
      </button>
    `;
    tr.appendChild(td);
  });
}

function initTableNotesButtons(root=document){
  const scopes = [
    "#training-checklist table.training-table",
    "#opcodes-pricing table.training-table"
  ];

  scopes.forEach(sel=>{
    qsa(sel, root).forEach(table=>{
      ensureTableNotesColumn(table);

      // wire clicks (event delegation safe too)
      table.addEventListener("click", (e)=>{
        const btn = e.target.closest(".mk-table-note-btn");
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const notesBlock = findNotesBlockForTable(table);
        const ta = notesBlock?.querySelector("textarea");
        if (!ta) return;

        // scroll + highlight
        notesBlock.scrollIntoView({ behavior:"smooth", block:"start" });
        setTimeout(()=>{
          ta.focus();
          ta.classList.add("mk-note-jump");
          setTimeout(()=> ta.classList.remove("mk-note-jump"), 700);
        }, 150);
      }, { passive:false });
    });
  });
}

/* ===========================================================
   NOTES POP-OUT (Modal Expander)
=========================================================== */
let _mkNotesModalSourceTA = null;

function ensureNotesModal(){
  let modal = qs("#mkNotesModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "mkNotesModal";
  modal.innerHTML = `
    <div class="mk-modal-backdrop" data-mk-close="1"></div>
    <div class="mk-modal-panel" role="dialog" aria-modal="true" aria-label="Expanded Notes">
      <div class="mk-modal-header">
        <div class="mk-modal-title" id="mkNotesModalTitle">Notes</div>
        <button type="button" class="mk-modal-close" data-mk-close="1" aria-label="Close">×</button>
      </div>
      <textarea class="mk-modal-textarea" id="mkNotesModalTextarea"></textarea>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e)=>{
    if (e.target.closest("[data-mk-close='1']")) closeNotesModal();
  });

  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape" && modal.classList.contains("open")) closeNotesModal();
  });

  return modal;
}

function openNotesModal(sourceTA, titleText="Notes"){
  const modal = ensureNotesModal();
  const title = qs("#mkNotesModalTitle", modal);
  const bigTA = qs("#mkNotesModalTextarea", modal);

  _mkNotesModalSourceTA = sourceTA;
  title.textContent = titleText || "Notes";
  bigTA.value = sourceTA?.value || "";

  bigTA.oninput = ()=>{
    if (!_mkNotesModalSourceTA) return;
    _mkNotesModalSourceTA.value = bigTA.value;
    saveField(_mkNotesModalSourceTA);
    requestAnimationFrame(()=> updateNoteIconStates(document));
    requestAnimationFrame(syncTwoColHeights);
  };

  modal.classList.add("open");
  setTimeout(()=> bigTA.focus(), 0);
}

function closeNotesModal(){
  const modal = qs("#mkNotesModal");
  if (!modal) return;

  if (_mkNotesModalSourceTA){
    saveField(_mkNotesModalSourceTA);
    requestAnimationFrame(()=> updateNoteIconStates(document));
    requestAnimationFrame(syncTwoColHeights);
  }

  modal.classList.remove("open");
  _mkNotesModalSourceTA = null;
}

function initNotesExpanders(root=document){
  const notesCards = qsa(".section-block", root).filter(isNotesCard);

  notesCards.forEach(card=>{
    const ta = qs("textarea", card);
    if (!ta) return;

    // wrap textarea
    let wrap = ta.closest(".mk-ta-wrap");
    if (!wrap){
      wrap = document.createElement("div");
      wrap.className = "mk-ta-wrap";
      ta.parentNode.insertBefore(wrap, ta);
      wrap.appendChild(ta);
    }

    // avoid duplicates
    if (qs(".mk-ta-expand", wrap)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mk-ta-expand";
    btn.title = "Expand notes";
    btn.setAttribute("aria-label","Expand notes");
    btn.textContent = "⤢";

    btn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const h2 = qs("h2", card);
      openNotesModal(ta, (h2?.textContent || "Notes").trim());
    });

    wrap.appendChild(btn);
  });
}

// delegated safety net
document.addEventListener("click", (e)=>{
  const btn = e.target.closest(".mk-ta-expand");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const wrap = btn.closest(".mk-ta-wrap");
  const ta = qs("textarea", wrap);
  const card = btn.closest(".section-block");
  const h2 = qs("h2", card);
  if (ta) openNotesModal(ta, (h2?.textContent || "Notes").trim());
});

/* ---------------------------
   Boot
--------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  initNav();
  initGhosts();
  initPersistence();
  initTextareas(document);
  syncTwoColHeights();
  window.addEventListener("resize", ()=> requestAnimationFrame(syncTwoColHeights));

  initResets();
  initTableAddRow();
  initAdditionalTrainers();
  initAdditionalPOC();
  initSupportTickets();
  initOnsiteTrainingDates();
  restoreDealershipNameDisplay();
  restoreDealershipMap();
  initPDF();

  // Notes
  initNotesExpanders(document);
  initNotesLinkingOption2Only(document);
  initTableNotesButtons(document);
  updateNoteIconStates(document);
});
