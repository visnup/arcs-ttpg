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
  "Toggle damage",
  "Toggle ship damage from fresh to damaged or back",
);

function toggle(obj: GameObject) {
  obj.setPosition(obj.getPosition().add(new Vector(0, 0, obj.getSize().z)));
  const center = obj.getExtentCenter(true, false);
  const { pitch, yaw, roll } = obj.getRotation();
  if (Math.abs(pitch) < 1) obj.setRotation(new Rotator(-90, yaw, roll));
  else obj.setRotation(new Rotator(0, yaw + roll, 0));
  const delta = center.subtract(obj.getExtentCenter(true, false));
  obj.setPosition(obj.getPosition().add(delta));
  obj.snapToGround();
}
