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
  const zone = world.getZoneById(zoneId) ?? world.createZone([0, 0, 0]);
  const size = new Vector(x * 1.6, y / refObject.getAllSnapPoints().length, 5);
  zone.setId(zoneId);
  zone.setPosition(snap.getGlobalPosition().add(new Vector(0, x * 0.3, 0)));
  zone.setRotation(refObject.getRotation());
  zone.setScale(size);
  zone.onBeginOverlap.add(tallyAgents);
  zone.onEndOverlap.add(tallyAgents);
  refObject.onDestroyed.add(() => zone.destroy());

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

  tallyAgents(zone);
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
