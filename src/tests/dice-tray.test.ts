import { world } from "@tabletop-playground/api";
import type {
  Dice,
  HorizontalBox,
  RichText,
  Text,
  VerticalBox,
} from "@tabletop-playground/api";
import { assertEqual } from "./assert";
import { describe, test } from "./suite";

async function getSummary(dice: Dice[], faces: number[]) {
  for (const [i, d] of dice.entries()) d.setCurrentFace(faces[i]);
  dice[0].setPosition(dice[0].getPosition().add([0, 0, 1]));
  await new Promise((resolve) => {
    dice[0].onMovementStopped.add(function onMovementStopped() {
      dice[0].onMovementStopped.remove(onMovementStopped);
      resolve(dice[0]);
    });
  });
  const summary = world.getScreenUIs()[0].widget as VerticalBox;
  return summary.getAllChildren().map((b) => {
    const [, description, count] = (b as HorizontalBox).getAllChildren();
    return [
      (description as RichText).getText().replace(/\n.*/s, ""),
      +(count as Text).getText(),
    ];
  });
}

describe("dice tray", () => {
  test("sums dice", async () => {
    const dice = ["assault", "skirmish", "raid"].flatMap((type) =>
      world.getObjectsByTemplateName<Dice>(type).slice(0, 2),
    );
    const tray = world.getObjectByTemplateName("tray")!.getPosition();
    for (const [i, d] of dice.entries())
      d.setPosition(
        tray.add([
          3 * Math.cos((i * Math.PI) / 3),
          3 * Math.sin((i * Math.PI) / 3),
          1,
        ]),
      );
    assertEqual(
      JSON.stringify(await getSummary(dice, [0, 1, 2, 3, 4, 5])),
      JSON.stringify([
        ["Hit Your Ships", 1],
        ["Intercept", 2],
        ["Hit Ships First", 4],
        ["Hit Buildings", 1],
        ["Raid Cards", 1],
      ]),
      "configuration 1",
    );
    assertEqual(
      JSON.stringify(await getSummary(dice, [5, 4, 3, 2, 1, 0])),
      JSON.stringify([
        ["Hit Your Ships", 1],
        ["Intercept", 1],
        ["Hit Ships First", 3],
        ["Raid Cards", 3],
      ]),
      "configuration 2",
    );
    assertEqual(
      JSON.stringify(await getSummary(dice, [3, 3, 3, 3, 3, 3])),
      JSON.stringify([
        ["Hit Your Ships", 4],
        ["Hit Ships First", 2],
        ["Hit Buildings", 2],
      ]),
      "configuration 3",
    );
    assertEqual(
      JSON.stringify(await getSummary(dice, [0, 0, 0, 0, 0, 0])),
      JSON.stringify([
        ["Intercept", 4],
        ["Hit Ships First", 4],
        ["Raid Cards", 4],
      ]),
      "configuration 4",
    );
  });
});
