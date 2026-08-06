import { authenticatedFetch, apiBase } from "./auth";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export const apiUrl = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return `${apiBase}${path}${query.size ? `?${query}` : ""}`;
};

async function messageFor(response: Response) {
  try {
    const body = (await response.json()) as { message?: string; detail?: string };
    return body.message ?? body.detail ?? "No fue posible completar la operación.";
  } catch {
    return "No fue posible completar la operación.";
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const response = await authenticatedFetch(apiUrl(path, params), {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new ApiError(await messageFor(response), response.status);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function download(
  path: string,
  filename: string,
  params?: Record<string, string | number | boolean | undefined>,
) {
  const response = await authenticatedFetch(apiUrl(path, params));
  if (!response.ok) throw new ApiError(await messageFor(response), response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
