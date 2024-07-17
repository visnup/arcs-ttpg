import type { Card, Player } from "@tabletop-playground/api";
import { refCard } from "@tabletop-playground/api";

refCard.addCustomAction("Draw from bottom");
refCard.onCustomAction.add(drawBottom);

function drawBottom(obj: Card, player: Player, identifier: string) {
  obj.moveCardInStack(0, obj.getStackSize() - 1);
  obj.deal(1, [player.getSlot()]);
}
