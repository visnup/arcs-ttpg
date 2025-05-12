export class TriggerableMulticastDelegate<
  T extends (...args: never[]) => unknown,
> {
  delegates = new Set<T>();
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
    for (const fn of this.delegates) fn(...args);
  };
}
