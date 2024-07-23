import { refCard, world } from "@tabletop-playground/api";
import type { InitiativeMarker } from "./initiative-marker";

refCard.addCustomAction("Shuffle and deal");
refCard.addCustomAction("Draw from bottom");

refCard.onCustomAction.add((card, player, identifier) => {
  switch (identifier) {
    case "Shuffle and deal":
      card.shuffle();
      card.deal(6);
      (world.getObjectById("initiative") as InitiativeMarker)?.stand();
      break;
    case "Draw from bottom":
      card.moveCardInStack(0, card.getStackSize() - 1);
      card.deal(1, [player.getSlot()]);
      break;
  }
});
