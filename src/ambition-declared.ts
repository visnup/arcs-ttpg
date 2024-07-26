import { refObject } from "@tabletop-playground/api";

const position = refObject.getPosition();
const rotation = refObject.getRotation();
function resetPosition(obj: typeof refObject) {
  obj.setPosition(position, 1);
  obj.setRotation(rotation, 1);
}

refObject.onPrimaryAction.add(resetPosition);
(refObject as any).discard = function (this: typeof refObject) {
  resetPosition(this);
};
