export const money = (value: number) => new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(value);
export const paymentAmount = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export const priceInput = (value: number | string | boolean | null | undefined) => {
  if (typeof value === "string") return value;
  const parsed = typeof value === "number" ? value : parsePrice(String(value ?? ""));
  return Number.isFinite(parsed) ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(parsed) : "";
};
export const priceDraft = (value: number) => Number.isFinite(value) ? new Intl.NumberFormat("es-AR", { useGrouping: false, maximumFractionDigits: 2 }).format(value) : "";
export const parsePrice = (value: string) => {
  const trimmed = value.trim();
  const normalized = trimmed.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(trimmed)
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
export const integerInput = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "";
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));
  return Number.isFinite(parsed) ? Math.trunc(parsed).toLocaleString("es-AR") : "";
};
export const yearInput = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "";
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : "";
};
export const parseIntegerInput = (value: string) => {
  const normalized = value.trim().replace(/\D/g, "");
  return normalized ? Number(normalized) : 0;
};
export const initials = (value: string) => value.split(" ").map(part=>part[0]).join("").slice(0,2);
