import { Color, world } from "@tabletop-playground/api";

// Reset all zones
for (const zone of world.getAllZones())
  if (zone.getId().startsWith("zone-")) zone.destroy();

// Set owning player slots by matching color
const colors = Object.fromEntries(
  [0, 1, 2, 3, 4].map((i) => [world.getSlotColor(i).toHex(), i]),
);
for (const obj of world.getAllObjects())
  if (obj.getOwningPlayerSlot() === -1) {
    const c = obj.getPrimaryColor().toHex();
    if (c in colors) obj.setOwningPlayerSlot(colors[c]);
  }

(world as any).saturate = function (color: Color, amount: number) {
  let [h, s, l] = rgbToHsl(color);
  s! += s! * amount;
  return hslToRgb([h!, s!, l!]);
};

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

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
