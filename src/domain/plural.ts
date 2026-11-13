// Russian plural forms for counts shown in the interface.

/** The three forms of a Russian noun after a number: one, few, many (упражнение, упражнения, упражнений). */
export type PluralForms = readonly [one: string, few: string, many: string];

/** `count` followed by the form of the noun Russian grammar requires after it. */
export function countOf(count: number, [one, few, many]: PluralForms): string {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  const form =
    lastTwo >= 11 && lastTwo <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many;
  return `${count} ${form}`;
}
