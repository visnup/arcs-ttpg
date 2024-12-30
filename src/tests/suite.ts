import { world } from "@tabletop-playground/api";

const suite: Parameters<typeof describe>[] = [];
let _reset: () => void | undefined;

export function describe(description: string, fn: () => void) {
  suite.push([description, fn]);
}

export function test(description: string, fn: () => void) {
  try {
    _reset();
    fn();
    console.log(" ✓", description);
  } catch (e) {
    console.error(" x", description, e);
    for (const p of world.getAllPlayers())
      p.showMessage(`${description}: ${e}`);
  }
}

export function runSuite(reset: () => void) {
  _reset = reset;
  console.log("\nRunning tests...");
  for (const [description, fn] of suite) {
    try {
      console.log(description);
      fn();
    } catch {
      // ignore
    }
  }
  _reset();
}
