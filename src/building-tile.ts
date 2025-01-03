import { refCard } from "@tabletop-playground/api";

// Set owning player slots by card image index
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);

// Primary action flips too
if (refCard.getStackSize() === 1)
  refCard.onPrimaryAction.add((card) => card.flipOrUpright());
