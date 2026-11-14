// Ids and times of attempts, which the domain takes from the caller (C-08).

/**
 * A random UUID (version 4) in lower case. `crypto.randomUUID` exists only in a secure context, so
 * a page opened over plain http from another address builds it from random bytes instead.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The time now, as the export format writes it. */
export function now(): string {
  return new Date().toISOString();
}
