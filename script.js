/* =======================================================
   myKaarma Interactive Training Checklist — FULL JS
   SAFE BUILD + Support Tickets status routing + add ticket
   (No visual/layout mutation; only clones/moves ticket groups)
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
  initSupportTickets(); // ✅ added
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
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else {
        el.value = "";
      }
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
   INTEGRATED “+” INPUT ROWS (Additional POC)
   (Clones the entire card safely)
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

    clone.querySelectorAll("input, textarea").forEach(i => (i.value = ""));
    clone.querySelectorAll("select").forEach(s => {
      s.value = "";
      s.dispatchEvent(new Event("change", { bubbles: true }));
    });

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
      if (!table) return;

      const tbody = table.querySelector("tbody");
      const rows = tbody?.querySelectorAll("tr");
      if (!rows || !rows.length) return;

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
   - Add another ticket (+)
   - Move ticket cards into correct status section
     Open -> Tier Two -> Closed - Resolved -> Closed - Feature Not Supported
   ======================================================= */
function initSupportTickets() {
  const supportPage = document.getElementById("support-tickets");
  if (!supportPage) return;

  const openWrap   = document.getElementById("openTicketsContainer");
  const tierTwoWrap = document.getElementById("tierTwoTicketsContainer");
  const closedResolvedWrap = document.getElementById("closedResolvedTicketsContainer");
  const closedFeatureWrap  = document.getElementById("closedFeatureTicketsContainer");

  if (!openWrap || !tierTwoWrap || !closedResolvedWrap || !closedFeatureWrap) return;

  const getTargetContainerForStatus = (statusValue) => {
    const v = (statusValue || "").trim();

    if (v === "Tier Two") return tierTwoWrap;
    if (v === "Closed - Resolved") return closedResolvedWrap;

    // Your HTML uses an en dash in the option label; value is set exactly in markup:
    // <option value="Closed – Feature Not Supported">
    if (v === "Closed – Feature Not Supported") return closedFeatureWrap;

    // default
    return openWrap;
  };

  const moveTicketGroupIfNeeded = (group) => {
    if (!group) return;
    const select = group.querySelector(".ticket-status-select");
    const status = select?.value || "Open";
    const target = getTargetContainerForStatus(status);

    // Keep base template in Open section only
    if (group.getAttribute("data-base") === "true" && target !== openWrap) {
      select.value = "Open";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (target && group.parentElement !== target) {
      target.appendChild(group);
    }
  };

  // 1) Add ticket (+) clones the base ticket-group
  supportPage.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-ticket-btn");
    if (!addBtn) return;

    const baseGroup = addBtn.closest(".ticket-group");
    if (!baseGroup) return;

    const clone = baseGroup.cloneNode(true);
    clone.removeAttribute("data-base"); // becomes a normal ticket card

    // Remove the + button from cloned card
    clone.querySelectorAll(".add-ticket-btn").forEach(b => b.remove());

    // Reset fields
    clone.querySelectorAll("input[type='text'], input[type='url'], input[type='email'], input[type='tel']").forEach(i => {
      i.value = "";
      i.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clone.querySelectorAll("textarea").forEach(t => {
      t.value = "";
      t.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const statusSelect = clone.querySelector(".ticket-status-select");
    if (statusSelect) {
      statusSelect.value = "Open";
      statusSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Insert right after the base ticket in Open section
    openWrap.insertBefore(clone, baseGroup.nextSibling);
  });

  // 2) When status changes, move the card to the correct section
  supportPage.addEventListener("change", (e) => {
    const sel = e.target.closest(".ticket-status-select");
    if (!sel) return;

    const group = sel.closest(".ticket-group");
    if (!group) return;

    moveTicketGroupIfNeeded(group);
  });

  // 3) On load: ensure existing groups are in the correct section
  supportPage.querySelectorAll(".ticket-group").forEach(group => {
    moveTicketGroupIfNeeded(group);
  });
}
