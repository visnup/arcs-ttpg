import {
  refPackageId as _refPackageId,
  Card,
  refCard,
  Rotator,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import type { InitiativeMarker } from "./initiative-marker";
const refPackageId = _refPackageId;

function getInitiative() {
  return world.getObjectById("initiative") as InitiativeMarker;
}

// Draw from bottom
refCard.addCustomAction("Draw from bottom");
refCard.onCustomAction.add((card, player, identifier) => {
  switch (identifier) {
    case "Draw from bottom":
      card.moveCardInStack(0, card.getStackSize() - 1);
      card.deal(1, [player.getSlot()]);
      break;
  }
});

// Deal option after shuffle
refCard.onPrimaryAction.add((card) => {
  if (card.getUIs().length || card.getStackSize() === 1) return;
  const ui = new UIElement();
  ui.position = new Vector(-card.getExtent(false, false).x - 1.5, 0, 0);
  ui.scale = 0.2;
  ui.widget = render(
    <button
      size={48}
      font="NeueKabelW01-Book.ttf"
      fontPackage={refPackageId}
      onClick={() => {
        card.deal(6);
        for (const holder of world.getAllObjects())
          if (
            holder.getTemplateName() === "cards" &&
            "sort" in holder &&
            typeof holder.sort === "function"
          )
            holder.sort();
        getInitiative()?.stand();
        card.removeUI(index);
      }}
    >
      {" Deal "}
    </button>,
  );
  const index = card.addUI(ui);
});

function isSecond(card: Card) {
  return String(
    world
      .boxTrace(
        card.getExtentCenter(true, false),
        card.getExtentCenter(true, false).add(new Vector(0, 0, -10)),
        card.getExtent(true, false).multiply(0.75),
      )
      .filter(({ object }) => object !== card)
      .map(({ object }) => object.getTemplateName()),
  ).endsWith("action,map");
}

function suit(card: Card) {
  return Math.floor(card.getCardDetails(0)!.index / 7);
}
function rank(card: Card) {
  return (card.getCardDetails(0)!.index % 7) + 1;
}
function getPlayed() {
  const zone = world
    .getAllZones()
    .find((z) => z.getId().startsWith("zone-action-"));
  return (
    (zone
      ?.getOverlappingObjects()
      .filter((o) => o.getTemplateName() === "action")
      .sort((a, b) => a.getPosition().x - b.getPosition().x) as Card[]) ?? []
  );
}
function getSurpassing() {
  const played = getPlayed();
  const lead = played.find((c) => c.isFaceUp());
  if (!lead) return [];
  return played.filter((c) => c.isFaceUp() && suit(c) === suit(lead));
}
function isSurpassing(card: Card) {
  const surpassing = getSurpassing();
  return (
    surpassing.length > 1 &&
    surpassing.includes(card) &&
    surpassing.slice(1).every((c) => rank(c) <= rank(card)) // ignore lead; the zero marker may be on it
  );
}

// Stand up initiative when lead card is played
refCard.onSnapped.add((card, player, snap) => {
  if (snap.getTags().includes("card-lead")) getInitiative()?.stand();
});

// Seize or surpass option card is played
refCard.onReleased.add((card, player) => {
  if (card.getUIs().length || card.getStackSize() > 1) return;
  if (getInitiative()?.isSeized()) return;
  const isFaceUp = card.isFaceUp();
  if (
    (!isFaceUp && isSecond(card)) ||
    (isFaceUp && rank(card) === 7 && isSurpassing(card))
  ) {
    const ui = new UIElement();
    ui.position = new Vector(-5.5, 0, 0);
    if (isFaceUp) ui.rotation = new Rotator(180, 180, 0);
    ui.scale = 0.2;
    ui.widget = render(
      <button
        size={48}
        font="NeueKabelW01-Book.ttf"
        fontPackage={refPackageId}
        onClick={() => {
          getInitiative()?.seize(player);
          card.removeUI(index);
        }}
      >
        {" Seize "}
      </button>,
    );
    const index = card.addUI(ui);
  } else if (isFaceUp && isSurpassing(card)) {
    const ui = new UIElement();
    ui.position = new Vector(-5.5, 0, 0);
    ui.rotation = new Rotator(180, 180, 0);
    ui.scale = 0.2;
    ui.widget = render(
      <button
        size={48}
        font="NeueKabelW01-Book.ttf"
        fontPackage={refPackageId}
        onClick={() => {
          getInitiative()?.take(player);
          card.removeUI(index);
        }}
      >
        {" Surpass "}
      </button>,
    );
    const index = card.addUI(ui);
    for (const c of getSurpassing()) if (c !== card) c.removeUI(0);
  }
});

// Remove UI when card is grabbed
refCard.onGrab.add((card) => {
  while (card.getUIs().length) card.removeUI(0);
});
