// The calendar day of the daily checklist: the device's own, in its time zone. Here and not in the
// domain, which has no clock (C-08).

const two = (value: number) => String(value).padStart(2, "0");

/** `now` as `YYYY-MM-DD` in the device's time zone. */
export function localDay(now: Date): string {
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}
