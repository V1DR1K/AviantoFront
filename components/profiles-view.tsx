"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Filter } from "lucide-react";
import { api } from "../lib/api";
import { parseIntegerInput } from "../lib/format";
import type { MarcaMotoResponse, PageResponse, PerfilResponse } from "../lib/types";
import { AbmFormModal, type AbmField } from "./modal/abm-form-modal";
import { ConfirmModal, EmptyState, FilterBar, Pagination, SearchBox, SelectField, StatusBadge, type Notify } from "./ui";
import { StatusRail, VehicleCard, VehicleField } from "./avianto-mobile";

const profileStates = ["Disponible", "Ingresada Taller", "Pendiente", "En proceso", "En revisión", "Terminada", "Entregada", "En venta", "Transferencia en proceso", "Vendida"];
const lastModified = (value: string) => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));

export function ProfilesView({ onIntake, onOpen, onOpenSale, notify }: { onIntake: (plate?: string) => void; onOpen: (id: string) => void; onOpenSale: (id: string) => void; notify: Notify }) {
  const [dominio, setDominio] = useState("");
  const [motoQuery, setMotoQuery] = useState("");
  const [clienteQuery, setClienteQuery] = useState("");
  const [estado, setEstado] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<PerfilResponse> | null>(null);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [editing, setEditing] = useState<PerfilResponse | null>(null);
  const [deleting, setDeleting] = useState<PerfilResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void api<PageResponse<PerfilResponse>>("/perfiles", { signal: controller.signal }, { dominio: dominio || undefined, moto: motoQuery || undefined, cliente: clienteQuery || undefined, estado: estado || undefined, sortBy, direction, page: page - 1, size: 20 })
      .then(setResult)
      .catch((reason) => { if (!controller.signal.aborted) notify(reason instanceof Error ? reason.message : "No se pudieron cargar los perfiles.", "error"); });
    return () => controller.abort();
  }, [dominio, motoQuery, clienteQuery, estado, sortBy, direction, page, reloadKey, notify]);
  useEffect(() => {
    void api<MarcaMotoResponse[]>("/configuracion/marcas-moto").then((nextBrands) => setBrands(nextBrands.filter((brand) => brand.activo))).catch((reason) => notify(reason instanceof Error ? reason.message : "No se pudieron cargar los datos de edición.", "error"));
  }, [notify]);

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
      await api(`/motovehiculos/${editing.id}`, { method: "PUT", body: JSON.stringify({ ...values, anio: values.anio ? parseIntegerInput(values.anio) : null, kilometraje: values.kilometraje ? parseIntegerInput(values.kilometraje) : null }) });
      setEditing(null); setReloadKey((key) => key + 1); notify("Perfil actualizado.");
    } catch (reason) { notify(reason instanceof Error ? reason.message : "No se pudo actualizar el perfil.", "error"); }
  };
  const removeProfile = async () => {
    if (!deleting) return;
    const selected = deleting;
    try {
      await api(`/motovehiculos/${selected.id}`, { method: "DELETE" });
      setDeleting(null); setReloadKey((key) => key + 1); notify(`Perfil ${selected.patente} eliminado.`);
    } catch (reason) { setDeleting(null); notify(reason instanceof Error ? reason.message : "No se pudo eliminar el perfil.", "error"); }
  };
  return <div className="page">
    <div className="avianto-mobile-screen avianto-profile-screen">
      <div className="avianto-screen-body avianto-profile-intro">
        <div><h1>Perfiles</h1><p>Información integral e historial de cada moto.</p></div>
        <button type="button" className="avianto-mobile-cta" onClick={() => onIntake()}>+&nbsp; Ingresar moto</button>
      </div>
      <div className="avianto-profile-filters">
        <FilterBar primary={<SearchBox value={dominio} onChange={(value) => { setDominio(value); setPage(1); }} placeholder="Dominio" />} activeCount={(motoQuery ? 1 : 0) + (clienteQuery ? 1 : 0) + (estado ? 1 : 0) + (sortBy !== "updatedAt" ? 1 : 0)}>
          <SearchBox value={motoQuery} onChange={(value) => { setMotoQuery(value); setPage(1); }} placeholder="Marca o modelo" />
          <SearchBox value={clienteQuery} onChange={(value) => { setClienteQuery(value); setPage(1); }} placeholder="Cliente" />
          <SelectField value={estado} onChange={(value) => { setEstado(value); setPage(1); }} options={profileStates.map((option) => ({ value: option, label: option }))} placeholder="Todos los estados" icon={Filter} ariaLabel="Filtrar perfiles por estado" />
          <SelectField value={sortBy} onChange={(value) => { setSortBy(value); setPage(1); }} options={[{ value: "patente", label: "Dominio" }, { value: "modelo", label: "Moto" }, { value: "estado", label: "Estado" }, { value: "updatedAt", label: "Última modificación" }]} icon={Filter} ariaLabel="Ordenar perfiles por" />
          <button className="button secondary" onClick={() => { setDirection((value) => value === "ASC" ? "DESC" : "ASC"); setPage(1); }} aria-label="Cambiar orden de perfiles"><ArrowDownUp size={16} />{direction === "DESC" ? "Más recientes" : "Más antiguas"}</button>
        </FilterBar>
      </div>
      <StatusRail active={estado || "Todos"} onChange={(value) => { setEstado(value === "Todos" ? "" : value); setPage(1); }} items={[{ id: "Todos", label: "Todos", count: result?.totalElements ?? 0 }, ...profileStates.map((state) => ({ id: state, label: state, count: result?.content.filter((profile) => profile.estado === state).length ?? 0 }))]} />
      <div className="avianto-screen-body">
        <div className="avianto-mobile-list">
          {result?.content.length ? result.content.map((profile) => <VehicleCard key={profile.id} variant="profile" plate={profile.patente} action={<div className="avianto-vehicle-actions">
            <button type="button" className="text-button" onClick={() => onOpen(profile.id)}>Abrir perfil</button>
            {!profile.ingresada && <button type="button" className="text-button" onClick={() => onIntake(profile.patente)}>Ingresar moto</button>}
            {profile.ingresada && profile.seccion === "Venta" && <button type="button" className="text-button" aria-label={`Abrir ficha de venta ${profile.patente}`} onClick={() => onOpenSale(profile.id)}>Abrir venta</button>}
            <button type="button" className="text-button" onClick={() => setEditing(profile)}>Editar</button>
            <button type="button" className="text-button danger-action" onClick={() => setDeleting(profile)}>Eliminar</button>
          </div>}><VehicleField label="Moto" value={`${profile.marca} ${profile.modelo}`} /><VehicleField label="Cliente" value={profile.propietario ?? "Sin propietario"} /><VehicleField label="Estado" value={<StatusBadge status={profile.estado} />} tone="red" /><VehicleField label="Sección" value={profile.seccion ?? "—"} /><VehicleField label="Última modificación" value={lastModified(profile.ultimaModificacion ?? profile.updatedAt)} /></VehicleCard>) : <EmptyState title="No hay perfiles" body="Creá el primer Perfil de una moto." action={<button className="button primary" onClick={() => onIntake()}>Ingresar moto</button>} />}
        </div>
        <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
      </div>
    </div>
     <AbmFormModal key={String(editing?.id ?? "new")} open={editing !== null} resource="perfil" mode="modificar" initialValues={editing ?? {}} fields={profileFields} onClose={() => setEditing(null)} onSubmit={saveProfile} onError={(message) => notify(message, "error")} />
     <ConfirmModal open={deleting !== null} title="Eliminar perfil" body={`Vas a dar de baja la moto ${deleting?.patente ?? "seleccionada"}. El historial se conservará y no se eliminará de la base de datos.`} confirmLabel="Eliminar perfil" onClose={() => setDeleting(null)} onConfirm={removeProfile} />
  </div>;
}
