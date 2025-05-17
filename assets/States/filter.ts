import { readFile, writeFile } from "fs/promises";

const meeples = new Map([
  ["5B24A477D74343B61EECDF8037563339", "31A3EA4DE94FFF0E93EED99845EB2566"], // agent
  ["7156FB49F4459B260FA4419F4BA433FA", "85263CC7784721BFA6D92B939192793D"], // flagship
  ["72DDA7161649E9CC16C6FB8C35FE5917", "74A1961EEB4DC5F7507377BA7B8C633A"], // imperial
  ["6E71A43CA74A0296800FC384CBBC6AC4", "37F294F4A746E47E28D85DB8EF8704FF"], // ship
]);
const toMeeple = (o) => ({
  ...o,
  templateId: meeples.get(o.templateId) ?? o.templateId,
});

const { objects, ...json } = JSON.parse(
  await readFile("assets/States/Pieces.vts", "utf8"),
);
const base = objects.filter((o) => !o.objectTags.includes("state:campaign"));
const campaign = objects.filter((o) => !o.objectTags.includes("state:base"));

await writeFile(
  "assets/States/Base (miniatures).vts",
  JSON.stringify({ ...json, objects: base }, null, "\t"),
);
await writeFile(
  "assets/States/Base (meeples).vts",
  JSON.stringify({ ...json, objects: base.map(toMeeple) }, null, "\t"),
);
await writeFile(
  "assets/States/Campaign (miniatures).vts",
  JSON.stringify({ ...json, objects: campaign }, null, "\t"),
);
await writeFile(
  "assets/States/Campaign (meeples).vts",
  JSON.stringify({ ...json, objects: campaign.map(toMeeple) }, null, "\t"),
);
