import { useState, type ReactElement, type ReactNode } from "react";
import { Box, Text, useApp } from "ink";
import { loadConfig } from "@/services/config";
import { loadCredentials } from "@/services/credentials";
import { Banner } from "@/ui/banner";
import { ErrorBox } from "@/ui/error-box";
import { CommandArea, type CommandOutput } from "./command-area";
import { CommandInput } from "./command-input";
import { COMMANDS, isKnownSubcommand, parseCommand, resolveCommand } from "./command-router";
import { useVault, VaultProvider } from "./vault-context";

function AppInner(): ReactElement {
  const { exit } = useApp();
  const vault = useVault();
  const [outputs, setOutputs] = useState<CommandOutput[]>([]);
  const [running, setRunning] = useState(false);
  const [nextId, setNextId] = useState(1);

  const creds = loadCredentials();
  const config = loadConfig();

  const addOutput = (command: string, content: ReactNode) => {
    setOutputs((prev) => [...prev, { id: nextId, command, content }]);
    setNextId((n) => n + 1);
  };

  const handleCommand = async (input: string) => {
    vault.resetIdleTimer();
    const parsed = parseCommand(input);

    if (!parsed) {
      addOutput(input, <ErrorBox message="Commands must start with /" />);
      return;
    }

    const { command, args } = resolveCommand(parsed);

    if (!(command in COMMANDS) && !isKnownSubcommand(command)) {
      addOutput(command, <ErrorBox message={`Unknown command: /${command}`} />);
      return;
    }

    if (command === "exit" || command === "quit" || command === "q") {
      exit();
      return;
    }

    if (command === "help") {
      addOutput(
        "help",
        <Box flexDirection="column">
          {Object.entries(COMMANDS).map(([name, meta]) => (
            <Box key={name} gap={2}>
              <Box width={20}>
                <Text color="#10B981">/{name}</Text>
              </Box>
              <Text color="#6b7280">{meta.description}</Text>
            </Box>
          ))}
        </Box>,
      );
      return;
    }

    setRunning(true);

    try {
      const { executeCommand } = await import("@/commands/execute");
      const result = await executeCommand(command, args);
      if (result.kek) vault.unlock(result.kek);
      if (result.lock) vault.lock();
      addOutput(command, result.element);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addOutput(command, <ErrorBox message={message} />);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box flexDirection="column">
      <Banner
        email={creds?.email}
        vaultLocked={!vault.isUnlocked}
        projectName={config.activeProjectName}
      />
      <CommandArea outputs={outputs} />
      <Box marginTop={1}>
        <CommandInput onSubmit={handleCommand} disabled={running} />
      </Box>
    </Box>
  );
}

export function App(): ReactElement {
  return (
    <VaultProvider>
      <AppInner />
    </VaultProvider>
  );
}
