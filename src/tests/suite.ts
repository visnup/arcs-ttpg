import { world } from "@tabletop-playground/api";

type Result =
  | { description: string; ok: true }
  | { description: string; ok: false; error: Error };
type Suite = {
  description: string;
  run: () => Promise<void>;
  tests: (() => Promise<Result>)[];
  results: Result[];
};
let currentSuite: Suite | undefined = undefined;
export const suites: Suite[] = [];

export function describe(description: string, fn: () => void) {
  const suite = {
    description,
    async run() {
      currentSuite = suite;
      currentSuite.tests = [];
      currentSuite.results = [];
      fn();
      for (const t of currentSuite.tests) currentSuite.results.push(await t());
      before = before.filter((fn) => "keep" in fn && fn.keep);
    },
    tests: [],
    results: [],
  };
  suites.push(suite);
}

let before: (() => void)[] = [];
export function beforeEach(fn: () => void, keep = false) {
  Object.assign(fn, { keep });
  before.push(fn);
}

export function test(description: string, fn: () => Promise<void> | void) {
  currentSuite?.tests.push(async () => {
    try {
      for (const b of before) b();
      await fn();
      return { description, ok: true };
    } catch (error) {
      console.error(currentSuite?.description, description, "\n", error);
      for (const p of world.getAllPlayers())
        p.showMessage(
          `${currentSuite?.description} > ${description}\n${error}`,
        );
      return { description, ok: false, error };
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
}

export async function run() {
  for (const { run } of suites) {
    try {
      await run();
    } catch {
      // ignore
    }
  }
}
