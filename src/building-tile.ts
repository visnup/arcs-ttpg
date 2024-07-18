import { refCard } from "@tabletop-playground/api";

// Set owning player slots by card image index
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);
