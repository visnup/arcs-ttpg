import {
  Card,
  CardHolder,
  Vector,
  refObject as _refObject,
  world,
} from "@tabletop-playground/api";
import type { Ambition, MapBoard } from "./map-board";
const refObject = _refObject;

// Detection zone
const { x, y } = refObject.getSize();
const captivePercent = 0.735;
const zoneId = `zone-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ??
  world.createZone(
    refObject
      .getPosition()
      .add(new Vector(0, (-y * (1 - captivePercent)) / 2, 0)),
  );
zone.setId(zoneId);
zone.setRotation(refObject.getRotation());
zone.setScale(new Vector(x, y * captivePercent, 20));
zone.onBeginOverlap.add(updateAmbitions);
zone.onEndOverlap.add(updateAmbitions);
// Captives zone
const captiveZoneId = `captive-zone-${refObject.getId()}`;
const captiveZone =
  world.getZoneById(captiveZoneId) ??
  world.createZone(
    refObject.getPosition().add(new Vector(0, (y * captivePercent) / 2, 0)),
  );
captiveZone.setId(captiveZoneId);
captiveZone.setRotation(refObject.getRotation());
captiveZone.setScale(new Vector(x, y * (1 - captivePercent), 20));
captiveZone.onBeginOverlap.add(updateAmbitions);
captiveZone.onEndOverlap.add(updateAmbitions);

// Card holders
const holders = world
  .getAllObjects()
  .filter(
    (obj) =>
      obj instanceof CardHolder &&
      !obj.getOnlyOwnerTakesCards() &&
      obj.getOwningPlayerSlot() === refObject.getOwningPlayerSlot(),
  ) as CardHolder[];
for (const holder of holders) {
  holder.onCardFlipped.add(updateAmbitions);
  holder.onInserted.add(updateAmbitions);
  holder.onRemoved.add(updateAmbitions);
}

const courtSuits: (Ambition | undefined)[] = [
  "tycoon",
  "tycoon",
  ,
  "empath",
  "keeper",
];
function getHolderAmbitions(holder: CardHolder) {
  const ambitions = { tycoon: 0, tyrant: 0, warlord: 0, keeper: 0, empath: 0 };
  for (const card of holder.getCards()) {
    // hack: use the index in the base court deck to infer the resource type
    // 0-9 (0-1): tycoon, 15-19 (3): empath, 20-24 (4): keeper
    if (holder.isCardFaceUp(card)) {
      const suit = courtSuits[Math.floor(card.getCardDetails().index / 5)];
      if (suit && suit in ambitions) ambitions[suit]++;
    }
  }
  return new Map(Object.entries(ambitions) as [Ambition, number][]);
}

function updateAmbitions() {
  const ambitions = { tycoon: 0, tyrant: 0, warlord: 0, keeper: 0, empath: 0 };

  // Resources, ships, agents, buildings
  for (const obj of zone.getOverlappingObjects()) {
    if (obj.getOwningPlayerSlot() === refObject.getOwningPlayerSlot()) continue;
    switch (obj.getTemplateName()) {
      case "resource":
        switch ((obj as Card).getCardDetails().name) {
          case "fuel":
          case "material":
            ambitions.tycoon++;
            break;
          case "relics":
            ambitions.keeper++;
            break;
          case "psionic":
            ambitions.empath++;
            break;
        }
        break;
      case "city":
      case "starport":
        obj.onDestroyed.clear();
        obj.onDestroyed.add(updateAmbitions);
        ambitions.warlord += (obj as Card).getStackSize();
        break;
      case "agent":
      case "ship":
        ambitions.warlord++;
        break;
    }
  }
  for (const obj of captiveZone.getOverlappingObjects()) {
    if (obj.getOwningPlayerSlot() === refObject.getOwningPlayerSlot()) continue;
    if (obj.getTemplateName() === "agent") ambitions.tyrant++;
  }

  // Court cards
  for (const court of holders)
    for (const [ambition, count] of getHolderAmbitions(court))
      ambitions[ambition] += count;

  // Update the ambitions on the map
  const map = world.getObjectById("map")! as MapBoard;
  for (const [ambition, count] of Object.entries(ambitions))
    map.ambitions[ambition as Ambition].setScore(
      refObject.getOwningPlayerSlot(),
      count,
    );
}
