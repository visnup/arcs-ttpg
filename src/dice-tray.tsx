import { TextJustification } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  Dice,
  GameObject,
  globalEvents,
  ScreenUIElement,
  Vector,
  VerticalAlignment,
  world,
} from "@tabletop-playground/api";
import { boxChild, render, jsxInTTPG } from "jsx-in-ttpg";
const refObject = _refObject;
const refPackageId = _refPackageId;

// Dice summary UI element
let diceSummary = new ScreenUIElement();
diceSummary.relativePositionX = diceSummary.relativePositionY = false;
diceSummary.positionX = 50;
diceSummary.positionY = 10;
diceSummary.width = 210;
diceSummary.height = 300;

// Zone
const zoneId = `zone-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ?? world.createZone(refObject.getPosition());
zone.setId(zoneId);
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

globalEvents.onDiceRolled.add((player, dice) => {
  // Bring down walls
  walls?.destroy();
  walls = undefined;
});

function sumDice() {
  // Total roll
  const total: Record<string, number> = {};
  for (const d of zone.getOverlappingObjects())
    if (d instanceof Dice)
      for (const f of d.getCurrentFaceMetadata().split(" "))
        if (f) total[f] = (total[f] ?? 0) + 1;
  const rows = [
    ["self", "Hit Your Ships"],
    ["intercept", "Intercept\nYour Ships"],
    [
      "hit",
      "Hit Ships First\n[size=10]then buildings if\nno ships remain[/size]",
    ],
    ["building", "Hit Buildings"],
    ["key", "Raid Cards\n& Resources"],
  ];
  diceSummary.widget = render(
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
    </verticalbox>,
  );
  world.removeScreenUI(0);
  world.addScreenUI(diceSummary);
}
