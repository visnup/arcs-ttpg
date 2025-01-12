import type { Card } from "@tabletop-playground/api";
import { world } from "@tabletop-playground/api";
import { assert, assertEqual } from "./assert";
import { describe, test } from "./suite";

const discard = (card: Card) => {
  if ("discard" in card && typeof card.discard === "function") card.discard();
  return new Promise((r) => setTimeout(r, 400));
};

const supply = (i: number) =>
  world
    .getObjectsByTemplateName<Card>("resource")
    .find((d) => d.getCardDetails(0)!.index === i && world.isOnTable(d))!;

const resources = ["fuel", "material", "weapon", "relic", "psionic"];
describe("resource", () => {
  for (const [i, resource] of resources.entries()) {
    test(`${resource}: discard to supply`, async () => {
      const r = supply(i);

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
      assertEqual(r.getPosition().y, -44, "homogenous to supply");

      const o = supply((i + 1) % resources.length);
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

    test(`${resource}: discard to cartel`, async () => {
      const map = world.getObjectById("map")!;
      const r = supply(i);
      let c;
      // Check base court
      const bc = world.getObjectByTemplateName<Card>("bc")!;
      const offset = bc
        .getAllCardDetails()
        .findIndex((d) => d.tags.includes(`supply:${resource}`));
      if (offset >= 0) {
        c = bc.takeCards(1, true, offset)!;
      } else {
        // Fall back to Magnate fate
        const f03 = world.createObjectFromTemplate(
          "54169FB08FA04933B6578901FFA8C0AD",
          map.getPosition().add([0, 0, 1]),
        ) as Card;
        f03.setRotation([0, 0, -180]);
        const offset = f03
          .getAllCardDetails()
          .findIndex((d) => d.tags.includes(`supply:${resource}`));
        c = f03.takeCards(1, true, offset)!;
      }
      const zone = world
        .getAllZones()
        .find((z) => z.getId().startsWith("zone-player-court-"))!;
      c.setPosition(zone.getPosition().add([0, 0, 2]));
      c.snap();
      discard(r);
      assert(r.getPosition().y > -43, "supply moved to card");

      const one = r.takeCards(1)!;
      one.setPosition(one.getPosition().add([0, 3, 0]));
      assertEqual(r.getStackSize(), 4, "took one card");
      await discard(one);
      assertEqual(r.getStackSize(), 5, "single to deck");
    });
  }
});
