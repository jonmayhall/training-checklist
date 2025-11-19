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
     SUPPORT TICKETS – header-based mapping, routing, counts
     =================================================== */

  const supportSection = document.getElementById('support-ticket');

  // ticketSections[key] = { block: .section-block, header: <h2>, baseTitle: string }
  let ticketSections = {};

  function initTicketSections() {
    ticketSections = {};
    if (!supportSection) return;

    supportSection.querySelectorAll('.section-block').forEach(block => {
      const header = block.querySelector('h2');
      if (!header) return;
      const txt = header.textContent.toLowerCase();

      let key = null;
      if (txt.includes('open support tickets')) {
        key = 'open';
      } else if (txt.includes('tier two support tickets')) {
        key = 'tier2';
      } else if (
        txt.includes('closed - resolved support tickets') ||
        txt.includes('closed – resolved support tickets')
      ) {
        key = 'closed_resolved';
      } else if (txt.includes('feature not supported')) {
        key = 'closed_feature_not_supported';
      }

      if (!key) return;

      ticketSections[key] = {
        block,
        header,
        baseTitle: header.textContent.replace(/\(\d+\)$/, '').trim()
      };
    });
  }

  function updateTicketCounts() {
    Object.values(ticketSections).forEach(sec => {
      const count = sec.block.querySelectorAll('.ticket-group').length;
      sec.header.textContent = count ? `${sec.baseTitle} (${count})` : sec.baseTitle;
    });
  }

  // Normalize dropdown value/text into key
  function getStatusKey(select) {
    const raw = (select.value || select.options[select.selectedIndex]?.textContent || '')
      .toLowerCase()
      .trim();

    if (raw.startsWith('open')) return 'open';
    if (raw.includes('tier')) return 'tier2';
    if (raw.includes('resolved')) return 'closed_resolved';
    if (raw.includes('feature')) return 'closed_feature_not_supported';

    return 'open';
  }

  // Move ticket-group into correct section block
  function routeTicketGroup(group, statusKey) {
    const target = ticketSections[statusKey] || ticketSections['open'];
    if (!target) return;
    target.block.appendChild(group);
    updateTicketCounts();
  }

  function setStatusToOpen(select) {
    const openOption = Array.from(select.options).find(opt =>
      opt.textContent.toLowerCase().startsWith('open')
    );
    if (openOption) {
      select.value = openOption.value || openOption.textContent;
    } else {
      select.selectedIndex = 0;
    }
  }

  // Attach change listeners to all ticket status dropdowns in a scope
  function attachTicketStatusHandlers(scope) {
    if (!scope) return;

    const selects = scope.querySelectorAll('.ticket-status-select');
    selects.forEach(select => {
      if (select.dataset.boundStatus === '1') return;
      select.dataset.boundStatus = '1';

      // make sure default is Open
      if (!select.value) {
        setStatusToOpen(select);
      }

      select.addEventListener('change', () => {
        const group = select.closest('.ticket-group');
        if (!group) return;

        const statusKey = getStatusKey(select);
        const openSec = ticketSections['open'];
        const inOpen = openSec && openSec.block.contains(group);

        // If this is the template open card and the user changes away from Open:
        if (inOpen && statusKey !== 'open' && openSec) {
          const integratedRow = group.querySelector('.checklist-row.integrated-plus');
          const hasPlus = integratedRow && integratedRow.querySelector('.add-row');

          if (hasPlus) {
            // 1) create a fresh blank template at the top of Open
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

            const firstTicket = openSec.block.querySelector('.ticket-group');
            if (firstTicket) {
              openSec.block.insertBefore(newTemplate, firstTicket);
            } else {
              openSec.block.appendChild(newTemplate);
            }

            attachTicketStatusHandlers(newTemplate);

            // 2) convert this moving card to normal (no integrated-plus, no + button)
            if (integratedRow) {
              integratedRow.classList.remove('integrated-plus');
              const plusBtn = integratedRow.querySelector('.add-row');
              if (plusBtn) plusBtn.remove();
            }
          }
        }

        // Move card to correct section (Open / Tier Two / Closed-Resolved / Closed–Feature Not Supported)
        routeTicketGroup(group, statusKey);
      });
    });
  }

  if (supportSection) {
    initTicketSections();
    attachTicketStatusHandlers(supportSection);
    updateTicketCounts();
  }

  /* ===================================================
     GENERIC + BUTTON HANDLER (non-support sections +
     support template clone in Open)
     =================================================== */

  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // SUPPORT TICKET "+" – only for template in Open
      if (btn.closest('#support-ticket')) {
        const group = btn.closest('.ticket-group');
        const openSec = ticketSections['open'];

        if (group && openSec && openSec.block.contains(group)) {
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

          // cloned groups: no integrated-plus or +
          const integratedRow = newGroup.querySelector('.checklist-row.integrated-plus');
          if (integratedRow) {
            integratedRow.classList.remove('integrated-plus');
            const plus = integratedRow.querySelector('.add-row');
            if (plus) plus.remove();
          }

          openSec.block.appendChild(newGroup);
          attachTicketStatusHandlers(newGroup);
          updateTicketCounts();
          return;
        }
      }

      // NON-SUPPORT: default integrated-plus behavior
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

      // Special handling for Support Ticket page
      if (page.id === 'support-ticket') {
        initTicketSections();

        const openSec = ticketSections['open'];
        const tier2Sec = ticketSections['tier2'];
        const closedResSec = ticketSections['closed_resolved'];
        const closedFeatSec = ticketSections['closed_feature_not_supported'];

        if (openSec) {
          const groups = openSec.block.querySelectorAll('.ticket-group');
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

              // ensure template has integrated-plus row & + button untouched
            } else {
              group.remove();
            }
          });
        }

        if (tier2Sec) {
          tier2Sec.block.querySelectorAll('.ticket-group').forEach(g => g.remove());
        }
        if (closedResSec) {
          closedResSec.block.querySelectorAll('.ticket-group').forEach(g => g.remove());
        }
        if (closedFeatSec) {
          closedFeatSec.block.querySelectorAll('.ticket-group').forEach(g => g.remove());
        }

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

      if (supportSection) {
        initTicketSections();

        const openSec = ticketSections['open'];
        const tier2Sec = ticketSections['tier2'];
        const closedResSec = ticketSections['closed_resolved'];
        const closedFeatSec = ticketSections['closed_feature_not_supported'];

        if (openSec) {
          const groups = openSec.block.querySelectorAll('.ticket-group');
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
        if (tier2Sec) {
          tier2Sec.block.querySelectorAll('.ticket-group').forEach(g => g.remove());
        }
        if (closedResSec) {
          closedResSec.block.querySelectorAll('.ticket-group').forEach(g => g.remove());
        }
        if (closedFeatSec) {
          closedFeatSec.block.querySelectorAll('.ticket-group').forEach(g => g.remove());
        }

        updateTicketCounts();
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
