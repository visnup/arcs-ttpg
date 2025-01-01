import { world } from "@tabletop-playground/api";

type Result =
  | { description: string; ok: true }
  | { description: string; ok: false; error: Error };
type Suite = {
  description: string;
  fn: () => void;
  results: Result[];
};
let currentSuite: Suite | undefined = undefined;
export const suites: Suite[] = [];

export function describe(description: string, fn: () => void) {
  const suite = {
    description,
    fn() {
      currentSuite = suite;
      suite.results.length = 0;
      fn();
    },
    results: [],
  };
  suites.push(suite);
}

const before: (() => void)[] = [];
export function beforeEach(fn: () => void) {
  before.push(fn);
}

export function test(description: string, fn: () => void) {
  try {
    for (const b of before) b();
    fn();
    currentSuite?.results.push({ description, ok: true });
  } catch (error) {
    console.error(description, error);
    currentSuite?.results.push({ description, ok: false, error });
    for (const p of world.getAllPlayers())
      p.showMessage(`${description}: ${error}`);
  }
}

export function run() {
  for (const { fn } of suites) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}
