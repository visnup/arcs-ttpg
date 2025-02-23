import { refCard } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

// Set owning player slots by card image index
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);

// discardable
discardToOrigin(refCard, true, false);

// Primary action flips too
refCard.onPrimaryAction.add(
  (card) => card.getStackSize() === 1 && card.flipOrUpright(),
);
