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
  systemResource,
} from "./lib/setup";
import type { Ambition } from "./map-board";

const refPackageId = _refPackageId;

const flat = new Rotator(-90, 0, 0);

export type TestableCard = Card & {
  onRemoved: { trigger: typeof initialSetup };
  onFlipUpright: { trigger: typeof previewSetup };
  onPrimaryAction: { trigger: typeof followSetup };
};

// Avoid running if imported from another object script
if (refCard.getTemplateName() === "setup") {
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
  refCard.onCustomAction.add(
    (card: Card, player: Player, identifier: string) => {
      switch (identifier) {
        case "Preview Setup":
          return previewSetup(card);
        case "Follow Setup":
          return followSetup(card);
      }
    },
  );
}

function initialSetup(card: Card) {
  if ("_initialSetup" in world) return;

  // Setup card details
  const { metadata } = card.getCardDetails(0)!;
  const [, ...setup] = metadata.trim().split("\n");

  // Players
  const needed = [
    ...new Set([...world.getAllPlayers().map((p) => p.getSlot()), 0, 1, 2, 3]),
  ]
    .filter((s) => 0 <= s && s <= 3)
    .slice(0, setup.length)
    .sort();

  // Randomly pick first player
  const first = Math.floor(Math.random() * needed.length);
  const slots = needed.slice(first).concat(needed.slice(0, first));

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
  for (const line of world.getDrawingLines())
    world.removeDrawingLineObject(line);
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
  const ambitions = [...resources].reduce<Record<string, number>>(
    (sum, [r, n]) => {
      const a = {
        fuel: "tycoon",
        material: "tycoon",
        weapon: "warlord",
        relic: "keeper",
        psionic: "empath",
      }[r]!;
      sum[a] = (sum[a] || 0) + n;
      return sum;
    },
    {},
  );
  for (const [a, n] of Object.entries(ambitions))
    globalEvents.onAmbitionTallied.trigger(a as Ambition, 4, n);

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
  const [action] = getActionDecks();
  if (action.getStackSize() >= 20) action.deal(6, slots, false, true);
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
