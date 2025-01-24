import type { Card } from "@tabletop-playground/api";
import { globalEvents, ObjectType, world } from "@tabletop-playground/api";
import {
  gainResource,
  placeAgents,
  placeBlight,
  placeCities,
  placeShips,
  placeStarports,
} from "../lib/setup";
import type { Ambition } from "../map-board";
import { assertEqual } from "./assert";
import { beforeEach, describe, test } from "./suite";

const offset = (n: number) => 2 * n * Math.random() - n;

describe("player board", () => {
  let ambitions: Record<Ambition, Record<number, number>>;
  beforeEach(() => {
    ambitions = {
      tycoon: {},
      tyrant: {},
      warlord: {},
      keeper: {},
      empath: {},
    };
    globalEvents.onAmbitionTallied.add((ambition, slot, value) => {
      if (!ambitions) return;
      ambitions[ambition] = ambitions[ambition] ?? {};
      ambitions[ambition][slot] = value;
    });
  });

  test("trophies", () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === 0)!;
    const box = board.getPosition().add([-2, 2, 1]);
    const places = [placeShips, placeAgents, placeCities, placeStarports];
    for (const slot of [0, 1, 2, 3, 4])
      for (const place of places)
        for (const o of place(slot, 1, box.add([offset(2), offset(2), 0])))
          o.setObjectType(ObjectType.Penetrable);
    placeBlight(box)!.setObjectType(ObjectType.Penetrable);
    assertEqual(ambitions, {
      tycoon: { "0": 0 },
      tyrant: { "0": 0 },
      warlord: { "0": 16 },
      keeper: { "0": 0 },
      empath: { "0": 0 },
    });
  });

  test("stacked trophies", async () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === 0)!;
    const box = board.getPosition().add([-2, 2, 1]);
    const blight = [1, 2].map(() => placeBlight(box)!);
    blight[0].addCards(blight[1]);
    assertEqual(blight[0].getStackSize(), 2);
    await new Promise((r) => process.nextTick(r));
    assertEqual(
      ambitions,
      {
        tycoon: { "0": 0 },
        tyrant: { "0": 0 },
        warlord: { "0": 2 },
        keeper: { "0": 0 },
        empath: { "0": 0 },
      },
      "stacked by addCards",
    );
  });

  test("captives", () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === 0)!;
    const box = board.getPosition().add([-2, 9.5, 1]);
    const places = [placeShips, placeAgents, placeCities, placeStarports];
    for (const slot of [0, 1, 2, 3, 4])
      for (const place of places)
        for (const o of place(slot, 1, box.add([offset(1.5), offset(1.5), 0])))
          o.setObjectType(ObjectType.Penetrable);
    assertEqual(ambitions, {
      tycoon: { "0": 0 },
      tyrant: { "0": 3 },
      warlord: { "0": 0 },
      keeper: { "0": 0 },
      empath: { "0": 0 },
    });
  });

  test("resources", () => {
    for (let n = 0; n < 2; n++) {
      gainResource(0, "fuel");
      gainResource(1, "material");
      gainResource(2, "relic");
      gainResource(3, "psionic");
    }
    assertEqual(ambitions, {
      tycoon: { "0": 2, "1": 2, "2": 0, "3": 0 },
      tyrant: { "0": 0, "1": 0, "2": 0, "3": 0 },
      warlord: { "0": 0, "1": 0, "2": 0, "3": 0 },
      keeper: { "0": 0, "1": 0, "2": 2, "3": 0 },
      empath: { "0": 0, "1": 0, "2": 0, "3": 2 },
    });
  });

  test("stacked resources", async () => {
    gainResource(0, "fuel");
    gainResource(0, "fuel");
    assertEqual(
      ambitions,
      {
        tycoon: { "0": 2 },
        tyrant: { "0": 0 },
        warlord: { "0": 0 },
        keeper: { "0": 0 },
        empath: { "0": 0 },
      },
      "unstacked",
    );
    const fuel = world
      .getObjectsByTemplateName<Card>("resource")
      .filter((d) => !world.isOnTable(d));
    assertEqual(fuel.length, 2);
    fuel[0].addCards(fuel[1]);
    assertEqual(fuel[0].getStackSize(), 2);
    await new Promise((r) => process.nextTick(r));
    assertEqual(
      ambitions,
      {
        tycoon: { "0": 2 },
        tyrant: { "0": 0 },
        warlord: { "0": 0 },
        keeper: { "0": 0 },
        empath: { "0": 0 },
      },
      "stacked by addCards",
    );
  });
});
