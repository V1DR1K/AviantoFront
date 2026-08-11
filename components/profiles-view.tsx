"use client";

import { useEffect, useState } from "react";
import { Edit3, Eye, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { MarcaMotoResponse, PageResponse, PerfilResponse } from "../lib/types";
import { AbmFormModal, type AbmField } from "./modal/abm-form-modal";
import { ConfirmModal, EmptyState, Pagination, SearchBox, StatusBadge, type Notify } from "./ui";

export function ProfilesView({ onNew, onOpen, notify }: { onNew: () => void; onOpen: (id: string) => void; notify: Notify }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<PerfilResponse> | null>(null);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [editing, setEditing] = useState<PerfilResponse | null>(null);
  const [deleting, setDeleting] = useState<PerfilResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api<PageResponse<PerfilResponse>>("/perfiles", {}, { q: query || undefined, page: page - 1, size: 20 })
      .then(setResult)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los perfiles."));
  }, [query, page, reloadKey]);
  useEffect(() => {
    void api<MarcaMotoResponse[]>("/configuracion/marcas-moto").then((nextBrands) => {
      setBrands(nextBrands.filter((brand) => brand.activo));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los datos de edición."));
  }, []);
  const profileFields: AbmField[] = [
    { key: "marcaId", label: "Marca", type: "select", options: brands.map((brand) => ({ value: brand.id, label: brand.nombre })), required: true },
    { key: "modelo", label: "Modelo", required: true },
    { key: "patente", label: "Dominio", required: true },
    { key: "anio", label: "Año", type: "number", min: 1900, max: 2100 },
    { key: "kilometraje", label: "Kilometraje", type: "number", min: 0 },
    { key: "observaciones", label: "Observaciones", type: "textarea", wide: true },
  ];
  const saveProfile = async (values: Record<string, string>) => {
    if (!editing) return;
    try {
      await api(`/motovehiculos/${editing.id}`, { method: "PUT", body: JSON.stringify({ ...values, anio: values.anio ? Number(values.anio) : null, kilometraje: values.kilometraje ? Number(values.kilometraje) : null }) });
      setEditing(null);
      setReloadKey((key) => key + 1);
      notify("Perfil actualizado.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No se pudo actualizar el perfil.";
      setError(message);
      notify(message, "error");
    }
  };
  const removeProfile = async () => {
    if (!deleting) return;
    const selected = deleting;
    try {
      await api(`/motovehiculos/${selected.id}`, { method: "DELETE" });
      setDeleting(null);
      setReloadKey((key) => key + 1);
      notify(`Perfil ${selected.patente} eliminado.`);
    } catch (reason) {
      setDeleting(null);
      const message = reason instanceof Error ? reason.message : "No se pudo eliminar el perfil.";
      setError(message);
      notify(message, "error");
    }
  };
  return <div className="page">
    <div className="page-heading"><div><h1>Perfiles</h1><p>Información integral e historial de cada moto.</p></div><button className="button primary" onClick={onNew}><Plus size={19} />Nuevo perfil</button></div>
    {error && <p className="login-pending" role="alert">{error}</p>}
    <section className="panel table-panel"><div className="filter-bar"><SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Dominio, moto o cliente" /></div>{result?.content.length ? <table><thead><tr><th>Dominio</th><th>Moto</th><th>Cliente</th><th>Kilometraje</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{result.content.map((profile) => <tr key={profile.id}><td data-label="Dominio"><strong>{profile.patente}</strong></td><td data-label="Moto">{profile.marca} {profile.modelo}</td><td data-label="Cliente">{profile.propietario ?? "Sin propietario"}</td><td data-label="Kilometraje">{profile.kilometraje?.toLocaleString("es-AR") ?? "—"}</td><td data-label="Estado"><StatusBadge status={profile.estado} /></td><td className="table-actions"><button onClick={() => onOpen(profile.id)} aria-label={`Ver perfil ${profile.patente}`}><Eye size={17} /></button><button onClick={() => setEditing(profile)} aria-label={`Editar perfil ${profile.patente}`}><Edit3 size={17} /></button><button className="danger-action" onClick={() => setDeleting(profile)} aria-label={`Eliminar perfil ${profile.patente}`}><Trash2 size={17} /></button></td></tr>)}</tbody></table> : <EmptyState title="No hay perfiles" body="Creá el primer Perfil de una moto." action={<button className="button primary" onClick={onNew}>Nuevo perfil</button>} />}<Pagination page={page} total={result?.totalPages || 1} onPage={setPage} /></section>
    <AbmFormModal key={String(editing?.id ?? "new")} open={editing !== null} resource="perfil" mode="modificar" initialValues={editing ?? {}} fields={profileFields} onClose={() => setEditing(null)} onSubmit={saveProfile} />
    <ConfirmModal open={deleting !== null} title="Eliminar perfil" body={`Vas a dar de baja la moto ${deleting?.patente ?? "seleccionada"}. El historial se conservará y no se eliminará de la base de datos.`} confirmLabel="Eliminar perfil" onClose={() => setDeleting(null)} onConfirm={removeProfile} />
  </div>;
}
