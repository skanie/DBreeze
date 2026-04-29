import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, Group, Paper, ScrollArea, Select, TextInput } from "@mantine/core";
import { IconDownload, IconFilter, IconPlus, IconTrash } from "@tabler/icons-react";
import type { QueryResult } from "../types";

interface TableGridProps {
  result: QueryResult | null;
  orderBy: string | null;
  orderDir: "asc" | "desc";
  page: number;
  pageSize: number;
  onSort: (column: string) => void;
  onPageChange: (next: number) => void;
  onPageSizeChange: (next: number) => void;
  filterValue: string;
  onFilterChange: (next: string) => void;
  keyColumn: string | null;
  onUpdateCell: (row: Record<string, unknown>, column: string, value: string) => void;
  onInsertRow: () => void;
  onDeleteSelected: (rows: Record<string, unknown>[]) => void;
  onExportSelectedCsv: (rows: Record<string, unknown>[]) => void;
  onExportSelectedJson: (rows: Record<string, unknown>[]) => void;
}

export default function TableGrid({
  result,
  orderBy,
  orderDir,
  page,
  pageSize,
  onSort,
  onPageChange,
  onPageSizeChange,
  filterValue,
  onFilterChange,
  keyColumn,
  onUpdateCell,
  onInsertRow,
  onDeleteSelected,
  onExportSelectedCsv,
  onExportSelectedJson
}: TableGridProps) {
  const rows = result?.rows ?? [];
  const columns = result?.columns ?? [];
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34
  });
  const [editing, setEditing] = useState<{ r: number; c: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowMenu, setRowMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const dragRef = useRef<{ col: string; x: number; w: number } | null>(null);
  const selectedRows = useMemo(() => Array.from(selected).map((i) => rows[i]).filter(Boolean), [rows, selected]);

  if (!result) return <section className="result-wrap muted">Run query to see results</section>;

  return (
    <Paper withBorder radius="md" p={10} ref={parentRef} className="result-wrap">
      <Group justify="space-between" mb={10}>
        <TextInput
          leftSection={<IconFilter size={14} />}
          placeholder="Filter (SQL expression)..."
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
        />
        <Group>
          <Button variant="light" leftSection={<IconPlus size={14} />} onClick={onInsertRow}>
            Row
          </Button>
          <Button variant="light" color="red" leftSection={<IconTrash size={14} />} onClick={() => onDeleteSelected(selectedRows)} disabled={selectedRows.length === 0}>
            Delete selected
          </Button>
          <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => onExportSelectedCsv(selectedRows)} disabled={selectedRows.length === 0}>
            CSV
          </Button>
          <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => onExportSelectedJson(selectedRows)} disabled={selectedRows.length === 0}>
            JSON
          </Button>
          <Button variant="subtle" onClick={() => onPageChange(Math.max(1, page - 1))}>
            Prev
          </Button>
          <Button variant="subtle">Page {page}</Button>
          <Button variant="subtle" onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
          <Select
            w={90}
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            data={[
              { value: "50", label: "50" },
              { value: "100", label: "100" },
              { value: "500", label: "500" }
            ]}
          />
        </Group>
      </Group>
      <ScrollArea h={430}>
      <div className="grid-head">
        <span style={{ width: 42 }} />
        {columns.map((c) => (
          <span key={c} style={{ width: columnWidths[c] ? `${columnWidths[c]}px` : undefined }}>
            <Button variant="subtle" size="compact-sm" onClick={() => onSort(c)}>
              {c}
              {orderBy === c ? (orderDir === "asc" ? " ▲" : " ▼") : ""}
            </Button>
            <span
              className="resize-handle"
              onMouseDown={(e) => {
                dragRef.current = { col: c, x: e.clientX, w: columnWidths[c] ?? 180 };
                const onMove = (m: MouseEvent) => {
                  if (!dragRef.current) return;
                  const next = Math.max(90, dragRef.current.w + m.clientX - dragRef.current.x);
                  setColumnWidths((prev) => ({ ...prev, [dragRef.current!.col]: next }));
                };
                const onUp = () => {
                  dragRef.current = null;
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            />
          </span>
        ))}
      </div>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              className="virtual-row"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!selected.has(virtualRow.index)) {
                  setSelected(new Set([virtualRow.index]));
                }
                setRowMenu({ x: e.clientX, y: e.clientY, index: virtualRow.index });
              }}
            >
              <span>
                <input
                  type="checkbox"
                  checked={selected.has(virtualRow.index)}
                  onChange={(e) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(virtualRow.index);
                      else next.delete(virtualRow.index);
                      return next;
                    });
                  }}
                />
              </span>
              {columns.map((c) => (
                <span
                  key={`${virtualRow.index}-${c}`}
                  style={{ width: columnWidths[c] ? `${columnWidths[c]}px` : undefined }}
                  onDoubleClick={() => {
                    setEditing({ r: virtualRow.index, c });
                    setDraft(String(row[c] ?? ""));
                  }}
                >
                  {editing?.r === virtualRow.index && editing?.c === c ? (
                    <input
                      className="cell-input"
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        setEditing(null);
                        if (keyColumn) onUpdateCell(row, c, draft);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setEditing(null);
                          if (keyColumn) onUpdateCell(row, c, draft);
                        }
                      }}
                    />
                  ) : (
                    String(row[c] ?? "NULL")
                  )}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      </ScrollArea>
      {rowMenu && (
        <div className="context-menu" style={{ left: rowMenu.x, top: rowMenu.y }} onMouseLeave={() => setRowMenu(null)}>
          <button
            className="context-item"
            onClick={() => {
              setSelected(new Set([rowMenu.index]));
              setRowMenu(null);
            }}
          >
            Select row
          </button>
          <button
            className="context-item"
            onClick={() => {
              const one = rows[rowMenu.index];
              if (one) onExportSelectedJson([one]);
              setRowMenu(null);
            }}
          >
            Export row JSON
          </button>
          <button
            className="context-item"
            onClick={() => {
              const one = rows[rowMenu.index];
              if (one) onDeleteSelected([one]);
              setRowMenu(null);
            }}
          >
            Delete row
          </button>
        </div>
      )}
    </Paper>
  );
}
