/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js (UPDATED / CLEAN)
   ✅ Preserves layout + all existing behaviors
   ✅ Nav clicks work
   ✅ Add Trainer (+) works
   ✅ Support Tickets: add/remove, status move, validation scoped, base clears after add
   ✅ Autosave + reset/clear + PDF + onsite dates end default
   ✅ NOTES LINKING (single 📝 icon) for checklist rows
   ✅ NOTES POP-OUT (⤢) modal for Notes textareas
   ✅ TABLE NOTES BUTTONS (🗨️) injected into tables + links to the page Notes
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

function safeTrim(v){
  return (v ?? "").toString().trim();
}

/* ---------------------------
   Optional 2-col height sync
--------------------------- */
function syncTwoColHeights(){
  const grids = qsa(".cards-grid.two-col, .two-col-grid, .grid-2");
  grids.forEach(grid=>{
    const cards = qsa(":scope > .section-block", grid);
    if (cards.length < 2) return;

    // clear
    cards.forEach(c=> c.style.minHeight = "");

    // pairs
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
  if (el.id)   return `mkc:${el.id}`;
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

function initGhosts(){
  qsa("select").forEach(applySelectGhost);
  qsa("input[type='date']").forEach(applyDateGhost);
}

/* ---------------------------
   Textarea auto-grow
   (Notes cards are fixed-height; modal handles long edits)
--------------------------- */
function autoGrowTA(ta){
  if (!ta) return;
  // Don't fight fixed-height Notes cards
  if (ta.closest(".mk-ta-wrap")) return;

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
      requestAnimationFrame(()=> updateNoteIconStates(document));
    });
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
    const to = btn.getAttribute("data-section");
    btn.classList.toggle("active", to === id);
  });

  try{ localStorage.setItem("mkc:lastPage", id); }catch(e){}
  requestAnimationFrame(syncTwoColHeights);
}

function initNav(){
  qsa(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-section");
      if (id) showSection(id);
    });
  });

  // restore last page
  const last = (()=>{ try{ return localStorage.getItem("mkc:lastPage"); }catch(e){ return null; } })();
  const first = qsa(".page-section")[0]?.id;
  showSection(last || first || "dealership-info");
}

/* ---------------------------
   Reset This Page / Clear All
--------------------------- */
function resetSection(section){
  if (!section) return;

  // clear fields in this section
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

  // remove cloned rows/cards
  qsa("[data-clone='true']", section).forEach(n=> n.remove());

  // Trainers clones container
  const atc = qs("#additionalTrainersContainer", section);
  if (atc) atc.innerHTML = "";

  // Support Tickets: clear non-base in all stacks
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
    initNotesLinkingOption2Only(section);
    updateNoteIconStates(section);
    initNotesExpanders(section);
    initTableNotesButtons(section);
  });
}

function initResets(){
  qsa(".clear-page-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const sec = btn.closest(".page-section");
      if (sec) resetSection(sec);
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
  // load initial
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

    requestAnimationFrame(()=> updateNoteIconStates(document));
  });

  document.addEventListener("change", (e)=>{
    const el = e.target;
    if (!isField(el)) return;

    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);

    saveField(el);
    requestAnimationFrame(()=> updateNoteIconStates(document));
  });
}

/* ---------------------------
   Training tables: Add Row (+)
--------------------------- */
function cloneTrainingRow(row){
  const clone = row.cloneNode(true);
  clone.dataset.clone = "true";

  qsa("input, select, textarea", clone).forEach(el=>{
    if (!isField(el)) return;
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";

    ensureUID(el);
    if (el.tagName === "SELECT") applySelectGhost(el);
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
      initNotesLinkingOption2Only(document);
      updateNoteIconStates(document);
      initNotesExpanders(document);
      initTableNotesButtons(document);
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
  if (!start || !end) return;

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
      updateNoteIconStates(page);
      syncTwoColHeights();
      initNotesExpanders(page);
      initTableNotesButtons(page);
    });
  });
}

/* ---------------------------
   Primary Contacts: Additional POC (+)
--------------------------- */
function initAdditionalPOC(){
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".additional-poc-card[data-base='true'] .add-row, .additional-poc-card[data-base='true'] .additional-poc-add");
    if (!btn) return;

    const baseCard = btn.closest(".additional-poc-card");
    if (!baseCard) return;

    const grid = baseCard.parentElement;
    if (!grid) return;

    const clone = baseCard.cloneNode(true);
    clone.dataset.clone = "true";
    clone.removeAttribute("data-base");

    // remove the add button from clone
    const addBtn = qs(".additional-poc-add, .add-row", clone);
    if (addBtn) addBtn.remove();

    qsa("input, select, textarea", clone).forEach(el=>{
      if (!isField(el)) return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";

      ensureUID(el);
      if (el.tagName === "SELECT") applySelectGhost(el);
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
      initNotesExpanders(document);
      initTableNotesButtons(document);
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
  applySelectGhost(sel);
  saveField(sel);
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
    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    saveField(el);
  });

  // remove disclaimer on clones
  const disc = qs(".ticket-disclaimer", clone);
  if (disc) disc.remove();

  // convert add -> remove
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

  // add/remove
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

    // adding
    if (!isTicketCardComplete(card)){
      alert("Complete Ticket Number, Zendesk URL, and Summary before adding another ticket.");
      return;
    }

    const base = qs("#openTicketsContainer .ticket-group[data-base='true']", page) || card;
    const newCard = makeTicketCloneFromBase(base);

    const openContainer = qs("#openTicketsContainer", page);
    if (openContainer) openContainer.appendChild(newCard);

    // clear base if base add
    if (card.dataset.base === "true"){
      [qs(".ticket-number-input", card), qs(".ticket-zendesk-input", card), qs(".ticket-summary-input", card)]
        .forEach(el=>{
          if (!el) return;
          clearFieldStorage(el);
          el.value = "";
          saveField(el);
        });
      lockOpenSelect(card);
    }

    newCard.scrollIntoView({ behavior:"smooth", block:"center" });
  });

  // status move
  document.addEventListener("change", (e)=>{
    const sel = e.target.closest("#support-tickets .ticket-status-select");
    if (!sel) return;

    const card = e.target.closest(".ticket-group");
    if (!card) return;

    if (card.dataset.base === "true"){
      lockOpenSelect(card);
      return;
    }

    moveTicketCard(card, sel.value);
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
      // slice tall canvas into multiple pages
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
          0, y * pxPerPt, canvas.width, pagePxH,
          0, 0, canvas.width, pagePxH
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
   NOTES LINKING — Ordered insert + jump helpers
=========================================================== */
function normalizeNoteKey(line){ return (line || "").trim(); }

function getRowOrderKey(row){
  return normalizeNoteKey(makeNoteLine(row));
}

function isNotesCardRow(row){
  const h2 = row.closest(".section-block")?.querySelector("h2");
  return (h2?.textContent || "").trim().toLowerCase().startsWith("notes");
}

function getAllRowsInThisNotesGroup(row){
  const wrap = row.closest(".cards-grid.two-col") || row.closest(".two-col-grid") || row.closest(".grid-2") || row.closest(".page-section");
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll(".checklist-row"))
    .filter(r => !isNotesCardRow(r))
    .filter(r => r.querySelector("input, select, textarea"));
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
    const start = lines.slice(0, existingIdx).join("\n").length + (existingIdx > 0 ? 1 : 0);
    return { didInsert:false, lineStart:start };
  }

  const myOrder = orderedKeys.indexOf(getRowOrderKey(clickedRow));
  const appendLine = ()=>{
    const startPos = raw.length ? raw.length + 1 : 0;
    textarea.value = raw.trim() ? raw.trim() + "\n" + baseLine : baseLine;
    return { didInsert:true, lineStart:startPos };
  };

  if (myOrder === -1) return appendLine();

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

  if (insertBeforeLineIdx === -1) return appendLine();

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

/* ===========================================================
   NOTES LINKING — Option 2 ONLY (single 📝 icon)
=========================================================== */
function findNotesTextareaForRow(row){
  const wrap =
    row.closest(".cards-grid.two-col") ||
    row.closest(".two-col-grid") ||
    row.closest(".grid-2") ||
    row.closest(".page-section");

  if (!wrap) return null;

  const notesCard = Array.from(wrap.querySelectorAll(".section-block"))
    .find(card => {
      const h2 = card.querySelector("h2");
      return h2 && h2.textContent.trim().toLowerCase().startsWith("notes");
    });

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
  return `• ${q}:`;
}

function ensureRowActions(row){
  let actions = row.querySelector(":scope > .row-actions");
  if (actions) return actions;

  actions = document.createElement("div");
  actions.className = "row-actions";

  // keep integrated-plus rows untouched (CSS hides row-actions there anyway)
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
  // remove any old injected icons (safe)
  qsa(".note-btn, .note-link-btn", root).forEach(n => n.remove());

  qsa(".checklist-row", root).forEach(row=>{
    if (isNotesCardRow(row)) return;

    // only rows with a field get a note icon
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
        <path d="M4 4h16v12H7l-3 3V4z"
          fill="none" stroke="currentColor" stroke-width="2"
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
   NOTES POP-OUT (Modal Expander)
=========================================================== */
function isNotesCard(card){
  const h2 = card?.querySelector("h2");
  const t = (h2?.textContent || "").trim().toLowerCase();
  return t.startsWith("notes");
}

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

    // wrap textarea (once)
    let wrap = ta.closest(".mk-ta-wrap");
    if (!wrap){
      wrap = document.createElement("div");
      wrap.className = "mk-ta-wrap";
      ta.parentNode.insertBefore(wrap, ta);
      wrap.appendChild(ta);
    }

    // avoid duplicate buttons
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

// delegated safety net (if injected later)
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

/* ===========================================================
   TABLE NOTES BUTTONS (injected Notes column + link to Notes)
   - Adds a Notes column if missing
   - Each row gets a button that inserts an ordered line and jumps
=========================================================== */
function findNotesTextareaForTable(table){
  const page = table.closest(".page-section");
  if (!page) return null;

  const notesCard = Array.from(page.querySelectorAll(".section-block"))
    .find(card=>{
      const h2 = card.querySelector("h2");
      return h2 && h2.textContent.trim().toLowerCase().startsWith("notes");
    });

  return notesCard ? notesCard.querySelector("textarea") : null;
}

function getTableTitle(table){
  const container = table.closest(".table-container");
  const section = container?.previousElementSibling;
  if (section && section.classList.contains("section-header")){
    return safeTrim(section.textContent) || "Table";
  }
  return "Table";
}

function getRowLabelForTableRow(tr){
  // Prefer a text input value (training checklist name, etc.)
  const txt = tr.querySelector("input[type='text']");
  const v = safeTrim(txt?.value);
  if (v) return v;

  // fall back to the second column text
  const tds = tr.querySelectorAll("td");
  const fallback = safeTrim(tds[1]?.textContent);
  if (fallback) return fallback;

  return "Row";
}

function ensureNotesHeader(table){
  const theadRow = table.querySelector("thead tr");
  if (!theadRow) return;

  // already present?
  if (theadRow.querySelector("th.notes-col")) return;

  const th = document.createElement("th");
  th.className = "notes-col";
  th.textContent = "Notes";
  theadRow.appendChild(th);
}

function ensureNotesCell(table, tr){
  // already has?
  if (tr.querySelector("td.notes-col")) return;

  const td = document.createElement("td");
  td.className = "notes-col";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "table-notes-btn";
  btn.title = "Add this row to Notes";
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v12H7l-3 3V4z" />
    </svg>
  `;

  btn.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();

    const ta = findNotesTextareaForTable(table);
    if (!ta) return;

    const title = getTableTitle(table);
    const rowLabel = getRowLabelForTableRow(tr);

    const line = `• [${title}] ${rowLabel}:`;
    const raw = ta.value || "";
    const lines = raw.split("\n");

    // insert only if missing
    let lineStart = 0;
    const existingIdx = lines.findIndex(l => (l || "").trim().startsWith(line));
    if (existingIdx !== -1){
      lineStart = lines.slice(0, existingIdx).join("\n").length + (existingIdx > 0 ? 1 : 0);
    }else{
      const startPos = raw.length ? raw.length + 1 : 0;
      ta.value = raw.trim() ? raw.trim() + "\n" + line : line;
      saveField(ta);
      lineStart = startPos;
    }

    jumpToNoteLine(ta, lineStart);
  });

  td.appendChild(btn);
  tr.appendChild(td);
}

function initTableNotesButtons(root=document){
  qsa("table.training-table", root).forEach(table=>{
    const ta = findNotesTextareaForTable(table);
    if (!ta) return;

    ensureNotesHeader(table);

    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    Array.from(tbody.querySelectorAll("tr")).forEach(tr=>{
      ensureNotesCell(table, tr);
    });
  });
}

/* ---------------------------
   Google Places callback hooks (from inline HTML)
--------------------------- */
window.updateDealershipMap = updateDealershipMap;
window.updateDealershipNameDisplay = updateDealershipNameDisplay;

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

  // ✅ Notes linking (rows)
  initNotesLinkingOption2Only(document);
  updateNoteIconStates(document);

  // ✅ Notes pop-out expanders
  initNotesExpanders(document);

  // ✅ Table Notes buttons
  initTableNotesButtons(document);
});
