import type { MultistateObject } from "@tabletop-playground/api";
import {
  refCard,
  refPackageId,
  UIElement,
  world,
  type Card,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { removeCampaign } from "./lib/setup";

let button: number | undefined;

refCard.onPrimaryAction.add((card, player) => {
  if (card.getStackSize() > 1) prepareLeaders();
  else takeLeader(player.getSlot(), card);
});
refCard.onRemoved.add(showTake);
refCard.onInserted.add(hideTake);
showTake(refCard);

function showTake(card: Card) {
  if (
    card.getStackSize() > 1 ||
    card.getSnappedToPoint() ||
    world.getSavedData("_followedSetup")
  )
    return;

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
            const card = button.getOwningObject();
            if (card) takeLeader(player.getSlot(), card as Card);
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

function prepareLeaders() {
  world.getObjectByTemplateName<MultistateObject>("base-rules")?.setState(20);
  removeCampaign();
}

function takeLeader(slot: number, card: Card) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot);
  const snap = board
    ?.getAllSnapPoints()
    .find((s) => s.getTags().includes("leader"));
  if (!board || !snap || snap.getSnappedObject()) return;
  hideTake(card);
  card.setPosition(snap.getGlobalPosition().add([0, 0, 1]), 1.5);
  card.snap();
}
