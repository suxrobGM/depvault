import type { ReactElement } from "react";
import { Text } from "ink";
import { VERSION } from "@/constants";

export default async function handler(_args: string[]): Promise<ReactElement> {
  return <Text>DepVault CLI v{VERSION}</Text>;
}
