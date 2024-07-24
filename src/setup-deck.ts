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
  for (const missing of getPowerMarkers().filter(
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
      const a_ = shipPlacement(a);
      const shipsA = takeShips(slots[i], 3, a_);
      for (const [j, ship] of shipsA.entries()) {
        ship.setPosition(a_.add(new Vector(0, 0, j * 1)));
        ship.snap();
      }
      const city = takeCities(slots[i], 1)[0];
      city.setPosition(a.add(above));
      city.snap();
    }
    // B: 3 ships, 1 starport
    if (!occupied(snaps[1])) {
      const b = getPosition(snaps[1]);
      const b_ = shipPlacement(b);
      const shipsB = takeShips(slots[i], 3, b_);
      for (const [j, ship] of shipsB.entries()) {
        ship.setPosition(b_.add(new Vector(0, 0, j * 1)));
        ship.snap();
      }
      const starport = takeStarports(slots[i], 1, b)[0];
      starport.setPosition(b.add(above));
      starport.snap();
    }
    // C: 2 ships
    if (!occupied(snaps[2])) {
      const c = getPosition(snaps[2]);
      const shipsC = takeShips(slots[i], 2, c);
      for (const [j, ship] of shipsC.entries()) {
        ship.setPosition(c.add(new Vector(0, 0, j * 1)));
        ship.snap();
      }
    }
    if (snaps[3] && !occupied(snaps[3])) {
      const c = shipPlacement(getPosition(snaps[3]));
      const shipsC = takeShips(slots[i], 2, c);
      for (const [j, ship] of shipsC.entries()) {
        ship.setPosition(c.add(new Vector(0, 0, j * 1)));
        ship.snap();
      }
    }
  }

  // TODO resource tokens

  // deal action cards
  if (action[0].getStackSize() >= 20) action[0].deal(6, slots, false, true);
});

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
    world
      .getAllObjects()
      .filter(
        (d) => d.getTemplateName() === "action" && !(d as Card).isInHolder(),
      ) as Card[]
  ).sort((a, b) => b.getStackSize() - a.getStackSize());
}

function getCourtDeck() {
  return world
    .getAllObjects()
    .find((d) => d.getTemplateName() === "bc") as Card;
}
function getCourtPoints() {
  const board = world
    .getAllObjects()
    .find((d) => d.getTemplateName() === "court");
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
    .filter((d) => d.getTags().some((t) => t.startsWith("cluster-")))
    .map((snap) => {
      const tags = snap.getTags();
      const cluster = tags.find((t) => t.startsWith("cluster-"));
      const system = tags.find((t) => t.startsWith("system-"));
      return {
        id: `${cluster?.replace("cluster-", "")}.${system?.replace("system-", "")}`,
        snap,
      };
    });
}

const origin = new Vector(0, 0, world.getObjectById("map")!.getPosition().z);
function takeBlock(type: "small" | "large" | "round") {
  return world
    .getAllObjects()
    .filter((d) => d.getTemplateName() === `block ${type}` && !onMap(d))
    .sort(
      (a, b) =>
        a.getPosition().distance(origin) - b.getPosition().distance(origin),
    )[0];
}

function getPowerMarkers() {
  return world.getAllObjects().filter((d) => d.getTemplateName() === "power");
}

function shipPlacement(building: Vector) {
  return Vector.lerp(origin, building, 0.7);
}

// Find _n_ ships belonging to _slot_ player closest to _target_
function takeShips(slot: number, n: number, target: Vector) {
  return world
    .getAllObjects()
    .filter(
      (d) =>
        d.getTemplateName() === "ship" &&
        d.getOwningPlayerSlot() === slot &&
        !onMap(d),
    )
    .sort(
      (a, b) =>
        a.getPosition().distance(target) - b.getPosition().distance(target),
    )
    .slice(0, n);
}
// Find _n_ cities belonging to _slot_ player on player board from left to right
function takeCities(slot: number, n: number) {
  return world
    .getAllObjects()
    .filter(
      (d) =>
        d.getTemplateName() === "city" &&
        d.getOwningPlayerSlot() === slot &&
        !onMap(d),
    )
    .sort((a, b) => a.getPosition().y - b.getPosition().y)
    .slice(0, n);
}
// Find _n_ starports belonging to _slot_ player closest to _target_
function takeStarports(slot: number, n: number, target: Vector) {
  return world
    .getAllObjects()
    .filter(
      (d) =>
        d.getTemplateName() === "starport" &&
        d.getOwningPlayerSlot() === slot &&
        !onMap(d),
    )
    .sort(
      (a, b) =>
        a.getPosition().distance(target) - b.getPosition().distance(target),
    )
    .slice(0, n);
}
