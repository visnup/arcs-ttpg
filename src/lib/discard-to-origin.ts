import type { GameObject, Rotator, Vector } from "@tabletop-playground/api";

type Origin = {
  position: Vector | [number, number, number];
  rotation: Rotator | [number, number, number];
};

export function discardToOrigin(obj: GameObject) {
  const origin: Origin = JSON.parse(obj.getSavedData("origin") || "{}");
  if (!origin.position || !origin.rotation) {
    origin.position = obj.getPosition();
    origin.rotation = obj.getRotation();
    obj.setSavedData(JSON.stringify(origin), "origin");
  }

  function discard() {
    obj.setPosition(origin.position, 1.5);
    obj.setRotation(origin.rotation, 1.5);
  }

  // @ts-expect-error any
  obj.discard = discard;
  obj.onPrimaryAction.add(discard);

  return obj;
}