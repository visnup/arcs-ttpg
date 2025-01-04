import type {
  CardHolder,
  GameObject,
  Player,
  ProgressBar,
  SnapPoint,
} from "@tabletop-playground/api";
import {
  refObject as _refObject,
  refPackageId as _refPackageId,
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

const refObject = _refObject;
const refPackageId = _refPackageId;

refObject.setId("map");

export type Ambition = "tycoon" | "tyrant" | "warlord" | "keeper" | "empath";

// Map zone
const mapZoneId = `zone-map-${refObject.getId()}`;
const mapZone =
  world.getZoneById(mapZoneId) ?? world.createZone(refObject.getPosition());
{
  const { x, y } = refObject.getSize();
  const size = new Vector(x * 0.95, y * 0.7, 2);
  mapZone.setId(mapZoneId);
  mapZone.setPosition(refObject.getPosition().add([x * 0.025, 0, 0]));
  mapZone.setScale(size);
}
// Objects on map are penetrable
const objectTypes = new WeakMap<GameObject, ObjectType>();
mapZone.onBeginOverlap.add((zone, obj) => {
  objectTypes.set(obj, obj.getObjectType());
  obj.setObjectType(ObjectType.Penetrable);
});
mapZone.onEndOverlap.add((zone, obj) => {
  if (obj !== refObject)
    obj.setObjectType(objectTypes.get(obj) ?? ObjectType.Regular);
});

// Card zone
const actionZoneId = `zone-action-${refObject.getId()}`;
const actionZone =
  world.getZoneById(actionZoneId) ?? world.createZone(refObject.getPosition());
{
  const { x, y } = refObject.getSize();
  const size = new Vector(x * 0.62, y * 0.15, 2);
  actionZone.setId(actionZoneId);
  actionZone.setPosition(refObject.getPosition().add([0, (size.y - y) / 2, 0]));
  actionZone.setRotation(refObject.getRotation());
  actionZone.setScale(size);
  actionZone.setStacking(ZonePermission.Nobody);
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
              color={world.getSlotColor(slot).saturate(0.5)}
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
    const marker = world
      .getObjectsByTemplateName("ambition")
      .filter((d) => d.getSnappedToPoint())
      .sort((a, b) => a.getPosition().y - b.getPosition().y)[0];
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

const ambitions = Object.fromEntries(
  ["tycoon", "tyrant", "warlord", "keeper", "empath"].map((name, i) => [
    name,
    new AmbitionSection(i),
  ]),
) as Record<Ambition, AmbitionSection>;

globalEvents.onAmbitionDeclared.add((ambition) =>
  ambitions[ambition].declare(),
);
globalEvents.onAmbitionScored.add((ambition, slot, count) =>
  ambitions[ambition].setScore(slot, count),
);

// Turn indicators
const colors = ["Yellow", "Blue", "Red", "White"];
const ding = world.importSound("66136__aji__ding30603-spedup.mp3");
class Turns {
  #turn: number = -1;
  slots: number[] = [];
  turnStart = 0;
  dinged = true;
  turnTime = 120_000;

  snaps: SnapPoint[];
  widgets: HorizontalBox[];
  rounds: number = 0;
  bars = [useRef<ProgressBar>(), useRef<ProgressBar>()];
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
        <progressbar value={0} ref={this.bars[0]} />
      </verticalbox>
    </contentbutton>,
  );
  nextButton = render(
    <contentbutton onClick={() => this.nextTurn()}>
      <verticalbox>
        <text size={48} font="NeueKabelW01-Book.ttf" fontPackage={refPackageId}>
          {" End Turn "}
        </text>
        <progressbar value={0} ref={this.bars[1]} />
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
      const ui = new UIElement();
      ui.position = p.getLocalPosition().add(new Vector(0, -6.1, 0));
      ui.rotation = new Rotator(0, p.getSnapRotation(), 0);
      ui.scale = 0.15;
      ui.widget = render(<horizontalbox gap={10} />);
      refObject.addUI(ui);
      return ui.widget as HorizontalBox;
    });

    // Register listeners
    world.broadcastChatMessage(
      `Turn timer set to 2 minutes. Message "/turn [seconds]" to change, "/turn 0" to disable.`,
    );
    globalEvents.onChatMessage.add(this.onChatMessage);
    globalEvents.onActionsDealt.add(() => this.startRound());
    globalEvents.onActionsDiscarded.add(() => this.startRound());
    globalEvents.onInitiativeMoved.add(this.onInitiativeMoved);
    refObject.onSnappedTo.add(this.onSnappedTo);
    setInterval(this.tickBars, 2000);

    // Load from save?
    const saved = this.load();
    if (saved) {
      this.turnStart = saved.turnStart;
      this.turnTime = saved.turnTime;
      this.startRound(saved.turn, saved.slots);
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
    // Card led: switch buttons
    if (p === this.snaps[0]) {
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
    const p = Math.min((Date.now() - this.turnStart) / this.turnTime, 1);
    for (const bar of this.bars) {
      bar.current?.setVisible(this.turnTime > 0);
      bar.current?.setProgress(p);
    }
    if (this.turnTime > 0 && p >= 1) {
      if (!this.dinged) {
        ding.play();
        this.dinged = true;
      }
    } else {
      this.dinged = false;
    }
  };

  // On turn change
  set turn(value: number) {
    this.#turn = value;
    this.turnStart = Date.now();
    this.tickBars();
    this.showMessage();
    this.save();
  }
  get turn() {
    return this.#turn;
  }

  startRound(turn = 0, slots?: number[]) {
    for (const w of this.widgets) w.removeAllChildren();
    // Show player turns
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
    for (const [i, slot] of this.slots.entries())
      this.widgets[i].addChild(
        render(
          <text color={world.getSlotColor(slot).saturate(0.5)} size={48}>
            ■
          </text>,
        ),
      );

    // Pass/Next button
    this.widgets[turn].addChild(
      turn === 0 && !this.snaps[0].getSnappedObject()
        ? this.passButton
        : this.nextButton,
    );
    this.nextButton.setEnabled(!!this.snaps[turn].getSnappedObject());

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
    if (this.rounds > 18)
      return console.warn("Infinite endRound loop detected");
    this.rounds++;
    globalEvents.onRoundEnded.trigger();
  }

  showMessage() {
    const slot = this.slots[this.turn];
    if (slot === undefined) return;
    const name = world.getPlayerBySlot(slot)?.getName() ?? colors[slot];
    for (const p of world.getAllPlayers()) p.showMessage(`${name}’s turn`);
  }

  save() {
    refObject.setSavedData(
      JSON.stringify({
        turn: this.turn,
        slots: this.slots,
        turnStart: this.turnStart,
        turnTime: this.turnTime,
      }),
      "turns",
    );
  }
  load(): {
    turn: number;
    slots: number[];
    times: number[];
    turnStart: number;
    turnTime: number;
  } | null {
    return JSON.parse(refObject.getSavedData("turns") || "null");
  }
}
new Turns();
