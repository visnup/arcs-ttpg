import {
  Card,
  globalEvents,
  HorizontalBox,
  UIElement,
  Vector,
  world,
  type CardHolder,
  type GameObject,
  type Zone,
} from "@tabletop-playground/api";
import { jsxInTTPG, render } from "jsx-in-ttpg";
import { Tally } from "./tally";

let chapterEnded = true;
globalEvents.onChapterEnded.add(() => (chapterEnded = true));
globalEvents.onRoundStarted.add(() => (chapterEnded = false));

export type AmbitionZone = Zone & { tallies?: Map<number, number> };

export class AmbitionSection {
  refObject: GameObject;
  offset: number | string;
  x: number;
  tallies = new Map<number, number>();
  widget = new HorizontalBox();
  position: Vector;
  zone: AmbitionZone;

  constructor(refObject: GameObject, offset: number | string) {
    this.refObject = refObject;
    this.offset = offset;
    this.widget.setChildDistance(15);
    const size = this.refObject.getSize();
    this.position =
      typeof this.offset === "string"
        ? new Vector((this.x = -size.x / 2 + 0.2), 0, size.z + 0.32)
        : new Vector(
            (this.x = size.x / 2 - (13.2 + this.offset * 5.3)),
            size.y / 2 - 5.5,
            size.z + 0.32,
          );
    this.refObject.addUI(
      Object.assign(new UIElement(), {
        position: this.position,
        scale: 0.15,
        widget: this.widget,
      }),
    );
    this.zone =
      world.getZoneById(`zone-ambition-${offset}`) ??
      world.createZone(
        this.refObject
          .getPosition()
          .add(this.position)
          .add([4 / 2, 0, 0]),
      );
    this.zone.setId(`zone-ambition-${offset}`);
    this.zone.setScale(
      typeof this.offset === "string" ? [4.3, 7, 2] : [4.3, 10, 2],
    );
    this.zone.tallies = this.tallies;
    this.zone.onBeginOverlap.add(this.render);
    this.zone.onEndOverlap.add(this.render);
    if (this.offset === 1 || this.offset === 2)
      this.zone.onEndOverlap.add(this.returnAmbitions);
    if (this.offset === 2) {
      this.zone.onBeginOverlap.add(shouldTally);
      this.zone.onEndOverlap.add(shouldTally);
    }
    if (typeof this.offset === "string")
      this.refObject.onMovementStopped.add((obj) =>
        this.zone.setPosition(obj.getPosition()),
      );
    this.refObject.onDestroyed.add(() => this.zone.destroy());
    this.load();
  }

  render = () => {
    const declared = this.zone
      .getOverlappingObjects()
      .some((d) => d.getTemplateName() === "ambition");
    this.widget.removeAllChildren();
    for (const [slot, value] of [...this.tallies].sort((a, b) => b[1] - a[1])) {
      if (value)
        this.widget.addChild(
          render(
            <Tally
              value={value}
              color={world
                .getSlotColor(slot)
                .saturate(slot === 4 || !declared ? 0 : 0.8)
                .lighten(declared ? 0 : -0.7)}
            />,
          ),
        );
    }
  };

  setTally(slot: number, value: number) {
    if (this.tallies.get(slot) === value) return;
    this.tallies.set(slot, value);
    this.render();
    this.save();
  }

  declare() {
    const marker = world
      .getObjectsByTemplateName("ambition")
      .filter((d) => d.getSnappedToPoint())
      .sort((a, b) => a.getPosition().y - b.getPosition().y)[0];
    if (!marker) return;
    const center = this.refObject
      .getPosition()
      .add(this.position)
      .add([1.9, 0, 0]);
    const occupied = world
      .getObjectsByTemplateName("ambition")
      .filter((d) => Math.abs(d.getPosition().x - center.x) < 2.2)
      .sort((a, b) => a.getPosition().y - b.getPosition().y)
      .concat(marker);
    const y = marker.getSize().x + 0.2;
    const left = center.add([0, ((1 - occupied.length) * y) / 2, 0]);
    for (const [i, m] of occupied.entries())
      m.setPosition(left.add([0, i * y, 0.01]), 1.5);
  }

  // Ties: On a tie for first place, all tied players get second place. On a tie
  // for second place, the tied players do not place and gain no Power.
  getStandings = () => {
    const sorted = [...this.tallies].sort(([, a], [, b]) => b - a);
    const tie = sorted[0][1] === sorted[1][1];
    const tie2 = sorted[1][1] === sorted[2]?.[1];
    const second = (tie ? sorted[0][1] : tie2 ? null : sorted[1][1]) || null;
    return [
      tie ? [] : [sorted[0][0]],
      sorted.filter(([, count]) => count === second).map(([slot]) => slot),
    ] as const;
  };

  returnAmbitions = (zone: Zone, obj: GameObject) => {
    if (
      !chapterEnded ||
      obj.getTemplateName() !== "ambition" ||
      world
        .getObjectsByTemplateName<CardHolder>("cards")
        .some((h) => h.getNumCards() > 0)
    )
      return;

    if (this.offset === 1 && !captiveHolding()) returnZone("-captive", true);
    else if (this.offset === 2) returnZone();

    function captiveHolding() {
      const cards = world
        .getAllZones()
        .filter((z) => z.getId().startsWith("zone-player-court-"))
        .flatMap((z) =>
          z
            .getOverlappingObjects()
            .filter(
              (d) =>
                d instanceof Card &&
                d.getCardDetails().tags.includes("captives"),
            ),
        ) as Card[];
      if (cards.length > 0) {
        const names = cards
          .map((d) => d.getCardDetails().name.replace(/\n.*/s, ""))
          .join(", ");
        for (const p of world.getAllPlayers())
          p.showMessage(`Return captives manually due to ${names}`);
        return true;
      }
    }

    function returnZone(suffix = "", resources = false) {
      for (const board of world.getObjectsByTemplateName("board"))
        for (const obj of world
          .getZoneById(`zone-player${suffix}-${board.getId()}`)
          ?.getOverlappingObjects() ?? []) {
          if (
            (resources || obj.getOwningPlayerSlot() !== -1) &&
            obj.getOwningPlayerSlot() !== board.getOwningPlayerSlot() &&
            "discard" in obj &&
            typeof obj.discard === "function"
          )
            obj.discard();
        }
    }
  };

  save() {
    this.refObject.setSavedData(
      JSON.stringify([...this.tallies]),
      `ambition-${this.offset}`,
    );
  }

  load() {
    for (const [slot, value] of JSON.parse(
      this.refObject.getSavedData(`ambition-${this.offset}`) || "[]",
    ) as [number, number][])
      this.setTally(slot, value);
  }
}

function shouldTally() {
  globalEvents.onAmbitionShouldTally.trigger();
}
