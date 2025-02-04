import {
  ObjectType,
  world,
  type Card,
  type CardHolder,
  type HorizontalBox,
} from "@tabletop-playground/api";
import type { TestableCard } from "../setup-deck";
import { assert, assertEqual, assertNotEqual } from "./assert";
import { getCounts } from "./setup";
import { describe, test } from "./suite";
import { getTally } from "./tally";

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
    assertEqual(actionDeck.getStackSize(), 7 * 4, "1s, 7s shuffled in");
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
    // cards dealt
    const cards = world.getObjectsByTemplateName<CardHolder>("cards");
    assertEqual(cards.length, 4, "4 hands dealt");
    assert(
      cards.every((d) => d.getCards().length === 6),
      "6 cards per hand",
    );

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
    // ambition tallies for blocked resources
    const map = world.getObjectById("map")!;
    const tallies = map.getUIs().slice(0, 5);
    assertEqual(
      getTally((tallies[0].widget as HorizontalBox).getChildAt(0)),
      4,
      "tycoon",
    );
    assertEqual(
      getTally((tallies[2].widget as HorizontalBox).getChildAt(0)),
      1,
      "warlord",
    );
    assertEqual(
      getTally((tallies[3].widget as HorizontalBox).getChildAt(0)),
      1,
      "keeper",
    );
  });

  test("with leaders", async () => {
    // draw setup
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[2] as TestableCard;
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([10, 0, 0]));
    // skip running initiative shuffle for consistent coloring;
    // means 1s and 7s are left out of action deck

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

    // setup leaders
    const leaders = world
      .getObjectsByTemplateName<Card>("leader")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    const snaps = world
      .getObjectsByTemplateName("board")
      .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot())
      .map((o) =>
        o.getAllSnapPoints().find((s) => s.getTags().includes("leader")),
      );
    for (const slot of [0, 1, 2, 3])
      leaders[1]
        .takeCards(1)!
        .setPosition(snaps[slot]!.getGlobalPosition().add([0, 0, 1]));

    // run
    setup.onPrimaryAction.trigger(setup);

    // piece counts
    const onMap = getCounts((obj) => world.isOnMap(obj));
    for (const [slot, objects] of Object.entries({
      "0": { ship: 9, power: 1, starport: 1, city: 0 }, // quartermaster
      "1": { ship: 9, power: 1, starport: 1, city: 1 }, // agitator
      "2": { ship: 9, power: 1, starport: 0, city: 1 }, // shaper
      "3": { ship: 9, power: 1, starport: 0, city: 0 }, // anarchist
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
        assertEqual(onMap[slot][name] ?? 0, count, `${slot} - ${name} on map`);
    // resources drawn
    for (const [slot, resources] of [
      ["fuel", "weapon"],
      ["fuel", "material"],
      ["relic", "material"],
      ["relic", "weapon"],
    ].entries()) {
      const board = world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slot)!;
      const found = board
        .getAllSnapPoints()
        .filter((s) => s.getTags().includes("resource"))
        .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y)
        .slice(0, 2)
        .map((s) => (s.getSnappedObject() as Card).getCardDetails(0)?.name);
      assertEqual(found, resources, `${slot} resources`);
    }
    // cards dealt
    const cards = world.getObjectsByTemplateName<CardHolder>("cards");
    assertEqual(cards.length, 4, "4 hands dealt");
  });
});
