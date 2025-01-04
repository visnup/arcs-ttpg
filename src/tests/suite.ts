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
      fn();
      currentSuite.results = await Promise.all(
        currentSuite.tests.map((test) => test()),
      );
    },
    tests: [],
    results: [],
  };
  suites.push(suite);
}

const before: (() => void)[] = [];
export function beforeEach(fn: () => void) {
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
