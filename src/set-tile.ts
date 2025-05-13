import {
  globalEvents,
  refCard,
  world,
  type Card,
  type GameObject,
} from "@tabletop-playground/api";
import { AmbitionSection } from "./lib/ambition-section";
import { sortedIndex } from "./lib/sorted-index";
import { type Ambition } from "./map-board";

const slots = [0, 1, 2, 3, 4] as const;
type slot = (typeof slots)[number];
type Cluster = "1" | "2" | "3" | "4" | "5" | "6";
type Gate = `${Cluster}.0`;
type Planet = `${Cluster}.${"1" | "2" | "3"}`;
type System = Gate | Planet;

// Setup
let section: AmbitionSection | undefined;
let ambition: Ambition | undefined;
function setup(card: typeof refCard) {
  if (card.getStackSize() > 1) return;
  const { metadata } = card.getCardDetails();
  ambition = metadata === "f20" ? "edenguard" : "blightkin";
  section = new AmbitionSection(card, ambition);

  // Register
  globalEvents.onAmbitionShouldTally.add(onAmbitionShouldTally);
  globalEvents.onAmbitionTallied.add(onAmbitionTallied);
  card.onDestroyed.add(() => {
    globalEvents.onAmbitionShouldTally.remove(onAmbitionShouldTally);
    globalEvents.onAmbitionTallied.remove(onAmbitionTallied);
  });

  globalEvents.onAmbitionShouldTally.trigger(ambition);
}

const edenguard = new Set<System>([
  "1.2",
  "1.3",
  "3.1",
  "3.2",
  "4.2",
  "4.3",
  "6.1",
  "6.2",
]);
function onAmbitionShouldTally(a?: Ambition) {
  if (!section || a !== ambition) return;
  if (ambition === "edenguard") {
    // Edenguard: Control the most Fuel and Material planets.
    for (const [slot, count] of tallyControlOf(edenguard))
      globalEvents.onAmbitionTallied.trigger("edenguard", slot, count);
  } else if (ambition === "blightkin") {
    // Blightkin: Control the most systems with fresh Blight.
    const blighted = new Set(
      world
        .getObjectsByTemplateName<Card>("set-round")
        .filter(
          (c) =>
            c.getStackSize() === 1 &&
            c.getCardDetails().metadata === "blight" &&
            Math.abs(c.getRotation().roll) < 1,
        )
        .map(getSystem)
        .filter((s) => s !== null),
    );
    for (const [slot, count] of tallyControlOf(blighted))
      globalEvents.onAmbitionTallied.trigger("blightkin", slot, count);
  }
}
function onAmbitionTallied(a: Ambition, slot: number, value: number) {
  if (section && a === ambition) section.setTally(slot, value);
}

// Returns slots and how many of the specified systems they control
function* tallyControlOf(systems: Set<System>) {
  const counts = tallyControl()
    .filter(([system]) => systems.has(system))
    .map(([, slot]) => slot)
    .reduce(
      (acc, slot) => ((acc[slot] = (acc[slot] ?? 0) + 1), acc),
      {} as Record<slot, number>,
    );
  for (const slot of slots) yield [slot, counts[slot]] as const;
}

// Returns a tuple array of systems and the controlling player slot.
// uncontrolled systems are left out.
function tallyControl() {
  const tallies = new Map<System, number[]>();
  for (const ship of world.getObjectsByTemplateName("ship")) {
    if (Math.abs(ship.getRotation().roll) > 1) continue;
    const system = getSystem(ship);
    if (!system) continue;
    const t = tallies.get(system) ?? [0, 0, 0, 0, 0];
    t[ship.getOwningPlayerSlot()] = (t[ship.getOwningPlayerSlot()] ?? 0) + 1;
    tallies.set(system, t);
  }
  const control = [...tallies]
    .map(([system, tally]) => {
      if (tally[4] > 0) return [system, 4]; // The Empire controls all systems that have any number of fresh Imperial ships, ignoring all players’ Loyal ships.
      const max = Math.max(...tally);
      const control = tally
        .map((v, i) => (v === max ? i : -1))
        .filter((i) => i !== -1);
      return [system, control.length === 1 ? control[0] : null];
    })
    .filter(([, slot]) => slot !== null) as [System, slot][];
  // The First Regent controls Empire-controlled systems.
  if (control.some(([, slot]) => slot === 4)) {
    const marker = world.getObjectByTemplateName("first-regent")!.getPosition();
    const firstRegent = world
      .getObjectsByTemplateName("board")
      .sort(
        (a, b) =>
          a.getPosition().distance(marker) - b.getPosition().distance(marker),
      )[0]
      .getOwningPlayerSlot() as slot;
    for (const c of control) if (c[1] === 4) c[1] = firstRegent;
  }
  return control;
}

// [angle, far, near, system]
const corners = [
  [-3.1402, 18.7619, 9.7995, "4.2"],
  [-2.6224, 21.4986, 10.1957, "4.3"],
  [-2.2135, 31.3821, 10.5406, "5.1"],
  [-1.9184, 30.9421, 11.2929, "5.2"],
  [-1.6643, 29.0335, 11.7608, "5.3"],
  [-1.4215, 28.9845, 11.8641, "6.1"],
  [-1.1695, 31.1496, 12.3117, "6.2"],
  [-0.8718, 30.0231, 12.247, "6.3"],
  [-0.5336, 23.3381, 11.6376, "1.1"],
  [-0.0203, 20.1683, 11.5803, "1.2"],
  [0.4684, 22.5372, 11.3805, "1.3"],
  [0.844, 30.183, 11.1949, "2.1"],
  [1.1574, 30.4023, 11.6698, "2.2"],
  [1.4064, 28.3824, 11.4209, "2.3"],
  [1.6595, 27.7679, 11.3002, "3.1"],
  [1.9174, 29.426, 11.2607, "3.2"],
  [2.2286, 29.5866, 10.7726, "3.3"],
  [2.5878, 22.1143, 9.9173, "4.1"],
] as const;
// Find system an object is in
function getSystem(obj: GameObject): System | null {
  const p = obj.getPosition();
  const a = Math.atan2(p.y, p.x);
  const i = sortedIndex(corners, ([t]) => t > a);
  const [, far, near, id] = corners[i - 1] ?? corners[corners.length - 1];
  const r = p.distance([0, 0, p.z]);
  if (r > far) return null;
  return r > near ? id : ((id[0] + ".0") as Gate);
}

setup(refCard);
