export function assert(condition: boolean, description: string) {
  if (!condition) throw Error(description);
}

export function assertEqual<T>(value: T, expected: T, description = "") {
  assert(
    stringify(value) === stringify(expected),
    `${description}: ${value} !== ${expected}`,
  );
}

export function assertNotEqual<T>(value: T, expected: T, description = "") {
  assert(
    stringify(value) !== stringify(expected),
    `${description}: ${value} !== ${expected}`,
  );
}

function stringify(value: unknown) {
  return JSON.stringify(value, (name, value) =>
    typeof value === "number" ? Math.round(value) : value,
  );
}
