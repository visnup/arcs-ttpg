import { refCard } from "@tabletop-playground/api";
import { discardToOrigin } from "./lib/discard-to-origin";

export const extend = (card: typeof refCard) => discardToOrigin(card);
if (refCard) extend(refCard);
