import type { Card } from "@tabletop-playground/api";
import { refObject, world } from "@tabletop-playground/api";
import type { InitiativeMarker } from "./initiative-marker";
import { assertEqual, assertNotEqual } from "./lib/assert";
import type { TestableCard } from "./setup-deck";

const saved = world
  .getAllObjects()
  .filter((d) => d !== refObject)
  .concat([refObject])
  .map((obj) => [obj.toJSONString(), obj.getPosition()] as const);
const keys = new Set(Object.keys(world));
function reset() {
  for (const zone of world.getAllZones())
    if (zone.getId().startsWith("zone-")) zone.destroy();
  for (const obj of world.getAllObjects()) obj.destroy();
  // @ts-expect-error delete
  for (const key of Object.keys(world)) if (!keys.has(key)) delete world[key];
  for (const [json, p] of saved) world.createObjectFromJSON(json, p)!;
}

refObject.onPrimaryAction.add(reset);

console.log("\nRunning tests...");

describe("global", () => {
  test("counts", () => {
    const counts: Record<string, Record<string, number>> = {};
    for (const obj of world.getAllObjects()) {
      const slot = (counts[obj.getOwningPlayerSlot()] ||= {});
      slot[obj.getTemplateName()] = (slot[obj.getTemplateName()] || 0) + 1;
    }
    for (const [slot, owned] of Object.entries({
      "0": {
        board: 1,
        ship: 15,
        power: 2,
        flagship: 1,
        objective: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "1": {
        board: 1,
        power: 2,
        ship: 15,
        flagship: 1,
        objective: 1,
        agent: 10,
        city: 5,
        starport: 5,
        cards: 1,
      },
      "2": {
        ship: 15,
        power: 2,
        board: 1,
        objective: 1,
        flagship: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "3": {
        ship: 15,
        power: 2,
        board: 1,
        flagship: 1,
        objective: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "4": { ship: 15, city: 2, starport: 1 },
      "-1": {
        map: 1,
        tray: 1,
        note: 8,
        court: 1,
        chapter: 1,
        initiative: 1,
        ambition: 3,
        resource: 5,
        "ambition declared": 1,
        lore: 2,
        leader: 2,
        fate: 3,
        bc: 1,
        setup: 3,
        action: 2,
        "first-regent": 1,
        "set-round": 1,
        "block round": 6,
        dc: 3,
        "block small": 2,
        "block large": 2,
        cc: 1,
        "chapter-track": 1,
        "book-of-law": 1,
        "flagship-board": 1,
        discard: 1,
        raid: 6,
        assault: 6,
        skirmish: 6,
        event: 1,
        number: 1,
        "base-rules": 1,
        "campaign-rules": 1,
      },
    }))
      for (const [name, count] of Object.entries(owned))
        assertEqual(counts[slot][name], count, `${slot} - ${name}`);
  });
});

for (const name of ["ambition declared", "ambition"])
  describe(name, () => {
    test("discards to origin", () => {
      const marker = world.getObjectByTemplateName(name)!;
      const position = marker.getPosition();
      const rotation = marker.getRotation();
      marker.setPosition(position.add([10, 10, 0]));
      marker.setRotation([rotation.pitch, rotation.yaw + 90, rotation.roll]);
      if (!("discard" in marker && typeof marker.discard === "function"))
        throw Error("discard not present");
      marker.discard();
      assertEqual(marker.getPosition(), position, "position");
      assertEqual(marker.getRotation(), rotation, "rotation");
    });
  });

describe("initiative", () => {
  const initiative = world.getObjectById("initiative")! as InitiativeMarker;

  test("take", () => {
    for (const slot of [0, 1, 2, 3]) {
      initiative.take(slot);
      assertEqual(world.getSlots()[0], slot);
    }
  });

  test("seize", () => {
    for (const slot of [0, 1, 2, 3]) {
      initiative.seize(slot);
      assertEqual(world.getSlots()[0], slot);
      assertEqual(initiative.getRotation().pitch, -90, "pitch");
    }
  });
});

describe("setup", () => {
  test("base", () => {
    const initiative = world.getObjectById("initiative")!;
    const position = initiative.getPosition().add([10, -10, 0]);
    initiative.setPosition(position);

    // draw 4p setup card TODO 3p
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[2] as TestableCard;
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([-10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);
    // initiative moved
    assertNotEqual(initiative.getPosition(), position, "initiative");
    // action deck shuffled with the correct number of cards
    const actionDecks = world.getObjectsByTemplateName<Card>("action");
    assertEqual(actionDecks.length, 1, "one action deck");
    const actionDeck = actionDecks[0];
    assertEqual(actionDeck.getStackSize(), 7 * 4, "7s shuffled in");
    assertEqual(actionDeck.getRotation().yaw, -90, "action deck turned over");
    // TODO court dealt
    // TODO campaign deleted
    // TODO notes deleted

    // flip
    setup.flipOrUpright();
    setup.onFlipUpright.trigger(setup);
    // TODO map annotated

    // run
    setup.onPrimaryAction.trigger(setup);
    // TODO ships, buildings placed
    // TODO resources drawn
    // TODO blocks placed
    // TODO ambition score indicators

    // play cards
    // TODO swap cards around for consistent testing
    // TODO declare ambition
  });
});

function describe(description: string, fn: () => void) {
  console.log(description);
  try {
    fn();
  } catch {
    // nothing
  }
}

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(" ✓", description);
  } catch (e) {
    console.error(" x", description, e);
    for (const p of world.getAllPlayers())
      p.showMessage(`${description}: ${e}`);
  }
}
