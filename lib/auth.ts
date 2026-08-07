export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; nombre: string; email: string; rol: "ADMINISTRACION" | "OPERARIO"; activo: boolean };
};

const sessionKey = "avianto.session";
export const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
export const getSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(sessionKey);
    return value ? (JSON.parse(value) as AuthSession) : null;
  } catch {
    return null;
  }
};
export const saveSession = (session: AuthSession) => {
  if (typeof window !== "undefined")
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
};
export const clearSession = () => {
  if (typeof window !== "undefined") sessionStorage.removeItem(sessionKey);
};

export const login = async (username: string, password: string) => {
  const response = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "No fue posible iniciar sesión.");
  }
  const session = (await response.json()) as AuthSession;
  saveSession(session);
  return session;
};

export const decodeAccessExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

let refreshInFlight: Promise<AuthSession | null> | null = null;

const expiredEvent = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("avianto:session-expired"));
};

export const refreshSession = async (): Promise<AuthSession | null> => {
  if (refreshInFlight) return refreshInFlight;
  const session = getSession();
  if (!session?.refreshToken) return null;
  refreshInFlight = (async () => {
    const response = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      clearSession();
      return null;
    }
    const next = (await response.json()) as AuthSession;
    saveSession(next);
    return next;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

export const logout = async () => {
  const session = getSession();
  try {
    if (session?.refreshToken)
      await fetch(`${apiBase}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
  } finally {
    clearSession();
  }
};

export const authenticatedFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> => {
  const attempt = (token?: string) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };
  const session = getSession();
  let response = await attempt(session?.accessToken);
  if (response.status === 401 && !String(input).includes("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await attempt(refreshed.accessToken);
    }
    if (response.status === 401) {
      clearSession();
      expiredEvent();
    }
  }
  if (response.status === 401 && String(input).includes("/auth/refresh")) {
    clearSession();
    expiredEvent();
  }
  return response;
};
