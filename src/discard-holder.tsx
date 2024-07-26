import {
  Card,
  CardHolder,
  Player,
  refHolder as _refHolder,
  refPackageId as _refPackageId,
  UIElement,
  Rotator,
  Vector,
  world,
  Button,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
const refHolder = _refHolder;
const refPackageId = _refPackageId;

refHolder.onCardFlipped.add(sortCard);
refHolder.onInserted.add(sortCard);

const label = new UIElement();
label.scale = 0.2;
label.widget = render(
  <text size={24} font="FMBolyarPro-700.ttf">
    Face Up Action Discard
  </text>,
);
refHolder.addUI(label);

process.nextTick(() => {
  const zone = getActionZone();
  if (!zone) return;
  zone.onBeginOverlap.add((zone, obj) => {
    if (obj instanceof Card && obj.getTemplateName() === "action") {
      // discard button
      if (refHolder.getUIs().length === 1) {
        const button = new UIElement();
        button.position = new Vector(-refHolder.getSize().x / 2 - 0.5, 0, 0);
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
        (refHolder.getUIs()[1].widget as Button).setText("Discard");
      }
    }
  });
});

function discardOrEndRound(button: Button, player: Player) {
  if (getActionZone()?.getOverlappingObjects().length) discard(button, player);
  else endRound(button, player);
}

function discard(button: Button, player: Player) {
  const zone = getActionZone();
  if (!zone) return;
  for (const obj of zone.getOverlappingObjects()) {
    if (
      obj instanceof Card &&
      ["action", "dc"].includes(obj.getTemplateName())
    ) {
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
    discard = refHolder.removeAt(0)!;
    discard.setPosition(snap.getGlobalPosition());
    discard.snap();
  }
  if (discard instanceof Card) {
    for (const card of refHolder.getCards()) discard.addCards(card);
    discard.shuffle();
  }
  refHolder.removeUI(1);
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
    // move to end
    holder.moveCard(card, holder.getNumCards());
  } else {
    // put it in order
    const index = card.getCardDetails().index;
    const cards = holder.getCards();
    for (let i = 0; i < cards.length; i++)
      if (
        cards[i].getCardDetails().index > index ||
        !holder.isCardFaceUp(cards[i])
      )
        return holder.moveCard(card, i - (i > inserted ? 1 : 0));
    // belongs at the end
    holder.moveCard(card, holder.getNumCards());
  }
}
