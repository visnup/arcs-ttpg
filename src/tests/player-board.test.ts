import type { Card } from "@tabletop-playground/api";
import {
  globalEvents,
  ObjectType,
  world,
  ZonePermission,
} from "@tabletop-playground/api";
import {
  gainResource,
  placeAgents,
  placeBlight,
  placeCities,
  placeShips,
  placeStarports,
} from "../lib/setup";
import type { Ambition } from "../map-board";
import { assertEqual } from "./assert";
import { beforeEach, describe, test } from "./suite";

const offset = (n: number) => 2 * n * Math.random() - n;

describe("player board", () => {
  let ambitions: Record<Ambition, Record<number, number>>;
  let slot = -1;
  beforeEach(() => {
    ambitions = {
      tycoon: {},
      tyrant: {},
      warlord: {},
      keeper: {},
      empath: {},
    };
    globalEvents.onAmbitionTallied.add((ambition, slot, value) => {
      if (!ambitions) return;
      ambitions[ambition] = ambitions[ambition] ?? {};
      ambitions[ambition][slot] = value;
    });
    slot = Math.floor(Math.random() * 4);
  });

  test("trophies", () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const box = board.getPosition().add([-2, 2, 1]);
    const places = [placeShips, placeAgents, placeCities, placeStarports];
    for (const s of [0, 1, 2, 3, 4])
      for (const place of places)
        for (const o of place(s, 1, box.add([offset(2), offset(2), 0])))
          o.setObjectType(ObjectType.Penetrable);
    placeBlight(box)!.setObjectType(ObjectType.Penetrable);
    assertEqual(ambitions, {
      tycoon: { [slot]: 0 },
      tyrant: { [slot]: 0 },
      warlord: { [slot]: 16 },
      keeper: { [slot]: 0 },
      empath: { [slot]: 0 },
    });
  });

  test("stacked trophies", async () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const box = board.getPosition().add([-2, 2, 1]);
    const blight = [1, 2].map(() => placeBlight(box)!);
    blight[0].addCards(blight[1]);
    assertEqual(blight[0].getStackSize(), 2);
    await new Promise((r) => process.nextTick(r));
    assertEqual(
      ambitions,
      {
        tycoon: { [slot]: 0 },
        tyrant: { [slot]: 0 },
        warlord: { [slot]: 2 },
        keeper: { [slot]: 0 },
        empath: { [slot]: 0 },
      },
      "stacked by addCards",
    );
  });

  test("captives", () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const box = board.getPosition().add([-2, 9.5, 1]);
    const places = [placeShips, placeAgents, placeCities, placeStarports];
    for (const s of [0, 1, 2, 3, 4])
      for (const place of places)
        for (const o of place(s, 1, box.add([offset(1.5), offset(1.5), 0])))
          o.setObjectType(ObjectType.Penetrable);
    assertEqual(ambitions, {
      tycoon: { [slot]: 0 },
      tyrant: { [slot]: 3 },
      warlord: { [slot]: 0 },
      keeper: { [slot]: 0 },
      empath: { [slot]: 0 },
    });
  });

  test("resources", () => {
    for (let n = 0; n < 2; n++) {
      gainResource(0, "fuel");
      gainResource(1, "material");
      gainResource(2, "relic");
      gainResource(3, "psionic");
    }
    assertEqual(ambitions, {
      tycoon: { "0": 2, "1": 2, "2": 0, "3": 0 },
      tyrant: { "0": 0, "1": 0, "2": 0, "3": 0 },
      warlord: { "0": 0, "1": 0, "2": 0, "3": 0 },
      keeper: { "0": 0, "1": 0, "2": 2, "3": 0 },
      empath: { "0": 0, "1": 0, "2": 0, "3": 2 },
    });
  });

  test("stacked resources", async () => {
    gainResource(0, "fuel");
    gainResource(0, "fuel");
    assertEqual(
      ambitions,
      {
        tycoon: { "0": 2 },
        tyrant: { "0": 0 },
        warlord: { "0": 0 },
        keeper: { "0": 0 },
        empath: { "0": 0 },
      },
      "unstacked",
    );
    const fuel = world
      .getObjectsByTemplateName<Card>("resource")
      .filter((d) => !world.isOnTable(d));
    assertEqual(fuel.length, 2);
    fuel[0].addCards(fuel[1]);
    assertEqual(fuel[0].getStackSize(), 2);
    await new Promise((r) => process.nextTick(r));
    assertEqual(
      ambitions,
      {
        tycoon: { "0": 2 },
        tyrant: { "0": 0 },
        warlord: { "0": 0 },
        keeper: { "0": 0 },
        empath: { "0": 0 },
      },
      "stacked by addCards",
    );
  });

  test("snap points act local", async () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const zones = world
      .getAllZones()
      .filter((z) => z.getId().startsWith(`zone-snap-${board.getId()}-`))
      .sort((a, b) => a.getPosition().y - b.getPosition().y);
    assertEqual(zones.length, 6, "resource local snap zones exist");
    assertEqual(
      zones.map((z) => z.getSnapping()),
      [0, 0, ZonePermission.Nobody, ZonePermission.Nobody, 0, 0],
      "permissions set",
    );
    for (const city of world.getObjectsByTemplateName("city"))
      city.setPosition([0, 0, 0]);
    await new Promise((resolve) => process.nextTick(resolve));
    assertEqual(
      zones.map((z) => z.getSnapping()),
      [0, 0, 0, 0, 0, 0],
      "permissions changed",
    );
    gainResource(slot, "fuel");
    gainResource(slot, "fuel");
    gainResource(slot, "material");
    gainResource(slot, "material");
    gainResource(slot, "weapon");
    gainResource(slot, "weapon");
    assertEqual(
      zones.map((z) => z.getSnapping()),
      [2, 2, 2, 2, 2, 2],
      "permissions changed",
    );
  });
});
