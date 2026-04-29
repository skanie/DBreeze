import { create } from "zustand";
import type { QueryResult, TableMeta } from "../types";

interface AppState {
  connectionId: string | null;
  tables: TableMeta[];
  selectedTable: string | null;
  sql: string;
  result: QueryResult | null;
  setConnectionId: (id: string | null) => void;
  setTables: (tables: TableMeta[]) => void;
  setSelectedTable: (name: string | null) => void;
  setSql: (sql: string) => void;
  setResult: (result: QueryResult | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  connectionId: null,
  tables: [],
  selectedTable: null,
  sql: "SELECT 1 as ok;",
  result: null,
  setConnectionId: (connectionId) => set({ connectionId }),
  setTables: (tables) => set({ tables }),
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setSql: (sql) => set({ sql }),
  setResult: (result) => set({ result })
}));
