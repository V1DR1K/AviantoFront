"use client";

import { LockKeyhole, LogIn } from "lucide-react";

export function LoginView() {
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
        <form onSubmit={(event) => event.preventDefault()}>
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
          <button className="button primary large" type="submit" disabled>
            <LogIn size={18} />
            Ingresar
          </button>
        </form>
        <p className="login-pending">
          <LockKeyhole size={16} />
          La autenticación estará disponible al conectar AviantoBack.
        </p>
      </section>
    </main>
  );
}
