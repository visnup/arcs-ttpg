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
    assertEqual(ambitions.warlord[0], 16);
  });

  test("captives", () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === 0)!;
    const box = board.getPosition().add([-2, 9, 1]);
    const places = [placeShips, placeAgents, placeCities, placeStarports];
    for (const slot of [0, 1, 2, 3, 4])
      for (const place of places)
        for (const o of place(slot, 1, box.add([offset(2), offset(2), 0])))
          o.setObjectType(ObjectType.Penetrable);
    assertEqual(ambitions.tyrant[0], 3);
  });

  test("resources", () => {
    for (let n = 0; n < 2; n++) {
      gainResource(0, "fuel");
      gainResource(1, "material");
      gainResource(2, "relic");
      gainResource(3, "psionic");
    }
    assertEqual(ambitions.tycoon[0], 2);
    assertEqual(ambitions.tycoon[1], 2);
    assertEqual(ambitions.keeper[2], 2);
    assertEqual(ambitions.empath[3], 2);
  });
});
