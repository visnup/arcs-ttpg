import {
  Card,
  refCard,
  Rotator,
  SnapPoint,
  Vector,
  world,
} from "@tabletop-playground/api";
import { InitiativeMarker } from "./initiative-marker";

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

  // initiative marker to a random first player
  (world.getObjectById("initiative") as InitiativeMarker)?.take(slots[0]);

  // shuffle action deck
  // 4p: add 1, 7s
  const action = getActionCards();
  if (setup.length === 4) action[0].addCards(action[1]);
  action[0].setRotation(new Rotator(0, -90, 0));
  action[0].shuffle();

  // shuffle court deck
  // deal court; 2p: 3 cards, 3-4p: 4 cards

  const systems = getSystems();

  // out of play
  for (const cluster of block.split(" ")) {
    for (let i of "0123") {
      for (const { snap } of systems.filter(
        (d) => d.id === `${cluster}.${i}`,
      )) {
        if (snap.getSnappedObject()) continue;
        const size =
          i === "0" ? ("14".includes(cluster) ? "large" : "small") : "circle";
        const obj = world.createObjectFromTemplate(
          blocks[size],
          snap.getGlobalPosition().add(new Vector(0, 0, 0.1)),
        )!;
        obj.snap();
        obj.freeze();
      }
    }
  }

  // 2p: out of play resources

  // power markers

  // player pieces

  // resource tokens

  // deal action cards
  action[0].deal(6, slots, false, true);
});

function getActionCards() {
  return (
    world
      .getAllObjects()
      .filter((d) => d.getTemplateName() === "action") as Card[]
  ).sort((a, b) => b.getStackSize() - a.getStackSize());
}

const blocks = {
  small: "0E24FDAF2A4F9064B4A75C9C636781E3",
  large: "CF5D85683847813F1E8E42A12E617293",
  circle: "9DCAD3B92D45B6569168CDA2E9DD167D",
};

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
