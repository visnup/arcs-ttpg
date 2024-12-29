export class TriggerableMulticastDelegate<
  T extends (...args: never[]) => unknown,
> {
  delegates: T[] = [];
  add(fn: T) {
    this.delegates.push(fn);
  }
  remove(fn: T) {
    this.delegates = this.delegates.filter((d) => d !== fn);
  }
  clear() {
    this.delegates = [];
  }
  trigger = (...args: Parameters<T>) => {
    for (const fn of this.delegates) fn(...args);
  };
}
