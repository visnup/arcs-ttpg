import type { GameObject, Player } from "@tabletop-playground/api";
import {
  Card,
  GameWorld,
  globalEvents,
  GlobalScriptingEvents,
  Rotator,
  Vector,
  world,
} from "@tabletop-playground/api";
import { hslToRgb, rgbToHsl } from "./lib/color";
import { onChatMessage as handleMeeples } from "./lib/meeples";
import { sync } from "./lib/overlay";
import { onChatMessage as handleRulesQuestion } from "./lib/rules-chat";
import { onChatMessage as handleScreenshots } from "./lib/screenshots";
import { TriggerableMulticastDelegate } from "./lib/triggerable-multicast-delegate";
import type { Ambition } from "./map-board";
import type { TestableObject } from "./test";
import { run as runTests } from "./tests/suite";

// Set up global error handler for uncaught exceptions
// globalThis.$uncaughtException = (err) => {
//   const [error, ...stack] = err.split("\n");
//   const [name, message] = error.split(/:\s*/, 2);
//   captureException(
//     { name, message, stack: [, ...stack].join("\n") },
//     { tags: { handler: "$uncaughtException" } },
//   ).catch((e) => {
//     console.error(e);
//     console.log("Unregistering Sentry error reporting");
//     globalThis.$uncaughtException = undefined;
//   });
// };

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

let testPresses: number[] = [];
globalEvents.onScriptButtonPressed.add((player: Player, index: number) => {
  // Hotkey to mimic hot seat functionality
  const dir = [, -1, 1][index];
  if (dir) {
    const n = world.getObjectsByTemplateName("board").length;
    player.switchSlot((n + player.getSlot() + dir) % n);
  }

  // Sync with overlay
  if (index === 5) sync();

  // Spawn and run tests
  if (index >= 9) {
    const now = Date.now();
    testPresses = testPresses.filter((t) => now - t < 500);
    testPresses.push(now);
    if (testPresses.length >= 3) {
      const tests = (world.getObjectByTemplateName("test") ??
        world.createObjectFromTemplate(
          "19718F53164F2A4ABB2A79AF91413AFE", // test cube
          world.getObjectByTemplateName("tray")!.getPosition().add([25, 0, 0]),
        )) as TestableObject;
      tests.reset();
      if (index === 10) process.nextTick(() => runTests());
    }
  }
});

// Screenshot, meeple, rules chat commands
globalEvents.onChatMessage.add(handleScreenshots);
globalEvents.onChatMessage.add(handleMeeples);
globalEvents.onChatMessage.add(handleRulesQuestion);

// Extend GameWorld
declare module "@tabletop-playground/api" {
  interface GameWorld {
    getObjectsByTemplateName<T = GameObject>(name: string): T[];
    getObjectByTemplateName<T = GameObject>(name: string): T | undefined;
    getSlots<T extends GameObject>(
      name?: string,
      filter?: (d: T, index: number) => boolean,
    ): number[];
    isOn(obj: GameObject, templateName: string): boolean;
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

GameWorld.prototype.isOn = function (obj: GameObject, templateName: string) {
  return this.lineTrace(
    obj.getPosition(),
    obj.getPosition().add(new Vector(0, 0, -10)),
  ).some(({ object }) => object.getTemplateName() === templateName);
};
GameWorld.prototype.isOnMap = function (obj: GameObject) {
  return this.isOn(obj, "map");
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
    onActionsDiscarded: TriggerableMulticastDelegate<(cards: Card[]) => void>;
    onInitiativeMoved: TriggerableMulticastDelegate<() => void>;
    onAmbitionDeclared: TriggerableMulticastDelegate<
      (ambition: Ambition) => void
    >;
    onAmbitionShouldTally: TriggerableMulticastDelegate<
      (ambition?: Ambition) => void
    >;
    onAmbitionTallied: TriggerableMulticastDelegate<
      (ambition: Ambition, slot: number, value: number) => void
    >;
    onRoundStarted: TriggerableMulticastDelegate<(slots: number[]) => void>;
    onRoundEnded: TriggerableMulticastDelegate<() => void>;
    onChapterEnded: TriggerableMulticastDelegate<() => void>;
  }
}
GlobalScriptingEvents.prototype.onActionsDealt =
  new TriggerableMulticastDelegate<() => void>();
GlobalScriptingEvents.prototype.onActionsDiscarded =
  new TriggerableMulticastDelegate<(cards: Card[]) => void>();
GlobalScriptingEvents.prototype.onInitiativeMoved =
  new TriggerableMulticastDelegate<() => void>();
GlobalScriptingEvents.prototype.onAmbitionDeclared =
  new TriggerableMulticastDelegate<(ambition: Ambition) => void>();
GlobalScriptingEvents.prototype.onAmbitionShouldTally =
  new TriggerableMulticastDelegate<(ambition?: Ambition) => void>();
GlobalScriptingEvents.prototype.onAmbitionTallied =
  new TriggerableMulticastDelegate<
    (ambition: Ambition, slot: number, value: number) => void
  >();
GlobalScriptingEvents.prototype.onRoundStarted =
  new TriggerableMulticastDelegate<(slots: number[]) => void>();
GlobalScriptingEvents.prototype.onRoundEnded = new TriggerableMulticastDelegate<
  () => void
>();
GlobalScriptingEvents.prototype.onChapterEnded =
  new TriggerableMulticastDelegate<() => void>();

// Extend Card
declare module "@tabletop-playground/api" {
  interface Card {
    flip(): void;
  }
}
Card.prototype.flip = function () {
  this.setRotation(
    this.getRotation().compose(
      Rotator.fromAxisAngle(this.getRotation().toVector(), 180),
    ),
  );
};

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
