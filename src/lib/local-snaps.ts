import type { GameObject } from "@tabletop-playground/api";
import { world, ZonePermission } from "@tabletop-playground/api";

// When an object to snapped to a "local" snap point, disable it within a zone
// matching the snap area until all objects have exited the zone.
export function localSnaps(obj: GameObject) {
  for (const [i, snap] of obj.getAllSnapPoints().entries()) {
    if (!snap.getTags().includes("local")) continue;
    const zone = world.createZone(snap.getGlobalPosition());
    zone.setId(`zone-snap-${obj.getId()}-${i}`);
    zone.setScale([0.1, 0.1, 0.1]);
    zone.onBeginOverlap.add(() => zone.setSnapping(ZonePermission.Nobody));
    zone.onEndOverlap.add(() => {
      if (zone.getOverlappingObjects().length <= 1)
        zone.setSnapping(ZonePermission.Everybody);
    });
  }
}
