import type { GameObject } from "@tabletop-playground/api";
import {
  globalEvents,
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
          .getObjectsByTemplateName("board")
          .find((d) => d.getOwningPlayerSlot() === player);
  if (!board) return;
  const p = board.getPosition();
  const { x, y } = board.getSize();
  const pos = p.add(
    new Vector(
      (-Math.sign(p.x) * (x + 8)) / 2,
      -y / 2,
      obj.getSize().z / 2 + 0.1,
    ),
  );
  obj.setRotation(rotation);
  obj.setPosition(pos);
  obj.snapToGround();

  globalEvents.onInitiativeMoved.trigger();
}

function stand(obj: GameObject) {
  const { z } = obj.getSize();
  obj.setPosition(obj.getPosition().add(new Vector(0, 0, z / 2 + 0.1)));
  obj.setRotation(new Rotator(0, 0, 0));
  obj.snapToGround();
}

refObject.addCustomAction("Take Initiative");
refObject.addCustomAction("Seize Initiative");
refObject.onCustomAction.add((obj, player, action) => {
  switch (action) {
    case "Take Initiative":
      return take(obj, player);
    case "Seize Initiative":
      return seize(obj, player);
  }
});
refObject.onPrimaryAction.add(take);
refObject.onSecondaryAction.add(seize);
refObject.onReleased.add(globalEvents.onInitiativeMoved.trigger);

const ext = Object.assign(refObject, {
  seize: function (player: Player | number) {
    seize(this as typeof ext, player);
  },
  take: function (player: Player | number) {
    take(this as typeof ext, player);
  },
  isSeized: function () {
    return Math.abs((this as typeof ext).getRotation().pitch) > 10;
  },
});
refObject.setId("initiative");
export type InitiativeMarker = typeof ext;

globalEvents.onRoundEnded.add(() => stand(ext));
