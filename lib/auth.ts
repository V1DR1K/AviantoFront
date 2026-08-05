export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; nombre: string; rol: "ADMINISTRACION" | "OPERARIO" };
};

const sessionKey = "avianto.session";
const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";
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
  if (!response.ok) throw new Error("No fue posible iniciar sesión.");
  const session = (await response.json()) as AuthSession;
  saveSession(session);
  return session;
};
export const refreshSession = async () => {
  const session = getSession();
  if (!session?.refreshToken) return null;
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
) => {
  const session = getSession();
  const response = await fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
  });
  if (response.status === 401) clearSession();
  return response;
};
