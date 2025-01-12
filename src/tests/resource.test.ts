import { ObjectType, world } from "@tabletop-playground/api";
import type { Card } from "@tabletop-playground/api";
import {
  assert,
  assertEqual,
  assertNotEqual,
  assertStrictEqual,
} from "./assert";
import { describe, test } from "./suite";

const discard = (card: Card) => {
  if ("discard" in card && typeof card.discard === "function") card.discard();
  return new Promise((r) => setTimeout(r, 400));
};

const supply = (resource: string) =>
  world
    .getObjectsByTemplateName<Card>("supply")
    .find((d) => d.getTags().includes(`supply:${resource}`))!;

const resources = ["fuel", "material", "weapon", "relic", "psionic"];
describe("resource", () => {
  for (const [i, resource] of resources.entries()) {
    test(`${resource}: discard to supply`, async () => {
      const s = supply(resource);
      const r = s.getSnapPoint(0)!.getSnappedObject() as Card;

      const one = r.takeCards(1)!;
      one.setPosition(one.getPosition().add([0, 3, 0]));
      assertEqual(r.getStackSize(), 4, "took one card");
      await discard(one);
      assertEqual(r.getStackSize(), 5, "single to deck");

      const two = r.takeCards(2)!;
      two.setPosition(two.getPosition().add([0, 3, 0]));
      assertEqual(r.getStackSize(), 3, "took two cards");
      await discard(two);
      assertEqual(r.getStackSize(), 5, "two to deck");

      r.setPosition(r.getPosition().add([0, 3, 0]));
      discard(r);
      assertStrictEqual(
        r.getSnappedToPoint()?.getParentObject(),
        s,
        "homogenous to supply",
      );

      const o = supply(resources[(i + 1) % resources.length])
        .getSnapPoint(0)!
        .getSnappedObject() as Card;
      const mixed = r.takeCards(1)!;
      mixed.setPosition(mixed.getPosition().add([0, 3, 0]));
      mixed.addCards(o.takeCards(1)!);
      assertEqual(r.getStackSize(), 4, "took one card");
      assertEqual(o.getStackSize(), 4, "took one card");
      assertEqual(mixed.getStackSize(), 2, "combined two resources");
      await discard(mixed);
      assertEqual(r.getStackSize(), 5, "heterogenous to deck");
      assertEqual(o.getStackSize(), 5, "heterogenous to deck");
    });

    test(`${resource}: discard to supply on card`, async () => {
      const s = supply(resource);
      const r = s.getSnapPoint(0)!.getSnappedObject() as Card;

      const c = world.getObjectByTemplateName<Card>("bc")!.takeCards(1, true)!;
      c.setPosition(s.getPosition().add([0, 10, 2]));
      c.snap();
      s.setObjectType(ObjectType.Regular);
      s.setPosition(c.getSnapPoint(0)!.getGlobalPosition());
      assert(s.getPosition().y < 42, "supply moved to card");
      assertEqual(
        s.getSnapPoint(0)!.getSnappedObject(),
        undefined,
        "supply empty",
      );
      discard(r);
      assertNotEqual(
        s.getSnapPoint(0)!.getSnappedObject(),
        undefined,
        "supply full",
      );
    });
  }
});
