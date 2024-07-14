const { refObject } = require("@tabletop-playground/api");

// r to toggle ship damage
refObject.onPrimaryAction.add(toggle);
refObject.onCustomAction.add((obj, player, identifier) => {
  if (identifier === "toggle") toggle(obj, player);
});
refObject.addCustomAction(
  "Toggle damage",
  "Toggle ship damage from fresh to damaged or back",
  "toggle",
);

function toggle(obj, _player) {
  obj.setPosition(obj.getPosition().add(new Vector(0, 0, 0.5)));
  const r = obj.getRotation();
  if (Math.abs(r.pitch) < 1) obj.setRotation(new Rotator(-90, r.yaw, r.roll));
  else obj.setRotation(new Rotator(0, r.yaw + r.roll, 0));
}
