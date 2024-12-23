import type { GameObject, Player } from "@tabletop-playground/api";
import {
  Color,
  GameWorld,
  globalEvents,
  GlobalScriptingEvents,
  refPackageId,
  Vector,
  world,
} from "@tabletop-playground/api";
import type { Ambition } from "./map-board";
import { TriggerableMulticastDelegate } from "./triggerable-multicast-delegate";

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

// Hotkey to mimic hot seat functionality
if (refPackageId === "8878F08F55344ED182D61F6E91585D56")
  globalEvents.onScriptButtonPressed.add((player: Player, index: number) => {
    const dir = [, -1, 1][index];
    if (dir) {
      const n = world.getObjectsByTemplateName("board").length;
      player.switchSlot((n + player.getSlot() + dir) % n);
    }
  });

// Extend GameWorld
declare module "@tabletop-playground/api" {
  interface GameWorld {
    getObjectsByTemplateName<T = GameObject>(name: string): T[];
    getObjectByTemplateName<T = GameObject>(name: string): T | undefined;
    getSlots<T extends GameObject>(
      name?: string,
      filter?: (d: T, index: number) => boolean,
    ): number[];
    getOrigin(obj: GameObject): {
      position: [number, number, number];
      rotation: [number, number, number];
    };
    isOnMap(obj: GameObject): boolean;
    isOnTable(obj: GameObject, templateNames?: string[]): boolean;
  }
}
GameWorld.prototype.getObjectsByTemplateName = function <T>(name: string) {
  return this.getAllObjects().filter(
    (d) => d.getTemplateName() === name,
  ) as T[];
};
GameWorld.prototype.getObjectByTemplateName = function <T>(name: string) {
  return this.getAllObjects().find((d) => d.getTemplateName() === name) as T;
};
GameWorld.prototype.getSlots = function <T extends GameObject>(
  name = "board",
  filter = (d: T, _i: number) => !!d,
) {
  // Deduce player order based on ...
  const boards = world
    .getObjectsByTemplateName<T>(name)
    .filter((d) => d.getOwningPlayerSlot() !== -1);
  const initiative = world.getObjectById("initiative")?.getPosition();
  if (!initiative) return [];
  const first = boards
    .sort(
      (a, b) =>
        a.getPosition().distance(initiative) -
        b.getPosition().distance(initiative),
    )[0]
    .getOwningPlayerSlot();
  const ordered = boards.sort(
    (a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot(),
  );
  return ordered
    .slice(first)
    .concat(ordered.slice(0, first))
    .filter(filter)
    .map((d) => d.getOwningPlayerSlot());
};

GameWorld.prototype.getOrigin = function (obj: GameObject) {
  let { position, rotation } = JSON.parse(obj.getSavedData("origin") || "{}");
  if (!position) {
    position = [...obj.getPosition()];
    rotation = [...obj.getRotation()];
    obj.setSavedData(JSON.stringify({ position, rotation }), "origin");
  }
  return { position, rotation } as {
    position: [number, number, number];
    rotation: [number, number, number];
  };
};

GameWorld.prototype.isOnMap = function (obj: GameObject) {
  return this.lineTrace(
    obj.getPosition(),
    obj.getPosition().add(new Vector(0, 0, -10)),
  ).some(({ object }) => object.getTemplateName() === "map");
};
GameWorld.prototype.isOnTable = function (
  obj: GameObject,
  templateNames: string[] = [],
) {
  return this.lineTrace(
    obj.getPosition(),
    obj.getPosition().add(new Vector(0, 0, -10)),
  ).every(
    ({ object }) =>
      object.getTemplateName() === obj.getTemplateName() ||
      templateNames.includes(object.getTemplateName()),
  );
};

// Extend globalEvents
declare module "@tabletop-playground/api" {
  interface GlobalScriptingEvents {
    onActionsDealt: TriggerableMulticastDelegate<() => void>;
    onActionsDiscarded: TriggerableMulticastDelegate<() => void>;
    onInitiativeMoved: TriggerableMulticastDelegate<() => void>;
    onAmbitionDeclared: TriggerableMulticastDelegate<
      (ambition: Ambition) => void
    >;
    onEndRound: TriggerableMulticastDelegate<() => void>;
  }
}
GlobalScriptingEvents.prototype.onActionsDealt =
  new TriggerableMulticastDelegate<() => void>();
GlobalScriptingEvents.prototype.onActionsDiscarded =
  new TriggerableMulticastDelegate<() => void>();
GlobalScriptingEvents.prototype.onInitiativeMoved =
  new TriggerableMulticastDelegate<() => void>();
GlobalScriptingEvents.prototype.onAmbitionDeclared =
  new TriggerableMulticastDelegate<(ambition: Ambition) => void>();
GlobalScriptingEvents.prototype.onEndRound = new TriggerableMulticastDelegate<
  () => void
>();

// Extend Color
declare module "@tabletop-playground/api" {
  interface Color {
    saturate(amount: number): Color;
    lighten(amount: number): Color;
  }
}
// Need to use a returned Color instance since the imported one seems derived
const _Color = world.getSlotColor(0).constructor;
_Color.prototype.saturate = function (amount: number) {
  const [h, s, l] = rgbToHsl(this);
  return hslToRgb([h!, s! + s! * amount, l!]);
};
_Color.prototype.lighten = function (amount: number) {
  const [h, s, l] = rgbToHsl(this);
  return hslToRgb([h!, s!, l! + l! * amount]);
};

// https://gist.github.com/mjackson/5311256
function rgbToHsl({ r, g, b }: Color) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
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
