import {
  refObject as _refObject,
  Card,
  Rotator,
  Vector,
  world,
} from "@tabletop-playground/api";
import type { Ambition, MapBoard } from "./map-board";

const refObject = _refObject;

// Board zone
const p = refObject.getPosition();
const { x, y } = refObject.getSize();
const captivePercent = 0.685;
const zoneId = `zone-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ??
  world.createZone(p.add(new Vector(0, (-y * (1 - captivePercent)) / 2, 0)));
zone.setId(zoneId);
zone.setRotation(refObject.getRotation());
zone.setScale(new Vector(x, y * captivePercent, 8));
zone.onBeginOverlap.add(updateAmbitions);
zone.onEndOverlap.add(updateAmbitions);
// Captives zone
const captiveZoneId = `zone-captive-${refObject.getId()}`;
const captiveZone =
  world.getZoneById(captiveZoneId) ??
  world.createZone(p.add(new Vector(0, (y * captivePercent) / 2, 0)));
captiveZone.setId(captiveZoneId);
captiveZone.setRotation(refObject.getRotation());
captiveZone.setScale(new Vector(x, y * (1 - captivePercent), 8));
captiveZone.onBeginOverlap.add(updateAmbitions);
captiveZone.onEndOverlap.add(updateAmbitions);
// Court zone
const courtZoneHeight = 20;
const courtZoneId = `zone-court-${refObject.getId()}`;
const courtZone =
  world.getZoneById(courtZoneId) ??
  world.createZone(
    p.add(new Vector(Math.sign(p.x) * ((x + courtZoneHeight) / 2), 0, 0)),
  );
courtZone.setId(courtZoneId);
courtZone.setRotation(refObject.getRotation());
courtZone.setScale(new Vector(courtZoneHeight, y * 1.5, 8));
courtZone.onBeginOverlap.add(updateAmbitions);
courtZone.onEndOverlap.add(updateAmbitions);

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
            obj.onDestroyed.clear();
            obj.onDestroyed.add(updateAmbitions);
            ambitions.tycoon += (obj as Card).getStackSize();
            break;
          case "relic":
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

  // Captive agents
  for (const obj of captiveZone.getOverlappingObjects()) {
    if (obj.getOwningPlayerSlot() === refObject.getOwningPlayerSlot()) continue;
    if (obj.getTemplateName() === "agent") ambitions.tyrant++;
  }

  // Court cards, resources
  const courtSuits: (Ambition | undefined)[] = [
    "tycoon",
    "tycoon",
    ,
    "empath",
    "keeper",
  ];
  for (const obj of courtZone.getOverlappingObjects()) {
    switch (obj.getTemplateName()) {
      case "bc": {
        // hack: use the index in the base court deck to infer the resource type
        // 0-9 (0-1): tycoon, 15-19 (3): empath, 20-24 (4): keeper
        const suit =
          courtSuits[Math.floor((obj as Card).getCardDetails().index / 5)];
        if (suit && suit in ambitions) ambitions[suit]++;
        break;
      }
      case "cc": {
        // same hack: but less cards
        // 0-3: tycoon, 6-7: empath, 8-9: keeper
        const suit =
          courtSuits[Math.floor((obj as Card).getCardDetails().index / 2)];
        if (suit && suit in ambitions) ambitions[suit]++;
        break;
      }
      case "resource": {
        switch ((obj as Card).getCardDetails().name) {
          case "fuel":
          case "material":
            obj.onDestroyed.clear();
            obj.onDestroyed.add(updateAmbitions);
            ambitions.tycoon += (obj as Card).getStackSize();
            break;
        }
        break;
      }
      default: {
        if (!(obj instanceof Card)) break;
        const suit = obj.getCardDetails().metadata;
        if (suit && suit in ambitions) ambitions[suit as Ambition]++;
      }
    }
  }

  // Update the ambitions on the map
  const map = world.getObjectById("map")! as MapBoard;
  for (const [ambition, count] of Object.entries(ambitions))
    map.ambitions[ambition as Ambition].setScore(
      refObject.getOwningPlayerSlot(),
      count,
    );
}
