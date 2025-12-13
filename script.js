/* =========================================================
   myKaarma Interactive Training Checklist — script.js
   FULL, CLEAN, STABLE VERSION
   ========================================================= */

/* -----------------------------
   Helpers
----------------------------- */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function clearInputs(container) {
  qsa("input, textarea, select", container).forEach(el => {
    if (el.type === "checkbox" || el.type === "radio") el.checked = false;
    else el.value = "";
  });
}

/* -----------------------------
   Page Navigation
----------------------------- */
const navButtons = qsa(".nav-btn");
const pages = qsa(".page-section");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    pages.forEach(p => p.classList.remove("active"));
    const page = qs(`#${target}`);
    if (page) page.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

/* -----------------------------
   Clear Page Buttons
----------------------------- */
qsa(".clear-page-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.closest(".page-section");
    if (!page) return;

    if (!confirm("Reset all fields on this page?")) return;
    clearInputs(page);
  });
});

/* -----------------------------
   Clear ALL
----------------------------- */
const clearAllBtn = qs("#clearAllBtn");
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    if (!confirm("This will reset ALL pages. Continue?")) return;
    clearInputs(document);
  });
}

/* =========================================================
   ADDITIONAL TRAINERS (Page 1)
   ========================================================= */
const additionalTrainersContainer = qs("#additionalTrainersContainer");

document.addEventListener("click", e => {
  const addTrainerBtn = e.target.closest(".checklist-row.integrated-plus .add-row");
  if (!addTrainerBtn) return;

  const row = addTrainerBtn.closest(".checklist-row");
  if (!row) return;

  const clone = row.cloneNode(true);
  clearInputs(clone);

  const btn = qs(".add-row", clone);
  btn.textContent = "–";
  btn.title = "Remove";
  btn.classList.add("remove-row");

  additionalTrainersContainer.appendChild(clone);
});

document.addEventListener("click", e => {
  const removeBtn = e.target.closest(".remove-row");
  if (!removeBtn) return;

  const row = removeBtn.closest(".checklist-row");
  if (row) row.remove();
});

/* =========================================================
   ADDITIONAL POC CARDS (ENTIRE CARD)
   ========================================================= */
const pocGrid = qs("#primaryContactsGrid");

document.addEventListener("click", e => {
  const addPocBtn = e.target.closest(".additional-poc-add");
  if (!addPocBtn) return;

  const baseCard = addPocBtn.closest(".additional-poc-card");
  if (!baseCard) return;

  const clone = baseCard.cloneNode(true);
  clone.removeAttribute("data-base");
  clearInputs(clone);

  // remove "+" button from cloned cards
  const btn = qs(".additional-poc-add", clone);
  if (btn) btn.remove();

  pocGrid.appendChild(clone);
});

/* =========================================================
   SUPPORT TICKETS (Page 7)
   ========================================================= */
function moveTicket(ticket) {
  const status = qs(".ticket-status-select", ticket)?.value;

  if (status === "Tier Two") {
    qs("#tierTwoTicketsContainer")?.appendChild(ticket);
  } else if (status === "Closed - Resolved") {
    qs("#closedResolvedTicketsContainer")?.appendChild(ticket);
  } else if (status === "Closed – Feature Not Supported") {
    qs("#closedFeatureTicketsContainer")?.appendChild(ticket);
  } else {
    qs("#openTicketsContainer")?.appendChild(ticket);
  }
}

document.addEventListener("click", e => {
  const addTicketBtn = e.target.closest(".add-ticket-btn");
  if (!addTicketBtn) return;

  const group = addTicketBtn.closest(".ticket-group");
  const clone = group.cloneNode(true);
  clearInputs(clone);

  qs("#openTicketsContainer")?.appendChild(clone);
});

document.addEventListener("change", e => {
  if (!e.target.classList.contains("ticket-status-select")) return;
  const ticket = e.target.closest(".ticket-group");
  if (ticket) moveTicket(ticket);
});

/* =========================================================
   GOOGLE MAPS — ADDRESS AUTOCOMPLETE (FIXED)
   ========================================================= */
let addressAutocomplete;

window.initAddressAutocomplete = function () {
  const input = qs("#dealershipAddressInput");
  if (!input || !window.google) return;

  addressAutocomplete = new google.maps.places.Autocomplete(input, {
    types: ["geocode"]
  });

  addressAutocomplete.addListener("place_changed", () => {
    const place = addressAutocomplete.getPlace();
    if (!place.geometry) return;

    const iframe = qs("#dealershipMapFrame");
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    iframe.src =
      `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  });
};

const mapBtn = qs("#openAddressInMapsBtn");
if (mapBtn) {
  mapBtn.addEventListener("click", () => {
    const addr = qs("#dealershipAddressInput")?.value;
    if (!addr) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`,
      "_blank"
    );
  });
}

/* =========================================================
   SAVE PDF (SAFE HOOK)
   ========================================================= */
const savePDFBtn = qs("#savePDF");
if (savePDFBtn) {
  savePDFBtn.addEventListener("click", () => {
    if (!window.jspdf && !window.jsPDF) {
      alert("PDF library not loaded.");
      return;
    }
    alert("PDF export hook is active.");
  });
}

