import { readdir, readFile, writeFile } from "fs/promises";
import { extname, join } from "path";

const round = (n: number, p = 10) => Math.round(n * p) / p;
const sort = (o: any) => {
  const { x, y, z } = o.transform.translation;
  const d = round(x) ** 2 + round(y) ** 2 + round(z);
  const a = Math.atan2(y, x);
  return d + round(a / Math.PI / 10, 100);
};

const dir = "assets/States";
const files = (await readdir(dir)).filter((file) => extname(file) === ".vts");
for (const file of files) {
  const path = join(dir, file);
  const json = JSON.parse(await readFile(path, "utf8"));
  json.objects = json.objects.sort((a, b) => sort(a) - sort(b));
  for (const o of json.objects) o.persistentKeyData = {};
  await writeFile(
    path,
    JSON.stringify(
      json,
      (_, v) => (typeof v === "number" ? round(v, 1e3) : v),
      "\t",
    ),
  );
}
