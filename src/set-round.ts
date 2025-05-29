import {
  refPackageId as _refPackageId,
  refCard,
  type Card,
} from "@tabletop-playground/api";

const refPackageId = _refPackageId;

refCard.onFlipUpright.add(canBecomeResource);
export type TestableCard = Card & {
  onFlipUpright: { trigger: typeof canBecomeResource };
};
(refCard as TestableCard).onFlipUpright.trigger = canBecomeResource;

function canBecomeResource(card: Card) {
  if (card.getStackSize() > 1) return;
  if (card.getCardDetails().tags.includes("resource:psionic"))
    if (!card.isFaceUp()) card.setScript("resource.js", refPackageId);
}
