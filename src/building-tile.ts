import { refCard } from "@tabletop-playground/api";

// Set owning player slots by card image index
refCard.setOwningPlayerSlot(refCard.getCardDetails().index);

if (refCard.getStackSize() === 1) {
  refCard.onPrimaryAction.add(toggle);
  refCard.onCustomAction.add(toggle);
  refCard.addCustomAction(
    "Toggle Damage",
    "Toggle building damage from fresh to damaged or back",
  );
}

function toggle(card: typeof refCard) {
  card.flipOrUpright();
}
