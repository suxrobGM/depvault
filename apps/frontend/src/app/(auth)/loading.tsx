import type { ReactElement } from "react";
import { LoadingScreen } from "@/components/ui/feedback";

export default function AuthLoading(): ReactElement {
  return <LoadingScreen message="Loading..." />;
}
