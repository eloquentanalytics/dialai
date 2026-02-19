import type { ScreenProps } from "../machines/types.js";
import { HanoiScreen } from "./HanoiScreen.js";
import { RiverCrossingScreen } from "./RiverCrossingScreen.js";

export const screenRegistry: Record<string, React.ComponentType<ScreenProps>> = {
  hanoi: HanoiScreen,
  "river-crossing": RiverCrossingScreen,
};
