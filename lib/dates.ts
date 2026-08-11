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

export const formatDateInAr = (value?: string | null): string => {
  if (!value) return "—";
  const source = value.includes("T") ? value : `${value}T12:00:00`;
  return new Intl.DateTimeFormat("es-AR").format(new Date(source));
};

export const formatDateTimeInAr = (value?: string | null): string => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
};
