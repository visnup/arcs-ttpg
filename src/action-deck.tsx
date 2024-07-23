import {
  Button,
  Player,
  refCard,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import type { InitiativeMarker } from "./initiative-marker";
import { jsxInTTPG, render } from "jsx-in-ttpg";

function getInitiative() {
  return world.getObjectById("initiative") as InitiativeMarker;
}

refCard.addCustomAction("Draw from bottom");

refCard.onCustomAction.add((card, player, identifier) => {
  switch (identifier) {
    case "Draw from bottom":
      card.moveCardInStack(0, card.getStackSize() - 1);
      card.deal(1, [player.getSlot()]);
      break;
  }
});

refCard.onPrimaryAction.add((card) => {
  if (card.getUIs().length) return;
  const ui = new UIElement();
  ui.position = new Vector(-card.getExtent(false, false).x - 1.5, 0, 0);
  ui.scale = 0.2;
  ui.widget = render(
    <button
      size={48}
      onClick={() => {
        card.deal(6);
        getInitiative()?.stand();
        card.removeUI(index);
      }}
    >
      Deal
    </button>,
  );
  const index = card.addUI(ui);
});

refCard.onReleased.add((card, player) => {
  if (card.getUIs().length) return;
  if (
    Math.abs(card.getRotation().yaw) > 10 && // face down
    String(
      world
        .boxTrace(
          card.getPosition(),
          card.getPosition().add(new Vector(0, 0, -10)),
          card.getExtent(true, true),
        )
        .filter(({ object }) => object !== card)
        .map(({ object }) => object.getTemplateName()),
    ) === "action,map" && // on second card, on map
    !getInitiative()?.isSeized()
  ) {
    const ui = new UIElement();
    ui.position = new Vector(-card.getExtent(false, false).x - 1.5, 0, 0);
    ui.scale = 0.2;
    ui.widget = render(
      <button
        size={48}
        onClick={() => {
          getInitiative()?.seize(player);
          card.removeUI(index);
        }}
      >
        Seize
      </button>,
    );
    const index = card.addUI(ui);
  }
});

refCard.onGrab.add((card) => {
  while (card.getUIs().length) card.removeUI(0);
});
