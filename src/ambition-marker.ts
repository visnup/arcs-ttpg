import { refCard, world } from "@tabletop-playground/api";

// Discard to origin
const { position } = world.getOrigin(refCard);
refCard.onPrimaryAction.add((card) => {
  card.setPosition(position, 1.5);
});
