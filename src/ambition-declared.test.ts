import { describe, expect, test } from "@jest/globals";
import { MockGameObject, Rotator, Vector } from "ttpg-mock";
import { extend } from "./ambition-declared";
import { world } from "./global";

describe("ambition-declared", () => {
  expect(world).toBeDefined();

  test("discard returns to origin", () => {
    const origin = {
      position: new Vector(1, 2, 3),
      rotation: new Rotator(4, 5, 6),
    };
    const obj = extend(new MockGameObject(origin));

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
});
