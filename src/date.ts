export interface DateParts {
  /** YYYY-MM-DD, для свойства Date в Notion */
  iso: string;
  /** DD.MM.YYYY, для заголовка страницы */
  ddmmyyyy: string;
  /** DD-MM-YYYY, для фильтров Partner API Яндекс Маркета */
  ddDashMmDashYyyy: string;
}

export function todayParts(tzName: string, now: Date = new Date()): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tzName,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = formatter.format(now).split("-");

  return {
    iso: `${y}-${m}-${d}`,
    ddmmyyyy: `${d}.${m}.${y}`,
    ddDashMmDashYyyy: `${d}-${m}-${y}`,
  };
}

/** DD-MM-YYYY для даты через daysAhead дней от now (в таймзоне tzName), для фильтров Partner API */
export function futureDateDdMmYyyy(tzName: string, daysAhead: number, now: Date = new Date()): string {
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tzName,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = formatter.format(future).split("-");
  return `${d}-${m}-${y}`;
}

/** DD-MM-YYYY -> DD.MM.YYYY, для отображения в Notion */
export function toDisplayDate(ddDashMmDashYyyy: string): string {
  return ddDashMmDashYyyy.replaceAll("-", ".");
}
