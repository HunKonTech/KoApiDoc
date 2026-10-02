/**
 * Sets `obj[key]` as an own data property. Plain assignment would call the
 * `__proto__` setter for a `"__proto__"` key from `JSON.parse` (an own key there),
 * replace the copy's prototype and drop the key.
 */
export function setOwn(obj: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
}
