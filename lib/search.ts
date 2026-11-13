/** Canonical comparison for free-text searches across the interface. */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es-AR")
    .replace(/\s+/gu, " ")
    .trim();
}

export function matchesSearchText(text: string | null | undefined, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return !normalizedQuery || normalizeSearchText(text).includes(normalizedQuery);
}
