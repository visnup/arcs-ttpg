import type { Card, Player, Rotator } from "@tabletop-playground/api";
import { refCard, Vector, world } from "@tabletop-playground/api";

type Origin = { position: Vector; rotation: Rotator };
const origins = ((
  world as typeof world & { _resourceOrigins?: Origin[] }
)._resourceOrigins ??= []);
const { index } = refCard.getCardDetails(0)!;
if (!origins[index]) {
  origins[index] = {
    position: refCard.getPosition(),
    rotation: refCard.getRotation(),
  };
}

// Discard to supply
function discard(card: typeof refCard) {
  const i = card.getCardDetails(0)!.index;
  if (card.getAllCardDetails().every(({ index }) => index === i)) {
    // If this is a homogenous resource, attempt to discard it
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
