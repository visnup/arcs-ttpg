import {
  refObject,
  HorizontalBox,
  Text,
  UIElement,
  Vector,
  world,
} from "@tabletop-playground/api";

export type Ambition = "tycoon" | "tyrant" | "warlord" | "keeper" | "empath";

const size = refObject.getSize();

class AmbitionSection {
  scores: Map<number, number>;
  ui: UIElement;
  widget: HorizontalBox;

  constructor(offset: number) {
    this.scores = new Map();
    this.ui = new UIElement();
    this.ui.position = new Vector(
      size.x / 2 - (13 + offset * 5.3),
      size.y / 2 - 5,
      size.z + 0.35,
    );
    this.ui.widget = this.widget = new HorizontalBox().setChildDistance(2);
    refObject.addUI(this.ui);
  }

  setScore(slot: number, score: number) {
    if (this.scores.get(slot) === score) return;
    this.scores.set(slot, score);
    this.widget.removeAllChildren();
    for (const [slot, score] of [...this.scores.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      if (score) {
        const text = new Text()
          .setTextColor(world.getSlotColor(slot))
          .setFontSize(8)
          .setText(String(score));
        this.widget.addChild(text);
      }
    }
    refObject.updateUI(this.ui);
  }
}

const ambitions = Object.fromEntries(
  ["tycoon", "tyrant", "warlord", "keeper", "empath"].map((name, i) => [
    name,
    new AmbitionSection(i),
  ]),
) as Record<Ambition, AmbitionSection>;
(refObject as any).ambitions = ambitions;

export type MapObject = typeof refObject & { ambitions: typeof ambitions };
