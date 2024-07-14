const { globalEvents } = require("@tabletop-playground/api");

globalEvents.onDiceRolled.add(function (player, dice) {
  const total = {};
  for (const d of dice)
    for (const f of d.getCurrentFaceMetadata().split(" "))
      if (f) total[f] = (total[f] || 0) + 1;
  player.showMessage(`You rolled ${JSON.stringify(total)}`);
});

// Update ambitions on grab
world.updateAmbitionsBelow = function (obj) {
  for (const { object: below } of world.lineTrace(
    obj.getPosition(),
    obj.getPosition().add(new Vector(0, 0, -20)),
  ))
    if (below.getTemplateName() === "player") return below.updateAmbitions();
};
