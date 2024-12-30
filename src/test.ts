import { refObject, world } from "@tabletop-playground/api";
import { runSuite } from "./tests/suite";

const saved = world
  .getAllObjects()
  .filter((obj) => obj !== refObject)
  .concat([refObject])
  .map((obj) => [obj.toJSONString(), obj.getPosition()] as const);
const keys = new Set(Object.keys(world));

function reset() {
  for (const zone of world.getAllZones())
    if (zone.getId().startsWith("zone-")) zone.destroy();
  for (const obj of world.getAllObjects()) obj.destroy();
  // @ts-expect-error delete
  for (const key of Object.keys(world)) if (!keys.has(key)) delete world[key];
  for (const [json, p] of saved) world.createObjectFromJSON(json, p)!;
}

for (const p of world.getAllowedPackages())
  for (const script of p.getScriptFiles().sort())
    if (script.match(/^tests\/.*\.test\.js$/)) import(`./${script}`);

refObject.onPrimaryAction.add(() => {
  runSuite(reset);
});
