import { describe, expect } from "@jest/globals";
import { MockCard } from "ttpg-mock";
import { extend } from "./ambition-marker";
import { world } from "./global";
import { testDiscardToOrigin } from "./lib/discard-to-origin.test";

describe("ambition-declared", () => {
  expect(world).toBeDefined();
  testDiscardToOrigin((params) => extend(new MockCard(params)));
});
