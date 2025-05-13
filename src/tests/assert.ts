export function assert(
  condition: boolean,
  description: string,
): asserts condition {
  if (!condition) throw new Error(description);
}

export function assertStrictEqual<T>(
  value: T,
  expected: T,
  description = "",
): asserts value is T {
  assert(
    value === expected,
    `${description}${description ? ": " : ""}${JSON.stringify(value)} ≠ ${JSON.stringify(expected)}`,
  );
}

export function assertEqual<T>(
  value: T,
  expected: T,
  description = "",
): asserts value is T {
  assert(
    stringify(value) === stringify(expected),
    `${description}${description ? ": " : ""}${JSON.stringify(value)} ≠ ${JSON.stringify(expected)}`,
  );
}

export function assertNotEqual<T>(value: T, expected: T, description = "") {
  assert(
    stringify(value) !== stringify(expected),
    `${description}${description ? ": " : ""}${JSON.stringify(value)} = ${JSON.stringify(expected)}`,
  );
}

function stringify(value: unknown) {
  return JSON.stringify(value, (name, value) =>
    typeof value === "number" ? Math.round(value) : value,
  );
}

export async function assertEventually(
  condition: () => boolean | Promise<boolean>,
  description: string,
  timeout = 2000,
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await Promise.resolve(condition())) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out after ${timeout}ms: ${description}`);
}

export async function assertEqualEventually<T>(
  getValue: () => T | Promise<T>,
  expected: T,
  description = "",
  timeout = 2000,
): Promise<void> {
  const startTime = Date.now();
  let value: T;
  while (Date.now() - startTime < timeout) {
    value = await Promise.resolve(getValue());
    if (stringify(value) === stringify(expected)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `Timed out after ${timeout}ms. ${description}${description ? ": " : ""}${JSON.stringify(value!)} ≠ ${JSON.stringify(expected)}`,
  );
}
