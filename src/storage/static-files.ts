// The one module that may use the network (constitution C-03, lint rule in .oxlintrc.json): it
// loads files of the app itself, such as the demo books, from the app's own origin (C-02).

/** Why a file of the app could not be loaded. */
export type StaticFileFailure =
  /** No response: the network is down or the request was blocked. */
  | { readonly kind: "network" }
  /** The server answered with an error. */
  | { readonly kind: "status"; readonly status: number }
  /** The address would leave the app's origin; nothing was requested. */
  | { readonly kind: "foreign" };

export class StaticFileError extends Error {
  constructor(
    readonly path: string,
    readonly failure: StaticFileFailure,
  ) {
    super(`Cannot load ${path}: ${failure.kind === "status" ? failure.status : failure.kind}`);
    this.name = "StaticFileError";
  }
}

/**
 * The address of a file of the app: `path` relative to the app's base address `base`, as the
 * page at `page` sees it. Refuses any address on another origin.
 */
export function staticFileUrl(path: string, base: string, page: string): URL {
  const url = new URL(path, new URL(base, page));
  if (url.origin !== new URL(page).origin) throw new StaticFileError(path, { kind: "foreign" });
  return url;
}

/** Loads a file of the app, `path` relative to its base address, as bytes. */
export async function loadStaticFile(path: string): Promise<Uint8Array> {
  const url = staticFileUrl(path, import.meta.env.BASE_URL, window.location.href);
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin" });
  } catch {
    throw new StaticFileError(path, { kind: "network" });
  }
  if (!response.ok) throw new StaticFileError(path, { kind: "status", status: response.status });
  try {
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    throw new StaticFileError(path, { kind: "network" });
  }
}
