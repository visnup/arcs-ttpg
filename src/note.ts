import {
  Color,
  refObject,
  RichText,
  UIElement,
  Vector,
} from "@tabletop-playground/api";

const scale = 0.2;
const text = new RichText();
text.setFont("ShantellSans-Regular.ttf");
text.setFontSize(4.6 / scale);
text.setText(refObject.getDescription());
text.setTextColor(new Color(0, 0, 0, 1));
refObject.addUI(
  Object.assign(new UIElement(), {
    scale,
    position: new Vector(0, 0, 0.05),
    widget: text,
  }),
);
