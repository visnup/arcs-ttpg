import {
  refObject as _refObject,
  Card,
  globalEvents,
  Vector,
  world,
  ZonePermission,
} from "@tabletop-playground/api";
import type { GameObject, Zone } from "@tabletop-playground/api";
import { localSnaps } from "./lib/local-snaps";
import type { Ambition } from "./map-board";

const refObject = _refObject;

localSnaps(refObject);

// globalEvents
globalEvents.onAmbitionShouldTally.add(updateAmbitions);
refObject.onDestroyed.add(() =>
  globalEvents.onAmbitionShouldTally.remove(updateAmbitions),
);

// Board zone
const p = refObject.getPosition();
const { x, y } = refObject.getSize();
const captivePercent = 0.685;
const zoneId = `zone-player-${refObject.getId()}`;
const zone = world.getZoneById(zoneId) ?? world.createZone(p);
zone.setId(zoneId);
zone.setPosition(p.add([0, 0.6 - y * (1 - captivePercent), 0]));
zone.setRotation(refObject.getRotation());
zone.setScale([x, y - 1.2, 8]);
zone.setStacking(ZonePermission.Nobody);
zone.onBeginOverlap.add(updateAmbitions);
zone.onEndOverlap.add(updateAmbitions);
refObject.onDestroyed.add(() => zone.destroy());
// Captives zone
const captiveZoneId = `zone-player-captive-${refObject.getId()}`;
const captiveZone = world.getZoneById(captiveZoneId) ?? world.createZone(p);
captiveZone.setId(captiveZoneId);
captiveZone.setPosition(p.add([0, (y * captivePercent) / 2, 0]));
captiveZone.setRotation(refObject.getRotation());
captiveZone.setScale(new Vector(x, y * (1 - captivePercent), 8));
captiveZone.onBeginOverlap.add(updateAmbitions);
captiveZone.onEndOverlap.add(updateAmbitions);
refObject.onDestroyed.add(() => captiveZone.destroy());
// Court zone
const courtZoneHeight = 20;
const courtZoneId = `zone-player-court-${refObject.getId()}`;
const courtZone = world.getZoneById(courtZoneId) ?? world.createZone(p);
courtZone.setId(courtZoneId);
courtZone.setPosition(
  p.add(new Vector(Math.sign(p.x) * ((x + courtZoneHeight) / 2), 0, 0)),
);
courtZone.setRotation(refObject.getRotation());
courtZone.setScale(new Vector(courtZoneHeight, y * 1.55, 8));
courtZone.onBeginOverlap.add(maybeRotateCard);
courtZone.onBeginOverlap.add(updateAmbitions);
courtZone.onEndOverlap.add(updateAmbitions);
refObject.onDestroyed.add(() => courtZone.destroy());

const registered = new WeakSet<GameObject>();
function maybeRotateCard(zone: Zone, obj: GameObject) {
  if (
    !registered.has(obj) &&
    obj instanceof Card &&
    obj.getSize().x >= 8 &&
    obj.getSize().y >= 6
  ) {
    obj.onReleased.add(() => {
      if (zone.isOverlapping(obj)) {
        const { pitch, roll } = obj.getRotation();
        obj.setRotation([pitch, 0, roll], 1.5);
      }
    });
    registered.add(obj);
  }
  // Bug workaround: make sure card is intersecting zone after checking getSize
  obj.setPosition(obj.getPosition().add(new Vector(0, 0, 0.1)));
}

function updateAmbitions() {
  const ambitions = { tycoon: 0, tyrant: 0, warlord: 0, keeper: 0, empath: 0 };
  const warProfiteer = world
    .getZoneById("zone-ambition-2")
    ?.getOverlappingObjects()
    .some(
      (d) =>
        d instanceof Card &&
        d.getStackSize() === 1 &&
        d.getCardDetails().name === "War Profiteer",
    );

  // Resources, ships, agents, buildings
  for (const obj of zone.getOverlappingObjects()) {
    if (obj.getOwningPlayerSlot() === refObject.getOwningPlayerSlot()) continue;
    process.nextTick(() => !obj.getId() && updateAmbitions());
    switch (obj.getTemplateName()) {
      case "resource":
        switch ((obj as Card).getCardDetails().name) {
          case "fuel":
          case "material":
            ambitions.tycoon += (obj as Card).getStackSize();
            break;
          case "weapon":
            if (warProfiteer) ambitions.warlord += (obj as Card).getStackSize();
            break;
          case "relic":
            ambitions.keeper += (obj as Card).getStackSize();
            break;
          case "psionic":
            ambitions.empath += (obj as Card).getStackSize();
            break;
        }
        break;
      case "set-round":
        // check for blight, if so fall through and treat as building
        if (
          (obj as Card)
            .getAllCardDetails()
            .some(({ metadata }) => metadata !== "blight")
        )
          break;
      // eslint-disable-next-line no-fallthrough
      case "city":
      case "starport":
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
  const p = world
    .getObjectsByTemplateName<Card>("f04")
    .some(
      (d) =>
        d.getStackSize() === 1 &&
        d.getCardDetails().name.startsWith("Guild Supremacy"),
    )
    ? 2
    : 1;
  const courtSuits: (Ambition | undefined)[] = [
    "tycoon",
    "tycoon",
    warProfiteer ? "warlord" : undefined,
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
        if (suit && suit in ambitions) ambitions[suit] += p;
        break;
      }
      case "cc": {
        // same hack: but less cards
        // 0-3: tycoon, 6-7: empath, 8-9: keeper
        const suit =
          courtSuits[Math.floor((obj as Card).getCardDetails().index / 2)];
        if (suit && suit in ambitions) ambitions[suit] += p;
        break;
      }
      case "resource": {
        process.nextTick(() => !obj.getId() && updateAmbitions());
        switch ((obj as Card).getCardDetails().name) {
          case "fuel":
          case "material":
            ambitions.tycoon += (obj as Card).getStackSize();
            break;
          case "weapon":
            if (warProfiteer) ambitions.warlord += (obj as Card).getStackSize();
            break;
          case "relic":
            ambitions.keeper += (obj as Card).getStackSize();
            break;
          case "psionic":
            ambitions.empath += (obj as Card).getStackSize();
            break;
        }
        break;
      }
      default: {
        if (!(obj instanceof Card)) break;
        const suit = obj.getCardDetails().metadata;
        if (suit && suit in ambitions) ambitions[suit as Ambition] += p;
      }
    }
  }

  // Update the ambitions on the map
  for (const [ambition, value] of Object.entries(ambitions))
    globalEvents.onAmbitionTallied.trigger(
      ambition as Ambition,
      refObject.getOwningPlayerSlot(),
      value,
    );
}
