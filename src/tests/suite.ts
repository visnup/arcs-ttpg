import { world } from "@tabletop-playground/api";

type Result =
  | { description: string; ok: true }
  | { description: string; ok: false; skipped: true }
  | { description: string; ok: false; error: Error };
type Suite = {
  description: string;
  run: (run?: string) => Promise<void>;
  tests: (() => Promise<Result> & { tag?: string })[];
  results: Result[];
};
let currentSuite: Suite | undefined = undefined;
export const suites: Suite[] = [];

export function describe(
  description: string,
  tag: string | (() => void),
  fn?: () => void,
) {
  if (typeof tag === "function") fn = tag;
  if (!fn) throw new Error("No test function provided");
  const suite = {
    description,
    async run(tag?: string) {
      currentSuite = suite;
      currentSuite.tests = [];
      currentSuite.results = [];
      fn();
      for (const t of currentSuite.tests)
        if (!tag || ("tag" in t && t.tag === tag))
          currentSuite.results.push(await t());
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

export function test(
  description: string,
  tag: string | (() => void),
  fn?: () => Promise<void> | void,
) {
  if (typeof tag === "function") fn = tag;
  if (!fn) throw new Error("No test function provided");
  currentSuite?.tests.push(async () => {
    try {
      for (const b of before) b();
      await fn();
      return { description, ok: true };
    } catch (error) {
      console.error(currentSuite?.description, description, "\n", error);
      if (error instanceof SkipError)
        return { description, ok: false, skipped: true };
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

export async function run(tag?: string) {
  for (const { run } of suites) {
    try {
      await run(tag);
    } catch {
      // ignore
    }
  }
}

export class SkipError extends Error {}
