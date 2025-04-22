import { refObject, world } from "@tabletop-playground/api";

// Rotate stacked markers to grab one you want
const names = new Set(["power", "objective"]);
refObject.onPrimaryAction.add((obj) => {
  const p = obj.getPosition();
  const stack = world
    .lineTrace(p.add([0, 0, -10]), p.add([0, 0, 10]))
    .map((d) => d.object)
    .filter((d) => names.has(d.getTemplateName()));
  stack[0].setPosition(stack[stack.length - 1].getPosition().add([0, 0, 2]));
  for (const obj of [...stack.slice(1), stack[0]]) obj.snap();
});
