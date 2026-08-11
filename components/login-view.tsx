"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { login, type AuthSession } from "../lib/auth";
import type { Notify } from "./ui";

export function LoginView({ onAuthenticated, notify }: { onAuthenticated: (session: AuthSession) => void; notify: Notify }) {
  const [pending, setPending] = useState(false);
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">A</span>
          <strong>
            Avianto<span>Software</span>
          </strong>
        </div>
        <div>
          <h1>Iniciar sesión</h1>
          <p>Accedé a la gestión operativa del taller.</p>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setPending(true);
            try {
              onAuthenticated(await login(String(data.get("username") ?? ""), String(data.get("password") ?? "")));
              notify("Sesión iniciada.");
            } catch (reason) {
              const message = reason instanceof Error ? reason.message : "No fue posible iniciar sesión.";
              notify(message, "error");
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Nombre de usuario
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button primary large" type="submit" disabled={pending}>
            <LogIn size={18} />
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
