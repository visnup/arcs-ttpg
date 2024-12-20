import { refObject, world } from "@tabletop-playground/api";

const { position, rotation } = world.getOrigin(refObject);

function discard(obj: typeof refObject) {
  obj.setPosition(position, 1.5);
  obj.setRotation(rotation, 1.5);
}

refObject.onPrimaryAction.add(discard);
Object.assign(refObject, {
  discard: function (this: typeof refObject) {
    discard(this);
  },
});
