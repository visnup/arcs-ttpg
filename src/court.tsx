import type { VerticalBox, Zone } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  HorizontalAlignment,
  Rotator,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { Tally } from "./lib/tally";

const refObject = _refObject;

// Zones for each card
const widgets = [] as VerticalBox[];
const { x, y } = refObject.getSize();
for (const [i, snap] of refObject.getAllSnapPoints().entries()) {
  const zoneId = `zone-court-${refObject.getId()}-${i}`;
  const zone =
    world.getZoneById(zoneId) ??
    world.createZone(snap.getGlobalPosition().add(new Vector(0, x * 0.3, 0)));
  const size = new Vector(x * 1.6, y / refObject.getAllSnapPoints().length, 5);
  zone.setId(zoneId);
  zone.setRotation(refObject.getRotation());
  zone.setScale(size);
  zone.onBeginOverlap.add(countAgents);
  zone.onEndOverlap.add(countAgents);

  const ui = new UIElement();
  ui.position = snap.getLocalPosition().add(new Vector(x / 2 + 0.6, 0, 0));
  ui.rotation = new Rotator(0, 0, 90);
  ui.scale = 0.15;
  widgets.push(
    (ui.widget = render(
      <verticalbox halign={HorizontalAlignment.Center} gap={15} />,
    )) as VerticalBox,
  );
  refObject.addUI(ui);

  countAgents(zone);
}

function countAgents(zone: Zone) {
  const count = new Array(4).fill(0);
  for (const obj of zone.getOverlappingObjects())
    if (obj.getTemplateName() === "agent") count[obj.getOwningPlayerSlot()]++;
  const widget =
    widgets[+zone.getId().replace(`zone-court-${refObject.getId()}-`, "")];
  widget.removeAllChildren();
  for (const [slot, c] of [...count.entries()].sort((a, b) => b[1] - a[1]))
    if (c)
      widget.addChild(
        render(
          <Tally value={c} color={world.getSlotColor(slot).saturate(0.8)} />,
        ),
      );
}
