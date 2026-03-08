"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Box } from "@mui/material";

interface TypingEffectProps {
  words: string[];
  interval?: number;
}

export function TypingEffect(props: TypingEffectProps): ReactElement {
  const { words, interval = 2500 } = props;
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const word = words[index] ?? "";

    if (typing) {
      if (displayed.length < word.length) {
        const timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 60);
        return () => clearTimeout(timeout);
      }
      const pause = setTimeout(() => setTyping(false), interval);
      return () => clearTimeout(pause);
    }

    const next = displayed.slice(0, -1);

    const timeout = setTimeout(() => {
      setDisplayed(next);
      if (next.length === 0) {
        setIndex((i) => (i + 1) % words.length);
        setTyping(true);
      }
    }, 30);
    return () => clearTimeout(timeout);
  }, [displayed, typing, index, words, interval]);

  return (
    <Box
      component="span"
      aria-label={words.join(", ")}
      aria-live="polite"
      sx={{
        fontFamily: "var(--font-jetbrains), monospace",
        color: "primary.main",
      }}
    >
      {displayed}
      <Box
        component="span"
        sx={{
          display: "inline-block",
          width: "2px",
          height: "1em",
          bgcolor: "primary.main",
          ml: 0.25,
          verticalAlign: "text-bottom",
          animation: "typingCursor 0.7s step-end infinite",
        }}
      />
    </Box>
  );
}
