import { readdir, readFile } from "node:fs/promises";

// Parse templates
const templates = new Map();
for await (const path of files("assets/Templates"))
  if (path.endsWith(".json")) {
    const data = JSON.parse((await readFile(path)).toString());
    templates.set(data.GUID, data);
  }

const mapping = [
  ["primaryColor", "PrimaryColor"],
  ["secondaryColor", "SecondaryColor"],
  ["metallic", "Metallic"],
  ["roughness", "Roughness"],
  ["friction", "Friction"],
  ["restitution", "Restitution"],
  ["density", "Density"],
  ["surfaceType", "SurfaceType"],
  ["collisionType", "CollisionType"],
  ["shouldSnap", "ShouldSnap"],
  ["objectScriptName", "ScriptName"],
  ["objectTags", "Tags"],
];
const strings = new Map([
  ["CB_Ground", "Ground"],
  ["CB_Regular", "Regular"],
  ["SurfaceType1", "Plastic"],
  ["SurfaceType2", "Wood"],
  ["SurfaceType3", "Metal"],
  ["SurfaceType4", "Cardboard"],
  ["SurfaceType5", "Cloth"],
  ["SurfaceType6", "Glass"],
  ["SurfaceType7", "Silent"],
]);

// Read through All.vts
// todo: player colors
// todo: peristent key data
const save = await readFile("assets/States/All.vts");
const { objects } = JSON.parse(save.toString());
for (const obj of objects.sort((a, b) =>
  a.templateId.localeCompare(b.templateId),
)) {
  let header = false;
  const template = templates.get(obj.templateId);
  if (!template) continue;
  for (const [o, t] of mapping) {
    if (comparable(obj[o]) !== comparable(template[t])) {
      if (isWhite(template[t]) && isPlayerColor(obj[o])) continue;
      if (!header) {
        console.log(
          obj.uniqueId,
          obj.templateId,
          obj.objectType,
          template?.Name,
        );
        header = true;
      }
      console.log(
        `  ${o}: ${JSON.stringify(obj[o])} != ${JSON.stringify(template[t])}`,
      );
    }
  }
}

function comparable(value: unknown) {
  if (typeof value === "number") return Math.round(value * 1000) / 1000;
  if (typeof value === "object")
    if (value && "r" in value && "g" in value && "b" in value)
      return JSON.stringify({ R: value.r, G: value.g, B: value.b });
    else return JSON.stringify(value);
  if (typeof value === "string") return strings.get(value) ?? value;
  return value;
}

function isWhite(value: unknown) {
  return (
    value &&
    typeof value === "object" &&
    "R" in value &&
    "G" in value &&
    "B" in value &&
    value.R === 255 &&
    value.G === 255 &&
    value.B === 255
  );
}
function isPlayerColor(value: unknown) {
  const colors = [
    "0,149,169",
    "145,42,173",
    "215,210,203",
    "225,83,61",
    "255,183,0",
  ];
  return (
    value &&
    typeof value === "object" &&
    "r" in value &&
    "g" in value &&
    "b" in value &&
    colors.includes(String([value.r, value.g, value.b]))
  );
}

// Helper to recurse through a directory
async function* files(dir: string) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${f.name}`;
    if (f.isDirectory()) yield* files(path);
    else yield path;
  }
}
