"use client";

import { type ReactElement } from "react";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { EditorView } from "@codemirror/view";
import { useTheme } from "@mui/material";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import type { EditorLanguage } from "./file-format";

interface CodeEditorProps {
  value: string;
  language: EditorLanguage;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Thin CodeMirror wrapper for editing/viewing decrypted file text.
 *
 * Loaded only on the client (see `code-editor-lazy`). The React 19 compiler keeps
 * the `extensions` array referentially stable per `language`, so CodeMirror does
 * not remount on unrelated re-renders.
 */
export function CodeEditor(props: CodeEditorProps): ReactElement {
  const { value, language, readOnly, onChange, minHeight = 240, maxHeight = 560 } = props;
  const theme = useTheme();

  const extensions: Extension[] = [EditorView.lineWrapping];
  if (language === "json") extensions.push(json());
  if (language === "yaml") extensions.push(yaml());

  return (
    <CodeMirror
      value={value}
      readOnly={readOnly}
      editable={!readOnly}
      extensions={extensions}
      theme={theme.palette.mode === "dark" ? "dark" : "light"}
      onChange={onChange}
      minHeight={`${minHeight}px`}
      maxHeight={`${maxHeight}px`}
      basicSetup={{
        lineNumbers: true,
        foldGutter: language === "json" || language === "yaml",
        highlightActiveLine: !readOnly,
        autocompletion: false,
      }}
      style={{
        fontSize: 13,
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
      }}
    />
  );
}
