import type {
  Button,
  Card,
  CardHolder,
  GameObject,
  Player,
  ProgressBar,
  SnapPoint,
  Zone,
} from "@tabletop-playground/api";
import {
  refObject as _refObject,
  refPackageId as _refPackageId,
  DrawingLine,
  globalEvents,
  HorizontalBox,
  ObjectType,
  Rotator,
  UIElement,
  Vector,
  world,
  ZonePermission,
} from "@tabletop-playground/api";
import { jsxInTTPG, render, useRef } from "jsx-in-ttpg";
import type { InitiativeMarker } from "./initiative-marker";
import { localSnaps } from "./lib/local-snaps";
import { Tally } from "./lib/tally";

const refObject = _refObject;
const refPackageId = _refPackageId;

refObject.setId("map");

localSnaps(refObject);

const ambitions = ["tycoon", "tyrant", "warlord", "keeper", "empath"] as const;
export type Ambition = (typeof ambitions)[number];

// Map zone
const mapZoneId = `zone-map-${refObject.getId()}`;
const mapZone = world.getZoneById(mapZoneId) ?? world.createZone([0, 0, 0]);
{
  const { x, y } = refObject.getSize();
  const size = new Vector(x * 0.95, y * 0.71, 2);
  mapZone.setId(mapZoneId);
  mapZone.setPosition(refObject.getPosition().add([x * 0.025, 0, 0]));
  mapZone.setScale(size);
  refObject.onDestroyed.add(() => mapZone.destroy());
}
// Ships on map are penetrable, 2p out of play resources too
const penetrable = new Set(["ship", "flagship", "resource"]);
const objectTypes = new WeakMap<GameObject, ObjectType>();
mapZone.onBeginOverlap.add((zone, obj) => {
  if (!penetrable.has(obj.getTemplateName())) return;
  objectTypes.set(obj, obj.getObjectType());
  obj.setObjectType(ObjectType.Penetrable);
});
mapZone.onEndOverlap.add((zone, obj) => {
  if (!penetrable.has(obj.getTemplateName())) return;
  obj.setObjectType(objectTypes.get(obj) ?? ObjectType.Regular);
});

// Card zone
const actionZoneId = `zone-action-${refObject.getId()}`;
const actionZone =
  world.getZoneById(actionZoneId) ?? world.createZone([0, 0, 0]);
{
  const { x, y } = refObject.getSize();
  const size = new Vector(x * 0.62, y * 0.15, 2);
  actionZone.setId(actionZoneId);
  actionZone.setPosition(refObject.getPosition().add([0, (size.y - y) / 2, 0]));
  actionZone.setRotation(refObject.getRotation());
  actionZone.setScale(size);
  actionZone.setStacking(ZonePermission.Nobody);
  refObject.onDestroyed.add(() => actionZone.destroy());
}

// Ambition ranks
const size = refObject.getSize();
class AmbitionSection {
  offset: number;
  x: number;
  tallies = new Map<number, number>();
  widget = new HorizontalBox();
  position: Vector;
  zone: Zone;

  constructor(offset: number) {
    this.offset = offset;
    this.widget.setChildDistance(15);
    refObject.addUI(
      Object.assign(new UIElement(), {
        position: (this.position = new Vector(
          (this.x = size.x / 2 - (13.2 + offset * 5.3)),
          size.y / 2 - 5.5,
          size.z + 0.32,
        )),
        scale: 0.15,
        widget: this.widget,
      }),
    );
    this.zone = world.createZone(
      refObject
        .getPosition()
        .add(this.position)
        .add([4 / 2, 0, 0]),
    );
    this.zone.setId(`zone-ambition-${offset}`);
    this.zone.setScale([4.3, 10, 2]);
    this.zone.onBeginOverlap.add(this.render);
    this.zone.onEndOverlap.add(this.render);
    if (this.offset === 1 || this.offset === 2)
      this.zone.onEndOverlap.add(this.returnAmbitions);
    if (this.offset === 2) {
      this.zone.onBeginOverlap.add(this.shouldTally);
      this.zone.onEndOverlap.add(this.shouldTally);
    }
    refObject.onDestroyed.add(() => this.zone.destroy());
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
    const center = refObject.getPosition().add(this.position).add([1.9, 0, 0]);
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
      obj.getTemplateName() !== "ambition" ||
      turns.turn >= 0 ||
      world
        .getObjectsByTemplateName<CardHolder>("cards")
        .some((h) => h.getNumCards() > 0)
    )
      return;
    const boards = world.getObjectsByTemplateName("board");
    function returnZone(prefix: string, resources = false) {
      for (const board of boards)
        for (const obj of world
          .getZoneById(`${prefix}-${board.getId()}`)
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
    if (this.offset === 1) returnZone("zone-player-captive", true);
    else if (this.offset === 2) returnZone("zone-player");
  };

  shouldTally = () => {
    globalEvents.onAmbitionShouldTally.trigger();
  };

  save() {
    refObject.setSavedData(
      JSON.stringify([...this.tallies]),
      `ambition-${this.offset}`,
    );
  }

  load() {
    for (const [slot, value] of JSON.parse(
      refObject.getSavedData(`ambition-${this.offset}`) || "[]",
    ) as [number, number][])
      this.setTally(slot, value);
  }
}
const sections = Object.fromEntries(
  ambitions.map((name, i) => [name, new AmbitionSection(i)]),
) as Record<Ambition, AmbitionSection>;

globalEvents.onAmbitionDeclared.add((ambition) => sections[ambition].declare());
globalEvents.onAmbitionTallied.add((ambition, slot, value) =>
  sections[ambition].setTally(slot, value),
);
globalEvents.onChapterEnded.add(() => previewScores(true));
globalEvents.onActionsDealt.add(() => previewScores(false));
process.nextTick(() => previewScores());

const track = refObject
  .getAllSnapPoints()
  .filter((p) => p.getTags().includes("power"))
  .map((p) => p.getGlobalPosition())
  .sort((a, b) => a.y - b.y);
function previewScores(visible = !!refObject.getSavedData("previewScores")) {
  for (const l of world.getDrawingLines()) world.removeDrawingLineObject(l);
  refObject.setSavedData(visible ? "visible" : "", "previewScores");
  if (!visible) return;

  // City bonuses
  const hasBonus = (n: number) => (p: SnapPoint) =>
    !p.getSnappedObject() && p.getTags().includes(`bonus:${n}`);
  const bonuses = world
    .getObjectsByTemplateName("board")
    .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot())
    .map((d) => {
      const snaps = d.getAllSnapPoints();
      return snaps.find(hasBonus(3)) ? 5 : snaps.find(hasBonus(2)) ? 2 : 0;
    });

  // Calculate gains
  const gain: number[] = [];
  const used: Map<AmbitionSection, Set<number>> = new Map();
  for (const marker of world.getObjectsByTemplateName<Card>("ambition")) {
    const section = Object.values(sections).find(
      ({ x }) => !marker.getSnappedToPoint() && x < marker.getPosition().x,
    );
    if (!section) continue;
    const [first, second] = section.getStandings();
    const flipped = Math.abs(marker.getRotation().roll) > 1;
    const power = marker.getCardDetails().metadata.slice(flipped ? 2 : 0);
    for (const slot of first) {
      const bonus = used.get(section)?.has(slot) ? 0 : bonuses[slot] || 0;
      gain[slot] = (gain[slot] || 0) + +power[0] + bonus;
      used.set(section, (used.get(section) || new Set()).add(slot));
    }
    for (const slot of second) gain[slot] = (gain[slot] || 0) + +power[1];
  }
  // Place indicators
  const current = world
    .getObjectsByTemplateName("power")
    .filter((d) => world.isOnMap(d))
    .sort((a, b) => a.getOwningPlayerSlot() - b.getOwningPlayerSlot())
    .map((d) => track.findIndex((p) => p.y > d.getPosition().y + 0.1));
  const seen: Record<string, number> = {};
  for (const [slot, g] of gain.entries()) {
    if (!g || slot === 4) continue;
    const score = current[slot] + g;
    const dot = new DrawingLine();
    const p = track[score - 1].add([0.9 + (seen[score] || 0), 0, 0]);
    dot.points = [p.add([0, -0.1, 0]), p.add([0, +0.1, 0])];
    dot.thickness = 0.2;
    dot.rounded = false;
    dot.color = world.getSlotColor(slot).lighten(-0.2);
    world.addDrawingLine(dot);
    seen[score] = (seen[score] || 0) + 0.15;
  }
}

// Turn indicators
const colors = ["Yellow", "Blue", "Red", "White"];
const ding = world.importSound("66136__aji__ding30603-spedup.mp3");
const animation = "▙▛▜▟";
class Turns {
  #turn = -2;
  slots: number[] = [];
  turnStart = 0;
  pauseStart = 0;
  pauseTime = 0;
  dinged = true;
  turnTime = 120_000;

  snaps: SnapPoint[];
  widgets: HorizontalBox[];
  rounds: number = 0;
  bars = [useRef<ProgressBar>(), useRef<ProgressBar>(), useRef<ProgressBar>()];
  timerText = useRef<Button>();
  pauseButton = render(
    <layout minHeight={115}>
      <button
        onClick={() => this.pause()}
        size={32}
        font="Inconsolata-VariableFont_wdth,wght.ttf"
        fontPackage={refPackageId}
        ref={this.timerText}
      ></button>
    </layout>,
  );
  startRoundButton = render(
    <contentbutton onClick={() => this.startRound()}>
      <verticalbox>
        <text size={48} font="NeueKabelW01-Book.ttf" fontPackage={refPackageId}>
          {" Start "}
        </text>
        <progressbar value={0} ref={this.bars[0]} />
      </verticalbox>
    </contentbutton>,
  );
  passButton = render(
    <contentbutton
      onClick={() => {
        (world.getObjectById("initiative") as InitiativeMarker).take(
          this.slots[this.turn + 1],
        );
        this.startRound();
      }}
    >
      <verticalbox>
        <text size={48} font="NeueKabelW01-Book.ttf" fontPackage={refPackageId}>
          {" Pass Initiative "}
        </text>
        <progressbar value={0} ref={this.bars[1]} />
      </verticalbox>
    </contentbutton>,
  );
  nextButton = render(
    <contentbutton onClick={() => this.nextTurn()}>
      <verticalbox>
        <text size={48} font="NeueKabelW01-Book.ttf" fontPackage={refPackageId}>
          {" End Turn "}
        </text>
        <progressbar value={0} ref={this.bars[2]} />
      </verticalbox>
    </contentbutton>,
  );

  constructor() {
    // Create widgets
    this.snaps = refObject
      .getAllSnapPoints()
      .filter((p) => p.getTags().find((t) => t.startsWith("turn:")))
      .sort((a, b) => a.getLocalPosition().x - b.getLocalPosition().x);
    this.widgets = this.snaps.map((p) => {
      const ui = Object.assign(new UIElement(), {
        position: p.getLocalPosition().add([0, -6.1, 0]),
        rotation: new Rotator(0, p.getSnapRotation(), 0),
        scale: 0.15,
        widget: render(<horizontalbox gap={10} />),
      });
      refObject.addUI(ui);
      return ui.widget as HorizontalBox;
    });
    this.widgets[-1] = render(<horizontalbox gap={10} />) as HorizontalBox;
    refObject.addUI(
      Object.assign(new UIElement(), {
        position: refObject
          .getAllSnapPoints()
          .find((p) => p.getTags().includes("declared"))!
          .getLocalPosition()
          .add([0, -5.9, 0]),
        rotation: new Rotator(0, -90, 0),
        scale: 0.15,
        widget: this.widgets[-1],
      }),
    );

    // Register listeners
    globalEvents.onChatMessage.add(this.onChatMessage);
    globalEvents.onActionsDealt.add(() => this.startRound(-1));
    globalEvents.onActionsDiscarded.add(() => this.startRound());
    globalEvents.onChapterEnded.add(() => this.endChapter());
    globalEvents.onInitiativeMoved.add(this.onInitiativeMoved);
    refObject.onSnappedTo.add(this.onSnappedTo);
    const interval = setInterval(this.tickBars, 1000);
    refObject.onDestroyed.add(() => clearInterval(interval));

    // Load from save?
    const saved = this.load();
    if (saved) {
      this.startRound(saved.turn, saved.slots);
      this.turnStart = saved.turnStart;
      this.pauseStart = saved.pauseStart;
      this.pauseTime = saved.pauseTime;
      this.turnTime = saved.turnTime;
    }
  }

  // Listeners
  onChatMessage = (sender: Player, message: string) => {
    const match = message.match(/^\/turn\s+(\d+)$/);
    if (match) {
      this.turnTime = +match[1] * 1_000;
      this.tickBars();
      this.save();
    }
  };

  onInitiativeMoved = () => {
    if (this.snaps.every((p) => !p.getSnappedObject())) this.startRound();
  };

  onSnappedTo = (obj: GameObject, player: Player, p: SnapPoint) => {
    // Don't react if we haven't started
    if (this.turn === -2) return;
    // Remove start chapter timer
    if (this.turn === -1) this.widgets[-1].removeChildAt(1);
    // Card led: switch buttons
    if (p === this.snaps[0] && this.turn < 1) {
      this.widgets[0].removeChildAt(1);
      this.widgets[0].addChild(this.nextButton);
    }
    // Catch up to current turn
    const behind = this.snaps.findIndex((d) => d === p) - this.turn;
    for (let i = 0; i < behind; i++) this.nextTurn();
    // Enable next button
    if (p === this.snaps[this.turn]) this.nextButton.setEnabled(true);
  };

  tickBars = () => {
    if (this.pauseStart || this.turn === -2) return;
    const elapsed = Date.now() - this.turnStart - this.pauseTime;
    const p = Math.min(elapsed / this.turnTime, 1);
    const color: [number, number, number, number] =
      p >= 1 ? [0.412, 0.188, 0.153, 1] : [1, 1, 1, 1];
    for (const bar of this.bars)
      bar.current
        ?.setProgress(p)
        .setBarColor(color)
        .setVisible(this.turnTime > 0);
    this.timerText.current
      ?.setText(
        ` ${animation.charAt(Math.floor(elapsed / 1000) % animation.length)} `,
      )
      .setTextColor(color);
    if (this.turnTime > 0 && p >= 1) {
      if (!this.dinged) {
        ding.play();
        this.dinged = true;
      }
      if (this.turn === -1) this.startRound();
    } else {
      this.dinged = false;
    }
  };

  // On turn change
  set turn(value: number) {
    this.#turn = value;
    this.turnStart = Date.now();
    this.pauseTime = this.pauseStart = 0; // Unpause
    this.tickBars();
    this.showMessage();
    this.save();
  }
  get turn() {
    return this.#turn;
  }

  // Toggle pause
  pause = () => {
    if (this.pauseStart) {
      this.pauseTime += Date.now() - this.pauseStart;
      this.pauseStart = 0;
    } else {
      this.pauseStart = Date.now();
    }
    this.save();
  };

  startRound(turn = 0, slots?: number[]) {
    for (const w of [...this.widgets, this.widgets[-1]]) w.removeAllChildren();
    this.slots =
      slots ??
      world.getSlots(
        "cards",
        (holder: CardHolder, i) => i === 0 || holder.getNumCards() > 0,
      );
    if (
      this.slots.length === 1 &&
      world
        .getObjectsByTemplateName<CardHolder>("cards")
        .every((d) => d.getNumCards() === 0)
    )
      return;
    globalEvents.onRoundStarted.trigger(this.slots);

    // Show player turns
    for (const [i, slot] of this.slots.entries())
      this.widgets[i].addChild(
        render(
          <text color={world.getSlotColor(slot).saturate(0.8)} size={48}>
            ■
          </text>,
        ),
      );

    // Pass/Next button
    this.widgets[-1].addChild(this.pauseButton);
    if (turn === -1) {
      this.widgets[-1].addChild(this.startRoundButton);
    } else if (turn >= 0) {
      this.widgets[turn].addChild(
        turn === 0 && !this.snaps[0].getSnappedObject()
          ? this.passButton
          : this.nextButton,
      );
      this.nextButton.setEnabled(!!this.snaps[turn].getSnappedObject());
    }

    this.turn = turn;
  }

  nextTurn() {
    // Clean up previous turn
    if (this.turn >= 0) {
      for (const obj of actionZone.getOverlappingObjects()) {
        // Seize
        if ("next" in obj && typeof obj.next === "function") obj.next();
        // Discard resources
        if (
          obj.getTemplateName() === "resource" &&
          "discard" in obj &&
          typeof obj.discard === "function"
        )
          obj.discard();
      }
      this.widgets[this.turn].removeChildAt(1);
    }

    // Advance turn
    const slot = this.slots[++this.turn];
    // If all players have played, end round
    if (slot === undefined) return this.endRound();
    // Next button
    this.widgets[this.turn].addChild(this.nextButton);
    this.nextButton.setEnabled(false);
  }

  endRound() {
    // 5 chapters * 8 cards (6 + 2 extra) * 2 (double it for good measure)
    if (this.rounds > 5 * 8 * 2) {
      this.rounds = 0;
      return console.warn("Infinite endRound loop detected");
    }
    this.rounds++;
    globalEvents.onRoundEnded.trigger();
  }

  endChapter() {
    if (this.widgets[this.turn]?.getNumChildren() >= 2)
      this.widgets[this.turn].removeChildAt(1);
    this.widgets[-1].removeAllChildren();
    this.turn = -2;
  }

  showMessage() {
    const slot = this.slots[this.turn];
    if (slot === undefined) return;
    const name = world.getPlayerBySlot(slot)?.getName() ?? colors[slot];
    for (const p of world.getAllPlayers()) p.showMessage(`${name}’s turn`);
  }

  save() {
    refObject.setSavedData(
      this.turn === -2
        ? ""
        : JSON.stringify({
            turn: this.turn,
            slots: this.slots,
            turnStart: this.turnStart,
            pauseStart: this.pauseStart,
            pauseTime: this.pauseTime,
            turnTime: this.turnTime,
          }),
      "turns",
    );
  }
  load(): {
    turn: number;
    slots: number[];
    turnStart: number;
    pauseStart: number;
    pauseTime: number;
    turnTime: number;
  } | null {
    return JSON.parse(refObject.getSavedData("turns") || "null");
  }
}
const turns = new Turns();

export type TestableBoard = GameObject & {
  onSnappedTo: { trigger: typeof turns.onSnappedTo };
  turns: typeof turns;
};
(refObject as TestableBoard).onSnappedTo.trigger = turns.onSnappedTo;
(refObject as TestableBoard).turns = turns;
