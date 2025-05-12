import { globalEvents, refCard } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

// discardable
discardToOrigin(refCard, true, false);

// blight is owned
refCard.setOwningPlayerSlot(4);

// blightkin
refCard.onGrab.add(onAmbitionShouldTally);
refCard.onReleased.add(onAmbitionShouldTally);
refCard.onFlipUpright.add(onAmbitionShouldTally);
function onAmbitionShouldTally() {
  globalEvents.onAmbitionShouldTally.trigger("blightkin");
}
