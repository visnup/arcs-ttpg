import {
  refPackageId as _refPackageId,
  refCard,
  UIElement,
  world,
  type Card,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { takeCard } from "./lib/setup";

const refPackageId = _refPackageId;
let button: number | undefined;

refCard.onPrimaryAction.add((card, player) => {
  if (card.getStackSize() === 1) {
    hideTake(card);
    takeCard(player.getSlot(), card);
  }
});
refCard.onRemoved.add(showTake);
refCard.onInserted.add(hideTake);
showTake(refCard);

function showTake(card: Card) {
  if (card.getStackSize() > 1 || world.getSavedData("_followedSetup")) return;

  button = card.addUI(
    Object.assign(new UIElement(), {
      position: [-card.getExtent(false, false).x - 1, 0, 0],
      rotation: [180, 180, 0],
      scale: 0.15,
      widget: render(
        <button
          size={48}
          font="NeueKabelW01-Book.ttf"
          fontPackage={refPackageId}
          onClick={(button, player) => {
            const card = button.getOwningObject() as Card | undefined;
            if (card) {
              hideTake(card);
              takeCard(player.getSlot(), card);
            }
          }}
        >
          {" Take "}
        </button>,
      ),
    }),
  );
}
function hideTake(card: Card) {
  if (button !== undefined) card.removeUI(button);
}
