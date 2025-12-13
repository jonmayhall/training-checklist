/* =======================================================
   myKaarma Interactive Training Checklist — FULL JS
   SAFE BUILD (No layout or content mutation)
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initResetButtons();
  initClearAll();
  initGhostSelects();
  initTopbarDealershipDisplay();
  initAddressMap();
  initIntegratedAddButtons();
  initTableAddButtons();
});

/* =======================================================
   PAGE NAVIGATION
   ======================================================= */
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const pages = document.querySelectorAll(".page-section");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;

      navButtons.forEach(b => b.classList.remove("active"));
      pages.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  // Activate first page by default
  navButtons[0]?.click();
}

/* =======================================================
   RESET BUTTONS
   ======================================================= */
function initResetButtons() {
  document.querySelectorAll(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      page.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = false;
        } else {
          el.value = "";
        }
        el.dispatchEvent(new Event("change"));
      });
    });
  });
}

/* =======================================================
   CLEAR ALL
   ======================================================= */
function initClearAll() {
  const btn = document.getElementById("clearAllBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!confirm("Clear ALL pages?")) return;

    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else {
        el.value = "";
      }
      el.dispatchEvent(new Event("change"));
    });
  });
}

/* =======================================================
   GHOST SELECT TEXT
   ======================================================= */
function initGhostSelects() {
  document.querySelectorAll("select").forEach(select => {
    const update = () => {
      if (select.value === "") {
        select.classList.add("is-placeholder");
      } else {
        select.classList.remove("is-placeholder");
      }
    };
    select.addEventListener("change", update);
    update();
  });
}

/* =======================================================
   TOP BAR DEALERSHIP DISPLAY
   Dealer Group (if present) Dealership Name - DID
   ======================================================= */
function initTopbarDealershipDisplay() {
  const out = document.getElementById("dealershipNameDisplay");
  if (!out) return;

  const groupEl = document.getElementById("dealerGroupInput");
  const nameEl  = document.getElementById("dealershipNameInput");
  const didEl   = document.getElementById("dealershipDidInput");

  const update = () => {
    const group = groupEl?.value.trim() || "";
    const name  = nameEl?.value.trim()  || "";
    const did   = didEl?.value.trim()   || "";

    let text = "";
    if (group) text += group + " ";
    if (name) text += name;
    text = text.trim();

    if (did) text = text ? `${text} - ${did}` : did;

    out.textContent = text || "Dealership Info";
  };

  [groupEl, nameEl, didEl].forEach(el => {
    el?.addEventListener("input", update);
    el?.addEventListener("change", update);
  });

  update();
}

/* =======================================================
   ADDRESS → GOOGLE MAPS
   ======================================================= */
function initAddressMap() {
  const addressInput = document.getElementById("dealershipAddressInput");
  const mapBtn = document.getElementById("openAddressInMapsBtn");
  const iframe = document.getElementById("dealershipMapFrame");

  if (!addressInput || !mapBtn) return;

  const updateMap = () => {
    const addr = addressInput.value.trim();
    if (!addr || !iframe) return;
    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;
  };

  addressInput.addEventListener("change", updateMap);
  addressInput.addEventListener("blur", updateMap);

  mapBtn.addEventListener("click", () => {
    const addr = addressInput.value.trim();
    if (!addr) return;
    window.open(`https://www.google.com/maps?q=${encodeURIComponent(addr)}`, "_blank");
  });
}

/* =======================================================
   INTEGRATED “+” INPUT ROWS (Additional POC, Trainers, etc.)
   ======================================================= */
function initIntegratedAddButtons() {
  document.addEventListener("click", e => {
    const addBtn = e.target.closest(".add-row, .additional-poc-add");
    if (!addBtn) return;

    const row = addBtn.closest(".checklist-row");
    const card = addBtn.closest(".additional-poc-card");
    if (!row || !card) return;

    const clone = card.cloneNode(true);
    clone.removeAttribute("data-base");

    // Remove add button from cloned card
    clone.querySelectorAll(".add-row, .additional-poc-add").forEach(b => b.remove());

    clone.querySelectorAll("input").forEach(i => i.value = "");
    card.parentNode.insertBefore(clone, card.nextSibling);
  });
}

/* =======================================================
   TABLE ROW ADD / REMOVE
   ======================================================= */
function initTableAddButtons() {
  document.querySelectorAll(".table-footer .add-row").forEach(btn => {
    btn.addEventListener("click", () => {
      const table = btn.closest(".table-container")?.querySelector("table");
      if (!table) return;

      const tbody = table.querySelector("tbody");
      const rows = tbody.querySelectorAll("tr");
      if (!rows.length) return;

      const clone = rows[rows.length - 1].cloneNode(true);
      clone.querySelectorAll("input, select").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
      });

      tbody.appendChild(clone);
    });
  });
}
