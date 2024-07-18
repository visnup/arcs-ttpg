import { refHolder } from "@tabletop-playground/api";

refHolder.onInserted.add((holder, card, player, inserted) => {
  if (holder.getOnlyOwnerTakesCards()) {
    // hand: todo sort action cards
  } else {
    // court: ensure correct orientation
    if (Math.abs(card.getRotation().yaw) > 90) holder.rotateCard(card);
  }
});
