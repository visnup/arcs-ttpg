import {
  refObject as _refObject,
  Dice,
  GameObject,
  globalEvents,
  ScreenUIElement,
  Vector,
  world,
} from "@tabletop-playground/api";
import { boxChild, render, jsxInTTPG } from "jsx-in-ttpg";
const refObject = _refObject;

// Dice summary UI element
let diceSummary = new ScreenUIElement();
diceSummary.relativePositionX = diceSummary.relativePositionY = false;
diceSummary.positionX = 50;
diceSummary.positionY = 10;
diceSummary.width = 220;
diceSummary.height = 200;

// Zone
const zoneId = `zone-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ?? world.createZone(refObject.getPosition());
zone.setId(zoneId);
zone.setRotation(refObject.getRotation());
zone.setScale(refObject.getSize().add(new Vector(0, 0, 20)));
zone.onBeginOverlap.add((_zone, obj) => {
  if (obj instanceof Dice) obj.onPrimaryAction.add(onRoll);
});
zone.onEndOverlap.add((_zone, obj) => {
  if (obj instanceof Dice) obj.onPrimaryAction.remove(onRoll);
  world.removeScreenUIElement(diceSummary);
});

// Put up guard walls when dice are rolled
let walls: GameObject | undefined;
function onRoll() {
  if (!walls) {
    walls = world.createObjectFromTemplate(
      "5DC351479A4DF3A83EAD41A21E9F33B8",
      refObject.getPosition().add(new Vector(0, 0, refObject.getSize().z)),
    );
    walls!.toggleLock();
  }
  world.removeScreenUIElement(diceSummary);
}

globalEvents.onDiceRolled.add((player, dice) => {
  // Bring down walls
  walls?.destroy();
  walls = undefined;

  // Total roll
  const total: Record<string, number> = {};
  for (const d of zone.getOverlappingObjects())
    if (d instanceof Dice)
      for (const f of d.getCurrentFaceMetadata().split(" "))
        if (f) total[f] = (total[f] ?? 0) + 1;
  const rows = [
    ["self", "Hit Your Ships"],
    ["intercept", "Intercept Your Ships"],
    ["hit", "Hit Ships First"],
    ["building", "Hit Buildings"],
    ["key", "Raid Cards and Resources"],
  ];
  diceSummary.widget = render(
    <verticalbox>
      {
        rows.map(
          ([key, label]) =>
            total[key] && (
              <horizontalbox>
                {boxChild(1, <text>{label}</text>)}
                {boxChild(0, <text>{total[key]}</text>}
              </horizontalbox>
            ),
        )}
    </verticalbox>,
  );
  world.addScreenUI(diceSummary);
});
