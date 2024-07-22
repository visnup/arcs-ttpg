import {
  Color,
  refObject,
  RichText,
  UIElement,
  Vector,
} from "@tabletop-playground/api";

const text = new RichText();
text.setFont("MarkerFelt.ttc");
text.setFontSize(9);
text.setText(refObject.getDescription());
text.setTextColor(new Color(0, 0, 0, 1));
const ui = new UIElement();
ui.position = new Vector(0, 0, 0.1);
ui.widget = text;
refObject.addUI(ui);
