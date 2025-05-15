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

await writeFile(
  "assets/States/Empty.vts",
  JSON.stringify(
    {
      ...json,
      zones: [],
      objects: objects.filter((o) => o.objectType === "Table"),
    },
    null,
    "\t",
  ),
);
