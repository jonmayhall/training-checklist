/* =======================================================
   myKaarma Interactive Training Checklist — FULL JS
   SAFE BUILD + Support Tickets routing + required ticket #
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
  initSupportTickets(); // SUPPORT TICKETS
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
        if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
        el.dispatchEvent(new Event("change", { bubbles: true }));
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
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

/* =======================================================
   GHOST SELECT TEXT
   ======================================================= */
function initGhostSelects() {
  document.querySelectorAll("select").forEach(select => {
    const update = () => {
      select.classList.toggle("is-placeholder", select.value === "");
    };
    select.addEventListener("change", update);
    update();
  });
}

/* =======================================================
   TOP BAR DEALERSHIP DISPLAY
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
    if (addr) window.open(`https://www.google.com/maps?q=${encodeURIComponent(addr)}`, "_blank");
  });
}

/* =======================================================
   INTEGRATED “+” INPUT ROWS
   ======================================================= */
function initIntegratedAddButtons() {
  document.addEventListener("click", e => {
    const addBtn = e.target.closest(".add-row, .additional-poc-add");
    if (!addBtn) return;

    const card = addBtn.closest(".additional-poc-card");
    if (!card) return;

    const clone = card.cloneNode(true);
    clone.removeAttribute("data-base");
    clone.querySelectorAll(".add-row, .additional-poc-add").forEach(b => b.remove());
    clone.querySelectorAll("input, textarea").forEach(i => i.value = "");

    card.parentNode.insertBefore(clone, card.nextSibling);
  });
}

/* =======================================================
   TABLE ROW ADD
   ======================================================= */
function initTableAddButtons() {
  document.querySelectorAll(".table-footer .add-row").forEach(btn => {
    btn.addEventListener("click", () => {
      const table = btn.closest(".table-container")?.querySelector("table");
      const tbody = table?.querySelector("tbody");
      if (!tbody) return;

      const rows = tbody.querySelectorAll("tr");
      if (!rows.length) return;

      const clone = rows[rows.length - 1].cloneNode(true);
      clone.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });

      tbody.appendChild(clone);
    });
  });
}

/* =======================================================
   SUPPORT TICKETS
   ======================================================= */
function initSupportTickets() {
  const page = document.getElementById("support-tickets");
  if (!page) return;

  const openWrap = document.getElementById("openTicketsContainer");
  const tierTwoWrap = document.getElementById("tierTwoTicketsContainer");
  const closedResolvedWrap = document.getElementById("closedResolvedTicketsContainer");
  const closedFeatureWrap = document.getElementById("closedFeatureTicketsContainer");

  const getTarget = status => {
    if (status === "Tier Two") return tierTwoWrap;
    if (status === "Closed - Resolved") return closedResolvedWrap;
    if (status === "Closed – Feature Not Supported") return closedFeatureWrap;
    return openWrap;
  };

  const moveGroup = group => {
    if (!group || group.dataset.base === "true") return;
    const status = group.querySelector(".ticket-status-select")?.value || "Open";
    const target = getTarget(status);
    if (target && group.parentElement !== target) target.appendChild(group);
  };

  const clearBase = base => {
    base.querySelectorAll("input, textarea").forEach(el => el.value = "");
    const sel = base.querySelector(".ticket-status-select");
    if (sel) sel.value = "Open";
  };

  const baseIsValid = base => {
    const num = base.querySelector(".ticket-number-input");
    if (!num || !num.value.trim()) {
      num?.classList.add("field-error");
      num?.focus();
      setTimeout(() => num?.classList.remove("field-error"), 900);
      return false;
    }
    return true;
  };

  page.addEventListener("click", e => {
    const btn = e.target.closest(".add-ticket-btn");
    if (!btn) return;

    const base = btn.closest(".ticket-group");
    if (!base || !baseIsValid(base)) return;

    const clone = base.cloneNode(true);
    clone.removeAttribute("data-base");
    clone.querySelectorAll(".add-ticket-btn").forEach(b => b.remove());

    openWrap.appendChild(clone);
    moveGroup(clone);
    clearBase(base);
  });

  page.addEventListener("change", e => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    const group = sel.closest(".ticket-group");
    if (!group || group.dataset.base === "true") {
      sel.value = "Open";
      return;
    }

    moveGroup(group);
  });
}
