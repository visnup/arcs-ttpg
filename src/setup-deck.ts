import {
  Card,
  GameObject,
  refCard,
  Rotator,
  SnapPoint,
  Vector,
  world,
} from "@tabletop-playground/api";
import { InitiativeMarker } from "./initiative-marker";

const origin = new Vector(0, 0, world.getObjectById("map")!.getPosition().z);
const above = new Vector(0, 0, 0.1);

refCard.onPrimaryAction.add((card, player) => {
  if (card.getStackSize() > 1) return;

  const { metadata } = card.getCardDetails(0)!;
  const [block, ...setup] = metadata.trim().split("\n");

  // players
  const needed = [
    ...new Set([...world.getAllPlayers().map((p) => p.getSlot()), 0, 1, 2, 3]),
  ]
    .filter((s) => 0 <= s && s <= 3)
    .slice(0, setup.length)
    .sort();
  // randomly pick first player
  const first = Math.floor(Math.random() * needed.length);
  const slots = needed.slice(first).concat(needed.slice(0, first));

  // initiative marker to first player
  (world.getObjectById("initiative") as InitiativeMarker)?.take(slots[0]);

  // shuffle action deck
  const action = getActionDecks();
  // 4p: add 1, 7s
  if (setup.length === 4) action[0]?.addCards(action[1]);
  else action[1]?.destroy();
  action[0]?.setRotation(new Rotator(0, -90, 0));
  action[0]?.shuffle();

  // shuffle court deck
  const court = getCourtDeck();
  court.setRotation(new Rotator(0, 90, 0));
  court.shuffle();
  // deal court; 2p: 3 cards, 3-4p: 4 cards
  const courtPoints = getCourtPoints();
  for (let i = 0; i < (setup.length === 2 ? 3 : 4); i++) {
    if (occupied(courtPoints[i])) continue;
    const card = court.takeCards(1);
    if (!card) break;
    card.setPosition(getPosition(courtPoints[i]).add(above));
    card.snap();
  }

  // out of play
  const systems = getSystems();
  const resources = new Map<string, number>();
  for (const cluster of block.split(" ")) {
    for (let i of "0123") {
      const system = systems
        .filter((d) => d.id === `${cluster}.${i}`)
        .map((d) => d.snap);
      if (occupied(system)) continue;
      const size =
        i === "0" ? ("14".includes(cluster) ? "large" : "small") : "round";
      const block = takeBlock(size);
      block.setPosition(getPosition(system));
      block.setRotation(new Rotator(0, 0, 0));
      block.snap();
      block.freeze();

      // 2p: out of play resources
      if (slots.length === 2) {
        const r = systemResource(system[0]);
        if (r) resources.set(r, (resources.get(r) || 0) + 1);
      }
    }
  }
  for (const [r, n] of resources.entries())
    placeResources(r, n, blockedResources[r]);

  // power markers
  for (const missing of getAllObjectsByTemplateName("power").filter(
    (d) => !slots.includes(d.getOwningPlayerSlot()),
  ))
    missing.destroy();

  // starting pieces, gain resources
  for (const [i, line] of setup.entries()) {
    const system = line
      .split(" ")
      .map((s) => systems.filter((d) => d.id === s).map((d) => d.snap));
    // A: 3 ships, 1 city
    if (!occupied(system[0])) {
      const a = getPosition(system[0]);
      placeCities(slots[i], 1, a);
      placeShips(slots[i], 3, nearby(a));
      gainResource(slots[i], system[0][0]);
    }
    // B: 3 ships, 1 starport
    if (!occupied(system[1])) {
      const b = getPosition(system[1]);
      placeStarports(slots[i], 1, b);
      placeShips(slots[i], 3, nearby(b));
      gainResource(slots[i], system[1][0]);
    }
    // C: 2 ships
    if (!occupied(system[2])) placeShips(slots[i], 2, getPosition(system[2]));
    if (system[3] && !occupied(system[3]))
      placeShips(slots[i], 2, nearby(getPosition(system[3])));
  }

  // deal action cards
  if (action[0].getStackSize() >= 20) action[0].deal(6, slots, false, true);
});

function getAllObjectsByTemplateName(name: string) {
  return world.getAllObjects().filter((d) => d.getTemplateName() === name);
}
function getObjectByTemplateName(name: string) {
  return world.getAllObjects().find((d) => d.getTemplateName() === name);
}

function onTable(obj: GameObject) {
  return world
    .lineTrace(obj.getPosition(), obj.getPosition().add(new Vector(0, 0, -10)))
    .every(({ object }) => object.getTemplateName() === "resource");
}
function onMap(obj: GameObject) {
  return world
    .lineTrace(obj.getPosition(), obj.getPosition().add(new Vector(0, 0, -10)))
    .some(({ object }) => object.getTemplateName() === "map");
}

function occupied(system: SnapPoint | SnapPoint[]) {
  return system instanceof SnapPoint
    ? system.getSnappedObject()
    : system.some((d) => d.getSnappedObject());
}
function getPosition(system: SnapPoint | SnapPoint[]) {
  return system instanceof SnapPoint
    ? system.getGlobalPosition()
    : system.length === 1
      ? system[0].getGlobalPosition()
      : Vector.lerp(
          system[0].getGlobalPosition(),
          system[1].getGlobalPosition(),
          0.5,
        );
}

function getActionDecks() {
  return (
    getAllObjectsByTemplateName("action").filter(
      (d) => !(d as Card).isInHolder(),
    ) as Card[]
  ).sort((a, b) => b.getStackSize() - a.getStackSize());
}

function getCourtDeck() {
  return getObjectByTemplateName("bc") as Card;
}
function getCourtPoints() {
  const board = getObjectByTemplateName("court");
  if (!board) return [];
  return board
    .getAllSnapPoints()
    .sort((a, b) => b.getLocalPosition().y - a.getLocalPosition().y)
    .slice(1);
}

function getSystems() {
  const map = world.getObjectById("map");
  if (!map) return [];
  return map
    .getAllSnapPoints()
    .filter((d) => d.getTags().some((t) => t.startsWith("cluster:")))
    .map((snap) => {
      const tags = snap.getTags();
      const cluster = tags.find((t) => t.startsWith("cluster:"));
      const system = tags.find((t) => t.startsWith("system:"));
      return {
        id: `${cluster?.replace("cluster:", "")}.${system?.replace("system:", "")}`,
        snap,
      };
    });
}

function takeBlock(type: "small" | "large" | "round") {
  return getAllObjectsByTemplateName(`block ${type}`)
    .filter((d) => !onMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(origin) - b.getPosition().distance(origin),
    )[0];
}

function nearby(building: Vector) {
  const direction = building.subtract(origin).unit();
  const ring = origin.add(direction.multiply(11));
  return Vector.lerp(ring, building, building.distance(ring) > 5 ? 0.5 : 2);
}

// Find _n_ ships belonging to _slot_ player closest to _target_ and place them
function placeShips(slot: number, n: number, target: Vector) {
  const ships = getAllObjectsByTemplateName("ship")
    .filter((d) => d.getOwningPlayerSlot() === slot && !onMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(target) - b.getPosition().distance(target),
    )
    .slice(0, n);
  const direction = target.subtract(origin).unit();
  const rotation = direction.toRotator();
  rotation.yaw += Math.random() > 0.5 ? 180 : 0;
  rotation.yaw += Math.random() * 30 - 15;
  const half = (ships.length - 1) / 2;
  for (const [j, ship] of ships.entries()) {
    ship.setRotation(rotation);
    ship.setPosition(target.add(direction.multiply(j - half)));
    ship.snap();
  }
  return ships;
}
// Find _n_ cities belonging to _slot_ player on player board from left to right and place them
function placeCities(slot: number, n: number, target: Vector) {
  const cities = getAllObjectsByTemplateName("city")
    .filter((d) => d.getOwningPlayerSlot() === slot && !onMap(d))
    .sort((a, b) => a.getPosition().y - b.getPosition().y)
    .slice(0, n);
  for (const city of cities) {
    city.setPosition(target.add(above));
    city.snap();
  }
  return cities;
}
// Find _n_ starports belonging to _slot_ player closest to _target_ and place them
function placeStarports(slot: number, n: number, target: Vector) {
  const starports = getAllObjectsByTemplateName("starport")
    .filter((d) => d.getOwningPlayerSlot() === slot && !onMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(target) - b.getPosition().distance(target),
    )
    .slice(0, n);
  for (const starport of starports) {
    starport.setPosition(target.add(above));
    starport.snap();
  }
}

function systemResource(system: SnapPoint): string | undefined {
  return system
    .getTags()
    .find((t) => t.startsWith("resource:"))!
    ?.replace("resource:", "");
}
function placeResources(
  resource: string | undefined,
  n: number,
  target: Vector,
) {
  let supply = getAllObjectsByTemplateName("resource").find(
    (d) => (d as Card).getCardDetails(0)!.name === resource && onTable(d),
  ) as Card | undefined;
  if (!supply) return;
  if (n < supply.getStackSize()) supply = supply.takeCards(n);
  supply?.setPosition(target.add(above));
  supply?.snap();
}
function gainResource(slot: number, system: SnapPoint) {
  const board = getAllObjectsByTemplateName("board").find(
    (d) => d.getOwningPlayerSlot() === slot,
  )!;
  const empty = board
    .getAllSnapPoints()
    .filter((d) => d.getTags().includes("resource") && !d.getSnappedObject())
    .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y)[0];
  placeResources(systemResource(system), 1, empty.getGlobalPosition());
}

const blockedResources = Object.fromEntries(
  world
    .getObjectById("map")!
    .getAllSnapPoints()
    .filter((d) => d.getTags().includes("resource"))
    .map((d) => [
      d
        .getTags()
        .find((d) => d.startsWith("resource:"))
        ?.replace("resource:", ""),
      d.getGlobalPosition(),
    ]),
);
