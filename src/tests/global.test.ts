import type { MultistateObject } from "@tabletop-playground/api";
import { world } from "@tabletop-playground/api";
import { assertEqual } from "./assert";
import { describe, skip, test } from "./suite";

describe("global", () => {
  test("base piece counts, ownership", () => {
    const setup = world.getObjectByTemplateName("setup");
    if (!setup) skip("setup not found");
    const counts: Record<string, Record<string, number>> = {};
    for (const obj of world.getAllObjects()) {
      const slot = (counts[obj.getOwningPlayerSlot()] ||= {});
      slot[obj.getTemplateName()] = (slot[obj.getTemplateName()] || 0) + 1;
    }
    for (const [slot, owned] of Object.entries({
      "0": {
        board: 1,
        ship: 15,
        power: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "1": {
        board: 1,
        power: 1,
        ship: 15,
        agent: 10,
        city: 5,
        starport: 5,
        cards: 1,
      },
      "2": {
        ship: 15,
        power: 1,
        board: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "3": {
        ship: 15,
        power: 1,
        board: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "-1": {
        map: 1,
        tray: 1,
        note: 8,
        court: 1,
        chapter: 1,
        initiative: 1,
        ambition: 3,
        resource: 5,
        "ambition declared": 1,
        lore: 2,
        leader: 2,
        bc: 1,
        setup: 3,
        action: 2,
        "block round": 6,
        "block small": 2,
        "block large": 2,
        discard: 1,
        raid: 6,
        assault: 6,
        skirmish: 6,
        "base-rules": 1,
      },
    }))
      for (const [name, count] of Object.entries(owned))
        assertEqual(counts[slot][name], count, `${slot} - ${name}`);

    for (const rules of ["base-rules", "campaign-rules"]) {
      const page = world
        .getObjectByTemplateName<MultistateObject>(rules)
        ?.getState();
      if (page) assertEqual(page, 0, `${rules} cover page`);
    }
  });

  test("campaign piece counts, ownership", () => {
    const fate = world.getObjectByTemplateName("fate");
    if (!fate) skip("fate not found");
    const counts: Record<string, Record<string, number>> = {};
    for (const obj of world.getAllObjects()) {
      const slot = (counts[obj.getOwningPlayerSlot()] ||= {});
      slot[obj.getTemplateName()] = (slot[obj.getTemplateName()] || 0) + 1;
    }
    for (const [slot, owned] of Object.entries({
      "0": {
        board: 1,
        ship: 15,
        power: 2,
        flagship: 1,
        objective: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "1": {
        board: 1,
        power: 2,
        ship: 15,
        flagship: 1,
        objective: 1,
        agent: 10,
        city: 5,
        starport: 5,
        cards: 1,
      },
      "2": {
        ship: 15,
        power: 2,
        board: 1,
        objective: 1,
        flagship: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "3": {
        ship: 15,
        power: 2,
        board: 1,
        flagship: 1,
        objective: 1,
        agent: 10,
        starport: 5,
        city: 5,
        cards: 1,
      },
      "4": { ship: 15, city: 2, starport: 1, "set-round": 1 },
      "-1": {
        map: 1,
        tray: 1,
        note: 6,
        court: 1,
        chapter: 1,
        initiative: 1,
        ambition: 3,
        resource: 5,
        "ambition declared": 1,
        lore: 2,
        fate: 3,
        action: 2,
        "first-regent": 1,
        dc: 3,
        cc: 1,
        "chapter-track": 1,
        "book-of-law": 1,
        "flagship-board": 1,
        discard: 1,
        raid: 6,
        assault: 6,
        skirmish: 6,
        event: 1,
        number: 1,
        "base-rules": 1,
        "campaign-rules": 1,
      },
    }))
      for (const [name, count] of Object.entries(owned))
        assertEqual(counts[slot][name], count, `${slot} - ${name}`);

    for (const rules of ["base-rules", "campaign-rules"])
      assertEqual(
        world.getObjectByTemplateName<MultistateObject>(rules)?.getState(),
        0,
        `${rules} cover page`,
      );
  });

  test("zone clean up", () => {
    for (const o of world.getAllObjects())
      if (o.getTemplateName() !== "test") o.destroy();
    assertEqual(world.getAllZones().length, 0, "all zones destroyed");
  });
});
