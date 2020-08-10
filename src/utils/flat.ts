export function flat<T>(arr: Array<Array<T>>): Array<T> {
  const acc: Array<T> = [];
  for (const sub of arr) {
    for (const ele of sub) {
      acc.push(ele);
    }
  }
  return acc;
}
