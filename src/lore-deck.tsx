import {
  refCard,
  refPackageId,
  UIElement,
  world,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { takeCard } from "./lib/setup";

if (refCard.getStackSize() === 1 && !world.getSavedData("_followedSetup")) {
  refCard.onPrimaryAction.add((card, player) => {
    card.removeUI(0);
    takeCard(player.getSlot(), card);
  });
  refCard.addUI(
    Object.assign(new UIElement(), {
      position: [-refCard.getExtent(false, false).x - 1, 0, 0],
      rotation: [180, 180, 0],
      scale: 0.15,
      widget: render(
        <button
          size={48}
          font="NeueKabelW01-Book.ttf"
          fontPackage={refPackageId}
          onClick={(button, player) => {
            const card = button.getOwningObject() as typeof refCard;
            card.removeUI(0);
            takeCard(player.getSlot(), card);
          }}
        >
          {" Take "}
        </button>,
      ),
    }),
  );
}
