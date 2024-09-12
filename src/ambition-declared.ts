import { refObject } from "@tabletop-playground/api";

const position = refObject.getPosition();
const rotation = refObject.getRotation();
function discard(obj: typeof refObject) {
  obj.setPosition(position, 1);
  obj.setRotation(rotation, 1);
}

refObject.onPrimaryAction.add(discard);
Object.assign(refObject, {
  discard: function (this: typeof refObject) {
    discard(this);
  },
});
