import type { Card } from "@tabletop-playground/api";
import { world } from "@tabletop-playground/api";
import type { TestableCard as TestableCampaignFateCard } from "../campaign-fate-card";
import type { TestableCard as TestableFateSetCard } from "../set-round";
import { assert, assertEqual, assertEqualEventually } from "./assert";
import { describe, test } from "./suite";

const discard = (card: Card) => {
  if ("discard" in card && typeof card.discard === "function") card.discard();
};

const supply = (resource: string) =>
  [
    ...world.getObjectsByTemplateName<Card>("resource"),
    ...world.getObjectsByTemplateName<Card>("set-round"),
  ].find(
    (d) =>
      d.getCardDetails().tags.includes(`resource:${resource}`) &&
      world.isOnTable(d),
  )!;

// todo: witness tokens on top of resource stack make it templateName = "set-round"
const resources = ["fuel", "material", "weapon", "relic", "psionic"];
describe("resource", () => {
  for (const [i, resource] of resources.entries()) {
    test(`${resource}: discard to supply`, async () => {
      if (resource === "psionic") addWitnessToPsionic();
      const r = supply(resource);
      const n = r.getStackSize();

      const one = r.takeCards(1)!;
      one.setPosition(one.getPosition().add([0, 3, 0]));
      assertEqual(r.getStackSize(), n - 1, "took one card");
      discard(one);
      await assertEqualEventually(() => r.getStackSize(), n, "single to deck");

      const two = r.takeCards(2)!;
      two.setPosition(two.getPosition().add([0, 3, 0]));
      assertEqual(r.getStackSize(), n - 2, "took two cards");
      discard(two);
      await assertEqualEventually(() => r.getStackSize(), n, "two to deck");

      r.setPosition(r.getPosition().add([0, 3, 0]));
      discard(r);
      assertEqual(r.getPosition().y, -44, "homogenous to supply");

      const o = supply(resources[(i + 1) % resources.length]);
      const mixed = r.takeCards(1)!;
      mixed.setPosition(mixed.getPosition().add([0, 3, 0]));
      mixed.addCards(o.takeCards(1)!);
      assertEqual(r.getStackSize(), n - 1, "took one card");
      assertEqual(o.getStackSize(), n - 1, "took one card");
      assertEqual(mixed.getStackSize(), 2, "combined two resources");
      discard(mixed);
      await assertEqualEventually(
        () => r.getStackSize(),
        n,
        "heterogenous to deck",
      );
      await assertEqualEventually(
        () => o.getStackSize(),
        n,
        "heterogenous to deck",
      );
    });

    test.only(`${resource}: discard to cartel`, async () => {
      if (resource === "psionic") addWitnessToPsionic();
      const map = world.getObjectById("map")!;
      const r = supply(resource);
      const n = r.getStackSize();
      let c;
      // Check base court
      const bc = world.getObjectByTemplateName<Card>("bc");
      const offset = bc
        ?.getAllCardDetails()
        .findIndex((d) => d.tags.includes(`supply:${resource}`));
      if (offset && offset >= 0) {
        c = bc!.takeCards(1, true, offset)!;
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
      assertEqual(r.getStackSize(), n - 1, "took one card");
      discard(one);
      await assertEqualEventually(() => r.getStackSize(), n, "single to deck");
    });
  }
});

function addWitnessToPsionic() {
  const map = world.getObjectByTemplateName("map")!;

  // spawn Pacifist
  const fates = world.getObjectsByTemplateName<Card>("fate");
  if (fates.length === 0) return;

  const b = fates.sort((a, b) => a.getPosition().y - b.getPosition().y)[1];
  const pacifist = b.takeCards(1, false, 2);
  assert(pacifist !== undefined, "pacifist");
  pacifist.setPosition(map.getPosition().add([0, 0, 1]));
  (pacifist as TestableCampaignFateCard).onSnapped.trigger(pacifist);

  // shuffle witness tokens in with psionic
  const witness = world
    .getObjectsByTemplateName<Card>("set-round")
    .find((d) => d.getCardDetails().name === "Witness");
  assert(witness !== undefined, "witness tokens");
  const psionic = supply("psionic");
  assert(psionic !== undefined, "psionic supply");
  while (witness.getStackSize() > 1) {
    const converted = witness.takeCards(1) ?? witness;
    (converted as TestableFateSetCard).onFlipUpright.trigger(converted);
    psionic.addCards(converted);
  }
  psionic.shuffle();
}
