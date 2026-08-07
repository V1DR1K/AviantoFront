export const AR_TZ = "America/Argentina/Buenos_Aires";

export const todayInAr = (): string => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: AR_TZ }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

export const daysAgoInAr = (days: number): string => {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - days);
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: AR_TZ }).formatToParts(dt);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
};