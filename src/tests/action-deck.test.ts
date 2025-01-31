import type { Card, CardHolder } from "@tabletop-playground/api";
import { Button, world } from "@tabletop-playground/api";
import { assert, assertEqual } from "./assert";
import { describe, test } from "./suite";

describe("action deck", () => {
  test("shows deal after shuffle", () => {
    const deck = world
      .getObjectsByTemplateName<Card>("action")
      .sort((a, b) => b.getStackSize() - a.getStackSize())[0];
    deck.flipOrUpright();
    deck.shuffle();
    const [ui] = deck.getUIs();
    assert(!!ui, "ui");
    assert(ui.widget instanceof Button, "deal button");
    assertEqual((ui.widget as Button).getText().trim(), "Deal");
  });

  test("surpass, seize", async () => {
    const decks = world
      .getObjectsByTemplateName<Card>("action")
      .sort((a, b) => b.getStackSize() - a.getStackSize());
    // Deal ordered cards
    for (const slot of [1, 2, 3, 0]) decks[0].deal(6, [slot], false, true);
    decks[1].deal(4, [0], false, true);

    const holders = world
      .getObjectsByTemplateName<CardHolder>("cards")
      .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot());
    const snaps = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .filter((p) => p.getTags().find((t) => t.startsWith("turn:")))
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x);
    // 0: 3, 2 construction, 7, 1 mobilization, 7, 1 aggression
    const lead = holders[0].removeAt(3)!;
    assertEqual(lead.getCardDetails(0)?.index, 21, "1 mobilization");
    lead.setPosition(snaps[0].getGlobalPosition().add([0, 0, 1]));
    lead.snap();
    await new Promise((resolve) => process.nextTick(resolve));
    // @ts-expect-error _trigger
    lead.onReleased._trigger();

    // Surpass
    // 1: 6, 5, 4, 3, 2 mobilization, 6 aggression
    const surpass = holders[1].removeAt(4)!;
    assertEqual(surpass.getCardDetails(0)?.index, 22, "2 mobilization");
    surpass.setPosition(snaps[1].getGlobalPosition().add([0, 0, 1]));
    surpass.snap();
    await new Promise((resolve) => setTimeout(resolve, 100));
    // @ts-expect-error _trigger
    surpass.onReleased._trigger();
    const [ui] = surpass.getUIs();
    assert(!!ui, "ui");
    assertEqual(
      (ui.widget as Button).getText().trim(),
      "Surpass",
      "surpass button",
    );
    assertEqual(world.getSlots()[0], 0, "initiative at yellow");
    if ("discard" in surpass && typeof surpass.discard === "function")
      surpass.discard();
    assertEqual(world.getSlots()[0], 1, "surpass goes to blue");

    // Surpass again
    const surpassAgain = holders[1].removeAt(0)!;
    assertEqual(surpassAgain.getCardDetails(0)?.index, 26, "6 mobilization");
    surpassAgain.setPosition(snaps[2].getGlobalPosition().add([0, 0, 1]));
    surpassAgain.snap();
    await new Promise((resolve) => setTimeout(resolve, 100));
    // @ts-expect-error _trigger
    surpassAgain.onReleased._trigger();
    const [uiAgain] = surpassAgain.getUIs();
    assert(!!uiAgain, "ui again");
    assertEqual(
      (uiAgain.widget as Button).getText().trim(),
      "Surpass",
      "surpass button again",
    );
    if ("discard" in surpassAgain && typeof surpassAgain.discard === "function")
      surpassAgain.discard();
    assertEqual(world.getSlots()[0], 2, "surpass goes to red");

    // Seize
    const pivot = holders[3].removeAt(0)!;
    pivot.setPosition(snaps[3].getGlobalPosition().add([0, 0, 1]));
    pivot.snap();
    const seize = holders[3].removeAt(0)!;
    seize.setPosition(snaps[3].getGlobalPosition().add([0, 2, 1]));
    seize.setRotation([0, 0, 0]);
    seize.snap();
    await new Promise((resolve) => setTimeout(resolve, 100));
    // @ts-expect-error _trigger
    seize.onReleased._trigger();
    const [uiSeize] = seize.getUIs();
    assert(!!uiSeize, "ui seize");
    assertEqual(
      (uiSeize.widget as Button).getText().trim(),
      "Seize",
      "seize button",
    );
    if ("next" in seize && typeof seize.next === "function") seize.next();
    assertEqual(world.getSlots()[0], 3, "seize goes to white");
  });
});
