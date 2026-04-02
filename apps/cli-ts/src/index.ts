#!/usr/bin/env bun
import { render } from "ink";
import { createElement } from "react";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // One-shot mode: run the command via Clipanion and exit
    const { createCli } = await import("@/cli");
    const cli = createCli();
    const exitCode = await cli.run(args);
    process.exit(exitCode);
  }

  // REPL mode: launch the interactive Ink app
  const { App } = await import("@/app/app");
  const { waitUntilExit } = render(createElement(App));
  await waitUntilExit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
