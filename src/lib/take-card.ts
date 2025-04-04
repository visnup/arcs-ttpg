import {
  world,
  type Card,
  type Vector,
  type Zone,
} from "@tabletop-playground/api";

export function takeCard(card: Card, slot: number) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot);
  const zone = world.getZoneById(`zone-player-court-${board?.getId()}`);
  if (!board || !zone) return;
  for (const p of courtSpots(zone, card.getExtent(false, false))) {
    card.setPosition(p.add([0, 0, 1]), 1.5);
    card.snap();
    return card;
  }
}

function* courtSpots(zone: Zone, extent: Vector) {
  const p = zone.getPosition();
  const [w, h] = zone.getScale().add([0, -20, 0]).multiply(0.5);
  const [dx, dy] = extent;
  const gap = 0.3;
  const pad = ((h / (dy + gap / 2)) % 1) * (dy + gap / 2);
  const s = Math.sign(p.x);
  for (let x = (-w + dx) * s; s > 0 ? x < w : x > -w; x += (2 * dx + gap) * s)
    for (let y = -h + pad + dy; y < h - dy; y += 2 * dy + gap) {
      const s = p.add([x, y, 0]);
      if (world.boxTrace(s, s.add([0, 0, 1]), extent).length === 0) yield s;
      // world.drawDebugBox(s, extent.add([0, 0, 5]), [0, 0, 0], [1, 0, 0, 0], 5);
    }
}
