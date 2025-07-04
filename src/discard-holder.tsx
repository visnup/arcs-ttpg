import type {
  CardHolder,
  GameObject,
  Player,
  Zone,
} from "@tabletop-playground/api";
import {
  refHolder as _refHolder,
  refPackageId as _refPackageId,
  Button,
  Card,
  globalEvents,
  Rotator,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { removeNotes } from "./lib/setup";

const refHolder = _refHolder;
const refPackageId = _refPackageId;

refHolder.onInserted.add(sortCard);
refHolder.onCustomAction.add(() => {
  refHolder.setRotation(new Rotator(0, refHolder.getRotation().yaw + 180, 0));
  updateCustomAction();
});
updateCustomAction();

function updateCustomAction() {
  if (discardFaceDown()) {
    refHolder.addCustomAction("Toggle to Face Up");
    refHolder.removeCustomAction("Toggle to Face Down");
  } else {
    refHolder.addCustomAction("Toggle to Face Down");
    refHolder.removeCustomAction("Toggle to Face Up");
  }
}

function discardFaceDown() {
  return refHolder.getRotation().yaw > 0;
}

function coveredByCourt(card: Card) {
  return /^(bc|cc|lore|f\d+)$/.test(
    String(
      world
        .boxTrace(
          card.getExtentCenter(true, false),
          card.getExtentCenter(true, false).add(new Vector(0, 0, 10)),
          card.getExtent(true, false).multiply(0.75),
        )
        .filter(({ object }) => object !== card)
        .map(({ object }) => object.getTemplateName()),
    ),
  );
}

// Ensure zone has been created
process.nextTick(() => {
  const zone = getActionZone();
  if (!zone) return;
  // Show discard button when action card is played
  for (const obj of zone.getOverlappingObjects()) onBeginOverlap(zone, obj);
  zone.onBeginOverlap.add(onBeginOverlap);

  function onBeginOverlap(zone: Zone, obj: GameObject) {
    if (obj instanceof Card && obj.getCardDetails().tags.includes("action")) {
      if (!refHolder.getUIs().length) {
        // Create button
        const button = new UIElement();
        button.position = new Vector(
          (discardFaceDown() ? 1 : -1) *
            (refHolder.getExtent(false, false).x + 1),
          0,
          0,
        );
        if (discardFaceDown()) button.rotation = new Rotator(0, 180, 0);
        button.scale = 0.15;
        button.widget = render(
          <button
            size={48}
            font="NeueKabelW01-Book.ttf"
            fontPackage={refPackageId}
            onClick={discardOrEndChapter}
          >
            {" Discard "}
          </button>,
        );
        refHolder.addUI(button);
      } else {
        // Update button text
        (refHolder.getUIs()[0].widget as Button).setText(" Discard ");
      }
    }
  }
});

function discardOrEndChapter(button: Button, player?: Player) {
  if (
    getActionZone()
      ?.getOverlappingObjects()
      .filter(
        (d) => d instanceof Card && d.getCardDetails().tags.includes("action"),
      ).length
  )
    discard(button, player);
  else endChapter();
}

// Put all cards in the action zone into the discard pile, self-discard anything that supports it
const pieces = new Set(["ship", "city", "starport"]);
function discard(button: Button, player?: Player) {
  const zone = getActionZone();
  if (!zone) return;
  removeNotes(
    (obj) =>
      obj.getDescription().toLowerCase().includes("discard") ||
      obj.getDescription().toLowerCase().includes("timer"),
  );
  const discarded: Card[] = [];
  for (const obj of zone.getOverlappingObjects()) {
    if (
      obj instanceof Card &&
      obj.getCardDetails().tags.includes("action") &&
      !coveredByCourt(obj)
    ) {
      refHolder.insert(obj, 0);
      if (obj.isFaceUp() && discardFaceDown()) refHolder.flipCard(obj);
      sortCard(refHolder, obj, player, 0);
      discarded.push(obj);
    }
    if (
      "discard" in obj &&
      typeof obj.discard === "function" &&
      !pieces.has(obj.getTemplateName())
    )
      obj.discard();
  }
  button.setText(" End Chapter ");
  setTimeout(() => globalEvents.onActionsDiscarded.trigger(discarded), 100);
}

function endChapter() {
  if (!refHolder.getNumCards()) return;
  const snap = world
    .getObjectById("map")!
    .getAllSnapPoints()
    .find((s) => s.getTags().includes("card-discard"));
  if (!snap) return;
  let discard = snap.getSnappedObject();
  if (discard === undefined) {
    // Empty discard: make a new one
    discard = refHolder.removeAt(0)!;
    discard.setPosition(snap.getGlobalPosition());
    discard.snap();
  }
  if (discard instanceof Card) {
    for (const h of [
      refHolder,
      ...world
        .getObjectsByTemplateName<CardHolder>("cards")
        .filter((d) => d.getOwningPlayerSlot() !== -1),
    ])
      for (const c of h.getCards()) discard.addCards(c);
    discard.shuffle();
  }
  refHolder.removeUI(0);
  setTimeout(() => globalEvents.onChapterEnded.trigger(), 100);
}

function getActionZone() {
  return world.getAllZones().find((z) => z.getId().startsWith("zone-action-"));
}

function sortCard(
  holder: CardHolder,
  card: Card,
  player?: Player,
  inserted: number = holder.getNumCards(),
) {
  if (!holder.isCardFaceUp(card)) {
    // Move to end
    holder.moveCard(card, holder.getNumCards());
  } else {
    const getIndex = (c: Card) => {
      const details = c.getCardDetails();
      return details.name === "Event" ? -1 : details.index;
    };
    // Put it in order
    const index = getIndex(card);
    const cards = holder.getCards();
    for (let i = 0; i < cards.length; i++)
      if (getIndex(cards[i]) > index || !holder.isCardFaceUp(cards[i]))
        return holder.moveCard(card, i - (i > inserted ? 1 : 0));
    // Belongs at the end
    holder.moveCard(card, holder.getNumCards());
  }
}

globalEvents.onRoundEnded.add(() => {
  const button = refHolder.getUIs()[0]?.widget;
  if (button && button instanceof Button) discardOrEndChapter(button);
});
