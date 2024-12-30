import { world } from "@tabletop-playground/api";
import type { InitiativeMarker } from "../initiative-marker";
import { assertEqual } from "./assert";
import { describe, test } from "./suite";

describe("initiative-marker", () => {
  const initiative = world.getObjectById("initiative")! as InitiativeMarker;

  test("take", () => {
    for (const slot of [0, 1, 2, 3]) {
      initiative.take(slot);
      assertEqual(world.getSlots()[0], slot);
    }
  });

  test("seize", () => {
    for (const slot of [0, 1, 2, 3]) {
      initiative.seize(slot);
      assertEqual(world.getSlots()[0], slot);
      assertEqual(initiative.getRotation().pitch, -90, "pitch");
    }
  });
});
