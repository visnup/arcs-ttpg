import { refCard } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

discardToOrigin(refCard, false);

const power = [
  ["53", "32", "20"],
  ["94", "63", "42"],
];
function annotate(card: typeof refCard) {
  if (card.getStackSize() !== 1) return;
  const { index } = card.getCardDetails(0)!;
  const flipped = Math.abs(card.getRotation().roll) > 1;
  card.setSavedData(power[+flipped][index], "power");
}
annotate(refCard);
refCard.onFlipUpright.add(annotate);
