"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, Search, X } from "lucide-react";
import { api } from "../lib/api";
import type { ClienteResponse, MarcaMotoResponse, PageResponse, PerfilResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { StatusBadge, type Notify } from "./ui";

export function IntakeView({ onClose, onOpenProfile, notify }: { onClose: () => void; onOpenProfile: (id: string) => void; notify: Notify }) {
  const [plate, setPlate] = useState("");
  const [searched, setSearched] = useState(false);
  const [profile, setProfile] = useState<PerfilResponse | null>(null);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [section, setSection] = useState<"TALLER" | "VENTA">("TALLER");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api<MarcaMotoResponse[]>("/configuracion/marcas-moto"),
      api<PageResponse<ClienteResponse>>("/clientes", {}, { activo: true, size: 100 }),
    ]).then(([nextBrands, nextClients]) => { setBrands(nextBrands.filter((item) => item.activo)); setClients(nextClients.content); }).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los datos."));
  }, []);

  const search = async () => {
    const normalized = plate.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (!normalized) return setError("Ingresá el dominio de la moto.");
    setBusy(true); setError(null); setSearched(true); setProfile(null);
    try {
      const result = await api<PageResponse<PerfilResponse>>("/perfiles", {}, { q: normalized, size: 100 });
      const existing = result.content.find((item) => item.patente.replace(/[^a-z0-9]/gi, "").toUpperCase() === normalized);
      if (existing) { setProfile(existing); setValues({ patente: existing.patente }); }
      else setValues((current) => ({ ...current, patente: normalized }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo buscar el dominio."); }
    finally { setBusy(false); }
  };
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (profile?.ingresada) return setError("La moto ya está ingresada.");
    if (!profile && (!values.marcaId || !values.modelo || !values.clienteId)) return setError("Completá marca, modelo y cliente para crear el perfil.");
    setBusy(true); setError(null);
    try {
      const current = profile ?? await api<PerfilResponse>("/perfiles", { method: "POST", body: JSON.stringify({ ...values, anio: values.anio ? Number(values.anio) : null, kilometraje: values.kilometraje ? Number(values.kilometraje) : null }) });
      const next = await api<PerfilResponse>(`/motovehiculos/${current.id}/ingreso`, { method: "POST", body: JSON.stringify({ seccion: section }) });
      notify(`Moto ingresada en ${section === "TALLER" ? "Taller" : "Ventas"}.`);
      onOpenProfile(next.id);
    } catch (reason) { const message = reason instanceof Error ? reason.message : "No se pudo ingresar la moto."; setError(message); notify(message, "error"); }
    finally { setBusy(false); }
  };
  return <div className="page intake-page">
    <div className="page-heading"><div><h1>Ingresar una moto</h1><p>Elegí el destino operativo antes de abrir su perfil.</p></div><button className="button secondary" onClick={onClose}><X size={18} />Cerrar</button></div>
    {error && <p className="login-pending" role="alert">{error}</p>}
    <section className="panel intake-card">
      <h2>Dominio</h2>
      <div className="plate-search"><input value={plate} onChange={(event) => { setPlate(event.target.value); setSearched(false); setProfile(null); }} placeholder="Ej.: AB 123 CD" onKeyDown={(event) => { if (event.key === "Enter") void search(); }} /><button className="button secondary" disabled={busy} onClick={() => void search()}><Search size={17} />Buscar</button></div>
      {searched && profile && <div className="intake-found"><div><strong>{profile.patente}</strong><span>{profile.marca} {profile.modelo} · {profile.propietario ?? "Sin propietario"}</span></div><StatusBadge status={profile.estado} /></div>}
      {searched && !profile && <section className="intake-new-profile"><h3>Perfil nuevo</h3><div className="two-col"><label>Marca<select value={values.marcaId ?? ""} onChange={(event) => set("marcaId", event.target.value)}><option value="">Seleccionar</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre}</option>)}</select></label><label>Modelo<input value={values.modelo ?? ""} onChange={(event) => set("modelo", event.target.value)} /></label><label>Cliente<select value={values.clienteId ?? ""} onChange={(event) => set("clienteId", event.target.value)}><option value="">Seleccionar</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}</select></label><button type="button" className="button secondary" onClick={() => setNewClientOpen(true)}><Plus size={17} />Agregar cliente</button></div></section>}
    </section>
    {searched && <section className="panel intake-destination"><h2>Destino de ingreso</h2><div className="intake-options"><button className={section === "TALLER" ? "selected" : ""} onClick={() => setSection("TALLER")}><strong>Taller</strong><span>Fichas de trabajo y pedidos de repuestos.</span></button><button className={section === "VENTA" ? "selected" : ""} onClick={() => setSection("VENTA")}><strong>Ventas</strong><span>Publicación y transferencia de la moto.</span></button></div><button className="button primary large" disabled={busy || Boolean(profile?.ingresada)} onClick={() => void submit()}><ArrowRight size={18} />{busy ? "Ingresando..." : "Ingresar y abrir perfil"}</button></section>}
    <AbmFormModal open={newClientOpen} resource="cliente" mode="agregar" fields={[{ key: "nombre", label: "Nombre y apellido", required: true, wide: true }, { key: "telefono", label: "Teléfono", type: "tel", required: true }, { key: "documento", label: "DNI o CUIT" }]} onClose={() => setNewClientOpen(false)} onSubmit={async (clientValues) => { const client = await api<ClienteResponse>("/clientes", { method: "POST", body: JSON.stringify(clientValues) }); setClients((all) => [...all, client]); set("clienteId", client.id); setNewClientOpen(false); notify("Cliente creado."); }} onError={(message) => notify(message, "error")} />
  </div>;
}
