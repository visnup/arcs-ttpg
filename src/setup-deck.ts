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
  const slots = [
    ...new Set([...world.getAllPlayers().map((p) => p.getSlot()), 0, 1, 2, 3]),
  ]
    .slice(0, setup.length)
    .map((s) => [s, Math.random()])
    .sort((a, b) => a[1] - b[1])
    .map((d) => d[0]);
  const colors = slots.map((s) => world.getSlotColor(s).toHex());

  // initiative marker to a random first player
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
  for (const cluster of block.split(" ")) {
    for (let i of "0123") {
      const snaps = systems
        .filter((d) => d.id === `${cluster}.${i}`)
        .map((d) => d.snap);
      if (occupied(snaps)) continue;
      const size =
        i === "0" ? ("14".includes(cluster) ? "large" : "small") : "round";
      const block = takeBlock(size);
      block.setPosition(getPosition(snaps));
      block.setRotation(new Rotator(0, 0, 0));
      block.snap();
      block.freeze();
    }
  }

  // TODO 2p: out of play resources

  // power markers
  for (const missing of getAllObjectsByTemplateName("power").filter(
    (d) => !slots.includes(d.getOwningPlayerSlot()),
  ))
    missing.destroy();

  // player pieces
  for (const [i, line] of setup.entries()) {
    const snaps = line
      .split(" ")
      .map((s) => systems.filter((d) => d.id === s).map((d) => d.snap));
    // A: 3 ships, 1 city
    if (!occupied(snaps[0])) {
      const a = getPosition(snaps[0]);
      placeCities(slots[i], 1, a);
      placeShips(slots[i], 3, nearby(a));
    }
    // B: 3 ships, 1 starport
    if (!occupied(snaps[1])) {
      const b = getPosition(snaps[1]);
      placeStarports(slots[i], 1, b);
      placeShips(slots[i], 3, nearby(b));
    }
    // C: 2 ships
    if (!occupied(snaps[2])) placeShips(slots[i], 2, getPosition(snaps[2]));
    if (snaps[3] && !occupied(snaps[3]))
      placeShips(slots[i], 2, nearby(getPosition(snaps[3])));
  }

  // TODO resource tokens

  // deal action cards
  if (action[0].getStackSize() >= 20) action[0].deal(6, slots, false, true);
});

function getAllObjectsByTemplateName(name: string) {
  return world.getAllObjects().filter((d) => d.getTemplateName() === name);
}
function getObjectByTemplateName(name: string) {
  return world.getAllObjects().find((d) => d.getTemplateName() === name);
}

function onMap(obj: GameObject) {
  return world
    .lineTrace(obj.getPosition(), obj.getPosition().add(new Vector(0, 0, -10)))
    .some(({ object }) => object.getTemplateName() === "map");
}

function occupied(snaps: SnapPoint | SnapPoint[]) {
  return snaps instanceof SnapPoint
    ? snaps.getSnappedObject()
    : snaps.some((d) => d.getSnappedObject());
}
function getPosition(snaps: SnapPoint | SnapPoint[]) {
  return snaps instanceof SnapPoint
    ? snaps.getGlobalPosition()
    : snaps.length === 1
      ? snaps[0].getGlobalPosition()
      : Vector.lerp(
          snaps[0].getGlobalPosition(),
          snaps[1].getGlobalPosition(),
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
