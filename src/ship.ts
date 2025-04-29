import type { GameObject } from "@tabletop-playground/api";
import {
  globalEvents,
  refObject,
  Rotator,
  Vector,
  world,
} from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

// discardable
discardToOrigin(refObject, true, false);

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

// cmd-r to orient ships
refObject.onSecondaryAction.add((obj, player) => {
  const origin = world.getObjectById("map")!.getPosition();
  const ships = player.getSelectedObjects();
  if (ships[0] !== obj) return; // only one cook in the kitchen
  const p = ships
    .map((s) => s.getPosition())
    .reduce((m, p) => m.add(p))
    .divide(ships.length);
  const direction = p.subtract(origin).unit();
  let { yaw } = direction.toRotator();
  yaw += Math.random() > 0.5 ? 90 : -90;
  const half = (ships.length - 1) / 2;
  const width = ships[0]?.getSize().y + 0.1;
  for (const [j, ship] of ships.entries()) {
    const { pitch, roll } = ship.getRotation();
    ship.setRotation([pitch, yaw + Math.random() * 10 - 5, roll]);
    ship.setPosition(p.add(direction.multiply((j - half) * width)));
    ship.snap();
  }
});

// lights
refObject.switchLights(false);
refObject.onGrab.add((obj) => obj.switchLights(true));
refObject.onReleased.add((obj) => obj.switchLights(false));

// edenguard and blightkin
refObject.onGrab.add(onAmbitionShouldTally);
refObject.onReleased.add(onAmbitionShouldTally);
function onAmbitionShouldTally() {
  globalEvents.onAmbitionShouldTally.trigger("edenguard");
  globalEvents.onAmbitionShouldTally.trigger("blightkin");
}
