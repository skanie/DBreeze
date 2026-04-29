import { useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Badge, Button, Group, Paper } from "@mantine/core";
import { IconBolt, IconBraces, IconFileExport, IconFileImport } from "@tabler/icons-react";

interface SqlEditorProps {
  sql: string;
  schemaWords: string[];
  runTimeMs?: number;
  onChange: (value: string) => void;
  onExecute: () => void;
  onExecuteSelected: (sql: string) => void;
  onSaveQuery: () => void;
  onImportData: () => void;
  onFormat: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

export default function SqlEditor({
  sql,
  schemaWords,
  runTimeMs,
  onChange,
  onExecute,
  onExecuteSelected,
  onSaveQuery,
  onImportData,
  onFormat,
  onExportCsv,
  onExportJson
}: SqlEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: () => ({
        suggestions: schemaWords.map((word) => ({
          label: word,
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: word
        }))
      })
    });
  };

  function runSelected() {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection) return;
    const selected = model.getValueInRange(selection).trim();
    if (selected.length > 0) {
      onExecuteSelected(selected);
    }
  }

  return (
    <Paper withBorder radius="md" p={8} style={{ display: "grid", gridTemplateRows: "auto 1fr", minHeight: 320 }}>
      <Group justify="space-between" mb={8}>
        <Group>
          <Button leftSection={<IconBolt size={14} />} onClick={onExecute}>
            Execute
          </Button>
          <Button variant="light" leftSection={<IconBolt size={14} />} onClick={runSelected}>
            Execute Selection
          </Button>
          <Button variant="light" onClick={onSaveQuery}>
            Save Query
          </Button>
          <Button variant="light" leftSection={<IconFileImport size={14} />} onClick={onImportData}>
            Import
          </Button>
          <Button variant="light" leftSection={<IconBraces size={14} />} onClick={onFormat}>
            Format
          </Button>
          <Button variant="light" leftSection={<IconFileExport size={14} />} onClick={onExportCsv}>
            CSV
          </Button>
          <Button variant="light" leftSection={<IconFileExport size={14} />} onClick={onExportJson}>
            JSON
          </Button>
        </Group>
        <Badge variant="light" color={runTimeMs ? "blue" : "gray"}>
          {runTimeMs ? `${runTimeMs} ms` : "Not executed"}
        </Badge>
      </Group>
      <Editor
        height="260px"
        defaultLanguage="sql"
        theme="vs-dark"
        value={sql}
        onChange={(value) => onChange(value ?? "")}
        onMount={handleMount}
        options={{ minimap: { enabled: false }, fontSize: 14, roundedSelection: true }}
      />
    </Paper>
  );
}
