import { world } from "@tabletop-playground/api";

const suite: Parameters<typeof describe>[] = [];

export function describe(description: string, fn: () => void) {
  suite.push([description, fn]);
}

export function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(" ✓", description);
  } catch (e) {
    console.error(" x", description, e);
    for (const p of world.getAllPlayers())
      p.showMessage(`${description}: ${e}`);
  }
}

export function runSuite(reset: () => void) {
  console.log("\nRunning tests...");
  for (const [description, fn] of suite) {
    try {
      reset();
      console.log(description);
      fn();
    } catch {
      // ignore
    }
  }
  reset();
}
