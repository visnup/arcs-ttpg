import { cp, readFile, writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { parse } from "yaml";

const src = (...s: string[]) => join("../cards/content", ...s);

await Promise.all([
  cp(src("card-data/arcs/en-US"), "wip/cards", { recursive: true }),
  cp(src("faq/arcs/en-US.yml"), "wip/cards/faq.yml"),
  // cp(src("errata/arcs/en-US.yml"), "wip/cards/errata.yml"),
]);

const base = parse(await readFile("wip/cards/arcsbasegame.yml", "utf8"));
const leaders = parse(await readFile("wip/cards/leaders-lore.yml", "utf8"));
const campaign = parse(await readFile("wip/cards/blightedreach.yml", "utf8"));
// const errata = parse(await readFile("errata.yml", "utf8"));
const faq = new Map(
  parse(await readFile("wip/cards/faq.yml", "utf8")).map(({ card, faq }) => [
    card,
    faq
      .map(({ q, a }) => `Q: ${q}\nA: ${a}\n`)
      .join("\n")
      .replace(/\$link:([^$]+?)\$/g, "$1"),
  ]),
);

interface JsonObject {
  [key: string]: unknown;
  CardNames?: Record<string, string>;
  CardMetadata?: Record<string, string>;
}

async function modify(path: string, cb: (c: JsonObject) => JsonObject) {
  const json = JSON.parse(await readFile(path, "utf8"));
  await writeFile(path, JSON.stringify(cb(json), undefined, "\t"));
}
async function image(path: string, cards: Card[], columns: number) {
  if (cards.length === 0) return;

  // Get dimensions of the first card and determine card sizing
  const metadata = await sharp(
    src("card-images/arcs/en-US", `${cards[0].image}.png`),
  ).metadata();
  if (!metadata.width || !metadata.height)
    throw new Error(`Could not determine dimensions of first card image`);

  // Determine card dimensions (scale if needed to fit within 4096px width)
  const cardWidth =
    metadata.width! * columns > 4096
      ? Math.floor(4096 / columns)
      : metadata.width!;
  const cardHeight =
    metadata.width! * columns > 4096
      ? Math.floor((cardWidth * metadata.height!) / metadata.width!)
      : metadata.height!;

  // Process all card images and create composite
  await sharp({
    create: {
      width: cardWidth * columns,
      height: cardHeight * Math.ceil(cards.length / columns),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(
      await Promise.all(
        cards.map(async (card, index) => ({
          input: await sharp(src("card-images/arcs/en-US", `${card.image}.png`))
            .resize(cardWidth, cardHeight, { fit: "fill" })
            .toBuffer(),
          top: Math.floor(index / columns) * cardHeight,
          left: (index % columns) * cardWidth,
        })),
      ),
    )
    .toFile(path);
}

interface Card {
  id: string;
  name: string;
  text: string;
  image: string;
  flipSide?: string;
}

function names(cards: Card[], filter: (d: Card) => boolean) {
  return cards
    .filter(filter)
    .sort((a, b) => a.id.localeCompare(b.id))
    .reduce(
      (acc, d, i) => ({
        ...acc,
        [i]: faq.has(d.name)
          ? `${d.name}\n\n${faq.get(d.name)}`.trim()
          : d.name,
      }),
      {},
    );
}
function abilities(
  cards: Card[],
  filter: (d: Card) => boolean,
  previous: Record<string, string> | undefined,
) {
  if (!previous) return {};
  return cards
    .filter(filter)
    .sort((a, b) => a.id.localeCompare(b.id))
    .reduce((acc, d, i) => {
      const append =
        "\n" +
        d.text
          .trim()
          .split("\n")
          .map((l) =>
            l
              .trim()
              .match(/^\*([^*]+)\*\./)?.[1]
              ?.toLowerCase(),
          )
          .filter(Boolean)
          .join("\n");
      return {
        ...acc,
        [i]: previous[i].endsWith(append) ? previous[i] : previous[i] + append,
      };
    }, {});
}

// setup.json
modify("assets/Templates/cards/setup.json", (json) => {
  json["CardNames"] = {}; // TODO
  return json;
});

// bc.json: base court
modify("assets/Templates/cards/bc.json", (json) => {
  json["CardNames"] = names(base, (d) => d.id.startsWith("ARCS-BC"));
  return json;
});
image(
  "assets/Textures/cards/bc.jpg",
  base.filter((d) => d.id.startsWith("ARCS-BC")),
  7,
);

// leader.json
modify("assets/Templates/cards/leader.json", (json) => {
  json["CardNames"] = names(base, (d) => d.id.startsWith("ARCS-LEAD"));
  json["CardMetadata"] = abilities(
    base,
    (d) => d.id.startsWith("ARCS-LEAD"),
    json["CardMetadata"],
  );
  return json;
});

// lore.json
modify("assets/Templates/cards/lore.json", (json) => {
  json["CardNames"] = names(base, (d) => !!d.id.match(/^ARCS-L\d+$/));
  return json;
});

// leader-2.json
modify("assets/Templates/cards/leader-2.json", (json) => {
  json["CardNames"] = names(leaders, (d) => d.id.startsWith("ARCS-LEAD"));
  json["CardMetadata"] = abilities(
    leaders,
    (d) => d.id.startsWith("ARCS-LEAD"),
    json["CardMetadata"],
  );
  return json;
});

// lore-2.json
modify("assets/Templates/cards/lore-2.json", (json) => {
  json["CardNames"] = names(leaders, (d) => !!d.id.match(/^ARCS-L\d+$/));
  return json;
});

// cc.json: campaign court
modify("assets/Templates/campaign/cc.json", (json) => {
  json["CardNames"] = names(campaign, (d) => d.id.startsWith("ARCS-CC"));
  return json;
});
image(
  "assets/Textures/campaign/cc.jpg",
  campaign.filter((d) => d.id.startsWith("ARCS-CC")),
  7,
);

// dc.json
modify("assets/Templates/campaign/dc.json", (json) => {
  json["CardNames"] = names(campaign, (d) => !!d.id.match(/^ARCS-AID\d+A?$/));
  // 10, 11, 12, 13 = flagship upgrades
  for (const i of [10, 11, 12, 13]) json["CardNames"][i] = json["CardNames"][7];
  // 6, 7, 8, 9 = regent
  for (const i of [7, 8, 9]) json["CardNames"][i] = json["CardNames"][6];
  return json;
});

// fate.json
modify("assets/Templates/campaign/fate.json", (json) => {
  json["CardNames"] = names(campaign, (d) => d.id.startsWith("ARCS-FATE"));
  return json;
});

// f01.json..f24.json
for (let i = 1; i <= 24; i++) {
  const n = i.toString().padStart(2, "0");
  modify(`assets/Templates/campaign/f${n}.json`, (json) => {
    const n = names(
      campaign,
      (d) => !!d.id.match(new RegExp(`^ARCS-F${i}\\d\\dA?$`)),
    );
    json["CardNames"] = Object.fromEntries(
      Object.entries(n).map(([i, v], _, r) => [r.length - 1 - +i, v]),
    ) as Record<string, string>;
    return json;
  });
}
