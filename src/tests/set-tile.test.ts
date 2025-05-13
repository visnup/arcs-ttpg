import {
  globalEvents,
  world,
  type Card,
  type Dice,
} from "@tabletop-playground/api";
import type { TestableCard } from "../campaign-fate-card";
import { getSystems, placeShips } from "../lib/setup";
import type { Ambition } from "../map-board";
import { assert, assertEqual } from "./assert";
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

  test.only("edenguard", async () => {
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
      "first regent with admiral",
    );

    // place edenguard
    const edenguard = world.getObjectByTemplateName("set-tile");
    assert(edenguard !== undefined, "edenguard");
    const map = world.getObjectByTemplateName("map")!;
    edenguard.setPosition(map.getPosition().add([0, 0, 1]));

    // empire control
    const number = world.getObjectByTemplateName<Dice>("number")!;
    assertEqual(
      ambitions,
      {
        tycoon: { 0: 0, 1: 0, 2: 0, 3: 0 },
        tyrant: { 0: 0, 1: 0, 2: 0, 3: 0 },
        warlord: { 0: 0, 1: 0, 2: 0, 3: 0 },
        keeper: { 0: 0, 1: 0, 2: 0, 3: 0 },
        empath: { 0: 0, 1: 0, 2: 0, 3: 0 },
        edenguard: {
          [slot]: [, 2, 2, 4, 2, 2, 4][+number.getCurrentFaceName()]!,
        },
        blightkin: {},
      },
      "initial empire control",
    );
    // empire control follows first regent
    firstRegent.setPosition();

    // player control
    // place 2p ships
    console.log("systems", JSON.stringify(getSystems()));
    placeShips(slots[1], 1, getSystems()[0].snap.getGlobalPosition());
  });

  test("blightkin", async () => {});
});
