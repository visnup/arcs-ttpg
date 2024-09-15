import { refCard, world } from "@tabletop-playground/api";
import { getPlayed } from "./action-deck";

// Discard to origin
const origin = refCard.getPosition();
refCard.onPrimaryAction.add((card) => {
  card.setPosition(origin, 1);
});

// Place ambition declared marker
refCard.onReleased.add((card) => {
  if (card.getSnappedToPoint()) return;
  const declared = world.getObjectByTemplateName("ambition declared");
  const lead = getPlayed()
    .find((d) => d.isFaceUp())
    ?.getSnapPoint(0);
  if (declared && lead) {
    declared.setPosition(lead.getGlobalPosition());
    declared.snap();
  }
});
