// Whether the demo books are kept (design D7 of the change `storage`): the stored packs are
// validated again when read, and a pack that fails, or that was read from another edition of a
// demo book or by an older profile, is read again from the PDF.

import type { Pack } from "../../packs/types";
import { validatePack } from "../../packs/validate";
import { demoBooks, type DemoBook } from "./profiles";

export type KeptDemo =
  /** Both demo packs are stored, valid and read from the books published with this app. */
  | { readonly kind: "kept"; readonly packs: readonly Pack[] }
  /** No demo pack is stored. */
  | { readonly kind: "none" }
  /** A demo pack is stored that cannot be used as it is: the books must be read again. */
  | { readonly kind: "stale" };

const idOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "id" in value ? value.id : undefined;

/** The pack was read by this profile from the document published with this app. */
function isCurrent(pack: Pack, { profile, document }: DemoBook): boolean {
  return (
    pack.version === profile.version &&
    pack.source?.documents?.some(({ sha256 }) => sha256 === document.sha256) === true
  );
}

/** The demo packs among `stored`, in the order of the demo books, if both can be used. */
export function keptDemo(stored: readonly unknown[]): KeptDemo {
  const found = demoBooks.map((book) => stored.find((value) => idOf(value) === book.profile.id));
  if (found.every((value) => value === undefined)) return { kind: "none" };
  const packs: Pack[] = [];
  for (const [index, book] of demoBooks.entries()) {
    const validation = validatePack(found[index]);
    if (!validation.ok || !isCurrent(validation.pack, book)) return { kind: "stale" };
    packs.push(validation.pack);
  }
  return { kind: "kept", packs };
}
