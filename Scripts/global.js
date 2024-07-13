const { globalEvents } = require("@tabletop-playground/api");

globalEvents.onDiceRolled.add(function (player, dice) {
  const total = {};
  for (const d of dice)
    for (const f of d.getCurrentFaceMetadata().split(" "))
      if (f) total[f] = (total[f] || 0) + 1;
  player.showMessage(`You rolled ${JSON.stringify(total)}`);
});
