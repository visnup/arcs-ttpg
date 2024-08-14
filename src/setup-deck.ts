import {
  Card,
  refCard,
  Rotator,
  SnapPoint,
  Vector,
  world,
} from "@tabletop-playground/api";
import { InitiativeMarker } from "./initiative-marker";
import type { Player } from "@tabletop-playground/api";

const origin = new Vector(0, 0, world.getObjectById("map")!.getPosition().z);
const above = new Vector(0, 0, 0.1);

refCard.onPrimaryAction.add(followSetup);
refCard.onCustomAction.add(followSetup);
refCard.addCustomAction(
  "Follow Setup",
  "Follow the setup instructions on this card",
);

function followSetup(card: Card, player: Player) {
  if (card.getStackSize() > 1) return;

  // Setup card details
  const { metadata } = card.getCardDetails(0)!;
  const [block, ...setup] = metadata.trim().split("\n");

  // Players
  const needed = [
    ...new Set([...world.getAllPlayers().map((p) => p.getSlot()), 0, 1, 2, 3]),
  ]
    .filter((s) => 0 <= s && s <= 3)
    .slice(0, setup.length)
    .sort();

  // Clean up unused components
  removeNotes();
  removeCampaign();
  removePlayers([0, 1, 2, 3].filter((s) => !needed.includes(s)));

  // Randomly pick first player
  const first = Math.floor(Math.random() * needed.length);
  const slots = needed.slice(first).concat(needed.slice(0, first));

  // Initiative marker to first player
  (world.getObjectById("initiative") as InitiativeMarker)?.take(slots[0]);

  // Shuffle action deck
  const action = getActionDecks();
  // 4p: add 1, 7s
  if (setup.length === 4) action[0]?.addCards(action[1]);
  else action[1]?.destroy();
  action[0]?.setRotation(new Rotator(0, -90, 0));
  action[0]?.shuffle();

  // Shuffle court deck
  const court = getCourtDeck();
  if (court) {
    court.setRotation(new Rotator(0, 90, 0));
    court.shuffle();
    // Deal court; 2p: 3 cards, 3-4p: 4 cards
    for (const snap of getCourtSnaps().slice(0, setup.length === 2 ? 3 : 4)) {
      if (occupied(snap)) continue;
      const card = court.takeCards(1);
      if (!card) break;
      card.setPosition(getPosition(snap).add(above));
      card.snap();
    }
  }

  // Out of play
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
      block.setPosition(getPosition(system).add(above));
      block.setRotation(new Rotator(0, 0, 0));
      block.snap();
      block.freeze();

      // 2p: out of play resources
      if (slots.length === 2) {
        const r = systemResource(system[0]);
        if (r) resources.set(r, (resources.get(r) || 0) + 1);
      }
    }
    createBlock(+cluster);
  }
  for (const [r, n] of resources.entries())
    placeResources(r, n, blockedResourceSnaps[r]);

  // Power markers
  for (const missing of world
    .getObjectsByTemplateName("power")
    .filter((d) => !slots.includes(d.getOwningPlayerSlot())))
    missing.destroy();

  // Starting pieces, gain resources
  for (const [i, line] of setup.entries()) {
    const system = line
      .split(" ")
      .map((s) => systems.filter((d) => d.id === s).map((d) => d.snap));
    const { placements, resources } =
      getLeader(slots[i]) ?? getDefaultPlacement(slots[i]);
    for (let j = 0; j < system.length; j++)
      if (!occupied(system[j])) (placements[j] ?? placements[2])(system[j]);
    resources(system);
  }

  // Deal action cards
  if (action[0].getStackSize() >= 20) action[0].deal(6, slots, false, true);
  for (const holder of world.getObjectsByTemplateName("cards"))
    if ("sort" in holder && typeof holder.sort === "function") holder.sort();
}

const createPlacement =
  (slot: number) => (spec: string) => (system: SnapPoint[]) => {
    const [ships, building] = spec.split(" ");
    const p = getPosition(system);
    placeShips(slot, +ships, nearby(p));
    if (building === "city") placeCities(slot, 1, p);
    if (building === "starport") placeStarports(slot, 1, p);
  };
function getDefaultPlacement(slot: number) {
  return {
    placements: [
      "3 city", // A
      "3 starport", // B
      "2", // C
    ].map(createPlacement(slot)),
    resources: (systems: SnapPoint[][]) => {
      // gain from first two systems
      gainResource(slot, systemResource(systems[0][0]));
      gainResource(slot, systemResource(systems[1][0]));
    },
  };
}
function getLeader(slot: number) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot)!;
  const card = world
    .getObjectsByTemplateName<Card>("leader")
    .find(
      (d) =>
        d.getStackSize() === 1 &&
        d.getPosition().distance(board.getPosition()) < 20,
    );
  if (card) {
    const { metadata } = card.getCardDetails(0)!;
    const [a, b, c, resources] = metadata.trim().split("\n");
    return {
      placements: [a, b, c].map(createPlacement(slot)),
      resources: () => {
        for (const r of resources.split(" ")) gainResource(slot, r);
      },
    };
  }
}

function removeNotes() {
  for (const obj of world.getObjectsByTemplateName("note")) obj.destroy();
}
function removeCampaign() {
  for (const t of [
    "fate",
    "set-round",
    "cc",
    "dc",
    "book-of-law",
    "first-regent",
    "chapter-track",
    "number",
    "icon",
    "flagship-board",
    "flagship",
    "objective",
  ])
    for (const obj of world.getObjectsByTemplateName(t)) obj.destroy();
  for (const obj of world.getObjectsByTemplateName("power"))
    if (world.isOnTable(obj)) obj.destroy();
  for (const obj of world.getAllObjects())
    if (obj.getOwningPlayerSlot() === 4) obj.destroy();
}
function removePlayers(slots: number[]) {
  for (const slot of slots)
    for (const obj of world.getAllObjects())
      if (obj.getOwningPlayerSlot() === slot) obj.destroy();
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
  return world
    .getObjectsByTemplateName<Card>("action")
    .filter((d) => !d.isInHolder())
    .sort((a, b) => b.getStackSize() - a.getStackSize());
}

function getCourtDeck() {
  return world.getObjectByTemplateName<Card>("bc");
}
function getCourtSnaps() {
  const board = world.getObjectByTemplateName("court");
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
  return world
    .getObjectsByTemplateName(`block ${type}`)
    .filter((d) => !world.isOnMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(origin) - b.getPosition().distance(origin),
    )[0];
}
function createBlock(sector: number) {
  const template = [
    "BD6AA484E84B1EDA0E9FD19E43B1A61C",
    "92C1A3560B4B8CEE236D9F8B8DB7D564",
    "F6AF3FDD334BF12FF3D58080F5659475",
    "FCA6F180B64C68A3F882619E46C99E50",
    "0FB517B97945EF9A0FBD31A9B69A94EB",
    "7339DACED24D5ACC5D15DF97041449DE",
  ][sector - 1];
  if (!template) return;
  const block = world.createObjectFromTemplate(
    template,
    origin.add(new Vector(0, 0, 0.5)),
  );
  block?.freeze();
  return block;
}

function nearby(building: Vector) {
  if (building.distance(origin) < 11) return building;
  const direction = building.subtract(origin).unit();
  const ring = origin.add(direction.multiply(11));
  return Vector.lerp(ring, building, building.distance(ring) > 5 ? 0.5 : 2);
}

// Find _n_ ships belonging to _slot_ player closest to _target_ and place them
function placeShips(slot: number, n: number, target: Vector) {
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
  const width = ships[0]?.getSize().y + 0.1;
  for (const [j, ship] of ships.entries()) {
    ship.setRotation(rotation);
    ship.setPosition(target.add(direction.multiply((j - half) * width)));
    ship.snap();
  }
  return ships;
}
// Find _n_ cities belonging to _slot_ player on player board from left to right and place them
function placeCities(slot: number, n: number, target: Vector) {
  const cities = world
    .getObjectsByTemplateName("city")
    .filter((d) => d.getOwningPlayerSlot() === slot && !world.isOnMap(d))
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
  const starports = world
    .getObjectsByTemplateName("starport")
    .filter((d) => d.getOwningPlayerSlot() === slot && !world.isOnMap(d))
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
  let supply = world
    .getObjectsByTemplateName<Card>("resource")
    .find((d) => d.getCardDetails(0)!.name === resource && world.isOnTable(d));
  if (!supply) return;
  if (n < supply.getStackSize()) supply = supply.takeCards(n);
  supply?.setPosition(target.add(above));
  supply?.snap();
}
function gainResource(slot: number, resource: string | undefined) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot)!;
  const empty = board
    .getAllSnapPoints()
    .filter((d) => d.getTags().includes("resource") && !d.getSnappedObject())
    .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y)[0];
  placeResources(resource, 1, empty.getGlobalPosition());
}

const blockedResourceSnaps = Object.fromEntries(
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
