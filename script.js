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
     SUPPORT TICKETS – containers, routing, counts
     =================================================== */

  const supportSection = document.getElementById('support-ticket');

  const openTicketsContainer    = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');

  // Be flexible for Closed - Resolved container ID
  const closedResolvedContainer =
    document.getElementById('closedResolvedTicketsContainer') ||
    document.getElementById('closedTicketsContainer');

  // Be flexible for Closed – Feature Not Supported container ID
  const closedFeatureContainer  =
    document.getElementById('closedFeatureNotSupportedTicketsContainer') ||
    document.getElementById('closedFeatureTicketsContainer');

  const openTicketsHeader    = document.getElementById('openTicketsHeader');
  const tierTwoTicketsHeader = document.getElementById('tierTwoTicketsHeader');
  const closedResolvedHeader =
    document.getElementById('closedResolvedTicketsHeader') ||
    document.getElementById('closedTicketsHeader');
  const closedFeatureHeader  =
    document.getElementById('closedFeatureHeader') ||
    document.getElementById('closedFeatureNotSupportedHeader');

  const ticketBuckets = [
    { key: 'open',   container: openTicketsContainer,   header: openTicketsHeader },
    { key: 'tier2',  container: tierTwoTicketsContainer, header: tierTwoTicketsHeader },
    { key: 'closed_resolved', container: closedResolvedContainer, header: closedResolvedHeader },
    { key: 'closed_feature_not_supported', container: closedFeatureContainer, header: closedFeatureHeader }
  ];

  function initTicketHeaderBaseText() {
    ticketBuckets.forEach(bucket => {
      if (!bucket.header) return;
      if (!bucket.header.dataset.baseText) {
        const txt = bucket.header.textContent.replace(/\(\d+\)$/, '').trim();
        bucket.header.dataset.baseText = txt;
      }
    });
  }

  function updateTicketCounts() {
    ticketBuckets.forEach(bucket => {
      if (!bucket.container || !bucket.header) return;
      const base = bucket.header.dataset.baseText ||
        bucket.header.textContent.replace(/\(\d+\)$/, '').trim();
      bucket.header.dataset.baseText = base;

      const count = bucket.container.querySelectorAll('.ticket-group').length;
      bucket.header.textContent = count ? `${base} (${count})` : base;
    });
  }

  // Normalize dropdown value/text into a status key
  function getStatusKey(select) {
    const raw = (select.value || select.options[select.selectedIndex]?.textContent || "")
      .toLowerCase()
      .trim();

    // Open
    if (raw.startsWith('open')) return 'open';

    // Tier Two
    if (raw.includes('tier')) return 'tier2';

    // Closed - Resolved
    if (raw.includes('resolved')) return 'closed_resolved';

    // Closed – Feature Not Supported (dash/en dash doesn’t matter, we just look for "feature")
    if (raw.includes('feature')) return 'closed_feature_not_supported';

    // Fallback
    return 'open';
  }

  // Move a ticket-group DOM node to the correct container
  function routeTicketGroup(group, statusKey) {
    if (!group) return;

    let targetContainer = null;

    if (statusKey === 'open') {
      targetContainer = openTicketsContainer;
    } else if (statusKey === 'tier2') {
      targetContainer = tierTwoTicketsContainer;
    } else if (statusKey === 'closed_resolved') {
      targetContainer = closedResolvedContainer;
    } else if (statusKey === 'closed_feature_not_supported') {
      targetContainer = closedFeatureContainer;
    }

    // If something is missing, default to Open so the ticket never disappears
    if (!targetContainer) targetContainer = openTicketsContainer;
    if (!targetContainer) return;

    targetContainer.appendChild(group);
    updateTicketCounts();
  }

  // Attach change listeners to all ticket status dropdowns in a scope
  function attachTicketStatusHandlers(scope) {
    if (!scope) return;

    const selects = scope.querySelectorAll('.ticket-status-select');
    selects.forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      // Ensure default is Open
      if (!select.value) {
        const openOption = Array.from(select.options).find(opt =>
          opt.textContent.toLowerCase().startsWith('open')
        );
        if (openOption) {
          select.value = openOption.value || openOption.textContent;
        }
      }

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        if (!group) return;

        const statusKey = getStatusKey(select);

        // If this is the template card in Open and status is changing away from "Open":
        const inOpen = openTicketsContainer && openTicketsContainer.contains(group);
        if (inOpen && statusKey !== 'open') {
          const integratedRow = group.querySelector('.checklist-row.integrated-plus');
          const hasPlus = integratedRow && integratedRow.querySelector('.add-row');

          if (hasPlus) {
            // 1) Create a fresh blank template in Open
            const newTemplate = group.cloneNode(true);

            newTemplate.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            newTemplate.querySelectorAll('select').forEach(sel => {
              if (sel.classList.contains('ticket-status-select')) {
                const openOption = Array.from(sel.options).find(opt =>
                  opt.textContent.toLowerCase().startsWith('open')
                );
                if (openOption) {
                  sel.value = openOption.value || openOption.textContent;
                } else {
                  sel.selectedIndex = 0;
                }
              } else {
                sel.selectedIndex = 0;
              }
            });

            if (openTicketsContainer.firstChild) {
              openTicketsContainer.insertBefore(newTemplate, openTicketsContainer.firstChild);
            } else {
              openTicketsContainer.appendChild(newTemplate);
            }
            attachTicketStatusHandlers(newTemplate);

            // 2) Convert the current card to a normal one (no plus)
            if (integratedRow) {
              integratedRow.classList.remove('integrated-plus');
              const plusBtn = integratedRow.querySelector('.add-row');
              if (plusBtn) plusBtn.remove();
            }
          }
        }

        // Move card to correct section (Open / Tier Two / Closed - Resolved / Closed – Feature Not Supported)
        routeTicketGroup(group, statusKey);
      });
    });
  }

  if (supportSection) {
    initTicketHeaderBaseText();
    attachTicketStatusHandlers(supportSection);
    updateTicketCounts();
  }

  /* ===================================================
     GENERIC + BUTTON HANDLER (non-support sections)
     =================================================== */

  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // Support tickets: only handle "+" in the Open template card here
      if (btn.closest('#support-ticket')) {
        const group = btn.closest('.ticket-group');
        if (group && openTicketsContainer && openTicketsContainer.contains(group)) {
          const newGroup = group.cloneNode(true);

          newGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
            el.value = '';
          });
          newGroup.querySelectorAll('select').forEach(sel => {
            if (sel.classList.contains('ticket-status-select')) {
              const openOption = Array.from(sel.options).find(opt =>
                opt.textContent.toLowerCase().startsWith('open')
              );
              if (openOption) {
                sel.value = openOption.value || openOption.textContent;
              } else {
                sel.selectedIndex = 0;
              }
            } else {
              sel.selectedIndex = 0;
            }
          });

          const integratedRow = newGroup.querySelector('.checklist-row.integrated-plus');
          if (integratedRow) {
            integratedRow.classList.remove('integrated-plus');
            const plus = integratedRow.querySelector('.add-row');
            if (plus) plus.remove();
          }

          openTicketsContainer.appendChild(newGroup);
          attachTicketStatusHandlers(newGroup);
          updateTicketCounts();
          return;
        }
      }

      // Non-support integrated-plus behavior
      const row = btn.closest('.checklist-row');
      const block = btn.closest('.section-block');
      if (!row || !block) return;

      const clone = row.cloneNode(true);
      clone.classList.remove('integrated-plus');

      clone.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="date"]').forEach(el => {
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

      if (page.id === 'support-ticket' && openTicketsContainer) {
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index === 0) {
            group.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            group.querySelectorAll('select').forEach(sel => {
              if (sel.classList.contains('ticket-status-select')) {
                const openOption = Array.from(sel.options).find(opt =>
                  opt.textContent.toLowerCase().startsWith('open')
                );
                if (openOption) {
                  sel.value = openOption.value || openOption.textContent;
                } else {
                  sel.selectedIndex = 0;
                }
              } else {
                sel.selectedIndex = 0;
              }
            });
          } else {
            group.remove();
          }
        });

        if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
        if (closedResolvedContainer) closedResolvedContainer.innerHTML = '';
        if (closedFeatureContainer) closedFeatureContainer.innerHTML = '';

        updateTicketCounts();
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

      if (openTicketsContainer) {
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index === 0) {
            group.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            group.querySelectorAll('select').forEach(sel => {
              if (sel.classList.contains('ticket-status-select')) {
                const openOption = Array.from(sel.options).find(opt =>
                  opt.textContent.toLowerCase().startsWith('open')
                );
                if (openOption) {
                  sel.value = openOption.value || openOption.textContent;
                } else {
                  sel.selectedIndex = 0;
                }
              } else {
                sel.selectedIndex = 0;
              }
            });
          } else {
            group.remove();
          }
        });
      }
      if (tierTwoTicketsContainer) tierTwoTicketsContainer.innerHTML = '';
      if (closedResolvedContainer) closedResolvedContainer.innerHTML = '';
      if (closedFeatureContainer) closedFeatureContainer.innerHTML = '';

      updateTicketCounts();
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
