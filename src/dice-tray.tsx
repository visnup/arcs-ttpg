import type { GameObject } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  Dice,
  globalEvents,
  ScreenUIElement,
  TextJustification,
  Vector,
  VerticalAlignment,
  world,
} from "@tabletop-playground/api";
import { boxChild, jsxInTTPG, render } from "jsx-in-ttpg";

const refObject = _refObject;
const refPackageId = _refPackageId;

// Dice summary UI element
const diceSummary = new ScreenUIElement();
diceSummary.relativePositionX = diceSummary.relativePositionY = false;
diceSummary.positionX = 50;
diceSummary.positionY = 10;
diceSummary.width = 210;

// Zone
const zoneId = `zone-dice-${refObject.getId()}`;
const zone = world.getZoneById(zoneId) ?? world.createZone([0, 0, 0]);
zone.setId(zoneId);
zone.setPosition(refObject.getPosition());
zone.setRotation(refObject.getRotation());
zone.setScale(refObject.getSize().add(new Vector(0, 0, 3)));
zone.onBeginOverlap.add((zone, obj) => {
  if (obj instanceof Dice) {
    obj.onPrimaryAction.add(onRoll);
    obj.onMovementStopped.add(sumDice);
  }
  sumDice();
});
zone.onEndOverlap.add((zone, obj) => {
  if (obj instanceof Dice) {
    obj.onPrimaryAction.remove(onRoll);
    obj.onMovementStopped.remove(sumDice);
  }
  sumDice();
});
refObject.onDestroyed.add(() => zone.destroy());
sumDice();

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
}

globalEvents.onDiceRolled.add(() => {
  // Bring down walls
  walls?.destroy();
  walls = undefined;
});

function sumDice() {
  // Total roll
  const dice = zone.getOverlappingObjects().filter((d) => d instanceof Dice);
  const total: Record<string, number> = {};
  for (const d of dice)
    for (const f of d.getCurrentFaceMetadata().split(" "))
      if (f) total[f] = (total[f] ?? 0) + 1;
  const rows = [
    ["self", "Hit Your Ships", 27],
    ["intercept", "Intercept\nYour Ships", 49],
    [
      "hit",
      "Hit Ships First\n[size=10]then buildings if\nno ships remain[/size]",
      57,
    ],
    ["building", "Hit Buildings", 27],
    ["key", "Raid Cards\n& Resources", 49],
  ] as const;
  diceSummary.widget = render(
    !Object.keys(total).length && dice.length ? (
      <text>All Faces Blank</text>
    ) : (
      <verticalbox gap={10}>
        {rows.map(
          ([key, label]) =>
            total[key] && (
              <horizontalbox gap={20} valign={VerticalAlignment.Center}>
                {boxChild(
                  0,
                  <image
                    src={`dice/${key}.png`}
                    srcPackage={refPackageId}
                    width={20}
                  />,
                )}
                {boxChild(
                  3,
                  <richtext
                    size={14}
                    font="NeueKabelW01-Book.ttf"
                    fontPackage={refPackageId}
                  >
                    {label}
                  </richtext>,
                )}
                {boxChild(
                  1,
                  <text
                    size={16}
                    font="NeueKabelW01-Book.ttf"
                    fontPackage={refPackageId}
                    justify={TextJustification.Center}
                  >
                    {total[key]}
                  </text>,
                )}
              </horizontalbox>
            ),
        )}
        <button
          onClick={discard}
          size={10}
          font="NeueKabelW01-Book.ttf"
          fontPackage={refPackageId}
          hidden={!Object.keys(total).length}
        >
          Clear
        </button>
      </verticalbox>
    ),
  );
  world.removeScreenUI(0);
  if (dice.length) {
    const height = rows
      .filter(([key]) => key in total)
      .reduce((sum, [, , height]) => sum + height + 10, 0);
    diceSummary.height = height + 23;
    world.addScreenUI(diceSummary);
  }
}

function discard() {
  for (const o of zone.getOverlappingObjects())
    if ("discard" in o && typeof o.discard === "function") o.discard();
}
