import { globalEvents, refCard } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

// discardable
discardToOrigin(refCard, true, false);

// blight is owned
refCard.setOwningPlayerSlot(4);

// blightkin
refCard.onMovementStopped.add(() =>
  globalEvents.onAmbitionShouldTally.trigger("blightkin"),
);
