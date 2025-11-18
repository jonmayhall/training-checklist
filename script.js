// =======================================================
// myKaarma Interactive Training Checklist – FULL JS
// Nav, Training Tables, Support Tickets, Clear Page, Clear All, PDF
// =======================================================

window.addEventListener('DOMContentLoaded', () => {
  /* === SIDEBAR NAVIGATION === */
  const nav = document.getElementById('sidebar-nav');
  const sections = document.querySelectorAll('.page-section');

  if (nav) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;

      // Highlight active nav
      nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Swap page
      sections.forEach(sec => sec.classList.remove('active'));
      target.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* === ADD ROW HANDLER FOR TRAINING TABLES === */
  document.querySelectorAll('.table-footer .add-row').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.closest('.section');
      if (!section) return;
      const table = section.querySelector('table.training-table');
      if (!table) return;

      const tbody = table.tBodies[0];
      if (!tbody || !tbody.rows.length) return;

      // Clone the last actual row
      const rowToClone = tbody.rows[tbody.rows.length - 1];
      const newRow = rowToClone.cloneNode(true);

      // Reset inputs
      newRow.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
    });
  });

  /* === SUPPORT TICKET – MOVE TICKETS BETWEEN CARDS === */
  const supportSection = document.getElementById('support-ticket');
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedUnsupportedTicketsContainer = document.getElementById('closedUnsupportedTicketsContainer');

  function moveTicketToBucket(select) {
    if (!select) return;
    const group = select.closest('.ticket-group');
    if (!group) return;

    const raw = (select.value || '').toLowerCase().trim();
    let target = openTicketsContainer;

    if (raw.startsWith('tier')) {
      target = tierTwoTicketsContainer || openTicketsContainer;
    } else if (raw.includes('resolved')) {
      target = closedResolvedTicketsContainer || openTicketsContainer;
    } else if (raw.includes('not supported')) {
      target = closedUnsupportedTicketsContainer || openTicketsContainer;
    }

    if (target) {
      target.appendChild(group);
    }
  }

  function attachTicketStatusHandlers(scope) {
    if (!scope) return;
    scope.querySelectorAll('.ticket-status-select').forEach(select => {
      if (select.dataset.boundStatus === '1') return; // avoid duplicate listeners
      select.dataset.boundStatus = '1';

      // Ensure default is Open when first loaded/created
      if (!select.value) {
        select.value = 'Open';
      }

      select.addEventListener('change', () => {
        moveTicketToBucket(select);
      });
    });
  }

  if (supportSection) {
    attachTicketStatusHandlers(supportSection);
  }

  /* === ADDITIONAL TRAINERS / POC / SUPPORT TICKETS / OTHER + BUTTONS === */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {

      // 1) Support Ticket page – clone whole ticket-group into Open
      if (btn.closest('#support-ticket')) {
        const group = btn.closest('.ticket-group');
        if (!group || !openTicketsContainer) return;

        const newGroup = group.cloneNode(true);

        // Clear all text inputs and textareas
        newGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
          el.value = '';
        });

        // Reset selects to "Open" (default)
        newGroup.querySelectorAll('select').forEach(sel => {
          sel.value = 'Open';
        });

        // Remove the add button from the NEW ticket
        const newAddBtn = newGroup.querySelector('.add-row');
        if (newAddBtn) {
          newAddBtn.remove();
        }

        // Make the Support Ticket Number row in cloned tickets behave as a normal row
        const firstRow = newGroup.querySelector('.checklist-row.integrated-plus');
        if (firstRow) {
          firstRow.classList.remove('integrated-plus');
        }

        openTicketsContainer.appendChild(newGroup);
        attachTicketStatusHandlers(newGroup);
        return;
      }

      // 2) Additional POC – clone entire contact card (Name/Cell/Email)
      const pocCard = btn.closest('.poc-card');
      const pocContainer = document.getElementById('additionalPocContainer');
      if (pocCard && pocContainer && btn.closest('#dealership-info')) {
        const newCard = pocCard.cloneNode(true);

        // clear values
        newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
          el.value = '';
        });

        // Remove + from cloned POC card (only original card keeps the add button)
        const pocAddBtn = newCard.querySelector('.add-row');
        if (pocAddBtn) {
          pocAddBtn.remove();
        }

        // Make POC rows normal (full-width rounded textboxes)
        newCard.querySelectorAll('.checklist-row.integrated-plus').forEach(row => {
          row.classList.remove('integrated-plus');
        });

        pocContainer.appendChild(newCard);
        return;
      }

      // 3) Default behavior for other integrated-plus buttons:
      //    clone the associated text input INSIDE THE SAME ROW and stack under the existing one.
      const row = btn.closest('.checklist-row');
      if (!row) return;

      let input = btn.previousElementSibling;
      if (!input || input.tagName !== 'INPUT') {
        input = row.querySelector('input[type="text"], input[type="number"], input[type="email"]');
      }
      if (!input) return;

      const clone = input.cloneNode(true);
      clone.value = '';
      clone.classList.add('stacked-input');

      // Insert directly before the button, so it appears under the current textbox
      row.insertBefore(clone, btn);
    });
  });

  /* === CLEAR PAGE BUTTONS (per-page reset) === */
  document.querySelectorAll('.clear-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.closest('.page-section');
      if (!page) return;

      const confirmReset = window.confirm(
        'This will clear all fields on this page. This cannot be undone. Continue?'
      );
      if (!confirmReset) return;

      // Clear all inputs
      page.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      // Clear all selects
      page.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      // Clear all textareas
      page.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });

      // Special handling for Support Ticket page:
      // keep only the first ticket-group in Open, empty others
      if (page.id === 'support-ticket') {
        if (openTicketsContainer) {
          const groups = openTicketsContainer.querySelectorAll('.ticket-group');
          groups.forEach((group, index) => {
            if (index > 0) group.remove();
          });

          // Reset first group's fields & status
          const first = openTicketsContainer.querySelector('.ticket-group');
          if (first) {
            first.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            first.querySelectorAll('select').forEach(sel => {
              sel.value = 'Open';
            });
          }
        }
        if (tierTwoTicketsContainer) {
          tierTwoTicketsContainer.innerHTML = '';
        }
        if (closedResolvedTicketsContainer) {
          closedResolvedTicketsContainer.innerHTML = '';
        }
        if (closedUnsupportedTicketsContainer) {
          closedUnsupportedTicketsContainer.innerHTML = '';
        }
      }
    });
  });

  /* === CLEAR ALL BUTTON (global reset with double confirmation) === */
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const first = window.confirm(
        'This will clear ALL fields on ALL pages of this checklist. This cannot be undone. Continue?'
      );
      if (!first) return;

      const second = window.confirm(
        'Last check: Are you sure you want to erase EVERYTHING on all pages?'
      );
      if (!second) return;

      // 1) Clear every input
      document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      // 2) Clear every select
      document.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      // 3) Clear every textarea
      document.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });

      // 4) Support ticket groups – keep only first ticket-group in Open, none elsewhere
      if (openTicketsContainer) {
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index > 0) group.remove();
        });

        const firstGroup = openTicketsContainer.querySelector('.ticket-group');
        if (firstGroup) {
          firstGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
            el.value = '';
          });
          firstGroup.querySelectorAll('select').forEach(sel => {
            sel.value = 'Open';
          });
        }
      }
      if (tierTwoTicketsContainer) {
        tierTwoTicketsContainer.innerHTML = '';
      }
      if (closedResolvedTicketsContainer) {
        closedResolvedTicketsContainer.innerHTML = '';
      }
      if (closedUnsupportedTicketsContainer) {
        closedUnsupportedTicketsContainer.innerHTML = '';
      }

      // NOTE: We are NOT removing extra rows in training tables –
      // we only clear their content to avoid breaking structure.
    });
  }

  /* === SAVE AS PDF (Training Summary Page) === */
  const saveBtn = document.getElementById('savePDF');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const pages = document.querySelectorAll('.page-section');

      const marginX = 30, marginY = 30, maxWidth = 535;
      let first = true;

      for (const page of pages) {
        if (!first) doc.addPage();
        first = false;

        const title = page.querySelector('h1')?.innerText || 'Section';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, marginX, marginY);

        // Simplified page content (plain text export)
        const text = page.innerText.replace(/\s+\n/g, '\n').trim();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, marginX, marginY + 24);
      }

      doc.save('Training_Summary.pdf');
    });
  }
});
