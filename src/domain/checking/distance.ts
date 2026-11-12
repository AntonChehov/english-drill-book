// The typo test of CHK-006: a Levenshtein distance of exactly 1, without computing the distance.

/**
 * Whether one character inserted, removed or replaced turns `a` into `b`. Equal strings are not.
 * Characters are UTF-16 code units: the few Latin letters outside the Basic Multilingual Plane
 * count as two.
 */
export function isOneEditApart(a: string, b: string): boolean {
  if (a.length === b.length) {
    let differences = 0;
    for (let index = 0; index < a.length; index += 1) {
      if (a.charCodeAt(index) !== b.charCodeAt(index) && ++differences > 1) return false;
    }
    return differences === 1;
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  if (longer.length - shorter.length !== 1) return false;
  let first = 0;
  while (first < shorter.length && shorter.charCodeAt(first) === longer.charCodeAt(first)) {
    first += 1;
  }
  // After the first difference the rest of the shorter string must follow one unit later.
  for (let index = first; index < shorter.length; index += 1) {
    if (shorter.charCodeAt(index) !== longer.charCodeAt(index + 1)) return false;
  }
  return true;
}
