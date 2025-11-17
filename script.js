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
        if (el.type === 'checkbox') {
          el.checked = false;
        } else {
          el.value = '';
        }
      });

      tbody.appendChild(newRow);
    });
  });

  /* === SUPPORT TICKET PAGE – GROUP SETUP + AUTO MOVE OPEN/CLOSED === */
  const supportSection = document.getElementById('support-ticket');
  if (supportSection) {
    // (Safety) If a block ever had no .ticket-group, wrap its contents once.
    const ticketBlocks = supportSection.querySelectorAll('.section-block');
    ticketBlocks.forEach(block => {
      if (block.querySelector('.ticket-group')) return;
      const children = Array.from(block.children).filter(el => !el.matches('h2'));
      if (!children.length) return;

      const groupWrapper = document.createElement('div');
      groupWrapper.className = 'ticket-group';
      children.forEach(el => groupWrapper.appendChild(el));
      block.appendChild(groupWrapper);
    });

    // Move ticket between Open / Closed when status changes
    supportSection.addEventListener('change', (e) => {
      const select = e.target;
      if (!select || select.tagName !== 'SELECT') return;

      const row = select.closest('.checklist-row');
      const label = row ? row.querySelector('label') : null;
      if (!label) return;

      // Only react to the "Ticket Status" dropdown
      if (!label.textContent.trim().startsWith('Ticket Status')) return;

      const value = select.value;
      const group = select.closest('.ticket-group');
      if (!group) return;

      const blocks = supportSection.querySelectorAll('.section-block');
      const openBlock = blocks[0];
      const closedBlock = blocks[1];

      // Move to Closed section if status is Closed
      if (value === 'Closed') {
        if (closedBlock && !closedBlock.contains(group)) {
          closedBlock.appendChild(group);
        }
      } else {
        // Any other status: make sure it's in Open section
        if (openBlock && !openBlock.contains(group)) {
          openBlock.appendChild(group);
        }
      }
    });
  }

  /* === INTEGRATED PLUS BUTTONS: TRAINERS / POC / DEAD SPOTS / CHAMPIONS, ETC. === */
  document.querySelectorAll('.section-block .add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      // Special behavior on Support Ticket page: clone FULL ticket group
      if (btn.closest('#support-ticket')) {
        const block = btn.closest('.section-block');
        if (!block) return;
        const group = btn.closest('.ticket-group');
        if (!group) return;

        const newGroup = group.cloneNode(true);

        // Clear all text inputs, textareas, and selects in the new group
        newGroup.querySelectorAll('input[type="text"], textarea, select').forEach(el => {
          if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
          } else {
            el.value = '';
          }
        });

        block.appendChild(newGroup);
        return;
      }

      // Default behavior for all other + buttons:
      // clone the associated text input inside the SAME checklist-row
      const row = btn.closest('.checklist-row');
      const container = row || btn.closest('.section-block');
      if (!container) return;

      // Prefer the input immediately before the button
      let input = btn.previousElementSibling;
      if (!input || input.tagName !== 'INPUT' || input.type !== 'text') {
        input = container.querySelector('input[type="text"]');
      }
      if (!input) return;

      const clone = input.cloneNode(true);
      clone.value = '';
      clone.style.marginTop = '6px';

      if (row) {
        // Add the new input inside the same row, just before the +
        row.insertBefore(clone, btn);
      } else {
        // Fallback: insert in the section-block
        container.insertBefore(clone, btn);
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

      // Special handling for Support Ticket page:
      // keep only the first .ticket-group in each section-block
      if (page.id === 'support-ticket') {
        const blocks = page.querySelectorAll('.section-block');
        blocks.forEach(block => {
          const groups = block.querySelectorAll('.ticket-group');
          groups.forEach((group, index) => {
            if (index > 0) {
              group.remove();
            }
          });
        });
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

      // 4) Support ticket groups – keep only the first ticket-group per block
      const supportPage = document.getElementById('support-ticket');
      if (supportPage) {
        const blocks = supportPage.querySelectorAll('.section-block');
        blocks.forEach(block => {
          const groups = block.querySelectorAll('.ticket-group');
          groups.forEach((group, index) => {
            if (index > 0) group.remove();
          });
        });
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
