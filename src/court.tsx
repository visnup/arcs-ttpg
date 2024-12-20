import type { VerticalBox, Zone } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  HorizontalAlignment,
  Rotator,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";

const refObject = _refObject;
const refPackageId = _refPackageId;

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
  ui.position = snap.getLocalPosition().add(new Vector(x / 2 + 0.5, 0, 0));
  ui.rotation = new Rotator(0, 0, 90);
  ui.scale = 0.15;
  widgets.push(
    (ui.widget = render(
      <verticalbox halign={HorizontalAlignment.Center} />,
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
          <text
            size={48}
            color={world.saturate(world.getSlotColor(slot), 0.5)}
            font="FMBolyarPro-700.ttf"
            fontPackage={refPackageId}
          >
            {c}
          </text>,
        ),
      );
}
