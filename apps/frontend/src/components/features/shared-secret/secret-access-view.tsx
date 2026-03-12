"use client";

import { useState, type ReactElement } from "react";
import { CONFIG_FORMATS, type ConfigFormat } from "@depvault/shared/constants";
import { getConfigFileName, serializeConfig } from "@depvault/shared/serializers";
import {
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormSelectField } from "@/components/ui/form-select-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { SharedSecretInfoResponse } from "@/types/api/shared-secret";
import { downloadFile } from "@/utils/download-file";

interface SecretAccessViewProps {
  token: string;
  info: SharedSecretInfoResponse;
}

interface EnvVariable {
  key: string;
  value: string;
}

type AccessResult =
  | { payloadType: "ENV_VARIABLES"; variables: EnvVariable[] }
  | { payloadType: "SECRET_FILE"; fileName: string; mimeType: string; content: string };

export function SecretAccessView(props: SecretAccessViewProps): ReactElement {
  const { token, info } = props;

  const [password, setPassword] = useState("");
  const [result, setResult] = useState<AccessResult | null>(null);
  const [consumed, setConsumed] = useState(false);

  const downloadForm = useForm({
    defaultValues: { format: "env" as ConfigFormat },
  });

  const mutation = useApiMutation(
    (body: { password?: string }) => client.api.secrets.shared({ token }).post(body),
    {
      onSuccess: (data) => {
        const accessResult = data as AccessResult;
        setResult(accessResult);
        setConsumed(true);

        if (accessResult.payloadType === "SECRET_FILE") {
          const bytes = Uint8Array.from(atob(accessResult.content), (c) => c.charCodeAt(0));
          downloadFile(bytes.buffer, accessResult.fileName);
        }
      },
      errorMessage: (err) => err.message ?? "Failed to access secret",
    },
  );

  const handleAccess = () => {
    mutation.mutate(info.hasPassword ? { password } : {});
  };

  const handleDownload = () => {
    if (result?.payloadType !== "ENV_VARIABLES") {
      return;
    }

    const format = downloadForm.getFieldValue("format") as ConfigFormat;
    const text = serializeConfig(format, result.variables);
    const fileName = getConfigFileName(format);
    downloadFile(text, fileName, "text/plain");
  };

  if (consumed && result?.payloadType === "SECRET_FILE") {
    return (
      <Box sx={{ textAlign: "center" }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          File downloaded
        </Typography>
        <Typography color="text.secondary">
          This link has been consumed and is no longer valid.
        </Typography>
      </Box>
    );
  }

  if (consumed && result?.payloadType === "ENV_VARIABLES") {
    return (
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CheckCircleIcon color="success" />
          <Typography variant="h6">Secret accessed</Typography>
        </Box>
        <Alert severity="warning">
          Save these values now — this link has been destroyed and cannot be accessed again.
        </Alert>
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "35%" }}>Key</TableCell>
                <TableCell sx={{ width: "65%" }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.variables.map((v) => (
                <TableRow key={v.key}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600} noWrap>
                      {v.key}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      sx={{ wordBreak: "break-all" }}
                    >
                      {v.value}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ minWidth: 180 }}>
            <FormSelectField
              form={downloadForm}
              name="format"
              label="Format"
              items={CONFIG_FORMATS}
            />
          </Box>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
            Download
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Type:{" "}
          <strong>
            {info.payloadType === "ENV_VARIABLES" ? "Environment Variables" : "Secret File"}
          </strong>
        </Typography>
        {info.fileName && (
          <Typography variant="body2" color="text.secondary">
            File: <strong>{info.fileName}</strong>
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Expires: <strong>{new Date(info.expiresAt).toLocaleString()}</strong>
        </Typography>
      </Box>

      <Alert severity="info">
        This is a one-time link. After you access it, the content is permanently destroyed.
      </Alert>

      {info.hasPassword && (
        <>
          <Divider />
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={500}>
              <LockIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
              Password required
            </Typography>
            <TextField
              label="Password"
              type="password"
              size="small"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAccess();
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </>
      )}

      {mutation.isError && <Alert severity="error">{mutation.error?.message}</Alert>}

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={mutation.isPending || (info.hasPassword && !password)}
        onClick={handleAccess}
        startIcon={
          mutation.isPending ? (
            <CircularProgress size={16} color="inherit" />
          ) : info.payloadType === "SECRET_FILE" ? (
            <DownloadIcon />
          ) : (
            <VisibilityIcon />
          )
        }
      >
        {mutation.isPending
          ? "Accessing..."
          : info.payloadType === "SECRET_FILE"
            ? "Download File"
            : "View Secret"}
      </Button>
    </Stack>
  );
}
