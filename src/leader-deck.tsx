import type { MultistateObject } from "@tabletop-playground/api";
import {
  refCard,
  refPackageId,
  UIElement,
  world,
  type Button,
  type Player,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { removeCampaign } from "./lib/setup";

if (refCard.getStackSize() > 1)
  refCard.onPrimaryAction.add(() => {
    world.getObjectByTemplateName<MultistateObject>("base-rules")?.setState(20);
    removeCampaign();
  });
else if (!("_followedSetup" in world)) {
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
          onClick={takeLeader}
        >
          {" Take "}
        </button>,
      ),
    }),
  );
}

function takeLeader(button: Button, player: Player) {
  const card = button.getOwningObject();
  if (!card) return;
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === player.getSlot());
  const snap = board
    ?.getAllSnapPoints()
    .find((s) => s.getTags().includes("leader"));
  if (!board || !snap || snap.getSnappedObject()) return;
  card.setPosition(snap.getGlobalPosition().add([0, 0, 1]), 1.5);
  card.snap();
  card.removeUI(0);
}
