import { world } from "@tabletop-playground/api";
import type { InitiativeMarker } from "../initiative-marker";
import { assertEqual } from "./assert";
import { describe, test } from "./suite";

describe("initiative-marker", () => {
  test("take", () => {
    const initiative = world.getObjectById("initiative")! as InitiativeMarker;
    for (const slot of [0, 1, 2, 3]) {
      initiative.take(slot);
      assertEqual(world.getSlots()[0], slot);
    }
  });

  test("seize", () => {
    const initiative = world.getObjectById("initiative")! as InitiativeMarker;
    for (const slot of [0, 1, 2, 3]) {
      initiative.seize(slot);
      assertEqual(world.getSlots()[0], slot);
      assertEqual(initiative.getRotation().pitch, -90, "pitch");
    }
  });
});
