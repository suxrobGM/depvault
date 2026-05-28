import { useCallback, useState, type ReactElement } from "react";
import { Box, Skeleton } from "@mui/material";

export function DemoVideo(): ReactElement {
  const [loaded, setLoaded] = useState(false);

  const videoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    if (el && el.readyState >= 3) {
      setLoaded(true);
    }
  }, []);

  return (
    <Box
      className="vault-fade-up vault-delay-3"
      sx={{
        maxWidth: 960,
        mx: "auto",
        borderRadius: 2,
        overflow: "hidden",
        border: 1,
        borderColor: "vault.glassBorder",
        position: "relative",
        zIndex: 1,
        boxShadow: "0 30px 60px rgba(0,0,0,0.4), 0 0 40px rgba(16,185,129,0.08)",
        aspectRatio: "16 / 9",
      }}
    >
      {!loaded && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}
      <video
        ref={videoRefCallback}
        src="/depvault-demo.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
    </Box>
  );
}
