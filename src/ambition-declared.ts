import { refObject } from "@tabletop-playground/api";

const position = refObject.getPosition();
const rotation = refObject.getRotation();
refObject.onPrimaryAction.add((obj) => {
  obj.setPosition(position);
  obj.setRotation(rotation);
});
