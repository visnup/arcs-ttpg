import type { Card } from "@tabletop-playground/api";
import {
  globalEvents,
  ObjectType,
  world,
  ZonePermission,
} from "@tabletop-playground/api";
import {
  placeAgents,
  placeBlight,
  placeCities,
  placeResources,
  placeShips,
  placeStarports,
  takeCard,
  takeResource,
} from "../lib/setup";
import type { Ambition } from "../map-board";
import { assert, assertEqual, assertEqualEventually } from "./assert";
import { beforeEach, describe, skip, test } from "./suite";

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
      edenguard: {},
      blightkin: {},
    };
    globalEvents.onAmbitionTallied.add((ambition, slot, value) => {
      if (!ambitions) return;
      ambitions[ambition] = ambitions[ambition] ?? {};
      ambitions[ambition][slot] = value;
    });
    slot = Math.floor(Math.random() * 4);
  });

  test("trophies", async () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const box = board.getPosition().add([-2, 2, 1]);
    const places = [placeShips, placeAgents, placeCities, placeStarports];
    for (const s of [0, 1, 2, 3, 4])
      for (const place of places)
        for (const o of place(s, 1, box.add([offset(2), offset(2), 0])))
          o.setObjectType(ObjectType.Penetrable);
    const blight = placeBlight(box);
    blight?.setObjectType(ObjectType.Penetrable);
    assertEqual(ambitions, {
      tycoon: { [slot]: 0 },
      tyrant: { [slot]: 0 },
      warlord: { [slot]: blight ? 16 : 12 },
      keeper: { [slot]: 0 },
      empath: { [slot]: 0 },
      edenguard: {},
      blightkin: {},
    });

    // discard
    const ambition = world.getObjectByTemplateName("ambition")!;
    ambition.setPosition(ambition.getPosition().add([-15, 0, 1]));
    if ("discard" in ambition && typeof ambition.discard === "function")
      ambition.discard();
    await assertEqualEventually(
      () => ambitions,
      {
        tycoon: { ...ambitions.tycoon, [slot]: 0 },
        tyrant: { ...ambitions.tyrant, [slot]: 0 },
        warlord: { ...ambitions.warlord, [slot]: 0 },
        keeper: { ...ambitions.keeper, [slot]: 0 },
        empath: { ...ambitions.empath, [slot]: 0 },
        edenguard: {},
        blightkin: {},
      },
      "after discard",
    );
  });

  test("favors don't count as trophies", async () => {
    const fates = world.getObjectByTemplateName<Card>("fate");
    if (!fates) skip("campaign");
    const fate = fates.takeCards()!;

    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const snap = board
      .getAllSnapPoints()
      .find((s) => s.getTags().includes("fate"));
    assert(snap !== undefined, "found snap");
    fate.setPosition(snap.getGlobalPosition());
    fate.snap();

    for (const s of [0, 1, 2, 3, 4]) {
      for (const f of placeAgents(s, 1, snap.getGlobalPosition()))
        f.setObjectType(ObjectType.Penetrable);
    }
    assertEqual(ambitions, {
      tycoon: { [slot]: 0 },
      tyrant: { [slot]: 0 },
      warlord: { [slot]: 0 },
      keeper: { [slot]: 0 },
      empath: { [slot]: 0 },
      edenguard: {},
      blightkin: {},
    });
  });

  test("stacked trophies", async () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const box = board.getPosition().add([-2, 2, 1]);
    const blight = [1, 2].map(() => placeBlight(box)!);
    if (!blight[0]) skip("no blight");
    blight[0].addCards(blight[1]);
    assertEqual(blight[0].getStackSize(), 2);
    await assertEqualEventually(
      () => ambitions,
      {
        tycoon: { 0: 0, 1: 0, 2: 0, 3: 0 },
        tyrant: { 0: 0, 1: 0, 2: 0, 3: 0 },
        warlord: { 0: 0, 1: 0, 2: 0, 3: 0, [slot]: 2 },
        keeper: { 0: 0, 1: 0, 2: 0, 3: 0 },
        empath: { 0: 0, 1: 0, 2: 0, 3: 0 },
        edenguard: {},
        blightkin: {},
      },
      "stacked by addCards",
    );

    // discard
    const ambition = world.getObjectByTemplateName("ambition")!;
    ambition.setPosition(ambition.getPosition().add([-15, 0, 1]));
    if ("discard" in ambition && typeof ambition.discard === "function")
      ambition.discard();
    await assertEqualEventually(
      () => ambitions,
      {
        tycoon: { 0: 0, 1: 0, 2: 0, 3: 0 },
        tyrant: { 0: 0, 1: 0, 2: 0, 3: 0 },
        warlord: { 0: 0, 1: 0, 2: 0, 3: 0 },
        keeper: { 0: 0, 1: 0, 2: 0, 3: 0 },
        empath: { 0: 0, 1: 0, 2: 0, 3: 0 },
        edenguard: {},
        blightkin: {},
      },
      "after discard",
    );
  });

  test("captives", async () => {
    const board = world
      .getObjectsByTemplateName("board")
      .find((d) => d.getOwningPlayerSlot() === slot)!;
    const box = board.getPosition().add([-2, 9.5, 1]);
    const places = [placeShips, placeAgents, placeCities, placeStarports];
    const captives = world.getObjectsByTemplateName("ship").length > 60 ? 7 : 6;
    for (const s of [0, 1, 2, 3, 4])
      for (const place of places)
        for (const o of place(s, 1, box.add([offset(1.5), offset(1.5), 0])))
          o.setObjectType(ObjectType.Penetrable);
    assertEqual(ambitions, {
      tycoon: { [slot]: 0 },
      tyrant: { [slot]: captives },
      warlord: { [slot]: 0 },
      keeper: { [slot]: 0 },
      empath: { [slot]: 0 },
      edenguard: {},
      blightkin: {},
    });

    // discard
    const ambition = world.getObjectByTemplateName("ambition")!;
    ambition.setPosition(ambition.getPosition().add([-10, 0, 1]));
    if ("discard" in ambition && typeof ambition.discard === "function")
      ambition.discard();
    await assertEqualEventually(
      () => ambitions,
      {
        tycoon: { 0: 0, 1: 0, 2: 0, 3: 0 },
        tyrant: { 0: 0, 1: 0, 2: 0, 3: 0 },
        warlord: { 0: 0, 1: 0, 2: 0, 3: 0 },
        keeper: { 0: 0, 1: 0, 2: 0, 3: 0 },
        empath: { 0: 0, 1: 0, 2: 0, 3: 0 },
        edenguard: {},
        blightkin: {},
      },
      "after discard",
    );

    const fates = world.getObjectByTemplateName("fate");
    if (!fates) skip("campaign");

    // green vault
    for (const r of ["fuel", "material", "weapon", "relic", "psionic"])
      placeResources(
        r,
        1,
        box.add([offset(0.5), offset(0.5), 0]),
      )!.setObjectType(ObjectType.Penetrable);
    assertEqual(
      ambitions,
      {
        tycoon: { ...ambitions.tycoon, [slot]: 0 },
        tyrant: { ...ambitions.tyrant, [slot]: 0 },
        warlord: { ...ambitions.warlord, [slot]: 0 },
        keeper: { ...ambitions.keeper, [slot]: 0 },
        empath: { ...ambitions.empath, [slot]: 0 },
        edenguard: {},
        blightkin: {},
      },
      "still 0",
    );
    const f20 = world.createObjectFromTemplate(
      "AF0F0DF6A1A34341BC6CF2087592C8B2",
      world.getObjectById("map")!.getPosition().add([0, 0, 1]),
    ) as Card;
    const greenVault = f20.takeCards(
      1,
      true,
      f20
        .getAllCardDetails()
        .findIndex((c) => c.name.startsWith("Green Vault")),
    );
    assert(!!greenVault, "green vault found");
    takeCard(slot, greenVault);
    assertEqual(
      ambitions,
      {
        tycoon: { ...ambitions.tycoon, [slot]: 2 },
        tyrant: { ...ambitions.tyrant, [slot]: 2 },
        warlord: { ...ambitions.warlord, [slot]: 0 },
        keeper: { ...ambitions.keeper, [slot]: 0 },
        empath: { ...ambitions.empath, [slot]: 0 },
        edenguard: {},
        blightkin: {},
      },
      "green vault effect",
    );
  });

  test("resources", () => {
    for (let n = 0; n < 2; n++) {
      takeResource(0, "fuel");
      takeResource(1, "material");
      takeResource(2, "relic");
      takeResource(3, "psionic");
    }
    assertEqual(ambitions, {
      tycoon: { "0": 2, "1": 2, "2": 0, "3": 0 },
      tyrant: { "0": 0, "1": 0, "2": 0, "3": 0 },
      warlord: { "0": 0, "1": 0, "2": 0, "3": 0 },
      keeper: { "0": 0, "1": 0, "2": 2, "3": 0 },
      empath: { "0": 0, "1": 0, "2": 0, "3": 2 },
      edenguard: {},
      blightkin: {},
    });
  });

  test("stacked resources", async () => {
    takeResource(0, "fuel");
    takeResource(0, "fuel");
    assertEqual(
      ambitions,
      {
        tycoon: { "0": 2 },
        tyrant: { "0": 0 },
        warlord: { "0": 0 },
        keeper: { "0": 0 },
        empath: { "0": 0 },
        edenguard: {},
        blightkin: {},
      },
      "unstacked",
    );
    const fuel = world
      .getObjectsByTemplateName<Card>("resource")
      .filter((d) => !world.isOnTable(d));
    assertEqual(fuel.length, 2);
    fuel[0].addCards(fuel[1]);
    assertEqual(fuel[0].getStackSize(), 2);
    await assertEqualEventually(
      () => ambitions,
      {
        tycoon: { "0": 2, "1": 0, "2": 0, "3": 0 },
        tyrant: { "0": 0, "1": 0, "2": 0, "3": 0 },
        warlord: { "0": 0, "1": 0, "2": 0, "3": 0 },
        keeper: { "0": 0, "1": 0, "2": 0, "3": 0 },
        empath: { "0": 0, "1": 0, "2": 0, "3": 0 },
        edenguard: {},
        blightkin: {},
      },
      "stacked by addCards",
    );
  });

  test("guild", async () => {
    const court =
      world.getObjectByTemplateName<Card>("bc") ||
      world.getObjectByTemplateName<Card>("cc");
    assert(!!court, "court deck");
    for (const [i, name] of [
      "Mining Interest",
      "Construction Union",
      "Gatekeepers",
      "Shipping Interest",
      "Skirmishers",
      "Arms Union",
      "Lattice Spies",
      "Silver-Tongues",
      "Sworn Guardians",
      "Elder Broker",
    ].entries()) {
      const c = court
        .getAllCardDetails()
        .findIndex((c) => c.name.startsWith(name));
      const card = court.takeCards(1, true, c)!;
      takeCard(i % 4, card);
      await new Promise((r) => process.nextTick(r));
    }
    assertEqual(ambitions, {
      tycoon: { "0": 1, "1": 1, "2": 1, "3": 1 },
      tyrant: { "0": 0, "1": 0, "2": 0, "3": 0 },
      warlord: { "0": 0, "1": 0, "2": 0, "3": 0 },
      keeper: { "0": 1, "1": 1, "2": 0, "3": 0 },
      empath: { "0": 0, "1": 0, "2": 1, "3": 1 },
      edenguard: {},
      blightkin: {},
    });

    const fates = world.getObjectByTemplateName("fate");
    if (!fates) skip("campaign");

    // war profiteering
    const map = world.getObjectById("map")!;
    const seals = world.createObjectFromTemplate(
      "05B97DFF5148801BAA34E382F56F2F1B",
      map.getPosition().add([0, 0, 1]),
    ) as Card;
    const warProfiteer = seals.takeCards(
      1,
      true,
      seals.getAllCardDetails().findIndex((c) => c.name === "War Profiteer"),
    )!;
    const warlord = world.getZoneById("zone-ambition-2")!;
    warProfiteer.setPosition(warlord.getPosition().add([0, 3, 1]));
    assertEqual(ambitions, {
      tycoon: { "0": 1, "1": 1, "2": 1, "3": 1 },
      tyrant: { "0": 0, "1": 0, "2": 0, "3": 0 },
      warlord: { "0": 1, "1": 1, "2": 0, "3": 0 },
      keeper: { "0": 1, "1": 1, "2": 0, "3": 0 },
      empath: { "0": 0, "1": 0, "2": 1, "3": 1 },
      edenguard: {},
      blightkin: {},
    });
    seals.destroy();

    // guild supremacy
    const f04 = world.createObjectFromTemplate(
      "FC7BE8EF9150452FA7D03AB1DF994ADA",
      map.getPosition().add([0, 0, 1]),
    ) as Card;
    const guildSupremacy = f04.takeCards(
      1,
      true,
      f04.getAllCardDetails().findIndex((c) => c.name === "Guild Supremacy"),
    );
    assert(!!guildSupremacy, "Guild Supremacy card");
    guildSupremacy.flipOrUpright();
    f04.destroy();
    globalEvents.onAmbitionShouldTally.trigger();
    assertEqual(ambitions, {
      tycoon: { "0": 2, "1": 2, "2": 2, "3": 2 },
      tyrant: { "0": 0, "1": 0, "2": 0, "3": 0 },
      warlord: { "0": 2, "1": 2, "2": 0, "3": 0 },
      keeper: { "0": 2, "1": 2, "2": 0, "3": 0 },
      empath: { "0": 0, "1": 0, "2": 2, "3": 2 },
      edenguard: {},
      blightkin: {},
    });
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
    await assertEqualEventually(
      () => zones.map((z) => z.getSnapping()),
      [0, 0, 0, 0, 0, 0],
      "permissions changed",
    );
    takeResource(slot, "fuel");
    takeResource(slot, "fuel");
    takeResource(slot, "material");
    takeResource(slot, "material");
    takeResource(slot, "weapon");
    takeResource(slot, "weapon");
    assertEqual(
      zones.map((z) => z.getSnapping()),
      [2, 2, 2, 2, 2, 2],
      "permissions changed",
    );
  });
});
