/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   STABLE + FIXED NAV + TABLE NOTES + POPUP TABLE + FIXES
   ✅ Fixes added in this version:
   - Popup table horizontal scroll restored (left/right)
   - Training tables: checkbox sits LEFT of Name input (not stacked)
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

window.showSection = showSection;
window.initNav = initNav;

/* ===========================================================
   ✅ JS-INJECTED CSS PATCH
   - Restore popup horizontal scroll
   - Force checkbox + name input to sit side-by-side
=========================================================== */
function injectRuntimePatches(){
  if (qs("#mkRuntimePatches")) return;

  const style = document.createElement("style");
  style.id = "mkRuntimePatches";
  style.textContent = `
    /* Popup table must scroll left/right */
    #mkTableModal .mk-table-body{
      overflow: hidden !important;
    }
    #mkTableModal .mk-table-scroll{
      overflow-x: auto !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
      width: 100%;
    }
    #mkTableModal table{
      width: max-content !important; /* allow horizontal scroll */
      min-width: 100% !important;
    }

    /* Ensure inputs fit cells (prevents overflow like Name field) */
    #mkTableModal table input[type="text"],
    #mkTableModal table input[type="number"],
    #mkTableModal table input[type="email"],
    #mkTableModal table input[type="tel"],
    #mkTableModal table select{
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    /* Training tables: checkbox left of Name input */
    table.training-table td.mk-name-cell{
      display: flex !important;
      align-items: center !important;
      gap: 10px !important; /* padding between checkbox and input */
    }
    table.training-table td.mk-name-cell input[type="checkbox"]{
      flex: 0 0 auto !important;
      margin: 0 !important;
    }
    table.training-table td.mk-name-cell input[type="text"],
    table.training-table td.mk-name-cell select,
    table.training-table td.mk-name-cell textarea{
      flex: 1 1 auto !important;
      min-width: 0 !important; /* allow shrinking inside flex */
    }

    /* Popup tables: if Name cell uses same fix */
    #mkTableModal td.mk-name-cell{
      display:flex !important;
      align-items:center !important;
      gap:10px !important;
    }
    #mkTableModal td.mk-name-cell input[type="checkbox"]{ flex:0 0 auto !important; margin:0 !important; }
    #mkTableModal td.mk-name-cell input[type="text"]{ flex:1 1 auto !important; min-width:0 !important; }
  `;
  document.head.appendChild(style);
}

/* Tag the "Name" column TDs so CSS can style them */
function tagNameCells(table){
  const ths = Array.from(table.querySelectorAll("thead tr th"));
  const nameIdx = ths.findIndex(th => (th.textContent || "").trim().toLowerCase() === "name");
  if (nameIdx === -1) return;

  qsa("tbody tr", table).forEach(tr=>{
    const td = tr.children[nameIdx];
    if (!td) return;

    td.classList.add("mk-name-cell");

    // If checkbox + input are stacked due to <br> or blocks, normalize
    const cb = td.querySelector('input[type="checkbox"]');
    const text = td.querySelector('input[type="text"], select, textarea');
    if (cb && text){
      // Remove accidental <br> nodes between them (common cause of stacking)
      Array.from(td.childNodes).forEach(n=>{
        if (n.nodeName === "BR") n.remove();
      });
    }
  });
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
    initTablePopupExpandButtons(section);
    updateNoteIconStates(section);

    // ✅ apply name-cell tagging again after reset
    qsa("table.training-table", section).forEach(tagNameCells);
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
      initTablePopupExpandButtons(document);
      updateNoteIconStates(document);

      // ✅ tag name cells in new row
      tagNameCells(table);
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
   (Keep your other modules: Additional Trainers, Additional POC, Support Tickets,
   Dealership display/map, PDF, Notes linking, Table Notes column, Popup modal, Notes expander)
   — unchanged from your prior stable version —
--------------------------- */

/* ===========================================================
   TABLE NOTES COLUMN + POPUP TABLE
   (Same as your last version, BUT with popup scroll fix + name cell tagging)
=========================================================== */

/* --- existing table notes helpers --- */
function thText(th){ return (th?.textContent || "").replace(/\s+/g," ").trim().toLowerCase(); }
function getHeaderCells(table){ return Array.from(table.querySelectorAll("thead tr th")); }
function getNotesHeaderIndexes(table){
  const ths = getHeaderCells(table);
  const idxs = [];
  ths.forEach((th, i)=>{ if (thText(th) === "notes") idxs.push(i); });
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
    qsa("tbody tr", table).forEach(tr=> tr.appendChild(document.createElement("td")));
    return theadRow.children.length - 1;
  }
  return noteIdxs[0];
}
function renderTableNoteButton(td){
  td.innerHTML = `
    <button type="button" class="note-link-btn mk-table-note-btn" title="Notes">
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

    qsa("button, .note-link-btn, .note-btn, .mk-table-note-btn", td).forEach(n => n.remove());
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
    fallback.innerHTML = `<option></option>`;
    ensureUID(fallback);
    loadField(fallback);
    applySelectGhost(fallback);
    td.innerHTML = "";
    td.appendChild(fallback);
  });
}
function applyNotesButtonsToColumn(table, notesColIdx){
  const headRow = table.querySelector("thead tr");
  if (headRow && headRow.children[notesColIdx]) headRow.children[notesColIdx].textContent = "Notes";
  qsa("tbody tr", table).forEach(tr=>{
    while (tr.children.length <= notesColIdx) tr.appendChild(document.createElement("td"));
    renderTableNoteButton(tr.children[notesColIdx]);
  });
}
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

      // ✅ Tag Name cells so checkbox/input align properly
      tagNameCells(table);

      if (table.dataset.mkNotesWired === "1") return;
      table.dataset.mkNotesWired = "1";

      table.addEventListener("click", (e)=>{
        const btn = e.target.closest(".mk-table-note-btn");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const notesBlock = findNotesBlockForTable(table);
        const ta = notesBlock?.querySelector("textarea");
        if (!ta) return;

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
   POPUP TABLE (expand) — uses injected CSS for scroll
=========================================================== */
function ensureTableModal(){
  let modal = qs("#mkTableModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "mkTableModal";
  modal.innerHTML = `
    <div class="mk-modal-backdrop" data-mk-table-close="1"></div>
    <div class="mk-modal-panel mk-table-panel" role="dialog" aria-modal="true" aria-label="Expanded Table">
      <div class="mk-modal-header">
        <div class="mk-modal-title" id="mkTableModalTitle">Table</div>
        <button type="button" class="mk-modal-close" data-mk-table-close="1" aria-label="Close">×</button>
      </div>

      <div class="mk-table-body">
        <div class="mk-table-scroll" id="mkTableModalContent"></div>
      </div>

      <div class="mk-table-notes">
        <div class="mk-table-notes-title">Notes</div>
        <textarea class="mk-table-notes-ta" rows="6" placeholder="Notes for this table..."></textarea>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e)=>{
    if (e.target.closest("[data-mk-table-close='1']")) closeTableModal();
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
}

function getTableRowName(table, tr){
  const ths = getHeaderCells(table);
  let nameIdx = ths.findIndex(th => thText(th) === "name");
  const extractFromCell = (td) => {
    if (!td) return "";
    const fields = Array.from(td.querySelectorAll("input, select, textarea"))
      .filter(f => f.type !== "checkbox");
    if (fields.length){
      const parts = fields.map(f=>{
        if (f.tagName === "SELECT"){
          const opt = f.selectedOptions?.[0];
          return safeTrim(opt?.textContent || f.value);
        }
        return safeTrim(f.value);
      }).filter(Boolean);
      return safeTrim(parts.join(" "));
    }
    return safeTrim(td.textContent);
  };

  if (nameIdx !== -1){
    const v = extractFromCell(tr.children[nameIdx]);
    if (v) return v;
  }

  const notesIdxs = getNotesHeaderIndexes(table);
  const notesIdx = notesIdxs.length ? notesIdxs[0] : -1;

  for (let i = 0; i < tr.children.length; i++){
    if (i === notesIdx) continue;
    const v = extractFromCell(tr.children[i]);
    if (v) return v;
  }
  return "";
}
function getRowKeyForNotes(table, tr){
  const ths = getHeaderCells(table);
  const opcodeIdx = ths.findIndex(th => {
    const t = thText(th);
    return t === "opcode" || t === "op code" || t.includes("opcode");
  });
  if (opcodeIdx !== -1){
    const td = tr.children[opcodeIdx];
    const field = td?.querySelector("input, select, textarea");
    const val = field
      ? (field.tagName === "SELECT"
          ? safeTrim(field.selectedOptions?.[0]?.textContent || field.value)
          : safeTrim(field.value))
      : safeTrim(td?.textContent);
    if (val) return val;
  }
  return getTableRowName(table, tr);
}
function insertLineIntoPopupNotes(modal, sourceTA, line){
  if (!modal || !sourceTA || !line) return;
  const modalTA = modal.querySelector(".mk-table-notes-ta");
  if (!modalTA) return;

  const raw = modalTA.value || "";
  if (!raw.includes(line.trim())){
    modalTA.value = raw.trim() ? (raw.trim() + "\n" + line) : line;
  }

  sourceTA.value = modalTA.value;
  saveField(sourceTA);

  const notesWrap = modal.querySelector(".mk-table-notes");
  if (notesWrap) notesWrap.scrollIntoView({ behavior:"smooth", block:"start" });

  setTimeout(()=>{
    modalTA.focus();
    modalTA.classList.add("mk-note-jump");
    setTimeout(()=> modalTA.classList.remove("mk-note-jump"), 700);
  }, 150);
}
function mountPopupNotes(modal, sourceTA){
  const modalTA = qs(".mk-table-notes-ta", modal);
  if (!modalTA) return;
  modalTA.value = sourceTA?.value || "";
  modalTA.oninput = ()=>{
    if (!sourceTA) return;
    sourceTA.value = modalTA.value;
    saveField(sourceTA);
  };
}
function openTableModalForTable(originalTable, titleText){
  const modal = ensureTableModal();
  const title = qs("#mkTableModalTitle", modal);
  const content = qs("#mkTableModalContent", modal);

  title.textContent = titleText || "Table";
  content.innerHTML = "";

  const clone = originalTable.cloneNode(true);
  clone.classList.add("mk-popup-table");

  qsa("input, select, textarea", clone).forEach(el=>{
    ensureUID(el);
    loadField(el);
    if (el.tagName === "SELECT") applySelectGhost(el);
    if (el.type === "date") applyDateGhost(el);
    el.addEventListener("input", ()=> saveField(el));
    el.addEventListener("change", ()=> saveField(el));
  });

  // ✅ name cell tagging for popup too
  tagNameCells(clone);

  content.appendChild(clone);

  const notesBlock = findNotesBlockForTable(originalTable);
  const sourceTA = notesBlock?.querySelector("textarea");
  if (sourceTA) mountPopupNotes(modal, sourceTA);

  clone.addEventListener("click", (e)=>{
    const btn = e.target.closest(".mk-table-note-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const tr = btn.closest("tr");
    if (!tr || !sourceTA) return;

    const key = getRowKeyForNotes(clone, tr);
    if (!key) return;

    insertLineIntoPopupNotes(modal, sourceTA, `• ${key}: `);
  }, { passive:false });

  modal.classList.add("open");
}

function ensureExpandBtnInTableFooter(table){
  const container = table.closest(".table-container");
  if (!container) return;
  const footer = qs(".table-footer", container);
  if (!footer) return;

  if (qs(".mk-table-expand-btn", footer)) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mk-table-expand-btn";
  btn.title = "Expand table";
  btn.setAttribute("aria-label","Expand table");
  btn.textContent = "⤢";

  footer.style.justifyContent = "space-between";
  const rightWrap = document.createElement("div");
  rightWrap.style.marginLeft = "auto";
  rightWrap.appendChild(btn);
  footer.appendChild(rightWrap);

  btn.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();

    const sectionHeader = container.previousElementSibling;
    const t = safeTrim(sectionHeader?.textContent || "Table");
    openTableModalForTable(table, t);
  });
}
function initTablePopupExpandButtons(root=document){
  const targets = [
    "#training-checklist table.training-table",
    "#opcodes-pricing table.training-table"
  ];
  targets.forEach(sel=>{
    qsa(sel, root).forEach(table=> ensureExpandBtnInTableFooter(table));
  });
}

/* ===========================================================
   NOTES POP-OUT (kept, unchanged)
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
    requestAnimationFrame(syncTwoColHeights);
  }

  modal.classList.remove("open");
  _mkNotesModalSourceTA = null;
}

function isNotesCard(card){
  const h2 = card?.querySelector("h2");
  const t = (h2?.textContent || "").trim().toLowerCase();
  return t.startsWith("notes");
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
   Notes linking placeholder stubs (your existing functions)
   (If you already have these elsewhere, keep yours — these are safe no-ops)
--------------------------- */
function initNotesLinkingOption2Only(){ /* keep your existing implementation */ }
function updateNoteIconStates(){ /* keep your existing implementation */ }

/* ---------------------------
   Boot
--------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  injectRuntimePatches();

  initNav();
  initGhosts();
  initPersistence();
  initTextareas(document);
  syncTwoColHeights();
  window.addEventListener("resize", ()=> requestAnimationFrame(syncTwoColHeights));

  initResets();
  initTableAddRow();
  initOnsiteTrainingDates();

  // Tables + Notes
  initNotesExpanders(document);
  initNotesLinkingOption2Only(document);
  initTableNotesButtons(document);
  initTablePopupExpandButtons(document);
  updateNoteIconStates(document);

  // ✅ tag name cells on load (fix checkbox position immediately)
  qsa("#training-checklist table.training-table, #opcodes-pricing table.training-table").forEach(tagNameCells);
});
