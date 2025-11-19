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
     SUPPORT TICKETS – containers & header counters
     =================================================== */
  const supportSection = document.getElementById('support-ticket');

  const openTicketsContainer   = document.getElementById('openTicketsContainer');
  const tierTwoTicketsContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer  = document.getElementById('closedFeatureNotSupportedTicketsContainer');

  const openTicketsHeader   = document.getElementById('openTicketsHeader');
  const tierTwoTicketsHeader = document.getElementById('tierTwoTicketsHeader');
  const closedResolvedHeader = document.getElementById('closedResolvedTicketsHeader');
  const closedFeatureHeader  = document.getElementById('closedFeatureHeader');

  const ticketBuckets = [
    { container: openTicketsContainer,   header: openTicketsHeader },
    { container: tierTwoTicketsContainer, header: tierTwoTicketsHeader },
    { container: closedResolvedContainer, header: closedResolvedHeader },
    { container: closedFeatureContainer,  header: closedFeatureHeader }
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

  /* Normalize status into a key */
  function getStatusKey(select) {
    const raw = (select.value || select.options[select.selectedIndex]?.textContent || "")
      .toLowerCase()
      .trim();

    if (raw.startsWith('open')) return 'open';
    if (raw.includes('tier')) return 'tier2';
    if (raw.includes('resolved')) return 'closed_resolved';
    if (raw.includes('feature')) return 'closed_feature_not_supported';

    return 'open';
  }

  /* Route ticket-group to container based on key */
  function routeTicketGroup(group, statusKey) {
    if (!group) return;

    switch (statusKey) {
      case 'open':
        if (openTicketsContainer) openTicketsContainer.appendChild(group);
        break;
      case 'tier2':
        if (tierTwoTicketsContainer) tierTwoTicketsContainer.appendChild(group);
        break;
      case 'closed_resolved':
        if (closedResolvedContainer) closedResolvedContainer.appendChild(group);
        break;
      case 'closed_feature_not_supported':
        if (closedFeatureContainer) closedFeatureContainer.appendChild(group);
        break;
      default:
        if (openTicketsContainer) openTicketsContainer.appendChild(group);
        break;
    }

    updateTicketCounts();
  }

  /* Attach ticket status handlers to selects (existing + newly cloned) */
  function attachTicketStatusHandlers(scope) {
    if (!scope) return;

    const selects = scope.querySelectorAll('.ticket-status-select');
    selects.forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      // Default to Open if blank
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

        // If this is the primary "template" open card (with + button) and
        // status changes away from "open", keep a fresh template behind.
        const isInOpen = openTicketsContainer && openTicketsContainer.contains(group);
        if (isInOpen && statusKey !== 'open') {
          const integratedRow = group.querySelector('.checklist-row.integrated-plus');
          const hasPlus = integratedRow && integratedRow.querySelector('.add-row');

          if (hasPlus) {
            // 1) Create a new blank template in Open (with + button)
            const newTemplate = group.cloneNode(true);
            newTemplate.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            newTemplate.querySelectorAll('select').forEach(sel => {
              sel.selectedIndex = 0;
            });

            // ensure integrated-plus and + remain on template
            const templateRow = newTemplate.querySelector('.checklist-row.integrated-plus');
            if (templateRow) {
              // leave as is; .add-row should be present already
            }

            if (openTicketsContainer.firstChild) {
              openTicketsContainer.insertBefore(newTemplate, openTicketsContainer.firstChild);
            } else {
              openTicketsContainer.appendChild(newTemplate);
            }
            attachTicketStatusHandlers(newTemplate);

            // 2) Remove + and integrated-plus from the moving group
            if (integratedRow) {
              integratedRow.classList.remove('integrated-plus');
              const plusBtn = integratedRow.querySelector('.add-row');
              if (plusBtn) plusBtn.remove();
            }
          }
        }

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
     GENERIC + BUTTON HANDLER (for integrated-plus rows)
     =================================================== */

  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) Support Ticket page – CLONE entire ticket-group into Open
      if (btn.closest('#support-ticket')) {
        const group = btn.closest('.ticket-group');
        if (group && openTicketsContainer && openTicketsContainer.contains(group)) {
          const newGroup = group.cloneNode(true);

          // Clear all text inputs and textareas
          newGroup.querySelectorAll('input[type="text"], textarea').forEach(el => {
            el.value = '';
          });
          // Reset selects
          newGroup.querySelectorAll('select').forEach(sel => {
            sel.selectedIndex = 0;
          });

          // On cloned groups, remove integrated-plus + add-row from Support Ticket #
          const ticketRow = newGroup.querySelector('.checklist-row.integrated-plus');
          if (ticketRow) {
            ticketRow.classList.remove('integrated-plus');
            const plus = ticketRow.querySelector('.add-row');
            if (plus) plus.remove();
          }

          openTicketsContainer.appendChild(newGroup);
          attachTicketStatusHandlers(newGroup);
          updateTicketCounts();
          return;
        }
      }

      // 2) Additional POC – clone entire contact card (Name/Cell/Email)
      const pocCard = btn.closest('.poc-card');
      const pocContainer = document.getElementById('additionalPocContainer');
      if (pocCard && pocContainer && btn.closest('#dealership-info')) {
        const newCard = pocCard.cloneNode(true);

        newCard.querySelectorAll('input[type="text"], input[type="email"]').forEach(el => {
          el.value = '';
        });

        pocContainer.appendChild(newCard);
        return;
      }

      // 3) Default behavior for other integrated-plus buttons:
      //    Clone the whole checklist-row and insert BELOW the current row,
      //    remove + button and integrated-plus class so it becomes a
      //    normal full-width rounded text box.
      const row = btn.closest('.checklist-row');
      const block = btn.closest('.section-block');
      if (!row || !block) return;

      const clone = row.cloneNode(true);
      clone.classList.remove('integrated-plus');

      // Clear inputs/selects in the clone
      clone.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="date"]').forEach(el => {
        el.value = '';
      });
      clone.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 0;
      });

      // Remove inner add-row so clones are just fixed text boxes
      const innerAdd = clone.querySelector('.add-row');
      if (innerAdd) innerAdd.remove();

      // Insert the new row directly after the original so it appears under it
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

      // Special handling for Support Ticket page
      if (page.id === 'support-ticket' && openTicketsContainer) {
        // Keep only the first ticket-group in Open as the template
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index === 0) {
            group.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            group.querySelectorAll('select').forEach(sel => {
              sel.selectedIndex = 0;
            });

            // Ensure template keeps its integrated-plus + add-row
            const ticketRow = group.querySelector('.checklist-row');
            if (ticketRow) {
              ticketRow.classList.add('integrated-plus');
            }
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

      // 4) Support ticket groups – keep only the first template in Open
      if (openTicketsContainer) {
        const groups = openTicketsContainer.querySelectorAll('.ticket-group');
        groups.forEach((group, index) => {
          if (index === 0) {
            group.querySelectorAll('input[type="text"], textarea').forEach(el => {
              el.value = '';
            });
            group.querySelectorAll('select').forEach(sel => {
              sel.selectedIndex = 0;
            });

            const ticketRow = group.querySelector('.checklist-row');
            if (ticketRow) {
              ticketRow.classList.add('integrated-plus');
            }
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

  /* === SAVE AS PDF (Training Summary Page, simple text export) === */
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
