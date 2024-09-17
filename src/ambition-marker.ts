import { refCard } from "@tabletop-playground/api";

// Discard to origin
const origin = refCard.getPosition();
refCard.onPrimaryAction.add((card) => {
  card.setPosition(origin, 1.5);
});
