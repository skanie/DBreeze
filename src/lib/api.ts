import { invoke } from "@tauri-apps/api/core";
import type { ConnectionConfig, QueryResult, RowUpdateRequest, TableMeta, TableSchema } from "../types";

export async function connectDb(config: ConnectionConfig): Promise<string> {
  return invoke<string>("connect_db", { config });
}

export async function createDatabase(config: ConnectionConfig): Promise<string> {
  return invoke<string>("create_database", { config });
}

export async function listTables(connectionId: string): Promise<TableMeta[]> {
  return invoke<TableMeta[]>("list_tables", { connectionId });
}

export async function executeSql(connectionId: string, sql: string): Promise<QueryResult> {
  return invoke<QueryResult>("execute_sql", { connectionId, sql });
}

export async function queryTable(connectionId: string, table: string, limit = 100): Promise<QueryResult> {
  return invoke<QueryResult>("query_table", { connectionId, table, limit });
}

export async function exportCsv(connectionId: string, sql: string, path: string): Promise<void> {
  return invoke<void>("export_csv", { connectionId, sql, path });
}

export async function exportJson(connectionId: string, sql: string, path: string): Promise<void> {
  return invoke<void>("export_json", { connectionId, sql, path });
}

export async function importFile(
  connectionId: string,
  table: string,
  path: string,
  format: "csv" | "json"
): Promise<number> {
  return invoke<number>("import_file", { connectionId, table, path, format });
}

export async function saveConnection(config: ConnectionConfig): Promise<void> {
  return invoke<void>("save_connection", { config });
}

export async function listConnections(): Promise<ConnectionConfig[]> {
  return invoke<ConnectionConfig[]>("list_connections");
}

export async function getTableSchema(connectionId: string, tableName: string): Promise<TableSchema> {
  return invoke<TableSchema>("get_table_schema", { connectionId, tableName });
}

export async function queryTablePaged(
  connectionId: string,
  table: string,
  page: number,
  limit: number,
  orderBy?: string,
  orderDir?: "asc" | "desc",
  filter?: string
): Promise<QueryResult> {
  return invoke<QueryResult>("query_table", { connectionId, table, page, limit, orderBy, orderDir, filter });
}

export async function updateCell(connectionId: string, payload: RowUpdateRequest): Promise<void> {
  return invoke<void>("update_cell", { connectionId, payload });
}

export async function insertRow(
  connectionId: string,
  payload: { table: string; values: Record<string, unknown> }
): Promise<void> {
  return invoke<void>("insert_row", { connectionId, payload });
}

export async function deleteRows(
  connectionId: string,
  payload: { table: string; key_column: string; key_values: unknown[] }
): Promise<void> {
  return invoke<void>("delete_rows", { connectionId, payload });
}
