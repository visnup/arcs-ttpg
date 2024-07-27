import {
  Card,
  CardHolder,
  Player,
  refHolder as _refHolder,
  refPackageId as _refPackageId,
  UIElement,
  Vector,
  world,
  Button,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
const refHolder = _refHolder;
const refPackageId = _refPackageId;

refHolder.onCardFlipped.add(sortCard);
refHolder.onInserted.add(sortCard);

// Ensure zone has been created
process.nextTick(() => {
  const zone = getActionZone();
  if (!zone) return;
  // Show discard button when action card is played
  zone.onBeginOverlap.add((zone, obj) => {
    if (obj instanceof Card && obj.getTemplateName() === "action") {
      if (!refHolder.getUIs().length) {
        // Create button
        const button = new UIElement();
        button.position = new Vector(
          -refHolder.getExtent(false, false).x - 1.1,
          0,
          0,
        );
        button.scale = 0.2;
        button.widget = render(
          <button
            size={48}
            font="NeueKabelW01-Book.ttf"
            fontPackage={refPackageId}
            onClick={discardOrEndRound}
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
  });
});

function discardOrEndRound(button: Button, player: Player) {
  if (getActionZone()?.getOverlappingObjects().length) discard(button, player);
  else endRound(button, player);
}

// Put all cards in the action zone into the discard pile, self-discard anything that supports it
function discard(button: Button, player: Player) {
  const zone = getActionZone();
  if (!zone) return;
  for (const obj of zone.getOverlappingObjects()) {
    if (
      obj instanceof Card &&
      ["action", "dc"].includes(obj.getTemplateName())
    ) {
      // todo: rotate if face down
      refHolder.insert(obj, 0);
      sortCard(refHolder, obj, player, 0);
    }
    if ("discard" in obj && typeof obj.discard === "function") obj.discard();
  }
  button.setText("End Round");
}

function endRound(button: Button, player: Player) {
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
    for (const c of world.getAllObjects())
      if (c.getTemplateName() === "action") discard.addCards(c as Card);
    discard.shuffle();
    // Hack: need to manually call after we shuffle to show Deal button
    if ("showDeal" in discard && typeof discard.showDeal === "function")
      discard.showDeal();
  }
  refHolder.removeUI(0);
}

function getActionZone() {
  return world.getAllZones().find((z) => z.getId().startsWith("zone-action-"));
}

function sortCard(
  holder: CardHolder,
  card: Card,
  player: Player,
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
