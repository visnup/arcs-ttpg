import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  Color,
  HorizontalBox,
  Text,
  UIElement,
  Vector,
  world,
  ZonePermission,
} from "@tabletop-playground/api";
import { render, jsxInTTPG } from "jsx-in-ttpg";
const refObject = _refObject;
const refPackageId = _refPackageId;

// Card zone
const zoneId = `zone-action-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ?? world.createZone(refObject.getPosition());
{
  const { x, y } = refObject.getSize();
  const size = new Vector(x * 0.62, y * 0.15, 20);
  zone.setId(zoneId);
  zone.setPosition(
    refObject.getPosition().add(new Vector(0, (size.y - y) / 2, 0)),
  );
  zone.setRotation(refObject.getRotation());
  zone.setStacking(ZonePermission.Nobody);
  zone.setScale(size);
}

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
              color={saturate(world.getSlotColor(slot), 0.75)}
              size={48}
              font="FMBP700.ttf"
              fontPackage={refPackageId}
            >
              {` ${score} `}
            </text>,
          ),
        );
    }
  }
}

function saturate(color: Color, amount: number) {
  let [h, s, l] = rgbToHsl(color);
  s! += s! * amount;
  return hslToRgb([h!, s!, l!]);
}

export type Ambition = "tycoon" | "tyrant" | "warlord" | "keeper" | "empath";

const ext = Object.assign(refObject, {
  ambitions: Object.fromEntries(
    ["tycoon", "tyrant", "warlord", "keeper", "empath"].map((name, i) => [
      name,
      new AmbitionSection(i),
    ]),
  ) as Record<Ambition, AmbitionSection>,
});
refObject.setId("map");
export type MapBoard = typeof ext;

// https://gist.github.com/mjackson/5311256
function rgbToHsl({ r, g, b }: Color) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h! /= 6;
  }

  return [h, s, l];
}

world.clearConsole();
function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
function hslToRgb([h, s, l]: number[]) {
  let r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p: number, q: number, t: number) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return new Color(clamp(r), clamp(g), clamp(b));
}
