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
