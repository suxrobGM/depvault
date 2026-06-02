"use client";

import { Skeleton } from "@mui/material";
import dynamic from "next/dynamic";

/** Client-only CodeMirror editor. CodeMirror touches `window`, so SSR is disabled. */
export const CodeEditorLazy = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" height={280} />,
});

/** Client-only git-style diff viewer. */
export const FileDiffViewerLazy = dynamic(
  () => import("./file-diff-viewer").then((m) => m.FileDiffViewer),
  {
    ssr: false,
    loading: () => <Skeleton variant="rounded" height={200} />,
  },
);
