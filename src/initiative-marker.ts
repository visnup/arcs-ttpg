import {
  GameObject,
  Player,
  refObject,
  Rotator,
  Vector,
  world,
} from "@tabletop-playground/api";

const seize = (obj: GameObject, player: Player | number) =>
  moveToPlayer(obj, player, new Rotator(-90, 0, 0));
const take = (obj: GameObject, player: Player | number) =>
  moveToPlayer(obj, player);

function moveToPlayer(
  obj: GameObject,
  player: Player | number,
  rotation = new Rotator(0, 0, 0),
) {
  const board =
    player instanceof Player
      ? player.getOwnedObjects().find((d) => d.getTemplateName() === "board")
      : world
          .getAllObjects()
          .find(
            (d) =>
              d.getTemplateName() === "board" &&
              d.getPrimaryColor().toHex() ===
                world.getSlotColor(player).toHex(),
          );
  if (!board) return;
  const p = board.getPosition();
  const { x, y } = board.getSize();
  const pos = p.add(new Vector((-Math.sign(p.x) * (x + 8)) / 2, -y / 2 - 2, 1));
  obj.setRotation(rotation);
  obj.setPosition(pos);
  obj.snapToGround();
}

function stand(obj: GameObject) {
  obj.setRotation(new Rotator(0, 0, 0));
  obj.snapToGround();
}

refObject.addCustomAction("Take initiative");
refObject.addCustomAction("Seize initiative");
refObject.onCustomAction.add((obj, player, action) => {
  switch (action) {
    case "Take initiative":
      return take(obj, player);
    case "Seize initiative":
      return seize(obj, player);
  }
});
refObject.onPrimaryAction.add(take);
refObject.onSecondaryAction.add(seize);

const ext = Object.assign(refObject, {
  seize: function (player: Player | number) {
    seize(this as typeof ext, player);
  },
  take: function (player: Player | number) {
    take(this as typeof ext, player);
  },
  stand: function () {
    stand(this as typeof ext);
  },
  isSeized: function () {
    return Math.abs((this as typeof ext).getRotation().pitch) > 10;
  },
});
refObject.setId("initiative");
export type InitiativeMarker = typeof ext;
