import { refHolder } from "@tabletop-playground/api";
import type { Ambition } from "./map";

const courtSuits: (Ambition | undefined)[] = [
  "tycoon",
  "tycoon",
  ,
  "empath",
  "keeper",
];

const getAmbitions = () => {
  const ambitions = { tycoon: 0, tyrant: 0, warlord: 0, keeper: 0, empath: 0 };
  for (const card of refHolder.getCards()) {
    // hack: use the index in the base court deck to infer the resource type
    // 0-9 (0-1): tycoon, 15-19 (3): empath, 20-24 (4): keeper
    if (refHolder.isCardFaceUp(card))
      ambitions[courtSuits[Math.floor(card.getCardDetails().index / 5)]!]++;
  }
  return ambitions;
};
(refHolder as any).getAmbitions = getAmbitions;

export type PlayerCourtHolder = typeof refHolder & {
  getAmbitions: typeof getAmbitions;
};
