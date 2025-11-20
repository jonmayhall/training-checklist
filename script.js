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

      nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      sections.forEach(sec => sec.classList.remove('active'));
      target.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* === TRAINING TABLE ADD ROW HANDLER === */
  document.querySelectorAll('.table-footer .add-row').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.closest('.section');
      if (!section) return;
      const table = section.querySelector('table.training-table');
      if (!table) return;

      const tbody = table.tBodies[0];
      if (!tbody || !tbody.rows.length) return;

      const rowToClone = tbody.rows[tbody.rows.length - 1];
      const newRow = rowToClone.cloneNode(true);

      newRow.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      tbody.appendChild(newRow);
    });
  });

  /* ===================================================
     SUPPORT TICKETS – INDEX-BASED ROUTING
     =================================================== */

  const supportSection = document.getElementById('support-ticket');

  // Containers – MUST match your HTML IDs
  const openTicketsContainer = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedTicketsContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureNotSupportedTicketsContainer =
    document.getElementById('closedFeatureTicketsContainer');

  // Always treat option[0] as "Open"
  function setStatusToOpen(select) {
    select.selectedIndex = 0;
  }

  // Map dropdown index → logical status key
  // 0 = Open
  // 1 = Tier Two
  // 2 = Closed - Resolved
  // 3 = Closed – Feature Not Supported
  function getStatusKey(select) {
    const idx = select.selectedIndex;
    if (idx === 1) return 'tier2';
    if (idx === 2) return 'closed_resolved';
    if (idx === 3) return 'closed_feature_not_supported';
    return 'open';
  }

  // Move ticket group DOM into correct container
  function routeTicketGroup(group, statusKey) {
    let target = null;

    if (statusKey === 'open') {
      target = openTicketsContainer;
    } else if (statusKey === 'tier2') {
      target = tierTwoTicketsContainer;
    } else if (statusKey === 'closed_resolved') {
      target = closedResolvedTicketsContainer;
    } else if (statusKey === 'closed_feature_not_supported') {
      target = closedFeatureNotSupportedTicketsContainer;
    }

    // Fallback: never lose the card – go back to Open
    if (!target) target = openTicketsContainer;
    if (!target) return;

    target.appendChild(group);
  }

  // Attach change handlers for all ticket status dropdowns in a scope
  function attachTicketStatusHandlers(scope) {
    if (!scope) return;

    const selects = scope.querySelectorAll('.ticket-status-select');
    selects.forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      // Default to Open on first load
      if (select.selectedIndex < 0) setStatusToOpen(select);

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        if (!group) return;

        const statusKey = getStatusKey(select);

        // Is this the template card in Open (has integrated-plus + button)?
        const inOpen = openTicketsContainer && openTicketsContainer.contains(group);
        if (inOpen && statusKey !== 'open') {
          const integratedRow = group.querySelector('.checklist-row.integrated-plus');
          const hasPlus = integratedRow && integratedRow.querySelector('.add-row');

          if (hasPlus && openTicketsContainer) {
            // 1) Clone a fresh template and keep it in Open
            const newTemplate = group.cloneNode(true);

            newTemplate.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            newTemplate.querySelectorAll('select').forEach(sel => {
              if (sel.classList.contains('ticket-status-select')) {
                setStatusToOpen(sel);
              } else {
                sel.selectedIndex = 0;
              }
            });

            // Insert template at top of Open container
            if (openTicketsContainer.firstChild) {
              openTicketsContainer.insertBefore(newTemplate, openTicketsContainer.firstChild);
            } else {
              openTicketsContainer.appendChild(newTemplate);
            }

            // Template keeps integrated-plus and + button
            attachTicketStatusHandlers(newTemplate);

            // 2) Convert this moving card into a normal card: no integrated-plus, no +
            integratedRow.classList.remove('integrated-plus');
            const plusBtn = integratedRow.querySelector('.add-row');
            if (plusBtn) plusBtn.remove();
          }
        }

        // Finally, move card based on status
        routeTicketGroup(group, statusKey);
      });
    });
  }

  if (supportSection) {
    attachTicketStatusHandlers(supportSection);
  }

  /* ===================================================
     GENERIC + BUTTON HANDLER (non-support sections +
     support template clone in Open)
     =================================================== */

  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // SUPPORT TICKETS: "+" only meaningful for template card in Open
      if (btn.closest('#support-ticket')) {
        const group = btn.closest('.ticket-group');
        if (group && openTicketsContainer && openTicketsContainer.contains(group)) {
          const newGroup = group.cloneNode(true);

          newGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
            el.value = '';
          });
          newGroup.querySelectorAll('select').forEach(sel => {
            if (sel.classList.contains('ticket-status-select')) {
              setStatusToOpen(sel);
            } else {
              sel.selectedIndex = 0;
            }
          });

          // New tickets: no integrated-plus, no +
          const integratedRow = newGroup.querySelector('.checklist-row.integrated-plus');
          if (integratedRow) {
            integratedRow.classList.remove('integrated-plus');
            const plus = integratedRow.querySelector('.add-row');
            if (plus) plus.remove();
          }

          openTicketsContainer.appendChild(newGroup);
          attachTicketStatusHandlers(newGroup);
          return;
        }
      }

      // NON-SUPPORT: default behavior for integrated-plus rows
      const row = btn.closest('.checklist-row');
      const block = btn.closest('.section-block');
      if (!row || !block) return;

      const clone = row.cloneNode(true);
      clone.classList.remove('integrated-plus');

      clone.querySelectorAll(
        'input[type="text"], input[type="number"], input[type="email"], input[type="date"]'
      ).forEach(el => {
        el.value = '';
      });
      clone.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 0;
      });

      const innerAdd = clone.querySelector('.add-row');
      if (innerAdd) innerAdd.remove();

      if (row.nextSibling) {
        block.insertBefore(clone, row.nextSibling);
      } else {
        block.appendChild(clone);
      }
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

      page.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      page.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      page.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });

      // Reset support ticket structure on this page
      if (page.id === 'support-ticket' && openTicketsContainer) {
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index === 0) {
            group.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            group.querySelectorAll('select').forEach(sel => {
              if (sel.classList.contains('ticket-status-select')) {
                setStatusToOpen(sel);
              } else {
                sel.selectedIndex = 0;
              }
            });
          } else {
            group.remove();
          }
        });

        if (tierTwoTicketsContainer) {
          tierTwoTicketsContainer.innerHTML = '';
        }
        if (closedResolvedTicketsContainer) {
          closedResolvedTicketsContainer.innerHTML = '';
        }
        if (closedFeatureNotSupportedTicketsContainer) {
          closedFeatureNotSupportedTicketsContainer.innerHTML = '';
        }
      }
    });
  });

  /* === CLEAR ALL BUTTON (global) === */
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

      document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });

      document.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
      });

      document.querySelectorAll('textarea').forEach(area => {
        area.value = '';
      });

      // Reset support tickets globally
      if (openTicketsContainer) {
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index === 0) {
            group.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            group.querySelectorAll('select').forEach(sel => {
              if (sel.classList.contains('ticket-status-select')) {
                setStatusToOpen(sel);
              } else {
                sel.selectedIndex = 0;
              }
            });
          } else {
            group.remove();
          }
        });
      }
      if (tierTwoTicketsContainer) {
        tierTwoTicketsContainer.innerHTML = '';
      }
      if (closedResolvedTicketsContainer) {
        closedResolvedTicketsContainer.innerHTML = '';
      }
      if (closedFeatureNotSupportedTicketsContainer) {
        closedFeatureNotSupportedTicketsContainer.innerHTML = '';
      }
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
