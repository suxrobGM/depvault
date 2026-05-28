"use client";

import type { ReactElement } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import type { SecretFile } from "@/types/api/secret-file";
import { SecretFileRow } from "./secret-file-row";

interface SecretFileTableProps {
  projectId: string;
  files: SecretFile[];
  canEdit: boolean;
  onEdit: (file: SecretFile) => void;
}

export function SecretFileTable(props: SecretFileTableProps): ReactElement {
  const { projectId, files, canEdit, onEdit } = props;

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width={48} />
            <TableCell>File</TableCell>
            <TableCell>Vault Group</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Uploaded</TableCell>
            <TableCell width={64} />
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => (
            <SecretFileRow
              key={file.id}
              projectId={projectId}
              file={file}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
