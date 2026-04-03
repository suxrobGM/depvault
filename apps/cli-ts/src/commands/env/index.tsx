import type { ReactElement } from "react";
import listHandler from "./list";

/** Interactive /env — delegates to env list. */
export default async function handler(args: string[]): Promise<ReactElement> {
  return listHandler(args);
}
