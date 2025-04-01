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
