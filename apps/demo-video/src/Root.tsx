import "./index.css";
import { Composition } from "remotion";
import { DepVaultDemo } from "./DepVaultDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DepVaultDemo"
      component={DepVaultDemo}
      durationInFrames={750}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
