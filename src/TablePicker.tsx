import { useState } from "react";
import { X } from "lucide-react";

export default function TablePicker({
  onSelect,
  onCancel,
  maxRows = 8,
  maxColumns = 8
}: {
  onSelect: (rows: number, columns: number) => void;
  onCancel: () => void;
  maxRows?: number;
  maxColumns?: number;
}) {
  const [hover, setHover] = useState({ rows: 3, columns: 3 });
  const [dragging, setDragging] = useState(false);

  const choose = (rows: number, columns: number) => {
    setHover({ rows, columns });
    if (dragging) return;
  };

  return (
    <div className="table-picker" onMouseDown={event => event.stopPropagation()}>
      <div className="table-picker-header">
        <div>
          <strong>Tabelle einfügen</strong>
          <span>{hover.columns} Spalten × {hover.rows} Zeilen</span>
        </div>
        <button className="icon-button" onClick={onCancel} title="Schliessen"><X size={15}/></button>
      </div>

      <div
        className="table-picker-grid"
        style={{ gridTemplateColumns: `repeat(${maxColumns}, 1fr)` }}
        onPointerLeave={() => !dragging && setHover({ rows: 3, columns: 3 })}
        onPointerUp={() => {
          if (!dragging) return;
          setDragging(false);
          onSelect(hover.rows, hover.columns);
        }}
      >
        {Array.from({ length: maxRows * maxColumns }, (_, index) => {
          const row = Math.floor(index / maxColumns) + 1;
          const column = (index % maxColumns) + 1;
          const active = row <= hover.rows && column <= hover.columns;
          return (
            <button
              key={index}
              type="button"
              aria-label={column + " Spalten, " + row + " Zeilen"}
              className={active ? "active" : ""}
              onPointerDown={event => {
                event.preventDefault();
                setDragging(true);
                setHover({ rows: row, columns: column });
              }}
              onPointerEnter={() => choose(row, column)}
              onClick={event => {
                event.preventDefault();
                if (!dragging) onSelect(row, column);
              }}
            />
          );
        })}
      </div>
      <small>Über die Felder ziehen oder klicken · danach kannst du Zeilen und Spalten direkt an ihren Kanten verschieben.</small>
    </div>
  );
}
