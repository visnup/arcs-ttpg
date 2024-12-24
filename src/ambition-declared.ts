import { refObject } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

export function extend(obj: typeof refObject) {
  return discardToOrigin(obj);
}

if (refObject) extend(refObject);
