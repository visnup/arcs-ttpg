import { refCard } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

// Set owning player slots by card image index
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);

if (refCard.getStackSize() === 1) {
  // Primary action flips too
  refCard.onPrimaryAction.add((card) => card.flipOrUpright());
  discardToOrigin(refCard, true, false);
}
