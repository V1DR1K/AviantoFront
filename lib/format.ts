export const money = (value: number) => new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(value);
export const priceInput = (value: number | string | boolean | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(parsed) : "";
};
export const parsePrice = (value: string) => {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
export const initials = (value: string) => value.split(" ").map(part=>part[0]).join("").slice(0,2);
