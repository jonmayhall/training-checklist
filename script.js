/* =========================================================
   myKaarma Interactive Training Checklist
   FULL SCRIPT.JS — CLEAN + STABLE
   ========================================================= */

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const navButtons = document.querySelectorAll(".nav-btn");
  const pages = document.querySelectorAll(".page-section");

  function showPage(pageId) {
    pages.forEach(p => p.classList.remove("active"));
    navButtons.forEach(b => b.classList.remove("active"));

    const page = document.getElementById(pageId);
    const btn = document.querySelector(`.nav-btn[data-target="${pageId}"]`);

    if (page) page.classList.add("active");
    if (btn) btn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (target) showPage(target);
    });
  });

  // Default page
  if (pages.length) {
    showPage(pages[0].id);
  }

  /* =========================================================
     RESET THIS PAGE
     ========================================================= */

  document.querySelectorAll(".clear-page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".page-section");
      if (!section) return;

      section.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = false;
        } else {
          el.value = "";
        }
      });
    });
  });

  /* =========================================================
     CLEAR ALL (SIDEBAR BUTTON)
     ========================================================= */

  const clearAllBtn = document.getElementById("clearAllBtn");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      if (!confirm("Clear all pages? This cannot be undone.")) return;

      document.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = false;
        } else {
          el.value = "";
        }
      });
    });
  }

  /* =========================================================
     ADDITIONAL TRAINERS
     ========================================================= */

  const addTrainerBtn = document.querySelector(
    "#trainers-deployment .add-row"
  );
  const trainersContainer = document.getElementById(
    "additionalTrainersContainer"
  );

  if (addTrainerBtn && trainersContainer) {
    addTrainerBtn.addEventListener("click", () => {
      const row = document.createElement("div");
      row.className = "checklist-row integrated-plus";

      row.innerHTML = `
        <label>Additional Trainer</label>
        <input type="text" placeholder="Enter additional trainer name">
      `;

      trainersContainer.appendChild(row);
    });
  }

  /* =========================================================
     ONSITE TRAINING DATES (PAGE 2)
     ========================================================= */

  const startInput = document.getElementById("onsiteTrainingStart");
  const endInput = document.getElementById("onsiteTrainingEnd");

  if (startInput && endInput) {
    startInput.addEventListener("change", () => {
      if (!startInput.value) return;

      const startDate = new Date(startInput.value);
      const endDate = new Date(startDate);

      endDate.setDate(startDate.getDate() + 2);

      const yyyy = endDate.getFullYear();
      const mm = String(endDate.getMonth() + 1).padStart(2, "0");
      const dd = String(endDate.getDate()).padStart(2, "0");

      endInput.value = `${yyyy}-${mm}-${dd}`;
    });
  }
});
