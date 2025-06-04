export class TriggerableMulticastDelegate<
  T extends (...args: never[]) => unknown,
> {
  delegates = new Set<T>();
  executionTimeMap = new WeakMap();
  lastExecutionTime = 0;
  THROTTLE_MS = 100;

  add(fn: T) {
    this.delegates.add(fn);
  }
  remove(fn: T) {
    this.delegates.delete(fn);
  }
  clear() {
    this.delegates.clear();
  }
  trigger = (...args: Parameters<T>) => {
    const key: WeakKey = args;
    const now = Date.now();

    if (!this.executionTimeMap.has(key)) {
      this.executionTimeMap.set(key, 0);
    }

    if (now - this.executionTimeMap.get(key) >= this.THROTTLE_MS) {
      this.executionTimeMap.set(key, now);
      for (const fn of this.delegates) fn(...args);
    }
    // If not enough time passed, ignore this event
  };
}
