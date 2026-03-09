export const heading = {
  fontSize: "20px",
  fontWeight: 600,
  color: "#1a1a2e",
  lineHeight: "28px",
} as const;

export const paragraph = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#525f7f",
} as const;

export const button = {
  backgroundColor: "#1a1a2e",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
} as const;

export const link = {
  fontSize: "12px",
  color: "#8898aa",
  wordBreak: "break-all" as const,
} as const;

export const muted = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#8898aa",
} as const;

export const highlight = {
  fontWeight: 600,
  color: "#1a1a2e",
} as const;

export const alertBadge = {
  backgroundColor: "#fff1f0",
  border: "1px solid #ffa39e",
  borderRadius: "6px",
  padding: "12px 16px",
  fontSize: "14px",
  color: "#cf1322",
  fontWeight: 600,
} as const;
