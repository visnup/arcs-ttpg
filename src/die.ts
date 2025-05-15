import { refDice, Vector, world } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

// discardable
discardToOrigin(refDice, false, false);

// Add, remove from tray
refDice.onSecondaryAction.add(toggle);

const tray = world.getObjectByTemplateName("tray");
function toggle(obj: typeof refDice) {
  const zone = world.getZoneById(`zone-dice-${tray?.getId()}`);
  if (!zone) return;
  if (zone.isOverlapping(obj)) {
    if ("discard" in obj && typeof obj.discard === "function") obj.discard();
  } else {
    obj.setPosition(
      Vector.randomPointInBoundingBox(
        zone.getPosition().add([0, 0, 1]),
        zone.getScale().multiply(0.2),
      ),
      1.5,
    );
  }
}
