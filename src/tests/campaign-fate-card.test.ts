import {
  world,
  type Card,
  type CardHolder,
  type Dice,
} from "@tabletop-playground/api";
import type { TestableCard } from "../campaign-fate-card";
import { assert, assertEqual, assertNotEqual } from "./assert";
import { getCounts } from "./setup";
import { describe, skip, test } from "./suite";

describe("campaign fate card", () => {
  test("showDeal", () => {
    const fates = world
      .getObjectsByTemplateName<Card>("fate")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    if (fates.length === 0) skip("no fates");
    (fates[0] as TestableCard).onPrimaryAction.trigger(fates[0]);
    assertEqual(fates[0].getUIs().length, 1, "ui added"); // weirdly can't see the UI, but scripting can
  });

  test("4p", () => {
    const initiative = world.getObjectById("initiative")!;
    const position = initiative.getPosition().add([10, -10, 0]);
    initiative.setPosition(position);

    const fates = world
      .getObjectsByTemplateName<Card>("fate")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    if (fates.length === 0) skip("no fates");
    // run setup
    (fates[0] as TestableCard).onClick(4, fates[0]);

    // initiative moved
    assertNotEqual(initiative.getPosition(), position, "initiative");
    // action deck shuffled with the correct number of cards
    const actionDeck = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .find((s) => s.getTags().includes("card-discard"))!
      .getSnappedObject() as Card;
    assertEqual(
      actionDeck.getStackSize(),
      7 * 4 + 3,
      "1s, 7s, events shuffled in",
    );
    assertEqual(actionDeck.getRotation().yaw, -90, "action deck turned over");

    // piece counts
    const counts = getCounts();
    assertEqual(
      Object.keys(counts),
      "0 1 2 3 4 -1".split(" "),
      "player pieces",
    );
    for (const key of [
      "setup",
      "leader",
      "block round",
      "block small",
      "block large",
    ])
      assertEqual(counts[-1][key], undefined, `${key} deleted`);

    // chapter track overlay
    assert(
      world.isOnTable(world.getObjectByTemplateName("chapter")!, [
        "chapter-track",
        "map",
      ]),
      "chapter track overlay",
    );

    // court dealt
    const court = world.getObjectByTemplateName("court")!;
    assertEqual(
      court.getAllSnapPoints().filter((d) => d.getSnappedObject()).length,
      6,
      "5 court cards dealt",
    );
    // imperial council card
    const courtLeft = court
      .getAllSnapPoints()
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x)[0]
      .getSnappedObject() as Card;
    assertEqual(courtLeft.getCardDetails(0)!.metadata, "imperial council");

    // edicts: govern the imperial reach
    const rules = world
      .getObjectsByTemplateName<CardHolder>("cards")
      .find((c) => c.getOwningPlayerSlot() === -1)!;
    assertEqual(
      rules
        .getCards()
        .map((c) => `${c.getTemplateName()}:${c.getCardDetails(0)!.metadata}`),
      [
        "book-of-law:",
        "dc:govern the imperial reach",
        "dc:govern the imperial reach",
        "dc:govern the imperial reach",
      ],
      "edicts",
    );

    // piece counts
    const onMap = getCounts((obj) => world.isOnMap(obj));
    for (const [slot, objects] of Object.entries({
      "0": { power: 1 },
      "1": { power: 1 },
      "2": { power: 1 },
      "3": { power: 1 },
      "4": { ship: 8, city: 4, "set-round": 16 }, // imperial ships, free cities, blight
      "-1": {
        chapter: 1,
        "ambition declared": 1,
        ambition: 3,
        "chapter-track": 1,
        action: 1,
      },
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(onMap[slot][name], count, `${slot} - ${name} on map`);
    const onTable = getCounts((obj) => world.isOnTable(obj));
    for (const [slot, objects] of Object.entries({
      "0": { ship: 15, agent: 10, objective: 1, power: 1, starport: 5 },
      "1": { ship: 15, agent: 10, objective: 1, power: 1, starport: 5 },
      "2": { ship: 15, agent: 10, objective: 1, power: 1, starport: 5 },
      "3": { ship: 15, agent: 10, objective: 1, power: 1, starport: 5 },
      "4": { ship: 7, city: 2, starport: 1, "set-round": 1 },
      "-1": {
        "book-of-law": 1,
        "first-regent": 1,
        fate: 10,
        dc: 4,
        "flagship-board": 1,
        event: 1,
        number: 1,
        "campaign-rules": 1,
        "campaign-aid-intermission": 1,
        "campaign-aid-rules": 1,
        "player-aid": 1,
      },
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(onTable[slot][name], count, `${slot} - ${name} on table`);

    // fate cards in hands
    assertEqual(
      world
        .getObjectsByTemplateName<CardHolder>("cards")
        .filter((c) => c.getOwningPlayerSlot() >= 0)
        .map((c) => c.getCards().map((c) => c.getTemplateName())),
      [
        ["fate", "fate"],
        ["fate", "fate"],
        ["fate", "fate"],
        ["fate", "fate"],
      ],
      "fate cards in hands",
    );

    // regent / outlaw cards
    // first regent with first player
    // first regent to admiral, then steward
  });

  test("2p", () => {
    const fates = world
      .getObjectsByTemplateName<Card>("fate")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    if (fates.length === 0) skip("no fates");
    // run setup
    (fates[0] as TestableCard).onClick(2, fates[0]);

    // action deck shuffled with the correct number of cards
    const actionDeck = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .find((s) => s.getTags().includes("card-discard"))!
      .getSnappedObject() as Card;
    assertEqual(actionDeck.getStackSize(), 5 * 4 + 2, "events shuffled in");
    assertEqual(actionDeck.getRotation().yaw, -90, "action deck turned over");

    // court size
    const court = world.getObjectByTemplateName("court")!;
    assertEqual(
      court.getAllSnapPoints().filter((d) => d.getSnappedObject()).length,
      5,
      "3 court cards dealt",
    );
    // imperial council card
    const courtLeft = court
      .getAllSnapPoints()
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x)[0]
      .getSnappedObject() as Card;
    assertEqual(courtLeft.getCardDetails(0)!.metadata, "imperial council");

    // edicts: guild envoys depart, govern the imperial reach
    const rules = world
      .getObjectsByTemplateName<CardHolder>("cards")
      .find((c) => c.getOwningPlayerSlot() === -1)!;
    assertEqual(
      rules
        .getCards()
        .map((c) => `${c.getTemplateName()}:${c.getCardDetails(0)!.metadata}`),
      [
        "book-of-law:",
        "dc:guild envoys depart",
        "dc:govern the imperial reach",
        "dc:govern the imperial reach",
        "dc:govern the imperial reach",
      ],
      "edicts",
    );

    // piece counts
    const number = world.getObjectByTemplateName<Dice>("number")!;
    const onMap = getCounts((obj) => world.isOnMap(obj));
    for (const [slot, objects] of Object.entries({
      "0": { power: 1 },
      "1": { power: 1 },
      "4": { ship: 8, city: 4, "set-round": 16 }, // imperial ships, free cities, blight
      "-1": {
        chapter: 1,
        "ambition declared": 1,
        ambition: 3,
        "chapter-track": 1,
        action: 1,
        resource: [1, 2, 4, 5].includes(+number.getCurrentFaceName()) ? 5 : 4, // out of play resources
      },
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(onMap[slot][name], count, `${slot} - ${name} on map`);
    const onTable = getCounts((obj) => world.isOnTable(obj));
    for (const [slot, objects] of Object.entries({
      "0": { ship: 15, agent: 10, objective: 1, power: 1, starport: 5 },
      "1": { ship: 15, agent: 10, objective: 1, power: 1, starport: 5 },
      "4": { ship: 7, city: 2, starport: 1, "set-round": 1 },
      "-1": {
        "book-of-law": 1,
        "first-regent": 1,
        // dc: 4,
        "flagship-board": 1,
        event: 1,
        number: 1,
        "campaign-rules": 1,
        "campaign-aid-intermission": 1,
        "campaign-aid-rules": 1,
        "player-aid": 1,
      },
    }))
      for (const [name, count] of Object.entries(objects))
        assertEqual(onTable[slot][name], count, `${slot} - ${name} on table`);
  });
});
