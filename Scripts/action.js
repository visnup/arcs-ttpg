const { refCard } = require("@tabletop-playground/api");

refCard.addCustomAction("Draw from bottom");
refCard.onCustomAction.add(drawBottom);

function drawBottom(obj, player, identifier) {
  obj.moveCardInStack(0, obj.getStackSize() - 1);
  obj.deal(1, player.getSlot());
}
