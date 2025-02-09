import { refCard } from "@tabletop-playground/api";

// Set owning player slots by card image index
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);

// Primary action flips too
refCard.onPrimaryAction.add(
  (card) => card.getStackSize() === 1 && card.flipOrUpright(),
);
