import type { PropsWithChildren, ReactElement } from "react";
import { QueryProvider } from "@/providers";

export default function SharedSecretLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return <QueryProvider>{children}</QueryProvider>;
}
