import { refCard } from "@tabletop-playground/api";

// Card image index matches player slot
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);
