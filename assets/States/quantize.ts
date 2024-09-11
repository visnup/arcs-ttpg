import { readFile, readdir, writeFile } from "fs/promises";
import { extname, join } from "path";

const directory = "./assets/States";

(async () => {
  const files = (await readdir(directory)).filter(
    (file) => extname(file) === ".vts",
  );
  for (const file of files) {
    const path = join(directory, file);
    const json = JSON.parse(await readFile(path, "utf8"));
    await writeFile(
      path,
      JSON.stringify(
        json,
        (key, value) =>
          typeof value === "number" ? Math.round(value * 100) / 100 : value,
        "\t",
      ),
    );
  }
})();
