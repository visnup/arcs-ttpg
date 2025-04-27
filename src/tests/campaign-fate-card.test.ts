import {
  Card,
  world,
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
    assertEqual(
      world
        .getObjectsByTemplateName<Card>("dc")
        .filter(
          (d) =>
            d.getStackSize() === 1 &&
            d.getCardDetails().name === "Imperial Regent",
        ).length,
      4,
    );

    // first regent with first player
    const firstRegent = world.getObjectByTemplateName("first-regent")!;
    assert(
      firstRegent.getPosition().distance(initiative.getPosition()) < 12,
      "first regent with first player",
    );

    // first regent to admiral, then steward
    // assign admiral to 2p
    const slots = world.getSlots();
    const admiral = world
      .getObjectsByTemplateName<Card>("fate")
      .find((d) => d.getCardDetails().name.startsWith("Admiral"))!;
    admiral.removeFromHolder();
    admiral.setPosition(
      world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slots[1])!
        .getAllSnapPoints()
        .find((s) => s.getTags().includes("fate"))!
        .getGlobalPosition()
        .add([0, 0, 1]),
    );
    admiral.snap();
    (admiral as TestableCard).onSnapped.trigger(admiral);
    assert(
      firstRegent.getPosition().distance(admiral.getPosition()) < 7,
      "first regent with admiral",
    );
    // assign steward to 3p
    const steward = world
      .getObjectsByTemplateName<Card>("fate")
      .find((d) => d.getCardDetails().name.startsWith("Steward"))!;
    steward.removeFromHolder();
    steward.setPosition(
      world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slots[2])!
        .getAllSnapPoints()
        .find((s) => s.getTags().includes("fate"))!
        .getGlobalPosition()
        .add([0, 0, 1]),
    );
    steward.snap();
    (steward as TestableCard).onSnapped.trigger(steward);
    assert(
      firstRegent.getPosition().distance(steward.getPosition()) < 7,
      "first regent with steward",
    );
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

  test("take fate set", async () => {
    const fates = world
      .getObjectsByTemplateName<Card>("fate")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    if (fates.length === 0) skip("no fates");

    const map = world.getObjectById("map")!;

    // spot checks
    for (const expected of [
      {
        id: "Steward", // f01
        name: [, "Imperial Authority", "Dealmakers"],
        metadata: ["20 17 14", , "empath", , , "keeper", "warlord"],
        tags: ["setup"],
      },
      {
        id: "Magnate", // f03
        name: [
          ,
          "Merchant League",
          ,
          ,
          ,
          ,
          "Material Cartel",
          "Fuel Cartel",
          "Weapon Cartel",
          "Psionic Cartel",
          "Relic Cartel",
          ,
          "Material Monopoly",
          "Fuel Monopoly",
          "Relic Monopoly",
          "Psionic Monopoly",
          "Weapon Monopoly",
        ],
        metadata: [
          "10",
          "tycoon",
          ,
          ,
          ,
          ,
          "tycoon",
          "tycoon",
          "warlord",
          "empath",
          "keeper",
        ],
        tags: [
          "setup",
          ,
          ,
          ,
          ,
          ,
          "supply:material",
          "supply:fuel",
          "supply:weapon",
          "supply:psionic",
          "supply:relic",
          ,
          "supply:material",
          "supply:fuel",
          "supply:relic",
          "supply:psionic",
          "supply:weapon",
        ],
      },
      {
        id: "Advocate", // f04
        name: [
          ,
          "Guild Investigators",
          "Guild Overseers",
          ,
          "Material Liaisons",
          "Fuel Liaisons",
          "Weapons Liaisons",
          "Relic Liaisons",
          "Psionic Liaisons",
        ],
        metadata: [
          "18",
          "empath",
          "keeper",
          ,
          "tycoon",
          "tycoon",
          "warlord",
          "keeper",
          "empath",
        ],
      },
      {
        id: "Caretaker", // f05
        name: [, "Golem Beacon", "Golem Hearth", "Stone-Speakers"],
        metadata: ["18", , , "tycoon", , , , , , , , , "keeper"],
        tags: ["setup", , , , , , , , , , , , , , "action"],
      },
      {
        id: "Pathfinder", // f09
        name: [
          ,
          "Uncovering Clues",
          "Clues to the Portal",
          ,
          "Call to Pilgrimage",
          "Portal Seekers",
          ,
          "Pilgrims",
          "Seek the Portal",
          "Seek the Portal",
          "Seek the Portal",
        ],
        metadata: ["8", , , , , "keeper"],
        tags: ["setup"],
      },
      {
        id: "Guardian", // f20
        name: [, "Green Vault", "Ire of the Tycoons", "Edenguard Ambition"],
        metadata: ["20 18 16"],
        tags: ["setup"],
      },
    ] as const) {
      const fate = fates
        .map((f) => {
          const i = f
            .getAllCardDetails()
            .findIndex(({ name }) => name === expected.id);
          if (i >= 0) return f.takeCards(1, true, i);
        })
        .find((d) => d);
      assert(!!fate, expected.id);
      fate.setPosition(map.getPosition().add([0, 0, 1]));
      fate.snap();
      (fate as TestableCard).onSnapped.trigger(fate);

      const set = world
        .lineTrace(fate.getPosition(), fate.getPosition().add([0, 0, 10]))
        .map((h) => h.object)
        .filter((o) => o.getId() !== "map");
      const cards = set.find((d) => d.getTemplateName().match(/^f\d\d$/));
      assert(cards instanceof Card, `${expected.name} cards`);

      for (const f of ["name", "metadata", "tags"] as const)
        for (const [i, value] of expected[f]?.entries() ?? [])
          if (value) {
            const v = cards.getCardDetails(i)![f];
            if (typeof v === "string")
              assert(v.startsWith(value), `${i} ${v} ≠ ${value}`);
            else if (Array.isArray(v))
              assert(v.includes(value), `${i} ${v} ≠ ${value}`);
          }

      // delete
      for (const o of set) o.destroy();
    }
  });
});
