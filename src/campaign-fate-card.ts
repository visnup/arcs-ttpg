import {
  Card,
  ObjectType,
  refCard,
  Vector,
  world,
} from "@tabletop-playground/api";

const sets = [
  "73DF719A0343D704E1ACF6A3363E0054", // set-f22
  "2B60ABD93449333EED932DA5E4106C86", // set-round
  "05B97DFF5148801BAA34E382F56F2F1B", // set-seal
  "C7AE36E6EA4FD8BD8753119124902E01", // set-tile
];
const cards = [
  // a 1
  "8E0F28B0EE4140F2935ED79D2613F213",
  "63B3F50FF2AD4B02B2CC501BA39EEC01",
  "54169FB08FA04933B6578901FFA8C0AD",
  "FC7BE8EF9150452FA7D03AB1DF994ADA",
  "4E605426F389476AB81CE45CA401C96D",
  "7FD6DE8F638342E996C9E7123D0DBC89",
  "FFE1573B41DF4F93BAB50530216DE730",
  "2304554C215545FFA4903A276B119F71",
  // b 9
  "AC4ADF9302324F398D113E16A4F03B97",
  "EB9EEF05BD7F45B6A054960D5EA33F91",
  "ACB0FDC7ECFA4D809DB727268E2E3B68",
  "475FB4DAFD6C4213A532375B721D71A6",
  "19C94CA99CFF4ABCB92F48D241738734",
  "75AE9368EB5E493780479A7B64FA7A63",
  "D00CCF44C2E94E728E9D60E39F912E31",
  "A3B8A1367EB74E82A2C72BE5279C85DF",
  // c 17
  "2218441FB20345AB9299CC63B2FDB850",
  "D453C72939734F5C95A40E5697C2E043",
  "90F14836DDCB4D21AEB5D2F631440039",
  "AF0F0DF6A1A34341BC6CF2087592C8B2",
  "69F6C756533F4805ACA1439C462A223F",
  "555C38EACAA44B6386DF8EF81D432433",
  "823CC01194BE4095A7A247B99DC7D6B6",
  "86660B6732FF438BB8EE54B4C05A59CA",
];

refCard.onPrimaryAction.add((card) => {
  if (card.getStackSize() > 1) return;
  const { index } = card.getCardDetails(0)!;

  // spawn fate cards above card
  const dh = 0.2;
  let height = 1;
  const deck = world.createObjectFromTemplate(
    cards[index],
    card.getPosition().add(new Vector(0, 0, height)),
  );
  if (deck) height += deck.getSize().z + dh;

  // spawn any matching items found in sets
  const fate = `f${index + 1}`;
  for (const guid of sets) {
    const item = world.createObjectFromTemplate(
      guid,
      card.getPosition().add(new Vector(0, 0, height)),
    )!;
    if (item instanceof Card) {
      if (item.getStackSize() > 1) {
        // find matching cards in deck by card name
        const names = item.getAllCardDetails().map((d) => d.name);
        const n = names.filter((n) => n === fate).length;
        if (n) {
          const start = names.findIndex((n) => n === fate);
          const matched = item.takeCards(n, true, start)!;
          maybeCopy(matched);
          height += matched.getSize().z + dh;
        }
        item.destroy();
      } else if (item.getCardDetails(0)?.name === fate) {
        // single card match
        maybeCopy(item);
        height += item.getSize().z + dh;
      } else {
        // no match
        item.destroy();
      }
    }
  }
});

// check metadata for if we need multiple copies
function maybeCopy(item: Card) {
  if (item.getStackSize() === 1) {
    // for a single card, copy via json; add immediately
    const n = +(item.getCardDetails(0)!.metadata || 1);
    const json = item.toJSONString();
    for (let i = 0; i < n - 1; i++) {
      item.addCards(
        world.createObjectFromJSON(
          json,
          item.getPosition().add(new Vector(0, 0, item.getSize().z)),
        ) as Card,
      );
    }
  } else {
    // for a deck, can take cards with copying; add them after
    const copies: Card[] = [];
    for (const [i, { metadata }] of item.getAllCardDetails().entries()) {
      const d = +(metadata || 1);
      for (let j = 0; j < d - 1; j++) {
        const c = item.takeCards(1, true, i, true);
        if (c) copies.push(c);
      }
    }
    for (const c of copies) item.addCards(c);
  }
}
