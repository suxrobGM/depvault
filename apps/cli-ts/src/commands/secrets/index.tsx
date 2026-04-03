import type { ReactElement } from "react";
import listHandler from "./list";

/** Interactive /secrets — delegates to secrets list. */
export default async function handler(args: string[]): Promise<ReactElement> {
  return listHandler(args);
}
