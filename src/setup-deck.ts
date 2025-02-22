import type {
  Card,
  MultistateObject,
  Player,
  SnapPoint,
} from "@tabletop-playground/api";
import {
  refPackageId as _refPackageId,
  DrawingLine,
  globalEvents,
  refCard,
  Rotator,
  Vector,
  world,
} from "@tabletop-playground/api";
import type { InitiativeMarker } from "./initiative-marker";
import {
  above,
  blockedResourceSnaps,
  gainResource,
  getActionDecks,
  getPosition,
  getSystems,
  nearby,
  occupied,
  origin,
  placeAgents,
  placeAid,
  placeCities,
  placeCourt,
  placeResources,
  placeShips,
  placeStarports,
  removeBlocks,
  removeCampaign,
  removeNotes,
  removePlayers,
  resourceAmbitions,
  shuffledSlots,
  systemResource,
} from "./lib/setup";

const refPackageId = _refPackageId;

const flat = new Rotator(-90, 0, 0);

export type TestableCard = Card & {
  onRemoved: { trigger: typeof initialSetup };
  onFlipUpright: { trigger: typeof previewSetup };
  onPrimaryAction: { trigger: typeof followSetup };
};

// Add triggers for testability
(refCard as TestableCard).onRemoved.trigger = initialSetup;
(refCard as TestableCard).onFlipUpright.trigger = previewSetup;
(refCard as TestableCard).onPrimaryAction.trigger = followSetup;

if (refCard.getStackSize() > 1) refCard.onRemoved.add(initialSetup);

refCard.onFlipUpright.add((card) =>
  Math.abs(card.getRotation().roll) < 10
    ? previewSetup(card)
    : clearPreviewSetup(),
);
refCard.onSecondaryAction.add(previewSetup);
refCard.onPrimaryAction.add(followSetup);

refCard.addCustomAction(
  "Preview Setup",
  "Preview the setup instructions of this card on the map",
);
refCard.addCustomAction(
  "Follow Setup",
  "Follow the setup instructions on this card",
);
refCard.onCustomAction.add((card: Card, player: Player, identifier: string) => {
  switch (identifier) {
    case "Preview Setup":
      return previewSetup(card);
    case "Follow Setup":
      return followSetup(card);
  }
});

function initialSetup(card: Card) {
  if ("_initialSetup" in world) return;

  // Setup card details
  const { metadata } = card.getCardDetails(0)!;
  const [, ...setup] = metadata.trim().split("\n");

  // Randomly pick first player
  const slots = shuffledSlots(setup.length);

  // Initiative marker to first player
  (world.getObjectById("initiative") as InitiativeMarker)?.take(slots[0]);

  // Shuffle action deck
  const action = getActionDecks();
  // 4p: add 1, 7s
  if (setup.length === 4) action[0].addCards(action[1]);
  else action[1]?.destroy();
  action[0].setRotation(new Rotator(0, -90, 0));
  action[0].shuffle();

  // Shuffle court deck
  const court = getCourtDeck();
  placeCourt(court, setup.length);

  // Clean up unused components
  removeSetup(slots);
  removePlayers([0, 1, 2, 3].filter((s) => !slots.includes(s)));
  removeCampaign();

  // Turn to setup rules
  world.getObjectByTemplateName<MultistateObject>("base-rules")?.setState(4);

  (world as typeof world & { _initialSetup: boolean })._initialSetup = true;
}

function previewSetup(card: Card) {
  if (card.getStackSize() > 1) return;
  if ("_followedSetup" in world) return;

  // Remove previous preview
  clearPreviewSetup();

  // Setup card details
  const { metadata } = card.getCardDetails(0)!;
  const [block, ...setup] = metadata.trim().split("\n");

  // Player order
  const slots = world.getSlots();

  // Out of play
  for (const cluster of block.split(" ")) createBlock(+cluster);

  // Starting pieces
  const systems = getSystems();
  for (const [i, line] of setup.entries()) {
    const system = line
      .split(" ")
      .map((s) => systems.filter((d) => d.id === s).map((d) => d.snap));
    for (let j = 0; j < system.length; j++)
      createLabel("ABCC".charAt(j), nearby(getPosition(system[j])), slots[i]);
  }
}
function clearPreviewSetup() {
  if ("_followedSetup" in world) return;
  for (const l of world.getDrawingLines()) world.removeDrawingLineObject(l);
  for (const label of world.getAllLabels()) label.destroy();
  for (const block of world.getObjectsByTemplateName("block")) block.destroy();
}

function followSetup(card: Card) {
  if (card.getStackSize() > 1) return;
  if ("_followedSetup" in world) return;

  // Remove preview
  clearPreviewSetup();

  // Setup card details
  const { metadata } = card.getCardDetails(0)!;
  const [block, ...setup] = metadata.trim().split("\n");

  // Player order
  const slots = world.getSlots();

  // Block out of play clusters
  const systems = getSystems();
  const resources = new Map<string, number>();
  for (const cluster of block.split(" ")) {
    for (const i of "0123") {
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
  // 2p: out of play resources
  for (const [r, n] of resources) placeResources(r, n, blockedResourceSnaps[r]);
  for (const [a, n] of resourceAmbitions(resources)) // todo: support manual setup?
    globalEvents.onAmbitionTallied.trigger(a, 4, n);

  // Power markers
  for (const missing of world
    .getObjectsByTemplateName("power")
    .filter((d) => !slots.includes(d.getOwningPlayerSlot())))
    missing.destroy();

  // Starting pieces, gain resources
  let canDeal = true;
  for (const [i, line] of setup.entries()) {
    const system = line
      .split(" ")
      .map((s) => systems.filter((d) => d.id === s).map((d) => d.snap));
    const { placements, resources, abilities } =
      getLeader(slots[i]) ?? getDefaultPlacement(slots[i]);
    canDeal = setupAbilities(abilities, slots[i]) && canDeal;
    for (let j = 0; j < system.length; j++)
      if (!occupied(system[j])) (placements[j] ?? placements[2])(system[j]);
    resources(system);
  }

  // Deal action cards
  const [action] = getActionDecks();
  if (canDeal && action.getStackSize() >= 20)
    action.deal(6, slots, false, true);
  for (const holder of world.getObjectsByTemplateName("cards"))
    if ("sort" in holder && typeof holder.sort === "function") holder.sort();

  // Clean up unused components
  removeNotes();
  removeBlocks();

  // Place aid
  placeAid();

  (world as typeof world & { _followedSetup: boolean })._followedSetup = true;
}

function createLabel(text: string, position: Vector, slot: number) {
  const dot = new DrawingLine();
  dot.points = [position.add(new Vector(0, 0, 0.2))];
  dot.thickness = 3;
  dot.color = world.getSlotColor(slot).lighten(-0.2);
  world.addDrawingLine(dot);

  const label = world.createLabel(position.add(new Vector(-0.3, 0, 0.3)));
  label.setRotation(flat);
  label.setFont("FMBolyarPro-700.ttf", refPackageId);
  label.setScale(0.3);
  label.setText(text);
  return label;
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
    abilities: [],
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
    const [a, b, c, resources, ...abilities] = metadata.trim().split("\n");
    return {
      placements: [a, b, c].map(createPlacement(slot)),
      resources: () => {
        for (const r of resources.split(" ")) gainResource(slot, r);
      },
      abilities,
    };
  }
}
function setupAbilities(abilities: string[], slot: number) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot)!;
  const outrage = board
    .getAllSnapPoints()
    .filter((d) => d.getTags().includes("agent"))
    .sort((a, b) => b.getLocalPosition().x - a.getLocalPosition().x);
  let canDeal = true;
  for (const ability of abilities)
    switch (ability) {
      case "cryptic":
        // *Cryptic*. In **setup**, place agents on your Material and Fuel Outrage slots on your player board.
        for (const s of outrage.slice(0, 2))
          if (!s.getSnappedObject())
            placeAgents(slot, 1, s.getGlobalPosition());
        break;
      case "learned": {
        // *Learned*. After **setup**, gain 2 extra lore cards—draw 5 lore, keep 2, and scrap the other 3
        const lore = world
          .getObjectsByTemplateName<Card>("lore")
          .filter((c) => c.getStackSize() > 1)
          .reduce((combined, deck) => (combined.addCards(deck), combined));
        lore.shuffle();
        lore.deal(5, [slot], false, true);
        canDeal = false;
        break;
      }
      case "hated": {
        // *Hated*. In **setup**, scrap 2 Loyal ships and 3 Loyal agents.
        const counts = world
          .getAllObjects()
          .filter((o) => o.getOwningPlayerSlot() === slot)
          .reduce<Record<string, number>>((counts, o) => {
            const n = o.getTemplateName();
            counts[n] = (counts[n] || 0) + 1;
            return counts;
          }, {});
        const zero = new Vector(0, 0, 0);
        for (const o of [
          ...placeShips(slot, Math.max(counts.ship - 15 + 2, 0), zero),
          ...placeAgents(slot, Math.max(counts.agent - 10 + 3, 0), zero),
        ])
          o.destroy();
        break;
      }
      case "decentralized":
        // *Decentralized*. In **setup**, scrap your 2 leftmost cities from your player board.
        for (const c of board
          .getAllSnapPoints()
          .filter((d) => d.getTags().includes("building"))
          .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y)
          .slice(0, 2)
          .map((d) => d.getSnappedObject()))
          c?.destroy();
        break;
      case "greedy":
        // *Greedy*. In **setup**, place an agent on your Material Outrage slot.
        if (!outrage[0].getSnappedObject())
          placeAgents(slot, 1, outrage[0].getGlobalPosition());
        break;
    }
  return canDeal;
}

function removeSetup(slots: number[]) {
  for (const obj of world.getObjectsByTemplateName<Card>("setup"))
    if (
      obj.getCardDetails(0)!.metadata.trim().split("\n").length - 1 !==
      slots.length
    )
      obj.destroy();
}

function getCourtDeck() {
  return world.getObjectByTemplateName<Card>("bc");
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
