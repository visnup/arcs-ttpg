import type { Player, TraceHit } from "@tabletop-playground/api";
import {
  Card,
  refCard,
  Vector,
  world,
  type CardDetails,
} from "@tabletop-playground/api";

type N = [number, number, number];
const { z } = world.getObjectById("map")!.getPosition();
const origins = [-8, -4, 0, 4, 8].map((x) => [x, -44, z + 1] as N);
const rotation = [0, -90, 180] as N;

const resources = ["fuel", "material", "weapon", "relic", "psionic"];
// todo: witness tokens on top of resource stack make it templateName = "set-round"
const isResource =
  (i: number) =>
  ({ object }: TraceHit) =>
    object instanceof Card && object.getCardDetails().index === i;
function findSupply(i: number) {
  // Look for a player court card tagged as a resource supply
  for (const zone of world.getAllZones()) {
    if (!zone.getId().startsWith("zone-player-court-")) continue;
    for (const c of zone.getOverlappingObjects())
      if (
        c instanceof Card &&
        c.getStackSize() === 1 &&
        c.getCardDetails().tags.includes(`supply:${resources[i]}`)
      ) {
        // Look for a resource stack on top of it
        const stack = world
          .boxTrace(
            c.getExtentCenter(true, false),
            c.getExtentCenter(true, false).add(new Vector(0, 0, 2)),
            c.getExtent(true, false),
          )
          .find(isResource(i))?.object as Card | undefined;
        if (stack) return stack;
        // Otherwise return the snap point
        const p = c.getSnapPoint(0)?.getGlobalPosition() ?? c.getPosition();
        const { yaw } = c.getRotation();
        return [p.add([0, 0, 1]), [0, yaw, -180] satisfies N] as const;
      }
  }
  // Look for a resource stack on top of origin
  const [x, y, z] = origins[i];
  return (
    (world.lineTrace([x, y, z - 2], [x, y, z + 2]).find(isResource(i))
      ?.object as Card | undefined) ??
    ([[x, y, z] satisfies N, rotation] as const)
  );
}

// Discard to supply
function getIndex(details: CardDetails) {
  const tag = details.tags.find((t) => t.startsWith("resource:"));
  if (!tag) throw new Error("Card is not a resource");
  return resources.indexOf(tag.replace("resource:", ""));
}
function discard(card: Card) {
  const i = getIndex(card.getCardDetails());
  const isHomogenous = (card: Card) =>
    card.getAllCardDetails().every((details) => getIndex(details) === i);
  if (isHomogenous(card)) {
    // If this is a homogenous stack, attempt to discard it
    const supply = findSupply(i);
    if (supply instanceof Card) supply.addCards(card, true, 0, true);
    else {
      card.setPosition(supply[0], 1.5);
      card.setRotation(supply[1], 1.5);
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
