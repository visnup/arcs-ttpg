import { refCard } from "@tabletop-playground/api";

// Set owning player slots by card image index
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);

refCard.onPrimaryAction.add(toggle);
refCard.onCustomAction.add(toggle);
refCard.addCustomAction(
  "Toggle damage",
  "Toggle building damage from fresh to damaged or back",
);

function toggle(card: typeof refCard) {
  card.flipOrUpright();
}
