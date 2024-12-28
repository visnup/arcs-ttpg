import { refObject } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

export const extend = (obj: typeof refObject) => discardToOrigin(obj);
if (refObject) extend(refObject);
