import { world, type GameObject } from "@tabletop-playground/api";

export function getCounts(filter = (obj: GameObject) => !!obj) {
  const counts: Record<string, Record<string, number>> = {};
  for (const obj of world.getAllObjects().filter(filter)) {
    const slot = (counts[obj.getOwningPlayerSlot()] ||= {});
    slot[obj.getTemplateName()] = (slot[obj.getTemplateName()] || 0) + 1;
  }
  return counts;
}
