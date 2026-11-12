// SHA-256 of a document, which a pack records to recognise the edition it was read from.

/**
 * The browser offers no SHA-256 here: `crypto.subtle` exists only in a secure context (https, or
 * the device itself), so a page opened over plain http from another address cannot hash.
 */
export class DigestUnavailableError extends Error {
  constructor() {
    super("SHA-256 is not available: the page is not in a secure context");
    this.name = "DigestUnavailableError";
  }
}

/** The SHA-256 of `bytes` in lower-case hexadecimal. */
export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  // `crypto.subtle` is typed as always present, but browsers leave it out of insecure contexts.
  const subtle = (crypto as Partial<Crypto>).subtle;
  if (subtle === undefined) throw new DigestUnavailableError();
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
