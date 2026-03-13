"use client";

import type { ReactElement } from "react";
import { Button, type ButtonProps } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";

type LinkButtonProps = Omit<ButtonProps<typeof Link>, "component"> & { href: Route };

/** MUI Button rendered as a Next.js Link. Safe to use from server components. */
export function LinkButton(props: LinkButtonProps): ReactElement {
  return <Button component={Link} {...props} />;
}
