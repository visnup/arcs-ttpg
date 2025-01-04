import type { GameObject, MultistateObject } from "@tabletop-playground/api";
import {
  Card,
  Rotator,
  SnapPoint,
  Vector,
  world,
} from "@tabletop-playground/api";

export const above = new Vector(0, 0, 0.1);
export const origin = new Vector(
  0,
  0,
  world.getObjectById("map")!.getPosition().z,
);

export const blockedResourceSnaps = Object.fromEntries(
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

export function removeNotes(
  condition = (obj: GameObject) => obj.getDescription().includes("Shuffle"),
) {
  for (const obj of world.getObjectsByTemplateName("note"))
    if (condition(obj)) obj.destroy();
}
export function removeCampaign() {
  for (const t of [
    "fate",
    "set-round",
    "cc",
    "dc",
    "book-of-law",
    "first-regent",
    "chapter-track",
    "number",
    "event",
    "flagship-board",
    "flagship",
    "objective",
    "campaign-rules",
  ])
    for (const obj of world.getObjectsByTemplateName(t)) obj.destroy();
  for (const obj of world.getObjectsByTemplateName("power"))
    if (world.isOnTable(obj)) obj.destroy();
  for (const obj of world.getAllObjects())
    if (obj.getOwningPlayerSlot() === 4) obj.destroy();
  removeNotes((obj) => obj.getDescription().startsWith("Campaign"));
}
export function removePlayers(slots: number[]) {
  for (const slot of slots)
    for (const obj of world.getAllObjects())
      if (obj.getOwningPlayerSlot() === slot) obj.destroy();
}
export function removeBlocks() {
  for (const t of ["block large", "block small", "block round"])
    for (const obj of world.getObjectsByTemplateName(t))
      if (world.isOnTable(obj)) obj.destroy();
}

export function placeAid() {
  const p = world.getObjectByTemplateName("base-rules")?.getPosition();
  if (!p) return;
  const aid = world.createObjectFromTemplate(
    "34FBB8B5F944402AACD987BCBE52E300",
    p.add(new Vector(0, 20, 0)),
  ) as MultistateObject;
  aid.setState(2);
}

export function getPosition(system: SnapPoint | SnapPoint[]) {
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

export function getActionDecks() {
  return world
    .getObjectsByTemplateName<Card>("action")
    .filter((d) => !d.isInHolder())
    .sort((a, b) => b.getStackSize() - a.getStackSize());
}

export function getCourtSnaps() {
  const board = world.getObjectByTemplateName("court");
  if (!board) return [];
  return board
    .getAllSnapPoints()
    .sort((a, b) => b.getLocalPosition().y - a.getLocalPosition().y)
    .slice(1);
}

export function getSystems() {
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

export function placeCourt(court: Card | undefined, players: number) {
  if (court) {
    court.setRotation(new Rotator(0, 90, 0));
    court.shuffle();
    // Deal court; 2p: 3 cards, 3-4p: 4 cards
    for (const snap of getCourtSnaps().slice(0, players === 2 ? 3 : 4)) {
      if (occupied(snap)) continue;
      const card = court.takeCards(1);
      if (!card) break;
      card.setPosition(getPosition(snap).add(above));
      card.snap();
    }
  }
}

export function occupied(system: SnapPoint | SnapPoint[]) {
  return system instanceof SnapPoint
    ? system.getSnappedObject()
    : system.some((d) => d.getSnappedObject());
}
export function nearby(building: Vector) {
  if (building.distance(origin) < 11) return building;
  const direction = building.subtract(origin).unit();
  const ring = origin.add(direction.multiply(11));
  return Vector.lerp(ring, building, building.distance(ring) > 5 ? 0.45 : 2);
}

// Find _n_ ships belonging to _slot_ player closest to _target_ and place them
export function placeShips(slot: number, n: number, target: Vector) {
  const ships = world
    .getObjectsByTemplateName("ship")
    .filter((d) => d.getOwningPlayerSlot() === slot && !world.isOnMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(target) - b.getPosition().distance(target),
    )
    .slice(0, n);
  const direction = target.subtract(origin).unit();
  const rotation = direction.toRotator();
  rotation.yaw += Math.random() > 0.5 ? 90 : -90;
  rotation.yaw += Math.random() * 30 - 15;
  const half = (ships.length - 1) / 2;
  const width = ships[0]?.getSize().y;
  for (const [j, ship] of ships.entries()) {
    ship.setRotation(rotation);
    ship.setPosition(target.add(direction.multiply((j - half) * width)));
    ship.snap();
  }
  return ships;
}
// Find _n_ cities belonging to _slot_ player on player board from left to right and place them
export function placeCities(slot: number, n: number, target: Vector) {
  const cities = world
    .getObjectsByTemplateName<Card>("city")
    .filter((d) => d.getOwningPlayerSlot() === slot && !world.isOnMap(d))
    .sort((a, b) => a.getPosition().y - b.getPosition().y)
    .slice(0, n);
  for (let city of cities) {
    if (city.getStackSize() > 1) city = city.takeCards(1)!;
    city.setPosition(target.add(above));
    city.snap();
  }
  return cities;
}
// Find _n_ starports belonging to _slot_ player closest to _target_ and place them
export function placeStarports(slot: number, n: number, target: Vector) {
  const starports = world
    .getObjectsByTemplateName<Card>("starport")
    .filter((d) => d.getOwningPlayerSlot() === slot && !world.isOnMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(target) - b.getPosition().distance(target),
    )
    .slice(0, n);
  for (let starport of starports) {
    if (starport.getStackSize() > 1) starport = starport.takeCards(1)!;
    starport.setPosition(target.add(above));
    starport.snap();
  }
  return starports;
}
// Find _n_ agents belonging to _slot_ player closest to _target_ and place them
export function placeAgents(slot: number, n: number, target: Vector) {
  const agents = world
    .getObjectsByTemplateName("agent")
    .filter((d) => d.getOwningPlayerSlot() === slot && !world.isOnMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(target) - b.getPosition().distance(target),
    )
    .slice(0, n);
  for (const agent of agents) {
    agent.setPosition(target.add(above));
    agent.snap();
  }
  return agents;
}

export function systemResource(system: SnapPoint): string | undefined {
  return system
    .getTags()
    .find((t) => t.startsWith("resource:"))
    ?.replace("resource:", "");
}
export function placeResources(
  resource: string | undefined,
  n: number,
  target: Vector,
) {
  let supply = world
    .getObjectsByTemplateName<Card>("resource")
    .find((d) => d.getCardDetails(0)!.name === resource && world.isOnTable(d));
  if (!supply) return;
  if (n < supply.getStackSize()) supply = supply.takeCards(n);
  supply?.setPosition(target.add(above));
  supply?.snap();
}
export function gainResource(slot: number, resource: string | undefined) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot)!;
  const empty = board
    .getAllSnapPoints()
    .filter((d) => d.getTags().includes("resource") && !d.getSnappedObject())
    .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y)[0];
  placeResources(resource, 1, empty.getGlobalPosition());
}

let freeCity: Card | undefined;
export function placeFreeCity(position: Vector) {
  freeCity ??= world
    .getObjectsByTemplateName<Card>("city")
    .find((d) => d.getOwningPlayerSlot() === 4);
  const city = freeCity?.takeCards(1);
  city?.setPosition(position.add(above));
  city?.snap();
  return city;
}
let blight: Card | undefined;
export function placeBlight(position: Vector) {
  blight ??= world
    .getObjectsByTemplateName("set-round")
    .find(
      (d) =>
        d instanceof Card &&
        d.getAllCardDetails().every(({ metadata }) => metadata === "blight"),
    ) as Card | undefined;
  blight?.takeCards(1)?.setPosition(position);
  return blight;
}
