export type TableResizeSession =
  | {
      kind: "column";
      table: HTMLTableElement;
      editor: HTMLElement;
      columnIndex: number;
      start: number;
      initial: number;
    }
  | {
      kind: "row";
      table: HTMLTableElement;
      editor: HTMLElement;
      rowIndex: number;
      start: number;
      initial: number;
    };

const EDGE_SIZE = 6;
const MIN_COLUMN_WIDTH = 72;
const MIN_ROW_HEIGHT = 34;

function cellFromTarget(target: EventTarget | null): HTMLTableCellElement | null {
  const element = target instanceof HTMLElement ? target : null;
  return element?.closest("td,th") as HTMLTableCellElement | null;
}

function ensureColgroup(table: HTMLTableElement): HTMLTableColElement[] {
  let group = table.querySelector("colgroup");
  const columns = table.rows[0]?.cells.length ?? 0;

  if (!group) {
    group = document.createElement("colgroup");
    table.insertBefore(group, table.firstChild);
  }

  while (group.children.length < columns) {
    const col = document.createElement("col");
    const width = Math.max(MIN_COLUMN_WIDTH, Math.round((table.getBoundingClientRect().width || 720) / Math.max(1, columns)));
    col.style.width = width + "px";
    group.appendChild(col);
  }

  while (group.children.length > columns) {
    group.lastElementChild?.remove();
  }

  return Array.from(group.querySelectorAll("col"));
}

export function tableCellContext(target: EventTarget | null): {
  table: HTMLTableElement;
  cell: HTMLTableCellElement;
  rowIndex: number;
  columnIndex: number;
} | null {
  const cell = cellFromTarget(target);
  const table = cell?.closest("table.note-table") as HTMLTableElement | null;
  if (!cell || !table) return null;

  const row = cell.parentElement as HTMLTableRowElement | null;
  if (!row) return null;
  return {
    table,
    cell,
    rowIndex: row.rowIndex,
    columnIndex: cell.cellIndex
  };
}

export function tableResizeCursor(target: EventTarget | null, clientX: number, clientY: number): "" | "col-resize" | "row-resize" {
  const context = tableCellContext(target);
  if (!context) return "";
  const rect = context.cell.getBoundingClientRect();

  if (Math.abs(clientX - rect.right) <= EDGE_SIZE) return "col-resize";
  if (Math.abs(clientY - rect.bottom) <= EDGE_SIZE) return "row-resize";
  return "";
}

export function startTableResize(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
  editor: HTMLElement
): TableResizeSession | null {
  const context = tableCellContext(target);
  if (!context) return null;

  const rect = context.cell.getBoundingClientRect();

  if (Math.abs(clientX - rect.right) <= EDGE_SIZE) {
    const cols = ensureColgroup(context.table);
    const col = cols[context.columnIndex];
    return {
      kind: "column",
      table: context.table,
      editor,
      columnIndex: context.columnIndex,
      start: clientX,
      initial: col?.getBoundingClientRect().width || rect.width
    };
  }

  if (Math.abs(clientY - rect.bottom) <= EDGE_SIZE) {
    return {
      kind: "row",
      table: context.table,
      editor,
      rowIndex: context.rowIndex,
      start: clientY,
      initial: rect.height
    };
  }

  return null;
}

export function updateTableResize(session: TableResizeSession, clientX: number, clientY: number): void {
  if (session.kind === "column") {
    const cols = ensureColgroup(session.table);
    const col = cols[session.columnIndex];
    if (!col) return;
    const width = Math.max(MIN_COLUMN_WIDTH, Math.round(session.initial + clientX - session.start));
    col.style.width = width + "px";
    session.table.style.tableLayout = "fixed";
    session.table.style.width = "max-content";
    session.table.style.maxWidth = "100%";
    return;
  }

  const row = session.table.rows[session.rowIndex];
  if (!row) return;
  const height = Math.max(MIN_ROW_HEIGHT, Math.round(session.initial + clientY - session.start));
  Array.from(row.cells).forEach(cell => {
    cell.style.height = height + "px";
  });
}

export function addTableRow(table: HTMLTableElement, afterRowIndex: number): void {
  const columns = table.rows[0]?.cells.length ?? 1;
  const index = Math.min(table.rows.length, Math.max(0, afterRowIndex + 1));
  const row = table.insertRow(index);

  for (let column = 0; column < columns; column += 1) {
    const cell = row.insertCell();
    cell.innerHTML = "<p><br></p>";
  }

  table.dataset.rows = String(table.rows.length);
}

export function removeTableRow(table: HTMLTableElement, rowIndex: number): void {
  if (table.rows.length <= 1) return;
  table.deleteRow(Math.max(0, Math.min(rowIndex, table.rows.length - 1)));
  table.dataset.rows = String(table.rows.length);
}

export function addTableColumn(table: HTMLTableElement, afterColumnIndex: number): void {
  const insertAt = Math.max(0, afterColumnIndex + 1);
  Array.from(table.rows).forEach(row => {
    const cell = row.insertCell(Math.min(insertAt, row.cells.length));
    cell.innerHTML = "<p><br></p>";
  });

  const cols = ensureColgroup(table);
  const newCol = document.createElement("col");
  newCol.style.width = Math.max(MIN_COLUMN_WIDTH, cols[afterColumnIndex]?.getBoundingClientRect().width || 120) + "px";
  const group = table.querySelector("colgroup");
  if (group) group.insertBefore(newCol, group.children[insertAt] ?? null);
  table.dataset.columns = String(table.rows[0]?.cells.length ?? 1);
}

export function removeTableColumn(table: HTMLTableElement, columnIndex: number): void {
  const columns = table.rows[0]?.cells.length ?? 0;
  if (columns <= 1) return;

  Array.from(table.rows).forEach(row => {
    row.cells[Math.max(0, Math.min(columnIndex, row.cells.length - 1))]?.remove();
  });

  const group = table.querySelector("colgroup");
  group?.children[Math.max(0, Math.min(columnIndex, group.children.length - 1))]?.remove();
  table.dataset.columns = String(table.rows[0]?.cells.length ?? 1);
}

export function deleteTable(table: HTMLTableElement): void {
  const next = table.nextElementSibling;
  table.remove();
  if (next instanceof HTMLElement) next.focus?.();
}
