"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactElement,
} from "react";
import { CloudUpload as UploadIcon } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";
import { getCroppedImg } from "./crop-utils";

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string) => void;
}

export function AvatarUploader(props: AvatarUploaderProps): ReactElement {
  const { currentAvatarUrl, onAvatarChange } = props;
  const notification = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const url = previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      notification.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notification.error("Image must be under 5 MB");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setDialogOpen(true);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleCropComplete = (_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleUpload = async () => {
    if (!previewUrl || !croppedAreaPixels) return;

    setUploading(true);
    try {
      const blob = await getCroppedImg(previewUrl, croppedAreaPixels);
      const file = new File([blob], "avatar.webp", { type: "image/webp" });

      const { data, error } = await client.api.users.me.avatar.post({ file });

      if (error) {
        throw new Error(error.value?.message ?? "Upload failed");
      }

      onAvatarChange(data.avatarUrl);
      notification.success("Avatar updated");
      handleCloseDialog();
    } catch (err) {
      notification.error(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    if (previewUrl) {
      setPreviewUrl(null);
    }
  };

  return (
    <>
      <Stack
        spacing={2}
        sx={{
          alignItems: "center",
        }}
      >
        <Avatar
          src={currentAvatarUrl ?? undefined}
          sx={{ width: 120, height: 120, fontSize: 40, cursor: "pointer" }}
          onClick={() => fileInputRef.current?.click()}
        />

        <Box
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            width: "100%",
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.2s",
            "&:hover": { borderColor: "primary.main" },
          }}
        >
          <UploadIcon sx={{ color: "text.secondary", fontSize: 32, mb: 0.5 }} />
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Drop an image here or click to upload
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
            }}
          >
            JPG, PNG, GIF, or WebP · Max 5 MB
          </Typography>
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={handleInputChange}
        />
      </Stack>
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Crop Avatar</DialogTitle>
        <DialogContent>
          <Box sx={{ position: "relative", width: "100%", height: 350 }}>
            {previewUrl && (
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            )}
          </Box>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              mt: 2,
              px: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              Zoom
            </Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(_, value) => setZoom(value as number)}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Save Avatar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
