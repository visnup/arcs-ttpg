import type {
  Card,
  CardHolder,
  Color,
  SnapPoint,
} from "@tabletop-playground/api";
import {
  Button,
  ContentButton,
  globalEvents,
  HorizontalBox,
  LayoutBox,
  ObjectType,
  ProgressBar,
  Text,
  VerticalBox,
  world,
} from "@tabletop-playground/api";
import type { TestableCard as TestableActionCard } from "../action-deck";
import type { InitiativeMarker } from "../initiative-marker";
import {
  getSystems,
  placeShips,
  takeCampaignCard,
  takeEventActionDeck,
  takeResource,
} from "../lib/setup";
import type { TestableBoard } from "../map-board";
import type { TestableCard as TestableSetupCard } from "../setup-deck";
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
    takeResource(0, "fuel");
    globalEvents.onAmbitionDeclared.trigger("tycoon");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [5], "first place");

    // tie for first -> second place points
    takeResource(1, "material");
    takeResource(2, "material");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [3, 3, 3], "tie for first -> second place points");

    // tie for second -> no points
    takeResource(0, "fuel");
    globalEvents.onChapterEnded.trigger();
    assertEqual(getScores(), [5], "tie for second -> no points");

    // multiple markers
    takeResource(3, "relic");
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
    takeResource(1, "fuel");
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
      | TestableSetupCard
      | undefined;
    if (!setupDeck) skip("no setup deck");
    const setup = setupDeck.takeCards()! as TestableSetupCard;
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

  function getTurnUI() {
    const map = world.getObjectById("map")!;
    const widgets = map
      .getUIs()
      .filter((d) => d.position.y < 0)
      .sort((a, b) => a.position.x - b.position.x)
      .map((d) => d.widget);
    const colors = new Map(
      [0, 1, 2, 3].map((c) => [
        world.getSlotColor(c).saturate(0.8).toString(),
        c,
      ]),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return widgets.map(function getWidgetState(w): any {
      if (w instanceof HorizontalBox || w instanceof VerticalBox)
        return w
          .getAllChildren()
          .map(getWidgetState)
          .filter((d) => d);
      if (w instanceof ContentButton) return getWidgetState(w.getChild()!);
      if (w instanceof ProgressBar) return ["progress", w.getProgress()];
      if (w instanceof LayoutBox) return getWidgetState(w.getChild()!);
      if (w instanceof Button) return ["button", w.getText()];
      if (w instanceof Text)
        return ["text", w.getText(), colors.get(w.getTextColor().toString())];
    });
  }

  async function playCard(
    card: Card,
    snap: SnapPoint,
    offset: [number, number, number] = [0, 0, 1],
  ) {
    card.setPosition(snap.getGlobalPosition().add(offset));
    card.snap();
    await new Promise((resolve) => setTimeout(resolve, 100));
    (card as TestableActionCard).onReleased.trigger?.(card);
    (world.getObjectById("map") as TestableBoard).onSnappedTo.trigger(
      card,
      world.getPlayerBySlot(0)!,
      snap,
    );
  }

  test("turns", async () => {
    const map = world.getObjectById("map") as TestableBoard;
    // no turn markers
    assertEqual(getTurnUI(), [[], [], [], [], []]);

    // deal
    const decks = world
      .getObjectsByTemplateName<Card>("action")
      .sort((a, b) => b.getStackSize() - a.getStackSize());

    // Deal known-ordered cards
    for (const slot of [1, 2, 3, 0]) decks[0].deal(6, [slot], false, true);
    decks[1].deal(4, [0], false, true);

    // turn markers and start button
    assertEqual(
      getTurnUI(),
      [
        [
          ["button", " ▙ "],
          [
            ["text", " Start ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 0]],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "turn markers and start button",
    );

    // start -> pass initiative
    map.turns.startRound();
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [
          ["text", "■", 0],
          [
            ["text", " Pass Initiative ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "start -> pass initiative",
    );

    // play card -> end turn
    const holders = world
      .getObjectsByTemplateName<CardHolder>("cards")
      .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot());
    const snaps = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .filter((p) => p.getTags().find((t) => t.startsWith("turn:")))
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x);
    const lead = holders[0].removeAt(0)!;
    await playCard(lead, snaps[0]);
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [
          ["text", "■", 0],
          [
            ["text", " End Turn ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "play card -> end turn",
    );

    // end turn -> next player
    map.turns.nextTurn();
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [["text", "■", 0]],
        [
          ["text", "■", 1],
          [
            ["text", " End Turn ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "end turn -> next player",
    );

    // play card
    await playCard(holders[1].removeAt(0)!, snaps[1]);
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [["text", "■", 0]],
        [
          ["text", "■", 1],
          [
            ["text", " End Turn ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "play card",
    );

    // play card -> catch up turn
    await playCard(holders[2].removeAt(0)!, snaps[2]);
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [["text", "■", 0]],
        [["text", "■", 1]],
        [
          ["text", "■", 2],
          [
            ["text", " End Turn ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 3]],
      ],
      "play card -> catch up turn",
    );

    // play card, end turn -> discard, pass initiative
    await playCard(holders[3].removeAt(0)!, snaps[3]);
    map.turns.nextTurn();
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [["text", "■", 0]],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "play card, end turn -> discard",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [
          ["text", "■", 0],
          [
            ["text", " Pass Initiative ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "… -> pass initiative",
    );
  });

  test("start auto advances", async () => {
    const map = world.getObjectById("map") as TestableBoard;

    // set timer low
    map.turns.turnTime = 500;

    const decks = world
      .getObjectsByTemplateName<Card>("action")
      .sort((a, b) => b.getStackSize() - a.getStackSize());

    // Deal known-ordered cards
    for (const slot of [1, 2, 3, 0]) decks[0].deal(6, [slot], false, true);
    decks[1].deal(4, [0], false, true);

    // turn markers and start button
    assertEqual(getTurnUI(), [
      [
        ["button", " ▙ "],
        [
          ["text", " Start ", null],
          ["progress", 0],
        ],
      ],
      [["text", "■", 0]],
      [["text", "■", 1]],
      [["text", "■", 2]],
      [["text", "■", 3]],
    ]);

    // wait timer -> pass initiative
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assertEqual(getTurnUI(), [
      [["button", " ▙ "]],
      [
        ["text", "■", 0],
        [
          ["text", " Pass Initiative ", null],
          ["progress", 0],
        ],
      ],
      [["text", "■", 1]],
      [["text", "■", 2]],
      [["text", "■", 3]],
    ]);
  });

  test("pause after event or council", async () => {
    const events = takeEventActionDeck();
    if (!events) skip("no event cards");

    const map = world.getObjectById("map") as TestableBoard;

    // deal
    const decks = world
      .getObjectsByTemplateName<Card>("action")
      .sort((a, b) => b.getStackSize() - a.getStackSize());
    for (const slot of [1, 2, 3, 0]) decks[0].deal(6, [slot], false, true);
    events.deal(4, [0], false, true);

    // play cards
    const holders = world
      .getObjectsByTemplateName<CardHolder>("cards")
      .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot());
    const snaps = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .filter((p) => p.getTags().find((t) => t.startsWith("turn:")))
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x);
    await playCard(holders[0].removeAt(0)!, snaps[0]);
    await playCard(holders[1].removeAt(0)!, snaps[1]);
    await playCard(holders[2].removeAt(0)!, snaps[2]);
    // event
    await playCard(holders[0].removeAt(1)!, snaps[3]);

    // end of round
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [["text", "■", 0]],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [
          ["text", "■", 3],
          [
            ["text", " End Turn ", null],
            ["progress", 0],
          ],
        ],
      ],
      "end of round",
    );

    // end round
    map.turns.nextTurn();
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [["text", "■", 0]],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "play card, end turn -> discard",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assertEqual(
      getTurnUI(),
      [
        [["button", " ▙ "]],
        [
          ["text", "■", 0],
          [
            ["text", " Pass Initiative ", null],
            ["progress", 0],
          ],
        ],
        [["text", "■", 1]],
        [["text", "■", 2]],
        [["text", "■", 3]],
      ],
      "… -> pass initiative",
    );
    // paused
    assert(map.turns.pauseStart > 0, "paused");

    // imperial council
    const imperialCouncil = takeCampaignCard("imperial council");
    if (!imperialCouncil) skip("no imperial council card");
    const more = world
      .getObjectById("map")!
      .getAllSnapPoints()
      .filter(
        (p) =>
          p.getTags().includes("card") &&
          !p.getTags().find((t) => t.startsWith("turn:")),
      )
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x);

    // play cards
    await playCard(holders[0].removeAt(0)!, snaps[0]);
    await playCard(holders[1].removeAt(0)!, snaps[1]);
    await playCard(holders[2].removeAt(0)!, snaps[2]);
    await playCard(holders[3].removeAt(0)!, snaps[3]);

    // place imperial council
    await playCard(imperialCouncil, more[0]);

    // paused again
    map.turns.nextTurn();
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert(map.turns.pauseStart > 0, "paused again");
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
