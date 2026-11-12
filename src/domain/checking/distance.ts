// The typo test of CHK-006: a Levenshtein distance of exactly 1, without computing the distance.

/**
 * Up to this many characters are compared one at a time. Longer stretches are compared as whole
 * strings, which the engine does several times faster than a loop in code (design D5).
 */
const SCAN = 32;

/** The length of the common beginning of `a` and `b` within their first `length` characters. */
function commonPrefixLength(a: string, b: string, length: number): number {
  let start = 0;
  let end = length;
  // The first difference, if there is one before `length`, lies in [start, end).
  while (end - start > SCAN) {
    const middle = (start + end) >>> 1;
    if (a.slice(start, middle) === b.slice(start, middle)) start = middle;
    else end = middle;
  }
  while (start < end && a.charCodeAt(start) === b.charCodeAt(start)) start += 1;
  return start;
}

/** Whether `a` from `at` on equals `b` from `at + shift` on, to the end of `a`. */
function sameRest(a: string, b: string, at: number, shift: number): boolean {
  if (a.length - at > SCAN) return a.slice(at) === b.slice(at + shift);
  for (let index = at; index < a.length; index += 1) {
    if (a.charCodeAt(index) !== b.charCodeAt(index + shift)) return false;
  }
  return true;
}

/**
 * Whether one character inserted, removed or replaced turns `a` into `b`. Equal strings are not.
 * Characters are UTF-16 code units: the few Latin letters outside the Basic Multilingual Plane
 * count as two.
 */
export function isOneEditApart(a: string, b: string): boolean {
  if (a.length === b.length) {
    // One character replaced: the first difference, and nothing different after it.
    const first = commonPrefixLength(a, b, a.length);
    return first < a.length && sameRest(a, b, first + 1, 0);
  }
  if (a.length > b.length) return isOneEditApart(b, a);
  if (b.length - a.length !== 1) return false;
  // One character inserted: after the first difference the rest follows one character later.
  const first = commonPrefixLength(a, b, a.length);
  return sameRest(a, b, first, 1);
}
