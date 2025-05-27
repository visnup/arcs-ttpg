import {
  refPackageId as _refPackageId,
  refCard,
} from "@tabletop-playground/api";

const refPackageId = _refPackageId;

refCard.onFlipUpright.add((card) => {
  if (card.getStackSize() > 1) return;
  if (card.getCardDetails().tags.includes("resource:psionic"))
    if (!card.isFaceUp()) card.setScript("resource.js", refPackageId);
});
