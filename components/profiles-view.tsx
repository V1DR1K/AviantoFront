"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Edit3, Eye, Filter, LogIn, LogOut, Plus, Tag, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { MarcaMotoResponse, PageResponse, PerfilResponse } from "../lib/types";
import { AbmFormModal, type AbmField } from "./modal/abm-form-modal";
import { ConfirmModal, Dialog, EmptyState, Pagination, SearchBox, SelectField, StatusBadge, type Notify } from "./ui";

const profileStates = ["Disponible", "Ingresada Taller", "Cargada", "En proceso", "En revisión", "Entregada", "Ingresada Venta", "En venta", "Transferencia en curso", "Vendida"];
const lastModified = (value: string) => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
const actionError = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible completar la acción.";

export function ProfilesView({ onNew, onOpen, notify }: { onNew: () => void; onOpen: (id: string) => void; notify: Notify }) {
  const [dominio, setDominio] = useState("");
  const [motoQuery, setMotoQuery] = useState("");
  const [clienteQuery, setClienteQuery] = useState("");
  const [estado, setEstado] = useState("");
  const [sortBy, setSortBy] = useState("patente");
  const [direction, setDirection] = useState<"ASC" | "DESC">("ASC");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<PerfilResponse> | null>(null);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [editing, setEditing] = useState<PerfilResponse | null>(null);
  const [deleting, setDeleting] = useState<PerfilResponse | null>(null);
  const [intaking, setIntaking] = useState<PerfilResponse | null>(null);
  const [intakeSection, setIntakeSection] = useState<"TALLER" | "VENTA">("TALLER");
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    successMessage: string;
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    void api<PageResponse<PerfilResponse>>("/perfiles", {}, { dominio: dominio || undefined, moto: motoQuery || undefined, cliente: clienteQuery || undefined, estado: estado || undefined, sortBy, direction, page: page - 1, size: 20 })
      .then(setResult)
      .catch((reason) => notify(reason instanceof Error ? reason.message : "No se pudieron cargar los perfiles.", "error"));
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
      await api(`/motovehiculos/${editing.id}`, { method: "PUT", body: JSON.stringify({ ...values, anio: values.anio ? Number(values.anio) : null, kilometraje: values.kilometraje ? Number(values.kilometraje) : null }) });
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
  const runIntake = async () => {
    if (!intaking) return;
    try { await api(`/motovehiculos/${intaking.id}/ingreso`, { method: "POST", body: JSON.stringify({ seccion: intakeSection }) }); setIntaking(null); setReloadKey((key) => key + 1); notify(`Moto ingresada en ${intakeSection === "TALLER" ? "Taller" : "Ventas"}.`); }
    catch (reason) { notify(reason instanceof Error ? reason.message : "No se pudo ingresar la moto.", "error"); }
  };
  const markForSale = async (profile: PerfilResponse) => {
    await api(`/motovehiculos/${profile.id}/venta/estado`, { method: "PATCH", body: JSON.stringify({ estado: "En venta" }) });
    setReloadKey((key) => key + 1);
  };
  const completeSale = async (profile: PerfilResponse) => {
    await api(`/motovehiculos/${profile.id}/venta/completar`, { method: "POST" });
    setReloadKey((key) => key + 1);
  };

  return <div className="page">
    <div className="page-heading"><div><h1>Perfiles</h1><p>Información integral e historial de cada moto.</p></div><button className="button primary" onClick={onNew}><Plus size={19} />Nuevo perfil</button></div>
    <section className="panel table-panel">
       <div className="filter-bar"><SearchBox value={dominio} onChange={(value) => { setDominio(value); setPage(1); }} placeholder="Dominio" /><SearchBox value={motoQuery} onChange={(value) => { setMotoQuery(value); setPage(1); }} placeholder="Marca o modelo" /><SearchBox value={clienteQuery} onChange={(value) => { setClienteQuery(value); setPage(1); }} placeholder="Cliente" /><SelectField value={estado} onChange={(value) => { setEstado(value); setPage(1); }} options={profileStates.map((option) => ({ value: option, label: option }))} placeholder="Todos los estados" icon={Filter} ariaLabel="Filtrar perfiles por estado" /><SelectField value={sortBy} onChange={(value) => { setSortBy(value); setPage(1); }} options={[{ value: "patente", label: "Dominio" }, { value: "modelo", label: "Moto" }, { value: "estado", label: "Estado" }, { value: "updatedAt", label: "Última modificación" }]} icon={Filter} ariaLabel="Ordenar perfiles por" /><button className="button secondary" onClick={() => { setDirection((value) => value === "ASC" ? "DESC" : "ASC"); setPage(1); }} aria-label="Cambiar orden de perfiles"><ArrowDownUp size={16} />{direction === "ASC" ? "Ascendente" : "Descendente"}</button></div>
        {result?.content.length ? <table><thead><tr><th>Dominio</th><th>Moto</th><th>Cliente</th><th>Sección</th><th>Estado</th><th>Última modificación</th><th>Acciones</th></tr></thead><tbody>{result.content.map((profile) => <tr key={profile.id}><td data-label="Dominio"><strong>{profile.patente}</strong></td><td data-label="Moto">{profile.marca} {profile.modelo}</td><td data-label="Cliente">{profile.propietario ?? "Sin propietario"}</td><td data-label="Sección">{profile.seccion ?? "—"}</td><td data-label="Estado"><StatusBadge status={profile.estado} /></td><td data-label="Última modificación">{lastModified(profile.ultimaModificacion ?? profile.updatedAt)}</td><td className="table-actions"><button onClick={() => onOpen(profile.id)} aria-label={`Ver perfil ${profile.patente}`}><Eye size={17} /></button>{profile.estado === "Vendida" ? null : !profile.ingresada ? <button onClick={() => { setIntaking(profile); setIntakeSection("TALLER"); }} aria-label={`Ingresar moto ${profile.patente}`}><LogIn size={17} /></button> : profile.seccion === "Venta" && profile.estado === "Transferencia en curso" ? <button onClick={() => setConfirmation({ title: "Completar venta", body: `La venta de ${profile.patente} quedará completada y el cambio será auditado.`, confirmLabel: "Completar venta", successMessage: "Venta completada.", action: () => completeSale(profile) })} aria-label={`Completar venta ${profile.patente}`}><LogOut size={17} /></button> : profile.seccion === "Venta" && profile.estado === "Ingresada Venta" ? <button onClick={() => setConfirmation({ title: "Marcar moto en venta", body: `${profile.patente} pasará al estado En venta.`, confirmLabel: "Marcar en venta", successMessage: "Moto marcada como En venta.", action: () => markForSale(profile) })} aria-label={`Marcar en venta ${profile.patente}`}><Tag size={17} /></button> : null}<button onClick={() => setEditing(profile)} aria-label={`Editar perfil ${profile.patente}`}><Edit3 size={17} /></button><button className="danger-action" onClick={() => setDeleting(profile)} aria-label={`Eliminar perfil ${profile.patente}`}><Trash2 size={17} /></button></td></tr>)}</tbody></table> : <EmptyState title="No hay perfiles" body="Creá el primer Perfil de una moto." action={<button className="button primary" onClick={onNew}>Nuevo perfil</button>} />}
      <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
    </section>
     <AbmFormModal key={String(editing?.id ?? "new")} open={editing !== null} resource="perfil" mode="modificar" initialValues={editing ?? {}} fields={profileFields} onClose={() => setEditing(null)} onSubmit={saveProfile} onError={(message) => notify(message, "error")} />
    <Dialog open={intaking !== null} title="Ingresar moto" onClose={() => setIntaking(null)}><p>Elegí el destino operativo para {intaking?.patente ?? "la moto"}.</p><div className="intake-options"><button className={intakeSection === "TALLER" ? "selected" : ""} onClick={() => setIntakeSection("TALLER")}>Taller</button><button className={intakeSection === "VENTA" ? "selected" : ""} onClick={() => setIntakeSection("VENTA")}>Ventas</button></div><div className="modal-actions"><button className="button secondary" onClick={() => setIntaking(null)}>Cancelar</button><button className="button primary" onClick={() => void runIntake()}>Ingresar</button></div></Dialog>
     <ConfirmModal open={deleting !== null} title="Eliminar perfil" body={`Vas a dar de baja la moto ${deleting?.patente ?? "seleccionada"}. El historial se conservará y no se eliminará de la base de datos.`} confirmLabel="Eliminar perfil" onClose={() => setDeleting(null)} onConfirm={removeProfile} />
      <ConfirmModal open={confirmation !== null} title={confirmation?.title ?? ""} body={confirmation?.body ?? ""} confirmLabel={confirmation?.confirmLabel ?? "Confirmar"} onClose={() => setConfirmation(null)} onConfirm={() => { const request = confirmation; setConfirmation(null); if (!request) return; return request.action().then(() => notify(request.successMessage)).catch((reason) => { notify(actionError(reason), "error"); throw reason; }); }} />
  </div>;
}
