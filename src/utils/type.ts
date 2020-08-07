export type IfEqual<T, U> =
  (<G>() => G extends T ? 1 : 2) extends
  (<G>() => G extends U ? 1 : 2) ? true : false;

export function notUndefined<T>(x: T | undefined | null): x is T {
  return x !== undefined && x !== null;
}

export type ParameterMap<P extends string | number | symbol, T extends Array<any>> = {
  [K in P]: T[number];
}
