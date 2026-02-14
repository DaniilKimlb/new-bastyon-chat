export function mergeObjects<T extends object>(
  obj1: T,
  obj2: Partial<T>
): T {
  const result = { ...obj1 };

  for (const key of Object.keys(obj2)) {
    const typedKey = key as keyof T;
    if (obj2[typedKey] !== undefined) {
      result[typedKey] = obj2[typedKey] as T[keyof T];
    }
  }

  return result;
}
