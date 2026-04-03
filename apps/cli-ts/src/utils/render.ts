import type { ReactElement } from "react";

export type CommandHandler = (args: string[]) => Promise<ReactElement>;

/**
 * Render a command handler's ReactElement result to stdout (used by Clipanion one-shot commands).
 *
 * @param stdout The writable stream to render to (e.g. process.stdout)
 * @param handler The command handler function to execute and render
 * @param args The arguments to pass to the handler
 * */
export async function renderResult(
  stdout: NodeJS.WritableStream,
  handler: CommandHandler,
  args: string[] = [],
): Promise<void> {
  const result = await handler(args);
  if (result) {
    const { renderToString } = await import("ink");
    stdout.write(renderToString(result) + "\n");
  }
}
