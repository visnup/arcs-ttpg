import { readFile, writeFile } from "fs/promises";

const { objects, ...json } = JSON.parse(
  await readFile("assets/States/Pieces.vts", "utf8"),
);
await writeFile(
  "assets/States/Base.vts",
  JSON.stringify(
    {
      ...json,
      objects: objects.filter((o) => !o.objectTags.includes("state:campaign")),
    },
    null,
    "\t",
  ),
);
await writeFile(
  "assets/States/Campaign.vts",
  JSON.stringify(
    {
      ...json,
      objects: objects.filter((o) => !o.objectTags.includes("state:base")),
    },
    null,
    "\t",
  ),
);
const complex = new Set([
  "D2E814426F4C787559F5E28F0BC8621E",
  "A818BC3D554819C50AFA16A227C9A68E",
  "34FBB8B5F944402AACD987BCBE52E300",
  "DE375B5C034C2F2D837E378017E9FA10",
]);
await writeFile(
  "assets/States/Campaign (simpler).vts",
  JSON.stringify(
    {
      ...json,
      objects: objects.filter(
        (o) =>
          !o.objectTags.includes("state:base") && !complex.has(o.templateId),
      ),
    },
    null,
    "\t",
  ),
);
