export const money = (value: number) => new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(value);
export const initials = (value: string) => value.split(" ").map(part=>part[0]).join("").slice(0,2);
