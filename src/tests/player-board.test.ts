import { globalEvents, ObjectType, world } from "@tabletop-playground/api";
import {
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

let ambitions: Record<Ambition, Record<number, number>>;
globalEvents.onAmbitionScored.add((ambition, slot, score) => {
  ambitions[ambition] = ambitions[ambition] ?? {};
  ambitions[ambition][slot] = score;
});

describe("player board", () => {
  beforeEach(
    () =>
      (ambitions = {
        tycoon: {},
        tyrant: {},
        warlord: {},
        keeper: {},
        empath: {},
      }),
  );

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

  // test("captives", () => {});
  // test("resources", () => {});
});
