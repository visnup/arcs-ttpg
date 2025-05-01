import {
  globalEvents,
  refCard,
  world,
  type GameObject,
} from "@tabletop-playground/api";
import { AmbitionSection } from "./lib/ambition-section";
import { sortedIndex } from "./lib/sorted-index";
import { type Ambition } from "./map-board";

if (refCard.getStackSize() === 1) {
  const section = new AmbitionSection(refCard, "edenguard");
  section.setTally(0, 2);
  section.setTally(1, 1);
}

globalEvents.onAmbitionShouldTally.add((ambition?: Ambition) => {
  if (ambition === "edenguard" || ambition === "blightkin") tallyControl();
});
// globalEvents.onAmbitionTallied.add((ambition, slot, value) =>
//   sections[ambition].setTally(slot, value),
// );

// Edenguard: Control the most Fuel and Material planets. (The
// First Regent controls Empire-controlled systems.)
// const edenguard = new Set([
//   "1.2",
//   "1.3",
//   "3.1",
//   "3.2",
//   "4.2",
//   "4.3",
//   "6.1",
//   "6.2",
// ]);
// Blightkin: Control the most systems with fresh Blight. (The First Regent
// controls Empire-controlled systems.)
function tallyControl() {
  const tallies = new Map<string, number[]>();
  for (const ship of world.getObjectsByTemplateName("ship")) {
    if (Math.abs(ship.getRotation().roll) < 1) continue;
    const system = getSystem(ship);
    if (!system) continue;
    const t = tallies.get(system) ?? [0, 0, 0, 0];
    t[ship.getOwningPlayerSlot()] = (t[ship.getOwningPlayerSlot()] ?? 0) + 1;
    tallies.set(system, t);
  }
  console.log(JSON.stringify([...tallies]));
  // globalEvents.onAmbitionTallied.trigger();
}

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
function getSystem(ship: GameObject) {
  const p = ship.getPosition();
  const a = Math.atan2(p.y, p.x);
  const i = sortedIndex(corners, ([t]) => t > a);
  const [, far, near, id] = corners[i - 1] ?? corners[corners.length - 1];
  const r = p.distance([0, 0, p.z]);
  if (r > far) return null;
  return r > near ? id : id[0] + ".0";
}
