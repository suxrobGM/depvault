import type { ReactElement } from "react";
import { colors } from "./constants";

export function useTypingAnimation(
  frame: number,
  startFrame: number,
  text: string,
  speed = 0.6,
): { charsVisible: number; done: boolean } {
  const charsVisible = Math.max(0, Math.min(Math.floor((frame - startFrame) * speed), text.length));
  return { charsVisible, done: charsVisible >= text.length };
}

interface BlinkingCursorProps {
  frame: number;
  visible?: boolean;
}

export function BlinkingCursor(props: BlinkingCursorProps): ReactElement | null {
  const { frame, visible = true } = props;

  if (!visible) return null;
  const cursorBlink = frame % 30 < 15;
  return <span style={{ color: colors.primary, opacity: cursorBlink ? 1 : 0 }}>{"\u258B"}</span>;
}

// Braille spinner chars matching Spectre.Console Spinner.Known.Dots
const SPINNER_CHARS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SpinnerProps {
  frame: number;
  color?: string;
}

export function Spinner(props: SpinnerProps): ReactElement {
  const { frame, color = colors.primary } = props;
  const char = SPINNER_CHARS[Math.floor(frame / 3) % SPINNER_CHARS.length];
  return <span style={{ color }}>{char}</span>;
}
