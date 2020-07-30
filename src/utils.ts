export function flat<T>(arr: Array<Array<T>>): Array<T> {
  const acc: Array<T> = [];
  for (const sub of arr) {
    for (const ele of sub) {
      acc.push(ele);
    }
  }
  return acc;
}

export type IfEqual<T, U> =
  (<G>() => G extends T ? 1 : 2) extends
  (<G>() => G extends U ? 1 : 2) ? true : false;
