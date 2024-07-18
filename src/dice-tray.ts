import {
  refObject as _refObject,
  Dice,
  GameObject,
  globalEvents,
  Vector,
  world,
} from "@tabletop-playground/api";
const refObject = _refObject;

// Zone
const zoneId = `zone-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ?? world.createZone(refObject.getPosition());
zone.setId(zoneId);
zone.setRotation(refObject.getRotation());
zone.setScale(refObject.getSize().add(new Vector(0, 0, 20)));
zone.onBeginOverlap.add((_zone, obj) => {
  if (obj instanceof Dice) obj.onPrimaryAction.add(onRoll);
});
zone.onEndOverlap.add((_zone, obj) => {
  if (obj instanceof Dice) obj.onPrimaryAction.remove(onRoll);
});

// Put up guard walls when dice are rolled
let walls: GameObject | undefined;
function onRoll() {
  if (!walls) {
    walls = world.createObjectFromTemplate(
      "5DC351479A4DF3A83EAD41A21E9F33B8",
      refObject.getPosition().add(new Vector(0, 0, refObject.getSize().z)),
    );
    walls!.toggleLock();
  }
}

globalEvents.onDiceRolled.add((player, dice) => {
  // Bring down walls
  walls?.destroy();
  walls = undefined;

  // Total roll
  const total: Record<string, number> = {};
  for (const d of zone.getOverlappingObjects())
    if (d instanceof Dice)
      for (const f of d.getCurrentFaceMetadata().split(" "))
        if (f) total[f] = (total[f] ?? 0) + 1;
  player.showMessage(`You rolled ${JSON.stringify(total)}`);
});
