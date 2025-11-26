// Auto-cache buster loader
(function () {
  const cache = Date.now();
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    link.href = link.href.split('?')[0] + '?v=' + cache;
  });
  document.querySelectorAll('script[src]').forEach(script => {
    if (!script.src.includes('script.js')) return;
    script.src = script.src.split('?')[0] + '?v=' + cache;
  });
})();


// =====================================================================
// MAIN JS INIT
// =====================================================================
window.addEventListener("DOMContentLoaded", () => {

  // ---------------------------------------------------------
  // PAGE NAVIGATION
  // ---------------------------------------------------------
  document.querySelectorAll(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.page;
      document.querySelectorAll(".page-section").forEach(sec =>
        sec.classList.remove("active")
      );
      document.getElementById(target).classList.add("active");
    });
  });


  // ---------------------------------------------------------
  // TRAINING START → AUTO-FILL TRAINING END DATE (+2 DAYS)
  // ---------------------------------------------------------
  const startDateEl = document.getElementById("trainingStartDate");
  const endDateEl = document.getElementById("trainingEndDate");

  if (startDateEl && endDateEl) {
    startDateEl.addEventListener("change", () => {
      if (!startDateEl.value) return;
      const start = new Date(startDateEl.value + "T00:00:00");
      if (isNaN(start.getTime())) return;

      start.setDate(start.getDate() + 2);

      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, "0");
      const dd = String(start.getDate()).padStart(2, "0");
      endDateEl.value = `${yyyy}-${mm}-${dd}`;
    });
  }


  // ---------------------------------------------------------
  // GENERIC ADD-ROW BUTTONS (Add ONLY ONE ROW)
  // ---------------------------------------------------------
  document.querySelectorAll(".add-row").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".checklist-row");
      if (!row) return;

      const clone = row.cloneNode(true);

      // Remove plus button from the cloned row
      const cloneBtn = clone.querySelector(".add-row");
      if (cloneBtn) cloneBtn.remove();

      // Clear inputs
      clone.querySelectorAll("input, select, textarea").forEach(i => (i.value = ""));

      // Insert below
      row.insertAdjacentElement("afterend", clone);
    });
  });


  // ---------------------------------------------------------
  // SUPPORT TICKET STATUS MOVEMENT
  // ---------------------------------------------------------
  const containers = {
    Open: document.getElementById("openTicketsContainer"),
    "Tier Two": document.getElementById("tierTwoTicketsContainer"),
    "Closed - Resolved": document.getElementById("closedResolvedTicketsContainer"),
    "Closed – Feature Not Supported": document.getElementById("closedFeatureTicketsContainer")
  };

  function attachTicketListeners() {
    document.querySelectorAll(".ticket-status-select").forEach(select => {
      select.addEventListener("change", () => {
        const status = select.value;
        const card = select.closest(".ticket-group");
        if (!containers[status]) return;

        containers[status].appendChild(card);

        // Always regenerate default open ticket card if moved
        if (status !== "Open") {
          createDefaultOpenTicket();
        }
      });
    });
  }

  // Create default OPEN support ticket card if none exists
  function createDefaultOpenTicket() {
    if (document.querySelector("#openTicketsContainer .ticket-group")) return;

    const container = containers["Open"];
    const div = document.createElement("div");
    div.classList.add("ticket-group");

    div.innerHTML = `
        <div class="checklist-row integrated-plus">
          <label>Support Ticket Number</label>
          <input type="text" placeholder="Ticket #">
          <button class="add-row" type="button">+</button>
        </div>

        <div class="checklist-row">
          <label>Issue Summary</label>
          <input type="text" placeholder="Short summary of the issue">
        </div>

        <div class="checklist-row">
          <label>Ticket Status</label>
          <select class="ticket-status-select">
            <option>Open</option>
            <option>Tier Two</option>
            <option>Closed - Resolved</option>
            <option>Closed – Feature Not Supported</option>
          </select>
        </div>

        <div class="checklist-row">
          <label>Zendesk link</label>
          <input type="text" placeholder="Paste Zendesk link">
        </div>
    `;

    container.appendChild(div);

    // Rebind listeners
    div.querySelector(".add-row").addEventListener("click", () => {
      const row = div.querySelector(".integrated-plus");
      const clone = row.cloneNode(true);
      clone.querySelector(".add-row").remove();
      clone.querySelector("input").value = "";
      row.insertAdjacentElement("afterend", clone);
    });

    attachTicketListeners();
  }

  // Attach listeners to existing tickets
  attachTicketListeners();


  // ---------------------------------------------------------
  // RESET THIS PAGE (only active page)
  // ---------------------------------------------------------
  document.querySelectorAll(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.closest(".page-section");
      if (!page) return;

      page.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
      });

      // Clear added rows (keep first row)
      page.querySelectorAll(".checklist-row + .checklist-row").forEach((el, idx) => {
        if (idx > 0) el.remove();
      });

      // Support tickets need a fresh Open card
      if (page.id === "support-ticket") {
        document.getElementById("openTicketsContainer").innerHTML = "";
        document.getElementById("tierTwoTicketsContainer").innerHTML = "";
        document.getElementById("closedResolvedTicketsContainer").innerHTML = "";
        document.getElementById("closedFeatureTicketsContainer").innerHTML = "";
        createDefaultOpenTicket();
      }

      // Return user to Page 1
      document.querySelectorAll(".page-section").forEach(sec =>
        sec.classList.remove("active")
      );
      document.getElementById("page1").classList.add("active");
    });
  });


  // ---------------------------------------------------------
  // CLEAR ALL DATA (FULL RESET)
  // ---------------------------------------------------------
  document.querySelectorAll(".clear-all-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
      });

      document.querySelectorAll(".ticket-group").forEach((el, idx) => {
        if (idx > 0) el.remove();
      });

      // Reset support tickets
      document.getElementById("openTicketsContainer").innerHTML = "";
      document.getElementById("tierTwoTicketsContainer").innerHTML = "";
      document.getElementById("closedResolvedTicketsContainer").innerHTML = "";
      document.getElementById("closedFeatureTicketsContainer").innerHTML = "";
      createDefaultOpenTicket();

      // Jump back to page 1
      document.querySelectorAll(".page-section").forEach(sec =>
        sec.classList.remove("active")
      );
      document.getElementById("page1").classList.add("active");
    });
  });
});
