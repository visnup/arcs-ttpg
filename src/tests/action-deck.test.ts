import type { Card, CardHolder, SnapPoint } from "@tabletop-playground/api";
import { Button, world } from "@tabletop-playground/api";
import { assert, assertEqual } from "./assert";
import { beforeEach, describe, test } from "./suite";

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

  let decks: Card[];
  let holders: CardHolder[];
  let snaps: SnapPoint[];
  beforeEach(() => {
    decks = world
      .getObjectsByTemplateName<Card>("action")
      .sort((a, b) => b.getStackSize() - a.getStackSize());
    // Deal known-ordered cards
    for (const slot of [1, 2, 3, 0]) decks[0].deal(6, [slot], false, true);
    decks[1].deal(4, [0], false, true);
    holders = world
      .getObjectsByTemplateName<CardHolder>("cards")
      .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot());
    snaps = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .filter((p) => p.getTags().find((t) => t.startsWith("turn:")))
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x);
  });

  async function playCard(
    card: Card,
    snap: SnapPoint,
    offset: [number, number, number] = [0, 0, 1],
  ) {
    card.setPosition(snap.getGlobalPosition().add(offset));
    card.snap();
    await new Promise((resolve) => setTimeout(resolve, 100));
    // @ts-expect-error _trigger
    card.onReleased._trigger();
  }

  function getButton(card: Card) {
    const [ui] = card.getUIs();
    return ui?.widget as Button | undefined;
  }

  test("surpass", async () => {
    // 0: 3, 2 construction, 7, 1 mobilization, 7, 1 aggression
    const lead = holders[0].removeAt(3)!;
    assertEqual(lead.getCardDetails(0)?.index, 21, "1 mobilization");
    await playCard(lead, snaps[0]);

    // Surpass
    // 1: 6, 5, 4, 3, 2 mobilization, 6 aggression
    const surpass = holders[1].removeAt(4)!;
    assertEqual(surpass.getCardDetails(0)?.index, 22, "2 mobilization");
    await playCard(surpass, snaps[1]);
    assertEqual(getButton(surpass)?.getText().trim(), "Surpass", "surpass");
    assertEqual(world.getSlots()[0], 0, "initiative at yellow");
    if ("discard" in surpass && typeof surpass.discard === "function")
      surpass.discard();
    assertEqual(world.getSlots()[0], 1, "surpass goes to blue");
  });

  test("surpass more", async () => {
    const lead = holders[0].removeAt(3)!;
    await playCard(lead, snaps[0]);

    // Surpass
    const surpass = holders[1].removeAt(4)!;
    await playCard(surpass, snaps[1]);
    assertEqual(getButton(surpass)?.getText().trim(), "Surpass", "surpass");

    // Surpass again
    const surpassMore = holders[1].removeAt(0)!;
    assertEqual(surpassMore.getCardDetails(0)?.index, 26, "6 mobilization");
    await playCard(surpassMore, snaps[2]);
    assertEqual(getButton(surpass), undefined, "initial surpass gone");
    assertEqual(
      getButton(surpassMore)?.getText().trim(),
      "Surpass",
      "surpass again",
    );
    if ("discard" in surpassMore && typeof surpassMore.discard === "function")
      surpassMore.discard();
    assertEqual(world.getSlots()[0], 2, "surpass goes to red");
  });

  test("seize", async () => {
    const lead = holders[0].removeAt(3)!;
    await playCard(lead, snaps[0]);

    // Surpass
    const surpass = holders[1].removeAt(4)!;
    await playCard(surpass, snaps[1]);
    assertEqual(getButton(surpass)?.getText().trim(), "Surpass", "surpass");

    // Seize
    const pivot = holders[2].removeAt(0)!;
    await playCard(pivot, snaps[2]);
    assertEqual(getButton(pivot), undefined, "pivot no button");
    const seize = holders[2].removeAt(0)!;
    seize.setRotation([0, 0, 0]);
    await playCard(seize, snaps[2], [0, 2, 1]);
    assertEqual(
      getButton(surpass)?.getText().trim(),
      "Surpass",
      "surpass remains",
    );
    assertEqual(getButton(seize)?.getText().trim(), "Seize", "seize button");
    if ("next" in seize && typeof seize.next === "function") seize.next();
    assertEqual(world.getSlots()[0], 2, "seize goes to red");
    assert(
      world.getObjectById("initiative")!.getRotation().pitch < -85,
      "initiative seized",
    );
    assertEqual(getButton(surpass), undefined, "surpass gone");

    // Surpass more ineffective
    const badSurpass = holders[1].removeAt(0)!;
    assertEqual(badSurpass.getCardDetails(0)?.index, 26, "6 mobilization");
    await playCard(badSurpass, snaps[3]);
    assertEqual(getButton(badSurpass), undefined, "no surpass after seize");
  });
});
