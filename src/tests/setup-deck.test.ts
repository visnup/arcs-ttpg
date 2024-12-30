import type { Card } from "@tabletop-playground/api";
import { world } from "@tabletop-playground/api";
import type { TestableCard } from "../setup-deck";
import { assertEqual, assertNotEqual } from "./assert";
import { describe, test } from "./suite";

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
