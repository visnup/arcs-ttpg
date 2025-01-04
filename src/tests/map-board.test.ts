import { ObjectType, world } from "@tabletop-playground/api";
import { getSystems, placeShips } from "../lib/setup";
import { assert, assertEqual } from "./assert";
import { describe, test } from "./suite";

describe("map board", () => {
  test("penetrable", async () => {
    const systems = getSystems();
    const ships = placeShips(0, 2, systems[0].snap.getGlobalPosition());
    assertEqual(ships.length, 2, "placed 2 ships");
    assert(
      ships.every((s) => s.getObjectType() === ObjectType.Penetrable),
      "type = penetrable",
    );
    const board = world.getObjectByTemplateName("board")!;
    for (const s of ships) s.setPosition(board.getPosition().add([0, 0, 2]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert(
      ships.every((s) => s.getObjectType() === ObjectType.Regular),
      "type = regular",
    );
  });
});
