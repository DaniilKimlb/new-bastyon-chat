import { APP_NAME } from "@/shared/config";

interface UseLocalStorage<T> {
  setLSValue: (value: T) => void;
  value: T;
}

export function useLocalStorage<T>(
  key: string,
  initialValue?: T
): UseLocalStorage<T> {
  const keyLS = `${APP_NAME}:${key}`;

  const valueLS = window.localStorage.getItem(keyLS);
  const value: T = valueLS ? JSON.parse(valueLS) : initialValue;

  function setLSValue(value: T): void {
    window.localStorage.setItem(keyLS, JSON.stringify(value));
  }

  return { setLSValue, value };
}
