/* --------------- Training TABLES --------------- */

.section { 
  margin-bottom: 40px; 
}

/* Table Card – no side padding so header touches edges */
.table-container {
  width: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  box-shadow: var(--shadow);
  margin-bottom: 32px;
  padding: 0;
  box-sizing: border-box;
}

.scroll-wrapper {
  display: block;
  width: 100%;
  overflow-x: auto;
  background: #fff;
  padding-bottom: 4px;
}

/* Table */
.training-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 1000px;
}
.training-table th,
.training-table td {
  white-space: nowrap;
  text-align: center;
  font-size: 13px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 6px 6px;
}

/* Sticky header — LIGHT ORANGE */
.training-table thead th {
  background: var(--light-orange);
  color: #fff;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 3;
}

/* Smaller white text for notes inside header cells */
.training-table thead th .muted-note {
  font-size: 0.8em;
  color: #fff;
}

/* Sticky first column – for checklists (not Opcodes; overridden later) */
.training-table th:first-child,
.training-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 4;
  width: 240px;
  min-width: 240px;
}
.training-table thead th:first-child { 
  text-align: center;
}
.training-table td:first-child {
  background: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 8px;
  padding-right: 8px;
}
.training-table td:first-child input[type="checkbox"] {
  flex-shrink: 0;
  transform: scale(1.05);
  margin-right: 8px;
}
.training-table td:first-child input[type="text"] {
  width: 95%;
  padding: 7px 8px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #f7f7f7;
  text-align: left;
}

/* Column widths (generic second col) */
.training-table th:nth-child(2),
.training-table td:nth-child(2) {
  width: 185px;
  min-width: 185px;
}

/* Inputs/Selects inside table cells */
.training-table input[type="text"],
.training-table select {
  width: 100%;
  min-width: 130px;
  box-sizing: border-box;
  padding: 5px 5px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #f7f7f7;
  font-size: 13px;
  text-align: center;
}
.training-table input[type="text"]:focus,
.training-table select:focus {
  border-color: var(--orange);
  box-shadow: 0 0 4px rgba(243,111,33,0.4);
  outline: none;
  background: #fff9f5;
}

/* Alternating rows */
.training-table tr:nth-child(odd) { 
  background: #fff; 
}
.training-table tr:nth-child(even) { 
  background: #fafafa; 
}

/* Table footer + "+" button  */
.table-footer {
  width: 100%;
  background: #f5f5f5;
  border-top: 1px solid var(--border);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;   /* + button on the LEFT */
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
  box-sizing: border-box;
}
.table-footer .add-row {
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: .2s;
  box-shadow: 0 1px 3px rgba(243,111,33,0.25);
}
.table-footer .add-row:hover {
  background: #ff8b42;
  transform: scale(1.05);
}

/* --------------- OPCODES PAGE --------------- */

/* Turn off sticky/flex first column only for Opcodes section */
#opcodes-pricing .training-table th:first-child,
#opcodes-pricing .training-table td:first-child {
  position: static;
  left: auto;
  z-index: 1;
  width: 60px;
  min-width: 60px;
}
#opcodes-pricing .training-table td:first-child {
  display: table-cell;
  padding: 6px 6px;
  background: inherit;
}

/* Column sizing based on new headers:
   1 Updated
   2 Opcode
   3 Opcode Duration
   4 Labor Price
   5 Flat Rate Hours
   6 Parts Price
   7 Pay Type
   8 Order #
   9 Add to Online Scheduler
   10 Add to Dealer App Scheduler
   11 Add to Mobile Service
   12 Add to ServiceCart
*/

/* Opcode, Duration, Labor, Flat Rate, Pay Type, Order # moderate width */
#opcodes-pricing .training-table th:nth-child(2),
#opcodes-pricing .training-table td:nth-child(2),
#opcodes-pricing .training-table th:nth-child(3),
#opcodes-pricing .training-table td:nth-child(3),
#opcodes-pricing .training-table th:nth-child(4),
#opcodes-pricing .training-table td:nth-child(4),
#opcodes-pricing .training-table th:nth-child(5),
#opcodes-pricing .training-table td:nth-child(5),
#opcodes-pricing .training-table th:nth-child(7),
#opcodes-pricing .training-table td:nth-child(7),
#opcodes-pricing .training-table th:nth-child(8),
#opcodes-pricing .training-table td:nth-child(8) {
  width: 110px;
  min-width: 100px;
}

/* Parts Price column – smaller so fields fully fit */
#opcodes-pricing .training-table th:nth-child(6),
#opcodes-pricing .training-table td:nth-child(6) {
  width: 80px;
  max-width: 80px;
  min-width: 60px;
}
#opcodes-pricing .training-table td:nth-child(6) input[type="text"] {
  min-width: 0;
}

/* Checkboxes for last 4 columns */
#opcodes-pricing .training-table th:nth-child(9),
#opcodes-pricing .training-table td:nth-child(9),
#opcodes-pricing .training-table th:nth-child(10),
#opcodes-pricing .training-table td:nth-child(10),
#opcodes-pricing .training-table th:nth-child(11),
#opcodes-pricing .training-table td:nth-child(11),
#opcodes-pricing .training-table th:nth-child(12),
#opcodes-pricing .training-table td:nth-child(12) {
  width: 90px;
  min-width: 80px;
}
#opcodes-pricing .training-table td:nth-child(9) input[type="checkbox"],
#opcodes-pricing .training-table td:nth-child(10) input[type="checkbox"],
#opcodes-pricing .training-table td:nth-child(11) input[type="checkbox"],
#opcodes-pricing .training-table td:nth-child(12) input[type="checkbox"] {
  transform: scale(1.1);
}

/* --------------- FLOATING PDF BUTTON (summary page) --------------- */
#training-summary .floating-btn {
  background: var(--orange);
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.18);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  position: absolute;
  top: 18px;
  right: 24px;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
#training-summary .floating-btn:hover {
  background: #ff8b42;
}

/* --------------- Muted note --------------- */
.muted-note {
  font-size: 0.9em;
  color: #666;
  font-style: italic !important;
}

/* --------------- RESPONSIVE --------------- */
@media (max-width: 900px) {
  #sidebar { width: 190px; }
  main { margin-left: 190px; padding: 20px; }
}
@media (max-width: 600px) {
  #sidebar { display: none; }
  main { margin-left: 0; padding: 16px; }
}
