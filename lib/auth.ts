import Cookies from "js-cookie";

const TOKEN_KEY = "lcc_token";
const USER_KEY = "lcc_user";

export interface AuthUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: "admin" | "maitre_salle" | "athlete";
}

export function setAuth(token: string, user: AuthUser) {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: "strict" });
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
  }
}
