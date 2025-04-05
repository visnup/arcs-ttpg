import type { VerticalBox, Zone } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  Card,
  HorizontalAlignment,
  Rotator,
  UIElement,
  Vector,
  world,
  type GameObject,
  type Player,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { takeCard } from "./lib/setup";
import { Tally } from "./lib/tally";

const refObject = _refObject;
const registered = new WeakSet<GameObject>();

// Zones for each card
const zones = new Set<Zone>();
const widgets = [] as VerticalBox[];
const { x, y } = refObject.getSize();
for (const [i, snap] of refObject.getAllSnapPoints().entries()) {
  const zoneId = `zone-court-${refObject.getId()}-${i}`;
  const zone = world.getZoneById(zoneId) ?? world.createZone([0, 0, 0]);
  zones.add(zone);
  const size = new Vector(x * 1.6, y / refObject.getAllSnapPoints().length, 5);
  zone.setId(zoneId);
  zone.setPosition(snap.getGlobalPosition().add(new Vector(0, x * 0.3, 0)));
  zone.setRotation(refObject.getRotation());
  zone.setScale(size);
  zone.onBeginOverlap.add(tallyAgents);
  zone.onEndOverlap.add(tallyAgents);
  zone.onBeginOverlap.add(canTakeCard);
  refObject.onDestroyed.add(() => zone.destroy());

  const ui = Object.assign(new UIElement(), {
    position: snap.getLocalPosition().add(new Vector(x / 2 + 0.6, 0, 0)),
    rotation: new Rotator(0, 0, 90),
    scale: 0.15,
    widget: render(
      <verticalbox halign={HorizontalAlignment.Center} gap={15} />,
    ),
  });
  widgets.push(ui.widget as VerticalBox);
  refObject.addUI(ui);

  tallyAgents(zone);
  for (const o of zone.getOverlappingObjects()) canTakeCard(zone, o);
}

function tallyAgents(zone: Zone) {
  const tallies = new Array(4).fill(0);
  for (const obj of zone.getOverlappingObjects())
    if (obj.getTemplateName() === "agent") tallies[obj.getOwningPlayerSlot()]++;
  const widget =
    widgets[+zone.getId().replace(`zone-court-${refObject.getId()}-`, "")];
  widget.removeAllChildren();
  for (const [slot, value] of [...tallies.entries()].sort(
    (a, b) => b[1] - a[1],
  ))
    if (value)
      widget.addChild(
        render(
          <Tally
            value={value}
            color={world.getSlotColor(slot).saturate(0.8)}
          />,
        ),
      );
}

function canTakeCard(zone: Zone, object: GameObject) {
  if (!(object instanceof Card) || registered.has(object)) return;
  object.onPrimaryAction.add((card, player) => secureCard(player, card));
  object.onSecondaryAction.add((card, player) => ransackCard(player, card));
  registered.add(object);
}
function secureCard(player: Player, card: Card) {
  takeAgents(player.getSlot(), card, [-2, 9.2], [2.4, 2.3]); // captives
  takeCard(player.getSlot(), card);
}
function ransackCard(player: Player, card: Card) {
  takeAgents(player.getSlot(), card, [-2, 2.3], [2.4, 3.1]); // trophies
  takeCard(player.getSlot(), card);
}

function takeAgents(
  slot: number,
  card: Card,
  [cx, cy]: [number, number],
  [ex, ey]: [number, number],
) {
  const zone = [...zones].find((z) => z.getOverlappingObjects().includes(card));
  if (!zone) return;
  const board = world
    .getObjectsByTemplateName("board")
    .find((o) => o.getOwningPlayerSlot() === slot);
  if (!board) return;
  const p = board.getPosition().add([cx, cy, 3]);
  for (const o of zone.getOverlappingObjects()) {
    if (o.getTemplateName() !== "agent") continue;
    if (o.getOwningPlayerSlot() === slot) {
      if ("discard" in o && typeof o.discard === "function") o.discard();
    } else {
      o.setPosition(Vector.randomPointInBoundingBox(p, [ex, ey, 3]), 1.5);
      o.snap();
    }
  }
}
