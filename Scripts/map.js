const {
  refObject,
  HorizontalBox,
  Text,
  UIElement,
  Vector,
} = require("@tabletop-playground/api");

const size = refObject.getSize();

class Ambition {
  constructor(offset) {
    this.scores = new Map();
    this.ui = new UIElement();
    this.ui.position = new Vector(
      size.x / 2 - (13 + offset * 5.3),
      size.y / 2 - 5,
      size.z + 0.35,
    );
    this.ui.widget = new HorizontalBox().setChildDistance(2);
    refObject.addUI(this.ui);
  }

  setScore(slot, score) {
    if (this.scores.get(slot) === score) return;
    this.scores.set(slot, score);
    this.ui.widget.removeAllChildren();
    for (const [slot, score] of [...this.scores.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      if (score) {
        const text = new Text()
          .setTextColor(world.getSlotColor(slot))
          .setFontSize(8)
          .setText(score);
        this.ui.widget.addChild(text);
      }
    }
    refObject.updateUI(this.ui);
  }
}

refObject.ambitions = Object.fromEntries(
  ["tycoon", "tyrant", "warlord", "keeper", "empath"].map((name, i) => [
    name,
    new Ambition(i),
  ]),
);
