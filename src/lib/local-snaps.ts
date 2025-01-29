import type { GameObject } from "@tabletop-playground/api";
import { world, ZonePermission } from "@tabletop-playground/api";

// When an object to snapped to a "local" snap point, disable it within a zone
// matching the snap area until all objects have exited the zone.
export function localSnaps(obj: GameObject) {
  const local = obj
    .getAllSnapPoints()
    .filter((s) => s.getTags().includes("local"));
  for (const [i, snap] of local.entries()) {
    const zone = world.createZone(snap.getGlobalPosition());
    zone.setId(`zone-snap-${obj.getId()}-${i}`);
    zone.setScale([0.1, 0.1, 0.1]);
    zone.onBeginOverlap.add((zone, o) => {
      if (o !== obj) zone.setSnapping(ZonePermission.Nobody);
    });
    zone.onEndOverlap.add((zone, o) => {
      if (o !== obj && zone.getOverlappingObjects().length <= 1)
        zone.setSnapping(ZonePermission.Everybody);
    });
    obj.onDestroyed.add(() => zone.destroy());
  }
}
