import type { Card, Player } from "@tabletop-playground/api";
import { refCard, Vector, world } from "@tabletop-playground/api";

// Discard to supply
function discard(card: typeof refCard) {
  const { index: i, name } = card.getCardDetails(0)!;
  const isHomogenous = (card: Card) =>
    card.getAllCardDetails().every(({ index }) => index === i);
  if (isHomogenous(card)) {
    // If this is a homogenous stack, attempt to discard it
    const supply = world
      .getObjectsByTemplateName<Card>("supply")
      .find((d) => d.getTags().includes(`supply:${name}`));
    const deck = supply?.getSnapPoint(0)?.getSnappedObject() as
      | Card
      | undefined;
    if (deck) deck.addCards(card, false, 0, true);
    else if (supply) {
      card.setPosition(supply.getPosition().add([0, 0, 0.5]), 1.5);
      card.snap();
    }
  } else {
    // Otherwise, call discard on each item in the stack
    while (card.getStackSize() > 1) discard(card.takeCards(1)!);
    discard(card);
  }
}

// Draw to player board
function draw(card: Card, player: Player, number: number) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === player.getSlot());
  if (!board) return;
  const snaps = board
    .getAllSnapPoints()
    .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y);
  const city =
    snaps
      .filter((d) => d.getTags().includes("building"))[2]
      ?.getSnappedObject()
      ?.getTemplateName() === "city";
  const resources = snaps
    .filter((d) => d.getTags().includes("resource"))
    .filter((d, i) => !d.getSnappedObject() && ((i !== 4 && i !== 5) || !city));
  const n = Math.min(number, card.getStackSize());
  for (let i = 0; i < n; i++) {
    if (!resources[i]) return;
    const resource = card.getStackSize() > 1 ? card.takeCards(1)! : card;
    resource.setPosition(
      resources[i].getGlobalPosition().add(new Vector(0, 0, 0.1)),
      1.5,
    );
    resource.snap();
  }
}

refCard.onPrimaryAction.add(discard);
refCard.onNumberAction.add(draw);
refCard.onCustomAction.add(discard);
refCard.addCustomAction(
  "Discard to Supply",
  "Discard this resource to its supply",
);

Object.assign(refCard, {
  discard: function (this: typeof refCard) {
    discard(this);
  },
});
