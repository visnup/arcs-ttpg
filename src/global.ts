import { globalEvents, world } from "@tabletop-playground/api";

globalEvents.onDiceRolled.add((player, dice) => {
  const total: Record<string, number> = {};
  for (const d of dice)
    for (const f of d.getCurrentFaceMetadata().split(" "))
      if (f) total[f] = (total[f] ?? 0) + 1;
  player.showMessage(`You rolled ${JSON.stringify(total)}`);
});

// Set owning player slots by matching color
const colors = Object.fromEntries(
  [0, 1, 2, 3].map((i) => [world.getSlotColor(i).toHex(), i]),
);
for (const obj of world.getAllObjects())
  if (obj.getOwningPlayerSlot() === -1) {
    const c = obj.getPrimaryColor().toHex();
    if (c in colors) obj.setOwningPlayerSlot(colors[c]);
  }
