import { spawn } from "child_process";
import { cp, readFile, rename, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { parse } from "yaml";

const src = (...s: string[]) => join("../cards/content", ...s);

await Promise.all([
  cp(src("card-data/arcs/en-US"), "wip/cards", { recursive: true }),
  cp(src("faq/arcs/en-US.yml"), "wip/cards/faq.yml"),
  // cp(src("errata/arcs/en-US.yml"), "wip/cards/errata.yml"),
]);

const base: Card[] = parse(
  await readFile("wip/cards/arcsbasegame.yml", "utf8"),
);
const leaders: Card[] = parse(
  await readFile("wip/cards/leaders-lore.yml", "utf8"),
);
const campaign: Card[] = parse(
  await readFile("wip/cards/blightedreach.yml", "utf8"),
);
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
  CardNames: Record<string, string>;
  CardMetadata: Record<string, string>;
  CardTags: Record<string, string[]>;
}

async function modify(path: string, cb: (c: JsonObject) => JsonObject) {
  const json = JSON.parse(await readFile(path, "utf8"));
  await writeFile(path, JSON.stringify(cb(json), undefined, "\t"));
}
async function image(
  path: string,
  cards: Card[],
  columns = 7,
  width = 4096,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  f = (c: Card, i: number) => c.image,
) {
  if (cards.length === 0) return;

  // Get dimensions of the first card and determine card sizing
  const metadata = await sharp(
    src("card-images/arcs/en-US", `${f(cards[0], 0)}.png`),
  ).metadata();
  if (!metadata.width || !metadata.height)
    throw new Error(`Could not determine dimensions of first card image`);

  // Determine card dimensions (scale if needed to fit within 4096px width)
  const { width: w, height: h } = metadata;
  const cardWidth = w * columns > width ? Math.floor(width / columns) : w;
  const cardHeight = w * columns > width ? Math.floor((cardWidth * h) / w) : h;

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
          input: await sharp(
            src("card-images/arcs/en-US", `${f(card, index)}.png`),
          )
            .resize(cardWidth, cardHeight, { fit: "fill" })
            .toBuffer(),
          top: Math.floor(index / columns) * cardHeight,
          left: (index % columns) * cardWidth,
        })),
      ),
    )
    .toFile(path);

  const tempPath = join(
    tmpdir(),
    `${Math.random().toString(36).substring(2)}.jpg`,
  );
  await new Promise((resolve, reject) => {
    spawn("/opt/homebrew/opt/mozjpeg/bin/cjpeg", ["-outfile", tempPath, path])
      .on("close", async (code) => {
        if (code === 0) {
          await unlink(path);
          await rename(tempPath, path);
          resolve(true);
        } else {
          reject(new Error(`cjpeg failed with code ${code}`));
        }
      })
      .on("error", async () => {
        // If the executable is not found, continue
        console.warn("/opt/homebrew/opt/mozjpeg/bin/cjpeg not available");
        resolve(true);
      });
  });
}

interface Card {
  id: string;
  name: string;
  text: string;
  image: string;
  flipSide?: string;
  tags?: string[];
}

function names(cards: Card[]) {
  return cards
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
  previous: Record<string, string> | undefined,
) {
  if (!previous) return {};
  return cards
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

const objectives = [
  "20 17 14",
  "18 16 14",
  "10",
  "18",
  "18",
  "12 11 10",
  "13",
  "10 9 8",
  "8",
  "14",
  "12",
  "24 21 18",
  "18 16 14",
  "16 14 12",
  "18 16 14",
  "22",
  "20",
  "22 18 14",
  "16 14 12",
  "20 18 16",
  "18 16 14",
  "24 21 18",
  "12 9 6",
  "6",
];
const ambitions = {
  Fuel: "tycoon",
  Material: "tycoon",
  Weapon: "warlord",
  Relic: "keeper",
  Psionic: "empath",
};
function metadata(cards: Card[]) {
  const [, n] = cards[0].id.match(/^ARCS-F([12]?\d)\d\d/) || [];
  return cards
    .sort((a, b) => a.id.localeCompare(b.id))
    .reduce(
      (acc, d, i) => ({
        ...acc,
        [i]:
          i === 0
            ? objectives[+n - 1]
            : d.tags?.map((t) => ambitions[t]).filter((d) => d)[0],
      }),
      {},
    );
}
function tags(cards: Card[]) {
  return cards
    .sort((a, b) => a.id.localeCompare(b.id))
    .reduce((acc, d, i) => {
      const [, supply] =
        d.text?.match(/You (?:keep|hold) the (\w+) supply/) || [];
      const action =
        d.tags?.includes("Event") || d.tags?.includes("Action Card");
      return {
        ...acc,
        [i]:
          i === 0
            ? ["fate", "setup", "card"]
            : [
                "fate",
                "card",
                ...(supply ? [`supply:${supply.toLowerCase()}`] : []),
                ...(action ? ["action"] : []),
              ],
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
  json["CardNames"] = names(base.filter((d) => d.id.startsWith("ARCS-BC")));
  return json;
});
image(
  "assets/Textures/cards/bc.jpg",
  base.filter((d) => d.id.startsWith("ARCS-BC")),
);

// leader.json
modify("assets/Templates/cards/leader.json", (json) => {
  json["CardNames"] = names(base.filter((d) => d.id.startsWith("ARCS-LEAD")));
  json["CardMetadata"] = abilities(
    base.filter((d) => d.id.startsWith("ARCS-LEAD")),
    json["CardMetadata"],
  );
  return json;
});
image(
  "assets/Textures/cards/leader.jpg",
  base.filter((d) => d.id.startsWith("ARCS-LEAD")),
  4,
);

// lore.json
modify("assets/Templates/cards/lore.json", (json) => {
  json["CardNames"] = names(base.filter((d) => !!d.id.match(/^ARCS-L\d+$/)));
  return json;
});
image(
  "assets/Textures/cards/lore.jpg",
  base.filter((d) => !!d.id.match(/^ARCS-L\d+$/)),
);

// leader-2.json
modify("assets/Templates/cards/leader-2.json", (json) => {
  json["CardNames"] = names(
    leaders.filter((d) => d.id.startsWith("ARCS-LEAD")),
  );
  json["CardMetadata"] = abilities(
    leaders.filter((d) => d.id.startsWith("ARCS-LEAD")),
    json["CardMetadata"],
  );
  return json;
});
image(
  "assets/Textures/cards/leader-2.jpg",
  leaders.filter((d) => d.id.startsWith("ARCS-LEAD")),
  4,
);

// lore-2.json
modify("assets/Templates/cards/lore-2.json", (json) => {
  json["CardNames"] = names(leaders.filter((d) => !!d.id.match(/^ARCS-L\d+$/)));
  return json;
});
image(
  "assets/Textures/cards/lore-2.jpg",
  leaders.filter((d) => !!d.id.match(/^ARCS-L\d+$/)),
);

// cc.json: campaign court
modify("assets/Templates/campaign/cc.json", (json) => {
  json["CardNames"] = names(campaign.filter((d) => d.id.startsWith("ARCS-CC")));
  return json;
});
image(
  "assets/Textures/campaign/cc.jpg",
  campaign.filter((d) => d.id.startsWith("ARCS-CC")),
);

// dc.json
modify("assets/Templates/campaign/dc.json", (json) => {
  json["CardNames"] = names(
    campaign.filter((d) => !!d.id.match(/^ARCS-AID\d+A?$/)),
  );
  // 10, 11, 12, 13 = flagship upgrades
  for (const i of [9, 10, 11, 12]) json["CardNames"][i] = json["CardNames"][6];
  // 6, 7, 8, 9 = regent
  for (const i of [6, 7, 8]) json["CardNames"][i] = json["CardNames"][5];
  return json;
});

// fate.json
modify("assets/Templates/campaign/fate.json", (json) => {
  json["CardNames"] = names(
    campaign.filter((d) => d.id.startsWith("ARCS-FATE")),
  );
  return json;
});
image(
  "assets/Textures/campaign/fate.jpg",
  campaign.filter((d) => d.id.startsWith("ARCS-FATE")),
  8,
  8 * 800,
);
image(
  "assets/Textures/campaign/fate-back.jpg",
  campaign.filter((d) => d.id.startsWith("ARCS-FATE")),
  8,
  8 * 800,
  (c, i) => ["FATEA", "FATEB", "FATEC"][Math.floor(i / 8)],
);

// f01.json..f24.json
for (let i = 1; i <= 24; i++) {
  const n = i.toString().padStart(2, "0");
  const fate = campaign.filter(
    (d) => !!d.id.match(new RegExp(`^ARCS-F${i}\\d\\dA?$`)),
  );
  modify(`assets/Templates/campaign/f${n}.json`, (json) => {
    json["CardNames"] = names(fate);
    json["CardMetadata"] = metadata(fate);
    json["CardTags"] = tags(fate);
    return json;
  });
  image(`assets/Textures/campaign/f${n}.jpg`, fate);
  image(
    `assets/Textures/campaign/f${n}b.jpg`,
    fate,
    7,
    4096,
    (c) => c.flipSide?.replace("ARCS-", "") ?? `F${i}`,
  );
}
