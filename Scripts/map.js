const {
  refObject,
  HorizontalBox,
  Text,
  UIElement,
  Vector,
} = require("@tabletop-playground/api");

const size = refObject.getSize();
const colors = new Map();

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

  setScore(color, score) {
    colors.set(color.toHex(), color);
    if (this.scores.get(color.toHex()) === score) return;
    this.scores.set(color.toHex(), score);
    this.ui.widget.removeAllChildren();
    for (const [hex, score] of [...this.scores.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      if (score) {
        const text = new Text()
          .setTextColor(colors.get(hex))
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
