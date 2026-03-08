import type { ReactElement } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function AuthLoading(): ReactElement {
  return <LoadingScreen message="Loading..." />;
}
