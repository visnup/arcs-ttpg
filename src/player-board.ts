import {
  Card,
  CardHolder,
  Vector,
  refObject,
  world,
} from "@tabletop-playground/api";
import type { Ambition, MapBoard } from "./map-board";
import { PlayerCourtHolder } from "./player-court-holder";

// Setup zone
const zoneId = `zone-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ?? world.createZone(refObject.getPosition());
zone.setId(zoneId);
zone.setRotation(refObject.getRotation());
zone.setScale(refObject.getSize().add(new Vector(0, 0, 20)));
zone.onBeginOverlap.add(updateAmbitions);
zone.onEndOverlap.add(updateAmbitions);

// Card holders
let _holders: CardHolder[] | undefined;
function getHolders() {
  return (_holders ??= world
    .getAllObjects()
    .filter(
      (obj) =>
        obj.getTemplateName() === "player cards" &&
        obj.getOwningPlayerSlot() === refObject.getOwningPlayerSlot(),
    ) as CardHolder[]);
}
for (const holder of getHolders()) {
  holder.onCardFlipped.add(updateAmbitions);
  holder.onInserted.add(updateAmbitions);
  holder.onRemoved.add(updateAmbitions);
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
      case "agent":
        // todo fix for tyrant
        const position = obj.getPosition().subtract(refObject.getPosition());
        const captive = position[1] / refObject.getSize()[1] >= 0.25;
        if (captive) ambitions.tyrant++;
        else ambitions.warlord++;
        break;
      case "city":
      case "ship":
      case "starport":
        ambitions.warlord++;
        break;
    }
  }

  // Court cards
  for (const court of getHolders())
    if ("getAmbitions" in court)
      for (const [ambition, count] of Object.entries(
        (court as PlayerCourtHolder).getAmbitions(),
      ))
        ambitions[ambition as Ambition] += count;

  // Update the ambitions on the map
  const map = world.getObjectById("map")! as MapBoard;
  for (const [ambition, count] of Object.entries(ambitions))
    map.ambitions[ambition as Ambition].setScore(
      refObject.getOwningPlayerSlot(),
      count,
    );
}
