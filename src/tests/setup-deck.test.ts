import type { Card } from "@tabletop-playground/api";
import { world } from "@tabletop-playground/api";
import type { TestableCard } from "../setup-deck";
import { assertEqual, assertNotEqual } from "./assert";
import { describe, test } from "./suite";

function getCounts() {
  const counts: Record<string, Record<string, number>> = {};
  for (const obj of world.getAllObjects()) {
    const slot = (counts[obj.getOwningPlayerSlot()] ||= {});
    slot[obj.getTemplateName()] = (slot[obj.getTemplateName()] || 0) + 1;
  }
  return counts;
}

describe("setup-deck", () => {
  test("4p", () => {
    const initiative = world.getObjectById("initiative")!;
    const position = initiative.getPosition().add([10, -10, 0]);
    initiative.setPosition(position);

    // draw setup
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
      assertEqual(counts[-1][key], undefined, `${key} not deleted`);
    // TODO court dealt

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
  });

  test("3p", () => {
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[1] as TestableCard;
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([-10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);
    // action deck shuffled with the correct number of cards
    const actionDecks = world.getObjectsByTemplateName<Card>("action");
    assertEqual(actionDecks.length, 1, "one action deck");
    const actionDeck = actionDecks[0];
    assertEqual(actionDeck.getStackSize(), 5 * 4, "no 7s shuffled in");
    // piece counts
    const counts = getCounts();
    assertEqual(Object.keys(counts), "0 1 2 -1".split(" "), "player pieces");
  });

  test("2p", () => {
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[0] as TestableCard;
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([-10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);
    // action deck shuffled with the correct number of cards
    const actionDecks = world.getObjectsByTemplateName<Card>("action");
    assertEqual(actionDecks.length, 1, "one action deck");
    const actionDeck = actionDecks[0];
    assertEqual(actionDeck.getStackSize(), 5 * 4, "no 7s shuffled in");
    // piece counts
    const counts = getCounts();
    assertEqual(Object.keys(counts), "0 1 -1".split(" "), "player pieces");

    // run
    setup.onPrimaryAction.trigger(setup);
    // TODO resources blocking ambitions
  });
});
