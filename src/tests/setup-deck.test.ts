import {
  ObjectType,
  world,
  type Card,
  type CardHolder,
  type HorizontalBox,
} from "@tabletop-playground/api";
import type { InitiativeMarker } from "../initiative-marker";
import type { TestableCard } from "../setup-deck";
import {
  assert,
  assertEqual,
  assertEqualEventually,
  assertNotEqual,
} from "./assert";
import { getCounts } from "./setup";
import { describe, skip, test } from "./suite";
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
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[2] as
      | TestableCard
      | undefined;
    if (!setupDeck) skip("no setup deck");
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

    await assertEqualEventually(
      () => map.getObjectType(),
      ObjectType.Ground,
      "map is grounded",
    );
  });

  test("3p", () => {
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[1] as
      | TestableCard
      | undefined;
    if (!setupDeck) skip("no setup deck");
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

    // cards dealt
    const cards = world.getObjectsByTemplateName<CardHolder>("cards");
    assertEqual(cards.length, 3, "3 hands dealt");
    assert(
      cards.every((d) => d.getCards().length === 6),
      "6 cards per hand",
    );
  });

  test("2p", () => {
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[0] as
      | TestableCard
      | undefined;
    if (!setupDeck) skip("no setup deck");
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

    // cards dealt
    const cards = world.getObjectsByTemplateName<CardHolder>("cards");
    assertEqual(cards.length, 2, "2 hands dealt");
    assert(
      cards.every((d) => d.getCards().length === 6),
      "6 cards per hand",
    );
  });

  test("with leaders", async () => {
    // draw setup
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[2] as
      | TestableCard
      | undefined;
    if (!setupDeck) skip("no setup deck");
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);

    // reset initiative
    const initiative = world.getObjectById("initiative") as InitiativeMarker;
    initiative.take(0);

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
    for (const snap of snaps)
      leaders[1]
        .takeCards(1)!
        .setPosition(snap!.getGlobalPosition().add([0, 0, 1]));

    // run
    setup.onPrimaryAction.trigger(setup);

    // in world counts
    const counts = getCounts();
    for (const [slot, objects] of Object.entries({
      "0": { ship: 15, starport: 5, city: 5 }, // quartermaster
      "1": { ship: 15, starport: 5, city: 5 }, // agitator
      "2": { ship: 15, starport: 5, city: 5 }, // shaper
      "3": { ship: 15, starport: 5, city: 3 }, // anarchist
    })) {
      for (const [name, count] of Object.entries(objects))
        assertEqual(counts[slot][name] ?? 0, count, `world ${slot} - ${name}`);
    }
    // on map counts
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
        assertEqual(
          onMap[slot][name] ?? 0,
          count,
          `map ${slot} - ${name} on map`,
        );
    // on board counts
    for (const [slot, [resources, cities, outrages]] of (
      [
        [["fuel", "weapon"], 5, [0]], // quartermaster
        [["fuel", "material"], 4, []], // agitator
        [["relic", "material"], 4, []], // shaper
        [["relic", "weapon"], 3, []], // anarchist
      ] as [string[], number, number[]][]
    ).entries()) {
      const board = world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slot)!;
      const snaps = board
        .getAllSnapPoints()
        .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y);
      const r = snaps
        .filter((s) => s.getTags().includes("resource"))
        .slice(0, 2)
        .map((s) => (s.getSnappedObject() as Card).getCardDetails().name);
      assertEqual(r, resources, `${slot} resources`);
      const c = snaps.filter(
        (s) => s.getTags().includes("building") && s.getSnappedObject(),
      );
      assertEqual(c.length, cities, `${slot} cities`);
      const o = snaps
        .filter((s) => s.getTags().includes("agent"))
        .sort((a, b) => b.getLocalPosition().x - a.getLocalPosition().x)
        .map((s, i) => (s.getSnappedObject() ? i : null))
        .filter((d) => d !== null);
      assertEqual(o, outrages, `${slot} outrage`);
    }

    // cards dealt
    const cards = world.getObjectsByTemplateName<CardHolder>("cards");
    assertEqual(cards.length, 4, "4 hands dealt");
    assert(
      cards.every((d) => d.getCards().length === 6),
      "6 cards per hand",
    );
  });

  test("with leaders 2", async () => {
    // draw setup
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[1] as
      | TestableCard
      | undefined;
    if (!setupDeck) skip("no setup deck");
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);

    // reset initiative
    const initiative = world.getObjectById("initiative") as InitiativeMarker;
    initiative.take(0);

    // flip
    setup.flipOrUpright();
    setup.onFlipUpright.trigger(setup);

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
    for (const slot of [0, 1])
      leaders[1]
        .takeCards(1, true)!
        .setPosition(snaps[slot]!.getGlobalPosition().add([0, 0, 1]));
    leaders[0]
      .takeCards(1, true, 1)!
      .setPosition(snaps[2]!.getGlobalPosition().add([0, 0, 1]));
    // setup lore
    const lore = world.getObjectByTemplateName<Card>("lore")!;
    for (const snap of snaps)
      lore
        .takeCards(1)
        ?.setPosition(
          snap!
            .getGlobalPosition()
            .add([Math.sign(snap!.getGlobalPosition().x) * 11, 0, 0]),
        );

    // run
    setup.onPrimaryAction.trigger(setup);

    // in world counts
    const counts = getCounts();
    for (const [slot, objects] of Object.entries({
      "0": { ship: 15, starport: 5, city: 5, agent: 10 }, // archivist
      "1": { ship: 15 - 2, starport: 5, city: 5, agent: 10 - 3 }, // overseer
      "2": { ship: 15, starport: 5, city: 5, agent: 10 }, // mystic
      "-1": { lore: 4 + 5 }, // lore left on table
    })) {
      for (const [name, count] of Object.entries(objects))
        assertEqual(counts[slot][name] ?? 0, count, `world ${slot} - ${name}`);
    }
    // on map counts
    const onMap = getCounts((obj) => world.isOnMap(obj));
    for (const [slot, objects] of Object.entries({
      "0": { ship: 8, power: 1, starport: 0, city: 2 }, // archivist
      "1": { ship: 8, power: 1, starport: 1, city: 1 }, // overseer
      "2": { ship: 8, power: 1, starport: 1, city: 1 }, // mystic
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(
          onMap[slot][name] ?? 0,
          count,
          `map ${slot} - ${name} on map`,
        );
    // on board counts
    for (const [slot, [resources, cities, outrages]] of (
      [
        [["relic", "relic"], 3, []], // archivist
        [["fuel", "material"], 4, []], // overseer
        [["psionic", "relic"], 4, [0, 1]], // mystic
      ] as [string[], number, number[]][]
    ).entries()) {
      const board = world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slot)!;
      const snaps = board
        .getAllSnapPoints()
        .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y);
      const r = snaps
        .filter((s) => s.getTags().includes("resource"))
        .slice(0, 2)
        .map((s) => (s.getSnappedObject() as Card).getCardDetails().name);
      assertEqual(r, resources, `${slot} resources`);
      const c = snaps.filter(
        (s) => s.getTags().includes("building") && s.getSnappedObject(),
      );
      assertEqual(c.length, cities, `${slot} cities`);
      const o = snaps
        .filter((s) => s.getTags().includes("agent"))
        .sort((a, b) => b.getLocalPosition().x - a.getLocalPosition().x)
        .map((s, i) => (s.getSnappedObject() ? i : null))
        .filter((d) => d !== null);
      assertEqual(o, outrages, `${slot} outrage`);
    }

    // cards *not* dealt due to archivist's pending choices
    const cards = world
      .getObjectsByTemplateName<CardHolder>("cards")
      .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot());
    assertEqual(cards.length, 3, "3 hands");
    assertEqual(cards[0].getCards().length, 5, "5 lore in hand");
    assert(
      cards.slice(1).every((d) => d.getCards().length === 0),
      "0 cards per hand",
    );
  });
});
