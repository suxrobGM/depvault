"use client";

import { useState, type ReactElement } from "react";
import {
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Lock as LockIcon,
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
  TextField,
  Typography,
} from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import { decryptBinary, decrypt as decryptText, shareKeyFromFragment } from "@/lib/crypto";
import type { AccessShareBody, ShareLinkInfoDto } from "@/types/api/share-link";
import { downloadFile } from "@/utils/download-file";

interface ShareAccessViewProps {
  token: string;
  info: ShareLinkInfoDto;
}

/** Local view model after client-side decryption — `text` is never sent by the server. */
interface AccessResult {
  fileName: string;
  mimeType: string;
  /** Decoded text content when the mime type is text-like, otherwise null. */
  text: string | null;
}

/** Text-like mime types are shown inline; everything else is download-only. */
function isTextMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/x-yaml" ||
    mimeType === "application/yaml" ||
    mimeType.endsWith("+json") ||
    mimeType.endsWith("+xml")
  );
}

export function ShareAccessView(props: ShareAccessViewProps): ReactElement {
  const { token, info } = props;

  const [password, setPassword] = useState("");
  const [result, setResult] = useState<AccessResult | null>(null);

  const mutation = useApiMutation(
    (body: AccessShareBody) => client.api.shares({ token }).post(body),
    {
      onSuccess: async (data) => {
        // Derive the share key from the URL fragment (never sent to the server).
        const fragment = window.location.hash.slice(1);
        const shareKey = await shareKeyFromFragment(fragment);

        const fileName = data.fileName ?? "shared-file";
        const mimeType = data.mimeType ?? "application/octet-stream";

        if (isTextMimeType(mimeType)) {
          const text = await decryptText(data.encryptedPayload, data.iv, data.authTag, shareKey);
          setResult({ fileName, mimeType, text });
        } else {
          const fileBuffer = await decryptBinary(
            data.encryptedPayload,
            data.iv,
            data.authTag,
            shareKey,
          );
          downloadFile(fileBuffer, fileName, mimeType);
          setResult({ fileName, mimeType, text: null });
        }
      },
      errorMessage: (err) => err.message ?? "Failed to access file",
    },
  );

  const handleAccess = () => {
    mutation.mutate(info.hasPassword ? { password } : {});
  };

  const handleDownloadText = () => {
    if (!result?.text) {
      return;
    }
    downloadFile(result.text, result.fileName, result.mimeType);
  };

  if (result && result.text === null) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          File downloaded
        </Typography>
        <Typography variant="body1Muted">
          This link has been consumed and is no longer valid.
        </Typography>
      </Box>
    );
  }

  if (result && result.text !== null) {
    return (
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CheckCircleIcon color="success" />
          <Typography variant="h6">File accessed</Typography>
        </Box>
        <Alert severity="warning">
          Save this content now — this link has been destroyed and cannot be accessed again.
        </Alert>
        <Typography variant="body2Muted" sx={{ fontFamily: "monospace" }}>
          {result.fileName}
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            maxHeight: 360,
            overflow: "auto",
            bgcolor: "action.hover",
          }}
        >
          <Typography
            component="pre"
            variant="body2"
            sx={{
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              m: 0,
            }}
          >
            {result.text}
          </Typography>
        </Paper>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadText}
          sx={{ alignSelf: "flex-start" }}
        >
          Download
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        {info.fileName && (
          <Typography variant="body2Muted">
            File: <strong>{info.fileName}</strong>
          </Typography>
        )}
        {info.mimeType && (
          <Typography variant="body2Muted">
            Type: <strong>{info.mimeType}</strong>
          </Typography>
        )}
        <Typography variant="body2Muted">
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
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
          mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />
        }
      >
        {mutation.isPending ? "Accessing..." : "Access File"}
      </Button>
    </Stack>
  );
}
