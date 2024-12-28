import { describe, expect, test } from "@jest/globals";
import type { GameObject } from "@tabletop-playground/api";
import type { MockGameObjectParams } from "ttpg-mock";
import { MockGameObject, Rotator, Vector, world } from "ttpg-mock";
import { discardToOrigin } from "./discard-to-origin";

export function testDiscardToOrigin(
  create: (params: MockGameObjectParams) => GameObject,
) {
  test("discard returns to origin", () => {
    const origin = {
      position: new Vector(1, 2, 3),
      rotation: new Rotator(4, 5, 6),
    };
    const obj = create(origin);

    obj.setPosition(new Vector(7, 8, 9));
    obj.setRotation(new Rotator(10, 11, 12));
    if ("discard" in obj && typeof obj.discard === "function") obj.discard();
    expect(obj.getPosition()).toEqual(origin.position);
    expect(obj.getRotation()).toEqual(origin.rotation);

    obj.setPosition(new Vector(7, 8, 9));
    obj.setRotation(new Rotator(10, 11, 12));
    (obj as MockGameObject)._primaryActionAsPlayer(world.getPlayerBySlot(0)!);
    expect(obj.getPosition()).toEqual(origin.position);
    expect(obj.getRotation()).toEqual(origin.rotation);
  });
}

describe("discardToOrigin", () => {
  testDiscardToOrigin((params) => discardToOrigin(new MockGameObject(params)));
});
