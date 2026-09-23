import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Plus, Save, Trash2, Unlink, X } from "lucide-react";

export type FlowchartNode = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export type FlowchartEdge = {
  from: string;
  to: string;
};

export type FlowchartData = {
  id: string;
  title: string;
  width: number;
  height: number;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
};

const NODE_WIDTH = 150;
const NODE_HEIGHT = 58;

function id(): string {
  return crypto.randomUUID();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createFlowchart(): FlowchartData {
  const first = id();
  const second = id();
  const third = id();

  return {
    id: id(),
    title: "Ablauf",
    width: 760,
    height: 420,
    nodes: [
      { id: first, text: "Start", x: 52, y: 72 },
      { id: second, text: "Schritt", x: 302, y: 72 },
      { id: third, text: "Ziel", x: 552, y: 72 }
    ],
    edges: [
      { from: first, to: second },
      { from: second, to: third }
    ]
  };
}

export function parseFlowchartElement(element: HTMLElement): FlowchartData | null {
  try {
    const encoded = element.dataset.flowchart;
    if (!encoded) return null;
    const parsed = JSON.parse(decodeURIComponent(encoded)) as FlowchartData;
    if (!parsed?.id || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function renderFlowchartHtml(data: FlowchartData): string {
  const markerId = "flow-arrow-" + data.id.replace(/[^a-z0-9]/gi, "").slice(0, 16);
  const lines = data.edges.map(edge => {
    const from = data.nodes.find(node => node.id === edge.from);
    const to = data.nodes.find(node => node.id === edge.to);
    if (!from || !to) return "";
    const x1 = from.x + NODE_WIDTH;
    const y1 = from.y + NODE_HEIGHT / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_HEIGHT / 2;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" marker-end="url(#' + markerId + ')" />';
  }).join("");

  const nodes = data.nodes.map(node =>
    '<div class="flowchart-preview-node" style="left:' + node.x + 'px;top:' + node.y + 'px;width:' + NODE_WIDTH + 'px;min-height:' + NODE_HEIGHT + 'px">' +
      escapeHtml(node.text) +
    "</div>"
  ).join("");

  const encoded = encodeURIComponent(JSON.stringify(data));

  return (
    '<div class="flowchart-block" contenteditable="false" data-flowchart-id="' + escapeHtml(data.id) + '" data-flowchart="' + escapeHtml(encoded) + '">' +
      '<div class="flowchart-block-header"><strong>↗ ' + escapeHtml(data.title || "Flowchart") + '</strong><span>Doppelklick zum Bearbeiten</span></div>' +
      '<div class="flowchart-preview" style="height:' + data.height + 'px">' +
        '<svg viewBox="0 0 ' + data.width + ' ' + data.height + '" preserveAspectRatio="xMinYMin meet">' +
          '<defs><marker id="' + markerId + '" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" /></marker></defs>' +
          lines +
        "</svg>" +
        nodes +
      "</div>" +
    "</div>"
  );
}

type Props = {
  initial: FlowchartData;
  onCancel: () => void;
  onSave: (data: FlowchartData) => void;
};

export default function FlowchartEditor({ initial, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState<FlowchartData>(() => structuredClone(initial));
  const [selectedId, setSelectedId] = useState<string | null>(initial.nodes[0]?.id ?? null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    setDraft(structuredClone(initial));
    setSelectedId(initial.nodes[0]?.id ?? null);
    setConnectFrom(null);
  }, [initial]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(12, Math.min(draft.width - NODE_WIDTH - 12, event.clientX - rect.left - drag.offsetX));
      const y = Math.max(12, Math.min(draft.height - NODE_HEIGHT - 12, event.clientY - rect.top - drag.offsetY));
      setDraft(current => ({
        ...current,
        nodes: current.nodes.map(node => node.id === drag.nodeId ? { ...node, x: Math.round(x), y: Math.round(y) } : node)
      }));
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [draft.width, draft.height]);

  const selected = draft.nodes.find(node => node.id === selectedId) ?? null;

  const edgeLines = useMemo(() => draft.edges.map((edge, index) => {
    const from = draft.nodes.find(node => node.id === edge.from);
    const to = draft.nodes.find(node => node.id === edge.to);
    if (!from || !to) return null;
    return (
      <line
        key={edge.from + edge.to + index}
        x1={from.x + NODE_WIDTH}
        y1={from.y + NODE_HEIGHT / 2}
        x2={to.x}
        y2={to.y + NODE_HEIGHT / 2}
        markerEnd="url(#flowchart-editor-arrow)"
      />
    );
  }), [draft.edges, draft.nodes]);

  const addNode = () => {
    const count = draft.nodes.length;
    const node: FlowchartNode = {
      id: id(),
      text: "Neuer Block",
      x: 46 + (count % 3) * 220,
      y: 190 + Math.floor(count / 3) * 92
    };
    setDraft(current => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedId(node.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setDraft(current => ({
      ...current,
      nodes: current.nodes.filter(node => node.id !== selectedId),
      edges: current.edges.filter(edge => edge.from !== selectedId && edge.to !== selectedId)
    }));
    setSelectedId(null);
    setConnectFrom(null);
  };

  const clearConnections = () => {
    if (!selectedId) return;
    setDraft(current => ({
      ...current,
      edges: current.edges.filter(edge => edge.from !== selectedId && edge.to !== selectedId)
    }));
  };

  const chooseNode = (nodeId: string) => {
    if (connectFrom && connectFrom !== nodeId) {
      setDraft(current => {
        const exists = current.edges.some(edge => edge.from === connectFrom && edge.to === nodeId);
        return exists ? current : { ...current, edges: [...current.edges, { from: connectFrom, to: nodeId }] };
      });
      setConnectFrom(null);
      setSelectedId(nodeId);
      return;
    }
    setSelectedId(nodeId);
  };

  return (
    <div className="flowchart-editor-shell">
      <div className="flowchart-editor-top">
        <div>
          <span className="eyebrow">Diagramm</span>
          <input
            className="flowchart-title-input"
            value={draft.title}
            onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
            placeholder="Flowchart-Titel"
          />
        </div>
        <button className="icon-button" onClick={onCancel} title="Schliessen"><X size={19}/></button>
      </div>

      <div className="flowchart-editor-toolbar">
        <button className="secondary" onClick={addNode}><Plus size={15}/> Block</button>
        <button
          className={"secondary " + (connectFrom ? "active-tool" : "")}
          disabled={!selectedId}
          onClick={() => setConnectFrom(connectFrom ? null : selectedId)}
        >
          <Link2 size={15}/> {connectFrom ? "Ziel anklicken…" : "Verbinden"}
        </button>
        <button className="secondary" disabled={!selectedId} onClick={clearConnections}><Unlink size={15}/> Verbindungen lösen</button>
        <button className="secondary danger-soft" disabled={!selectedId} onClick={removeSelected}><Trash2 size={15}/> Block löschen</button>
        <span className="flowchart-editor-hint">Blöcke ziehen · anklicken · verbinden</span>
      </div>

      <div className="flowchart-editor-body">
        <div
          className={"flowchart-canvas " + (connectFrom ? "is-connecting" : "")}
          ref={canvasRef}
          style={{ width: draft.width, height: draft.height }}
        >
          <svg width={draft.width} height={draft.height}>
            <defs>
              <marker id="flowchart-editor-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z"/>
              </marker>
            </defs>
            {edgeLines}
          </svg>

          {draft.nodes.map(node => (
            <button
              key={node.id}
              type="button"
              className={"flowchart-node " + (selectedId === node.id ? "selected" : "") + (connectFrom === node.id ? "connecting" : "")}
              style={{ left: node.x, top: node.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
              onClick={() => chooseNode(node.id)}
              onPointerDown={event => {
                if (connectFrom) return;
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                dragRef.current = {
                  nodeId: node.id,
                  offsetX: event.clientX - rect.left - node.x,
                  offsetY: event.clientY - rect.top - node.y
                };
              }}
            >
              {node.text}
            </button>
          ))}
        </div>

        <aside className="flowchart-properties">
          <strong>Block</strong>
          {selected ? (
            <>
              <label className="field compact-field">
                Text
                <input
                  value={selected.text}
                  onChange={event => setDraft(current => ({
                    ...current,
                    nodes: current.nodes.map(node => node.id === selected.id ? { ...node, text: event.target.value } : node)
                  }))}
                />
              </label>
              <p className="muted">Ziehe den Block im Raster an die gewünschte Position. Mit „Verbinden“ wählst du zuerst den Start- und danach den Zielblock.</p>
            </>
          ) : (
            <p className="muted">Wähle einen Block aus oder füge einen neuen hinzu.</p>
          )}
        </aside>
      </div>

      <div className="flowchart-editor-footer">
        <button className="secondary" onClick={onCancel}>Abbrechen</button>
        <button className="primary" onClick={() => onSave(draft)}><Save size={16}/> Diagramm speichern</button>
      </div>
    </div>
  );
}
