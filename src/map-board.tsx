import type { CardHolder, SnapPoint } from "@tabletop-playground/api";
import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  HorizontalBox,
  Rotator,
  UIElement,
  Vector,
  world,
  ZonePermission,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import type { DiscardHolder } from "./discard-holder";
import type { InitiativeMarker } from "./initiative-marker";

const refObject = _refObject;
const refPackageId = _refPackageId;

// Global map id
refObject.setId("map");

export type Ambition = "tycoon" | "tyrant" | "warlord" | "keeper" | "empath";

// Card zone
const zoneId = `zone-action-${refObject.getId()}`;
const zone =
  world.getZoneById(zoneId) ?? world.createZone(refObject.getPosition());
{
  const { x, y } = refObject.getSize();
  const size = new Vector(x * 0.62, y * 0.15, 2);
  zone.setId(zoneId);
  zone.setPosition(
    refObject.getPosition().add(new Vector(0, (size.y - y) / 2, 0)),
  );
  zone.setRotation(refObject.getRotation());
  zone.setScale(size);
  zone.setStacking(ZonePermission.Nobody);
}

// Turn indicators
const colors = ["Yellow", "Blue", "Red", "White"];
class Turns {
  turn: number = -1;
  rounds: number = 0;
  slots: number[] = [];
  snaps: SnapPoint[];
  widgets: HorizontalBox[];
  nextButton = render(
    <button
      size={48}
      font="NeueKabelW01-Book.ttf"
      fontPackage={refPackageId}
      onClick={() => this.nextTurn()}
    >
      {" Next "}
    </button>,
  );

  constructor() {
    this.snaps = refObject
      .getAllSnapPoints()
      .filter((p) => p.getTags().find((t) => t.startsWith("turn:")))
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x);
    this.widgets = this.snaps.map((p) => {
      const ui = new UIElement();
      ui.position = p.getLocalPosition().add(new Vector(0, -6, 0));
      ui.rotation = new Rotator(0, p.getSnapRotation(), 0);
      ui.scale = 0.15;
      ui.widget = render(<horizontalbox gap={10} />);
      refObject.addUI(ui);
      return ui.widget as HorizontalBox;
    });
    this.snaps[0].getParentObject()?.onSnappedTo.add((obj, player, p) => {
      if (p === this.snaps[0]) this.cardLed();
    });
  }

  startRound() {
    // Show player turns
    this.slots = world.getSlots(
      "cards",
      (holder: CardHolder, i) => i === 0 || holder.getNumCards() > 0,
    );
    for (const w of this.widgets) w.removeAllChildren();
    for (const [i, slot] of this.slots.entries())
      this.widgets[i].addChild(
        render(
          <text color={world.saturate(world.getSlotColor(slot), 0.5)} size={64}>
            •
          </text>,
        ),
      );

    // Pass button
    this.widgets[0].addChild(
      render(
        <button
          size={48}
          font="NeueKabelW01-Book.ttf"
          fontPackage={refPackageId}
          onClick={() => {
            // Pass initiative
            (world.getObjectById("initiative") as InitiativeMarker).take(
              this.slots[this.turn + 1],
            );
            this.startRound();
          }}
        >
          {" Pass "}
        </button>,
      ),
    );

    this.turn = 0;
    this.showMessage();
  }

  cardLed() {
    this.widgets[0].removeChildAt(1);
    this.widgets[0].addChild(this.nextButton);
  }

  nextTurn() {
    // Clean up previous turn
    if (this.turn >= 0) {
      for (const obj of zone.getOverlappingObjects())
        if (obj && "next" in obj && typeof obj.next === "function") obj.next();
      this.widgets[this.turn].removeChildAt(1);
    }

    const slot = this.slots[++this.turn];
    // If all players have played, end round
    if (slot === undefined) return this.endRound();
    // Next button
    this.widgets[this.turn].addChild(this.nextButton);
    this.showMessage();
  }

  endRound() {
    if (this.rounds > 18) return; // Protect against degenerate loop
    this.rounds++;
    (
      world.getObjectById("discard-holder") as DiscardHolder
    ).discardOrEndChapter();
  }

  showMessage() {
    // Show message
    const slot = this.slots[this.turn];
    const name = world.getPlayerBySlot(slot)?.getName() ?? colors[slot];
    for (const p of world.getAllPlayers()) p.showMessage(`${name}’s turn`);
  }
}

// Ambition ranks
const size = refObject.getSize();
class AmbitionSection {
  scores: Map<number, number>;
  ui: UIElement;
  widget: HorizontalBox;

  constructor(offset: number) {
    this.scores = new Map();
    this.ui = new UIElement();
    this.ui.position = new Vector(
      size.x / 2 - (12.9 + offset * 5.3),
      size.y / 2 - 5,
      size.z + 0.35,
    );
    this.ui.scale = 0.15;
    this.ui.widget = this.widget = new HorizontalBox();
    refObject.addUI(this.ui);
  }

  setScore(slot: number, score: number) {
    if (this.scores.get(slot) === score) return;
    this.scores.set(slot, score);
    this.widget.removeAllChildren();
    for (const [slot, score] of [...this.scores.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      if (score)
        this.widget.addChild(
          render(
            <text
              color={world.saturate(world.getSlotColor(slot), 0.5)}
              size={48}
              font="FMBolyarPro-700.ttf"
              fontPackage={refPackageId}
            >
              {` ${score} `}
            </text>,
          ),
        );
    }
  }

  declare() {
    const marker = getAmbitionMarker();
    if (!marker) return;
    const center = refObject
      .getPosition()
      .add(this.ui.position)
      .add(new Vector(1.5, 0, 0));
    const occupied = world
      .getObjectsByTemplateName("ambition")
      .filter((d) => Math.abs(d.getPosition().x - center.x) < 2.2)
      .sort((a, b) => a.getPosition().y - b.getPosition().y)
      .concat(marker);
    const y = marker.getSize().x + 0.2;
    const left = center.add(new Vector(0, ((1 - occupied.length) * y) / 2, 0));
    for (const [i, m] of occupied.entries())
      m.setPosition(left.add(new Vector(0, i * y, 0.01)), 1.5);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ext = Object.assign(refObject, {
  ambitions: Object.fromEntries(
    ["tycoon", "tyrant", "warlord", "keeper", "empath"].map((name, i) => [
      name,
      new AmbitionSection(i),
    ]),
  ) as Record<Ambition, AmbitionSection>,
  turns: new Turns(),
});
export type MapBoard = typeof ext;

function getAmbitionMarker() {
  return world
    .getObjectsByTemplateName("ambition")
    .filter((d) => d.getSnappedToPoint())
    .sort((a, b) => a.getPosition().y - b.getPosition().y)[0];
}
