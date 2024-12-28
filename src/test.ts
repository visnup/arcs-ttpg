import { world } from "@tabletop-playground/api";

// global
// ======
test("counts", () => {
  const counts: Record<string, number> = {};
  for (const obj of world.getAllObjects())
    counts[obj.getTemplateName()] = (counts[obj.getTemplateName()] || 0) + 1;
  for (const [name, count] of Object.entries({
    map: 1,
    board: 4,
    ship: 5 * 15,
    tray: 1,
    note: 8,
    power: 4 * 2,
    court: 1,
    chapter: 1,
    flagship: 4,
    objective: 4,
    initiative: 1,
    agent: 4 * 10,
    starport: 21,
    ambition: 3,
    city: 22,
    resource: 5,
    "ambition declared": 1,
    lore: 2,
    leader: 2,
    fate: 3,
    bc: 1,
    setup: 3,
    action: 2,
    "first-regent": 1,
    "set-round": 1,
    "block round": 6,
    dc: 3,
    "block small": 2,
    "block large": 2,
    cc: 1,
    "chapter-track": 1,
    "book-of-law": 1,
    "flagship-board": 1,
    cards: 4,
    discard: 1,
    raid: 6,
    assault: 6,
    skirmish: 6,
    event: 1,
    number: 1,
    "base-rules": 1,
    "campaign-rules": 1,
  }))
    assertEqual(counts[name], count, name);
});

test("player ownership", () => {
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
    "4": { ship: 15, city: 2, starport: 1 },
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
      fate: 3,
      bc: 1,
      setup: 3,
      action: 2,
      "first-regent": 1,
      "set-round": 1,
      "block round": 6,
      dc: 3,
      "block small": 2,
      "block large": 2,
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
});

for (const name of ["ambition declared", "ambition"])
  test(`${name} discards to origin`, () => {
    const marker = world.getObjectByTemplateName(name)!;
    const position = marker.getPosition();
    const rotation = marker.getRotation();
    marker.setPosition(position.add([10, 10, 0]));
    marker.setRotation([rotation.pitch, rotation.yaw + 90, rotation.roll]);
    if (!("discard" in marker && typeof marker.discard === "function"))
      throw Error("discard not present");
    marker.discard();
    assertEqual(marker.getPosition(), position, "position");
    assertEqual(marker.getRotation(), rotation, "rotation");
  });

function test(description: string, fn: () => void) {
  console.log(description);
  try {
    fn();
    console.log("  ok");
  } catch (e) {
    console.error("  not ok");
    console.error(e);
    for (const p of world.getAllPlayers())
      p.showMessage(`${description}: ${e}`);
  }
}

function assertEqual<T>(value: T, expected: T, description = "") {
  if (stringify(value) !== stringify(expected))
    throw Error(`${description}: ${value} !== ${expected}`);
}

function stringify(value: unknown) {
  return JSON.stringify(value, (name, value) =>
    typeof value === "number" ? Math.round(value) : value,
  );
}
