import { globalEvents, refObject } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

// discardable
discardToOrigin(refObject, true, false);

refObject.onReleased.add(() =>
  globalEvents.onAmbitionShouldTally.trigger("warlord"),
);
