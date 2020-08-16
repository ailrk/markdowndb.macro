export function once<T>(fn: ((...args: any[]) => T) | null, ...args: any[]) {
  return () => {
    const result = fn ? fn(args) : undefined;
    fn = null;
    return result;
  }
}

export interface Lazy<T> {
  (): T,
  isLazy: boolean,
};


