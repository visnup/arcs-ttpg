import { globalEvents, world, type GameObject } from "@tabletop-playground/api";

export function createReset(refObject?: GameObject) {
  const saved = world
    .getAllObjects()
    .filter((obj) => obj !== refObject)
    .map((obj) => [obj.toJSONString(), obj.getPosition()] as const);
  // console.log("saved", JSON.stringify(saved));

  return function reset() {
    clearAllIntervals();
    for (const delegate of Object.values<{ clear?: () => void }>(
      globalEvents.constructor.prototype,
    ))
      if (delegate && typeof delegate.clear === "function") delegate.clear();
    for (const obj of world.getAllObjects())
      if (obj !== refObject) obj.destroy();
    world.setSavedData("", "_followedSetup");
    world.setSavedData("", "_initialSetup");
    for (const [json, p] of saved) world.createObjectFromJSON(json, p)!;
  };
}
