"use client";

import type { ReactElement } from "react";
import { Tab, type TabProps } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";

type LinkTabProps = Omit<TabProps<typeof Link>, "component"> & { href: Route };

/** MUI Tab rendered as a Next.js Link. Safe to use from server components. */
export function LinkTab(props: LinkTabProps): ReactElement {
  return <Tab component={Link} {...props} />;
}
