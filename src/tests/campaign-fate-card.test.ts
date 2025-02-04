import { world } from "@tabletop-playground/api";
import type { Card } from "@tabletop-playground/api";
import type { TestableCard } from "../campaign-fate-card";
import { assert, assertEqual, assertNotEqual } from "./assert";
import { getCounts } from "./setup";
import { describe, test } from "./suite";

describe("campaign fate card", () => {
  test("showDeal", () => {
    const fates = world
      .getObjectsByTemplateName<Card>("fate")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
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
    // run setup
    (fates[0] as TestableCard).onClick(4, fates[0]);

    // initiative moved
    assertNotEqual(initiative.getPosition(), position, "initiative");
    // action deck shuffled with the correct number of cards
    const actionDecks = world.getObjectsByTemplateName<Card>("action");
    assertEqual(actionDecks.length, 1, "one action deck");
    const actionDeck = actionDecks[0];
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

    // imperial clusters
    // free cities
    // blight

    // fate cards in hands
    // regent / outlaw cards
    // first regent with first player
  });

  // test("2p", () => {
  // action deck size
  // court size
  // guild envoys depart edict
  // out of play resources
  //
  // });
});
