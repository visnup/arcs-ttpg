import {
  Card,
  refCard,
  Rotator,
  Vector,
  world,
} from "@tabletop-playground/api";

const origins: { position: Vector; rotation: Rotator }[] = ((
  world as any
)._resourceOrigins ??= []);

const { index } = refCard.getCardDetails(0)!;
if (!origins[index]) {
  origins[index] = {
    position: refCard.getPosition(),
    rotation: refCard.getRotation(),
  };
}
function discard(card: typeof refCard) {
  const i = card.getCardDetails(0)!.index;
  if (card.getAllCardDetails().every(({ index }) => index === i)) {
    // If this is a single resource, attempt to discard it
    const supply = world
      .getObjectsByTemplateName<Card>("resource")
      .find(
        (d) =>
          d !== card &&
          world.isOnTable(d, ["bc"]) &&
          d.getAllCardDetails().every(({ index }) => index === i),
      );
    if (supply) supply.addCards(card, false, 0, true);
    else {
      card.setPosition(origins[i].position, 1);
      card.setRotation(origins[i].rotation, 1);
    }
  } else {
    // Otherwise, call discard on each item in the stack
    while (card.getStackSize() > 1) discard(card.takeCards(1)!);
    discard(card);
  }
}

refCard.onPrimaryAction.add(discard);
refCard.onCustomAction.add(discard);
refCard.addCustomAction(
  "Discard to Supply",
  "Discard this resource to its supply",
);

(refCard as any).discard = function (this: typeof refCard) {
  discard(this);
};
