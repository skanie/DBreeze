export type DbType = "sqlite" | "postgres" | "mysql";

export interface ConnectionConfig {
  id?: string;
  name: string;
  db_type: DbType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  admin_database?: string;
  file_path?: string;
}

export interface TableMeta {
  name: string;
}

export interface ColumnMeta {
  name: string;
  data_type: string;
  nullable: boolean;
  primary: boolean;
}

export interface TableSchema {
  columns: ColumnMeta[];
  row_count: number;
  page_size: number;
  total_pages: number;
}

export interface QueryResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  execution_ms: number;
}

export interface QueryTab {
  id: string;
  title: string;
  sql: string;
  dirty: boolean;
}

export interface RowUpdateRequest {
  table: string;
  key_column: string;
  key_value: unknown;
  column: string;
  value: unknown;
}
