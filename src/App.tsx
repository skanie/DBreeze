import { useEffect, useMemo, useState } from "react";
import { format } from "sql-formatter";
import {
  AppShell,
  Box,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { open, save } from "@tauri-apps/plugin-dialog";
import Sidebar from "./components/Sidebar";
import SqlEditor from "./components/SqlEditor";
import TableGrid from "./components/TableGrid";
import {
  connectDb,
  createDatabase,
  executeSql,
  exportCsv,
  exportJson,
  importFile,
  getTableSchema,
  insertRow,
  listConnections,
  listTables,
  queryTablePaged,
  saveConnection,
  updateCell,
  deleteRows
} from "./lib/api";
import { useAppStore } from "./stores/appStore";
import type { ConnectionConfig, QueryTab } from "./types";

const SQLITE_DEMO_PATH = "dbreeze-demo.db";
const SAVED_QUERIES_KEY = "dbreeze.saved_queries";
const DEFAULT_CONNECTION: ConnectionConfig = {
  name: "Local SQLite",
  db_type: "sqlite",
  file_path: SQLITE_DEMO_PATH
};
const FIRST_TAB: QueryTab = { id: "tab-main", title: "query.sql", sql: "SELECT 1 as ok;", dirty: false };
const DESTRUCTIVE_SQL_RE = /^\s*(DROP|TRUNCATE)\b/i;

export default function App() {
  const { connectionId, tables, result, setConnectionId, setTables, setSql, setResult } = useAppStore();
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [tabs, setTabs] = useState<QueryTab[]>([FIRST_TAB]);
  const [activeTabId, setActiveTabId] = useState(FIRST_TAB.id);
  const [history, setHistory] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<Array<{ id: string; name: string; sql: string }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("asc");
  const [filterValue, setFilterValue] = useState("");
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [keyColumn, setKeyColumn] = useState<string | null>(null);
  const [schemaWords, setSchemaWords] = useState<string[]>([]);
  const [toasts, setToasts] = useState<
    Array<{ id: string; type: "success" | "error"; text: string; count: number; closing?: boolean }>
  >([]);
  const [showConnModal, setShowConnModal] = useState(false);
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [connectionDraft, setConnectionDraft] = useState<ConnectionConfig>({
    id: undefined,
    name: "",
    db_type: "sqlite",
    file_path: "dbreeze-demo.db",
    host: "",
    port: 5432,
    user: "",
    password: "",
    database: "",
    admin_database: ""
  });
  const [activeConnectionName, setActiveConnectionName] = useState<string | undefined>(undefined);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? tabs[0], [activeTabId, tabs]);

  function pushToast(type: "success" | "error", text: string) {
    let toastId = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => {
      const existing = prev.find((t) => t.type === type && t.text === text);
      if (existing) {
        toastId = existing.id;
        return prev.map((t) =>
          t.id === existing.id ? { ...t, count: t.count + 1, closing: false } : t
        );
      }
      return [...prev, { id: toastId, type, text, count: 1 }];
    });
    window.setTimeout(() => dismissToast(toastId), 2600);
    notifications.show({
      color: type === "success" ? "green" : "red",
      title: type === "success" ? "Success" : "Error",
      message: text
    });
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_QUERIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ id: string; name: string; sql: string }>;
        if (Array.isArray(parsed)) {
          setSavedQueries(parsed);
        }
      }
    } catch {
      // Ignore malformed local storage data.
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const saved = await listConnections();
      const list = saved.length > 0 ? saved : [DEFAULT_CONNECTION];
      if (saved.length === 0) {
        await saveConnection(DEFAULT_CONNECTION);
      }
      setConnections(list);

      const id = await connectDb(list[0]);
      setConnectionId(id);
      setTables(await listTables(id));
      setSql(FIRST_TAB.sql);
      setActiveConnectionName(list[0].name);
    }

    void bootstrap().catch((e) => console.error("Bootstrap failed", e));
  }, [setConnectionId, setSql, setTables]);

  function persistSavedQueries(next: Array<{ id: string; name: string; sql: string }>) {
    setSavedQueries(next);
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(next));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void runSql();
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        formatSql();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function runSql(sqlOverride?: string) {
    if (!connectionId || !activeTab) return;
    const sqlToRun = sqlOverride?.trim() ? sqlOverride : activeTab.sql;
    if (DESTRUCTIVE_SQL_RE.test(sqlToRun)) {
      const ok = window.confirm("This query may delete schema/data. Execute anyway?");
      if (!ok) return;
    }
    try {
      const data = await executeSql(connectionId, sqlToRun);
      setResult(data);
      setHistory((prev) => [sqlToRun, ...prev].slice(0, 25));
      pushToast("success", "Query executed");
    } catch {
      pushToast("error", "Query failed");
    }
  }

  async function openTable(tableName: string) {
    if (!connectionId) return;
    setCurrentTable(tableName);
    setPage(1);
    setOrderBy(null);
    setOrderDir("asc");
    const sql = `SELECT * FROM "${tableName}" LIMIT ${pageSize};`;
    updateActiveTab(sql, `${tableName}.sql`);
    const schema = await getTableSchema(connectionId, tableName);
    setSchemaWords([tableName, ...schema.columns.map((c) => c.name)]);
    setKeyColumn(schema.columns.find((c) => c.primary)?.name ?? schema.columns[0]?.name ?? null);
    try {
      const data = await queryTablePaged(connectionId, tableName, 1, pageSize);
      setResult(data);
      pushToast("success", `Opened table ${tableName}`);
    } catch {
      pushToast("error", "Failed to open table");
    }
  }

  async function refreshTable(nextPage = page, nextSize = pageSize, nextOrderBy = orderBy, nextOrderDir = orderDir, nextFilter = filterValue) {
    if (!connectionId || !currentTable) return;
    const data = await queryTablePaged(connectionId, currentTable, nextPage, nextSize, nextOrderBy ?? undefined, nextOrderDir, nextFilter || undefined);
    setResult(data);
  }

  function updateActiveTab(sql: string, title?: string) {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, sql, title: title ?? t.title, dirty: true } : t))
    );
    setSql(sql);
  }

  async function connectExistingConnection(connection: ConnectionConfig) {
    try {
      const id = await connectDb(connection);
      const t = await listTables(id);
      setConnectionId(id);
      setTables(t);
      setActiveConnectionName(connection.name);
      pushToast("success", `Connected: ${connection.name}`);
    } catch {
      pushToast("error", `Failed to connect: ${connection.name}`);
    }
  }

  async function createAndConnect() {
    try {
      await saveConnection(connectionDraft);
      const next = await listConnections();
      setConnections(next);
      await connectExistingConnection(connectionDraft);
      setShowConnModal(false);
      pushToast("success", "Connection saved");
    } catch {
      pushToast("error", "Failed to save connection");
    }
  }

  async function handleCreateDatabase() {
    try {
      const result = await createDatabase(connectionDraft);
      pushToast("success", result);
      setShowConnModal(false);
      const next = await listConnections();
      setConnections(next);
      await connectExistingConnection(connectionDraft);
    } catch (e) {
      pushToast("error", `Failed: ${e}`);
    }
  }

  function openCreateDbModal() {
    setConnectionDraft({
      id: undefined,
      name: "",
      db_type: "sqlite",
      file_path: "new-database.db",
      host: "",
      port: 5432,
      user: "",
      password: "",
      database: "",
      admin_database: ""
    });
    setShowConnModal(true);
  }

  function formatSql() {
    if (!activeTab) return;
    const formatted = format(activeTab.sql, { language: "sql" });
    updateActiveTab(formatted);
  }

  function saveCurrentQuery() {
    if (!activeTab) return;
    const suggested = activeTab.title.replace(/\.sql$/i, "").trim() || "Saved query";
    const name = window.prompt("Query name", suggested)?.trim();
    if (!name) return;
    const item = { id: `${Date.now()}`, name, sql: activeTab.sql };
    persistSavedQueries([item, ...savedQueries.filter((q) => q.name !== name)].slice(0, 100));
    pushToast("success", `Query "${name}" saved`);
  }

  async function onExportCsv() {
    if (!connectionId || !activeTab) return;
    try {
      const path = await save({
        defaultPath: "dbreeze-export.csv",
        filters: [{ name: "CSV", extensions: ["csv"] }]
      });
      if (!path) return;
      await exportCsv(connectionId, activeTab.sql, path);
      pushToast("success", "CSV exported");
    } catch (e) {
      pushToast("error", `CSV export failed: ${String(e)}`);
    }
  }

  async function onExportJson() {
    if (!connectionId || !activeTab) return;
    try {
      const path = await save({
        defaultPath: "dbreeze-export.json",
        filters: [{ name: "JSON", extensions: ["json"] }]
      });
      if (!path) return;
      await exportJson(connectionId, activeTab.sql, path);
      pushToast("success", "JSON exported");
    } catch (e) {
      pushToast("error", `JSON export failed: ${String(e)}`);
    }
  }

  async function onImportData() {
    if (!connectionId || !currentTable) {
      pushToast("error", "Open a table before import");
      return;
    }
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Data files", extensions: ["csv", "json", "ndjson"] },
          { name: "CSV", extensions: ["csv"] },
          { name: "JSON", extensions: ["json", "ndjson"] }
        ]
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) return;
      const lower = path.toLowerCase();
      const format: "csv" | "json" = lower.endsWith(".csv") ? "csv" : "json";
      const inserted = await importFile(connectionId, currentTable, path, format);
      pushToast("success", `Imported ${inserted} row(s) into ${currentTable}`);
      await refreshTable();
    } catch (e) {
      pushToast("error", `Import failed: ${String(e)}`);
    }
  }

  function onSort(column: string) {
    const nextDir: "asc" | "desc" = orderBy === column && orderDir === "asc" ? "desc" : "asc";
    setOrderBy(column);
    setOrderDir(nextDir);
    void refreshTable(page, pageSize, column, nextDir, filterValue);
  }

  function onSelectTab(tabId: string) {
    setActiveTabId(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) setSql(tab.sql);
  }

  function exportSelectedCsv(rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const csv = [
      cols.join(","),
      ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dbreeze-selected.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    pushToast("success", "Selected rows exported to CSV");
  }

  function exportSelectedJson(rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dbreeze-selected.json";
    a.click();
    URL.revokeObjectURL(a.href);
    pushToast("success", "Selected rows exported to JSON");
  }

  function reorderTabs(fromId: string, toId: string) {
    if (fromId === toId) return;
    setTabs((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      const toIdx = prev.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  }

  function closeTab(tabId: string) {
    setTabs((prev) => {
      const target = prev.find((t) => t.id === tabId);
      if (!target) return prev;
      if (target.dirty) {
        const ok = window.confirm(`Close "${target.title}"? Unsaved changes will be lost.`);
        if (!ok) return prev;
      }
      if (prev.length <= 1) return prev;
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next[0].id);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!activeTab) return;
    setSql(activeTab.sql);
  }, [activeTab, setSql]);

  return (
    <AppShell
      padding="md"
      navbar={{ width: 320, breakpoint: "sm" }}
      styles={{ main: { background: "var(--mantine-color-dark-8)" } }}
    >
      <AppShell.Navbar>
      <Sidebar
        connections={connections}
        activeConnectionName={activeConnectionName}
        tables={tables}
        tabs={tabs}
        savedQueries={savedQueries}
        activeTabId={activeTabId}
        onSelectTab={onSelectTab}
        onOpenSavedQuery={(sql, name) => updateActiveTab(sql, `${name}.sql`)}
        onOpenTable={openTable}
        onAddConnection={() => setShowConnModal(true)}
        onCreateDatabase={openCreateDbModal}
        onConnectConnection={(connection) => void connectExistingConnection(connection)}
        onTableContext={(table, action) => {
          if (action === "open") {
            void openTable(table);
          } else if (action === "ddl") {
            updateActiveTab(`-- DDL preview for ${table}\nSELECT sql FROM sqlite_master WHERE name='${table}';`);
          } else {
            updateActiveTab(`SELECT * FROM "${table}"`);
            void onExportCsv();
          }
        }}
      />
      </AppShell.Navbar>
      <AppShell.Main>
      <Stack gap="sm">
        <Tabs value={activeTabId} onChange={(value) => value && onSelectTab(value)}>
          <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Tab
              key={tab.id}
              value={tab.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/tab", tab.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const from = e.dataTransfer.getData("text/tab");
                reorderTabs(from, tab.id);
              }}
            >
              {tab.title}
              <button
                className="tab-close"
                title="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </button>
            </Tabs.Tab>
          ))}
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              const id = `tab-${Date.now()}`;
              setTabs((prev) => [...prev, { id, title: "new.sql", sql: "SELECT * FROM ", dirty: false }]);
              setActiveTabId(id);
            }}
          >
            +
          </Button>
          </Tabs.List>
        </Tabs>
        <SqlEditor
          sql={activeTab?.sql ?? ""}
          schemaWords={schemaWords}
          runTimeMs={result?.execution_ms}
          onChange={(value) => updateActiveTab(value)}
          onExecute={() => void runSql()}
          onExecuteSelected={(sql) => void runSql(sql)}
          onSaveQuery={saveCurrentQuery}
          onImportData={() => void onImportData()}
          onFormat={formatSql}
          onExportCsv={() => void onExportCsv()}
          onExportJson={() => void onExportJson()}
        />
        <TableGrid
          result={result}
          orderBy={orderBy}
          orderDir={orderDir}
          page={page}
          pageSize={pageSize}
          onSort={onSort}
          onPageChange={(next) => {
            setPage(next);
            void refreshTable(next, pageSize, orderBy, orderDir, filterValue);
          }}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
            void refreshTable(1, next, orderBy, orderDir, filterValue);
          }}
          filterValue={filterValue}
          onFilterChange={(next) => {
            setFilterValue(next);
            setPage(1);
            void refreshTable(1, pageSize, orderBy, orderDir, next);
          }}
          keyColumn={keyColumn}
          onUpdateCell={(row, column, value) => {
            if (!connectionId || !currentTable || !keyColumn) return;
            void updateCell(connectionId, {
              table: currentTable,
              key_column: keyColumn,
              key_value: row[keyColumn],
              column,
              value
            })
              .then(() => {
                pushToast("success", "Cell updated");
                return refreshTable();
              })
              .catch(() => pushToast("error", "Update failed"));
          }}
          onInsertRow={() => {
            if (!connectionId || !currentTable) return;
            void insertRow(connectionId, { table: currentTable, values: {} })
              .then(() => {
                pushToast("success", "Row inserted");
                return refreshTable();
              })
              .catch(() => pushToast("error", "Insert failed"));
          }}
          onDeleteSelected={(rows) => {
            if (!connectionId || !currentTable || !keyColumn) return;
            void deleteRows(connectionId, {
              table: currentTable,
              key_column: keyColumn,
              key_values: rows.map((r) => r[keyColumn])
            })
              .then(() => {
                pushToast("success", "Rows deleted");
                return refreshTable();
              })
              .catch(() => pushToast("error", "Delete failed"));
          }}
          onExportSelectedCsv={exportSelectedCsv}
          onExportSelectedJson={exportSelectedJson}
        />
        {history.length > 0 && (
          <Box p="sm" bd="1px solid var(--mantine-color-dark-4)" style={{ borderRadius: 10 }}>
            <Text fw={600} mb={8}>
              Query history
            </Text>
            <Stack gap={6}>
              {history.slice(0, 6).map((h) => (
                <Button key={h} variant="subtle" justify="flex-start" onClick={() => updateActiveTab(h)}>
                    {h.slice(0, 80)}
                </Button>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
      <div className="toast-stack">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type === "error" ? "toast-error" : "toast-success"} ${
              t.closing ? "toast-leave" : "toast-enter"
            }`}
          >
            <span>{t.text}</span>
            {t.count > 1 ? <span className="toast-count">x{t.count}</span> : null}
            <button className="toast-close" onClick={() => dismissToast(t.id)}>
              x
            </button>
          </div>
        ))}
      </div>
      <Modal opened={showConnModal} onClose={() => setShowConnModal(false)} title="New Connection" centered>
            <Stack>
            <TextInput
              label="Name"
              value={connectionDraft.name}
              onChange={(e) => setConnectionDraft((p) => ({ ...p, name: e.target.value }))}
            />
            <Select
              label="Type"
              value={connectionDraft.db_type}
              onChange={(e) =>
                setConnectionDraft((p) => ({ ...p, db_type: (e || "sqlite") as ConnectionConfig["db_type"] }))
              }
              data={[
                { value: "sqlite", label: "sqlite" },
                { value: "postgres", label: "postgres" },
                { value: "mysql", label: "mysql" }
              ]}
            >
            </Select>
            {connectionDraft.db_type === "sqlite" ? (
              <>
                <TextInput
                  label="SQLite file path"
                  value={connectionDraft.file_path ?? ""}
                  onChange={(e) => setConnectionDraft((p) => ({ ...p, file_path: e.target.value }))}
                />
                <Text size="xs" c="dimmed">
                  Enter a new file path to create a new database
                </Text>
              </>
            ) : (
              <>
                <TextInput
                  label="Host"
                  value={connectionDraft.host ?? ""}
                  onChange={(e) => setConnectionDraft((p) => ({ ...p, host: e.target.value }))}
                />
                <TextInput
                  label="Port"
                  value={String(connectionDraft.port ?? "")}
                  onChange={(e) => setConnectionDraft((p) => ({ ...p, port: Number(e.target.value) || 0 }))}
                />
                <TextInput
                  label="User"
                  value={connectionDraft.user ?? ""}
                  onChange={(e) => setConnectionDraft((p) => ({ ...p, user: e.target.value }))}
                />
                <TextInput
                  label="Password"
                  type="password"
                  value={connectionDraft.password ?? ""}
                  onChange={(e) => setConnectionDraft((p) => ({ ...p, password: e.target.value }))}
                />
                <TextInput
                  label="Admin Database (for creating new DB)"
                  placeholder={connectionDraft.db_type === "postgres" ? "postgres" : "mysql"}
                  value={connectionDraft.admin_database ?? ""}
                  onChange={(e) => setConnectionDraft((p) => ({ ...p, admin_database: e.target.value }))}
                />
                <TextInput
                  label="Database"
                  value={connectionDraft.database ?? ""}
                  onChange={(e) => setConnectionDraft((p) => ({ ...p, database: e.target.value }))}
                />
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => {
                    if (!connectionDraft.database) {
                      pushToast("error", "Please enter a database name to create");
                      return;
                    }
                    void handleCreateDatabase();
                  }}
                >
                  Create Database & Connect
                </Button>
              </>
            )}
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setShowConnModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createAndConnect()}>Save & Connect</Button>
            </Group>
            </Stack>
      </Modal>
      </AppShell.Main>
    </AppShell>
  );
}
