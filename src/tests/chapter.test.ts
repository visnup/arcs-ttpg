import {
  globalEvents,
  world,
  type Card,
  type HorizontalBox,
  type UIElement,
} from "@tabletop-playground/api";
import { type TestableObject } from "../chapter";
import { placeAgents, placeChapterTrack, placeShips } from "../lib/setup";
import {
  assert,
  assertEqual,
  assertEqualEventually,
  assertStrictEqual,
} from "./assert";
import { describe, skip, test } from "./suite";
import { getTally } from "./tally";

describe("chapter", () => {
  test("base", async () => {
    if (world.getObjectByTemplateName("chapter-track")) skip("track found");

    const map = world.getObjectById("map")!;
    const track = map
      .getAllSnapPoints()
      .filter((s) => s.getTags().includes("chapter"))
      .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y);
    assertEqual(track.length, 5, "chapter track");

    const chapter = world.getObjectByTemplateName("chapter");
    assert(chapter !== undefined, "chapter not found");

    assertStrictEqual(
      chapter.getSnappedToPoint()?.getParentObject(),
      map,
      "snapped to map",
    );

    // button shown on chapter end
    assertEqual(chapter.getUIs().length, 0);
    globalEvents.onChapterEnded.trigger();
    assertEqual(chapter.getUIs().length, 1, "button shown on chapter end");

    // place captives and trophies
    const boards = world
      .getObjectsByTemplateName("board")
      .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot());
    for (const i of [0, 1, 2, 3]) {
      placeAgents(i, 1, boards[(i + 1) % 4].getPosition().add([-2, 10, 1]));
      placeShips(i, 1, boards[(i + 1) % 4].getPosition().add([-2, 2, 1]));
    }
    const [tyrant, warlord] = map.getUIs().slice(1, 3);
    assertEqual(getTallies(tyrant), [1, 1, 1, 1]);
    assertEqual(getTallies(warlord), [1, 1, 1, 1]);

    assertStrictEqual(chapter.getSnappedToPoint(), track[0], "chapter 1");
    assertEqual(getAmbitionMarkers(), [5, 3, 2], "initial markers");
    globalEvents.onAmbitionDeclared.trigger("tyrant");
    await (chapter as TestableObject).onClick();
    assertStrictEqual(chapter.getSnappedToPoint(), track[1], "chapter 2");
    assertEqual(getAmbitionMarkers(), [5, 4, 3], "flipped one");
    await assertEqualEventually(
      () => getTallies(tyrant),
      [],
      "captives returned",
    );
    assertEqual(getTallies(warlord), [1, 1, 1, 1], "trophies remain");

    // trophies returned
    globalEvents.onAmbitionDeclared.trigger("warlord");
    await (chapter as TestableObject).onClick();
    assertStrictEqual(chapter.getSnappedToPoint(), track[2], "chapter 3");
    assertEqual(getAmbitionMarkers(), [6, 5, 4], "flipped another");
    assertEqualEventually(() => getTallies(warlord), [], "trophies returned");

    await (chapter as TestableObject).onClick();
    assertStrictEqual(chapter.getSnappedToPoint(), track[3], "chapter 4");
    assertEqual(getAmbitionMarkers(), [9, 6, 4], "flipped another");

    await (chapter as TestableObject).onClick();
    assertStrictEqual(chapter.getSnappedToPoint(), track[4], "chapter 5");
    assertEqual(getAmbitionMarkers(), [9, 6, 4], "no more flipping");

    await (chapter as TestableObject).onClick();
    assertStrictEqual(chapter.getSnappedToPoint(), track[4], "chapter 5 still");
    assertEqual(getAmbitionMarkers(), [9, 6, 4], "still no more flipping");
  });

  test("campaign act i & ii", async () => {
    const chapterTrack = world.getObjectByTemplateName<Card>("chapter-track");
    if (chapterTrack === undefined) skip("track not found");

    const chapter = world.getObjectByTemplateName("chapter");
    assert(chapter !== undefined, "chapter not found");
    placeChapterTrack(chapterTrack, chapter);

    assertStrictEqual(
      chapter.getSnappedToPoint()?.getParentObject(),
      chapterTrack,
      "snapped to chapter track",
    );
    const track = chapterTrack
      .getAllSnapPoints()
      .filter((s) => s.getGlobalPosition().z > chapterTrack.getPosition().z)
      .sort((a, b) => a.getGlobalPosition().y - b.getGlobalPosition().y);
    assertEqual(track.length, 3, "act i & ii side");

    for (const [i, power] of [
      [0, [5, 3, 2]],
      [1, [5, 4, 3]],
      [2, [6, 5, 4]],
      [2, [6, 5, 4]],
    ] as [number, number[]][]) {
      assertStrictEqual(
        chapter.getSnappedToPoint(),
        track[i],
        `chapter ${i + 1}`,
      );
      assertEqual(getAmbitionMarkers(), power);
      await (chapter as TestableObject).onClick();
    }
  });

  test("campaign act iii", async () => {
    const chapterTrack = world.getObjectByTemplateName<Card>("chapter-track");
    if (chapterTrack === undefined) skip("track not found");

    const chapter = world.getObjectByTemplateName("chapter");
    assert(chapter !== undefined, "chapter not found");
    placeChapterTrack(chapterTrack, chapter, true);

    assertStrictEqual(
      chapter.getSnappedToPoint()?.getParentObject(),
      chapterTrack,
      "snapped to chapter track",
    );
    const track = chapterTrack
      .getAllSnapPoints()
      .filter((s) => s.getGlobalPosition().z > chapterTrack.getPosition().z)
      .sort((a, b) => a.getGlobalPosition().y - b.getGlobalPosition().y);
    assertEqual(track.length, 4, "act iii side");

    for (const [i, power] of [
      [0, [5, 3, 2]],
      [1, [5, 4, 3]],
      [2, [6, 5, 4]],
      [3, [9, 6, 4]],
      [3, [9, 6, 4]],
    ] as [number, number[]][]) {
      assertStrictEqual(
        chapter.getSnappedToPoint(),
        track[i],
        `chapter ${i + 1}`,
      );
      assertEqual(getAmbitionMarkers(), power);
      await (chapter as TestableObject).onClick();
    }
  });
});

function getTallies(ui: UIElement) {
  const box = ui.widget as HorizontalBox;
  return box.getAllChildren().map(getTally);
}

function getAmbitionMarkers() {
  const map = world.getObjectById("map")!;
  return map
    .getAllSnapPoints()
    .filter((s) => s.getTags().includes("ambition"))
    .sort((a, b) => a.getLocalPosition().y - b.getLocalPosition().y)
    .map((s) => {
      const marker = (s.getSnappedObject() as Card)!;
      return +marker
        .getCardDetails(0)!
        .metadata.slice(marker.isFaceUp() ? 2 : 0)[0];
    });
}
