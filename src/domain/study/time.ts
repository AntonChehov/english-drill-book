// Times of the export format (`2026-11-13T09:30:00.000Z`) without a clock: the domain may not use
// `Date` (C-08), so the arithmetic an override needs is done here on the text.

const instant =
  /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,3}))?Z$/u;

const DAY = 86_400_000;

/** Days from 1970-01-01 to a date of the proleptic Gregorian calendar (H. Hinnant's algorithm). */
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146_097 + dayOfEra - 719_468;
}

/** The date of a number of days from 1970-01-01. */
function civilFromDays(days: number): [year: number, month: number, day: number] {
  const z = days + 719_468;
  const era = Math.floor(z / 146_097);
  const dayOfEra = z - era * 146_097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return [yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day];
}

/** Milliseconds since 1970 of a time of the export format; `NaN` for any other text. */
export function millisecondsOf(at: string): number {
  const parts = instant.exec(at);
  if (parts === null) return Number.NaN;
  const [year, month, day, hour, minute, second] = parts.slice(1, 7).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const milliseconds = Number((parts[7] ?? "").padEnd(3, "0"));
  return (
    daysFromCivil(year, month, day) * DAY +
    ((hour * 60 + minute) * 60 + second) * 1000 +
    milliseconds
  );
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/** The time of the export format, with milliseconds, of milliseconds since 1970. */
export function instantOf(milliseconds: number): string {
  const days = Math.floor(milliseconds / DAY);
  const rest = milliseconds - days * DAY;
  const [year, month, day] = civilFromDays(days);
  const hour = Math.floor(rest / 3_600_000);
  const minute = Math.floor((rest % 3_600_000) / 60_000);
  const second = Math.floor((rest % 60_000) / 1000);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(rest % 1000, 3)}Z`;
}

/**
 * `at`, unless it is not later than `floor`: then one millisecond after `floor`. So an attempt
 * written when the clock says an earlier time still comes after the one it follows (design D5).
 */
export function notEarlierThan(at: string, floor: string): string {
  const time = millisecondsOf(at);
  const least = millisecondsOf(floor);
  return time > least ? at : instantOf(least + 1);
}
