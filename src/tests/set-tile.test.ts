import {
  globalEvents,
  world,
  type Card,
  type Dice,
} from "@tabletop-playground/api";
import type { TestableCard } from "../campaign-fate-card";
import { getSystems, placeShips } from "../lib/setup";
import type { Ambition } from "../map-board";
import { assert, assertEqual, assertEqualEventually } from "./assert";
import { beforeEach, describe, skip, test } from "./suite";

describe("set tile", () => {
  let ambitions: Record<Ambition, Record<number, number>>;
  beforeEach(() => {
    ambitions = {
      tycoon: {},
      tyrant: {},
      warlord: {},
      keeper: {},
      empath: {},
      edenguard: {},
      blightkin: {},
    };
    globalEvents.onAmbitionTallied.add((ambition, slot, value) => {
      if (!ambitions) return;
      ambitions[ambition] = ambitions[ambition] ?? {};
      ambitions[ambition][slot] = value;
    });
  });

  test("edenguard", async () => {
    const fates = world
      .getObjectsByTemplateName<Card>("fate")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    if (fates.length === 0) skip("no fates");
    // run setup
    (fates[0] as TestableCard).onClick(4, fates[0]);

    // assign guardian to 1p
    const slots = world.getSlots();
    const slot = slots[0];
    const guardian = fates[2].takeCards(1, false, 4)!;
    guardian.setPosition(
      world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slots[0])!
        .getAllSnapPoints()
        .find((s) => s.getTags().includes("fate"))!
        .getGlobalPosition()
        .add([0, 0, 1]),
    );
    guardian.snap();
    await new Promise((resolve) => setTimeout(resolve, 500)); // wait to avoid hang?
    (guardian as TestableCard).onSnapped.trigger(guardian);
    const firstRegent = world.getObjectByTemplateName("first-regent")!;
    assert(
      firstRegent.getPosition().distance(guardian.getPosition()) < 7,
      "first regent with guardian",
    );

    // place edenguard
    const edenguard = world.getObjectByTemplateName("set-tile");
    assert(edenguard !== undefined, "edenguard");
    const map = world.getObjectByTemplateName("map")!;
    edenguard.setPosition(map.getPosition().add([0, 0, 1]));

    // imperial control
    const number = world.getObjectByTemplateName<Dice>("number")!;
    const imperial = [, 2, 2, 4, 2, 2, 4][+number.getCurrentFaceName()]!;
    assertEqual(
      ambitions.edenguard,
      { [slot]: imperial },
      "initial imperial control",
    );
    // imperial control follows first regent
    const boards = world.getObjectsByTemplateName("board")!;
    firstRegent.setPosition(
      boards
        .find((d) => d.getOwningPlayerSlot() === slots[1])!
        .getPosition()
        .add([0, -23, 1]),
    );
    await assertEqualEventually(
      () => ambitions.edenguard,
      { [slots[1]]: imperial },
      "first regent moved",
    );

    // player control
    // place 2p ships
    for (const s of getSystems())
      if (s.snap.getTags().includes("resource:fuel"))
        placeShips(slot, 1, s.snap.getGlobalPosition());
    globalEvents.onAmbitionShouldTally.trigger("edenguard");
    assertEqual(
      ambitions.edenguard,
      {
        [slots[1]]: imperial,
        [slot]: [, 3, 3, 2, 3, 3, 2][+number.getCurrentFaceName()]!,
      },
      "player control",
    );
  });

  test("blightkin", async () => {
    const fates = world
      .getObjectsByTemplateName<Card>("fate")
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    if (fates.length === 0) skip("no fates");
    // run setup
    (fates[0] as TestableCard).onClick(4, fates[0]);

    // assign naturalist to 1p
    const slots = world.getSlots();
    const slot = slots[0];
    const guardian = fates[2].takeCards(1, false, 3)!;
    guardian.setPosition(
      world
        .getObjectsByTemplateName("board")
        .find((d) => d.getOwningPlayerSlot() === slots[0])!
        .getAllSnapPoints()
        .find((s) => s.getTags().includes("fate"))!
        .getGlobalPosition()
        .add([0, 0, 1]),
    );
    guardian.snap();
    await new Promise((resolve) => setTimeout(resolve, 500)); // wait to avoid hang?
    (guardian as TestableCard).onSnapped.trigger(guardian);
    const firstRegent = world.getObjectByTemplateName("first-regent")!;
    assert(
      firstRegent.getPosition().distance(guardian.getPosition()) < 7,
      "first regent with naturalist",
    );

    // place blightkin
    const blightkin = world.getObjectByTemplateName("set-tile");
    assert(blightkin !== undefined, "edenguard");
    const map = world.getObjectByTemplateName("map")!;
    blightkin.setPosition(map.getPosition().add([0, 0, 1]));

    // imperial control
    assertEqual(ambitions.blightkin, {}, "initial imperial control");
    for (const s of getSystems())
      if (s.snap.getTags().includes("system:0"))
        placeShips(4, 1, s.snap.getGlobalPosition());
    assertEqual(ambitions.blightkin, {}, "damaged blight");
    for (const blight of world.getObjectsByTemplateName<Card>("set-round"))
      if (
        blight.getStackSize() === 1 &&
        blight.getCardDetails().metadata === "blight"
      )
        blight.flipOrUpright();
    await assertEqualEventually(
      () => ambitions.blightkin,
      { [slot]: 4 },
      "fresh blight",
    );

    // imperial control follows first regent
    const boards = world.getObjectsByTemplateName("board")!;
    firstRegent.setPosition(
      boards
        .find((d) => d.getOwningPlayerSlot() === slots[1])!
        .getPosition()
        .add([0, -23, 1]),
    );
    await assertEqualEventually(
      () => ambitions.blightkin,
      { [slots[1]]: 4 },
      "first regent moved",
    );

    // player control
    // place 2p ships
    for (const s of getSystems())
      if (s.snap.getTags().includes("resource:fuel"))
        placeShips(slot, 1, s.snap.getGlobalPosition());
    globalEvents.onAmbitionShouldTally.trigger("blightkin");
    const number = world.getObjectByTemplateName<Dice>("number")!;
    assertEqual(
      ambitions.blightkin,
      {
        [slots[1]]: 4,
        [slot]: [, 3, 3, 2, 3, 3, 2][+number.getCurrentFaceName()]!,
      },
      "player control",
    );
  });
});
