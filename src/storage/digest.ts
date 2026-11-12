// SHA-256 of a document, which a pack records to recognise the edition it was read from.

/** The SHA-256 of `bytes` in lower-case hexadecimal. */
export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
