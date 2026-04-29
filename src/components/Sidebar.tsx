import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Divider, Menu, ScrollArea, Stack, Text, TextInput } from "@mantine/core";
import { IconDots, IconDatabasePlus, IconPlugConnected, IconSearch, IconTable } from "@tabler/icons-react";
import type { ConnectionConfig, QueryTab, TableMeta } from "../types";

interface SidebarProps {
  connections: ConnectionConfig[];
  activeConnectionName?: string;
  tables: TableMeta[];
  tabs: QueryTab[];
  savedQueries: Array<{ id: string; name: string; sql: string }>;
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onOpenSavedQuery: (sql: string, name: string) => void;
  onOpenTable: (tableName: string) => void;
  onTableContext: (tableName: string, action: "open" | "ddl" | "export") => void;
  onAddConnection: () => void;
  onCreateDatabase: () => void;
  onConnectConnection: (connection: ConnectionConfig) => void;
}

export default function Sidebar({
  connections,
  activeConnectionName,
  tables,
  tabs,
  savedQueries,
  activeTabId,
  onSelectTab,
  onOpenSavedQuery,
  onOpenTable,
  onTableContext,
  onAddConnection,
  onCreateDatabase,
  onConnectConnection
}: SidebarProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setSearchValue(searchInput.trim().toLowerCase()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const filteredTables = useMemo(
    () => tables.filter((t) => t.name.toLowerCase().includes(searchValue)),
    [tables, searchValue]
  );

  return (
    <Stack h="100%" gap="sm" p="sm">
      <Text fw={700} fz="xl">
        DBreeze
      </Text>
      <Divider />
      <Stack gap={8}>
        <Button size="xs" variant="light" onClick={onAddConnection}>
          + New connection
        </Button>
        <Button size="xs" variant="subtle" leftSection={<IconDatabasePlus size={14} />} onClick={onCreateDatabase}>
          Create DB
        </Button>
        <Text size="xs" c="dimmed" tt="uppercase">
          Connections
        </Text>
        <ScrollArea.Autosize mah={130}>
          {connections.map((c) => (
            <Button
              key={c.id ?? c.name}
              fullWidth
              justify="space-between"
              variant={activeConnectionName === c.name ? "filled" : "subtle"}
              leftSection={<IconPlugConnected size={14} />}
              onClick={() => onConnectConnection(c)}
              mb={6}
            >
              <span>{c.name}</span>
              <Badge size="xs" variant="outline">
                {c.db_type}
              </Badge>
            </Button>
          ))}
        </ScrollArea.Autosize>
      </Stack>
      <Divider />
      <Stack gap={6}>
        <Text size="xs" c="dimmed" tt="uppercase">
          Open Tabs
        </Text>
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={activeTabId === t.id ? "light" : "subtle"}
              justify="flex-start"
              onClick={() => onSelectTab(t.id)}
            >
              {t.title}
            </Button>
          ))}
      </Stack>
      <Divider />
      <Stack gap={6}>
        <Text size="xs" c="dimmed" tt="uppercase">
          Saved Queries
        </Text>
        {savedQueries.length === 0 ? (
          <Text size="xs" c="dimmed">
            No saved queries yet
          </Text>
        ) : (
          <ScrollArea.Autosize mah={120}>
            {savedQueries.map((q) => (
              <Button key={q.id} variant="subtle" justify="flex-start" onClick={() => onOpenSavedQuery(q.sql, q.name)} mb={6}>
                {q.name}
              </Button>
            ))}
          </ScrollArea.Autosize>
        )}
      </Stack>
      <Divider />
      <Stack gap={6} style={{ flex: 1 }}>
        <Text size="xs" c="dimmed" tt="uppercase">
          Tables
        </Text>
        <TextInput
          leftSection={<IconSearch size={14} />}
          placeholder="Search tables..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <ScrollArea style={{ flex: 1 }}>
          {filteredTables.map((t) => (
            <Button
              key={t.name}
              mb={6}
              fullWidth
              variant="subtle"
              justify="space-between"
              leftSection={<IconTable size={14} />}
              onClick={() => onOpenTable(t.name)}
              rightSection={
                <Menu withinPortal shadow="md">
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="sm">
                      <IconDots size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => onTableContext(t.name, "open")}>Open table</Menu.Item>
                    <Menu.Item onClick={() => onTableContext(t.name, "ddl")}>Show DDL</Menu.Item>
                    <Menu.Item onClick={() => onTableContext(t.name, "export")}>Export CSV</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              }
            >
              {t.name}
            </Button>
          ))}
        </ScrollArea>
      </Stack>
    </Stack>
  );
}
