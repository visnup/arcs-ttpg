import { describe, expect } from "@jest/globals";
import { MockGameObject } from "ttpg-mock";
import { extend } from "./ambition-declared";
import { world } from "./global";
import { testDiscardToOrigin } from "./lib/discard-to-origin.test";

describe("ambition-declared", () => {
  expect(world).toBeDefined();
  testDiscardToOrigin((params) => extend(new MockGameObject(params)));
});