/* --------------- SUPPORT TICKETS (PAGE 7) --------------- */
/*
  NEW BEHAVIOR:
  - The template card in #openTicketsContainer with .ticket-group-template
    ALWAYS stays as the first card in "Open Support Tickets".
  - User fills out that card, chooses a Ticket Status, then clicks "+":
      → A new ticket card is created using those values
      → The new card is moved to the correct container based on status
      → The template card is cleared + Ticket Status reset to "Open"
  - The "Support Ticket Number" input on created cards is a normal,
    rounded textbox the same size as other text inputs.
*/

function initSupportTickets() {
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  if (!openContainer) return;

  const template = openContainer.querySelector('.ticket-group-template');
  if (!template) return;

  const addBtn = template.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      // Build containers object once
      const containers = {
        openContainer,
        tierTwoContainer,
        closedResolvedContainer,
        closedFeatureContainer
      };

      // Create a new card from the template (with current values)
      const newCard = createTicketFromTemplate(template);

      // Decide which container based on the template's current status value
      const statusSelect = template.querySelector('.ticket-status-select');
      const statusValue = statusSelect ? statusSelect.value : 'Open';

      const targetContainer = getTicketTargetContainer(statusValue, containers) || openContainer;
      targetContainer.appendChild(newCard);

      // Clear the template for the next ticket entry
      clearTicketTemplate(template);
    });
  }

  // IMPORTANT: we DO NOT wire status-change behavior on the template itself
  // so it never moves out of the Open container.
}

/* Helper: determine which container a ticket should go to based on status */
function getTicketTargetContainer(value, containers) {
  let targetContainer = containers.openContainer;

  if (value === 'Tier Two') {
    targetContainer = containers.tierTwoContainer;
  } else if (value === 'Closed - Resolved') {
    targetContainer = containers.closedResolvedContainer;
  } else if (value === 'Closed – Feature Not Supported') {
    targetContainer = containers.closedFeatureContainer;
  }

  return targetContainer || containers.openContainer;
}

/* Helper: clear the template inputs + reset status to Open */
function clearTicketTemplate(card) {
  const fields = card.querySelectorAll('input, select, textarea');

  fields.forEach((el) => {
    if (el.tagName === 'SELECT') {
      if (el.classList.contains('ticket-status-select')) {
        // Status always resets to Open on the template
        el.value = 'Open';
      } else {
        el.selectedIndex = 0;
      }
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });
}

/*
  Create a NEW ticket card from the template:

  - Clones the template with whatever the user typed/selected
  - Removes:
      • the template class
      • the data-template attribute
      • the "+" button
  - Converts the top integrated row into a NORMAL row so that
    the "Support Ticket Number" textbox is full-width and rounded
    like all other text boxes.
  - Wires up status-change behavior so the new card can move
    between sections when its status changes later.
*/
function createTicketFromTemplate(template) {
  const clone = template.cloneNode(true);

  // It's no longer the template
  clone.classList.remove('ticket-group-template');
  clone.removeAttribute('data-template');

  // Remove the add button on clones
  const addBtn = clone.querySelector('.add-ticket-btn');
  if (addBtn) {
    addBtn.remove();
  }

  // Make the top row a normal row (no integrated-plus styling)
  const topRow = clone.querySelector('.checklist-row.integrated-plus');
  if (topRow) {
    topRow.classList.remove('integrated-plus');
  }

  // Look up containers for status wiring
  const openContainer = document.getElementById('openTicketsContainer');
  const tierTwoContainer = document.getElementById('tierTwoTicketsContainer');
  const closedResolvedContainer = document.getElementById('closedResolvedTicketsContainer');
  const closedFeatureContainer = document.getElementById('closedFeatureTicketsContainer');

  wireTicketStatus(clone, {
    openContainer,
    tierTwoContainer,
    closedResolvedContainer,
    closedFeatureContainer
  });

  return clone;
}

/*
  When the status dropdown on a NON-template ticket card changes,
  move that card to the appropriate section container.
*/
function wireTicketStatus(card, containers) {
  const select = card.querySelector('.ticket-status-select');
  if (!select) return;

  select.addEventListener('change', () => {
    const value = select.value;
    const targetContainer = getTicketTargetContainer(value, containers);

    if (targetContainer && targetContainer !== card.parentElement) {
      targetContainer.appendChild(card);
    }
  });
}
