import {
  GameObject,
  refObject,
  Rotator,
  Vector,
} from "@tabletop-playground/api";

// r to toggle ship damage
refObject.onPrimaryAction.add(toggle);
refObject.onCustomAction.add(toggle);
refObject.addCustomAction(
  "Toggle Damage",
  "Toggle ship damage from fresh to damaged or back",
);

function toggle(obj: GameObject) {
  const center = obj.getExtentCenter(true, false);
  obj.setPosition(obj.getPosition().add(new Vector(0, 0, obj.getSize().z / 2)));
  const { pitch, yaw, roll } = obj.getRotation();
  obj.setRotation(new Rotator(pitch, yaw, Math.abs(roll) < 1 ? 90 : 0));
  const delta = center.subtract(obj.getExtentCenter(true, false));
  obj.setPosition(obj.getPosition().add(delta));
  obj.snapToGround();
}
