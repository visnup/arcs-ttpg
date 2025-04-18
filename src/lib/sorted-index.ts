/**
 * Returns the index at which the value satisfies the callback in a sorted array.
 * Uses binary search for efficiency.
 * @param array - The array to inspect
 * @param callback - The function that returns a boolean when the condition is met
 * @returns The index at which the condition is met
 */
export function sortedIndex<T>(
  array: readonly T[],
  callback: (value: T) => boolean,
): number {
  let low = 0;
  let high = array.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (!callback(array[mid])) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}
