import {
  Color,
  refObject,
  RichText,
  UIElement,
  Vector,
} from "@tabletop-playground/api";

const text = new RichText();
text.setFont("MarkerFelt-Thin.ttf");
text.setFontSize(28);
text.setText(refObject.getDescription());
text.setTextColor(new Color(0.05, 0.05, 0.05, 1));
const ui = new UIElement();
ui.scale = 0.2;
ui.position = new Vector(0, 0, 0.1);
ui.widget = text;
refObject.addUI(ui);
