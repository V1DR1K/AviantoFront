"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

// Permisos del usuario en sesión (códigos del catálogo del backend, p. ej. "clientes.crear").
// Las pantallas usan can("modulo.accion") para mostrar u ocultar cada acción.
export type CanPermission = (codigo: string) => boolean;

const PermissionsContext = createContext<CanPermission>(() => false);

export function PermissionsProvider({ permisos, children }: { permisos: readonly string[] | undefined; children: ReactNode }) {
  const can = useMemo<CanPermission>(() => {
    const granted = new Set(permisos ?? []);
    return (codigo) => granted.has(codigo);
  }, [permisos]);
  return <PermissionsContext.Provider value={can}>{children}</PermissionsContext.Provider>;
}

export function usePermission(): CanPermission {
  return useContext(PermissionsContext);
}
