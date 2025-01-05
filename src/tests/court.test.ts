import type {
  Canvas,
  LayoutBox,
  Text,
  VerticalBox,
  Widget,
} from "@tabletop-playground/api";
import { SnapPointRotationType, world } from "@tabletop-playground/api";
import { placeAgents } from "../lib/setup";
import { assertEqual } from "./assert";
import { describe, test } from "./suite";

function getTally(widget?: Widget) {
  if (!widget) return undefined;
  return +(
    (
      ((widget as LayoutBox).getChild() as Canvas).getChildren()[1] as LayoutBox
    ).getChild() as Text
  ).getText();
}

describe("court", () => {
  test("counts agents", async () => {
    const court = world.getObjectByTemplateName("court")!;
    const zones = world
      .getAllZones()
      .filter((z) => z.getId().startsWith(`zone-court-${court.getId()}-`))
      .sort((a, b) => b.getPosition().x - a.getPosition().x);
    placeAgents(0, 10, zones[0].getPosition().add([0, 0, 0]));
    placeAgents(1, 3, zones[1].getPosition().add([0, 0, 0]));
    placeAgents(2, 2, zones[1].getPosition().add([0, -2, 0]));
    placeAgents(3, 1, zones[1].getPosition().add([0, -4, 0]));

    const boxes = court.getUIs().map((d) => d.widget as VerticalBox);
    assertEqual(
      boxes.slice(0, 4).map((b) => b.getAllChildren().length),
      [1, 3, 0, 0],
      "agent counts",
    );
    assertEqual(getTally(boxes[0].getChildAt(0)), 10, "zone 0");
    assertEqual(getTally(boxes[1].getChildAt(0)), 3, "zone 1");
    assertEqual(getTally(boxes[1].getChildAt(1)), 2, "zone 1");
    assertEqual(getTally(boxes[1].getChildAt(2)), 1, "zone 1");
  });

  test("flips cards over", () => {
    const court = world.getObjectByTemplateName("court")!;
    const rotation = court
      .getAllSnapPoints()
      .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y)
      .map((s) => s.getSnapRotationType());
    assertEqual(rotation.length, 6, "snap count");
    for (const [i, r] of [
      SnapPointRotationType.RotateNoFlip,
      SnapPointRotationType.RotateUpsideDown,
      SnapPointRotationType.RotateUpsideDown,
      SnapPointRotationType.RotateUpsideDown,
      SnapPointRotationType.RotateUpsideDown,
      SnapPointRotationType.RotateUpright,
    ].entries())
      assertEqual(rotation[i], r, `snap ${i}`);
  });
});
