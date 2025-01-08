import type { Canvas, LayoutBox, Text, Widget } from "@tabletop-playground/api";

export function getTally(widget?: Widget) {
  if (!widget) return undefined;
  return +(
    (
      ((widget as LayoutBox).getChild() as Canvas).getChildren()[1] as LayoutBox
    ).getChild() as Text
  ).getText();
}
