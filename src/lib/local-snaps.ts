import type { GameObject, SnapPoint, Zone } from "@tabletop-playground/api";
import { world, ZonePermission } from "@tabletop-playground/api";

// When an object to snapped to a "local" snap point, disable it within a zone
// matching the snap area until all objects have exited the zone.
const snaps = new WeakMap<SnapPoint, Zone>();
export function localSnaps(obj: GameObject) {
  obj.onSnappedTo.add((obj, player, snap) => {
    if (!snap.getTags().includes("local")) return;
    if (snaps.has(snap)) return console.warn("Local snap point used twice?");
    const zone = world.createZone(snap.getGlobalPosition());
    zone.setScale([1, 1, 1]);
    zone.setSnapping(ZonePermission.Nobody);
    zone.onEndOverlap.add((zone) => {
      if (zone.getOverlappingObjects().length === 1) {
        snaps.delete(snap);
        zone.destroy();
      }
    });
    snaps.set(snap, zone);
  });
}
