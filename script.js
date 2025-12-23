/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js (STABLE + FIXED)
   ✅ Fixes:
   - Nav clicks work (inline onclick + data-section + href="#id")
   - Add Row (+) for tables
   - Additional Trainers (+)
   - Primary Contacts: Additional POC (+)
   - Support Tickets: add/remove, move by status, base locked to Open, validation
   - Autosave + Reset Page + Clear All
   - Onsite dates: end defaults to start + 2 days
   - PDF export (all pages)
   - ✅ NOTES LINKING (questions): single icon on checklist rows
   - ✅ TABLE NOTES COLUMN: ensures ONE Notes column + bubble icon every row
   - ✅ FILTERS COLUMN FIX: removes random button + forces dropdown everywhere
   - ✅ TABLE POPUP EXPANDER: footer-right expand button opens modal editor
   - ✅ POPUP NOTES: shows the table’s Notes card INSIDE the popup (synced + saved)
   - ✅ TABLE ROW NOTES: clicking row Notes bubble inserts “• Name:” into table Notes textarea
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

// allow inline onclick="showSection('...')" to work
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
   NOTES LINKING — checklist rows (questions)
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
   TABLE NOTES COLUMN + FILTERS FIX + ROW NOTES INSERT
=========================================================== */
function thText(th){
  return (th?.textContent || "").replace(/\s+/g," ").trim().toLowerCase();
}
function getHeaderCells(table){
  return Array.from(table.querySelectorAll("thead tr th"));
}
function getNotesHeaderIndexes(table){
  const ths = getHeaderCells(table);
  const idxs = [];
  ths.forEach((th, i)=>{
    if (thText(th) === "notes") idxs.push(i);
  });
  return idxs;
}
function removeColumnByIndex(table, idx){
  table.querySelectorAll("thead tr").forEach(tr=>{
    const cell = tr.children[idx];
    if (cell) cell.remove();
  });
  qsa("tbody tr", table).forEach(tr=>{
    const cell = tr.children[idx];
    if (cell) cell.remove();
  });
}
function ensureSingleNotesColumn(table){
  const theadRow = table.querySelector("thead tr");
  if (!theadRow) return null;

  const noteIdxs = getNotesHeaderIndexes(table);

  if (noteIdxs.length > 1){
    const keep = noteIdxs[0];
    noteIdxs.slice(1).sort((a,b)=>b-a).forEach(idx => removeColumnByIndex(table, idx));
    return keep;
  }

  if (noteIdxs.length === 0){
    const th = document.createElement("th");
    th.textContent = "Notes";
    theadRow.appendChild(th);

    qsa("tbody tr", table).forEach(tr=>{
      tr.appendChild(document.createElement("td"));
    });

    return theadRow.children.length - 1;
  }

  return noteIdxs[0];
}

function renderBubbleBtn(extraClass=""){
  return `
    <button type="button" class="note-link-btn mk-table-note-btn ${extraClass}" title="Add row to Notes / Jump to Notes">
      <svg class="note-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h16v12H7l-3 3V4z" fill="none"
              stroke="currentColor" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    </button>
  `;
}

function purgeStrayTableNoteButtons(table, notesIdx){
  qsa("tbody tr", table).forEach(tr=>{
    Array.from(tr.children).forEach((td, idx)=>{
      if (idx === notesIdx) return;
      qsa(".mk-table-note-btn, .note-link-btn, .note-btn", td).forEach(n => n.remove());
    });
  });
}

/* ✅ Fix Filters column: remove random icon/buttons and ensure dropdown */
function normalizeFiltersColumn(table){
  const ths = getHeaderCells(table);
  const filtersIdx = ths.findIndex(th => thText(th) === "filters");
  if (filtersIdx === -1) return;

  let templateSelect = null;
  qsa("tbody tr", table).some(tr=>{
    const td = tr.children[filtersIdx];
    const sel = td?.querySelector("select");
    if (sel){ templateSelect = sel; return true; }
    return false;
  });

  qsa("tbody tr", table).forEach(tr=>{
    const td = tr.children[filtersIdx];
    if (!td) return;

    // remove junk
    qsa("button, .note-link-btn, .note-btn, .mk-table-note-btn, svg", td).forEach(n => n.remove());

    if (td.querySelector("select")) return;

    if (templateSelect){
      const newSelect = templateSelect.cloneNode(true);
      newSelect.value = "";
      ensureUID(newSelect);
      loadField(newSelect);
      applySelectGhost(newSelect);
      td.innerHTML = "";
      td.appendChild(newSelect);
      return;
    }

    const fallback = document.createElement("select");
    fallback.innerHTML = `<option data-ghost="true" value="">Select</option>`;
    ensureUID(fallback);
    loadField(fallback);
    applySelectGhost(fallback);
    td.innerHTML = "";
    td.appendChild(fallback);
  });
}

/* Get "Name" (or 2nd column) value from a row for notes insert */
function getTableRowName(table, tr){
  const ths = getHeaderCells(table);
  let nameIdx = ths.findIndex(th => thText(th) === "name");
  if (nameIdx === -1) nameIdx = 1; // fallback to 2nd col

  const td = tr.children[nameIdx];
  if (!td) return "";

  const input = td.querySelector("input, select, textarea");
  if (input){
    if (input.tagName === "SELECT"){
      const opt = input.selectedOptions?.[0];
      const txt = safeTrim(opt?.textContent || input.value);
      return txt;
    }
    return safeTrim(input.value);
  }

  return safeTrim(td.textContent);
}

/* Find the Notes card under the table's section */
function findNotesBlockForTable(table){
  const section = table.closest(".section");
  if (!section) return null;

  let node = section.nextElementSibling;
  while (node){
    if (node.classList?.contains("section-block")){
      const h2 = node.querySelector("h2");
      const t = (h2?.textContent || "").trim().toLowerCase();
      if (t.startsWith("notes")) return node;
      return null;
    }
    if (node.classList?.contains("section")) return null;
    node = node.nextElementSibling;
  }
  return null;
}

/* Insert row name into the Notes textarea for that table */
function insertTableRowNameIntoNotes(table, tr){
  const notesBlock = findNotesBlockForTable(table);
  const ta = notesBlock?.querySelector("textarea");
  if (!ta) return;

  const name = getTableRowName(table, tr);
  if (!name) return;

  const line = `• ${name}: `;

  const raw = ta.value || "";
  if (raw.includes(line.trim())){ // already present
    ta.scrollIntoView({ behavior:"smooth", block:"center" });
    setTimeout(()=> ta.focus(), 120);
    return;
  }

  ta.value = raw.trim() ? (raw.trim() + "\n" + line) : line;
  saveField(ta);

  ta.scrollIntoView({ behavior:"smooth", block:"center" });
  setTimeout(()=>{
    ta.focus();
    ta.classList.add("mk-note-jump");
    setTimeout(()=> ta.classList.remove("mk-note-jump"), 700);
  }, 150);

  requestAnimationFrame(()=> updateNoteIconStates(document));
}

/* Force Notes column bubble button in every row */
function applyNotesButtonsToColumn(table, notesColIdx){
  const headRow = table.querySelector("thead tr");
  if (headRow && headRow.children[notesColIdx]){
    headRow.children[notesColIdx].textContent = "Notes";
  }

  qsa("tbody tr", table).forEach(tr=>{
    while (tr.children.length <= notesColIdx){
      tr.appendChild(document.createElement("td"));
    }
    tr.children[notesColIdx].innerHTML = renderBubbleBtn("mk-row-note");
  });
}

/* ===========================================================
   TABLE POPUP (Expand) + POPUP NOTES (synced)
=========================================================== */
let _mkTableModalSourceTable = null;

function ensureTableModal(){
  let modal = qs("#mkTableModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "mkTableModal";
  modal.innerHTML = `
    <div class="mk-modal-backdrop" data-mk-close="1"></div>
    <div class="mk-modal-panel" role="dialog" aria-modal="true" aria-label="Expanded Table">
      <div class="mk-modal-header">
        <div class="mk-modal-title" id="mkTableModalTitle">Table</div>
        <button type="button" class="mk-modal-close" data-mk-close="1" aria-label="Close">×</button>
      </div>
      <div class="mk-modal-body">
        <div class="mk-table-wrap" id="mkTableModalWrap"></div>
      </div>
      <div class="mk-modal-footer">
        <button type="button" class="table-footer-add add-row" id="mkTableModalAddRow" title="Add Row">+</button>
        <div class="mk-footer-right"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e)=>{
    if (e.target.closest("[data-mk-close='1']")) closeTableModal();
  });

  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape" && modal.classList.contains("open")) closeTableModal();
  });

  return modal;
}

function closeTableModal(){
  const modal = qs("#mkTableModal");
  if (!modal) return;
  modal.classList.remove("open");
  _mkTableModalSourceTable = null;
}

/* Mount table’s Notes card INSIDE the popup and sync it */
function mountTableNotesInsideModal(originalTable, modal){
  const old = modal.querySelector(".mk-table-notes");
  if (old) old.remove();

  const notesBlock = findNotesBlockForTable(originalTable);
  const sourceTA = notesBlock?.querySelector("textarea");
  if (!sourceTA) return;

  const titleText = (notesBlock.querySelector("h2")?.textContent || "Notes").trim();

  const wrap = document.createElement("div");
  wrap.className = "mk-table-notes";
  wrap.innerHTML = `
    <div class="mk-table-notes-header">
      <div>${titleText}</div>
      <button type="button" class="mk-ta-expand" data-mk-notes-expand="1" title="Expand notes" aria-label="Expand notes">⤢</button>
    </div>
    <div class="mk-table-notes-body">
      <textarea class="mk-table-notes-ta" placeholder="Add notes here..."></textarea>
    </div>
  `;

  const modalTA = wrap.querySelector(".mk-table-notes-ta");
  modalTA.value = sourceTA.value || "";

  modalTA.addEventListener("input", ()=>{
    sourceTA.value = modalTA.value;
    saveField(sourceTA);
    requestAnimationFrame(()=> updateNoteIconStates(document));
  });

  const expandBtn = wrap.querySelector("[data-mk-notes-expand='1']");
  expandBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    openNotesModal(sourceTA, titleText);
  });

  modal.querySelector(".mk-modal-body")?.appendChild(wrap);
}

/* Open popup for a specific table */
function openTableModalForTable(originalTable, titleText="Table"){
  const modal = ensureTableModal();
  const title = qs("#mkTableModalTitle", modal);
  const wrap = qs("#mkTableModalWrap", modal);
  const footerRight = qs(".mk-footer-right", modal);

  _mkTableModalSourceTable = originalTable;

  title.textContent = titleText || "Table";
  wrap.innerHTML = "";
  footerRight.innerHTML = "";

  // clone the table so it edits the real one by syncing inputs
  const clone = originalTable.cloneNode(true);
  clone.classList.add("mk-modal-table");
  wrap.appendChild(clone);

  // ensure filters + notes column are correct inside clone too
  const notesIdx = ensureSingleNotesColumn(clone);
  if (notesIdx !== null){
    purgeStrayTableNoteButtons(clone, notesIdx);
    normalizeFiltersColumn(clone);
    applyNotesButtonsToColumn(clone, notesIdx);
  }

  // Add footer-right expand button (same style class as notes expander)
  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "mk-ta-expand";
  expandBtn.title = "Expand table";
  expandBtn.setAttribute("aria-label", "Expand table");
  expandBtn.textContent = "⤢";
  footerRight.appendChild(expandBtn);

  // Put the table’s Notes section under it (synced)
  mountTableNotesInsideModal(originalTable, modal);

  // Sync clone inputs <-> original inputs by index map per cell
  const origFields = qsa("input, select, textarea", originalTable);
  const cloneFields = qsa("input, select, textarea", clone);

  cloneFields.forEach((f, i)=>{
    const src = origFields[i];
    if (!src) return;

    // init value in clone
    if (src.type === "checkbox") f.checked = src.checked;
    else f.value = src.value;

    if (f.tagName === "SELECT") applySelectGhost(f);

    // on input/change in clone, push back to original and save
    const handler = ()=>{
      if (src.type === "checkbox") src.checked = f.checked;
      else src.value = f.value;

      if (src.tagName === "SELECT") applySelectGhost(src);
      saveField(src);
    };

    f.addEventListener("input", handler);
    f.addEventListener("change", handler);
  });

  // Add Row inside modal adds row to original, then re-open modal to refresh
  const addBtn = qs("#mkTableModalAddRow", modal);
  if (addBtn){
    addBtn.onclick = ()=>{
      const tbody = qs("tbody", originalTable);
      const last = tbody?.querySelector("tr:last-child");
      if (!tbody || !last) return;

      const newRow = cloneTrainingRow(last);
      tbody.appendChild(newRow);

      requestAnimationFrame(()=>{
        initNotesLinkingOption2Only(document);
        initTableNotesButtons(document);
        updateNoteIconStates(document);
      });

      // refresh modal so it matches
      openTableModalForTable(originalTable, titleText);
    };
  }

  modal.classList.add("open");
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

    let wrap = ta.closest(".mk-ta-wrap");
    if (!wrap){
      wrap = document.createElement("div");
      wrap.className = "mk-ta-wrap";
      ta.parentNode.insertBefore(wrap, ta);
      wrap.appendChild(ta);
    }

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

// delegated safety net for notes expand button
document.addEventListener("click", (e)=>{
  const btn = e.target.closest(".mk-ta-expand");
  if (!btn) return;

  // ignore table modal footer expand: it uses same class but not inside a notes wrap
  if (btn.closest("#mkTableModal")) return;

  e.preventDefault();
  e.stopPropagation();

  const wrap = btn.closest(".mk-ta-wrap");
  const ta = qs("textarea", wrap);
  const card = btn.closest(".section-block");
  const h2 = qs("h2", card);
  if (ta) openNotesModal(ta, (h2?.textContent || "Notes").trim());
});

/* ===========================================================
   TABLE NOTES BUTTONS INIT
   - Ensures single Notes column
   - Fixes Filters column
   - Bubble button per row:
       click => insert row Name into that table’s Notes card
       then scroll to Notes
   - Adds table popup expand button in footer-right (inside table footer)
=========================================================== */
function wireTableFooterExpandButtons(root=document){
  qsa(".table-container", root).forEach(container=>{
    if (container.dataset.mkExpandWired === "1") return;
    container.dataset.mkExpandWired = "1";

    const table = qs("table.training-table", container);
    const footer = qs(".table-footer", container);
    if (!table || !footer) return;

    // create footer-right holder if needed
    let right = qs(".mk-footer-right", footer);
    if (!right){
      right = document.createElement("div");
      right.className = "mk-footer-right";
      footer.appendChild(right);
    }

    // avoid duplicates
    if (qs(".mk-table-expand-btn", footer)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mk-ta-expand mk-table-expand-btn";
    btn.title = "Expand table";
    btn.setAttribute("aria-label","Expand table");
    btn.textContent = "⤢";

    btn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();

      // title from section header
      const secHeader = container.closest(".section")?.querySelector(".section-header");
      const title = (secHeader?.textContent || "Table").trim();

      openTableModalForTable(table, title);
    });

    right.appendChild(btn);
  });
}

function initTableNotesButtons(root=document){
  const targets = [
    "#training-checklist table.training-table",
    "#opcodes-pricing table.training-table"
  ];

  targets.forEach(sel=>{
    qsa(sel, root).forEach(table=>{
      const notesIdx = ensureSingleNotesColumn(table);
      if (notesIdx === null) return;

      purgeStrayTableNoteButtons(table, notesIdx);
      normalizeFiltersColumn(table);
      applyNotesButtonsToColumn(table, notesIdx);

      if (table.dataset.mkNotesWired === "1") return;
      table.dataset.mkNotesWired = "1";

      table.addEventListener("click", (e)=>{
        const btn = e.target.closest(".mk-table-note-btn");
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const tr = btn.closest("tr");
        if (!tr) return;

        insertTableRowNameIntoNotes(table, tr);
      }, { passive:false });
    });
  });

  // add expand buttons on table footers
  wireTableFooterExpandButtons(root);
}

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

  // Notes + Tables
  initNotesExpanders(document);
  initNotesLinkingOption2Only(document);
  initTableNotesButtons(document);
  updateNoteIconStates(document);
});
