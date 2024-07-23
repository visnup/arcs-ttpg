import {
  GameObject,
  Player,
  refObject,
  Rotator,
  Vector,
} from "@tabletop-playground/api";

const seize = (obj: GameObject, player: Player) =>
  moveToPlayer(obj, player, new Rotator(-90, 0, 0));
const take = (obj: GameObject, player: Player) => moveToPlayer(obj, player);

function moveToPlayer(
  obj: GameObject,
  player: Player,
  rotation = new Rotator(0, 0, 0),
) {
  const board = player
    .getOwnedObjects()
    .find((d) => d.getTemplateName() === "board");
  if (!board) return;
  const { x, y } = board.getSize();
  const pos = board.getPosition().add(new Vector(x / 2 + 4, -y / 2 - 2, 1));
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
  seize: function (player: Player) {
    seize(this as typeof ext, player);
  },
  take: function (player: Player) {
    take(this as typeof ext, player);
  },
  stand: function () {
    stand(this as typeof ext);
  },
});
refObject.setId("initiative");
export type InitiativeMarker = typeof ext;
