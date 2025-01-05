import type { Card, GameObject } from "@tabletop-playground/api";
import { ObjectType, world } from "@tabletop-playground/api";
import type { TestableCard } from "../setup-deck";
import { assertEqual, assertNotEqual } from "./assert";
import { describe, test } from "./suite";

function getCounts(filter = (obj: GameObject) => !!obj) {
  const counts: Record<string, Record<string, number>> = {};
  for (const obj of world.getAllObjects().filter(filter)) {
    const slot = (counts[obj.getOwningPlayerSlot()] ||= {});
    slot[obj.getTemplateName()] = (slot[obj.getTemplateName()] || 0) + 1;
  }
  return counts;
}

describe("setup deck", () => {
  test("4p", async () => {
    const map = world.getObjectById("map")!;
    const initiative = world.getObjectById("initiative")!;
    const position = initiative.getPosition().add([10, -10, 0]);
    initiative.setPosition(position);

    // draw setup
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[2] as TestableCard;
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);
    // initiative moved
    assertNotEqual(initiative.getPosition(), position, "initiative");
    // action deck shuffled with the correct number of cards
    const actionDecks = world.getObjectsByTemplateName<Card>("action");
    assertEqual(actionDecks.length, 1, "one action deck");
    const actionDeck = actionDecks[0];
    assertEqual(actionDeck.getStackSize(), 7 * 4, "7s shuffled in");
    assertEqual(actionDeck.getRotation().yaw, -90, "action deck turned over");
    // piece counts
    const counts = getCounts();
    assertEqual(Object.keys(counts), "0 1 2 3 -1".split(" "), "player pieces");
    for (const key of [
      "fate",
      "first-regent",
      "dc",
      "cc",
      "chapter-track",
      "book-of-law",
      "flagship-board",
      "event",
      "number",
      "campaign-rules",
    ])
      assertEqual(counts[-1][key], undefined, `${key} deleted`);
    // court dealt
    const court = world.getObjectByTemplateName("court")!;
    assertEqual(
      court.getAllSnapPoints().filter((d) => d.getSnappedObject()).length,
      5,
      "4 court cards dealt",
    );

    // flip
    setup.flipOrUpright();
    setup.onFlipUpright.trigger(setup);
    // map annotated
    assertEqual(world.getDrawingLines().length, 12, "map annotated");
    assertEqual(
      world.getObjectsByTemplateName("block").length,
      1,
      "block previewed",
    );

    // run
    setup.onPrimaryAction.trigger(setup);
    // piece counts
    const onMap = getCounts((obj) => world.isOnMap(obj));
    for (const [slot, objects] of Object.entries({
      "0": { ship: 8, power: 1, starport: 1, city: 1 },
      "1": { ship: 8, power: 1, starport: 1, city: 1 },
      "2": { ship: 8, power: 1, starport: 1, city: 1 },
      "3": { ship: 8, power: 1, starport: 1, city: 1 },
      "-1": {
        block: 1,
        "block small": 1,
        "block round": 3,
        chapter: 1,
        ambition: 3,
        "ambition declared": 1,
      },
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(onMap[slot][name], count, `${slot} - ${name} on map`);
    // resources drawn
    for (const slot of [0, 1, 2, 3]) {
      const board = world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slot)!;
      assertEqual(
        JSON.stringify(
          [
            ...new Set(
              board.getAllSnapPoints().map((d) => d.getSnappedObject()),
            ),
          ]
            .map((d) => d?.getTemplateName())
            .sort(),
        ),
        JSON.stringify([
          "city",
          "city",
          "city",
          "city",
          "resource",
          "resource",
          null,
        ]),
        `board pieces ${slot}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEqual(map.getObjectType(), ObjectType.Ground, "map is grounded");
  });

  test("3p", () => {
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[1] as TestableCard;
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);
    // action deck shuffled with the correct number of cards
    const actionDeck = world.getObjectsByTemplateName<Card>("action")[0];
    assertEqual(actionDeck.getStackSize(), 5 * 4, "no 7s shuffled in");
    // piece counts
    const counts = getCounts();
    assertEqual(Object.keys(counts), "0 1 2 -1".split(" "), "player pieces");
    // court dealt
    const court = world.getObjectByTemplateName("court")!;
    assertEqual(
      court.getAllSnapPoints().filter((d) => d.getSnappedObject()).length,
      5,
      "4 court cards dealt",
    );

    // run
    setup.onPrimaryAction.trigger(setup);
    // piece counts
    const onMap = getCounts((obj) => world.isOnMap(obj));
    for (const [slot, objects] of Object.entries({
      "0": { ship: 8, power: 1, starport: 1, city: 1 },
      "1": { ship: 8, power: 1, starport: 1, city: 1 },
      "2": { ship: 8, power: 1, starport: 1, city: 1 },
      "-1": {
        block: 2,
        "block small": 2,
        "block round": 6,
        chapter: 1,
        ambition: 3,
        "ambition declared": 1,
      },
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(onMap[slot][name], count, `${slot} - ${name} on map`);
  });

  test("2p", () => {
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[0] as TestableCard;
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);
    // action deck shuffled with the correct number of cards
    const actionDeck = world.getObjectsByTemplateName<Card>("action")[0];
    assertEqual(actionDeck.getStackSize(), 5 * 4, "no 7s shuffled in");
    // piece counts
    const counts = getCounts();
    assertEqual(Object.keys(counts), "0 1 -1".split(" "), "player pieces");
    // court dealt
    const court = world.getObjectByTemplateName("court")!;
    assertEqual(
      court.getAllSnapPoints().filter((d) => d.getSnappedObject()).length,
      4,
      "3 court cards dealt",
    );

    // run
    setup.onPrimaryAction.trigger(setup);
    // piece counts
    const onMap = getCounts((obj) => world.isOnMap(obj));
    for (const [slot, objects] of Object.entries({
      "0": { ship: 10, power: 1, starport: 1, city: 1 },
      "1": { ship: 10, power: 1, starport: 1, city: 1 },
      "-1": {
        block: 2,
        "block large": 2,
        "block round": 6,
        chapter: 1,
        ambition: 3,
        "ambition declared": 1,
        resource: 4,
      },
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(onMap[slot][name], count, `${slot} - ${name} on map`);
    // blocked resources
    const blockedResources = world
      .getObjectsByTemplateName<Card>("resource")
      .filter((d) => world.isOnMap(d));
    assertEqual(
      blockedResources
        .flatMap((d) => d.getAllCardDetails())
        .map((d) => d.name)
        .sort(),
      ["fuel", "fuel", "material", "material", "relic", "weapon"],
      "blocked resources",
    );
  });
});
