import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  HorizontalBox,
  UIElement,
  Vector,
  world,
  ZonePermission,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";

const refObject = _refObject;
const refPackageId = _refPackageId;

// Global map id
refObject.setId("map");

export type Ambition = "tycoon" | "tyrant" | "warlord" | "keeper" | "empath";

// Card zone
const zoneId = `zone-action-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ?? world.createZone(refObject.getPosition());
{
  const { x, y } = refObject.getSize();
  const size = new Vector(x * 0.62, y * 0.15, 2);
  zone.setId(zoneId);
  zone.setPosition(
    refObject.getPosition().add(new Vector(0, (size.y - y) / 2, 0)),
  );
  zone.setRotation(refObject.getRotation());
  zone.setScale(size);
  zone.setStacking(ZonePermission.Nobody);
}

// Ambition ranks
const size = refObject.getSize();
class AmbitionSection {
  scores: Map<number, number>;
  ui: UIElement;
  widget: HorizontalBox;

  constructor(offset: number) {
    this.scores = new Map();
    this.ui = new UIElement();
    this.ui.position = new Vector(
      size.x / 2 - (12.9 + offset * 5.3),
      size.y / 2 - 5,
      size.z + 0.35,
    );
    this.ui.scale = 0.15;
    this.ui.widget = this.widget = new HorizontalBox();
    refObject.addUI(this.ui);
  }

  setScore(slot: number, score: number) {
    if (this.scores.get(slot) === score) return;
    this.scores.set(slot, score);
    this.widget.removeAllChildren();
    for (const [slot, score] of [...this.scores.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      if (score)
        this.widget.addChild(
          render(
            <text
              color={world.saturate(world.getSlotColor(slot), 0.5)}
              size={48}
              font="FMBolyarPro-700.ttf"
              fontPackage={refPackageId}
            >
              {` ${score} `}
            </text>,
          ),
        );
    }
  }

  declare() {
    const marker = getAmbitionMarker();
    if (!marker) return;
    const center = refObject
      .getPosition()
      .add(this.ui.position)
      .add(new Vector(1.5, 0, 0));
    const occupied = world
      .getObjectsByTemplateName("ambition")
      .filter((d) => Math.abs(d.getPosition().x - center.x) < 2.2)
      .sort((a, b) => a.getPosition().y - b.getPosition().y)
      .concat(marker);
    const y = marker.getSize().x + 0.2;
    const left = center.add(new Vector(0, ((1 - occupied.length) * y) / 2, 0));
    for (const [i, m] of occupied.entries())
      m.setPosition(left.add(new Vector(0, i * y, 0.01)), 1.5);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ext = Object.assign(refObject, {
  ambitions: Object.fromEntries(
    ["tycoon", "tyrant", "warlord", "keeper", "empath"].map((name, i) => [
      name,
      new AmbitionSection(i),
    ]),
  ) as Record<Ambition, AmbitionSection>,
});
export type MapBoard = typeof ext;

function getAmbitionMarker() {
  return world
    .getObjectsByTemplateName("ambition")
    .filter((d) => d.getSnappedToPoint())
    .sort((a, b) => a.getPosition().y - b.getPosition().y)[0];
}
