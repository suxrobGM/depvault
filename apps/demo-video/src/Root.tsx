import type { ReactElement } from "react";
import "./index.css";
import { Composition } from "remotion";
import { DepVaultDemo } from "./DepVaultDemo";

export function RemotionRoot(): ReactElement {
  return (
    <Composition
      id="DepVaultDemo"
      component={DepVaultDemo}
      durationInFrames={1620}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
