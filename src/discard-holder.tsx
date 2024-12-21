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
  Rotator,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import type { MapBoard } from "./map-board";

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
  return String(
    world
      .boxTrace(
        card.getExtentCenter(true, false),
        card.getExtentCenter(true, false).add(new Vector(0, 0, 10)),
        card.getExtent(true, false).multiply(0.75),
      )
      .filter(({ object }) => object !== card)
      .map(({ object }) => object.getTemplateName()),
  ).match(/(bc|cc|f\d+)$/);
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
            (refHolder.getExtent(false, false).x + 1.1),
          0,
          0,
        );
        if (discardFaceDown()) button.rotation = new Rotator(0, 180, 0);
        button.scale = 0.2;
        button.widget = render(
          <button
            size={48}
            font="NeueKabelW01-Book.ttf"
            fontPackage={refPackageId}
            onClick={discardOrEndChapter}
          >
            Discard
          </button>,
        );
        refHolder.addUI(button);
      } else {
        // Update button text
        (refHolder.getUIs()[0].widget as Button).setText("Discard");
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
function discard(button: Button, player?: Player) {
  const zone = getActionZone();
  if (!zone) return;
  for (const obj of zone.getOverlappingObjects()) {
    if (
      obj instanceof Card &&
      obj.getCardDetails().tags.includes("action") &&
      !coveredByCourt(obj)
    ) {
      refHolder.insert(obj, 0);
      if (obj.isFaceUp() && discardFaceDown()) refHolder.flipCard(obj);
      sortCard(refHolder, obj, player, 0);
    }
    if ("discard" in obj && typeof obj.discard === "function") obj.discard();
  }
  button.setText("End Chapter");
  setTimeout(() => {
    (world.getObjectById("map") as MapBoard)!.turns.startRound();
  }, 100);
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
    // Put it in order
    const index = card.getCardDetails().index;
    const cards = holder.getCards();
    for (let i = 0; i < cards.length; i++)
      if (
        cards[i].getCardDetails().index > index ||
        !holder.isCardFaceUp(cards[i])
      )
        return holder.moveCard(card, i - (i > inserted ? 1 : 0));
    // Belongs at the end
    holder.moveCard(card, holder.getNumCards());
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ext = Object.assign(refHolder, {
  discardOrEndChapter: (player?: Player) => {
    const button = refHolder.getUIs()[0]?.widget;
    if (button && button instanceof Button) discardOrEndChapter(button, player);
  },
});
refHolder.setId("discard-holder");
export type DiscardHolder = typeof ext;
