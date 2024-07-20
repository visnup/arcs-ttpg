import { Card, refCard, Vector, world } from "@tabletop-playground/api";

const seal = "05B97DFF5148801BAA34E382F56F2F1B",
  round = "2B60ABD93449333EED932DA5E4106C86";
const sets = [
  // a 1
  ["8E0F28B0EE4140F2935ED79D2613F213", seal],
  ["63B3F50FF2AD4B02B2CC501BA39EEC01", seal],
  ["54169FB08FA04933B6578901FFA8C0AD", seal],
  ["FC7BE8EF9150452FA7D03AB1DF994ADA"],
  ["4E605426F389476AB81CE45CA401C96D", round],
  ["7FD6DE8F638342E996C9E7123D0DBC89"],
  ["FFE1573B41DF4F93BAB50530216DE730"],
  ["2304554C215545FFA4903A276B119F71", seal],
  // b 9
  ["AC4ADF9302324F398D113E16A4F03B97", round],
  ["EB9EEF05BD7F45B6A054960D5EA33F91", round],
  ["ACB0FDC7ECFA4D809DB727268E2E3B68", round],
  ["475FB4DAFD6C4213A532375B721D71A6", round],
  ["19C94CA99CFF4ABCB92F48D241738734"],
  ["75AE9368EB5E493780479A7B64FA7A63", round],
  ["D00CCF44C2E94E728E9D60E39F912E31", round],
  ["A3B8A1367EB74E82A2C72BE5279C85DF", seal, round],
  // c 17
  ["2218441FB20345AB9299CC63B2FDB850"],
  ["D453C72939734F5C95A40E5697C2E043", round],
  ["90F14836DDCB4D21AEB5D2F631440039"],
  ["AF0F0DF6A1A34341BC6CF2087592C8B2", "C7AE36E6EA4FD8BD8753119124902E01"],
  ["69F6C756533F4805ACA1439C462A223F", "C7AE36E6EA4FD8BD8753119124902E01"],
  ["555C38EACAA44B6386DF8EF81D432433", "73DF719A0343D704E1ACF6A3363E0054"],
  ["823CC01194BE4095A7A247B99DC7D6B6", seal],
  ["86660B6732FF438BB8EE54B4C05A59CA"],
];

refCard.onPrimaryAction.add((card) => {
  if (card.getStackSize() > 1) return;
  const { index } = card.getCardDetails(0)!;
  const fate = `f${index + 1}`;
  let height = 1;
  for (const [i, guid] of sets[index].entries()) {
    const item = world.createObjectFromTemplate(
      guid,
      card.getPosition().add(new Vector(0, 0, height)),
    );
    if (i > 0 && item instanceof Card && item.getStackSize() > 1) {
      // find matching cards by card name
      const contents = item.getAllCardDetails().map((d) => d.name);
      const n = contents.filter((name) => name === fate).length;
      const offset = contents.findIndex((name) => name === fate);
      item.takeCards(n, true, offset);
      item.destroy();
    }
    height += item!.getSize().z + 1;
  }
});
