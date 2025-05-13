import { world } from "@tabletop-playground/api";

type Result =
  | { description: string; ok: true }
  | { description: string; ok: false; skipped: true }
  | { description: string; ok: false; error: Error };
type TestFunction = {
  (): Promise<Result>;
  only?: boolean;
};
type Suite = {
  description: string;
  run: () => Promise<void>;
  tests: TestFunction[];
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
      const only = suite.tests.filter((t) => t.only);
      for (const t of only.length ? only : currentSuite.tests)
        currentSuite.results.push(await t());
      before = before.filter((fn) => "keep" in fn && fn.keep);
    },
    tests: [] as TestFunction[],
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
      if (error instanceof SkipError)
        return { description, ok: false, skipped: true };
      console.error(
        currentSuite?.description,
        description,
        "\n",
        error,
        error.stack,
      );
      for (const p of world.getAllPlayers())
        p.showMessage(
          `${currentSuite?.description} > ${description}\n${error}`,
        );
      return { description, ok: false, error };
    } finally {
      await new Promise((r) => setTimeout(r, 0));
    }
  });
}

test.only = (description: string, fn: () => Promise<void> | void) => {
  test(description, fn);
  if (currentSuite)
    currentSuite.tests[currentSuite.tests.length - 1].only = true;
};

export async function run() {
  for (const { run } of suites) {
    try {
      await run();
    } catch {
      // ignore
    }
  }
}

class SkipError extends Error {}
export function skip(reason: string): never {
  throw new SkipError(reason);
}
