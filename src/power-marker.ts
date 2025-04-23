import { ObjectType, refObject, world } from "@tabletop-playground/api";

// Rotate stacked markers to grab one you want
refObject.onPrimaryAction.add(rotateStack);
refObject.onCustomAction.add(rotateStack);
refObject.addCustomAction("Raise from bottom");

const names = new Set(["power", "objective"]);
function rotateStack(obj: typeof refObject) {
  const p = obj.getPosition();
  const z = obj.getSize().z + 0.1;
  const stack = world
    .lineTrace(p.add([0, 0, -10]), p.add([0, 0, 10]))
    .map((d) => d.object)
    .filter((d) => names.has(d.getTemplateName()));
  if (stack.length === 1) return;
  stack[0].setPosition(stack[stack.length - 1].getPosition().add([0, 0, z]));
  for (const obj of [...stack.slice(1), stack[0]]) obj.snap();
}

// Make picked up marker penetrable and release ones held above
refObject.onGrab.add((obj) => {
  const p = obj.getPosition();
  if (
    world
      .lineTrace(p, p.add([0, 0, -10]))
      .some((d) => d.object !== obj && d.object.isHeld())
  ) {
    obj.release();
  } else {
    const type = obj.getObjectType();
    obj.setObjectType(ObjectType.Penetrable);
    process.nextTick(() => obj.setObjectType(type));
  }
});
