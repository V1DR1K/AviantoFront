"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Copy, Eye, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { PermisoModuloResponse, RolRequest, RolResponse } from "../lib/types";
import { AviantoPage, AviantoPageHeader } from "./avianto-layout";
import { usePermission } from "./permissions-context";
import { ConfirmModal, Dialog, EmptyState, LoadingState, type Notify } from "./ui";

type Editor = {
  id: string | null;
  readOnly: boolean;
  nombre: string;
  descripcion: string;
  permisos: string[];
};

const errorMessage = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);
const sameList = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

export function RolesView({ notify }: { notify: Notify }) {
  const can = usePermission();
  const [roles, setRoles] = useState<RolResponse[] | null>(null);
  const [catalog, setCatalog] = useState<PermisoModuloResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [initial, setInitial] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<RolResponse | null>(null);

  const reload = useCallback(async () => {
    try {
      const [nextRoles, nextCatalog] = await Promise.all([
        api<RolResponse[]>("/configuracion/roles"),
        api<PermisoModuloResponse[]>("/configuracion/roles/permisos"),
      ]);
      setRoles(nextRoles);
      setCatalog(nextCatalog);
      setLoadError(null);
    } catch (reason) {
      const message = errorMessage(reason, "No se pudieron cargar los roles.");
      setLoadError(message);
      notify(message, "error");
    }
  }, [notify]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      api<RolResponse[]>("/configuracion/roles", { signal: controller.signal }),
      api<PermisoModuloResponse[]>("/configuracion/roles/permisos", { signal: controller.signal }),
    ])
      .then(([nextRoles, nextCatalog]) => {
        setRoles(nextRoles);
        setCatalog(nextCatalog);
        setLoadError(null);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        const message = errorMessage(reason, "No se pudieron cargar los roles.");
        setLoadError(message);
        notify(message, "error");
      });
    return () => controller.abort();
  }, [notify]);

  const totalPermisos = useMemo(() => (catalog ?? []).reduce((count, modulo) => count + modulo.permisos.length, 0), [catalog]);
  const menuModule = catalog?.find((modulo) => modulo.id === "menu");
  const dataModules = (catalog ?? []).filter((modulo) => modulo.id !== "menu");

  const openEditor = (next: Editor) => {
    setEditor(next);
    setInitial(next);
  };
  const openNew = () => openEditor({ id: null, readOnly: false, nombre: "", descripcion: "", permisos: [] });
  const openDuplicate = (rol: RolResponse) => openEditor({ id: null, readOnly: false, nombre: `Copia de ${rol.nombre}`, descripcion: rol.descripcion ?? "", permisos: [...rol.permisos] });
  const openRol = (rol: RolResponse) => openEditor({
    id: rol.id,
    readOnly: !rol.editable || !can("roles.editar"),
    nombre: rol.nombre,
    descripcion: rol.descripcion ?? "",
    permisos: [...rol.permisos],
  });
  const closeEditor = () => {
    setEditor(null);
    setInitial(null);
  };
  const dirty = editor !== null && initial !== null && (editor.nombre !== initial.nombre || editor.descripcion !== initial.descripcion || !sameList(editor.permisos, initial.permisos));

  const togglePermiso = (codigo: string) => {
    setEditor((current) => current && {
      ...current,
      permisos: current.permisos.includes(codigo) ? current.permisos.filter((item) => item !== codigo) : [...current.permisos, codigo],
    });
  };
  const toggleModulo = (modulo: PermisoModuloResponse) => {
    setEditor((current) => {
      if (!current) return current;
      const codigos = modulo.permisos.map((permiso) => permiso.codigo);
      const todos = codigos.every((codigo) => current.permisos.includes(codigo));
      const sinModulo = current.permisos.filter((codigo) => !codigos.includes(codigo));
      return { ...current, permisos: todos ? sinModulo : [...sinModulo, ...codigos] };
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || editor.readOnly || saving) return;
    const body: RolRequest = { nombre: editor.nombre.trim(), descripcion: editor.descripcion.trim() || null, permisos: editor.permisos };
    setSaving(true);
    try {
      if (editor.id) await api<RolResponse>(`/configuracion/roles/${editor.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await api<RolResponse>("/configuracion/roles", { method: "POST", body: JSON.stringify(body) });
      notify(editor.id ? "Rol actualizado." : "Rol creado.");
      closeEditor();
      await reload();
    } catch (reason) {
      notify(errorMessage(reason, "No se pudo guardar el rol."), "error");
    } finally {
      setSaving(false);
    }
  };

  const removeRol = async () => {
    if (!deleting) return;
    const selected = deleting;
    try {
      await api<void>(`/configuracion/roles/${selected.id}`, { method: "DELETE" });
      setDeleting(null);
      notify(`Rol ${selected.nombre} eliminado.`);
      await reload();
    } catch (reason) {
      setDeleting(null);
      notify(errorMessage(reason, "No se pudo eliminar el rol."), "error");
    }
  };

  const renderPermisos = (modulo: PermisoModuloResponse, readOnly: boolean) => {
    const seleccionados = editor?.permisos ?? [];
    const todos = modulo.permisos.every((permiso) => seleccionados.includes(permiso.codigo));
    return (
      <section className="roles-module" key={modulo.id} aria-labelledby={`roles-module-${modulo.id}`}>
        <div className="roles-module-head">
          <h3 id={`roles-module-${modulo.id}`}>{modulo.nombre}</h3>
          {!readOnly && (
            <button type="button" className="roles-toggle" onClick={() => toggleModulo(modulo)} aria-pressed={todos}>
              {todos ? "Quitar todos" : "Marcar todos"}
            </button>
          )}
        </div>
        <div className="roles-permissions">
          {modulo.permisos.map((permiso) => (
            <label className="roles-permission" key={permiso.codigo}>
              <input
                type="checkbox"
                checked={seleccionados.includes(permiso.codigo)}
                disabled={readOnly}
                onChange={() => togglePermiso(permiso.codigo)}
              />
              <span>{permiso.etiqueta}</span>
            </label>
          ))}
        </div>
      </section>
    );
  };

  const canCreate = can("roles.crear");

  return (
    <AviantoPage className="roles-page">
      <AviantoPageHeader
        title="Roles y permisos"
        description="Definí qué secciones del menú ve cada rol y qué acciones puede hacer en cada módulo."
        actions={canCreate ? <button type="button" className="button primary" onClick={openNew}><Plus size={18} aria-hidden="true" />Nuevo rol</button> : undefined}
      />
      <div className="avianto-screen-body">
        {loadError ? (
          <EmptyState title="No se pudieron cargar los roles" body={loadError} action={<button className="button secondary" onClick={() => void reload()}>Reintentar</button>} />
        ) : !roles || !catalog ? (
          <LoadingState label="Cargando roles..." />
        ) : roles.length === 0 ? (
          <EmptyState title="No hay roles" body="Creá un rol para asignar permisos a los usuarios." />
        ) : (
          <div className="roles-grid">
            {roles.map((rol) => {
              const editable = rol.editable && can("roles.editar");
              return (
                <article className="roles-card" key={rol.id} aria-label={`Rol ${rol.nombre}`}>
                  <div className="roles-card-head">
                    <h3><ShieldCheck size={18} aria-hidden="true" /> {rol.nombre}</h3>
                    {rol.sistema && <span className="roles-badge">Sistema</span>}
                  </div>
                  {rol.descripcion && <p>{rol.descripcion}</p>}
                  <p className="roles-card-meta">{rol.usuarios} {rol.usuarios === 1 ? "usuario" : "usuarios"} · {rol.permisos.length} de {totalPermisos} permisos</p>
                  <div className="roles-card-actions">
                    <button type="button" className="text-button" onClick={() => openRol(rol)}>
                      {editable ? <Pencil size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      {editable ? "Editar" : "Ver permisos"}
                    </button>
                    {canCreate && <button type="button" className="text-button" onClick={() => openDuplicate(rol)}><Copy size={16} aria-hidden="true" />Duplicar</button>}
                    {can("roles.eliminar") && !rol.sistema && (
                      <button type="button" className="text-button danger-action" disabled={rol.usuarios > 0} title={rol.usuarios > 0 ? "Hay usuarios con este rol" : undefined} onClick={() => setDeleting(rol)}>
                        <Trash2 size={16} aria-hidden="true" />Eliminar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={editor !== null}
        title={editor === null ? "" : editor.id ? (editor.readOnly ? "Permisos del rol" : "Editar rol") : "Nuevo rol"}
        onClose={closeEditor}
        size="xl"
       
        dirty={dirty}
      >
        {editor && catalog && (
          <form className="roles-form" onSubmit={(event) => void save(event)}>
            {editor.readOnly && <p className="roles-readonly-notice">Este rol no se puede modificar desde aquí. Podés ver sus permisos o duplicarlo para crear uno nuevo.</p>}
            <div className="roles-form-fields">
              <label>Nombre del rol
                <input type="text" value={editor.nombre} maxLength={80} required disabled={editor.readOnly} onChange={(event) => setEditor({ ...editor, nombre: event.target.value })} />
              </label>
              <label>Descripción
                <textarea value={editor.descripcion} maxLength={255} disabled={editor.readOnly} onChange={(event) => setEditor({ ...editor, descripcion: event.target.value })} />
              </label>
            </div>
            <p className="roles-summary">{editor.permisos.length} de {totalPermisos} permisos seleccionados.</p>
            {menuModule && (
              <section className="roles-module roles-menu" aria-labelledby="roles-module-menu">
                <div className="roles-module-head">
                  <h3 id="roles-module-menu">Secciones del menú</h3>
                  {!editor.readOnly && (
                    <button type="button" className="roles-toggle" onClick={() => toggleModulo(menuModule)}>
                      {menuModule.permisos.every((permiso) => editor.permisos.includes(permiso.codigo)) ? "Quitar todas" : "Marcar todas"}
                    </button>
                  )}
                </div>
                <div className="roles-permissions">
                  {menuModule.permisos.map((permiso) => (
                    <label className="roles-permission" key={permiso.codigo}>
                      <input type="checkbox" checked={editor.permisos.includes(permiso.codigo)} disabled={editor.readOnly} onChange={() => togglePermiso(permiso.codigo)} />
                      <span>{permiso.etiqueta}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}
            {dataModules.map((modulo) => renderPermisos(modulo, editor.readOnly))}
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={closeEditor}>{editor.readOnly ? "Cerrar" : "Cancelar"}</button>
              {!editor.readOnly && <button className="button primary" disabled={saving || !editor.nombre.trim()}>{saving ? "Guardando..." : "Guardar rol"}</button>}
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmModal
        open={deleting !== null}
        title="Eliminar rol"
        body={`Vas a eliminar el rol ${deleting?.nombre ?? "seleccionado"}. Ya no se podrá asignar a usuarios.`}
        confirmLabel="Eliminar rol"
        onClose={() => setDeleting(null)}
        onConfirm={removeRol}
      />
    </AviantoPage>
  );
}
