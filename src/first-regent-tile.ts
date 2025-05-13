import { globalEvents, refObject } from "@tabletop-playground/api";

refObject.onMovementStopped.add(() => {
  globalEvents.onAmbitionShouldTally.trigger("edenguard");
  globalEvents.onAmbitionShouldTally.trigger("blightkin");
});
