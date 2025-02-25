import type { Card, Color } from "@tabletop-playground/api";
import { globalEvents, ObjectType, world } from "@tabletop-playground/api";
import type { InitiativeMarker } from "../initiative-marker";
import { gainResource, getSystems, placeShips } from "../lib/setup";
import type { TestableCard } from "../setup-deck";
import { assert, assertEqual } from "./assert";
import { describe, skip, test } from "./suite";

describe("map board", () => {
  test("penetrable", async () => {
    const systems = getSystems();
    const ships = [0, 1, 2, 3, 4].flatMap((slot) =>
      placeShips(slot, 1, systems[0].snap.getGlobalPosition()),
    );
    const flagships = world.getObjectsByTemplateName("flagship");
    assertEqual(ships.length, flagships.length ? 5 : 4, "placed ships");
    for (const s of flagships) {
      s.setPosition(systems[0].snap.getGlobalPosition());
      ships.push(s);
    }
    assert(
      ships.every((s) => s.getObjectType() === ObjectType.Penetrable),
      "type = penetrable",
    );
    const board = world.getObjectByTemplateName("board")!;
    for (const s of ships) s.setPosition(board.getPosition().add([0, 0, 2]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert(
      ships.every((s) => s.getObjectType() === ObjectType.Regular),
      "type = regular",
    );
  });

  test("scoring", async () => {
    // first place
    gainResource(0, "fuel");
    globalEvents.onAmbitionDeclared.trigger("tycoon");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [5], "first place");

    // tie for first -> second place points
    gainResource(1, "material");
    gainResource(2, "material");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [3, 3, 3], "tie for first -> second place points");

    // tie for second -> no points
    gainResource(0, "fuel");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [5], "tie for second -> no points");

    // multiple markers
    gainResource(3, "relic");
    globalEvents.onAmbitionDeclared.trigger("keeper");
    globalEvents.onAmbitionDeclared.trigger("keeper");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [5, , , 5], "multiple markers");

    // flipped markers
    for (const m of world.getObjectsByTemplateName("ambition"))
      m.setRotation([0, -90, -180]);
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [9, , , 10], "flipped markers");

    // bonuses
    revealCity(0, "bonus:2");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [9 + 2, , , 10], "bonus +2");
    revealCity(0, "bonus:3");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [9 + 2 + 3, , , 10], "bonus +3");
    gainResource(1, "fuel");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [4, 4, , 10], "bonuses only for first");
    // bonus once per ambition, not marker
    revealCity(3, "bonus:2");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [4, 4, , 12], "bonuses once per ambition");

    // current position
    const map = world.getObjectById("map")!;
    const track = map
      .getAllSnapPoints()
      .filter((d) => d.getTags().includes("power"))
      .map((p) => p.getGlobalPosition())
      .sort((a, b) => a.y - b.y);
    for (const p of world.getObjectsByTemplateName("power"))
      if (world.isOnMap(p)) {
        p.setPosition(track[slot(p.getPrimaryColor())].add([0, 0, 1]));
        p.snap();
      }
    globalEvents.onChapterEnded.trigger();
    assertEqual(
      getScores(),
      [4 + 1, 4 + 2, , 12 + 4],
      "delta from current position",
    );
  });

  test("2p scoring", async () => {
    // run 2p setup
    const setupDeck = world
      .getObjectsByTemplateName<Card>("setup")
      .sort((a, b) => a.getPosition().x - b.getPosition().x)[0] as
      | TestableCard
      | undefined;
    if (!setupDeck) skip("no setup deck");
    const setup = setupDeck.takeCards()! as TestableCard;
    setup.setPosition(setupDeck.getPosition().add([10, 0, 0]));
    setupDeck.onRemoved.trigger(setup);
    // reset initiative
    const initiative = world.getObjectById("initiative") as InitiativeMarker;
    initiative.take(0);
    setup.onPrimaryAction.trigger(setup);

    // second place vs. blocked
    globalEvents.onAmbitionDeclared.trigger("tycoon");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [null, 3], "second place");

    // tie for first -> second place points
    globalEvents.onAmbitionDeclared.trigger("keeper");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [2, 3], "tie for first -> second place points");

    // blocked winning tyrant
    globalEvents.onAmbitionDeclared.trigger("warlord");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [2, 3], "blocked winning tyrant");
  });
});

const slot = (color: Color) =>
  [0, 1, 2, 3].reduce(
    (nearest, slot) => {
      const { r, g, b } = world.getSlotColor(slot);
      const d = Math.hypot(r - color.r, g - color.g, b - color.b);
      return d < nearest.d ? { slot, d } : nearest;
    },
    { slot: -1, d: Infinity },
  ).slot;

function getScores() {
  const map = world.getObjectById("map")!;
  const track = map
    .getAllSnapPoints()
    .filter((d) => d.getTags().includes("power"))
    .map((p) => p.getGlobalPosition().y)
    .sort((a, b) => a - b);
  const scores = [];
  for (const { color, points } of world.getDrawingLines())
    scores[slot(color)] = track.findIndex((y) => y > points[0].y) + 1;
  return scores;
}

function revealCity(slot: number, tag: string) {
  const board = world
    .getObjectsByTemplateName("board")
    .find((d) => d.getOwningPlayerSlot() === slot)!;
  const city = board
    .getAllSnapPoints()
    .find((p) => p.getTags().includes(tag))
    ?.getSnappedObject();
  city?.setPosition([0, 0, 0]);
  return city;
}
