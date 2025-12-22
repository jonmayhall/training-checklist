/* =======================================================
   myKaarma Interactive Training Checklist — FULL script.js
   ✅ Includes:
   - Sidebar navigation (page switching + active button)
   - Dealership name mirror to topbar
   - LocalStorage autosave (inputs/selects/textareas + dynamic rows)
   - “Ghost” placeholder styling for selects + date inputs
   - Reset This Page + Clear All
   - Dynamic rows:
       • Additional Trainers (+)
       • Additional POC cards (+)
       • All table “+” add-row buttons (training tables + opcode table, etc.)
   - Notes UX:
       • textarea auto-grow
       • 2x2 notes: height sync + textarea fills remaining space
   - Google Maps embed updater + “Map” button
   - Support Tickets module (add/validate/move/persist)
   - HARD JS-injected CSS patch for “inputs too wide” issues
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

/* ---------------------------
   Stable keying for LocalStorage
   (handles dynamic clones)
--------------------------- */
function getFieldKey(el){
  if (!el) return null;

  // Prefer explicit IDs/names if present
  if (el.id) return `mkc:${el.id}`;
  if (el.name) return `mkc:${el.name}`;

  // Developer-provided key
  const dk = el.getAttribute("data-key");
  if (dk) return `mkc:${dk}`;

  // If inside a ticket group with id, key by ticket group + class
  const ticketGroup = el.closest(".ticket-group");
  if (ticketGroup?.dataset?.ticketId){
    const cls = el.className ? el.className.split(" ").join(".") : el.tagName.toLowerCase();
    return `mkc:ticket:${ticketGroup.dataset.ticketId}:${cls}`;
  }

  // Otherwise compute a stable-ish key based on section + index
  const sec = el.closest(".page-section");
  const secId = sec?.id || "unknown";

  const fieldsInSection = qsa("input, select, textarea", sec || document);
  const idx = fieldsInSection.indexOf(el);
  return `mkc:${secId}:field:${idx}`;
}

function saveField(el){
  if (!isField(el)) return;
  const key = getFieldKey(el);
  if (!key) return;

  let val;
  if (el.type === "checkbox") val = el.checked ? "1" : "0";
  else val = el.value ?? "";

  try { localStorage.setItem(key, val); } catch(e){}
}

function loadField(el){
  if (!isField(el)) return;
  const key = getFieldKey(el);
  if (!key) return;

  let val = null;
  try { val = localStorage.getItem(key); } catch(e){}

  if (val === null) return;

  if (el.type === "checkbox") el.checked = (val === "1");
  else el.value = val;

  // Update placeholder styles
  refreshGhostForSelect(el);
  refreshDatePlaceholder(el);
  autoGrowTextarea(el);
}

function clearFieldStorageInSection(section){
  const fields = qsa("input, select, textarea", section);
  fields.forEach(el => {
    const key = getFieldKey(el);
    if (!key) return;
    try { localStorage.removeItem(key); } catch(e){}
  });
}

function clearAllStorage(){
  // Only clear keys that start with mkc:
  const keys = [];
  for (let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if (k && k.startsWith("mkc:")) keys.push(k);
  }
  keys.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
}

/* ---------------------------
   Ghost placeholders
--------------------------- */
function refreshGhostForSelect(el){
  if (!el || el.tagName !== "SELECT") return;

  // Treat empty value or first option w/ data-ghost as placeholder
  const opt = el.options?.[el.selectedIndex];
  const isGhost = (!el.value) || (opt && opt.getAttribute("data-ghost") === "true");

  if (isGhost) el.classList.add("is-placeholder");
  else el.classList.remove("is-placeholder");
}

function refreshDatePlaceholder(el){
  if (!el || el.tagName !== "INPUT" || el.type !== "date") return;
  if (!el.value) el.classList.add("is-placeholder");
  else el.classList.remove("is-placeholder");
}

/* ---------------------------
   Textarea auto-grow
--------------------------- */
function autoGrowTextarea(el){
  if (!el || el.tagName !== "TEXTAREA") return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/* ---------------------------
   Notes: 2x2 card height sync + textarea fill
   Applies to `.cards-grid.two-col` rows
--------------------------- */
function syncNotesRowHeights(){
  const rows = qsa(".cards-grid.two-col");
  rows.forEach(row => {
    const cards = qsa(".section-block", row);
    if (cards.length !== 2) return;

    // Reset heights before measuring
    cards.forEach(c => c.style.minHeight = "");

    // Measure max
    const maxH = Math.max(...cards.map(c => c.getBoundingClientRect().height));

    // Apply
    cards.forEach(c => c.style.minHeight = `${maxH}px`);

    // Make textarea fill remaining space if card has just one textarea or notes-block
    cards.forEach(c => {
      const ta = qs("textarea", c);
      if (!ta) return;

      // If multiple inputs exist, don’t force fill
      const otherFields = qsa("input, select", c);
      if (otherFields.length > 0) return;

      // Fill behavior
      c.style.display = "flex";
      c.style.flexDirection = "column";

      // Make textarea grow
      ta.style.flex = "1 1 auto";
      ta.style.minHeight = "120px";
      // keep auto-grow pleasant (still allow larger)
      autoGrowTextarea(ta);
    });
  });
}

/* ---------------------------
   Sidebar navigation
--------------------------- */
function initSidebarNav(){
  const buttons = qsa(".nav-btn");
  const sections = qsa(".page-section");

  function activateSection(targetId){
    sections.forEach(sec => sec.classList.toggle("active", sec.id === targetId));
    buttons.forEach(btn => btn.classList.toggle("active", btn.dataset.target === targetId));
    // after layout change
    requestAnimationFrame(syncNotesRowHeights);
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (target) activateSection(target);
    });
  });
}

/* ---------------------------
   Dealership name mirror to topbar
--------------------------- */
function initDealershipNameMirror(){
  const input = qs("#dealershipNameInput");
  const display = qs("#dealershipNameDisplay");
  if (!input || !display) return;

  const update = () => { display.textContent = input.value.trim(); };

  input.addEventListener("input", () => {
    update();
    saveField(input);
  });

  // Load saved value then update
  loadField(input);
  update();
}

/* ---------------------------
   Universal autosave listeners
--------------------------- */
function initAutosave(){
  // Load everything initially
  qsa("input, select, textarea").forEach(el => loadField(el));

  // Attach listeners
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!isField(el)) return;

    if (el.tagName === "TEXTAREA") autoGrowTextarea(el);
    if (el.tagName === "SELECT") refreshGhostForSelect(el);
    if (el.tagName === "INPUT" && el.type === "date") refreshDatePlaceholder(el);

    saveField(el);
    // keep layout pretty
    if (el.tagName === "TEXTAREA") requestAnimationFrame(syncNotesRowHeights);
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!isField(el)) return;

    if (el.tagName === "SELECT") refreshGhostForSelect(el);
    if (el.tagName === "INPUT" && el.type === "date") refreshDatePlaceholder(el);

    saveField(el);
    requestAnimationFrame(syncNotesRowHeights);
  });

  // Initialize placeholder styles
  qsa("select").forEach(refreshGhostForSelect);
  qsa('input[type="date"]').forEach(refreshDatePlaceholder);
  qsa("textarea").forEach(autoGrowTextarea);
}

/* ---------------------------
   Reset Page + Clear All
--------------------------- */
function resetSection(section){
  if (!section) return;

  // Remove dynamic clones inside this section
  // Additional trainers clones
  qsa('[data-clone="true"]', section).forEach(n => n.remove());

  // Remove dynamically added ticket cards (non-base)
  qsa('.ticket-group', section).forEach(card => {
    if (card.dataset.base !== "true") card.remove();
  });

  // Remove dynamically added additional POC cards (non-base)
  qsa(".additional-poc-card", section).forEach(card => {
    if (card.dataset.base !== "true") card.remove();
  });

  // Reset fields
  const fields = qsa("input, select, textarea", section);
  fields.forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    saveField(el); // will overwrite
    // remove from storage too (clean slate)
    const key = getFieldKey(el);
    if (key) { try { localStorage.removeItem(key); } catch(e){} }

    refreshGhostForSelect(el);
    refreshDatePlaceholder(el);
    autoGrowTextarea(el);
  });

  // Re-lock any “forced Open” ticket base status
  // (Support Tickets module also handles this, but safe here)
  qsa(".ticket-status-select", section).forEach(sel => {
    const card = sel.closest(".ticket-group");
    if (card && card.dataset.base === "true"){
      sel.value = "Open";
      sel.disabled = true;
    }
  });

  requestAnimationFrame(syncNotesRowHeights);
}

function initResetButtons(){
  // Reset This Page
  qsa(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".page-section");
      if (!section) return;
      if (confirm("Reset this page? This will clear fields and remove added rows on this page.")){
        resetSection(section);
      }
    });
  });

  // Clear All
  const clearAllBtn = qs("#clearAllBtn");
  if (clearAllBtn){
    clearAllBtn.addEventListener("click", () => {
      if (!confirm("Clear ALL pages? This will erase all saved progress.")) return;

      clearAllStorage();

      // Remove all clones everywhere
      qsa('[data-clone="true"]').forEach(n => n.remove());
      qsa(".additional-poc-card").forEach(card => {
        if (card.dataset.base !== "true") card.remove();
      });
      qsa(".ticket-group").forEach(card => {
        if (card.dataset.base !== "true") card.remove();
      });

      // Reset all fields
      qsa("input, select, textarea").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
        refreshGhostForSelect(el);
        refreshDatePlaceholder(el);
        autoGrowTextarea(el);
      });

      // Clear topbar dealership display
      const disp = qs("#dealershipNameDisplay");
      if (disp) disp.textContent = "";

      requestAnimationFrame(syncNotesRowHeights);
    });
  }
}

/* ---------------------------
   Dynamic row: Additional Trainers
   Base row: .checklist-row.integrated-plus.indent-sub[data-base="true"]
   Inject into: #additionalTrainersContainer
--------------------------- */
function initAdditionalTrainers(){
  const base = qs('#trainers-deployment .checklist-row.integrated-plus[data-base="true"]');
  const container = qs("#additionalTrainersContainer");
  if (!base || !container) return;

  const addBtn = qs("button.add-row", base);
  const baseInput = qs('input[type="text"]', base);
  if (!addBtn || !baseInput) return;

  addBtn.addEventListener("click", () => {
    if (!baseInput.value.trim()){
      alert("Enter an additional trainer name before adding another.");
      baseInput.focus();
      return;
    }

    // clone row
    const clone = base.cloneNode(true);
    clone.dataset.clone = "true";
    clone.dataset.base = "false";

    // remove +, replace with X
    const btn = qs("button.add-row", clone);
    if (btn){
      btn.textContent = "✕";
      btn.title = "Remove trainer";
      btn.addEventListener("click", () => {
        // remove storage for fields in clone before removing
        qsa("input, select, textarea", clone).forEach(el => {
          const key = getFieldKey(el);
          if (key) { try { localStorage.removeItem(key); } catch(e){} }
        });
        clone.remove();
        requestAnimationFrame(syncNotesRowHeights);
      });
    }

    // clear input in clone for user to add another, BUT keep the one they typed in base by moving value
    const cloneInput = qs('input[type="text"]', clone);
    if (cloneInput){
      cloneInput.value = baseInput.value;
      baseInput.value = "";
      saveField(baseInput);
      saveField(cloneInput);
    }

    container.appendChild(clone);
    requestAnimationFrame(syncNotesRowHeights);
  });
}

/* ---------------------------
   Dynamic cards: Additional POC
   Base: .additional-poc-card[data-base="true"]
   Add button: .additional-poc-add
--------------------------- */
function initAdditionalPOC(){
  const base = qs('.additional-poc-card[data-base="true"]');
  if (!base) return;

  const addBtn = qs(".additional-poc-add", base);
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    // Require name before adding another
    const nameInput = qs('input[type="text"]', qs(".integrated-plus", base) || base);
    if (nameInput && !nameInput.value.trim()){
      alert("Enter the Additional POC name before adding another contact.");
      nameInput.focus();
      return;
    }

    const clone = base.cloneNode(true);
    clone.dataset.base = "false";
    clone.dataset.clone = "true";

    // Replace + with remove
    const btn = qs(".additional-poc-add", clone);
    if (btn){
      btn.textContent = "✕";
      btn.title = "Remove contact";
      btn.classList.add("remove-poc-btn");
      btn.addEventListener("click", () => {
        qsa("input, select, textarea", clone).forEach(el => {
          const key = getFieldKey(el);
          if (key) { try { localStorage.removeItem(key); } catch(e){} }
        });
        clone.remove();
        requestAnimationFrame(syncNotesRowHeights);
      });
    }

    // Clear inputs in clone (it’s a new contact)
    qsa("input, textarea", clone).forEach(el => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });
    qsa("select", clone).forEach(sel => {
      sel.value = "";
      refreshGhostForSelect(sel);
    });

    base.parentElement.appendChild(clone);
    requestAnimationFrame(syncNotesRowHeights);
  });
}

/* ---------------------------
   Table add-row buttons
   Supports:
   - Any .table-container with a .table-footer button.add-row
   - Clones the last <tr> in <tbody>
--------------------------- */
function cloneTableRow(table){
  const tbody = qs("tbody", table);
  if (!tbody) return null;

  const rows = qsa("tr", tbody);
  if (!rows.length) return null;

  const last = rows[rows.length - 1];
  const clone = last.cloneNode(true);

  // Clear values in clone
  qsa("input, select, textarea", clone).forEach(el => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
    refreshGhostForSelect(el);
    refreshDatePlaceholder(el);
    autoGrowTextarea(el);
  });

  // Mark it dynamic so reset can remove
  clone.dataset.clone = "true";
  tbody.appendChild(clone);
  return clone;
}

function initTableAddRowButtons(){
  qsa(".table-footer .add-row").forEach(btn => {
    btn.addEventListener("click", () => {
      const container = btn.closest(".table-container");
      const table = qs("table", container);
      if (!table) return;
      const newRow = cloneTableRow(table);
      if (newRow){
        // Focus first text input if exists
        const firstText = qs('input[type="text"]', newRow) || qs("input:not([type='checkbox'])", newRow);
        firstText?.focus();
      }
      requestAnimationFrame(syncNotesRowHeights);
    });
  });
}

/* ---------------------------
   Google Maps updater
--------------------------- */
function buildMapsEmbedUrl(address){
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps?q=${q}&z=14&output=embed`;
}

function updateDealershipMap(address){
  const frame = qs("#dealershipMapFrame");
  if (!frame) return;
  frame.src = buildMapsEmbedUrl(address);
}

function initMapFeatures(){
  const addressInput = qs("#dealershipAddressInput");
  const openBtn = qs("#openAddressInMapsBtn");
  if (!addressInput || !openBtn) return;

  // Update embed when user leaves field
  addressInput.addEventListener("change", () => {
    const addr = addressInput.value.trim();
    if (addr) updateDealershipMap(addr);
  });

  openBtn.addEventListener("click", () => {
    const addr = addressInput.value.trim();
    if (!addr){
      alert("Enter an address first.");
      addressInput.focus();
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  // If already saved, loadField() will populate; then update embed
  loadField(addressInput);
  if (addressInput.value.trim()){
    updateDealershipMap(addressInput.value.trim());
  }
}

/* ---------------------------
   HARD JS-injected CSS patch
   (Fix “inputs too wide” / overflow edge cases)
--------------------------- */
function injectCssPatch(){
  const css = `
  /* JS Patch: prevent runaway widths */
  .checklist-row input,
  .checklist-row select,
  .checklist-row textarea{
    max-width:100%;
    box-sizing:border-box;
  }
  .training-table input,
  .training-table select{
    max-width:100%;
    box-sizing:border-box;
  }
  .address-input-wrap{
    display:flex;
    gap:10px;
    align-items:center;
  }
  .address-input-wrap .address-input{
    flex:1 1 auto;
    min-width:0;
  }
  .scroll-wrapper{
    overflow:auto;
  }
  `;
  const style = document.createElement("style");
  style.id = "mkc-js-css-patch";
  style.textContent = css;
  document.head.appendChild(style);
}

/* ---------------------------
   Support Tickets module
   - Add/validate
   - Move by status
   - Persist (single JSON key)
--------------------------- */
(function supportTicketsModule(){
  const STORAGE_KEY = "mkc:supportTickets:v1";

  const STATUS_TO_CONTAINER_ID = {
    "Open": "openTicketsContainer",
    "Tier Two": "tierTwoTicketsContainer",
    "Closed - Resolved": "closedResolvedTicketsContainer",
    "Closed - Feature Not Supported": "closedFeatureTicketsContainer",
  };

  function statusToContainerId(status){
    return STATUS_TO_CONTAINER_ID[status] || "openTicketsContainer";
  }

  function buildCardId(){
    return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  }

  function isComplete(card){
    const num = card.querySelector(".ticket-number-input")?.value?.trim() || "";
    const url = card.querySelector(".ticket-zendesk-input")?.value?.trim() || "";
    const sum = card.querySelector(".ticket-summary-input")?.value?.trim() || "";
    return Boolean(num && url && sum);
  }

  function setCardStatus(card, status, { lockOpen=false } = {}){
    const sel = card.querySelector(".ticket-status-select");
    if (!sel) return;

    sel.value = status;

    if (lockOpen && status === "Open"){
      sel.disabled = true;
      sel.setAttribute("aria-disabled", "true");
      sel.dataset.locked = "true";
    } else {
      sel.disabled = false;
      sel.removeAttribute("aria-disabled");
      delete sel.dataset.locked;
    }
  }

  function moveCardToStatus(card, status){
    const containerId = statusToContainerId(status);
    const container = qs(`#${containerId}`);
    if (!container) return;

    if (status === "Open") setCardStatus(card, "Open", { lockOpen:true });
    else setCardStatus(card, status, { lockOpen:false });

    container.appendChild(card);
  }

  function debounce(fn, wait){
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function serialize(){
    const allCards = qsa(".ticket-group");
    return allCards.map(card => {
      const id = card.dataset.ticketId || buildCardId();
      card.dataset.ticketId = id;

      const statusSel = card.querySelector(".ticket-status-select");
      const status = statusSel?.value || "Open";

      return {
        id,
        isBase: card.dataset.base === "true",
        status,
        ticketNumber: card.querySelector(".ticket-number-input")?.value || "",
        zendeskUrl: card.querySelector(".ticket-zendesk-input")?.value || "",
        summary: card.querySelector(".ticket-summary-input")?.value || "",
      };
    });
  }

  function persist(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    }catch(e){}
  }

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    }catch(e){
      return null;
    }
  }

  function normalizeBaseCard(base){
    if (!base.dataset.ticketId) base.dataset.ticketId = buildCardId();

    // Base always Open + locked
    setCardStatus(base, "Open", { lockOpen:true });

    // Wire add button
    const addBtn = base.querySelector(".add-ticket-btn");
    if (addBtn){
      addBtn.addEventListener("click", () => {
        if (!isComplete(base)){
          base.classList.add("ticket-incomplete");
          alert("Complete Ticket Number, Zendesk URL, and Summary before adding another ticket.");
          return;
        }
        base.classList.remove("ticket-incomplete");

        const newCard = cloneFromBase(base);

        // Clear base after cloning (comment out if you want base to keep its values)
        base.querySelector(".ticket-number-input").value = "";
        base.querySelector(".ticket-zendesk-input").value = "";
        base.querySelector(".ticket-summary-input").value = "";

        persist();
        newCard.querySelector(".ticket-number-input")?.focus();
      });
    }

    base.addEventListener("input", debounce(persist, 250));
    base.addEventListener("change", debounce(persist, 250));
  }

  function cloneFromBase(base){
    const clone = base.cloneNode(true);
    clone.dataset.base = "false";
    clone.dataset.clone = "true";
    clone.dataset.ticketId = buildCardId();
    clone.classList.remove("ticket-incomplete");

    // Remove disclaimer on clones
    clone.querySelector(".ticket-disclaimer")?.remove();

    // Replace + with remove
    const btn = clone.querySelector(".add-ticket-btn");
    if (btn){
      btn.textContent = "✕";
      btn.title = "Remove Ticket";
      btn.classList.add("remove-ticket-btn");
      btn.classList.remove("add-ticket-btn");
      btn.addEventListener("click", () => {
        if (confirm("Remove this ticket card?")){
          // remove ticket-specific keys too
          qsa("input, select, textarea", clone).forEach(el => {
            const k = getFieldKey(el);
            if (k) { try { localStorage.removeItem(k); } catch(e){} }
          });
          clone.remove();
          persist();
        }
      });
    }

    // Enable status on clones and move on change
    const statusSel = clone.querySelector(".ticket-status-select");
    if (statusSel){
      statusSel.disabled = false;
      statusSel.addEventListener("change", () => {
        moveCardToStatus(clone, statusSel.value || "Open");
        persist();
      });
    }

    // Persist + autosave fields
    clone.addEventListener("input", debounce(persist, 250));
    clone.addEventListener("change", debounce(persist, 250));

    // Insert into Open by default
    const openContainer = qs("#openTicketsContainer");
    openContainer?.appendChild(clone);
    moveCardToStatus(clone, "Open");

    return clone;
  }

  function hydrate(data){
    const openContainer = qs("#openTicketsContainer");
    if (!openContainer) return;

    const base = openContainer.querySelector('.ticket-group[data-base="true"]');
    if (!base) return;

    // remove existing non-base
    qsa(".ticket-group").forEach(card => {
      if (card.dataset.base !== "true") card.remove();
    });

    // apply base state if found
    const baseState = data.find(x => x.isBase);
    if (baseState){
      base.dataset.ticketId = baseState.id || base.dataset.ticketId || buildCardId();
      base.querySelector(".ticket-number-input").value = baseState.ticketNumber || "";
      base.querySelector(".ticket-zendesk-input").value = baseState.zendeskUrl || "";
      base.querySelector(".ticket-summary-input").value = baseState.summary || "";
    }
    moveCardToStatus(base, "Open");
    normalizeBaseCard(base);

    // rebuild clones
    data.filter(x => !x.isBase).forEach(item => {
      const card = base.cloneNode(true);
      card.dataset.base = "false";
      card.dataset.clone = "true";
      card.dataset.ticketId = item.id || buildCardId();

      card.querySelector(".ticket-disclaimer")?.remove();

      // swap button to remove
      const btn = card.querySelector(".add-ticket-btn");
      if (btn){
        btn.textContent = "✕";
        btn.title = "Remove Ticket";
        btn.classList.add("remove-ticket-btn");
        btn.classList.remove("add-ticket-btn");
        btn.addEventListener("click", () => {
          if (confirm("Remove this ticket card?")){
            card.remove();
            persist();
          }
        });
      }

      // fill fields
      card.querySelector(".ticket-number-input").value = item.ticketNumber || "";
      card.querySelector(".ticket-zendesk-input").value = item.zendeskUrl || "";
      card.querySelector(".ticket-summary-input").value = item.summary || "";

      // status handler
      const statusSel = card.querySelector(".ticket-status-select");
      if (statusSel){
        statusSel.disabled = false;
        statusSel.addEventListener("change", () => {
          moveCardToStatus(card, statusSel.value || "Open");
          persist();
        });
      }

      card.addEventListener("input", debounce(persist, 250));
      card.addEventListener("change", debounce(persist, 250));

      moveCardToStatus(card, item.status || "Open");
    });
  }

  function initSupportTickets(){
    const openContainer = qs("#openTicketsContainer");
    if (!openContainer) return;

    const base = openContainer.querySelector('.ticket-group[data-base="true"]');
    if (!base) return;

    normalizeBaseCard(base);

    const saved = load();
    if (saved) hydrate(saved);
    else persist();
  }

  document.addEventListener("DOMContentLoaded", initSupportTickets);
})();

/* ---------------------------
   Optional: Save PDF (if jsPDF + html2canvas are present)
   Button: #savePDF
   Strategy: capture each .page-section as an image
--------------------------- */
async function saveAllPagesAsPDF(){
  const btn = qs("#savePDF");
  if (btn) btn.disabled = true;

  try{
    if (!window.jspdf?.jsPDF || !window.html2canvas){
      alert("PDF export requires jsPDF + html2canvas loaded on the page.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "pt", "letter");

    const sections = qsa(".page-section");
    const activeId = qs(".page-section.active")?.id;

    // Temporarily show all sections for capture
    sections.forEach(sec => sec.classList.add("mkc-pdf-visible"));
    sections.forEach(sec => sec.classList.add("active"));

    for (let i=0; i<sections.length; i++){
      const sec = sections[i];
      // Render
      const canvas = await window.html2canvas(sec, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Fit image to page width, maintain aspect
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
    }

    pdf.save("myKaarma_Training_Checklist.pdf");

    // Restore active page
    sections.forEach(sec => sec.classList.remove("active"));
    if (activeId) qs(`#${activeId}`)?.classList.add("active");

  } catch (e){
    console.error(e);
    alert("PDF export failed. Check console for details.");
  } finally {
    // Remove temp class
    qsa(".page-section").forEach(sec => sec.classList.remove("mkc-pdf-visible"));
    if (btn) btn.disabled = false;
  }
}

function initPDFButton(){
  const btn = qs("#savePDF");
  if (!btn) return;
  btn.addEventListener("click", saveAllPagesAsPDF);
}

/* ---------------------------
   Boot
--------------------------- */
function initApp(){
  injectCssPatch();
  initSidebarNav();
  initAutosave();
  initResetButtons();
  initDealershipNameMirror();
  initAdditionalTrainers();
  initAdditionalPOC();
  initTableAddRowButtons();
  initMapFeatures();
  initPDFButton();

  // Post-layout sync
  requestAnimationFrame(syncNotesRowHeights);
  window.addEventListener("resize", () => requestAnimationFrame(syncNotesRowHeights));
}

document.addEventListener("DOMContentLoaded", initApp);
