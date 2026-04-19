"use client";

import { useState, type ReactElement } from "react";
import { Download as DownloadIcon, SwapHoriz as SwapIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  CardContent,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import { CopyButton, FileUploadButton, type FileUploadResult } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";
import type { ConvertResult } from "@/types/api/convert";
import { downloadFile } from "@/utils/download-file";
import { CONFIG_FORMATS, type ConfigFormat } from "./schemas";

function firstAvailableFormat(exclude: ConfigFormat): ConfigFormat {
  return CONFIG_FORMATS.find((f) => f.value !== exclude)!.value;
}

function getDownloadFileName(format: ConfigFormat): string {
  if (format === "env") return ".env";
  return format;
}

export function ConverterView(): ReactElement {
  const notification = useToast();
  const [content, setContent] = useState("");
  const [fromFormat, setFromFormat] = useState<ConfigFormat>("env");
  const [toFormat, setToFormat] = useState<ConfigFormat>("appsettings.json");
  const [result, setResult] = useState<ConvertResult | null>(null);

  const mutation = useApiMutation(
    (values: { content: string; fromFormat: ConfigFormat; toFormat: ConfigFormat }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.api.convert.post(values as any),
    {
      onSuccess: (data) => {
        setResult(data);
        notification.success(`Converted ${data?.entryCount ?? 0} entries successfully`);
      },
      onError: () => {
        notification.error("Conversion failed. Check your input format.");
      },
    },
  );

  const handleFromFormatChange = (value: ConfigFormat) => {
    setFromFormat(value);
    if (toFormat === value) setToFormat(firstAvailableFormat(value));
    setResult(null);
  };

  const handleToFormatChange = (value: ConfigFormat) => {
    setToFormat(value);
    if (fromFormat === value) setFromFormat(firstAvailableFormat(value));
    setResult(null);
  };

  const handleConvert = () => {
    if (!content.trim()) {
      notification.error("Please provide content to convert");
      return;
    }
    mutation.mutate({ content, fromFormat, toFormat });
  };

  const handleSwapFormats = () => {
    setFromFormat(toFormat);
    setToFormat(fromFormat);
    if (result) {
      setContent(result.content);
      setResult(null);
    }
  };

  const handleFileRead = (result: FileUploadResult) => {
    if (result.detectedFormat) {
      setFromFormat(result.detectedFormat);
      if (toFormat === result.detectedFormat) {
        setToFormat(firstAvailableFormat(result.detectedFormat));
      }
    }
    setContent(result.content);
    setResult(null);
  };

  const handleDownload = () => {
    if (!result) return;
    downloadFile(result.content, getDownloadFileName(toFormat));
  };

  const handleClear = () => {
    setContent("");
    setResult(null);
  };

  const canConvert = content.trim().length > 0 && fromFormat !== toFormat && !mutation.isPending;

  return (
    <Grid
      container
      spacing={3}
      sx={{
        alignItems: "stretch",
      }}
    >
      {/* Input Panel */}
      <Grid size={{ xs: 12, md: 5.5 }}>
        <GlassCard className="vault-fade-up vault-delay-1" sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                }}
              >
                Input
              </Typography>
              <TextField
                select
                size="small"
                value={fromFormat}
                onChange={(e) => handleFromFormatChange(e.target.value as ConfigFormat)}
                sx={{ minWidth: 160 }}
              >
                {CONFIG_FORMATS.filter((f) => f.value !== toFormat).map((f) => (
                  <MenuItem key={f.value} value={f.value}>
                    {f.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <FileUploadButton onFileRead={handleFileRead} sx={{ mb: 1.5 }} />

            <TextField
              multiline
              rows={14}
              fullWidth
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setResult(null);
              }}
              placeholder="Paste your config content here or upload a file"
              sx={{ flex: 1, mb: 2 }}
            />

            <Stack
              direction="row"
              spacing={1}
              sx={{
                justifyContent: "flex-end",
              }}
            >
              <Button variant="outlined" onClick={handleClear} disabled={!content}>
                Clear
              </Button>
              <Button variant="contained" onClick={handleConvert} disabled={!canConvert}>
                {mutation.isPending ? "Converting..." : "Convert"}
              </Button>
            </Stack>
          </CardContent>
        </GlassCard>
      </Grid>
      {/* Swap Button */}
      <Grid
        size={{ xs: 12, md: 1 }}
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Tooltip title="Swap formats">
          <IconButton
            onClick={handleSwapFormats}
            sx={{
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <SwapIcon
              sx={{
                transform: { xs: "rotate(90deg)", md: "rotate(0deg)" },
              }}
            />
          </IconButton>
        </Tooltip>
      </Grid>
      {/* Output Panel */}
      <Grid size={{ xs: 12, md: 5.5 }}>
        <GlassCard className="vault-fade-up vault-delay-2" sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                }}
              >
                Output
              </Typography>
              <TextField
                select
                size="small"
                value={toFormat}
                onChange={(e) => handleToFormatChange(e.target.value as ConfigFormat)}
                sx={{ minWidth: 160 }}
              >
                {CONFIG_FORMATS.filter((f) => f.value !== fromFormat).map((f) => (
                  <MenuItem key={f.value} value={f.value}>
                    {f.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box sx={{ mb: 1.5, height: 32 }} />

            <TextField
              multiline
              rows={14}
              fullWidth
              value={result?.content ?? ""}
              placeholder="Converted output will appear here"
              slotProps={{ input: { readOnly: true } }}
              sx={{ flex: 1, mb: 2 }}
            />

            <Stack
              direction="row"
              spacing={1}
              sx={{
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {result && (
                <>
                  <Chip
                    label={`${result.entryCount} ${result.entryCount === 1 ? "entry" : "entries"}`}
                    size="small"
                    variant="outlined"
                    sx={{ mr: "auto" }}
                  />
                  <CopyButton value={result.content} />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                  >
                    Download
                  </Button>
                </>
              )}
            </Stack>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );
}
